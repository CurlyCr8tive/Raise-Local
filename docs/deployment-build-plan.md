# Raise Local Deployment Build Plan

Target: handoff-ready deployment by September 30, 2026.

## Scope For This Handoff

Ship the reliable core product:

- real Supabase Auth accounts
- no mock login path in normal live use
- no accidental mock data in live Supabase records
- admin, nonprofit, and business role testing
- persistent profiles, matches, decisions, and lifecycle updates
- admin-visible intake links for real nonprofit and business invites
- shared notes/comments on campaign, business, and match details
- in-app workflow notifications
- Gmail notifications from the hosted origin after OAuth and origin allowlisting
- controlled demo flow available only through localhost or `?demo=1`

Defer to Phase 2:

- full Google Places API integration
- public-business scraping or automated matching
- Instagram/Meta scraping
- automatic outreach to unregistered businesses
- external data equivalency mapping
- dynamic public lead recommendation engine

## Build Checklist

1. Run `npm run check`.
2. Apply Supabase migrations.
3. Run `npm run handoff:audit-live-data`.
4. Delete old mock rows only after confirming the audit output.
5. Provision Tenyse admin, Jessica tester/admin, nonprofit tester, and business tester with `npm run handoff:provision-accounts`.
6. Deploy the app to the hosted URL.
7. Confirm the hosted app does not show the demo workspace CTA unless opened with `?demo=1`.
8. Test Tenyse/Jessica admin login.
9. Copy the nonprofit and business intake links from the admin dashboard.
10. Test nonprofit signup, email verification, password setup, profile completion, and dashboard.
11. Test business signup, email verification, password setup, profile completion, and dashboard.
12. Test admin-created nonprofit and business records.
13. Test matching results with real records.
14. Test save, request intro, accept, decline, launch, and campaign lifecycle status.
15. Test adding a shared note/comment from a client account and reviewing it from the admin account.
16. Add the deployed URL to `GMAIL_ALLOWED_ORIGINS`, connect Gmail OAuth, and send one test notification.
17. Send the hosted URL, GitHub repo, and tester instructions to Tenyse and Jessica.

## Current Completed Items

- Supabase migrations are applied through `20260928020000_campaign_comments`.
- Remote-only migration history was fetched into the repository so Jessica has the current database history.
- Live Supabase audit found no mock/demo campaign requests and no mock/demo business profiles.
- Gmail OAuth is not configured locally yet; Verified Consulting needs to supply or own the Google Cloud OAuth setup.
- AI provider keys are optional and were not configured in the local health check.

## Demo Data Policy

Normal live users should not see demo data. Preserve the YES Academy / Sofia &
Grace walkthrough as a controlled presentation/demo flow only, opened by a demo
URL or local development.

## Google/Public Business Policy

For the October 6 Grove Park presentation, use a small manually curated set of
potential businesses if needed. Label them as potential leads, not confirmed
partners. Do not rush Google Places into the handoff build.
