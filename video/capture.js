// Captures du site pour le film : pages entières (défilement simulé dans Remotion)
// et l'horloge du sillage image par image. Le site doit tourner sur localhost:4173.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const B = process.env.BASE || 'http://localhost:4173';
const OUT = path.resolve(__dirname, 'public/cap');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + (process.env.SPKI || '')] });
  const meta = {};
  const mk = (m, dpr) => b.newPage(m ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
  const go = async (p, u) => {
    await p.goto(B + u, { waitUntil: 'networkidle' });
    await p.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      document.querySelectorAll('img').forEach(i => i.loading = 'eager');
      for (let y = 0; y < document.body.scrollHeight; y += 350) { scrollTo(0, y); await wait(140); }
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 8000); })));
      scrollTo(0, 0);
    });
    await p.waitForTimeout(2000);
  };
  // page entière : la hauteur × densité reste sous 16 000 px (limite de capture de Chromium)
  const full = async (m, u, name, maxH) => {
    let p = await mk(m, 1); await go(p, u);
    const h = Math.min(maxH || 1e9, await p.evaluate(() => document.documentElement.scrollHeight));
    await p.close();
    const dpr = Math.min(m ? 2 : 1.5, 16000 / h);
    p = await mk(m, dpr); await go(p, u);
    await p.evaluate(() => document.querySelectorAll('.s-hero__bars, [data-sticky-buy], .pdp__bar').forEach(e => e.style.visibility = 'hidden'));
    await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 88, fullPage: !maxH, clip: maxH ? { x: 0, y: 0, width: m ? 390 : 1440, height: h } : undefined });
    meta[name] = { w: m ? 390 : 1440, h, dpr: +dpr.toFixed(3) };
    console.log(name, h, dpr.toFixed(2));
    await p.close();
  };
  await full(0, '/', 'd-home');
  await full(0, '/produit?p=tonka-love', 'd-pdp');
  await full(0, '/bibliotheque', 'd-lib');
  await full(0, '/collection?c=skin-obsession', 'd-coll');
  await full(1, '/', 'm-home');
  await full(1, '/produit?p=tonka-love', 'm-pdp');
  await full(1, '/bibliotheque', 'm-lib');

  // horloge du sillage : 49 états, de 0 à 8 h
  const p = await mk(0, 1.5); await go(p, '/produit?p=tonka-love');
  const el = await p.$('#sillage [data-clock]');
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(8000);
  fs.mkdirSync(`${OUT}/clock`, { recursive: true });
  for (let i = 0; i <= 48; i++) {
    await el.evaluate((e, v) => { e.querySelector('input').value = v; e.rerender(); }, i * 10);
    await p.waitForTimeout(60);
    await el.screenshot({ path: `${OUT}/clock/${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 90 });
  }
  const bb = await el.boundingBox(); meta.clock = { w: bb.width, h: bb.height, n: 49 };
  fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify(meta, null, 1));
  await b.close();
})();
