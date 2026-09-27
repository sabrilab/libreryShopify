// Imprime dossier.html en PDF (A4 à l'italienne) et exporte un aperçu PNG par page.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + (process.env.SPKI || '')] });
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, 'dossier.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.resolve(__dirname, 'LIBRERY-refonte-dossier.pdf'), width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  if (process.env.PREVIEW) {
    await p.setViewportSize({ width: 1123, height: 794 });
    const n = await p.evaluate(() => document.querySelectorAll('.page').length);
    for (let i = 0; i < n; i++) {
      const el = (await p.$$('.page'))[i];
      await el.screenshot({ path: `${process.env.PREVIEW}/p${String(i + 1).padStart(2, '0')}.png` });
    }
  }
  console.log('fonts', await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(',')));
  await b.close();
})();
