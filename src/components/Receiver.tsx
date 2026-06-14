import React, { useState, useEffect } from 'react';
import { webrtcManager } from '../lib/webrtcManager';
import { FileTransferReceiver, FileTransferProgress, FileMetadata } from '../lib/fileTransfer';
import { ChevronLeft, KeyRound, Check, Download, Loader2 } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import { ProgressBar } from './ProgressBar';

export function Receiver({ onBack }: { onBack: () => void }) {
  const [roomId, setRoomId] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [progress, setProgress] = useState<FileTransferProgress | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<{ blob: Blob, meta: FileMetadata } | null>(null);

  useEffect(() => {
    webrtcManager.disconnect();

    webrtcManager.onConnected = () => {
      setConnected(true);
      setError('');
    };

    webrtcManager.onDisconnect = () => {
      setConnected(false);
    };

    return () => {
      webrtcManager.disconnect();
    };
  }, []);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }
    setError('');
    webrtcManager.joinRoom(roomId);
  };

  useEffect(() => {
    if (connected) {
      const receiver = new FileTransferReceiver(
        (stats) => {
          setReceiving(true);
          setProgress(stats);
        },
        (blob, meta) => {
          setReceiving(false);
          setDownloadBlob({ blob, meta });
        }
      );

      webrtcManager.onDataChannelMessage = (e) => {
        // Intercept metadata manually if we want to show it before transfer starts, 
        // but FileTransferReceiver handles it internally.
        if (typeof e.data === 'string') {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed.type === "metadata") {
              setMetadata(parsed);
              setReceiving(true);
              setDownloadBlob(null);
            }
          } catch(err) {}
        }
        receiver.handleData(e.data);
      };
    }
  }, [connected]);

  const handleDownload = () => {
    if (!downloadBlob) return;
    const url = URL.createObjectURL(downloadBlob.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadBlob.meta.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 font-sans text-neutral-100">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl relative">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 pt-4">
          <h2 className="text-2xl font-medium text-white">Receive File</h2>
          {!connected ? (
            <p className="text-neutral-400">Enter the sender's 6-digit code</p>
          ) : (
            <p className="text-emerald-400 font-medium">Connected to Sender</p>
          )}
        </div>

        {!connected ? (
          <form onSubmit={handleConnect} className="space-y-6">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="w-5 h-5 text-neutral-500" />
                </div>
                <input 
                  type="text" 
                  maxLength={6}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-4 pl-12 pr-4 text-white text-2xl font-mono tracking-widest text-center focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600"
                />
              </div>
              {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            </div>

            <button 
              type="submit"
              disabled={roomId.length !== 6}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium rounded-xl transition flex justify-center items-center gap-2"
            >
              Connect
            </button>
          </form>
        ) : (
          <div className="space-y-6 pt-4">
            {!receiving && !downloadBlob && (
              <div className="flex flex-col items-center justify-center p-8 text-neutral-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-400" />
                <p>Waiting for sender to select a file...</p>
              </div>
            )}

            {receiving && metadata && progress && !downloadBlob && (
              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-6 space-y-6 z-10 w-full relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 pr-4">
                    <p className="text-sm text-neutral-400 uppercase tracking-widest">Receiving</p>
                    <p className="text-white font-medium truncate max-w-[250px]">{metadata.name}</p>
                    <p className="text-neutral-500 text-sm">{formatBytes(metadata.size)}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <ProgressBar stats={progress} />
                </div>
              </div>
            )}

            {downloadBlob && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                   <Check className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-white font-medium mb-1">{downloadBlob.meta.name}</p>
                  <p className="text-emerald-400/80 text-sm">Successfully received</p>
                </div>
                <button 
                  onClick={handleDownload}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition flex justify-center items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Save File
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
