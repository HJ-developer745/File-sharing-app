import React from 'react';
import { FileTransferProgress } from '../lib/fileTransfer';
import { formatBytes } from '../lib/utils';
import { motion } from 'framer-motion';

export function ProgressBar({ stats }: { stats: FileTransferProgress }) {
  const { progress, speed, eta } = stats;

  const formatEta = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return 'Estimating...';
    if (seconds < 60) return `${Math.round(seconds)}s left`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s left`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-neutral-400">
        <span>{formatBytes(speed)}/s</span>
        <span>{formatEta(eta)}</span>
      </div>
      
      <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden relative">
        <motion.div 
          className="bg-indigo-500 h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>

      <div className="text-right text-xs font-mono text-indigo-300">
        {progress.toFixed(1)}%
      </div>
    </div>
  );
}
