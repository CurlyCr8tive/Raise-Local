# Raise Local Action And Build Plan

## Current Pivot

Coaching is deprioritized because the active coaching client fell through while
Tenyse was away. Raise Local is now the primary build focus for the remaining
project window.

Raise Local is a two-sided matchmaking platform, powered by Verified
Consulting, that connects nonprofits and community organizations, including
schools and PTAs, with local businesses that can support fundraising campaigns
and events.

Motto: Raise Funds, Buy Local.

## Progress So Far

- Separate Raise Local project created.
- Brand name corrected from Grow Local to Raise Local.
- V1 prototype now includes campaign requests, business profiles, match review,
  and a build brief.
- Founding business examples added: YAMAAS! Olive Oil and Sofia & Grace.
- Matching is currently simple and explainable, based on must-have overlap.
- Brand direction from the provided style guide has been applied at a first-pass
  UI level.

## Immediate Client-Demo Goal

Show that Raise Local is not a generic directory. It is a focused matchmaking
loop:

1. A nonprofit or community organization explains what it needs.
2. Businesses define what they can offer and what they can handle.
3. Raise Local recommends only workable matches.
4. Each recommendation explains the fit.
5. Both sides must confirm interest before contact details are shared.

Tonight's priority deliverable:

- Send Tenyse screenshots of the intro quiz landing screen and the one-question-at-a-time flow.
- Show the two quiz paths:
  - Nonprofit side: "I need a business partner for a campaign."
  - Business side: "I want to support community fundraisers."
- Show that each answer submits before the next question appears, then the quiz
  collects must-haves, nice-to-haves, support type, location, timing, and
  capacity before matching.
- Explain that Supabase and Google Form wiring come next after the fields are
  approved.

## Phase One Build Scope

In scope:

- Nonprofit campaign request quiz.
- Business match profile quiz.
- Must-have filters:
  - Cause or category alignment.
  - Location / service area.
  - Campaign or event type.
  - Needed support type.
  - Business capacity range.
  - Timing and availability.
  - Business campaign cap / unavailable status.
- Top 3-5 recommended matches.
- Plain-language explanations for each match.
- Forecast language such as: "could potentially reach your goal by selling X
  units by Y date."
- Accept, pass, save, request introduction, and launch statuses.
- Decline reason and notes field.
- Manual review or override by Tenyse/Jess.
- Simple 1-5 business rating after campaign completion.

Out of scope for phase one:

- General marketplace browsing.
- Open e-commerce storefront.
- In-app messaging.
- Automated AI matching beyond simple filters.
- Stripe checkout and 40/45/15 split payouts.
- Payment compliance, contracts, refund rules, tax treatment, and liability.

## Data To Capture

Nonprofit campaign request:

- Organization name.
- Organization type: school/PTA, 501(c)(3), community organization, or faith-based nonprofit.
- Contact name, email, phone.
- Campaign description.
- Funding goal.
- Campaign start and end dates.
- Fundraiser deadline.
- Category or cause area.
- Event or campaign type.
- Needed support: food, services, venue, products, sponsorship.
- Local geography: neighborhood, borough, city, zip code, DC, or Maryland.
- Ideal size and minimum-maximum range.
- Delivery, pickup, or in-person needs.
- Must-haves.
- Nice-to-haves.
- Previous fundraiser experience.

Business match profile:

- Business name and category.
- Contact details.
- Location and service areas.
- Cause areas they support.
- Offer type: food, beverage, products, services, venue space, sponsorship.
- Contribution type: product donation, percent of sales, sponsorship dollars,
  event hosting.
- Minimum and maximum order or event capacity.
- Ideal event size.
- Campaign cap.
- Current active campaigns.
- Sold-out or unavailable status.
- Availability dates and times.
- Delivery, pickup, and in-person options.
- Notes, limits, and preferences.

## Matching Logic

The first version should be strict:

- If a must-have is missing, do not recommend the match.
- Filter unavailable or sold-out businesses first.
- Filter by location, service area, cause/category, support type, timing, and
  capacity.
- Rank the remaining options by fit.
- Show the strongest 3-5 matches.
- Explain the match in normal language instead of relying on a raw percentage.

## Trust And Learning

- Both sides confirm interest before contact details are shared.
- If either side declines, collect a reason: timing, location, capacity, budget,
  support type, or not the right fit.
- After a completed campaign, nonprofits can leave a 1-5 star rating and an
  optional explanation.
- Require a note for very low ratings before enforcement.
- Businesses below a quality threshold can be paused or removed after review.

## Supabase Plan

Today:

- Create the Raise Local Supabase project.
- Create tables for campaign requests, businesses, matches, and ratings.
- Keep Google Forms as an interim intake bridge if Tenyse sends the form.

This week:

- Connect in-platform quiz submissions directly to Supabase.
- Add Google Forms -> Google Sheets -> Supabase Apps Script as backup intake.
- Seed Sofia & Grace and YAMAAS! Olive Oil from Tenyse's reference docs.
- Test matching from real records.

Later:

- Add auth and role-specific access.
- Add match notifications.
- Add Stripe only after compliance and payout rules are resolved.

## Next Inputs Needed From Tenyse

- Existing Raise Local reference docs.
- Wix form fields or links.
- Google Form, if she wants the interim bridge.
- Sophia & Grace research document with location/address.
- YAMAAS! Olive Oil details.
- Jessica's preferred reviewer/admin role.
- Confirmation of service areas: Brooklyn first, plus Washington, DC and
  Maryland where applicable.
