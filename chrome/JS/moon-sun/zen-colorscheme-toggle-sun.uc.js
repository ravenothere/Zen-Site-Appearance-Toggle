// ==UserScript==
// @name           zen-colorscheme-toggle (moon/sun variant)
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

  function getState(lightSrc) {
    const dark   = websitesAreDark();
    const isAuto = getCurrentPref() === 3;
    return {
      src:     dark ? MOON_SRC : lightSrc,
      tooltip: dark ? "Switch to Light" : "Switch to Dark",
      next:    isAuto ? (dark ? 1 : 0) : 3,
    };
  }

  function refreshBtn(btn, lightSrc) {
    if (!btn) return;
    const s = getState(lightSrc);
    btn.setAttribute("tooltiptext", s.tooltip);
    btn.setAttribute("aria-label",  s.tooltip);
    const img = btn.querySelector(".toolbarbutton-icon");
    if (img) img.setAttribute("src", s.src);
  }

  const WS_OPTIONS = [
    { label: "Workspace: Auto",  value: 0, id: "zen-ws-item-auto"  },
    { label: "Workspace: Dark",  value: 2, id: "zen-ws-item-dark"  },
    { label: "Workspace: Light", value: 1, id: "zen-ws-item-light" },
  ];

  function setupContextMenu(btn) {
    const toolbarCtx = document.getElementById("toolbar-context-menu");
    if (!toolbarCtx) return;

    const sep = document.createXULElement("menuseparator");
    sep.id = "zen-ws-sep";
    sep.hidden = true;
    toolbarCtx.appendChild(sep);

    for (const opt of WS_OPTIONS) {
      const item = document.createXULElement("menuitem");
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
      document.getElementById("zen-ws-sep").hidden = !show;
      const uuid    = getActiveWorkspaceId();
      const current = getWorkspaceDefault(uuid);
      for (const opt of WS_OPTIONS) {
        const item = document.getElementById(opt.id);
        item.hidden = !show;
        if (show) item.setAttribute("checked", current === opt.value ? "true" : "false");
      }
    });
  }

  function refreshAll() {
    UC_API.Windows.forEach(doc => {
      refreshBtn(doc.getElementById(WIDGET_ID), SUN_SRC);
    });
  }

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
          const uuid = getActiveWorkspaceId();
          const s = getState(SUN_SRC);
          Services.prefs.setIntPref(PREF, s.next);
          if (uuid) {
            const sessionVal = s.next === 1 ? 1 : s.next === 0 ? 2 : 0;
            _sessionState.set(uuid, sessionVal);
          }
          refreshAll();
        },
      });

      gBrowser.tabContainer.addEventListener("TabSelect", onTabSelect);
    }

    UC_API.Runtime.startupFinished().then(() => {
      const btn = document.getElementById(WIDGET_ID);
      const initialId = getActiveWorkspaceId();
      _lastWorkspaceId = initialId;
      applyWorkspaceState(initialId);
      setupContextMenu(btn);
    });
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init, { once: true });
  }

})();
