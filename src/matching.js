import { evaluateDecisionTreeMatch } from "./decision-tree-agent.js";

export const ORGANIZATION_TYPES = ["School / PTA", "501(c)(3) nonprofit", "Community organization", "Faith-based nonprofit", "Other"];

// Display-only — not a matching filter. A franchise can still be a great
// partner with real budget, so this never blocks or scores a match; it's
// just a trust/context signal nonprofits see on the business's card.
export const BUSINESS_TYPES = ["Small Business", "Franchise", "Other"];

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

// Shared by both intakes on purpose: the decision tree matches a nonprofit's
// supportNeeds against a business's offerTypes by string overlap, so both
// sides need the same vocabulary.
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

// Maps prior label values forward. Matching is a string-overlap test (see
// decision-tree-agent.js), so a saved answer under an old label would
// silently stop matching a current one — no error, just no result.
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

export const MATCH_DECISIONS = ["approved", "held", "declined"];
export const MATCH_STATUSES = [
  "suggested",
  "under_review",
  "awaiting_nonprofit",
  "awaiting_business",
  "on_hold",
  "declined",
  "mutually_approved",
  "outreach_pending",
  "outreach_sent",
  "accepted",
  "active",
  "completed",
  "launched",
];

export function deriveMatchStatus(match = {}) {
  if (["accepted", "active", "completed", "launched"].includes(match.status)) return match.status;
  if (match.outreachStatus === "sent") return "outreach_sent";
  if (match.outreachStatus === "pending") return "outreach_pending";
  if (match.nonprofitDecision === "declined" || match.businessDecision === "declined" || match.status === "declined") return "declined";
  if (match.nonprofitDecision === "held" || match.businessDecision === "held" || match.status === "saved") return "on_hold";
  if (match.nonprofitDecision === "approved" && match.businessDecision === "approved") return "mutually_approved";
  if (match.nonprofitDecision === "approved") return "awaiting_business";
  if (match.businessDecision === "approved") return "awaiting_nonprofit";
  return "suggested";
}

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
          status: deriveMatchStatus(saved || {}),
          nonprofitDecision: saved?.nonprofitDecision || "",
          businessDecision: saved?.businessDecision || "",
          outreachStatus: saved?.outreachStatus || "not_started",
          outreachMessage: saved?.outreachMessage || "",
          outreachAt: saved?.outreachAt || "",
          outreachFallback: Boolean(saved?.outreachFallback),
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
