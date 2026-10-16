/* ==========================================================================
   LIBRERY — pont entre les scripts de la maquette et la boutique Shopify.
   Chargé après data.js et avant main.js (layout/theme.liquid).
   1. Fusion : prix, variantes et stock de Shopify (window.LIBRERY_SHOP, snippets/librery-shop.liquid)
      remplacent ceux de data.js ; les textes et visuels restent ceux de data.js.
   2. Pages sans équivalent dans data.js (produit ou collection créés plus tard dans l'admin) :
      le gabarit Shopify générique prend le relais (snippets/librery-produit-shopify.liquid…).
   3. « Commander » : le panier de la maquette (localStorage) est envoyé au panier Shopify, puis à la caisse.
   4. Formulaires : lettre de la maison (client Shopify « newsletter ») et contact (e-mail de la boutique).
   ========================================================================== */
(function () {
  'use strict';
  const SHOP = window.LIBRERY_SHOP || { produits: {} }, CTX = window.LIBRERY_CTX || {};
  const CART_KEY = 'librery-cart-v2', EXTRA_KEY = 'librery-cart-extras', ENVOI_KEY = 'librery-caisse';
  const lire = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const norme = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/×/g, 'x').trim();

  /* ---------------- 1. Fusion des prix et des variantes ---------------- */
  const tous = PRODUCTS.concat(PAUSED_PRODUCTS || []);
  // Avant l'import (aperçu d'un thème sur une boutique encore vide) : aucun produit reconnu → la maquette telle quelle.
  const relies = tous.filter(p => SHOP.produits[p.handle]);
  const actif = relies.length > 0;
  if (!actif) console.warn('[LIBRERY] aucun produit de data.js dans la boutique : prix et panier de la maquette (aperçu seulement)');
  if (actif) for (const p of PRODUCTS) {
    const sp = SHOP.produits[p.handle];
    if (!sp) { p.formats = (p.formats || FORMATS).map(f => ({ ...f, absent: true })); continue; }
    const fmts = (p.formats || FORMATS).map(f => {
      const v = sp.variantes.find(x => norme(x.format) === norme(f.label));
      return v ? { ...f, price: v.prix / 100, variant: v.id, available: v.dispo } : null;
    }).filter(Boolean);
    if (!fmts.length) console.warn('[LIBRERY] ' + p.handle + ' : aucune variante « Format » ne correspond aux libellés de data.js');
    p.formats = fmts.length ? fmts : (p.formats || FORMATS).map(f => ({ ...f, absent: true }));
  }

  const formatDe = (h, fid) => { const p = PRODUCTS.find(x => x.handle === h); return p && (p.formats || FORMATS).find(f => f.id === fid); };
  window.LIBRERY_SHOPIFY = {
    actif,
    // message si l'on ne peut pas ajouter ce format (lu par addToCart, main.js)
    refus(h, fid) {
      if (!actif) return null;
      const f = formatDe(h, fid);
      if (!f || f.absent || !f.variant) return 'Ce format arrive bientôt.';
      if (f.available === false) return 'Ce format est momentanément épuisé.';
      return null;
    }
  };

  /* ---------------- 2. Produit ou collection inconnus de data.js ---------------- */
  const relais = (racine, generique) => {
    const r = document.getElementById(racine), g = document.getElementById(generique);
    if (r && g) { r.remove(); g.hidden = false; }
  };
  if (CTX.product && !PRODUCTS.some(p => p.handle === CTX.product)) relais('product', 'product-shopify');
  if (CTX.collection && !(COLLECTIONS[CTX.collection] && !COLLECTIONS[CTX.collection].hidden)) relais('collection', 'collection-shopify');

  /* ---------------- 3. Commander : panier de la maquette → panier Shopify → caisse ---------------- */
  // Après une commande, Shopify vide son panier : si l'on revient avec un panier Shopify vide après être passé
  // à la caisse, le panier de la maquette est vidé aussi (sinon on le garde : le visiteur est revenu sans payer).
  if (actif && localStorage.getItem(ENVOI_KEY) && !SHOP.panier) {
    try { localStorage.removeItem(CART_KEY); localStorage.removeItem(EXTRA_KEY); localStorage.removeItem(ENVOI_KEY); } catch (e) {}
  }
  const route = chemin => (SHOP.racine || '/').replace(/\/$/, '') + chemin;
  const json = (chemin, corps) => fetch(route(chemin), {
    method: corps ? 'POST' : 'GET', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined
  }).then(r => r.json().then(d => { if (!r.ok) throw new Error(d.description || d.message || r.status); return d; }));
  const nom = h => (PRODUCTS.find(p => p.handle === h) || {}).name || h;

  async function commander(bouton) {
    const lignes = lire(CART_KEY, []), extras = lire(EXTRA_KEY, {});
    if (!actif) return dire('La caisse ouvrira avec la boutique.');
    const items = [], manque = [];
    for (const l of lignes) {
      const f = formatDe(l.h, l.f);
      if (!f || !f.variant) { manque.push(nom(l.h)); continue; }
      const properties = { _librery: '1' };
      if (l.sel) properties['Parfums'] = l.sel.map(nom).join(', ');
      items.push({ id: f.variant, quantity: l.q, properties });
    }
    if (manque.length) return dire('Indisponible pour l’instant : ' + manque.join(', '));
    if (!items.length) return;
    const essai = [...new Set(lignes.filter(l => l.f === '100' || l.f === '30').map(l => nom(l.h)))];
    const attributes = {
      'Échantillons offerts': (extras.samples || []).filter(Boolean).map(nom).join(', '),
      '2 ml pour essayer': essai.join(', ')
    };
    bouton.disabled = true; const texte = bouton.textContent; bouton.textContent = 'Ouverture de la caisse…';
    try {
      // on remplace les lignes envoyées la fois précédente (marquées _librery), sans toucher aux autres
      const actuel = await json('/cart.js');
      const updates = {};
      actuel.items.forEach(i => { if (i.properties && i.properties._librery) updates[i.key] = 0; });
      if (Object.keys(updates).length) await json('/cart/update.js', { updates });
      await json('/cart/add.js', { items });
      await json('/cart/update.js', { attributes });
      try { localStorage.setItem(ENVOI_KEY, String(Date.now())); } catch (e) {}
      location.href = SHOP.caisse || route('/checkout');
    } catch (e) {
      console.error('[LIBRERY] caisse', e);
      bouton.disabled = false; bouton.textContent = texte;
      dire('La caisse n’a pas pu s’ouvrir : ' + e.message);
    }
  }
  function dire(msg) {
    const t = document.getElementById('toast'); if (!t) return alert(msg);
    t.textContent = msg; t.classList.add('is-in'); setTimeout(() => t.classList.remove('is-in'), 3200);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-checkout]'); if (!b) return;
    e.preventDefault(); commander(b);
  });

  /* ---------------- 4. Formulaires ---------------- */
  // Interceptés à la capture, avant ceux de main.js (qui ne faisaient qu'afficher « Merci »).
  const poster = (champs) => {
    const d = new FormData(); d.append('utf8', '✓');
    Object.entries(champs).forEach(([k, v]) => d.append(k, v));
    return fetch(route('/contact'), { method: 'POST', body: d, credentials: 'same-origin' });
  };
  // Shopify peut demander une vérification (hCaptcha) : on soumet alors un vrai formulaire, qui y mène.
  const soumettreVraiment = (champs) => {
    const f = document.createElement('form'); f.method = 'post'; f.action = route('/contact'); f.hidden = true;
    Object.entries({ utf8: '✓', ...champs }).forEach(([k, v]) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i); });
    document.body.appendChild(f); f.submit();
  };
  // code de bienvenue (remise BIENVENUE10 créée dans Shopify : 10 %, une fois par client, non cumulable) montré dès l'inscription
  const CODE_BIENVENUE = 'BIENVENUE10';
  const MERCI_LETTRE = `<p class="ok nl__ok">Merci. Votre code de bienvenue : <b>${CODE_BIENVENUE}</b>, 10&nbsp;% sur tout le site, à saisir au paiement (une fois par personne, non cumulable).</p>`;
  document.addEventListener('submit', e => {
    const f = e.target;
    if (f.matches('form[data-news]')) {
      e.preventDefault(); e.stopImmediatePropagation();
      const mail = f.querySelector('input[type=email]').value;
      const champs = { form_type: 'customer', 'contact[email]': mail, 'contact[tags]': 'newsletter', 'contact[accepts_marketing]': 'true' };
      poster(champs).then(r => {
        if (/challenge/.test(r.url)) return soumettreVraiment(champs);
        f.insertAdjacentHTML('afterend', MERCI_LETTRE); f.remove();
      }).catch(() => soumettreVraiment(champs));
    } else if (f.id === 'contact-form') {
      e.preventDefault(); e.stopImmediatePropagation();
      const champs = { form_type: 'contact' };
      new FormData(f).forEach((v, k) => { if (k.startsWith('contact[')) champs[k] = v; });
      poster(champs).then(r => {
        if (/challenge/.test(r.url)) return soumettreVraiment(champs);
        f.outerHTML = '<p class="lede">Merci. Nous vous répondons sous deux jours ouvrés.</p>';
      }).catch(() => soumettreVraiment(champs));
    }
  }, true);
  // retour d'un vrai envoi (après vérification) : Shopify ajoute ?contact_posted=true ou ?customer_posted=true
  if (/[?&](contact|customer)_posted=true/.test(location.search))
    addEventListener('load', () => dire(/customer_posted/.test(location.search) ? `Merci. Votre code de bienvenue : ${CODE_BIENVENUE} (10 % sur tout le site).` : 'Merci, votre message est bien parti.'));
})();
