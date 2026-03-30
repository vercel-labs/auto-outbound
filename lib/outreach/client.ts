import { db } from '@/db';
import { oauthTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

const OUTREACH_API_BASE = 'https://api.outreach.io';

async function getTokens() {
  const [token] = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.provider, 'outreach'))
    .limit(1);

  if (!token) {
    throw new Error('Outreach not connected. Connect via Settings page.');
  }

  return token;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://api.outreach.io/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.OUTREACH_CLIENT_ID,
      client_secret: process.env.OUTREACH_CLIENT_SECRET,
      redirect_uri: process.env.OUTREACH_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  const data = await response.json();

  await db
    .update(oauthTokens)
    .set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    })
    .where(eq(oauthTokens.provider, 'outreach'));

  return data.access_token;
}

export async function outreachFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<unknown> {
  let token = await getTokens();
  let accessToken = token.accessToken;

  // Refresh if expired or about to expire (within 5 minutes)
  if (token.expiresAt && token.expiresAt.getTime() < Date.now() + 300_000) {
    accessToken = await refreshAccessToken(token.refreshToken);
  }

  const response = await fetch(`${OUTREACH_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Outreach API error ${response.status}: ${text}`,
    );
  }

  // Handle 204 No Content (DELETE responses)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
