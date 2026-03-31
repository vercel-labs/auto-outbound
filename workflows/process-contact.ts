import { FatalError } from "workflow";
import { db } from "@/db";
import {
  contacts,
  campaigns,
  type Contact,
  type ContactInsert,
  type CompanyResearch,
  type PeopleResearch,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { researchCompany } from "@/lib/research/company";
import { researchPerson } from "@/lib/research/people";
import { buildEmailGenerationPrompt } from "@/lib/email/generation";
import {
  createEmailGenerationSchema,
  type EmailGenerationResult,
} from "@/lib/email/schema";
import { generateText, Output } from "ai";
import {
  upsertProspect,
  addProspectToSequence,
  setProspectCustomFields,
} from "@/lib/outreach/prospects";

// =============================================================================
// Workflow
// =============================================================================

export async function processContactWorkflow(contactId: number) {
  "use workflow";

  try {
    const { contact, campaign } = await stepLoadContactAndCampaign(contactId);

    // Step 1: Research phase
    await stepUpdateStatus(contactId, "researching");

    const companyResearch = campaign.researchEnabled
      ? await stepResearchCompany(contact.company)
      : null;

    const peopleResearch = campaign.peopleResearchEnabled
      ? await stepResearchPerson(contact)
      : null;

    await stepSaveResearch(contactId, companyResearch, peopleResearch);

    // Step 2: Email generation phase
    await stepUpdateStatus(contactId, "generating");

    const emailContent = await stepGenerateEmail(
      contact,
      campaign,
      companyResearch,
      peopleResearch,
    );

    await stepSaveEmail(contactId, emailContent);

    // Step 3: Outreach integration (based on mode)
    if (campaign.outreachMode !== "none") {
      await stepUpdateStatus(contactId, "sending");

      const prospectId = await stepUpsertProspect(contact);

      await stepSetProspectFields(prospectId, emailContent);

      if (campaign.outreachMode === "full" && campaign.outreachSequenceId) {
        await stepAddToSequence(
          prospectId,
          campaign.outreachSequenceId,
          campaign.mailboxId,
        );
      }

      await stepSaveProspectId(contactId, prospectId);
    }

    // Step 4: Done
    await stepUpdateStatus(contactId, "completed");

    return { contactId, success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    await stepMarkFailed(contactId, message);
    throw error;
  }
}

// =============================================================================
// Steps
// =============================================================================

async function stepLoadContactAndCampaign(contactId: number) {
  "use step";

  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!contact) throw new FatalError(`Contact ${contactId} not found`);

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, contact.campaignId))
    .limit(1);

  if (!campaign)
    throw new FatalError(`Campaign ${contact.campaignId} not found`);

  return { contact, campaign };
}

async function stepMarkFailed(contactId: number, errorMessage: string) {
  "use step";

  // Load existing data to merge
  const [existing] = await db
    .select({ data: contacts.data })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  const data = {
    ...(existing?.data || {}),
    error: {
      message: errorMessage,
      failedAt: new Date().toISOString(),
    },
  };

  await db
    .update(contacts)
    .set({ status: "failed", errorMessage, data })
    .where(eq(contacts.id, contactId));
}

async function stepUpdateStatus(
  contactId: number,
  status: Contact["status"],
  extra?: Partial<ContactInsert>,
) {
  "use step";

  await db
    .update(contacts)
    .set({ status, ...extra })
    .where(eq(contacts.id, contactId));
}

async function stepResearchCompany(
  companyName: string,
): Promise<CompanyResearch> {
  "use step";

  return researchCompany(companyName);
}

async function stepResearchPerson(
  contact: Contact,
): Promise<PeopleResearch | null> {
  "use step";

  return researchPerson({
    contactName: `${contact.firstName} ${contact.lastName || ""}`.trim(),
    contactEmail: contact.email,
    accountName: contact.company,
  });
}

async function stepSaveResearch(
  contactId: number,
  companyResearch: CompanyResearch | null,
  peopleResearch: PeopleResearch | null,
) {
  "use step";

  await db
    .update(contacts)
    .set({ companyResearch, peopleResearch })
    .where(eq(contacts.id, contactId));
}

async function stepGenerateEmail(
  contact: Contact,
  campaign: {
    systemPrompt: string;
    researchEnabled: boolean;
    peopleResearchEnabled: boolean;
    numberOfFollowUps: number;
  },
  companyResearch: CompanyResearch | null,
  peopleResearch: PeopleResearch | null,
): Promise<EmailGenerationResult> {
  "use step";

  const contactName = `${contact.firstName} ${contact.lastName || ""}`.trim();

  const prompt = buildEmailGenerationPrompt({
    systemPrompt: campaign.systemPrompt,
    researchEnabled: campaign.researchEnabled,
    research: companyResearch,
    contact: {
      contactName,
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

  const { output } = await generateText({
    model: "anthropic/claude-opus-4.6",
    output: Output.object({ schema }),
    prompt,
  });

  return output as EmailGenerationResult;
}

async function stepSaveEmail(contactId: number, email: EmailGenerationResult) {
  "use step";

  await db
    .update(contacts)
    .set({
      generatedSubject: email.subject,
      generatedBody1: email.body1,
      generatedBody2: email.body2 || null,
      generatedBody3: email.body3 || null,
    })
    .where(eq(contacts.id, contactId));
}

async function stepUpsertProspect(contact: Contact): Promise<number> {
  "use step";

  return upsertProspect({
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    title: contact.title,
    company: contact.company,
  });
}

async function stepSetProspectFields(
  prospectId: number,
  email: EmailGenerationResult,
) {
  "use step";

  const bodies = [email.body1];
  if (email.body2) bodies.push(email.body2);
  if (email.body3) bodies.push(email.body3);

  await setProspectCustomFields({
    prospectId,
    subject: email.subject,
    bodies,
  });
}

async function stepAddToSequence(
  prospectId: number,
  sequenceId: number,
  mailboxId: number | null,
) {
  "use step";

  await addProspectToSequence({
    prospectId,
    sequenceId,
    mailboxId,
  });
}

async function stepSaveProspectId(contactId: number, prospectId: number) {
  "use step";

  await db
    .update(contacts)
    .set({ outreachProspectId: prospectId })
    .where(eq(contacts.id, contactId));
}
