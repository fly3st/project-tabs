// Renders assets/icon.svg into icons/{16,32,48,128}.png.
// 128 keeps the 16px store padding; the toolbar sizes are cropped to fill the
// square, and 16px uses a simplified glyph so it stays crisp.
// Usage: node tools/render-icons.cjs   (needs Playwright + Chromium installed)
const { chromium } = require('playwright');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
(async () => {
const master = await readFile(path.join(root, 'assets/icon.svg'), 'utf8');

const tight = master.replace('viewBox="0 0 128 128"', 'viewBox="14 14 100 100"');
const tiny = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <rect x="0" y="0" width="16" height="16" rx="4" fill="#1f2632"/>
  <rect x="3" y="3" width="6" height="2.4" rx="1.2" fill="#4c8dff"/>
  <rect x="10" y="3.2" width="3" height="2" rx="1" fill="#fff" fill-opacity=".6"/>
  <rect x="3" y="6.8" width="4.5" height="2.4" rx="1.2" fill="#34c26b"/>
  <rect x="8.5" y="7" width="4.5" height="2" rx="1" fill="#fff" fill-opacity=".35"/>
  <rect x="3" y="10.6" width="3.4" height="2.4" rx="1.2" fill="#ff9a3c"/>
  <rect x="7.4" y="10.8" width="4" height="2" rx="1" fill="#fff" fill-opacity=".35"/>
</svg>`;

const jobs = [[16, tiny], [32, tight], [48, tight], [128, master]];
const browser = await chromium.launch();
for (const [size, svg] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const sized = svg.replace(/<svg /, `<svg width="${size}" height="${size}" `).replace(/ width="128" height="128"/, '');
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`);
  await page.screenshot({ path: path.join(root, `icons/${size}.png`), omitBackground: true });
  await page.close();
}
await browser.close();
console.log('icons written');
})();
