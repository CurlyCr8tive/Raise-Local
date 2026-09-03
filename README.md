# Grow Local Platform

Standalone prototype for Tenyse's Grow Local concept: a matchmaking platform
that helps small businesses find aligned nonprofit partners.

## Current Build

- Dashboard with match metrics and the best current match.
- Business intake form.
- Nonprofit intake form.
- Match queue with directional fit scores.
- Research notes / jobs-to-be-done page.
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

- Business goals, audience, market, budget, and activation preferences.
- Nonprofit causes, audience, market, minimum contribution, and partnership
  needs.
- Fit score with human-readable reasons.
- Tenyse review before introductions.

Fundraising payments, public profiles, automations, auth, and CRM integrations
are future scope.
