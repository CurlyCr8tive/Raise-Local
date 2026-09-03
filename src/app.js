import {
  BUSINESS_CATEGORIES,
  CAUSE_AREAS,
  CONTRIBUTION_TYPES,
  DECLINE_REASONS,
  EVENT_TYPES,
  MATCH_STATUSES,
  ORGANIZATION_TYPES,
  SUPPORT_NEEDS,
  buildMatches,
  splitSelections,
} from "./matching.js";
import { loadData, resetDemoData, saveData } from "./storage.js";

let data = loadData();
let activeView = "intro";
let quizAudience = null;
let quizConfirmation = "";

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
  setTitle("Intro Quiz");
  root.innerHTML = `
    <section class="intro-hero">
      <p class="eyebrow">Raise Funds, Buy Local</p>
      <h2>Let's find the right local partnership.</h2>
      <p>Answer a few focused questions so Raise Local can understand what you need, what you offer, and which matches are actually workable.</p>
    </section>

    ${quizConfirmation ? `<section class="success-banner" role="status">${escapeHtml(quizConfirmation)}</section>` : ""}

    <section class="quiz-choice-grid" aria-label="Choose quiz path">
      <button type="button" class="choice-card ${quizAudience === "request" ? "active" : ""}" data-quiz-audience="request">
        <span>For nonprofits</span>
        <strong>I need a business partner for a campaign.</strong>
        <small>Tell us your goal, timing, location, must-haves, and the kind of support you need.</small>
      </button>
      <button type="button" class="choice-card ${quizAudience === "business" ? "active" : ""}" data-quiz-audience="business">
        <span>For local businesses</span>
        <strong>I want to support community fundraisers.</strong>
        <small>Tell us your service area, offer type, availability, and capacity so we only send workable requests.</small>
      </button>
    </section>

    <section class="panel quiz-panel">
      ${
        quizAudience === "business"
          ? `<h2>Business Intro Quiz</h2>${businessForm({ quizMode: true })}`
          : `<h2>Nonprofit Intro Quiz</h2>${requestForm({ quizMode: true })}`
      }
    </section>
  `;

  root.querySelectorAll("[data-quiz-audience]").forEach((button) => {
    button.addEventListener("click", () => {
      quizAudience = button.dataset.quizAudience;
      quizConfirmation = "";
      renderIntro();
    });
  });

  if (quizAudience === "business") wireBusinessForm({ fromQuiz: true });
  else wireRequestForm({ fromQuiz: true });
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
      <p class="muted">A match appears only when the must-haves work. Recommendations explain why they fit and use careful forecast language instead of promising results.</p>
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
  if (existing) existing.status = status;
  else data.matches.push({ requestId, businessId, status });
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
        <div class="score">${escapeHtml(match.label)}</div>
      </div>
      <p>${escapeHtml(match.request.campaignDescription)}</p>
      <p class="forecast">${escapeHtml(match.forecast)}</p>
      <div class="tag-row">${match.reasons.map((reason) => `<span class="tag">${escapeHtml(reason)}</span>`).join("")}</div>
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
      </div>
    </article>
  `;
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
