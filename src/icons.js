// Small hand-authored SVG icon set (24x24, single-color stroke) so the
// dashboard doesn't rely on emoji or an external icon-font dependency.
function icon(paths, viewBox = "0 0 24 24") {
  return `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export const ICONS = {
  search: icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  bell: icon('<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 21a2 2 0 0 0 4 0"/>'),
  chevronDown: icon('<path d="M6 9l6 6 6-6"/>'),
  users: icon('<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 8.2a3.2 3.2 0 1 1 3 4.5"/><path d="M17.5 14c2.6.4 4 2.2 4 6"/>'),
  briefcase: icon('<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>'),
  heart: icon('<path d="M12 20s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z"/>'),
  link: icon('<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>'),
  send: icon('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>'),
  arrowRight: icon('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
  leaf: icon('<path d="M5 21c9 0 14-5 14-14V5h-2C8 5 3 10 3 19v2z"/><path d="M5 21c0-4 3-9 8-12"/>'),
  check: icon('<path d="M5 13l4 4 10-10"/>'),
  headset: icon('<path d="M4 13a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M20 19a4 4 0 0 1-4 3h-2"/>'),
  mapPin: icon('<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/>'),
  calendar: icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
  clock: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
  document: icon('<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>'),
  dots: icon('<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>'),
  close: icon('<path d="M18 6 6 18"/><path d="M6 6l12 12"/>'),
  bookmark: icon('<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>'),
  star: icon('<path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.7z"/>'),
  undo: icon('<path d="M3 10h9a5 5 0 0 1 0 10h-2"/><path d="M8 5 3 10l5 5"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  handshake: icon('<path d="m3 12 3-3 4 4 4-4 4 3"/><path d="m6 9 2-2 4 2 4-2 2 2"/><path d="m3 12 3 6h4l2-2 2 2h4l3-6"/>'),
};
