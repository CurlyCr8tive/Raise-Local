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
  scoreMatch,
  splitSelections,
} from "./matching.js?v=3607856";
import { loadData, resetDemoData, saveData } from "./storage.js";
import { syncBusinessProfile, syncBusinessQuality, syncBusinessRating, syncCampaignRequest } from "./remote-sync.js";
import { supabase } from "./supabase-client.js";
import { HERO_PHOTO, businessPhoto, requestPhoto } from "./photos.js";
import { ICONS } from "./icons.js";
import { escapeHtml, formatDateTime, statusLabel } from "./format.js";
import { emptyState, wireEmptyStates } from "./ui.js";

let data = loadData();
let activeView = "dashboard";
let dashboardTab = "matches"; // "matches" | "own" | "counterpart"
let dashboardSort = "best"; // "best" | "name"
let matchCauseFilter = "all";
let matchLoaderShown = false;
const QUALITY_REVIEW_THRESHOLD = 2.5;

let quizAudience = null; // "request" | "business"
let quizPhase = "choose"; // "choose" | "core" | "profile"
let quizStep = 0;
let quizAnswers = {};
let quizConfirmation = "";
let quizActiveRecordId = null;
let quizResultsPreview = null;

// Pre-auth flow: landing -> quiz-choose -> quiz -> register -> verify-sent
// -> (user clicks emailed link) -> set-password -> authenticated app.
let session = null;
let authLoading = true;
let authScreen = "landing";
let authError = "";
let pendingEmail = "";

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
  supabase.auth.signOut();
});

document.getElementById("topbar-logout-btn").addEventListener("click", () => {
  supabase.auth.signOut();
});

document.getElementById("topbar-account-btn").addEventListener("click", () => {
  const menu = document.getElementById("topbar-account-menu");
  menu.hidden = !menu.hidden;
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
    activeView = button.dataset.view;
    render();
  });
});

function passwordAlreadySet() {
  return Boolean(session?.user?.user_metadata?.password_set);
}

// No invite flow yet — an account becomes admin only by someone with
// Supabase dashboard access setting user_metadata.role to "admin" for that
// user directly (Authentication -> Users -> edit raw user metadata).
// Everyone else defaults to the role captured at quiz signup.
function isAdmin() {
  return session?.user?.user_metadata?.role === "admin";
}

function myRole() {
  return session?.user?.user_metadata?.role === "business" ? "business" : "nonprofit";
}

function myEmail() {
  return (session?.user?.email || "").trim().toLowerCase();
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
    authScreen = "landing";
    quizAudience = null;
    quizPhase = "choose";
  } else if (session) {
    determinePostSessionScreen();
  }
  authLoading = false;
  render();
});

function setTitle(text) {
  title.textContent = text;
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === activeView));
}

function currentMatches() {
  return buildMatches(data.campaignRequests, data.businesses, data.matches);
}

