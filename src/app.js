import {
  AVAILABILITY_OPTIONS,
  BUSINESS_CATEGORIES,
  BUSINESS_GOALS,
  BUSINESS_TYPES,
  CAUSE_AREAS,
  CONTRIBUTION_TYPES,
  DECLINE_REASONS,
  EVENT_TYPES,
  FULFILLMENT_OPTIONS,
  FULFILLMENT_SCOPE,
  MATCH_STATUSES,
  ORGANIZATION_TYPES,
  PARTNERSHIP_TYPES,
  SUPPORT_NEEDS,
  TIMING_OPTIONS,
  buildMatches,
  deriveMatchStatus,
  scoreMatch,
  splitSelections,
} from "./matching.js?v=3607856";
import { loadData, resetDemoData, saveData } from "./storage.js";
import {
  syncBusinessProfile,
  syncBusinessQuality,
  syncBusinessRating,
  syncCampaignRequest,
  syncMatchDecision,
  syncMatchFeedback,
  loadRemoteData,
  updateBusinessProfile,
  updateCampaignRequest,
} from "./remote-sync.js";
import { supabase } from "./supabase-client.js";
import { HERO_PHOTO, businessPhoto, isBrandAsset, requestPhoto } from "./photos.js";
import { ICONS } from "./icons.js";
import { escapeHtml, formatDateTime, statusLabel } from "./format.js";
import { emptyState, wireEmptyStates } from "./ui.js";

let data = loadData();
let activeView = "dashboard";
let dashboardTab = "matches"; // "matches" | "own" | "counterpart"
let dashboardSort = "best"; // "best" | "name"
let dashboardBorough = "all";
let dashboardCause = "all";
let dashboardStatus = "all";
let dashboardSearch = "";
let selectedMatchKey = "";
let selectedEntityKey = "";
let adminComposer = ""; // "request" | "business" while an admin is adding a record
let campaignSort = "newest"; // "newest" | "oldest" | "upcoming" | "completed"
let matchCauseFilter = "all";
let matchLoaderShown = false;
const QUALITY_REVIEW_THRESHOLD = 2.5;

let quizAudience = null; // "request" | "business"
let quizPhase = "choose"; // "choose" | "core" | "profile"
let quizStep = 0;
let quizAnswers = {};
let quizConfirmation = "";
let quizConfirmationAction = null;
let quizActiveRecordId = null;
let quizResultsPreview = null;
let inAppProfileCreate = false;

// Pre-auth flow: landing -> quiz-choose -> quiz -> register -> verify-sent
// -> (user clicks emailed link) -> set-password -> authenticated app.
let session = null;
let demoMode = false;
let demoRole = "admin";
let authLoading = true;
let authScreen = "landing";
let authError = "";
let pendingEmail = "";
let remoteLoadKey = "";
let remoteLoading = false;

const root = document.getElementById("view-root");
const title = document.getElementById("page-title");
const sidebarEl = document.getElementById("app-sidebar");
const topbarEl = document.getElementById("app-topbar");
const navButtons = [...document.querySelectorAll("[data-view]")];

document.getElementById("seed-btn").addEventListener("click", () => {
  data = resetDemoData();
  render();
});

document.getElementById("account-profile-btn").addEventListener("click", () => {
  activeView = "settings";
  document.getElementById("topbar-account-menu").hidden = true;
  render();
});

document.getElementById("logout-btn").addEventListener("click", () => {
  leaveSession();
});

document.getElementById("topbar-logout-btn").addEventListener("click", () => {
  leaveSession();
});

function leaveSession() {
  if (demoMode) {
    sessionStorage.removeItem("raise_local_demo_mode");
    demoMode = false;
    demoRole = "admin";
    session = null;
    authScreen = "landing";
    activeView = "dashboard";
    render();
    return;
  }
  supabase.auth.signOut();
}

document.getElementById("topbar-account-btn").addEventListener("click", () => {
  const menu = document.getElementById("topbar-account-menu");
  menu.hidden = !menu.hidden;
});

document.querySelectorAll("[data-demo-role]").forEach((button) => {
  button.addEventListener("click", () => switchDemoRole(button.dataset.demoRole));
});

document.getElementById("notif-btn").addEventListener("click", () => {
  const menu = document.getElementById("notif-menu");
  menu.hidden = !menu.hidden;
  if (!menu.hidden) {
    myNotifications().forEach((n) => (n.read = true));
    saveData(data);
    syncNotifications();
  }
});

document.addEventListener("click", (event) => {
  document.querySelectorAll(".topbar-account").forEach((wrap) => {
    const menu = wrap.querySelector(".topbar-account-menu");
    if (menu && !menu.hidden && !wrap.contains(event.target)) menu.hidden = true;
  });
});

document.querySelectorAll("[data-icon]").forEach((el) => {
  el.innerHTML = ICONS[el.dataset.icon] || "";
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedEntityKey = "";
    selectedMatchKey = "";
    adminComposer = "";
    activeView = button.dataset.view;
    render();
  });
});

document.getElementById("global-search")?.addEventListener("change", (event) => {
  const query = event.target.value.trim().toLowerCase();
  if (!query) {
    activeView = "dashboard";
    render();
    return;
  }
  const match = currentMatches().find((item) => `${item.request.organizationName} ${item.business.name} ${item.request.causeArea} ${item.request.geography}`.toLowerCase().includes(query));
  if (match) {
    selectedMatchKey = `${match.request.id}::${match.business.id}`;
    activeView = "matches";
  } else {
    activeView = isAdmin() || myRole() === "business" ? "requests" : "businesses";
  }
  render();
});

function passwordAlreadySet() {
  return Boolean(session?.user?.user_metadata?.password_set);
}

// No invite flow yet — an account becomes admin only by someone with
// Supabase dashboard access setting user_metadata.role to "admin" for that
// user directly (Authentication -> Users -> edit raw user metadata).
// Everyone else defaults to the role captured at quiz signup.
function isAdmin() {
  return demoMode ? demoRole === "admin" : session?.user?.user_metadata?.role === "admin";
}

function myRole() {
  if (demoMode) return demoRole === "business" ? "business" : "nonprofit";
  return session?.user?.user_metadata?.role === "business" ? "business" : "nonprofit";
}

function myEmail() {
  return (session?.user?.email || "").trim().toLowerCase();
}

const REQUEST_CLIENT_FIELDS = new Set([
  "website", "socialLinks", "classification", "communitiesServed", "mission", "audienceServed", "audienceSize",
  "eventType", "campaignType", "startDate", "endDate", "partnershipDeadline", "expectedParticipation", "minimumSize", "idealSize",
  "mustHaves", "niceToHaves", "priorFundraiser",
]);

const BUSINESS_CLIENT_FIELDS = new Set([
  "businessType", "website", "socialLinks", "fulfillmentScope", "contributionTypes", "productsServices", "averagePriceRange",
  "minimumCapacity", "maximumCapacity", "idealEventSize", "campaignCap", "activeCampaigns", "availableFrom", "availableTo",
  "leadTimeDays", "fulfillmentOptions", "orgTypesSupported", "pricingPoint", "notes",
]);

function recordActor() {
  return { type: isAdmin() ? "admin" : "client", email: myEmail() || (demoMode ? `${demoRole}@demo` : "unknown") };
}

function ensureRecordMeta(record, source = "system") {
  record.fieldSources ||= {};
  record.pendingChanges ||= [];
  record.revision ||= 1;
  record.lastEditedAt ||= record.updatedAt || record.createdAt || new Date().toISOString();
  record.lastEditedBy ||= source;
  return record;
}

function initializeRecordMeta(record, source) {
  ensureRecordMeta(record, source);
  const fields = source === "client" ? (record.organizationName ? REQUEST_CLIENT_FIELDS : BUSINESS_CLIENT_FIELDS) : new Set();
  fields.forEach((field) => {
    if (record[field] !== undefined && record[field] !== "" && record[field] !== null) record.fieldSources[field] = source;
  });
  record.lastEditedAt = new Date().toISOString();
  record.lastEditedBy = source;
  return record;
}

function sameRecordValue(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function humanizeField(field) {
  return String(field || "field").replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function hasRecordValue(value) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && String(value).trim() !== "" && value !== 0;
}

function applyProfilePatch(record, patch, kind) {
  ensureRecordMeta(record);
  const actor = recordActor();
  const clientFields = kind === "business" ? BUSINESS_CLIENT_FIELDS : REQUEST_CLIENT_FIELDS;
  const conflicts = [];

  Object.entries(patch).forEach(([field, nextValue]) => {
    if (nextValue === undefined) return;
    const previousValue = record[field];
    const previousSource = record.fieldSources[field];
    const adminProtectsClientValue = actor.type === "admin" && clientFields.has(field) && previousSource === "client" && hasRecordValue(previousValue) && !sameRecordValue(previousValue, nextValue);
    if (adminProtectsClientValue) {
      conflicts.push({ field, proposedValue: nextValue, currentValue: previousValue, proposedBy: actor.email, proposedAt: new Date().toISOString() });
      return;
    }
    record[field] = nextValue;
    record.fieldSources[field] = actor.type;
  });

  const now = new Date().toISOString();
  record.pendingChanges = [...(record.pendingChanges || []), ...conflicts].slice(-25);
  record.revision = Number(record.revision || 0) + 1;
  record.lastEditedAt = now;
  record.lastEditedBy = actor.email;
  record.updatedAt = now;
  return conflicts;
}

// A record is "mine" when its contact email matches the logged-in email —
// there's no user_id column linking a quiz submission to the account
// created afterward, so email is the only correlation available.
function myOwnRequests() {
  const email = myEmail();
  return data.campaignRequests.filter((r) => (r.email || "").trim().toLowerCase() === email);
}

function myOwnBusinesses() {
  const email = myEmail();
  return data.businesses.filter((b) => (b.email || "").trim().toLowerCase() === email);
}

function isOwnRecord(record) {
  return (record?.email || "").trim().toLowerCase() === myEmail();
}

// The counterpart profiles (businesses for a nonprofit, nonprofits for a
// business) that the logged-in account's own record(s) actually matched.
function myMatches() {
  if (myRole() === "business") {
    return myOwnBusinesses().flatMap((business) => buildMatches(data.campaignRequests, [business], data.matches));
  }
  return myOwnRequests().flatMap((request) => buildMatches([request], data.businesses, data.matches));
}

function determinePostSessionScreen() {
  if (!session) return;
  if (passwordAlreadySet()) {
    // Supabase re-fires onAuthStateChange on token refresh and tab refocus,
    // not just on first sign-in. Only jump to the dashboard when the app
    // wasn't already showing — otherwise a background token refresh silently
    // knocks the user off whatever page they were on.
    const alreadyInApp = authScreen === "app";
    authScreen = "app";
    if (!alreadyInApp) activeView = "dashboard";
  } else {
    authScreen = "set-password";
  }
}

supabase.auth.onAuthStateChange((event, newSession) => {
  session = newSession;
  if (event === "SIGNED_OUT") {
    sessionStorage.removeItem("raise_local_demo_mode");
    demoMode = false;
    demoRole = "admin";
    authScreen = "landing";
    quizAudience = null;
    quizPhase = "choose";
    remoteLoadKey = "";
  } else if (session) {
    determinePostSessionScreen();
  }
  authLoading = false;
  render();
});

function mergeById(localRecords, remoteRecords) {
  const merged = new Map(localRecords.map((record) => [record.id, record]));
  remoteRecords.forEach((record) => merged.set(record.id, { ...merged.get(record.id), ...record }));
  return [...merged.values()];
}

function mergeMatches(localMatches, remoteMatches) {
  const merged = new Map(localMatches.map((match) => [`${match.requestId}:${match.businessId}`, match]));
  remoteMatches.forEach((match) => {
    const key = `${match.requestId}:${match.businessId}`;
    merged.set(key, { ...merged.get(key), ...match });
  });
  return [...merged.values()];
}

async function hydrateRemoteData() {
  if (demoMode || !session || !passwordAlreadySet() || remoteLoading) return;
  const key = `${session.user.id}:${isAdmin() ? "admin" : myRole()}`;
  if (remoteLoadKey === key) return;
  remoteLoading = true;
  const remote = await loadRemoteData({ admin: isAdmin(), email: myEmail() });
  remoteLoading = false;
  if (!remote) return;
  data = {
    ...data,
    campaignRequests: mergeById(data.campaignRequests, remote.campaignRequests),
    businesses: mergeById(data.businesses, remote.businesses),
    matches: mergeMatches(data.matches, remote.matches),
  };
  saveData(data);
  remoteLoadKey = key;
  render();
}

function setTitle(text) {
  title.textContent = text;
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === activeView));
}

function confirmationMarkup() {
  if (!quizConfirmation) return "";
  const action = quizConfirmationAction;
  quizConfirmationAction = null;
  return `<section class="success-banner" role="status"><span>${escapeHtml(quizConfirmation)}</span>${action ? `<button type="button" class="secondary-btn" data-confirmation-detail data-entity-type="${escapeHtml(action.type)}" data-entity-id="${escapeHtml(action.id)}">View details ${ICONS.arrowRight}</button>` : ""}</section>`;
}

function currentMatches() {
  return buildMatches(data.campaignRequests, data.businesses, data.matches);
}

const NONPROFIT_CORE_QUESTIONS = [
  { key: "organizationName", label: "What's your organization called?", type: "text", placeholder: "PS 118 PTA" },
  { key: "organizationType", label: "What type of organization are you?", type: "single", options: ORGANIZATION_TYPES },
  { key: "causeArea", label: "What cause are you raising funds for?", type: "single", options: CAUSE_AREAS },
  { key: "campaignDescription", label: "In one line, what's the campaign for?", type: "text", placeholder: "New playground equipment, weekend meal bags, art supplies..." },
  { key: "campaignType", label: "What kind of campaign or fundraiser are you planning?", type: "single", options: EVENT_TYPES },
  { key: "preferredCategories", label: "What kind of business would be the best partner?", type: "multi", options: BUSINESS_CATEGORIES },
  { key: "supportNeeds", label: "What kind of support do you need from them?", type: "multi", options: SUPPORT_NEEDS },
  { key: "partnershipTypesNeeded", label: "What kind of partnership are you hoping for?", type: "multi", options: PARTNERSHIP_TYPES },
  { key: "geography", label: "Where are you located?", type: "text", placeholder: "Brooklyn, Washington DC, Maryland, zip code..." },
  { key: "fundingGoal", label: "What's your fundraising goal?", type: "number", placeholder: "5000" },
  { key: "timingPreference", label: "When do you need this to happen?", type: "single", options: TIMING_OPTIONS },
];

const NONPROFIT_CONTACT_QUESTION = { key: "contact", label: "Almost done — how can we reach you?", type: "contact" };

const NONPROFIT_PROFILE_QUESTIONS = [
  { key: "website", label: "What's your website?", type: "url", placeholder: "https://example.org" },
  { key: "socialLinks", label: "Add any social links we should keep on file.", type: "textarea", placeholder: "Instagram, LinkedIn, Facebook, etc." },
  { key: "classification", label: "How should we classify your organization?", type: "single", options: ["501(c)(3)", "School / PTA", "Community group", "Faith-based organization", "Other"] },
  { key: "communitiesServed", label: "Which local communities do you serve?", type: "text", placeholder: "Brooklyn families, Queens students, Crown Heights, etc." },
  { key: "mission", label: "What is your mission or primary community focus?", type: "textarea", placeholder: "A short mission statement or focus area." },
  { key: "audienceServed", label: "Who is the audience or population served?", type: "text", placeholder: "Students, parents, donors, neighborhood families, etc." },
  { key: "audienceSize", label: "About how large is your supporter, parent, donor, or email audience?", type: "number", placeholder: "500" },
  { key: "eventType", label: "What kind of campaign is this?", type: "single", options: EVENT_TYPES },
  { key: "startDate", label: "When should the campaign start?", type: "date" },
  { key: "endDate", label: "When should the campaign end?", type: "date" },
  { key: "partnershipDeadline", label: "When do you need a partner confirmed by?", type: "date" },
  { key: "expectedParticipation", label: "How many supporters do you expect to participate?", type: "number", placeholder: "100" },
  { key: "minimumSize", label: "What's the minimum size you need covered?", type: "number", placeholder: "50" },
  { key: "idealSize", label: "What's the ideal size?", type: "number", placeholder: "100" },
  { key: "mustHaves", label: "What are your must-haves?", type: "textarea", placeholder: "What would make a match impossible if missing?" },
  { key: "niceToHaves", label: "What would be nice to have?", type: "textarea", placeholder: "What would make the match even better?" },
  { key: "priorFundraiser", label: "Have you run a fundraiser like this before?", type: "single", options: ["No", "Yes - with a local partner", "Yes - with an online platform", "Not sure"] },
];

const BUSINESS_CORE_QUESTIONS = [
  { key: "name", label: "What's your business called?", type: "text", placeholder: "Yamaas Olive Oil & Vinegar" },
  { key: "category", label: "What type of business are you?", type: "single", options: BUSINESS_CATEGORIES.filter((item) => item !== "No preference") },
  { key: "causeAreas", label: "What causes do you want to support?", type: "multi", options: CAUSE_AREAS },
  { key: "offerTypes", label: "What can you offer campaigns?", type: "multi", options: SUPPORT_NEEDS },
  { key: "pricingPoint", label: "What is the typical price point for the product or service?", type: "text", placeholder: "$15-$40" },
  { key: "partnershipTypes", label: "Which kinds of partnerships are you open to?", type: "multi", options: PARTNERSHIP_TYPES },
  { key: "serviceAreas", label: "Where can you serve campaigns?", type: "text", placeholder: "Brooklyn, Washington DC, Maryland" },
  { key: "minimumOrderRequirement", label: "What's the smallest campaign size worth your time?", type: "number", placeholder: "250" },
  { key: "availabilityPreference", label: "When can you start supporting campaigns?", type: "single", options: AVAILABILITY_OPTIONS },
  { key: "businessGoals", label: "What do you want to get out of partnering?", type: "multi", options: BUSINESS_GOALS },
  { key: "estimatedUnitContribution", label: "About how much does each sale or order raise for the cause?", type: "number", placeholder: "15" },
];

const BUSINESS_CONTACT_QUESTION = { key: "contact", label: "Almost done — how can we reach you?", type: "contact" };

const BUSINESS_PROFILE_QUESTIONS = [
  { key: "businessType", label: "What type of business are you?", type: "single", options: BUSINESS_TYPES },
  { key: "website", label: "What's your website?", type: "url", placeholder: "https://example.com" },
  { key: "socialLinks", label: "Add any social links we should keep on file.", type: "textarea", placeholder: "Instagram, TikTok, LinkedIn, press links, etc." },
  { key: "fulfillmentScope", label: "How far can you fulfill campaigns?", type: "single", options: FULFILLMENT_SCOPE },
  { key: "contributionTypes", label: "How are you open to contributing?", type: "multi", options: CONTRIBUTION_TYPES },
  { key: "productsServices", label: "What products or services can you offer through partnerships?", type: "textarea", placeholder: "Cookie boxes, catering, venue space, gift cards, workshops, etc." },
  { key: "averagePriceRange", label: "What is the average product or service price range?", type: "text", placeholder: "$15-$40" },
  { key: "minimumCapacity", label: "What's the smallest order or event size that makes sense?", type: "number", placeholder: "30" },
  { key: "maximumCapacity", label: "What's the largest order or event size you can handle?", type: "number", placeholder: "200" },
  { key: "idealEventSize", label: "What's your ideal event size?", type: "number", placeholder: "100" },
  { key: "campaignCap", label: "How many campaigns can you support at one time?", type: "number", placeholder: "2" },
  { key: "activeCampaigns", label: "How many campaigns are you already supporting?", type: "number", placeholder: "0" },
  { key: "availableFrom", label: "When are you available from?", type: "date" },
  { key: "availableTo", label: "When are you available until?", type: "date" },
  { key: "leadTimeDays", label: "How much lead time do you need before participating?", type: "number", placeholder: "14" },
  { key: "fulfillmentOptions", label: "How can people receive or experience what you offer?", type: "multi", options: FULFILLMENT_OPTIONS },
  { key: "orgTypesSupported", label: "What types of organizations do you want to work with?", type: "multi", options: ORGANIZATION_TYPES },
  { key: "notes", label: "Anything else Raise Local should know?", type: "textarea", placeholder: "Limits, ideal partners, venue details, accessibility, minimums, or timing notes." },
];

