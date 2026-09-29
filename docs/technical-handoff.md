# Raise Local Technical Handoff

## Repository

- GitHub: [CurlyCr8tive/Raise-Local](https://github.com/CurlyCr8tive/Raise-Local)
- Branch: `main`
- Local project folder: `/Users/chericeheron/Desktop/Raise Local Platform`
- The project is a vanilla JavaScript app served by `server.mjs`.

## Hosting Target

The prepared hosting target is a Render Node web service. This matches the
current architecture because the same server serves the app and protects the
server-side AI and Gmail routes. The repository includes `render.yaml` with:

- `npm install` as the build command.
- `npm start` as the start command.
- `/api/health` as the HTTP health check.
- secret values marked `sync: false` so they must be entered in Render's secret
  environment, not committed to the repository.

After the Render service is created, set `GOOGLE_REDIRECT_URI` to the deployed
HTTPS URL plus `/api/gmail/oauth2callback`, then add that exact URI to the
Google OAuth client. The final public URL is not known until Render assigns the
service subdomain or a custom domain.

## Run And Verify Locally

From the project folder:

```sh
npm install
npm run check
npm start
```

Then open [http://localhost:4102](http://localhost:4102).

If port `4102` is already in use, stop the existing Raise Local server before starting another copy. Do not start a second copy on the same port.

The health check is:

```sh
curl -s http://localhost:4102/api/health
```

This reports provider availability without printing secret values.

## Environment Variables

Copy the template locally:

```sh
cp .env.local.example .env.local
```

Set secrets only in `.env.local` or in the hosting provider’s secret manager:

```text
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GMAIL_NOTIFICATION_EMAIL=
GMAIL_ALLOWED_ORIGINS=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Never place provider keys in `src/`, `index.html`, screenshots, slides, GitHub issues, or committed files. Restart the server after changing `.env.local`.

The browser calls the server-side `/api/ai` route when an AI provider is needed. The matching rules remain authoritative so the platform does not depend on an opaque model decision.

## Supabase

Supabase is the persistence layer for authenticated, cross-device use. The local demo can run with browser storage and seeded data, but a real handoff requires the correct project access and migration state.

After signing in with an account that has access to the Raise Local Supabase project:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list
supabase db push
```

The migration set includes:

- Core tables and policies.
- Quality-control permissions.
- Remote persistence access.
- Mutual match consent.
- Campaign lifecycle statuses.
- Record edit metadata, revision tracking, and pending change review.
- Trusted admin authorization through Supabase `app_metadata`.
- Sanitized authenticated matchmaking pools for real nonprofit and business accounts.
- Trusted admin inserts for live admin-created campaign/business records.
- Persistent notifications.
- Shared campaign/business/match comments.

Current verified remote state as of September 28, 2026:

- Remote migrations are applied through `20260928020000_campaign_comments`.
- `npm run handoff:audit-live-data` found `0` mock/demo campaign requests and `0` mock/demo business profiles in live Supabase.

For a real admin account, set this in Supabase Auth app metadata through an
authorized project administrator:

```json
{"role":"admin"}
```

This belongs in `app_metadata`, not `user_metadata`. The latter is user-editable
and must not be used to grant administrative access. After changing a role,
sign out and back in so the refreshed JWT contains the new claim.

Real accounts do not use the seeded browser records. A signed-in nonprofit or
business sees its own records plus sanitized matching context; private contact
email, phone, and contact-name fields remain limited to the owning account and
admins. Apply the migrations before testing this path.

Do not run migration filenames as shell commands. If the remote database already contains a migration’s schema but its history is missing, inspect the remote state first and use `supabase migration repair ... --status applied` only after confirming the schema is already present.

## Gmail Notification

The build can send Gmail notifications for suggested matches, client approvals, mutual approvals, workflow/status changes, outreach updates, profile changes that affect timing/capacity/status, and client-added shared notes. It uses Gmail API OAuth with the narrow `gmail.send` scope. It does not use a Gmail password or an API key.

1. In Google Cloud Console, create or select a project and enable the Gmail API.
2. Configure the OAuth consent screen and add Tenyse's Google account as a test user.
3. Create a Web application OAuth client.
4. Add this exact local redirect URI:

   ```text
   http://localhost:4102/api/gmail/oauth2callback
   ```

5. Copy the client ID and client secret into `.env.local`:

   ```text
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_REDIRECT_URI=http://localhost:4102/api/gmail/oauth2callback
   APP_BASE_URL=http://localhost:4102
   GMAIL_NOTIFICATION_EMAIL=
   GMAIL_ALLOWED_ORIGINS=http://localhost:4102
   GMAIL_TEST_RECIPIENT_EMAIL=
   GMAIL_ADMIN_EMAILS=
   GMAIL_REFRESH_TOKEN=
   ```

6. Start the server and open `http://localhost:4102/api/gmail/connect`.
7. Sign in as the Gmail account that should send the message and approve the requested permission.
8. Check the connection without revealing credentials:

   ```sh
   curl -s http://localhost:4102/api/gmail/status
   ```

9. Use `GMAIL_TEST_RECIPIENT_EMAIL` with `/api/gmail/send-test` for an isolated delivery test. Do not use Tenyse's or a real client's address for repeated testing.
10. Create or use a completed nonprofit or business intake that produces a match. That triggers the first Gmail notification to `GMAIL_NOTIFICATION_EMAIL`. If you then approve it from the business view and the nonprofit view, mutual approval triggers a second notification. Edits to an existing client record notify the record's email plus the configured `GMAIL_ADMIN_EMAILS` recipients. Each message includes `APP_BASE_URL` as the login link.

Current local status as of September 28, 2026:

```text
Gmail configured: no
Gmail connected: no
Notification recipient configured: no
```

This is expected until Verified Consulting supplies or owns the Google Cloud OAuth client and sender Gmail account.

The OAuth refresh token is stored in the ignored local `.gmail-token.json` file. Never commit it. For hosted use, keep that token and all Google credentials on the server, and allowlist only the real deployed origin.

For a hosted deployment, add the deployed site origin to `GMAIL_ALLOWED_ORIGINS`
in the server environment, for example:

```text
GMAIL_ALLOWED_ORIGINS=https://your-raise-local-domain.com
```

If the hosted origin is missing, the app will reject automatic notification
sends with a clear error instead of silently allowing any website to trigger
email.

For a hosted server, put the refresh token in `GMAIL_REFRESH_TOKEN` in the host's secret manager. The current Gmail route still needs a hosted authentication gateway and provider-specific deployment configuration before it should be exposed publicly.

## Production Handoff Checklist

- [ ] Tenyse has access to the GitHub repository or an agreed deployment owner is documented.
- [ ] A hosted URL replaces `localhost` for real use.
- [ ] `APP_BASE_URL` is set to the exact deployed HTTPS URL.
- [ ] A separate pilot inbox is configured as `GMAIL_TEST_RECIPIENT_EMAIL` for delivery tests.
- [ ] Supabase project ownership and billing contact are confirmed.
- [ ] Tenyse’s admin account exists and has the intended role.
- [ ] Nonprofit and business test accounts can sign in.
- [ ] A profile edit persists after refresh and on a second device.
- [ ] A match decision persists for nonprofit, business, and admin views.
- [ ] Mutual approval unlocks outreach coordination.
- [ ] Campaign lifecycle transitions are visible to the right roles.
- [ ] RLS policies are tested with admin, nonprofit, and business accounts.
- [ ] Admin access is granted through trusted `app_metadata`, not `user_metadata`.
- [ ] Hosted API routes enforce authentication, origin checks, rate limits, and request logging.
- [ ] Provider keys are configured only in the server environment if AI drafts are enabled.
- [ ] Hosted Gmail sending has the deployed URL in `GMAIL_ALLOWED_ORIGINS`, a confirmed sending identity, and a successful test email.
- [ ] Shared notes/comments can be added by a client and reviewed by admin.
- [ ] Backup and support ownership are documented.

## Live-Account Deployment Prep

The live handoff path should not use mock logins or accidental mock data.
The app now keeps demo records out of normal live mode. Demo records appear only
when demo mode is explicitly opened from localhost or a `?demo=1` presentation
URL.

Before deploying, audit the live Supabase project:

```sh
npm run handoff:audit-live-data
```

If the audit finds old mock/demo rows in Supabase and you have confirmed they
should be removed from the live database:

```sh
npm run handoff:audit-live-data -- --delete-mock --confirm DELETE_MOCK_DATA
```

Provision real handoff accounts in dry-run mode first:

```sh
npm run handoff:provision-accounts -- \
  --jessica-email "jessica@example.com" \
  --nonprofit-email "internal-nonprofit-test@example.com" \
  --business-email "internal-business-test@example.com"
```

Apply only after confirming the emails:

```sh
npm run handoff:provision-accounts -- \
  --jessica-email "jessica@example.com" \
  --nonprofit-email "internal-nonprofit-test@example.com" \
  --business-email "internal-business-test@example.com" \
  --write
```

The script sets Supabase Auth metadata roles:

- `app_metadata.role=admin` for Tenyse/Jessica
- `user_metadata.role=nonprofit` for an internal nonprofit tester
- `user_metadata.role=business` for an internal business tester

After provisioning, test each role in the hosted app and confirm the account can
only see the expected dashboard and records.

## Known Limitations

- The current demo is optimized for a presentation and local rehearsal, not production operations.
- Suggested matches, approvals, workflow changes, and client notes can send Gmail notifications after OAuth is connected and the deployed origin is allowlisted.
- Real accounts start from an empty local cache and load only Supabase records after authentication.
- Raise Local uses same-origin browser API calls (`/api/...`) when the frontend and Node server deploy together; no separate frontend API URL is needed for this architecture.
- New suggested matches and mutual approval can persist an admin notification in Supabase and send the configured Gmail notification locally; hosted Gmail sending is not production-ready until the route is protected and deployed with secrets.
- The matching assistant is deterministic and explainable; it is not an autonomous agent.
- Local demo reset affects browser demo state only.
- The Supabase migration history is currently synced through shared comments, but future schema changes must be pushed before testing hosted features that depend on them.
- Real multi-user testing is required before calling the handoff production-ready.

## Safe Handoff Sequence

1. Rehearse locally with demo reset.
2. Apply and verify Supabase migrations.
3. Deploy to a hosted preview.
4. Test all three roles with separate accounts.
5. Confirm persistence, permissions, and mutual approval.
6. Hand Tenyse the hosted URL, credentials through a secure channel, and the use guide.
7. Keep the repository and environment ownership documented.
