# Raise Local Handoff Package

Prepared for Verified Consulting / Raise Local  
Prepared by Cherice Heron  
Last updated: October 1, 2026

## 1. Executive Summary

Raise Local, powered by Verified Consulting, is a two-sided matchmaking platform that helps nonprofits and community organizations connect with local businesses for fundraising campaigns, sponsorships, events, product support, and community partnerships.

The current build includes:

- A hosted Raise Local web app.
- A private demo workspace for owner/admin/developer review.
- Real login flow for Tenyse, Jessica, Cherice, nonprofits, and businesses.
- Nonprofit and small-business intake quizzes.
- Explainable matching based on location, cause, business category, partnership type, offer fit, timing, capacity, and financial requirements.
- Admin/owner dashboard for campaign requests, business profiles, match review, outreach, projects, reports, and settings.
- Potential-lead handling for public business research. Public leads are clearly labeled as potential leads until they opt in or Verified Consulting confirms participation.
- Supabase-backed persistence for authenticated real accounts and records.
- Two-sided partnership rating flow for completed partnerships, including nonprofit-to-business and business-to-nonprofit feedback.

## 2. Current Live Links

| Item | Link |
| --- | --- |
| Hosted Raise Local site | https://raise-local-platform.onrender.com/ |
| Private demo link | Add the approved private demo URL with token here. Keep it limited to Tenyse, Jessica, and Cherice. |
| GitHub repository | https://github.com/CurlyCr8tive/Raise-Local |
| Shared Google Doc | https://docs.google.com/document/d/12izozlxO0G-V2whYZum6TH2-hn51X_AbiCsFtCnW9qs/edit?usp=sharing |
| Render service | Add Render dashboard/service link here |
| Supabase project | Add Supabase project link here |
| Final presentation/deck | Add final deck or lookbook link here |

## 3. Accounts To Share Securely

Do not put passwords, service-role keys, OAuth client secrets, Gmail refresh tokens, or API keys in this Google Doc. Share passwords through a secure password manager, a separate protected note, or live handoff call.

| Person | Role | Email | Notes |
| --- | --- | --- | --- |
| Tenyse | Owner / Admin | tenyse@verifiedconsulting.com | Supabase Auth role should be `admin` in `app_metadata`. |
| Jessica | Admin / Technical Reviewer | jessicadorismond@gmail.com | Supabase Auth role should be `admin` in `app_metadata`. |
| Cherice | Admin / Developer | cherice.heron@pursuit.org | Same owner/admin/developer access for QA and final handoff support. |

## 4. Demo Workspace Flow

The private demo link is for Tenyse, Jessica, and Cherice.

On the demo landing page:

- **Find a Partner** starts the intro quiz without forcing real login.
- **Use Real Login** opens the real credential login flow.
- **Enter Demo Workspace** opens the owner/admin/developer demo workspace.
- The demo workspace can switch between:
  - Owner / Admin / Developer
  - Nonprofit
  - Small Business

The demo quiz flow should stay available because it is the clearest way to show how a nonprofit or business moves from intake to matching results.

## 5. Primary Demo Stories

### Grove Park Foundation

Grove Park Foundation is the primary presentation story. It is treated as a nonprofit/community campaign path with Atlanta-focused potential business leads.

The Atlanta potential leads currently include:

- Paco Tacos ATL (Potential Lead)
- Casa de Luz (Potential Lead)
- The Ke'nekt Cooperative (Potential Lead)
- Bankhead Seafood (Potential Lead)
- Billee Redd Hospitality (Potential Lead)
- Glaciers Italian Ice (Potential Lead)

These should be described as:

> Real public business leads pulled from public records, official sites, Maps/Google-style research, directories, or public listings. They are not confirmed Raise Local partners until they opt in or Tenyse confirms participation.

### UNITYNow / DMV

UNITYNow is the DMV-focused nonprofit path. It now has local DMV potential leads instead of showing unrelated Grove Park or Atlanta matches.

Current DMV potential leads include:

- The Spice Suite (Potential Lead)
- MahoganyBooks (Potential Lead)
- The Museum DC (Potential Lead)
- The Washington Informer (Potential Lead)
- Busboys and Poets (Potential Lead)

These are public leads for research and outreach review, not confirmed Raise Local partner accounts.

### YES Academy / Sofia & Grace

YES Academy Inc. and Sofia & Grace remain available as a backup demo path if Tenyse wants to show a cleaner confirmed nonprofit/business match example after the Grove Park or UNITYNow story.

## 6. Matching Rules Summary

The matching engine is deterministic and explainable. It checks:

1. Availability and campaign timing.
2. Location or service area.
3. Cause alignment.
4. Business category preference.
5. Partnership type.
6. Offer fit.
7. Capacity.
8. Financial minimums.
9. Business goals for explanation context.

Failed required branches block a match from appearing in the recommended list. Passed branches become the plain-language explanation shown to users.

