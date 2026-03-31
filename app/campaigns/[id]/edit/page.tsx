export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getCampaignById } from '@/services/campaigns';
import { CampaignForm } from '@/components/campaign-form';

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) notFound();

  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your campaign settings
        </p>
      </div>
      <CampaignForm campaign={campaign} />
    </div>
  );
}
