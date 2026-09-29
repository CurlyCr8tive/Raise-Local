# Tenyse Use Guide

This guide is for the live walkthrough and for day-to-day use of the current demo build.

## Before A Demo

1. Start the Raise Local server from the project folder:

   ```sh
   npm start
   ```

2. Open [Raise Local](http://localhost:4102).
3. Use the demo workspace rather than a real account for presentations.
4. Open the account menu and choose **Reset Demo Data** before rehearsing. This restores the Grove Park presentation path with manually seeded Atlanta potential business leads.
5. Keep the Verified Consulting owner preview and client preview in separate browser tabs.

## Verified Consulting

Use the owner preview first:

[Owner dashboard](http://localhost:8420/owner.html?demo=owner)

Use this client view when explaining the client experience:

[Greyz Bistro coaching view](http://localhost:8420/client.html?demo=greyz-bistro&view=coaching)

The owner preview is recommended for presentations because it avoids login friction. Real credentials should be shared verbally or through a password manager, never in this repository or in presentation notes.

### Owner walkthrough

1. Start on the owner dashboard.
2. Open **Campaigns** and choose a campaign with press placements.
3. Show publicity value, placements, proof points, and the client update tools.
4. Open **Review Queue** to show that possible mentions are reviewed before becoming client-facing results.
5. Open **Reports** and show the path from structured data to an executive summary, report narrative, saved draft, and export.
6. Open the client preview to show coaching phases, homework, resources, opportunities, and next steps.

## Raise Local Roles

Open [Raise Local](http://localhost:4102) and choose **View Demo Workspace**. The demo account menu can switch views without signing out:

| View | Demo identity | Best use |
| --- | --- | --- |
| Tenyse / Admin | `demo@raiselocal.local` | See the full network, review matches, coordinate outreach, and advance projects |
| Nonprofit | `demo-nonprofit@raiselocal.example` | Submit a campaign and approve, hold, or decline a match |
| Business | `demo-business@raiselocal.example` | Review opportunities and approve, hold, or decline a match |

The demo identities are presentation identities. Do not use them for production data.

Grove Park Foundation is the primary Raise Local presentation-planning nonprofit
record with its Atlanta campaign context and October 1 to December 15 campaign
window. The seeded Atlanta businesses are marked **potential lead** and should
not be described as confirmed partners until Tenyse or the business confirms
participation.

### Nonprofit flow

1. Switch to **Nonprofit**.
2. Open **Campaign Requests**.
3. Select **Add campaign request** if you want to show intake, or use the seeded request for a reliable demo.
4. Complete the guided questions. Suggestions appear as the nonprofit describes its cause, location, timing, support type, and audience.
5. Select **Find My Matches**.
6. Open the strongest result and review the fit explanation, decision path, campaign approach, and estimated fundraising scenario.
7. Choose **Approve**, **Hold**, or **Decline**. Approval means the nonprofit is open to an introduction; it does not force a partnership.

### Business flow

1. Switch to **Business**.
2. Open **Match Review**.
3. Review the opportunity details and why the match was suggested.
4. Choose **Approve**, **Hold**, or **Decline**.
5. When both sides approve, the match becomes ready for outreach. Contact details are not treated as shared merely because a match was suggested.

### Tenyse / Admin flow

1. Switch to **Tenyse / Admin**.
2. Use **Campaign Requests** to see submitted requests and open **View details**. The form is behind **Add campaign request**, so the directory is the first thing visible.
3. Use **Business Profiles** to see partner profiles and open **View details**. Use **Complete profile** only when adding or enriching a record on a client’s behalf.
4. Open **Match Review** to see the decision path and both parties’ decisions.
5. After mutual approval, open **Outreach** and choose the outreach action. This is the coordination point where Tenyse stays connected to the relationship.
6. Use **My Projects** to show the partnership moving from approved to outreach pending, active, and completed.
7. Use **Reports** to show the record of what happened and what value was created.

## Live Invite Flow

In a hosted handoff build, Tenyse can use the admin dashboard to invite real nonprofits and businesses.

1. Log in as admin.
2. Open the dashboard.
3. Use **Copy nonprofit invite link** or **Copy business invite link** for manual sharing.
4. If Gmail OAuth is connected, enter the client email, choose nonprofit or business, and select **Send invite**.
5. The client should use that same email address when registering so Supabase can scope their records correctly.

If Gmail is not connected yet, the app will show the invite link so it can be sent manually.

## Shared Notes And Notifications

Campaign, business, and match detail pages include a **Shared notes** section.

- Clients can add questions, clarifications, or updates.
- Admins can review notes in context.
- In-app notifications appear after login.
- Gmail notifications are sent only after Google OAuth and `GMAIL_NOTIFICATION_EMAIL` are configured.

## Editing Client Records

Each campaign request and partner profile has one canonical record. Nonprofits and businesses own their core facts; Tenyse owns operational review, quality, matching context, and coordination.

- Nonconflicting edits are merged into the same record.
- Tenyse and trusted admins can update current campaign and business details directly, including fields originally entered by a client.
- When an admin changes a client-entered value, the latest value becomes live and the previous value is retained in the admin edit history.
- The record keeps who last edited it, when it changed, the revision number, and which fields came from the client or admin.
- Record edits notify the record owner and the configured Tenyse/admin notification recipients after the server's Gmail delivery is configured.
- Separate campaigns remain separate records even when they belong to the same organization.

## Resetting The Demo

**Reset Demo Data** is available only in the demo account menu. Use it before a rehearsal or presentation. It resets the local demo state; it does not delete real Supabase records.

## What Is Not In The Current Demo

- Local Gmail demo notifications can be enabled when a completed intake creates a suggested match and again after mutual approval through the technical OAuth setup. Hosted Gmail sending is not production-ready yet.
- Shared notes/comments are available, but live Gmail delivery still requires hosted Google OAuth setup.
- The matching assistant uses explainable rules as the source of truth. AI provider keys are optional for future explanations and drafts; they are not required for the core match result.
- The current local demo is not a production deployment. Use the hosted handoff only after auth, persistence, and account permissions have been tested.
