# Raise Local Meeting Runbook: Supabase + Google Setup

Prepared for Cherice, Tenyse, and Jessica  
Meeting date: October 1, 2026

## Purpose

Use this during the handoff meeting to walk through the two systems Jessica specifically needs to understand:

1. Supabase: accounts, roles, live data, tables, security, and where to manage the backend.
2. Google Cloud: Gmail OAuth for notifications and Google Places setup for future small-business listing research.

Keep secrets out of Google Docs, email, screenshots, and GitHub. If a password, service key, OAuth secret, refresh token, or Places API key is needed, enter it directly into Render/Supabase/Google Cloud or share it through a secure password manager.

## Part 1: Supabase Handoff Walkthrough

### Goal

By the end of this section, Jessica should know where the live backend lives, how admin roles work, where records are stored, and how to verify that live data is not mixed with demo data.

### 1. Confirm project ownership and access

1. Open Supabase.
2. Confirm the active organization is the Verified Consulting / Raise Local owner organization.
3. Open the Raise Local project.
4. Confirm Tenyse and Jessica have project access.
5. Confirm Cherice has temporary developer access only if ongoing handoff support is needed.

Recommended access pattern:

- Tenyse: Owner/Admin access.
- Jessica: Admin/Developer access.
- Cherice: temporary developer/support access, removable after handoff.

### 2. Confirm the project URL and API keys

Where to go:

1. Supabase project dashboard.
2. Project Settings.
3. API / API Keys.

What to confirm:

- Project URL is the same value used in Render as `SUPABASE_URL`.
- Browser/client key is used only for browser-safe access.
- Secret/service-role key is only used on the server, in Render environment variables.
- No secret/service-role key is committed to GitHub or pasted into the Google Doc.

Important note:

Supabase now recommends publishable keys for client-side code and secret keys for server-side code. Existing `anon` and `service_role` keys still work, but secret/service-role keys bypass Row Level Security and must never be exposed in the browser.

### 3. Confirm real admin users

Where to go:

1. Supabase dashboard.
2. Authentication.
3. Users.

Confirm these accounts exist:

| Person | Email | Role |
| --- | --- | --- |
| Tenyse | `tenyse@verifiedconsulting.com` | Owner/Admin |
| Jessica | `jessicadorismond@gmail.com` | Admin/Technical Reviewer |
| Cherice | `cherice.heron@pursuit.org` | Admin/Developer QA |

For each admin account:

1. Open the user record.
2. Find app metadata.
3. Confirm:

```json
{"role":"admin"}
```

This must be in `app_metadata`, not `user_metadata`. `user_metadata` can be changed by the user and should not be trusted for admin permission.

After changing app metadata, the user should sign out and sign back in so their login token refreshes.

### 4. Confirm live data tables

Where to go:

1. Supabase dashboard.
2. Table Editor.

Core tables to review:

- `campaign_requests`
- `business_profiles`
- `matches`
- `match_decisions`
- `notifications`
- `comments` / shared notes table, depending on final table name
- `partnership_ratings` or rating-related table from the two-sided rating migration

What to confirm:

- Real nonprofit records are in campaign request tables.
- Real business records are in business profile tables.
- Demo records are not accidentally mixed into live authenticated user records.
- Records have owner/contact emails where needed for account scoping.
- Match records connect a campaign request to a business profile.
- Ratings are tied to completed matches/partnerships, not only profile pages.

### 5. Confirm Row Level Security expectations

Ask Jessica to verify these principles:

- Admins can see the full operational workspace.
- Nonprofits can see and edit their own campaign/profile context.
- Businesses can see and edit their own business profile context.
- Nonprofits should not edit another nonprofit's record.
- Businesses should not edit another business's record.
- Contact details should be shown only to the owner/admin where appropriate.

Use separate browser profiles or devices to test:

1. Admin account.
2. Nonprofit account.
3. Business account.

### 6. Confirm authentication settings

Where to go:

1. Supabase dashboard.
2. Authentication.
3. URL Configuration.

Confirm the hosted site is allowed:

```text
https://raise-local-platform.onrender.com
```

Confirm any password-reset or invite redirect URLs point to the hosted app, not localhost.

### 7. Confirm live data audit and cleanup procedure

From the local repository, technical owner can run:

```sh
npm run handoff:audit-live-data
```

Only delete rows if everyone agrees they are fake/mock and not real client/business data:

```sh
npm run handoff:audit-live-data -- --delete-mock --confirm DELETE_MOCK_DATA
```

Rule for future cleanup:

Do not delete a real nonprofit or business because one field is wrong. Fix the field and preserve the real entity.

### 8. Confirm what Supabase is responsible for

Supabase owns:

