# The Motherboard — Syndicate KPI Tracker

## Project Overview
Business coaching platform for The Syndicate. Clients track KPIs, complete playbooks, and get AI-generated action plans. Admin (Imthiaz) reviews client progress and provides feedback.

## Tech Stack
- **Framework:** Next.js 16.2.1 (App Router, Turbopack)
- **Styling:** Tailwind CSS (dark theme — zinc-950 bg, gold accents)
- **Database:** Supabase (PostgreSQL + Auth via magic links)
- **AI:** Anthropic Claude API (action plan generation)
- **Hosting:** Vercel

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint

## App Structure
```
app/
├── login/          — Magic link auth
├── auth/callback/  — Auth redirect handler
├── client/         — Client dashboard (KPIs, command centre)
├── admin/          — Admin dashboard (view all clients)
├── playbook/       — Sold Out™ Playbook (5 stages)
├── premium-position/ — Premium Position™ Blueprint (5 stages)
├── wealth-wired/   — Wealth Wired™ Workbook (8 modules + summary)
├── onboard/        — Client onboarding
├── import/         — Data import tool
└── api/
    ├── generate-plan/ — AI action plan generation (Claude API)
    ├── scraper/       — Instagram competitor data (Apify webhooks)
    └── debug/         — Debug endpoint
```

## Key Database Tables (Supabase)
- `clients` — client profiles, KPIs, monthly targets
- `offer_playbooks` — Sold Out playbook data + generated_plan
- `premium_position` — Premium Position data + generated_plan
- `wealth_wired` — Wealth Wired data + generated_plan
- `competitors` / `competitor_posts` — Instagram competitor tracking

## Playbook Pattern
All 3 playbooks follow the same pattern:
- User fills sections progressively across stages
- Each section is scored (word count, completeness)
- Score threshold unlocks AI action plan generation (40/50 for playbooks, 32/40 for Wealth Wired)
- Plans generated via `/api/generate-plan` using Claude API
- Data auto-saves to Supabase with debouncing

## File Split (Playbooks)
Playbook pages are split into wrapper + client component:
- `page.js` — thin server component wrapper
- `PlaybookClient.js` / `PremiumPositionClient.js` / `WealthWiredClient.js` — full client component

## Important Notes
- All pages use `'use client'` (client-side rendering with Supabase auth)
- Root layout has `export const dynamic = 'force-dynamic'`
- DO NOT use `headers()` from `next/headers` in page wrappers — causes 500 errors on RSC navigation requests
- Supabase client in `lib/supabase.js` — used across all pages
- API routes must lazy-init Supabase (not top-level) to avoid build errors
- Admin email: configured via `NEXT_PUBLIC_ADMIN_EMAIL` env var
- Gold color: `#d4a843` (used as `text-gold`, `bg-gold` via Tailwind config)

## Coding Style
- No TypeScript (plain JS)
- Minimal comments — only where logic isn't self-evident
- Dark theme throughout — zinc-950 bg, zinc-800/900 cards, gold accents
- Mobile-responsive with sidebar navigation on playbooks
- Uppercase tracking-widest for labels and headings
