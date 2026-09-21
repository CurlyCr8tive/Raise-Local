# Tenyse Use Guide

This guide is for the live walkthrough and for day-to-day use of the current demo build.

## Before A Demo

1. Start the Raise Local server from the project folder:

   ```sh
   npm start
   ```

2. Open [Raise Local](http://localhost:4102).
3. Use the demo workspace rather than a real account for presentations.
4. Open the account menu and choose **Reset Demo Data** before rehearsing. This keeps the seeded Fresh Start Pantry and Yamaas match available.
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

## Editing Client Records

Each campaign request and partner profile has one canonical record. Nonprofits and businesses own their core facts; Tenyse owns operational review, quality, matching context, and coordination.

- Nonconflicting edits are merged into the same record.
- If Tenyse proposes a different value for a field the client already supplied, the client value remains visible and the proposal is listed for review.
- The record keeps who last edited it, when it changed, and which fields came from the client or admin.
- Separate campaigns remain separate records even when they belong to the same organization.

## Resetting The Demo

**Reset Demo Data** is available only in the demo account menu. Use it before a rehearsal or presentation. It resets the local demo state; it does not delete real Supabase records.

## What Is Not In The Current Demo

- Local Gmail demo notifications can be enabled when a completed intake creates a suggested match and again after mutual approval through the technical OAuth setup. Hosted Gmail sending is not production-ready yet.
- The matching assistant uses explainable rules as the source of truth. AI provider keys are optional for future explanations and drafts; they are not required for the core match result.
- The current local demo is not a production deployment. Use the hosted handoff only after auth, persistence, and account permissions have been tested.
