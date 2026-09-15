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

export const SUPPORT_NEEDS = ["Food", "Beverage", "Products", "Services", "Venue space", "Sponsorship", "Event activation", "Other"];

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