- Authentication users.
- Admin role metadata.
- Campaign request persistence.
- Business profile persistence.
- Match records.
- Match decisions.
- Notifications.
- Shared notes/comments.
- Rating persistence.
- Row Level Security and database permissions.

Supabase does not own:

- Google OAuth credentials.
- Gmail refresh token.
- Render deployment variables.
- GitHub repository permissions.
- Google Places billing.

## Part 2: Render Environment Alignment

### Goal

Make sure Render has the values Supabase and Google need, without exposing secrets.

Where to go:

1. Render dashboard.
2. Raise Local web service.
3. Environment.

Confirm these are present:

```text
APP_BASE_URL=https://raise-local-platform.onrender.com
SUPABASE_URL=
SUPABASE_ANON_KEY= or SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY= or SUPABASE_SECRET_KEY=
DEMO_ACCESS_TOKEN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://raise-local-platform.onrender.com/api/gmail/oauth2callback
GMAIL_NOTIFICATION_EMAIL=
GMAIL_ALLOWED_ORIGINS=https://raise-local-platform.onrender.com
GMAIL_TEST_RECIPIENT_EMAIL=
GMAIL_ADMIN_EMAILS=
GMAIL_REFRESH_TOKEN=
NODE_ENV=production
```

Do not reveal the values on screen if the meeting is recorded.

After environment changes:

1. Save.
2. Redeploy.
3. Open:

```text
https://raise-local-platform.onrender.com/api/health
```

Confirm the server is live.

## Part 3: Google Cloud / Gmail OAuth Setup

### Goal

Set up Google authentication so the app can send Gmail notifications from an approved sender account.

This is separate from Google Places. Gmail uses OAuth. Places usually uses an API key.

### 1. Confirm Google Cloud project ownership

1. Open Google Cloud Console.
2. Confirm the active project belongs to Verified Consulting.
3. Confirm billing ownership is not tied only to Cherice's personal account.
4. Add Jessica as a project admin/developer.
5. Add Cherice only if temporary setup support is needed.

### 2. Enable Gmail API

Where to go:

1. Google Cloud Console.
2. APIs & Services.
3. Library.
4. Search for Gmail API.
5. Enable Gmail API.

### 3. Configure OAuth consent

Where to go:

1. APIs & Services.
2. OAuth consent screen.

Recommended setup for handoff/testing:

- App name: Raise Local
- User support email: Tenyse or the approved Verified Consulting email.
- Developer contact email: Jessica and/or Tenyse.
- Authorized domain: use the final custom domain if available. If not, use the supported hosted domain setup and update later.
- Test users: Tenyse, Jessica, Cherice.

Scope needed for Gmail sending:

```text
https://www.googleapis.com/auth/gmail.send
```

Use the narrow Gmail send scope. Do not request broad Gmail read/manage scopes.

### 4. Create OAuth client credentials

Where to go:

1. APIs & Services.
2. Credentials.
3. Create credentials.
4. OAuth client ID.
5. Application type: Web application.

Authorized redirect URI:

```text
https://raise-local-platform.onrender.com/api/gmail/oauth2callback
```

Important: The redirect URI must exactly match the value in Render's `GOOGLE_REDIRECT_URI`.

