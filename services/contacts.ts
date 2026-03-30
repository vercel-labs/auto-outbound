'use server';

import { db } from '@/db';
import {
  contacts,
  campaigns,
  type ContactInsert,
  type Contact,
} from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { researchCompany } from '@/lib/research/company';
import { researchPerson } from '@/lib/research/people';
import { buildEmailGenerationPrompt } from '@/lib/email/generation';
import {
  createEmailGenerationSchema,
  type EmailGenerationResult,
} from '@/lib/email/schema';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  upsertProspect,
  addProspectToSequence,
  setProspectCustomFields,
} from '@/lib/outreach/prospects';

export async function getContacts(campaignId: string) {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.campaignId, campaignId))
    .orderBy(desc(contacts.createdAt));
}

export async function addContacts(
  campaignId: string,
  contactsData: Omit<ContactInsert, 'campaignId'>[],
) {
  if (contactsData.length === 0) return [];

  const rows = contactsData.map((c) => ({ ...c, campaignId }));
  const result = await db.insert(contacts).values(rows).returning();
  revalidatePath(`/campaigns/${campaignId}`);
  return result;
}

async function updateContactStatus(
  contactId: string,
  status: Contact['status'],
  extra?: Partial<ContactInsert>,
) {
  await db
    .update(contacts)
    .set({ status, ...extra })
    .where(eq(contacts.id, contactId));
}

export async function processContact(contactId: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!contact) throw new Error('Contact not found');

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, contact.campaignId))
    .limit(1);

  if (!campaign) throw new Error('Campaign not found');

  try {
    // 1. Research phase
    await updateContactStatus(contactId, 'researching');

    let companyResearch = null;
    if (campaign.researchEnabled) {
      companyResearch = await researchCompany(contact.company);
    }

    let peopleResearch = null;
    if (campaign.peopleResearchEnabled) {
      peopleResearch = await researchPerson({
        contactName: `${contact.firstName} ${contact.lastName || ''}`.trim(),
        contactEmail: contact.email,
        accountName: contact.company,
      });
    }

    await db
      .update(contacts)
      .set({ companyResearch, peopleResearch })
      .where(eq(contacts.id, contactId));

    // 2. Email generation phase
    await updateContactStatus(contactId, 'generating');

    const prompt = buildEmailGenerationPrompt({
      systemPrompt: campaign.systemPrompt,
      researchEnabled: campaign.researchEnabled,
      research: companyResearch,
      contact: {
        contactName:
          `${contact.firstName} ${contact.lastName || ''}`.trim(),
        contactEmail: contact.email,
        contactTitle: contact.title,
        accountName: contact.company,
        notes: contact.notes,
      },
      numberOfFollowUps: campaign.numberOfFollowUps,
      peopleResearchEnabled: campaign.peopleResearchEnabled,
      peopleResearch: peopleResearch,
    });

    const schema = createEmailGenerationSchema(campaign.numberOfFollowUps);

    const { object: emailContent } = await generateObject({
      model: openai('gpt-4o'),
      prompt,
      schema,
    });

    const typedEmail = emailContent as EmailGenerationResult;

    await db
      .update(contacts)
      .set({
        generatedSubject: typedEmail.subject,
        generatedBody1: typedEmail.body1,
        generatedBody2: typedEmail.body2 || null,
        generatedBody3: typedEmail.body3 || null,
      })
      .where(eq(contacts.id, contactId));

    // 3. Outreach enrollment phase (if configured)
    if (campaign.outreachSequenceId) {
      await updateContactStatus(contactId, 'sending');

      const prospectId = await upsertProspect({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        title: contact.title,
        company: contact.company,
      });

      const bodies = [typedEmail.body1];
      if (typedEmail.body2) bodies.push(typedEmail.body2);
      if (typedEmail.body3) bodies.push(typedEmail.body3);

      await setProspectCustomFields({
        prospectId,
        subject: typedEmail.subject,
        bodies,
      });

      await addProspectToSequence({
        prospectId,
        sequenceId: campaign.outreachSequenceId,
        mailboxId: campaign.mailboxId,
      });

      await db
        .update(contacts)
        .set({ outreachProspectId: prospectId })
        .where(eq(contacts.id, contactId));
    }

    // 4. Done
    await updateContactStatus(contactId, 'completed');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    await updateContactStatus(contactId, 'failed', {
      errorMessage: message,
    });
    throw error;
  }

  revalidatePath(`/campaigns/${contact.campaignId}`);
}

export async function processAllContacts(campaignId: string) {
  const pendingContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.campaignId, campaignId));

  const pending = pendingContacts.filter((c) => c.status === 'pending');

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const contact of pending) {
    try {
      await processContact(contact.id);
      results.push({ id: contact.id, success: true });
    } catch (error) {
      results.push({
        id: contact.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return results;
}
