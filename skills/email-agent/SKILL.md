---
name: email-agent
description: Helps users understand and extend the Email Agent repo — an AI-powered outbound email generation app using Exa research, the Vercel AI SDK, and Outreach CRM. Use this skill when a user asks how the codebase works, how to hook up or swap an integration (Exa, OpenAI/AI models, Outreach, Neon Postgres), or how to add a feature. Loaded automatically for any question about this repository.
---

# Email Agent Repo Guide

This skill gives you deep knowledge of the **Email Agent** codebase so you can answer "how do I…" questions, explain the architecture, and guide extensions — without re-reading every file each time.

## What This Repo Is

An AI-powered outbound email generator. A user creates a **campaign** (with a custom AI prompt + research toggles), uploads **contacts** via CSV or API, and each contact is processed through a durable Vercel Workflow that:

1. Researches the company (and optionally the person) via **Exa**
2. Generates a personalized email sequence via the **Vercel AI SDK** (Anthropic models)
3. Optionally syncs the prospect to **Outreach** CRM and enrolls them in a sequence

**Stack:** Next.js 15 (App Router) · React Query · Vercel AI SDK · Drizzle ORM + Neon Postgres · Exa · Outreach · Tailwind 4 + shadcn/ui · Vercel Workflows.

## Architecture Map

| Path | What lives here |
|---|---|
| `app/` | Next.js pages + API routes. `/` redirects to `/campaigns`. `/settings` has Outreach OAuth connect. |
| `app/campaigns/` | Campaign list, new, and `[id]` detail pages (SSR + React Query hydration). |
| `app/api/contacts/route.ts` | `POST /api/contacts` — external entry point to add a contact + auto-start its workflow. |
| `app/api/outreach/callback/route.ts` | OAuth2 callback for Outreach; exchanges code for tokens, upserts into `oauth_tokens` table. |
| `services/` | Server actions (`'use server'`) for all internal DB operations. Called from client components via React Query. |
| `workflows/process-contact.ts` | The durable workflow that orchestrates research → generation → Outreach for one contact. |
| `lib/research/` | Company + people research using Exa + AI summarization. |
| `lib/email/` | Email generation prompt builder + Zod output schema. |
| `lib/outreach/` | Outreach REST client, prospect upsert, sequence enrollment, sequence scaffolding. |
| `lib/exa.ts` | Exa client singleton (reads `EXA_API_KEY`). |
| `lib/csv.ts` | CSV parsing with header aliasing and validation (Zod not used here; manual validation). |
| `db/schema.ts` | Drizzle schema: `campaigns`, `contacts`, `oauth_tokens`, `settings` + TypeScript types. |
| `db/index.ts` | Lazy Neon/Drizzle proxy so the DB only initializes on first use. |
| `components/` | React components. shadcn/ui primitives in `components/ui/`. |
| `tests/` | Vitest integration tests. `workflow.test.ts` hits real Exa + AI; only Outreach is mocked. |

## The Core Workflow

`workflows/process-contact.ts` is the heart of the app. Each contact runs through it independently and concurrently (`Promise.all` over `start(processContactWorkflow, [id])`).

```
pending → researching → generating → sending → completed (or failed)
```

Steps (each is a `"use step"` function for durability + retries):
1. **Load** contact + campaign from DB (`stepLoadContactAndCampaign`) — `FatalError` if missing
2. **Research company** via Exa → summarized by AI (`stepResearchCompany`) — only if `campaign.researchEnabled`
3. **Research person** via Exa → verified by AI (`stepResearchPerson`) — only if `campaign.peopleResearchEnabled`
4. **Save research** to `contacts.companyResearch` / `peopleResearch` (JSONB)
5. **Generate email** via `generateText` with structured `Output.object` (`stepGenerateEmail`)
6. **Save email** to `contacts.generatedSubject` + `generatedBody1/2/3`
7. **Outreach** (if `campaign.outreachMode !== 'none'`): upsert prospect → set custom fields → optionally add to sequence
8. **Mark completed** (or `failed` with error message in `contacts.data.error`)

Workflow launch points:
- `services/contacts.ts:processAllContacts` — "Process N pending" button
- `services/contacts.ts:addAndProcessContacts` — after CSV upload
- `app/api/contacts/route.ts` — after API contact creation

## External Integrations & APIs

### Exa (research) — `lib/exa.ts`, `lib/research/`

