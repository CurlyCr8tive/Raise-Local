const STORAGE_KEY = "grow_local_platform_v1";

export const DEMO_DATA = {
  businesses: [
    {
      id: "biz-sophia-grace",
      name: "Sophia & Grace Cookie Shop",
      market: "New York",
      contact: "Founder",
      monthlyBudget: 750,
      causes: ["Food access", "Youth development"],
      audiences: ["Families", "Local residents", "Corporate teams"],
      activationTypes: ["Round-up campaign", "In-store event", "Corporate gifting"],
      goals: "Build community visibility while testing simple fundraising partnerships.",
      status: "ready",
    },
    {
      id: "biz-table-true",
      name: "Table True Catering",
      market: "New York",
      contact: "Partnerships Lead",
      monthlyBudget: 1600,
      causes: ["Workforce development", "Food access"],
      audiences: ["Corporate teams", "Hospitality community", "Founders"],
      activationTypes: ["Sponsored event", "Volunteer day", "Corporate gifting"],
      goals: "Reach mission-aligned corporate buyers through a nonprofit event partnership.",
      status: "new",
    },
  ],
  nonprofits: [
    {
      id: "np-fresh-start",
      name: "Fresh Start Pantry",
      market: "New York",
      contact: "Development Director",
      minimumContribution: 500,
      causes: ["Food access", "Housing stability"],
      audiences: ["Families", "Local residents", "Donors"],
      activationNeeds: ["Round-up campaign", "In-store event", "Sponsored event"],
      goals: "Find neighborhood businesses for recurring micro-campaigns and pantry awareness.",
      status: "ready",
    },
    {
      id: "np-next-table",
      name: "Next Table Youth Kitchen",
      market: "New York",
      contact: "Program Manager",
      minimumContribution: 1000,
      causes: ["Youth development", "Workforce development", "Food access"],
      audiences: ["Students", "Corporate teams", "Hospitality community"],
      activationNeeds: ["Sponsored event", "Volunteer day", "Corporate gifting"],
      goals: "Build a partner roster for culinary training programs and student showcases.",
      status: "active",
    },
  ],
};

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(DEMO_DATA);
  try {
    const parsed = JSON.parse(raw);
    return {
      businesses: Array.isArray(parsed.businesses) ? parsed.businesses : [],
      nonprofits: Array.isArray(parsed.nonprofits) ? parsed.nonprofits : [],
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
