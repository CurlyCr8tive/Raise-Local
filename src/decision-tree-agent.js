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
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ");
}

function expandMatchTerm(value) {
  const normalized = normalize(value);
  const expanded = new Set([normalized]);
  if (normalized === "community event") {
    expanded.add("event sponsorship");
    expanded.add("hosted event");
    expanded.add("event activation");
  }
  return [...expanded];
}

function overlaps(left = [], right = []) {
  const rightSet = new Set(right.flatMap(expandMatchTerm));
  return left.flatMap(expandMatchTerm).some((item) => rightSet.has(item));
}

function overlapCount(left = [], right = []) {
  const rightSet = new Set(right.flatMap(expandMatchTerm));
  return left.flatMap(expandMatchTerm).filter((item) => rightSet.has(item)).length;
}

function splitGeo(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[,/;|]+|\band\b/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function expandGeoTerm(term) {
  const value = normalize(term);
  const expanded = new Set([value]);
  if (["nyc", "new york city"].includes(value)) expanded.add("new york");
  if (["grove park", "westside atlanta"].includes(value)) {
    expanded.add("atlanta");
    expanded.add("georgia");
  }
  if (["atlanta ga", "atlanta, ga"].includes(value)) {
    expanded.add("atlanta");
    expanded.add("georgia");
  }
  if (["dmv", "dc", "washington dc", "washington, dc", "maryland", "northern virginia"].includes(value)) {
    expanded.add("dmv");
  }
  if (["dallas-fort worth", "dallas fort worth", "dfw", "rockwall"].includes(value)) {
    expanded.add("texas");
  }
  return [...expanded];
}

function expandedGeoSet(values) {
  return new Set(values.flatMap(splitGeo).flatMap(expandGeoTerm));
}

function locationFit(requestGeo, business) {
  const requestRaw = splitGeo(requestGeo).map(normalize);
  const serviceRaw = (business.serviceAreas || []).flatMap(splitGeo).map(normalize);
  const requestTerms = expandedGeoSet([requestGeo]);
  const serviceTerms = expandedGeoSet(business.serviceAreas || []);
  const scope = normalize(business.fulfillmentScope);
  const areas = (business.serviceAreas || []).map(normalize);
  const boroughs = new Set(["brooklyn", "queens", "manhattan", "bronx", "staten island"]);
  if (!requestTerms.size) {
    return { passed: false, points: 0, reason: "", blocker: "Campaign location is missing, so location fit cannot be trusted." };
  }
  if (!serviceTerms.size && !scope) {
    return { passed: false, points: 0, reason: "", blocker: "Business service area is missing, so location fit cannot be trusted." };
  }
  const direct = [...requestTerms].some((term) => serviceTerms.has(term));
  if (direct) {
    return { passed: true, points: 18, reason: `Serves ${requestGeo}` };
  }
  const requestIsBorough = requestRaw.some((term) => boroughs.has(term));
  const servesWholeCity = serviceRaw.some((term) => ["nyc", "new york city", "new york"].includes(term));
  if (requestIsBorough && servesWholeCity) {
    return { passed: true, points: 15, reason: `Serves the broader ${requestGeo} market` };
  }
  if (scope === "national" || areas.includes("national")) {
    return { passed: true, points: 8, reason: `Can support ${requestGeo} through national fulfillment` };
  }
  if (scope === "regional" || areas.includes("regional")) {
    return { passed: true, points: 6, reason: `May support ${requestGeo} through regional fulfillment` };
  }
  return { passed: false, points: 0, reason: "", blocker: "Location or service area does not overlap." };
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
  if (preferences.includes("No preference")) return { passed: true, points: 8, reason: "Open to any business category" };
  const passed = preferences.map(normalize).includes(normalize(business.category));
  return {
    passed,
    points: passed ? 14 : 0,
    reason: passed ? `Fits ${preferences.join(", ").toLowerCase()} preference` : "",
    blocker: "Business category does not match the preferred partner type.",
  };
}

function exactLocationOverlap(request, business) {
  const requestTerms = new Set(splitGeo(request.geography).map(normalize));
  const serviceTerms = new Set((business.serviceAreas || []).flatMap(splitGeo).map(normalize));
  if (![...requestTerms].some((term) => serviceTerms.has(term))) return 0;
  if ([...requestTerms].some((term) => !["dmv", "dc", "atlanta ga"].includes(term) && serviceTerms.has(term))) return 3;
  return 2;
}

function categoryTieBreak(request, business) {
  const preferences = request.preferredCategories?.length ? request.preferredCategories : [request.businessPreference];
  if (preferences.map(normalize).includes(normalize(business.category))) return 3;
  if (preferences.includes("No preference")) return 1;
  return 0;
}

function potentialLeadScore(request, business, rawTotal) {
  const sourceCount = [business.googleMapsUrl, business.sourceUrl, business.website].filter(Boolean).length;
  const contactCount = [business.phone, business.email, business.socialLinks].filter(Boolean).length;
  const goal = parseAmount(request.fundingGoal);
  const minimum = parseAmount(business.minimumOrderRequirement || business.minimumCampaignRequirement);
  const minimumRatio = goal && minimum ? minimum / goal : 0.1;
  const financialDetail = minimumRatio <= 0.04 ? 3 : minimumRatio <= 0.07 ? 2 : minimumRatio <= 0.1 ? 1 : 0;
  const leadTime = parseAmount(business.leadTimeDays);
  const leadTimeDetail = !leadTime ? 0 : leadTime <= 10 ? 2 : leadTime <= 14 ? 1 : 0;
  const detailScore =
    exactLocationOverlap(request, business)
    + categoryTieBreak(request, business)
    + Math.min(3, overlapCount(request.supportNeeds || [], business.offerTypes || []))
    + Math.min(2, overlapCount(request.partnershipTypesNeeded || [], business.partnershipTypes || []))
    + financialDetail
    + leadTimeDetail
    + Math.min(2, sourceCount)
    + Math.min(2, contactCount)
    + Math.min(2, (business.businessGoals || []).length >= 3 ? 2 : business.businessGoals?.length || 0);

  return Math.min(rawTotal, 92, 72 + detailScore);
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

function stageResult(stage, passed, reason, blocker = "", points = passed ? stage.weight : 0) {
  return {
    ...stage,
    passed,
    points,
    reason: passed ? reason : "",
    blocker: passed ? "" : blocker,
  };
}

export function evaluateDecisionTreeMatch(request, business) {
  const stageByKey = Object.fromEntries(DECISION_STAGES.map((stage) => [stage.key, stage]));
  const location = locationFit(request.geography, business);
  const category = categoryMatches(request, business);

  const stages = [
    stageResult(stageByKey.availability, campaignCapMatches(business) && dateInsideWindow(request, business), "Available during campaign window", "Business is unavailable, over campaign capacity, or outside the needed timing."),
    stageResult(stageByKey.location, location.passed, location.reason, location.blocker, location.points),
    stageResult(stageByKey.cause, overlaps([request.causeArea], business.causeAreas || []), `Supports ${request.causeArea}`, "Cause areas do not overlap."),
    stageResult(stageByKey.businessType, category.passed, category.reason, category.blocker, category.points),
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
  const rawTotal = stages.reduce((sum, stage) => sum + stage.points, 0);
  const unconfirmedLead = normalize(business.status) === "potential_lead" || normalize(business.qualityStatus) === "potential_lead";
  const total = blockers.length ? Math.min(rawTotal, 59) : unconfirmedLead ? potentialLeadScore(request, business, rawTotal) : rawTotal;

  return {
    total,
    rejected: blockers.length > 0,
    blockers,
    stages,
    reasons: stages.filter((stage) => stage.passed && stage.reason).map((stage) => stage.reason),
  };
}
