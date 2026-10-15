// Tests hors ligne de l'importeur (node --test shopify/import/).
// Aucun accès réseau : la boutique est simulée par un faux fetch.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as I from './importer.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const D = I.chargerDonnees();
const parHandle = (h) => D.PRODUCTS.find((p) => p.handle === h);

// ── Données et payloads ─────────────────────────────────────────────────────

test('10 produits actifs, produit en pause exclu', () => {
  const P = I.produitsImportes(D);
  assert.equal(P.length, 10);
  assert.ok(!P.some((p) => p.handle === 'coffret-a-composer'));
  assert.ok(D.PAUSED_PRODUCTS.some((p) => p.handle === 'coffret-a-composer'));
  assert.ok(!P.some((p) => p.paused));
});

test('collection bougies (hidden) exclue, ordre de data.js', () => {
  assert.deepEqual(I.collectionsImportees(D).map((c) => c.handle), ['skin-obsession', 'summer-vibes', 'coffrets']);
  assert.deepEqual(I.produitsDeCollection(D, 'summer-vibes'), ['hot-sand', 'mango-wave', 'sun-ice', 'palmeira', 'ambert-sunset']);
  assert.deepEqual(I.produitsDeCollection(D, 'coffrets'), ['coffret-decouverte', 'coffret-collection']);
});

test('Hot Sand : 100 ml 170 / 30 ml 90 / 2 ml 7, libellés exacts, SKU', () => {
  const c = I.construireProduit(parHandle('hot-sand'), D);
  assert.deepEqual(c.input.productOptions[0].name, 'Format');
  assert.deepEqual(c.input.productOptions[0].values.map((v) => v.name), ['100 ml', '30 ml', '2 ml']);
  assert.deepEqual(c.input.variants.map((v) => [v.optionValues[0].name, v.price, v.sku]), [
    ['100 ml', '170.00', 'LIB-HOT-SAND-100'],
    ['30 ml', '90.00', 'LIB-HOT-SAND-30'],
    ['2 ml', '7.00', 'LIB-HOT-SAND-2'],
  ]);
  for (const v of c.input.variants) {
    assert.equal(v.optionValues[0].optionName, 'Format');
    assert.equal(v.inventoryPolicy, 'DENY');
    assert.equal(v.inventoryItem.tracked, true);
    assert.equal(v.inventoryQuantities, undefined, 'aucune quantité de stock ne doit être posée');
  }
  assert.equal(c.input.status, 'DRAFT');
  assert.equal(c.input.handle, 'hot-sand');
});

test('coffrets : formats propres (40 € ; 430 € et 250 €)', () => {
  const dec = I.construireProduit(parHandle('coffret-decouverte'), D);
  assert.deepEqual(dec.input.variants.map((v) => [v.optionValues[0].name, v.price, v.sku]), [['8 × 2 ml', '40.00', 'LIB-COFFRET-DECOUVERTE-8X2']]);
  const col = I.construireProduit(parHandle('coffret-collection'), D);
  assert.deepEqual(col.input.variants.map((v) => [v.optionValues[0].name, v.price, v.sku]), [
    ['Summer Vibes · 5 × 30 ml', '430.00', 'LIB-COFFRET-COLLECTION-SV'],
    ['Skin Obsession · 3 × 30 ml', '250.00', 'LIB-COFFRET-COLLECTION-SO'],
  ]);
  assert.equal(col.input.productType, 'Coffret');
});

test('chaque libellé de variante est exactement un label de data.js', () => {
  for (const p of I.produitsImportes(D)) {
    const labels = (p.formats || D.FORMATS).map((f) => f.label);
    const c = I.construireProduit(p, D);
    assert.deepEqual(c.input.variants.map((v) => v.optionValues[0].name), labels, p.handle);
    assert.deepEqual(c.input.productOptions[0].values.map((v) => v.name), labels, p.handle);
  }
});

