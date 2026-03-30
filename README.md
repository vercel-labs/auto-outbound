# Auto Outbound

AI-powered outbound email generation with Exa research context and Outreach integration. One-click deploy to Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fauto-outbound&env=AI_GATEWAY_API_KEY,EXA_API_KEY&envDescription=Required%20environment%20variables&envLink=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fauto-outbound%23environment-variables)

## What it does

1. **Create a campaign** with a custom AI prompt and research toggles
2. **Upload contacts** via CSV (email, firstName, company required)
3. **Process contacts** - for each contact:
   - Research the company via Exa (AI features, company summary)
   - Optionally research the person (title, activity, verification)
   - Generate personalized email sequence via AI
   - Optionally enroll in Outreach sequence

## Setup

Deploy to Vercel first, then complete the steps below.

- [ ] **Set API keys** — After deploy, add these environment variables in your Vercel project settings:
  - `AI_GATEWAY_API_KEY` — Vercel AI Gateway key
  - `EXA_API_KEY` — [Exa](https://exa.ai) API key for research
- [ ] **Set up the database** — Add a Neon Postgres database via the [Vercel Neon integration](https://vercel.com/marketplace/neon). This automatically sets `DATABASE_URL` in your environment.
- [ ] **Run database migrations** — Once `DATABASE_URL` is set, run:
  ```bash
  pnpm db:push
  ```
  This creates 4 tables: `campaigns`, `contacts`, `oauth_tokens`, `settings`.
- [ ] **Connect Outreach** — To enable sequence enrollment, create an OAuth app in your [Outreach developer account](https://developers.outreach.io/) and add these environment variables:
  - `OUTREACH_CLIENT_ID` — from your Outreach OAuth app
  - `OUTREACH_CLIENT_SECRET` — from your Outreach OAuth app
  - `OUTREACH_REDIRECT_URI` — set to `https://<your-domain>/api/oauth/outreach/callback`
  - Navigate to our `/settings` page in Auto Outbound and connect Outreach via OAuth

## Setting Up Your First AI Outbound Campaign

This walkthrough creates an example campaign to follow up with people who visited your booth at AWS re:Invent.

### Step 1: Create a Campaign

From the campaigns list, click **New Campaign**.

![Campaigns list](public/screenshots/01-campaigns-list.png)

Fill in the campaign details:

- **Name**: `AWS re:Invent 2025 — Booth Visitors`
- **Description**: `Follow up with contacts who visited our booth at AWS re:Invent`
- **System Prompt**: Write instructions that tell the AI how to generate emails. For a conference follow-up, you might include talking points about the demos they saw, your product's key features, and the tone you want (warm, technical, concise).
- **Research toggles**: Enable both **Company research** and **People research** so the AI can personalize each email with context about the recipient's company and role.
- **Follow-up emails**: Set to **2 follow-ups** for a 3-touch sequence.

![Filled campaign form](public/screenshots/03-campaign-form-filled.png)

Click **Create Campaign** to save. You'll land on the campaign detail page.

![Empty campaign detail](public/screenshots/04-campaign-detail-empty.png)

### Step 2: Add Contacts via CSV

The fastest way to add contacts is by uploading a CSV file. The required columns are `email`, `firstName`, and `company`. Optional columns include `lastName`, `title`, and `notes`.

An [`example-contacts.csv`](example-contacts.csv) is included in this repo:

```csv
email,firstName,lastName,company,title,notes
sarah.chen@acmecorp.io,Sarah,Chen,Acme Corp,VP of Engineering,Met at AWS re:Invent booth - interested in our AI features
james.miller@globex.com,James,Miller,Globex Inc,Head of Cloud Infrastructure,Stopped by booth during keynote break - asked about pricing
priya.patel@initech.dev,Priya,Patel,Initech,Director of Platform Engineering,Scanned badge at demo station - watched full product walkthrough
marcus.johnson@hooli.co,Marcus,Johnson,Hooli,CTO,Asked about enterprise plan and SOC2 compliance
elena.rodriguez@piedpiper.io,Elena,Rodriguez,Pied Piper,Senior DevOps Lead,Interested in migration tooling - currently on legacy stack
```

Drag and drop the CSV (or click to select it) in the **Upload Contacts** area. You'll see a preview table before committing.

![CSV preview before upload](public/screenshots/05-csv-preview.png)

Click **Upload 5 contacts** to import them.

![Contacts uploaded and ready](public/screenshots/06-contacts-uploaded.png)

### Step 3: Add Contacts via API

You can also add contacts programmatically using the `POST /api/contacts` endpoint. This is useful when integrating with badge scanners, CRMs, or other event tools.

```bash
curl -X POST https://your-app.vercel.app/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": 1,
    "contact": {
      "email": "alex.wong@newco.dev",
      "firstName": "Alex",
      "lastName": "Wong",
      "companyName": "NewCo",
      "context": "Visited booth on Day 2 - asked about Kubernetes integration"
    }
  }'
```

The required fields are `email`, `firstName`, and `companyName`. Optional fields are `lastName` and `context` (mapped to notes).

### Step 4: Process Contacts

Once your contacts are loaded, click the **Process N pending contacts** button. For each contact, Auto Outbound will:

1. Research their company (and optionally the person) via Exa
2. Generate a personalized email sequence using your system prompt and the research context
3. Optionally enroll them in an Outreach sequence (if configured)

You can monitor progress in the contacts table — each contact moves through `pending` → `researching` → `generating` → `completed` (or `failed`).

## Stack

- **Next.js 15** with App Router
- **Vercel AI SDK** with OpenAI provider
- **Drizzle ORM** with Neon Postgres
- **Exa** for company and people research
- **Outreach** for sequence enrollment (optional)
- **Tailwind CSS 4** + shadcn/ui components
