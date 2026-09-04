# Raise Local Core Matchmaking Brief

## Positioning

Raise Local, powered by Verified Consulting, connects nonprofits and community
organizations with local businesses that are ready to partner, support, and
grow with them.

Motto: Raise Funds, Buy Local.

## Phase One Core Loop

1. A nonprofit or community organization submits a campaign request.
2. Raise Local matches that request to local businesses whose profiles fit.
3. Tenyse or the system flags a top match; both sides can save, request an
   introduction, accept, or decline.
4. Once accepted, the nonprofit and business launch a fundraising campaign
   together.

Stripe checkout and 40/45/15 split payouts are important future scope, but not
part of this first prototype.

## Two Sides Of The Match

Nonprofit side:

- Submits a structured campaign request.
- Represents the demand side: the organization needs funding or support.

Business side:

- Maintains a profile Raise Local can match against.
- Represents the supply side: the business wants to support a local cause.
- Founding businesses include YAMAAS! Olive Oil and Sofia & Grace.

## V1 Match Meaning

In V1, a match is a business whose profile overlaps with the campaign request
on:

- Location or service area.
- Cause alignment.
- Partnership type.
- Business category or preferred business type.
- Business capacity and nonprofit expected participation.
- Timing and availability.
- Financial requirements or minimum order/campaign requirements.
- What the nonprofit needs and what the business can offer.

The system should prevent clearly incompatible matches, rank the remaining
options, surface the strongest 3-5, show a compatibility score, and explain why
each match fits in plain language.

## Match Actions And Records

Each match should let users or the Raise Local admin team:

- Save.
- Request an introduction.
- Accept.
- Pass or decline with a reason.
- Launch once both sides are ready.
- Record an admin override or manual recommendation note.

When a match moves to introduction requested, accepted, or launched, the system
should record that email notifications need to go to both sides. Those
notifications can be automated after Supabase and email service wiring are in
place.

## Business Bot Questions

The business-side bot should capture what the business wants to get out of
participating, not only what it will give. Goals include new customers,
community visibility, brand awareness, foot traffic, product trial, social media
exposure, email/newsletter exposure, CSR/community impact, event participation,
long-term nonprofit partnerships, content opportunities, and local press.

The phase-one business profile should also capture website, social links,
category, location/service area, fulfillment scope, size or capacity, products
or services available for partnerships, average price range, minimum order or
campaign requirement, maximum capacity, lead time, fulfillment options, causes,
organization types served, and partnership types.

## Nonprofit Bot Questions

The nonprofit-side bot should capture website, social links, organization
classification, location and communities served, mission, population/audience
served, audience size, expected participation, campaign goal, amount to raise,
campaign dates, partner deadline, preferred business categories, type of partner
needed, and partnership type needed.

## Product Guardrails

- Prioritize match quality over listing volume.
- Keep onboarding simple.
- Explain why each recommendation appears.
- Require mutual interest and consent before introductions.
- Do not imply a match guarantees business quality, nonprofit legitimacy,
  funding results, or partnership success.
- Keep marketplace browsing, in-app messaging, e-commerce, opaque AI matching,
  and payment compliance out of phase one.
