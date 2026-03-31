'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getCampaignWithCounts, deleteCampaign, updateCampaign } from '@/services/campaigns';
import { getContacts, processAllContacts, clearContacts } from '@/services/contacts';
import type { Campaign, Contact } from '@/db/schema';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Settings, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type CampaignWithCounts = Campaign & {
  counts: { total: number; pending: number; completed: number; failed: number };
};

interface CampaignDetailProps {
  campaignId: number;
  initialCampaign: CampaignWithCounts;
  initialContacts: Contact[];
}

export function CampaignDetail({
  campaignId,
  initialCampaign,
  initialContacts,
}: CampaignDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const hasProcessingContacts = (contactList: Contact[]) =>
    contactList.some((c) =>
      ['researching', 'generating', 'sending'].includes(c.status),
    );

  const { data: campaign } = useQuery({
    queryKey: queryKeys.campaigns.detail(campaignId),
    queryFn: () => getCampaignWithCounts(campaignId),
    initialData: initialCampaign,
    refetchInterval: (query) => {
      const contacts = queryClient.getQueryData<Contact[]>(
        queryKeys.campaigns.contacts(campaignId),
      );
      return contacts && hasProcessingContacts(contacts) ? 3000 : false;
    },
  });

  const { data: contactList } = useQuery({
    queryKey: queryKeys.campaigns.contacts(campaignId),
    queryFn: () => getContacts(campaignId),
    initialData: initialContacts,
    refetchInterval: (query) => {
      return query.state.data && hasProcessingContacts(query.state.data)
        ? 3000
        : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      router.push('/campaigns');
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => updateCampaign(campaignId, { status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.detail(campaignId),
      });
    },
  });

  const processMutation = useMutation({
    mutationFn: () => processAllContacts(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.detail(campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.contacts(campaignId),
      });
    },
  });

  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const clearMutation = useMutation({
    mutationFn: () => clearContacts(campaignId),
    onSuccess: () => {
      setClearDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.detail(campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.contacts(campaignId),
      });
    },
  });

  if (!campaign) return null;

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
            <Button
              variant="outline"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
            >
              Activate
            </Button>
          )}
          <Link href={`/campaigns/${campaign.id}/edit`}>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
          <CsvUploader campaignId={campaignId} />
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
    "campaignId": ${campaignId},
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
          pendingCount={campaign.counts.pending}
          onProcess={() => processMutation.mutateAsync()}
          isPending={processMutation.isPending}
        />
      )}

      {/* Contacts table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Contacts ({contactList.length})
          </CardTitle>
          {contactList.length > 0 && (
            <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  Clear all
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear all contacts?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete all {contactList.length} contact{contactList.length !== 1 ? 's' : ''} from
                    this campaign, including any generated emails and research
                    data. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={() => clearMutation.mutate()}
                    disabled={clearMutation.isPending}
                  >
                    {clearMutation.isPending ? 'Clearing...' : 'Clear contacts'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <ContactTable contacts={contactList} />
        </CardContent>
      </Card>
    </div>
  );
}
