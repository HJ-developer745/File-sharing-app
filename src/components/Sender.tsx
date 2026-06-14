import React, { useEffect, useState, useRef } from 'react';
import { webrtcManager } from '../lib/webrtcManager';
import { FileTransferSender, FileTransferProgress } from '../lib/fileTransfer';
import { ChevronLeft, Copy, Check, FileUp, Loader2 } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import { ProgressBar } from './ProgressBar';

export function Sender({ onBack }: { onBack: () => void }) {
  const [roomId, setRoomId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<FileTransferProgress | null>(null);
  const [transferComplete, setTransferComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Generate random 6 digit room code
    const newRoomId = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomId(newRoomId);
    
    // Cleanup any existing connections first
    webrtcManager.disconnect();

    webrtcManager.onConnected = () => {
      setConnected(true);
    };

    webrtcManager.onDisconnect = () => {
      setConnected(false);
      // maybe auto-leave if disconnected mid-transfer
    };

    webrtcManager.hostRoom(newRoomId);

    return () => {
      webrtcManager.disconnect();
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const sendFile = () => {
    if (!file || !connected) return;

    const sender = new FileTransferSender(
      file,
      (stats) => {
        setProgress(stats);
      },
      () => {
        setTransferComplete(true);
      }
    );

    sender.start();
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
          <h2 className="text-2xl font-medium text-white">Send File</h2>
          {!connected ? (
            <p className="text-neutral-400">Share this code with the receiver</p>
          ) : (
            <p className="text-emerald-400 font-medium">Receiver Connected</p>
          )}
        </div>

        {!connected ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-5xl font-mono tracking-widest text-indigo-400 font-bold mb-6">
              {roomId || "------"}
            </div>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition text-neutral-300"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied" : "Copy Code"}</span>
            </button>
            <div className="flex items-center gap-3 mt-12 text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Waiting for receiver to join...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!file ? (
              <div 
                className="border-2 border-dashed border-neutral-700 hover:border-indigo-500 bg-neutral-900/50 rounded-2xl p-12 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-4"
                onClick={() => inputRef.current?.click()}
              >
                <div className="p-4 bg-indigo-500/10 rounded-full">
                  <FileUp className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-white">Select a file to send</p>
                  <p className="text-neutral-500 text-sm mt-1">Maximum transfer speed on local network</p>
                </div>
                <input 
                  type="file" 
                  ref={inputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="space-y-6 bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700/50">
                <div className="flex justify-between items-center">
                  <div className="truncate pr-4 flex-1">
                    <p className="text-white font-medium truncate">{file.name}</p>
                    <p className="text-neutral-400 text-sm">{formatBytes(file.size)}</p>
                  </div>
                  {!progress && (
                    <button 
                      onClick={() => setFile(null)}
                      className="text-neutral-500 hover:text-white transition text-sm underline"
                    >
                      Change
                    </button>
                  )}
                </div>

                {!progress && !transferComplete && (
                  <button 
                    onClick={sendFile}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition"
                  >
                    Send File
                  </button>
                )}

                {progress && !transferComplete && (
                  <div className="space-y-4 pt-4 border-t border-neutral-700/50">
                    <ProgressBar stats={progress} />
                    <button 
                      onClick={() => {
                        webrtcManager.disconnect();
                        setFile(null);
                        setProgress(null);
                      }}
                      className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition mt-4"
                    >
                      Cancel Transfer
                    </button>
                  </div>
                )}

                {transferComplete && (
                  <div className="text-center py-4 space-y-3 border-t border-neutral-700/50 pt-6">
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                       <Check className="w-6 h-6" />
                    </div>
                    <p className="text-emerald-400 font-medium text-lg">Sent Successfully!</p>
                    <button 
                      onClick={() => {
                        setFile(null);
                        setProgress(null);
                        setTransferComplete(false);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 transition text-sm"
                    >
                      Send another file
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
