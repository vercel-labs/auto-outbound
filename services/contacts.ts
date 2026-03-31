'use server';

import { db } from '@/db';
import { contacts, type ContactInsert } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { start } from 'workflow/api';
import { processContactWorkflow } from '@/workflows/process-contact';

export async function getContacts(campaignId: number) {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.campaignId, campaignId))
    .orderBy(desc(contacts.createdAt));
}

export async function clearContacts(campaignId: number) {
  await db.delete(contacts).where(eq(contacts.campaignId, campaignId));
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function addContacts(
  campaignId: number,
  contactsData: Omit<ContactInsert, 'campaignId'>[],
) {
  if (contactsData.length === 0) return [];

  const rows = contactsData.map((c) => ({ ...c, campaignId }));
  const result = await db.insert(contacts).values(rows).returning();
  revalidatePath(`/campaigns/${campaignId}`);
  return result;
}

/**
 * Add contacts and immediately kick off processing workflows for each one.
 */
export async function addAndProcessContacts(
  campaignId: number,
  contactsData: Omit<ContactInsert, 'campaignId'>[],
) {
  const created = await addContacts(campaignId, contactsData);

  // Start a workflow for each contact — they all run concurrently with retries
  await Promise.all(
    created.map((c) => start(processContactWorkflow, [c.id])),
  );

  return created;
}

/**
 * Start a processing workflow for a single contact.
 */
export async function startContactWorkflow(contactId: number) {
  await start(processContactWorkflow, [contactId]);
}

/**
 * Kick off workflows for all pending contacts in a campaign.
 */
export async function processAllContacts(campaignId: number) {
  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.campaignId, campaignId));

  const pending = allContacts.filter((c) => c.status === 'pending');

  // Start all workflows concurrently — each contact processes independently
  await Promise.all(
    pending.map((c) => start(processContactWorkflow, [c.id])),
  );

  revalidatePath(`/campaigns/${campaignId}`);
  return { started: pending.length };
}