- **Env var:** `EXA_API_KEY`
- **Client:** `exa-js` SDK, singleton via `getExaClient()`
- **Calls:** `exa.searchAndContents(query, { numResults, type: 'auto', category, summary: true })`
- **Company research** (`lib/research/company.ts`): two parallel searches (`category: 'company'` + `category: 'news'`), results summarized by `anthropic/claude-haiku-4-5` into `{ companySummary, existingAIFeatures[] }`
- **People research** (`lib/research/people.ts`): two parallel searches (profile + activity), AI verifies `isConfidentMatch` (company+name must match) → returns `{ title, contactSummary, recentActivity[] }` or `null`
- **Error handling:** both research functions catch errors and return safe fallbacks (empty research / null) rather than failing the workflow

### Vercel AI SDK (email generation + summarization) — `lib/email/`

- **Env var:** `AI_GATEWAY_API_KEY` (Vercel AI Gateway)
- **Email generation** (`workflows/process-contact.ts:stepGenerateEmail`): `generateText({ model: 'anthropic/claude-opus-4.6', output: Output.object({ schema }), prompt })`
- **Research summarization:** `anthropic/claude-haiku-4-5` with `Output.object` + Zod schema
- **Prompt builder:** `lib/email/generation.ts:buildEmailGenerationPrompt` assembles sections: contact info, instructions (campaign system prompt), company research, people research, format requirements
- **Output schema:** `lib/email/schema.ts:createEmailGenerationSchema(n)` — dynamically builds Zod object with `subject` + `body1..bodyN` (max 2 follow-ups = 3 bodies)
- **Default prompt:** `DEFAULT_SYSTEM_PROMPT` in `lib/email/generation.ts` — 3-email F-shaped sequence, ~75 words each, HTML `<p>` formatting

### Outreach (CRM) — `lib/outreach/`

- **Env vars:** `OUTREACH_CLIENT_ID`, `OUTREACH_CLIENT_SECRET`, `OUTREACH_REDIRECT_URI`
- **OAuth flow:** `services/outreach.ts:getOutreachAuthUrl` → user authorizes at `api.outreach.io/oauth/authorize` → callback at `/api/oauth/outreach/callback` → token exchange → stored in `oauth_tokens` table
- **Token refresh:** `lib/outreach/client.ts:refreshAccessToken` auto-refreshes if within 5 min of expiry
- **API base:** `https://api.outreach.io`, JSON:API format (`Content-Type: application/vnd.api+json`)
- **Custom fields:** subject → `custom92`, bodies → `custom93/94/95` (hardcoded in `lib/outreach/prospects.ts` and `sequences.ts`)
- **Endpoints used:**
  - `GET /api/v2/prospects?filter[emails]=…` — find by email
  - `POST /api/v2/prospects` — create prospect
  - `PATCH /api/v2/prospects/:id` — set custom fields
  - `POST /api/v2/sequenceStates` — add prospect to sequence
  - `POST /api/v2/sequences`, `/sequenceSteps`, `/templates`, `/sequenceTemplates` — `scaffoldOutreachSequence` builds a full sequence

### Neon Postgres — `db/`

- **Env var:** `DATABASE_URL`
- **ORM:** Drizzle (`drizzle-orm/neon-http`), schema in `db/schema.ts`
- **Migrations:** `pnpm db:push` (push) or `pnpm db:generate` (generate SQL)
- **Tables:** `campaigns`, `contacts` (FK → campaigns, cascade delete), `oauth_tokens`, `settings`

## How To Extend — Common Questions

### "How do I hook this up to a different CRM (instead of Outreach)?"

Mirror the Outreach pattern:
1. Create `lib/<crm>/client.ts` — auth + authenticated `fetch` wrapper (see `lib/outreach/client.ts`)
2. Create `lib/<crm>/prospects.ts` — `upsertProspect`, `setProspectCustomFields`, `addProspectToSequence`
3. Add an OAuth callback route at `app/api/<crm>/callback/route.ts` (see the Outreach callback)
4. Add a server action in `services/` for generating the auth URL + checking connection
5. Add a `<crm>Mode` enum to `db/schema.ts` alongside the existing `outreachMode` enum, then branch in `workflows/process-contact.ts` (the workflow already checks `campaign.outreachMode`)
6. Add a settings UI component for the OAuth connect button

The workflow is the integration point — `stepUpsertProspect`, `stepSetProspectFields`, `stepAddToSequence` are isolated steps you can swap.

### "How do I use a different research provider (instead of Exa)?"

1. Replace `lib/exa.ts` with a new client, or create `lib/<provider>.ts`
2. Rewrite `lib/research/company.ts` and `lib/research/people.ts` to call your provider's search API
3. Keep the return types `CompanyResearch` and `PeopleResearch` (defined in `db/schema.ts`) so the workflow and prompt builder don't need changes
4. Update the env var from `EXA_API_KEY` to your provider's key

