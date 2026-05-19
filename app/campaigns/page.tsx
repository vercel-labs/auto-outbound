export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignCard } from '@/components/campaign-card';
import { getCampaigns } from '@/services/campaigns';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq, count } from 'drizzle-orm';

export default async function CampaignsPage() {
  const campaignList = await getCampaigns();

  // Get contact counts for each campaign
  const countsMap: Record<number, number> = {};
  if (campaignList.length > 0) {
    const rows = await db
      .select({
        campaignId: contacts.campaignId,
        count: count(),
      })
      .from(contacts)
      .groupBy(contacts.campaignId);

    for (const row of rows) {
      countsMap[row.campaignId] = row.count;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage email campaigns
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            New Campaign
          </Button>
        </Link>
      </div>

      {campaignList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No campaigns yet</p>
          <Link href="/campaigns/new">
            <Button>Create your first campaign</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaignList.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              contactCount={countsMap[campaign.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