Add to Render:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://raise-local-platform.onrender.com/api/gmail/oauth2callback
APP_BASE_URL=https://raise-local-platform.onrender.com
GMAIL_ALLOWED_ORIGINS=https://raise-local-platform.onrender.com
```

### 5. Connect the Gmail sender

After Render is updated and redeployed, open:

```text
https://raise-local-platform.onrender.com/api/gmail/connect
```

Then:

1. Sign in with the approved Gmail sender account.
2. Approve the `gmail.send` permission.
3. Confirm the app stores/returns the refresh token securely.
4. Put `GMAIL_REFRESH_TOKEN` in Render if the setup flow provides one for hosted use.
5. Redeploy if Render environment variables changed.

### 6. Test Gmail status and one safe test email

Open:

```text
https://raise-local-platform.onrender.com/api/gmail/status
```

Then test only with a pilot inbox first:

- Use `GMAIL_TEST_RECIPIENT_EMAIL`.
- Do not repeatedly test with Tenyse's real inbox or a client inbox.

Events to test after setup:

- Invite / quiz link.
- Suggested match.
- Nonprofit decision.
- Business decision.
- Mutual approval.
- Outreach/status update.
- Shared note/comment.
- Record edit.

## Part 4: Google Places Setup For Future Small-Business Listing Matches

### Goal

Prepare Google Places as Phase 2 lead research for local business listings.

Important distinction:

- Google Places should help find and enrich potential leads.
- A Google Places result is not a confirmed Raise Local partner.
- Businesses found through Places should be labeled potential leads until they opt in or Tenyse confirms participation.

### 1. Confirm ownership and billing

1. Open Google Cloud Console.
2. Confirm the project belongs to Verified Consulting.
3. Confirm billing is enabled.
4. Confirm Jessica has access.

Places requires a Google Cloud project with billing enabled.

### 2. Enable Places API

Where to go:

1. Google Cloud Console.
2. APIs & Services.
3. Library.
4. Search for Places API.
5. Enable Places API / Places API (New).

If future maps or browser autocomplete are added, also review whether Maps JavaScript API is needed.

### 3. Create a Places API key

Where to go:

1. APIs & Services.
2. Credentials.
3. Create credentials.
4. API key.

Immediately restrict the key.

Recommended restrictions:

- API restrictions: only allow Places API / Places API (New), and any other explicitly required Maps Platform API.
- Application restrictions:
  - If Places calls run from the server: keep key server-side in Render and restrict as tightly as the hosting setup supports.
  - If browser Maps JavaScript is later used: create a separate browser key restricted to approved HTTP referrers.

Do not put an unrestricted API key in frontend JavaScript.

### 4. Add Places key to Render

When the code is ready for Places integration, add:

```text
GOOGLE_PLACES_API_KEY=
```

or the final variable name chosen by the implementation.

Store it only in Render or an approved secret manager.

### 5. Define how Places data can be used in Raise Local

Approved Phase 2 behavior:

- Search by nonprofit geography, cause context, and business categories.
- Pull name, address, website, phone, category, Maps/Place link, rating metadata if permitted, and business status fields allowed by the Places API.
- Store source link and source timestamp.
- Label as Potential Lead.
- Show why it may fit.
- Require human review before outreach.

Avoid:

- Treating Places businesses as signed-up Raise Local partners.
- Sending automatic outreach to scraped/public businesses.
- Displaying photos unless usage rights and API terms are confirmed.
- Mixing public leads into confirmed partner pools without clear labels.

### 6. Suggested Places pilot test

Use one controlled test:

1. Search for DMV businesses near UNITYNow's geography.
2. Pick 3-5 results.
3. Confirm each business is real through Google/Maps and official website or social link.
4. Add them as potential leads.
5. Confirm each result has a clear reason for matching.
6. Confirm the score is not identical unless the underlying match detail is truly identical.
7. Confirm all photos are either approved real images or the placeholder image.

## Part 5: Live Meeting Checklist

Use this sequence in the meeting:

1. Open the shared handoff Google Doc.
2. Confirm the hosted Raise Local URL.
3. Open Supabase and confirm project ownership.
4. Open Supabase Auth users and review Tenyse/Jessica/Cherice roles.
5. Confirm `app_metadata.role = admin` for admin accounts.
6. Open Table Editor and identify the core Raise Local tables.
7. Explain live data versus demo data.
8. Open Render environment settings without revealing secret values.
9. Confirm Supabase and demo token environment variables exist.
10. Open Google Cloud Console.
11. Confirm Verified Consulting owns the Google Cloud project and billing.
12. Enable or verify Gmail API.
13. Review OAuth consent screen.
14. Review OAuth client redirect URI.
15. Confirm Render Gmail env vars.
16. Enable or verify Places API / Places API (New).
17. Create or review restricted Places API key.
18. Agree that Places remains Phase 2 lead research, not confirmed partner enrollment.
19. Decide who owns each post-meeting action.

## Part 6: Action Ownership

| Task | Owner | Notes |
| --- | --- | --- |
| Supabase project ownership/access | Tenyse/Jessica | Confirm organization-owned access. |
| Supabase admin roles | Jessica | Use `app_metadata`, not `user_metadata`. |
| Render environment variables | Jessica/Cherice during handoff | Do not expose secret values. |
| Gmail OAuth project/client | Tenyse/Jessica | Use organization-owned Google Cloud project. |
| Gmail sender authorization | Tenyse or approved sender | Approve only `gmail.send`. |
| Places API key | Jessica | Restrict by API and environment. |
| Places Phase 2 product rules | Tenyse/Jessica | Potential leads only until opt-in. |
| Final QA after deploy | Cherice/Jessica | Test admin, nonprofit, business, demo. |

## Quick Talking Point

Raise Local should treat Supabase as the live source of truth, Render as the deployment/runtime layer, and Google as an owned integration layer. Public Google Places records can improve lead research, but they should never be presented as confirmed Raise Local partners until a real person confirms participation.

## Official Reference Links

- Google Places API setup: https://developers.google.com/maps/documentation/places/web-service/get-api-key
- Gmail API scopes: https://developers.google.com/workspace/gmail/api/auth/scopes
- Supabase user management: https://supabase.com/docs/guides/auth/managing-user-data
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
