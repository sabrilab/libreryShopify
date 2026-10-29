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

  // emballage cadeau : prix et variante de la boutique ; absent ou épuisé → l'option disparaît du site
  const emb = SHOP.produits[GIFT_WRAP.handle], embV = emb && emb.variantes[0];
  if (actif) {
    if (embV && embV.dispo) { GIFT_WRAP.price = embV.prix / 100; GIFT_WRAP.variant = embV.id; } else GIFT_WRAP.off = true;
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
    let emballages = 0;
    for (const l of lignes) {
      const f = formatDe(l.h, l.f);
      if (!f || !f.variant) { manque.push(nom(l.h)); continue; }
      const properties = { _librery: '1' };
      if (l.sel) properties['Parfums'] = l.sel.map(nom).join(', ');
      if (l.g && !GIFT_WRAP.off) { properties['Emballage cadeau'] = 'Oui'; emballages += l.q; }
      items.push({ id: f.variant, quantity: l.q, properties });
    }
    // une unité d'emballage par flacon à emballer ; la ligne du flacon porte « Emballage cadeau : Oui »
    if (emballages) items.push({ id: GIFT_WRAP.variant, quantity: emballages, properties: { _librery: '1' } });
    if (manque.length) return dire('Indisponible pour l’instant : ' + manque.join(', '));
    if (!items.length) return;
    const essai = [...new Set(lignes.filter(l => l.f === '100' || l.f === '30').map(l => nom(l.h)))];
    // les deux échantillons offerts accompagnent un flacon (100 ml, 30 ml ou coffret de 30 ml), pas une commande d'échantillons
    const flacon = lignes.some(l => l.f === '100' || l.f === '30' || /^coffret-decouverte-/.test(l.h));
    const attributes = {
      'Échantillons offerts': flacon ? (extras.samples || []).filter(Boolean).map(nom).join(', ') : '',
      '2 ml pour essayer': essai.join(', ')
    };
    bouton.disabled = true; const texte = bouton.textContent; bouton.textContent = 'Ouverture de la caisse…';
    try {
      // le panier du site fait foi : on vide le panier Shopify avant d'y mettre ses lignes. Une ligne restée d'une
      // autre visite (sans _librery : panier gardé par le compte client, « commander à nouveau »…) passait sinon à la
      // caisse sans être visible ni retirable sur le site (client du 29/10 : Coffret Découverte ajouté à chaque commande).
      const actuel = await json('/cart.js');
      const updates = {};
      actuel.items.forEach(i => { updates[i.key] = 0; });
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
  // code de bienvenue (BIENVENUE10 : 10 %, une fois par client, non cumulable), réservé dans Shopify aux inscrits à la newsletter :
  // on peut donc le montrer dès l'inscription
  const CODE_BIENVENUE = 'BIENVENUE10';
  const MERCI_LETTRE = `<p class="ok nl__ok">Merci. Votre code de 10&nbsp;% : <b>${CODE_BIENVENUE}</b>, à saisir au paiement (une fois par personne, non cumulable).</p>`;
  // l'inscrit est retenu : la fenêtre de la newsletter ne revient plus (la remise n'est plus appliquée d'office)
  const LETTRE_KEY = 'librery-lettre';
  function inscrit() {
    try { localStorage.setItem(LETTRE_KEY, '1'); } catch (e) {}
  }
  function codeGagne() { try { return localStorage.getItem(LETTRE_KEY); } catch (e) { return null; } }
  document.addEventListener('submit', e => {
    const f = e.target;
    if (f.matches('form[data-news]')) {
      e.preventDefault(); e.stopImmediatePropagation();
      const mail = f.querySelector('input[type=email]').value;
      const champs = { form_type: 'customer', 'contact[email]': mail, 'contact[tags]': 'newsletter', 'contact[accepts_marketing]': 'true' };
      poster(champs).then(r => {
        if (/challenge/.test(r.url)) return soumettreVraiment(champs);
        inscrit(); f.insertAdjacentHTML('afterend', MERCI_LETTRE); f.remove();
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
  if (/[?&]customer_posted=true/.test(location.search)) inscrit();
  if (/[?&](contact|customer)_posted=true/.test(location.search))
    addEventListener('load', () => dire(/customer_posted/.test(location.search) ? `Merci. Votre code de 10 % : ${CODE_BIENVENUE}, à saisir au paiement.` : 'Merci, votre message est bien parti.'));
  /* ---------------- 5. Fenêtre de la lettre : 10 % contre l'inscription à la lettre ---------------- */
  // S'ouvre d'elle-même (8 s ou un tiers de page), une fois : pas pour un inscrit, ni avant 7 jours après « Plus tard ».
  // Sobre (Rafiq et Sabri, 17-18/10) : l'adresse tout de suite, puis le code (réservé aux inscrits), rien n'est « gagné ».
  const PLUS_TARD_KEY = 'librery-cadeau-plus-tard', SEMAINE = 7 * 864e5;
  const dejaVu = () => { try { return codeGagne() || Date.now() - (+localStorage.getItem(PLUS_TARD_KEY) || 0) < SEMAINE; } catch (e) { return true; } };
  const pageCaisse = /^\/(cart|checkout|account|challenge)/.test(location.pathname.replace(/^\/[a-z]{2}(-[a-z]{2})?(?=\/)/, ''));
  if (actif && !pageCaisse && !dejaVu() && !/[?&]customer_posted=true/.test(location.search)) {
    const css = `
.cadeau{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:20px;background:rgba(35,26,19,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);opacity:0;transition:opacity .45s ease}
.cadeau.is-in{opacity:1}
.cadeau__box{position:relative;width:min(880px,100%);display:grid;grid-template-columns:1fr 1fr;background:var(--paper);box-shadow:0 40px 90px -30px rgba(0,0,0,.6);transform:translateY(18px) scale(.98);transition:transform .6s cubic-bezier(.2,.8,.2,1);overflow:hidden}
.cadeau.is-in .cadeau__box{transform:none}
.cadeau__img{position:relative;min-height:520px;background:#2a2019 center/cover no-repeat}
.cadeau__img::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(35,26,19,0) 55%,rgba(35,26,19,.35))}
.cadeau__txt{position:relative;padding:54px 48px 40px;display:flex;flex-direction:column;justify-content:center;text-align:center}
.cadeau__kick{font-family:var(--sans);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin:0 0 18px}
.cadeau__t{font-family:var(--serif-d);font-weight:400;font-size:38px;line-height:1.08;margin:0 0 16px}
.cadeau__p{font-family:var(--serif);font-size:16px;line-height:1.55;color:var(--grey);margin:0 0 28px}
.cadeau__step{transition:opacity .4s ease,transform .5s ease}
.cadeau__step[hidden]{display:none}
.cadeau__step.is-new{opacity:0;transform:translateY(10px)}
.cadeau form{display:grid;gap:10px}
.cadeau input[type=email]{height:48px;border:1px solid var(--line);background:#fff;padding:0 16px;font:15px var(--sans);color:var(--ink);text-align:center}
.cadeau input[type=email]:focus{outline:1px solid var(--ink);outline-offset:0}
.cadeau__code{display:flex;align-items:center;justify-content:center;gap:14px;margin:0 0 14px;padding:16px;border:1px solid var(--line);background:#fff}
.cadeau__code b{font-family:var(--sans);font-weight:500;font-size:20px;letter-spacing:.14em}
.cadeau__code button{font:11px var(--sans);letter-spacing:.08em;text-transform:uppercase;border:0;background:none;color:var(--grey);text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:6px}
.cadeau__small{font-family:var(--sans);font-size:11.5px;line-height:1.5;color:var(--grey);margin:14px 0 0}
.cadeau__later{margin-top:14px;font:12px var(--sans);letter-spacing:.06em;color:var(--grey);background:none;border:0;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.cadeau__x{position:absolute;top:12px;right:12px;z-index:2;width:36px;height:36px;border:0;background:none;font:22px/1 var(--sans);color:var(--ink);cursor:pointer}
.cadeau__err{font:12.5px var(--sans);color:#9a3b2c;margin:4px 0 0}
@media (max-width:760px){.cadeau{place-items:end center;padding:0}.cadeau__box{grid-template-columns:1fr;width:100%;max-height:100%;overflow:auto;transform:translateY(40px)}.cadeau__img{min-height:0;height:34vh}.cadeau__txt{padding:30px 24px calc(26px + env(safe-area-inset-bottom))}.cadeau__t{font-size:31px}.cadeau__x{color:#fff}}
@media (prefers-reduced-motion:reduce){.cadeau,.cadeau__box,.cadeau__step{transition:none}}`;
    const img = typeof IMG !== 'undefined' && typeof IMGW !== 'undefined' ? `${IMG}ecrin-contenu-m.webp?v=${(IMGW['ecrin-contenu'] || [])[2] || ''}` : '';
    const ouvrir = () => {
      if (document.querySelector('.cadeau') || dejaVu()) return;
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      const el = document.createElement('div'); el.className = 'cadeau'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'cadeau-t');
      el.innerHTML = `<div class="cadeau__box">
        <button class="cadeau__x" type="button" aria-label="Fermer">×</button>
        <div class="cadeau__img" style="background-image:url('${img}')" role="img" aria-label="L’écrin LIBRERY"></div>
        <div class="cadeau__txt">
          <div class="cadeau__step" data-s="2">
            <p class="cadeau__kick">La newsletter</p>
            <h2 class="cadeau__t" id="cadeau-t">Ne manquez<br><em>aucune exclusivité</em></h2>
            <p class="cadeau__p">Inscrivez-vous à la newsletter de LIBRERY : les nouveaux parfums et les éditions limitées avant tout le monde. Et 10&nbsp;% sur votre commande, réservés aux inscrits.</p>
            <form novalidate><input type="email" required placeholder="Votre adresse e-mail" aria-label="Votre adresse e-mail" autocomplete="email"><button class="btn btn--block">S’inscrire</button><p class="cadeau__err" hidden>Il manque une adresse e-mail valide.</p></form>
            <p class="cadeau__small">Code valable une fois par personne, non cumulable. Désinscription en un clic.</p>
          </div>
          <div class="cadeau__step is-new" data-s="3" hidden>
            <p class="cadeau__kick">Merci</p>
            <h2 class="cadeau__t">Bienvenue<br><em>à la maison</em></h2>
            <div class="cadeau__code"><b>${CODE_BIENVENUE}</b><button type="button" data-copier>Copier</button></div>
            <p class="cadeau__p" style="margin-bottom:22px">Votre code de 10&nbsp;%, à saisir au paiement avec cette adresse e-mail.</p>
            <button class="btn btn--block" type="button" data-fermer>Continuer</button>
          </div>
          <button class="cadeau__later" type="button" data-plus-tard>Plus tard</button>
        </div></div>`;
      document.body.appendChild(el);
      const avant = document.activeElement;
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
      const etape = n => {
        el.querySelectorAll('.cadeau__step').forEach(s => { s.hidden = +s.dataset.s !== n; });
        const s = el.querySelector(`[data-s="${n}"]`);
        requestAnimationFrame(() => requestAnimationFrame(() => s.classList.remove('is-new')));
        el.querySelector('[data-plus-tard]').hidden = n === 3;
        const f = s.querySelector('input, button'); if (f) f.focus({ preventScroll: true });
      };
      const fermer = (plusTard) => {
        if (plusTard) try { localStorage.setItem(PLUS_TARD_KEY, String(Date.now())); } catch (e) {}
        el.classList.remove('is-in'); setTimeout(() => { el.remove(); st.remove(); }, 450);
        document.removeEventListener('keydown', clavier); if (avant && avant.focus) avant.focus({ preventScroll: true });
      };
      const clavier = e => { if (e.key === 'Escape') fermer(!codeGagne()); };
      document.addEventListener('keydown', clavier);
      el.addEventListener('click', e => {
        if (e.target === el || e.target.closest('.cadeau__x') || e.target.closest('[data-plus-tard]')) return fermer(!codeGagne());
        if (e.target.closest('[data-fermer]')) return fermer(false);
        const c = e.target.closest('[data-copier]');
        if (c) { (navigator.clipboard ? navigator.clipboard.writeText(CODE_BIENVENUE) : Promise.reject()).then(() => { c.textContent = 'Copié'; }, () => {}); }
      });
      el.querySelector('form').addEventListener('submit', e => {
        e.preventDefault(); e.stopImmediatePropagation();
        const f = e.target, champ = f.querySelector('input'), err = f.querySelector('.cadeau__err');
        if (!champ.checkValidity()) { err.hidden = false; champ.focus(); return; }
        err.hidden = true;
        const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Un instant…';
        const champs = { form_type: 'customer', 'contact[email]': champ.value, 'contact[tags]': 'newsletter, fenetre-cadeau', 'contact[accepts_marketing]': 'true' };
        poster(champs).then(r => {
          if (/challenge/.test(r.url)) return soumettreVraiment(champs);
          inscrit(); etape(3);
        }).catch(() => soumettreVraiment(champs));
      });
    };
    let parti = false;
    // jamais par-dessus le bandeau des cookies de Shopify (il passerait devant la fenêtre) : on attend qu'il soit refermé
    const bandeau = () => { const b = document.getElementById('shopify-pc__banner'); if (!b) return false; const r = b.getBoundingClientRect(), cs = getComputedStyle(b); return r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
    const apresBandeau = () => { if (!bandeau()) return ouvrir(); const t = setInterval(() => { if (!bandeau()) { clearInterval(t); setTimeout(ouvrir, 1200); } }, 700); };
    const go = () => { if (parti) return; parti = true; removeEventListener('scroll', auDefile); apresBandeau(); };
    const auDefile = () => { if (scrollY > (document.documentElement.scrollHeight - innerHeight) / 3) go(); };
    addEventListener('load', () => { setTimeout(go, 8000); addEventListener('scroll', auDefile, { passive: true }); });
  }
})();
