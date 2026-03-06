// ==UserScript==
// @name           zen-colorscheme-toggle
// @description    Two-state website appearance toggle with per-workspace defaults.
//                 Left-click to toggle. Right-click to set a default for the current workspace.
//                 Drag it anywhere via the customize toolbar screen.
// @author         ravenothere
// @version        1.1.0
// @grant          none
// ==/UserScript==


(function () {
  "use strict";

  const PREF        = "layout.css.prefers-color-scheme.content-override";
  const WIDGET_ID   = "zen-colorscheme-toggle";
  const WS_MAP_PREF = "mod.zensiteappearancetoggle.workspacemap";

  const P = {
    ICONSET:          "mod.zensiteappearancetoggle.iconset",
    LIGHTICON:        "mod.zensiteappearancetoggle.lighticon",
    OVERRIDE_MOON:    "mod.zensiteappearancetoggle.override.moon",
    OVERRIDE_SPARKLE: "mod.zensiteappearancetoggle.override.sparkle",
    OVERRIDE_SUN:     "mod.zensiteappearancetoggle.override.sun",
  };

  function makeSrc(svgContent) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(svgContent);
  }

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

  const ZEN_MOON    = "chrome://browser/skin/zen-icons/moon-stars.svg";
  const ZEN_SPARKLE = "chrome://browser/skin/zen-icons/sparkles.svg";
  const ZEN_SUN     = "chrome://browser/skin/zen-icons/face-sun.svg";

  function getInt(key, def) {
    try { return Services.prefs.getIntPref(key, def); }
    catch { return def; }
  }

  function getWorkspaceMap() {
    try { return JSON.parse(Services.prefs.getStringPref(WS_MAP_PREF, "{}")); }
    catch { return {}; }
  }

  function setWorkspaceMap(map) {
    Services.prefs.setStringPref(WS_MAP_PREF, JSON.stringify(map));
  }

  function getActiveWorkspaceId() {
    try { return gBrowser.selectedTab.getAttribute("zen-workspace-id") || null; }
    catch { return null; }
  }

  function getWorkspaceDefault(uuid) {
    if (!uuid) return 0;
    return getWorkspaceMap()[uuid] ?? 0;
  }

  function setWorkspaceDefault(uuid, value) {
    if (!uuid) return;
    const map = getWorkspaceMap();
    map[uuid] = value;
    setWorkspaceMap(map);
    _sessionState.set(uuid, value);
  }

  const _sessionState = new Map();

  function getEffectiveState(uuid) {
    if (_sessionState.has(uuid)) return _sessionState.get(uuid);
    return getWorkspaceDefault(uuid);
  }

  function applyWorkspaceState(uuid) {
    const state = getEffectiveState(uuid);
    if (state === 1) {
      Services.prefs.setIntPref(PREF, 1);
    } else if (state === 2) {
      Services.prefs.setIntPref(PREF, 0);
    } else {
      Services.prefs.setIntPref(PREF, 3);
    }
    refreshAll();
  }

  let _lastWorkspaceId = null;

  function onTabSelect() {
    const currentId = getActiveWorkspaceId();
    if (currentId !== _lastWorkspaceId) {
      _lastWorkspaceId = currentId;
      applyWorkspaceState(currentId);
    }
  }

  // ── Icon resolution ───────────────────────────────────────────────────

  function resolveIcon(overridePref, origIcon, zenIcon) {
    const override = getInt(overridePref, 0);
    if (override === 1) return origIcon;
    if (override === 2) return zenIcon;
    return getInt(P.ICONSET, 0) === 1 ? zenIcon : origIcon;
  }

  function getMoonSrc() {
    return resolveIcon(P.OVERRIDE_MOON, ORIG_MOON, ZEN_MOON);
  }

  function getLightSrc() {
    return getInt(P.LIGHTICON, 0) === 1
      ? resolveIcon(P.OVERRIDE_SUN, ORIG_SUN, ZEN_SUN)
      : resolveIcon(P.OVERRIDE_SPARKLE, ORIG_SPARKLE, ZEN_SPARKLE);
  }

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

  // ── Context menu ──────────────────────────────────────────────────────

  const WS_OPTIONS = [
    { label: "Workspace: Auto",  value: 0, id: "zen-ws-item-auto"  },
    { label: "Workspace: Dark",  value: 2, id: "zen-ws-item-dark"  },
    { label: "Workspace: Light", value: 1, id: "zen-ws-item-light" },
  ];

  function setupContextMenu(btn, doc) {
    const toolbarCtx = doc.getElementById("toolbar-context-menu");
    if (!toolbarCtx) return;

    const sep = doc.createXULElement("menuseparator");
    sep.id = "zen-ws-sep";
    sep.hidden = true;
    toolbarCtx.appendChild(sep);

    for (const opt of WS_OPTIONS) {
      const item = doc.createXULElement("menuitem");
      item.id = opt.id;
      item.setAttribute("label", opt.label);
      item.setAttribute("type", "radio");
      item.setAttribute("name", "zen-ws-appearance");
      item.setAttribute("checked", "false");
      item.hidden = true;
      item.addEventListener("command", () => {
        const uuid = getActiveWorkspaceId();
        setWorkspaceDefault(uuid, opt.value);
        applyWorkspaceState(uuid);
      });
      toolbarCtx.appendChild(item);
    }

    let _fromOurBtn = false;
    btn.addEventListener("contextmenu", () => { _fromOurBtn = true; }, true);

    toolbarCtx.addEventListener("popupshowing", () => {
      const show = _fromOurBtn;
      _fromOurBtn = false;

      doc.getElementById("zen-ws-sep").hidden = !show;

      const uuid    = getActiveWorkspaceId();
      const current = getWorkspaceDefault(uuid);

      for (const opt of WS_OPTIONS) {
        const item = doc.getElementById(opt.id);
        item.hidden = !show;
        if (show) item.setAttribute("checked", current === opt.value ? "true" : "false");
      }
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────

  function init() {
    CustomizableUI.createWidget({
      id:          WIDGET_ID,
      type:        "button",
      defaultArea: CustomizableUI.AREA_NAVBAR,
      label:       "Website Appearance",
      tooltiptext: "Toggle Website Appearance",
      onCreated(btn) {
        setTimeout(() => refreshBtn(btn), 0);
        setupContextMenu(btn, btn.ownerDocument);
      },
      onCommand() {
        const s = getState();
        Services.prefs.setIntPref(PREF, s.next);
        const uuid = getActiveWorkspaceId();
        if (uuid) {
          const sessionVal = s.next === 1 ? 1 : s.next === 0 ? 2 : 0;
          _sessionState.set(uuid, sessionVal);
        }
        refreshAll();
      },
    });

    gBrowser.tabContainer.addEventListener("TabSelect", onTabSelect);

    for (const key of Object.values(P)) {
      Services.prefs.addObserver(key, () => refreshAll());
    }

    const initialId = getActiveWorkspaceId();
    _lastWorkspaceId = initialId;
    applyWorkspaceState(initialId);
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init, { once: true });
  }

})();
