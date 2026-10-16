// LIBRERY — aperçu local du thème Shopify, sans boutique : le thème (shopify/theme) est rendu par liquidjs avec des
// objets Shopify simulés (produits tirés de data.js, panier en mémoire), les médias servis depuis maquette/.
//   cd shopify/tests && npm install && node apercu-local.mjs        → http://localhost:4300
//   node apercu-local.mjs --essai                                    → parcours automatique (Playwright), puis sortie
// Ce n'est pas Shopify : seules les balises et filtres utilisés par le thème sont imités. Le vrai contrôle se fait
// sur le thème non publié de la boutique (shopify theme push --unpublished, voir ../MIGRATION.md).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { Liquid, Tag } from 'liquidjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const THEME = path.resolve(ICI, '../theme'), MAQ = path.resolve(ICI, '../../maquette');
const PORT = +(process.env.PORT || 4300);

// ---------- données simulées : les produits de data.js, variantes « Format » au libellé exact ----------
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(THEME, 'assets/data.js'), 'utf8').replace(/LIBRERY_BASE/g, "''") + ';this.D={PRODUCTS,FORMATS}', ctx);
const { PRODUCTS, FORMATS } = ctx.D;
let vid = 1000;
// Hot Sand 100 ml à 175 € dans la « boutique » : prouve que le prix affiché vient de Shopify, pas de data.js
export const PRIX_TEMOIN = { handle: 'hot-sand', format: '100 ml', prix: 17500 };
const produits = PRODUCTS.map((p, i) => {
  const variants = (p.formats || FORMATS).map(f => {
    const prix = p.handle === PRIX_TEMOIN.handle && f.label === PRIX_TEMOIN.format ? PRIX_TEMOIN.prix : Math.round(f.price * 100);
    // Tonka Love 30 ml épuisé : prouve que le stock de Shopify est respecté
    const available = !(p.handle === 'tonka-love' && f.id === '30');
    return { id: ++vid, title: f.label, option1: f.label, price: prix, available, sku: `LIB-${p.handle}-${f.id}`.toUpperCase(), url: `/products/${p.handle}?variant=${vid}` };
  });
  return {
    id: 100 + i, handle: p.handle, title: p.name, url: `/products/${p.handle}`, available: true, variants,
    description: `<p>${(p.description || [''])[0]}</p>`, price_min: Math.min(...variants.map(v => v.price)), price_varies: variants.length > 1,
    has_only_default_variant: false, selected_or_first_available_variant: variants[0], collections: [], featured_media: null
  };
});
// produit présent dans Shopify mais pas dans data.js : la fiche générique doit prendre le relais
produits.push({ id: 999, handle: 'bougie-essai', title: 'Bougie (essai)', url: '/products/bougie-essai', available: true,
  variants: [{ id: 9999, title: 'Default Title', option1: 'Default Title', price: 4500, available: true, url: '/products/bougie-essai' }],
  description: '<p>Produit créé dans l’admin, inconnu de data.js.</p>', price_min: 4500, price_varies: false,
  has_only_default_variant: true, selected_or_first_available_variant: { id: 9999, price: 4500 }, collections: [], featured_media: null });

let panier = { token: 'essai', items: [], attributes: {}, item_count: 0, total_price: 0 };
export const journal = [];
const recompter = () => { panier.item_count = panier.items.reduce((s, i) => s + i.quantity, 0); panier.total_price = panier.items.reduce((s, i) => s + i.final_line_price, 0); };

// ---------- moteur Liquid ----------
const liquid = new Liquid({ root: [path.join(THEME, 'snippets')], extname: '.liquid', strictFilters: true, jsTruthy: false });
liquid.registerTag('schema', class extends Tag {
  constructor(t, rest, l) { super(t, rest, l); for (;;) { const x = rest.shift(); if (!x || (x.name === 'endschema')) break; } }
  * render() {}
});
const bloc = (fin, avant) => class extends Tag {
  constructor(t, rest, l) { super(t, rest, l); this.tpls = []; const s = l.parser.parseStream(rest); s.on('tag:' + fin, () => s.stop()).on('template', x => this.tpls.push(x)).on('end', () => { throw new Error(fin + ' manquant'); }); s.start(); }
  * render(c, e) { if (avant) e.write(avant); yield this.liquid.renderer.renderTemplates(this.tpls, c, e); if (avant) e.write('</form>'); }
};
liquid.registerTag('form', bloc('endform', '<form method="post" action="/cart/add">'));
liquid.registerTag('paginate', bloc('endpaginate'));
const filtres = {
  asset_url: f => `/theme-assets/${f.replace(/\.liquid$/, '')}?v=essai`,
  stylesheet_tag: u => `<link rel="stylesheet" href="${u}">`,
  money: c => (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
  image_url: () => '//essai/image.webp', image_tag: (u, ...a) => `<img src="${u}" alt="">`, default_pagination: () => '',
};
for (const [k, f] of Object.entries(filtres)) liquid.registerFilter(k, f);

const objets = (extra) => ({
  shop: { name: 'LIBRERY', currency: 'EUR' }, settings: { base_medias: '', description_defaut: 'LIBRERY, Paris' },
  routes: { root_url: '/', cart_url: '/cart', search_url: '/search', collections_url: '/collections' },
  request: { locale: { iso_code: 'fr' }, origin: `http://localhost:${PORT}` },
  cart: { ...panier, currency: { iso_code: 'EUR' } }, collections: { all: { products: produits } },
  canonical_url: `http://localhost:${PORT}/`, page_title: 'Essai', page_description: '', current_page: 1,
  content_for_header: '<!-- content_for_header -->', ...extra
});

async function rendre(modele, extra) {
  const json = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', modele + '.json'), 'utf8'));
  const o = objets(extra);
  let contenu = '';
  for (const id of json.order) {
    const s = json.sections[id];
    const src = fs.readFileSync(path.join(THEME, 'sections', s.type + '.liquid'), 'utf8');
    contenu += `<div id="shopify-section-${id}" class="shopify-section">${await liquid.parseAndRender(src, o, { globals: o })}</div>`;
  }
  const g = { ...o, content_for_layout: contenu };
  // comme dans Shopify, les objets globaux (product, routes…) sont visibles dans les snippets rendus par {% render %}
  return liquid.parseAndRender(fs.readFileSync(path.join(THEME, 'layout/theme.liquid'), 'utf8'), g, { globals: g });
}

const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.json': 'application/json', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.hdr': 'application/octet-stream', '.bin': 'application/octet-stream' };
const envoyer = (res, code, corps, type = 'text/html; charset=utf-8') => { res.writeHead(code, { 'Content-Type': type }); res.end(corps); };
const lireCorps = req => new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });

