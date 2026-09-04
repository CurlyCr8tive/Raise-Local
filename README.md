# Raise Local Platform

Standalone prototype for Tenyse's Raise Local concept: a matchmaking platform
that helps nonprofits and community organizations, including schools and PTAs,
find aligned local business partners.

Positioning: Raise Local, powered by Verified Consulting, connects nonprofits
and community organizations with local businesses that are ready to partner,
support, and grow with them.

Motto: Raise Funds, Buy Local.

## Current Build

- Dashboard with the phase-one core loop and top match.
- One-question-at-a-time intro quiz with nonprofit and business paths.
- Raise Local logo and symbol assets applied from the brand package.
- Nonprofit campaign request intake.
- Business intake form.
- Match review queue with explainable V1 filtered matches.
- Save, request intro, accept, decline, and launch status tracking.
- Compatibility score, why-this-match-fit reasons, notification records, and
  admin override notes.
- Build brief and trust guardrails page.
- Action and build plan from the September 3 meeting.
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

- A nonprofit or community organization submits a campaign request.
- Raise Local matches that request to businesses whose location, cause,
  partnership type, offer, timing, capacity, and minimums overlap.
- Both sides save, request an intro, accept, or decline.
- The campaign launches once accepted.

See `docs/action-and-build-plan.md` for the current action plan and
`docs/core-matchmaking-brief.md` for the product source of truth.

Stripe checkout and 40/45/15 split payouts are future scope. Open marketplace
browsing, e-commerce storefronts, in-app messaging, opaque AI matching, public
profiles, automations, auth, and CRM integrations are not in phase one.
