import { db } from '@/db';
import { campaigns, contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Track created entity IDs so we can clean them up even if tests fail.
 * Call `cleanup()` in afterEach/afterAll to delete everything.
 */
export function createTracker() {
  const campaignIds: number[] = [];
  const contactIds: number[] = [];

  return {
    trackCampaign(id: number) {
      campaignIds.push(id);
    },
    trackContact(id: number) {
      contactIds.push(id);
    },
    async cleanup() {
      // Delete contacts first (FK constraint)
      for (const id of contactIds) {
        await db.delete(contacts).where(eq(contacts.id, id)).catch(() => {});
      }
      // Campaigns cascade-delete their contacts, but we do contacts first
      // in case some were created outside a tracked campaign
      for (const id of campaignIds) {
        await db.delete(contacts).where(eq(contacts.campaignId, id)).catch(() => {});
        await db.delete(campaigns).where(eq(campaigns.id, id)).catch(() => {});
      }
      campaignIds.length = 0;
      contactIds.length = 0;
    },
  };
}

/** Insert a test campaign and track it for cleanup. */
export async function insertCampaign(
  tracker: ReturnType<typeof createTracker>,
  overrides: Partial<typeof campaigns.$inferInsert> = {},
) {
  const [campaign] = await db
    .insert(campaigns)
    .values({
      name: `Test Campaign ${Date.now()}`,
      systemPrompt: 'You are a test prompt. Generate a short email.',
      researchEnabled: true,
      peopleResearchEnabled: false,
      numberOfFollowUps: 2,
      ...overrides,
    })
    .returning();

  tracker.trackCampaign(campaign!.id);
  return campaign!;
}

/** Insert a test contact and track it for cleanup. */
export async function insertContact(
  tracker: ReturnType<typeof createTracker>,
  campaignId: number,
  overrides: Partial<typeof contacts.$inferInsert> = {},
) {
  const [contact] = await db
    .insert(contacts)
    .values({
      campaignId,
      email: `test-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      company: 'TestCorp',
      ...overrides,
    })
    .returning();

  tracker.trackContact(contact!.id);
  return contact!;
}