Potential leads are capped below confirmed partner scores because they have not opted into Raise Local yet. Tie-break detail scoring is used so potential leads with different location, category, offer, partnership, source, and operational fit details do not all receive the same score.

## 7. Rating And Feedback Flow

The platform includes a two-sided rating flow for completed partnerships:

- Ratings are tied to a completed match/partnership, not just an entity profile.
- Nonprofits can rate businesses.
- Businesses can rate nonprofits.
- Feedback covers communication, reliability, turnout, fulfillment, and whether the party would work together again.
- Admins can review both sides' feedback per match.
- Each completed partnership can prompt users to rate their experience.
- Experience history can display cleanly on each profile once enough real partnership data exists.

## 8. Image And Data Quality Standard

For live/client-facing builds:

- Preserve real nonprofits and businesses.
- Do not remove real records because one field is wrong.
- Fix incorrect fields while preserving the real entity.
- Remove only clearly fake/mock records from live-facing views.
- Use real public or supplied imagery when available and appropriate.
- If no verified image is available, use a clear placeholder instead of misleading generic stock photography.
- Photos should match consistently across business detail pages, campaign request cards, match cards, and profile views.

For Google/Maps/public listing photos:

- Treat Google/Maps as lead research unless the photo can be used under the applicable source rules.
- Prefer official website, approved social media, user-supplied, or client-approved images for platform display.
- Keep source links on public leads so Tenyse/Jessica can verify before outreach.

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
- Demo workspace reset affects browser demo state only; it does not delete live Supabase data.

## 10. Render / Hosting Handoff

The hosted app is a Render Node web service.

Production environment variables live in Render, not in GitHub or the Google Doc. Required variables include:

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

After a GitHub push, Render should be manually redeployed or allowed to auto-deploy from `main`, depending on the final Render settings.

## 11. Gmail / Google OAuth

Gmail notification sending requires:

- Verified Consulting-owned Google Cloud project.
- Gmail API enabled.
- OAuth consent configured.
- Deployed redirect URI added to the OAuth client.
- Gmail sender account authorization.
- Refresh token stored in Render as `GMAIL_REFRESH_TOKEN`.
- A pilot delivery inbox configured as `GMAIL_TEST_RECIPIENT_EMAIL` before test sends.

The application should send or support notification coverage for owner/admin/developer users when:

- A nonprofit or business completes the intro quiz.
- A new suggested match is ready for review.
- A client approves, holds, or declines a match.
- Both sides approve a match.
- A match status changes.
- A shared note/comment is added.
- Important profile/campaign fields change, especially timing, capacity, status, lead time, or campaign dates.

Nonprofits should be notified when:

- Their verification/login email is sent after quiz submission.
- They receive or can review a new match.
- The business approves, holds, or declines a match.
- Both sides approve and next steps begin.
- The match status changes.
- A shared note is added.
- Their campaign/profile is updated by an admin.
- They are prompted after completion to rate the business/partnership.

Small businesses should be notified when:

- Their verification/login email is sent after quiz submission.
- They receive or can review a nonprofit match.
- The nonprofit approves, holds, or declines a match.
- Both sides approve and intro/outreach begins.
- The match status changes.
- A shared note is added.
- Their business profile is updated by an admin.
- They are prompted after completion to rate the nonprofit/partnership.

## 12. What To Test In The Handoff Meeting

Use this sequence:

1. Open the hosted real site.
2. Show the real login path.
3. Open the private demo link.
4. Click **Find a Partner** and show the intro quiz path.
5. Complete the Grove Park nonprofit path and review Atlanta potential leads.
6. Complete or review the UNITYNow/DMV path and confirm DMV-only local potential leads.
7. Switch to owner/admin/developer demo workspace.
8. Show Campaign Requests, Business Profiles, Match Review, Outreach, and Projects.
9. Show why a match appears and why a blocked match does not appear.
10. Show the Sofia & Grace / YES Academy backup flow if needed.
11. Review Supabase Auth users and `app_metadata.role`.
12. Review Render environment variables without revealing secret values.
13. Confirm next steps for Gmail OAuth and Google Places Phase 2.

## 13. Known Follow-Up Items

- Finish production Gmail OAuth test with the agreed sender account.
- Confirm live Supabase rows do not include old fake/test submissions.
- Continue replacing any remaining stock imagery as real approved images become available.
- Complete end-to-end role testing after each deploy: admin, nonprofit, and business.
- Add Google Places as Phase 2 only after ownership, billing, API restrictions, attribution, and outreach rules are approved.
- Continue QA on matching accuracy with real nonprofit/business records and demo quiz results.

## 14. Files And Documents To Include Or Reference

These files are in the GitHub repository and can be copied into the Google Doc or linked from the handoff document.

