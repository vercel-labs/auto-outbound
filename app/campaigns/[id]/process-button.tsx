'use client';

import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface ProcessButtonProps {
  pendingCount: number;
  onProcess: () => Promise<unknown>;
  isPending: boolean;
}

export function ProcessButton({
  pendingCount,
  onProcess,
  isPending,
}: ProcessButtonProps) {
  return (
    <Button
      onClick={() => onProcess()}
      disabled={isPending}
      size="lg"
      className="w-full"
    >
      <Play className="h-4 w-4 mr-2" />
      {isPending
        ? 'Processing...'
        : `Process ${pendingCount} pending contact${pendingCount !== 1 ? 's' : ''}`}
    </Button>
  );
}
