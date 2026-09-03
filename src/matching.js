export const ORGANIZATION_TYPES = ["School", "Nonprofit", "Community group"];

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

export const MATCH_STATUSES = ["recommended", "accepted", "declined", "launched"];

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

export function scoreMatch(request, business) {
  const causeFit = hasOverlap([request.causeArea], business.causeAreas || []);
  const businessTypeFit = categoryFits(request, business);
  const geographyFit = geographyFits(request, business);
  const contributionFit = (business.contributionTypes || []).length > 0;
  const availabilityFit = availabilityFits(request, business);

  const total =
    (causeFit ? 30 : 0) +
    (businessTypeFit ? 25 : 0) +
    (geographyFit ? 25 : 0) +
    (contributionFit ? 10 : 0) +
    (availabilityFit ? 10 : 0);

  return {
    total,
    filters: { causeFit, businessTypeFit, geographyFit, contributionFit, availabilityFit },
    reasons: [
      causeFit ? `Supports ${request.causeArea}` : "",
      businessTypeFit ? `Fits ${request.businessPreference.toLowerCase()} preference` : "",
      geographyFit ? `Serves ${request.geography}` : "",
      contributionFit ? "Has a contribution type on file" : "",
      availabilityFit ? "Available during campaign window" : "",
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
          ...score,
        };
      })
    )
    .filter((match) => match.filters.causeFit && match.filters.businessTypeFit && match.filters.geographyFit)
    .sort((a, b) => b.total - a.total);
}
