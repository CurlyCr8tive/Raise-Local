import {
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
  buildMatches,
  splitSelections,
} from "./matching.js";
import { loadData, resetDemoData, saveData } from "./storage.js";

let data = loadData();
let activeView = "intro";
let quizAudience = null;
let quizStep = 0;
let quizAnswers = {};
let quizConfirmation = "";
let quizResult = null;

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

const NONPROFIT_QUESTIONS = [
  { key: "organizationType", label: "What kind of organization are you?", type: "single", options: ORGANIZATION_TYPES },
  { key: "campaignDescription", label: "What are you raising funds for?", type: "single", options: ["School supplies", "Program expenses", "Food or pantry support", "Youth activities", "Arts or creative programming", "Sports or extracurriculars", "Emergency/community need", "General operating support", "Other"], allowOther: true },
  { key: "causeArea", label: "What cause area fits best?", type: "single", options: CAUSE_AREAS },
  { key: "fundingGoal", label: "How much are you hoping to raise?", type: "single", options: ["Under $1,000", "$1,000-$2,500", "$2,500-$5,000", "$5,000-$10,000", "$10,000+", "Not sure yet"] },
  { key: "preferredCategories", label: "What kind of business partner would help most?", type: "multi", options: BUSINESS_CATEGORIES, allowOther: true },
  { key: "partnershipTypesNeeded", label: "What kind of partnership do you want?", type: "multi", options: ["Percentage of sales campaign", "Product donation", "Event sponsorship", "Hosted event", "Venue", "Event activation", "Not sure", "Other"], allowOther: true },
  { key: "geography", label: "Where should the partner be able to serve?", type: "single", options: ["Same neighborhood", "Same borough/city", "Within 10 miles", "NYC-wide", "Regional partner is okay", "Online/shipping is okay", "Other"], allowOther: true },
  { key: "partnershipDeadline", label: "When do you need this?", type: "single", options: ["This month", "Next month", "In 2-3 months", "Flexible", "Specific date", "Other"], allowOther: true },
  { key: "expectedParticipation", label: "About how many people could participate?", type: "single", options: ["Under 25", "25-50", "51-100", "101-250", "250+", "Not sure"] },
  { key: "mustHaves", label: "What's one must-have for a good match?", type: "single", options: ["Low/no upfront cost", "Family-friendly", "Local business", "Can handle our audience size", "Available quickly", "Other"], allowOther: true },
  { key: "organizationName", label: "Nice. What's your organization name?", type: "text", placeholder: "PS 118 PTA", contactStep: true },
  { key: "contactName", label: "Who should we contact?", type: "text", placeholder: "Your name", contactStep: true },
  { key: "email", label: "What's the best email for follow-up?", type: "email", placeholder: "you@example.org", contactStep: true },
  { key: "website", label: "Website or social link?", type: "text", placeholder: "Website, Instagram, LinkedIn, etc.", contactStep: true },
];

