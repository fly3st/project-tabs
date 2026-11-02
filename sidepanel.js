'use strict';

const COLORS = {
  grey: '#5f6368', blue: '#1a73e8', red: '#d93025', yellow: '#f9ab00', green: '#1e8e3e',
  pink: '#d01884', purple: '#9334e6', cyan: '#007b83', orange: '#fa903e',
};

const ICONS = {
  caret: '<path d="M9 6l6 6-6 6"/>',
  focus: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  collapse: '<path d="M7 4l5 5 5-5M7 20l5-5 5 5"/>',
  expand: '<path d="M7 9l5-5 5 5M7 15l5 5 5-5"/>',
  archive: '<path d="M3 4h18v5H3zM5 9v11h14V9M10 13h4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};

const state = {
  query: '',
  expanded: new Set(),   // 'g<id>' for open groups, 's<id>' for saved entries, 'sec:<name>' for sections
  editing: false,
};
let firstMatch = null;
let lastOpenGroups = [];

const $ = (s) => document.querySelector(s);

// ---------- DOM helpers ----------
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

function icon(name, cls = '') {
  const span = document.createElement('span');
  span.innerHTML = `<svg viewBox="0 0 24 24" class="${cls}">${ICONS[name]}</svg>`;
  return span.firstElementChild;
}

function iconBtn(name, title, onClick, cls = '') {
  const b = h('button', { class: `ibtn ${cls}`, title, 'aria-label': title });
  b.append(icon(name));
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return b;
}

function textBtn(label, title, onClick) {
  return h('button', { class: 'ibtn text', title, onclick: (e) => { e.stopPropagation(); onClick(); } }, label);
}

function highlight(text, q) {
  const span = h('span', { class: 'title', title: text });
  if (!q) { span.textContent = text; return span; }
  const lower = text.toLowerCase();
  let i = 0;
  for (;;) {
    const j = lower.indexOf(q, i);
    if (j < 0) { span.append(text.slice(i)); break; }
    span.append(text.slice(i, j), h('mark', {}, text.slice(j, j + q.length)));
    i = j + q.length;
  }
  return span;
}

function favicon(url) {
  const u = new URL(chrome.runtime.getURL('/_favicon/'));
  u.searchParams.set('pageUrl', url || 'about:blank');
  u.searchParams.set('size', '32');
  return h('img', { class: 'fav', src: u.toString(), alt: '' });
}

function caret(open) { return icon('caret', 'caret' + (open ? ' open' : '')); }
function colorVar(color) { return `--c:${COLORS[color] || COLORS.grey}`; }

function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const hr = Math.round(m / 60); if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24); if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function toggle(key) {
  state.expanded.has(key) ? state.expanded.delete(key) : state.expanded.add(key);
  render();
}

// ---------- Actions ----------
async function activateTab(t) {
  if (t.groupId >= 0) {
    const g = await chrome.tabGroups.get(t.groupId).catch(() => null);
    if (g && g.collapsed) await chrome.tabGroups.update(g.id, { collapsed: false });
  }
  await chrome.tabs.update(t.id, { active: true });
  await chrome.windows.update(t.windowId, { focused: true });
}

async function focusGroup(g, tabs) {
  const target = tabs.find((t) => t.active) || tabs[0];
  if (!target) return;
  if (g.collapsed) await chrome.tabGroups.update(g.id, { collapsed: false });
  await chrome.tabs.update(target.id, { active: true });
  await chrome.windows.update(g.windowId, { focused: true });
  const others = await chrome.tabGroups.query({ windowId: g.windowId });
  for (const o of others) {
    if (o.id !== g.id && !o.collapsed) await chrome.tabGroups.update(o.id, { collapsed: true }).catch(() => {});
  }
}

async function collapseOthers() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  for (const g of groups) {
    if (!g.collapsed && (!active || g.id !== active.groupId)) {
      await chrome.tabGroups.update(g.id, { collapsed: true }).catch(() => {});
    }
  }
}

function snapshot(g, tabs) {
  return {
    id: crypto.randomUUID(),
    title: g.title || '',
    color: g.color,
    savedAt: Date.now(),
    tabs: tabs.map((t) => ({ url: t.url || t.pendingUrl || '', title: t.title || '' })).filter((t) => t.url),
  };
}