const PRICING_RELEVANT_OPTIONS = new Set([
  "Product donation",
  "Percent of sales",
  "Sponsorship dollars",
  "Products or corporate gifting",
  "Food & beverage",
  "Percentage of sales campaign",
]);

const UNIT_CONTRIBUTION_OPTIONS = new Set([
  "Product donation",
  "Percent of sales",
  "Products or corporate gifting",
  "Food & beverage",
  "Percentage of sales campaign",
]);

function selectedBusinessSupportOptions() {
  return [
    ...(Array.isArray(quizAnswers.contributionTypes) ? quizAnswers.contributionTypes : []),
    ...(Array.isArray(quizAnswers.offerTypes) ? quizAnswers.offerTypes : []),
  ];
}

function businessNeedsPricingDetails() {
  return selectedBusinessSupportOptions().some((option) => PRICING_RELEVANT_OPTIONS.has(option));
}

function businessNeedsUnitContribution() {
  return selectedBusinessSupportOptions().some((option) => UNIT_CONTRIBUTION_OPTIONS.has(option));
}

function activeQuestionList() {
  if (quizPhase === "profile") {
    if (quizAudience !== "business") return NONPROFIT_PROFILE_QUESTIONS;
    return BUSINESS_PROFILE_QUESTIONS.filter((question) => question.key !== "averagePriceRange" || businessNeedsPricingDetails());
  }
  const core = quizAudience === "business"
    ? BUSINESS_CORE_QUESTIONS.filter((question) => {
        if (question.key === "pricingPoint") return businessNeedsPricingDetails();
        if (question.key === "estimatedUnitContribution") return businessNeedsUnitContribution();
        return true;
      })
    : NONPROFIT_CORE_QUESTIONS;
  const contact = quizAudience === "business" ? BUSINESS_CONTACT_QUESTION : NONPROFIT_CONTACT_QUESTION;
  return [...core, contact];
}

function render() {
  const showApp = authScreen === "app";
  sidebarEl.style.display = showApp ? "" : "none";
  topbarEl.style.display = showApp ? "" : "none";
  document.body.classList.toggle("no-sidebar", !showApp);

  if (authLoading) {
    root.innerHTML = `<section class="panel"><p class="muted">Loading…</p></section>`;
    return;
  }

  if (!showApp) {
    renderPreAuth();
    return;
  }

  syncNavForRole();
  syncAccountIdentity();
  syncNotifications();
  void hydrateRemoteData();
  if (activeView === "brief" && !isAdmin()) activeView = "dashboard";

  const views = {
    dashboard: renderDashboard,
    requests: renderRequests,
    businesses: renderBusinesses,
    matches: renderMatches,
    "entity-detail": renderEntityDetail,
    messages: renderMessages,
    projects: renderProjects,
    reports: renderReports,
    brief: renderBrief,
    settings: renderSettings,
    "complete-profile": renderCompleteProfile,
  };
  (views[activeView] || renderDashboard)();
}

function navLabel(view) {
  return navButtons.find((button) => button.dataset.view === view)?.querySelector(".nav-label");
}

function navBadge(view) {
  return document.querySelector(`[data-nav-badge="${view}"]`);
}

function setBadge(el, count) {
  if (!el) return;
  el.textContent = count > 0 ? String(count) : "";
  el.hidden = !count;
}

function syncNavForRole() {
  const isBusinessViewer = !isAdmin() && myRole() === "business";

  const requestsLabel = navLabel("requests");
  if (requestsLabel) requestsLabel.textContent = isBusinessViewer ? "Business Profile" : "Campaign Requests";

  const businessesLabel = navLabel("businesses");
  if (businessesLabel) businessesLabel.textContent = isBusinessViewer ? "Campaign Requests" : "Business Profiles";

  const briefButton = navButtons.find((button) => button.dataset.view === "brief");
  if (briefButton) briefButton.style.display = isAdmin() ? "" : "none";

  if (isAdmin()) {
    setBadge(navBadge("requests"), data.campaignRequests.length);
    setBadge(navBadge("businesses"), data.businesses.length);
    setBadge(navBadge("matches"), currentMatches().length);
  } else {
    const own = isBusinessViewer ? myOwnBusinesses() : myOwnRequests();
    const poolCount = isBusinessViewer ? data.campaignRequests.length : data.businesses.length;
    setBadge(navBadge("requests"), own.length);
    setBadge(navBadge("businesses"), poolCount);
    setBadge(navBadge("matches"), myMatches().length);
  }
  setBadge(navBadge("messages"), 0);
}

function syncNotifications() {
  const notifs = myNotifications();
  const unread = notifs.filter((n) => !n.read).length;
  setBadge(document.getElementById("notif-badge"), unread);

  const menu = document.getElementById("notif-menu");
  menu.innerHTML = notifs.length
    ? notifs
        .slice(0, 8)
        .map(
          (n) => `
      <button type="button" class="notif-row ${n.read ? "" : "unread"}" data-notif-id="${escapeHtml(n.id)}">
        <span>${n.message}</span>
        <span class="muted small-note">${formatDateTime(n.createdAt)}</span>
      </button>`
        )
        .join("")
    : `<p class="muted notif-empty">No notifications yet.</p>`;

  menu.querySelectorAll("[data-notif-id]").forEach((button) => {
    button.addEventListener("click", () => {
      menu.hidden = true;
      activeView = "matches";
      render();
    });
  });
}

function syncAccountIdentity() {
  const email = session?.user?.email || "";
  const initial = email ? email[0].toUpperCase() : "?";
  const role = isAdmin() ? "Admin" : myRole() === "business" ? "Small Business" : "Nonprofit / School";

  document.getElementById("account-avatar").textContent = initial;
  document.getElementById("account-email").textContent = email || "—";
  document.getElementById("account-role").textContent = email ? role : "";

  document.getElementById("topbar-account-avatar").textContent = initial;
  document.getElementById("topbar-account-name").textContent = email ? email.split("@")[0] : "Account";

  const roleSwitcher = document.getElementById("demo-role-switcher");
  const seedButton = document.getElementById("seed-btn");
  if (seedButton) seedButton.hidden = !demoMode;
  if (roleSwitcher) {
    roleSwitcher.hidden = !demoMode;
    roleSwitcher.querySelectorAll("[data-demo-role]").forEach((button) => {
      button.classList.toggle("active", button.dataset.demoRole === demoRole);
    });
  }
}

function renderSettings() {
  setTitle("Account & Profile");
  const isBusinessViewer = !isAdmin() && myRole() === "business";
  const own = isBusinessViewer ? myOwnBusinesses() : myOwnRequests();
  const record = own[0];
  const complete = record ? isProfileComplete(record, isBusinessViewer) : false;
  const roleLabel = isAdmin() ? "Raise Local admin" : isBusinessViewer ? "Local business" : "Nonprofit or school";
  const profileLabel = isBusinessViewer ? "business profile" : "campaign request";

  root.innerHTML = `
    <section class="settings-grid">
      <section class="panel account-panel">
        <p class="eyebrow">Account</p>
        <div class="account-summary">
          <span class="large-account-avatar">${escapeHtml((myEmail()[0] || "?").toUpperCase())}</span>
          <div>
            <h2>${escapeHtml(myEmail() || "Signed-in account")}</h2>
            <p class="muted">${escapeHtml(roleLabel)}</p>
          </div>
        </div>
        <div class="settings-detail-list">
          <div><span>Email</span><strong>${escapeHtml(myEmail() || "Not available")}</strong></div>
          <div><span>Access</span><strong>${escapeHtml(roleLabel)}</strong></div>
          <div><span>Profile status</span><strong>${record ? (complete ? "Complete" : "Needs more detail") : `No ${profileLabel} yet`}</strong></div>
        </div>
        <div class="split-actions">
          ${record && !isAdmin() ? `<button type="button" class="primary-btn" data-settings-edit>${complete ? "Edit my profile" : "Complete my profile"} ${ICONS.arrowRight}</button>` : ""}
          <button type="button" class="secondary-btn" data-settings-logout>Log out</button>
        </div>
      </section>

      <section class="panel">
        <p class="eyebrow">Matching profile</p>
        <h2>What Raise Local uses</h2>
        <p class="muted">Your profile details help Raise Local find partners that fit. They support matching and coordination rather than an open marketplace listing.</p>
        <ul class="settings-list">
          <li><span class="settings-check">${ICONS.check}</span><span>Location and service area</span></li>
          <li><span class="settings-check">${ICONS.check}</span><span>Cause, support, and partnership preferences</span></li>
          <li><span class="settings-check">${ICONS.check}</span><span>Timing, capacity, and campaign requirements</span></li>
          <li><span class="settings-check">${ICONS.check}</span><span>Contact information for approved introductions</span></li>
        </ul>
      </section>

      <section class="panel settings-note-panel">
        <p class="eyebrow">Privacy</p>
        <h2>Control before contact</h2>
        <p class="muted">Raise Local keeps both sides in control. A match does not share direct contact details until the parties confirm interest or an introduction is requested.</p>
        <p class="small-note">You can update your matching details at any time. Raise Local only shares contact information when both sides confirm interest or an introduction is requested.</p>
      </section>
    </section>
  `;

  root.querySelector("[data-settings-edit]")?.addEventListener("click", () => {
    quizAudience = isBusinessViewer ? "business" : "request";
    quizActiveRecordId = record.id;
    quizPhase = "profile";
    quizStep = 0;
    quizAnswers = {};
    activeView = "complete-profile";
    render();
  });
  root.querySelector("[data-settings-logout]")?.addEventListener("click", leaveSession);
}

function renderPreAuth() {
  const screens = {
    landing: renderLanding,
    "quiz-choose": renderQuizChoose,
    quiz: renderQuizStep,
    register: renderRegisterPrompt,
    "verify-sent": renderVerifySent,
    "set-password": renderSetPassword,
    login: renderLogin,
  };
  (screens[authScreen] || renderLanding)();
}

function renderLanding() {
  root.innerHTML = `
    <div class="landing-scene">
      ${communityNetworkSvg()}
      <section class="intro-hero landing-hero">
        <img class="landing-logo" src="assets/raise-local-logo-hires.png" alt="Raise Local" />
        <p class="eyebrow">Raise Funds, Buy Local</p>
        <h2>Welcome to Raise Local.</h2>
        <p class="landing-copy">Raise Local helps nonprofits find local businesses ready to support their campaigns. Answer a few questions to find partners that fit your goals, location, and timing.</p>
        <div class="landing-actions">
          <button class="primary-btn" type="button" id="landing-start">Find a Partner</button>
          <button class="secondary-btn" type="button" id="landing-login">Log in</button>
          <button class="link-btn" type="button" id="landing-demo">Explore Demo Workspace</button>
        </div>
      </section>
    </div>
  `;
  document.getElementById("landing-start").addEventListener("click", () => {
    authScreen = "quiz-choose";
    authError = "";
    render();
  });
  document.getElementById("landing-login").addEventListener("click", () => {
    authScreen = "login";
    authError = "";
    render();
  });
  document.getElementById("landing-demo").addEventListener("click", enterDemoWorkspace);
}

function enterDemoWorkspace() {
  demoMode = true;
  sessionStorage.setItem("raise_local_demo_mode", "true");
  demoRole = "admin";
  session = { user: { email: "demo@raiselocal.local", user_metadata: { role: "admin", password_set: true } } };
  authError = "";
  authScreen = "app";
  activeView = "dashboard";
  render();
}

function switchDemoRole(role) {
  if (!demoMode || !["admin", "nonprofit", "business"].includes(role)) return;
  demoRole = role;
  const demoEmails = {
    admin: "demo@raiselocal.local",
    nonprofit: "demo-nonprofit-2@raiselocal.example",
    business: "hello@sofiaandgrace.example",
  };
  session = { user: { email: demoEmails[role], user_metadata: { role, password_set: true } } };
  sessionStorage.setItem("raise_local_demo_role", role);
  activeView = "dashboard";
  selectedMatchKey = "";
  selectedEntityKey = "";
  adminComposer = "";
  inAppProfileCreate = false;
  matchLoaderShown = false;
  document.getElementById("topbar-account-menu").hidden = true;
  render();
}

function communityNetworkSvg() {
  return `
    <svg class="community-network" viewBox="0 0 1200 760" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g class="network-lines">
        <path d="M90 180 C210 110 270 230 390 170" />
        <path d="M390 170 C490 115 560 215 650 145" />
        <path d="M650 145 C790 75 850 205 1010 130" />
        <path d="M150 520 C275 450 340 560 470 495" />
        <path d="M470 495 C590 420 650 560 760 470" />
        <path d="M760 470 C875 405 980 525 1110 450" />
        <path d="M210 300 C315 255 365 340 470 300" />
        <path d="M730 300 C830 250 890 350 1000 285" />
      </g>
      <g class="network-pulses">
        <circle cx="390" cy="170" r="18" />
        <circle cx="760" cy="470" r="18" />
      </g>
      <g class="network-nodes">
        <circle class="node node-orange" cx="90" cy="180" r="5" />
        <circle class="node" cx="210" cy="135" r="4" />
        <circle class="node" cx="390" cy="170" r="6" />
        <circle class="node" cx="520" cy="135" r="4" />
        <circle class="node node-orange" cx="650" cy="145" r="5" />
        <circle class="node" cx="820" cy="110" r="4" />
        <circle class="node" cx="1010" cy="130" r="6" />
        <circle class="node" cx="150" cy="520" r="5" />
        <circle class="node" cx="300" cy="480" r="4" />
        <circle class="node node-orange" cx="470" cy="495" r="5" />
        <circle class="node" cx="620" cy="510" r="4" />
        <circle class="node" cx="760" cy="470" r="6" />
        <circle class="node" cx="920" cy="490" r="4" />
        <circle class="node node-orange" cx="1110" cy="450" r="5" />
        <circle class="node" cx="210" cy="300" r="4" />
        <circle class="node" cx="470" cy="300" r="5" />
        <circle class="node" cx="730" cy="300" r="4" />
        <circle class="node" cx="1000" cy="285" r="5" />
      </g>
    </svg>
  `;
}

function renderQuizChoose() {
  root.innerHTML = `
    <section class="auth-panel">
      <p class="eyebrow">Find a Partner</p>
      <h2>Which one are you?</h2>
      <section class="quiz-choice-grid" aria-label="Choose your path" style="margin-top:18px;">
        <button type="button" class="choice-card" data-quiz-audience="request">
          <span>For nonprofits &amp; schools</span>
          <strong>I am a nonprofit / school.</strong>
          <small>Tell us what you need so we can surface businesses that fit your campaign.</small>
        </button>
        <button type="button" class="choice-card" data-quiz-audience="business">
          <span>For local businesses</span>
          <strong>I am a small business.</strong>
          <small>Tell us what you offer and where you serve so we can surface causes that fit.</small>
        </button>
      </section>
    </section>
  `;
  root.querySelectorAll("[data-quiz-audience]").forEach((button) => {
    button.addEventListener("click", () => {
      quizAudience = button.dataset.quizAudience;
      quizPhase = "core";
      quizStep = 0;
      quizAnswers = {};
      quizActiveRecordId = null;
      quizResultsPreview = null;
      authScreen = "quiz";
      render();
    });
  });
}

function renderQuizStep() {
  const questions = activeQuestionList();
  const question = questions[quizStep];
  const total = questions.length;
  const progress = Math.round(((quizStep + 1) / total) * 100);
  const heading = quizAudience === "business" ? "Business Match Finder" : "Nonprofit Match Finder";

  root.innerHTML = `
    <section class="auth-panel quiz-panel">
      <p class="eyebrow">${heading}</p>
      ${quizQuestionHtml(question, progress, total)}
    </section>
  `;
  wireGuidedQuiz(questions);
}

function renderRegisterPrompt() {
  const preview = quizResultsPreview || { count: 0, top: null };
  const isBusiness = quizAudience === "business";
  const noun = isBusiness ? "campaign" : "business";
  const nounPlural = isBusiness ? "campaigns" : "businesses";
  const headline =
    preview.count > 0
      ? `We've got matches for you! You're a possible fit for ${preview.count} ${preview.count === 1 ? noun : nounPlural} already in Raise Local.`
      : "We've saved your answers — new matches get added every week.";
  const topName = isBusiness ? preview.top?.request?.organizationName : preview.top?.business?.name;
  const topReason = preview.top?.score?.reasons?.[0];

  root.innerHTML = `
    <section class="auth-panel">
      <p class="eyebrow">Match Signal</p>
      <h2>${escapeHtml(headline)}</h2>
      ${topName ? `<p class="muted">Strongest so far: <strong>${escapeHtml(topName)}</strong>${topReason ? ` — ${escapeHtml(topReason)}` : ""}</p>` : ""}
      <p class="muted">Register to view your matches and keep them updated as Raise Local adds new businesses and campaigns.</p>
      ${authError ? `<p class="form-error">${escapeHtml(authError)}</p>` : ""}
      <form id="register-form">
        <div class="field-row"><label for="register-email">Email</label><input id="register-email" type="email" required value="${escapeHtml(pendingEmail)}" placeholder="you@example.org" /></div>
        <button class="primary-btn" type="submit" style="width:100%;">See My Matches</button>
      </form>
    </section>
  `;
  document.getElementById("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("register-email").value.trim();
    if (!email) return;
    authError = "";
    const submitButton = event.target.querySelector("button[type=submit]");
    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
        data: { role: quizAudience === "business" ? "business" : "nonprofit" },
      },
    });
    if (error) {
      authError = error.message;
      render();
      return;
    }
    pendingEmail = email;
    authScreen = "verify-sent";
    render();
  });
}

function renderVerifySent() {
  root.innerHTML = `
    <section class="auth-panel">
      <p class="eyebrow">Check Your Email</p>
      <h2>We sent a verification link to ${escapeHtml(pendingEmail)}.</h2>
      <p class="muted">Click the link to confirm it's you. You'll set a password next, then land on your dashboard with your matches.</p>
      <button class="secondary-btn" type="button" id="verify-back">Use a different email</button>
    </section>
  `;
  document.getElementById("verify-back").addEventListener("click", () => {
    authScreen = "register";
    render();
  });
}

