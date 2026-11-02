// Renders the real side panel (sidepanel.html/.css/.js) against mocked Chrome
// data, then frames it into Chrome Web Store screenshots and promo tiles.
// Usage: node tools/shots/shoot.cjs   (needs Playwright + Chromium)
// Output: store/screenshots/*.png, store/promo/*.png
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const out = (...p) => path.join(root, 'store', ...p);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const COLORS = { grey: '#5f6368', blue: '#1a73e8', red: '#d93025', yellow: '#f9ab00', green: '#1e8e3e',
  pink: '#d01884', purple: '#9334e6', cyan: '#007b83', orange: '#fa903e' };

// ---------- favicon tiles ----------
const FAV = { docs: '#4285f4', tracker: '#5e6ad2', design: '#a259ff', code: '#57606a', analytics: '#f9ab00',
  homes: '#1e8e3e', bank: '#0b8043', maps: '#34a853', notes: '#f6b400', arxiv: '#b31b1b', cite: '#c5221f',
  wiki: '#636466', video: '#e53935', contrast: '#111111', flights: '#1a73e8', hotels: '#003580', travel: '#00a699',
  blog: '#ff5722', mail: '#ea4335', weather: '#03a9f4', music: '#1db954', tax: '#2e7d32', drive: '#188038',
  sheets: '#0f9d58', pins: '#e60023', shop: '#ff6f00', reviews: '#6d4c41', slides: '#f4b400', conf: '#7b1fa2',
  learn: '#ce422b', play: '#455a64', points: '#3949ab', food: '#e65100', transit: '#00838f', news: '#212121',
  status: '#00897b', calendar: '#1a73e8', expense: '#5d4037', play2: '#455a64' };