// Fiche telle que la boutique actuelle la renvoie (contenu-actuel/donnees/products.json).
const actuels = JSON.parse(readFileSync(join(ICI, '../../contenu-actuel/donnees/products.json'), 'utf8')).products;
let compteurId = 1000;
function ficheExistante(p) {
  const opt = { id: `gid://shopify/ProductOption/${p.id}`, name: 'Format', position: 1, optionValues: p.options[0].values.map((v, i) => ({ id: `gid://shopify/ProductOptionValue/${p.id}${i}`, name: v })) };
  return {
    id: `gid://shopify/Product/${p.id}`, handle: p.handle, title: p.title, status: 'ACTIVE', descriptionHtml: p.body_html, vendor: p.vendor, productType: '', tags: p.tags, templateSuffix: null,
    seo: { title: null, description: null },
    options: [opt],
    variants: { nodes: p.variants.map((v) => ({ id: `gid://shopify/ProductVariant/${v.id}`, title: v.title, sku: v.sku, price: v.price, position: v.position, inventoryPolicy: 'DENY', selectedOptions: [{ name: 'Format', value: v.option1 }], inventoryItem: { id: `gid://shopify/InventoryItem/${compteurId++}`, tracked: false } })) },
    media: { nodes: p.images.map((m) => ({ id: `gid://shopify/MediaImage/${m.id}`, alt: null, mediaContentType: 'IMAGE', image: { url: m.src } })) },
    collections: { nodes: [{ id: 'gid://shopify/Collection/645575213405', handle: 'summer-vibes' }] },
    metafields: { nodes: [] },
  };
}
const aplatir = (f) => ({ ...f, variants: f.variants.nodes, media: f.media.nodes.map((m) => ({ id: m.id, url: m.image.url })), metafields: [] });

test('variantes existantes : 100ML → 100 ml et 2ML → 2 ml gardent leur ID, 30 ml ajouté', () => {
  const brut = actuels.find((p) => p.handle === 'hot-sand');
  const ex = aplatir(ficheExistante(brut));
  const c = I.construireProduit(parHandle('hot-sand'), D, { existant: ex, statut: 'ACTIVE' });
  const [v100, v30, v2] = c.input.variants;
  assert.equal(v100.id, `gid://shopify/ProductVariant/${brut.variants.find((v) => v.title === '100ML').id}`);
  assert.equal(v2.id, `gid://shopify/ProductVariant/${brut.variants.find((v) => v.title === '2ML').id}`);
  assert.equal(v30.id, undefined);
  assert.equal(v30.inventoryPolicy, 'DENY');
  assert.equal(v100.inventoryPolicy, undefined, 'la politique des variantes existantes est conservée');
  assert.deepEqual(c.identifier, { id: ex.id });
  assert.equal(c.input.handle, undefined);
  assert.equal(c.input.productOptions[0].id, ex.options[0].id);
  assert.deepEqual(c.input.productOptions[0].values, [
    { id: ex.options[0].optionValues[0].id, name: '100 ml' },
    { name: '30 ml' },
    { id: ex.options[0].optionValues[1].id, name: '2 ml' },
  ]);
  assert.equal(c.orphelines.length, 0);
  assert.equal(I.normaliserFormat('100ML'), I.normaliserFormat('100 ml'));
});

test('description, SEO et métachamps', () => {
  const p = parHandle('vanilla-plum');
  const html = I.descriptionHtml(p);
  assert.equal((html.match(/<p>/g) || []).length, p.description.length);
  assert.match(html, /<p class="coda">Une sensation à découvrir\.<br>/);
  const seo = I.seoProduit(p);
  assert.ok(seo.title.startsWith('Vanilla Plum — ') && seo.title.length <= 70);
  assert.ok(seo.description.includes(p.tagline));
  const mf = Object.fromEntries(I.metachampsProduit(p, { idsParfumeurs: { 'coralie-spicher': 'gid://shopify/Metaobject/1' } }).map((m) => [m.key, m]));
  assert.equal(mf.perfumer.value, 'gid://shopify/Metaobject/1');
  assert.equal(mf.perfumer.type, 'metaobject_reference');
  assert.deepEqual(JSON.parse(mf.families.value), ['Gourmand', 'Ambré']);
  assert.deepEqual(JSON.parse(mf.editorial.value), p);
  assert.ok(mf.notes_tete.value.includes('\n'));
  for (const m of Object.values(mf)) assert.equal(m.namespace, 'librery');
});