async function removeGroupTabs(g, tabs) {
  // Don't let Chrome close the window if this group is all that's in it.
  const winTabs = await chrome.tabs.query({ windowId: g.windowId });
  if (winTabs.length <= tabs.length) await chrome.tabs.create({ windowId: g.windowId });
  await chrome.tabs.remove(tabs.map((t) => t.id));
}

async function archiveGroup(g, tabs) {
  const { archives = [] } = await chrome.storage.local.get('archives');
  archives.unshift(snapshot(g, tabs));
  await chrome.storage.local.set({ archives });  // save first, then close
  const { suppressRecent = [] } = await chrome.storage.session.get('suppressRecent');
  await chrome.storage.session.set({ suppressRecent: [...suppressRecent, g.id] });
  await removeGroupTabs(g, tabs);
}

async function closeGroup(g, tabs) {
  if (!confirm(`Close "${g.title || 'Untitled'}" (${tabs.length} tabs)?\nYou can bring it back from "Recently closed".`)) return;
  await removeGroupTabs(g, tabs);
}

async function restoreEntry(entry, listKey) {
  const win = await chrome.windows.getCurrent();
  const ids = [];
  for (const [i, t] of entry.tabs.entries()) {
    try {
      const tab = await chrome.tabs.create({ windowId: win.id, url: t.url, active: i === 0 });
      ids.push(tab.id);
    } catch (e) { console.warn('Could not reopen', t.url, e); }
  }
  if (!ids.length) { alert('None of the tabs in this project could be reopened.'); return; }
  const groupId = await chrome.tabs.group({ tabIds: ids, createProperties: { windowId: win.id } });
  await chrome.tabGroups.update(groupId, { title: entry.title, color: entry.color || 'grey' });
  await removeEntry(entry.id, listKey);
}

async function saveToArchive(title, tabs) {
  const { archives = [] } = await chrome.storage.local.get('archives');
  archives.unshift({
    id: crypto.randomUUID(), title, color: 'grey', savedAt: Date.now(),
    tabs: tabs.filter((t) => t.url).map((t) => ({ url: t.url, title: t.title || '' })),
  });
  await chrome.storage.local.set({ archives });
}

async function openDeviceSession(sessionId, tabs) {
  // Chrome reopens a synced window as a new window here; fall back to plain tabs if it can't.
  try { await chrome.sessions.restore(sessionId); }
  catch {
    const win = await chrome.windows.create({ url: tabs.map((t) => t.url) });
    if (win) await chrome.windows.update(win.id, { focused: true });
  }
}

async function removeEntry(id, listKey) {
  const list = (await chrome.storage.local.get(listKey))[listKey] || [];
  await chrome.storage.local.set({ [listKey]: list.filter((e) => e.id !== id) });
}

