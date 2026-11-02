// A just-enough stand-in for the chrome.* APIs the side panel uses, fed by
// window.__SAMPLE (data.js). Only used to render screenshots.
(function () {
  const S = window.__SAMPLE;
  const ev = () => ({ addListener() {}, removeListener() {} });
  let nextId = 100;
  const tabs = [];
  const index = { 1: 0, 2: 0 };
  for (const g of S.groups) {
    for (const t of g.tabs) {
      tabs.push({ id: nextId++, windowId: g.windowId, index: index[g.windowId]++, groupId: g.id,
        title: t.title, url: t.url, active: t.url === S.activeUrl });
    }
  }
  for (const t of S.ungrouped) tabs.push({ id: nextId++, index: index[t.windowId]++, groupId: -1, active: false, ...t });
  const groups = S.groups.map(({ tabs: _t, ...g }) => g);
  const ok = (v) => Promise.resolve(v);

  window.chrome = {
    tabGroups: {
      query: () => ok(groups.slice()), get: (id) => ok(groups.find((g) => g.id === id)), update: () => ok(),
      onCreated: ev(), onRemoved: ev(), onUpdated: ev(), onMoved: ev(),
    },
    tabs: {
      query: () => ok(tabs.map((t) => ({ ...t }))), update: () => ok(), remove: () => ok(), create: () => ok(),
      onCreated: ev(), onRemoved: ev(), onUpdated: ev(), onMoved: ev(), onAttached: ev(), onDetached: ev(), onActivated: ev(),
    },
    windows: { WINDOW_ID_CURRENT: -2, getCurrent: () => ok({ id: 1 }), update: () => ok(), create: () => ok(), onFocusChanged: ev() },
    storage: {
      local: { get: () => ok({ library: S.library }) },
      session: { get: () => ok({ links: {} }) },
      onChanged: ev(),
    },
    runtime: { getURL: (p) => 'https://favicon.mock' + p, sendMessage: () => ok({ ok: true }) },
    sessions: { getDevices: () => ok(S.devices), restore: () => ok() },
  };
})();