const BUSINESS_QUESTIONS = [
  { key: "category", label: "What type of business are you?", type: "single", options: BUSINESS_CATEGORIES.filter((item) => item !== "No preference") },
  { key: "businessGoals", label: "What do you want to get out of participating?", type: "multi", options: BUSINESS_GOALS },
  { key: "offerTypes", label: "What can you offer?", type: "multi", options: ["Food", "Beverage", "Products", "Gift cards", "Venue space", "Catering", "Workshops/classes", "Sponsorship", "Event activation", "Other"], allowOther: true },
  { key: "causeAreas", label: "What causes do you want to support?", type: "multi", options: CAUSE_AREAS },
  { key: "partnershipTypes", label: "What partnership types are you open to?", type: "multi", options: ["Fundraising", "Percentage of sales campaign", "Product donation", "Event sponsorship", "Hosted event", "Event activation", "Not sure", "Other"], allowOther: true },
  { key: "serviceAreas", label: "Where can you serve campaigns?", type: "single", options: ["Same neighborhood only", "Same borough/city", "NYC-wide", "Tri-state area", "Regional", "National via shipping", "Online only", "Other"], allowOther: true },
  { key: "idealEventSize", label: "What size campaign works best?", type: "single", options: ["Under 25", "25-50", "51-100", "101-250", "250+", "Depends"] },
  { key: "leadTimeDays", label: "How much lead time do you need?", type: "single", options: ["Less than 1 week", "1-2 weeks", "3-4 weeks", "1-2 months", "Flexible"] },
  { key: "campaignCap", label: "How many campaigns can you support at once?", type: "single", options: ["1", "2", "3-5", "Depends on season"] },
  { key: "mustHaves", label: "What would make a match exciting for you?", type: "multi", options: ["Strong local audience", "Press/media potential", "Repeat customers", "Social content", "Easy fulfillment", "Meaningful cause", "Other"], allowOther: true },
  { key: "name", label: "Great. What's your business name?", type: "text", placeholder: "YAMAAS! Olive Oil", contactStep: true },
  { key: "contactName", label: "Who should we contact?", type: "text", placeholder: "Your name", contactStep: true },
  { key: "email", label: "What's the best email for follow-up?", type: "email", placeholder: "you@example.com", contactStep: true },
  { key: "website", label: "Website or social link?", type: "text", placeholder: "Website, Instagram, LinkedIn, etc.", contactStep: true },
  { key: "fulfillmentScope", label: "How far can you fulfill campaigns?", type: "single", options: FULFILLMENT_SCOPE, profileStep: true },
  { key: "contributionTypes", label: "How are you open to contributing?", type: "multi", options: CONTRIBUTION_TYPES, profileStep: true },
  { key: "productsServices", label: "What products or services can you offer through partnerships?", type: "textarea", placeholder: "Cookie boxes, catering, venue space, gift cards, workshops, etc.", profileStep: true },
  { key: "averagePriceRange", label: "What is the average product or service price range?", type: "text", placeholder: "$15-$40", profileStep: true },
  { key: "minimumOrderRequirement", label: "What's your minimum order or campaign requirement?", type: "number", placeholder: "500", profileStep: true },
  { key: "minimumCapacity", label: "What's the smallest order or event size that makes sense?", type: "number", placeholder: "30", profileStep: true },
  { key: "maximumCapacity", label: "What's the largest order or event size you can handle?", type: "number", placeholder: "200", profileStep: true },
  { key: "activeCampaigns", label: "How many campaigns are you already supporting?", type: "number", placeholder: "0", profileStep: true },
  { key: "estimatedUnitContribution", label: "About how much does each sale/order contribute?", type: "number", placeholder: "15", profileStep: true },
  { key: "availableFrom", label: "When are you available from?", type: "date", profileStep: true },
  { key: "availableTo", label: "When are you available until?", type: "date", profileStep: true },
  { key: "fulfillmentOptions", label: "How can people receive or experience what you offer?", type: "multi", options: FULFILLMENT_OPTIONS, profileStep: true },
  { key: "orgTypesSupported", label: "What types of organizations do you want to work with?", type: "multi", options: ORGANIZATION_TYPES, profileStep: true },
  { key: "notes", label: "Anything else Raise Local should know?", type: "textarea", placeholder: "Limits, ideal partners, venue details, accessibility, minimums, or timing notes.", profileStep: true },
];

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
  const questions = activeQuizQuestions();
  const question = questions[quizStep];
  const progress = Math.round(((quizStep + 1) / questions.length) * 100);

  root.innerHTML = `
    <section class="intro-hero">
      <p class="eyebrow">Raise Funds, Buy Local</p>
      <h2>Find your local match.</h2>
      <p>Ten quick match signals first, contact details at the end, then Raise Local previews where the strongest fit may be.</p>
    </section>

    ${quizConfirmation ? `<section class="success-banner" role="status">${escapeHtml(quizConfirmation)}</section>` : ""}
    ${quizResult ? quizResultHtml(quizResult) : ""}

    <section class="quiz-choice-grid" aria-label="Choose quiz path">
      <button type="button" class="choice-card ${quizAudience === "request" ? "active" : ""}" data-quiz-audience="request">
        <span>For nonprofits</span>
        <strong>I need a business partner for a campaign.</strong>
        <small>Share your goal, timing, audience size, and must-have match signal.</small>
      </button>
      <button type="button" class="choice-card ${quizAudience === "business" ? "active" : ""}" data-quiz-audience="business">
        <span>For local businesses</span>
        <strong>I want to support community fundraisers.</strong>
        <small>Share your goals, causes, service area, capacity, and ideal partnership.</small>
      </button>
    </section>

    <section class="panel quiz-panel">
      ${
        quizAudience === "business"
          ? `<h2>Business Intro Quiz</h2>${quizQuestionHtml(question, progress, questions.length)}`
          : `<h2>Nonprofit Intro Quiz</h2>${quizQuestionHtml(question, progress, questions.length)}`
      }
    </section>
  `;

  root.querySelectorAll("[data-quiz-audience]").forEach((button) => {
    button.addEventListener("click", () => {
      quizAudience = button.dataset.quizAudience;
        quizStep = 0;
        quizAnswers = {};
        quizConfirmation = "";
        quizResult = null;
      renderIntro();
    });
  });
  root.querySelector("[data-view-matches]")?.addEventListener("click", () => {
    quizResult = null;
    activeView = "matches";
    render();
  });
  root.querySelector("[data-start-over]")?.addEventListener("click", () => {
    quizStep = 0;
    quizAnswers = {};
    quizConfirmation = "";
    quizResult = null;
    renderIntro();
  });

  wireGuidedQuiz(questions);
}