export function serveur() {
  return http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
    try {
      if (p.startsWith('/theme-assets/')) {
        const nom = p.slice(14), f = path.join(THEME, 'assets', nom);
        if (fs.existsSync(f + '.liquid')) return envoyer(res, 200, await liquid.parseAndRender(fs.readFileSync(f + '.liquid', 'utf8'), objets()), TYPES[path.extname(nom)]);
        return envoyer(res, 200, fs.readFileSync(f), TYPES[path.extname(nom)]);
      }
      if (/^\/(assets|parfum)\//.test(p)) {
        const f = path.join(MAQ, p);
        if (!f.startsWith(MAQ) || !fs.existsSync(f)) return envoyer(res, 404, 'absent');
        return envoyer(res, 200, fs.readFileSync(f), TYPES[path.extname(f)] || 'application/octet-stream');
      }
      // API panier (imitée)
      if (p === '/cart.js') return envoyer(res, 200, JSON.stringify(panier), 'application/json');
      if (p === '/cart/add.js') {
        const b = await lireCorps(req); journal.push(['add', b]);
        for (const it of b.items || []) {
          const pr = produits.find(x => x.variants.some(v => v.id === it.id)), v = pr && pr.variants.find(v => v.id === it.id);
          if (!v) return envoyer(res, 422, JSON.stringify({ description: 'variante inconnue ' + it.id }), 'application/json');
          panier.items.push({ key: `${it.id}:${panier.items.length}`, id: it.id, quantity: it.quantity, properties: it.properties || {}, final_line_price: v.price * it.quantity, product: { title: pr.title }, variant: { title: v.title } });
        }
        recompter(); return envoyer(res, 200, JSON.stringify({ items: b.items }), 'application/json');
      }
      if (p === '/cart/update.js') {
        const b = await lireCorps(req); journal.push(['update', b]);
        if (b.updates) panier.items = panier.items.filter(i => b.updates[i.key] !== 0);
        if (b.attributes) Object.assign(panier.attributes, b.attributes);
        recompter(); return envoyer(res, 200, JSON.stringify(panier), 'application/json');
      }
      if (p === '/checkout') { journal.push(['checkout']); return envoyer(res, 200, '<h1>Caisse Shopify (simulée)</h1>'); }
      if (p === '/contact' && req.method === 'POST') { journal.push(['contact']); return envoyer(res, 200, 'ok'); }
      // pages
      let m;
      if (p === '/') return envoyer(res, 200, await rendre('index', { template: { name: 'index' } }));
      if ((m = p.match(/^\/products\/([\w-]+)$/))) {
        const product = produits.find(x => x.handle === m[1]); if (!product) return envoyer(res, 404, 'absent');
        return envoyer(res, 200, await rendre('product', { template: { name: 'product' }, product, page_title: product.title }));
      }
      if ((m = p.match(/^\/collections\/([\w-]+)$/))) {
        const collection = { handle: m[1], title: m[1], description: '', products: produits };
        return envoyer(res, 200, await rendre('collection', { template: { name: 'collection' }, collection }));
      }
      if ((m = p.match(/^\/pages\/([\w-]+)$/))) {
        const suf = fs.existsSync(path.join(THEME, 'templates', `page.${m[1]}.json`)) ? m[1] : '';
        return envoyer(res, 200, await rendre(suf ? 'page.' + suf : 'page', { template: { name: 'page', suffix: suf || null }, page: { title: m[1], content: '<p>Texte de la page.</p>' } }));
      }
      if (p === '/cart') return envoyer(res, 200, await rendre('cart', { template: { name: 'cart' } }));
      return envoyer(res, 404, await rendre('404', { template: { name: '404' } }));
    } catch (e) { console.error(p, e); envoyer(res, 500, String(e.stack)); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = serveur().listen(PORT, async () => {
    console.log(`aperçu du thème : http://localhost:${PORT}`);
    if (process.argv.includes('--essai')) {
      const { essai } = await import('./parcours.mjs');
      const ok = await essai(`http://localhost:${PORT}`, journal);
      s.close(); process.exit(ok ? 0 : 1);
    }
  });
}
