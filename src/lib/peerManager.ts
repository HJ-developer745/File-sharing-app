import { io, Socket } from "socket.io-client";

export type Device = {
  id: string;
  name: string;
  type: string;
};

export type TransferState = {
  status: "idle" | "requesting" | "incoming" | "connecting" | "transferring" | "completed" | "error";
  peerInfo?: Device;
  fileInfo?: { name: string; size: number; type: string };
  progress: number; // 0 to 1
  speed: number; // bytes per second
  eta: number; // seconds remaining
  error?: string;
  role?: "sender" | "receiver";
  isConnected?: boolean;
};

// Simple event emitter
class EventEmitter {
  private events: Record<string, Function[]> = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  }

  off(event: string, listener: Function) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((l) => l !== listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach((l) => l(...args));
  }
}

export class WebRTCManager extends EventEmitter {
  private socket: Socket;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private currentTargetId: string | null = null;
  public myDevice: Device | null = null;
  public devices: Device[] = [];
  
  // File Transfer State (Sender)
  private fileToSend: File | null = null;
  private fileReader: FileReader | null = null;
  private chunkSize = 16 * 1024; // 16KB chunks
  private offset = 0;
  
  // File Transfer State (Receiver)
  private receivedBuffers: ArrayBuffer[] = [];
  private receivedSize = 0;
  private expectedSize = 0;
  private incomingFileName = "";
  private incomingFileType = "";

  // Metrics
  private startTime = 0;
  private lastReportTime = 0;
  private lastReportedSize = 0;
  private speedMeasurements: number[] = [];

  constructor() {
    super();
    this.socket = io(window.location.origin);

    this.socket.on("connect", () => {
      console.log("Connected to signaling server with ID:", this.socket.id);
      this.generateMyDevice();
    });

    this.socket.on("devices-updated", (devices: Device[]) => {
      this.devices = devices.filter(d => d.id !== this.socket.id);
      this.emit("devices-updated", this.devices);
    });

    this.socket.on("connection-requested", (data: { from: string; device: Device }) => {
      this.currentTargetId = data.from;
      this.emit("connection-requested", data.device);
    });

    this.socket.on("connection-accepted", async (data: { from: string }) => {
      this.emit("connection-accepted", data.from);
      await this.startPeerConnection(true); // initiator
    });

    this.socket.on("connection-rejected", (data: { from: string }) => {
      this.currentTargetId = null;
      this.emit("connection-rejected");
    });

    this.socket.on("signal", async (data: { from: string; signal: any }) => {
      this.currentTargetId = data.from;
      await this.handleSignal(data.signal);
    });
  }

  private generateMyDevice() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const type = isMobile ? "Mobile" : "Desktop";
    const namePrefixes = ["Nova", "Orbit", "Zenith", "Quantum", "Pulse"];
    const name = `${namePrefixes[Math.floor(Math.random() * namePrefixes.length)]} ${type}`;
    
    this.myDevice = {
      id: this.socket.id as string,
      name,
      type
    };
    
