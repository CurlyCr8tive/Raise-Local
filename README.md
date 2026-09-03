# Raise Local Platform

Standalone prototype for Tenyse's Raise Local concept: a matchmaking platform
that helps nonprofits, schools, and community organizations find aligned local
business partners.

Positioning: Raise Local, powered by Verified Consulting, connects nonprofits
and community organizations with local businesses that are ready to partner,
support, and grow with them.

Motto: Raise Funds, Buy Local.

## Current Build

- Dashboard with the phase-one core loop and top match.
- Nonprofit/school campaign request intake.
- Business intake form.
- Match review queue with explainable V1 filtered matches.
- Accept, decline, and launch status tracking.
- Build brief and trust guardrails page.
- Local browser storage for demo data.

## Run Locally

```sh
npm run check
npm start
```

Then open:

```text
http://localhost:4173
```

## Product Boundary

This is separate from the Verified Consulting client portal. The first build
focuses only on validating the matching loop:

- A nonprofit or school submits a campaign request.
- Raise Local matches that request to businesses whose category, cause area,
  and geography overlap.
- The business accepts or declines.
- The campaign launches once accepted.

Stripe checkout and 40/45/15 split payouts are future scope. Open marketplace
browsing, e-commerce storefronts, in-app messaging, opaque AI matching, public
profiles, automations, auth, and CRM integrations are not in phase one.
