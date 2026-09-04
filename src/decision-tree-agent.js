const DECISION_STAGES = [
  { key: "availability", label: "Availability", weight: 10, required: true },
  { key: "location", label: "Location", weight: 18, required: true },
  { key: "cause", label: "Cause alignment", weight: 18, required: true },
  { key: "businessType", label: "Business type", weight: 14, required: true },
  { key: "partnership", label: "Partnership type", weight: 12, required: true },
  { key: "offer", label: "Offer fit", weight: 10, required: true },
  { key: "capacity", label: "Capacity", weight: 10, required: true },
  { key: "financial", label: "Financial minimums", weight: 8, required: true },
  { key: "businessGoals", label: "Business goals", weight: 0, required: false },
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function overlaps(left = [], right = []) {
  const rightSet = new Set(right.map(normalize));
  return left.map(normalize).some((item) => rightSet.has(item));
}

function containsArea(requestGeo, serviceAreas = []) {
  const requestArea = normalize(requestGeo);
  if (!requestArea) return true;
  return serviceAreas.map(normalize).some((area) => area.includes(requestArea) || requestArea.includes(area));
}

function parseAmount(value) {
  if (typeof value === "number") return value;
  const text = String(value || "");
  if (/under/i.test(text)) return Number(text.replace(/[^\d]/g, "")) || 0;
  if (/\+/.test(text)) return Number(text.replace(/[^\d]/g, "")) || 0;
  const numbers = text.match(/\d[\d,]*/g)?.map((item) => Number(item.replaceAll(",", ""))) || [];
  return numbers.length ? Math.max(...numbers) : 0;
}

function dateInsideWindow(request, business) {
  if (!request.startDate || !request.endDate || !business.availableFrom || !business.availableTo) return true;
  return request.startDate >= business.availableFrom && request.endDate <= business.availableTo;
}

function categoryMatches(request, business) {
  const preferences = request.preferredCategories?.length ? request.preferredCategories : [request.businessPreference];
  return preferences.includes("No preference") || preferences.map(normalize).includes(normalize(business.category));
}

function capacityMatches(request, business) {
  const expected = parseAmount(request.expectedParticipation || request.idealSize || request.minimumSize);
  const minimumNeeded = parseAmount(request.minimumSize || request.expectedParticipation);
  const businessMin = parseAmount(business.minimumCapacity);
  const businessMax = parseAmount(business.maximumCapacity || business.maximumOrderCapacity);
  if (!expected && !minimumNeeded) return true;
  if (!businessMax) return true;
  return (expected || minimumNeeded) >= businessMin && minimumNeeded <= businessMax;
}

function financialMatches(request, business) {
  const goal = parseAmount(request.fundingGoal);
  const minimum = parseAmount(business.minimumOrderRequirement || business.minimumCampaignRequirement);
  if (!goal || !minimum) return true;
  return goal >= minimum;
}

function campaignCapMatches(business) {
  const activeCampaigns = parseAmount(business.activeCampaigns);
  const campaignCap = parseAmount(business.campaignCap);
  return !business.unavailable && (!campaignCap || activeCampaigns < campaignCap);
}

function stageResult(stage, passed, reason, blocker = "") {
  return {
    ...stage,
    passed,
    points: passed ? stage.weight : 0,
    reason: passed ? reason : "",
    blocker: passed ? "" : blocker,
  };
}

export function evaluateDecisionTreeMatch(request, business) {
  const stageByKey = Object.fromEntries(DECISION_STAGES.map((stage) => [stage.key, stage]));

  const stages = [
    stageResult(stageByKey.availability, campaignCapMatches(business) && dateInsideWindow(request, business), "Available during campaign window", "Business is unavailable, over campaign capacity, or outside the needed timing."),
    stageResult(stageByKey.location, containsArea(request.geography, business.serviceAreas), `Serves ${request.geography || "the requested area"}`, "Location or service area does not overlap."),
    stageResult(stageByKey.cause, overlaps([request.causeArea], business.causeAreas || []), `Supports ${request.causeArea}`, "Cause areas do not overlap."),
    stageResult(stageByKey.businessType, categoryMatches(request, business), `Fits ${((request.preferredCategories || [request.businessPreference]).join(", ")).toLowerCase()} preference`, "Business category does not match the preferred partner type."),
    stageResult(
      stageByKey.partnership,
      !request.partnershipTypesNeeded?.length || !business.partnershipTypes?.length || overlaps(request.partnershipTypesNeeded, business.partnershipTypes),
      request.partnershipTypesNeeded?.length ? "Open to the needed partnership type" : "",
      "Partnership type does not overlap."
    ),
    stageResult(stageByKey.offer, !request.supportNeeds?.length || !business.offerTypes?.length || overlaps(request.supportNeeds, business.offerTypes), "Offers the support needed", "The business offer does not match the nonprofit need."),
    stageResult(stageByKey.capacity, capacityMatches(request, business), "Capacity range can cover the expected participation", "Capacity does not fit the expected participation."),
    stageResult(
      stageByKey.financial,
      financialMatches(request, business),
      business.minimumOrderRequirement || business.minimumCampaignRequirement ? "Minimums fit the fundraising target" : "",
      "Minimum order or campaign requirement is too high for the fundraising target."
    ),
    stageResult(
      stageByKey.businessGoals,
      Boolean(business.businessGoals?.length),
      `Business goals captured: ${business.businessGoals?.slice(0, 3).join(", ")}`,
      ""
    ),
  ];

  const blockers = stages.filter((stage) => stage.required && !stage.passed).map((stage) => stage.blocker);
  const total = stages.reduce((sum, stage) => sum + stage.points, 0);

  return {
    total,
    rejected: blockers.length > 0,
    blockers,
    stages,
    reasons: stages.filter((stage) => stage.passed && stage.reason).map((stage) => stage.reason),
  };
}
