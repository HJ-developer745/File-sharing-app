import React, { useState } from 'react';
import { Sender } from './Sender';
import { Receiver } from './Receiver';
import { ArrowDownToLine, ArrowUpFromLine, Activity } from 'lucide-react';

export function Home() {
  const [mode, setMode] = useState<'home' | 'send' | 'receive'>('home');

  if (mode === 'send') return <Sender onBack={() => setMode('home')} />;
  if (mode === 'receive') return <Receiver onBack={() => setMode('home')} />;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 font-sans text-neutral-100">
      <div className="max-w-md w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
              <Activity className="w-12 h-12 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-4xl font-medium tracking-tight text-white">FlowShare</h1>
          <p className="text-neutral-400 text-lg">
            Peer-to-peer file transfer over your local network. No limits, totally private.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('send')}
            className="group relative p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-indigo-500/50 transition-all text-left flex flex-col items-start gap-4 hover:bg-neutral-800/50"
          >
            <div className="p-3 bg-neutral-800 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <ArrowUpFromLine className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white mb-1">Send File</h3>
              <p className="text-sm text-neutral-400">Share files with a 6-digit code</p>
            </div>
          </button>

          <button
            onClick={() => setMode('receive')}
            className="group relative p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-emerald-500/50 transition-all text-left flex flex-col items-start gap-4 hover:bg-neutral-800/50"
          >
            <div className="p-3 bg-neutral-800 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <ArrowDownToLine className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white mb-1">Receive File</h3>
              <p className="text-sm text-neutral-400">Enter a code to receive</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
