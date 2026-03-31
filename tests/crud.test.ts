import { describe, it, expect, afterEach, vi } from 'vitest';
import { db } from '@/db';
import { campaigns, contacts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createTracker, insertCampaign, insertContact } from './helpers';

// Stub revalidatePath since it's a Next.js-only API
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Stub workflow/api since we don't want to start real workflows in CRUD tests
vi.mock('workflow/api', () => ({
  start: vi.fn(),
}));

const tracker = createTracker();

afterEach(async () => {
  await tracker.cleanup();
});

// =============================================================================
// Campaign CRUD
// =============================================================================

describe('Campaign CRUD', () => {
  it('creates a campaign with default values', async () => {
    const campaign = await insertCampaign(tracker, {
      name: 'CRUD Test Campaign',
      description: 'A test campaign',
    });

    expect(campaign.id).toBeTypeOf('number');
    expect(campaign.name).toBe('CRUD Test Campaign');
    expect(campaign.description).toBe('A test campaign');
    expect(campaign.status).toBe('draft');
    expect(campaign.researchEnabled).toBe(true);
    expect(campaign.numberOfFollowUps).toBe(2);
  });

  it('reads a campaign by id', async () => {
    const created = await insertCampaign(tracker);

    const [found] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, created.id))
      .limit(1);

    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe(created.name);
  });

  it('updates a campaign', async () => {
    const created = await insertCampaign(tracker);

    await db
      .update(campaigns)
      .set({ name: 'Updated Name', status: 'active' })
      .where(eq(campaigns.id, created.id));

    const [updated] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, created.id))
      .limit(1);

    expect(updated!.name).toBe('Updated Name');
    expect(updated!.status).toBe('active');
  });

  it('deletes a campaign and cascades to contacts', async () => {
    const campaign = await insertCampaign(tracker);
    await insertContact(tracker, campaign.id);
    await insertContact(tracker, campaign.id);

    // Delete campaign — contacts should cascade
    await db.delete(contacts).where(eq(contacts.campaignId, campaign.id));
    await db.delete(campaigns).where(eq(campaigns.id, campaign.id));

    const [found] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaign.id))
      .limit(1);

    expect(found).toBeUndefined();

    const remaining = await db
      .select()
      .from(contacts)
      .where(eq(contacts.campaignId, campaign.id));

    expect(remaining).toHaveLength(0);
  });

  it('lists campaigns ordered by updatedAt desc', async () => {
    const c1 = await insertCampaign(tracker, { name: 'First' });
    const c2 = await insertCampaign(tracker, { name: 'Second' });

    const all = await db
      .select()
      .from(campaigns)
      .orderBy(desc(campaigns.updatedAt));

    const ids = all.map((c) => c.id);
    // c2 was inserted after c1, so it should come first
    expect(ids.indexOf(c2.id)).toBeLessThan(ids.indexOf(c1.id));
  });
});

// =============================================================================
// Contact CRUD
// =============================================================================

describe('Contact CRUD', () => {
  it('creates a contact linked to a campaign', async () => {
    const campaign = await insertCampaign(tracker);
    const contact = await insertContact(tracker, campaign.id, {
      email: 'jane@test.com',
      firstName: 'Jane',
      lastName: 'Doe',
      company: 'Acme',
      title: 'CTO',
      notes: 'Met at conference',
    });

    expect(contact.id).toBeTypeOf('number');
    expect(contact.campaignId).toBe(campaign.id);
    expect(contact.email).toBe('jane@test.com');
    expect(contact.firstName).toBe('Jane');
    expect(contact.lastName).toBe('Doe');
    expect(contact.company).toBe('Acme');
    expect(contact.title).toBe('CTO');
    expect(contact.notes).toBe('Met at conference');
    expect(contact.status).toBe('pending');
  });

  it('reads contacts for a campaign', async () => {
    const campaign = await insertCampaign(tracker);
    await insertContact(tracker, campaign.id, { firstName: 'Alice' });
    await insertContact(tracker, campaign.id, { firstName: 'Bob' });

    const found = await db
      .select()
      .from(contacts)
      .where(eq(contacts.campaignId, campaign.id));

    expect(found).toHaveLength(2);
    const names = found.map((c) => c.firstName).sort();
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('updates contact status and generated content', async () => {
    const campaign = await insertCampaign(tracker);
    const contact = await insertContact(tracker, campaign.id);

    await db
      .update(contacts)
      .set({
        status: 'completed',
        generatedSubject: 'Test Subject',
        generatedBody1: '<p>Body 1</p>',
        generatedBody2: '<p>Body 2</p>',
        generatedBody3: '<p>Body 3</p>',
      })
      .where(eq(contacts.id, contact.id));

    const [updated] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contact.id))
      .limit(1);

    expect(updated!.status).toBe('completed');
    expect(updated!.generatedSubject).toBe('Test Subject');
    expect(updated!.generatedBody1).toBe('<p>Body 1</p>');
    expect(updated!.generatedBody2).toBe('<p>Body 2</p>');
    expect(updated!.generatedBody3).toBe('<p>Body 3</p>');
  });

  it('deletes a contact by id', async () => {
    const campaign = await insertCampaign(tracker);
    const contact = await insertContact(tracker, campaign.id);

    await db.delete(contacts).where(eq(contacts.id, contact.id));

    const [found] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contact.id))
      .limit(1);

    expect(found).toBeUndefined();
  });

  it('stores and retrieves JSONB research data', async () => {
    const campaign = await insertCampaign(tracker);
    const contact = await insertContact(tracker, campaign.id);

    const companyResearch = {
      companySummary: 'A test company that does things.',
      existingAIFeatures: ['Feature A', 'Feature B'],
    };

    const peopleResearch = {
      title: 'Senior Engineer',
      contactSummary: 'A talented engineer.',
      recentActivity: ['Spoke at conf', 'Wrote blog post'],
    };

    await db
      .update(contacts)
      .set({ companyResearch, peopleResearch })
      .where(eq(contacts.id, contact.id));

    const [updated] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contact.id))
      .limit(1);

    expect(updated!.companyResearch).toEqual(companyResearch);
    expect(updated!.peopleResearch).toEqual(peopleResearch);
  });
});