test('images : galerie en URL Vercel, texte alternatif = nom', () => {
  const p = parHandle('hot-sand');
  const f = I.fichiersProduit(p);
  assert.equal(f.length, p.gallery.length);
  assert.equal(f[0].originalSource, `https://librery-refonte.vercel.app/assets/img/v2/${p.gallery[0]}.webp`);
  assert.ok(f.every((x) => x.alt === 'Hot Sand' && x.contentType === 'IMAGE'));
  // Une image déjà présente (même nom de fichier) est réutilisée par son ID.
  const g = I.fichiersProduit(p, { media: [{ id: 'gid://shopify/MediaImage/7', url: `https://cdn.shopify.com/s/files/1/x/files/${p.gallery[1]}.webp?v=1` }] });
  assert.deepEqual(g[1], { id: 'gid://shopify/MediaImage/7' });
});

test('métaobjets : 3 parfumeurs, 5 familles, points de vente aux handles uniques', () => {
  const e = I.entreesMetaobjets(D);
  assert.equal(e.filter((x) => x.type === 'parfumeur').length, 3);
  assert.deepEqual(e.filter((x) => x.type === 'famille').map((x) => x.handle), ['gourmand', 'floral', 'fruite', 'ambre', 'boise']);
  const pdv = e.filter((x) => x.type === 'point_de_vente');
  assert.equal(pdv.length, D.STORES.length);
  assert.equal(new Set(pdv.map((x) => x.handle)).size, pdv.length);
  const fam = e.find((x) => x.handle === 'gourmand');
  assert.equal(fam.fields.find((f) => f.key === 'image').value, 'famille-gourmand');
});

test('redirections et fichier CSV identiques', () => {
  const r = I.redirections();
  assert.deepEqual(r[0], { path: '/pages/nos-points-de-vente', target: '/pages/points-de-vente' });
  for (const h of ['bibliotheque', 'preface', 'lexique', 'points-de-vente', 'portrait-olfactif', 'offrir', 'services', 'contact']) {
    assert.ok(r.some((x) => x.path === `/${h}` && x.target === `/pages/${h}`), h);
  }
  assert.equal(r.length, 9);
  assert.equal(readFileSync(join(ICI, 'redirections.csv'), 'utf8'), I.redirectionsCsv());
});

test('pages nouvelles : non publiées, gabarit = handle', () => {
  for (const pg of I.PAGES_NOUVELLES) {
    const e = I.entreePageNouvelle(pg);
    assert.equal(e.isPublished, false);
    assert.equal(e.templateSuffix, pg.handle);
  }
});

// ── Faux Shopify ────────────────────────────────────────────────────────────

const PAGES_ACTUELLES = ['conditions-generales-de-vente-cgv', 'contact', 'data-sharing-opt-out', 'mentions-legales', 'nos-points-de-vente', 'politique-de-confidentialite'];

