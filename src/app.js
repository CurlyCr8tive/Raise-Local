import { AUDIENCES, CAUSES, buildMatches, splitSelections } from "./matching.js";
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

function render() {
  const views = {
    dashboard: renderDashboard,
    businesses: renderBusinesses,
    nonprofits: renderNonprofits,
    matches: renderMatches,
    research: renderResearch,
  };
  views[activeView]();
}

function renderDashboard() {
  setTitle("Grow Local Dashboard");
  const matches = buildMatches(data.businesses, data.nonprofits);
  const topMatch = matches[0];
  root.innerHTML = `
    <section class="metric-grid">
      <div class="metric-card"><span>Businesses</span><strong>${data.businesses.length}</strong></div>
      <div class="metric-card"><span>Nonprofits</span><strong>${data.nonprofits.length}</strong></div>
      <div class="metric-card"><span>Possible Matches</span><strong>${matches.length}</strong></div>
      <div class="metric-card"><span>Top Score</span><strong>${topMatch ? topMatch.total : 0}%</strong></div>
    </section>

    <section class="panel">
      <h2>Best Current Match</h2>
      ${topMatch ? matchCard(topMatch) : `<p class="muted">Add at least one business and one nonprofit to see matches.</p>`}
    </section>

    <section class="panel">
      <h2>Build Focus</h2>
      <p class="muted">This prototype keeps the first Grow Local direction narrow: intake both sides, score fit, and give Tenyse a review queue before outreach. Fundraising payments, public directories, and automation can wait until the matchmaking loop is validated.</p>
    </section>
  `;
}

function renderBusinesses() {
  setTitle("Businesses");
  root.innerHTML = `
    <section class="panel">
      <h2>Add Business</h2>
      ${entityForm("business")}
    </section>
    <section class="entity-list">${data.businesses.map((item) => entityCard(item, "business")).join("")}</section>
  `;
  wireEntityForm("business");
}

function renderNonprofits() {
  setTitle("Nonprofits");
  root.innerHTML = `
    <section class="panel">
      <h2>Add Nonprofit</h2>
      ${entityForm("nonprofit")}
    </section>
    <section class="entity-list">${data.nonprofits.map((item) => entityCard(item, "nonprofit")).join("")}</section>
  `;
  wireEntityForm("nonprofit");
}

function renderMatches() {
  setTitle("Matches");
  const matches = buildMatches(data.businesses, data.nonprofits);
  root.innerHTML = `
    <section class="panel">
      <h2>Match Review Queue</h2>
      <p class="muted">Scores are directional, not final. Tenyse still decides which introductions are worth making.</p>
    </section>
    <section class="match-grid">${matches.map(matchCard).join("")}</section>
  `;
}

function renderResearch() {
  setTitle("Research Notes");
  root.innerHTML = `
    <section class="panel">
      <h2>Product Direction</h2>
      <p>Grow Local is a separate platform concept from the VC Portal coaching/client dashboard.</p>
      <p class="muted">Short-term: match small businesses with nonprofits. Long-term: expand into a fundraising platform that makes community partnerships easier and more fun to run.</p>
    </section>
    <section class="panel">
      <h2>Near-Term Jobs To Be Done</h2>
      <ul>
        <li>Capture business goals, audience, market, budget, and preferred activation type.</li>
        <li>Capture nonprofit causes, audience, market, minimum contribution, and partnership needs.</li>
        <li>Score likely fit and explain why each match surfaced.</li>
        <li>Keep Tenyse in review before an introduction is made.</li>
        <li>Use interviews, starting with Sophia & Grace, to tune the matching criteria.</li>
      </ul>
    </section>
  `;
}

