# Leander

A personal dashboard for Todoist tasks, habits, a live Google Calendar agenda,
and direct links to Google services.

## Passwordless access

Open a private device link once; the browser is remembered for 180 days.
There is no password form or Google dashboard sign-in. The ordinary website
address opens directly on remembered devices. New devices need the private
link. Anyone holding that link can access the dashboard: keep it private.

Device access uses a signed, expiring, HTTP-only cookie. Locking the dashboard
removes this browser's cookie. Rotating `DASHBOARD_ACCESS_KEY` invalidates all
existing device cookies and links. Google authorization is used only when
connecting or reconnecting Calendar.

The server accesses the existing owner profile with a server-only Supabase
secret key. The owner UUID is never taken from a request. Every private database
operation checks device access, and every query/write is scoped to that owner.
The secret key bypasses RLS on the server; table grants and RLS continue to
protect direct anonymous/authenticated Data API access. No private key or Google
token is sent to browser JavaScript.

## Tasks, habits and progress

- Today and overdue tasks, upcoming tasks, quick add, and completion in Todoist.
- Habits with categories, icons, editable history and per-habit streaks.
- **10 XP** per habit check-in and **20 XP** per task completed through this app.
- **200 XP** per level, starting at level 1. Daily goal: **50 XP**.
- Active-day streak, best streak, and six milestone badges.
- Existing habit history counts immediately. Undoing/deleting check-ins removes
  their XP and recalculates streaks and badges. A missed day resets the current
  streak; earned XP stays. Today can still be completed without breaking the
  streak from yesterday. Day boundaries use Europe/Amsterdam.
- Task XP starts when this feature is installed. Completions/undo performed
  directly in Todoist are not imported. Each recurring occurrence can earn XP.
- XP follows confirmed saves. Task commands are reserved in the database with
  unique occurrence keys and stable Todoist Sync command UUIDs. Repeated clicks,
  simultaneous requests and retries cannot award the same occurrence twice or
  advance a recurring task twice. If progress storage fails after Todoist saves,
  retry the original completion to finalize the same reserved command. After a
  reload, use **Retry task completions** in the progress card.

Progress is stored in Supabase and is shared across remembered devices. Preview
uses disposable sample data and does not change connected accounts.

## Local preview

Next.js 16, React 19, Supabase Postgres, Todoist API v1; pnpm with a committed lockfile.
Use Node 22.18+ (or Node 24) for the native TypeScript test runner.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Without private configuration, development and Vercel previews show sample data.
Production stays on the setup page until access configuration is complete.
Set `NEXT_PUBLIC_DEMO_MODE=true` only for an explicit sample deployment.

## Upgrade / production setup

The intended database is **Leander persoonlijk project**, reference
`uztowxvvzuonlbasifnq`. Do not use the volleyball projects.

1. Apply the new `add_task_completion_progress` migration in
   `supabase/migrations` to this database before deploying. It adds a table;
   existing habits, check-ins, calendar connections and user records stay intact.
   The migration has been verified locally; it has **not** been applied remotely
   as part of this change.
2. In Supabase Authentication → Users, copy the **existing owner's UUID** into
   `OWNER_USER_ID`. Keep `OWNER_EMAIL` set to that owner's Google email for the
   Calendar account check. Do not create a new owner profile.
3. Set the new server-only `SUPABASE_SECRET_KEY` to the project's secret API key
   (`sb_secret_...`; a legacy `service_role` key also works). Never prefix this
   variable with `NEXT_PUBLIC_`.
4. Generate `DASHBOARD_ACCESS_KEY` locally and save it as a server-only variable:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

5. Keep the existing project URL, publishable key, Todoist token and Calendar
   credentials. Set `APP_ORIGIN` to the exact stable HTTPS deployment origin.
6. Redeploy. Privately construct and open:
   `https://your-dashboard-domain/login#key=YOUR_DASHBOARD_ACCESS_KEY`.
   The key uses the URL fragment, so it does not enter server URL logs or
   referrers. The browser removes it from history before exchanging it for a
   device cookie. After opening the link, bookmark the ordinary dashboard URL.

Changing these variables does not affect an existing deployment until redeployed.
Old Google dashboard sessions are replaced by device access. The old dashboard
Google OAuth client/provider is no longer used; the Calendar client remains in use.

All environment variable names are in `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
OWNER_USER_ID
OWNER_EMAIL
DASHBOARD_ACCESS_KEY
APP_ORIGIN
TODOIST_API_TOKEN
GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI
GOOGLE_TOKEN_ENCRYPTION_KEY
NEXT_PUBLIC_DEMO_MODE=false
```

## Google Calendar

Calendar uses Google's API with read-only `calendar.readonly` scope. Refresh
credentials are encrypted with AES-256-GCM and remain server-only. Keep the
existing `GOOGLE_TOKEN_ENCRYPTION_KEY` and owner UUID to retain access to saved
connections. Disconnecting revokes the Google token and removes the saved record.

For a new Calendar connection:

1. Enable Google Calendar API in its Google Cloud project and create a Web OAuth
   client. Keep this separate from any legacy sign-in project.
2. Register the exact redirect URI
   `https://your-dashboard-domain/api/google/calendar/callback`.
3. Set the Calendar client ID, secret and redirect URI. Generate a 32-byte
   encryption key with `openssl rand -base64 32` for a fresh installation only.
4. Open the dashboard using the private link, then connect Calendar in Settings.
   The Google account must match `OWNER_EMAIL`.

Use a stable domain, not a changing preview URL. For persistent use, publish the
OAuth consent application to Production; testing-mode refresh tokens may expire.
Drive and Keep remain direct links.

## Todoist

Add your personal API token from Todoist Settings → Integrations → Developer as
`TODOIST_API_TOKEN`. It is used only on the server. This app is not created by,
affiliated with, or supported by Todoist.

## Checks

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Tests cover XP/level boundaries, deduplication, undo, streaks/date boundaries,
signed device tokens, concurrent task completion, failed-save retry and recurring
tasks. The task action tests mock external services; live integrations require the
production credentials. The migration additionally needs verification on the
intended Supabase project after application.
