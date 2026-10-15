// Test de bout en bout sur le site EN LIGNE (https://librery-refonte.vercel.app), réseau réel (aucun bridage) :
// accueil → défilement jusqu'à l'image clé du chevet → « Feuilleter le catalogue » → bascule → 2 doubles pages → Retour.
// node live.cjs [desktop|mobile] [lecture|presse|bloque]   (bloque : le catalogue refusé, le secours doit prendre le relais)
//   lecture : le visiteur descend à ≈ 1 écran/s puis s'arrête 1,5 s sur l'image clé (le cadre a pu se préparer)
//   presse  : saut direct à l'image clé et clic presque aussitôt
// Sorties (ignorées par git) : tests/sorties/live-avant-clic.png, live-apres-clic.png, live-feuilleter.mp4 (desktop lecture),
//           tests/sorties/run-<appareil>-<scenario>/ (images du screencast, rects.json, resultat.json)
const { chromium, devices } = require('/Users/svbri/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [,, appareil = 'desktop', scenario = 'lecture'] = process.argv;
const SITE = 'https://librery-refonte.vercel.app/', CAT = 'https://librery-catalogue-3d.vercel.app/';
const mobile = appareil === 'mobile', film = !mobile && scenario === 'lecture';
const FEU = path.join(__dirname, 'sorties'), OUT = path.join(FEU, `run-${appareil}-${scenario}`);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SEL = '#catalogue .flip__cta a.btn';
(async () => {
  const b = await chromium.launch({ executablePath: '/Users/svbri/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell', args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const opts = mobile ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } };
  delete opts.defaultBrowserType;
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  if (scenario === 'bloque') await ctx.route(u => u.href.startsWith(CAT), r => r.abort('connectionrefused'));
  const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  const reqs = []; ctx.on('request', r => { if (r.url().startsWith(CAT)) reqs.push({ u: r.url(), doc: r.resourceType() === 'document', type: r.resourceType(), t: Date.now(), r }); });
  await p.addInitScript(() => {
    const T = () => performance.timeOrigin + performance.now(); window.__log = [];
    const log = (m, x) => window.__log.push({ t: T(), m, x });
    addEventListener('message', e => { if (e.data?.source === 'librery-catalogue') log('msg:' + e.data.type, JSON.stringify(e.data).slice(0, 80)); });
    addEventListener('click', e => { if (e.target.closest?.('[data-lecteur]')) log('clic'); }, true);
    new MutationObserver(ms => ms.forEach(m => {
      const el = m.target;
      if (el === document.documentElement && m.attributeName === 'class') { const c = [...el.classList].filter(k => k.startsWith('lecteur')).join(' '); if (c !== window.__cl) { window.__cl = c; log('html', c); } }
      else if (el.matches?.('.lecteur__vue') && m.attributeName === 'src') log('src', (el.getAttribute('src') || '').slice(0, 300));
      else if (el.matches?.('.lecteur') && m.attributeName === 'data-etat') log('etat', el.dataset.etat || '');
    })).observe(document, { subtree: true, attributes: true, attributeFilter: ['class', 'src', 'data-etat'] });
    document.addEventListener('DOMContentLoaded', () => { const bt = document.querySelector('#catalogue .flip__cta a.btn'); if (bt) new MutationObserver(() => log('bouton', bt.textContent)).observe(bt, { childList: true, characterData: true, subtree: true }); });
  });
  const t0 = Date.now();
  await p.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const version = await p.evaluate(() => document.querySelector('script[src*="main.js"]')?.getAttribute('src'));
  const ok3d = await p.waitForFunction(() => document.querySelector('#catalogue')?.classList.contains('is-3d'), null, { timeout: 120000, polling: 250 }).then(() => true, () => false);
  const t3d = Date.now() - t0;
  await p.waitForFunction(() => !document.querySelector('#loader') || getComputedStyle(document.querySelector('#loader')).display === 'none' || document.querySelector('#loader').hidden || +getComputedStyle(document.querySelector('#loader')).opacity === 0, null, { timeout: 60000, polling: 250 }).catch(() => {});
  await sleep(1500);
  const geo = () => p.evaluate(() => { const s = document.querySelector('#catalogue'), r = s.getBoundingClientRect(); return { top: scrollY + r.top, h: s.offsetHeight, ih: innerHeight }; });
  const g = await geo(); const cle = Math.round(g.top + .571 * (g.h - g.ih));
  if (scenario === 'lecture') {
    await p.evaluate(y => scrollTo(0, y), Math.max(0, g.top - 4 * g.ih)); await sleep(800);
    for (let y = await p.evaluate(() => scrollY); y < cle - 60; y = await p.evaluate(() => scrollY)) { await p.evaluate(d => scrollBy(0, d), Math.min(90, cle - y)); await sleep(100); }
    await p.evaluate(y => scrollTo(0, y), cle); await sleep(1500);
  } else { await p.evaluate(y => scrollTo(0, y), cle); await sleep(700); }
  // l'image clé nette (rendu affiné du chevet) avant de photographier
  await p.waitForFunction(() => document.querySelector('#catalogue .flip__chevet')?.dataset.rendu === 'net', null, { timeout: 4000, polling: 100 }).catch(() => {});
  const avantClic = await p.evaluate(() => ({ src: document.querySelector('.lecteur iframe')?.getAttribute('src')?.slice(0, 70) || null, etat: document.querySelector('.lecteur')?.dataset.etat || null, pret: window.__log.some(e => e.m === 'msg:pret') }));
  const rects = await p.evaluate(() => { const R = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); };
    return { livre: R('#catalogue .flip__leaf'), canvas: R('#catalogue .flip__chevet canvas'), cap: R('#catalogue .flip__cap'), cta: R('#catalogue .flip__cta'), header: R('#header'), vw: innerWidth, vh: innerHeight }; });
  fs.writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify(rects));
  // screencast continu, écrit au fil de l'eau (horodaté)
  const frames = []; let enregistre = true;
  cdp.on('Page.screencastFrame', f => {
    if (enregistre && scenario !== 'bloque') { const i = frames.length; fs.writeFileSync(path.join(OUT, 'raw', `${String(i).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64')); frames.push({ i, t: f.metadata.timestamp * 1000 }); }
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, everyNthFrame: 1, maxWidth: rects.vw, maxHeight: rects.vh });
  await sleep(film ? 1800 : 600);
  await p.screenshot({ path: path.join(OUT, 'avant.png'), scale: 'css' });
  if (film) fs.copyFileSync(path.join(OUT, 'avant.png'), path.join(FEU, 'live-avant-clic.png'));
  await sleep(150);
  const tClic = Date.now();
  if (mobile) await p.tap(SEL); else await p.click(SEL);
  let patienceVue = false;
  const fin = await (async () => {
    const lim = Date.now() + 20000;
    while (Date.now() < lim) {
      const s = await p.evaluate(() => { const l = document.querySelector('.lecteur'); if (!l) return { r: null };
        const src = l.querySelector('iframe')?.getAttribute('src') || '';
        if (l.dataset.etat === 'ouvert') return { r: 'bascule' };
        if (!l.classList.contains('lecteur--chevet') && (/embed=1$/.test(src) || src === '' || src === 'about:blank')) return { r: 'secours' };
        return { r: null, pat: document.documentElement.classList.contains('lecteur-patience') }; });
      if (s.r) return s.r;
      if (s.pat && !patienceVue) { patienceVue = true; await p.screenshot({ path: path.join(OUT, 'patience.png'), scale: 'css' }); }
      await sleep(30);
    }
    return 'rien';
  })();
  if (fin === 'secours') await sleep(2000);   // le lecteur habituel glisse (750 ms) puis se charge
  const tBascule = Date.now();
  await p.screenshot({ path: path.join(OUT, 'apres.png'), scale: 'css' });
  if (film) fs.copyFileSync(path.join(OUT, 'apres.png'), path.join(FEU, 'live-apres-clic.png'));
  const iframeSrc = await p.evaluate(() => document.querySelector('.lecteur iframe')?.src || null);
  // deux doubles pages, puis Retour
  let pages = [], retour = null;
  if (fin === 'bascule') {
    await sleep(1600);
    const fr = p.frames().find(f => f.url().includes('decor=chevet'));
    const lab = () => fr ? fr.evaluate(() => document.querySelector('[aria-live], .pager, .compteur, #page')?.textContent?.trim().slice(0, 60) || null).catch(() => null) : null;
    pages.push({ t: Date.now() - tClic, lab: await lab() });
    for (let i = 0; i < 2; i++) {
      if (mobile) { const r = rects.livre; await p.touchscreen.tap(r[0] + r[2] * .85, r[1] + r[3] * .5); } else await p.keyboard.press('ArrowRight');
      await sleep(1900); pages.push({ t: Date.now() - tClic, lab: await lab() });
      await p.screenshot({ path: path.join(OUT, `page${i + 1}.png`), scale: 'css' });
    }
    await sleep(600);
    const tr = Date.now();
    const vu = await p.evaluate(() => { const b = document.querySelector('.lecteur__retour'); if (!b) return false; const r = b.getBoundingClientRect(), s = getComputedStyle(b); return r.width > 0 && s.visibility !== 'hidden' && +s.opacity > 0; });
    if (vu) await (mobile ? p.tap('.lecteur__retour') : p.click('.lecteur__retour')); else await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.documentElement.classList.contains('lecteur-ouvert'), null, { timeout: 15000, polling: 50 }).catch(() => {});
    const tFerme = Date.now() - tr;
    await p.waitForFunction(() => !/lecteur-(retour|chevet)/.test(document.documentElement.className), null, { timeout: 5000, polling: 50 }).catch(() => {});
    await sleep(1500);
    await p.screenshot({ path: path.join(OUT, 'retour.png'), scale: 'css' });
    retour = { par: vu ? 'bouton Retour' : 'Échap', 'fermé en (ms)': tFerme, hash: await p.evaluate(() => location.hash), scrollY: await p.evaluate(() => scrollY), cle, bouton: await p.evaluate(() => document.querySelector('#catalogue .flip__cta a.btn')?.textContent), histoire: await p.evaluate(() => history.length) };
  }
  enregistre = false; await cdp.send('Page.stopScreencast').catch(() => {});
  const log = await p.evaluate(() => window.__log);
  const clic = log.find(e => e.m === 'clic')?.t || tClic;
  const rel = x => x == null ? null : Math.round(x - clic);
  // images du screencast nommées par leur temps au clic (pour diff.py), jusqu'à 1,5 s après la bascule
  const tOuvert = log.find(e => e.m === 'etat' && e.x === 'ouvert' && e.t > clic)?.t;
  const lim = (tOuvert || clic + 12000) + 1500;
  frames.filter(f => f.t > clic - 700 && f.t < lim).forEach(f => fs.copyFileSync(path.join(OUT, 'raw', `${String(f.i).padStart(5, '0')}.jpg`), path.join(OUT, `f${String(f.i).padStart(5, '0')}_${Math.round(f.t - clic)}.png`)));
  // film : images à leur vrai rythme (durées horodatées), 30 i/s
  if (film && frames.length > 2) {
    const lst = frames.map((f, k) => `file 'raw/${String(f.i).padStart(5, '0')}.jpg'\nduration ${(((frames[k + 1]?.t ?? f.t + 33) - f.t) / 1000).toFixed(4)}`).join('\n') + `\nfile 'raw/${String(frames.at(-1).i).padStart(5, '0')}.jpg'\n`;
    fs.writeFileSync(path.join(OUT, 'film.txt'), lst);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'film.txt'), '-vf', 'fps=30,scale=1440:-2,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', path.join(FEU, 'live-feuilleter.mp4')], { cwd: OUT });
  }
  for (const q of reqs) { const z = await q.r.sizes().catch(() => null); q.octets = z ? z.responseBodySize : null; const rp = await q.r.response().catch(() => null); q.statut = rp ? rp.status() : null; }
  const vus = {}; reqs.forEach(r => { vus[r.u] = (vus[r.u] || 0) + 1; });
  const res = {
    appareil, scenario, version, ok3d, t3d, avantClic, fin, patienceVue, iframeSrc: iframeSrc && iframeSrc.slice(0, 200),
    decorChevet: !!iframeSrc && iframeSrc.includes('decor=chevet'),
    secoursTire: log.some(e => e.m === 'src' && /embed=1$/.test(e.x)) || fin === 'secours',
    'pret (ms/clic)': rel(log.find(e => e.m === 'msg:pret')?.t), 'revenu (ms/clic)': rel(log.find(e => e.m === 'msg:revenu' && e.t > clic)?.t), 'bascule finie (ms/clic)': rel(tOuvert),
    srcs: log.filter(e => e.m === 'src').map(e => ({ t: rel(e.t), src: e.x.replace(CAT, '/').slice(0, 70) })),
    docs: reqs.filter(r => r.doc).map(r => ({ u: r.u.replace(CAT, '/').slice(0, 50), t: Math.round(r.t - clic) })), nReq: reqs.length,
    doublons: Object.entries(vus).filter(([, n]) => n > 1).map(([u, n]) => `${n}x ${u.replace(CAT, '/')} à ${reqs.filter(r => r.u === u).map(r => Math.round(r.t - clic) + ' ms (' + r.type + ', ' + r.statut + ', ' + r.octets + ' o)').join(', ')}`),
    pages, retour, frames: frames.length, errs: errs.slice(0, 8),
    journal: log.filter(e => e.t > clic - 50 && e.t < clic + 30000).map(e => `${rel(e.t)} ${e.m} ${e.x ?? ''}`.slice(0, 110)),
  };
  fs.writeFileSync(path.join(OUT, 'resultat.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
