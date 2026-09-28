// Photographie chaque page de livraison.html (×2), puis imprime un PDF fait de ces images,
// avec les liens replacés par-dessus : aucune ombre ne peut plus s'afficher en cadre gris.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + (process.env.SPKI || '')] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, 'livraison.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const tmp = path.resolve(__dirname, '.pages'); fs.mkdirSync(tmp, { recursive: true });
  const n = await p.evaluate(() => document.querySelectorAll('.pg').length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const el = (await p.$$('.pg'))[i];
    await el.scrollIntoViewIfNeeded();
    const f = `p${String(i + 1).padStart(2, '0')}.jpg`;
    await el.screenshot({ path: path.join(tmp, f), type: 'jpeg', quality: 86 });
    if (process.env.PREVIEW) fs.copyFileSync(path.join(tmp, f), path.join(process.env.PREVIEW, f));
    const links = await el.evaluate(pg => { const r0 = pg.getBoundingClientRect(); return [...pg.querySelectorAll('a[href]')].map(a => { const r = a.getBoundingClientRect(); return { h: a.href, x: r.left - r0.left, y: r.top - r0.top, w: r.width, hh: r.height }; }); });
    out.push(`<div class="pg"><img src="${f}">${links.map(l => `<a href="${l.h}" style="left:${l.x}px;top:${l.y}px;width:${l.w}px;height:${l.hh}px"></a>`).join('')}</div>`);
  }
  fs.writeFileSync(path.join(tmp, 'print.html'), `<!doctype html><meta charset="utf-8"><title>LIBRERY — Livraison du site</title><style>@page{size:1600px 900px;margin:0}body{margin:0}.pg{position:relative;width:1600px;height:900px;overflow:hidden;break-after:page}.pg img{width:1600px;height:900px;display:block}.pg a{position:absolute;display:block}</style>${out.join('')}`);
  await p.goto('file://' + path.join(tmp, 'print.html'), { waitUntil: 'load' });
  await p.pdf({ path: path.resolve(__dirname, 'LIBRERY-livraison-site.pdf'), width: '1600px', height: '900px', printBackground: true, preferCSSPageSize: true });
  console.log(n, 'pages');
  await b.close();
})();