function faviconSvg(pageUrl) {
  let host = 'x';
  try { host = new URL(pageUrl).hostname; } catch {}
  const key = host.split('.')[0];
  const color = FAV[key] || '#607d8b';
  const letter = key[0].toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${color}"/>` +
    `<text x="16" y="22.5" font-family="Inter, sans-serif" font-weight="700" font-size="18" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
}

// ---------- tiny static server for the extension files ----------
function serve() {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

const PANEL_W = 360, PANEL_H = 588;

async function panelShot(browser, base, { dark, steps }) {
  const ctx = await browser.newContext({ viewport: { width: PANEL_W, height: PANEL_H }, deviceScaleFactor: 2,
    colorScheme: dark ? 'dark' : 'light' });
  await ctx.route('https://favicon.mock/**', (route) => {
    const u = new URL(route.request().url());
    route.fulfill({ contentType: 'image/svg+xml', body: faviconSvg(u.searchParams.get('pageUrl')) });
  });
  await ctx.addInitScript({ content: read('tools/shots/data.js') + read('tools/shots/mock-chrome.js') +
    `try { localStorage.setItem('hideSavedHint', '1'); } catch {}` });
  const page = await ctx.newPage();
  await page.goto(base + '/sidepanel.html');
  await page.addStyleTag({ content: 'body{font-family:Inter,system-ui,sans-serif} ::-webkit-scrollbar{display:none}' });
  await page.waitForSelector('.card');
  if (steps) await steps(page);
  await page.waitForTimeout(250);
  const buf = await page.screenshot();
  await ctx.close();
  return 'data:image/png;base64,' + buf.toString('base64');
}

const head = (page, text) => page.locator('.row.head', { hasText: text }).first();
const sectionHead = (page, text) => page.locator('.section-head', { hasText: text }).first();

// ---------- browser frame + caption ----------
const iconData = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'icons/128.png')).toString('base64');
const S = (() => { const w = {}; new Function('window', read('tools/shots/data.js'))(w); return w.__SAMPLE; })();

function tabStrip(dark) {
  const ink = dark ? '#e8eaed' : '#1f2328';
  const parts = [];
  for (const g of S.groups.filter((x) => x.windowId === 1)) {
    const c = COLORS[g.color];
    parts.push(`<div class="chip" style="background:${c}">${g.title}</div>`);
    if (!g.collapsed) {
      for (const t of g.tabs.slice(0, 2)) {
        const active = t.url === S.activeUrl;
        parts.push(`<div class="tab${active ? ' on' : ''}" style="--c:${c}"><img src="data:image/svg+xml;base64,${Buffer.from(faviconSvg(t.url)).toString('base64')}"><span>${t.title}</span></div>`);
      }
    }
  }
  return parts.join('') + `<div class="plus" style="color:${ink}">+</div>`;
}

function frameHtml({ panel, dark, eyebrow, title, sub, bullets, w = 1280, h = 800 }) {
  const t = dark
    ? { bg: 'radial-gradient(1200px 600px at 0% 0%, #253154 0%, #111522 60%)', ink: '#f1f3f6', muted: '#a3abba', win: '#202124', strip: '#2b2d31', bar: '#35363a', page: '#1b1c1f', line: '#33363c', sk: '#2c2f35', accent: '#8ab4f8' }
    : { bg: 'radial-gradient(1200px 600px at 0% 0%, #e3ebff 0%, #f6f8fc 55%, #fbfcfe 100%)', ink: '#141821', muted: '#5b6472', win: '#ffffff', strip: '#dfe3eb', bar: '#ffffff', page: '#ffffff', line: '#e3e6ea', sk: '#eef1f5', accent: '#1a73e8' };
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box} html,body{margin:0}
  body{width:${w}px;height:${h}px;overflow:hidden;background:${t.bg};font-family:Inter,sans-serif;color:${t.ink};position:relative}
  .copy{position:absolute;left:64px;top:0;bottom:0;width:380px;display:flex;flex-direction:column;justify-content:center}
  .eyebrow{display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px;color:${t.muted};letter-spacing:.01em}
  .eyebrow img{width:40px;height:40px;margin:-6px}
  h1{font-size:44px;line-height:1.08;letter-spacing:-.025em;margin:22px 0 16px;font-weight:800}
  p{font-size:18px;line-height:1.5;color:${t.muted};margin:0 0 22px}
  ul{list-style:none;padding:0;margin:0;display:grid;gap:12px}
  li{display:flex;gap:10px;font-size:15.5px;line-height:1.4}
  li:before{content:"";flex:none;width:18px;height:18px;margin-top:1px;border-radius:50%;background:${t.accent} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.5l4 4 8-9'/%3E%3C/svg%3E") center/12px no-repeat}
  .win{position:absolute;left:476px;top:48px;width:760px;height:704px;border-radius:12px;overflow:hidden;background:${t.win};
       box-shadow:0 30px 80px rgba(15,23,42,${dark ? .55 : .18}),0 0 0 1px rgba(${dark ? '255,255,255,.06' : '15,23,42,.08'})}
  .strip{height:42px;background:${t.strip};display:flex;align-items:flex-end;gap:4px;padding:0 10px 0 76px;position:relative;overflow:hidden;white-space:nowrap}
  .lights{position:absolute;left:14px;top:15px;display:flex;gap:8px}.lights i{width:12px;height:12px;border-radius:50%;display:block}
  .chip{align-self:center;margin-top:6px;color:#fff;font-size:12px;font-weight:600;padding:3px 9px;border-radius:7px;flex:none}
  .tab{height:34px;flex:0 0 124px;min-width:0;display:flex;align-items:center;gap:7px;padding:0 10px;font-size:12px;border-radius:9px 9px 0 0;color:${t.ink};opacity:.8;position:relative}
  .tab[style]:after{content:"";position:absolute;left:4px;right:4px;bottom:0;height:2.5px;border-radius:2px;background:var(--c)}
  .tab.on{background:${t.bar};opacity:1}
  .tab img{width:16px;height:16px;flex:none}.tab span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .plus{align-self:center;margin-top:6px;font-size:18px;opacity:.6;padding:0 6px}
  .bar{height:44px;background:${t.bar};display:flex;align-items:center;gap:12px;padding:0 12px;border-bottom:1px solid ${t.line}}
  .nav{display:flex;gap:14px;color:${t.muted};font-size:15px}
  .omni{flex:1;height:30px;border-radius:15px;background:${dark ? '#282a2d' : '#eef1f5'};display:flex;align-items:center;padding:0 14px;font-size:13px;color:${t.muted}}
  .omni b{color:${t.ink};font-weight:500}
  .ext{width:22px;height:22px;border-radius:6px;overflow:hidden;outline:2px solid ${t.accent};outline-offset:3px}
  .ext img{width:22px;height:22px;transform:scale(1.33)}
  .body{display:flex;height:calc(100% - 86px)}
  .page{flex:1;background:${t.page};padding:34px 30px;min-width:0}
  .sk{background:${t.sk};border-radius:6px;height:12px;margin-bottom:12px}
  .sp{width:${PANEL_W}px;border-left:1px solid ${t.line};display:flex;flex-direction:column;background:${dark ? '#202124' : '#f6f7f9'}}
  .sph{height:36px;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:13px;font-weight:600;border-bottom:1px solid ${t.line}}
  .sph img{width:18px;height:18px;margin:-2px}.sph .x{margin-left:auto;color:${t.muted};font-weight:400}
  .sp>img{width:${PANEL_W}px;height:${PANEL_H}px;display:block}
  </style></head><body>
  <div class="copy">
    <div class="eyebrow"><img src="${iconData}">Project Tabs${eyebrow ? ` · ${eyebrow}` : ''}</div>
    <h1>${title}</h1><p>${sub}</p>
    <ul>${bullets.map((b) => `<li><span>${b}</span></li>`).join('')}</ul>
  </div>
  <div class="win">
    <div class="strip"><div class="lights"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>${tabStrip(dark)}</div>
    <div class="bar"><div class="nav">&#8592; &#8594; &#8635;</div><div class="omni"><b>docs.example.com</b>/launch-plan</div><div class="ext"><img src="${iconData}"></div></div>
    <div class="body">
      <div class="page">
        <div class="sk" style="width:58%;height:22px;margin-bottom:22px"></div>
        ${[92, 86, 95, 70, 0, 88, 93, 64, 0, 90, 82, 76, 94, 50].map((x) => x ? `<div class="sk" style="width:${x}%"></div>` : '<div style="height:14px"></div>').join('')}
        <div class="sk" style="width:100%;height:110px;margin-top:20px;border-radius:10px"></div>
      </div>
      <div class="sp"><div class="sph"><img src="${iconData}">Project Tabs<span class="x">&#x2715;</span></div><img src="${panel}"></div>
    </div>
  </div>
  </body></html>`;
}

