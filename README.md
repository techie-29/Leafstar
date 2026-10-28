# Leaf Star

One application for Leaf Star, a manufacturer of premium shirts and pants sold wholesale in lots:
a public website for buyers and an owner admin for stock, bills, enquiries and CRM.

- **Rules:** [`AGENTS.md`](AGENTS.md) (data, security, behaviour, process)
- **Design:** [`DESIGN.md`](DESIGN.md) (colours, type, spacing, components, every screen)
- **Plan:** [`BUILD_PLAN.md`](BUILD_PLAN.md) (steps 0–14, each with the owner's checklist)
- **Database:** [`supabase/schema.sql`](supabase/schema.sql) then [`supabase/003_hardening.sql`](supabase/003_hardening.sql), run once each in the Supabase SQL Editor

## Run it on a computer

Needs Node.js 22 or newer.

```bash
npm ci
cp .env.example .env.local   # then fill in your own values; never commit this file
npm run dev                  # http://localhost:3000 — the styleguide is at /dev/styleguide
```

## Checks (the same ones GitHub runs on every push)

```bash
npm run lint
npm run typecheck
npm run check:design      # no raw colours, no off-scale sizes
npm test                  # unit tests; database tests too when DATABASE_URL is set
npm run build
npm run test:e2e          # screenshots at 375/768/1024/1440 in both themes + accessibility scan
```

Database tests build a throwaway database from `schema.sql` and every migration, so they need a Postgres
server you may create databases on: `DATABASE_URL=postgresql://user:pass@localhost:5432/postgres npm test`.

## Preview site

`npm run build:preview` builds a static copy containing only the pages listed in
[`preview.routes.json`](preview.routes.json) (pages that need no server). The **Preview site** workflow publishes
it to GitHub Pages on every push to `main`. Login, saving, bill scanning and the chatbot need a server and arrive
with real hosting in Step 13.

## Updating database types

After a new migration is applied to Supabase:

```bash
SUPABASE_PROJECT_ID=your-project-ref npx supabase login   # once
SUPABASE_PROJECT_ID=your-project-ref npm run db:types
```

Fonts: Manrope and Playfair Display, SIL Open Font License (see `src/fonts/`).