function fauxShopify({ refuser = null, limiterUneFois = false } = {}) {
  const appels = [];
  const produits = new Map(actuels.map((p) => [p.handle, ficheExistante(p)]));
  let n = 1;
  let limite = limiterUneFois;
  const ok = (data) => ({ data, extensions: { cost: { requestedQueryCost: 10, throttleStatus: { maximumAvailable: 2000, currentlyAvailable: 1990, restoreRate: 100 } } } });
  const repondre = (corps, status = 200) => ({ status, ok: status < 400, headers: { get: () => null }, json: async () => corps, text: async () => JSON.stringify(corps) });

  const lecture = {
    Boutique: () => ({ shop: { name: 'Librery', myshopifyDomain: 'test.myshopify.com', currencyCode: 'EUR', taxesIncluded: true }, publications: { nodes: [{ id: 'gid://shopify/Publication/1', catalog: { title: 'Online Store' } }, { id: 'gid://shopify/Publication/2', catalog: { title: 'Point of Sale' } }] } }),
    Produit: (v) => ({ productByIdentifier: produits.get(v.handle) || null }),
    Collection: (v) => ({ collectionByIdentifier: v.handle === 'summer-vibes' ? { id: 'gid://shopify/Collection/645575213405', handle: 'summer-vibes', title: 'Summer vibes', descriptionHtml: '', sortOrder: 'BEST_SELLING', templateSuffix: null, seo: {}, ruleSet: null, products: { nodes: [...produits.values()].filter((p) => actuels.some((a) => a.handle === p.handle)).map((p) => ({ id: p.id, handle: p.handle })) }, metafields: { nodes: [] } } : null }),
    Pages: () => ({ pages: { nodes: PAGES_ACTUELLES.map((h, i) => ({ id: `gid://shopify/Page/${i + 1}`, handle: h, title: h, isPublished: true, templateSuffix: null })) } }),
    DefinitionsMetachamps: () => ({ metafieldDefinitions: { nodes: [] } }),
    DefinitionMetaobjet: () => ({ metaobjectDefinitionByType: null }),
    Metaobjets: () => ({ metaobjects: { nodes: [] } }),
    Redirections: () => ({ urlRedirects: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } }),
    Tache: (v) => ({ job: { id: v.id, done: true } }),
    SauvegardeProduits: () => ({ products: { nodes: [...produits.values()], pageInfo: { hasNextPage: false } } }),
    SauvegardeCollections: () => ({ collections: { nodes: [], pageInfo: { hasNextPage: false } } }),
    SauvegardePages: () => ({ pages: { nodes: [], pageInfo: { hasNextPage: false } } }),
    SauvegardeDefinitionsMetaobjets: () => ({ metaobjectDefinitions: { nodes: [] } }),
  };
  const ue = [];
  const ecriture = {
    CreerDefinitionMetaobjet: (v) => ({ metaobjectDefinitionCreate: { metaobjectDefinition: { id: `gid://shopify/MetaobjectDefinition/${n++}`, type: v.definition.type }, userErrors: ue } }),
    UpsertMetaobjet: (v) => ({ metaobjectUpsert: { metaobject: { id: `gid://shopify/Metaobject/${n++}`, handle: v.handle.handle }, userErrors: ue } }),
    CreerDefinitionMetachamp: (v) => ({ metafieldDefinitionCreate: { createdDefinition: { id: `gid://shopify/MetafieldDefinition/${n++}`, key: v.definition.key }, userErrors: ue } }),
    EnregistrerProduit: (v) => {
      const avant = v.identifier ? [...produits.values()].find((p) => p.id === v.identifier.id) : null;
      const id = avant?.id || `gid://shopify/Product/${n++}`;
      const handle = avant?.handle || v.input.handle;
      const fiche = {
        ...(avant || {}), id, handle, title: v.input.title, status: v.input.status, descriptionHtml: v.input.descriptionHtml, seo: v.input.seo,
        options: [{ id: `gid://shopify/ProductOption/${id}`, name: 'Format', position: 1, optionValues: v.input.productOptions[0].values.map((x, i) => ({ id: x.id || `gid://shopify/ProductOptionValue/${n++}`, name: x.name })) }],
        variants: { nodes: v.input.variants.map((x) => ({ id: x.id || `gid://shopify/ProductVariant/${n++}`, title: x.optionValues[0].name, sku: x.sku, price: x.price, selectedOptions: [{ name: 'Format', value: x.optionValues[0].name }], inventoryItem: { tracked: true } })) },
        media: { nodes: (v.input.files || []).map((f) => ({ id: f.id || `gid://shopify/MediaImage/${n++}`, image: { url: f.originalSource || 'x' } })) },
        collections: avant?.collections || { nodes: [] }, metafields: { nodes: [] },
      };
      produits.set(handle, fiche);
      return { productSet: { product: { id, handle, status: v.input.status, variants: fiche.variants }, userErrors: ue } };
    },
    EcrireMetachamps: (v) => ({ metafieldsSet: { metafields: v.metafields.map((m) => ({ id: 'x', namespace: m.namespace, key: m.key })), userErrors: ue } }),
    Publier: () => ({ publishablePublish: { userErrors: [] } }),
    CreerCollection: (v) => ({ collectionCreate: { collection: { id: `gid://shopify/Collection/${n++}`, handle: v.collection.handle }, userErrors: [] } }),
    MajCollection: (v) => ({ collectionUpdate: { collection: { id: v.collection.id, handle: 'summer-vibes' }, userErrors: [] } }),
    RejoindreCollection: (v) => ({ productUpdate: { product: { id: v.product.id }, userErrors: [] } }),
    OrdonnerCollection: () => ({ collectionReorderProducts: { job: { id: 'gid://shopify/Job/1', done: false }, userErrors: ue } }),
    CreerPage: (v) => ({ pageCreate: { page: { id: `gid://shopify/Page/${n++}`, handle: v.page.handle, isPublished: false, templateSuffix: v.page.templateSuffix }, userErrors: ue } }),
    MajPage: (v) => ({ pageUpdate: { page: { id: v.id, handle: '?', isPublished: !!v.page.isPublished, templateSuffix: v.page.templateSuffix || null }, userErrors: ue } }),
    CreerRedirection: (v) => ({ urlRedirectCreate: { urlRedirect: { id: `gid://shopify/UrlRedirect/${n++}`, ...v.urlRedirect }, userErrors: ue } }),
    MajRedirection: (v) => ({ urlRedirectUpdate: { urlRedirect: { id: v.id, ...v.urlRedirect }, userErrors: ue } }),
  };

  async function fetch(url, init) {
    const { query, variables } = JSON.parse(init.body);
    const nom = I.nomOperation(query);
    const mutation = /^\s*mutation\b/.test(query);
    appels.push({ url, nom, mutation, variables, jeton: init.headers['X-Shopify-Access-Token'] });
    if (limite) {
      limite = false;
      return repondre({ errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }], extensions: { cost: { requestedQueryCost: 50, throttleStatus: { maximumAvailable: 2000, currentlyAvailable: 0, restoreRate: 100 } } } });
    }
    const table = mutation ? ecriture : lecture;
    if (!table[nom]) throw new Error(`opération non simulée : ${nom}`);
    const data = table[nom](variables || {});
    if (refuser && nom === refuser) {
      const champ = Object.keys(data)[0];
      data[champ].userErrors = [{ field: ['definition', 'type'], message: 'Type is already taken', code: 'TAKEN' }];
    }
    return repondre(ok(data));
  }
  return { fetch, appels, produits };
}