const NONPROFIT_CORE_QUESTIONS = [
  { key: "organizationName", label: "What's your organization called?", type: "text", placeholder: "PS 118 PTA" },
  { key: "organizationType", label: "What type of organization are you?", type: "single", options: ORGANIZATION_TYPES },
  { key: "causeArea", label: "What cause are you raising funds for?", type: "single", options: CAUSE_AREAS },
  { key: "campaignDescription", label: "In one line, what's the campaign for?", type: "text", placeholder: "New playground equipment, weekend meal bags, art supplies..." },
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
  { key: "name", label: "What's your business called?", type: "text", placeholder: "YAMAAS! Olive Oil" },
  { key: "category", label: "What type of business are you?", type: "single", options: BUSINESS_CATEGORIES.filter((item) => item !== "No preference") },
  { key: "causeAreas", label: "What causes do you want to support?", type: "multi", options: CAUSE_AREAS },
  { key: "offerTypes", label: "What can you offer campaigns?", type: "multi", options: SUPPORT_NEEDS },
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

function activeQuestionList() {
  if (quizPhase === "profile") {
    return quizAudience === "business" ? BUSINESS_PROFILE_QUESTIONS : NONPROFIT_PROFILE_QUESTIONS;
  }
  const core = quizAudience === "business" ? BUSINESS_CORE_QUESTIONS : NONPROFIT_CORE_QUESTIONS;
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
  if (activeView === "brief" && !isAdmin()) activeView = "dashboard";

  const views = {
    dashboard: renderDashboard,
    requests: renderRequests,
    businesses: renderBusinesses,
    matches: renderMatches,
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
  const notifs = isAdmin() ? [] : myNotifications();
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
        <p class="muted">Your profile details help Raise Local find workable partners. They are used for matching and operations, not presented as an open marketplace listing.</p>
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
        <p class="small-note">Profile visibility controls and Supabase-backed account settings will be added when the remote account connection is enabled.</p>
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
  root.querySelector("[data-settings-logout]")?.addEventListener("click", () => supabase.auth.signOut());
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
        <p class="landing-copy">We connect Local Causes with Small Businesses ready to partner and grow together. Answer a few quick questions to see your matches.</p>
        <div class="landing-actions">
          <button class="primary-btn" type="button" id="landing-start">Find My Match</button>
          <button class="secondary-btn" type="button" id="landing-login">Log In</button>
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
      <p class="eyebrow">Find My Match</p>
      <h2>Which one are you?</h2>
      <section class="quiz-choice-grid" aria-label="Choose your path" style="margin-top:18px;">
        <button type="button" class="choice-card" data-quiz-audience="request">
          <span>For nonprofits &amp; schools</span>
          <strong>I am a nonprofit / school.</strong>
          <small>Tell us your goal, cause, and location so we only send workable matches.</small>
        </button>
        <button type="button" class="choice-card" data-quiz-audience="business">
          <span>For local businesses</span>
          <strong>I am a small business.</strong>
          <small>Tell us what you offer and where you serve so we only send workable requests.</small>
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
      <h2>Log in to Raise Local.</h2>
      ${authError ? `<p class="form-error">${escapeHtml(authError)}</p>` : ""}
      <form id="login-form">
        <div class="field-row"><label for="login-email">Email</label><input id="login-email" type="email" required placeholder="you@example.org" /></div>
        <div class="field-row"><label for="login-password">Password</label><input id="login-password" type="password" required placeholder="Your password" /></div>
        <button class="primary-btn" type="submit" style="width:100%;">Log In</button>
      </form>
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
  if (question.type === "textarea") {
    return `<textarea id="quiz-answer" rows="4" placeholder="${escapeHtml(question.placeholder || "")}">${escapeHtml(saved || "")}</textarea>`;
  }
  return `<input id="quiz-answer" type="${escapeHtml(question.type)}" placeholder="${escapeHtml(question.placeholder || "")}" value="${escapeHtml(saved || "")}" />`;
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = questions[quizStep];
    const answer = readQuizAnswer(question);
    if (isBlankAnswer(question, answer)) return;
    quizAnswers[question.key] = answer;
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
  if (quizAudience === "business") {
    const business = businessFromQuizAnswers();
    data.businesses = [business, ...data.businesses];
    quizActiveRecordId = business.id;
    quizResultsPreview = computeMatchPreview("business", business);
    syncBusinessProfile(business);
  } else {
    const request = requestFromQuizAnswers();
    data.campaignRequests = [request, ...data.campaignRequests];
    quizActiveRecordId = request.id;
    quizResultsPreview = computeMatchPreview("request", request);
    syncCampaignRequest(request);
  }
  saveData(data);
  pendingEmail = quizAnswers.contact?.email || "";
  authError = "";
  authScreen = "register";
  render();
}

// Reached only post-auth, from the "Complete Profile" link on a Campaign
// Requests / Business Profiles card — not part of the pre-auth quiz funnel.
function finishProfileQuiz() {
  if (quizAudience === "business") {
    const business = data.businesses.find((item) => item.id === quizActiveRecordId);
    if (business) Object.assign(business, businessProfilePatch());
  } else {
    const request = data.campaignRequests.find((item) => item.id === quizActiveRecordId);
    if (request) Object.assign(request, requestProfilePatch());
  }
  saveData(data);
  quizConfirmation = "Profile completed — thanks for the extra detail. It helps Raise Local recommend stronger matches.";
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
    fundingGoal: Number(quizAnswers.fundingGoal) || 0,
    startDate: "",
    endDate: "",
    partnershipDeadline: "",
    timingPreference: quizAnswers.timingPreference,
    causeArea: quizAnswers.causeArea,
    businessPreference: quizAnswers.preferredCategories?.[0] || "No preference",
    preferredCategories: quizAnswers.preferredCategories || [],
    eventType: "",
    partnershipTypesNeeded: quizAnswers.partnershipTypesNeeded || [],
    supportNeeds: quizAnswers.supportNeeds || [],
    expectedParticipation: 0,
    minimumSize: 0,
    idealSize: 0,
    geography: quizAnswers.geography,
    mustHaves: "",
    niceToHaves: "",
    priorFundraiser: "",
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
  const matches = currentMatches();
  const accepted = matches.filter((match) => match.status === "accepted").length;
  const launched = matches.filter((match) => match.status === "launched").length;
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
      <button type="button" class="metric-card metric-link" data-dashboard-target="matches"><span>Accepted / Launched</span><strong>${accepted} / ${launched}</strong></button>
    </section>

    <section class="panel">
      <h2>Top Match To Review</h2>
      ${topMatch ? matchCard(topMatch) : `<p class="muted">Add one campaign request and one business profile to see matches.</p>`}
    </section>
  `;
  root.querySelectorAll("[data-dashboard-target]").forEach((button) => {
    button.addEventListener("click", () => {
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
    : `<p class="muted">No matches yet — check back as new businesses and campaigns join Raise Local.</p>`;
}

const HERO_STICKERS = ["Local", "Businesses.", "Brighter", "Futures."];

function renderRoleDashboard() {
  setTitle("Raise Local Dashboard");
  const isBusinessViewer = myRole() === "business";
  const own = isBusinessViewer ? myOwnBusinesses() : myOwnRequests();
  const matches = myMatches();
  const counterpart = isBusinessViewer ? data.campaignRequests : data.businesses;
  const accepted = matches.filter((m) => m.status === "accepted").length;
  const launched = matches.filter((m) => m.status === "launched").length;
  const name = session?.user?.email?.split("@")[0] || "";

  const impactItems = [
    { done: own.length > 0, label: `Submit your ${isBusinessViewer ? "business profile" : "campaign request"}` },
    { done: matches.length > 0, label: "Review your first matches" },
    { done: accepted + launched > 0, label: "Accept or launch a partnership" },
    { done: own.some((r) => isProfileComplete(r, isBusinessViewer)), label: "Complete your full profile" },
  ];

  const stats = [
    { icon: "users", tint: "tint-peach", label: isBusinessViewer ? "Business Profile" : "Campaign Requests", value: own.length, caption: own.length ? "Submitted" : "Not started yet" },
    { icon: "briefcase", tint: "tint-blue", label: isBusinessViewer ? "Campaign Requests" : "Business Profiles", value: counterpart.length, caption: "In the matchmaking pool" },
    { icon: "heart", tint: "tint-pink", label: "Potential Matches", value: matches.length, caption: "Ready for your review" },
    { icon: "link", tint: "tint-teal", label: "Accepted", value: accepted, caption: accepted ? "Partnerships confirmed" : "None yet" },
    { icon: "send", tint: "tint-gray", label: "Launched", value: launched, caption: launched ? "Live partnerships" : "Get your first one live!" },
  ];

  root.innerHTML = `
    <section class="dashboard-hero">
      <div class="hero-copy">
        <p class="eyebrow">Welcome back${name ? `, ${escapeHtml(name)}` : ""}</p>
        <h2>Build Local Partnerships.<br />Create Real Impact.</h2>
        <p>Review matches, ${isBusinessViewer ? "support local causes" : "connect with local businesses"}, and bring meaningful collaborations to life.</p>
        <div class="landing-actions">
          <button type="button" class="primary-btn hero-cta" data-dashboard-target="matches">View New Matches ${ICONS.arrowRight}</button>
          <button type="button" class="secondary-btn" data-dashboard-target="requests">${isBusinessViewer ? "Update My Profile" : "Post a Campaign"}</button>
        </div>
      </div>
      <div class="hero-photo-wrap">
        <img class="hero-photo" src="${HERO_PHOTO}" alt="" loading="lazy" />
        ${HERO_STICKERS.map((text, i) => `<span class="hero-sticker sticker-${i}">${escapeHtml(text)}</span>`).join("")}
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
          ${renderDashboardTabContent(dashboardTab, { matches, own, counterpart, isBusinessViewer, sortMode: dashboardSort })}
        </section>
      </div>

      <aside class="dashboard-sidebar">
        <section class="panel sidebar-widget">
          <h3>${ICONS.leaf} Your Impact in Progress</h3>
          <p class="muted">Local partnerships create stronger communities.</p>
          <ul class="impact-checklist">
            ${impactItems.map((item) => `<li class="${item.done ? "done" : ""}"><span class="checklist-dot">${item.done ? ICONS.check : ""}</span>${escapeHtml(item.label)}</li>`).join("")}
          </ul>
        </section>

        <section class="panel sidebar-widget">
          <h3>Recent Activity</h3>
          <ul class="activity-feed">
            <li>
              <span class="activity-icon tint-teal">${ICONS.link}</span>
              <div><strong>Activity feed</strong><span class="muted small-note">Coming soon — will show real match and profile updates.</span></div>
            </li>
          </ul>
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
      activeView = "matches";
      render();
    });
  });
  document.getElementById("dashboard-sort").addEventListener("change", (event) => {
    dashboardSort = event.target.value;
    render();
  });
}