The research functions are self-contained — the workflow just calls `researchCompany()` / `researchPerson()` and saves the result.

### "How do I use a different AI model?"

The model is a string passed to `generateText({ model: '…' })`. The app uses the Vercel AI Gateway, so any model the gateway supports works:
- Email generation: `anthropic/claude-opus-4.6` in `workflows/process-contact.ts:222`
- Research summarization: `anthropic/claude-haiku-4-5` in `lib/research/company.ts:53` and `lib/research/people.ts:70`

Just change the model string. The `Output.object({ schema })` structured output pattern works across providers.

### "How do I add contacts from another source (webhook, CRM sync, etc.)?"

Two options:
- **API route:** `POST /api/contacts` already exists (`app/api/contacts/route.ts`). It takes `{ campaignId, contact: { email, firstName, lastName?, companyName, context? } }` and auto-starts the workflow. Point any external system at this endpoint.
- **Server action:** Call `services/contacts.ts:addAndProcessContacts(campaignId, contactsData)` directly from a server component or another server action.

### "How do I add more follow-up emails?"

Currently capped at 2 follow-ups (3 total) by `MAX_FOLLOW_UPS` in `lib/email/schema.ts`. To increase:
1. Bump `MAX_FOLLOW_UPS`
2. Add `generatedBody4`, etc. columns to `contacts` in `db/schema.ts` → run `pnpm db:push`
3. Add more Outreach custom field slots in `lib/outreach/prospects.ts` (`CUSTOM_FIELD_BODIES`) and `sequences.ts`
4. Update `stepSaveEmail` in the workflow to save the extra bodies
5. Update the campaign form select options in `components/campaign-form.tsx`

### "How do I add a new campaign setting?"

1. Add the column to `campaigns` in `db/schema.ts` → `pnpm db:push`
2. Add the form field in `components/campaign-form.tsx`
3. Read it in `workflows/process-contact.ts` (the campaign object is loaded in `stepLoadContactAndCampaign`)
4. If it affects the prompt, pass it through `buildEmailGenerationPrompt` in `lib/email/generation.ts`

## Coding Conventions (quick reference — full detail in README.md)

- **Server actions** (`services/`, `'use server'`) for internal data ops. **API routes** (`app/api/`) only for external entry points (OAuth, webhooks, third-party callers).
- **Vercel Workflows** for anything calling external APIs or doing AI generation. Use `"use workflow"` + `"use step"`. `FatalError` = non-retryable; regular `throw` = retryable.
- **React Query** for all client data. Query keys centralized in `lib/query-keys.ts`. Poll at 3s when contacts are processing. Pass SSR data as `initialData`.
- **Drizzle** types via `InferSelectModel` / `$inferInsert` — don't duplicate. JSONB for complex nested data. `onDelete: 'cascade'` for children. `withTimezone: true` timestamps.
- **Components:** server components by default, `'use client'` only when needed. shadcn/ui for primitives. Native `FormData` for forms (no form libraries).
- **TypeScript:** strict mode, prefer inference, validate untrusted data with Zod, no `any`.
- **Tests:** integration tests in `tests/` with Vitest, `fileParallelism: false`, real Exa + AI calls (only Outreach mocked). Use `createTracker()` for cleanup.

## Commands

```bash
pnpm dev          # local dev server
pnpm build        # production build
pnpm lint         # next lint
pnpm test         # vitest run (needs .env.local with real API keys + DATABASE_URL)
pnpm test:watch   # vitest watch mode
pnpm db:push      # push schema changes to Neon
pnpm db:generate  # generate migration SQL
pnpm db:studio    # Drizzle Studio GUI
pnpm workflows    # inspect workflow runs (npx workflow inspect runs --web)
```

## Environment Variables

| Var | Purpose |
|---|---|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway — required for all AI calls |
| `EXA_API_KEY` | Exa search API — required for research |
| `DATABASE_URL` | Neon Postgres connection string |
| `OUTREACH_CLIENT_ID` | Outreach OAuth (optional — only if using Outreach) |
| `OUTREACH_CLIENT_SECRET` | Outreach OAuth (optional) |
| `OUTREACH_REDIRECT_URI` | Must be `https://<domain>/api/oauth/outreach/callback` |
| `NEXT_PUBLIC_SITE_URL` | Used for the API curl example on campaign detail page |

## Answering Questions

When a user asks "how do I…" about this repo:
1. Identify which integration/layer they're asking about (research, AI, CRM, DB, UI, workflow).
2. Reference the exact files above so they can navigate directly.
3. If they want to swap an integration, point them to the "How To Extend" section that matches and name the specific files to change.
4. If unsure about current behavior, read the specific file before answering — this guide is a map, not a substitute for the code.
