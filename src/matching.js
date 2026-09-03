export const ORGANIZATION_TYPES = ["School / PTA", "501(c)(3) nonprofit", "Community organization", "Faith-based nonprofit"];

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

export const BUSINESS_CATEGORIES = ["Food and beverage", "Retail", "Services", "No preference"];

export const CONTRIBUTION_TYPES = ["Product donation", "Percent of sales", "Sponsorship dollars", "Event hosting"];

export const EVENT_TYPES = ["Food-based fundraiser", "Gala", "Happy hour", "Community event", "Sponsorship campaign", "Product fundraiser"];

export const SUPPORT_NEEDS = ["Food", "Beverage", "Products", "Services", "Venue space", "Sponsorship"];

export const DECLINE_REASONS = ["Timing", "Location", "Capacity", "Budget or minimum", "Support type", "Not the right fit"];

export const MATCH_STATUSES = ["recommended", "saved", "intro_requested", "accepted", "declined", "launched"];

export function splitSelections(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sameText(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function hasOverlap(left = [], right = []) {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return left.some((item) => rightSet.has(item.toLowerCase()));
}

function categoryFits(request, business) {
  return request.businessPreference === "No preference" || sameText(request.businessPreference, business.category);
}

function geographyFits(request, business) {
  const requestGeo = String(request.geography || "").trim().toLowerCase();
  const serviceAreas = (business.serviceAreas || []).map((item) => item.toLowerCase());
  return Boolean(requestGeo && serviceAreas.some((area) => area.includes(requestGeo) || requestGeo.includes(area)));
}

function availabilityFits(request, business) {
  if (!request.startDate || !request.endDate || !business.availableFrom || !business.availableTo) return true;
  return request.startDate >= business.availableFrom && request.endDate <= business.availableTo;
}

function supportFits(request, business) {
  if (!request.supportNeeds?.length || !business.offerTypes?.length) return true;
  return hasOverlap(request.supportNeeds, business.offerTypes);
}

function capacityFits(request, business) {
  const minimum = Number(request.minimumSize) || 0;
  const ideal = Number(request.idealSize) || minimum;
  const businessMin = Number(business.minimumCapacity) || 0;
  const businessMax = Number(business.maximumCapacity) || Infinity;
  return ideal >= businessMin && minimum <= businessMax;
}

function capFits(business) {
  const activeCampaigns = Number(business.activeCampaigns) || 0;
  const campaignCap = Number(business.campaignCap) || Infinity;
  return !business.unavailable && activeCampaigns < campaignCap;
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
  const causeFit = hasOverlap([request.causeArea], business.causeAreas || []);
  const businessTypeFit = categoryFits(request, business);
  const geographyFit = geographyFits(request, business);
  const contributionFit = (business.contributionTypes || []).length > 0;
  const availabilityFit = availabilityFits(request, business);
  const supportFit = supportFits(request, business);
  const capacityFit = capacityFits(request, business);
  const capFit = capFits(business);

  const total =
    (causeFit ? 22 : 0) +
    (businessTypeFit ? 18 : 0) +
    (geographyFit ? 20 : 0) +
    (contributionFit ? 10 : 0) +
    (availabilityFit ? 10 : 0) +
    (supportFit ? 10 : 0) +
    (capacityFit ? 10 : 0);

  return {
    total,
    label: fitLabel(total),
    forecast: forecast(request, business),
    filters: { causeFit, businessTypeFit, geographyFit, contributionFit, availabilityFit, supportFit, capacityFit, capFit },
    reasons: [
      causeFit ? `Supports ${request.causeArea}` : "",
      businessTypeFit ? `Fits ${request.businessPreference.toLowerCase()} preference` : "",
      geographyFit ? `Serves ${request.geography}` : "",
      contributionFit ? "Has a contribution type on file" : "",
      availabilityFit ? "Available during campaign window" : "",
      supportFit ? "Offers the support needed" : "",
      capacityFit ? "Capacity range can cover the request" : "",
    ].filter(Boolean),
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
          ...score,
        };
      })
    )
    .filter(
      (match) =>
        match.filters.causeFit &&
        match.filters.businessTypeFit &&
        match.filters.geographyFit &&
        match.filters.supportFit &&
        match.filters.capacityFit &&
        match.filters.capFit
    )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}
