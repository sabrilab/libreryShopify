#!/usr/bin/env node
// Importeur LIBRERY → Shopify (Admin GraphQL API).
//
// Source unique des données : maquette/assets/js/data.js (PRODUCTS, COLLECTIONS, PERFUMERS…).
// Modes :
//   (aucun) | --essai           simulation : construit tout, lit la boutique si possible, n'écrit rien
//   --sauvegarder               export en lecture seule → sauvegardes/<horodatage>.json
//   --appliquer=preparation     étapes invisibles pour les clients (définitions, métaobjets,
//                               nouveaux produits en brouillon, nouvelles pages non publiées)
//   --appliquer=bascule         jour J : produits existants, collections, publication, pages, redirections
// Options : --oui (pas de confirmation), --garder-medias (ne remplace pas les photos des produits existants).
//
// Identifiants : uniquement par variables d'environnement SHOPIFY_FLAG_STORE et SHOPIFY_ADMIN_TOKEN
// (ou SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET pour une application du Dev Dashboard).
// Aucune dépendance : Node ≥ 18 (fetch natif).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

// Dernière version stable de l'API Admin (publiée le 1er octobre 2026, maintenue jusqu'au 16/10/2027).
export const API_VERSION = '2026-10';
export const NS = 'librery';
export const IMG_BASE = 'https://librery-refonte.vercel.app/assets/img/v2/';
export const VENDEUR = 'Librery';
export const NOM_OPTION = 'Format';

const ICI = dirname(fileURLToPath(import.meta.url));
export const DATA_JS = resolve(ICI, '../../maquette/assets/js/data.js');
export const DOSSIER = ICI;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Données de la maquette
// ─────────────────────────────────────────────────────────────────────────────

/** Charge data.js dans un bac à sable vm et renvoie une copie JSON pure des constantes. */
export function chargerDonnees(chemin = DATA_JS) {
  const src = readFileSync(chemin, 'utf8');
  const ctx = vm.createContext({});
  vm.runInContext(
    src + ';this.D={PRODUCTS,PAUSED_PRODUCTS,COLLECTIONS,STORES,FAMILIES,FAMILY_ART,FORMATS,PERFUMERS,SHELF,SERVICES}',
    ctx,
    { filename: chemin },
  );
  return JSON.parse(JSON.stringify(ctx.D));
}

/** Produits importés : ni en pause, ni rattachés à une collection masquée. Ordre de data.js. */
export function produitsImportes(D) {
  const enPause = new Set((D.PAUSED_PRODUCTS || []).map((p) => p.handle));
  return D.PRODUCTS.filter((p) => {
    const c = D.COLLECTIONS[p.collection];
    return !p.paused && !enPause.has(p.handle) && c && !c.hidden;
  });
}

/** Collections importées (hors `hidden: true`), avec leur handle. Ordre de data.js. */
export function collectionsImportees(D) {
  return Object.entries(D.COLLECTIONS)
    .filter(([, c]) => !c.hidden)
    .map(([handle, c]) => ({ handle, ...c }));
}

export function produitsDeCollection(D, handle) {
  return produitsImportes(D).filter((p) => p.collection === handle).map((p) => p.handle);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Outils purs
// ─────────────────────────────────────────────────────────────────────────────

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const prix = (n) => Number(n).toFixed(2);
export const eur = (n) => Number(n).toFixed(2).replace('.', ',') + ' €';

export function slug(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Coupe à la frontière d'un mot, avec « … ». */
export function tronquer(s, max) {
  s = String(s || '').trim();
  if (s.length <= max) return s;
  const coupe = s.slice(0, max - 1);
  const i = coupe.lastIndexOf(' ');
  return (i > max * 0.6 ? coupe.slice(0, i) : coupe).replace(/[\s,;:·—-]+$/, '') + '…';
}

/** « 100ML », « 100 ml », « 8 × 2 ml » → clé comparable. */
export const normaliserFormat = (s) =>
  String(s).normalize('NFKC').toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '');

export function formatsDe(p, D) {
  const liste = p.formats && p.formats.length ? p.formats : D.FORMATS;
  return liste.map((f) => ({ id: String(f.id), label: f.label, price: f.price }));
}

export const sku = (handle, f) => `LIB-${handle}-${f.id}`.toUpperCase();

export function nomsImages(p) {
  const liste = p.gallery && p.gallery.length ? p.gallery : [p.pack || p.card];
  return [...new Set(liste.filter(Boolean))];
}

/** Nom d'image (sans extension ni suffixe _uuid) à partir d'une URL du CDN Shopify. */
export function nomDeFichier(url) {
  if (!url) return null;
  const base = String(url).split('?')[0].split('/').pop() || '';
  return decodeURIComponent(base)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '');
}

export function descriptionHtml(p) {
  const parts = (p.description || []).map((t) => `<p>${esc(t)}</p>`);
  if (p.coda && p.coda.length) parts.push(`<p class="coda">${p.coda.map(esc).join('<br>')}</p>`);
  return parts.join('\n');
}

export function seoProduit(p) {
  return {
    title: tronquer(p.tagline ? `${p.name} — ${p.tagline}` : `${p.name} — LIBRERY`, 70),
    description: tronquer([p.tagline, p.keyNotes && `Notes : ${p.keyNotes}.`].filter(Boolean).join(' '), 320),
  };
}

const lignes = (s) => String(s || '').split(/\s*,\s*/).filter(Boolean).join('\n');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Modèle Shopify : définitions
// ─────────────────────────────────────────────────────────────────────────────

export const DEFS_PRODUIT = [
  { key: 'tagline', name: 'Accroche', type: 'single_line_text_field', pin: true },
  { key: 'key_notes', name: 'Notes clés', type: 'single_line_text_field', pin: true },
  { key: 'families', name: 'Familles olfactives', type: 'list.single_line_text_field', pin: true, description: 'La première est la famille dominante.' },
  { key: 'notes_tete', name: 'Notes de tête', type: 'multi_line_text_field', pin: true },
  { key: 'notes_coeur', name: 'Notes de cœur', type: 'multi_line_text_field', pin: true },
  { key: 'notes_fond', name: 'Notes de fond', type: 'multi_line_text_field', pin: true },
  { key: 'perfumer', name: 'Parfumeur', type: 'metaobject_reference', pin: true, metaobjet: 'parfumeur' },
  { key: 'materials', name: 'Matières (titre, liste, texte)', type: 'json' },
  { key: 'coda', name: 'Coda', type: 'list.single_line_text_field' },
  { key: 'editorial', name: 'Fiche éditoriale complète (data.js)', type: 'json', description: 'Copie intégrale de l’objet produit de data.js.' },
];

export const DEFS_COLLECTION = [
  { key: 'epigraph', name: 'Épigraphe', type: 'multi_line_text_field', pin: true },
  { key: 'chapter', name: 'Chapitre', type: 'single_line_text_field', pin: true },
  { key: 'editorial', name: 'Fiche éditoriale complète (data.js)', type: 'json', description: 'Copie intégrale de l’objet collection de data.js.' },
];

const T = (key, name, type = 'single_line_text_field', required = false) => ({ key, name, type, required });

export const METAOBJETS = {
  parfumeur: {
    name: 'Parfumeur', displayNameKey: 'name',
    fields: [T('name', 'Nom', 'single_line_text_field', true), T('role', 'Rôle'), T('image', 'Image (nom de fichier)'),
      T('works', 'Créations LIBRERY'), T('bio', 'Biographie', 'multi_line_text_field'), T('quote', 'Citation', 'multi_line_text_field')],
  },
  famille: {
    name: 'Famille olfactive', displayNameKey: 'name',
    fields: [T('name', 'Nom', 'single_line_text_field', true), T('description', 'Phrase', 'multi_line_text_field'), T('image', 'Image (nom de fichier)')],
  },
  point_de_vente: {
    name: 'Point de vente', displayNameKey: 'name',
    fields: [T('name', 'Nom', 'single_line_text_field', true), T('address', 'Adresse'), T('city', 'Ville'), T('country', 'Pays'),
      T('phone', 'Téléphone'), T('url', 'Site'), T('lat', 'Latitude', 'number_decimal'), T('lng', 'Longitude', 'number_decimal'),
      T('note', 'Note', 'multi_line_text_field'), T('online', 'En ligne uniquement', 'boolean')],
  },
};

