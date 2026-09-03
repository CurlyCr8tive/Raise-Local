const STORAGE_KEY = "raise_local_platform_v2";

export const DEMO_DATA = {
  campaignRequests: [
    {
      id: "request-fresh-start",
      organizationName: "Fresh Start Pantry",
      organizationType: "Nonprofit",
      contactName: "Maya Thompson",
      email: "maya@example.org",
      phone: "555-0198",
      campaignDescription: "Stock weekend meal bags for families during the fall school term.",
      fundingGoal: 5000,
      minimumSize: 80,
      idealSize: 120,
      startDate: "2026-09-15",
      endDate: "2026-10-15",
      causeArea: "Food access",
      businessPreference: "Food and beverage",
      eventType: "Food-based fundraiser",
      supportNeeds: ["Food", "Products"],
      geography: "Brooklyn",
      mustHaves: "Brooklyn service area, food-based support, capacity for at least 80 orders.",
      niceToHaves: "Pickup option and a recognizable local brand.",
      priorFundraiser: "Yes - local restaurant night",
      status: "new",
    },
    {
      id: "request-art-room",
      organizationName: "PS 118 Art Room",
      organizationType: "School",
      contactName: "Jordan Lee",
      email: "jordan@example.edu",
      phone: "555-0142",
      campaignDescription: "Raise money for after-school art supplies and student showcase materials.",
      fundingGoal: 3500,
      minimumSize: 50,
      idealSize: 90,
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      causeArea: "Arts",
      businessPreference: "Retail",
      eventType: "Product fundraiser",
      supportNeeds: ["Products", "Sponsorship"],
      geography: "Queens",
      mustHaves: "Queens service area and product or sponsorship support.",
      niceToHaves: "School-friendly business and flexible campaign dates.",
      priorFundraiser: "No",
      status: "new",
    },
  ],
  businesses: [
    {
      id: "biz-yamaas",
      name: "YAMAAS! Olive Oil",
      category: "Food and beverage",
      serviceAreas: ["Brooklyn", "Queens", "New York"],
      causeAreas: ["Food access", "Community", "Health"],
      contributionTypes: ["Product donation", "Percent of sales", "Event hosting"],
      offerTypes: ["Food", "Products", "Venue space"],
      minimumCapacity: 50,
      maximumCapacity: 250,
      idealEventSize: 125,
      campaignCap: 3,
      activeCampaigns: 1,
      estimatedUnitContribution: 20,
      availableFrom: "2026-09-01",
      availableTo: "2026-12-15",
      fulfillmentOptions: ["Pickup", "In person"],
      notes: "Founding business. Strong fit for food, wellness, and community campaigns.",
      rating: 4.8,
      reviewNote: "Reliable partner for community food campaigns.",
      unavailable: false,
      status: "ready",
    },
    {
      id: "biz-sofia-grace",
      name: "Sofia & Grace",
      category: "Food and beverage",
      serviceAreas: ["Brooklyn", "Manhattan"],
      causeAreas: ["Youth", "Food access", "Education"],
      contributionTypes: ["Product donation", "Percent of sales"],
      offerTypes: ["Food", "Products"],
      minimumCapacity: 30,
      maximumCapacity: 180,
      idealEventSize: 100,
      campaignCap: 2,
      activeCampaigns: 0,
      estimatedUnitContribution: 12,
      availableFrom: "2026-09-10",
      availableTo: "2026-11-30",
      fulfillmentOptions: ["Pickup", "Delivery"],
      notes: "Founding business. Cookie shop interview validated appetite for local cause partnerships.",
      rating: 4.6,
      reviewNote: "Warm brand fit for school and youth campaigns.",
      unavailable: false,
      status: "ready",
    },
    {
      id: "biz-paper-porch",
      name: "Paper Porch Goods",
      category: "Retail",
      serviceAreas: ["Queens", "Brooklyn"],
      causeAreas: ["Arts", "Education", "Community"],
      contributionTypes: ["Percent of sales", "Sponsorship dollars"],
      offerTypes: ["Products", "Sponsorship"],
      minimumCapacity: 40,
      maximumCapacity: 120,
      idealEventSize: 80,
      campaignCap: 1,
      activeCampaigns: 0,
      estimatedUnitContribution: 15,
      availableFrom: "2026-09-20",
      availableTo: "2026-12-31",
      fulfillmentOptions: ["Pickup", "In person"],
      notes: "Good fit for school, arts, and neighborhood campaigns.",
      rating: 4.2,
      reviewNote: "Strong for small product fundraisers and school campaigns.",
      unavailable: false,
      status: "ready",
    },
  ],
  matches: [],
};

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(DEMO_DATA);
  try {
    const parsed = JSON.parse(raw);
    return {
      campaignRequests: Array.isArray(parsed.campaignRequests) ? parsed.campaignRequests : [],
      businesses: Array.isArray(parsed.businesses) ? parsed.businesses : [],
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    };
  } catch {
    return structuredClone(DEMO_DATA);
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetDemoData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_DATA));
  return loadData();
}
