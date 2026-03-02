// ==UserScript==
// @name           zen-colorscheme-toggle (moon/sun variant)
// @description    Two-state website appearance toggle. Sun = light, Moon = dark.
//                 Drag it anywhere via the customize toolbar screen.
// ==/UserScript==

(function () {
  "use strict";

  const PREF      = "layout.css.prefers-color-scheme.content-override";
  const WIDGET_ID = "zen-colorscheme-toggle";

  function makeSrc(svgContent) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(svgContent);
  }

  const MOON_SRC = makeSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="context-fill" fill-opacity="context-fill-opacity">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`);

  const SUN_SRC = makeSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="context-fill" fill-opacity="context-fill-opacity">
    <circle cx="12" cy="12" r="4.5"/>
    <rect x="10.75" y="1"  width="2.5" height="4" rx="1.25" ry="1.25"/>
    <rect x="10.75" y="1"  width="2.5" height="4" rx="1.25" ry="1.25" transform="rotate(45 12 12)"/>
    <rect x="10.75" y="1"  width="2.5" height="4" rx="1.25" ry="1.25" transform="rotate(90 12 12)"/>
    <rect x="10.75" y="1"  width="2.5" height="4" rx="1.25" ry="1.25" transform="rotate(135 12 12)"/>
    <rect x="10.75" y="1"  width="2.5" height="4" rx="1.25" ry="1.25" transform="rotate(180 12 12)"/>
    <rect x="10.75" y="1"  width="2.5" height="4" rx="1.25" ry="1.25" transform="rotate(225 12 12)"/>
    <rect x="10.75" y="1"  width="2.5" height="4" rx="1.25" ry="1.25" transform="rotate(270 12 12)"/>
    <rect x="10.75" y="1"  width="2.5" height="4" rx="1.25" ry="1.25" transform="rotate(315 12 12)"/>
  </svg>`);

  // ── State ─────────────────────────────────────────────────────────────

  function systemPrefersDark() {
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches; }
    catch { return false; }
  }

  function getCurrentPref() {
    try { return Services.prefs.getIntPref(PREF, 3); }
    catch { return 3; }
  }

  function websitesAreDark() {
    const p = getCurrentPref();
    if (p === 0) return true;
    if (p === 1) return false;
    return systemPrefersDark();
  }

  function getState() {
    const dark   = websitesAreDark();
    const isAuto = getCurrentPref() === 3;
    return {
      src:     dark ? MOON_SRC : SUN_SRC,
      tooltip: dark ? "Switch to Light" : "Switch to Dark",
      next:    isAuto ? (dark ? 1 : 0) : 3,
    };
  }

  // ── Refresh ───────────────────────────────────────────────────────────

  function refreshBtn(btn) {
    if (!btn) return;
    const s = getState();
    btn.setAttribute("tooltiptext", s.tooltip);
    btn.setAttribute("aria-label",  s.tooltip);
    const img = btn.querySelector(".toolbarbutton-icon");
    if (img) img.setAttribute("src", s.src);
  }

  function refreshAll() {
    UC_API.Windows.forEach(doc => {
      refreshBtn(doc.getElementById(WIDGET_ID));
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────

  function init() {
    if (!window.UC_API) { window.setTimeout(init, 500); return; }

    if (!window._zenCSToggleRegistered) {
      window._zenCSToggleRegistered = true;

      UC_API.Utils.createWidget({
        id:        WIDGET_ID,
        type:      "toolbarbutton",
        label:     "Website Appearance",
        tooltip:   "Toggle Website Appearance",
        allEvents: false,
        callback:  function (event, win) {
          const s = getState();
          Services.prefs.setIntPref(PREF, s.next);
          refreshAll();
        },
      });
    }

    UC_API.Runtime.startupFinished().then(() => {
      refreshBtn(document.getElementById(WIDGET_ID));
    });
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init, { once: true });
  }

})();
