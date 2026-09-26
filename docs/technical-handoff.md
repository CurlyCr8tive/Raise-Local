# Raise Local Technical Handoff

## Repository

- GitHub: [CurlyCr8tive/Raise-Local](https://github.com/CurlyCr8tive/Raise-Local)
- Branch: `main`
- Local project folder: `/Users/chericeheron/Documents/ChatGPT/Grow Local`
- The project is a vanilla JavaScript app served by `server.mjs`.

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

For a real admin account, set this in Supabase Auth user metadata through an
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

## Gmail Demo Notification

The current local build can send a Gmail notification when a completed intake creates a suggested match, and again when both sides approve that match. It uses Gmail API OAuth with the narrow `gmail.send` scope. It does not use a Gmail password or an API key.

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
   GMAIL_NOTIFICATION_EMAIL=
   ```

6. Start the server and open `http://localhost:4102/api/gmail/connect`.
7. Sign in as the Gmail account that should send the message and approve the requested permission.
8. Check the connection without revealing credentials:

   ```sh
   curl -s http://localhost:4102/api/gmail/status
   ```

9. Create or use a completed nonprofit or business intake that produces a match. That triggers the first Gmail notification to `GMAIL_NOTIFICATION_EMAIL`. If you then approve it from the business view and the nonprofit view, mutual approval triggers a second notification.

The OAuth refresh token is stored in the ignored local `.gmail-token.json` file. Never commit it. This local notification route is for the demo only; a hosted deployment needs authenticated server-side authorization before enabling automated sending.

## Production Handoff Checklist

- [ ] Tenyse has access to the GitHub repository or an agreed deployment owner is documented.
- [ ] A hosted URL replaces `localhost` for real use.
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
- [ ] Hosted Gmail sending has authenticated server-side authorization, sending identity, logging, and approval rules.
- [ ] Backup and support ownership are documented.

## Known Limitations

- The current demo is optimized for a presentation and local rehearsal, not production operations.
- New suggested matches and mutual approval can send local demo notifications; hosted Gmail sending is not production-ready.
- The matching assistant is deterministic and explainable; it is not an autonomous agent.
- Local demo reset affects browser demo state only.
- A Supabase migration must be applied before revision and field-source columns exist remotely.
- Real multi-user testing is required before calling the handoff production-ready.

## Safe Handoff Sequence

1. Rehearse locally with demo reset.
2. Apply and verify Supabase migrations.
3. Deploy to a hosted preview.
4. Test all three roles with separate accounts.
5. Confirm persistence, permissions, and mutual approval.
6. Hand Tenyse the hosted URL, credentials through a secure channel, and the use guide.
7. Keep the repository and environment ownership documented.
