'use server';

import { db } from '@/db';
import { campaigns, contacts, type CampaignInsert } from '@/db/schema';
import { eq, desc, count, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/email/generation';

export async function getCampaigns() {
  return db.select().from(campaigns).orderBy(desc(campaigns.updatedAt));
}

export async function getCampaignById(id: number) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1);
  return campaign ?? null;
}

export async function getCampaignWithCounts(id: number) {
  const campaign = await getCampaignById(id);
  if (!campaign) return null;

  const [statusCounts] = await db
    .select({
      total: count(),
      pending: count(
        sql`CASE WHEN ${contacts.status} = 'pending' THEN 1 END`,
      ),
      completed: count(
        sql`CASE WHEN ${contacts.status} = 'completed' THEN 1 END`,
      ),
      failed: count(
        sql`CASE WHEN ${contacts.status} = 'failed' THEN 1 END`,
      ),
    })
    .from(contacts)
    .where(eq(contacts.campaignId, id));

  return {
    ...campaign,
    counts: {
      total: statusCounts?.total ?? 0,
      pending: statusCounts?.pending ?? 0,
      completed: statusCounts?.completed ?? 0,
      failed: statusCounts?.failed ?? 0,
    },
  };
}

export async function createCampaign(
  data: Omit<CampaignInsert, 'systemPrompt'> & { systemPrompt?: string },
) {
  const [campaign] = await db
    .insert(campaigns)
    .values({
      ...data,
      systemPrompt: data.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    })
    .returning();

  revalidatePath('/campaigns');
  return campaign!;
}

export async function updateCampaign(
  id: number,
  data: Partial<CampaignInsert>,
) {
  const [campaign] = await db
    .update(campaigns)
    .set(data)
    .where(eq(campaigns.id, id))
    .returning();

  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${id}`);
  return campaign ?? null;
}

export async function deleteCampaign(id: number) {
  await db.delete(contacts).where(eq(contacts.campaignId, id));
  await db.delete(campaigns).where(eq(campaigns.id, id));
  revalidatePath('/campaigns');
}
