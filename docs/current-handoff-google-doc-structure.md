# Raise Local Handoff Google Doc Structure

Prepared for Verified Consulting / Raise Local.

Use this as the structure for the shared Google Doc. Keep secrets, passwords,
service-role keys, OAuth client secrets, and refresh tokens out of the document.
Share those through a password manager or a secure handoff call.

## 1. Executive Summary

Raise Local is a hosted matchmaking platform for local nonprofits and small
businesses. The current build supports:

- A private demo workspace for owner/admin/developer review.
- A real login path for Tenyse, Jessica, Cherice, nonprofits, and businesses.
- Nonprofit and small-business intake quizzes with ten questions each.
- Explainable matching based on location, cause, category, partnership type,
  offer fit, timing, capacity, and financial minimums.
- Admin/owner review of campaigns, business profiles, match decisions,
  outreach, projects, reports, and settings.
- Public-lead handling for Grove Park presentation businesses: real public
  businesses, clearly labeled as potential leads until they opt in.
- Real account provisioning through Supabase Auth.

## 2. Current Live Links

Add the live links here in the shared Google Doc:

| Item | Link |
| --- | --- |
| Hosted Raise Local site | `https://raise-local-platform.onrender.com/` |
| Private demo link | Add full private token link here |
| GitHub repository | `https://github.com/CurlyCr8tive/Raise-Local` |
| Render service | Add Render service link here |
| Supabase project | Add Supabase project link here |

## 3. Accounts To Share Securely

Do not put passwords in the Google Doc unless Tenyse explicitly accepts that
risk. Prefer a secure password manager or live call.

| Person | Role | Email | Notes |
| --- | --- | --- | --- |
| Tenyse | Owner / Admin | `tenyse@verifiedconsulting.com` | Supabase Auth role should be `admin` in `app_metadata`. |
| Jessica | Admin / Technical Reviewer | `jessicadorismond@gmail.com` | Supabase Auth role should be `admin` in `app_metadata`. |
| Cherice | Admin / Developer | `cherice.heron@pursuit.org` | Same owner/admin/developer view for QA. |

## 4. Demo Workspace Flow

The private demo link is for Tenyse, Jessica, and Cherice.

On the demo landing page:

- **Find a Partner** starts the intro quiz without forcing real login.
- **Use Real Login** opens the real credential login flow.
- **Enter Demo Workspace** opens the owner/admin/developer demo workspace.
- Demo mode can switch between:
  - Owner / Admin / Developer
  - Nonprofit
  - Small Business

The demo quiz flow should stay available because it is the easiest way to show
the guided intake experience before showing the admin dashboard.

## 5. Demo QA Results

Latest QA confirmed:

- Nonprofit intake quiz has exactly 10 questions.
- Small-business intake quiz has exactly 10 questions.
- Grove Park Foundation nonprofit path completes without a forced login.
- Grove Park Foundation returns Atlanta potential leads, not Brooklyn/New York
  matches.
- Sofia & Grace business path completes without a forced login.
- Sofia & Grace returns YES Academy Inc., not Grove Park.
- Potential Atlanta leads are capped below a perfect score because they are not
  confirmed Raise Local participants.
- Real partner/lead images now replace the remaining generic stock photos.
- `npm run check` passes.

## 6. Grove Park Presentation Data Policy

Grove Park Foundation is the primary presentation story.

The Atlanta businesses in the Grove Park demo are:

- Paco Tacos ATL (Potential Lead)
- Casa de Luz (Potential Lead)
- The Ke'nekt Cooperative (Potential Lead)
- Bankhead Seafood (Potential Lead)
- Billee Redd Hospitality (Potential Lead)
- Glaciers Italian Ice (Potential Lead)

These should always be described as:

> Real public business leads pulled from public records, official sites, Maps or
> Google-style research. They are not confirmed Raise Local partners until they
> opt in or Tenyse confirms participation.

Do not describe potential leads as signed-up businesses.

## 7. Matching Rules Summary

The matching engine is deterministic and explainable. It checks:

