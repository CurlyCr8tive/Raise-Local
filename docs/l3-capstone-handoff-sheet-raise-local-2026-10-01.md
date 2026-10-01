# L3 Capstone Handoff Sheet: Raise Local

Prepared for Verified Consulting / Raise Local  
Prepared by Cherice Heron  
Last updated: October 1, 2026

## 1. Project Overview

### What was built

Raise Local is a hosted matchmaking platform, powered by Verified Consulting, that helps nonprofits and community organizations find local businesses that may be a good fit for fundraising campaigns, sponsorships, events, product support, and community partnerships.

The platform was built to move Raise Local beyond a generic directory. Nonprofits and businesses complete guided intake flows, the system evaluates fit through explainable matching logic, and the owner/admin team can review matches, coordinate outreach, track projects, and manage partnership feedback.

### Features delivered

- Hosted Raise Local web app.
- Private demo workspace for owner/admin/developer review.
- Real login path for owner/admin, nonprofit, and small-business accounts.
- Nonprofit intake quiz and campaign request flow.
- Small-business intake quiz and business profile flow.
- Admin/owner dashboard.
- Campaign request directory and detail views.
- Business profile directory and detail views.
- Match Review workspace with explainable match scoring.
- Deterministic matching based on location, cause alignment, category, partnership type, offer fit, availability, capacity, and financial minimums.
- Tie-break scoring so potential leads with different match details do not all receive the same score.
- Mutual approval workflow: nonprofit and business can approve, hold, or decline.
- Outreach and project lifecycle views.
- Shared notes/comments on campaign, business, and match records.
- In-app notification support.
- Gmail notification routes and OAuth setup path for hosted email notifications.
- Two-sided post-partnership rating flow.
- Supabase persistence for live authenticated account data.
- Demo data separation so demo records do not overwrite live Supabase records.
- Curated public potential leads for Grove Park / Atlanta and UNITYNow / DMV demo paths.
- Clear potential-lead labels for businesses that are real public leads but not yet signed-up Raise Local partners.
- Technical handoff documentation for Supabase, Render, Gmail OAuth, Google Places, and GitHub.

### Scope boundaries

In scope for this capstone:

- Prototype-to-handoff build of the Raise Local matching workflow.
- Admin, nonprofit, and small-business user paths.
- Explainable match scoring and review.
- Hosted deployment on Render.
- Supabase-backed persistence for authenticated records.
- Documentation and handoff runbooks.

Out of scope or Phase 2:

- Full Google Places automated matching integration.
- Automated outreach to public businesses.
- Stripe checkout, payments, split payouts, refunds, contracts, tax handling, or financial compliance.
- In-app messaging between organizations.
- Fully public marketplace browsing.
- Production-grade CRM integration.
- Automatic use of Google listing photos without confirming usage rights and attribution requirements.

## 2. Demo

### Demo link

Private demo link: share securely with Tenyse, Jessica, and Cherice only.

The demo link includes a private `demo_token`. Do not commit the full tokenized URL to GitHub or put it in a broadly shared public document. It can be placed in the shared client handoff document only if access is limited to the approved handoff group.

### Demo behavior

On the demo landing page:

- **Find a Partner** opens the intro quiz flow without forcing real login.
- **Use Real Login** opens the production login flow.
- **Enter Demo Workspace** opens the owner/admin/developer demo workspace.
- The demo workspace allows switching between owner/admin/developer, nonprofit, and small-business views.

### Primary demo paths

- Grove Park Foundation: Atlanta-focused nonprofit presentation path with real public Atlanta potential leads.
- UNITYNow: DMV-focused nonprofit path with DMV potential leads.
- YES Academy Inc. + Sofia & Grace: backup confirmed-style walkthrough path.

## 3. Repository & Project Files

### Repository link

https://github.com/CurlyCr8tive/Raise-Local

### Live app URL

https://raise-local-platform.onrender.com/

### README includes

The repository README includes:

- What the app does.
- How to run the app locally.
- Product boundary and phase-one scope.
- Local AI provider setup.
- Links to handoff and demo guides.
- Notes on what is future scope.

Additional setup and handoff details are in the `docs/` folder.

### Key project files

