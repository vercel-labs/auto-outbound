# Auto Outbound

AI-powered outbound email generation with Exa research context and Outreach integration. One-click deploy to Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-org%2Fos-auto-outbound&env=DATABASE_URL,AI_GATEWAY_API_KEY,EXA_API_KEY&envDescription=Required%20environment%20variables&envLink=https%3A%2F%2Fgithub.com%2Fyour-org%2Fos-auto-outbound%23environment-variables)

## What it does

1. **Create a campaign** with a custom AI prompt and research toggles
2. **Upload contacts** via CSV (email, firstName, company required)
3. **Process contacts** - for each contact:
   - Research the company via Exa (AI features, company summary)
   - Optionally research the person (title, activity, verification)
   - Generate personalized email sequence via AI
   - Optionally enroll in Outreach sequence

## Setup

### 1. Environment Variables

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `AI_GATEWAY_API_KEY` | Yes | OpenAI API key (or Vercel AI Gateway key) |
| `EXA_API_KEY` | Yes | Exa API key for research |
| `OUTREACH_CLIENT_ID` | For Outreach | OAuth client ID |
| `OUTREACH_CLIENT_SECRET` | For Outreach | OAuth client secret |
| `OUTREACH_REDIRECT_URI` | For Outreach | OAuth callback URL |

### 2. Database

```bash
npx drizzle-kit push
```

This creates 4 tables: `campaigns`, `contacts`, `oauth_tokens`, `settings`.

### 3. Run

```bash
pnpm install
pnpm dev
```

## Stack

- **Next.js 15** with App Router
- **Vercel AI SDK** with OpenAI provider
- **Drizzle ORM** with Neon Postgres
- **Exa** for company and people research
- **Outreach** for sequence enrollment (optional)
- **Tailwind CSS 4** + shadcn/ui components