function renderSetPassword() {
  root.innerHTML = `
    <section class="auth-panel">
      <p class="eyebrow">Almost Done</p>
      <h2>Create a password for your Raise Local login.</h2>
      <p class="muted">You're verified as ${escapeHtml(session?.user?.email || "")}. Set a password so you can log back in directly next time.</p>
      ${authError ? `<p class="form-error">${escapeHtml(authError)}</p>` : ""}
      <form id="set-password-form">
        <div class="field-row"><label for="set-password-input">Password</label><input id="set-password-input" type="password" minlength="6" required placeholder="At least 6 characters" /></div>
        <button class="primary-btn" type="submit" style="width:100%;">Go to My Dashboard</button>
      </form>
    </section>
  `;
  document.getElementById("set-password-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.getElementById("set-password-input").value;
    authError = "";
    const submitButton = event.target.querySelector("button[type=submit]");
    submitButton.disabled = true;
    submitButton.textContent = "Saving…";
    const { data: updated, error } = await supabase.auth.updateUser({
      password,
      data: { password_set: true },
    });
    if (error) {
      authError = error.message;
      render();
      return;
    }
    if (updated.user) session = { ...session, user: updated.user };
    authScreen = "app";
    activeView = "dashboard";
    render();
  });
}

function renderLogin() {
  root.innerHTML = `
    <section class="auth-panel">
      <p class="eyebrow">Welcome Back</p>
      <h2>Log in to your Raise Local workspace.</h2>
      <p class="muted">Your workspace is tailored to your role: nonprofit, local business, or Raise Local administrator.</p>
      ${authError ? `<p class="form-error">${escapeHtml(authError)}</p>` : ""}
      <form id="login-form">
        <div class="field-row"><label for="login-email">Email</label><input id="login-email" type="email" required placeholder="you@example.org" /></div>
        <div class="field-row"><label for="login-password">Password</label><input id="login-password" type="password" required placeholder="Your password" /></div>
        <button class="primary-btn" type="submit" style="width:100%;">Log in</button>
      </form>
      <div class="auth-divider"><span>or</span></div>
      <button class="secondary-btn" type="button" id="demo-login" style="width:100%;">Open Demo Workspace</button>
      <p class="muted" style="margin-top:14px;">New here? <button class="link-btn" type="button" id="login-back">Find your match instead</button></p>
    </section>
  `;
  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    authError = "";
    const submitButton = event.target.querySelector("button[type=submit]");
    submitButton.disabled = true;
    submitButton.textContent = "Logging in…";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      authError = error.message;
      render();
    }
  });
  document.getElementById("login-back").addEventListener("click", () => {
    authScreen = "landing";
    authError = "";
    render();
  });
  document.getElementById("demo-login").addEventListener("click", enterDemoWorkspace);
}

function progressCopy(step, total) {
  const pct = Math.round(((step + 1) / total) * 100);
  if (pct >= 100) return "Last one!";
  if (pct >= 80) return "Getting warmer — almost there";
  if (pct >= 50) return "Nice, keep going";
  if (pct >= 20) return "Off to a good start";
  return "Let's get started";
}

function quizQuestionHtml(question, progress, total) {
  return `
    <form id="guided-quiz-form">
      <div class="progress-rail" aria-label="Quiz progress"><span style="width:${progress}%;"></span></div>
      <p class="small-label">${escapeHtml(progressCopy(quizStep, total))} · Question ${quizStep + 1} of ${total}</p>
      <div class="quiz-question">
        <h3>${escapeHtml(question.label)}</h3>
        ${quizInputHtml(question)}
      </div>
      <div class="quiz-actions">
        <button class="secondary-btn" type="button" id="quiz-back" ${quizStep === 0 ? "disabled" : ""}>Back</button>
        <button class="primary-btn" type="submit">${quizStep === total - 1 ? "Finish" : "Next"}</button>
      </div>
    </form>
  `;
}

function quizInputHtml(question) {
  const saved = quizAnswers[question.key];
  if (question.type === "single") {
    const isOtherChosen = typeof saved === "string" && saved !== "" && !question.options.includes(saved);
    const optionsHtml = question.options
      .map((option) => optionButton(question, option, option === "Other" ? isOtherChosen || saved === "Other" : saved === option, "radio"))
      .join("");
    const otherHtml = question.options.includes("Other")
      ? `<input id="quiz-answer-other" type="text" class="other-input${isOtherChosen ? "" : " is-hidden"}" placeholder="Tell us more" value="${escapeHtml(isOtherChosen ? saved : "")}" />`
      : "";
    return `<div class="option-grid">${optionsHtml}</div>${otherHtml}`;
  }
  if (question.type === "multi") {
    const selected = Array.isArray(saved) ? saved : [];
    const customValues = selected.filter((item) => !question.options.includes(item));
    const otherChecked = selected.includes("Other") || customValues.length > 0;
    const optionsHtml = question.options
      .map((option) => optionButton(question, option, option === "Other" ? otherChecked : selected.includes(option), "checkbox"))
      .join("");
    const otherHtml = question.options.includes("Other")
      ? `<input id="quiz-answer-other" type="text" class="other-input${otherChecked ? "" : " is-hidden"}" placeholder="Tell us more" value="${escapeHtml(customValues.join(", "))}" />`
      : "";
    return `<div class="option-grid">${optionsHtml}</div>${otherHtml}`;
  }
  if (question.type === "contact") {
    const contact = saved || {};
    return `
      <div class="form-grid">
        <div class="field-row"><label for="quiz-contact-name">Contact name</label><input id="quiz-contact-name" type="text" placeholder="Your name" value="${escapeHtml(contact.contactName || "")}" /></div>
        <div class="field-row"><label for="quiz-contact-email">Email</label><input id="quiz-contact-email" type="email" placeholder="you@example.org" value="${escapeHtml(contact.email || "")}" /></div>
        <div class="field-row"><label for="quiz-contact-phone">Phone (optional)</label><input id="quiz-contact-phone" type="tel" placeholder="555-0100" value="${escapeHtml(contact.phone || "")}" /></div>
      </div>
    `;
  }
  const suggestions = quizSuggestions(question);
  const datalistId = `quiz-suggestions-${question.key}`;
  const suggestionMarkup = suggestions.length
    ? `<div class="quiz-suggestions" aria-label="Suggested answers">
        <span class="quiz-suggestions-label">Examples</span>
        ${suggestions.map((suggestion) => `<button type="button" class="quiz-suggestion" data-quiz-suggestion="${escapeHtml(suggestion)}">${escapeHtml(suggestion)}</button>`).join("")}
      </div>`
    : "";
  const listMarkup = ["text", "url", "number", "tel"].includes(question.type)
    ? `<datalist id="${datalistId}">${suggestions.map((suggestion) => `<option value="${escapeHtml(suggestion)}"></option>`).join("")}</datalist>`
    : "";
  if (question.type === "textarea") {
    return `<textarea id="quiz-answer" rows="4" placeholder="${escapeHtml(question.placeholder || "")}">${escapeHtml(saved || "")}</textarea>${suggestionMarkup}`;
  }
  return `<input id="quiz-answer" type="${escapeHtml(question.type)}" list="${datalistId}" placeholder="${escapeHtml(question.placeholder || "")}" value="${escapeHtml(saved || "")}" />${listMarkup}${suggestionMarkup}`;
}

function quizSuggestions(question) {
  const suggestions = {
    organizationName: ["PS 118 PTA", "Fresh Start Pantry", "YES Academy Inc."],
    campaignDescription: ["Raise money for after-school supplies", "Fund weekend meal bags for local families", "Support a community arts program"],
    campaignType: ["Food-based fundraiser", "Product fundraiser", "Community event"],
    geography: ["Brooklyn", "Queens", "Manhattan", "Bronx", "New York City"],
    fundingGoal: ["2500", "5000", "10000"],
    website: ["https://yourorganization.org"],
    communitiesServed: ["Brooklyn families and school communities", "Queens students and parents", "Harlem youth and families"],
    mission: ["We support local families through education, food access, and community programs."],
    audienceServed: ["Students, parents, and neighborhood families", "Youth, families, and community donors"],
    audienceSize: ["100", "500", "1000"],
    expectedParticipation: ["50", "100", "250"],
    minimumSize: ["25", "50", "100"],
    idealSize: ["50", "100", "250"],
    mustHaves: ["Local service area, reliable communication, and capacity for the campaign size."],
    niceToHaves: ["Pickup or delivery, social promotion, and flexible campaign dates."],
    name: ["Yamaas Olive Oil & Vinegar", "Sofia & Grace", "Paper Porch Goods"],
    pricingPoint: ["$15-$40", "$25-$75", "$50-$120"],
    serviceAreas: ["Brooklyn, Queens", "Manhattan", "New York City"],
    minimumOrderRequirement: ["50", "100", "250"],
    estimatedUnitContribution: ["10", "15", "20"],
    socialLinks: ["Instagram: @yourorganization"],
    productsServices: ["Cookie boxes, gift bundles, catering, or event hosting"],
    averagePriceRange: ["$15-$40", "$25-$75"],
    minimumCapacity: ["30", "50", "100"],
    maximumCapacity: ["100", "250", "500"],
    idealEventSize: ["50", "100", "200"],
    campaignCap: ["1", "2", "3"],
    activeCampaigns: ["0", "1", "2"],
    leadTimeDays: ["7", "14", "30"],
    notes: ["We can support local campaigns with advance notice and clear order deadlines."],
  };
  return suggestions[question.key] || [];
}

function optionButton(question, option, checked, inputType) {
  return `
    <label class="quiz-option ${checked ? "selected" : ""}">
      <input type="${inputType}" name="quiz-answer" value="${escapeHtml(option)}" ${checked ? "checked" : ""} />
      <span>${escapeHtml(option)}</span>
    </label>
  `;
}

function wireGuidedQuiz(questions) {
  const form = document.getElementById("guided-quiz-form");
  document.getElementById("quiz-back").addEventListener("click", () => {
    if (quizStep === 0) return;
    quizStep -= 1;
    render();
  });

  const otherField = document.getElementById("quiz-answer-other");
  if (otherField) {
    const syncOtherVisibility = () => {
      const anyOtherChecked = [...document.querySelectorAll('input[name="quiz-answer"]')].some((input) => input.value === "Other" && input.checked);
      otherField.classList.toggle("is-hidden", !anyOtherChecked);
    };
    document.querySelectorAll('input[name="quiz-answer"]').forEach((input) => input.addEventListener("change", syncOtherVisibility));
  }

  root.querySelectorAll("[data-quiz-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = document.getElementById("quiz-answer");
      if (!field) return;
      field.value = button.dataset.quizSuggestion || "";
      field.focus();
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = questions[quizStep];
    const answer = readQuizAnswer(question);
    if (isBlankAnswer(question, answer)) return;
    quizAnswers[question.key] = answer;
    if (quizAudience === "business" && ["offerTypes", "contributionTypes"].includes(question.key)) {
      if (!businessNeedsPricingDetails()) {
        delete quizAnswers.pricingPoint;
        delete quizAnswers.averagePriceRange;
      }
      if (!businessNeedsUnitContribution()) delete quizAnswers.estimatedUnitContribution;
    }
    if (quizStep < questions.length - 1) {
      quizStep += 1;
      render();
      return;
    }
    if (quizPhase === "profile") {
      finishProfileQuiz();
    } else {
      finishCoreQuiz();
    }
  });
}

function readQuizAnswer(question) {
  if (question.type === "single") {
    const value = document.querySelector('input[name="quiz-answer"]:checked')?.value || "";
    if (value === "Other") {
      const other = document.getElementById("quiz-answer-other")?.value.trim();
      return other || "Other";
    }
    return value;
  }
  if (question.type === "multi") {
    const values = [...document.querySelectorAll('input[name="quiz-answer"]:checked')].map((input) => input.value);
    if (!values.includes("Other")) return values;
    const other = document.getElementById("quiz-answer-other")?.value.trim();
    return values.map((item) => (item === "Other" ? other || "Other" : item));
  }
  if (question.type === "contact") {
    return {
      contactName: document.getElementById("quiz-contact-name").value.trim(),
      email: document.getElementById("quiz-contact-email").value.trim(),
      phone: document.getElementById("quiz-contact-phone").value.trim(),
    };
  }
  return document.getElementById("quiz-answer").value.trim();
}

function isBlankAnswer(question, answer) {
  if (question.type === "contact") return !answer.contactName || !answer.email;
  return Array.isArray(answer) ? answer.length === 0 : !String(answer || "").trim();
}

function finishCoreQuiz() {
  let createdRecord;
  if (quizAudience === "business") {
    const business = businessFromQuizAnswers();
    initializeRecordMeta(business, inAppProfileCreate ? recordActor().type : "client");
    createdRecord = business;
    data.businesses = [business, ...data.businesses];
    quizActiveRecordId = business.id;
    quizResultsPreview = computeMatchPreview("business", business);
    syncBusinessProfile(business);
  } else {
    const request = requestFromQuizAnswers();
    initializeRecordMeta(request, inAppProfileCreate ? recordActor().type : "client");
    createdRecord = request;
    data.campaignRequests = [request, ...data.campaignRequests];
    quizActiveRecordId = request.id;
    quizResultsPreview = computeMatchPreview("request", request);
    syncCampaignRequest(request);
  }
  saveData(data);
  notifyAdminOfSuggestedMatches(quizAudience, createdRecord);
  if (inAppProfileCreate) {
    quizConfirmation = quizAudience === "business" ? `${createdRecord.name} was added to the partner network.` : `${createdRecord.organizationName} campaign request was submitted.`;
    quizConfirmationAction = { type: quizAudience === "business" ? "business" : "request", id: createdRecord.id };
    activeView = quizAudience === "business" ? "businesses" : "requests";
    inAppProfileCreate = false;
    authScreen = "app";
    render();
    return;
  }
  pendingEmail = quizAnswers.contact?.email || "";
  authError = "";
  authScreen = "register";
  render();
}

// Reached only post-auth, from the "Complete Profile" link on a Campaign
// Requests / Business Profiles card — not part of the pre-auth quiz funnel.
function finishProfileQuiz() {
  let conflicts = [];
  if (quizAudience === "business") {
    const business = data.businesses.find((item) => item.id === quizActiveRecordId);
    if (business) {
      conflicts = applyProfilePatch(business, businessProfilePatch(), "business");
      updateBusinessProfile(business);
    }
  } else {
    const request = data.campaignRequests.find((item) => item.id === quizActiveRecordId);
    if (request) {
      conflicts = applyProfilePatch(request, requestProfilePatch(), "request");
      updateCampaignRequest(request);
    }
  }
  saveData(data);
  notifyAdminOfSuggestedMatches(quizAudience, quizAudience === "business"
    ? data.businesses.find((item) => item.id === quizActiveRecordId)
    : data.campaignRequests.find((item) => item.id === quizActiveRecordId));
  quizConfirmation = conflicts.length
    ? `Profile saved. ${conflicts.length} client-owned field${conflicts.length === 1 ? "" : "s"} was preserved for review.`
    : "Profile completed — thanks for the extra detail. It helps Raise Local recommend stronger matches.";
  activeView = quizAudience === "business" ? "businesses" : "requests";
  render();
}

function computeMatchPreview(kind, record) {
  if (kind === "business") {
    const scored = data.campaignRequests
      .map((request) => ({ request, score: scoreMatch(request, record) }))
      .filter((entry) => !entry.score.rejected)
      .sort((a, b) => b.score.total - a.score.total);
    return { count: scored.length, top: scored[0] || null };
  }
  const scored = data.businesses
    .map((business) => ({ business, score: scoreMatch(record, business) }))
    .filter((entry) => !entry.score.rejected)
    .sort((a, b) => b.score.total - a.score.total);
  return { count: scored.length, top: scored[0] || null };
}

function renderCompleteProfile() {
  setTitle(quizAudience === "business" ? "Complete Business Profile" : "Complete Campaign Profile");
  const questions = activeQuestionList();
  const question = questions[quizStep];
  const total = questions.length;
  const progress = Math.round(((quizStep + 1) / total) * 100);
  const heading = quizAudience === "business" ? "Complete Your Business Profile" : "Complete Your Campaign Profile";

  root.innerHTML = `
    <section class="panel quiz-panel">
      <h2>${heading}</h2>
      ${quizQuestionHtml(question, progress, total)}
    </section>
  `;
  wireGuidedQuiz(questions);
}

function requestFromQuizAnswers() {
  const contact = quizAnswers.contact || {};
  return {
    id: `request-${crypto.randomUUID()}`,
    organizationName: quizAnswers.organizationName,
    organizationType: quizAnswers.organizationType,
    website: "",
    socialLinks: "",
    classification: "",
    contactName: contact.contactName,
    email: contact.email,
    phone: contact.phone,
    communitiesServed: "",
    mission: "",
    audienceServed: "",
    audienceSize: 0,
    campaignDescription: quizAnswers.campaignDescription,
    campaignType: quizAnswers.campaignType || "",
    fundingGoal: Number(quizAnswers.fundingGoal) || 0,
    startDate: "",
    endDate: "",
    partnershipDeadline: "",
    timingPreference: quizAnswers.timingPreference,
    causeArea: quizAnswers.causeArea,
    businessPreference: quizAnswers.preferredCategories?.[0] || "No preference",
    preferredCategories: quizAnswers.preferredCategories || [],
    eventType: quizAnswers.campaignType || "",
    partnershipTypesNeeded: quizAnswers.partnershipTypesNeeded || [],
    supportNeeds: quizAnswers.supportNeeds || [],
    expectedParticipation: 0,
    minimumSize: 0,
    idealSize: 0,
    geography: quizAnswers.geography,
    mustHaves: "",
    niceToHaves: "",
    priorFundraiser: "",
    campaignStage: "submitted",
    createdAt: new Date().toISOString(),
    successDetails: "",
    status: "new",
    rating: null,
    reviewNote: "",
  };
}

function requestProfilePatch() {
  return {
    website: quizAnswers.website || "",
    socialLinks: quizAnswers.socialLinks || "",
    classification: quizAnswers.classification || "",
    communitiesServed: quizAnswers.communitiesServed || "",
    mission: quizAnswers.mission || "",
    audienceServed: quizAnswers.audienceServed || "",
    audienceSize: Number(quizAnswers.audienceSize) || 0,
    eventType: quizAnswers.eventType || "",
    startDate: quizAnswers.startDate || "",
    endDate: quizAnswers.endDate || "",
    partnershipDeadline: quizAnswers.partnershipDeadline || "",
    expectedParticipation: Number(quizAnswers.expectedParticipation) || 0,
    minimumSize: Number(quizAnswers.minimumSize) || 0,
    idealSize: Number(quizAnswers.idealSize) || 0,
    mustHaves: quizAnswers.mustHaves || "",
    niceToHaves: quizAnswers.niceToHaves || "",
    priorFundraiser: quizAnswers.priorFundraiser || "",
  };
}