1. Availability and timing.
2. Location or service area.
3. Cause alignment.
4. Business category preference.
5. Partnership type.
6. Offer fit.
7. Capacity.
8. Financial minimums.
9. Business goals for explanation context.

Failed required branches block a match from appearing in the recommended list.
Passed branches become the plain-language explanation shown to users.

## 8. Image And Data Quality Standard

For live/client-facing builds:

- Preserve real nonprofits and businesses.
- Do not remove real records because one field is wrong.
- Fix incorrect fields while preserving the entity.
- Remove only clearly fake/mock records from live-facing views.
- Use real public or supplied imagery when available.
- If no verified image is available, use a clear placeholder, not misleading
  generic stock photography.

## 9. Supabase Handoff

Supabase is the source of truth for live authenticated accounts and records.

Important points:

- Admin access must be set in Supabase Auth `app_metadata`, for example:

  ```json
  {"role":"admin"}
  ```

- Admin authority should not rely on user-editable `user_metadata`.
- Tenyse and Jessica should have project access in Supabase.
- Live data should be audited before major handoff or launch moments.
- Demo workspace reset affects browser demo state only; it does not delete live
  Supabase data.

## 10. Render / Hosting Handoff

The hosted app is a Render Node web service.

Production environment variables live in Render, not in GitHub or the Google
Doc. Required variables include:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
APP_BASE_URL
GMAIL_NOTIFICATION_EMAIL
GMAIL_ALLOWED_ORIGINS
GMAIL_TEST_RECIPIENT_EMAIL
GMAIL_ADMIN_EMAILS
GMAIL_REFRESH_TOKEN
DEMO_ACCESS_TOKEN
NODE_ENV
```

After a GitHub push, Render should be manually redeployed or allowed to auto
deploy from `main`, depending on the final Render settings.

## 11. Gmail / Google OAuth

Gmail notification sending requires:

- Verified Consulting-owned Google Cloud project.
- Gmail API enabled.
- OAuth consent configured.
- Deployed redirect URI added to the OAuth client.
- Gmail sender account authorization.
- Refresh token stored in Render as `GMAIL_REFRESH_TOKEN`.

The application should send notifications for:

- New intake/quiz completion.
- Suggested match creation.
- Nonprofit decision.
- Business decision.
- Mutual approval.
- Outreach/status changes.
- Shared notes/comments.
- Record edits that affect a campaign, business profile, or match.

## 12. What To Test In The Handoff Meeting

Use this sequence:

1. Open the hosted real site.
2. Show real login path.
3. Open the private demo link.
4. Click **Find a Partner** and show the 10-question quiz path.
5. Complete the Grove Park nonprofit path and review Atlanta potential leads.
6. Switch to owner/admin/developer demo workspace.
7. Show Campaign Requests, Business Profiles, Match Review, Outreach, and
   Projects.
8. Show why a match appears and why a blocked match does not appear.
9. Show the Sofia & Grace backup path if needed.
10. Review Supabase Auth users and `app_metadata.role`.
11. Review Render environment variables without revealing secret values.
12. Confirm next steps for Gmail OAuth and Google Places Phase 2.

## 13. Known Follow-Up Items

- Finish production Gmail OAuth test with the agreed sender account.
- Confirm live Supabase rows do not include old fake/test submissions.
- Continue replacing any remaining stock imagery as real approved images become
  available.
- Add Google Places as Phase 2 only after ownership, billing, restrictions,
  attribution, and outreach rules are approved.
- Continue full UI/functionality testing on real accounts after each deploy.

## 14. 4:30 Meeting Agenda

1. Confirm what changed since the last call.
2. Confirm private demo link behavior.
3. Walk through the Grove Park presentation path.
4. Explain potential leads versus confirmed partners.
5. Confirm Sofia & Grace / YES Academy backup flow.
6. Review admin accounts for Tenyse, Jessica, and Cherice.
7. Walk Jessica through Supabase, Render, and GitHub ownership.
8. Review Gmail OAuth setup and what still needs Google account action.
9. Agree on next priority: Gmail test, image cleanup, Google Places Phase 2, or
   PR platform handoff.
10. Confirm what will be sent after the meeting.