// This nav slot is admin-global ("Campaign Requests") for admins, but for a
// logged-in nonprofit it's their own submitted request, and for a logged-in
// business — which has no campaign request of its own — it becomes their own
// business profile instead. See renderBusinesses() for the matched-
// counterpart slot this pairs with.
function renderRequests() {
  if (isAdmin()) {
    setTitle("Campaign Requests");
    const banner = quizConfirmation ? `<section class="success-banner" role="status">${escapeHtml(quizConfirmation)}</section>` : "";
    quizConfirmation = "";
    root.innerHTML = `
      ${banner}
      <section class="panel"><h2>Nonprofit Intake</h2>${requestForm()}</section>
      <section class="entity-list">${data.campaignRequests.map((r) => requestCard(r, { showCompleteProfile: true })).join("")}</section>
    `;
    wireRequestForm();
    wireCompleteProfileLinks();
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
  const banner = quizConfirmation ? `<section class="success-banner" role="status">${escapeHtml(quizConfirmation)}</section>` : "";
  quizConfirmation = "";
  const own = kind === "business" ? myOwnBusinesses() : myOwnRequests();
  const card = kind === "business" ? businessCard : requestCard;
  // No "start a fresh quiz while already logged in" flow exists yet — the
  // quiz is currently pre-auth only (landing → quiz → register). So this
  // empty state has no action button until that's built; see redesign audit.
  const empty = emptyState({
    icon: { svg: ICONS[kind === "business" ? "briefcase" : "document"], tint: "icon-tint-mint" },
    title: kind === "business" ? "No business profile yet" : "No campaign request yet",
    body: `You haven't submitted a ${kind === "business" ? "business profile" : "campaign request"} yet. Take the Match Finder quiz to create one and start getting matched.`,
  });
  const otherSide = kind === "business" ? "local causes" : "local businesses";

  const activityPanel = own.length ? matchActivityPanel(myMatches(), otherSide) : "";

  root.innerHTML = `
    ${banner}
    ${activityPanel}
    <section class="panel"><p class="muted">Your submitted ${kind === "business" ? "business profile" : "campaign request"}. Use "Complete profile" for stronger matches.</p></section>
    <section class="entity-list">${own.length ? own.map((record) => card(record, { showCompleteProfile: true })).join("") : empty}</section>
  `;
  wireCompleteProfileLinks();
  root.querySelector("[data-goto-matches]")?.addEventListener("click", () => {
    activeView = "matches";
    render();
  });
}

function matchActivityPanel(matches, otherSide) {
  const interested = matches.filter((m) => ["intro_requested", "accepted", "launched"].includes(m.status)).length;
  const accepted = matches.filter((m) => ["accepted", "launched"].includes(m.status)).length;
  const launched = matches.filter((m) => m.status === "launched").length;

  if (!matches.length) {
    return `
      <section class="panel match-activity">
        <h2>Match Activity</h2>
        <p class="muted">No matches yet — once a compatible ${otherSide === "nonprofits" ? "nonprofit" : "business"} joins Raise Local, you'll see it here.</p>
      </section>
    `;
  }

  return `
    <section class="panel match-activity">
      <h2>Match Activity</h2>
      <div class="activity-stats">
        <div><strong>${matches.length}</strong><span>Total matches</span></div>
        <div><strong>${interested}</strong><span>Interested</span></div>
        <div><strong>${accepted}</strong><span>Accepted</span></div>
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
  if (isAdmin()) {
    setTitle("Business Profiles");
    const banner = quizConfirmation ? `<section class="success-banner" role="status">${escapeHtml(quizConfirmation)}</section>` : "";
    quizConfirmation = "";
    root.innerHTML = `
      ${banner}
      <section class="panel"><h2>Business Match Profile</h2>${businessForm()}</section>
      ${qualityReviewPanel()}
      <section class="entity-list">${data.businesses.map((b) => businessCard(b, { showCompleteProfile: true })).join("")}</section>
    `;
    wireBusinessForm();
    wireCompleteProfileLinks();
    wireQualityControls();
    return;
  }

  const isBusinessViewer = myRole() === "business";
  setTitle(isBusinessViewer ? "Campaign Requests" : "Business Profiles");
  const pool = isBusinessViewer ? data.campaignRequests : data.businesses;
  const card = isBusinessViewer ? requestCard : businessCard;
  const noun = isBusinessViewer ? "campaign requests" : "businesses";
  root.innerHTML = `
    <section class="panel"><p class="muted">All ${noun} in the matchmaking pool. Your strongest, scored matches are on Match Review.</p></section>
    <section class="entity-list">${pool.length ? pool.map((record) => card(record, { showCompleteProfile: false })).join("") : `<p class="muted">Nothing in the pool yet. Once a ${isBusinessViewer ? "nonprofit" : "business"} completes the Match Finder quiz, it'll show up here.</p>`}</section>
  `;
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
  if (isAdmin()) {
    renderAdminMatchReview();
    return;
  }
  renderMatchTriage();
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
      <h2>Recommended Matches</h2>
      <p class="muted">A match appears only when the must-haves work. Recommendations explain why they fit, surface the strongest 3-5 options, and record accept, pass, save, introduction, and admin override decisions.</p>
      ${causeFilterHtml(causes)}
    </section>
    <section class="match-grid">${matches.length ? matches.map((match) => matchCard(match, { showAdminControls: true })).join("") : `<p class="muted">No matches yet.</p>`}</section>
  `;
  wireCauseFilter();
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
        <h2>Finding matches that fit.</h2>
        <p class="muted">We are comparing cause, location, capacity, partnership type, and timing.</p>
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

  const fresh = filtered.filter((m) => m.status === "recommended");
  const active = filtered.filter((m) => ["intro_requested", "accepted", "launched"].includes(m.status));
  const bin = filtered.filter((m) => ["declined", "saved"].includes(m.status));

  root.innerHTML = `
    <section class="panel">
      <h2>Your Matches</h2>
      <p class="muted">Approve, deny, or hold on each new match below. Once you approve, they're notified — you can rate a partner once you've worked together.</p>
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
            <button type="button" class="triage-btn deny" data-decision="deny" aria-label="Deny this match">${ICONS.close}</button>
            <button type="button" class="triage-btn hold" data-decision="hold" aria-label="Hold this match for later">${ICONS.bookmark}</button>
            <button type="button" class="triage-btn approve" data-decision="approve" aria-label="Approve this match">${ICONS.check}</button>
          </div>
        </div>
        <div class="flip-card-back">
          <span class="flip-check">${ICONS.check}</span>
          <h3>You've started a match with ${escapeHtml(name)}!</h3>
          <p class="muted">They've been notified — follow up from Active Matches.</p>
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
      upsertMatchStatus(button.dataset.requestId, button.dataset.businessId, "recommended");
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
            <li>Accept, decline, and launch statuses.</li>
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
        ${inputField("request-org", "Organization name", "PS 118 Art Room")}
        ${selectField("request-type", "Organization type", ORGANIZATION_TYPES)}
        ${inputField("request-contact", "Contact name", "Jordan Lee")}
        ${inputField("request-email", "Email", "contact@example.org", "email")}
        ${inputField("request-phone", "Phone", "555-0100", "tel")}
        ${inputField("request-goal", "Funding goal", "5000", "number")}
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
      ${inputField("request-geo", "Local geography", "Neighborhood, borough, or zip code")}
      <div class="field-row">
        <label for="request-description">What is the campaign for?</label>
        <textarea id="request-description" rows="3" required></textarea>
      </div>
      <div class="quiz-intro">
        <p class="eyebrow">Step 4 of 4</p>
        <h3>Separate must-haves from nice-to-haves.</h3>
      </div>
      <div class="form-grid">
        ${textAreaField("request-must", "Must-haves", "What would make a match impossible if missing?")}
        ${textAreaField("request-nice", "Nice-to-haves", "What would make the match even better?")}
      </div>
      <div class="field-row">
        <label for="request-prior">Have you run a fundraiser like this before?</label>
        <input id="request-prior" placeholder="Yes/no, and platform if yes" />
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
        ${inputField("business-name", "Business name", "YAMAAS! Olive Oil")}
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
        ${inputField("business-unit-value", "Estimated contribution per unit", "15", "number")}
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

function inputField(id, label, placeholder = "", type = "text") {
  return `<div class="field-row"><label for="${id}">${label}</label><input id="${id}" type="${type}" placeholder="${placeholder}" required /></div>`;
}

function selectField(id, label, options) {
  return `<div class="field-row"><label for="${id}">${label}</label><select id="${id}">${options.map((item) => `<option>${item}</option>`).join("")}</select></div>`;
}

function multiSelectField(id, label, options) {
  return `<div class="field-row"><label for="${id}">${label}</label><select id="${id}" multiple required>${options.map((item) => `<option>${item}</option>`).join("")}</select></div>`;
}

function textAreaField(id, label, placeholder = "") {
  return `<div class="field-row"><label for="${id}">${label}</label><textarea id="${id}" rows="3" placeholder="${placeholder}"></textarea></div>`;
}

function selectedOptions(id) {
  return [...document.getElementById(id).selectedOptions].map((option) => option.value);
}

function wireRequestForm({ fromQuiz = false } = {}) {
  document.getElementById("request-form").addEventListener("submit", (event) => {
    event.preventDefault();
    data.campaignRequests = [
      {
        id: `request-${crypto.randomUUID()}`,
        organizationName: value("request-org"),
        organizationType: value("request-type"),
        contactName: value("request-contact"),
        email: value("request-email"),
        phone: value("request-phone"),
        campaignDescription: value("request-description"),
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
        status: "new",
      },
      ...data.campaignRequests,
    ];
    saveData(data);
    if (fromQuiz) {
      quizConfirmation = "Campaign request saved. Raise Local can now compare it against business profiles.";
      activeView = "matches";
    }
    render();
  });
}

function wireBusinessForm({ fromQuiz = false } = {}) {
  document.getElementById("business-form").addEventListener("submit", (event) => {
    event.preventDefault();
    data.businesses = [
      {
        id: `business-${crypto.randomUUID()}`,
        name: value("business-name"),
        category: value("business-category"),
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
      },
      ...data.businesses,
    ];
    saveData(data);
    if (fromQuiz) {
      quizConfirmation = "Business profile saved. Raise Local can now recommend fit-based campaign opportunities.";
      activeView = "matches";
    }
    render();
  });
}

function value(id) {
  return document.getElementById(id).value.trim();
}

function upsertMatchStatus(requestId, businessId, status) {
  const existing = data.matches.find((match) => match.requestId === requestId && match.businessId === businessId);
  const notificationStatuses = ["intro_requested", "accepted", "launched"];
  const fields = { status };
  if (notificationStatuses.includes(status)) fields.notifiedAt = new Date().toISOString();
  if (existing) Object.assign(existing, fields);
  else data.matches.push({ requestId, businessId, ...fields });
  saveData(data);
}

function upsertMatchFeedback(requestId, businessId, fields) {
  const existing = data.matches.find((match) => match.requestId === requestId && match.businessId === businessId);
  if (existing) Object.assign(existing, fields);
  else data.matches.push({ requestId, businessId, status: "recommended", ...fields });
  saveData(data);
}

// Notifications live in the same shared local data as everything else, so
// they only actually reach a "different" account within the same browser
// (e.g. switching demo logins here) — there's no cross-device push yet.
// That's consistent with the rest of the app's local-first data model.
function addNotification({ forEmail, message, requestId, businessId }) {
  if (!forEmail) return;
  data.notifications = data.notifications || [];
  data.notifications.push({
    id: `notif-${crypto.randomUUID()}`,
    forEmail: forEmail.trim().toLowerCase(),
    message,
    requestId,
    businessId,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveData(data);
}

function myNotifications() {
  const email = myEmail();
  return (data.notifications || []).filter((n) => n.forEmail === email).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Approve/Deny/Hold map onto the existing match statuses — no new status
// values needed. Approve notifies the other side; deny/hold are silent.
function respondToMatch(match, decision) {
  const statusMap = { approve: "intro_requested", deny: "declined", hold: "saved" };
  upsertMatchStatus(match.request.id, match.business.id, statusMap[decision]);
  if (decision !== "approve") return;
  const iAmBusiness = myRole() === "business";
  addNotification({
    forEmail: iAmBusiness ? match.request.email : match.business.email,
    message: `${escapeHtml(iAmBusiness ? match.business.name : match.request.organizationName)} approved a match with you — check them out.`,
    requestId: match.request.id,
    businessId: match.business.id,
  });
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

function requestCard(request, { showCompleteProfile = false } = {}) {
  return `
    <article class="entity-card">
      <img class="entity-photo" src="${requestPhoto(request)}" alt="" loading="lazy" />
      <div class="entity-head">
        <div>
          <h3>${escapeHtml(request.organizationName)}</h3>
          <p class="muted">${escapeHtml(request.organizationType)} · ${escapeHtml(request.geography)} · $${Number(request.fundingGoal).toLocaleString()}</p>
        </div>
        <span class="status-pill status-new">new</span>
      </div>
      <p>${escapeHtml(request.campaignDescription)}</p>
      <p class="muted">${request.rating ? `${request.rating} star rating - ${escapeHtml(request.reviewNote || "No review note")}` : "No rating yet"}</p>
      <div class="tag-row">
        <span class="tag">${escapeHtml(request.causeArea)}</span>
        <span class="tag">${escapeHtml(request.businessPreference)}</span>
        <span class="tag">${escapeHtml(request.eventType || "Campaign")}</span>
        <span class="tag">Size ${Number(request.minimumSize || 0).toLocaleString()}-${Number(request.idealSize || 0).toLocaleString()}</span>
        <span class="tag">${escapeHtml(request.startDate || "No start date")} to ${escapeHtml(request.endDate || "No end date")}</span>
      </div>
      ${showCompleteProfile ? `<button type="button" class="link-btn" data-complete-profile="request" data-record-id="${escapeHtml(request.id)}" style="margin-top:10px;">Complete profile for stronger matches</button>` : ""}
    </article>
  `;
}

function businessCard(business, { showCompleteProfile = false } = {}) {
  const statusClass = business.unavailable ? "status-active" : business.qualityStatus === "needs_review" ? "status-new" : "status-ready";
  const statusText = business.unavailable ? "paused" : business.qualityStatus === "needs_review" ? "needs review" : "ready";
  return `
    <article class="entity-card">
      <img class="entity-photo" src="${businessPhoto(business)}" alt="" loading="lazy" />
      <div class="entity-head">
        <div>
          <h3>${escapeHtml(business.name)}</h3>
          <p class="muted">${escapeHtml(business.category)} · ${escapeHtml((business.serviceAreas || []).join(", "))}</p>
        </div>
        <span class="status-pill ${statusClass}">${statusText}</span>
      </div>
      ${business.businessType ? `<span class="tag tag-muted">${escapeHtml(business.businessType)}</span>` : ""}
      <p>${escapeHtml(business.notes || "No notes entered yet.")}</p>
      <p class="muted">Capacity ${Number(business.minimumCapacity || 0).toLocaleString()}-${Number(business.maximumCapacity || 0).toLocaleString()} · ${Number(business.activeCampaigns || 0)} of ${Number(business.campaignCap || 0).toLocaleString()} active campaigns</p>
      <p class="muted">${business.rating ? `${business.rating} star rating - ${escapeHtml(business.reviewNote || "No review note")}` : "No rating yet"}</p>
      <div class="tag-row">
        ${[...(business.causeAreas || []), ...(business.contributionTypes || []), ...(business.offerTypes || []), ...(business.fulfillmentOptions || [])].map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      ${showCompleteProfile ? `<button type="button" class="link-btn" data-complete-profile="business" data-record-id="${escapeHtml(business.id)}" style="margin-top:10px;">Complete profile for stronger matches</button>` : ""}
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
      <text x="32" y="41" text-anchor="middle" font-size="6.5" font-weight="700" fill="var(--muted)">MATCH</text>
    </svg>
  `;
}

// Lightweight preview card for the Dashboard's tabbed match browser — photo,
// tags, score gauge, and a link into the full Match Review page for the
// admin controls (status, decline reason, override note).
function matchPreviewCard(match, { viewerIsBusiness = false } = {}) {
  const photo = viewerIsBusiness ? requestPhoto(match.request) : businessPhoto(match.business);
  return `
    <article class="match-preview-card">
      <span class="match-preview-menu">${ICONS.dots}</span>
      <img class="match-preview-photo" src="${photo}" alt="" loading="lazy" />
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
  if (match.status === "intro_requested") {
    return `<button type="button" class="secondary-btn" data-progress-status="accepted" data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">We're working together ${ICONS.check}</button>`;
  }
  if (match.status === "accepted") {
    return `<button type="button" class="secondary-btn" data-progress-status="launched" data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">Mark campaign as launched ${ICONS.arrowRight}</button>`;
  }
  return "";
}

function wireMatchProgressionButtons() {
  root.querySelectorAll("[data-progress-status]").forEach((button) => {
    button.addEventListener("click", () => {
      upsertMatchStatus(button.dataset.requestId, button.dataset.businessId, button.dataset.progressStatus);
      render();
    });
  });
}

function matchCard(match, { showAdminControls = false, showRating = false } = {}) {
  return `
    <article class="match-card">
      <div class="match-head">
        <div>
          <h3>${escapeHtml(match.request.organizationName)} + ${escapeHtml(match.business.name)}</h3>
          <p class="muted">${escapeHtml(match.request.causeArea)} campaign in ${escapeHtml(match.request.geography)}</p>
        </div>
        <div class="score"><span>${escapeHtml(match.label)}</span><strong>${match.total}</strong><small>compatibility</small></div>
      </div>
      <p>${escapeHtml(match.request.campaignDescription)}</p>
      <p class="forecast">${escapeHtml(match.forecast)}</p>
      <p class="muted">Business goals: ${escapeHtml((match.business.businessGoals || []).slice(0, 4).join(", ") || "Not captured yet")}</p>
      <div class="tag-row">${match.reasons.map((reason) => `<span class="tag">${escapeHtml(reason)}</span>`).join("")}</div>
      <details class="decision-path">
        <summary>Decision tree path</summary>
        <ul>
          ${(match.decisionStages || []).map((stage) => `<li class="${stage.passed ? "passed" : "blocked"}"><strong>${escapeHtml(stage.label)}:</strong> ${stage.passed ? escapeHtml(stage.reason || "Passed") : escapeHtml(stage.blocker || "Blocked")}</li>`).join("")}
        </ul>
      </details>
      ${match.notifiedAt ? `<p class="notification-note">Email notification queued for ${escapeHtml(match.request.email)} and ${escapeHtml(match.business.name)} on ${formatDateTime(match.notifiedAt)}.</p>` : ""}
      ${
        showAdminControls
          ? `
      <div class="match-actions">
        <label for="status-${escapeHtml(match.id)}">Match status</label>
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
      </div>`
          : matchProgressionAction(match)
      }
      ${showRating ? ratingWidget(match) : ""}
    </article>
  `;
}


render();
