# Raise Local CTO Handoff Packet

**Prepared for:** Verified Consulting

**Product:** Raise Local, powered by Verified Consulting

**Purpose:** Give the receiving technical owner enough context to deploy,
operate, test, and continue the platform without depending on the original
builder's local machine or personal accounts.

## Handoff Status

### Prepared in the repository

- Role-based nonprofit, business, and admin workflows.
- Supabase persistence and authenticated matching pools.
- Campaign request and business profile editing.
- Match scoring, explanations, approvals, hold, decline, outreach, and active
  partnership states.
- Demo data reset for rehearsal, separate from real authenticated account data.
- Gmail OAuth notification routes for local testing.
- Email workflow coverage for quiz invites, matches, decisions, approvals,
  outreach/status changes, shared notes, and record edits.
- Render Node service configuration in `render.yaml`.
- Supabase migrations in `supabase/migrations/`.
- Technical, user, and presentation guides linked below.

### Must be verified before calling the handoff production-ready

- Create the production hosting service and confirm the public URL.
- Add production environment variables in the host's secret manager.
- Update the Google OAuth redirect URI for the deployed HTTPS URL.
- Confirm Supabase project ownership, billing, and admin access.
- Create or verify separate nonprofit, business, admin, and reviewer accounts.
- Test a complete match using separate accounts and two browsers.
- Test profile edits after refresh and from a second device.
- Verify real email delivery to the agreed recipients.
- Verify each event separately with a pilot inbox: quiz invite, suggested
  match, approve, hold, decline, mutual approval, outreach/status change,
  shared note, and record edit.
- Protect hosted notification routes with the deployment's authentication and
  origin controls before enabling automated sending for real users.

## Ownership Transfer

Verified Consulting should own or control:

- GitHub repository and organization access.
- Hosting account and billing.
- Supabase project, organization access, and billing.
- Google Cloud project and Maps/Places billing, if Phase 2 is approved.
- Gmail sender account and OAuth credentials.
- A separate pilot test inbox for repeated notification testing.
- Production domain and DNS.
- Secret manager and backup ownership.

The developer can be added with the minimum permissions needed to maintain the
system. Do not make the platform depend on a personal payment method, local
OAuth file, or personal email account.

## Documents To Share

- [Technical handoff](technical-handoff.md): deployment, Supabase, OAuth,
  environment variables, security, and known limitations.
- [Tenyse use guide](tenyse-use-guide.md): login, demo reset, role workflows,
  matching, approvals, outreach, and editing records.
- [Everyday user guide](raise-local-everyday-user-guide.md): regular use of
  Raise Local outside a presentation.
- [Eight-minute demo script](demo-day-8-minute-script.md): presentation and
  live click path.
- [Core matchmaking brief](core-matchmaking-brief.md): product rules,
  decision-tree matching logic, and phase-one guardrails.
- [Action and build plan](action-and-build-plan.md): history, scope, and next
  implementation steps.
- [README](../README.md): local setup and project orientation.

## Login And Account Guide

### Admin or reviewer

1. Open the deployed Raise Local URL.
2. Choose **Log in**.
3. Use the admin account created in Supabase Auth.
4. Confirm the account has `{"role":"admin"}` in Supabase Auth
   `app_metadata`, not `user_metadata`.
5. Sign out and sign back in after an admin role change so the new JWT claim is
   present.
6. Confirm the admin can open Campaign Requests, Business Profiles, Match
   Review, Outreach, My Projects, Reports, and Settings.

### Nonprofit or business client

1. Choose **Create an account** or complete the appropriate intake.
2. Use the same email address on the intake record and the authenticated
   account. The current ownership model uses email matching.
3. Set a password through the account setup or password-reset flow.
4. Confirm the client can see its own record and permitted matching context.
5. Confirm the client cannot edit another organization's record.

### Demo account

Use the demo workspace only for rehearsal. Open the account menu and choose
**Reset Demo Data** before a recording. The reset affects browser demo state;
it does not delete Supabase records.

## Environment And Key Guide

The repository includes `.env.local.example` as a variable-name template. It
does not contain credentials. Never send a populated `.env.local`, OAuth token,
service-role key, API secret, or password by email or inside a Google Doc.

### Server-side variables

```text
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
APP_BASE_URL=
GMAIL_NOTIFICATION_EMAIL=
GMAIL_TEST_RECIPIENT_EMAIL=
GMAIL_ADMIN_EMAILS=
GMAIL_REFRESH_TOKEN=
```

### Transfer procedure

1. Verified Consulting creates or confirms the organization-owned accounts.
2. The CTO adds the developer to the required projects with limited access.
3. Secrets are entered directly into Render's environment settings or an
   approved secret manager.
