import {
  AVAILABILITY_OPTIONS,
  BUSINESS_CATEGORIES,
  BUSINESS_GOALS,
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
} from "./matching.js";
import { loadData, resetDemoData, saveData } from "./storage.js";
import { syncBusinessProfile, syncCampaignRequest } from "./remote-sync.js";

let data = loadData();
let activeView = "intro";

let quizAudience = null; // "request" | "business"
let quizPhase = "choose"; // "choose" | "core" | "results" | "profile"
let quizStep = 0;
let quizAnswers = {};
let quizConfirmation = "";
let quizActiveRecordId = null;
let quizResultsPreview = null;

const root = document.getElementById("view-root");
const title = document.getElementById("page-title");
const navButtons = [...document.querySelectorAll("[data-view]")];

document.getElementById("seed-btn").addEventListener("click", () => {
  data = resetDemoData();
  render();
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    render();
  });
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
  const views = {
    intro: renderIntro,
    dashboard: renderDashboard,
    requests: renderRequests,
    businesses: renderBusinesses,
    matches: renderMatches,
    brief: renderBrief,
  };
  views[activeView]();
}

function renderIntro() {
  setTitle("Match Finder");

  const heroAndChoice = `
    <section class="intro-hero">
      <p class="eyebrow">Raise Funds, Buy Local</p>
      <h2>Let's find your match.</h2>
      <p>Answer a few quick questions so Raise Local can understand what you need, what you offer, and which matches are actually workable. Takes about two minutes.</p>
    </section>

    ${quizConfirmation ? `<section class="success-banner" role="status">${escapeHtml(quizConfirmation)}</section>` : ""}

    <section class="quiz-choice-grid" aria-label="Choose your path">
      <button type="button" class="choice-card ${quizAudience === "request" ? "active" : ""}" data-quiz-audience="request">
        <span>For nonprofits &amp; schools</span>
        <strong>I need a business partner for a campaign.</strong>
        <small>Tell us your goal, cause, and location so we only send workable matches.</small>
      </button>
      <button type="button" class="choice-card ${quizAudience === "business" ? "active" : ""}" data-quiz-audience="business">
        <span>For local businesses</span>
        <strong>I want to support community fundraisers.</strong>
        <small>Tell us what you offer and where you serve so we only send workable requests.</small>
      </button>
    </section>
  `;

  if (!quizAudience) {
    root.innerHTML = `${heroAndChoice}<section class="panel"><p class="muted">Pick a path above to start the Match Finder.</p></section>`;
    wireIntroChoices();
    return;
  }

  if (quizPhase === "results") {
    root.innerHTML = `${heroAndChoice}${resultsPanelHtml()}`;
    wireIntroChoices();
    wireResultsActions();
    return;
  }

  const questions = activeQuestionList();
  const question = questions[quizStep];
  const total = questions.length;
  const progress = Math.round(((quizStep + 1) / total) * 100);
  const heading =
    quizPhase === "profile"
      ? quizAudience === "business"
        ? "Complete Your Business Profile"
        : "Complete Your Campaign Profile"
      : quizAudience === "business"
        ? "Business Match Finder"
        : "Nonprofit Match Finder";

  root.innerHTML = `
    ${heroAndChoice}
    <section class="panel quiz-panel">
      <h2>${heading}</h2>
      ${quizQuestionHtml(question, progress, total)}
    </section>
  `;

  wireIntroChoices();
  wireGuidedQuiz(questions);
}