function businessFromQuizAnswers() {
  const contact = quizAnswers.contact || {};
  return {
    id: `business-${crypto.randomUUID()}`,
    name: quizAnswers.name,
    businessType: "",
    website: "",
    socialLinks: "",
    contactName: contact.contactName,
    email: contact.email,
    phone: contact.phone,
    category: quizAnswers.category,
    pricingPoint: quizAnswers.pricingPoint || "",
    businessGoals: quizAnswers.businessGoals || [],
    serviceAreas: splitSelections(quizAnswers.serviceAreas),
    fulfillmentScope: "",
    causeAreas: quizAnswers.causeAreas || [],
    contributionTypes: [],
    partnershipTypes: quizAnswers.partnershipTypes || [],
    offerTypes: quizAnswers.offerTypes || [],
    productsServices: "",
    averagePriceRange: "",
    minimumOrderRequirement: Number(quizAnswers.minimumOrderRequirement) || 0,
    minimumCapacity: 0,
    maximumCapacity: 0,
    idealEventSize: 0,
    campaignCap: 0,
    activeCampaigns: 0,
    estimatedUnitContribution: Number(quizAnswers.estimatedUnitContribution) || 0,
    availabilityPreference: quizAnswers.availabilityPreference,
    availableFrom: "",
    availableTo: "",
    leadTimeDays: 0,
    fulfillmentOptions: [],
    orgTypesSupported: [],
    notes: "",
    rating: null,
    reviewNote: "",
    unavailable: false,
    status: "ready",
  };
}

function businessProfilePatch() {
  return {
    businessType: quizAnswers.businessType || "",
    website: quizAnswers.website || "",
    socialLinks: quizAnswers.socialLinks || "",
    fulfillmentScope: quizAnswers.fulfillmentScope || "",
    contributionTypes: quizAnswers.contributionTypes || [],
    productsServices: quizAnswers.productsServices || "",
    averagePriceRange: quizAnswers.averagePriceRange || "",
    pricingPoint: quizAnswers.pricingPoint || quizAnswers.averagePriceRange || "",
    minimumCapacity: Number(quizAnswers.minimumCapacity) || 0,
    maximumCapacity: Number(quizAnswers.maximumCapacity) || 0,
    idealEventSize: Number(quizAnswers.idealEventSize) || 0,
    campaignCap: Number(quizAnswers.campaignCap) || 0,
    activeCampaigns: Number(quizAnswers.activeCampaigns) || 0,
    availableFrom: quizAnswers.availableFrom || "",
    availableTo: quizAnswers.availableTo || "",
    leadTimeDays: Number(quizAnswers.leadTimeDays) || 0,
    fulfillmentOptions: quizAnswers.fulfillmentOptions || [],
    orgTypesSupported: quizAnswers.orgTypesSupported || [],
    notes: quizAnswers.notes || "",
  };
}

function renderDashboard() {
  if (isAdmin()) {
    renderAdminDashboard();
    return;
  }
  renderRoleDashboard();
}

function renderAdminDashboard() {
  setTitle("Raise Local Dashboard");
  const matches = currentMatches().sort((a, b) => {
    const isFeatured = (match) => match.request.id === "request-young-excellence" && match.business.id === "biz-sofia-grace";
    return Number(isFeatured(b)) - Number(isFeatured(a));
  });
  const approved = matches.filter((match) => ["accepted", "active", "completed", "launched"].includes(match.status)).length;
  const active = matches.filter((match) => ["active", "launched"].includes(match.status)).length;
  const topMatch = matches[0];

  root.innerHTML = `
    <section class="mission-panel">
      <div>
        <p class="eyebrow">Raise Funds, Buy Local</p>
        <h2>Raise Local, powered by Verified Consulting, connects local causes with local businesses that are ready to partner, support, and grow with them.</h2>
      </div>
    </section>

    <section class="metric-grid">
      <button type="button" class="metric-card metric-link" data-dashboard-target="requests"><span>Campaign Requests</span><strong>${data.campaignRequests.length}</strong></button>
      <button type="button" class="metric-card metric-link" data-dashboard-target="businesses"><span>Business Profiles</span><strong>${data.businesses.length}</strong></button>
      <button type="button" class="metric-card metric-link" data-dashboard-target="matches"><span>Top Matches</span><strong>${matches.length}</strong></button>
      <button type="button" class="metric-card metric-link" data-dashboard-target="matches"><span>Approved / Active</span><strong>${approved} / ${active}</strong></button>
    </section>

    <section class="panel">
      <h2>Top Match To Review</h2>
      ${topMatch ? matchCard(topMatch) : `<p class="muted">Add one campaign request and one business profile to see matches.</p>`}
    </section>
  `;
  root.querySelectorAll("[data-dashboard-target]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (isAdmin() && ["requests", "businesses"].includes(button.dataset.dashboardTarget)) {
        adminComposer = button.dataset.dashboardTarget === "requests" ? "request" : "business";
      }
      activeView = button.dataset.dashboardTarget;
      render();
    });
  });
}

function isProfileComplete(record, isBusiness) {
  return isBusiness ? Boolean(record.website || record.notes) : Boolean(record.mission || record.mustHaves);
}

function sortRecords(records, sortMode, nameKey) {
  if (sortMode !== "name") return records;
  return [...records].sort((a, b) => String(a[nameKey] || "").localeCompare(String(b[nameKey] || "")));
}

function renderDashboardTabContent(tab, { matches, own, counterpart, isBusinessViewer, sortMode }) {
  if (tab === "own") {
    const card = isBusinessViewer ? businessCard : requestCard;
    const nameKey = isBusinessViewer ? "name" : "organizationName";
    const sorted = sortRecords(own, sortMode, nameKey);
    return sorted.length
      ? sorted.map((record) => card(record, { showCompleteProfile: true })).join("")
      : `<p class="muted">You haven't submitted a ${isBusinessViewer ? "business profile" : "campaign request"} yet. Start the Match Finder quiz to create one.</p>`;
  }
  if (tab === "counterpart") {
    const card = isBusinessViewer ? requestCard : businessCard;
    const nameKey = isBusinessViewer ? "organizationName" : "name";
    const sorted = sortRecords(counterpart, sortMode, nameKey);
    return sorted.length
      ? sorted.map((record) => card(record, { showCompleteProfile: false })).join("")
      : `<p class="muted">Nothing in the pool yet. Once a ${isBusinessViewer ? "nonprofit" : "business"} completes the Match Finder quiz, it'll show up here.</p>`;
  }
  const sortedMatches = sortMode === "name" ? [...matches].sort((a, b) => a.request.organizationName.localeCompare(b.request.organizationName)) : matches;
  return sortedMatches.length
    ? sortedMatches.map((match) => matchPreviewCard(match, { viewerIsBusiness: isBusinessViewer })).join("")
    : `<p class="muted">Your next partner may be one profile away. Complete your profile or submit a request to improve your recommendations.</p>`;
}

const HERO_STICKERS = ["Local", "Businesses.", "Brighter", "Futures."];

function renderRoleDashboard() {
  setTitle("Raise Local Dashboard");
  const isBusinessViewer = myRole() === "business";
  const own = isBusinessViewer ? myOwnBusinesses() : myOwnRequests();
  const matches = myMatches();
  const counterpart = isBusinessViewer ? data.campaignRequests : data.businesses;
  const approved = matches.filter((m) => ["accepted", "active", "completed", "launched"].includes(m.status)).length;
  const active = matches.filter((m) => ["active", "launched"].includes(m.status)).length;
  const name = session?.user?.email?.split("@")[0] || "";
  const boroughs = [...new Set(matches.map((match) => match.request.geography).filter(Boolean))];
  const causes = [...new Set(matches.map((match) => match.request.causeArea).filter(Boolean))];
  const filteredMatches = matches.filter((match) => {
    const boroughMatch = dashboardBorough === "all" || match.request.geography === dashboardBorough;
    const causeMatch = dashboardCause === "all" || match.request.causeArea === dashboardCause;
    const statusMatch = dashboardStatus === "all" || match.status === dashboardStatus;
    const searchText = `${match.request.organizationName} ${match.request.campaignDescription} ${match.request.causeArea} ${match.business.name} ${match.business.category}`.toLowerCase();
    const searchMatch = !dashboardSearch || searchText.includes(dashboardSearch.toLowerCase());
    return boroughMatch && causeMatch && statusMatch && searchMatch;
  });

  const impactItems = [
    { done: own.length > 0, label: `Submit your ${isBusinessViewer ? "business profile" : "campaign request"}` },
    { done: matches.length > 0, label: "Review your first matches" },
    { done: approved > 0, label: "Approve or launch a partnership" },
    { done: own.some((r) => isProfileComplete(r, isBusinessViewer)), label: "Complete your full profile" },
  ];

  const stats = [
    { icon: "document", tint: "tint-blue", label: isBusinessViewer ? "Campaign Requests" : "Campaign Requests", value: isBusinessViewer ? counterpart.length : own.length, caption: own.length ? "+1 new this week" : "Start your first request" },
    { icon: "users", tint: "tint-mint", label: "Business Profiles", value: isBusinessViewer ? own.length : data.businesses.length, caption: isBusinessViewer ? "Your profile" : "+2 new this week" },
    { icon: "handshake", tint: "tint-teal", label: "Top Matches", value: filteredMatches.length, caption: "Ready to review" },
    { icon: "send", tint: "tint-peach", label: "Approved / Active", value: `${approved} / ${active}`, caption: approved ? "Partnership progress" : "Get your first partnership off the ground!" },
  ];

  root.innerHTML = `
    <section class="dashboard-filter-bar" aria-label="Dashboard filters">
      <div class="dashboard-search"><span data-icon="search"></span><input id="dashboard-search" type="search" value="${escapeHtml(dashboardSearch)}" placeholder="Search campaigns, businesses, or causes..." aria-label="Search campaigns, businesses, or causes" /></div>
      <label><span class="sr-only">Borough</span><select id="dashboard-borough"><option value="all">All Boroughs</option>${boroughs.map((value) => `<option value="${escapeHtml(value)}" ${dashboardBorough === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>
      <label><span class="sr-only">Cause</span><select id="dashboard-cause"><option value="all">All Causes</option>${causes.map((value) => `<option value="${escapeHtml(value)}" ${dashboardCause === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>
      <label><span class="sr-only">Status</span><select id="dashboard-status"><option value="all">All Statuses</option>${MATCH_STATUSES.map((value) => `<option value="${value}" ${dashboardStatus === value ? "selected" : ""}>${escapeHtml(statusLabel(value))}</option>`).join("")}</select></label>
    </section>

    <section class="dashboard-hero dashboard-hero-reference">
      <div class="hero-copy">
        <p class="eyebrow">Raise Funds, Buy Local</p>
        <h2>Raise Local, powered by Verified Consulting, connects local causes with local businesses that are ready to partner, support, and grow with them.</h2>
        <p>Stronger communities through meaningful partnerships. Local impact. Lasting change.</p>
      </div>
      <div class="hero-photo-wrap">
        <img class="hero-photo" src="${HERO_PHOTO}" alt="" loading="lazy" />
        <span class="hero-sticker sticker-0">Local<br />Partnerships.<br />Real Change.</span>
      </div>
    </section>

    <section class="dashboard-stats">
      ${stats
        .map(
          (stat) => `
        <div class="stat-card">
          <span class="stat-icon ${stat.tint}">${ICONS[stat.icon]}</span>
          <div>
            <span class="stat-label">${escapeHtml(stat.label)}</span>
            <strong class="stat-value">${stat.value}</strong>
            <span class="stat-caption">${escapeHtml(stat.caption)}</span>
          </div>
        </div>`
        )
        .join("")}
    </section>

    <div class="dashboard-layout">
      <div>
        <div class="dashboard-tabs-row">
          <div class="dashboard-tabs" role="tablist">
            <button type="button" class="dashboard-tab ${dashboardTab === "matches" ? "active" : ""}" data-dashboard-tab="matches">Matches to Review <span class="tab-count">${matches.length}</span></button>
            <button type="button" class="dashboard-tab ${dashboardTab === "own" ? "active" : ""}" data-dashboard-tab="own">${isBusinessViewer ? "Business Profile" : "Campaign Requests"} <span class="tab-count">${own.length}</span></button>
            <button type="button" class="dashboard-tab ${dashboardTab === "counterpart" ? "active" : ""}" data-dashboard-tab="counterpart">${isBusinessViewer ? "Campaign Requests" : "Businesses"} <span class="tab-count">${counterpart.length}</span></button>
          </div>
          <label class="sort-select-wrap">
            Sort by
            <select id="dashboard-sort">
              <option value="best" ${dashboardSort === "best" ? "selected" : ""}>Best Match</option>
              <option value="name" ${dashboardSort === "name" ? "selected" : ""}>Name A-Z</option>
            </select>
          </label>
        </div>
        <section class="dashboard-tab-content">
          ${renderDashboardTabContent(dashboardTab, { matches: filteredMatches, own, counterpart, isBusinessViewer, sortMode: dashboardSort })}
        </section>
      </div>

      <aside class="dashboard-sidebar">
        <section class="panel sidebar-widget">
          <h3>Recent Activity <a class="text-link" href="#" data-dashboard-target="matches">View all ${ICONS.arrowRight}</a></h3>
          <ul class="activity-feed">
            <li><span class="activity-icon tint-blue">${ICONS.document}</span><div><strong>New campaign request</strong><span class="muted small-note">${escapeHtml(data.campaignRequests[0]?.organizationName || "Community partner")}</span></div><span class="muted small-note">Today</span></li>
            <li><span class="activity-icon tint-teal">${ICONS.users}</span><div><strong>New business profile</strong><span class="muted small-note">${escapeHtml(data.businesses[0]?.name || "Local business")}</span></div><span class="muted small-note">Today</span></li>
            <li><span class="activity-icon tint-mint">${ICONS.handshake}</span><div><strong>Match suggested</strong><span class="muted small-note">${filteredMatches[0] ? `${escapeHtml(filteredMatches[0].request.organizationName)} + ${escapeHtml(filteredMatches[0].business.name)}` : "New partnership opportunity"}</span></div><span class="muted small-note">This week</span></li>
          </ul>
        </section>

        <section class="panel sidebar-widget quick-actions">
          <h3>Quick Actions</h3>
          <button type="button" class="primary-btn" data-dashboard-target="requests">${ICONS.plus} Add Campaign Request</button>
          <button type="button" class="secondary-btn" data-dashboard-target="businesses">${ICONS.plus} Add Business Profile</button>
          <button type="button" class="secondary-btn" data-dashboard-target="matches">${ICONS.search} Find Matches</button>
        </section>

        <section class="panel sidebar-quote">
          <p>"Stronger local communities aren't built alone — they're built together."</p>
          <span class="muted">— Raise Local</span>
        </section>
      </aside>
    </div>
  `;

  root.querySelectorAll("[data-dashboard-target]").forEach((button) => {
    button.addEventListener("click", () => {
      activeView = button.dataset.dashboardTarget;
      render();
    });
  });
  root.querySelectorAll("[data-dashboard-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      dashboardTab = button.dataset.dashboardTab;
      render();
    });
  });
  root.querySelectorAll("[data-view-match]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMatchKey = `${button.dataset.requestId}::${button.dataset.businessId}`;
      activeView = "matches";
      render();
    });
  });
  document.getElementById("dashboard-sort").addEventListener("change", (event) => {
    dashboardSort = event.target.value;
    render();
  });
  ["dashboard-borough", "dashboard-cause", "dashboard-status"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", (event) => {
      if (id === "dashboard-borough") dashboardBorough = event.target.value;
      if (id === "dashboard-cause") dashboardCause = event.target.value;
      if (id === "dashboard-status") dashboardStatus = event.target.value;
      render();
    });
  });
  document.getElementById("dashboard-search")?.addEventListener("change", (event) => {
    dashboardSearch = event.target.value.trim();
    render();
  });
}

// This nav slot is admin-global ("Campaign Requests") for admins, but for a
// logged-in nonprofit it's their own submitted request, and for a logged-in
// business — which has no campaign request of its own — it becomes their own
// business profile instead. See renderBusinesses() for the matched-
// counterpart slot this pairs with.
function renderRequests() {
  if (selectedEntityKey) {
    renderEntityDetail();
    return;
  }
  if (isAdmin()) {
    setTitle("Campaign Requests");
    const banner = confirmationMarkup();
    quizConfirmation = "";
    const composing = adminComposer === "request";
    root.innerHTML = `
      ${banner}
      <section class="directory-page-header"><p class="eyebrow">Partnership opportunities</p><h2>Campaign Requests</h2><p class="muted">Review nonprofit requests, campaign stages, and partnership opportunities in one place.</p></section>
      ${composing ? `<section class="panel composer-panel"><div class="section-heading"><div><p class="eyebrow">Add on behalf of a nonprofit</p><h2>New Campaign Request</h2></div><button type="button" class="secondary-btn" data-cancel-composer>Back to requests</button></div>${requestForm()}</section>` : `<section class="panel directory-helper"><div class="section-heading"><div><h2>Submitted Campaign Requests</h2><p class="muted">Each request stays visible here as it moves from submitted to matched, active, and completed.</p></div><button type="button" class="primary-btn" data-open-composer="request">${ICONS.plus} Add Campaign Request</button></div></section>`}
      <section class="entity-list">${data.campaignRequests.map((r) => requestCard(r, { adminDirectory: true })).join("")}</section>
    `;
    if (composing) wireRequestForm();
    root.querySelector("[data-open-composer]")?.addEventListener("click", () => {
      adminComposer = "request";
      render();
    });
    root.querySelector("[data-cancel-composer]")?.addEventListener("click", () => {
      adminComposer = "";
      render();
    });
    wireCompleteProfileLinks();
    wireEntityDetailLinks();
    wireConfirmationLink();
    return;
  }
  if (myRole() === "business") {
    renderMyOwnProfile("business");
    return;
  }
  renderMyOwnProfile("request");
}

function renderMyOwnProfile(kind) {
  setTitle(kind === "business" ? "Business Profile" : "Campaign Requests");
  const banner = confirmationMarkup();
  quizConfirmation = "";
  const own = kind === "business" ? myOwnBusinesses() : sortCampaignRequests(myOwnRequests());
  const card = kind === "business" ? businessCard : requestCard;
  const empty = emptyState({
    icon: { svg: ICONS[kind === "business" ? "briefcase" : "document"], tint: "icon-tint-mint" },
    title: kind === "business" ? "No business profile yet" : "No campaign request yet",
    body: `You haven't submitted a ${kind === "business" ? "business profile" : "campaign request"} yet. Take the Match Finder quiz to create one and start getting matched.`,
    action: { label: "Start Match Finder", dataAttr: "start-match-finder" },
  });
  const otherSide = kind === "business" ? "local causes" : "local businesses";

  const activityPanel = own.length ? matchActivityPanel(myMatches(), otherSide) : "";

  root.innerHTML = `
    ${banner}
    <section class="directory-page-header"><p class="eyebrow">Your Raise Local workspace</p><h2>${kind === "business" ? "Your Business Profile" : "Your Campaign Requests"}</h2><p class="muted">${kind === "business" ? "Show local causes what you can offer and where you can make an impact." : "Share what your organization needs so the right local partners can find you."}</p></section>
    ${activityPanel}
    <section class="panel">
      <div class="section-heading">
        <div><h2>${kind === "business" ? "Your Business Profile" : "Your Submitted Requests"}</h2><p class="muted">${kind === "business" ? "Keep your partner information current and add another profile when needed." : "Review your previous requests, campaign stages, and outcomes."}</p></div>
        ${kind === "request" && own.length ? `<label class="sort-select-wrap">Sort by <select id="campaign-sort"><option value="newest" ${campaignSort === "newest" ? "selected" : ""}>Newest</option><option value="oldest" ${campaignSort === "oldest" ? "selected" : ""}>Oldest</option><option value="upcoming" ${campaignSort === "upcoming" ? "selected" : ""}>Campaign date</option><option value="completed" ${campaignSort === "completed" ? "selected" : ""}>Completed first</option></select></label>` : ""}
      </div>
      <button type="button" class="primary-btn" data-start-new-profile>${ICONS.plus} ${kind === "business" ? "Add Business Profile" : "Submit New Campaign Request"}</button>
      <button type="button" class="primary-btn" data-goto-matches>Find New Matches ${ICONS.arrowRight}</button>
    </section>
    <section class="entity-list">${own.length ? own.map((record) => card(record, { showCompleteProfile: true })).join("") : empty}</section>
  `;
  wireCompleteProfileLinks();
  wireEntityDetailLinks();
  root.querySelector("[data-empty-action=\"start-match-finder\"]")?.addEventListener("click", () => {
    startNewProfileQuiz();
  });
  wireConfirmationLink();
  root.querySelector("[data-start-new-profile]")?.addEventListener("click", () => startNewProfileQuiz(kind));
  root.querySelectorAll("[data-goto-matches]").forEach((button) => button.addEventListener("click", () => {
    activeView = "matches";
    render();
  }));
  root.querySelector("#campaign-sort")?.addEventListener("change", (event) => {
    campaignSort = event.target.value;
    render();
  });
}