function activeQuizQuestions() {
  const source = quizAudience === "business" ? BUSINESS_QUESTIONS : NONPROFIT_QUESTIONS;
  return source.filter((question) => !question.profileStep);
}

function quizQuestionHtml(question, progress, total) {
  return `
    <form id="guided-quiz-form">
      <div class="progress-rail" aria-label="Quiz progress"><span style="width:${progress}%;"></span></div>
      <p class="small-label">${question.contactStep ? "Quick contact step" : progressLabel(progress)} · Question ${quizStep + 1} of ${total}</p>
      <div class="quiz-question">
        <h3>${escapeHtml(question.label)}</h3>
        ${quizInputHtml(question)}
      </div>
      <div class="quiz-actions">
        <button class="secondary-btn" type="button" id="quiz-back" ${quizStep === 0 ? "disabled" : ""}>Back</button>
        <button class="primary-btn" type="submit">${quizStep === total - 1 ? "Show My Match Signal" : "Next"}</button>
      </div>
    </form>
  `;
}

function quizInputHtml(question) {
  const saved = quizAnswers[question.key];
  const savedOptions = question.options || [];
  const savedHasCustomSingle = question.allowOther && saved && !Array.isArray(saved) && !savedOptions.includes(saved);
  const savedHasCustomMulti = question.allowOther && Array.isArray(saved) && saved.some((item) => !savedOptions.includes(item));
  const otherValue = quizAnswers[`${question.key}Other`] || (savedHasCustomSingle ? saved : savedHasCustomMulti ? saved.find((item) => !savedOptions.includes(item)) : "");
  if (question.type === "single") {
    return `
      <div class="option-grid">${question.options.map((option) => optionButton(question, option, saved === option || (option === "Other" && savedHasCustomSingle), "radio")).join("")}</div>
      ${question.allowOther ? otherField(question, saved === "Other" || savedHasCustomSingle, otherValue) : ""}
    `;
  }
  if (question.type === "multi") {
    const selected = Array.isArray(saved) ? saved : [];
    return `
      <div class="option-grid">${question.options.map((option) => optionButton(question, option, selected.includes(option) || (option === "Other" && savedHasCustomMulti), "checkbox")).join("")}</div>
      ${question.allowOther ? otherField(question, selected.includes("Other") || savedHasCustomMulti, otherValue) : ""}
    `;
  }
  if (question.type === "textarea") {
    return `<textarea id="quiz-answer" rows="4" placeholder="${escapeHtml(question.placeholder || "")}">${escapeHtml(saved || "")}</textarea>`;
  }
  return `<input id="quiz-answer" type="${escapeHtml(question.type)}" placeholder="${escapeHtml(question.placeholder || "")}" value="${escapeHtml(saved || "")}" />`;
}