const ENV = { SHOPIFY_FLAG_STORE: 'test.myshopify.com', SHOPIFY_ADMIN_TOKEN: 'jeton-factice' };
const silence = () => {};
const sansAttente = async () => {};
const dossierTemp = () => mkdtempSync(join(tmpdir(), 'librery-import-'));

// ── Comportement ────────────────────────────────────────────────────────────

test('essai sans identifiants : plan hors ligne, aucun appel réseau', async () => {
  let appels = 0;
  const r = await I.executer({ argv: [], env: {}, fetch: async () => { appels++; throw new Error('réseau interdit'); }, log: silence });
  assert.equal(r.code, 0);
  assert.equal(appels, 0);
  assert.ok(r.plan.some((l) => l.categorie === 'Produit' && l.cible === 'hot-sand'));
});

test('essai avec identifiants : lit la boutique, zéro mutation, diff cohérent', async () => {
  const s = fauxShopify();
  const sortie = [];
  const r = await I.executer({ argv: ['--essai'], env: ENV, fetch: s.fetch, log: (x) => sortie.push(x), dossier: dossierTemp(), attendre: sansAttente });
  assert.equal(r.code, 0);
  assert.ok(s.appels.length > 10);
  assert.equal(s.appels.filter((a) => a.mutation).length, 0, 'le mode essai ne doit envoyer aucune mutation');
  assert.ok(s.appels.every((a) => a.url === `https://test.myshopify.com/admin/api/${I.API_VERSION}/graphql.json`));
  const hot = r.plan.find((l) => l.categorie === 'Produit' && l.cible === 'hot-sand');
  assert.equal(hot.action, 'mise à jour');
  assert.equal(hot.etape, 'bascule');
  assert.ok(hot.details.includes('option « 100ML » → « 100 ml »'));
  assert.ok(hot.details.includes('+ variante « 30 ml » 90,00 €'));
  assert.ok(hot.details.some((d) => d.includes('198,00 € → 170,00 €')));
  const vp = r.plan.find((l) => l.categorie === 'Produit' && l.cible === 'vanilla-plum');
  assert.equal(vp.action, 'création');
  assert.match(sortie.join('\n'), /Aucune écriture effectuée/);
});

