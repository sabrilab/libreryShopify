// Le cadran du sillage (flacon, ombre, onde colorée) image par image, de la vaporisation à 8 h.
// node capture-sillage.js [handle] ; le site doit tourner sur localhost:4173.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const B = process.env.BASE || 'http://localhost:4173';
const H = process.argv[2] || 'magnetic-flowers', N = +(process.env.N || 61);
const OUT = path.resolve(__dirname, `public/recap/sillage-${H}`);
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });
  p.setDefaultTimeout(120000);
  await p.goto(`${B}/produit?p=${H}`, { waitUntil: 'networkidle' });
  const el = p.locator(`[data-clock="${H}"]`).first();
  await el.scrollIntoViewIfNeeded();
  await p.evaluate(() => scrollBy(0, -60));
  await p.waitForTimeout(12000);
  console.log('canvas', await el.evaluate(e => !!e.querySelector('canvas')));
  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    await el.evaluate((e, v) => { e.querySelector('input').value = v; e.rerender(); }, Math.round(i * 480 / (N - 1) / 5) * 5);
    await p.waitForTimeout(250);
    await el.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 90 });
    if (i % 10 === 0) console.log(i, Date.now() - t0, 'ms');
  }
  const bb = await el.boundingBox(); console.log(JSON.stringify(bb));
  await b.close();
})();
