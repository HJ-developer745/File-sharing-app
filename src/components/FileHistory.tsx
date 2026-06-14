import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { formatBytes } from '../lib/utils';
import { Trash2, Search, ArrowDownToLine, ArrowUpFromLine, Clock } from 'lucide-react';

export type FileHistoryEntry = {
  id: string;
  name: string;
  size: number;
  type: string;
  date: number;
  direction: 'sent' | 'received';
  peerName?: string;
};

export function FileHistoryManager() {
  const { user } = useAuth();
  const [history, setHistory] = useState<FileHistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'size' | 'name'>('date');
  
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`flowshare_history_${user.id}`);
      if (stored) {
         setHistory(JSON.parse(stored));
      }
    }
  }, [user]);

  const handleDelete = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    if (user) {
      localStorage.setItem(`flowshare_history_${user.id}`, JSON.stringify(newHistory));
    }
  };

  const filteredHistory = history
    .filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') return b.date - a.date;
      if (sortBy === 'size') return b.size - a.size;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-3xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-white text-lg">Transfer History</h3>
      </div>
      
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="date">Date</option>
          <option value="size">Size</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No transfer history found</p>
          </div>
        ) : (
          filteredHistory.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.direction === 'sent' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {item.direction === 'sent' ? <ArrowUpFromLine className="w-5 h-5" /> : <ArrowDownToLine className="w-5 h-5" />}
                </div>
                <div className="truncate">
                  <div className="text-sm font-medium text-white truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 flex gap-2">
                    <span>{formatBytes(item.size)}</span>
                    <span>•</span>
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                    {item.peerName && (
                      <>
                        <span>•</span>
                        <span>{item.direction === 'sent' ? 'To' : 'From'}: {item.peerName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                title="Remove from history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Utility function to add history entry
export function addHistoryEntry(userId: string, entry: Omit<FileHistoryEntry, 'id'>) {
  const existing = localStorage.getItem(`flowshare_history_${userId}`);
  let history: FileHistoryEntry[] = existing ? JSON.parse(existing) : [];
  
  const newEntry: FileHistoryEntry = {
    ...entry,
    id: Math.random().toString(36).substr(2, 9)
  };
  
  history = [newEntry, ...history];
  localStorage.setItem(`flowshare_history_${userId}`, JSON.stringify(history));
}