4. The receiving CTO confirms each value is present without sharing the value
   back in chat, email, Slack, GitHub, or a document.
5. Rotate any temporary credentials after the handoff test.
6. Remove personal access that is no longer required.

### Gmail ownership

The Gmail sender should be an organization-controlled account. The refresh
token belongs in the production secret manager. The notification recipients
should be explicitly configured, including Tenyse and any approved admin or
reviewer addresses. Do not use a Gmail password in the application.

Use `GMAIL_TEST_RECIPIENT_EMAIL` for isolated delivery checks. It should be a
separate pilot inbox or test account, not Tenyse or a real client. Live workflow
notifications use `GMAIL_NOTIFICATION_EMAIL`, the record owner's email, and
the configured admin recipients.

### Notification map

Owner/admin/developer users should be notified when a nonprofit or business
completes the intro quiz, a suggested match is ready for review, a client
approves/holds/declines, both sides approve, a match status changes, a shared
note/comment is added, or important campaign/profile fields change.

Nonprofits should be notified when their verification/login email is sent, they
can review a new match, the business approves/holds/declines, both sides approve
and next steps begin, the match status changes, a shared note is added, their
campaign/profile is updated by an admin, or the completed partnership is ready
for a business rating.

Small businesses should be notified when their verification/login email is sent,
they can review a nonprofit match, the nonprofit approves/holds/declines, both
sides approve and intro/outreach begins, the match status changes, a shared note
is added, their profile is updated by an admin, or the completed partnership is
ready for a nonprofit rating.

## Deployment Guide

The current application is a Node web service, not a static site. The same
server serves the frontend and protects server-side AI and Gmail routes.

1. Create a Render **Web Service** from the repository.
2. Use `npm install` for the build command.
3. Use `npm start` for the start command.
4. Use `/api/health` as the health check.
5. Add the production environment variables in Render.
6. Set `APP_BASE_URL` to the deployed HTTPS URL without a trailing slash.
7. Set `GOOGLE_REDIRECT_URI` to the deployed HTTPS callback URL.
8. Add that exact callback URL to the Google OAuth client.
9. Confirm `/api/health`, `/api/gmail/status`, authentication, and Supabase
   access before inviting testers.

## Required Acceptance Test

Use separate browser profiles or devices for each role:

1. Admin signs in and confirms the dashboard, notifications, and live pools.
2. Nonprofit submits or edits a campaign request.
3. Business submits or edits a business profile.
4. Both records appear in the appropriate authenticated matching pools.
5. The match explains the cause, location, timing, capacity, partnership type,
   and offer fit.
6. Business approves, nonprofit approves, and admin sees mutual approval.
7. Admin drafts and sends the warm introduction.
8. Admin marks the partnership confirmed and moves the project toward Active.
9. Send a quiz invite from admin and confirm the recipient receives a link to
   the deployed app.
10. Confirm the nonprofit and business receive suggested-match, approve, hold,
    decline, mutual-approval, outreach/status, shared-note, and record-edit
    notifications.
11. Confirm Tenyse/admin receives the same workflow events through the approved
    admin recipients.
12. Refresh each account and confirm the state persists.
13. Edit a campaign and business record from client and admin accounts; confirm
    the latest value persists and the edit metadata is visible to admin.

## Data Policy

- Keep confirmed real nonprofit and business records in the live Supabase
  project.
- Keep presentation rehearsal records in Demo Workspace.
- Grove Park campaign-specific dates, goals, and participation numbers should
  be confirmed by Verified Consulting before being presented as live facts.
- A public Google Places listing is a potential lead, not a confirmed partner.
- Google Places remains a Phase 2 integration until billing, ownership, data
  handling, attribution, and outreach rules are approved.

## Current Limitations And Phase 2

- The hosted URL and production deployment still need to be created and tested.
- Browser API calls use same-origin `/api/...` paths when the frontend and Node
  server deploy together. A separate frontend API URL is not required for the
  current architecture.
- Hosted Gmail sending needs authenticated server-side authorization and secret
  configuration before production use. The browser-facing notification routes
  are suitable for local testing only until the deployed service adds a
  verified authenticated gateway; do not treat a successful local request as
  proof of production delivery.
- The current matching authority is deterministic and explainable; AI can help
  with drafts and explanations but does not silently decide matches.
- Google Places is not part of the reliable core handoff. A controlled pilot
  can be added after Verified Consulting owns the Google Cloud billing account.

## Support Handoff

The receiving CTO should document the final values for:

- Production URL.
- GitHub repository and deployment project.
- Supabase project reference and owner.
- Admin and reviewer accounts.
- Gmail sender and notification recipients.
- Secret-manager location.
- Backup owner and incident contact.
- Approved Phase 2 scope and budget for Google Places.