function otherField(question, isVisible, value) {
  return `
    <div class="field-row other-answer ${isVisible ? "" : "hidden"}">
      <label for="quiz-other-answer">Tell us the answer in your words</label>
      <input id="quiz-other-answer" type="text" value="${escapeHtml(value)}" placeholder="Type your answer" />
    </div>
  `;
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
  root.querySelectorAll('input[name="quiz-answer"]').forEach((input) => {
    input.addEventListener("change", () => {
      const question = questions[quizStep];
      if (!question.allowOther) return;
      const otherWrap = root.querySelector(".other-answer");
      if (!otherWrap) return;
      const answer = readQuizAnswer(question, { preserveOther: true });
      otherWrap.classList.toggle("hidden", !answerIncludesOther(answer));
    });
  });
  document.getElementById("quiz-back").addEventListener("click", () => {
    if (quizStep === 0) return;
    quizStep -= 1;
    renderIntro();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = questions[quizStep];
    const answer = readQuizAnswer(question);
    if (isBlankAnswer(answer)) return;
    quizAnswers[question.key] = answer;
    if (quizStep < questions.length - 1) {
      quizStep += 1;
      renderIntro();
      return;
    }
    saveQuizResult();
  });
}

function readQuizAnswer(question) {
  const otherInput = document.getElementById("quiz-other-answer");
  const otherValue = otherInput?.value.trim() || "";
  if (question.type === "single") {
    const selected = document.querySelector('input[name="quiz-answer"]:checked')?.value || "";
    if (selected === "Other") quizAnswers[`${question.key}Other`] = otherValue;
    return selected === "Other" && otherValue ? otherValue : selected;
  }
  if (question.type === "multi") {
    const selected = [...document.querySelectorAll('input[name="quiz-answer"]:checked')].map((input) => input.value);
    if (selected.includes("Other")) quizAnswers[`${question.key}Other`] = otherValue;
    return selected.map((item) => (item === "Other" && otherValue ? otherValue : item));
  }
  return document.getElementById("quiz-answer").value.trim();
}

function answerIncludesOther(answer) {
  return Array.isArray(answer) ? answer.includes("Other") : answer === "Other";
}

function progressLabel(progress) {
  if (progress < 30) return "Getting started";
  if (progress < 60) return "Getting warmer";
  if (progress < 90) return "Almost matched";
  return "Last details";
}

function isBlankAnswer(answer) {
  return Array.isArray(answer) ? answer.length === 0 : !String(answer || "").trim();
}

function saveQuizResult() {
  let record;
  if (quizAudience === "business") {
    record = businessFromQuizAnswers();
    const previewMatches = buildMatches(data.campaignRequests, [record], data.matches);
    data.businesses = [record, ...data.businesses];
    quizResult = buildQuizResult("business", record, previewMatches);
    quizConfirmation = "Business profile saved. Raise Local will only surface opportunities that fit your goals and capacity.";
  } else {
    record = requestFromQuizAnswers();
    const previewMatches = buildMatches([record], data.businesses, data.matches);
    data.campaignRequests = [record, ...data.campaignRequests];
    quizResult = buildQuizResult("request", record, previewMatches);
    quizConfirmation = "Campaign request saved. Raise Local can now compare it against business profiles.";
  }
  saveData(data);
  quizStep = 0;
  quizAnswers = {};
  activeView = "intro";
  render();
}

