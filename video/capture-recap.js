// Captures pour la vidéo récap (depuis le PDF du 12/10) : écrans fixes, ordinateur et iPhone,
// avec le cadre des éléments à souligner. Le site doit tourner sur localhost:4173 (BASE pour un autre).
// Usage : node capture-recap.js [prefixe] ; NOGL=1 désactive WebGL (pages de contenu, plus rapide).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const B = process.env.BASE || 'http://localhost:4173';
const PRE = process.argv[2] || '';
const OUT = path.resolve(__dirname, 'public/recap');
fs.mkdirSync(OUT, { recursive: true });
const metaF = `${OUT}/meta.json`;
const meta = fs.existsSync(metaF) ? JSON.parse(fs.readFileSync(metaF)) : {};

(async () => {
  const args = process.env.NOGL ? ['--disable-webgl', '--disable-3d-apis'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const b = await chromium.launch({ args });
  const mk = m => b.newPage(m ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const shots = [];
  // name, mobile?, url, où défiler (sélecteur ou texte), éléments à souligner
  const shot = (name, m, url, at, marks = [], off = 120, act) => shots.push({ name, m, url, at, marks, off, act });

  shot('pdp-mf', 0, '/produit?p=magnetic-flowers', null, ['.pdp__notes-line']);
  shot('pdp-tl', 0, '/produit?p=tonka-love', null, ['.pdp__notes-line']);
  shot('pdp-vp-m', 1, '/produit?p=vanilla-plum', null, []);
  shot('coffret', 0, '/produit?p=coffret-decouverte', null, ['text=Valeur recréditée']);
  shot('services', 0, '/services', 'text=Le coffret recrédité', ['text=Le coffret recrédité'], 260);
  shot('stores', 0, '/points-de-vente', null, ['.store:has-text("Olfactions")'], 0, async p => { await p.fill('#stores-q', 'Toulouse'); });
  shot('pied', 0, '/', 'footer', [], 0);
  shot('pied-m', 1, '/', 'footer', [], 0);
  shot('preface', 0, '/preface', null, []);
  shot('accueil-m', 1, '/', null, []);

  for (const s of shots) {
    if (PRE && !s.name.startsWith(PRE)) continue;
    const p = await mk(s.m);
    await p.goto(B + s.url, { waitUntil: 'networkidle' });
    await p.evaluate(() => { try { sessionStorage.setItem('librery-loader', '1'); } catch (e) {} });
    await p.waitForTimeout(2500);
    await p.evaluate(async () => { // charge les images paresseuses
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.querySelectorAll('img').forEach(i => i.loading = 'eager');
      for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await w(60); }
      scrollTo(0, 0); await w(300);
    });
    if (s.at) {
      const el = p.locator(s.at).first();
      const y = await el.evaluate((e, off) => e.getBoundingClientRect().top + scrollY - off, s.off);
      if (s.at === 'footer') await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
      else await p.evaluate(v => scrollTo(0, v), y);
    }
    if (s.act) await s.act(p);
    await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelectorAll('[data-sticky-buy], .pdp__bar, .loader, .cookie').forEach(e => e.style.visibility = 'hidden'));
    const marks = [];
    for (const sel of s.marks) {
      const bb = await p.locator(sel).first().boundingBox().catch(() => null);
      if (bb) marks.push(bb);
    }
    await p.screenshot({ path: `${OUT}/${s.name}.jpg`, type: 'jpeg', quality: 90 });
    meta[s.name] = { m: s.m, marks };
    console.log(s.name, JSON.stringify(marks));
    await p.close();
  }
  fs.writeFileSync(metaF, JSON.stringify(meta, null, 1));
  await b.close();
})();
