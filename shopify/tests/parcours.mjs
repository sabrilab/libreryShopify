// Parcours automatique de l'aperçu local (apercu-local.mjs --essai) : chaque page se rend sans erreur JavaScript,
// les prix et le stock viennent de « Shopify », le panier part à la caisse avec les bonnes variantes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SORTIES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sorties');
const PAGES = ['/', '/products/tonka-love', '/products/hot-sand', '/products/coffret-collection', '/collections/skin-obsession',
  '/collections/summer-vibes', '/collections/coffrets', '/pages/bibliotheque', '/pages/preface', '/pages/lexique',
  '/pages/points-de-vente', '/pages/portrait-olfactif', '/pages/offrir', '/pages/services', '/pages/contact',
  '/pages/conditions-generales-de-vente-cgv', '/products/bougie-essai', '/cart'];

export async function essai(base, journal) {
  fs.mkdirSync(SORTIES, { recursive: true });
  const exe = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const nav = await chromium.launch(exe ? { executablePath: exe } : {});
  const echecs = [], note = (ok, quoi) => { console.log((ok ? '  ok   ' : '  ÉCHEC ') + quoi); if (!ok) echecs.push(quoi); };

  for (const vue of [{ nom: 'ordinateur', viewport: { width: 1440, height: 900 } }, { nom: 'iphone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]) {
    console.log(`\n${vue.nom}`);
    const cx = await nav.newContext({ viewport: vue.viewport, isMobile: vue.isMobile, hasTouch: vue.hasTouch, locale: 'fr-FR' });
    await cx.addInitScript(() => sessionStorage.setItem('librery-vu', '1'));
    for (const adr of PAGES) {
      const page = await cx.newPage(), erreurs = [];
      page.on('pageerror', e => erreurs.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !/WebGL|GPU|webgl|THREE|404|Failed to load resource|tile\.openstreetmap|ERR_/.test(m.text())) erreurs.push(m.text()); });
      await page.goto(base + adr, { waitUntil: 'load' });
      await page.waitForTimeout(600);
      const tete = await page.$eval('#header', e => e.innerHTML.length).catch(() => 0);
      const contenu = await page.$eval('main', e => e.innerText.trim().length).catch(() => 0);
      note(!erreurs.length && tete > 100 && contenu > 20, `${adr} — en-tête ${tete > 100 ? 'rendu' : 'VIDE'}, contenu ${contenu} car.${erreurs.length ? ', erreurs : ' + erreurs.join(' | ') : ''}`);
      if (adr === '/' || adr === '/products/tonka-love') await page.screenshot({ path: path.join(SORTIES, `${vue.nom}${adr.replace(/\//g, '_') || '_accueil'}.png`) });
      await page.close();
    }
    await cx.close();
  }

  console.log('\ncommerce');
  const cx = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  await cx.addInitScript(() => sessionStorage.setItem('librery-vu', '1'));
  const page = await cx.newPage();
  page.on('pageerror', e => note(false, 'erreur JS : ' + e.message));

  // les liens de l'en-tête sont les adresses Shopify
  await page.goto(base + '/products/hot-sand');
  const liens = await page.$$eval('#header a[href]', as => as.map(a => a.getAttribute('href')));
  note(liens.includes('/pages/bibliotheque') && liens.includes('/collections/skin-obsession') && !liens.some(h => /produit\?|collection\?|^\/(bibliotheque|preface)$/.test(h)), 'liens de l’en-tête : /pages/…, /collections/…, /products/…');
  // prix de la boutique (175 €), pas celui de data.js (170 €)
  const prix = await page.$eval('#sizes', e => e.innerText);
  note(/175/.test(prix) && !/170/.test(prix), 'Hot Sand 100 ml affiché au prix de la boutique (175 €)');
  // ajout puis caisse
  await page.click('#add');
  await page.waitForSelector('#cart.is-open');
  await page.click('[data-checkout]');
  await page.waitForURL('**/checkout', { timeout: 8000 }).catch(() => {});
  note(page.url().endsWith('/checkout'), 'Commander mène à la caisse');
  const ajout = journal.find(j => j[0] === 'add'), attrs = journal.find(j => j[0] === 'update' && j[1].attributes);
  note(ajout && ajout[1].items.length === 1 && ajout[1].items[0].quantity === 1 && ajout[1].items[0].properties._librery === '1', 'panier Shopify : une ligne Hot Sand marquée _librery');
  note(attrs && /,/.test(attrs[1].attributes['Échantillons offerts']) && attrs[1].attributes['2 ml pour essayer'] === 'Hot Sand', 'attributs du panier : échantillons offerts et 2 ml pour essayer');

  // stock : Tonka Love 30 ml épuisé dans la boutique
  await page.goto(base + '/products/tonka-love');
  await page.click('#sizes button[data-f="30"]');
  await page.click('#add');
  const toast = await page.waitForSelector('#toast.is-in', { timeout: 3000 }).then(e => e.innerText()).catch(() => '');
  note(/épuisé/.test(toast), `format épuisé refusé (« ${toast} »)`);

  // produit inconnu de data.js : fiche générique Shopify
  await page.goto(base + '/products/bougie-essai');
  note(await page.$eval('#product-shopify', e => !e.hidden && /Bougie/.test(e.innerText)).catch(() => false), 'produit hors data.js : fiche générique Shopify visible');

  // /collections/all → la Bibliothèque
  await page.goto(base + '/collections/all');
  await page.waitForURL('**/pages/bibliotheque', { timeout: 5000 }).catch(() => {});
  note(page.url().endsWith('/pages/bibliotheque'), '/collections/all renvoie vers /pages/bibliotheque');

  // lettre de la maison : envoi au formulaire client de Shopify
  await page.goto(base + '/pages/services');
  const n = journal.length;
  const form = await page.$('form[data-news]');
  if (form) { await form.$eval('input[type=email]', i => i.value = 'essai@example.com'); await form.$eval('button', b => b.click()); await page.waitForTimeout(500); }
  note(form && journal.slice(n).some(j => j[0] === 'contact'), 'lettre de la maison : envoyée à /contact (client Shopify)');

  await nav.close();
  console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\ntout est passé');
  return !echecs.length;
}
