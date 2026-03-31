export const dynamic = 'force-dynamic';

import { OutreachConnect } from '@/components/outreach-connect';
import { OutreachCustomFields } from '@/components/outreach-custom-fields';
import {
  getOutreachConnection,
  getOutreachAuthUrl,
} from '@/services/outreach';

export default async function SettingsPage() {
  const connection = await getOutreachConnection();
  const authUrl = await getOutreachAuthUrl();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage integrations and configuration
        </p>
      </div>

      <OutreachConnect
        connected={!!connection}
        expiresAt={connection?.expiresAt}
        authUrl={authUrl}
      />

      <OutreachCustomFields />
    </div>
  );
}