test('le client en lecture seule refuse toute mutation', async () => {
  const c = I.creerClient({ boutique: 'test.myshopify.com', jeton: 'x', fetch: async () => { throw new Error('ne doit pas être appelé'); } });
  await assert.rejects(c.gql(I.GQL.CREER_PAGE, {}), /lecture seule/);
});

test('modes d’écriture refusés sans identifiants', async () => {
  for (const m of ['--appliquer=preparation', '--appliquer=bascule', '--sauvegarder']) {
    const r = await I.executer({ argv: [m], env: {}, fetch: async () => { throw new Error('réseau interdit'); }, log: silence });
    assert.equal(r.code, 2, m);
  }
  assert.throws(() => I.lireIdentifiants({ SHOPIFY_FLAG_STORE: 'libreryparfum.com', SHOPIFY_ADMIN_TOKEN: 'x' }), /myshopify\.com/);
});

test('userErrors : arrêt immédiat, message clair, journal en échec', async () => {
  const s = fauxShopify({ refuser: 'CreerDefinitionMetaobjet' });
  const dossier = dossierTemp();
  await assert.rejects(
    I.executer({ argv: ['--appliquer=preparation'], env: ENV, fetch: s.fetch, log: silence, dossier, attendre: sansAttente }),
    (e) => e instanceof I.ErreurShopify && /Shopify a refusé « metaobjectDefinitionCreate »/.test(e.message) && /Type is already taken/.test(e.message),
  );
  assert.equal(s.appels.filter((a) => a.mutation).length, 1, 'aucune écriture après le refus');
  const fichiers = readdirSync(join(dossier, 'journaux'));
  assert.equal(fichiers.length, 1);
  const j = JSON.parse(readFileSync(join(dossier, 'journaux', fichiers[0]), 'utf8'));
  assert.equal(j.statut, 'échec');
  assert.equal(j.operations[0].userErrors[0].code, 'TAKEN');
  assert.ok(!JSON.stringify(j).includes('jeton-factice'), 'le jeton ne doit jamais être journalisé');
});

test('préparation : rien de visible (brouillons, pages non publiées, produits en vente intacts)', async () => {
  const s = fauxShopify();
  const r = await I.executer({ argv: ['--appliquer=preparation'], env: ENV, fetch: s.fetch, log: silence, dossier: dossierTemp(), attendre: sansAttente });
  assert.equal(r.code, 0);
  const m = s.appels.filter((a) => a.mutation);
  const noms = new Set(m.map((a) => a.nom));
  for (const interdit of ['Publier', 'CreerCollection', 'MajCollection', 'CreerRedirection', 'MajPage', 'RejoindreCollection']) assert.ok(!noms.has(interdit), interdit);
  const sets = m.filter((a) => a.nom === 'EnregistrerProduit');
  assert.equal(sets.length, 5, 'seuls les 5 nouveaux produits sont créés');
  assert.ok(sets.every((a) => a.variables.input.status === 'DRAFT' && !a.variables.identifier));
  const existants = new Set(actuels.map((p) => p.handle));
  assert.ok(sets.every((a) => !existants.has(a.variables.input.handle)));
  const pages = m.filter((a) => a.nom === 'CreerPage');
  assert.equal(pages.length, 7);
  assert.ok(pages.every((a) => a.variables.page.isPublished === false && a.variables.page.templateSuffix === a.variables.page.handle));
  // La référence au parfumeur est un vrai gid, jamais la valeur provisoire.
  const mf = m.filter((a) => a.nom === 'EcrireMetachamps').flatMap((a) => a.variables.metafields);
  assert.ok(mf.some((x) => x.key === 'perfumer'));
  assert.ok(mf.every((x) => !String(x.value).startsWith('<')));
  assert.equal(r.journal.statut, 'terminé');
});

test('bascule : refusée sans BASCULE, sauvegarde avant toute écriture', async () => {
  const s = fauxShopify();
  const dossier = dossierTemp();
  const r = await I.executer({ argv: ['--appliquer=bascule'], env: ENV, fetch: s.fetch, log: silence, dossier, confirmer: async () => 'non', attendre: sansAttente });
  assert.equal(r.code, 1);
  assert.equal(s.appels.filter((a) => a.mutation).length, 0);
  assert.equal(readdirSync(join(dossier, 'sauvegardes')).length, 1);
});

