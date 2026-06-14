import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../lib/useWebRTC';
import { Send } from 'lucide-react';

type ChatProps = {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  peerName?: string;
};

export function ChatPanel({ messages, onSendMessage, peerName }: ChatProps) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700 font-medium text-sm text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Direct Chat {peerName ? `with ${peerName}` : ''}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center px-4">
            Connection established. Secure chat started. Messages are peer-to-peer and not saved.
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-end gap-2 max-w-[85%]">
                <div 
                  className={`px-3 py-2 rounded-2xl text-sm ${
                    msg.sender === 'me' 
                      ? 'bg-emerald-600 text-white rounded-br-sm' 
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-sm'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {msg.text}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-slate-800/50 border-t border-slate-700 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={!text.trim()}
            className="bg-emerald-500 text-slate-950 p-2 rounded-xl disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-500 hover:bg-emerald-400 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
