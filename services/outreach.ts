'use server';

import { db } from '@/db';
import { oauthTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getOutreachConnection() {
  const [token] = await db
    .select({
      provider: oauthTokens.provider,
      expiresAt: oauthTokens.expiresAt,
      updatedAt: oauthTokens.updatedAt,
    })
    .from(oauthTokens)
    .where(eq(oauthTokens.provider, 'outreach'))
    .limit(1);

  return token ?? null;
}

export async function disconnectOutreach() {
  await db
    .delete(oauthTokens)
    .where(eq(oauthTokens.provider, 'outreach'));
}

export async function getOutreachAuthUrl(): Promise<string> {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.OUTREACH_CLIENT_ID || '',
    redirect_uri: process.env.OUTREACH_REDIRECT_URI || '',
    scope: 'prospects.all sequences.all sequenceSteps.all templates.all sequenceStates.all mailboxes.read',
  });

  return `https://api.outreach.io/oauth/authorize?${params.toString()}`;
}
