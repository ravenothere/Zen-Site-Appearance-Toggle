// ==UserScript==
// @name           zen-colorscheme-toggle
// @description    Two-state website appearance toggle. Moon = dark, Sparkle/Sun = light.
//                 Drag it anywhere via the customize toolbar screen.
//                 Sine-compatible version.
// ==/UserScript==

(function () {
  "use strict";

  const PREF      = "layout.css.prefers-color-scheme.content-override";
  const WIDGET_ID = "zen-colorscheme-toggle";

  const P = {
    ICONSET:         "mod.zensiteappearancetoggle.iconset",
    LIGHTICON:       "mod.zensiteappearancetoggle.lighticon",
    OVERRIDE_MOON:   "mod.zensiteappearancetoggle.override.moon",
    OVERRIDE_SPARKLE:"mod.zensiteappearancetoggle.override.sparkle",
    OVERRIDE_SUN:    "mod.zensiteappearancetoggle.override.sun",
  };

  // ── Icon sources ──────────────────────────────────────────────────────

  function makeSrc(svgContent) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(svgContent);
  }

  // Original icons
  const ORIG_MOON = makeSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="context-fill" fill-opacity="context-fill-opacity">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`);

  const ORIG_SPARKLE = makeSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="context-fill" fill-opacity="context-fill-opacity">
    <path d="M16 2c0 0 1.1 5.2 2.8 7 1.7 1.8 6.7 3 6.7 3s-5 1.2-6.7 3c-1.7 1.8-2.8 7-2.8 7s-1.1-5.2-2.8-7C11.5 13.2 6.5 12 6.5 12s5-1.2 6.7-3C14.9 7.2 16 2 16 2z"/>
    <path d="M5.5 2c0 0 .6 2.6 1.6 3.6C8.1 6.6 10.5 7.2 10.5 7.2S8.1 7.8 7.1 8.8C6.1 9.8 5.5 12.4 5.5 12.4S4.9 9.8 3.9 8.8C2.9 7.8.5 7.2.5 7.2S2.9 6.6 3.9 5.6C4.9 4.6 5.5 2 5.5 2z"/>
    <path d="M4.5 14c0 0 .5 2 1.2 2.7C6.4 17.4 8.5 18 8.5 18s-2.1.6-2.8 1.3C5 20 4.5 22 4.5 22s-.5-2-1.2-2.7C2.6 18.6.5 18 .5 18s2.1-.6 2.8-1.3C4 16 4.5 14 4.5 14z"/>
  </svg>`);

  const ORIG_SUN = makeSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="context-fill" fill-opacity="context-fill-opacity">
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

  // Zen built-in icons
  const ZEN_MOON    = "chrome://browser/skin/zen-icons/moon-stars.svg";
  const ZEN_SPARKLE = "chrome://browser/skin/zen-icons/sparkles.svg";
  const ZEN_SUN     = "chrome://browser/skin/zen-icons/face-sun.svg";

  // ── Preference helpers ────────────────────────────────────────────────

  function getInt(key, def) {
    try { return Services.prefs.getIntPref(key, def); }
    catch { return def; }
  }

  // ── Icon resolution ───────────────────────────────────────────────────
  // Priority: individual override > icon set

  function resolveIcon(overridePref, origIcon, zenIcon) {
    const override = getInt(overridePref, 0);
    if (override === 1) return origIcon;
    if (override === 2) return zenIcon;
    // Auto — follow the icon set
    return getInt(P.ICONSET, 0) === 1 ? zenIcon : origIcon;
  }

  function getMoonSrc() {
    return resolveIcon(P.OVERRIDE_MOON, ORIG_MOON, ZEN_MOON);
  }

  function getLightSrc() {
    const useSun = getInt(P.LIGHTICON, 0) === 1;
    if (useSun) {
      return resolveIcon(P.OVERRIDE_SUN, ORIG_SUN, ZEN_SUN);
    } else {
      return resolveIcon(P.OVERRIDE_SPARKLE, ORIG_SPARKLE, ZEN_SPARKLE);
    }
  }

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
      src:     dark ? getMoonSrc() : getLightSrc(),
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
    for (const win of CustomizableUI.windows) {
      refreshBtn(win.document.getElementById(WIDGET_ID));
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────

  function init() {
    if (!window._zenCSToggleRegistered) {
      window._zenCSToggleRegistered = true;

      CustomizableUI.createWidget({
        id:          WIDGET_ID,
        type:        "button",
        defaultArea: CustomizableUI.AREA_NAVBAR,
        label:       "Website Appearance",
        tooltiptext: "Toggle Website Appearance",
        onCreated(btn) {
          refreshBtn(btn);
        },
        onCommand() {
          const s = getState();
          Services.prefs.setIntPref(PREF, s.next);
          refreshAll();
        },
      });

      // Live-update icon whenever any icon preference changes in Sine settings
      for (const key of Object.values(P)) {
        Services.prefs.addObserver(key, () => refreshAll());
      }
    }

    refreshBtn(document.getElementById(WIDGET_ID));
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init, { once: true });
  }

})();