| File or folder | Purpose |
| --- | --- |
| `README.md` | Project overview and local setup. |
| `server.mjs` | Node server for the frontend, health check, AI route, Gmail routes, and environment-backed server behavior. |
| `index.html` | Main app entry point. |
| `src/` | Frontend application logic, matching, Supabase sync, UI, photos, and formatting. |
| `assets/` | Raise Local logo and approved/static image assets. |
| `supabase/migrations/` | Database schema and persistence migrations. |
| `scripts/check-build.mjs` | Build and consistency check. |
| `scripts/provision-handoff-accounts.mjs` | Supabase Auth account provisioning helper. |
| `scripts/audit-live-data.mjs` | Live data audit helper for identifying mock/demo rows. |
| `docs/` | User guides, technical handoff, meeting runbooks, demo script, and handoff materials. |

### Transfer instructions

If Verified Consulting would like full ownership of the codebase, the repository can be transferred to a Verified Consulting GitHub account or organization.

To transfer:

1. Tenyse/Jessica provide the target GitHub username or organization name.
2. Cherice initiates the transfer from GitHub.
3. Verified Consulting accepts the transfer.
4. Jessica confirms admin access.
5. Render deployment is updated if needed to point to the transferred repository.

## 4. Documentation & User Guide

### Documentation link

Shared Google Doc:

https://docs.google.com/document/d/12izozlxO0G-V2whYZum6TH2-hn51X_AbiCsFtCnW9qs/edit?usp=sharing

### Loom walkthrough link

Add Loom or Demo Day recording link here once recorded:

`[Insert Loom / Demo Day recording link]`

### Flows documented

The handoff documentation covers:

- Owner/admin login and dashboard.
- Demo workspace flow.
- Nonprofit intake quiz.
- Small-business intake quiz.
- Campaign request review.
- Business profile review.
- Match Review.
- Why a match appears.
- Why blocked matches should not appear.
- Mutual approval flow.
- Outreach and project lifecycle flow.
- Shared notes/comments.
- Post-partnership ratings.
- Supabase account and role management.
- Render environment variables.
- Gmail OAuth setup.
- Google Places Phase 2 setup.
- Data quality standards.
- Image replacement standards.
- Secure secret transfer.

### Repository documentation files

- `docs/handoff-copy-paste-2026-10-01.md`
- `docs/l3-capstone-handoff-sheet-raise-local-2026-10-01.md`
- `docs/meeting-supabase-google-runbook-2026-10-01.md`
- `docs/raise-local-everyday-user-guide.md`
- `docs/tenyse-use-guide.md`
- `docs/raise-local-cto-handoff-packet.md`
- `docs/technical-handoff.md`
- `docs/core-matchmaking-brief.md`
- `docs/demo-day-8-minute-script.md`
- `docs/deployment-build-plan.md`
- `docs/current-handoff-google-doc-structure.md`
- `docs/action-and-build-plan.md`

## 5. Final Presentation & Lookbook

### Slide deck link

`[Insert final Demo Day presentation / deck link]`

### Lookbook link

`[Insert Pursuit Lookbook link]`

### Presentation context

The final presentation should explain Raise Local as a relationship-building tool, not just a directory. The key story is that nonprofits and businesses can provide structured signals, Raise Local can recommend workable matches with clear reasoning, and Tenyse/admin can stay in the loop for judgment, outreach, and follow-through.

## 6. Credentials, Access & Cost Safety

### Services running

| Service | Purpose | Owner / Notes |
| --- | --- | --- |
| GitHub | Source code repository | `CurlyCr8tive/Raise-Local`; can be transferred to Verified Consulting. |
| Render | Hosted Node web service | Hosts the live Raise Local app. |
| Supabase | Auth, database, persistence, RLS | Should be owned/managed by Verified Consulting. |
| Google Cloud | Gmail OAuth and future Places API | Should be owned by Verified Consulting before production use. |
| Gmail API | Notification sending | Uses OAuth and `gmail.send`, not Gmail password. |
| Google Places API | Future public business lead research | Phase 2; requires billing and API key restrictions. |
| OpenAI / Anthropic, optional | Optional AI drafting/explanations | Not required for deterministic matching. |

### Credentials handed off

Do not include secret values in this document.

Credentials and access should be shared through:

- Password manager shared vault.
- Render environment variables.
- Supabase dashboard access.
- Google Cloud IAM.
- Live handoff call where the receiving owner rotates temporary credentials afterward.

Sensitive values that should not be pasted into Google Docs, GitHub, or email:

- Supabase service role key.
- Google OAuth client secret.
- Gmail OAuth refresh token.
- OpenAI or Anthropic API keys.
- Render deploy tokens.
- Account passwords.
- Private demo token if the document will be shared beyond the approved handoff group.

