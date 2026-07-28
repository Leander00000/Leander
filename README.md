# Leander

A private personal dashboard for Todoist tasks, weekly habits, a live
Google Calendar agenda, and direct links to Google services.

## Version 1

- **Today:** overdue and today's Todoist tasks, quick add, task completion,
  today's habits, the next seven days from Google Calendar, and quick links.
- **Habits:** add and archive habits, check any day in the current seven-day
  view, and see weekly completion.
- **Links:** direct access to Drive, Keep, Calendar, Gmail, and Todoist.
- **Settings:** Google OAuth controls, connection status, and a control to lock
  the dashboard.
- **Privacy:** owner-only Google sign-in, per-user Supabase row-level security
  plus owner-only app authorization, encrypted Google credentials, no anonymous
  table access, and no private keys in browser code.

Google Drive and Keep remain direct links. Their full interfaces are not
dependable inside another website, and Google Keep's API is intended for
managed Workspace administration rather than a personal notes client.

## Google Calendar

The Agenda card uses Google's Calendar API directly with the read-only
`calendar.readonly` scope. It shows upcoming events from the primary and
selected calendars without making a calendar public or loading a third-party
iframe.

OAuth happens entirely in server routes. Refresh tokens are encrypted with
AES-256-GCM before they are stored in the per-user
`google_calendar_connections` table. Access tokens and refresh tokens are never
sent to browser JavaScript.

Use two separate Google Cloud projects. Revoking a Google OAuth token removes
the grants for every OAuth client in that Cloud project, so keeping dashboard
sign-in and Calendar in different projects prevents **Disconnect Calendar**
from also revoking dashboard sign-in.

Configure dashboard sign-in:

1. Create a Google Cloud project dedicated to Leander sign-in, configure its
   OAuth consent screen, and create a **Web application** OAuth client.
2. Add the exact authorized redirect URI
   `https://uztowxvvzuonlbasifnq.supabase.co/auth/v1/callback`.
3. In Supabase Auth, enable the Google provider with that client ID and secret.
4. Add `https://your-dashboard-domain/auth/callback` to the Supabase redirect
   allow list.

Configure Calendar separately:

1. Create a second Google Cloud project, enable the **Google Calendar API**,
   configure its consent screen, and add the owner Google account as a test
   user while the app is in Testing.
2. Create a **Web application** OAuth client and add only the exact authorized
   redirect URI
   `https://your-dashboard-domain/api/google/calendar/callback`.
3. Add `APP_ORIGIN` and the four Calendar environment variables listed under
   Vercel deployment, then redeploy.
4. Sign in to the dashboard and choose **Connect Google Calendar** in Settings.
   The Calendar flow verifies that the connected Google email is the same
   server-only owner email used for dashboard access.

Google requires redirect URIs to match exactly, so use a stable production
domain instead of a generated preview URL. For persistent personal use, publish
the OAuth consent app to Production; refresh tokens issued while an external
app remains in Testing can expire after seven days. Disconnecting in Settings
revokes the Google token and deletes the encrypted local record.

## Technology

- Next.js 16 and React 19
- Supabase Auth and Postgres
- Todoist API v1
- Vercel-ready environment configuration
- pnpm with a committed lockfile

## Preview locally

The app automatically uses safe sample data in local development when no
environment file is present. Vercel preview deployments also fall back to
sample data when the private dashboard connection is absent.

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
- `google_calendar_connections`
- supporting indexes
- explicit authenticated-role grants
- per-user select, insert, update, and delete policies

All private tables have row-level security enabled. Unauthenticated access is
explicitly revoked.

For a fresh Supabase project:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Owner sign-in

The dashboard accepts only a Google-authenticated Supabase session whose
normalized email matches the server-only `OWNER_EMAIL`. It also verifies the
Supabase JWT authentication-method claim, so a legacy password session cannot
open the app.

Use the same email as the existing Supabase owner profile. Supabase can
automatically link the verified Google identity to that profile, preserving its
user UUID, habits, and check-ins. After the first successful owner login,
disable new sign-ups in Supabase Auth and replace the old four-digit password
with a long random recovery password. Locking the dashboard signs out the
Supabase session.

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

Import the GitHub repository into Vercel and add these variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
OWNER_EMAIL
APP_ORIGIN
TODOIST_API_TOKEN
GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI
GOOGLE_TOKEN_ENCRYPTION_KEY
NEXT_PUBLIC_DEMO_MODE=false
```

Use the active publishable key from **Supabase > Project Settings > API Keys**.
Do not use or expose a secret or `service_role` key.

Set `APP_ORIGIN` to the stable production origin, such as
`https://dashboard.example.com`, with no path or trailing slash. Set
`GOOGLE_CALENDAR_REDIRECT_URI` to that origin plus
`/api/google/calendar/callback`; it must exactly match the callback registered
in the separate Calendar Google Cloud project. Generate the token-encryption
key once with:

```bash
openssl rand -base64 32
```

Keep `OWNER_EMAIL`, `TODOIST_API_TOKEN`, `GOOGLE_CALENDAR_CLIENT_SECRET`, and
`GOOGLE_TOKEN_ENCRYPTION_KEY` server-only. Configure the real values for
Production. Preview can remain in automatic sample-data mode, or use a stable
preview domain with its own exact Google redirect URI.

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