function startNewProfileQuiz(kind = "request") {
  quizAudience = kind === "business" ? "business" : "request";
  quizPhase = "core";
  quizStep = 0;
  quizAnswers = {};
  quizActiveRecordId = null;
  quizResultsPreview = null;
  inAppProfileCreate = true;
  authScreen = "app";
  activeView = "complete-profile";
  render();
}

function sortCampaignRequests(requests) {
  return [...requests].sort((a, b) => {
    if (campaignSort === "completed") return Number(isCampaignComplete(b)) - Number(isCampaignComplete(a));
    if (campaignSort === "oldest") return campaignDate(a) - campaignDate(b);
    if (campaignSort === "upcoming") return campaignDate(a) - campaignDate(b);
    return campaignDate(b) - campaignDate(a);
  });
}

function campaignDate(request) {
  return new Date(request.startDate || request.createdAt || 0).getTime() || 0;
}

function isCampaignComplete(request) {
  return ["completed", "launched", "successful"].includes(request.campaignStage || request.status);
}

function campaignStage(request) {
  const stage = request.campaignStage || request.status || "submitted";
  return stage === "new" ? "Submitted" : statusLabel(stage);
}

function matchActivityPanel(matches, otherSide) {
  const interested = matches.filter((m) => ["mutually_approved", "outreach_pending", "outreach_sent", "accepted", "active", "completed", "launched"].includes(m.status)).length;
  const accepted = matches.filter((m) => ["accepted", "active", "completed", "launched"].includes(m.status)).length;
  const launched = matches.filter((m) => ["active", "completed", "launched"].includes(m.status)).length;

  if (!matches.length) {
    return `
      <section class="panel match-activity">
        <h2>Match Activity</h2>
        <p class="muted">No partner matches yet. As compatible ${otherSide === "nonprofits" ? "nonprofits" : "businesses"} join Raise Local, they will appear here.</p>
      </section>
    `;
  }

  return `
    <section class="panel match-activity">
      <h2>Match Activity</h2>
      <div class="activity-stats">
        <div><strong>${matches.length}</strong><span>Total matches</span></div>
        <div><strong>${interested}</strong><span>Interested</span></div>
        <div><strong>${accepted}</strong><span>Approved</span></div>
        <div><strong>${launched}</strong><span>Launched</span></div>
      </div>
      <p class="muted">We're actively matching you with ${escapeHtml(otherSide)}. Review and respond from Matches to Review.</p>
      <button type="button" class="primary-btn" data-goto-matches>View My Matches ${ICONS.arrowRight}</button>
    </section>
  `;
}

// The matched-counterpart slot: a nonprofit sees the businesses it matched
// with here, a business sees the nonprofits/campaigns it matched with. Admin
// keeps the original global "Business Profiles" list + intake form.
function renderBusinesses() {
  if (selectedEntityKey) {
    renderEntityDetail();
    return;
  }
  if (isAdmin()) {
    setTitle("Business Profiles");
    const banner = confirmationMarkup();
    quizConfirmation = "";
    const composing = adminComposer === "business";
    root.innerHTML = `
      ${banner}
      ${composing ? `<section class="panel composer-panel"><div class="section-heading"><div><p class="eyebrow">Add on behalf of a business</p><h2>New Business Profile</h2></div><button type="button" class="secondary-btn" data-cancel-composer>Back to profiles</button></div>${businessForm()}</section>` : `<section class="panel directory-helper"><div class="section-heading"><div><h2>Submitted Business Profiles</h2><p class="muted">Review the businesses in the partner network, their capacity, and their current availability.</p></div><button type="button" class="primary-btn" data-open-composer="business">${ICONS.plus} Add Business Profile</button></div></section>`}
      ${qualityReviewPanel()}
      <section class="entity-list">${data.businesses.map((b) => businessCard(b, { adminDirectory: true })).join("")}</section>
    `;
    if (composing) wireBusinessForm();
    root.querySelector("[data-open-composer]")?.addEventListener("click", () => {
      adminComposer = "business";
      render();
    });
    root.querySelector("[data-cancel-composer]")?.addEventListener("click", () => {
      adminComposer = "";
      render();
    });
    wireCompleteProfileLinks();
    wireQualityControls();
    wireEntityDetailLinks();
    wireConfirmationLink();
    return;
  }

  const isBusinessViewer = myRole() === "business";
  setTitle(isBusinessViewer ? "Campaign Requests" : "Business Profiles");
  const pool = isBusinessViewer ? data.campaignRequests : data.businesses;
  const card = isBusinessViewer ? requestCard : businessCard;
  const noun = isBusinessViewer ? "campaign requests" : "businesses";
  root.innerHTML = `
    <section class="directory-page-header"><p class="eyebrow">Partnership opportunities</p><h2>${isBusinessViewer ? "Campaign Requests" : "Business Profiles"}</h2><p class="muted">${isBusinessViewer ? "Find nonprofit campaigns that align with your offer, capacity, and community goals." : "Find local businesses ready to support meaningful nonprofit campaigns."}</p></section>
    <section class="panel directory-helper"><p class="muted">All ${noun} in the matchmaking pool. Your strongest, scored matches are on Match Review.</p></section>
    <section class="entity-list">${pool.length ? pool.map((record) => card(record, { showCompleteProfile: false })).join("") : `<p class="muted">Nothing in the pool yet. Once a ${isBusinessViewer ? "nonprofit" : "business"} completes the Match Finder quiz, it'll show up here.</p>`}</section>
  `;
  wireEntityDetailLinks();
}

function renderEntityDetail() {
  const [type, recordId] = selectedEntityKey.split("::");
  const isBusiness = type === "business";
  const record = isBusiness ? data.businesses.find((item) => item.id === recordId) : data.campaignRequests.find((item) => item.id === recordId);
  if (!record) {
    selectedEntityKey = "";
    activeView = isBusiness ? "businesses" : "requests";
    render();
    return;
  }
  const name = isBusiness ? record.name : record.organizationName;
  const image = isBusiness ? businessPhoto(record) : requestPhoto(record);
  const imageClass = isBrandAsset(image) ? " brand-photo" : "";
  const relatedMatches = currentMatches().filter((match) => (isBusiness ? match.business.id === record.id : match.request.id === record.id));
  setTitle(isBusiness ? "Business Details" : "Campaign Details");
  root.innerHTML = `
    <button type="button" class="back-link" data-entity-back>${ICONS.undo} Back to ${isBusiness ? "Business Profiles" : "Campaign Requests"}</button>
    <section class="profile-detail-hero">
      <div class="profile-detail-image"><img class="${imageClass.trim()}" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" /></div>
      <div><p class="eyebrow">${isBusiness ? "Local business" : "Nonprofit campaign"}</p><h2>${escapeHtml(name)}</h2><p class="muted">${escapeHtml(isBusiness ? record.category : record.causeArea)} · ${escapeHtml(isBusiness ? (record.serviceAreas || ["Local"])[0] : record.geography)}</p></div>
    </section>
    <section class="profile-detail-grid">
      <section class="panel">
        <p class="eyebrow">${isBusiness ? "What they offer" : "Campaign overview"}</p>
        <h2>${escapeHtml(isBusiness ? (record.productsServices || record.notes || "Ready to explore a community partnership.") : (record.campaignDescription || "Community campaign opportunity."))}</h2>
        <div class="tag-row">${[...(isBusiness ? record.causeAreas || [] : [record.causeArea]), ...(isBusiness ? record.offerTypes || [] : record.supportNeeds || [])].filter(Boolean).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      </section>
      <aside class="panel">
        <p class="eyebrow">Next step</p>
        <h3>${relatedMatches.length ? `${relatedMatches.length} potential match${relatedMatches.length === 1 ? "" : "es"}` : "Ready to be matched"}</h3>
        <p class="muted">Review the recommendations and decide whether this is a partnership worth exploring.</p>
        <button type="button" class="primary-btn" data-entity-matches>View matches ${ICONS.arrowRight}</button>
      </aside>
    </section>
    ${isAdmin() && record.pendingChanges?.length ? `<section class="panel change-review"><p class="eyebrow">Review updates</p><h3>Client-owned details were preserved</h3><p class="muted">These fields already had client-provided values, so the proposed admin changes were held for review.</p><div class="change-review-list">${record.pendingChanges.slice(-6).map((change) => `<div><strong>${escapeHtml(humanizeField(change.field))}</strong><span class="muted">Proposed by ${escapeHtml(change.proposedBy || "admin")}</span></div>`).join("")}</div></section>` : ""}
  `;
  root.querySelector("[data-entity-back]").addEventListener("click", () => {
    selectedEntityKey = "";
    activeView = isBusiness ? "businesses" : "requests";
    render();
  });
  root.querySelector("[data-entity-matches]").addEventListener("click", () => {
    selectedEntityKey = "";
    activeView = "matches";
    render();
  });
}

function wireEntityDetailLinks() {
  root.querySelectorAll("[data-view-entity]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedEntityKey = `${button.dataset.entityType}::${button.dataset.entityId}`;
      activeView = "entity-detail";
      render();
    });
  });
}

function wireConfirmationLink() {
  root.querySelector("[data-confirmation-detail]")?.addEventListener("click", () => {
    const button = root.querySelector("[data-confirmation-detail]");
    selectedEntityKey = `${button.dataset.entityType}::${button.dataset.entityId}`;
    activeView = "entity-detail";
    render();
  });
}

function wireCompleteProfileLinks() {
  root.querySelectorAll("[data-complete-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      quizAudience = button.dataset.completeProfile;
      quizActiveRecordId = button.dataset.recordId;
      quizPhase = "profile";
      quizStep = 0;
      quizAnswers = {};
      activeView = "complete-profile";
      render();
    });
  });
}

function qualityReviewPanel() {
  const flagged = data.businesses.filter((business) => business.qualityStatus === "needs_review" || Number(business.rating) <= QUALITY_REVIEW_THRESHOLD);
  return `
    <section class="panel quality-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Quality control</p>
          <h2>Partner review queue <span class="tab-count">${flagged.length}</span></h2>
          <p class="muted">Businesses at or below ${QUALITY_REVIEW_THRESHOLD} stars stay visible for review until an admin decides whether to pause them.</p>
        </div>
      </div>
      ${flagged.length ? flagged.map((business) => `
        <div class="quality-row">
          <div>
            <strong>${escapeHtml(business.name)}</strong>
            <span class="muted">${Number(business.rating || 0).toFixed(1)} stars${business.reviewNote ? ` · ${escapeHtml(business.reviewNote)}` : " · Review note required"}</span>
          </div>
          <div class="split-actions">
            <span class="status-pill ${business.unavailable ? "status-active" : "status-new"}">${business.unavailable ? "Paused" : "Needs review"}</span>
            <button type="button" class="secondary-btn" data-quality-action="${business.unavailable ? "restore" : "pause"}" data-business-id="${escapeHtml(business.id)}">${business.unavailable ? "Restore" : "Pause partner"}</button>
          </div>
        </div>
      `).join("") : `<p class="muted">No businesses currently need quality review.</p>`}
    </section>
  `;
}

function wireQualityControls() {
  root.querySelectorAll("[data-quality-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const business = data.businesses.find((item) => item.id === button.dataset.businessId);
      if (!business) return;
      const paused = button.dataset.qualityAction === "pause";
      Object.assign(business, { unavailable: paused, status: paused ? "paused" : "ready", qualityStatus: paused ? "paused" : "reviewed" });
      saveData(data);
      syncBusinessQuality(business);
      render();
    });
  });
}

function renderMatches() {
  if (selectedMatchKey) {
    const [requestId, businessId] = selectedMatchKey.split("::");
    const match = currentMatches().find((item) => item.request.id === requestId && item.business.id === businessId) || myMatches().find((item) => item.request.id === requestId && item.business.id === businessId);
    if (match) {
      renderMatchDetail(match);
      return;
    }
    selectedMatchKey = "";
  }
  if (isAdmin()) {
    renderAdminMatchReview();
    return;
  }
  renderMatchTriage();
}

function suggestedCampaignApproach(match) {
  const need = match.request.supportNeeds?.[0] || match.request.causeArea || "community needs";
  const partnership = match.request.partnershipTypesNeeded?.[0] || match.request.eventType || "fundraising campaign";
  const offer = match.business.productsServices || match.business.offerTypes?.[0] || match.business.contributionTypes?.[0] || "the business's partnership offer";
  const size = Number(match.request.idealSize || match.request.minimumSize || 0).toLocaleString();
  return `Start with a ${partnership.toLowerCase()} featuring ${offer.toLowerCase()}, focused on ${need.toLowerCase()} and sized for approximately ${size || "the campaign audience"} participants. After both sides approve, Raise Local prepares the introduction.`;
}

function renderMatchDetail(match) {
  setTitle("Match Details");
  const approach = suggestedCampaignApproach(match);
  root.innerHTML = `
    <button type="button" class="back-link" data-match-back>${ICONS.undo} Back to Match Review</button>
    <section class="match-detail-hero">
      <div>
        <p class="eyebrow">Raise Local Match Finder</p>
        <h2>${escapeHtml(match.request.organizationName)} <span aria-hidden="true">+</span> ${escapeHtml(match.business.name)}</h2>
        <p class="muted">A transparent recommendation based on cause, location, timing, partnership type, capacity, and fundraising needs.</p>
      </div>
      <div class="match-detail-score"><span>${escapeHtml(match.label)}</span><strong>${match.total}</strong><small>fit signal</small></div>
    </section>
    <section class="match-detail-grid">
      <div>
        ${matchCard(match, { showAdminControls: isAdmin(), showViewDetails: false })}
        ${matchDecisionActions(match)}
      </div>
      <aside class="match-detail-rail">
        <section class="panel detail-insight">
          <p class="eyebrow">Suggested campaign approach</p>
          <h3>Make the first partnership easy to say yes to.</h3>
          <p>${escapeHtml(approach)}</p>
        </section>
        <section class="panel detail-insight">
          <p class="eyebrow">Estimated fundraising scenario</p>
          <h3>${escapeHtml(match.forecast)}</h3>
          <p class="muted">Illustrative scenario based on the campaign goal and estimated contribution. It is not a guarantee; both parties agree the final offer and terms.</p>
        </section>
        <section class="panel detail-insight">
          <p class="eyebrow">What the assistant checked</p>
          <div class="detail-check-list">${(match.decisionStages || []).slice(0, 5).map((stage) => `<div class="${stage.passed ? "passed" : "blocked"}">${stage.passed ? ICONS.check : ICONS.close}<span>${escapeHtml(stage.label)}</span></div>`).join("")}</div>
        </section>
      </aside>
    </section>
  `;
  root.querySelector("[data-match-back]").addEventListener("click", () => {
    selectedMatchKey = "";
    render();
  });
  root.querySelectorAll("[data-detail-decision]").forEach((button) => {
    button.addEventListener("click", () => {
      respondToMatch(match, button.dataset.detailDecision);
      render();
    });
  });
  wireActiveMatchControls();
  wireMatchProgressionButtons();
  wireRatingWidgets();
}

function causeFilterOptions(matches) {
  return [...new Set(matches.map((m) => m.request.causeArea).filter(Boolean))];
}

function renderAdminMatchReview() {
  setTitle("Match Review");
  const all = currentMatches();
  const causes = causeFilterOptions(all);
  const matches = matchCauseFilter === "all" ? all : all.filter((m) => m.request.causeArea === matchCauseFilter);
  root.innerHTML = `
    <section class="panel">
      <h2>Recommended Partners</h2>
      <p class="muted">The matching assistant prioritizes the strongest 3-5 explainable fits. Tenyse can approve for introduction, hold, or decline each recommendation, then coordinate outreach after both sides approve.</p>
      ${causeFilterHtml(causes)}
    </section>
    <section class="match-grid">${matches.length ? matches.map((match) => matchCard(match, { showAdminControls: true })).join("") : `<p class="muted">No recommendations are ready yet. Add more campaign and partner details to improve the next set of suggestions.</p>`}</section>
  `;
  wireCauseFilter();
  wireViewMatchButtons();
  wireActiveMatchControls();
}

function causeFilterHtml(causes) {
  if (causes.length < 2) return "";
  return `
    <label class="sort-select-wrap" style="margin-top:12px;">
      Filter by cause
      <select id="match-cause-filter">
        <option value="all" ${matchCauseFilter === "all" ? "selected" : ""}>All causes</option>
        ${causes.map((c) => `<option value="${escapeHtml(c)}" ${matchCauseFilter === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
      </select>
    </label>
  `;
}

function wireCauseFilter() {
  document.getElementById("match-cause-filter")?.addEventListener("change", (event) => {
    matchCauseFilter = event.target.value;
    render();
  });
}

function wireActiveMatchControls() {
  root.querySelectorAll("[data-status-update]").forEach((select) => {
    select.addEventListener("change", () => {
      upsertMatchStatus(select.dataset.requestId, select.dataset.businessId, select.value);
      render();
    });
  });
  root.querySelectorAll("[data-decline-reason]").forEach((select) => {
    select.addEventListener("change", () => {
      upsertMatchFeedback(select.dataset.requestId, select.dataset.businessId, { declineReason: select.value });
      render();
    });
  });
  root.querySelectorAll("[data-decline-note]").forEach((textarea) => {
    textarea.addEventListener("change", () => {
      upsertMatchFeedback(textarea.dataset.requestId, textarea.dataset.businessId, { declineNote: textarea.value.trim() });
    });
  });
  root.querySelectorAll("[data-admin-note]").forEach((textarea) => {
    textarea.addEventListener("change", () => {
      upsertMatchFeedback(textarea.dataset.requestId, textarea.dataset.businessId, { adminNote: textarea.value.trim() });
    });
  });
  root.querySelectorAll("[data-outreach-send]").forEach((button) => {
    button.addEventListener("click", () => {
      upsertMatchOutreach(button.dataset.requestId, button.dataset.businessId);
      render();
    });
  });
  wireRatingWidgets();
}

// The regular-user Match Review: a dating-app-style triage deck for brand
// new (status "recommended") matches, the usual detailed cards for ones
// already acted on, and a collapsible bin for denied/held ones so nothing
// gets lost. Approve/Deny/Hold map onto the existing intro_requested/
// declined/saved statuses — see respondToMatch().
function renderMatchTriage() {
  setTitle("Match Review");
  if (!matchLoaderShown) {
    matchLoaderShown = true;
    root.innerHTML = `
      <section class="match-loading" role="status" aria-live="polite">
        <div class="match-loading-network" aria-hidden="true">
          <span></span><span></span><span></span><span></span><i></i><i></i>
        </div>
        <p class="eyebrow">Raise Local Match Finder</p>
        <h2>Finding partners that fit.</h2>
        <p class="muted">The matching assistant is comparing your request with local businesses and preparing an explainable recommendation.</p>
        <div class="match-loading-progress"><span></span></div>
        <div class="match-loading-steps" aria-hidden="true">
          <span>Checking cause alignment</span>
          <span>Comparing service areas</span>
          <span>Reviewing capacity and timing</span>
          <span>Preparing your strongest matches</span>
        </div>
      </section>
    `;
    window.setTimeout(() => {
      if (activeView === "matches") renderMatchTriage();
    }, 1100);
    return;
  }
  const isBusinessViewer = myRole() === "business";
  const all = myMatches();
  const causes = causeFilterOptions(all);
  const filtered = matchCauseFilter === "all" ? all : all.filter((m) => m.request.causeArea === matchCauseFilter);

  const myDecision = isBusinessViewer ? "businessDecision" : "nonprofitDecision";
  const fresh = filtered.filter((m) => !m[myDecision] && m.status !== "declined");
  const active = filtered.filter((m) => ["under_review", "awaiting_nonprofit", "awaiting_business", "mutually_approved", "outreach_pending", "outreach_sent", "accepted", "active", "completed", "launched"].includes(m.status));
  const bin = filtered.filter((m) => ["declined", "on_hold"].includes(m.status));

  root.innerHTML = `
    <section class="panel">
      <h2>Your Partner Matches</h2>
      <p class="muted">Approve for introduction, hold for later, or decline each suggestion. Outreach begins only after both sides approve.</p>
      ${causeFilterHtml(causes)}
    </section>

    ${
      fresh.length
        ? `<section class="triage-grid">${fresh.map((match) => triageCard(match, isBusinessViewer)).join("")}</section>`
        : `<section class="panel"><p class="muted">No new matches to review right now — check back as new businesses and campaigns join Raise Local.</p></section>`
    }

    ${
      active.length
        ? `<section class="panel"><h2>Active Matches</h2></section><section class="match-grid">${active
            .map((match) => matchCard(match, { showAdminControls: false, showRating: ["accepted", "launched"].includes(match.status) }))
            .join("")}</section>`
        : ""
    }

    <details class="match-bin">
      <summary>Denied &amp; Held (${bin.length})</summary>
      <section class="match-grid">${bin.length ? bin.map((match) => binCard(match, isBusinessViewer)).join("") : `<p class="muted">Nothing here.</p>`}</section>
    </details>
  `;

  wireCauseFilter();
  wireMatchTriageCards(fresh);
  wireMatchProgressionButtons();
  wireRatingWidgets();
  wireBinCards();
}

function outreachDraft(match) {
  const request = match.request;
  const business = match.business;
  const goal = request.fundingGoal ? `$${Number(request.fundingGoal).toLocaleString()}` : "the campaign goal";
  const approach = request.campaignType || request.eventType || request.partnershipTypesNeeded?.[0] || "a community partnership";
  return `Subject: A potential Raise Local partnership for ${request.organizationName}\n\nHi ${business.contactName || business.name} team,\n\nRaise Local identified ${business.name} as a potential fit for ${request.organizationName}'s ${approach.toLowerCase()} in ${request.geography || "the local community"}. The campaign is focused on ${request.causeArea || "community impact"} and is working toward ${goal}.\n\nThe suggested fit is based on your offer, service area, timing, and capacity. Please review the match details and let us know whether you would like to explore the idea.\n\nBest,\nTenyse\nRaise Local`;
}

async function generateOutreachDraftWithAgent(match) {
  const request = match.request;
  const business = match.business;
  const context = {
    nonprofit: request.organizationName,
    business: business.name,
    campaign: request.campaignDescription,
    cause: request.causeArea,
    location: request.geography,
    timing: request.startDate && request.endDate ? `${request.startDate} to ${request.endDate}` : request.partnershipDeadline || "Flexible timing",
    partnershipType: request.partnershipTypesNeeded?.[0] || request.eventType || "Community partnership",
    supportNeeded: request.supportNeeds?.join(", ") || "Partner support",
    businessOffer: business.productsServices || business.offerTypes?.join(", ") || "Local business support",
    businessGoals: business.businessGoals?.join(", ") || "Community visibility",
    fundraisingScenario: match.forecast,
  };
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "anthropic",
      model: "claude-3-5-haiku-latest",
      maxTokens: 700,
      system: "You are Raise Local's outreach assistant. Draft warm, specific, concise partnership outreach for a human coordinator named Tenyse. Do not promise funding, approval, availability, or campaign terms. Make the next step a short exploratory conversation. Return only the subject line and email body, with no markdown commentary.",
      messages: [{ role: "user", content: `Create a warm introduction email using this approved partnership context:\n${JSON.stringify(context, null, 2)}` }],
    }),
  });
  if (!response.ok) throw new Error("Outreach assistant unavailable");
  const payload = await response.json();
  return payload.text?.trim() || outreachDraft(match);
}

