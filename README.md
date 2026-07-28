# Leander

A private personal dashboard for Todoist tasks, weekly habits, an honest
calendar placeholder, and direct links to Google services.

## Version 1

- **Today:** overdue and today's Todoist tasks, quick add, task completion,
  today's habits, calendar shortcut, and quick links.
- **Habits:** add and archive habits, check any day in the current seven-day
  view, and see weekly completion.
- **Links:** direct access to Drive, Keep, Calendar, Gmail, and Todoist.
- **Settings:** connection status and a control to lock the dashboard.
- **Privacy:** a server-checked PIN, owner-scoped Supabase row-level security,
  no anonymous table access, and no private keys in browser code.

Google Drive and Keep are links in V1 rather than embedded applications. Their
full interfaces are not dependable inside another website, and Google Keep's
API is intended for managed Workspace administration rather than a personal
notes client.

## Technology

- Next.js 16 and React 19
- Supabase Auth and Postgres
- Todoist API v1
- Vercel-ready environment configuration
- pnpm with a committed lockfile

## Preview locally

The app automatically uses safe sample data in local development when no
environment file is present.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

To test the real connections, copy `.env.example` to `.env.local` and replace
the placeholder values. Never commit `.env.local`.

## Supabase

The cloud database is **Leander persoonlijk project**, project reference
`uztowxvvzuonlbasifnq`.

The migrations in `supabase/migrations` have already been applied to that
project. They create:

- `habits`
- `habit_checkins`
- supporting indexes
- explicit authenticated-role grants
- owner-scoped select, insert, update, and delete policies

Both tables have row-level security enabled. Unauthenticated access is
explicitly revoked.

For a fresh Supabase project:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Private PIN

Google sign-in is not required. Every successful PIN unlock signs in to one
permanent Supabase owner profile, so the same habits appear in every browser.
The PIN is never included in browser JavaScript or committed to GitHub.

Create the owner profile once in Supabase Auth, using the four-digit PIN as its
password. Add that profile's email address to the server-only `OWNER_EMAIL`
environment variable. The email is not shown on the dashboard or included in
browser JavaScript.

Habit rows remain isolated by `auth.uid()`. Locking the dashboard signs out, and
entering the PIN again returns to the same profile and data.

The database is expected to contain no habit rows before first use. `habits`
receives a row after a habit is added, and `habit_checkins` receives a row after
a habit is checked.

## Todoist

Create a personal API token in Todoist under
**Settings > Integrations > Developer**, then add it as
`TODOIST_API_TOKEN`. The token is used only in server code.

V1 reads the `today | overdue` filter and supports quick add and completion. The
full Todoist app remains available through an external link.

## Vercel deployment

Import the GitHub repository into Vercel and add these variables for
**Production**, **Preview**, and **Development**:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
OWNER_EMAIL
TODOIST_API_TOKEN
NEXT_PUBLIC_DEMO_MODE=false
```

Use the active publishable key from **Supabase > Project Settings > API Keys**.
Do not use or expose a secret or `service_role` key.

Environment-variable changes apply only to new deployments. Redeploy after
adding or changing them.

Vercel will detect Next.js and use:

```text
Build command: pnpm build
Output: Next.js default
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```
