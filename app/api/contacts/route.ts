import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contacts, campaigns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { start } from 'workflow/api';
import { processContactWorkflow } from '@/workflows/process-contact';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contact, campaignId } = body;

    if (!campaignId || !contact) {
      return NextResponse.json(
        { error: 'Missing required fields: contact and campaignId' },
        { status: 400 },
      );
    }

    const { email, firstName, lastName, companyName, context } = contact;

    if (!email || !firstName || !companyName) {
      return NextResponse.json(
        {
          error:
            'Missing required contact fields: email, firstName, companyName',
        },
        { status: 400 },
      );
    }

    // Verify campaign exists
    const [campaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 },
      );
    }

    const [created] = await db
      .insert(contacts)
      .values({
        campaignId,
        email,
        firstName,
        lastName: lastName || null,
        company: companyName,
        notes: context || null,
      })
      .returning();

    // Kick off the processing workflow immediately
    await start(processContactWorkflow, [created.id]);

    return NextResponse.json({ contact: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