test('bascule complète (--oui) : produits actifs, collections, pages, redirections', async () => {
  const s = fauxShopify();
  const dossier = dossierTemp();
  const r = await I.executer({ argv: ['--appliquer=bascule', '--oui'], env: ENV, fetch: s.fetch, log: silence, dossier, attendre: sansAttente });
  assert.equal(r.code, 0);
  const premiere = s.appels.findIndex((a) => a.mutation);
  assert.ok(s.appels.slice(0, premiere).some((a) => a.nom === 'SauvegardeProduits'), 'sauvegarde avant la première écriture');
  const m = s.appels.filter((a) => a.mutation);
  const actifs = m.filter((a) => a.nom === 'EnregistrerProduit' && a.variables.input.status === 'ACTIVE');
  assert.equal(actifs.length, 10);
  const hot = actifs.find((a) => a.variables.identifier?.id === `gid://shopify/Product/${actuels.find((p) => p.handle === 'hot-sand').id}`);
  assert.ok(hot, 'Hot Sand mis à jour par son ID');
  assert.deepEqual(hot.variables.input.variants.map((v) => [v.optionValues[0].name, v.price, !!v.id]), [['100 ml', '170.00', true], ['30 ml', '90.00', false], ['2 ml', '7.00', true]]);
  assert.equal(m.filter((a) => a.nom === 'Publier').length, 13);
  assert.deepEqual(m.filter((a) => a.nom === 'CreerCollection').map((a) => a.variables.collection.handle), ['skin-obsession', 'coffrets']);
  assert.equal(m.filter((a) => a.nom === 'MajCollection').length, 1);
  const ordre = m.find((a) => a.nom === 'OrdonnerCollection' && a.variables.moves.length === 5);
  assert.deepEqual(ordre.variables.moves.map((x) => x.newPosition), ['0', '1', '2', '3', '4']);
  const majPages = m.filter((a) => a.nom === 'MajPage').map((a) => a.variables.page);
  assert.equal(majPages.filter((p) => p.isPublished === true).length, 7);
  assert.ok(majPages.some((p) => p.templateSuffix === 'contact' && p.isPublished === undefined));
  assert.ok(majPages.some((p) => p.isPublished === false));
  assert.deepEqual(m.filter((a) => a.nom === 'CreerRedirection').map((a) => a.variables.urlRedirect), I.redirections());
  assert.ok(readdirSync(join(dossier, 'journaux')).length === 1);
});

test('limitation de débit : THROTTLED relancé après attente', async () => {
  const s = fauxShopify({ limiterUneFois: true });
  const attentes = [];
  const c = I.creerClient({ boutique: 'test.myshopify.com', jeton: 'x', fetch: s.fetch, attendre: async (ms) => { attentes.push(ms); } });
  const d = await c.gql(I.GQL.BOUTIQUE);
  assert.equal(d.shop.name, 'Librery');
  assert.equal(s.appels.length, 2);
  assert.ok(attentes[0] >= 500);
});

test('client credentials : jeton obtenu puis utilisé, jamais journalisé', async () => {
  const s = fauxShopify();
  const vus = [];
  const f = async (url, init) => {
    if (url.endsWith('/admin/oauth/access_token')) {
      vus.push(new URLSearchParams(init.body).get('grant_type'));
      return { status: 200, ok: true, json: async () => ({ access_token: 'shpat_factice', scope: 'read_products', expires_in: 86399 }), text: async () => '' };
    }
    return s.fetch(url, init);
  };
  const env = { SHOPIFY_FLAG_STORE: 'test.myshopify.com', SHOPIFY_CLIENT_ID: 'id', SHOPIFY_CLIENT_SECRET: 'secret' };
  const r = await I.executer({ argv: ['--essai'], env, fetch: f, log: silence, dossier: dossierTemp(), attendre: sansAttente });
  assert.equal(r.code, 0);
  assert.deepEqual(vus, ['client_credentials']);
  assert.ok(s.appels.every((a) => a.jeton === 'shpat_factice'));
});
