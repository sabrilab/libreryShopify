// Photographie les pages du site touchées par les retours de Nolwenn.
// node shots.cjs <base-url> <dossier-sortie>
//   avant : https://librery-refonte.vercel.app   après : http://localhost:4173
// Chaque vue = une capture pleine page + les rectangles des éléments utiles (rects.json), pour recadrer ensuite.
const { chromium } = require('/Users/svbri/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('fs'), path = require('path');
const EXE = '/Users/svbri/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const [, , BASE, OUT] = process.argv;
fs.mkdirSync(OUT, { recursive: true });

// éléments dont on garde la position (premier élément correspondant, ou tous avec all: true)
const MARKS = {
  folio: { sel: '.folio', all: true },
  sections: { sel: '#collection > section', all: true },
  figs: { sel: '#gallery figure:not([hidden])', all: true },
  sizes: { sel: '#sizes' },
  services: { sel: '.list-2' },
  runhead: { sel: '.runhead' },
  header: { sel: '.header' },
  mega: { sel: '.has-sub .mega' },
  announce: { sel: '#announce' },
  manifeste: { sel: 'h2', text: 'Le manifeste' },
  skinEnd: { sel: '.end', all: true },
  items: { sel: '.list-2 > div', all: true },
  pdpSmall: { sel: '.pdp__small' },
  crumbs: { sel: '.pdp__crumbs' },
  mosaic: { sel: '.mosaic' },
  chapters: { sel: '.chapters' },
  tiles: { sel: '.tile', all: true },
  heroTxt: { sel: '.coll-hero__txt' },
  band: { sel: '.services' },
  lede: { sel: '.page-head .lede' },
  cart: { sel: '#cart' },
  toc: { sel: '.book__page' },
  stores: { sel: '.stores' },
  storesSide: { sel: '.stores__side' },
};

const VIEWS = [
  { id: 'services', url: '/services' },
  { id: 'menu', url: '/services', hover: '.has-sub > a', viewport: true },
  { id: 'bougies', url: '/collection?c=bougies', viewport: true },
  { id: 'skin', url: '/collection?c=skin-obsession' },
  { id: 'summer', url: '/collection?c=summer-vibes' },
  { id: 'coffrets', url: '/collection?c=coffrets' },
  { id: 'home', url: '/' },
  { id: 'preface', url: '/preface' },
  { id: 'pdp100', url: '/produit?p=vanilla-plum' },
  { id: 'pdp30', url: '/produit?p=vanilla-plum', click: '#sizes [data-f="30"]' },
  { id: 'pdp100-tonka', url: '/produit?p=tonka-love' },
  { id: 'bibliotheque', url: '/bibliotheque' },
  { id: 'offrir', url: '/offrir' },
  { id: 'lexique', url: '/lexique' },
  { id: 'cart', url: '/produit?p=vanilla-plum', click: '#add', viewport: true },
  { id: 'carte', url: '/points-de-vente', viewport: true, wait: 3000 },
  { id: 'skinhero', url: '/collection?c=skin-obsession', viewport: true },
  { id: 'coffret', url: '/produit?p=coffret-decouverte', viewport: true },
  { id: 'm-carte', url: '/points-de-vente', mobile: true, viewport: true, wait: 3000 },
  { id: 'm-pdp100', url: '/produit?p=vanilla-plum', mobile: true, viewport: true },
  { id: 'm-pdp30', url: '/produit?p=vanilla-plum', mobile: true, viewport: true, click: '#sizes [data-f="30"]' },
];

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const rects = {};
  for (const v of VIEWS) {
    const ctx = await b.newContext(v.mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(BASE + v.url, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    // charge toutes les images paresseuses
    await p.evaluate(async () => {
      document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; });
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    });
    if (v.click) { await p.click(v.click); await p.waitForTimeout(900); }
    if (!v.hover) await p.evaluate(() => window.scrollTo(0, 0));
    if (v.wait) await p.waitForTimeout(v.wait);
    if (v.hover) { await p.hover(v.hover); await p.waitForTimeout(500); }
    // la barre d'achat collante ne doit pas s'incruster dans les captures pleine page
    await p.addStyleTag({ content: '#sticky { display: none !important; }' });
    await p.waitForTimeout(400);
    rects[v.id] = await p.evaluate(MARKS => {
      const r = el => { const b = el.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height, t: el.textContent.trim().slice(0, 80), cls: el.className }; };
      const out = { pageH: document.documentElement.scrollHeight, scrollY };
      for (const [k, m] of Object.entries(MARKS)) {
        let els = [...document.querySelectorAll(m.sel)].filter(e => e.getClientRects().length);
        if (m.text) els = els.filter(e => e.textContent.includes(m.text));
        out[k] = m.all ? els.map(r) : (els[0] ? r(els[0]) : null);
      }
      return out;
    }, MARKS);
    await p.screenshot({ path: path.join(OUT, v.id + '.png'), fullPage: !v.viewport });
    await ctx.close();
    console.log('ok', v.id);
  }
  fs.writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify(rects, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