### How to shut it down or pause costs

#### Render

1. Open Render dashboard.
2. Select the Raise Local web service.
3. Suspend, delete, or scale down the service depending on the desired pause.
4. Confirm the public URL no longer serves the app if fully shut down.

#### Supabase

1. Open Supabase dashboard.
2. Select the Raise Local project.
3. Export data first if needed.
4. Pause/delete the project only after confirming no live data is needed.
5. Do not delete the project until data ownership and export are confirmed.

#### Google Cloud / Gmail / Places

1. Open Google Cloud Console.
2. Select the Verified Consulting project.
3. Disable unused APIs if needed.
4. Revoke or restrict unused API keys.
5. Remove OAuth client credentials if Gmail sending is no longer needed.
6. Disable billing or set budgets/alerts if the project is no longer active.

#### GitHub

1. Transfer repository ownership if Verified Consulting wants full control.
2. Remove temporary collaborators after handoff.
3. Keep the repository private or access-limited if any future sensitive work is discussed in issues.

## 7. Known Limitations & Recommended Next Steps

### Known limitations / bugs

#### Limitation: Gmail production sending depends on Google OAuth ownership

Impact: The app can support Gmail notification routes, but production email sending depends on Verified Consulting-owned Google Cloud credentials, OAuth consent setup, an approved Gmail sender account, and Render environment variables.

Workaround: Use manual invite links until Gmail OAuth is fully configured and tested.

#### Limitation: Google Places is Phase 2

Impact: Current potential leads are curated and seeded manually from public research. The app does not yet dynamically search Google Places from the live interface.

Workaround: Continue using manually verified potential leads and source links until Google Places ownership, billing, API restrictions, and data rules are approved.

#### Limitation: Public business leads are not confirmed partners

Impact: A business from Google/Maps/public research may look like a good fit, but it has not opted into Raise Local.

Workaround: Keep the **Potential Lead** label and require Tenyse/Jessica review before outreach.

#### Limitation: Images still require approved real source review

Impact: Some businesses may use a placeholder until a verified, approved image is available.

Workaround: Replace placeholder images with client-approved official website, social media, or supplied images. Confirm consistency across business cards, detail pages, match cards, and profile views.

#### Limitation: Final role QA must be repeated after each deploy

Impact: A working local/demo flow does not automatically prove production role behavior.

Workaround: Test owner/admin, nonprofit, and business accounts separately after every deployment.

### Recommended next steps

1. Finish Google Cloud handoff with Jessica:
   - Verified Consulting-owned project.
   - Gmail API enabled.
   - OAuth consent configured.
   - OAuth client redirect URI set to Render callback.
   - Gmail sender connected.
   - Test email sent to pilot inbox.

2. Complete Supabase handoff:
   - Confirm Tenyse/Jessica project access.
   - Confirm admin app metadata.
   - Confirm live tables and Row Level Security expectations.
   - Run live data audit.

3. Continue image cleanup:
   - Replace placeholders with approved real images.
   - Confirm images match across detail cards, match cards, campaign cards, and profile views.

4. Complete full UI/functionality QA:
   - Demo quiz flow.
   - Real login flow.
   - Admin dashboard.
   - Nonprofit dashboard.
   - Business dashboard.
   - Matching accuracy.
   - Ratings and completed partnership feedback.

5. Plan Google Places Phase 2:
   - Add restricted Places API key.
   - Search local businesses by geography/category.
   - Store source links and source timestamps.
   - Keep all public results labeled as potential leads.
   - Require human approval before outreach.

6. Consider future product features:
   - More robust profile history.
   - Exportable reports.
   - CRM integration.
   - Optional AI-assisted outreach drafts.
   - Stripe/payment workflow only after compliance review.

### User data notes

Live authenticated data lives in Supabase.

Data may include:

- User accounts.
- Campaign requests.
- Business profiles.
- Match records.
- Match decisions.
- Notifications.
- Shared notes/comments.
- Partnership ratings.

How to access:

1. Open Supabase.
2. Select the Raise Local project.
3. Use Authentication for users.
4. Use Table Editor for campaign, business, match, notification, comment, and rating records.

How to export:

- Use Supabase dashboard export options or SQL export tools.
- Confirm ownership before exporting client/business data.

How to delete:

- Delete only after confirming the record is fake/mock, duplicate, or approved for removal.
- Do not delete real nonprofit or business records just because one field is wrong; fix the field and preserve the entity.
