'use strict';

// Project Tabs keeps its own permanent library of every tab group it has
// seen (title, color, tabs). Chrome doesn't let extensions read saved groups
// while they're closed, so the library is what lets the panel list and reopen
// closed projects. Open groups are linked to their library entry; when a
// group closes (from the panel, Chrome's tab strip, or with its window) the
// entry simply stays in the library with its last known tabs.

const LIB_KEY = 'library';   // storage.local: [{ id, title, color, tabs: [{ url, title }], createdAt, lastSeen }]
const LINKS_KEY = 'links';   // storage.session: { [groupId]: libraryId } for groups open right now

function enablePanelOnClick() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => { enablePanelOnClick(); serial(migrate).then(scheduleSync); });
chrome.runtime.onStartup.addListener(() => { enablePanelOnClick(); scheduleSync(); });
enablePanelOnClick();

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-panel' && tab) chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
});

// All library reads/writes go through one queue so they never interleave.
let queue = Promise.resolve();
function serial(fn) {
  const p = queue.then(fn, fn);
  queue = p.catch((e) => console.warn(e));
  return p;
}

let timer = null;
function scheduleSync() {
  clearTimeout(timer);
  timer = setTimeout(() => serial(sync), 400);
}

const tabUrl = (t) => t.url || t.pendingUrl || '';

async function load() {
  const [loc, ses] = await Promise.all([chrome.storage.local.get(LIB_KEY), chrome.storage.session.get(LINKS_KEY)]);
  return { lib: loc[LIB_KEY] || [], links: ses[LINKS_KEY] || {} };
}

function newEntry(fields) {
  return { id: crypto.randomUUID(), title: '', color: 'grey', tabs: [], createdAt: Date.now(), lastSeen: Date.now(), ...fields };
}

function overlap(a, b) {
  const set = new Set(a.map((t) => t.url));
  const hits = b.filter((t) => set.has(t.url)).length;
  return hits / Math.max(1, Math.min(a.length, b.length));
}

// Match every open group to a library entry (creating one if needed) and
// copy its current title, color and tabs into that entry.
async function sync() {
  const [groups, tabs, { lib, links: oldLinks }] = await Promise.all([
    chrome.tabGroups.query({}), chrome.tabs.query({}), load(),
  ]);
  const before = JSON.stringify(lib);
  const byId = new Map(lib.map((e) => [e.id, e]));

  const groupTabs = new Map();
  for (const t of tabs.sort((a, b) => a.windowId - b.windowId || a.index - b.index)) {
    if (t.groupId < 0 || !tabUrl(t)) continue;
    if (!groupTabs.has(t.groupId)) groupTabs.set(t.groupId, []);
    groupTabs.get(t.groupId).push({ url: tabUrl(t), title: t.title || '' });
  }

  const links = {};
  const claimed = new Set();
  for (const g of groups) {
    const id = oldLinks[g.id];
    if (id && byId.has(id) && !claimed.has(id)) { links[g.id] = id; claimed.add(id); }
  }
  for (const g of groups) {
    if (links[g.id]) continue;
    const gTabs = groupTabs.get(g.id) || [];
    const title = (g.title || '').trim();
    const free = lib.filter((e) => !claimed.has(e.id));
    let e;
    if (title) {
      const same = free.filter((x) => x.title.trim() === title);
      e = same.find((x) => x.color === g.color) || same[0];
    } else if (gTabs.length) {
      e = free.filter((x) => !x.title.trim() && overlap(x.tabs, gTabs) >= 0.5)
        .sort((a, b) => overlap(b.tabs, gTabs) - overlap(a.tabs, gTabs))[0];
    }
    if (!e) {
      if (!gTabs.length) continue;  // empty group still loading; catch it next time
      e = newEntry({});
      lib.unshift(e);
      byId.set(e.id, e);
    }
    links[g.id] = e.id;
    claimed.add(e.id);
  }

  const now = Date.now();
  for (const g of groups) {
    const e = byId.get(links[g.id]);
    if (!e) continue;
    e.title = g.title || '';
    e.color = g.color;
    const gTabs = groupTabs.get(g.id) || [];
    if (gTabs.length) e.tabs = gTabs;  // never wipe the last good copy
    e.lastSeen = now;
  }

  // Only write when something other than lastSeen changed (or links did).
  const strip = (s) => s.replace(/"lastSeen":\d+/g, '');
  if (strip(JSON.stringify(lib)) !== strip(before)) await chrome.storage.local.set({ [LIB_KEY]: lib });
  if (JSON.stringify(links) !== JSON.stringify(oldLinks)) await chrome.storage.session.set({ [LINKS_KEY]: links });
}

// One-time move of the old Archived / Recently closed lists into the library.
async function migrate() {
  const old = await chrome.storage.local.get(['archives', 'recentlyClosed']);
  const items = [...(old.archives || []), ...(old.recentlyClosed || [])];
  if (!old.archives && !old.recentlyClosed) return;
  const { lib } = await load();
  for (const e of items) {
    if (!e || !Array.isArray(e.tabs) || !e.tabs.length) continue;
    lib.push(newEntry({ title: e.title || '', color: e.color || 'grey', tabs: e.tabs, lastSeen: e.savedAt || Date.now() }));
  }
  await chrome.storage.local.set({ [LIB_KEY]: lib });
  await chrome.storage.local.remove(['archives', 'recentlyClosed']);
}

// ---- Actions requested by the side panel ----

