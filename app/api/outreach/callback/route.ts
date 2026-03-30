import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { oauthTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/settings?error=no_code', request.url),
    );
  }

  try {
    const tokenResponse = await fetch('https://api.outreach.io/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.OUTREACH_CLIENT_ID,
        client_secret: process.env.OUTREACH_CLIENT_SECRET,
        redirect_uri: process.env.OUTREACH_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${text}`);
    }

    const data = await tokenResponse.json();

    // Upsert the token
    const existing = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.provider, 'outreach'))
      .limit(1);

    const scope = data.scope ?? null;

    if (existing.length > 0) {
      await db
        .update(oauthTokens)
        .set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          scope,
          expiresAt: new Date(Date.now() + data.expires_in * 1000),
        })
        .where(eq(oauthTokens.provider, 'outreach'));
    } else {
      await db.insert(oauthTokens).values({
        provider: 'outreach',
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        scope,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      });
    }

    return NextResponse.redirect(
      new URL('/settings?success=true', request.url),
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent(String(error))}`,
        request.url,
      ),
    );
  }
}