function entityForm(type) {
  const isBusiness = type === "business";
  return `
    <form id="${type}-form">
      <div class="form-grid">
        <div class="field-row">
          <label for="${type}-name">${isBusiness ? "Business" : "Nonprofit"} Name</label>
          <input id="${type}-name" required />
        </div>
        <div class="field-row">
          <label for="${type}-market">Market</label>
          <input id="${type}-market" placeholder="New York" required />
        </div>
        <div class="field-row">
          <label for="${type}-contact">Contact</label>
          <input id="${type}-contact" placeholder="Founder, development lead, etc." />
        </div>
        <div class="field-row">
          <label for="${type}-budget">${isBusiness ? "Monthly Partnership Budget" : "Minimum Contribution"}</label>
          <input id="${type}-budget" type="number" min="0" step="50" />
        </div>
      </div>
      <div class="form-grid">
        <div class="field-row">
          <label for="${type}-causes">Causes</label>
          <select id="${type}-causes" multiple>${CAUSES.map((item) => `<option>${item}</option>`).join("")}</select>
        </div>
        <div class="field-row">
          <label for="${type}-audiences">Audiences</label>
          <select id="${type}-audiences" multiple>${AUDIENCES.map((item) => `<option>${item}</option>`).join("")}</select>
        </div>
      </div>
      <div class="field-row">
        <label for="${type}-activations">${isBusiness ? "Preferred Activations" : "Partnership Needs"} <span class="muted">(comma separated)</span></label>
        <input id="${type}-activations" placeholder="Round-up campaign, sponsored event, volunteer day" />
      </div>
      <div class="field-row">
        <label for="${type}-goals">Goals</label>
        <textarea id="${type}-goals" rows="3"></textarea>
      </div>
      <button class="primary-btn" type="submit">Add ${isBusiness ? "Business" : "Nonprofit"}</button>
    </form>
  `;
}

function selectedOptions(id) {
  return [...document.getElementById(id).selectedOptions].map((option) => option.value);
}

function wireEntityForm(type) {
  document.getElementById(`${type}-form`).addEventListener("submit", (event) => {
    event.preventDefault();
    const isBusiness = type === "business";
    const item = {
      id: `${type}-${crypto.randomUUID()}`,
      name: document.getElementById(`${type}-name`).value.trim(),
      market: document.getElementById(`${type}-market`).value.trim(),
      contact: document.getElementById(`${type}-contact`).value.trim(),
      causes: selectedOptions(`${type}-causes`),
      audiences: selectedOptions(`${type}-audiences`),
      goals: document.getElementById(`${type}-goals`).value.trim(),
      status: "new",
    };
    if (isBusiness) {
      item.monthlyBudget = Number(document.getElementById(`${type}-budget`).value) || 0;
      item.activationTypes = splitSelections(document.getElementById(`${type}-activations`).value);
      data.businesses = [item, ...data.businesses];
    } else {
      item.minimumContribution = Number(document.getElementById(`${type}-budget`).value) || 0;
      item.activationNeeds = splitSelections(document.getElementById(`${type}-activations`).value);
      data.nonprofits = [item, ...data.nonprofits];
    }
    saveData(data);
    render();
  });
}

function entityCard(item, type) {
  const activations = type === "business" ? item.activationTypes : item.activationNeeds;
  const amount = type === "business" ? item.monthlyBudget : item.minimumContribution;
  return `
    <article class="entity-card">
      <div class="entity-head">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p class="muted">${escapeHtml(item.market)} · ${escapeHtml(item.contact || "No contact yet")}</p>
        </div>
        <span class="status-pill status-${escapeHtml(item.status || "new")}">${escapeHtml(item.status || "new")}</span>
      </div>
      <p>${escapeHtml(item.goals || "No goals entered yet.")}</p>
      <p class="small-label">${type === "business" ? "Budget" : "Minimum"}</p>
      <p>$${Number(amount || 0).toLocaleString()}</p>
      <div class="tag-row">${[...(item.causes || []), ...(item.audiences || []), ...(activations || [])].map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </article>
  `;
}

function matchCard(match) {
  return `
    <article class="match-card">
      <div class="match-head">
        <div>
          <h3>${escapeHtml(match.business.name)} + ${escapeHtml(match.nonprofit.name)}</h3>
          <p class="muted">${escapeHtml(match.business.market)} partnership introduction</p>
        </div>
        <div class="score">${match.total}%</div>
      </div>
      <p>${escapeHtml(match.nonprofit.goals)}</p>
      <div class="tag-row">${match.reasons.map((reason) => `<span class="tag">${escapeHtml(reason)}</span>`).join("")}</div>
      <div class="split-actions" style="margin-top:14px;">
        <button class="secondary-btn" type="button">Review</button>
        <button class="primary-btn" type="button">Draft Intro</button>
      </div>
    </article>
  `;
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
