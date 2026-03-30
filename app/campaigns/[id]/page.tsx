export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getCampaignWithCounts } from '@/services/campaigns';
import { getContacts, processAllContacts } from '@/services/contacts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ContactTable } from '@/components/contact-table';
import { CsvUploader } from '@/components/csv-uploader';
import { ProcessButton } from './process-button';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteCampaign, updateCampaign } from '@/services/campaigns';
import { redirect } from 'next/navigation';

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) notFound();

  const campaign = await getCampaignWithCounts(id);

  if (!campaign) {
    notFound();
  }

  const contactList = await getContacts(id);

  async function handleDelete() {
    'use server';
    await deleteCampaign(id);
    redirect('/campaigns');
  }

  async function handleActivate() {
    'use server';
    await updateCampaign(id, { status: 'active' });
    redirect(`/campaigns/${id}`);
  }

  async function handleProcess() {
    'use server';
    await processAllContacts(id);
    redirect(`/campaigns/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{campaign.name}</h1>
            <Badge
              variant={campaign.status === 'active' ? 'default' : 'secondary'}
            >
              {campaign.status}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {campaign.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <form action={handleActivate}>
              <Button variant="outline">Activate</Button>
            </form>
          )}
          <Link href={`/campaigns/new?edit=${campaign.id}`}>
            <Button variant="outline" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <form action={handleDelete}>
            <Button variant="outline" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{campaign.counts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{campaign.counts.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {campaign.counts.completed}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{campaign.counts.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload CSV */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <CsvUploader campaignId={id} />
        </CardContent>
      </Card>

      {/* Add via API */}
      <Card>
        <CardHeader>
          <CardTitle>Add Contacts via API</CardTitle>
          <p className="text-sm text-muted-foreground">
            You can also add contacts programmatically using the{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              POST /api/contacts
            </code>{' '}
            endpoint. This is useful when integrating with badge scanners, CRMs,
            or other event tools.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
            <code>{`curl -X POST ${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-app.vercel.app'}/api/contacts \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaignId": ${id},
    "contact": {
      "email": "alex.wong@newco.dev",
      "firstName": "Alex",
      "lastName": "Wong",
      "companyName": "NewCo",
      "context": "Visited booth on Day 2 - asked about Kubernetes integration"
    }
  }'`}</code>
          </pre>
          <p className="text-xs text-muted-foreground">
            Required fields: <code className="rounded bg-muted px-1 py-0.5">email</code>,{' '}
            <code className="rounded bg-muted px-1 py-0.5">firstName</code>,{' '}
            <code className="rounded bg-muted px-1 py-0.5">companyName</code>.
            Optional: <code className="rounded bg-muted px-1 py-0.5">lastName</code>,{' '}
            <code className="rounded bg-muted px-1 py-0.5">context</code> (mapped to notes).
          </p>
        </CardContent>
      </Card>

      {/* Process */}
      {campaign.counts.pending > 0 && (
        <ProcessButton
          campaignId={id}
          pendingCount={campaign.counts.pending}
          processAction={handleProcess}
        />
      )}

      {/* Contacts table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Contacts ({contactList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContactTable contacts={contactList} />
        </CardContent>
      </Card>
    </div>
  );
}