function requestFromQuizAnswers() {
  const participation = amountFromRange(quizAnswers.expectedParticipation);
  const fundingGoal = amountFromRange(quizAnswers.fundingGoal);
  const preferredCategories = normalizeMulti(quizAnswers.preferredCategories, ["No preference"]);
  const partnershipTypesNeeded = normalizePartnerships(quizAnswers.partnershipTypesNeeded);
  const supportNeeds = supportFromPartnerships(partnershipTypesNeeded, preferredCategories);
  return {
    id: `request-${crypto.randomUUID()}`,
    organizationName: quizAnswers.organizationName || "New campaign request",
    organizationType: quizAnswers.organizationType,
    website: quizAnswers.website,
    socialLinks: quizAnswers.website,
    classification: quizAnswers.organizationType,
    contactName: quizAnswers.contactName,
    email: quizAnswers.email,
    phone: "",
    communitiesServed: quizAnswers.geography,
    mission: quizAnswers.causeArea,
    audienceServed: quizAnswers.organizationType,
    audienceSize: participation,
    campaignDescription: quizAnswers.campaignDescription,
    fundingGoal,
    startDate: "",
    endDate: "",
    partnershipDeadline: quizAnswers.partnershipDeadline,
    causeArea: quizAnswers.causeArea,
    businessPreference: preferredCategories[0] || "No preference",
    preferredCategories,
    eventType: quizAnswers.campaignDescription,
    partnershipTypesNeeded,
    supportNeeds,
    expectedParticipation: participation,
    minimumSize: Math.max(Math.floor(participation * 0.6), 0),
    idealSize: participation,
    geography: quizAnswers.geography,
    mustHaves: quizAnswers.mustHaves,
    niceToHaves: "",
    priorFundraiser: "",
    status: "new",
  };
}

function businessFromQuizAnswers() {
  const idealSize = amountFromRange(quizAnswers.idealEventSize);
  const capacityMax = idealSize ? Math.max(idealSize, Math.ceil(idealSize * 1.5)) : 0;
  const cap = amountFromRange(quizAnswers.campaignCap) || 1;
  const leadTimeDays = daysFromLeadTime(quizAnswers.leadTimeDays);
  const offerTypes = normalizeOffers(quizAnswers.offerTypes);
  const partnershipTypes = normalizePartnerships(quizAnswers.partnershipTypes);
  return {
    id: `business-${crypto.randomUUID()}`,
    name: quizAnswers.name || "New business profile",
    website: quizAnswers.website,
    socialLinks: quizAnswers.website,
    category: quizAnswers.category,
    businessGoals: quizAnswers.businessGoals || [],
    serviceAreas: normalizeServiceAreas(quizAnswers.serviceAreas),
    fulfillmentScope: quizAnswers.serviceAreas,
    causeAreas: quizAnswers.causeAreas || [],
    contributionTypes: contributionFromPartnerships(partnershipTypes),
    partnershipTypes,
    offerTypes,
    productsServices: normalizeMulti(quizAnswers.offerTypes).join(", "),
    averagePriceRange: "",
    minimumOrderRequirement: 0,
    minimumCapacity: Math.max(Math.floor(idealSize * 0.5), 0),
    maximumCapacity: capacityMax,
    idealEventSize: idealSize,
    campaignCap: cap,
    activeCampaigns: 0,
    estimatedUnitContribution: 15,
    availableFrom: "",
    availableTo: "",
    leadTimeDays,
    fulfillmentOptions: fulfillmentFromServiceArea(quizAnswers.serviceAreas),
    orgTypesSupported: quizAnswers.orgTypesSupported || ORGANIZATION_TYPES,
    notes: quizAnswers.mustHaves,
    rating: null,
    reviewNote: "",
    unavailable: false,
    status: "ready",
  };
}

function normalizeMulti(value, fallback = []) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : fallback;
}

function amountFromRange(value) {
  if (typeof value === "number") return value;
  const text = String(value || "");
  if (/not sure|flexible|depends/i.test(text)) return 0;
  if (/under/i.test(text)) return Number(text.replace(/[^\d]/g, "")) || 0;
  if (/\+/.test(text)) return Number(text.replace(/[^\d]/g, "")) || 0;
  const numbers = text.match(/\d[\d,]*/g)?.map((item) => Number(item.replaceAll(",", ""))) || [];
  return numbers.length ? Math.max(...numbers) : 0;
}

function daysFromLeadTime(value) {
  const text = String(value || "");
  if (/less/i.test(text)) return 7;
  if (/1-2/.test(text)) return 14;
  if (/3-4/.test(text)) return 28;
  if (/1-2 months/i.test(text)) return 60;
  return 0;
}

function normalizePartnerships(value) {
  return normalizeMulti(value)
    .filter((item) => item !== "Not sure")
    .map((item) => (item === "Percent-of-sales fundraiser" ? "Percentage of sales campaign" : item));
}