function wireIntroChoices() {
  root.querySelectorAll("[data-quiz-audience]").forEach((button) => {
    button.addEventListener("click", () => {
      quizAudience = button.dataset.quizAudience;
      quizPhase = "core";
      quizStep = 0;
      quizAnswers = {};
      quizConfirmation = "";
      quizActiveRecordId = null;
      quizResultsPreview = null;
      renderIntro();
    });
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
    renderIntro();
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
      renderIntro();
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
    quizConfirmation = "Business profile saved. Raise Local can now recommend fit-based campaign opportunities.";
    syncBusinessProfile(business);
  } else {
    const request = requestFromQuizAnswers();
    data.campaignRequests = [request, ...data.campaignRequests];
    quizActiveRecordId = request.id;
    quizResultsPreview = computeMatchPreview("request", request);
    quizConfirmation = "Campaign request saved. Raise Local can now compare it against business profiles.";
    syncCampaignRequest(request);
  }
  saveData(data);
  quizPhase = "results";
  render();
}

function finishProfileQuiz() {
  if (quizAudience === "business") {
    const business = data.businesses.find((item) => item.id === quizActiveRecordId);
    if (business) {
      Object.assign(business, businessProfilePatch());
      quizResultsPreview = computeMatchPreview("business", business);
    }
  } else {
    const request = data.campaignRequests.find((item) => item.id === quizActiveRecordId);
    if (request) {
      Object.assign(request, requestProfilePatch());
      quizResultsPreview = computeMatchPreview("request", request);
    }
  }
  saveData(data);
  quizConfirmation = "Profile completed — thanks for the extra detail. It helps Raise Local recommend stronger matches.";
  quizPhase = "results";
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

function resultsPanelHtml() {
  const preview = quizResultsPreview || { count: 0, top: null };
  const isBusiness = quizAudience === "business";
  const noun = isBusiness ? "campaign" : "business";
  const nounPlural = isBusiness ? "campaigns" : "businesses";
  const headline =
    preview.count > 0
      ? `Nice! You're a possible fit for ${preview.count} ${preview.count === 1 ? noun : nounPlural} already in Raise Local.`
      : "No workable matches yet — that's okay, more requests and businesses get added every week.";
  const topName = isBusiness ? preview.top?.request?.organizationName : preview.top?.business?.name;
  const topReason = preview.top?.score?.reasons?.[0];
  const topForecast = !isBusiness ? preview.top?.score?.forecast : "";

  return `
    <section class="panel results-panel">
      <p class="eyebrow">Match Signal</p>
      <h2>${escapeHtml(headline)}</h2>
      ${topName ? `<p class="muted">Strongest so far: <strong>${escapeHtml(topName)}</strong>${topReason ? ` — ${escapeHtml(topReason)}` : ""}</p>` : ""}
      ${topForecast ? `<p class="forecast">${escapeHtml(topForecast)}</p>` : ""}
      <div class="quiz-actions">
        <button class="secondary-btn" type="button" id="results-later">Maybe later</button>
        <button class="primary-btn" type="button" id="results-complete-profile">Complete profile for stronger matches</button>
      </div>
      <button class="primary-btn" type="button" id="results-see-matches" style="margin-top:10px;width:100%;">See my matches</button>
    </section>
  `;
}

function wireResultsActions() {
  document.getElementById("results-see-matches")?.addEventListener("click", () => {
    activeView = "matches";
    render();
  });
  document.getElementById("results-later")?.addEventListener("click", () => {
    quizAudience = null;
    quizPhase = "choose";
    quizStep = 0;
    quizAnswers = {};
    quizActiveRecordId = null;
    quizResultsPreview = null;
    quizConfirmation = "";
    renderIntro();
  });
  document.getElementById("results-complete-profile")?.addEventListener("click", () => {
    quizPhase = "profile";
    quizStep = 0;
    quizAnswers = {};
    renderIntro();
  });
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
  setTitle("Raise Local Dashboard");
  const matches = currentMatches();
  const accepted = matches.filter((match) => match.status === "accepted").length;
  const launched = matches.filter((match) => match.status === "launched").length;
  const topMatch = matches[0];

  root.innerHTML = `
    <section class="mission-panel">
      <div>
        <p class="eyebrow">Raise Funds, Buy Local</p>
        <h2>Raise Local, powered by Verified Consulting, connects nonprofits and community organizations with local businesses that are ready to partner, support, and grow with them.</h2>
      </div>
    </section>

    <section class="metric-grid">
      <button type="button" class="metric-card metric-link" data-dashboard-target="requests"><span>Campaign Requests</span><strong>${data.campaignRequests.length}</strong></button>
      <button type="button" class="metric-card metric-link" data-dashboard-target="businesses"><span>Business Profiles</span><strong>${data.businesses.length}</strong></button>
      <button type="button" class="metric-card metric-link" data-dashboard-target="matches"><span>Top Matches</span><strong>${matches.length}</strong></button>
      <button type="button" class="metric-card metric-link" data-dashboard-target="matches"><span>Accepted / Launched</span><strong>${accepted} / ${launched}</strong></button>
    </section>

    <section class="panel">
      <h2>Core Loop</h2>
      <ol class="loop-list">
        <li>A nonprofit or community organization submits a campaign request.</li>
        <li>Raise Local filters local businesses by must-haves: category, cause, geography, support, timing, and capacity.</li>
        <li>The strongest 3-5 matches explain why they fit; Tenyse can review or override.</li>
        <li>Once accepted, the campaign launches. Stripe split payments are future scope.</li>
      </ol>
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

function renderRequests() {
  setTitle("Campaign Requests");
  root.innerHTML = `
    <section class="panel">
      <h2>Nonprofit Intake</h2>
      ${requestForm()}
    </section>
    <section class="entity-list">${data.campaignRequests.map(requestCard).join("")}</section>
  `;
  wireRequestForm();
}

function renderBusinesses() {
  setTitle("Business Profiles");
  root.innerHTML = `
    <section class="panel">
      <h2>Business Match Profile</h2>
      ${businessForm()}
    </section>
    <section class="entity-list">${data.businesses.map(businessCard).join("")}</section>
  `;
  wireBusinessForm();
}

function renderMatches() {
  setTitle("Match Review");
  const matches = currentMatches();
  root.innerHTML = `
    <section class="panel">
      <h2>Recommended Matches</h2>
      <p class="muted">A match appears only when the must-haves work. Recommendations explain why they fit, surface the strongest 3-5 options, and record accept, pass, save, introduction, and admin override decisions.</p>
    </section>
    <section class="match-grid">${matches.length ? matches.map(matchCard).join("") : `<p class="muted">No matches yet.</p>`}</section>
  `;
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

function requestCard(request) {
  return `
    <article class="entity-card">
      <div class="entity-head">
        <div>
          <h3>${escapeHtml(request.organizationName)}</h3>
          <p class="muted">${escapeHtml(request.organizationType)} · ${escapeHtml(request.geography)} · $${Number(request.fundingGoal).toLocaleString()}</p>
        </div>
        <span class="status-pill status-new">new</span>
      </div>
      <p>${escapeHtml(request.campaignDescription)}</p>
      <div class="tag-row">
        <span class="tag">${escapeHtml(request.causeArea)}</span>
        <span class="tag">${escapeHtml(request.businessPreference)}</span>
        <span class="tag">${escapeHtml(request.eventType || "Campaign")}</span>
        <span class="tag">Size ${Number(request.minimumSize || 0).toLocaleString()}-${Number(request.idealSize || 0).toLocaleString()}</span>
        <span class="tag">${escapeHtml(request.startDate || "No start date")} to ${escapeHtml(request.endDate || "No end date")}</span>
      </div>
    </article>
  `;
}

function businessCard(business) {
  return `
    <article class="entity-card">
      <div class="entity-head">
        <div>
          <h3>${escapeHtml(business.name)}</h3>
          <p class="muted">${escapeHtml(business.category)} · ${escapeHtml((business.serviceAreas || []).join(", "))}</p>
        </div>
        <span class="status-pill status-ready">ready</span>
      </div>
      <p>${escapeHtml(business.notes || "No notes entered yet.")}</p>
      <p class="muted">Capacity ${Number(business.minimumCapacity || 0).toLocaleString()}-${Number(business.maximumCapacity || 0).toLocaleString()} · ${Number(business.activeCampaigns || 0)} of ${Number(business.campaignCap || 0).toLocaleString()} active campaigns</p>
      <p class="muted">${business.rating ? `${business.rating} star rating - ${escapeHtml(business.reviewNote || "No review note")}` : "No rating yet"}</p>
      <div class="tag-row">
        ${[...(business.causeAreas || []), ...(business.contributionTypes || []), ...(business.offerTypes || []), ...(business.fulfillmentOptions || [])].map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </article>
  `;
}

function matchCard(match) {
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
      </div>
    </article>
  `;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function statusLabel(status) {
  return status.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
