'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface ProcessButtonProps {
  campaignId: string;
  pendingCount: number;
  processAction: () => Promise<void>;
}

export function ProcessButton({
  pendingCount,
  processAction,
}: ProcessButtonProps) {
  const [processing, setProcessing] = useState(false);

  async function handleClick() {
    setProcessing(true);
    try {
      await processAction();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={processing}
      size="lg"
      className="w-full"
    >
      <Play className="h-4 w-4 mr-2" />
      {processing
        ? 'Processing...'
        : `Process ${pendingCount} pending contact${pendingCount !== 1 ? 's' : ''}`}
    </Button>
  );
}
