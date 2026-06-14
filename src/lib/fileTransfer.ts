import { webrtcManager } from "./webrtcManager";

export const CHUNK_SIZE = 16384; // 16KB

export interface FileMetadata {
  type: "metadata";
  name: string;
  size: number;
  mimeType: string;
}

export interface FileTransferProgress {
  progress: number;
  speed: number; // bytes per second
  eta: number; // seconds
}

export class FileTransferSender {
  private file: File;
  private offset = 0;
  private fileReader: FileReader;
  private onProgress: (stats: FileTransferProgress) => void;
  private onComplete: () => void;
  
  private startTime = 0;
  private bytesSent = 0;

  constructor(file: File, onProgress: (stats: FileTransferProgress) => void, onComplete: () => void) {
    this.file = file;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.fileReader = new FileReader();

    this.fileReader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      webrtcManager.send(buffer);
      this.offset += buffer.byteLength;
      this.bytesSent += buffer.byteLength;

      this.updateProgress();

      if (this.offset < this.file.size) {
        this.readSlice(this.offset);
      } else {
        // Send a complete signal
        webrtcManager.send(JSON.stringify({ type: "complete" }));
        this.onComplete();
      }
    };
  }

  public start() {
    this.startTime = Date.now();
    // Send metadata first
    const metadata: FileMetadata = {
      type: "metadata",
      name: this.file.name,
      size: this.file.size,
      mimeType: this.file.type || 'application/octet-stream'
    };
    webrtcManager.send(JSON.stringify(metadata));

    // Wait a brief moment for metadata to be processed, then start sending chunks
    setTimeout(() => {
      this.readSlice(0);
    }, 500);
  }

  private readSlice(o: number) {
    if (webrtcManager.dataChannel) {
      // Throttle if the buffer is getting full (e.g. > 1MB)
      if (webrtcManager.dataChannel.bufferedAmount > 1024 * 1024) {
        setTimeout(() => this.readSlice(o), 50);
        return;
      }
    }
    const slice = this.file.slice(this.offset, o + CHUNK_SIZE);
    this.fileReader.readAsArrayBuffer(slice);
  }

  private updateProgress() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const speed = elapsed > 0 ? this.bytesSent / elapsed : 0;
    const remainingBytes = this.file.size - this.bytesSent;
    const eta = speed > 0 ? remainingBytes / speed : 0;
    const progress = (this.bytesSent / this.file.size) * 100;

    this.onProgress({
      progress,
      speed,
      eta
    });
  }
}

export class FileTransferReceiver {
  private receivedBuffers: ArrayBuffer[] = [];
  private receivedSize = 0;
  private metadata: FileMetadata | null = null;
  
  private onProgress: (stats: FileTransferProgress) => void;
  private onComplete: (fileBlob: Blob, metadata: FileMetadata) => void;
  
  private startTime = 0;

  constructor(onProgress: (stats: FileTransferProgress) => void, onComplete: (fileBlob: Blob, metadata: FileMetadata) => void) {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
  }

  public handleData(data: string | ArrayBuffer) {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'metadata') {
          this.metadata = parsed;
          this.receivedSize = 0;
          this.receivedBuffers = [];
          this.startTime = Date.now();
          console.log("Receiving file:", this.metadata);
        } else if (parsed.type === 'complete') {
          this.finish();
        }
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    } else {
      // Chunk
      this.receivedBuffers.push(data);
      this.receivedSize += data.byteLength;
      this.updateProgress();
    }
  }

  private updateProgress() {
    if (!this.metadata) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const speed = elapsed > 0 ? this.receivedSize / elapsed : 0;
    const remainingBytes = this.metadata.size - this.receivedSize;
    const eta = speed > 0 ? remainingBytes / speed : 0;
    const progress = (this.receivedSize / this.metadata.size) * 100;

    this.onProgress({
      progress,
      speed,
      eta
    });
  }

  private finish() {
    if (!this.metadata) return;
    const blob = new Blob(this.receivedBuffers, { type: this.metadata.mimeType });
    this.onComplete(blob, this.metadata);
  }
}
