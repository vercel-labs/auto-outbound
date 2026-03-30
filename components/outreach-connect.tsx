'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { disconnectOutreach } from '@/services/outreach';
import { useRouter } from 'next/navigation';

interface OutreachConnectProps {
  connected: boolean;
  expiresAt?: Date | null;
  authUrl: string;
}

export function OutreachConnect({
  connected,
  expiresAt,
  authUrl,
}: OutreachConnectProps) {
  const router = useRouter();

  async function handleDisconnect() {
    await disconnectOutreach();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Outreach</CardTitle>
            <CardDescription>
              Connect your Outreach account to enroll prospects in sequences
            </CardDescription>
          </div>
          <Badge variant={connected ? 'default' : 'outline'}>
            {connected ? 'Connected' : 'Not connected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="space-y-3">
            {expiresAt && (
              <p className="text-sm text-muted-foreground">
                Token expires: {expiresAt.toLocaleDateString()}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = authUrl;
                }}
              >
                Reconnect
              </Button>
              <Button variant="destructive" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => {
              window.location.href = authUrl;
            }}
          >
            Connect Outreach
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
