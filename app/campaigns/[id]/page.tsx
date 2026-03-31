export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getCampaignWithCounts } from '@/services/campaigns';
import { getContacts } from '@/services/contacts';
import { CampaignDetail } from './campaign-detail';

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) notFound();

  const campaign = await getCampaignWithCounts(id);
  if (!campaign) notFound();

  const contactList = await getContacts(id);

  return (
    <CampaignDetail
      campaignId={id}
      initialCampaign={campaign}
      initialContacts={contactList}
    />
  );
}
