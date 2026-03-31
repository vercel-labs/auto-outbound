import { describe, it, expect, afterEach, vi } from 'vitest';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createTracker, insertCampaign, insertContact } from './helpers';
import type { Contact } from '@/db/schema';

// ---------------------------------------------------------------------------
// Mocks — only Outreach. Exa + AI run for real.
// ---------------------------------------------------------------------------

vi.mock('@/lib/outreach/prospects', () => ({
  upsertProspect: vi.fn().mockResolvedValue(99999),
  addProspectToSequence: vi.fn().mockResolvedValue(1),
  setProspectCustomFields: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tracker = createTracker();

afterEach(async () => {
  await tracker.cleanup();
});

async function fetchContact(contactId: number): Promise<Contact | undefined> {
  const [row] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  return row;
}

async function pollForTerminalStatus(
  contactId: number,
  timeoutMs = 60_000,
  intervalMs = 1_000,
): Promise<Contact> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const row = await fetchContact(contactId);
    if (row && (row.status === 'completed' || row.status === 'failed')) {
      return row;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  const final = await fetchContact(contactId);
  throw new Error(
    `Timed out after ${timeoutMs}ms. Last status: ${final?.status ?? 'not found'}` +
      (final?.errorMessage ? ` — ${final.errorMessage}` : ''),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('processContactWorkflow', () => {
  it('researches company and generates emails for a contact', async () => {
    const campaign = await insertCampaign(tracker, {
      name: 'Workflow Integration Test',
      systemPrompt:
        'Write a short 3-email outbound sequence. Keep each email under 50 words.',
      researchEnabled: true,
      peopleResearchEnabled: false,
      numberOfFollowUps: 2,
    });

    const contact = await insertContact(tracker, campaign.id, {
      email: 'integration-test@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      company: 'Vercel',
      title: 'Engineer',
      notes: 'Met at a conference',
    });

    const { processContactWorkflow } = await import(
      '@/workflows/process-contact'
    );

    // Run workflow in background, poll DB for status transitions.
    // Attach a no-op catch so the promise doesn't become an unhandled rejection
    // if polling throws first (e.g. timeout).
    const workflowPromise = processContactWorkflow(contact.id);
    workflowPromise.catch(() => {});

    const result = await pollForTerminalStatus(contact.id);
    await workflowPromise;

    expect(result.status).toBe('completed');

    // Company research should be populated
    expect(result.companyResearch).not.toBeNull();
    expect(result.companyResearch!.companySummary).toBeTruthy();
    expect(Array.isArray(result.companyResearch!.existingAIFeatures)).toBe(
      true,
    );

    // People research should be null (disabled for this campaign)
    expect(result.peopleResearch).toBeNull();

    // Emails should be generated
    expect(result.generatedSubject).toBeTruthy();
    expect(result.generatedBody1).toBeTruthy();
    expect(result.generatedBody2).toBeTruthy();
    expect(result.generatedBody3).toBeTruthy();

    // Outreach was not configured, so no prospect ID
    expect(result.outreachProspectId).toBeNull();
  }, 90_000);

  it('researches both company and person when people research is enabled', async () => {
    const campaign = await insertCampaign(tracker, {
      name: 'People Research Test',
      systemPrompt: 'Write a very short email sequence. Under 30 words each.',
      researchEnabled: true,
      peopleResearchEnabled: true,
      numberOfFollowUps: 0,
    });

    const contact = await insertContact(tracker, campaign.id, {
      email: 'people-test@example.com',
      firstName: 'Guillermo',
      lastName: 'Rauch',
      company: 'Vercel',
      title: 'CEO',
    });

    const { processContactWorkflow } = await import(
      '@/workflows/process-contact'
    );

    await processContactWorkflow(contact.id);

    const result = await fetchContact(contact.id);

    expect(result!.status).toBe('completed');
    expect(result!.companyResearch).not.toBeNull();

    // People research may or may not find a confident match — we verify
    // the workflow completed and emails were generated either way.
    expect(result!.generatedSubject).toBeTruthy();
    expect(result!.generatedBody1).toBeTruthy();

    // Only 1 email (0 follow-ups)
    expect(result!.generatedBody2).toBeNull();
    expect(result!.generatedBody3).toBeNull();
  }, 90_000);

  it('calls outreach mocks when outreachSequenceId is configured', async () => {
    const { upsertProspect, addProspectToSequence, setProspectCustomFields } =
      await import('@/lib/outreach/prospects');

    const campaign = await insertCampaign(tracker, {
      name: 'Outreach Mock Test',
      systemPrompt: 'Write a very short email. Under 30 words.',
      researchEnabled: false,
      peopleResearchEnabled: false,
      numberOfFollowUps: 0,
      outreachSequenceId: 42,
      mailboxId: 7,
    });

    const contact = await insertContact(tracker, campaign.id, {
      email: 'outreach-test@example.com',
      firstName: 'Test',
      company: 'MockCorp',
    });

    const { processContactWorkflow } = await import(
      '@/workflows/process-contact'
    );

    await processContactWorkflow(contact.id);

    const result = await fetchContact(contact.id);

    expect(result!.status).toBe('completed');
    expect(result!.outreachProspectId).toBe(99999);

    // Verify Outreach mocks were called
    expect(upsertProspect).toHaveBeenCalledOnce();
    expect(setProspectCustomFields).toHaveBeenCalledOnce();
    expect(addProspectToSequence).toHaveBeenCalledWith({
      prospectId: 99999,
      sequenceId: 42,
      mailboxId: 7,
    });
  }, 90_000);

  it('throws when contact does not exist', async () => {
    const { processContactWorkflow } = await import(
      '@/workflows/process-contact'
    );

    await expect(processContactWorkflow(999999999)).rejects.toThrow(
      'Contact 999999999 not found',
    );
  }, 30_000);
});