| File | Purpose |
| --- | --- |
| `README.md` | Project overview, local setup, product boundary, and doc index. |
| `docs/raise-local-everyday-user-guide.md` | Day-to-day guide for Tenyse using Raise Local after handoff. |
| `docs/tenyse-use-guide.md` | Demo and role workflow guide for Tenyse. Some localhost references should be replaced with hosted links before sending externally. |
| `docs/raise-local-cto-handoff-packet.md` | Technical owner / CTO handoff packet for Jessica. |
| `docs/technical-handoff.md` | Environment variables, Supabase, Gmail OAuth, deployment, known limitations. Some September 28 status text should be refreshed with hosted Render facts. |
| `docs/core-matchmaking-brief.md` | Matchmaking rules and product guardrails. |
| `docs/demo-day-8-minute-script.md` | Presentation script and live walkthrough. Some localhost references should be replaced with hosted demo links before sending externally. |
| `docs/deployment-build-plan.md` | Deployment and QA checklist. |
| `docs/current-handoff-google-doc-structure.md` | Suggested structure for the shared Google Doc. |
| `docs/action-and-build-plan.md` | Project history, scope, and phase-one plan. |
| `scripts/provision-handoff-accounts.mjs` | Account provisioning helper for Supabase Auth roles. Technical reference only. |
| `scripts/audit-live-data.mjs` | Live data audit helper to find mock/demo records in Supabase. Technical reference only. |
| `supabase/migrations/` | Database schema, access, notifications, comments, lifecycle, and rating persistence. |

## 15. Secure Secret Transfer

Do not send these through email or Google Docs:

- Supabase service role key.
- Google OAuth client secret.
- Gmail OAuth refresh token.
- OpenAI or Anthropic API keys.
- Render deployment tokens.
- Passwords, unless Tenyse/Jessica explicitly approve that transfer method.

Use one of:

- Password manager shared vault.
- Render environment variables.
- Supabase dashboard.
- Google Cloud IAM / OAuth console.
- Live handoff call where the receiving owner rotates credentials afterward.

## 16. Handoff Meeting Agenda

1. Confirm what changed since the last call.
2. Confirm private demo link behavior.
3. Walk through the Grove Park presentation path.
4. Walk through UNITYNow/DMV matching path.
5. Explain potential leads versus confirmed partners.
6. Confirm Sofia & Grace / YES Academy backup flow.
7. Review admin accounts for Tenyse, Jessica, and Cherice.
8. Walk Jessica through Supabase, Render, and GitHub ownership.
9. Review Gmail OAuth setup and what still needs Google account action.
10. Review remaining image cleanup and approved photo sourcing.
11. Agree on next priority: Gmail test, image cleanup, Google Places Phase 2, or PR platform handoff.
12. Confirm what will be sent after the meeting.

---

# Handoff Email Draft

Subject: Pursuit Capstone Project Handoff: Raise Local

Hi Tenyse and Jessica,

Thank you again for the opportunity to work with you on Raise Local. It was a genuine pleasure getting to know you and learning more about the relationship-driven work Verified Consulting is building. One thing that stood out throughout this collaboration was how much care goes into making sure the platform supports real local businesses, real nonprofits, and human judgment rather than treating partnership-building like a generic directory.

We are writing to formally hand off the final project materials for Raise Local. Included below are the key deliverables:

- **Project overview:** Raise Local is a hosted matchmaking platform that helps nonprofits and community organizations connect with local businesses for fundraising campaigns, sponsorships, events, product support, and community partnerships. The build includes role-based intake, explainable matching, admin review, mutual approval, outreach/project tracking, demo workspace access, and Supabase-backed authenticated records.
- **Demo link:** [Insert private demo link]
- **Production site:** https://raise-local-platform.onrender.com/
- **Repository / project files:** https://github.com/CurlyCr8tive/Raise-Local
- **Documentation / user guide:** https://docs.google.com/document/d/12izozlxO0G-V2whYZum6TH2-hn51X_AbiCsFtCnW9qs/edit?usp=sharing
- **Final presentation or deck:** [Insert final deck/lookbook link]
- **Known limitations and recommended next steps:** Gmail OAuth and Google Cloud ownership should be finalized under Verified Consulting-controlled accounts; remaining image cleanup should use approved real business/nonprofit photos; Google Places should remain Phase 2 until billing, API restrictions, attribution, and outreach rules are approved; final acceptance testing should be completed across owner/admin, nonprofit, and business accounts after each deploy.

We hope Raise Local provides a useful foundation for your team and gives you a clear sense of what could be built on further. Please note that this handoff covers the capstone deliverables developed during the project period. Any future implementation, deployment, maintenance, or additional development would need to be discussed separately with Devika at Pursuit, who is copied here.

Thank you again for your partnership and for giving us the chance to work on a real-world challenge. It's been a privilege. Don't hesitate to reach out with any final questions about the materials.

With gratitude,

Cherice Heron  
[Your email]  
[Your LinkedIn]

CC: devika@pursuit.org, avni@pursuit.org, gregh@pursuit.org, stefano@pursuit.org
