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
http://localhost:4102
```

## Private AI Provider Setup

The local server supports OpenAI and Anthropic without exposing credentials to
the browser. Copy `.env.local.example` to `.env.local`, add the provider keys,
and restart the server:

```sh
cp .env.local.example .env.local
npm start
```

Check configured providers without revealing key values:

```sh
curl -s http://localhost:4102/api/health
```

The frontend can call `POST /api/ai` with `{ provider, messages, system }`.
The matching rules remain the source of truth; the model is intended for
explanations, intake interpretation, and outreach drafts.

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

## Handoff And Demo Guides

- `docs/tenyse-use-guide.md` explains the role-based demo and everyday workflows.
- `docs/technical-handoff.md` covers local setup, Supabase, environment variables,
  production readiness, and known limitations.
- `docs/demo-day-8-minute-script.md` contains the recommended combined
  Verified Consulting and Raise Local presentation flow.

Stripe checkout and 40/45/15 split payouts are future scope. Open marketplace
browsing, e-commerce storefronts, in-app messaging, opaque AI matching, public
profiles, automations, auth, and CRM integrations are not in phase one.
