export const CAUSES = [
  "Food access",
  "Youth development",
  "Arts and culture",
  "Health and wellness",
  "Workforce development",
  "Animal welfare",
  "Housing stability",
  "Environmental justice",
];

export const AUDIENCES = [
  "Families",
  "Young professionals",
  "Corporate teams",
  "Local residents",
  "Students",
  "Donors",
  "Founders",
  "Hospitality community",
];

export function splitSelections(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function overlapScore(left = [], right = [], weight) {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  const matches = left.filter((item) => rightSet.has(item.toLowerCase())).length;
  return Math.min(weight, matches * weight);
}

function budgetFitScore(businessBudget, nonprofitMinimum) {
  const budget = Number(businessBudget) || 0;
  const minimum = Number(nonprofitMinimum) || 0;
  if (!minimum || !budget) return 4;
  if (budget >= minimum * 2) return 18;
  if (budget >= minimum) return 14;
  if (budget >= minimum * 0.7) return 8;
  return 2;
}

function activationFitScore(business, nonprofit) {
  const desired = new Set((business.activationTypes || []).map((item) => item.toLowerCase()));
  const available = new Set((nonprofit.activationNeeds || []).map((item) => item.toLowerCase()));
  if (!desired.size || !available.size) return 6;
  let score = 0;
  desired.forEach((item) => {
    if (available.has(item)) score += 10;
  });
  return Math.min(score, 24);
}

export function scoreMatch(business, nonprofit) {
  const causeScore = overlapScore(business.causes, nonprofit.causes, 14);
  const audienceScore = overlapScore(business.audiences, nonprofit.audiences, 10);
  const budgetScore = budgetFitScore(business.monthlyBudget, nonprofit.minimumContribution);
  const activationScore = activationFitScore(business, nonprofit);
  const geographyScore = business.market && nonprofit.market && business.market === nonprofit.market ? 12 : 4;
  const total = Math.min(100, causeScore + audienceScore + budgetScore + activationScore + geographyScore);

  return {
    total,
    reasons: [
      causeScore ? "Cause alignment" : "",
      audienceScore ? "Audience overlap" : "",
      budgetScore >= 14 ? "Budget fit" : "",
      activationScore >= 10 ? "Activation fit" : "",
      geographyScore === 12 ? "Same market" : "",
    ].filter(Boolean),
  };
}

export function buildMatches(businesses, nonprofits) {
  return businesses
    .flatMap((business) =>
      nonprofits.map((nonprofit) => {
        const score = scoreMatch(business, nonprofit);
        return { id: `${business.id}-${nonprofit.id}`, business, nonprofit, ...score };
      })
    )
    .sort((a, b) => b.total - a.total);
}
