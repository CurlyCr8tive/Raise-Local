import { evaluateDecisionTreeMatch } from "./decision-tree-agent.js";

export const ORGANIZATION_TYPES = ["School / PTA", "501(c)(3) nonprofit", "Community organization", "Faith-based nonprofit", "Other"];

export const CAUSE_AREAS = [
  "Education",
  "Youth",
  "Health",
  "Arts",
  "Community",
  "Food access",
  "Workforce development",
  "Other",
];

export const BUSINESS_CATEGORIES = ["Food and beverage", "Restaurant", "Beverage", "Retail", "Wellness", "Services", "Venue", "Local media", "Other", "No preference"];

export const CONTRIBUTION_TYPES = ["Product donation", "Percent of sales", "Sponsorship dollars", "Event hosting", "Other"];

export const EVENT_TYPES = ["Food-based fundraiser", "Gala", "Happy hour", "Community event", "Sponsorship campaign", "Product fundraiser", "Other"];

export const PARTNERSHIP_TYPES = ["Fundraising", "Event sponsorship", "Percentage of sales campaign", "Hosted event", "Food/beverage", "Venue", "Event activation", "Product donation", "Other"];

export const BUSINESS_GOALS = [
  "New customers",
  "Community visibility",
  "Brand awareness",
  "Foot traffic",
  "Product trial",
  "Social media exposure",
  "Email/newsletter exposure",
  "CSR/community impact",
  "Event participation",
  "Long-term nonprofit partnerships",
  "Content opportunities",
  "Local press",
  "Other",
];

export const FULFILLMENT_OPTIONS = ["Shipping", "Delivery", "Pickup", "In person", "Other"];

export const FULFILLMENT_SCOPE = ["Local", "Regional", "National"];

// Question 3 on both intakes — "what kind of partner would best support your
// campaign?" for nonprofits, "what can you offer campaigns?" for businesses.
// One shared list on purpose: the decision tree matches a nonprofit's
// supportNeeds against a business's offerTypes by overlap, so the two sides
// have to speak the same vocabulary.
//
// Revised after the Sept 11 walkthrough with Tenyse. Three changes she asked
// for, and one gap found while making them:
//   - "Sponsorship" -> "Corporate sponsorship". She pushed for specificity:
//     a sponsorship from a corporate partner is a different ask than a
//     neighbourhood business chipping in.
//   - "Products" -> "Products or corporate gifting". Corporate gifting is the
//     gap Raise Local exists to fill — a business with product but no budget
//     can still give, and that describes most small businesses. Folding it
//     into a bare "Products" label hid the whole proposition.
//   - "Services" -> "Professional services", so it doesn't read as catering
//     or event labour, which are covered by other options.
//   - "Local media" added. It was missing entirely, and Tenyse selected it
//     during the walkthrough as a partner type she'd expect to see.
// "Food" and "Beverage" are merged into "Food & beverage" — they were always
// selected together, and the split made the list read longer than it was.
export const SUPPORT_NEEDS = [
  "Food & beverage",
  "Products or corporate gifting",
  "Professional services",
  "Local media",
  "Venue space",
  "Event activation",
  "Corporate sponsorship",
  "Other",
];

// Answers saved before the rename above. Matching is a string-overlap test
// (see decision-tree-agent.js), so a nonprofit holding "Products" and a
// business holding "Products or corporate gifting" would silently stop
// matching — no error, just no result. storage.js rewrites old values
// through this on load so existing signups keep working.
export const LEGACY_SUPPORT_NEEDS = {
  Food: "Food & beverage",
  Beverage: "Food & beverage",
  Products: "Products or corporate gifting",
  Services: "Professional services",
  Sponsorship: "Corporate sponsorship",
};

/** Upgrades a saved list of support needs / offer types to current labels. */
export function normalizeSupportNeeds(values) {
  if (!Array.isArray(values)) return [];
  const mapped = values.map((v) => LEGACY_SUPPORT_NEEDS[v] || v);
  return [...new Set(mapped)]; // Food + Beverage both map to one label
}

export const TIMING_OPTIONS = ["Within a month", "1-3 months out", "3+ months out", "Flexible / not sure yet"];

export const AVAILABILITY_OPTIONS = ["Right away", "Within a month", "1-3 months out", "Flexible / not sure yet"];

export const DECLINE_REASONS = ["Timing", "Location", "Capacity", "Budget or minimum", "Support type", "Not the right fit"];

export const MATCH_STATUSES = ["recommended", "saved", "intro_requested", "accepted", "declined", "launched"];

export function splitSelections(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fitLabel(total) {
  if (total >= 85) return "Strong fit";
  if (total >= 70) return "Good fit";
  return "Possible fit";
}

function forecast(request, business) {
  const goal = Number(request.fundingGoal) || 0;
  const unitValue = Number(business.estimatedUnitContribution) || 0;
  if (!goal || !unitValue) return "Forecast needs a funding goal and estimated per-unit contribution.";
  const units = Math.ceil(goal / unitValue);
  return `Could potentially reach $${goal.toLocaleString()} by selling ${units.toLocaleString()} units at about $${unitValue.toLocaleString()} each.`;
}

export function scoreMatch(request, business) {
  const decision = evaluateDecisionTreeMatch(request, business);

  return {
    total: decision.total,
    label: fitLabel(decision.total),
    forecast: forecast(request, business),
    filters: Object.fromEntries(decision.stages.map((stage) => [stage.key, stage.passed])),
    decisionStages: decision.stages,
    blockers: decision.blockers,
    rejected: decision.rejected,
    reasons: decision.reasons,
  };
}

export function buildMatches(campaignRequests, businesses, existingMatches = []) {
  return campaignRequests
    .flatMap((request) =>
      businesses.map((business) => {
        const score = scoreMatch(request, business);
        const saved = existingMatches.find((match) => match.requestId === request.id && match.businessId === business.id);
        return {
          id: `${request.id}-${business.id}`,
          request,
          business,
          status: saved?.status || "recommended",
          declineReason: saved?.declineReason || "",
          declineNote: saved?.declineNote || "",
          adminNote: saved?.adminNote || "",
          notifiedAt: saved?.notifiedAt || "",
          ...score,
        };
      })
    )
    .filter(
      (match) =>
        !match.rejected
    )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}