function persistOutreachDraft(match) {
  const saved = data.matches.find((item) => item.requestId === match.request.id && item.businessId === match.business.id);
  if (saved) {
    saved.outreachMessage = match.outreachMessage || "";
    saved.outreachStatus = match.outreachStatus || "not_started";
    saved.outreachAt = match.outreachAt || null;
  } else {
    data.matches.push({
      requestId: match.request.id,
      businessId: match.business.id,
      status: match.status,
      outreachStatus: match.outreachStatus || "not_started",
      outreachMessage: match.outreachMessage || "",
      outreachAt: match.outreachAt || null,
    });
  }
  saveData(data);
  syncMatchDecision({
    requestId: match.request.id,
    businessId: match.business.id,
    status: match.status,
    nonprofitDecision: match.nonprofitDecision || "",
    businessDecision: match.businessDecision || "",
    outreachStatus: match.outreachStatus || "not_started",
    outreachMessage: match.outreachMessage || "",
    outreachAt: match.outreachAt || null,
    declineReason: match.declineReason || "",
    declineNote: match.declineNote || "",
    adminNote: match.adminNote || "",
    notifiedAt: match.notifiedAt || null,
  });
}

function renderMessages() {
  setTitle("Outreach");
  const approved = currentMatches().filter((match) => ["mutually_approved", "outreach_pending", "outreach_sent", "accepted", "active", "completed", "launched"].includes(match.status));
  const sent = approved.filter((match) => match.outreachStatus === "sent").length;
  root.innerHTML = `
    <section class="directory-page-header">
      <p class="eyebrow">Relationship workspace</p>
      <h2>Outreach coordination</h2>
      <p class="muted">Turn mutual approval into a thoughtful introduction, with the partnership context and next step in one place.</p>
    </section>
    ${approved.length ? `
      <section class="metric-grid outreach-metrics">
        <article class="metric-card"><span>Ready for coordination</span><strong>${approved.length}</strong><small>Mutually approved partnerships</small></article>
        <article class="metric-card"><span>Drafts prepared</span><strong>${approved.filter((match) => Boolean(match.outreachMessage)).length}</strong><small>Editable introductions</small></article>
        <article class="metric-card"><span>Outreach sent</span><strong>${sent}</strong><small>Waiting for partner response</small></article>
      </section>
      <section class="message-list">${approved.map((match) => `
        <article class="panel outreach-card">
          <div class="outreach-card-header">
            <div class="message-row-icon">${ICONS.handshake}</div>
            <div><p class="eyebrow">${escapeHtml(statusLabel(match.status))}</p><h3>${escapeHtml(match.request.organizationName)} + ${escapeHtml(match.business.name)}</h3><p class="muted">${escapeHtml(match.request.campaignDescription || "Community partnership")}</p></div>
            <span class="status-pill ${match.outreachStatus === "sent" ? "status-active" : "status-ready"}">${match.outreachStatus === "sent" ? "Outreach sent" : "Draft needed"}</span>
          </div>
          <div class="outreach-context"><span>${escapeHtml(match.request.causeArea || "Community impact")}</span><span>${escapeHtml(match.request.geography || "Local")}</span><span>${escapeHtml(match.business.offerTypes?.[0] || match.business.category || "Partner offer")}</span><span>${escapeHtml(match.forecast)}</span></div>
          <section class="outreach-agent-panel">
            <div><p class="eyebrow">Outreach agent</p><h4>Prepare a warm introduction</h4><p class="muted">The assistant uses the approved match, campaign need, business offer, and timing to suggest a human-ready next step. Tenyse reviews and edits before anything is sent.</p></div>
            <button type="button" class="primary-btn" data-draft-outreach data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">${match.outreachMessage ? "Refresh suggestion" : "Generate suggestion"} ${ICONS.arrowRight}</button>
          </section>
          <label class="outreach-label" for="outreach-${escapeHtml(match.id)}">Introduction draft</label>
          <textarea class="outreach-draft" data-outreach-draft id="outreach-${escapeHtml(match.id)}" rows="8" placeholder="Generate a suggested introduction, then edit it before sending.">${escapeHtml(match.outreachMessage || "")}</textarea>
          <div class="message-row-actions"><button type="button" class="secondary-btn" data-copy-outreach data-target="outreach-${escapeHtml(match.id)}">Copy draft</button><button type="button" class="text-btn" data-view-match data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Review match ${ICONS.arrowRight}</button></div>
        </article>
      `).join("")}</section>` : `
      <section class="panel outreach-empty-state">
        <div class="message-row-icon">${ICONS.send}</div>
        <div><p class="eyebrow">Outreach agent ready</p><h3>No introductions are ready yet</h3><p class="muted">Once the nonprofit and business both approve a match, this workspace will assemble the context, suggest an outreach approach, and prepare an editable introduction for Tenyse.</p><button type="button" class="primary-btn" data-empty-target="matches">Review matches ${ICONS.arrowRight}</button></div>
      </section>`}
  `;
  wireViewMatchButtons();
  wireOutreachDrafts();
  root.querySelector("[data-empty-target]")?.addEventListener("click", () => { activeView = "matches"; render(); });
}

function wireOutreachDrafts() {
  root.querySelectorAll("[data-draft-outreach]").forEach((button) => {
    button.addEventListener("click", async () => {
      const match = currentMatches().find((item) => item.request.id === button.dataset.requestId && item.business.id === button.dataset.businessId);
      if (!match) return;
      button.disabled = true;
      const originalLabel = button.textContent;
      button.textContent = "Preparing suggestion...";
      try {
        match.outreachMessage = await generateOutreachDraftWithAgent(match);
      } catch {
        match.outreachMessage = outreachDraft(match);
      }
      persistOutreachDraft(match);
      renderMessages();
      const nextButton = root.querySelector(`[data-draft-outreach][data-request-id="${CSS.escape(match.request.id)}"][data-business-id="${CSS.escape(match.business.id)}"]`);
      if (nextButton) nextButton.setAttribute("aria-label", originalLabel);
    });
  });
  root.querySelectorAll("[data-outreach-draft]").forEach((field) => {
    field.addEventListener("change", () => {
      const match = currentMatches().find((item) => item.id === field.id.replace("outreach-", ""));
      if (!match) return;
      match.outreachMessage = field.value;
      persistOutreachDraft(match);
    });
  });
  root.querySelectorAll("[data-copy-outreach]").forEach((button) => {
    button.addEventListener("click", async () => {
      const field = document.getElementById(button.dataset.target);
      if (!field) return;
      await navigator.clipboard?.writeText(field.value);
      button.textContent = "Copied";
      window.setTimeout(() => { button.textContent = "Copy draft"; }, 1400);
    });
  });
}

function renderProjects() {
  setTitle("My Projects");
  const projects = currentMatches().filter((match) => ["accepted", "active", "completed", "launched"].includes(match.status));
  root.innerHTML = `
    <section class="directory-page-header">
      <p class="eyebrow">Partnership follow-through</p>
      <h2>My Projects</h2>
      <p class="muted">Track approved partnerships from the first conversation through a completed campaign.</p>
    </section>
    ${projects.length ? `<section class="project-list">${projects.map((match) => `
      <article class="panel project-row">
        <div class="project-row-identity"><img src="${escapeHtml(requestPhoto(match.request))}" alt="" /><div><h3>${escapeHtml(match.request.organizationName)} + ${escapeHtml(match.business.name)}</h3><p class="muted">${escapeHtml(match.request.causeArea)} · ${escapeHtml(match.request.geography)}</p></div></div>
        <span class="status-pill status-ready">${escapeHtml(statusLabel(match.status))}</span>
        <button type="button" class="secondary-btn" data-view-match data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Open project ${ICONS.arrowRight}</button>
      </article>
    `).join("")}</section>` : emptyState({ icon: { svg: ICONS.handshake, tint: "icon-tint-mint" }, title: "No active projects yet", body: "Mutually approved matches become projects here once outreach is sent and the partnership begins.", action: { label: "Review matches", gotoView: "matches" } })}
  `;
  wireViewMatchButtons();
  wireEmptyStates(root, (view) => { activeView = view; }, render);
}

function renderReports() {
  setTitle("Reports");
  const matches = currentMatches();
  const approved = matches.filter((match) => ["mutually_approved", "outreach_pending", "outreach_sent", "accepted", "active", "completed", "launched"].includes(match.status)).length;
  const active = matches.filter((match) => ["active", "launched"].includes(match.status)).length;
  const completed = matches.filter((match) => ["completed", "launched"].includes(match.status)).length;
  root.innerHTML = `
    <section class="directory-page-header">
      <p class="eyebrow">Partnership outcomes</p>
      <h2>Reports</h2>
      <p class="muted">A clear view of the relationships Raise Local is helping move from interest to impact.</p>
    </section>
    <section class="metric-grid report-metrics">
      <article class="metric-card"><span>Suggested matches</span><strong>${matches.length}</strong><small>Explainable recommendations</small></article>
      <article class="metric-card"><span>Approved partnerships</span><strong>${approved}</strong><small>Both sides can move forward</small></article>
      <article class="metric-card"><span>Active campaigns</span><strong>${active}</strong><small>Currently in progress</small></article>
      <article class="metric-card"><span>Completed campaigns</span><strong>${completed}</strong><small>Ready for outcome review</small></article>
    </section>
    <section class="panel report-next-step"><div><p class="eyebrow">Next useful step</p><h3>Turn every completed partnership into better recommendations.</h3><p class="muted">Capture what worked, what was delivered, and whether the campaign reached its goal so future matches become more useful.</p></div><button type="button" class="primary-btn" data-report-target="projects">View projects ${ICONS.arrowRight}</button></section>
  `;
  root.querySelector("[data-report-target]")?.addEventListener("click", () => { activeView = "projects"; render(); });
}

function wireViewMatchButtons() {
  root.querySelectorAll("[data-view-match]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMatchKey = `${button.dataset.requestId}::${button.dataset.businessId}`;
      activeView = "matches";
      render();
    });
  });
}

function triageCard(match, isBusinessViewer) {
  const photo = isBusinessViewer ? requestPhoto(match.request) : businessPhoto(match.business);
  const name = isBusinessViewer ? match.request.organizationName : match.business.name;
  const description = isBusinessViewer ? match.request.campaignDescription : match.business.productsServices || match.business.notes || "";
  const reason = match.reasons?.[0] || match.forecast || "";
  return `
    <div class="flip-card" data-flip-card data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <img src="${photo}" alt="" loading="lazy" />
          <div class="flip-card-body">
            <h3>${escapeHtml(name)}</h3>
            <p>${escapeHtml(description)}</p>
            <p class="triage-reason">${escapeHtml(reason)}</p>
          </div>
          <div class="triage-actions">
            <button type="button" class="triage-btn deny" data-decision="deny" aria-label="Decline this match">${ICONS.close}<span>Decline</span></button>
            <button type="button" class="triage-btn hold" data-decision="hold" aria-label="Hold this match for later">${ICONS.bookmark}<span>Hold</span></button>
            <button type="button" class="triage-btn approve" data-decision="approve" aria-label="Approve this match">${ICONS.check}<span>Approve</span></button>
          </div>
        </div>
        <div class="flip-card-back">
          <span class="flip-check">${ICONS.check}</span>
          <h3>Your decision is recorded.</h3>
          <p class="muted">The other side can now review the opportunity. When both sides approve, Raise Local coordinates outreach.</p>
        </div>
      </div>
    </div>
  `;
}

function wireMatchTriageCards(freshMatches) {
  root.querySelectorAll("[data-flip-card]").forEach((cardEl) => {
    const match = freshMatches.find((m) => m.request.id === cardEl.dataset.requestId && m.business.id === cardEl.dataset.businessId);
    if (!match) return;
    cardEl.querySelectorAll("[data-decision]").forEach((button) => {
      button.addEventListener("click", () => {
        const decision = button.dataset.decision;
        if (decision !== "approve") {
          respondToMatch(match, decision);
          render();
          return;
        }
        cardEl.classList.add("is-flipped");
        setTimeout(() => {
          respondToMatch(match, decision);
          render();
        }, 650);
      });
    });
  });
}

function binCard(match, isBusinessViewer) {
  const name = isBusinessViewer ? match.request.organizationName : match.business.name;
  const isDenied = match.status === "declined";
  return `
    <article class="entity-card bin-card">
      <div class="entity-head">
        <h3>${escapeHtml(name)}</h3>
        <span class="status-pill ${isDenied ? "status-active" : "status-new"}">${isDenied ? "Denied" : "On hold"}</span>
      </div>
      <p class="muted">${escapeHtml(match.reasons?.[0] || "")}</p>
      <button type="button" class="secondary-btn" data-reconsider data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">${ICONS.undo} Reconsider</button>
    </article>
  `;
}

function wireBinCards() {
  root.querySelectorAll("[data-reconsider]").forEach((button) => {
    button.addEventListener("click", () => {
      upsertMatchDecision(button.dataset.requestId, button.dataset.businessId, myRole(), "");
      render();
    });
  });
}