function normalizeOffers(value) {
  return normalizeMulti(value).map((item) => {
    if (["Gift cards", "Retail products"].includes(item)) return "Products";
    if (["Catering", "Food items"].includes(item)) return "Food";
    if (item === "Sponsorship dollars") return "Sponsorship";
    return item;
  });
}

function supportFromPartnerships(partnerships, categories) {
  const support = new Set();
  partnerships.forEach((item) => {
    if (item.includes("Product")) support.add("Products");
    if (item.includes("Venue")) support.add("Venue space");
    if (item.includes("sponsor") || item.includes("Sponsorship")) support.add("Sponsorship");
    if (item.includes("Food")) support.add("Food");
    if (item.includes("Event")) support.add("Event activation");
  });
  categories.forEach((item) => {
    if (["Food and beverage", "Restaurant"].includes(item)) support.add("Food");
    if (item === "Beverage") support.add("Beverage");
    if (item === "Venue") support.add("Venue space");
  });
  return [...support].length ? [...support] : ["Products"];
}

function contributionFromPartnerships(partnerships) {
  const contributions = new Set();
  partnerships.forEach((item) => {
    if (item.includes("Product")) contributions.add("Product donation");
    if (item.includes("Percentage")) contributions.add("Percent of sales");
    if (item.includes("Sponsorship")) contributions.add("Sponsorship dollars");
    if (item.includes("Hosted")) contributions.add("Event hosting");
  });
  return [...contributions];
}

function normalizeServiceAreas(value) {
  const area = String(value || "");
  if (/nyc|borough|neighborhood|tri-state/i.test(area)) return ["Brooklyn", "Queens", "Manhattan", "New York"];
  if (/national|shipping|online|regional/i.test(area)) return ["Brooklyn", "Queens", "Manhattan", "New York", "Regional", "National"];
  return area ? [area] : [];
}

function fulfillmentFromServiceArea(value) {
  const text = String(value || "");
  if (/shipping|national|online/i.test(text)) return ["Shipping"];
  if (/neighborhood|borough|nyc/i.test(text)) return ["Pickup", "Delivery", "In person"];
  return ["Delivery"];
}

function buildQuizResult(audience, record, matches) {
  const topMatch = matches[0];
  return {
    audience,
    title: topMatch ? "You already have a promising match signal." : "Your profile is ready for matching.",
    summary: topMatch
      ? `${topMatch.label} with ${audience === "business" ? topMatch.request.organizationName : topMatch.business.name}.`
      : "No strong demo match yet, but the decision tree has the signals it needs.",
    signals: topMatch?.reasons?.slice(0, 4) || [
      audience === "business" ? record.category : record.causeArea,
      audience === "business" ? (record.businessGoals || []).slice(0, 2).join(", ") : record.geography,
      "Ready for admin review",
    ].filter(Boolean),
    matchCount: matches.length,
  };
}

function quizResultHtml(result) {
  return `
    <section class="panel match-signal">
      <p class="eyebrow">Match Signal</p>
      <h2>${escapeHtml(result.title)}</h2>
      <p>${escapeHtml(result.summary)}</p>
      <div class="tag-row">${result.signals.map((signal) => `<span class="tag">${escapeHtml(signal)}</span>`).join("")}</div>
      <div class="split-actions">
        <button class="primary-btn" type="button" data-view-matches>Review Matches (${result.matchCount})</button>
        <button class="secondary-btn" type="button" data-start-over>Start Another Profile</button>
      </div>
    </section>
  `;
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
      <div class="metric-card"><span>Campaign Requests</span><strong>${data.campaignRequests.length}</strong></div>
      <div class="metric-card"><span>Business Profiles</span><strong>${data.businesses.length}</strong></div>
      <div class="metric-card"><span>Top Matches</span><strong>${matches.length}</strong></div>
      <div class="metric-card"><span>Accepted / Launched</span><strong>${accepted} / ${launched}</strong></div>
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
        ${textAreaField("request-nice", "Nice-to-haves", "What would make a match even better?")}
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