async function openEntry(id, windowId) {
  await sync();
  const { lib, links } = await load();
  const e = lib.find((x) => x.id === id);
  if (!e) return { error: 'That project no longer exists.' };

  const openGroupId = Object.keys(links).find((gid) => links[gid] === id);
  if (openGroupId) {
    const [tab] = await chrome.tabs.query({ groupId: Number(openGroupId) });
    if (tab) {
      await chrome.tabGroups.update(Number(openGroupId), { collapsed: false }).catch(() => {});
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      return { ok: true };
    }
  }

  const ids = [];
  for (const [i, t] of e.tabs.entries()) {
    try {
      const tab = await chrome.tabs.create({ windowId, url: t.url, active: i === 0 });
      ids.push(tab.id);
    } catch (err) { console.warn('Could not reopen', t.url, err); }
  }
  if (!ids.length) return { error: 'None of the tabs in this project could be reopened.' };
  const groupId = await chrome.tabs.group({ tabIds: ids, createProperties: { windowId } });
  await chrome.tabGroups.update(groupId, { title: e.title, color: e.color || 'grey' });
  links[groupId] = id;
  await chrome.storage.session.set({ [LINKS_KEY]: links });
  await sync();
  return { ok: true };
}

async function closeGroup(groupId) {
  await sync();  // make sure the library has the latest tabs first
  const tabs = await chrome.tabs.query({ groupId });
  if (!tabs.length) return { ok: true };
  // Don't let Chrome close the window if this group is all that's in it.
  const winTabs = await chrome.tabs.query({ windowId: tabs[0].windowId });
  if (winTabs.length <= tabs.length) await chrome.tabs.create({ windowId: tabs[0].windowId });
  // Ungroup first so Chrome doesn't also keep its own saved copy of the
  // group; the library is the one place closed projects live.
  const ids = tabs.map((t) => t.id);
  await chrome.tabs.ungroup(ids).catch(() => {});
  await chrome.tabs.remove(ids);
  const { links } = await load();
  delete links[groupId];
  await chrome.storage.session.set({ [LINKS_KEY]: links });
  return { ok: true };
}

async function addEntries(entries) {
  const { lib } = await load();
  const added = [];
  for (const e of entries) {
    const tabs = (e.tabs || []).filter((t) => t && t.url).map((t) => ({ url: String(t.url), title: String(t.title || '') }));
    if (!tabs.length) continue;
    added.push(newEntry({ title: String(e.title || ''), color: e.color || 'grey', tabs, lastSeen: e.lastSeen || e.savedAt || Date.now() }));
  }
  await chrome.storage.local.set({ [LIB_KEY]: [...added, ...lib] });
  return { ok: true, added: added.length };
}

async function forgetEntry(id) {
  const { lib, links } = await load();
  if (Object.values(links).includes(id)) return { error: 'Close the project before removing it.' };
  await chrome.storage.local.set({ [LIB_KEY]: lib.filter((e) => e.id !== id) });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  const run = {
    open: () => openEntry(msg.id, msg.windowId),
    close: () => closeGroup(msg.groupId),
    add: () => addEntries(msg.entries || []),
    forget: () => forgetEntry(msg.id),
    sync: () => sync().then(() => ({ ok: true })),
  }[msg && msg.type];
  if (!run) return false;
  serial(run).then(reply, (e) => reply({ error: String(e && e.message || e) }));
  return true;  // reply asynchronously
});

// ---- Free memory when a group collapses ----
// When a group is collapsed (from Chrome's tab strip, Focus, or Collapse
// others), its tabs are discarded: they stay in the strip but are unloaded
// from memory, and reload when you open them again.

const DISCARD_DELAY_MS = 1000;
const discardTimers = new Map(); // groupId -> timeout

function scheduleDiscard(groupId) {
  clearTimeout(discardTimers.get(groupId));
  // Wait a moment: collapsing the active tab's group makes Chrome switch
  // to another tab first, and a quick collapse/expand should be a no-op.
  discardTimers.set(groupId, setTimeout(() => {
    discardTimers.delete(groupId);
    discardGroup(groupId).catch(() => {});
  }, DISCARD_DELAY_MS));
}

async function discardGroup(groupId) {
  const group = await chrome.tabGroups.get(groupId).catch(() => null);
  if (!group || !group.collapsed) return;
  const tabs = await chrome.tabs.query({ groupId });
  for (const t of tabs) {
    // Keep the tab you're looking at, tabs playing sound, and ones already unloaded.
    if (t.active || t.audible || t.discarded) continue;
    await chrome.tabs.discard(t.id).catch(() => {});
  }
}

chrome.tabGroups.onCreated.addListener(scheduleSync);
chrome.tabGroups.onUpdated.addListener((group) => {
  if (group.collapsed) scheduleDiscard(group.id);
  else clearTimeout(discardTimers.get(group.id));
  scheduleSync();
});
chrome.tabs.onCreated.addListener(scheduleSync);
chrome.tabs.onRemoved.addListener(scheduleSync);
chrome.tabs.onMoved.addListener(scheduleSync);
chrome.tabs.onAttached.addListener(scheduleSync);
chrome.tabs.onDetached.addListener(scheduleSync);
chrome.tabs.onReplaced.addListener(scheduleSync);
chrome.tabs.onUpdated.addListener((_id, change) => {
  if ('url' in change || 'title' in change || 'groupId' in change) scheduleSync();
});
chrome.tabGroups.onRemoved.addListener(scheduleSync);

// The service worker can wake up at any time; make sure the library is current.
scheduleSync();