function ratingWidget(match) {
  const isBusinessViewer = myRole() === "business";
  const record = isBusinessViewer ? data.campaignRequests.find((r) => r.id === match.request.id) : data.businesses.find((b) => b.id === match.business.id);
  const name = isBusinessViewer ? match.request.organizationName : match.business.name;
  const existing = record?.rating || 0;
  return `
    <div class="rating-widget" data-rating-widget data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}" data-selected="${existing}">
      <label>Rate ${escapeHtml(name)}</label>
      <div class="star-row">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-btn ${n <= existing ? "filled" : ""}" data-star="${n}" aria-label="${n} star${n === 1 ? "" : "s"}">${ICONS.star}</button>`).join("")}
      </div>
      <textarea data-rating-note rows="2" placeholder="Optional review note">${escapeHtml(record?.reviewNote || "")}</textarea>
      <p class="form-error rating-error" hidden>A note is required for ratings of 2 stars or below.</p>
      <button type="button" class="secondary-btn" data-submit-rating>Save Rating</button>
    </div>
  `;
}

function wireRatingWidgets() {
  root.querySelectorAll("[data-rating-widget]").forEach((widget) => {
    widget.querySelectorAll("[data-star]").forEach((star) => {
      star.addEventListener("click", () => {
        const value = Number(star.dataset.star);
        widget.dataset.selected = value;
        widget.querySelectorAll("[data-star]").forEach((s) => s.classList.toggle("filled", Number(s.dataset.star) <= value));
      });
    });
    widget.querySelector("[data-submit-rating]").addEventListener("click", () => {
      const value = Number(widget.dataset.selected || 0);
      if (!value) return;
      const note = widget.querySelector("[data-rating-note]").value.trim();
      if (value <= 2 && !note) {
        widget.querySelector(".rating-error").hidden = false;
        widget.querySelector("[data-rating-note]").focus();
        return;
      }
      submitRating(
        { request: { id: widget.dataset.requestId }, business: { id: widget.dataset.businessId } },
        value,
        note
      );
      quizConfirmation = "Thanks for the review!";
      render();
    });
  });
}

function renderBrief() {
  setTitle("Build Brief");
  root.innerHTML = `
    <section class="panel">
      <h2>Phase One Scope</h2>
      <p>Build a two-sided matchmaking product under Verified Consulting that captures structured user needs and capabilities, recommends relevant nonprofit-to-business connections, explains why each match fits, and learns from user actions and real-world outcomes.</p>
      <div class="scope-grid">
        <div>
          <p class="small-label">In scope now</p>
          <ul>
            <li>Campaign request intake.</li>
            <li>Business match profiles.</li>
            <li>Explainable top 3-5 filtered matches.</li>
            <li>Approve, hold, decline, outreach, active, and completed statuses.</li>
            <li>Decline reason notes and simple business ratings.</li>
            <li>Human review before introductions.</li>
          </ul>
        </div>
        <div>
          <p class="small-label">Not in scope yet</p>
          <ul>
            <li>Open marketplace browsing.</li>
            <li>Opaque AI matching beyond simple filters.</li>
            <li>In-app messaging.</li>
            <li>E-commerce storefronts.</li>
            <li>Stripe checkout and 40/45/15 split payouts.</li>
          </ul>
        </div>
      </div>
    </section>
    <section class="panel">
      <h2>Trust Guardrails</h2>
      <ul>
        <li>Let users decide what profile details are public versus matching-only.</li>
        <li>Show verification or moderation signals for profile trust.</li>
        <li>Never imply a match guarantees business quality, nonprofit legitimacy, financial results, or success.</li>
        <li>Add reporting and blocking before public launch.</li>
        <li>Collect only data needed for matching and operations, with clear consent.</li>
      </ul>
    </section>
  `;
}

function requestForm({ quizMode = false } = {}) {
  return `
    <form id="request-form">
      ${quizMode ? `<div class="progress-rail"><span style="width:25%;"></span></div>` : ""}
      <div class="quiz-intro">
        <p class="eyebrow">Step 1 of 4</p>
        <h3>Tell us about your organization and what you need.</h3>
      </div>
      <div class="form-grid">
        ${inputField("request-org", "Organization name", "PS 118 Art Room", "text", ["PS 118 Art Room", "Fresh Start Pantry", "Young Excellence Society"])}
        ${selectField("request-type", "Organization type", ORGANIZATION_TYPES)}
        ${inputField("request-contact", "Contact name", "Jordan Lee")}
        ${inputField("request-email", "Email", "contact@example.org", "email")}
        ${inputField("request-phone", "Phone", "555-0100", "tel")}
        ${inputField("request-goal", "Funding goal", "5000", "number", ["2500", "5000", "10000"])}
      </div>
      <div class="quiz-intro">
        <p class="eyebrow">Step 2 of 4</p>
        <h3>What kind of campaign are you planning?</h3>
      </div>
      <div class="form-grid">
        ${inputField("request-start", "Campaign start date", "", "date")}
        ${inputField("request-end", "Campaign end date", "", "date")}
        ${selectField("request-cause", "Category or cause area", CAUSE_AREAS)}
        ${selectField("request-preference", "Business type preference", BUSINESS_CATEGORIES)}
        ${selectField("request-event", "Event or campaign type", EVENT_TYPES)}
        ${inputField("request-min-size", "Minimum size needed", "50", "number")}
        ${inputField("request-ideal-size", "Ideal size", "100", "number")}
      </div>
      <div class="quiz-intro">
        <p class="eyebrow">Step 3 of 4</p>
        <h3>What support would make the campaign work?</h3>
      </div>
      ${multiSelectField("request-support", "Support needed", SUPPORT_NEEDS)}
      ${inputField("request-geo", "Local geography", "Neighborhood, borough, or zip code", "text", ["Brooklyn", "Queens", "Manhattan", "Bronx"])}
      <div class="field-row">
        <label for="request-description">What is the campaign for?</label>
        ${suggestedTextArea("request-description", ["Raise money for after-school supplies", "Fund weekend meal bags for local families", "Support a community arts program"])}
      </div>
      <div class="quiz-intro">
        <p class="eyebrow">Step 4 of 4</p>
        <h3>Separate must-haves from nice-to-haves.</h3>
      </div>
      <div class="form-grid">
        ${textAreaField("request-must", "Must-haves", "What would make a match impossible if missing?", ["Local service area, reliable communication, and capacity for the campaign size."])}
        ${textAreaField("request-nice", "Nice-to-haves", "What would make the match even better?", ["Pickup or delivery, social promotion, and flexible campaign dates."])}
      </div>
      <div class="field-row">
        <label for="request-prior">Have you run a fundraiser like this before?</label>
        ${suggestedInput("request-prior", "Yes/no, and platform if yes", ["No", "Yes - local restaurant night", "Yes - online platform"])}
      </div>
      <button class="primary-btn" type="submit">${quizMode ? "Finish Nonprofit Quiz" : "Submit Campaign Request"}</button>
    </form>
  `;
}

function businessForm({ quizMode = false } = {}) {
  return `
    <form id="business-form">
      ${quizMode ? `<div class="progress-rail"><span style="width:25%;"></span></div>` : ""}
      <div class="quiz-intro">
        <p class="eyebrow">Step 1 of 4</p>
        <h3>Let's get to know your business and how you want to support your community.</h3>
      </div>
      <div class="form-grid">
        ${inputField("business-name", "Business name", "Yamaas Olive Oil & Vinegar")}
        ${selectField("business-category", "Business category", BUSINESS_CATEGORIES.filter((item) => item !== "No preference"))}
      </div>
      ${inputField("business-areas", "Location / service area", "Brooklyn, Queens")}
      <div class="quiz-intro">
        <p class="eyebrow">Step 2 of 4</p>
        <h3>What are you open to offering?</h3>
      </div>
      <div class="form-grid">
        ${multiSelectField("business-causes", "Cause areas they want to support", CAUSE_AREAS)}
        ${multiSelectField("business-contributions", "Contribution types", CONTRIBUTION_TYPES)}
        ${multiSelectField("business-offers", "Offer type", SUPPORT_NEEDS)}
        <div class="business-pricing-field is-hidden" data-business-pricing-field>${inputField("business-pricing", "Typical price point", "$15-$40", "text", ["$15-$40", "$25-$75", "$50-$120"])}</div>
      </div>
      <div class="quiz-intro">
        <p class="eyebrow">Step 3 of 4</p>
        <h3>Set your capacity so we don't overbook you.</h3>
      </div>
      <div class="form-grid">
        ${inputField("business-min-capacity", "Minimum order/event size", "30", "number")}
        ${inputField("business-max-capacity", "Maximum order/event size", "200", "number")}
        ${inputField("business-ideal-size", "Ideal event size", "100", "number")}
        ${inputField("business-campaign-cap", "Campaign cap at one time", "2", "number")}
        ${inputField("business-active-campaigns", "Active campaigns now", "0", "number")}
        <div class="business-pricing-field is-hidden" data-business-pricing-field>${inputField("business-unit-value", "Estimated contribution per unit", "15", "number")}</div>
      </div>
      <div class="quiz-intro">
        <p class="eyebrow">Step 4 of 4</p>
        <h3>Tell us when and how you can participate.</h3>
      </div>
      <div class="form-grid">
        ${inputField("business-from", "Available from", "", "date")}
        ${inputField("business-to", "Available to", "", "date")}
      </div>
      ${inputField("business-fulfillment", "Delivery, pickup, or in-person options", "Pickup, delivery, in person")}
      <div class="field-row">
        <label for="business-notes">Notes</label>
        <textarea id="business-notes" rows="3"></textarea>
      </div>
      <button class="primary-btn" type="submit">${quizMode ? "Finish Business Quiz" : "Save Business Profile"}</button>
    </form>
  `;
}

function inputField(id, label, placeholder = "", type = "text", suggestions = []) {
  return `<div class="field-row"><label for="${id}">${label}</label>${suggestedInput(id, placeholder, suggestions, type, true)}</div>`;
}

function selectField(id, label, options) {
  return `<div class="field-row"><label for="${id}">${label}</label><select id="${id}">${options.map((item) => `<option>${item}</option>`).join("")}</select></div>`;
}

function multiSelectField(id, label, options) {
  return `<div class="field-row"><label for="${id}">${label}</label><select id="${id}" multiple required>${options.map((item) => `<option>${item}</option>`).join("")}</select></div>`;
}

function textAreaField(id, label, placeholder = "", suggestions = []) {
  return `<div class="field-row"><label for="${id}">${label}</label>${suggestedTextArea(id, suggestions, placeholder)}</div>`;
}

function suggestedInput(id, placeholder, suggestions = [], type = "text", required = false) {
  const listId = `${id}-suggestions`;
  const list = suggestions.length ? `<datalist id="${listId}">${suggestions.map((item) => `<option value="${escapeHtml(item)}"></option>`).join("")}</datalist>` : "";
  const chips = suggestions.length ? `<div class="quiz-suggestions" aria-label="Suggested answers"><span class="quiz-suggestions-label">Examples</span>${suggestions.map((item) => `<button type="button" class="quiz-suggestion" data-form-suggestion="${escapeHtml(item)}" data-target="${id}">${escapeHtml(item)}</button>`).join("")}</div>` : "";
  return `<input id="${id}" type="${type}" placeholder="${escapeHtml(placeholder)}" ${required ? "required" : ""} list="${listId}" />${list}${chips}`;
}

function suggestedTextArea(id, suggestions = [], placeholder = "") {
  const chips = suggestions.length ? `<div class="quiz-suggestions" aria-label="Suggested answers"><span class="quiz-suggestions-label">Examples</span>${suggestions.map((item) => `<button type="button" class="quiz-suggestion" data-form-suggestion="${escapeHtml(item)}" data-target="${id}">${escapeHtml(item)}</button>`).join("")}</div>` : "";
  return `<textarea id="${id}" rows="3" placeholder="${escapeHtml(placeholder)}">${escapeHtml("")}</textarea>${chips}`;
}

function wireFormSuggestions() {
  root.querySelectorAll("[data-form-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = document.getElementById(button.dataset.target);
      if (!field) return;
      field.value = button.dataset.formSuggestion || "";
      field.focus();
    });
  });
}

function selectedOptions(id) {
  return [...document.getElementById(id).selectedOptions].map((option) => option.value);
}

function wireRequestForm({ fromQuiz = false } = {}) {
  wireFormSuggestions();
  document.getElementById("request-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const request = {
        id: `request-${crypto.randomUUID()}`,
        organizationName: value("request-org"),
        organizationType: value("request-type"),
        contactName: value("request-contact"),
        email: value("request-email"),
        phone: value("request-phone"),
        campaignDescription: value("request-description"),
        campaignType: value("request-event"),
        fundingGoal: Number(value("request-goal")) || 0,
        startDate: value("request-start"),
        endDate: value("request-end"),
        causeArea: value("request-cause"),
        businessPreference: value("request-preference"),
        eventType: value("request-event"),
        supportNeeds: selectedOptions("request-support"),
        minimumSize: Number(value("request-min-size")) || 0,
        idealSize: Number(value("request-ideal-size")) || 0,
        geography: value("request-geo"),
        mustHaves: value("request-must"),
        niceToHaves: value("request-nice"),
        priorFundraiser: value("request-prior"),
        campaignStage: "submitted",
        createdAt: new Date().toISOString(),
        successDetails: "",
        status: "new",
      };
    initializeRecordMeta(request, isAdmin() ? "admin" : "client");
    data.campaignRequests = [request, ...data.campaignRequests];
    saveData(data);
    notifyAdminOfSuggestedMatches("request", request);
    if (fromQuiz) {
      quizConfirmation = "Campaign request saved. Raise Local can now compare it against business profiles.";
      activeView = "matches";
    } else {
      quizConfirmation = `${request.organizationName} campaign request was added.`;
      quizConfirmationAction = { type: "request", id: request.id };
    }
    render();
  });
}

function wireBusinessForm({ fromQuiz = false } = {}) {
  const pricingFields = root.querySelectorAll("[data-business-pricing-field]");
  const contributionSelect = document.getElementById("business-contributions");
  const syncPricingFields = () => {
    const selected = [...(contributionSelect?.selectedOptions || [])].map((option) => option.value);
    const showPricing = selected.some((option) => PRICING_RELEVANT_OPTIONS.has(option));
    pricingFields.forEach((field) => field.classList.toggle("is-hidden", !showPricing));
  };
  contributionSelect?.addEventListener("change", syncPricingFields);
  syncPricingFields();
  document.getElementById("business-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const business = {
        id: `business-${crypto.randomUUID()}`,
        name: value("business-name"),
        category: value("business-category"),
        pricingPoint: value("business-pricing"),
        serviceAreas: splitSelections(value("business-areas")),
        causeAreas: selectedOptions("business-causes"),
        contributionTypes: selectedOptions("business-contributions"),
        offerTypes: selectedOptions("business-offers"),
        minimumCapacity: Number(value("business-min-capacity")) || 0,
        maximumCapacity: Number(value("business-max-capacity")) || 0,
        idealEventSize: Number(value("business-ideal-size")) || 0,
        campaignCap: Number(value("business-campaign-cap")) || 0,
        activeCampaigns: Number(value("business-active-campaigns")) || 0,
        estimatedUnitContribution: Number(value("business-unit-value")) || 0,
        availableFrom: value("business-from"),
        availableTo: value("business-to"),
        fulfillmentOptions: splitSelections(value("business-fulfillment")),
        notes: value("business-notes"),
        rating: null,
        reviewNote: "",
        unavailable: false,
        status: "ready",
      };
    initializeRecordMeta(business, isAdmin() ? "admin" : "client");
    data.businesses = [business, ...data.businesses];
    saveData(data);
    notifyAdminOfSuggestedMatches("business", business);
    if (fromQuiz) {
      quizConfirmation = "Business profile saved. Raise Local can now recommend fit-based campaign opportunities.";
      activeView = "matches";
    } else {
      quizConfirmation = `${business.name} was added to the partner network.`;
      quizConfirmationAction = { type: "business", id: business.id };
    }
    render();
  });
}

function value(id) {
  return document.getElementById(id).value.trim();
}

function upsertMatchStatus(requestId, businessId, status) {
  const existing = data.matches.find((match) => match.requestId === requestId && match.businessId === businessId);
  const fromStatus = existing?.status || "suggested";
  const fields = { status };
  if (["mutually_approved", "outreach_pending", "outreach_sent", "accepted", "launched"].includes(status)) fields.notifiedAt = new Date().toISOString();
  if (existing) Object.assign(existing, fields);
  else data.matches.push({ requestId, businessId, ...fields });
  saveData(data);
  syncMatchDecision({
    requestId,
    businessId,
    status,
    nonprofitDecision: existing?.nonprofitDecision || "",
    businessDecision: existing?.businessDecision || "",
    outreachStatus: existing?.outreachStatus || "not_started",
    outreachMessage: existing?.outreachMessage || "",
    outreachAt: existing?.outreachAt || null,
    fromStatus,
    declineReason: existing?.declineReason || "",
    declineNote: existing?.declineNote || "",
    adminNote: existing?.adminNote || "",
    notifiedAt: fields.notifiedAt || existing?.notifiedAt || null,
  });
}

function upsertMatchDecision(requestId, businessId, role, decision) {
  const existing = data.matches.find((match) => match.requestId === requestId && match.businessId === businessId) || { requestId, businessId };
  const fromStatus = existing.status || "suggested";
  const field = role === "business" ? "businessDecision" : "nonprofitDecision";
  existing[field] = decision;
  existing.status = deriveMatchStatus(existing);
  if (existing.status === "mutually_approved") existing.outreachStatus = "pending";
  if (existing.status === "mutually_approved" || existing.status === "outreach_pending") existing.notifiedAt = new Date().toISOString();
  const index = data.matches.findIndex((match) => match.requestId === requestId && match.businessId === businessId);
  if (index === -1) data.matches.push(existing);
  if (existing.status === "mutually_approved" && fromStatus !== "mutually_approved") {
    const match = currentMatches().find((item) => item.request.id === requestId && item.business.id === businessId);
    if (match) notifyMutualApproval(match);
  }
  saveData(data);
  syncMatchDecision({
    requestId,
    businessId,
    status: existing.status,
    fromStatus,
    nonprofitDecision: existing.nonprofitDecision || "",
    businessDecision: existing.businessDecision || "",
    outreachStatus: existing.outreachStatus || "not_started",
    outreachMessage: existing.outreachMessage || "",
    outreachAt: existing.outreachAt || null,
    declineReason: existing.declineReason || "",
    declineNote: existing.declineNote || "",
    adminNote: existing.adminNote || "",
    notifiedAt: existing.notifiedAt || null,
  });
}

function upsertMatchOutreach(requestId, businessId) {
  const match = data.matches.find((item) => item.requestId === requestId && item.businessId === businessId) || { requestId, businessId };
  const fromStatus = match.status || "suggested";
  match.outreachStatus = "sent";
  match.outreachAt = new Date().toISOString();
  match.status = deriveMatchStatus(match);
  const index = data.matches.findIndex((item) => item.requestId === requestId && item.businessId === businessId);
  if (index === -1) data.matches.push(match);
  saveData(data);
  syncMatchDecision({
    requestId,
    businessId,
    status: match.status,
    fromStatus,
    nonprofitDecision: match.nonprofitDecision || "",
    businessDecision: match.businessDecision || "",
    outreachStatus: match.outreachStatus,
    outreachMessage: match.outreachMessage || "",
    outreachAt: match.outreachAt,
    declineReason: match.declineReason || "",
    declineNote: match.declineNote || "",
    adminNote: match.adminNote || "",
    notifiedAt: match.notifiedAt || match.outreachAt,
  });
}

function upsertMatchFeedback(requestId, businessId, fields) {
  const existing = data.matches.find((match) => match.requestId === requestId && match.businessId === businessId);
  if (existing) Object.assign(existing, fields);
  else data.matches.push({ requestId, businessId, status: "recommended", ...fields });
  saveData(data);
  const updated = data.matches.find((match) => match.requestId === requestId && match.businessId === businessId);
  syncMatchFeedback({
    requestId,
    businessId,
    declineReason: updated?.declineReason || "",
    declineNote: updated?.declineNote || "",
    adminNote: updated?.adminNote || "",
  });
}

// In-app notifications live in the same shared local data as everything else,
// so demo role switching can show them in one browser. Gmail notifications are
// sent separately by the server when OAuth has been configured.
function addNotification({ forEmail, message, requestId, businessId, type = "workflow" }) {
  if (!forEmail) return;
  data.notifications = data.notifications || [];
  const normalizedEmail = forEmail.trim().toLowerCase();
  if (data.notifications.some((notification) => notification.forEmail === normalizedEmail && notification.requestId === requestId && notification.businessId === businessId && notification.type === type && notification.message === message)) return;
  data.notifications.push({
    id: `notif-${crypto.randomUUID()}`,
    forEmail: normalizedEmail,
    message,
    requestId,
    businessId,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveData(data);
}

function triggerGmailNotification({ subject, text }) {
  void fetch("/api/gmail/send-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, text }),
  }).catch(() => {});
}

function notifyAdminOfSuggestedMatches(kind, record) {
  if (!record) return;
  const matches = kind === "business"
    ? buildMatches(data.campaignRequests, [record], data.matches)
    : buildMatches([record], data.businesses, data.matches);
  matches.filter((match) => !["declined", "on_hold"].includes(match.status)).forEach((match) => {
    const completedBy = kind === "business" ? match.business.name : match.request.organizationName;
    const message = `New Raise Local match: ${match.request.organizationName} + ${match.business.name}. ${completedBy} completed the intro quiz and a potential partner match is ready for review.`;
    const alreadyNotified = (data.notifications || []).some((notification) => notification.type === "suggested_match" && notification.requestId === match.request.id && notification.businessId === match.business.id);
    if (alreadyNotified) return;
    ["demo@raiselocal.local", "admin@raiselocal.local"].forEach((email) => addNotification({
      forEmail: email,
      message,
      requestId: match.request.id,
      businessId: match.business.id,
      type: "suggested_match",
    }));
    triggerGmailNotification({
      subject: `New client match to review: ${match.request.organizationName} + ${match.business.name}`,
      text: `${message}\n\nPlease log in to Raise Local to review your client's matches and follow up if either side needs help moving forward. One or both parties may still need to respond.`,
    });
  });
}

