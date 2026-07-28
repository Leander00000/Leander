# Leander

A private personal dashboard for Todoist tasks, weekly habits, an honest
calendar placeholder, and direct links to Google services.

## Version 1

- **Today:** overdue and today’s Todoist tasks, quick add, task completion,
  today’s habits, calendar shortcut, and quick links.
- **Habits:** add and archive habits, check any day in the current seven-day
  view, and see weekly completion.
- **Links:** direct access to Drive, Keep, Calendar, Gmail, and Todoist.
- **Settings:** connection status and the signed-in owner account.
- **Privacy:** one allowed email at the application layer, owner-scoped
  Supabase row-level security, no anonymous table access, and no private keys in
  browser code.

Google Drive and Keep are links in V1 rather than embedded applications. Their
full interfaces are not dependable inside another website, and Google Keep’s
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

Both tables have row-level security enabled. Anonymous access is explicitly
revoked.

For a fresh Supabase project:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Google sign-in

The login page uses Google through Supabase Auth.

1. In Google Cloud, create an OAuth 2.0 **Web application**.
2. Add this Google authorized redirect URI:
   `https://uztowxvvzuonlbasifnq.supabase.co/auth/v1/callback`
3. In Supabase, open **Authentication → Sign In / Providers → Google**, enable
   Google, and enter the Google client ID and secret.
4. In **Authentication → URL Configuration**, set the Site URL to the final
   Vercel URL.
5. Add `http://localhost:3000/auth/callback` and
   `https://your-vercel-domain/auth/callback` to the allowed redirect URLs.
6. Set `OWNER_EMAIL` to the same Google email address.

The application rejects signed-in accounts whose email does not match
`OWNER_EMAIL`. After the owner has signed in once, disabling new-user signups in
Supabase provides an additional single-user safeguard.

## Todoist

Create a personal API token in Todoist under
**Settings → Integrations → Developer**, then add it as
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

Use the active publishable key from **Supabase → Project Settings → API Keys**.
Do not use or expose a secret or `service_role` key.

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
