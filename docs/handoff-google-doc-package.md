# Raise Local Handoff Package

Prepared for Verified Consulting / Raise Local.

Last updated: September 28, 2026

## Current Status

Raise Local is prepared for live-account testing with the core platform in place:

- Real Supabase Auth account flow for admins, nonprofits, and businesses.
- Live Supabase storage for campaign requests, business profiles, matches, match decisions, lifecycle state, comments, and notifications.
- Admin invite links for nonprofit and business intake.
- Admin-created nonprofit and business records now persist to Supabase.
- Demo/rehearsal data is separated from normal live account data.
- Matching, approval, hold, decline, outreach, and project lifecycle flows are available for testing.
- Shared notes/comments are available on campaign, business, and match detail pages.
- Client notes and important workflow changes can trigger in-app notifications and Gmail notifications once Gmail OAuth is configured.

## Completed Handoff Work

- Supabase project is linked locally.
- Supabase migrations are applied through `20260928020000_campaign_comments`.
- Migration history was reconciled with the remote project, including remote-only migrations for:
  - admin-created live record inserts
  - persistent admin notifications
  - campaign comments/shared notes
- Live Supabase data audit found:
  - `0` mock/demo campaign request rows
  - `0` mock/demo business profile rows
- Build check passes with `npm run check`.
- Server health endpoint works at `/api/health`.
- `.env` and `.env.local` are ignored and should not be committed or shared.

## Not Completed Yet

These need owner credentials or hosted deployment information:

- Hosted deployment URL.
- Google OAuth Client ID and Client Secret.
- Gmail OAuth connection using the Gmail account that should send notifications.
- `GMAIL_NOTIFICATION_EMAIL`, usually Tenyse or the verified admin inbox.
- Hosted origin added to `GMAIL_ALLOWED_ORIGINS`.
- Optional AI provider keys if AI drafting is expected in the hosted app.
- Final real-account provisioning for Tenyse, Jessica, one nonprofit tester, and one business tester using confirmed email addresses.

## Access And Login Requirements

Create or confirm these accounts:

| Account | Purpose | Required role metadata |
| --- | --- | --- |
| Tenyse owner/admin | Owns the platform and tests admin workflows | `app_metadata.role = admin` |
| Jessica tester/admin | Tests owner/admin workflows and supports handoff | `app_metadata.role = admin` |
| Internal nonprofit tester | Tests nonprofit campaign intake and match approval | `user_metadata.role = nonprofit` |
| Internal business tester | Tests business profile intake and match approval | `user_metadata.role = business` |
| Pilot client account | Tests a real or near-real client invite flow | nonprofit or business, depending on client type |

Admin authority must live in Supabase `app_metadata`, not user-editable `user_metadata`.

## Client Invite Flow

Tenyse can invite a nonprofit or business from the admin dashboard.

The invite workflow supports:

1. Copy nonprofit invite link.
2. Copy business invite link.
3. Open/test nonprofit intake.
4. Open/test business intake.
5. Send invite link by email when Gmail OAuth is configured.

If Gmail is not configured, the app returns clear feedback and shows the link that can be sent manually.

Client instructions:

1. Open the invite link.
2. Complete the nonprofit or business intake.
3. Register using the same email address used in the intake.
4. Verify email and set password.
5. Log in to see the scoped dashboard and matching workspace.

## Notification Requirements

The platform supports these notification events:

- Suggested match created.
- Client approves a match.
- Both sides approve a match.
- Match status changes.
- Outreach is sent.
- Match notes are updated.
- Campaign/business profile fields are updated.
- Client adds shared notes/comments to a campaign, business, or match.

In-app notifications are available after login.