async function renderHtml(browser, html, file, { w, h, scale = 1, transparent = false }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, omitBackground: transparent });
  await page.close();
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  fs.mkdirSync(out('screenshots'), { recursive: true });
  fs.mkdirSync(out('promo'), { recursive: true });

  const scenes = [
    { file: '1-overview', panel: { steps: async (p) => { await head(p, 'Q4 Launch').click(); await head(p, 'Q4 Launch').hover(); } },
      title: 'Your tab groups, as projects.', sub: 'One side panel for every project you have open, in every window.',
      bullets: ['See each group with its color and tab count', 'Click to expand, double-click to rename', 'Focus, collapse or close with one click'] },
    { file: '2-search', panel: { steps: async (p) => { await p.fill('#search', 'flight'); } },
      title: 'Find any tab in a keystroke.', sub: 'Press / and type. Projects and tabs filter as you go.',
      bullets: ['Matches titles and URLs', 'Searches open and saved projects', 'Enter jumps to the first match'] },
    { file: '3-saved', panel: { steps: async (p) => {
        await head(p, 'Kitchen renovation').click();
        await sectionHead(p, 'Saved projects').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70));
      } },
      title: 'Close a project. Keep it for good.', sub: 'Every group you close lands in Saved projects, ready to reopen later.',
      bullets: ['Reopens as the same named, colored group', 'Groups closed from Chrome are kept too', 'Export and import JSON backups'] },
    { file: '4-devices', panel: { dark: true, steps: async (p) => {
        await sectionHead(p, 'Other devices').click();
        await head(p, 'Pixel phone').click();
        await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      } },
      eyebrow: 'Dark mode', title: 'Tabs from your other devices.', sub: 'Pick up what you had open on your phone or work laptop.',
      bullets: ['Open a synced window right here', 'Save it as a project for later', 'Follows your light or dark theme'] },
    { file: '5-focus', panel: { steps: async (p) => { await head(p, 'Thesis research').click(); await head(p, 'Thesis research').hover(); } },
      title: 'Focus on one project.', sub: 'Focus switches to a project and collapses the others, so the rest stop using memory.',
      bullets: ['Collapsed groups are unloaded from memory', 'Tabs reload when you open them again', 'Alt+Shift+P opens the panel anywhere'] },
  ];

  const panels = {};
  for (const s of scenes) {
    const panel = await panelShot(browser, base, s.panel);
    panels[s.file] = panel;
    const html = frameHtml({ ...s, dark: !!s.panel.dark, panel });
    await renderHtml(browser, html, out('screenshots', s.file + '.png'), { w: 1280, h: 800 });
    console.log('screenshot', s.file);
  }

  // Promo tiles
  const tileCss = `*{box-sizing:border-box}html,body{margin:0}body{font-family:Inter,sans-serif;overflow:hidden;position:relative;
    background:radial-gradient(900px 500px at 0% 0%, #2a3866 0%, #121726 65%);color:#fff}`;
  const pills = (s) => `<div style="display:flex;gap:${8 * s}px;flex-wrap:wrap">${['blue:Q4 Launch', 'green:Apartment hunt', 'purple:Thesis', 'orange:Japan trip']
    .map((x) => { const [c, l] = x.split(':'); return `<span style="background:${COLORS[c]};border-radius:${7 * s}px;padding:${3 * s}px ${9 * s}px;font-size:${12 * s}px;font-weight:600">${l}</span>`; }).join('')}</div>`;
  await renderHtml(browser, `<!doctype html><html><head><meta charset="utf-8"><style>${tileCss}</style></head><body style="width:440px;height:280px">
    <div style="position:absolute;left:34px;top:38px;display:flex;align-items:center;gap:14px">
      <img src="${iconData}" style="width:84px;height:84px;margin:-11px">
      <div style="font-size:30px;font-weight:800;letter-spacing:-.02em">Project Tabs</div></div>
    <div style="position:absolute;left:36px;top:112px;width:370px;font-size:18px;line-height:1.4;color:#c4cbe0">Manage your Chrome tab groups as projects, from one side panel.</div>
    <div style="position:absolute;left:36px;top:200px;width:380px">${pills(1)}</div>
  </body></html>`, out('promo', 'small-tile-440x280.png'), { w: 440, h: 280 });

  await renderHtml(browser, `<!doctype html><html><head><meta charset="utf-8"><style>${tileCss}</style></head><body style="width:1400px;height:560px">
    <div style="position:absolute;left:96px;top:0;bottom:0;width:640px;display:flex;flex-direction:column;justify-content:center">
      <div style="display:flex;align-items:center;gap:20px"><img src="${iconData}" style="width:120px;height:120px;margin:-15px">
        <div style="font-size:52px;font-weight:800;letter-spacing:-.025em">Project Tabs</div></div>
      <div style="font-size:26px;line-height:1.4;color:#c4cbe0;margin:28px 0 34px">Your tab groups, as projects. Search them, focus on one, close and reopen them whenever you like.</div>
      ${pills(1.4)}
    </div>
    <div style="position:absolute;right:110px;top:56px;width:380px;height:620px;border-radius:14px;overflow:hidden;
      box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.08);background:#f6f7f9">
      <img src="${panels['1-overview']}" style="width:380px;display:block"></div>
  </body></html>`, out('promo', 'marquee-1400x560.png'), { w: 1400, h: 560 });
  console.log('promo tiles');

  // README hero: the panel on its own, light and dark side by side
  const lightP = panels['1-overview'];
  const darkP = await panelShot(browser, base, { dark: true, steps: async (p) => { await head(p, 'Q4 Launch').click(); } });
  await renderHtml(browser, `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0}
    body{width:880px;height:680px;background:transparent;display:flex;gap:40px;padding:46px 50px;font-family:Inter}
    div{width:370px;border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.22),0 0 0 1px rgba(15,23,42,.08)}
    img{width:370px;display:block}</style></head><body><div><img src="${lightP}"></div><div><img src="${darkP}"></div></body></html>`,
  path.join(root, 'assets', 'panel-light-dark.png'), { w: 880, h: 680, scale: 2, transparent: true });

  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
