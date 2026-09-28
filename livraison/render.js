// Imprime livraison.html en PDF (A4 à l'italienne) et exporte un aperçu PNG par page.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + (process.env.SPKI || '')] });
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, 'livraison.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.resolve(__dirname, 'LIBRERY-livraison-site.pdf'), width: "1600px", height: "900px", printBackground: true, preferCSSPageSize: true });
  if (process.env.PREVIEW) {
    await p.setViewportSize({ width: 1600, height: 900 });
    const n = await p.evaluate(() => document.querySelectorAll('.pg').length);
    for (let i = 0; i < n; i++) {
      const el = (await p.$$('.pg'))[i];
      await el.screenshot({ path: `${process.env.PREVIEW}/p${String(i + 1).padStart(2, '0')}.png` });
    }
  }
  console.log('fonts', await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(',')));
  await b.close();
})();