function startRename(el, g) {
  state.editing = true;
  const input = h('input', { class: 'rename', value: g.title || '', placeholder: 'Project name' });
  el.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = async (save) => {
    if (done) return;
    done = true;
    state.editing = false;
    if (save) await chrome.tabGroups.update(g.id, { title: input.value.trim() }).catch(() => {});
    render();
  };
  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

// ---------- Rendering ----------
function tabRow(t, q, { onOpen, onClose }) {
  return h('div', { class: 'row tab' + (t.active ? ' active' : ''), onclick: onOpen, title: t.url },
    favicon(t.url),
    highlight(t.title || t.url || 'Untitled', q),
    onClose && h('span', { class: 'actions' }, iconBtn('close', 'Close tab', onClose, 'danger')),
  );
}

function groupCard(g, tabs, visTabs, { q, winLabel }) {
  const key = 'g' + g.id;
  const open = !!q || state.expanded.has(key);
  const title = highlight(g.title || 'Untitled', q);
  title.title = 'Double-click to rename';
  title.addEventListener('dblclick', (e) => { e.stopPropagation(); startRename(title, g); });

  const head = h('div', { class: 'row head', onclick: () => toggle(key) },
    caret(open), h('span', { class: 'dot' }), title,
    winLabel && h('span', { class: 'badge' }, winLabel),
    h('span', { class: 'count' }, tabs.length),
    h('span', { class: 'actions' },
      iconBtn('focus', 'Focus: switch to this project and collapse the others', () => focusGroup(g, tabs), 'primary'),
      iconBtn(g.collapsed ? 'expand' : 'collapse', g.collapsed ? 'Expand in tab strip' : 'Collapse in tab strip',
        () => chrome.tabGroups.update(g.id, { collapsed: !g.collapsed })),
      iconBtn('archive', 'Archive: save this project and close its tabs', () => archiveGroup(g, tabs)),
      iconBtn('close', 'Close group', () => closeGroup(g, tabs), 'danger'),
    ),
  );
  const card = h('div', { class: 'card' + (g.collapsed ? ' is-collapsed' : ''), style: colorVar(g.color) }, head);
  if (open) {
    card.append(h('div', { class: 'tabs' }, visTabs.map((t) =>
      tabRow(t, q, { onOpen: () => activateTab(t), onClose: () => chrome.tabs.remove(t.id) }))));
  }
  return card;
}

function savedCard(entry, visTabs, listKey, { q }) {
  const key = 's' + entry.id;
  const open = !!q || state.expanded.has(key);
  const head = h('div', { class: 'row head', onclick: () => toggle(key) },
    caret(open), h('span', { class: 'dot' }), highlight(entry.title || 'Untitled', q),
    h('span', { class: 'when' }, ago(entry.savedAt)),
    h('span', { class: 'count' }, entry.tabs.length),
    textBtn('Restore', 'Reopen all tabs as a group in this window', () => restoreEntry(entry, listKey)),
    h('span', { class: 'actions' },
      iconBtn('trash', 'Delete permanently', () => {
        if (confirm(`Delete "${entry.title || 'Untitled'}" permanently?`)) removeEntry(entry.id, listKey);
      }, 'danger'),
    ),
  );
  const card = h('div', { class: 'card', style: colorVar(entry.color) }, head);
  if (open) {
    card.append(h('div', { class: 'tabs' }, visTabs.map((t) =>
      tabRow(t, q, { onOpen: () => chrome.tabs.create({ url: t.url }) }))));
  }
  return card;
}

function deviceCard(item, visTabs, { q }) {
  const key = 'd' + item.sessionId;
  const open = !!q || state.expanded.has(key);
  const head = h('div', { class: 'row head', onclick: () => toggle(key) },
    caret(open), h('span', { class: 'dot' }), highlight(item.title, q),
    item.modified && h('span', { class: 'when' }, ago(item.modified)),
    h('span', { class: 'count' }, item.tabs.length),
    textBtn('Open', 'Open these tabs in a new window on this computer', () => openDeviceSession(item.sessionId, item.tabs)),
    h('span', { class: 'actions' },
      iconBtn('archive', 'Save to Archived (restore it later as a project)', () => saveToArchive(item.title, item.tabs)),
    ),
  );
  const card = h('div', { class: 'card' }, head);
  if (open) {
    card.append(h('div', { class: 'tabs' }, visTabs.map((t) =>
      tabRow(t, q, { onOpen: () => chrome.tabs.create({ url: t.url }) }))));
  }
  return card;
}

// Synced windows from the user's other signed-in devices (needs Chrome Sync).
async function getDeviceItems() {
  if (!chrome.sessions || !chrome.sessions.getDevices) return [];
  const devices = await chrome.sessions.getDevices({ maxResults: 25 }).catch(() => []);
  const items = [];
  for (const d of devices) {
    const windows = d.sessions.filter((s) => (s.window && s.window.tabs && s.window.tabs.length) || s.tab);
    windows.forEach((s, i) => {
      const tabs = (s.window ? s.window.tabs : [s.tab]).filter((t) => t.url);
      if (!tabs.length) return;
      items.push({
        sessionId: s.window ? s.window.sessionId : s.tab.sessionId,
        title: windows.length > 1 ? `${d.deviceName} · window ${i + 1}` : d.deviceName,
        modified: s.lastModified ? s.lastModified * 1000 : 0,
        tabs,
      });
    });
  }
  return items;
}

let hideSavedHint = false;
try { hideSavedHint = localStorage.getItem('hideSavedHint') === '1'; } catch {}

function savedGroupsHint() {
  return h('div', { class: 'hint' },
    h('span', {}, 'Chrome doesn\u2019t let extensions see saved groups while they\u2019re closed. Open one from the bookmarks bar (or Ctrl+Shift+T) and it shows up here; Archive it to keep it in this panel.'),
    iconBtn('close', 'Hide this tip', () => {
      hideSavedHint = true;
      try { localStorage.setItem('hideSavedHint', '1'); } catch {}
      render();
    }),
  );
}

function sectionHead(label, count, { key, extra } = {}) {
  const open = !key || state.expanded.has(key) || !!state.query.trim();
  const head = h('div', { class: 'section-head' + (key ? ' clickable' : ''), onclick: key ? () => toggle(key) : null },
    key && caret(open), label, h('span', {}, `· ${count}`), h('span', { class: 'grow' }), extra);
  return { head, open };
}

async function render() {
  if (state.editing) return;
  const [groups, tabs, win, stored, deviceItems] = await Promise.all([
    chrome.tabGroups.query({}),
    chrome.tabs.query({ windowType: 'normal' }),
    chrome.windows.getCurrent(),
    chrome.storage.local.get(['archives', 'recentlyClosed']),
    getDeviceItems(),
  ]);
  const archives = stored.archives || [];
  const recent = stored.recentlyClosed || [];
  const q = state.query.trim().toLowerCase();
  const matches = (s) => (s || '').toLowerCase().includes(q);
  const tabMatches = (t) => !q || matches(t.title) || matches(t.url);
  firstMatch = null;

  // Index tabs by group, number windows.
  const byGroup = new Map();
  const ungrouped = [];
  const windowOrder = [];
  for (const t of tabs.sort((a, b) => a.windowId - b.windowId || a.index - b.index)) {
    if (!windowOrder.includes(t.windowId)) windowOrder.push(t.windowId);
    if (t.groupId >= 0) {
      if (!byGroup.has(t.groupId)) byGroup.set(t.groupId, []);
      byGroup.get(t.groupId).push(t);
    } else ungrouped.push(t);
  }
  const multiWindow = windowOrder.length > 1;
  const winLabel = (id) => !multiWindow ? null : id === win.id ? 'this window' : `window ${windowOrder.indexOf(id) + 1}`;

  const openGroups = groups
    .filter((g) => byGroup.has(g.id))
    .sort((a, b) => (b.windowId === win.id) - (a.windowId === win.id)
      || windowOrder.indexOf(a.windowId) - windowOrder.indexOf(b.windowId)
      || byGroup.get(a.id)[0].index - byGroup.get(b.id)[0].index);
  lastOpenGroups = openGroups.map((g) => snapshot(g, byGroup.get(g.id)));

  const frag = document.createDocumentFragment();
  let shown = 0;

  // Open projects
  const openCards = [];
  for (const g of openGroups) {
    const gTabs = byGroup.get(g.id);
    const vis = q && matches(g.title) ? gTabs : gTabs.filter(tabMatches);
    if (q && !vis.length) continue;
    if (q && !firstMatch) firstMatch = vis[0];
    openCards.push(groupCard(g, gTabs, vis, { q, winLabel: winLabel(g.windowId) }));
  }
  shown += openCards.length;
  if (!q || openCards.length) {
    const sec = h('section', { class: 'section' }, sectionHead('Open projects', openCards.length).head);
    sec.append(...(openCards.length ? openCards
      : [h('div', { class: 'empty' }, 'No tab groups open. Right-click a tab → "Add tab to new group" to start a project.')]));
    if (!q && !hideSavedHint) sec.append(savedGroupsHint());
    frag.append(sec);
  }

  // Ungrouped tabs
  const ungroupedVis = ungrouped.filter(tabMatches);
  if (ungroupedVis.length) {
    if (q && !firstMatch) firstMatch = ungroupedVis[0];
    const { head, open } = sectionHead('Ungrouped tabs', ungroupedVis.length, { key: 'sec:ungrouped' });
    const sec = h('section', { class: 'section' }, head);
    if (open) {
      sec.append(h('div', { class: 'card' }, h('div', { class: 'tabs', style: 'border-top:0' },
        ungroupedVis.map((t) => tabRow(t, q, { onOpen: () => activateTab(t), onClose: () => chrome.tabs.remove(t.id) })))));
    }
    shown += ungroupedVis.length;
    frag.append(sec);
  }

  // Archived and recently closed
  const savedSection = (label, list, listKey, collapsibleKey, extra) => {
    const cards = [];
    for (const e of list) {
      const vis = q && matches(e.title) ? e.tabs : e.tabs.filter(tabMatches);
      if (q && !vis.length) continue;
      cards.push(savedCard(e, vis, listKey, { q }));
    }
    if (!cards.length && (q || listKey === 'recentlyClosed')) return;
    shown += cards.length;
    const { head, open } = sectionHead(label, cards.length, { key: collapsibleKey, extra });
    const sec = h('section', { class: 'section' }, head);
    if (open) sec.append(...(cards.length ? cards
      : [h('div', { class: 'empty' }, 'Nothing archived yet. Hover a project and hit the box icon to shelve it.')]));
    frag.append(sec);
  };
  savedSection('Archived', archives, 'archives');
  savedSection('Recently closed', recent, 'recentlyClosed', 'sec:recent',
    h('button', { class: 'link', onclick: (e) => {
      e.stopPropagation();
      if (confirm('Clear the recently closed list?')) chrome.storage.local.set({ recentlyClosed: [] });
    } }, 'Clear'));

  // Other devices
  const deviceCards = [];
  for (const item of deviceItems) {
    const vis = q && matches(item.title) ? item.tabs : item.tabs.filter(tabMatches);
    if (q && !vis.length) continue;
    deviceCards.push(deviceCard(item, vis, { q }));
  }
  if (deviceCards.length || !q) {
    shown += deviceCards.length;
    const { head, open } = sectionHead('Other devices', deviceCards.length, { key: 'sec:devices' });
    const sec = h('section', { class: 'section' }, head);
    if (open) sec.append(...(deviceCards.length ? deviceCards
      : [h('div', { class: 'empty' }, 'No other devices found. Turn on Chrome Sync (with "Open tabs") on your other computers and phone to see their tabs here.')]));
    frag.append(sec);
  }

  if (q && !shown) frag.append(h('div', { class: 'empty' }, `No matches for "${state.query.trim()}".`));

  $('#list').replaceChildren(frag);
  $('#stats').textContent =
    `${openGroups.length} open · ${tabs.length} tabs · ${archives.length} archived`;
}

let renderTimer = null;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 120);
}

