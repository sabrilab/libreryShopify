// Le site du week-end (version simplifiée) en pages entières, ordinateur et iPhone, pour la séquence « week-end »
// de la vidéo récap. BASE = adresse du site (par défaut localhost:4174, la branche de la version simplifiée).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const B = process.env.BASE || 'http://localhost:4174';
const OUT = path.resolve(__dirname, 'public/recap/we');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const mk = (m, dpr) => b.newPage(m ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
  const full = async (m, u, name, maxH) => {
    const p = await mk(m, m ? 2 : 1.5);
    // CAPDIR : dossier local des images de films (_cap), servi à la place du site (utile pour le site en ligne)
    if (process.env.CAPDIR) await p.route('**/_cap/*', r => r.fulfill({ path: path.join(process.env.CAPDIR, r.request().url().split('/').pop()) }));
    await p.goto(B + u, { waitUntil: 'networkidle' });
    await p.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.querySelectorAll('img').forEach(i => i.loading = 'eager');
      for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await w(120); }
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 8000); })));
      scrollTo(0, 0);
    });
    await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelectorAll('[data-sticky-buy], .pdp__bar').forEach(e => e.style.visibility = 'hidden'));
    // Chromium sans codec H.264 : chaque film montre une image extraite d'avance (_cap/<nom>.jpg, ffmpeg à 4 s)
    await p.evaluate(() => document.querySelectorAll('video').forEach(v => {
      const src = v.currentSrc || v.src || v.querySelector('source')?.src || ''; const n = src.split('/').pop().split(/[?.]/)[0];
      if (!n) return; v.pause(); v.poster = `/_cap/${n}.jpg`; v.querySelectorAll('source').forEach(s => s.remove()); v.removeAttribute('src'); v.load();
    }));
    await p.waitForTimeout(1500);
    const h = Math.min(maxH, await p.evaluate(() => document.documentElement.scrollHeight));
    await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: m ? 390 : 1440, height: h }, fullPage: true });
    console.log(name, h); await p.close(); return h;
  };
  await full(0, '/', 'd-home', 5200);
  await full(1, '/', 'm-home', 5200);
  await full(0, '/collection?c=summer-vibes', 'd-summer', 2600);
  await full(1, '/collection?c=summer-vibes', 'm-summer', 2600);
  fs.writeFileSync(`${OUT}/we.json`, JSON.stringify([
    { d: 'd-home.jpg', m: 'm-home.jpg', y: 4200, ym: 4200, label: 'L’accueil : le film Skin Obsession en ouverture, comme avant.' },
    { d: 'd-summer.jpg', m: 'm-summer.jpg', y: 1100, ym: 1300, label: 'Summer Vibes : le nouveau film, au bouchon doré, en tête de collection.' },
  ], null, 1));
  await b.close();
})();
