// Défilement de l'accueil à vitesse constante, iPhone émulé (CPU ×4) : temps de chaque image, par section
import { chromium } from 'playwright';
const [mode = 'mobile', vitesse = '1400', cpu = '4', url = 'http://localhost:4173/'] = process.argv.slice(2);
const NM = process.env.THREE_LOCAL || '';   // three@0.170.0 local (si le CDN est inaccessible)
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const mobile = mode === 'mobile';
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
if (NM) await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.170\.0\/(.*)/, r => r.fulfill({ path: `${NM}/${r.request().url().replace(/.*three@0\.170\.0\//, '')}`, contentType: 'text/javascript' }));
await page.addInitScript(() => { try { sessionStorage.setItem('librery-vu', '1'); } catch (e) {} });
const cdp = await ctx.newCDPSession(page);
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(6000);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: +cpu });
const res = await page.evaluate(async v => {
  const sections = [...document.querySelectorAll('main > section, main > div')].map(s => ({ s, nom: (s.className || s.id || s.tagName).toString().split(' ')[0] }));
  const H = document.documentElement.scrollHeight - innerHeight; const out = []; let t0 = performance.now(), last = t0, y = 0;
  const lt = []; new PerformanceObserver(l => l.getEntries().forEach(e => lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: false });
  scrollTo(0, 0); await new Promise(r => setTimeout(r, 500));
  await new Promise(fin => { const pas = now => {
    const dt = now - last; last = now; y = Math.min(H, y + v * dt / 1000); scrollTo(0, y);
    const c = sections.find(({ s }) => { const r = s.getBoundingClientRect(); return r.top <= innerHeight / 2 && r.bottom > innerHeight / 2; });
    out.push([dt, c ? c.nom : '?']);
    if (y >= H) fin(); else requestAnimationFrame(pas); }; requestAnimationFrame(t => { last = t; requestAnimationFrame(pas); }); });
  const par = {}; out.slice(2).forEach(([dt, n]) => { (par[n] ||= []).push(dt); });
  const stat = a => { a = [...a].sort((x, y) => x - y); const q = p => a[Math.min(a.length - 1, Math.floor(p * a.length))]; return { n: a.length, med: +q(.5).toFixed(1), p90: +q(.9).toFixed(1), max: +a[a.length - 1].toFixed(1), lents: a.filter(x => x > 34).length }; };
  return { total: stat(out.slice(2).map(x => x[0])), par: Object.fromEntries(Object.entries(par).map(([k, a]) => [k, stat(a)])), longtasks: lt.length, ltMax: Math.max(0, ...lt.map(x => x[1])).toFixed(0) };
}, +vitesse);
console.log(JSON.stringify(res, null, 1));
await browser.close();