    this.socket.emit("register", { name: this.myDevice.name, type: this.myDevice.type });
    this.emit("my-device-updated", this.myDevice);
  }

  public requestConnection(targetId: string) {
    this.currentTargetId = targetId;
    this.socket.emit("request-connection", { targetId, fromDevice: this.myDevice });
  }

  public acceptConnection() {
    if (!this.currentTargetId) return;
    this.socket.emit("accept-connection", { targetId: this.currentTargetId });
    this.startPeerConnection(false); // receiver
  }

  public rejectConnection() {
    if (!this.currentTargetId) return;
    this.socket.emit("reject-connection", { targetId: this.currentTargetId });
    this.currentTargetId = null;
  }
  
  public setFileToSend(file: File) {
    this.fileToSend = file;
  }

  public sendChatMessage(text: string) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify({
        type: "chat",
        text,
        timestamp: Date.now()
      }));
      this.emit("chat-message", { sender: "me", text, timestamp: Date.now() });
    }
  }

  public disconnect() {
    if (this.dataChannel) {
        this.dataChannel.close();
    }
    if (this.peerConnection) {
        this.peerConnection.close();
    }
    this.peerConnection = null;
    this.dataChannel = null;
    this.currentTargetId = null;
    this.fileToSend = null;
    this.emit("disconnected");
  }

  private async startPeerConnection(isInitiator: boolean) {
    this.emit("connecting");
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }, 
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentTargetId) {
        this.socket.emit("signal", {
          targetId: this.currentTargetId,
          signal: { type: "candidate", candidate: event.candidate }
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === "disconnected" || 
          this.peerConnection?.connectionState === "failed") {
        this.disconnect();
      }
    };

    if (isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel("fileTransfer", {
        ordered: true
      });
      this.setupDataChannel();

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.socket.emit("signal", {
        targetId: this.currentTargetId,
        signal: { type: "offer", offer }
      });
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }
  }

  private async handleSignal(signal: any) {
    if (!this.peerConnection) {
        console.warn("Received signal without a peer connection");
        return;
    }

    if (signal.type === "offer") {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket.emit("signal", {
        targetId: this.currentTargetId,
        signal: { type: "answer", answer }
      });
    } else if (signal.type === "answer") {
      if (this.peerConnection.signalingState !== "stable") {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.answer));
      }
    } else if (signal.type === "candidate") {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.binaryType = "arraybuffer";
    
    this.dataChannel.onopen = () => {
      this.emit("data-channel-open");
      if (this.fileToSend) {
        this.startFileTransfer();
      }
    };

    this.dataChannel.onclose = () => {
      this.emit("data-channel-close");
      this.disconnect();
    };

    this.dataChannel.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const meta = JSON.parse(event.data);
          if (meta.type === "file-meta") {
            this.expectedSize = meta.size;
            this.incomingFileName = meta.name;
            this.incomingFileType = meta.fileType;
            this.receivedSize = 0;
            this.receivedBuffers = [];
            this.startTime = Date.now();
            this.lastReportTime = Date.now();
            this.lastReportedSize = 0;
            this.speedMeasurements = [];
            
            this.emit("transfer-start", { role: "receiver", fileMeta: meta });
          } else if (meta.type === "transfer-complete") {
             
          } else if (meta.type === "chat") {
             this.emit("chat-message", { sender: "peer", text: meta.text, timestamp: meta.timestamp });
          } else if (meta.type === "disconnect") {
             this.disconnect();
          }
        } catch (e) {
          console.error("Failed to parse metadata", e);
        }
      } else {
        this.receivedBuffers.push(event.data);
        this.receivedSize += event.data.byteLength;
        
        this.updateMetrics(this.receivedSize, this.expectedSize);

        if (this.receivedSize >= this.expectedSize) {
          this.finishReceivingFile();
        }
      }
    };
  }

  private startFileTransfer() {
    if (!this.fileToSend || !this.dataChannel) return;

    this.startTime = Date.now();
    this.lastReportTime = Date.now();
    this.lastReportedSize = 0;
    this.offset = 0;
    this.speedMeasurements = [];

    this.dataChannel.send(JSON.stringify({
      type: "file-meta",
      name: this.fileToSend.name,
      size: this.fileToSend.size,
      fileType: this.fileToSend.type
    }));

    this.emit("transfer-start", { role: "sender", fileMeta: { name: this.fileToSend.name, size: this.fileToSend.size } });

    this.fileReader = new FileReader();
    this.fileReader.onload = (e) => {
      if (e.target && e.target.result) {
        this.dataChannel?.send(e.target.result as ArrayBuffer);
        this.offset += (e.target.result as ArrayBuffer).byteLength;
        
        this.updateMetrics(this.offset, this.fileToSend!.size);

        if (this.offset < this.fileToSend!.size) {
            if (this.dataChannel && this.dataChannel.bufferedAmount > 1024 * 1024) {
                this.dataChannel.onbufferedamountlow = () => {
                    this.dataChannel!.onbufferedamountlow = null;
                    this.readSlice();
                };
            } else {
                 requestAnimationFrame(() => this.readSlice());
            }
        } else {
          this.dataChannel?.send(JSON.stringify({ type: "transfer-complete" }));
          this.emit("transfer-complete");
        }
      }
    };

    this.readSlice();
  }

  private readSlice() {
    if (!this.fileToSend || !this.fileReader) return;
    const slice = this.fileToSend.slice(this.offset, this.offset + this.chunkSize);
    this.fileReader.readAsArrayBuffer(slice);
  }

  private finishReceivingFile() {
    const blob = new Blob(this.receivedBuffers, { type: this.incomingFileType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = this.incomingFileName || "downloaded-file";
    a.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    
    this.emit("transfer-complete");
  }

  private updateMetrics(current: number, total: number) {
    const now = Date.now();
    const timeDelta = now - this.lastReportTime;
    
    if (timeDelta > 500 || current >= total) {
      const bytesTransferred = current - this.lastReportedSize;
      let instantSpeed = 0;
      if (timeDelta > 0) {
        instantSpeed = (bytesTransferred / timeDelta) * 1000;
      }
      
      this.speedMeasurements.push(instantSpeed);
      if (this.speedMeasurements.length > 5) this.speedMeasurements.shift();
      
      const avgSpeed = this.speedMeasurements.reduce((a, b) => a + b, 0) / this.speedMeasurements.length;
      
      const remainingBytes = total - current;
      const eta = avgSpeed > 0 ? (remainingBytes / avgSpeed) : 0;
      const progress = current / total;

      this.emit("transfer-progress", {
        progress,
        speed: avgSpeed,
        eta
      });

      this.lastReportTime = now;
      this.lastReportedSize = current;
    }
  }
}