export function entreeDefinitionMetachamp(def, ownerType, idsDefsMetaobjets = {}) {
  const d = {
    namespace: NS, key: def.key, name: def.name, type: def.type, ownerType, pin: !!def.pin,
    access: { storefront: 'PUBLIC_READ' },
  };
  if (def.description) d.description = def.description;
  if (def.metaobjet) {
    const id = idsDefsMetaobjets[def.metaobjet];
    if (!id) throw new ErreurShopify(`Définition de métaobjet « ${def.metaobjet} » introuvable : impossible de créer ${NS}.${def.key}.`);
    d.validations = [{ name: 'metaobject_definition_id', value: id }];
  }
  return d;
}

export function entreeDefinitionMetaobjet(type) {
  const m = METAOBJETS[type];
  return {
    type, name: m.name, displayNameKey: m.displayNameKey,
    access: { storefront: 'PUBLIC_READ' },
    fieldDefinitions: m.fields.map((f) => ({ key: f.key, name: f.name, type: f.type, required: f.required })),
  };
}

/** Entrées de métaobjets : parfumeurs, familles, points de vente. */
export function entreesMetaobjets(D) {
  const champs = (o) => Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => ({ key, value: String(value) }));
  const out = [];
  for (const [handle, p] of Object.entries(D.PERFUMERS || {})) {
    out.push({ type: 'parfumeur', handle, fields: champs({ name: p.name, role: p.role, image: p.image, works: p.works, bio: (p.bio || []).join('\n\n'), quote: p.quote }) });
  }
  for (const [nom, phrase] of Object.entries(D.FAMILIES || {})) {
    out.push({ type: 'famille', handle: slug(nom), fields: champs({ name: nom, description: phrase, image: (D.FAMILY_ART || {})[nom] }) });
  }
  const vus = new Map();
  for (const s of D.STORES || []) {
    let h = slug(s.name);
    const n = (vus.get(h) || 0) + 1; vus.set(h, n);
    if (n > 1) h = `${h}-${n}`;
    out.push({
      type: 'point_de_vente', handle: h,
      fields: champs({ name: s.name, address: s.address, city: s.city, country: s.country, phone: s.phone, url: s.url,
        lat: s.lat, lng: s.lng, note: s.note, online: s.online === undefined ? undefined : String(!!s.online) }),
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Produits, collections, pages, redirections
// ─────────────────────────────────────────────────────────────────────────────

/** Métachamps d'un produit. `idsParfumeurs` : handle → gid du métaobjet (sinon valeur provisoire). */
export function metachampsProduit(p, { idsParfumeurs = {} } = {}) {
  const mf = [];
  const ajoute = (key, type, value) => { if (value !== undefined && value !== null && value !== '') mf.push({ namespace: NS, key, type, value }); };
  const notes = (p.materials && p.materials.list) || p.notes || {};
  ajoute('tagline', 'single_line_text_field', p.tagline);
  ajoute('key_notes', 'single_line_text_field', p.keyNotes);
  if (p.families && p.families.length) ajoute('families', 'list.single_line_text_field', JSON.stringify(p.families));
  ajoute('notes_tete', 'multi_line_text_field', lignes(notes.tete));
  ajoute('notes_coeur', 'multi_line_text_field', lignes(notes.coeur));
  ajoute('notes_fond', 'multi_line_text_field', lignes(notes.fond));
  if (p.perfumer) ajoute('perfumer', 'metaobject_reference', idsParfumeurs[p.perfumer] || `<parfumeur:${p.perfumer}>`);
  if (p.materials) ajoute('materials', 'json', JSON.stringify(p.materials));
  if (p.coda && p.coda.length) ajoute('coda', 'list.single_line_text_field', JSON.stringify(p.coda));
  ajoute('editorial', 'json', JSON.stringify(p));
  return mf;
}

export function metachampsCollection(c) {
  const { handle, ...objet } = c;
  const mf = [];
  if (c.epigraph) mf.push({ namespace: NS, key: 'epigraph', type: 'multi_line_text_field', value: c.epigraph });
  if (c.chapter) mf.push({ namespace: NS, key: 'chapter', type: 'single_line_text_field', value: c.chapter });
  mf.push({ namespace: NS, key: 'editorial', type: 'json', value: JSON.stringify(objet) });
  return mf;
}

/**
 * Apparie les variantes existantes (« 100ML », « 2ML ») aux formats de data.js (« 100 ml », « 2 ml »).
 * Renvoie { optionId, parFormat: Map(idFormat → {variantId, valueId, ancien}), orphelines: [variantes sans format] }.
 */
export function apparierVariantes(existant, formats) {
  const options = existant.options || [];
  if (options.length > 1) {
    throw new ErreurShopify(`Le produit « ${existant.handle} » a ${options.length} options ; l'import n'en gère qu'une (« ${NOM_OPTION} »).`);
  }
  const option = options[0] || null;
  const valeurs = new Map((option?.optionValues || []).map((v) => [normaliserFormat(v.name), v]));
  const variantes = existant.variants || [];
  const parFormat = new Map();
  const prises = new Set();
  for (const f of formats) {
    const cle = normaliserFormat(f.label);
    const v = variantes.find((x) => !prises.has(x.id) && normaliserFormat(x.selectedOptions?.[0]?.value ?? x.title) === cle);
    if (v) {
      prises.add(v.id);
      parFormat.set(f.id, { variantId: v.id, valueId: valeurs.get(cle)?.id || null, ancien: v.selectedOptions?.[0]?.value ?? v.title, prix: v.price, sku: v.sku });
    }
  }
  const orphelines = variantes.filter((v) => !prises.has(v.id));
  return { optionId: option?.id || null, parFormat, orphelines };
}

export function fichiersProduit(p, existant = null) {
  const deja = new Map();
  for (const m of existant?.media || []) {
    const n = nomDeFichier(m.url);
    if (n && !deja.has(n)) deja.set(n, m.id);
  }
  return nomsImages(p).map((n) => (deja.has(n)
    ? { id: deja.get(n) }
    : { originalSource: `${IMG_BASE}${n}.webp`, alt: p.name, contentType: 'IMAGE', filename: `${n}.webp` }));
}

/**
 * Entrée productSet. `existant` : fiche lue dans la boutique (ou null pour une création).
 * Les variantes existantes gardent leur ID ; les nouvelles sont suivies en stock et refusées en rupture.
 */
export function construireProduit(p, D, { existant = null, statut = 'DRAFT', garderMedias = false } = {}) {
  const formats = formatsDe(p, D);
  const app = existant ? apparierVariantes(existant, formats) : null;
  const input = {
    title: p.name,
    descriptionHtml: descriptionHtml(p),
    vendor: VENDEUR,
    productType: p.type || 'Parfum',
    status: statut,
    seo: seoProduit(p),
    productOptions: [{
      ...(app?.optionId ? { id: app.optionId } : {}),
      name: NOM_OPTION,
      position: 1,
      values: formats.map((f) => {
        const m = app?.parFormat.get(f.id);
        return m?.valueId ? { id: m.valueId, name: f.label } : { name: f.label };
      }),
    }],
    variants: formats.map((f, i) => {
      const m = app?.parFormat.get(f.id);
      const v = { optionValues: [{ optionName: NOM_OPTION, name: f.label }], price: prix(f.price), sku: sku(p.handle, f), position: i + 1, taxable: true };
      if (m) v.id = m.variantId;
      else { v.inventoryPolicy = 'DENY'; v.inventoryItem = { tracked: true, requiresShipping: true }; }
      return v;
    }),
  };
  if (!existant) input.handle = p.handle;
  if (!(existant && garderMedias)) input.files = fichiersProduit(p, existant);
  return {
    handle: p.handle,
    input,
    identifier: existant ? { id: existant.id } : null,
    formats,
    appariement: app,
    orphelines: app?.orphelines || [],
  };
}

export function construireCollection(c) {
  return {
    title: c.title,
    handle: c.handle,
    descriptionHtml: (c.intro || []).map((t) => `<p>${esc(t)}</p>`).join('\n'),
    sortOrder: 'MANUAL',
    seo: { title: tronquer(`${c.title} — LIBRERY`, 70), description: tronquer(c.epigraph || '', 320) },
  };
}

export const PAGES_NOUVELLES = [
  { handle: 'bibliotheque', title: 'La Bibliothèque' },
  { handle: 'preface', title: 'La Préface' },
  { handle: 'lexique', title: 'Le Lexique' },
  { handle: 'points-de-vente', title: 'Points de vente' },
  { handle: 'portrait-olfactif', title: 'Portrait olfactif' },
  { handle: 'offrir', title: 'Offrir' },
  { handle: 'services', title: 'Services' },
];
export const PAGE_CONTACT = 'contact';
export const PAGE_ANCIENS_PDV = 'nos-points-de-vente';

export function entreePageNouvelle(pg) {
  return { title: pg.title, handle: pg.handle, body: '', isPublished: false, templateSuffix: pg.handle };
}

/** Redirections : ancienne page points de vente + adresses de la maquette déjà partagées. */
export function redirections() {
  const maquette = ['bibliotheque', 'preface', 'lexique', 'points-de-vente', 'portrait-olfactif', 'offrir', 'services', 'contact'];
  return [
    { path: `/pages/${PAGE_ANCIENS_PDV}`, target: '/pages/points-de-vente' },
    ...maquette.map((h) => ({ path: `/${h}`, target: `/pages/${h}` })),
  ];
}

export function redirectionsCsv() {
  return ['Redirect from,Redirect to', ...redirections().map((r) => `${r.path},${r.target}`)].join('\n') + '\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Requêtes GraphQL (validées contre le schéma Admin 2026-10)
// ─────────────────────────────────────────────────────────────────────────────

const UE = 'userErrors { field message code }';
const UE_SIMPLE = 'userErrors { field message }';

const FICHE = `fragment Fiche on Product {
  id handle title status descriptionHtml vendor productType tags templateSuffix
  seo { title description }
  options { id name position optionValues { id name } }
  variants(first: 20) { nodes { id title sku price position inventoryPolicy selectedOptions { name value } inventoryItem { id tracked } } }
  media(first: 30) { nodes { id alt mediaContentType ... on MediaImage { image { url } } } }
  collections(first: 10) { nodes { id handle } }
  metafields(first: 30, namespace: "${NS}") { nodes { namespace key type value } }
}`;

const FICHE_COMPLETE = `fragment FicheComplete on Product {
  id handle title status descriptionHtml vendor productType tags templateSuffix createdAt updatedAt publishedAt onlineStoreUrl
  seo { title description }
  options { id name position optionValues { id name } }
  variants(first: 20) { nodes { id title sku price compareAtPrice position inventoryPolicy inventoryQuantity taxable selectedOptions { name value } inventoryItem { id tracked } } }
  media(first: 30) { nodes { id alt mediaContentType ... on MediaImage { image { url width height } } } }
  collections(first: 10) { nodes { id handle } }
  metafields(first: 40) { nodes { namespace key type value } }
}`;

export const GQL = {
  BOUTIQUE: `query Boutique {
  shop { name myshopifyDomain currencyCode taxesIncluded }
  publications(first: 50) { nodes { id catalog { title } } }
}`,
  PRODUIT: `query Produit($handle: String!) {
  productByIdentifier(identifier: { handle: $handle }) { ...Fiche }
}
${FICHE}`,
  COLLECTION: `query Collection($handle: String!) {
  collectionByIdentifier(identifier: { handle: $handle }) {
    id handle title descriptionHtml sortOrder templateSuffix
    seo { title description }
    ruleSet { appliedDisjunctively }
    products(first: 100) { nodes { id handle } }
    metafields(first: 20, namespace: "${NS}") { nodes { key type value } }
  }
}`,
  PAGES: `query Pages {
  pages(first: 100) { nodes { id handle title isPublished templateSuffix } }
}`,
  DEFS_METACHAMPS: `query DefinitionsMetachamps($ownerType: MetafieldOwnerType!) {
  metafieldDefinitions(ownerType: $ownerType, namespace: "${NS}", first: 50) { nodes { id key name type { name } } }
}`,
  DEF_METAOBJET: `query DefinitionMetaobjet($type: String!) {
  metaobjectDefinitionByType(type: $type) { id type name fieldDefinitions { key type { name } } }
}`,
  METAOBJETS: `query Metaobjets($type: String!) {
  metaobjects(type: $type, first: 100) { nodes { id handle fields { key value } } }
}`,
  REDIRECTIONS: `query Redirections($after: String) {
  urlRedirects(first: 250, after: $after) { nodes { id path target } pageInfo { hasNextPage endCursor } }
}`,
  TACHE: `query Tache($id: ID!) {
  job(id: $id) { id done }
}`,
  SAUV_PRODUITS: `query SauvegardeProduits($after: String) {
  products(first: 5, after: $after) { nodes { ...FicheComplete } pageInfo { hasNextPage endCursor } }
}
${FICHE_COMPLETE}`,
  SAUV_COLLECTIONS: `query SauvegardeCollections($after: String) {
  collections(first: 10, after: $after) {
    nodes {
      id handle title descriptionHtml sortOrder templateSuffix updatedAt
      seo { title description }
      image { url altText }
      ruleSet { appliedDisjunctively rules { column relation condition } }
      products(first: 50) { nodes { id handle } }
      metafields(first: 20) { nodes { namespace key type value } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`,
  SAUV_PAGES: `query SauvegardePages($after: String) {
  pages(first: 50, after: $after) { nodes { id handle title body isPublished publishedAt templateSuffix } pageInfo { hasNextPage endCursor } }
}`,
  SAUV_DEFS_METAOBJETS: `query SauvegardeDefinitionsMetaobjets {
  metaobjectDefinitions(first: 50) { nodes { id type name fieldDefinitions { key type { name } } } }
}`,

  // ── Écritures ──
  CREER_DEF_METAOBJET: `mutation CreerDefinitionMetaobjet($definition: MetaobjectDefinitionCreateInput!) {
  metaobjectDefinitionCreate(definition: $definition) { metaobjectDefinition { id type } ${UE} }
}`,
  UPSERT_METAOBJET: `mutation UpsertMetaobjet($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
  metaobjectUpsert(handle: $handle, metaobject: $metaobject) { metaobject { id handle } ${UE} }
}`,
  CREER_DEF_METACHAMP: `mutation CreerDefinitionMetachamp($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) { createdDefinition { id key } ${UE} }
}`,
  PRODUIT_SET: `mutation EnregistrerProduit($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
  productSet(input: $input, identifier: $identifier, synchronous: true) {
    product { id handle status variants(first: 20) { nodes { id sku price selectedOptions { name value } } } }
    ${UE}
  }
}`,
  METACHAMPS_SET: `mutation EcrireMetachamps($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) { metafields { id namespace key } ${UE} }
}`,
  PUBLIER: `mutation Publier($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) { ${UE_SIMPLE} }
}`,
  CREER_COLLECTION: `mutation CreerCollection($collection: CollectionCreateInput!) {
  collectionCreate(collection: $collection) { collection { id handle } ${UE_SIMPLE} }
}`,
  MAJ_COLLECTION: `mutation MajCollection($collection: CollectionUpdateInput!) {
  collectionUpdate(collection: $collection) { collection { id handle } ${UE_SIMPLE} }
}`,
  REJOINDRE_COLLECTION: `mutation RejoindreCollection($product: ProductUpdateInput!) {
  productUpdate(product: $product) { product { id } ${UE_SIMPLE} }
}`,
  ORDONNER_COLLECTION: `mutation OrdonnerCollection($id: ID!, $moves: [MoveInput!]!) {
  collectionReorderProducts(id: $id, moves: $moves) { job { id done } ${UE} }
}`,
  CREER_PAGE: `mutation CreerPage($page: PageCreateInput!) {
  pageCreate(page: $page) { page { id handle isPublished templateSuffix } ${UE} }
}`,
  MAJ_PAGE: `mutation MajPage($id: ID!, $page: PageUpdateInput!) {
  pageUpdate(id: $id, page: $page) { page { id handle isPublished templateSuffix } ${UE} }
}`,
  CREER_REDIRECTION: `mutation CreerRedirection($urlRedirect: UrlRedirectInput!) {
  urlRedirectCreate(urlRedirect: $urlRedirect) { urlRedirect { id path target } ${UE} }
}`,
  MAJ_REDIRECTION: `mutation MajRedirection($id: ID!, $urlRedirect: UrlRedirectInput!) {
  urlRedirectUpdate(id: $id, urlRedirect: $urlRedirect) { urlRedirect { id path target } ${UE} }
}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Client GraphQL (limitation de débit, erreurs, journal)
// ─────────────────────────────────────────────────────────────────────────────

export class ErreurShopify extends Error {
  constructor(message, details) { super(message); this.name = 'ErreurShopify'; this.details = details; }
}

export const nomOperation = (q) => (String(q).match(/^\s*(query|mutation)\s+(\w+)/) || [])[2] || null;

export function creerJournal(mode, boutique) {
  const donnees = { mode, apiVersion: API_VERSION, boutique, debut: new Date().toISOString(), fin: null, statut: 'en cours', operations: [] };
  return {
    donnees,
    ajouter(op) { donnees.operations.push({ t: new Date().toISOString(), ...op }); },
  };
}

export function creerClient({
  boutique, jeton, fetch: f = globalThis.fetch, lectureSeule = true, journal = null,
  attendre = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  const url = `https://${boutique}/admin/api/${API_VERSION}/graphql.json`;
  const compteur = { requetes: 0, mutations: 0 };

  async function temporiser(cost) {
    const t = cost?.throttleStatus;
    if (!t || !t.restoreRate) return;
    const besoin = Math.max(cost.requestedQueryCost || 0, 100);
    if (t.currentlyAvailable < besoin) await attendre(Math.ceil(((besoin - t.currentlyAvailable) / t.restoreRate) * 1000));
  }

  async function gql(query, variables = {}) {
    const nom = nomOperation(query) || 'requête';
    const estMutation = /^\s*mutation\b/.test(query);
    if (estMutation && lectureSeule) throw new ErreurShopify(`Écriture « ${nom} » refusée : ce mode est en lecture seule.`);
    for (let essai = 0; ; essai++) {
      let rep;
      try {
        rep = await f(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': jeton },
          body: JSON.stringify({ query, variables }),
        });
      } catch (e) {
        if (essai < 4) { await attendre(1000 * 2 ** essai); continue; }
        throw new ErreurShopify(`Boutique injoignable (${nom}) : ${e.message}`);
      }
      if (rep.status === 429 || rep.status >= 500) {
        if (essai < 6) {
          const ra = Number(rep.headers?.get?.('Retry-After'));
          await attendre((ra > 0 ? ra : 2 ** essai) * 1000);
          continue;
        }
        throw new ErreurShopify(`Shopify indisponible (HTTP ${rep.status}) sur « ${nom} » après ${essai + 1} essais.`);
      }
      if (rep.status === 401 || rep.status === 403) {
        throw new ErreurShopify(`Accès refusé (HTTP ${rep.status}) sur « ${nom} » : vérifiez SHOPIFY_ADMIN_TOKEN et les autorisations de l'application.`);
      }
      if (!rep.ok) {
        const texte = await rep.text().catch(() => '');
        throw new ErreurShopify(`Réponse HTTP ${rep.status} sur « ${nom} » : ${texte.slice(0, 300)}`);
      }
      const corps = await rep.json();
      const erreurs = corps.errors || [];
      if (erreurs.some((e) => e.extensions?.code === 'THROTTLED')) {
        if (essai < 8) {
          const t = corps.extensions?.cost?.throttleStatus;
          const besoin = corps.extensions?.cost?.requestedQueryCost || 100;
          const ms = t?.restoreRate ? ((besoin - t.currentlyAvailable) / t.restoreRate) * 1000 : 0;
          await attendre(Math.max(ms, 1000 * 2 ** Math.min(essai, 4)));
          continue;
        }
        throw new ErreurShopify(`Limite de débit Shopify toujours atteinte sur « ${nom} ».`);
      }
      if (erreurs.length) {
        const message = erreurs.map((e) => e.message).join(' ; ');
        const acces = erreurs.some((e) => e.extensions?.code === 'ACCESS_DENIED');
        throw new ErreurShopify(`Erreur GraphQL sur « ${nom} » : ${message}${acces ? ' (autorisation manquante dans l’application personnalisée ?)' : ''}`, erreurs);
      }
      compteur.requetes++;
      if (estMutation) compteur.mutations++;
      await temporiser(corps.extensions?.cost);
      return corps.data;
    }
  }

  /** Exécute une mutation, journalise, et s'arrête sur le moindre userError. */
  async function muter(champ, query, variables, contexte = '') {
    const data = await gql(query, variables);
    const charge = data?.[champ] || {};
    const erreurs = charge.userErrors || [];
    journal?.ajouter({ mutation: champ, contexte, variables, resultat: charge, userErrors: erreurs });
    if (erreurs.length) {
      const detail = erreurs.map((e) => `${(e.field || []).join('.') || '—'} : ${e.message}${e.code ? ` [${e.code}]` : ''}`).join(' ; ');
      throw new ErreurShopify(`Shopify a refusé « ${champ} »${contexte ? ` (${contexte})` : ''} : ${detail}. Import arrêté ; rien d’autre n’a été écrit après cette étape.`, erreurs);
    }
    return charge;
  }

  return { gql, muter, compteur, url };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Lecture de la boutique
// ─────────────────────────────────────────────────────────────────────────────

const aplatirProduit = (p) => p && ({
  ...p,
  variants: p.variants?.nodes || [],
  media: (p.media?.nodes || []).map((m) => ({ id: m.id, alt: m.alt, type: m.mediaContentType, url: m.image?.url || null })),
  collections: p.collections?.nodes || [],
  metafields: p.metafields?.nodes || [],
});

export function trouverBoutiqueEnLigne(publications) {
  return (publications || []).find((p) => /^(online store|boutique en ligne)$/i.test(p.catalog?.title || '')) || null;
}

async function paginer(client, query, chemin) {
  const out = [];
  let after = null;
  for (;;) {
    const data = await client.gql(query, { after });
    const conn = chemin(data);
    out.push(...(conn?.nodes || []));
    if (!conn?.pageInfo?.hasNextPage) return out;
    after = conn.pageInfo.endCursor;
  }
}

export async function lireBoutique(client, D) {
  const b = await client.gql(GQL.BOUTIQUE);
  const etat = {
    shop: b.shop,
    boutiqueEnLigne: trouverBoutiqueEnLigne(b.publications?.nodes),
    produits: new Map(), collections: new Map(), pages: new Map(),
    defsProduit: new Map(), defsCollection: new Map(),
    defsMetaobjets: new Map(), metaobjets: new Map(), redirections: new Map(),
  };
  for (const p of produitsImportes(D)) {
    const r = await client.gql(GQL.PRODUIT, { handle: p.handle });
    etat.produits.set(p.handle, aplatirProduit(r.productByIdentifier) || null);
  }
  for (const c of collectionsImportees(D)) {
    const r = await client.gql(GQL.COLLECTION, { handle: c.handle });
    const col = r.collectionByIdentifier;
    etat.collections.set(c.handle, col ? { ...col, products: col.products?.nodes || [], metafields: col.metafields?.nodes || [] } : null);
  }
  const pg = await client.gql(GQL.PAGES);
  for (const p of pg.pages?.nodes || []) etat.pages.set(p.handle, p);
  for (const [owner, cible] of [['PRODUCT', etat.defsProduit], ['COLLECTION', etat.defsCollection]]) {
    const r = await client.gql(GQL.DEFS_METACHAMPS, { ownerType: owner });
    for (const d of r.metafieldDefinitions?.nodes || []) cible.set(d.key, d);
  }
  for (const type of Object.keys(METAOBJETS)) {
    const r = await client.gql(GQL.DEF_METAOBJET, { type });
    const def = r.metaobjectDefinitionByType || null;
    etat.defsMetaobjets.set(type, def);
    const entrees = new Map();
    if (def) {
      const m = await client.gql(GQL.METAOBJETS, { type });
      for (const o of m.metaobjects?.nodes || []) entrees.set(o.handle, o);
    }
    etat.metaobjets.set(type, entrees);
  }
  for (const r of await paginer(client, GQL.REDIRECTIONS, (d) => d.urlRedirects)) etat.redirections.set(r.path, r);
  return etat;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Plan (diff création / mise à jour / inchangé)
// ─────────────────────────────────────────────────────────────────────────────

const egalHtml = (a, b) => String(a || '').replace(/\s+/g, '') === String(b || '').replace(/\s+/g, '');

export function diffProduit(p, D, existant, { garderMedias = false } = {}) {
  const c = construireProduit(p, D, { existant, statut: existant ? 'ACTIVE' : 'DRAFT', garderMedias });
  const resume = c.formats.map((f) => `${f.label} ${eur(f.price)}`).join(' · ');
  if (!existant) return { action: 'création', etape: 'preparation', details: [`brouillon — ${resume}`, `${nomsImages(p).length} image(s)`], construit: c };
  const d = [];
  if (existant.title !== p.name) d.push(`titre « ${existant.title} » → « ${p.name} »`);
  if (!egalHtml(existant.descriptionHtml, c.input.descriptionHtml)) d.push('description réécrite');
  if (existant.seo?.title !== c.input.seo.title || existant.seo?.description !== c.input.seo.description) d.push('SEO');
  for (const f of c.formats) {
    const m = c.appariement.parFormat.get(f.id);
    if (!m) { d.push(`+ variante « ${f.label} » ${eur(f.price)}`); continue; }
    if (m.ancien !== f.label) d.push(`option « ${m.ancien} » → « ${f.label} »`);
    if (Number(m.prix) !== Number(f.price)) d.push(`${f.label} : ${eur(m.prix)} → ${eur(f.price)}`);
    if ((m.sku || '') !== sku(p.handle, f)) d.push(`${f.label} : SKU « ${m.sku || ''} » → ${sku(p.handle, f)}`);
  }
  for (const o of c.orphelines) d.push(`⚠ variante « ${o.title} » supprimée (aucun format correspondant)`);
  if (c.input.files) {
    const voulus = nomsImages(p).join(',');
    const actuels = existant.media.map((m) => nomDeFichier(m.url)).join(',');
    if (voulus !== actuels) d.push(`photos : ${existant.media.length} → ${nomsImages(p).length} (les anciennes sont retirées du produit)`);
  }
  if (existant.status !== 'ACTIVE') d.push(`statut ${existant.status} → ACTIVE`);
  const attendus = metachampsProduit(p);
  const actuels = new Map(existant.metafields.map((m) => [m.key, m.value]));
  const mfDiff = attendus.filter((m) => m.key !== 'perfumer' ? actuels.get(m.key) !== m.value : !actuels.has('perfumer'));
  if (mfDiff.length) d.push(`métachamps : ${mfDiff.map((m) => m.key).join(', ')}`);
  const etape = existant.status === 'DRAFT' ? 'preparation' : 'bascule';
  return { action: d.length ? 'mise à jour' : 'inchangé', etape, details: d, construit: c };
}

export function calculerPlan(D, etat = null, options = {}) {
  const plan = [];
  const ajoute = (etape, categorie, cible, action, details = []) => plan.push({ etape, categorie, cible, action, details });
  const lu = !!etat;

  for (const type of Object.keys(METAOBJETS)) {
    const def = etat?.defsMetaobjets.get(type);
    ajoute('preparation', 'Définition de métaobjet', type, !lu ? 'à créer si absente' : def ? 'inchangé' : 'création',
      [METAOBJETS[type].fields.map((f) => f.key).join(', ')]);
  }
  for (const e of entreesMetaobjets(D)) {
    const ex = etat?.metaobjets.get(e.type)?.get(e.handle);
    let action = 'à créer ou mettre à jour';
    if (lu) {
      if (!ex) action = 'création';
      else {
        const v = new Map(ex.fields.map((f) => [f.key, f.value]));
        action = e.fields.every((f) => v.get(f.key) === f.value || (f.key.match(/^(lat|lng)$/) && Number(v.get(f.key)) === Number(f.value))) ? 'inchangé' : 'mise à jour';
      }
    }
    ajoute('preparation', 'Métaobjet', `${e.type}/${e.handle}`, action);
  }
  for (const [owner, defs, cible] of [['produit', DEFS_PRODUIT, etat?.defsProduit], ['collection', DEFS_COLLECTION, etat?.defsCollection]]) {
    for (const d of defs) {
      const ex = cible?.get(d.key);
      const details = [d.type + (d.pin ? ', épinglé' : '')];
      if (ex && ex.type?.name !== d.type) details.push(`⚠ type existant ${ex.type?.name} différent`);
      ajoute('preparation', `Définition de métachamp (${owner})`, `${NS}.${d.key}`, !lu ? 'à créer si absente' : ex ? 'inchangé' : 'création', details);
    }
  }
  for (const p of produitsImportes(D)) {
    if (!lu) {
      const c = construireProduit(p, D);
      ajoute('preparation ou bascule', 'Produit', p.handle, 'création ou mise à jour', [
        c.formats.map((f) => `${f.label} ${eur(f.price)} [${sku(p.handle, f)}]`).join(' · '),
        `${nomsImages(p).length} image(s), ${metachampsProduit(p).length} métachamps`,
      ]);
      continue;
    }
    const r = diffProduit(p, D, etat.produits.get(p.handle), options);
    ajoute(r.etape, 'Produit', p.handle, r.action, r.details);
    if (r.action !== 'création') ajoute('preparation', 'Métachamps produit (invisibles)', p.handle, r.details.some((x) => x.startsWith('métachamps')) ? 'mise à jour' : 'inchangé');
  }
  ajoute('bascule', 'Publication', 'boutique en ligne', 'publier', [`${produitsImportes(D).length} produits et ${collectionsImportees(D).length} collections`,
    ...(lu && !etat.boutiqueEnLigne ? ['⚠ publication « Online Store » introuvable'] : [])]);
  for (const c of collectionsImportees(D)) {
    const ex = etat?.collections.get(c.handle);
    const voulus = produitsDeCollection(D, c.handle);
    const details = [`${voulus.join(', ')}`];
    let action = !lu ? 'création ou mise à jour' : ex ? 'mise à jour' : 'création';
    if (ex) {
      if (ex.ruleSet) details.push('⚠ collection automatique : impossible d’y placer les produits à la main');
      const actuels = ex.products.map((x) => x.handle).filter((h) => voulus.includes(h));
      if (actuels.join(',') === voulus.join(',') && ex.title === c.title && egalHtml(ex.descriptionHtml, construireCollection(c).descriptionHtml) && ex.sortOrder === 'MANUAL') action = 'inchangé';
    }
    ajoute('bascule', 'Collection', c.handle, action, details);
  }
  for (const pg of PAGES_NOUVELLES) {
    const ex = etat?.pages.get(pg.handle);
    ajoute('preparation', 'Page', pg.handle, !lu ? 'création (non publiée)' : ex ? (ex.templateSuffix === pg.handle ? 'inchangé' : 'mise à jour (gabarit)') : 'création (non publiée)', [`gabarit page.${pg.handle}`]);
    ajoute('bascule', 'Page', pg.handle, lu && ex?.isPublished ? 'inchangé' : 'publication');
  }
  const contact = etat?.pages.get(PAGE_CONTACT);
  ajoute('bascule', 'Page', PAGE_CONTACT, lu && !contact ? '⚠ introuvable' : lu && contact.templateSuffix === 'contact' ? 'inchangé' : 'mise à jour (gabarit page.contact)');
  const pdv = etat?.pages.get(PAGE_ANCIENS_PDV);
  ajoute('bascule', 'Page', PAGE_ANCIENS_PDV, lu && !pdv ? 'absente (rien à faire)' : lu && !pdv.isPublished ? 'inchangé' : 'dépublication');
  for (const r of redirections()) {
    const ex = etat?.redirections.get(r.path);
    ajoute('bascule', 'Redirection', `${r.path} → ${r.target}`, !lu ? 'création' : !ex ? 'création' : ex.target === r.target ? 'inchangé' : `mise à jour (cible actuelle ${ex.target})`);
  }
  return plan;
}

export function formaterPlan(plan, { filtre = null } = {}) {
  const signe = (a) => (/^à |ou /.test(a) ? '?' : a.startsWith('création') ? '+' : a === 'inchangé' ? '=' : a.startsWith('⚠') ? '!' : '~');
  const out = [];
  let categorie = null;
  for (const l of plan.filter((x) => !filtre || x.etape.includes(filtre))) {
    if (l.categorie !== categorie) { categorie = l.categorie; out.push(`\n  ${categorie}`); }
    out.push(`    ${signe(l.action)} [${l.etape}] ${l.cible} — ${l.action}${l.details.length ? `\n        ${l.details.join('\n        ')}` : ''}`);
  }
  const compte = (a) => plan.filter((x) => (!filtre || x.etape.includes(filtre)) && signe(x.action) === a).length;
  out.push(`\n  Bilan : ${compte('+')} création(s), ${compte('~')} mise(s) à jour, ${compte('=')} inchangé(s), ${compte('!')} alerte(s)`
    + `${compte('?') ? `, ${compte('?')} à déterminer (boutique non lue)` : ''}.`);
  return out.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Écritures
// ─────────────────────────────────────────────────────────────────────────────

async function assurerDefinitions(client, D, etat, log) {
  const ids = {};
  for (const type of Object.keys(METAOBJETS)) {
    let def = etat.defsMetaobjets.get(type);
    if (!def) {
      const r = await client.muter('metaobjectDefinitionCreate', GQL.CREER_DEF_METAOBJET, { definition: entreeDefinitionMetaobjet(type) }, type);
      def = { id: r.metaobjectDefinition.id, type, fieldDefinitions: [] };
      etat.defsMetaobjets.set(type, def);
      etat.metaobjets.set(type, new Map());
      log(`  + définition de métaobjet ${type}`);
    } else {
      const manquants = METAOBJETS[type].fields.map((f) => f.key).filter((k) => !(def.fieldDefinitions || []).some((x) => x.key === k));
      if (manquants.length) log(`  ! définition ${type} existante sans les champs : ${manquants.join(', ')} (à compléter dans l’admin)`);
    }
    ids[type] = def.id;
  }
  for (const [owner, defs, cible] of [['PRODUCT', DEFS_PRODUIT, etat.defsProduit], ['COLLECTION', DEFS_COLLECTION, etat.defsCollection]]) {
    for (const d of defs) {
      if (cible.has(d.key)) continue;
      const r = await client.muter('metafieldDefinitionCreate', GQL.CREER_DEF_METACHAMP, { definition: entreeDefinitionMetachamp(d, owner, ids) }, `${owner} ${NS}.${d.key}`);
      cible.set(d.key, { id: r.createdDefinition?.id, key: d.key, type: { name: d.type } });
      log(`  + définition de métachamp ${owner.toLowerCase()} ${NS}.${d.key}`);
    }
  }
  return ids;
}

async function assurerMetaobjets(client, D, etat, log) {
  const idsParfumeurs = {};
  for (const e of entreesMetaobjets(D)) {
    const ex = etat.metaobjets.get(e.type)?.get(e.handle);
    const v = new Map((ex?.fields || []).map((f) => [f.key, f.value]));
    const identique = ex && e.fields.every((f) => v.get(f.key) === f.value || (/^(lat|lng)$/.test(f.key) && Number(v.get(f.key)) === Number(f.value)));
    let id = ex?.id;
    if (!identique) {
      const r = await client.muter('metaobjectUpsert', GQL.UPSERT_METAOBJET,
        { handle: { type: e.type, handle: e.handle }, metaobject: { fields: e.fields } }, `${e.type}/${e.handle}`);
      id = r.metaobject.id;
      log(`  ${ex ? '~' : '+'} métaobjet ${e.type}/${e.handle}`);
    }
    if (e.type === 'parfumeur') idsParfumeurs[e.handle] = id;
  }
  return idsParfumeurs;
}

async function ecrireMetachamps(client, ownerId, metachamps, contexte) {
  const restants = metachamps.filter((m) => !String(m.value).startsWith('<'));
  if (restants.length !== metachamps.length) throw new ErreurShopify(`Référence de parfumeur non résolue pour ${contexte}.`);
  for (let i = 0; i < restants.length; i += 25) {
    await client.muter('metafieldsSet', GQL.METACHAMPS_SET, { metafields: restants.slice(i, i + 25).map((m) => ({ ownerId, ...m })) }, contexte);
  }
}

async function enregistrerProduit(client, p, D, etat, { statut, garderMedias, idsParfumeurs, journal, log }) {
  const existant = etat.produits.get(p.handle) || null;
  const c = construireProduit(p, D, { existant, statut, garderMedias });
  for (const o of c.orphelines) log(`  ! ${p.handle} : la variante « ${o.title} » sera supprimée (aucun format correspondant).`);
  const vars = { input: c.input };
  if (c.identifier) vars.identifier = c.identifier;
  const r = await client.muter('productSet', GQL.PRODUIT_SET, vars, p.handle);
  const id = r.product.id;
  journal?.ajouter({ action: existant ? 'produit mis à jour' : 'produit créé', handle: p.handle, id, statut: r.product.status });
  log(`  ${existant ? '~' : '+'} produit ${p.handle} (${r.product.status})`);
  await ecrireMetachamps(client, id, metachampsProduit(p, { idsParfumeurs }), p.handle);
  const frais = await client.gql(GQL.PRODUIT, { handle: p.handle });
  etat.produits.set(p.handle, aplatirProduit(frais.productByIdentifier) || { ...existant, id });
  return id;
}

async function attendreTache(client, job, attendre) {
  if (!job || job.done) return;
  for (let i = 0; i < 20; i++) {
    await attendre(1000);
    const r = await client.gql(GQL.TACHE, { id: job.id });
    if (r.job?.done) return;
  }
}

export async function appliquerPreparation(client, D, etat, { log = console.log, journal = null, garderMedias = false } = {}) {
  log('\n▸ Définitions');
  await assurerDefinitions(client, D, etat, log);
  log('\n▸ Métaobjets (parfumeurs, familles, points de vente)');
  const idsParfumeurs = await assurerMetaobjets(client, D, etat, log);
  log('\n▸ Produits (nouveaux en brouillon ; métachamps invisibles sur les existants)');
  for (const p of produitsImportes(D)) {
    const ex = etat.produits.get(p.handle);
    if (!ex || ex.status === 'DRAFT') {
      await enregistrerProduit(client, p, D, etat, { statut: 'DRAFT', garderMedias, idsParfumeurs, journal, log });
    } else {
      // Produit en vente : seuls les métachamps (lus par le nouveau thème uniquement) sont posés.
      await ecrireMetachamps(client, ex.id, metachampsProduit(p, { idsParfumeurs }), p.handle);
      log(`  ~ métachamps de ${p.handle} (produit en vente inchangé)`);
    }
  }
  log('\n▸ Pages (non publiées)');
  for (const pg of PAGES_NOUVELLES) {
    const ex = etat.pages.get(pg.handle);
    if (!ex) {
      const r = await client.muter('pageCreate', GQL.CREER_PAGE, { page: entreePageNouvelle(pg) }, pg.handle);
      etat.pages.set(pg.handle, r.page);
      journal?.ajouter({ action: 'page créée', handle: pg.handle, id: r.page.id });
      log(`  + page ${pg.handle} (non publiée, gabarit page.${pg.handle})`);
    } else if (ex.templateSuffix !== pg.handle) {
      const r = await client.muter('pageUpdate', GQL.MAJ_PAGE, { id: ex.id, page: { templateSuffix: pg.handle } }, pg.handle);
      etat.pages.set(pg.handle, r.page);
      log(`  ~ page ${pg.handle} : gabarit page.${pg.handle}`);
    }
  }
  return { idsParfumeurs };
}

export async function appliquerBascule(client, D, etat, { log = console.log, journal = null, garderMedias = false, attendre } = {}) {
  const enLigne = etat.boutiqueEnLigne;
  if (!enLigne) throw new ErreurShopify('Publication « Online Store » introuvable : vérifiez l’autorisation read_publications et le canal Boutique en ligne.');
  for (const c of collectionsImportees(D)) {
    if (etat.collections.get(c.handle)?.ruleSet) throw new ErreurShopify(`La collection « ${c.handle} » est automatique (règles) : passez-la en collection manuelle dans l’admin avant la bascule.`);
  }
  const { idsParfumeurs } = await appliquerPreparation(client, D, etat, { log, journal, garderMedias });
  const publier = async (id, quoi) => client.muter('publishablePublish', GQL.PUBLIER, { id, input: [{ publicationId: enLigne.id }] }, quoi);

  log('\n▸ Produits : mise en vente');
  const idsProduits = {};
  for (const p of produitsImportes(D)) {
    idsProduits[p.handle] = await enregistrerProduit(client, p, D, etat, { statut: 'ACTIVE', garderMedias, idsParfumeurs, journal, log });
    await publier(idsProduits[p.handle], p.handle);
  }

  log('\n▸ Collections');
  for (const c of collectionsImportees(D)) {
    const ex = etat.collections.get(c.handle);
    const base = construireCollection(c);
    let id;
    if (ex) {
      const { handle, ...maj } = base;
      const r = await client.muter('collectionUpdate', GQL.MAJ_COLLECTION, { collection: { id: ex.id, ...maj } }, c.handle);
      id = r.collection.id;
      log(`  ~ collection ${c.handle}`);
    } else {
      const r = await client.muter('collectionCreate', GQL.CREER_COLLECTION, { collection: base }, c.handle);
      id = r.collection.id;
      log(`  + collection ${c.handle}`);
    }
    journal?.ajouter({ action: ex ? 'collection mise à jour' : 'collection créée', handle: c.handle, id });
    await ecrireMetachamps(client, id, metachampsCollection(c), `collection ${c.handle}`);
    const membres = new Set((ex?.products || []).map((x) => x.id));
    const voulus = produitsDeCollection(D, c.handle).map((h) => idsProduits[h]);
    for (const pid of voulus) {
      if (membres.has(pid)) continue;
      await client.muter('productUpdate', GQL.REJOINDRE_COLLECTION, { product: { id: pid, collectionsToJoin: [id] } }, `${c.handle} ← ${pid}`);
    }
    const r = await client.muter('collectionReorderProducts', GQL.ORDONNER_COLLECTION,
      { id, moves: voulus.map((pid, i) => ({ id: pid, newPosition: String(i) })) }, `ordre ${c.handle}`);
    await attendreTache(client, r.job, attendre || ((ms) => new Promise((ok) => setTimeout(ok, ms))));
    await publier(id, `collection ${c.handle}`);
    log(`    ${voulus.length} produit(s) dans l’ordre de data.js, publiée`);
  }

  log('\n▸ Pages');
  for (const pg of PAGES_NOUVELLES) {
    const ex = etat.pages.get(pg.handle);
    if (ex.isPublished && ex.templateSuffix === pg.handle) continue;
    await client.muter('pageUpdate', GQL.MAJ_PAGE, { id: ex.id, page: { isPublished: true, templateSuffix: pg.handle } }, pg.handle);
    log(`  ~ page ${pg.handle} publiée`);
  }
  const contact = etat.pages.get(PAGE_CONTACT);
  if (!contact) log(`  ! page « ${PAGE_CONTACT} » introuvable : gabarit non appliqué.`);
  else if (contact.templateSuffix !== 'contact') {
    await client.muter('pageUpdate', GQL.MAJ_PAGE, { id: contact.id, page: { templateSuffix: 'contact' } }, PAGE_CONTACT);
    log('  ~ page contact : gabarit page.contact');
  }
  const pdv = etat.pages.get(PAGE_ANCIENS_PDV);
  if (pdv?.isPublished) {
    await client.muter('pageUpdate', GQL.MAJ_PAGE, { id: pdv.id, page: { isPublished: false } }, PAGE_ANCIENS_PDV);
    log(`  ~ page ${PAGE_ANCIENS_PDV} dépubliée`);
  }

  log('\n▸ Redirections');
  for (const r of redirections()) {
    const ex = etat.redirections.get(r.path);
    if (ex?.target === r.target) continue;
    if (ex) await client.muter('urlRedirectUpdate', GQL.MAJ_REDIRECTION, { id: ex.id, urlRedirect: r }, r.path);
    else await client.muter('urlRedirectCreate', GQL.CREER_REDIRECTION, { urlRedirect: r }, r.path);
    log(`  ${ex ? '~' : '+'} ${r.path} → ${r.target}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Sauvegarde
// ─────────────────────────────────────────────────────────────────────────────

export async function sauvegarder(client) {
  const b = await client.gql(GQL.BOUTIQUE);
  const produits = (await paginer(client, GQL.SAUV_PRODUITS, (d) => d.products)).map(aplatirProduit);
  const collections = (await paginer(client, GQL.SAUV_COLLECTIONS, (d) => d.collections))
    .map((c) => ({ ...c, products: c.products?.nodes || [], metafields: c.metafields?.nodes || [] }));
  const pages = await paginer(client, GQL.SAUV_PAGES, (d) => d.pages);
  const redirs = await paginer(client, GQL.REDIRECTIONS, (d) => d.urlRedirects);
  const defs = {};
  for (const owner of ['PRODUCT', 'COLLECTION']) defs[owner] = (await client.gql(GQL.DEFS_METACHAMPS, { ownerType: owner })).metafieldDefinitions?.nodes || [];
  const defsMetaobjets = (await client.gql(GQL.SAUV_DEFS_METAOBJETS)).metaobjectDefinitions?.nodes || [];
  return {
    date: new Date().toISOString(), apiVersion: API_VERSION, shop: b.shop, publications: b.publications?.nodes || [],
    produits, collections, pages, redirections: redirs, definitionsMetachamps: defs, definitionsMetaobjets: defsMetaobjets,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Ligne de commande
// ─────────────────────────────────────────────────────────────────────────────

export function lireArguments(argv) {
  const o = { mode: 'essai', oui: false, garderMedias: false, aide: false };
  for (const a of argv) {
    if (a === '--essai') o.mode = 'essai';
    else if (a === '--sauvegarder') o.mode = 'sauvegarder';
    else if (a === '--appliquer=preparation') o.mode = 'preparation';
    else if (a === '--appliquer=bascule') o.mode = 'bascule';
    else if (a === '--oui') o.oui = true;
    else if (a === '--garder-medias') o.garderMedias = true;
    else if (a === '--aide' || a === '-h' || a === '--help') o.aide = true;
    else throw new ErreurShopify(`Argument inconnu : ${a} (voir --aide).`);
  }
  return o;
}

/**
 * Identifiants depuis l'environnement uniquement. Deux possibilités :
 *  - SHOPIFY_ADMIN_TOKEN (jeton shpat_… d'une application personnalisée existante) ;
 *  - SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (application du Dev Dashboard, « client credentials »).
 */
export function lireIdentifiants(env) {
  const boutique = (env.SHOPIFY_FLAG_STORE || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const jeton = (env.SHOPIFY_ADMIN_TOKEN || '').trim();
  const clientId = (env.SHOPIFY_CLIENT_ID || '').trim();
  const clientSecret = (env.SHOPIFY_CLIENT_SECRET || '').trim();
  if (!boutique || !(jeton || (clientId && clientSecret))) return null;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(boutique)) {
    throw new ErreurShopify(`SHOPIFY_FLAG_STORE doit être le domaine xxx.myshopify.com (reçu : « ${boutique} »).`);
  }
  return jeton ? { boutique, jeton } : { boutique, jeton: null, clientId, clientSecret };
}

/** Échange client_id/secret contre un jeton Admin valable 24 h (applications du Dev Dashboard). */
export async function obtenirJeton(ids, f = globalThis.fetch) {
  if (ids.jeton) return ids.jeton;
  const rep = await f(`https://${ids.boutique}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: ids.clientId, client_secret: ids.clientSecret }).toString(),
  });
  if (!rep.ok) {
    const t = await rep.text().catch(() => '');
    throw new ErreurShopify(`Jeton refusé (HTTP ${rep.status}) : ${t.slice(0, 200)} — l’application et la boutique doivent appartenir à la même organisation du Dev Dashboard.`);
  }
  const corps = await rep.json();
  if (!corps.access_token) throw new ErreurShopify('Réponse sans access_token lors de l’échange client credentials.');
  return corps.access_token;
}

const horodatage = () => new Date().toISOString().replace(/[:.]/g, '-');

function ecrireJson(dossier, sous, nom, donnees) {
  const d = join(dossier, sous);
  mkdirSync(d, { recursive: true });
  const chemin = join(d, `${nom}.json`);
  writeFileSync(chemin, JSON.stringify(donnees, null, 2) + '\n');
  return chemin;
}

const AIDE = `Importeur LIBRERY → Shopify (API Admin ${API_VERSION})
  node importer.mjs [--essai]               simulation, aucune écriture
  node importer.mjs --sauvegarder           export de la boutique (lecture seule)
  node importer.mjs --appliquer=preparation étapes invisibles pour les clients
  node importer.mjs --appliquer=bascule     jour J (demande de taper BASCULE, sauf --oui)
Options : --oui, --garder-medias
Variables : SHOPIFY_FLAG_STORE (xxx.myshopify.com) et SHOPIFY_ADMIN_TOKEN (jeton Admin API),
            ou SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (application du Dev Dashboard).`;

/**
 * Point d'entrée testable. Renvoie { code, journal?, plan?, sauvegarde? }.
 * `confirmer(question)` → Promise<string> ; `dossier` : où écrire sauvegardes/ et journaux/.
 */
export async function executer({ argv = [], env = {}, fetch: f = globalThis.fetch, log = console.log, confirmer = null, dossier = DOSSIER, attendre, cheminDonnees = DATA_JS } = {}) {
  const opts = lireArguments(argv);
  if (opts.aide) { log(AIDE); return { code: 0 }; }
  const D = chargerDonnees(cheminDonnees);
  const ids = lireIdentifiants(env);
  const ecrit = opts.mode === 'preparation' || opts.mode === 'bascule';
  log(`LIBRERY → Shopify · mode ${opts.mode}${ecrit ? '' : ' (aucune écriture)'} · API ${API_VERSION}`);
  log(`Données : ${produitsImportes(D).length} produits, ${collectionsImportees(D).length} collections (en pause exclus : ${(D.PAUSED_PRODUCTS || []).map((p) => p.handle).join(', ') || 'aucun'} ; collections masquées : ${Object.entries(D.COLLECTIONS).filter(([, c]) => c.hidden).map(([h]) => h).join(', ') || 'aucune'}).`);

  if (!ids) {
    if (opts.mode === 'essai') {
      log('Boutique : non lue (SHOPIFY_FLAG_STORE et SHOPIFY_ADMIN_TOKEN absents) — plan construit hors ligne.');
      const plan = calculerPlan(D, null, opts);
      log(formaterPlan(plan));
      return { code: 0, plan };
    }
    log('✖ SHOPIFY_FLAG_STORE et SHOPIFY_ADMIN_TOKEN (ou SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET) sont requis pour ce mode. Aucune action effectuée.');
    return { code: 2 };
  }
  ids.jeton = await obtenirJeton(ids, f);

  const lecture = creerClient({ boutique: ids.boutique, jeton: ids.jeton, fetch: f, lectureSeule: true, attendre });

  if (opts.mode === 'sauvegarder') {
    const s = await sauvegarder(lecture);
    const chemin = ecrireJson(dossier, 'sauvegardes', horodatage(), s);
    log(`✔ Sauvegarde : ${chemin} (${s.produits.length} produits, ${s.collections.length} collections, ${s.pages.length} pages, ${s.redirections.length} redirections).`);
    return { code: 0, sauvegarde: chemin };
  }

  log(`Boutique : ${ids.boutique} — lecture…`);
  const etat = await lireBoutique(lecture, D);
  log(`  ${etat.shop?.name} · ${etat.shop?.currencyCode} · taxes ${etat.shop?.taxesIncluded ? 'incluses (TTC)' : 'NON incluses'} · canal en ligne ${etat.boutiqueEnLigne ? 'trouvé' : 'introuvable'}`);
  if (etat.shop && !etat.shop.taxesIncluded) log('  ⚠ Les prix de data.js sont TTC : activez « Tous les prix incluent les taxes » dans Réglages › Taxes avant la bascule.');
  const plan = calculerPlan(D, etat, opts);

  if (opts.mode === 'essai') {
    log(formaterPlan(plan));
    log(`\nAucune écriture effectuée (${lecture.compteur.requetes} lectures).`);
    return { code: 0, plan };
  }

  const journal = creerJournal(opts.mode, ids.boutique);
  const client = creerClient({ boutique: ids.boutique, jeton: ids.jeton, fetch: f, lectureSeule: false, journal, attendre });
  const nomJournal = horodatage();
  try {
    if (opts.mode === 'bascule') {
      log(formaterPlan(plan, { filtre: '' }));
      log('\n▸ Sauvegarde préalable');
      const s = await sauvegarder(lecture);
      const chemin = ecrireJson(dossier, 'sauvegardes', `${nomJournal}-avant-bascule`, s);
      journal.donnees.sauvegarde = chemin;
      log(`  ✔ ${chemin}`);
      if (!opts.oui) {
        if (!confirmer) throw new ErreurShopify('Confirmation impossible (pas de terminal) : relancez avec --oui.');
        const rep = await confirmer('\nCette bascule est visible des clients. Tapez BASCULE pour continuer : ');
        if (String(rep).trim() !== 'BASCULE') {
          journal.donnees.statut = 'annulé';
          log('Bascule annulée : rien n’a été écrit.');
          return { code: 1, journal: journal.donnees };
        }
      }
      await appliquerBascule(client, D, etat, { log, journal, garderMedias: opts.garderMedias, attendre });
    } else {
      log(formaterPlan(plan, { filtre: 'preparation' }));
      await appliquerPreparation(client, D, etat, { log, journal, garderMedias: opts.garderMedias });
    }
    journal.donnees.statut = 'terminé';
    log(`\n✔ ${opts.mode} terminée (${client.compteur.mutations} écriture(s)).`);
    return { code: 0, journal: journal.donnees };
  } catch (e) {
    journal.donnees.statut = 'échec';
    journal.donnees.erreur = { message: e.message, details: e.details || null };
    throw e;
  } finally {
    journal.donnees.fin = new Date().toISOString();
    const chemin = ecrireJson(dossier, 'journaux', `${nomJournal}-${opts.mode}`, journal.donnees);
    log(`Journal : ${chemin}`);
  }
}

async function confirmerTerminal(question) {
  if (!process.stdin.isTTY) return '';
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { return await rl.question(question); } finally { rl.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  executer({ argv: process.argv.slice(2), env: process.env, confirmer: confirmerTerminal })
    .then((r) => { process.exitCode = r.code; })
    .catch((e) => {
      console.error(`\n✖ ${e.message}`);
      process.exitCode = 1;
    });
}
