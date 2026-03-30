import type { CompanyResearch, PeopleResearch } from '@/db/schema';

// =============================================================================
// Types
// =============================================================================

export interface ContactContext {
  contactName: string;
  contactEmail: string;
  contactTitle?: string | null;
  accountName: string | null;
  notes?: string | null;
}

export interface BuildPromptOptions {
  systemPrompt: string;
  researchEnabled: boolean;
  research?: CompanyResearch | null;
  contact: ContactContext;
  numberOfFollowUps?: number;
  peopleResearchEnabled?: boolean;
  peopleResearch?: PeopleResearch | null;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_FOLLOW_UPS = 2;

export const DEFAULT_SYSTEM_PROMPT = `You are generating a 3-email sequence for a prospect.

Create 3 F-shaped, box-style follow-up emails (~75 words each) with clear CTAs.

Overall Purpose

Generate three short, credible, human-like follow-up emails.

General Formatting Rules

Each output includes three emails, each with:
- A subject line
- A body
- Length target: ~75 words per email

Writing style: F-shaped reading pattern
- Keep paragraphs short (2-3 lines)
- Left-aligned, skimmable sentences
- Start directly with the message content
- Use blank line breaks between paragraphs for consistent rendering
- Use only active voice - never use passive voice
- Do not use "would you be interested in?"
- Be concise and direct. No filler words or phrases
- No marketing speak or buzzwords (avoid words like "leverage", "synergy", "game-changer", etc.)
- Professional but not stiff. Conversational but not casual
- No exclamation points
- Avoid words ending in -ly

Company Name Normalization

When provided with a company name:
- Remove suffixes: Inc., Ltd., LLC, Limited, Co.
- Normalize capitalization
- Use known brand casing when obvious (Stripe, OpenSea)
- Else default to Title Case
- Use the cleaned name naturally so it feels manually written, not automated

Email-Specific Rules

Email 1:
- Start with a greeting that includes the prospect's first name, followed by a dash and a reference to their recent activity or interest
- Connect the outreach to their specific context or need
- Must include one specific product or feature relevant to the prospect
- Directly ask for a meeting at end of email

Email 2:
- Conversational tone
- Present one lightweight enhancement idea
- Briefly explain technical fit
- End with an offer, not a question, e.g.: "Happy to outline or diagram the architecture."

Email 3:
- Slightly assertive tone
- Highlight one insight or opportunity
- Suggest a measurable outcome
- End with a clear, direct CTA question, e.g.: "Should we map this out together?"

Subject: Under 6 words, shared across all emails

Tone: Concise, technical, credible. No marketing fluff.`;

// =============================================================================
// Section Builders
// =============================================================================

function buildContactSection(contact: ContactContext): string {
  const titleSection = contact.contactTitle
    ? `\nTitle: ${contact.contactTitle}`
    : '';
  const notesSection = contact.notes ? `\nNotes: ${contact.notes}` : '';

  return `<contact-information>
## Contact Information

Name: ${contact.contactName}${titleSection}
Email: ${contact.contactEmail}
Company: ${contact.accountName || 'Unknown'}${notesSection}
</contact-information>`;
}

function buildResearchSection(
  accountName: string,
  research: CompanyResearch | null | undefined,
): string {
  if (!research) {
    return `<company-context>
## Company Context

Company: ${accountName}
Summary: No research available
Existing AI Features (DO NOT suggest these - they already have them): Unknown
</company-context>`;
  }

  const existingFeatures =
    research.existingAIFeatures.length > 0
      ? research.existingAIFeatures.join(', ')
      : 'None found';

  return `<company-research>
## Company Research

Company: ${accountName}
Summary: ${research.companySummary}
Existing AI Features (DO NOT suggest these - they already have them): ${existingFeatures}
</company-research>`;
}

function buildPeopleResearchSection(
  contactName: string,
  research: PeopleResearch,
): string {
  const activityList =
    research.recentActivity.length > 0
      ? research.recentActivity.map((a) => `- ${a}`).join('\n')
      : '- None found';

  return `<people-research>
## People Research

Name: ${contactName}
Title: ${research.title}
Summary: ${research.contactSummary}
Recent Activity:
${activityList}
</people-research>`;
}

function buildEmailFormatRequirements(numberOfFollowUps?: number): string {
  const count = numberOfFollowUps ?? DEFAULT_FOLLOW_UPS;
  const totalEmails = count + 1;

  return `<formatting>
## Email Output Format

Generate ${totalEmails} email${totalEmails > 1 ? 's' : ''} (1 initial${count > 0 ? ` + ${count} follow-up${count !== 1 ? 's' : ''}` : ''}).

Format each email body as plain HTML:
- Use <p> tags to wrap each paragraph for proper spacing
- After each </p> tag, use <br> tags for line breaks between paragraphs
- Do NOT use any inline styles, CSS classes, or styling attributes
- Keep paragraphs short (2-3 lines) for F-shaped reading pattern
- Example: <p>First paragraph here.</p><br><p>Second paragraph here.</p><br><p>Third paragraph here.</p>

Write ONLY the email body content. Do not include:
- Greetings like "Hi [Name]" (these will be added automatically)
- Sign-offs or signatures (these will be added automatically)
- Any placeholder text or variables
</formatting>`;
}

// =============================================================================
// Main Prompt Builder
// =============================================================================

export function buildEmailGenerationPrompt(
  options: BuildPromptOptions,
): string {
  const {
    systemPrompt,
    researchEnabled,
    research,
    contact,
    numberOfFollowUps,
    peopleResearchEnabled,
    peopleResearch,
  } = options;

  const sections: string[] = [];

  sections.push(buildContactSection(contact));

  sections.push(`<instructions>
## Instructions

${systemPrompt}
</instructions>`);

  if (researchEnabled) {
    sections.push(
      buildResearchSection(contact.accountName || 'Unknown', research),
    );
  }

  if (peopleResearchEnabled && peopleResearch) {
    sections.push(
      buildPeopleResearchSection(contact.contactName, peopleResearch),
    );
  }

  sections.push(buildEmailFormatRequirements(numberOfFollowUps).trim());

  return sections.join('\n\n');
}
