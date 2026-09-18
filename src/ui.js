// Shared, page-agnostic UI primitives for the Raise Local redesign. Each
// function returns an HTML string built with escapeHtml() for anything that
// isn't static markup — same convention as the render* functions in app.js.
// Wiring functions attach listeners after the caller inserts the markup
// into the DOM (this app has no diffing; every render is a fresh innerHTML).
import { escapeHtml } from "./format.js";

/**
 * The "nothing here yet" pattern: icon, title, one explanatory sentence,
 * and (optionally) one clear next action. Never leave a page with a bare
 * sentence in blank space — every empty state should say what's missing,
 * imply why it matters, and offer the one useful next step.
 *
 * action.gotoView, when set, is wired automatically by wireEmptyStates()
 * (it just sets activeView and re-renders). For anything more custom
 * (clearing filters, opening a modal), pass action.dataAttr instead and
 * wire `[data-empty-action="<value>"]` yourself after render.
 */
export function emptyState({ icon, title, body, action } = {}) {
  const button = action
    ? `<button type="button" class="primary-btn" ${
        action.gotoView ? `data-empty-goto="${escapeHtml(action.gotoView)}"` : ""
      } ${action.dataAttr ? `data-empty-action="${escapeHtml(action.dataAttr)}"` : ""}>${escapeHtml(action.label)}</button>`
    : "";
  return `
    <section class="empty-state">
      ${icon ? `<span class="icon-tint ${escapeHtml(icon.tint || "icon-tint-mint")}">${icon.svg}</span>` : ""}
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
      ${button}
    </section>
  `;
}

/** Wires every `[data-empty-goto]` button rendered by emptyState() in `root`
 * to set activeView and call the given render function. Call once per
 * render pass, after root.innerHTML is set. */
export function wireEmptyStates(root, setActiveView, render) {
  root.querySelectorAll("[data-empty-goto]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveView(button.dataset.emptyGoto);
      render();
    });
  });
}

/**
 * Two-column hero banner (forest background, photo on the right) usable on
 * any page — generalized from the Dashboard-only .dashboard-hero. Sticker
 * accents are page-specific composition (varies per screen), not part of
 * this shared shell, so they're passed in pre-rendered.
 */
export function pageHero({ eyebrow, title, subtitle, photo, stickersHtml = "", ctaHtml = "" } = {}) {
  return `
    <section class="page-hero">
      <div>
        ${eyebrow ? `<p class="page-hero-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        ${ctaHtml}
      </div>
      ${
        photo
          ? `<div class="page-hero-photo-wrap">
               <img class="page-hero-photo" src="${escapeHtml(photo)}" alt="" loading="lazy" />
               ${stickersHtml}
             </div>`
          : ""
      }
    </section>
  `;
}

/**
 * Shared header for Business Profile and My Organization: cover strip,
 * avatar/logo, name, optional verification-style badge, and a metadata row
 * (location, website, founded, etc — pass only fields the record actually
 * has; never fabricate a value the schema doesn't capture).
 */
export function profileHeader({ name, avatarPhoto, avatarInitial, badge, meta = [] } = {}) {
  return `
    <section class="profile-header">
      <div class="profile-header-cover"></div>
      <div class="profile-header-body">
        <span class="profile-header-avatar">
          ${avatarPhoto ? `<img src="${escapeHtml(avatarPhoto)}" alt="" />` : escapeHtml(avatarInitial || "?")}
        </span>
        <div class="profile-header-identity">
          <h1>${escapeHtml(name)}</h1>
          <div class="profile-header-meta">
            ${badge ? `<span class="profile-header-badge">${badge.icon || ""} ${escapeHtml(badge.label)}</span>` : ""}
            ${meta.map((item) => `<span>${item.icon || ""} ${escapeHtml(item.text)}</span>`).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generic tab bar. `tabs` is [{key, label, count}]; `active` is the current
 * key. Reuses the existing .tab-btn/.tab-count visual language (same rules
 * as the dashboard's tab browser) so every tabbed page looks consistent.
 */
export function tabsBar(tabs, active) {
  return `
    <div class="tabs" role="tablist">
      ${tabs
        .map(
          (tab) => `
        <button type="button" class="tab-btn ${tab.key === active ? "active" : ""}" role="tab" aria-selected="${tab.key === active}" data-tab-key="${escapeHtml(tab.key)}">
          ${escapeHtml(tab.label)}${typeof tab.count === "number" ? ` <span class="tab-count">${tab.count}</span>` : ""}
        </button>
      `
        )
        .join("")}
    </div>
  `;
}

/** Wires a tabsBar()'s buttons inside `root` to call `onSelect(key)`. */
export function wireTabsBar(root, onSelect) {
  root.querySelectorAll("[data-tab-key]").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.tabKey));
  });
}

/**
 * Right-rail filter panel. `fields` is [{key, label, options}] rendered as
 * selects; `checkboxes` is [{key, label}]. Only pass filters the current
 * data model can actually answer — see the audit note on not fabricating
 * functionality. `values` is the current filter state, keyed the same way.
 */
export function filterPanel({ title = "Filters", fields = [], checkboxes = [], values = {} } = {}) {
  return `
    <section class="filter-panel">
      <div class="filter-panel-head">
        <h2>${escapeHtml(title)}</h2>
        <button type="button" class="filter-panel-reset" data-filter-reset>Reset</button>
      </div>
      ${fields
        .map(
          (field) => `
        <div class="filter-field">
          <label for="filter-${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
          <select id="filter-${escapeHtml(field.key)}" data-filter-key="${escapeHtml(field.key)}">
            <option value="">All</option>
            ${field.options
              .map((opt) => `<option value="${escapeHtml(opt)}" ${values[field.key] === opt ? "selected" : ""}>${escapeHtml(opt)}</option>`)
              .join("")}
          </select>
        </div>
      `
        )
        .join("")}
      ${checkboxes
        .map(
          (box) => `
        <label class="filter-checkbox">
          <input type="checkbox" data-filter-checkbox="${escapeHtml(box.key)}" ${values[box.key] ? "checked" : ""} />
          ${escapeHtml(box.label)}
        </label>
      `
        )
        .join("")}
      <button type="button" class="primary-btn" data-filter-apply style="width:100%;margin-top:6px;">Apply Filters</button>
    </section>
  `;
}

/** Wires a filterPanel()'s controls inside `root`. `onApply(values)` fires
 * on Apply click with the current select/checkbox state; `onReset()` fires
 * on Reset. Caller owns state and re-renders. */
export function wireFilterPanel(root, onApply, onReset) {
  root.querySelector("[data-filter-apply]")?.addEventListener("click", () => {
    const values = {};
    root.querySelectorAll("[data-filter-key]").forEach((select) => {
      if (select.value) values[select.dataset.filterKey] = select.value;
    });
    root.querySelectorAll("[data-filter-checkbox]").forEach((box) => {
      if (box.checked) values[box.dataset.filterCheckbox] = true;
    });
    onApply(values);
  });
  root.querySelector("[data-filter-reset]")?.addEventListener("click", onReset);
}
