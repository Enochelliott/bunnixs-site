'use client';

import { useState } from 'react';
import { useBlocking } from '@/hooks/useBlocking';
import toast from 'react-hot-toast';

interface Props {
  targetId: string;
  targetUsername: string;
  onBlock?: () => void;
}

export default function BlockButton({ targetId, targetUsername, onBlock }: Props) {
  const { isBlocked, block, unblock } = useBlocking(targetId);
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    setLoading(true);
    if (isBlocked) {
      const ok = await unblock(targetId);
      if (ok) toast.success(`Unblocked @${targetUsername}`);
    } else {
      const ok = await block(targetId);
      if (ok) {
        toast.success(`Blocked @${targetUsername}`);
        onBlock?.();
      }
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleBlock}
      disabled={loading}
      className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-all ${
        isBlocked
          ? 'bg-bunni-dark border border-bunni-border text-bunni-muted hover:border-red-400 hover:text-red-400'
          : 'bg-bunni-dark border border-bunni-border text-bunni-muted hover:border-red-400 hover:text-red-400'
      }`}
    >
      {loading ? '...' : isBlocked ? '🔓 Unblock' : '🚫 Block'}
    </button>
  );
}
