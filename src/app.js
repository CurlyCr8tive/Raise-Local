import {
  BUSINESS_CATEGORIES,
  CAUSE_AREAS,
  CONTRIBUTION_TYPES,
  MATCH_STATUSES,
  ORGANIZATION_TYPES,
  buildMatches,
  splitSelections,
} from "./matching.js";
import { loadData, resetDemoData, saveData } from "./storage.js";

let data = loadData();
let activeView = "dashboard";

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
    dashboard: renderDashboard,
    requests: renderRequests,
    businesses: renderBusinesses,
    matches: renderMatches,
    brief: renderBrief,
  };
  views[activeView]();
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
      <div class="metric-card"><span>Recommended Matches</span><strong>${matches.length}</strong></div>
      <div class="metric-card"><span>Accepted / Launched</span><strong>${accepted} / ${launched}</strong></div>
    </section>

    <section class="panel">
      <h2>Core Loop</h2>
      <ol class="loop-list">
        <li>A nonprofit or school submits a campaign request.</li>
        <li>Raise Local filters local businesses by category, cause, and geography.</li>
        <li>Tenyse reviews the top fit, then the business accepts or declines.</li>
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
      <h2>Nonprofit / School Intake</h2>
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
      <p class="muted">A match appears only when business category, cause area, and geography overlap. Scores explain fit; they do not guarantee quality, legitimacy, funding, or partnership success.</p>
    </section>
    <section class="match-grid">${matches.length ? matches.map(matchCard).join("") : `<p class="muted">No matches yet.</p>`}</section>
  `;
  root.querySelectorAll("[data-status-update]").forEach((select) => {
    select.addEventListener("change", () => {
      upsertMatchStatus(select.dataset.requestId, select.dataset.businessId, select.value);
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
            <li>Explainable filtered matching.</li>
            <li>Accept, decline, and launch statuses.</li>
            <li>Human review before introductions.</li>
          </ul>
        </div>
        <div>
          <p class="small-label">Not in scope yet</p>
          <ul>
            <li>Open marketplace browsing.</li>
            <li>Opaque AI matching.</li>
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

function requestForm() {
  return `
    <form id="request-form">
      <div class="form-grid">
        ${inputField("request-org", "Organization name", "PS 118 Art Room")}
        ${selectField("request-type", "Organization type", ORGANIZATION_TYPES)}
        ${inputField("request-contact", "Contact name", "Jordan Lee")}
        ${inputField("request-email", "Email", "contact@example.org", "email")}
        ${inputField("request-phone", "Phone", "555-0100", "tel")}
        ${inputField("request-goal", "Funding goal", "5000", "number")}
      </div>
      <div class="form-grid">
        ${inputField("request-start", "Campaign start date", "", "date")}
        ${inputField("request-end", "Campaign end date", "", "date")}
        ${selectField("request-cause", "Category or cause area", CAUSE_AREAS)}
        ${selectField("request-preference", "Business type preference", BUSINESS_CATEGORIES)}
      </div>
      ${inputField("request-geo", "Local geography", "Neighborhood, borough, or zip code")}
      <div class="field-row">
        <label for="request-description">What is the campaign for?</label>
        <textarea id="request-description" rows="3" required></textarea>
      </div>
      <div class="field-row">
        <label for="request-prior">Have you run a fundraiser like this before?</label>
        <input id="request-prior" placeholder="Yes/no, and platform if yes" />
      </div>
      <button class="primary-btn" type="submit">Submit Campaign Request</button>
    </form>
  `;
}

function businessForm() {
  return `
    <form id="business-form">
      <div class="form-grid">
        ${inputField("business-name", "Business name", "YAMAAS! Olive Oil")}
        ${selectField("business-category", "Business category", BUSINESS_CATEGORIES.filter((item) => item !== "No preference"))}
      </div>
      ${inputField("business-areas", "Location / service area", "Brooklyn, Queens")}
      <div class="form-grid">
        ${multiSelectField("business-causes", "Cause areas they want to support", CAUSE_AREAS)}
        ${multiSelectField("business-contributions", "Contribution types", CONTRIBUTION_TYPES)}
      </div>
      <div class="form-grid">
        ${inputField("business-from", "Available from", "", "date")}
        ${inputField("business-to", "Available to", "", "date")}
      </div>
      <div class="field-row">
        <label for="business-notes">Notes</label>
        <textarea id="business-notes" rows="3"></textarea>
      </div>
      <button class="primary-btn" type="submit">Save Business Profile</button>
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

function selectedOptions(id) {
  return [...document.getElementById(id).selectedOptions].map((option) => option.value);
}

function wireRequestForm() {
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
        geography: value("request-geo"),
        priorFundraiser: value("request-prior"),
        status: "new",
      },
      ...data.campaignRequests,
    ];
    saveData(data);
    render();
  });
}

function wireBusinessForm() {
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
        availableFrom: value("business-from"),
        availableTo: value("business-to"),
        notes: value("business-notes"),
        status: "ready",
      },
      ...data.businesses,
    ];
    saveData(data);
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
      <div class="tag-row">
        ${[...(business.causeAreas || []), ...(business.contributionTypes || [])].map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
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
        <div class="score">${match.total}%</div>
      </div>
      <p>${escapeHtml(match.request.campaignDescription)}</p>
      <div class="tag-row">${match.reasons.map((reason) => `<span class="tag">${escapeHtml(reason)}</span>`).join("")}</div>
      <div class="match-actions">
        <label for="status-${escapeHtml(match.id)}">Match status</label>
        <select id="status-${escapeHtml(match.id)}" data-status-update data-request-id="${escapeHtml(match.request.id)}" data-business-id="${escapeHtml(match.business.id)}">
          ${MATCH_STATUSES.map((status) => `<option value="${status}" ${match.status === status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}
        </select>
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
