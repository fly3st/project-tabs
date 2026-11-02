'use strict';

// Keeps a live snapshot of every open group so that a group closed by
// accident (or with its window) can be restored from "Recently closed".

const CACHE_KEY = 'groupCache';          // storage.session
const SUPPRESS_KEY = 'suppressRecent';   // storage.session: group ids archived on purpose
const RECENT_KEY = 'recentlyClosed';     // storage.local
const RECENT_MAX = 25;

function enablePanelOnClick() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => { enablePanelOnClick(); refreshCache(); });
chrome.runtime.onStartup.addListener(() => { enablePanelOnClick(); refreshCache(); });
enablePanelOnClick();

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-panel' && tab) chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
});

let timer = null;
function scheduleRefresh() {
  clearTimeout(timer);
  timer = setTimeout(refreshCache, 400);
}

async function refreshCache() {
  const [groups, tabs] = await Promise.all([chrome.tabGroups.query({}), chrome.tabs.query({})]);
  const cache = {};
  for (const g of groups) cache[g.id] = { title: g.title || '', color: g.color, tabs: [] };
  for (const t of tabs.sort((a, b) => a.index - b.index)) {
    if (t.groupId >= 0 && cache[t.groupId]) {
      cache[t.groupId].tabs.push({ id: t.id, url: t.url || t.pendingUrl || '', title: t.title || '' });
    }
  }
  await chrome.storage.session.set({ [CACHE_KEY]: cache });
}

chrome.tabGroups.onRemoved.addListener(async (group) => {
  const stored = await chrome.storage.session.get([CACHE_KEY, SUPPRESS_KEY]);
  const cache = stored[CACHE_KEY] || {};
  const suppress = stored[SUPPRESS_KEY] || [];
  const entry = cache[group.id];

  if (suppress.includes(group.id)) {
    await chrome.storage.session.set({ [SUPPRESS_KEY]: suppress.filter((id) => id !== group.id) });
    scheduleRefresh();
    return;
  }
  if (!entry || !entry.tabs.length) { scheduleRefresh(); return; }

  // If every tab still exists, the group was just ungrouped, not closed.
  const openIds = new Set((await chrome.tabs.query({})).map((t) => t.id));
  if (entry.tabs.every((t) => openIds.has(t.id))) { scheduleRefresh(); return; }

  const recent = (await chrome.storage.local.get(RECENT_KEY))[RECENT_KEY] || [];
  recent.unshift({
    id: crypto.randomUUID(),
    title: entry.title,
    color: entry.color,
    savedAt: Date.now(),
    tabs: entry.tabs.filter((t) => t.url).map(({ url, title }) => ({ url, title })),
  });
  await chrome.storage.local.set({ [RECENT_KEY]: recent.slice(0, RECENT_MAX) });
  scheduleRefresh();
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

chrome.tabGroups.onCreated.addListener(scheduleRefresh);
chrome.tabGroups.onUpdated.addListener((group) => {
  if (group.collapsed) scheduleDiscard(group.id);
  else clearTimeout(discardTimers.get(group.id));
  scheduleRefresh();
});
chrome.tabs.onCreated.addListener(scheduleRefresh);
chrome.tabs.onRemoved.addListener(scheduleRefresh);
chrome.tabs.onMoved.addListener(scheduleRefresh);
chrome.tabs.onAttached.addListener(scheduleRefresh);
chrome.tabs.onDetached.addListener(scheduleRefresh);
chrome.tabs.onReplaced.addListener(scheduleRefresh);
chrome.tabs.onUpdated.addListener((_id, change) => {
  if ('url' in change || 'title' in change || 'groupId' in change) scheduleRefresh();
});
