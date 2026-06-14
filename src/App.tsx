/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from "react";
import { formatBytes } from "./lib/utils";
import { useWebRTC } from "./lib/useWebRTC";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { AuthScreen } from "./components/AuthScreen";
import { FileHistoryManager, addHistoryEntry } from "./components/FileHistory";
import { ChatPanel } from "./components/ChatPanel";
import { LogOut } from "lucide-react";

function MainApp() {
  const { user, logout } = useAuth();
  
  const {
    isReady,
    myDevice,
    devices,
    transferState,
    incomingRequest,
    chatMessages,
    requestConnection,
    acceptConnection,
    rejectConnection,
    sendFile,
    sendChatMessage,
    disconnect
  } = useWebRTC();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (transferState.status === "completed" && transferState.fileInfo && user) {
      // Record transfer in history
      addHistoryEntry(user.id, {
        name: transferState.fileInfo.name,
        size: transferState.fileInfo.size,
        type: transferState.fileInfo.type,
        date: Date.now(),
        direction: transferState.role as 'sent' | 'received',
        peerName: transferState.peerInfo?.name
      });
    }
  }, [transferState.status]);

  const handleSendClick = () => {
    if (transferState.isConnected && transferState.peerInfo) {
      fileInputRef.current?.click();
    } else {
      alert("Please connect to a node first.");
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sendFile(file);
    }
    // reset input
    if (e.target) e.target.value = '';
  };
  
  const handleDeviceClick = (deviceId: string) => {
    if (transferState.status === "idle" && !transferState.isConnected) {
        requestConnection(deviceId);
    }
  }

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-6 flex flex-col gap-4 overflow-hidden">
      {/* Header Section */}
      <header className="flex justify-between items-center bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Orbital Share</h1>
            <p className="text-xs text-slate-400 font-mono hidden sm:block">
              {user?.username} • {isReady ? "P2P Mesh Active" : "Initializing..."}
            </p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className={`w-2 h-2 ${isReady ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'} rounded-full`}></span>
              <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider">Direct</span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="grid grid-cols-1 md:grid-cols-12 grid-rows-none md:grid-rows-6 gap-4 flex-grow md:max-h-[800px] overflow-y-auto md:overflow-visible">
        
        {/* Left Column: Actions and Active Transfer */}
        <div className="col-span-1 md:col-span-8 md:row-span-6 flex flex-col gap-4">
            
            {/* Primary Actions (Send/Receive) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={handleSendClick}
                className={`rounded-3xl p-6 flex flex-col justify-between border shadow-2xl transition-all ${
                  transferState.isConnected && transferState.peerInfo
                  ? "bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-400/20 active:scale-[0.98] cursor-pointer group" 
                  : "bg-slate-900 border-slate-800 opacity-60 cursor-not-allowed"
                }`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${transferState.isConnected ? 'bg-white/10' : 'bg-slate-800'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${transferState.isConnected ? 'text-white' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${transferState.isConnected ? 'text-white' : 'text-slate-300'}`}>Send Files</h2>
                  <p className={`text-xs leading-relaxed ${transferState.isConnected ? 'text-emerald-100/80' : 'text-slate-500'}`}>
                    {transferState.isConnected ? `Ready to send to ${transferState.peerInfo?.name}.` : 'Select a node from the list to enable sending.'}
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-600 transition-colors">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Receive</h2>
                  {incomingRequest ? (
                     <div className="mt-2 space-y-2">
                        <p className="text-emerald-400 text-xs font-medium break-words">Request from {incomingRequest.name}</p>
                        <div className="flex gap-2">
                            <button onClick={acceptConnection} className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded text-xs font-bold hover:bg-emerald-500/30 flex-1">ACCEPT</button>
                            <button onClick={rejectConnection} className="bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded text-xs font-bold hover:bg-rose-500/30 flex-1">REJECT</button>
                        </div>
                     </div>
                  ) : transferState.isConnected ? (
                     <p className="text-emerald-400 text-xs font-medium pt-2">Connected. Waiting for files...</p>
                  ) : (
                    <p className="text-slate-400 text-xs leading-relaxed">Open your device to incoming discovery requests and secure handshakes.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Active Transfer (Shows either Active or Idle) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-center min-h-[160px] shrink-0">
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4 items-center flex-1">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                     {transferState.status === "completed" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                     ) : transferState.status === "error" ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                     ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${transferState.status === 'transferring' ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                         </svg>
                     )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-white truncate w-full">
                      {transferState.fileInfo?.name || (transferState.status === "connecting" ? "Establishing Connection..." : transferState.isConnected ? "Connected / Idle" : "No Active Transfer")}
                    </h4>
                     <p className="text-xs text-slate-400 truncate w-full flex items-center gap-1 mt-0.5">
                       {transferState.status === "transferring" || transferState.status === "completed" ? (
                          <>{transferState.role === "sender" ? "Sending to" : "Receiving from"} <span className="text-emerald-400 font-medium truncate max-w-[80px] sm:max-w-xs">{transferState.peerInfo?.name}</span></>
                       ) : transferState.status === "requesting" ? (
                           <>Connecting to <span className="text-emerald-400 truncate max-w-[80px] sm:max-w-xs">{transferState.peerInfo?.name}</span></>
                       ) : transferState.status === "error" ? (
                           <span className="text-rose-400">Transfer Failed</span>
                       ) : (
                           transferState.isConnected ? `Secured link with ${transferState.peerInfo?.name}` : "Standby"
                       )}
                     </p>
                  </div>
                </div>
                {["transferring", "completed"].includes(transferState.status) && transferState.fileInfo && (
                    <div className="text-right font-mono shrink-0 hidden sm:block">
                      <div className="text-xl font-bold text-emerald-400">{Math.round(transferState.progress * 100)}%</div>
                      <div className="text-[10px] text-slate-500 uppercase">
                          {formatBytes(transferState.fileInfo.size * transferState.progress)} / {formatBytes(transferState.fileInfo.size)}
                      </div>
                    </div>
                )}
              </div>

              {transferState.fileInfo && (
                  <div className="space-y-4 mt-4">
                    {["transferring", "completed"].includes(transferState.status) && (
                        <div className="flex justify-between sm:hidden mb-1 font-mono text-[10px]">
                            <span className="text-slate-400 uppercase">{formatBytes(transferState.fileInfo.size * transferState.progress)} / {formatBytes(transferState.fileInfo.size)}</span>
                            <span className="text-emerald-400 font-bold">{Math.round(transferState.progress * 100)}%</span>
                        </div>
                    )}
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ease-out ${transferState.status === "completed" ? 'bg-emerald-400' : transferState.status === "error" ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`} 
                        style={{ width: `${transferState.progress * 100}%` }}
                       ></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <div className="flex gap-4 text-slate-400">
                        <span>SPEED: <strong className="text-slate-200">{formatBytes(transferState.speed)}/s</strong></span>
                      </div>
                      <div className="text-emerald-400 uppercase text-right">
                        {transferState.status === "completed" ? (
                            <strong className="text-white">Transfer Complete</strong>
                        ) : transferState.status === "transferring" ? (
                            <>Estimated: <strong className="text-white">{Math.round(transferState.eta)}s Remaining</strong></>
                        ) : transferState.status === "error" ? (
                             <strong className="text-rose-400">Error Occurred</strong>
                        ) : null}
                      </div>
                    </div>
                  </div>
              )}
            </div>

            {/* Chat Panel - Only visible when connected */}
            {transferState.isConnected && (
              <div className="flex-1 min-h-[250px]">
                <ChatPanel 
                  messages={chatMessages} 
                  onSendMessage={sendChatMessage} 
                  peerName={transferState.peerInfo?.name} 
                />
              </div>
            )}
        </div>

        {/* Right Column: Node Discovery and History */}
        <div className="col-span-1 md:col-span-4 md:row-span-6 flex flex-col gap-4 max-h-full">
            {/* Nearby Devices */}
            <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col transition-all ${transferState.isConnected ? 'h-[200px] shrink-0' : 'min-h-[250px] flex-1'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-lg">Nearby Nodes</h3>
                <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  Scanning
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {devices.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500 py-6 text-center px-4">No nearby nodes discovered yet.</div>
                ) : (
                  devices.map((device) => {
                    const isSelected = transferState.peerInfo?.id === device.id;
                    return (
                     <div key={device.id} className={`flex items-center justify-between p-3 rounded-xl border ${isSelected ? 'bg-slate-800/80 border-emerald-500/50' : 'bg-slate-800/40 border-slate-700/50'} transition-colors`}>
                       <div className="flex items-center gap-3 overflow-hidden">
                         <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 text-slate-200">
                           {device.name.substring(0, 3).toUpperCase()}
                         </div>
                         <div className="truncate">
                           <div className="text-sm font-medium text-white truncate">{device.name}</div>
                           <div className="text-[10px] text-slate-500">Node: {device.id.substring(0,6)}</div>
                         </div>
                       </div>
                       {isSelected ? (
                            <button onClick={disconnect} className="text-[10px] font-bold text-rose-400 uppercase hover:text-rose-300 px-2 py-1 bg-rose-500/10 rounded ml-2 shrink-0">Drop</button>
                       ) : (
                            <button 
                                onClick={() => handleDeviceClick(device.id)} 
                                disabled={transferState.status !== "idle" || transferState.isConnected}
                                className={`text-[10px] font-bold text-emerald-400 uppercase hover:text-emerald-300 px-2 py-1 bg-emerald-500/10 rounded ml-2 shrink-0 ${(transferState.status !== "idle" || transferState.isConnected) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {transferState.status === "requesting" && transferState.peerInfo?.id === device.id ? "Wait..." : "Pair"}
                            </button>
                       )}
                     </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* File Management / History */}
            <div className={`flex-1 min-h-[300px] overflow-hidden ${transferState.isConnected ? 'hidden md:flex' : ''}`}>
               <FileHistoryManager />
            </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user } = useAuth();
  if (!user) {
    return <AuthScreen />;
  }
  return <MainApp />;
}