// ---------- Backup ----------
function exportBackup() {
  const data = {
    app: 'project-tabs', version: 1, exportedAt: new Date().toISOString(),
    openProjects: lastOpenGroups,
  };
  chrome.storage.local.get(['archives', 'recentlyClosed']).then(({ archives = [], recentlyClosed = [] }) => {
    Object.assign(data, { archives, recentlyClosed });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `project-tabs-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
}

async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    const incoming = [...(data.openProjects || []), ...(data.archives || [])]
      .filter((e) => e && Array.isArray(e.tabs))
      .map((e) => ({
        id: crypto.randomUUID(),
        title: String(e.title || ''),
        color: COLORS[e.color] ? e.color : 'grey',
        savedAt: e.savedAt || Date.now(),
        tabs: e.tabs.filter((t) => t && t.url).map((t) => ({ url: String(t.url), title: String(t.title || '') })),
      }))
      .filter((e) => e.tabs.length);
    const { archives = [] } = await chrome.storage.local.get('archives');
    await chrome.storage.local.set({ archives: [...incoming, ...archives] });
    alert(`Imported ${incoming.length} project(s) into Archived.`);
  } catch (e) {
    alert('That file could not be read as a Project Tabs backup.');
  }
}

// ---------- Wiring ----------
const search = $('#search');
search.addEventListener('input', () => { state.query = search.value; render(); });
search.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && firstMatch) activateTab(firstMatch);
  if (e.key === 'Escape') { search.value = ''; state.query = ''; render(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== search && !state.editing) {
    e.preventDefault();
    search.focus();
  }
});

$('#collapseOthers').addEventListener('click', collapseOthers);
const menu = $('#menu');
$('#menuBtn').addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
document.addEventListener('click', () => { menu.hidden = true; });
$('#exportBtn').addEventListener('click', exportBackup);
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) importBackup(f);
  e.target.value = '';
});

for (const ev of ['onCreated', 'onRemoved', 'onUpdated', 'onMoved', 'onAttached', 'onDetached', 'onActivated']) {
  chrome.tabs[ev].addListener(scheduleRender);
}
for (const ev of ['onCreated', 'onRemoved', 'onUpdated', 'onMoved']) {
  chrome.tabGroups[ev].addListener(scheduleRender);
}
chrome.windows.onFocusChanged.addListener(scheduleRender);
chrome.storage.onChanged.addListener((_c, area) => { if (area === 'local') scheduleRender(); });

render();
search.focus();
