'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createCampaign, updateCampaign } from '@/services/campaigns';
import type { Campaign } from '@/db/schema';

interface CampaignFormProps {
  campaign?: Campaign;
}

export function CampaignForm({ campaign }: CampaignFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [outreachMode, setOutreachMode] = useState<string>(
    campaign?.outreachMode ?? 'none',
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      systemPrompt: formData.get('systemPrompt') as string,
      researchEnabled: formData.get('researchEnabled') === 'on',
      peopleResearchEnabled: formData.get('peopleResearchEnabled') === 'on',
      numberOfFollowUps: parseInt(
        formData.get('numberOfFollowUps') as string,
      ),
      outreachMode: formData.get('outreachMode') as 'none' | 'upsert_only' | 'full',
      outreachSequenceId:
        outreachMode === 'full' && formData.get('outreachSequenceId')
          ? parseInt(formData.get('outreachSequenceId') as string)
          : null,
      mailboxId:
        outreachMode !== 'none' && formData.get('mailboxId')
          ? parseInt(formData.get('mailboxId') as string)
          : null,
    };

    try {
      if (campaign) {
        await updateCampaign(campaign.id, data);
        router.push(`/campaigns/${campaign.id}`);
      } else {
        const created = await createCampaign(data);
        router.push(`/campaigns/${created.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={campaign?.name}
              placeholder="Q1 Email Agent - Enterprise"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={campaign?.description || ''}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              name="systemPrompt"
              rows={12}
              defaultValue={campaign?.systemPrompt}
              placeholder="Instructions for AI email generation..."
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default email generation prompt.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="researchEnabled"
                name="researchEnabled"
                defaultChecked={campaign?.researchEnabled ?? true}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="researchEnabled">Company research</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="peopleResearchEnabled"
                name="peopleResearchEnabled"
                defaultChecked={campaign?.peopleResearchEnabled ?? false}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="peopleResearchEnabled">People research</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numberOfFollowUps">Follow-up emails</Label>
            <select
              id="numberOfFollowUps"
              name="numberOfFollowUps"
              defaultValue={campaign?.numberOfFollowUps ?? 2}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="0">0 (initial email only)</option>
              <option value="1">1 follow-up</option>
              <option value="2">2 follow-ups</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outreach Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="outreachMode"
                value="none"
                checked={outreachMode === 'none'}
                onChange={() => setOutreachMode('none')}
                className="mt-0.5 h-4 w-4"
              />
              <div>
                <div className="font-medium text-sm">Keep in Email Agent only</div>
                <p className="text-xs text-muted-foreground">
                  Emails are generated and stored in the app. Nothing is sent to Outreach.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="outreachMode"
                value="upsert_only"
                checked={outreachMode === 'upsert_only'}
                onChange={() => setOutreachMode('upsert_only')}
                className="mt-0.5 h-4 w-4"
              />
              <div>
                <div className="font-medium text-sm">Sync prospects to Outreach</div>
                <p className="text-xs text-muted-foreground">
                  Creates or updates the prospect in Outreach with generated emails. SDRs can manually review and send.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="outreachMode"
                value="full"
                checked={outreachMode === 'full'}
                onChange={() => setOutreachMode('full')}
                className="mt-0.5 h-4 w-4"
              />
              <div>
                <div className="font-medium text-sm">Sync and enroll in sequence</div>
                <p className="text-xs text-muted-foreground">
                  Creates or updates the prospect AND adds them to an Outreach sequence automatically.
                </p>
              </div>
            </label>
          </div>

          {outreachMode === 'full' && (
            <div className="space-y-2">
              <Label htmlFor="outreachSequenceId">Outreach Sequence ID</Label>
              <Input
                id="outreachSequenceId"
                name="outreachSequenceId"
                type="number"
                required
                defaultValue={campaign?.outreachSequenceId || ''}
                placeholder="Sequence ID for enrollment"
              />
            </div>
          )}

          {outreachMode !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="mailboxId">Mailbox ID</Label>
              <Input
                id="mailboxId"
                name="mailboxId"
                type="number"
                defaultValue={campaign?.mailboxId || ''}
                placeholder="Optional Outreach mailbox ID"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? 'Saving...'
            : campaign
              ? 'Update Campaign'
              : 'Create Campaign'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