Gmail notifications require:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://YOUR_DEPLOYED_DOMAIN/api/gmail/oauth2callback
GMAIL_NOTIFICATION_EMAIL=tenyse-or-admin-inbox@example.com
GMAIL_ALLOWED_ORIGINS=https://YOUR_DEPLOYED_DOMAIN
```

Then open:

```text
https://YOUR_DEPLOYED_DOMAIN/api/gmail/connect
```

Sign in with the approved Gmail sender account and approve the `gmail.send` scope.

## Google Places Recommendation

Google Places should remain Phase 2.

Reason:

- It requires Google Cloud billing and project ownership.
- API keys must be restricted and managed securely.
- Place data has attribution, quota, and data-quality requirements.
- Public businesses are leads, not confirmed partners.
- Matching public leads requires a separate workflow from registered businesses.

For Grove Park:

- Use a publicly sourced curated list of real Atlanta businesses.
- Keep public source links or Google/Maps lookup links on each potential lead.
- Clearly label them as potential leads.
- Do not imply those businesses are registered or confirmed.
- Let Tenyse/Jess manually reach out after the presentation.

Recommended ownership:

- Verified Consulting owns the Google Cloud project and billing.
- Jessica is added as developer/admin.
- Cherice can be added temporarily as a sub-developer if needed.
- Keys should be stored in the hosting provider’s secret manager, not email.

## Deployment Checklist

1. Confirm repository access for Tenyse/Jessica.
2. Confirm deployment owner and hosting provider.
3. Set production environment variables.
4. Deploy from the latest `main` branch.
5. Confirm `/api/health` returns `ok: true`.
6. Confirm Supabase migrations are in sync.
7. Confirm live-data audit remains clean.
8. Provision real accounts.
9. Test admin login.
10. Test nonprofit login.
11. Test business login.
12. Test intake link and registration.
13. Test profile save after refresh.
14. Test match approval from both sides.
15. Test notes/comments and in-app notifications.
16. Connect Gmail OAuth.
17. Test invite email.
18. Test match/comment notification email.
19. Send testing URL and instructions to Tenyse/Jessica.

## Testing Script For Tenyse And Jessica

### Admin Test

1. Log in as admin.
2. Open dashboard.
3. Copy nonprofit invite link.
4. Copy business invite link.
5. Send invite email if Gmail is connected.
6. Create one admin-side campaign request.
7. Create one admin-side business profile.
8. Open Match Review.
9. Change a match status.
10. Add a shared note.
11. Confirm notification appears.

### Nonprofit Test

1. Open nonprofit invite link.
2. Submit campaign intake.
3. Register with the same email.
4. Verify/set password.
5. Log in.
6. Open matches.
7. Approve, hold, or decline a match.
8. Add a note on the match or campaign.

### Business Test

1. Open business invite link.
2. Submit business intake.
3. Register with the same email.
4. Verify/set password.
5. Log in.
6. Review matching campaign opportunities.
7. Approve, hold, or decline a match.
8. Add a note.

## Secure Secret Transfer

Do not send these through email or Google Docs:

- Supabase service role key.
- Google OAuth client secret.
- Gmail OAuth token.
- AI API keys.
- Hosting deployment tokens.

Use one of:

- Hosting provider secret manager.
- Supabase dashboard for Supabase-specific settings.
- Google Cloud IAM / OAuth console for Google credentials.
- Password manager shared vault.
- Temporary secure handoff call where Tenyse/Jess rotates values afterward.

## Known Limitations

- Gmail is not connected until Google OAuth credentials are configured and the sender account authorizes the app.
- AI provider keys are optional and currently absent from local health checks.
- Google Places integration is Phase 2.
- Demo data is for rehearsal only and should not be mixed into live Supabase records.
- Final production readiness still requires hosted multi-user testing with real accounts.

## Suggested Client Update Email

Hi Tenyse,

Thank you for your email earlier today.

I wanted to give you a transparent update on Raise Local and the remaining handoff work.

The core platform is being prepared for deployment and testing, including real nonprofit, business, admin, and client account workflows; Supabase authentication and live record storage; campaign request and business profile editing; matching, approvals, holds, outreach, and active partnership tracking; email notifications for matches, approvals, notes, and record changes; separated demo/rehearsal data; and handoff documentation for everyday use and technical administration.

I also want to clarify the Google Places integration. I initially expected to include a small version for the Grove Park presentation, but the work involves more than adding an API key. It requires Google Cloud billing, ownership, API restrictions, quotas, data-quality handling, attribution requirements, and a separate workflow for potential businesses that have not registered with Raise Local.

Because I want the core platform to be reliable, I recommend treating the broader Google Places integration as Phase 2. For the Grove Park presentation, we can use a small, manually curated set of potential Atlanta businesses. Those businesses would be clearly treated as potential leads until they confirm participation.

For ownership, I recommend Verified Consulting owns the Google Cloud project and billing account, with Jessica as developer/admin and me as a temporary sub-developer if needed. That keeps the project, payment method, credentials, and future API usage under your organization’s control. API keys and secrets should be transferred securely through the appropriate account or secret manager rather than sent by email.

I’m also preparing the handoff so Jessica can continue independently. That includes the repositories, deployment instructions, Supabase migrations and configuration, environment-variable requirements, authentication setup, notification setup, workflow documentation, testing steps, known limitations, future integration recommendations, and the logins needed for testing. I will not include secret keys in email or Google Docs for security.

I’ll send the testing access and handoff materials as soon as the deployment is ready.

Thank you for your patience,

Cherice
