// ==UserScript==
// @name           zen-colorscheme-toggle
// @description    Two-state website appearance toggle. Sparkle = light, Moon = dark.
//                 Drag it anywhere via the customize toolbar screen.
// ==/UserScript==

(function () {
  "use strict";

  const PREF      = "layout.css.prefers-color-scheme.content-override";
  const WIDGET_ID = "zen-colorscheme-toggle";

  // ── Icons as data URIs (goes into <image src="..."> directly) ─────────
  // The <image class="toolbarbutton-icon"> already exists in the button DOM,
  // we just set its src. No extra elements needed — hover works natively.

  function makeSrc(svgContent) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(svgContent);
  }

  const MOON_SRC = makeSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="context-fill" fill-opacity="context-fill-opacity">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`);

  const SPARKLE_SRC = makeSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="context-fill" fill-opacity="context-fill-opacity">
    <path d="M16 2c0 0 1.1 5.2 2.8 7 1.7 1.8 6.7 3 6.7 3s-5 1.2-6.7 3c-1.7 1.8-2.8 7-2.8 7s-1.1-5.2-2.8-7C11.5 13.2 6.5 12 6.5 12s5-1.2 6.7-3C14.9 7.2 16 2 16 2z"/>
    <path d="M5.5 2c0 0 .6 2.6 1.6 3.6C8.1 6.6 10.5 7.2 10.5 7.2S8.1 7.8 7.1 8.8C6.1 9.8 5.5 12.4 5.5 12.4S4.9 9.8 3.9 8.8C2.9 7.8.5 7.2.5 7.2S2.9 6.6 3.9 5.6C4.9 4.6 5.5 2 5.5 2z"/>
    <path d="M4.5 14c0 0 .5 2 1.2 2.7C6.4 17.4 8.5 18 8.5 18s-2.1.6-2.8 1.3C5 20 4.5 22 4.5 22s-.5-2-1.2-2.7C2.6 18.6.5 18 .5 18s2.1-.6 2.8-1.3C4 16 4.5 14 4.5 14z"/>
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
      src:     dark ? MOON_SRC : SPARKLE_SRC,
      tooltip: dark ? "Switch to Light" : "Switch to Dark",
      next:    isAuto ? (dark ? 1 : 0) : 3,
    };
  }

  // ── Refresh — set src on the existing <image> element ─────────────────

  function refreshBtn(btn) {
    if (!btn) return;
    const s = getState();
    btn.setAttribute("tooltiptext", s.tooltip);
    btn.setAttribute("aria-label",  s.tooltip);

    // Set the src of the existing toolbarbutton-icon image — no new elements
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