function notifyMutualApproval(match) {
  const message = `${match.request.organizationName} and ${match.business.name} both approved a Raise Local match. Review the partnership and coordinate the introduction.`;
  ["demo@raiselocal.local", match.request.email, match.business.email].forEach((email) => addNotification({
    forEmail: email,
    message,
    requestId: match.request.id,
    businessId: match.business.id,
    type: "mutual_approval",
  }));
  triggerGmailNotification({
    subject: `Raise Local match approved: ${match.request.organizationName} + ${match.business.name}`,
    text: `${message}\n\nSuggested next step: review the match details and coordinate the introduction from the Raise Local Outreach workspace.`,
  });
}

function myNotifications() {
  const email = myEmail();
  return (data.notifications || []).filter((n) => n.forEmail === email).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Approve/Deny/Hold map onto the existing match statuses — no new status
// values needed. Approve notifies the other side; deny/hold are silent.
function respondToMatch(match, decision) {
  const decisionMap = { approve: "approved", deny: "declined", hold: "held" };
  upsertMatchDecision(match.request.id, match.business.id, myRole(), decisionMap[decision]);
}

// A rating is a trait of the entity being rated, not of the match — it's
// written onto the counterpart's own record so it shows up everywhere that
// record appears (its own profile page, the pool directory, etc.), the same
// way the seeded businesses already carry a rating/reviewNote.
function submitRating(match, rating, note) {
  const iAmBusiness = myRole() === "business";
  const record = iAmBusiness ? data.campaignRequests.find((r) => r.id === match.request.id) : data.businesses.find((b) => b.id === match.business.id);
  if (record) {
    const fields = { rating, reviewNote: note };
    if (!iAmBusiness && rating <= QUALITY_REVIEW_THRESHOLD) fields.qualityStatus = "needs_review";
    Object.assign(record, fields);
    if (!iAmBusiness) syncBusinessRating(record, rating, note);
  }
  saveData(data);
}

function entityInitials(name) {
  return String(name || "RL")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function entityVisual(name, photo, kind) {
  const brandClass = isBrandAsset(photo) ? " brand-photo" : "";
  return `<div class="directory-card-media${brandClass}"><img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy" /></div>`;
}

function requestCard(request, { showCompleteProfile = false, adminDirectory = false } = {}) {
  const photo = requestPhoto(request);
  return `
    <article class="entity-card directory-card">
      <div class="directory-card-top">
        <span class="opportunity-kind opportunity-nonprofit">Nonprofit request</span>
        <span class="directory-location">${ICONS.mapPin} ${escapeHtml(request.geography || "Local")}</span>
      </div>
      ${entityVisual(request.organizationName, photo, "nonprofit")}
      <div class="directory-identity">
        <div>
          <h3>${escapeHtml(request.organizationName)}</h3>
          <p class="muted">${escapeHtml(request.organizationType)} · $${Number(request.fundingGoal || 0).toLocaleString()} goal</p>
        </div>
      </div>
      <div class="directory-card-copy">
        <h4>${escapeHtml(request.eventType || "Campaign opportunity")}</h4>
        <p>${escapeHtml(request.campaignDescription)}</p>
      </div>
      <div class="directory-meta">
        <span>${ICONS.calendar} ${escapeHtml(request.startDate || "Ongoing")}</span>
        <span>${ICONS.users} ${Number(request.idealSize || request.minimumSize || 0).toLocaleString()} capacity</span>
      </div>
      <div class="tag-row">
        <span class="tag">${escapeHtml(request.causeArea)}</span>
        <span class="tag">${escapeHtml(request.businessPreference)}</span>
        <span class="tag">${escapeHtml(campaignStage(request))}</span>
      </div>
      <div class="directory-card-footer">
        ${adminDirectory ? `<div class="directory-card-actions"><button type="button" class="link-btn" data-view-entity data-entity-type="request" data-entity-id="${escapeHtml(request.id)}">View details ${ICONS.arrowRight}</button><button type="button" class="secondary-btn" data-complete-profile="request" data-record-id="${escapeHtml(request.id)}">Complete profile</button></div>` : showCompleteProfile ? `<button type="button" class="link-btn" data-complete-profile="request" data-record-id="${escapeHtml(request.id)}">Complete profile ${ICONS.arrowRight}</button>` : `<button type="button" class="link-btn" data-view-entity data-entity-type="request" data-entity-id="${escapeHtml(request.id)}">View details ${ICONS.arrowRight}</button>`}
      </div>
      ${request.successDetails ? `<p class="small-note directory-outcome">Outcome: ${escapeHtml(request.successDetails)}</p>` : ""}
    </article>
  `;
}

function businessCard(business, { showCompleteProfile = false, adminDirectory = false } = {}) {
  const statusClass = business.unavailable ? "status-active" : business.qualityStatus === "needs_review" ? "status-new" : "status-ready";
  const statusText = business.unavailable ? "paused" : business.qualityStatus === "needs_review" ? "needs review" : "ready";
  const photo = businessPhoto(business);
  return `
    <article class="entity-card directory-card">
      <div class="directory-card-top">
        <span class="opportunity-kind opportunity-business">Business opportunity</span>
        <span class="directory-location">${ICONS.mapPin} ${escapeHtml((business.serviceAreas || ["Local"])[0])}</span>
      </div>
      ${entityVisual(business.name, photo, "business")}
      <div class="directory-identity">
        <div>
          <h3>${escapeHtml(business.name)}</h3>
          <p class="muted">${escapeHtml(business.category)} · <span class="status-pill ${statusClass}">${statusText}</span></p>
        </div>
      </div>
      <div class="directory-card-copy">
        <h4>${escapeHtml(business.businessType || "Local partner")}</h4>
        <p>${escapeHtml(business.notes || "Ready to explore a community partnership.")}</p>
      </div>
      <div class="directory-meta">
        <span>${ICONS.calendar} ${escapeHtml(business.availableFrom || "Timing flexible")}</span>
        <span>${ICONS.users} ${Number(business.maximumCapacity || 0).toLocaleString()} capacity</span>
      </div>
      <div class="tag-row">
        ${[...(business.causeAreas || []), ...(business.contributionTypes || []), ...(business.offerTypes || []), ...(business.fulfillmentOptions || [])].map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="directory-card-footer">
        ${adminDirectory ? `<div class="directory-card-actions"><button type="button" class="link-btn" data-view-entity data-entity-type="business" data-entity-id="${escapeHtml(business.id)}">View details ${ICONS.arrowRight}</button><button type="button" class="secondary-btn" data-complete-profile="business" data-record-id="${escapeHtml(business.id)}">Complete profile</button></div>` : showCompleteProfile ? `<button type="button" class="link-btn" data-complete-profile="business" data-record-id="${escapeHtml(business.id)}">Complete profile ${ICONS.arrowRight}</button>` : `<button type="button" class="link-btn" data-view-entity data-entity-type="business" data-entity-id="${escapeHtml(business.id)}">View details ${ICONS.arrowRight}</button>`}
      </div>
    </article>
  `;
}

function scoreGauge(total) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, total));
  const offset = circumference * (1 - pct / 100);
  const color = pct >= 85 ? "var(--green)" : pct >= 70 ? "var(--success)" : "var(--orange)";
  return `
    <svg width="64" height="64" viewBox="0 0 64 64" class="score-gauge" aria-hidden="true">
      <circle cx="32" cy="32" r="${radius}" fill="none" stroke="#e7f3ee" stroke-width="6" />
      <circle cx="32" cy="32" r="${radius}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"
        stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
        transform="rotate(-90 32 32)" />
      <text x="32" y="30" text-anchor="middle" font-size="16" font-weight="800" fill="var(--ink)">${Math.round(pct)}</text>
      <text x="32" y="41" text-anchor="middle" font-size="6.5" font-weight="700" fill="var(--muted)">FIT</text>
    </svg>
  `;
}

// Lightweight preview card for the Dashboard's tabbed match browser — photo,
// tags, score gauge, and a link into the full Match Review page for the
// admin controls (status, decline reason, override note).
function matchPreviewCard(match, { viewerIsBusiness = false } = {}) {
  const photo = viewerIsBusiness ? requestPhoto(match.request) : businessPhoto(match.business);
  const brandClass = isBrandAsset(photo) ? " brand-photo" : "";
  return `
    <article class="match-preview-card">
      <span class="match-preview-menu">${ICONS.dots}</span>
      <img class="match-preview-photo${brandClass}" src="${photo}" alt="" loading="lazy" />
      <div class="match-preview-body">
        <div class="tag-row">
          <span class="tag tag-nonprofit">Nonprofit</span>
          <span class="tag">${escapeHtml(match.request.causeArea)}</span>
          <span class="tag-sep">×</span>
          <span class="tag tag-business">Business</span>
          <span class="tag">${escapeHtml(match.business.category)}</span>
        </div>
        <h3>${escapeHtml(match.request.organizationName)} × ${escapeHtml(match.business.name)}</h3>
        <p>${escapeHtml(match.reasons?.[0] || match.forecast || "")}</p>
        <div class="match-preview-meta">
          <span>${ICONS.mapPin} ${escapeHtml(match.request.geography)}</span>
          <span>${ICONS.calendar} ${escapeHtml(match.request.timingPreference || "Timing flexible")}</span>
        </div>
      </div>
      ${scoreGauge(match.total)}
      <div class="match-preview-actions">
        <button type="button" class="primary-btn" data-view-match data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">View Match ${ICONS.arrowRight}</button>
        <button type="button" class="secondary-btn" data-view-match data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">View Details</button>
      </div>
    </article>
  `;
}

// The two-sided consent flow (approve/deny/hold) only gets a match to
// "intro_requested" — someone still has to confirm the partnership is
// actually happening before either side can rate it. Either party can move
// it forward; there's no separate accept step per side (matches the
// single-sided-approval design already used for the intro itself).
function matchProgressionAction(match) {
  if (match.status === "mutually_approved" || match.status === "outreach_pending") {
    if (isAdmin()) return `<button type="button" class="secondary-btn" data-progress-status="outreach_sent" data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Send outreach ${ICONS.arrowRight}</button>`;
    return `<p class="notification-note">Both sides approved. Raise Local is coordinating outreach.</p>`;
  }
  if (match.status === "outreach_sent") {
    return `<button type="button" class="secondary-btn" data-progress-status="accepted" data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Confirm partnership ${ICONS.check}</button>`;
  }
  if (match.status === "accepted") {
    return `<button type="button" class="secondary-btn" data-progress-status="active" data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Mark campaign active ${ICONS.arrowRight}</button>`;
  }
  if (match.status === "active") {
    return `<button type="button" class="secondary-btn" data-progress-status="completed" data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Mark campaign complete ${ICONS.check}</button>`;
  }
  return "";
}

function matchDecisionActions(match) {
  if (isAdmin()) return "";
  const decisionField = myRole() === "business" ? "businessDecision" : "nonprofitDecision";
  const decision = match[decisionField];
  if (decision) {
    const label = decision === "approved" ? "Approved" : decision === "held" ? "On hold" : "Declined";
    return `<section class="panel match-detail-decision"><p class="eyebrow">Your decision</p><strong>${label}</strong><p class="muted">${decision === "approved" ? "The other side can now review this opportunity. Outreach begins after both sides approve." : decision === "held" ? "This match is saved for later. You can reconsider it from Match Review." : "This match will remain out of your active review list."}</p></section>`;
  }
  return `
    <section class="panel match-detail-decision">
      <p class="eyebrow">Your decision</p>
      <p class="muted">Choose what should happen with this suggested partnership.</p>
      <div class="match-detail-decision-actions">
        <button type="button" class="triage-btn deny" data-detail-decision="deny" aria-label="Decline this match">${ICONS.close}<span>Decline</span></button>
        <button type="button" class="triage-btn hold" data-detail-decision="hold" aria-label="Hold this match for later">${ICONS.bookmark}<span>Hold</span></button>
        <button type="button" class="triage-btn approve" data-detail-decision="approve" aria-label="Approve this match">${ICONS.check}<span>Approve</span></button>
      </div>
    </section>
  `;
}

function wireMatchProgressionButtons() {
  root.querySelectorAll("[data-progress-status]").forEach((button) => {
    button.addEventListener("click", () => {
      upsertMatchStatus(button.dataset.requestId, button.dataset.businessId, button.dataset.progressStatus);
      render();
    });
  });
}

function matchCard(match, { showAdminControls = false, showRating = false, showViewDetails = true } = {}) {
  const nonprofitImage = requestPhoto(match.request);
  const businessImage = businessPhoto(match.business);
  const nonprofitBrand = isBrandAsset(nonprofitImage) ? " brand-photo" : "";
  const businessBrand = isBrandAsset(businessImage) ? " brand-photo" : "";
  return `
    <article class="match-card">
      <div class="match-visual" aria-label="${escapeHtml(match.request.organizationName)} and ${escapeHtml(match.business.name)}">
        <div class="match-visual-half">
          <img class="match-visual-photo${nonprofitBrand}" src="${nonprofitImage}" alt="${escapeHtml(match.request.organizationName)}" loading="lazy" />
          <span class="match-visual-label">Cause</span>
        </div>
        <div class="match-visual-half">
          <img class="match-visual-photo${businessBrand}" src="${businessImage}" alt="${escapeHtml(match.business.name)}" loading="lazy" />
          <span class="match-visual-label">Business</span>
        </div>
        <div class="match-score-badge">
          <span>${escapeHtml(match.label)}</span>
          <strong>${match.total}</strong>
          <small>fit</small>
        </div>
      </div>
      <div class="match-card-body">
        <div class="match-head">
          <div>
            <h3>${escapeHtml(match.request.organizationName)} <span aria-hidden="true">+</span> ${escapeHtml(match.business.name)}</h3>
            <p class="muted">${escapeHtml(match.request.causeArea)} · ${escapeHtml(match.request.geography)}</p>
          </div>
          <span class="status-pill status-ready">${escapeHtml(statusLabel(match.status))}</span>
        </div>
        <p class="match-summary">${escapeHtml(match.reasons?.[0] || match.request.campaignDescription)}</p>
        <p class="forecast">${escapeHtml(match.forecast)}</p>
        <p class="muted match-goals">Business goals: ${escapeHtml((match.business.businessGoals || []).slice(0, 3).join(", ") || "Not captured yet")}</p>
        <p class="match-consent">Nonprofit: <strong>${escapeHtml(statusLabel(match.nonprofitDecision || "awaiting"))}</strong> · Business: <strong>${escapeHtml(statusLabel(match.businessDecision || "awaiting"))}</strong></p>
        <div class="tag-row">${match.reasons.slice(0, 4).map((reason) => `<span class="tag">${escapeHtml(reason)}</span>`).join("")}</div>
        <details class="decision-path">
          <summary>See why this match fits</summary>
          <p class="small-note">The transparent matching assistant checked these criteria before recommending this partnership.</p>
          <ul>
            ${(match.decisionStages || []).map((stage) => `<li class="${stage.passed ? "passed" : "blocked"}"><strong>${escapeHtml(stage.label)}:</strong> ${stage.passed ? escapeHtml(stage.reason || "Passed") : escapeHtml(stage.blocker || "Blocked")}</li>`).join("")}
          </ul>
        </details>
      </div>
      ${match.notifiedAt ? `<p class="notification-note">Mutual approval recorded for ${escapeHtml(match.request.organizationName)} and ${escapeHtml(match.business.name)} on ${formatDateTime(match.notifiedAt)}.</p>` : ""}
      ${
        showAdminControls
          ? `
      <div class="match-actions">
        ${showViewDetails ? `<button type="button" class="secondary-btn" data-view-match data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">View details ${ICONS.arrowRight}</button>` : ""}
        <label for="status-${escapeHtml(match.id)}">Workflow status</label>
        <select id="status-${escapeHtml(match.id)}" data-status-update data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">
          ${MATCH_STATUSES.map((status) => `<option value="${status}" ${match.status === status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}
        </select>
        <label for="decline-${escapeHtml(match.id)}">Decline reason / note</label>
        <select id="decline-${escapeHtml(match.id)}" data-decline-reason data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">
          <option value="">Choose if declined</option>
          ${DECLINE_REASONS.map((reason) => `<option value="${reason}" ${match.declineReason === reason ? "selected" : ""}>${reason}</option>`).join("")}
        </select>
        <textarea data-decline-note data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}" rows="2" placeholder="Optional note for learning why this was not a fit">${escapeHtml(match.declineNote || "")}</textarea>
        <label for="admin-${escapeHtml(match.id)}">Admin override / intro note</label>
        <textarea id="admin-${escapeHtml(match.id)}" data-admin-note data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}" rows="2" placeholder="Manual recommendation, intro context, or override reason">${escapeHtml(match.adminNote || "")}</textarea>
        ${["mutually_approved", "outreach_pending"].includes(match.status) ? `<button type="button" class="primary-btn" data-outreach-send data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Send outreach ${ICONS.arrowRight}</button>` : ""}
        ${match.status === "outreach_sent" ? `<p class="notification-note">Outreach sent${match.outreachAt ? ` on ${escapeHtml(formatDateTime(match.outreachAt))}` : ""}.</p>` : ""}
        ${match.status === "outreach_sent" ? `<button type="button" class="secondary-btn" data-progress-status="accepted" data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Confirm partnership ${ICONS.check}</button>` : ""}
        ${match.status === "accepted" ? `<button type="button" class="secondary-btn" data-progress-status="active" data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Mark campaign active ${ICONS.arrowRight}</button>` : ""}
        ${match.status === "active" ? `<button type="button" class="secondary-btn" data-progress-status="completed" data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Mark campaign complete ${ICONS.check}</button>` : ""}
      </div>`
          : matchProgressionAction(match)
      }
      ${showRating ? ratingWidget(match) : ""}
    </article>
  `;
}


render();
