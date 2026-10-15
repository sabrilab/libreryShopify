/* ==========================================================================
   LIBRERY — comportements du site (v3)
   Rendu des gabarits communs (en-tête, titre courant, pied de page, panier)
   et des pages dynamiques (bibliothèque, collection, fiche produit…).
   Dans Shopify : header.liquid, footer.liquid, cart-drawer.liquid,
   main-collection.liquid, main-product.liquid.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const eur = n => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0 });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const byHandle = h => PRODUCTS.find(p => p.handle === h);
  const formatsOf = p => p.formats || FORMATS;
  const minPrice = p => Math.min(...formatsOf(p).map(f => f.price));
  const FREE_SHIPPING = 100;
  const body = document.body;
  const page = body.dataset.page || '';

  /* Nom en deux temps : le second mot en italique (« Tonka Love ») */
  const nm = n => { const w = String(n).split(' '); return w.length > 1 ? `${esc(w[0])} <em>${esc(w.slice(1).join(' '))}</em>` : esc(n); };

  /* Image responsive : <nom>-m.webp (petit) et <nom>.webp (grand) */
  /* adresse d'une image, versionnée par son empreinte (jamais d'ancienne version en cache) */
  const src = (name, big) => `${IMG + name}${big ? '' : '-m'}.webp?v=${(IMGW[name] || [])[2] || ''}`;
  function pic(name, alt = '', sizes = '(max-width: 800px) 100vw, 50vw', cls = '', eager = false) {
    const w = IMGW[name] || [800, 1600];
    return `<img class="${cls}" src="${src(name)}" srcset="${src(name)} ${w[0]}w, ${src(name, 1)} ${w[1]}w" sizes="${sizes}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }

  /* Packshot cadré au nombre d'or — une seule règle pour tout le site (cartes, tuiles, panier, fiche produit).
     build.py mesure le produit sur chaque packshot : IMGW[nom][3] = [x0, y0, x1, y1, hauteur/largeur, couleurs des bords].
     Dans un cadre W × H, l'image prend la largeur sw = min(H·kh, W·kw) : le produit y fait 1/φ de la hauteur
     (au plus 84 % de la largeur), centré ; l'air libre se partage φ:1 (plus d'air au-dessus), d'où le haut T = H/φ + sw·cy.
     Un 30 ml prend l'échelle et le sol de son 100 ml : plus petit, posé sur la même ligne. */
  const PHI = (1 + Math.sqrt(5)) / 2;
  function gold(name) {
    const b = (IMGW[name] || [])[3]; if (!b) return null;
    const r = /-pack30$/.test(name) && (IMGW[name.slice(0, -2)] || [])[3] || b, ia = b[4], rh = r[3] - r[1];
    return { ia, kh: 1 / (PHI * rh * ia), kw: .84 / (r[2] - r[0]), cx: (b[0] + b[2]) / 2, cy: ia * (rh / PHI / PHI - r[3]), edge: b[5].split(' ') };
  }
  // placement en pixels ; l'image couvre le cadre, ou y tient entière (bords prolongés par le fond, voir .gold).
  // En hauteur, seul le bas reste couvert : le haut n'est jamais rabattu (un coffret plus court que le cadre garde sa ligne d'or)
  function goldBox(g, W, H) {
    const sw = Math.min(H * g.kh, W * g.kw), sh = sw * g.ia, dx = W - sw, dy = H - sh;
    const clamp = (v, d) => Math.min(Math.max(v, Math.min(0, d)), Math.max(0, d));
    const T = Math.max(H / PHI + sw * g.cy, Math.min(0, dy));
    return { sw, sh, L: clamp(W / 2 - sw * g.cx, dx), T, inset: dx > .5 || dy > .5 || T > .5 };
  }
  const goldVars = g => `--kh:${+g.kh.toFixed(4)};--kw:${+g.kw.toFixed(4)};--cx:${+g.cx.toFixed(4)};--cy:${+g.cy.toFixed(4)};--ia:${g.ia};${g.edge.map((c, i) => `--e${i}:#${c}`).join(';')}`;
  /* cadre de proportion fixe (carte, tuile, panier ; `ar` = hauteur/largeur) : même calcul en CSS (unités cqw/cqh, .gold),
     sans script ni saut à l'affichage ; l'image, plus grande que le cadre, est demandée en conséquence (sizes) */
  function packPic(name, alt, sizes, cls = '', eager = false, ar = 1.25) {
    const g = gold(name); if (!g) return pic(name, alt, sizes, cls, eager);
    const b = goldBox(g, 100, 100 * ar), z = Math.max(1, b.sw / 100).toFixed(2);   // cadre de 100 unités : seuil d'is-inset = 0,5 %
    return `<span class="gold${b.inset ? ' is-inset' : ''}${cls ? ' ' + cls : ''}" style="${goldVars(g)}">${pic(name, alt, sizes.split(',').map(s => s.replace(/(\S+)\s*$/, `calc($1 * ${z})`)).join(','), '', eager)}</span>`;
  }
  /* fiche produit : cadre à la hauteur de l'écran, placement recalculé en pixels à chaque redimensionnement */
  function frameGold(fig) {
    const img = fig.querySelector('img'), g = gold(fig.dataset.gold); if (!img || !g) return;
    fig.style.cssText += goldVars(g);
    const place = () => {
      const W = fig.clientWidth, H = fig.clientHeight; if (!W || !H) return;
      const b = goldBox(g, W, H);
      fig.style.setProperty('--t', b.T + 'px'); fig.style.setProperty('--sh', b.sh + 'px');
      fig.classList.toggle('is-inset', b.inset);
      Object.assign(img.style, { width: b.sw + 'px', height: b.sh + 'px', transform: `translate(${b.L}px, ${b.T}px)` });
      fig.classList.add('is-set');
    };
    place(); new ResizeObserver(place).observe(fig);
  }

  /* Moyens de paiement : badges pleins, logo officiel découpé dedans (données dans paiement.js) */
  const payBadge = ([k, nom, g]) => `<li class="pay" title="${nom}"><svg viewBox="0 0 38 24" role="img" aria-label="${nom}"><mask id="pay-${k}" maskUnits="userSpaceOnUse" x="0" y="0" width="38" height="24"><rect width="38" height="24" rx="3.5" fill="#fff"/><g fill="#000">${g}</g></mask><rect width="38" height="24" rx="3.5" fill="currentColor" mask="url(#pay-${k})"/></svg></li>`;

  /* Icônes au trait (32 px, trait 1 px) — snippet icon.liquid dans Shopify */
  const ICONS = {
    vial: '<path d="M11 13.5h7v13.2a1.3 1.3 0 0 1-1.3 1.3h-4.4a1.3 1.3 0 0 1-1.3-1.3z"/><path d="M12.2 9h4.6v4.5h-4.6z"/><path d="M13.4 9V6.5h2.2V9"/><path d="M11 19h7"/><path d="M24 7.5c1.3 1.8 2 3 2 4a2 2 0 0 1-4 0c0-1 .7-2.2 2-4z"/>',
    vials: '<path d="M7.5 13h6v12.8a1.2 1.2 0 0 1-1.2 1.2H8.7a1.2 1.2 0 0 1-1.2-1.2z"/><path d="M8.6 9h3.8v4H8.6z"/><path d="M7.5 18.5h6"/><path d="M18.5 13h6v12.8a1.2 1.2 0 0 1-1.2 1.2h-3.6a1.2 1.2 0 0 1-1.2-1.2z"/><path d="M19.6 9h3.8v4h-3.8z"/><path d="M18.5 18.5h6"/>',
    parcel: '<path d="M16 5.5 26.5 10v12L16 26.5 5.5 22V10z"/><path d="M5.5 10 16 14.5 26.5 10"/><path d="M16 14.5v12"/><path d="m10.8 7.8 10.5 4.5v4.2"/>'
  };
  const icon = k => ICONS[k] ? `<svg class="icon" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>` : '';

  /* ------------------------------------------------------------------ */
  /* En-tête, menu, titre courant, pied de page                          */
  /* ------------------------------------------------------------------ */
  function renderHeader() {
    const host = $('#site-header'); if (!host) return;
    const cur = k => (k === page ? 'aria-current="page"' : '');
    host.outerHTML = `
      <div class="announce" id="announce">
        <span class="is-on">Un échantillon 2 ml offert avec chaque flacon</span>
        <span>Livraison offerte dès 100 €</span>
      </div>
      <header class="header" id="header">
        <div class="header__in">
          <div>
            <button class="menu-btn" id="menu-btn" aria-label="Ouvrir le menu">Menu</button>
            <nav class="nav" aria-label="Navigation principale">
              <div class="has-sub"><a href="/bibliotheque" ${cur('bibliotheque')}>Bibliothèque</a>
                <div class="mega">
                  <div class="mega__col"><span class="ui">Collections</span>
                    <a href="/collection?c=skin-obsession">Skin <em>Obsession</em><small>nouveau</small></a>
                    <a href="/collection?c=summer-vibes">Summer <em>Vibes</em></a>
                    <a href="/collection?c=coffrets">Coffrets</a>
                    ${COLLECTIONS.bougies && !COLLECTIONS.bougies.hidden ? '<a href="/collection?c=bougies">Bougies<small>bientôt</small></a>' : ''}
                    <a href="/bibliotheque">Tous les parfums</a></div>
                  <div class="mega__col"><span class="ui">Choisir</span>
                    <a href="/portrait-olfactif">Portrait olfactif</a>
                    <a href="/produit?p=coffret-decouverte">Coffret Découverte</a>
                    <a href="/offrir">Offrir</a>
                    <a href="${CATALOGUE_URL}">Le catalogue</a></div>
                  <div class="mega__col"><span class="ui">Familles</span>
                    ${Object.keys(FAMILIES).map(f => `<a href="/bibliotheque?famille=${encodeURIComponent(f)}#familles">${f}</a>`).join('')}</div>
                </div>
              </div>
              <a href="/preface" ${cur('preface')}>Préface</a>
              <a href="/lexique" ${cur('lexique')}>Lexique</a>
              <a href="/points-de-vente" ${cur('carte')}>Carte</a>
            </nav>
          </div>
          <a href="/" class="logo" aria-label="LIBRERY, accueil">${LOGO_SVG}</a>
          <div class="utils">
            <a href="/offrir" class="u-hide">Offrir</a>
            <button type="button" class="u-hide" data-toast="Le compte client sera celui de Shopify">Compte</button>
            <button type="button" id="open-cart">Panier (<span data-cart-count>0</span>)</button>
          </div>
        </div>
      </header>
      <div class="drawer" id="drawer" aria-hidden="true">
        <div class="drawer__top"><button class="menu-btn" id="close-nav" style="display:block">Fermer</button><a href="/" class="logo">${LOGO_SVG}</a><span style="width:44px"></span></div>
        <nav>
          <a href="/bibliotheque">Bibliothèque</a>
          <div class="sub">
            <a href="/collection?c=skin-obsession">Skin <em>Obsession</em></a>
            <a href="/collection?c=summer-vibes">Summer <em>Vibes</em></a>
            <a href="/collection?c=coffrets">Coffrets</a>
            <a href="/bibliotheque#familles">Par famille olfactive</a>
            <a href="/portrait-olfactif">Portrait olfactif</a>
          </div>
          <a href="/preface">Préface</a>
          <a href="/lexique">Lexique</a>
          <a href="/points-de-vente">Carte</a>
          <a href="/offrir">Offrir</a>
        </nav>
        <div class="drawer__foot"><a href="/services">Services</a><a href="/contact">Contact</a><span>LIBRERY, maison de parfum, Paris</span></div>
      </div>`;

    // titre courant (running head) des pages intérieures
    if (body.dataset.run) {
      $('#header').insertAdjacentHTML('afterend', `<div class="runhead"><div class="wrap"><span>LIBRERY — ${esc(body.dataset.run)}</span></div></div>`);
    }

    const msgs = $$('#announce span'); let am = 0;
    if (msgs.length > 1) setInterval(() => { msgs[am].classList.remove('is-on'); am = (am + 1) % msgs.length; msgs[am].classList.add('is-on'); }, 4500);

    const dr = $('#drawer');
    $('#menu-btn').addEventListener('click', () => { dr.classList.add('is-open'); dr.setAttribute('aria-hidden', 'false'); });
    $('#close-nav').addEventListener('click', () => { dr.classList.remove('is-open'); dr.setAttribute('aria-hidden', 'true'); });

    // en-tête transparent sur l'image d'accueil, masqué en descendant ;
    // l'ouverture au défilement de l'accueil (.entete, initEntete) règle elle-même la transparence : tant que le film couvre le haut de l'écran
    const header = $('#header'); const over = body.classList.contains('page-home'), entete = $('.entete');
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY, hero = $('.s-hero');
      if (!entete) {
        const top = over && hero && y < hero.offsetHeight - 80;
        header.classList.toggle('is-top', !!top);
        header.classList.toggle('is-solid', over && !top);
      }
      header.classList.toggle('is-hidden', y > 500 && y > lastY + 4 && !$('.has-sub:hover'));
      if (y < lastY - 4) header.classList.remove('is-hidden');
      lastY = y;
    };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  function renderFooter() {
    const host = $('#site-footer'); if (!host) return;
    host.innerHTML = `
      <section class="block" aria-label="Services"><div class="wrap">
        ${page === 'services' ? '' : `<div class="services">${SERVICES.map(x => `<a href="/services">${icon(x.i)}<b>${x.t}</b><span>${x.d}</span></a>`).join('')}</div>`}
        ${$('main form[data-news]') ? '' : `<div class="letter"${page === 'services' ? '' : ' style="margin-top:56px"'}>
          <div><h2 class="h2">Lettre de la maison</h2><p>Les nouveaux chapitres avant tout le monde, et un 2 ml glissé dans votre première commande.</p></div>
          <form class="field-line" data-news><input type="email" required placeholder="Votre adresse e-mail" aria-label="Votre adresse e-mail"><button>S’inscrire</button></form>
        </div>`}
      </div></section>
      <footer class="footer"><div class="wrap">
        <div class="footer__top">
          <p class="footer__claim">La bibliothèque olfactive, où chaque fragrance se fait récit et chaque note, <em>un souvenir</em>.</p>
          <div class="footer__contact"><span>Maison de parfum, Paris</span>
            <a href="/contact">Écrire à la maison</a><a href="/points-de-vente">Nos points de vente</a><a href="/services">Services</a></div>
        </div>
        <div class="footer__cols">
          <div><h4>Bibliothèque</h4><ul>
            <li><a href="/collection?c=skin-obsession">Skin Obsession</a></li>
            <li><a href="/collection?c=summer-vibes">Summer Vibes</a></li>
            <li><a href="/collection?c=coffrets">Coffrets</a></li>
            <li><a href="/bibliotheque#familles">Par famille</a></li></ul></div>
          <div><h4>La maison</h4><ul>
            <li><a href="/preface">La Préface</a></li>
            <li><a href="/preface#parfumeurs">Les parfumeurs</a></li>
            <li><a href="/lexique">Le Lexique</a></li>
            <li><a href="${CATALOGUE_URL}">Le catalogue</a></li></ul></div>
          <div><h4>Choisir</h4><ul>
            <li><a href="/portrait-olfactif">Portrait olfactif</a></li>
            <li><a href="/produit?p=coffret-decouverte">Coffret Découverte</a></li>
            <li><a href="/offrir">Offrir</a></li></ul></div>
          <div><h4>Extraits de parfum</h4><ul>
            <li><a href="/lexique#concentration">Concentrés à 25 %</a></li>
            <li><a href="/services">Un 2 ml avec chaque flacon</a></li>
            <li><a href="/services">Livraison offerte dès 100 €</a></li></ul></div>
        </div>
        <a href="/" class="footer__mark" aria-label="LIBRERY, accueil">${LOGO_SVG}</a>
        <div class="footer__pay"><span>Paiement sécurisé</span><ul aria-label="Moyens de paiement acceptés">${typeof PAY_LOGOS !== 'undefined' ? PAY_LOGOS.map(payBadge).join('') : ''}</ul></div>
        <div class="footer__legal"><span>© LIBRERY ${new Date().getFullYear()} · Maison fondée à Paris par Bey Rafik</span><span><a href="#" data-toast="Pages légales reprises de Shopify">CGV</a> · <a href="#" data-toast="Pages légales reprises de Shopify">Mentions légales</a> · <a href="#" data-toast="Pages légales reprises de Shopify">Confidentialité</a></span></div>
      </div></footer>`;
  }

  /* ------------------------------------------------------------------ */
  /* Panier : essayer d'abord, 2 échantillons au choix                  */
  /* ------------------------------------------------------------------ */
  const CART_KEY = 'librery-cart-v2', EXTRA_KEY = 'librery-cart-extras';
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  let cart = load(CART_KEY, []);
  let extras = { samples: (load(EXTRA_KEY, {}).samples || ['', '']) };
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} renderCart(); };
  const saveExtras = () => { try { localStorage.setItem(EXTRA_KEY, JSON.stringify(extras)); } catch (e) {} };

  function addToCart(handle, fmtId, sel) {
    const key = sel ? sel.join(',') : '';
    const line = cart.find(l => l.h === handle && l.f === fmtId && (l.sel || []).join(',') === key);
    if (line) line.q += 1; else cart.push(sel ? { h: handle, f: fmtId, q: 1, sel } : { h: handle, f: fmtId, q: 1 });
    saveCart(); openCart();
  }
  function renderCartShell() {
    body.insertAdjacentHTML('beforeend', `
      <div class="overlay" id="overlay"></div>
      <aside class="cart" id="cart" aria-label="Panier" aria-hidden="true">
        <div class="cart__head"><h3>Panier</h3><button id="close-cart">Fermer</button></div>
        <div class="cart__ship" id="cart-ship"></div>
        <div class="cart__items" id="cart-items"></div>
        <div class="cart__foot" id="cart-foot"></div>
      </aside>
      <div class="toast" id="toast" role="status"></div>`);
    $('#overlay').addEventListener('click', closeAll);
    $('#close-cart').addEventListener('click', closeAll);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
  }
  function openCart() { $('#cart').classList.add('is-open'); $('#overlay').classList.add('is-open'); $('#cart').setAttribute('aria-hidden', 'false'); }
  function closeAll() { $('#cart')?.classList.remove('is-open'); $('#overlay')?.classList.remove('is-open'); $('#cart')?.setAttribute('aria-hidden', 'true'); $('#drawer')?.classList.remove('is-open'); }

  function renderCart() {
    // ci = index réel dans `cart` (une ligne dont le produit n'existe plus est ignorée sans décaler les boutons)
    const items = cart.map((l, ci) => {
      const p = byHandle(l.h); if (!p) return null;
      const f = formatsOf(p).find(x => x.id === l.f) || formatsOf(p)[0];
      return { ...l, ci, p, fmt: f, total: f.price * l.q };
    }).filter(Boolean);
    const total = items.reduce((s, i) => s + i.total, 0);
    $$('[data-cart-count]').forEach(el => el.textContent = items.reduce((s, i) => s + i.q, 0));
    if (!$('#cart-items')) return;

    const left = Math.max(0, FREE_SHIPPING - total);
    $('#cart-ship').innerHTML = (left > 0 ? `Encore ${eur(left)} pour la livraison offerte` : 'Livraison offerte')
      + `<div class="bar"><span style="width:${Math.min(100, total / FREE_SHIPPING * 100)}%"></span></div>`;

    // échantillons présélectionnés parmi les parfums absents du panier
    if (items.length && !extras.samples.every(Boolean)) {
      const inCart = items.map(i => i.h);
      const pool = PRODUCTS.filter(p => !p.type && !inCart.includes(p.handle)).sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      extras.samples = extras.samples.map((v, k) => v || (pool[k] ? pool[k].handle : ''));
      saveExtras();
    }
    const tryFirst = [...new Set(items.filter(i => ['100', '30'].includes(i.f)).map(i => i.p))];
    const perfumes = PRODUCTS.filter(p => !p.type);
    const opt = v => perfumes.map(p => `<option value="${p.handle}" ${v === p.handle ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
    // vignette 72 × 90 au nombre d'or : le packshot du format choisi (30 ml, version du coffret)
    const thumb = (p, f) => packPic(f === '30' && p.pack30 ? p.pack30 : (p.fmtImages && p.fmtImages[f] || [])[0] || p.pack || p.card, '', '72px', '', true);

    $('#cart-items').innerHTML = items.length ? items.map(i => `
      <div class="line">
        <span class="line__img">${thumb(i.p, i.fmt.id)}</span>
        <div><div class="line__name">${nm(i.p.name)}</div><div class="line__var">${esc(i.fmt.label)}</div>
          ${i.sel ? `<div class="line__sel">${i.sel.map(h => esc(byHandle(h)?.name || h)).join(', ')}</div>` : ''}
          <div class="qty"><button data-q="-1" data-i="${i.ci}" aria-label="Retirer un">−</button><span>${i.q}</span><button data-q="1" data-i="${i.ci}" aria-label="Ajouter un">+</button></div></div>
        <div class="line__right"><span>${eur(i.total)}</span><button data-rm="${i.ci}">Retirer</button></div>
      </div>`).join('') + tryFirst.map(p => `
      <div class="line line--gift">
        <span class="line__img">${thumb(p)}</span>
        <div><div class="line__name">${nm(p.name)}, 2 ml</div><div class="line__var">Pour l’essayer avant d’ouvrir le flacon</div></div>
        <div class="line__right"><span>Offert</span></div>
      </div>`).join('') + `
      <div class="cart__opts">
        <div class="cart__opt"><span class="ui">Vos deux échantillons offerts (modifiables)</span>
          <div class="cart__selects"><select data-sample="0" aria-label="Premier échantillon">${opt(extras.samples[0])}</select><select data-sample="1" aria-label="Second échantillon">${opt(extras.samples[1])}</select></div></div>
      </div>`
      : `<div class="cart__empty"><p>Votre panier est vide.</p><a class="btn btn--line" href="/bibliotheque">Voir les parfums</a>
          <p class="pdp__small" style="margin-top:24px">Vous hésitez ? <a class="tlink" href="/portrait-olfactif">Portrait olfactif</a></p></div>`;
    $('#cart-foot').innerHTML = items.length ? `
      <div class="cart__total"><span>Sous-total</span><span>${eur(total)}</span></div>
      <small>Taxes incluses · paiement en 3 fois possible · retours offerts sous 30 jours</small>
      <button class="btn btn--block" data-toast="Le paiement sera celui de Shopify">Commander</button>` : '';

    $$('#cart-items [data-q]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i; cart[i].q += +b.dataset.q; if (cart[i].q < 1) cart.splice(i, 1); saveCart(); }));
    $$('#cart-items [data-rm]').forEach(b => b.addEventListener('click', () => { cart.splice(+b.dataset.rm, 1); saveCart(); }));
    $$('#cart-items [data-sample]').forEach(el => el.addEventListener('change', () => { extras.samples[+el.dataset.sample] = el.value; saveExtras(); }));
    bindToasts($('#cart-foot'));
  }

  let toastTimer;
  function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('is-in'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-in'), 2400); }
  function bindToasts(root = document) {
    $$('[data-toast]', root).forEach(el => { if (el.dataset.tb) return; el.dataset.tb = 1; el.addEventListener('click', e => { e.preventDefault(); toast(el.dataset.toast); }); });
  }

  /* ------------------------------------------------------------------ */
  /* Carte produit : packshot 100 ml ; au survol, la mise en situation   */
  /* s'ouvre en fondu avec un lent travelling (ou joue la vidéo) ;       */
  /* survoler « 30 ml » montre le flacon de voyage. Mobile : on glisse.  */
  /* ------------------------------------------------------------------ */
  const S_CARD = '(max-width: 800px) 50vw, 33vw';
  function card(p) {
    const f = formatsOf(p), isPerfume = !p.type;
    const f30 = f.find(x => x.id === '30');
    const scene = p.video
      ? `<video class="card__scene" src="${p.video}" poster="${src(p.scene)}" muted loop playsinline preload="none"></video>`
      : p.scene ? packPic(p.scene, '', S_CARD, 'card__scene') : '';
    const prices = isPerfume
      ? `<span class="card__fmts"><span>${f[0].label} — ${eur(f[0].price)}</span>${f30 && p.pack30 ? `<span class="card__f30" data-f30>${f30.label} — ${eur(f30.price)}</span>` : ''}</span>`
      : `<span class="card__meta">${esc(p.subtitle || p.type)} — dès ${eur(minPrice(p))}</span>`;
    return `
      <a class="card" href="/produit?p=${p.handle}">
        <div class="card__media">
          <div class="card__track">
            <div class="card__slide">${packPic(p.pack || p.card, p.name, S_CARD)}${p.pack30 ? packPic(p.pack30, '', S_CARD, 'card__30') : ''}</div>
            ${scene ? `<div class="card__slide card__slide--scene">${scene}</div>` : ''}
          </div>
          ${scene ? '<span class="card__dots" aria-hidden="true"><i class="on"></i><i></i></span>' : ''}
        </div>
        <div class="card__body">
          ${p.isNew ? '<span class="card__flag">Nouveauté</span>' : p.exclusive ? '<span class="card__flag">Exclusivité site</span>' : ''}
          <h3 class="card__name">${nm(p.name)}</h3>
          ${isPerfume && p.keyNotes ? `<span class="card__notes">${esc(p.keyNotes.replace(/ · /g, ', '))}</span>` : ''}
          ${prices}
        </div>
      </a>`;
  }
  /* comportements des cartes : vidéo au survol, 30 ml, points du glisser mobile */
  function bindCards() {
    document.addEventListener('mouseover', e => {
      const c = e.target.closest && e.target.closest('.card'); if (!c || c.contains(e.relatedTarget)) return;
      const v = $('video', c); if (v) v.play().catch(() => {});
    });
    document.addEventListener('mouseout', e => {
      const c = e.target.closest && e.target.closest('.card'); if (!c || c.contains(e.relatedTarget)) return;
      const v = $('video', c); if (v) v.pause(); c.classList.remove('show-30');
    });
    document.addEventListener('mouseover', e => { const t = e.target.closest && e.target.closest('[data-f30]'); if (t) t.closest('.card').classList.add('show-30'); });
    document.addEventListener('mouseout', e => { const t = e.target.closest && e.target.closest('[data-f30]'); if (t && !t.contains(e.relatedTarget)) t.closest('.card').classList.remove('show-30'); });
    document.addEventListener('scroll', e => {
      const t = e.target; if (!t.classList || !t.classList.contains('card__track')) return;
      const i = Math.round(t.scrollLeft / t.clientWidth);
      $$('.card__dots i', t.parentElement).forEach((d, k) => d.classList.toggle('on', k === i));
    }, true);
  }
  /* tuile éditoriale dans une grille (même gabarit qu'une carte) */
  const tile = (href, img, title, meta) => `
      <a class="card tile" href="${href}"><div class="card__media">${packPic(img, '', S_CARD)}</div>
        <div class="card__body"><h3 class="card__name">${title}</h3><span class="card__meta">${meta}</span></div></a>`;
  /* grande tuile sur deux colonnes : l'image de campagne dans la grille */
  const wideTile = (key, img) => { const c = COLLECTIONS[key]; return c && c.wide ? `
      <a class="card tile card--wide" href="/collection?c=${key}"><div class="card__media">${pic(img || c.wide, c.title, '(max-width: 800px) 100vw, 66vw')}</div>
        <div class="card__body"><span class="card__flag">${esc(c.chapter)}</span><h3 class="card__name">${nm(c.title)}</h3><span class="card__meta">Lire le chapitre</span></div></a>` : ''; };
  /* mosaïque de trois images (bloc « image-mosaic » dans Shopify), composée au nombre d'or et en cascade verticale :
     les images ne sont jamais sur la même ligne, chacune sous la précédente. A = φ × B = φ × C ; A à gauche sous le filet du haut,
     B à droite sous A, C au centre sous B (le regard tourne vers le centre, comme la spirale d'or) ; le titre à droite de A,
     l'épigraphe à droite de C. La cascade est un volume : un quadrillage au trait (plan de face, mur du fond, parois, plafond
     et sol qui fuient vers le point de fuite) se trace au défilement, et chaque image traverse la profondeur jusqu'à sa case.
     Le quadrillage (.ed-grid) est tracé par initEdito sur la mise en page mesurée. */
  const edLine = (html, i, cls = '') => `<span class="ed-l${cls}"><span class="ed-i" style="--i:${i}">${html}</span></span>`;
  const mosaic = key => { const c = COLLECTIONS[key]; if (!c || !c.mosaic) return '';
    const fig = ([img, cap], i) => `<figure class="ed-f ed-f--${'abc'[i]}"><div class="ed-fr">${pic(img, cap, i ? '(max-width: 800px) 62vw, 22vw' : '(max-width: 800px) 86vw, 36vw')}</div>
        <figcaption class="ed-cap"><span class="folio">0${i + 1}</span><i></i><span>${esc(cap)}</span></figcaption></figure>`;
    // au bout de la cascade, à côté de C : l'épigraphe de la collection (une phrase, deux si la première est brève)
    const s = (c.epigraph || '').split(/(?<=[.!?])\s+/), q = s[0] && s[0].length < 30 && s[1] ? s.slice(0, 2) : s.slice(0, 1);
    return `<div class="ed-c ed-cas"><div class="ed-mos" data-ed>
      <div class="ed-grid" aria-hidden="true"></div>
      <div class="ed-head ed-rv">${edLine(esc(c.chapter), 0, ' ed-k')}<h2 class="h2">${edLine('La campagne', 1)}${edLine(`<em>${esc(c.title)}</em>`, 2)}</h2></div>
      ${c.mosaic.slice(0, 3).map(fig).join('')}
      ${q[0] ? `<p class="ed-q">${q.map((t, i) => edLine(t, i)).join('')}</p>` : ''}</div></div>`; };
  // le Coffret à composer est en pause (12/10) : la tuile « essayer en 2 ml » mène au Coffret Découverte
  const trialTile = (img = 'discovery-2ml-ouvert') => tile('/produit?p=coffret-decouverte', img, 'Coffret <em>Découverte</em>', 'Les huit parfums en 2 ml — 40 €');
  const storesTile = () => tile('/points-de-vente', 'bouchons-or', 'Nos <em>adresses</em>', `${STORES.length} adresses où nos récits prennent vie`);
  const quizTile = () => tile('/portrait-olfactif', 'portrait-profil', 'Portrait <em>olfactif</em>', 'Quatre questions pour trouver votre parfum');

  /* mobile, deux colonnes : si le nombre de cartes simples est impair, la première passe en pleine largeur (pas d'orpheline) */
  function balanceGrids(root = document) {
    $$('.grid:not(.grid--rail)', root).forEach(g => {
      const singles = [...g.children].filter(c => !c.classList.contains('card--wide')).length;
      g.classList.toggle('grid--lead', singles % 2 === 1);
    });
  }
  function accordions(root = document) {
    $$('.acc > button', root).forEach(b => { if (b.dataset.bound) return; b.dataset.bound = 1; b.addEventListener('click', () => { const o = b.parentElement.classList.toggle('is-open'); b.setAttribute('aria-expanded', o); }); });
  }
  function newsletters() {
    $$('form[data-news]').forEach(f => { if (f.dataset.bound) return; f.dataset.bound = 1; f.addEventListener('submit', e => { e.preventDefault(); f.insertAdjacentHTML('afterend', '<p class="ok">Merci, à très bientôt.</p>'); f.remove(); }); });
  }

  /* Mise en page éditoriale au défilement (mosaïques, images de campagne, préface, parfumeur).
     [data-ed] = une scène, suivie tant qu'elle est près de l'écran ; on y écrit trois nombres :
       --p  0 → 1   traversée de l'écran (le haut entre en bas → le bas sort en haut) : les filets se tracent
       --t  1 → 0 → −0,3  adouci, 0 quand la scène est centrée : chaque cadre (.ed-f) est alors exactement à sa place
       --e  1 → 0   de l'entrée au centre : l'image se pose dans son cadre (1,08 → 1)
     Le CSS fait tout le mouvement (translate, scale) ; une lecture par scène et par image, jamais après une écriture.
     Écran étroit : les cadres sont empilés, chacun suit sa propre traversée.
     .ed-rv : apparition unique à l'entrée (cadre démasqué depuis son filet, textes ligne à ligne) ;
     ce qui est déjà à l'écran au lancement reste tel quel — sans JS, la mise en page finale.
     Mosaïque en cascade (.ed-cas → .ed-seq.ed-3d) : rien n'est tenu à l'écran, on descend le long de la cascade, qui est un volume.
     La scène porte la perspective ; son point de fuite suit le centre de l'écran (--oy), si bien que tout ce qui est en profondeur
     glisse moins vite que le plan de face (parallaxe vraie). Un quadrillage au trait la structure : plan de face (où les images se
     posent), mur du fond, parois, plafond et sol qui fuient vers le point de fuite. Une ligne de lecture (R, aux 7/10 de l'écran)
     le trace : les verticales la suivent, chaque horizontale se trace quand elle l'atteint, le fond et les fuyantes juste après.
     Chaque image voyage sur l'axe Z au fil du défilement : elle sort du fond (petite, tournée vers le centre), s'ouvre (.is-in :
     masque ouvert depuis le haut), avance jusqu'à sa case du plan de face où elle se pose, à plat, quand elle est au centre
     de l'écran (sa légende vient alors, .is-set), puis passe un peu en avant en sortant par le haut. L'épigraphe vient quand la
     ligne de lecture atteint la ligne d'or de C (.is-end). Ce qui est tracé ou ouvert le reste : un élément ne se réarme qu'une
     fois sorti par le bas de l'écran (on remonte sans rien voir se défaire). */
  function initEdito() {
    if (!('IntersectionObserver' in window && 'ResizeObserver' in window)) return;
    const narrow = matchMedia('(max-width: 800px)'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const live = new Set(); let raf = 0, pend = 0;
    const put = (el, k, v) => { v = v.toFixed(4); if (el['_' + k] !== v) { el['_' + k] = v; el.style.setProperty(k, v); } };
    const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;
    const write = (el, top, h, vh) => {
      const p = cl((vh - top) / (vh + h)), c = 1 - 2 * p, s = cl((p - .06) / .44);
      put(el, '--p', p); put(el, '--t', c > 0 ? c * c : -.3 * c * c); put(el, '--e', 1 - s * s * (3 - 2 * s));   // ralentit jusqu'à se poser, puis dérive à peine
    };
    // cascade en volume : le quadrillage, relevé en pixels dans la scène (hors transformations).
    //  · plan de face : verticales sur les bords des cases (0, bords des images, colonne du titre, largeur) ; horizontales du cadre
    //    (haut, bas) et au pied de chaque image (sa légende y est suspendue) ; sa ligne d'or en or. Un trait ne traverse jamais
    //    une image ni un texte : il s'interrompt sur sa case (la case vide attend son image) et autour des lignes de texte.
    //  · mur du fond (z = −D) : son cadre et les mêmes rangs ; parois gauche et droite : ces rangs fuient du plan de face au fond ;
    //    plafond et sol : les verticales intérieures de même ; parois, plafond et sol recoupés aux profondeurs d'or.
    // Chaque trait : y (seuil dans la scène), lag (retard, en part d'écran), len (longueur de tracé : en pixels pour les
    // verticales, dont la pointe suit la ligne de lecture ; sinon en part d'écran). Écran étroit : volume moins profond.
    const box = el => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    const lattice = s => {
      const g = $('.ed-grid', s); if (!g) return;
      // écran étroit : volume moins profond — le mur du fond (réduit à P/(P+D) ≈ 0,79 de la largeur) tombe alors à bonne
      // distance du bord droit de A (0,854) et du cadre, au lieu de doubler l'un d'eux
      const W = s.clientWidth, H = s._H = s.clientHeight, sm = s._solo, D = sm ? 260 : 900, P = s._P = sm ? 950 : 1500, R = Math.round;
      const B = s._items.map(it => box(it.el)), q = s._q = $('.ed-q', s), hd = $('.ed-head', s);
      s.style.setProperty('--P', P + 'px'); s.style.setProperty('--D', D + 'px');
      // obstacles : les images (exactes) et les blocs de texte (l'étendue de leurs lignes, avec de l'air)
      const rel = el => { let x = 0, y = 0, e = el; while (e && e !== s) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
      const text = el => { const r = el ? $$('.ed-i', el).map(rel) : []; if (!r.length) return [];
        const x0 = Math.min(...r.map(b => b.x)), y0 = Math.min(...r.map(b => b.y)), x1 = Math.max(...r.map(b => b.x + b.w)), y1 = Math.max(...r.map(b => b.y + b.h));
        return [{ x: x0 - 18, y: y0 - 12, w: x1 - x0 + 36, h: y1 - y0 + 28 }]; };   // 16 px dessous : les lignes y montent de 14 px
      const caps = $$('.ed-cap', s).map(rel).map(b => ({ x: b.x - 12, y: b.y - 10, w: b.w + 24, h: b.h + 20 }));   // les légendes (folio compris)
      const obs = [...B.map(b => ({ x: b.x + 1, y: b.y + 1, w: b.w - 3, h: b.h - 3 })), ...text(hd), ...text(q), ...caps];
      const cut = (a0, a1, ins) => { let segs = [[a0, a1]];      // [a0, a1] privé des intervalles ins
        ins.forEach(([c0, c1]) => { segs = segs.flatMap(([u, v]) => c1 <= u || c0 >= v ? [[u, v]] : [[u, c0], [c1, v]].filter(([p, r]) => r - p > 0)); });
        return segs.filter(([u, v]) => v - u >= 10); };
      const xs = [0, W - 1, hd ? hd.offsetLeft : 0, ...B.flatMap(b => [b.x, b.x + b.w - 1])].map(R)
        .sort((a, b) => a - b).filter((x, i, a) => !i || x - a[i - 1] > 3);
      const rows = [0, ...B.map(b => b.y + b.h - 1), H - 1].map(R);
      const pl = { f: [], b: [], w: [] }, add = (k, cls, st, y, lag, len) => pl[k].push([`<i class="ed-g ${cls}" style="${st}"></i>`, { y, lag, len }]);
      // plan de face. Une verticale posée sur le bord d'une image s'interrompt aussi sur la hauteur de sa case, avec de l'air
      // au-dessus : l'image en profondeur glisse vers le point de fuite et sort de sa case (son haut apparent passe au-dessus) ;
      // posée, c'est son bord qui prolonge le trait.
      const vob = x => [...obs.filter(o => x > o.x && x < o.x + o.w), ...B.filter(b => x >= b.x - 2 && x <= b.x + b.w + 1).map(b => ({ y: b.y - 40, h: b.h + 42 }))];
      xs.forEach(x => cut(0, H, vob(x).map(o => [o.y, o.y + o.h]))
        .forEach(([y0, y1]) => add('f', 'ed-g--v', `left:${x}px;top:${R(y0)}px;height:${R(y1 - y0)}px`, y0, 0, -(y1 - y0))));
      const hline = (y, cls, side, lag, len) => cut(0, W, obs.filter(o => y > o.y && y < o.y + o.h).map(o => [o.x, o.x + o.w]))
        .forEach(([x0, x1]) => add('f', 'ed-g--h' + cls, `left:${R(x0)}px;top:${y}px;width:${R(x1 - x0)}px;--o:${side(x0, x1) ? '100%' : '0%'}`, y, lag, len));
      const near = c => (x0, x1) => Math.abs(x1 - c) < Math.abs(x0 - c);        // chaque trait se trace depuis son image
      rows.forEach((y, i) => { const b = B[i - 1]; hline(y, '', near(b ? b.x + b.w / 2 : 0), 0, .24); });
      B.forEach(b => hline(R(b.y + b.h * .618034), ' ed-g--au', near(b.x + b.w / 2), .02, .3));
      // mur du fond, parois, plafond et sol
      [0, W - 1].forEach(x => add('b', 'ed-g--v', `left:${x}px;height:${H}px`, 0, .1, -H));
      rows.forEach(y => { add('b', 'ed-g--h', `top:${y}px;width:${W}px`, y, .06, .3); [0, W - 1].forEach(x => add('w', 'ed-g--z', `left:${x}px;top:${y}px`, y, .03, .26)); });
      // écran étroit : quadrillage simplifié (ni plafond ni sol, pas de plans intermédiaires) — dans une colonne étroite et peu
      // profonde, ces traits se serreraient en faisceaux sur les bords de l'écran
      if (!sm) xs.slice(1, -1).forEach(x => { add('w', 'ed-g--y', `left:${x}px;top:0`, 0, .02, .3); add('w', 'ed-g--y', `left:${x}px;top:${H - 1}px`, H - 1, 0, .3); });
      // et le quadrillage des parois : deux plans intermédiaires, aux profondeurs d'or (D/φ², D/φ), où parois, plafond et sol se recoupent
      if (!sm) [.381966, .618034].forEach(k => { const t = `transform:translateZ(-${R(D * k)}px)`;
        [0, W - 1].forEach(x => add('w', 'ed-g--v', `left:${x}px;height:${H}px;${t}`, 0, .04 + k * .08, -H));
        [0, H - 1].forEach(y => add('w', 'ed-g--h', `top:${y}px;width:${W}px;${t}`, y, .02 + k * .06, .3)); });
      const html = k => `<div class="ed-pl ed-pl--${k}">${pl[k].map(a => a[0]).join('')}</div>`;
      g.innerHTML = html('f') + html('b') + html('w');
      const els = $$('.ed-g', g);
      s._g = [...pl.f, ...pl.b, ...pl.w].map((a, i) => Object.assign(a[1], { el: els[i] }));
      // le voyage de chaque image : profondeur d'arrivée (dans le volume, devant le fond), avancée en sortant, côté vers lequel elle se tourne
      s._items.forEach((it, i) => { const b = B[i];
        Object.assign(it, { fr: $('.ed-fr', it.el), side: b.x + b.w / 2 < W / 2 ? 1 : -1, zin: D * [.84, .96, .9][i % 3], zout: (sm ? 50 : 160) * [1, 1.2, .8][i % 3] }); });
      const C = B[B.length - 1]; if (q && C) { s._qy = C.y + C.h * .618034; s._qt = q.offsetTop; }   // l'épigraphe, sur la ligne d'or de C
    };
    // position de chaque cadre dans sa scène (hors transformations), relevée seulement quand la scène change de taille
    const measure = s => {
      s._solo = narrow.matches;
      s._items = $$('.ed-f', s).filter(f => f.offsetParent === s).map(f => ({ el: f, top: f.offsetTop, h: f.offsetHeight }));
      if ((s._cas = !!s.closest('.ed-cas'))) { s.classList.toggle('ed-seq', !still); s.classList.toggle('ed-3d', !still); lattice(s); return; }
      if (!s._solo) s._items.forEach(({ el }) => ['--p', '--t', '--e'].forEach(k => { el.style.removeProperty(k); el['_' + k] = null; }));
    };
    // tracé gardé : ce qui est passé sous la ligne de lecture reste tracé, sauf une fois redescendu sous l'écran
    const keep = (el, v, y, vh) => { if (y <= vh) v = Math.max(v, el._k || 0); put(el, '--dr', el._k = v); };
    const flag = (el, cls, on, y, vh) => { const k = '_' + cls; if (el[k] ? y > vh : on) el.classList.toggle(cls, el[k] = !el[k]); };
    const cascade = (s, top, vh) => {
      if (!s._g) return;
      // le point de fuite suit le centre de l'écran, borné à la hauteur de la scène : l'œil reste dans le volume, et rien de ce qui
      // est en profondeur ne déborde au-dessus ou au-dessous du bloc
      const r = vh * .7 - top, P = s._P, sm = s._solo, oy = Math.min(s._H, Math.max(0, vh / 2 - top)), o = top + oy, oyp = oy.toFixed(1) + 'px';
      if (s._oy !== oyp) s.style.setProperty('--oy', s._oy = oyp);
      s._g.forEach(l => keep(l.el, cl((r - l.y - l.lag * vh) / (l.len < 0 ? -l.len : l.len * vh)), top + l.y, vh));
      // a : écart du centre de l'image au centre de l'écran (en hauteurs d'écran). Arrivée (a de 0,94 à 0,04) : du fond jusqu'au
      // plan de face, en ralentissant ; repos à plat autour du centre ; sortie (a < −0,1) : un peu en avant, le haut vers soi.
      s._items.forEach(it => {
        const a = (top + it.top + it.h / 2 - vh / 2) / vh, f = cl((a - .04) / .9), x = cl((-.1 - a) / .8), e = f * f * (3 - 2 * f), z = it.zout * x * x - it.zin * e;
        // écran étroit : une colonne serrée, la profondeur ne doit pas remonter l'image sur la légende du dessus ; on compense
        // l'essentiel de sa convergence verticale vers le point de fuite (elle reste petite et tournée, puis grandit en place)
        const ty = sm ? (it.top + it.h / 2 - oy) * Math.max(0, -z) / P * .75 : 0;
        const tf = `translate3d(0, ${ty.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${((sm ? 4 : 7) * e - 3 * x * x).toFixed(2)}deg) rotateY(${(it.side * (sm ? 6 : 11) * e).toFixed(2)}deg)`;
        if (it._tf !== tf) it.fr.style.transform = it._tf = tf;
        const yt = o + (top + it.top + ty - o) * P / (P - z);              // haut apparent (la perspective le rapproche du point de fuite)
        flag(it.el, 'is-in', yt < vh * .94, yt, vh);
        flag(it.el, 'is-set', f < .2, top + it.top, vh);
      });
      if (s._q) flag(s, 'is-end', top + s._qy < vh * .64, top + s._qt, vh);
    };
    const paint = list => {
      if (still) return; const vh = innerHeight, rects = list.map(s => s.getBoundingClientRect());   // toutes les lectures, puis les écritures
      list.forEach((s, n) => {
        const r = rects[n];
        if (s._cas) return cascade(s, r.top, vh);
        write(s, r.top, r.height, vh);
        if (s._solo) s._items.forEach(it => write(it.el, r.top + it.top, it.h, vh));   // écran étroit : chaque cadre suit sa propre traversée
      });
    };
    const frame = () => { raf = 0; paint([...live].filter(s => s.isConnected)); };
    const kick = () => { if (!raf && live.size && !still) raf = requestAnimationFrame(frame); };
    const io = new IntersectionObserver(es => {
      es.forEach(e => { e.target.classList.toggle('ed-live', e.isIntersecting); live[e.isIntersecting ? 'add' : 'delete'](e.target); });
      kick();
    }, { rootMargin: '30% 0px' });
    const ro = new ResizeObserver(es => { es.forEach(e => measure(e.target)); kick(); });
    const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('ed-in'); rv.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    const scan = () => {
      // même vocabulaire pour les blocs rendus ailleurs : tuiles de campagne des grilles, portrait du parfumeur (fiche)
      $$('.card--wide:not([data-ed])').forEach(c => {
        c.dataset.ed = ''; c.classList.add('ed-rv'); $('.card__media', c)?.classList.add('ed-fr');
        $$('.card__body > *', c).forEach((x, i) => { x.classList.add('ed-r'); x.style.setProperty('--i', i + 2); });
      });
      $$('.perfumer:not([data-ed])').forEach(s => {
        s.dataset.ed = ''; $('figure', s)?.classList.add('ed-f', 'ed-fr', 'ed-rv');
        const t = $(':scope > div', s); if (t) { t.classList.add('ed-rv'); [...t.children].forEach((x, i) => { x.classList.add('ed-r'); x.style.setProperty('--i', i); }); }
      });
      const news = $$('[data-ed]:not(.ed-on)');
      news.forEach(s => { s.classList.add('ed-on', 'ed-now'); measure(s); io.observe(s); ro.observe(s); });
      paint(news);                 // en place dès la première image (rechargement au milieu de la page : pas de saut)
      requestAnimationFrame(() => requestAnimationFrame(() => news.forEach(s => s.classList.remove('ed-now'))));
      const fresh = $$('.ed-rv:not(.ed-pre):not(.ed-in)'), vh = innerHeight, tops = fresh.map(el => el.getBoundingClientRect().top);
      fresh.forEach((el, n) => { if (tops[n] < vh * .9) el.classList.add('ed-in'); else { el.classList.add('ed-pre'); rv.observe(el); } });
    };
    scan();
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick);   // la ligne de lecture dépend de la hauteur d'écran (les tailles : ResizeObserver)
    narrow.addEventListener('change', () => { $$('.ed-on').forEach(measure); kick(); });
    // grilles re-rendues (filtres de la bibliothèque…) : on habille les nouveaux blocs
    new MutationObserver(() => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; scan(); }); }).observe($('main') || body, { childList: true, subtree: true });
  }

  /* ================================================================== */
  /* Pages                                                              */
  /* ================================================================== */
  function initHome() {
    const so = $('#so-grid'), sv = $('#sv-grid'); if (!so) return;
    so.innerHTML = PRODUCTS.filter(p => p.collection === 'skin-obsession').map(card).join('');
    const svp = PRODUCTS.filter(p => p.collection === 'summer-vibes').map(card);
    sv.innerHTML = svp.slice(0, 3).join('') + wideTile('summer-vibes', 'hero-summer') + svp.slice(3).join('') + trialTile() + quizTile();
    $$('[data-mosaic]').forEach(el => { el.innerHTML = mosaic(el.dataset.mosaic); });
    const sh = $('#shelf');
    if (sh) sh.innerHTML = SHELF.map(m => { const p = byHandle(m.h); return `<a class="shelf__item" href="/produit?p=${m.h}"><figure>${pic(m.img, m.t, '(max-width: 800px) 62vw, 22vw')}</figure>
        <span class="fig">${esc(m.t)}</span><span class="shelf__name">${nm(p.name)}</span></a>`; }).join('');
    $$('[data-shelf]').forEach(b => b.addEventListener('click', () => sh.scrollBy({ left: +b.dataset.shelf * (sh.clientWidth + 20) / 2, behavior: 'smooth' })));
  }

  /* Diaporama d'ouverture : fondu + lent zoom, une barre de progression par image,
     glisser au doigt, pause quand l'onglet est caché, aucun défilement automatique si l'utilisateur réduit les animations */
  function initHero() {
    const h = $('[data-hero]'); if (!h) return;
    const slides = $$('.s-hero__slide', h), bars = $$('.s-hero__bars button', h), link = $('[data-hero-link]', h);
    const DUR = 6500, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0, t0 = performance.now(), paused = false, pauseAt = 0;
    const go = n => {
      i = (n + slides.length) % slides.length; t0 = performance.now();
      slides.forEach((s, k) => s.classList.toggle('is-on', k === i));
      bars.forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.firstChild.style.width = k < i ? '100%' : '0%'; });
      const d = slides[i].dataset; h.querySelector('.s-hero__side').classList.add('is-swap');
      setTimeout(() => { link.href = d.href; link.textContent = d.label; h.querySelector('.s-hero__side').classList.remove('is-swap'); }, 350);
    };
    bars.forEach((b, k) => b.addEventListener('click', () => go(k)));
    const tick = now => {
      if (!paused && !still) {
        const p = Math.min(1, (now - t0) / DUR);
        bars[i].firstChild.style.width = (p * 100) + '%';
        if (p >= 1) go(i + 1);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { paused = true; pauseAt = performance.now(); } else { t0 += performance.now() - pauseAt; paused = false; } });
    let x0 = null;
    h.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    h.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 45) go(i + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  /* Ouverture de l'accueil au défilement — variante A1 « La donne » (validée le 13/10 ; Shopify : section « hero-scroll »).
     Le film Skin Obsession part plein cadre, comme avant (logo, lien, Pause). Au défilement, il recule en tirage paysage φ:1 ;
     les photos des trois parfums montent en tirages portrait 1:φ (le même rectangle d'or, tourné d'un quart) et s'empilent
     en croix sur lui. Puis la pile est distribuée : trois tirages carrés tombent exactement sur les trois colonnes de la grille
     Skin Obsession qui suit, chacun au-dessus de la carte de son parfum ; le film devient un bandeau φ³:1 sur les colonnes 2 et 3,
     la phrase se cale dans la colonne 1, au pied du bandeau ; l'air restant se partage 1:φ (dessus : dessous).
     Téléphone : la phrase, le bandeau φ²:1, le tirage de tête sur deux colonnes (φ:1) puis deux carrés, comme la grille ;
     écran bas, bandeau et tirages raccourcissent ensemble (largeurs gardées) ; téléphone couché, la phrase à côté du bandeau.
     La composition tient dans le petit écran (barres du navigateur affichées, 100svh) ; la fenêtre du film suit le grand (100lvh).
     Écran trop bas pour elle : elle garde ses proportions et déborde sous la scène, la section s'allonge d'autant (--ovf).
     Bords de colonnes et gouttière sont ceux de la vraie grille, mesurés sur elle à chaque taille d'écran.
     La scène est tenue à l'écran (sticky) pendant 420 % d'écran de défilement (hauteur fixée en CSS : aucun décalage) ;
     un seul gestionnaire de défilement, limité à une image d'écran ; transformations et opacité uniquement.
     Temps, en part du défilement : le film recule jusqu'à 0,21 ; la pile monte jusqu'à 0,58 (chaque photo part quand la précédente
     a fait 1/φ de son chemin) ; la donne part à 0,62 (le dessus d'abord) ; le film gagne sa place de 0,64 à 0,9 ; la phrase vient à 0,86.
     Animations réduites : la composition finale, immobile. */
  function initEntete() {
    const sec = $('.entete'); if (!sec) return;
    const stage = $('.entete-stage', sec), film = $('.entete-film', sec), filmIn = $('.entete-film-in', sec);
    const filmVeil = $('.entete-film > i', sec), sh = $('.entete-sh', sec), hero = $('.entete-hero', sec), cap = $('.entete-cap', sec);
    const scrims = $$('.scrim-t, .scrim-b', sec), video = $('video', film);
    const header = $('#header'), announce = $('#announce'), html = document.documentElement;
    const G = 1 / PHI, G2 = G * G;
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), seg = (p, a, b) => clamp((p - a) / (b - a));
    const lerp = (a, b, t) => a + (b - a) * t, sum = a => a.reduce((s, x) => s + x, 0), px = n => n.toFixed(2) + 'px';
    const io = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), out = t => 1 - Math.pow(1 - t, 3);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, small = matchMedia('(max-width: 800px)');
    const T0 = .21, TS = .58, DEAL = [.62, .2, .055], FILM = [.64, .9], CAP = [.86, .1], ARC = .03, LIFT = .03, KMIN = .5;
    // les photos des parfums, du dessous au dessus de la pile : image, légende, rotation (°), décalage x (part du petit côté),
    // décalage y (part du grand côté), h/l de l'image, parfum (le tirage finit au-dessus de sa carte), hauteur du point gardé au cadrage
    const MODS = [['tonka-love-mod', 'Tonka Love', 2.6, .07, -.03, 1.3427, 'tonka-love', .26],
                  ['magnetic-flowers-mod', 'Magnetic Flowers', -3.4, -.08, .025, 1.3427, 'magnetic-flowers', .34],
                  ['vanilla-plum-mod', 'Vanilla Plum', -1.6, -.02, .012, 1.3427, 'vanilla-plum', .28]];
    // vh : la scène (le grand écran, 100lvh) — fenêtre du film plein cadre, défilement ; vs : le petit écran (100svh),
    // où tient la composition ; ovf : ce qui en dépasse sous la scène quand l'écran est trop bas pour elle
    let vw = 0, vh = 0, vs = 0, ovf = 0, top0 = 0, run = 1, mobile = false, annH = 0, headerOver = true;
    sec.insertAdjacentHTML('afterbegin', '<i class="entete-svh" aria-hidden="true"></i>');
    const svh = $('.entete-svh', sec);

    // image d'attente du film, posée ici : celle du téléphone sur petit écran (le film lui-même est choisi par <source media>)
    if (video) video.poster = small.matches && video.dataset.posterM || video.dataset.poster || '';
    // « Voir la campagne » : la mosaïque de la campagne Skin Obsession, plus bas
    const camp = $('[data-mosaic="skin-obsession"]'); if (camp && !$('#campagne')) camp.id = 'campagne';

    // les tirages, décodés d'avance : aucune image blanche à leur arrivée ; la taille d'image choisie selon la densité d'écran
    // (au plus large : le tirage de tête du téléphone, ~92 % de l'écran ; sur ordinateur, une colonne de la grille)
    stage.insertAdjacentHTML('beforeend', MODS.map(([n, a]) => { const w = IMGW[n] || [670, 957];
      return `<figure class="entete-pr"><img src="${src(n)}" srcset="${src(n)} ${w[0]}w, ${src(n, 1)} ${w[1]}w" sizes="(max-width: 800px) 92vw, 31vw" alt="${esc(a)}" decoding="async"><i></i></figure>`; }).join(''));
    const els = $$('.entete-pr', stage), N = els.length;
    els.forEach(f => { if (f.firstChild.decode) f.firstChild.decode().catch(() => {}); });
    const W1 = (TS - T0) / (1 + (N - 1) * G), STEP = W1 * G;          // chaque arrivée chevauche la précédente (pas = durée / φ)
    const shF = sh.cloneNode(); sh.after(shF);                          // ombre du film à sa place finale

    /* Pause / Lecture du film devenu tirage : le bouton de l'ouverture part avec le logo, celui-ci prend le relais.
       Il vit dans la fenêtre du film (recouvert avec lui par les tirages), coin bas-droit, taille fixe : contre-mis à l'échelle. */
    film.insertAdjacentHTML('beforeend', '<button type="button" class="entete-pp"><i></i></button>');
    const pp = $('.entete-pp', film);
    const ppLabel = () => { const s = !video || video.paused; pp.classList.toggle('is-paused', s); pp.setAttribute('aria-label', s ? 'Lire le film' : 'Mettre le film en pause'); };
    if (video) { ['play', 'playing', 'pause'].forEach(e => video.addEventListener(e, ppLabel)); pp.addEventListener('click', () => { video.paused ? video.play().catch(() => {}) : video.pause(); }); }
    ppLabel();
    const ppTo = (sx, sy) => { pp.style.transform = `scale(${(1 / sx).toFixed(5)}, ${(1 / sy).toFixed(5)}) translate(-${mobile ? 10 : 14}px, -${mobile ? 10 : 14}px)`; };

    // en-tête : transparent tant que le film couvre le haut de l'écran, papier ensuite ; il descend avec la barre d'annonce
    // au lieu de la recouvrir (le lecteur du catalogue, ouvert, le règle lui-même)
    function syncHeader() {
      if (!header || html.classList.contains('lecteur-ouvert')) return;
      header.classList.toggle('is-top', headerOver);
      header.classList.toggle('is-solid', !headerOver);
      header.style.top = Math.max(0, annH - scrollY) + 'px';
    }

    /* le film : on change le cadre (x, y, l, h) de sa fenêtre par une échelle non uniforme,
       le contenu est contre-mis à l'échelle pour rester « cover », sans déformation */
    const filmAr = () => (video && video.videoWidth ? video.videoWidth / video.videoHeight : 16 / 9);
    const cover = (w, h) => { const ar = filmAr(); return Math.max(w / Math.max(vw, vh * ar), h / Math.max(vh, vw / ar)); };
    function filmTo(x, y, w, h) {
      const sx = w / vw, sy = h / vh, k = cover(w, h);
      film.style.transform = `translate3d(${px(x)}, ${px(y)}, 0) scale(${sx.toFixed(5)}, ${sy.toFixed(5)})`;
      filmIn.style.transform = `scale(${(k / sx).toFixed(5)}, ${(k / sy).toFixed(5)})`;
      ppTo(sx, sy);
      headerOver = y <= 1 && x <= 1 && x + w >= vw - 1;
    }
    const box = (el, x, y, w, h) => Object.assign(el.style, { left: px(x), top: px(y), width: px(w), height: px(h) });
    // ombre portée : dessinée à la taille de référence c, suivie par une échelle
    function shadowOn(el, x, y, w, h, c, o) {
      el.style.transform = `translate3d(${px(x)}, ${px(y)}, 0) scale(${(w / c.w).toFixed(5)}, ${(h / c.h).toFixed(5)})`;
      el.style.opacity = o.toFixed(3);
    }
    function caption(k) { cap.style.opacity = k.toFixed(3); cap.style.visibility = k > 0 ? 'visible' : 'hidden'; cap.style.transform = `translate3d(0, ${px((1 - k) * 16)}, 0)`; }
    // tirage-fenêtre : boîte de base = sa taille finale (ombre nette au repos), image à ses proportions couvrant la boîte
    function pwSetup(el, bw, bh, ar) {
      let iw = bw, ih = bw * ar; if (ih < bh) { ih = bh; iw = bh / ar; }
      box(el, 0, 0, bw, bh); box(el.firstChild, (bw - iw) / 2, (bh - ih) / 2, iw, ih);
      el._b = { w: bw, h: bh, iw, ih };
    }
    // le tirage occupe le rectangle (centre cx, cy ; w × h), tourné de r ; fy : hauteur du point de l'image gardé au cadrage (0 haut, 1 bas)
    function pwTo(el, cx, cy, w, h, r = 0, fy = .5) {
      const b = el._b, sx = w / b.w, sy = h / b.h, k = Math.max(w / b.iw, h / b.ih);
      el.style.transform = `translate3d(${px(cx - b.w / 2)}, ${px(cy - b.h / 2)}, 0) rotate(${r.toFixed(3)}deg) scale(${sx.toFixed(5)}, ${sy.toFixed(5)})`;
      el.firstChild.style.transform = `translate3d(0, ${px((h - b.ih * k) * (fy - .5) / sy)}, 0) scale(${(k / sx).toFixed(5)}, ${(k / sy).toFixed(5)})`;
    }

    // la grille qui suit, mesurée en coordonnées de la scène (haut de la scène quand elle n'est plus tenue)
    const GR = {};
    function measureGrid() {
      const g = $('#so-grid'), base = top0 + sec.offsetHeight - vh;
      const R = el => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top + scrollY - base, w: b.width, h: b.height }; };
      const cards = g ? [...g.children].slice(0, 3) : [];
      GR.hh = header ? header.offsetHeight : (mobile ? 60 : 72);
      if (cards.length < 3) {                                            // repli : la grille du site recalculée
        const gu = Math.min(48, Math.max(20, vw * .032)), x0 = Math.max(gu, (vw - 1440) / 2 + gu), W = Math.min(vw, 1440) - 2 * gu;
        const gap = mobile ? 10 : 20, cw = (W - gap * (mobile ? 1 : 2)) / (mobile ? 2 : 3);
        GR.media = mobile ? [{ x: x0, y: 0, w: W, h: W }, { x: x0, y: 0, w: cw, h: cw * 1.25 }, { x: x0 + cw + gap, y: 0, w: cw, h: cw * 1.25 }]
          : [0, 1, 2].map(i => ({ x: x0 + i * (cw + gap), y: 0, w: cw, h: cw * 1.25 }));
        GR.x0 = x0; GR.W = W; GR.slot = MODS.map((m, i) => N - 1 - i);
      } else {
        GR.media = cards.map(c => R($('.card__media', c) || c));
        const gb = R(g), hs = cards.map(c => (/[?&]p=([\w-]+)/.exec(c.getAttribute('href') || '') || [])[1]);
        GR.x0 = gb.x; GR.W = gb.w;
        GR.slot = MODS.map((m, i) => { const k = hs.indexOf(m[6]); return k < 0 ? N - 1 - i : k; });   // la carte de chaque parfum
      }
      GR.cols = mobile ? [GR.media[1], GR.media[2]] : GR.media;
      GR.gap = GR.cols[1].x - (GR.cols[0].x + GR.cols[0].w);
    }
    // la phrase : largeur posée, hauteur lue (une fois, à la mise en page)
    const capH = w => { cap.style.width = px(w); return cap.offsetHeight; };
    const capAt = (x, y) => { cap.style.left = px(x); cap.style.top = px(y); };
    // la composition finale { film, prints[] }, en coordonnées de la scène, tenue dans le petit écran (vs)
    function end() {
      const C = GR.cols, g = GR.gap, top = GR.hh, fy = i => MODS[i][7];
      if (!mobile) {
        // écran bas : les tirages raccourcissent (64 px d'air au moins, jusqu'à 1/φ du carré ; plus bas, 24 px, jusqu'à 1/φ²)
        const bw = C[2].x + C[2].w - C[1].x, bh = bw / (PHI * PHI * PHI), side = C[0].w;
        let ph = side, H = bh + g + ph;
        if (vs - top - H < 64) { ph = Math.max(side * G, vs - top - 64 - bh - g); H = bh + g + ph; }
        if (vs - top - H < 24) { ph = Math.max(side * G2, vs - top - 24 - bh - g); H = bh + g + ph; }
        const y0 = top + Math.max(8, (vs - top - H) * G2), yp = y0 + bh + g;
        capAt(C[0].x, y0 + bh - capH(C[0].w));
        return { film: { x: C[1].x, y: y0, w: bw, h: bh }, prints: MODS.map((m, i) => { const c = GR.media[GR.slot[i]]; return { x: c.x, y: yp, w: c.w, h: ph, fy: fy(i) }; }) };
      }
      // téléphone : écran bas, le bandeau et les tirages raccourcissent ensemble (k), largeurs gardées (celles des colonnes) ;
      // en dessous de k = KMIN (téléphone couché, très petit écran), proportions gardées : la composition déborde (layout)
      const x0 = GR.x0, W = GR.W, kf = a => { const k = Math.min(1, a); return k < KMIN ? 1 : k; };
      let film, yl, ys, lh, sq;
      if (vw > vs) {
        // téléphone couché : la phrase dans la colonne 1, au pied du bandeau posé sur la colonne 2 (comme sur ordinateur)
        const bh = C[1].w / (PHI * PHI), ch = capH(C[0].w), r1 = Math.max(bh, ch);
        const k = kf((vs - top - 24 - r1 - 2 * g) / (W / PHI + C[0].w));
        lh = k * W / PHI; sq = k * C[0].w;
        const H = r1 + g + lh + g + sq, y0 = top + Math.max(8, (vs - top - H) * G2);
        yl = y0 + r1 + g; ys = yl + lh + g;
        capAt(C[0].x, y0 + r1 - ch);
        film = { x: C[1].x, y: y0 + r1 - bh, w: C[1].w, h: bh };
      } else {
        const ch = capH(W), k = kf((vs - top - 24 - ch - 20 - 2 * g) / (W / (PHI * PHI) + W / PHI + C[0].w));
        const bh = k * W / (PHI * PHI); lh = k * W / PHI; sq = k * C[0].w;
        const H = ch + 20 + bh + g + lh + g + sq;
        const y0 = top + Math.max(8, (vs - top - H) * G2), yb = y0 + ch + 20; yl = yb + bh + g; ys = yl + lh + g;
        capAt(x0, y0);
        film = { x: x0, y: yb, w: W, h: bh };
      }
      const R = [{ x: x0, y: yl, w: W, h: lh }, { x: C[0].x, y: ys, w: C[0].w, h: sq }, { x: C[1].x, y: ys, w: C[1].w, h: sq }];
      return { film, prints: MODS.map((m, i) => ({ ...R[GR.slot[i]], fy: fy(i) })) };
    }
    let L = 0, C0 = null, ST = [], F = null;
    function layout() {
      L = mobile ? Math.min(vs * G, vw * .94) : vs * G;                  // grand côté des tirages de la pile = 1/φ de l'écran
      const S = L * G, cx = vw / 2, cy = vs * (mobile ? .44 : .45);
      C0 = { x: cx - L / 2, y: cy - S / 2, w: L, h: S };                  // le film devenu tirage φ:1, sous la pile
      box(sh, C0.x, C0.y, L, S); sh.style.left = sh.style.top = '0px';
      ST = MODS.map(([, , r, dx, dy]) => ({ cx: cx + dx * S, cy: cy + dy * L, w: S, h: L, r, ox: dx * S }));
      F = end();
      // composition plus haute que la scène (écran trop bas) : rien n'est coupé — la scène laisse déborder son pied
      // (clip-path, style.css) et la section s'allonge d'autant ; la suite de la composition arrive avec la page
      const bot = Math.max(F.film.y + F.film.h, ...F.prints.map(r => r.y + r.h));
      ovf = bot > vh ? Math.ceil(bot - vh + 24) : 0;
      sec.style.setProperty('--ovf', ovf + 'px');
      els.forEach((el, i) => pwSetup(el, F.prints[i].w, F.prints[i].h, MODS[i][5]));
      box(shF, F.film.x, F.film.y, F.film.w, F.film.h); shF.style.left = shF.style.top = '0px';
    }
    function render(P) {
      const ff = F.film, c = C0, e = io(seg(P, 0, T0));
      const a = els.map((el, i) => out(seg(P, T0 + i * STEP, T0 + i * STEP + W1)));
      const q = els.map((el, i) => { const t = DEAL[0] + (N - 1 - i) * DEAL[2]; return io(seg(P, t, t + DEAL[1])); });
      const qF = io(seg(P, FILM[0], FILM[1]));
      // le film : plein cadre -> tirage paysage, recule sous la pile, puis gagne sa place
      const dF = sum(a) * (1 - qF), f = 1 - .02 * dF;
      let w = lerp(vw, c.w, e), h = lerp(vh, c.h, e), x = lerp(0, c.x, e), y = lerp(0, c.y, e);
      x += w * (1 - f) / 2; y += h * (1 - f) / 2; w *= f; h *= f;
      x = lerp(x, ff.x, qF); y = lerp(y, ff.y, qF); w = lerp(w, ff.w, qF); h = lerp(h, ff.h, qF);
      filmTo(x, y, w, h);
      shadowOn(sh, x, y, w, h, c, seg(e, .75, 1) * (1 - seg(qF, 0, .45)));      // ombre de la pile, puis celle de la place finale
      shadowOn(shF, x, y, w, h, ff, seg(qF, .55, 1));
      filmVeil.style.opacity = Math.min(.2, dF * .045).toFixed(3);
      // les tirages : montent et s'empilent (ceux du dessous reculent un peu), puis partent vers leur colonne
      els.forEach((el, i) => {
        const ai = a[i], qi = q[i], st = ST[i], fi = F.prints[i];
        el.style.visibility = ai > 0 ? '' : 'hidden'; if (!ai) return;
        const d = sum(a.slice(i + 1)), s = (1 - .02 * d * (1 - qi)) * lerp(1.08, 1, ai), lift = 1 + LIFT * Math.sin(Math.PI * qi);
        let cx = st.cx + (1 - ai) * st.ox * 2, cy = st.cy + (1 - ai) * (vh - (st.cy - st.h / 2) + L * .25), ww = st.w * s, hh = st.h * s;
        cx = lerp(cx, fi.x + fi.w / 2, qi); cy = lerp(cy, fi.y + fi.h / 2, qi) - ARC * vs * Math.sin(Math.PI * qi);
        ww = lerp(ww, fi.w, qi) * lift; hh = lerp(hh, fi.h, qi) * lift;
        pwTo(el, cx, cy, ww, hh, lerp(lerp(st.r * 3 + (i % 2 ? 6 : -6), st.r, ai), 0, qi), lerp(.5, fi.fy, qi));
        el.lastChild.style.opacity = Math.min(.28, d * .07 * (1 - qi)).toFixed(3);
      });
      caption(out(seg(P, CAP[0], CAP[0] + CAP[1])));
    }

    const prog = () => (reduce ? 1 : clamp((scrollY - top0) / run));
    // effacée, l'ouverture garde son titre (h1, le logo) pour les lecteurs d'écran ; seuls le lien et Pause sortent du jeu
    const side = $('.s-hero__side', hero), ctl = $$('a, button', side || hero);
    let heroOff = null;
    function draw(p) {
      // l'ouverture (logo, lien, Pause) s'efface dans les premiers 6 % ; le bouton rond prend le relais
      const k = seg(p, 0, .06), off = k >= 1;
      hero.style.opacity = (1 - k).toFixed(3); hero.style.transform = `translate3d(0, ${px(-k * 18)}, 0)`;
      if (off !== heroOff) {
        heroOff = off; hero.style.pointerEvents = off ? 'none' : '';
        if (side) side.inert = off;
        ctl.forEach(e => (off ? e.setAttribute('tabindex', '-1') : e.removeAttribute('tabindex')));
      }
      pp.style.opacity = k.toFixed(3); pp.style.visibility = k > 0 ? 'visible' : 'hidden';
      scrims.forEach(s => { s.style.opacity = (1 - k).toFixed(3); });
      render(p); syncHeader();
    }
    function measure() {
      vw = stage.clientWidth; vh = stage.clientHeight; vs = Math.min(vh, svh.offsetHeight || vh); mobile = small.matches;
      annH = announce ? announce.offsetHeight : 0;
      // la vidéo garde ses proportions et déborde de l'écran (cover) : la fenêtre du film peut alors en montrer toute la largeur
      if (video) { const ar = filmAr(), cw = Math.max(vw, vh * ar), ch = Math.max(vh, vw / ar);
        Object.assign(video.style, { width: px(cw), height: px(ch), left: px((vw - cw) / 2), top: px((vh - ch) / 2) }); }
      top0 = sec.getBoundingClientRect().top + scrollY; run = Math.max(1, sec.offsetHeight - vh);
      measureGrid(); layout(); target = cur = prog(); draw(cur);
    }
    // défilement : la cible suit la page ; sur ordinateur (molette), l'effet la rejoint en douceur
    const smooth = matchMedia('(hover: hover) and (pointer: fine)').matches;
    let cur = 0, target = 0, raf = 0, last = 0, rw = 0, rh = 0;
    function tick(t) {
      raf = 0;
      const dt = last ? Math.min(64, t - last) : 16.7; last = t;
      cur = smooth ? cur + (target - cur) * (1 - Math.pow(1 - .18, dt / 16.7)) : target;
      if (Math.abs(target - cur) < .0003) cur = target;
      draw(cur);
      if (cur !== target) raf = requestAnimationFrame(tick); else last = 0;
    }
    measure(); rw = vw; rh = vh;
    // (au-delà de la section, la progression reste à 1 : rien à redessiner)
    addEventListener('scroll', () => { target = prog(); syncHeader(); if (!raf && target !== cur) raf = requestAnimationFrame(tick); }, { passive: true });
    addEventListener('resize', () => { if (stage.clientWidth === rw && stage.clientHeight === rh) return; rw = stage.clientWidth; rh = stage.clientHeight; measure(); });
    addEventListener('load', measure);
    if (video) video.addEventListener('loadedmetadata', measure);
    if (document.fonts) document.fonts.ready.then(measure);
  }

  function initLibrary() {
    const root = $('#library'); if (!root) return;
    const ORDER = ['skin-obsession', 'summer-vibes', 'coffrets'];
    const q = new URLSearchParams(location.search);
    let filter = q.get('f') || 'all', fam = q.get('famille') || '', sort = 'default';
    const famCount = f => PRODUCTS.filter(p => (p.families || []).includes(f)).length;
    $('#lib-fams').innerHTML = Object.keys(FAMILIES).map(f => `
      <button type="button" class="fam" data-fam="${f}" aria-pressed="false"><span class="fam__img">${pic(FAMILY_ART[f], '', '(max-width: 800px) 42vw, 18vw')}</span>
        <span class="fam__name">${f}</span><span class="fam__count">${famCount(f)} parfum${famCount(f) > 1 ? 's' : ''}</span></button>`).join('');
    const render = () => {
      let list = PRODUCTS.filter(p => (filter === 'all' || p.collection === filter) && (!fam || (p.families || []).includes(fam)));
      if (sort === 'asc') list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
      if (sort === 'desc') list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
      if (fam && sort === 'default') list = [...list].sort((a, b) => a.families.indexOf(fam) - b.families.indexOf(fam));   // famille dominante d'abord
      if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      $('#lib-count').textContent = list.length + (list.length > 1 ? ' créations' : ' création');
      $$('#lib-cols button').forEach(b => b.classList.toggle('is-active', b.dataset.f === filter));
      $$('#lib-fams .fam').forEach(b => { b.classList.toggle('is-active', b.dataset.fam === fam); b.setAttribute('aria-pressed', b.dataset.fam === fam); });
      $('#lib-fams').classList.toggle('has-active', !!fam);
      const act = $('#lib-fams .fam.is-active'), rail = $('#lib-fams');
      if (act && rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: act.offsetLeft - rail.offsetLeft - 20, behavior: 'smooth' });
      $('#lib-desc').innerHTML = fam ? `<b>${fam}</b> — ${esc(FAMILIES[fam])} <button type="button" class="inline-link" data-fam-reset>Toutes les familles</button>` : '';
      $('[data-fam-reset]')?.addEventListener('click', () => { fam = ''; url(); render(); });
      root.innerHTML = (filter === 'all' && !fam && sort === 'default')
        ? ORDER.map(c => {
            const col = COLLECTIONS[c], items = list.filter(p => p.collection === c);
            return `<div class="chapter"><h2 class="h2">${nm(col.title)}</h2><a class="tlink" href="/collection?c=${c}">Lire</a></div>
                    <div class="grid">${c === 'skin-obsession' ? items.map(card).join('') + wideTile(c) + trialTile()
                      : c === 'summer-vibes' ? items.slice(0, 3).map(card).join('') + wideTile(c) + items.slice(3).map(card).join('') + quizTile() + storesTile()
                      : items.map(card).join('')}</div>`;
          }).join('')
        : `<div class="grid">${list.map(card).join('') || '<p class="muted">Aucune création pour ce filtre.</p>'}${list.length % 3 ? [trialTile(), quizTile()].slice(0, 3 - list.length % 3).join('') : ''}</div>`;
      balanceGrids(root);
    };
    const url = () => { const u = new URLSearchParams(); if (filter !== 'all') u.set('f', filter); if (fam) u.set('famille', fam); history.replaceState(null, '', '/bibliotheque' + (u.toString() ? '?' + u : '') + (fam ? '#familles' : '')); };
    $$('#lib-cols button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; url(); render(); }));
    $$('#lib-fams .fam').forEach(b => b.addEventListener('click', () => {
      fam = fam === b.dataset.fam ? '' : b.dataset.fam; url(); render();
      if (fam) $('.filters').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    $('#lib-sort').addEventListener('change', e => { sort = e.target.value; render(); });
    render();
  }

  function initCollection() {
    const root = $('#collection'); if (!root) return;
    // une collection masquée (Bougies, en pause) ou inconnue renvoie vers Summer Vibes
    // (Shopify : collection dépubliée + redirection d'URL ; une collection inconnue y donne la page 404 du thème)
    const asked = new URLSearchParams(location.search).get('c');
    const key = Object.prototype.hasOwnProperty.call(COLLECTIONS, asked) && !COLLECTIONS[asked].hidden ? asked : 'summer-vibes';
    const col = COLLECTIONS[key];
    if (asked !== null && asked !== key) { const u = new URL(location.href); u.searchParams.set('c', key); history.replaceState(null, '', u); }
    const items = PRODUCTS.filter(p => p.collection === key);
    // tuiles « Coffret · Portrait olfactif · Nos adresses » : en fin de page sur Skin Obsession (retour de Nolwenn, 12/10),
    // une seule tuile dans la grille des parfums sur Summer Vibes (validée telle quelle) ; aucune sur les coffrets
    const tilesRow = col.tiles === 'end', tileInGrid = col.tiles === 'grid';
    document.title = `${col.title} — LIBRERY`;
    body.dataset.run = col.title;

    root.innerHTML = `
      <section class="coll-hero">${col.video
          ? `<video src="${matchMedia('(max-width: 800px)').matches && col.videoMobile ? col.videoMobile : col.video}#t=0.001" autoplay muted loop playsinline preload="auto" disablepictureinpicture aria-label="${esc(col.title)}"></video>`
          : pic(col.hero, col.title, '100vw', '', true)}<div class="scrim-b"></div>
        <div class="coll-hero__txt"><div class="wrap"><h1 class="h1">${nm(col.title)}</h1>${col.video ? '<button type="button" class="coll-hero__play" data-film>Pause</button>' : ''}</div></div></section>
      <section class="block"><div class="wrap split">
        <div><span class="ui muted">${esc(col.chapter)}</span></div>
        <div><p class="epigraph">${col.epigraph}</p><div class="prose">${col.intro.map(t => `<p>${t}</p>`).join('')}</div></div>
      </div></section>
      ${col.soon ? `<section class="block"><div class="wrap letter">
          <div><h2 class="h2">Être prévenu de la sortie</h2><p>Un e-mail, le jour où ce chapitre s’ouvre.</p></div>
          <form class="field-line" data-news><input type="email" required placeholder="Votre adresse e-mail" aria-label="E-mail"><button>M’inscrire</button></form></div></section>` : ''}
      ${items.length ? `<section class="block"><div class="wrap">
          <div class="row-head"><div><h2 class="h2">Les parfums</h2></div><span class="ui muted">${items.length} ${items.length > 1 ? 'créations' : 'création'}</span></div>
          <div class="grid">${items.map(card).join('')}${tileInGrid ? trialTile() : ''}</div></div></section>` : ''}
      ${col.mosaic ? `<section class="ed-sec"><div class="wrap">${mosaic(key)}</div></section>` : ''}
      ${col.chapters.length ? `<section class="block"><div class="wrap chapters">
          ${col.chapters.map(ch => `<article class="split"><h2 class="h2">${ch.h}</h2><div class="prose">${ch.p.map(t => `<p>${t}</p>`).join('')}</div></article>`).join('')}
        </div></section>` : ''}
      ${items.length && tilesRow ? `<section class="block"><div class="wrap"><div class="grid">${trialTile() + quizTile() + storesTile()}</div></div></section>` : ''}`;
    newsletters();
    filmControl(root);
  }

  /* Écran de chargement : attend le film d'ouverture, les pages du catalogue, les tirages de l'ouverture (décodés), les
     polices et la page ; à l'accueil, sur ordinateur, le chevet 3D aussi s'il peut être prêt à temps (initPrechauffe).
     3 s au plus depuis l'ouverture de la page (la feuille de style l'efface d'elle-même à 6 s, sans JavaScript).
     Le reste (scènes 3D, images plus bas) se prépare derrière lui : initPrechauffe */
  let ecranFini, essentielFini;
  const ecranParti = new Promise(r => ecranFini = r);   // l'écran s'efface (ou il n'y en a pas)
  const essentiel = new Promise(r => essentielFini = r);   // ce qu'il attend d'abord est là : la préchauffe peut partir
  let chevetEcran = null;      // le chevet, pour l'écran : { fichiers, monte } (promesses, initPrechauffe)
  const vers = ms => new Promise(r => setTimeout(r, Math.max(0, ms - performance.now())));   // à l'instant ms de la page
  function initLoader() {
    const L = $('#loader'); if (!L) return (ecranFini(), essentielFini());
    // lien direct vers le catalogue (#feuilleter) : le catalogue a son propre écran de chargement
    if (document.documentElement.classList.contains('is-seen') || location.hash === '#feuilleter') { L.remove(); return (ecranFini(), essentielFini()); }
    const bar = $('.loader__bar i', L), tasks = [];
    const add = p => tasks.push(p.catch(() => {}).then(() => { done++; bar.style.width = (done / tasks.length * 100) + '%'; }));
    let done = 0;
    add(document.fonts ? document.fonts.ready : Promise.resolve());
    add(new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
    const film = $('.s-hero__film, .coll-hero video');
    if (film) add(new Promise(r => film.readyState >= 2 ? r() : (film.addEventListener('loadeddata', r, { once: true }), film.addEventListener('error', r, { once: true }))));
    if ($('[data-flip]')) for (let n = 1; n <= 15; n++) add(new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = `/assets/img/catalogue/p${String(n).padStart(2, '0')}.webp`; }));
    const fin = () => { L.classList.add('is-done'); ecranFini(); try { sessionStorage.setItem('librery-vu', '1'); } catch (e) {} setTimeout(() => L.remove(), 900); };
    // une fois toutes les pages montées (initEntete pose ses tirages après nous) : les tirages de l'ouverture, décodés,
    // montent sans image blanche au premier défilement
    queueMicrotask(() => {
      $$('.entete-pr img').forEach(i => i.decode && add(i.decode()));
      const limite = vers(Math.max(2750, performance.now() + 1500));   // + 250 ms : l'écran s'efface à 3 s au plus
      Promise.race([Promise.all(tasks), limite]).then(essentielFini);
      // puis le chevet 3D, sur une connexion rapide : l'écran attend la scène montée, jusqu'à 2,4 s — textures envoyées à
      // la carte, reflets calculés, shaders compilés derrière lui plutôt que pendant l'ouverture qu'on fait défiler.
      // Rapide : au débit de ce qu'il vient de recevoir (octets / temps où l'un au moins se chargeait), les 4 Mo du chevet
      // (partis à l'instant même) arrivent en 1,2 s au plus — mesuré : 0,7 s en local, 2,8 s en 4G —, et ils arrivent
      // en effet dans la seconde. Sinon, il ne l'attend pas : la scène se monte ensuite, l'affiche tient sa place.
      // Octets rendus disponibles, pas transférés : servis par le cache ou revalidés (nouvel onglet, deuxième visite),
      // transferSize n'en compte que les en-têtes — l'écran se croyait sur une connexion lente et partait avant la scène
      if (chevetEcran) add(essentiel.then(() => {
        let o = 0, t = 0, c = null;
        performance.getEntriesByType('resource').map(e => [e, e.encodedBodySize || e.transferSize]).filter(([e, n]) => n > 0 && e.responseEnd > 0)
          .sort(([a], [b]) => a.fetchStart - b.fetchStart).forEach(([e, n]) => {
            o += n;
            if (!c || e.fetchStart > c[1]) { if (c) t += c[1] - c[0]; c = [e.fetchStart, e.responseEnd]; } else c[1] = Math.max(c[1], e.responseEnd);
          });
        if (c) t += c[1] - c[0];
        if (!o || 4.3e6 * t / o > 1200) return false;
        return Promise.race([chevetEcran.fichiers.then(() => true), new Promise(r => setTimeout(r, 1000))]);
      }).then(a => a && Promise.race([chevetEcran.monte, vers(2400)])));
      Promise.race([Promise.all(tasks), limite]).then(() => setTimeout(fin, 250));
    });
  }

  /* Préchauffe : ce que les animations demanderont plus bas, mis en route derrière l'écran de chargement et juste après,
     pour qu'en descendant rien ne se fasse attendre ni ne saccade. Rien ne part avant la fin du chargement de la page
     (event load) ni avant que l'écran de chargement ait reçu ce qu'il attend d'abord (film, polices, tirages de l'ouverture,
     pages du catalogue) : partis plus tôt, ces fichiers lui prendraient la bande passante et l'allongeraient (mesuré en 4G).
     · Le chevet de l'accueil (chevet() le monte de lui-même dès la page chargée) : tous ses modules d'un coup (sans cela,
       trois vagues l'une après l'autre : chevet3d.js, Three.js et ses modules, leurs dépendances) et, sous Chromium, tous
       ses fichiers d'un coup (sans cela, trois vagues encore : modèles et studio, textures du plateau, étiquettes), ceux-ci
       en priorité basse, comme les images des écrans suivants, qu'on verra avant lui (4 Mo : en 4G, à priorité égale avec
       elles, plutôt que devant). Préchargement (link preload) : la demande du module, même faite
       pendant le préchargement, est servie par lui — un seul téléchargement (mesuré). Ailleurs (Safari, Firefox), ce
       partage n'est pas vérifié : les fichiers partent à leur tour, comme avant. Sur ordinateur, si ces fichiers arrivent
       vite, l'écran de chargement attend la scène montée (initLoader).
     · Les images des écrans suivants (grilles, mosaïques : huit écrans, douze images au plus), en priorité basse, chargées
       sans attendre leur approche et décodées hors du fil principal, deux à la fois, aux moments libres.
     · Sur une fiche ou au Lexique, le cadran (sundial()) : modules et fichiers en priorité basse, ceux-ci lus jusqu'au bout
       (le cache les garde entiers ; déjà en cache, rien ne repart) ; l'écran parti et ces fichiers arrivés, au premier
       moment calme (aucun défilement depuis 0,3 s, navigateur libre), il est monté hors de l'écran — modèle, textures,
       shaders compilés — et sa première image est immédiate en arrivant ; si le visiteur descend sans s'arrêter, il se
       monte à son approche, comme avant.
     · Les autres pages du site : au survol d'un lien (Chrome, règles de spéculation), la page se charge avant le clic.
     Modules : modulepreload, adresses lues dans la carte d'import (les mêmes que l'import()). Fichiers : aux adresses mêmes
     de chevet3d.js et sillage3d.js — à tenir à jour avec eux (une adresse oubliée se charge simplement à son tour).
     Rien de tout cela en économie de données ou sur une connexion lente (2G, 3G) ; sur un écran tactile dont la mémoire est
     inconnue ou de moins de 4 Go (téléphones), l'écran n'attend pas le chevet et le cadran se monte à son approche.
     Essais : window.__prechauffe = { depart, chevet, fichiers, cadran, images, monte } (en ms depuis l'ouverture). */
  const aMonter = [];          // lancements de scènes 3D qu'on peut avancer (sundial) ; chacun ne part qu'une fois
  function initPrechauffe() {
    const c = navigator.connection, lent = !!c && (c.saveData || /2g|3g/.test(c.effectiveType || ''));
    if (lent) return;
    const mem = navigator.deviceMemory, tot = mem ? mem >= 4 : !matchMedia('(pointer: coarse)').matches;
    const trace = window.__prechauffe = {}, note = k => { trace[k] = Math.round(performance.now()); };
    const charge = new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }));
    const libre = f => 'requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 800 }) : setTimeout(f, 50);
    // carte d'import → adresse (préfixe « three/addons/ » compris)
    let carte = {}; try { carte = JSON.parse($('script[type="importmap"]').textContent).imports || {}; } catch (e) {}
    const adresse = s => {
      const k = carte[s] ? s : Object.keys(carte).find(p => p.endsWith('/') && s.startsWith(p));
      return k ? new URL(carte[k] + s.slice(k.length), location.href).href : null;
    };
    const deja = new Set();
    const module = (s, prio) => {
      const href = adresse(s); if (!href || deja.has(href)) return; deja.add(href);
      const l = document.createElement('link'); l.rel = 'modulepreload'; l.href = href; l.fetchPriority = prio; document.head.append(l);
    };
    const borne = p => Promise.race([p, new Promise(r => setTimeout(r, 12000))]);   // jamais d'attente sans fin
    // lus jusqu'au bout (le cache les garde entiers) ; déjà en cache, même à revalider, rien ne repart sur le réseau
    const fichiers = (liste, priority) => borne(Promise.all(liste.filter(u => !deja.has(u) && deja.add(u))
      .map(u => fetch(u, { cache: 'force-cache', priority }).then(r => r.ok && r.blob()).catch(() => {}))));
    // préchargés (fetch() du module servi par le préchargement, même en cours) : arrivés, ou en échec
    const precharges = liste => borne(Promise.all(liste.filter(u => !deja.has(u) && deja.add(u)).map(u => new Promise(r => {
      const l = document.createElement('link'); l.rel = 'preload'; l.as = 'fetch'; l.crossOrigin = 'anonymous'; l.href = u;
      l.fetchPriority = 'low'; l.onload = l.onerror = r; document.head.append(l);
    }))));
    const depart = Promise.all([charge, essentiel]).then(() => note('depart'));
    // Three.js vient du CDN (carte d'import) : sa connexion (DNS, TLS) s'ouvre dès maintenant, pas au départ des modules
    const cdn = carte.three && new URL(carte.three, location.href).origin;
    if (cdn && cdn !== location.origin && $('.flip--chevet .flip__chevet, [data-clock] .clock__stage')) {
      const l = document.createElement('link'); l.rel = 'preconnect'; l.href = cdn; l.crossOrigin = 'anonymous'; document.head.append(l);
    }
    // le chevet de l'accueil, tel que chevet() l'a mis en place (3D possible) ; MOBILE : la règle de chevet3d.js
    const chevet = $('.flip--chevet'), C = '/assets/3d/chevet/', mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 800;
    const chromium = !!navigator.userAgentData;                  // préchargement partagé avec fetch() : vérifié sous Chromium
    if (chevet && $('.flip__chevet', chevet)) {
      const chevetFichiers = depart.then(() => {
        ['chevet3d', 'chevet-photo', 'three', ...['loaders/GLTFLoader', 'loaders/RGBELoader', 'utils/BufferGeometryUtils', 'postprocessing/TAARenderPass', 'postprocessing/SSAARenderPass', 'postprocessing/GTAOPass',
          'postprocessing/Pass', 'shaders/GTAOShader', 'shaders/PoissonDenoiseShader', 'shaders/CopyShader', 'math/SimplexNoise', 'math/ConvexHull'].map(m => `three/addons/${m}.js`)]
          .forEach(s => module(s, 'auto'));
        if (!chromium) return;                                     // ailleurs : les fichiers à leur tour
        return precharges([C + 'ClassicNightstand_01_1k.gltf', C + 'ClassicNightstand_01.bin', ...['diff', 'arm', 'nor_gl'].map(t => `${C}textures/ClassicNightstand_01_${t}_1k.jpg`),
          '/parfum/flacon-100ml.glb', '/parfum/parfums.json', '/parfum/studio.hdr', C + 'plateau.glb',
          `${C}plateau-noyer-${mobile ? '2k' : '4k'}.webp`, C + 'plateau-noyer-normale-2k.webp', C + 'plateau-noyer-rugosite-2k.webp', C + 'emblem-gravure.webp',
          C + 'caustiques.json', C + 'caustiques.png',
          ...['palmeira', 'ambert-sunset', 'mango-wave', 'hot-sand', 'sun-ice', 'vanilla-plum', 'tonka-love', 'magnetic-flowers'].map(h => `${C}labels/${h}.webp`)]);
      }).then(() => chromium && note('chevet'));
      // l'écran de chargement : la scène montée — ou abandonnée (retour à la section d'avant) ; sur un ordinateur solide
      // seulement (souris, 8 cœurs, 8 Go et plus) : ailleurs, sa mise en place pourrait le figer au-delà de ses 3 s
      if (chromium && !matchMedia('(pointer: coarse)').matches && navigator.hardwareConcurrency >= 8 && navigator.deviceMemory >= 8) chevetEcran = { fichiers: chevetFichiers, monte: new Promise(r => {
        const fait = () => chevet.classList.contains('is-3d') || !chevet.classList.contains('flip--chevet');
        const mo = new MutationObserver(() => { if (fait()) { mo.disconnect(); r(); } });
        mo.observe(chevet, { attributes: true, attributeFilter: ['class'] });
      }) };
    }
    const cadrans = $$('[data-clock]').filter(el => $('.clock__stage', el));
    let cadranFichiers = null;
    depart.then(() => {
      if (cadrans.length) {
        ['sillage3d', 'three', 'three/addons/loaders/GLTFLoader.js', 'three/addons/loaders/RGBELoader.js', 'three/addons/utils/BufferGeometryUtils.js']
          .forEach(s => module(s, 'low'));
        cadranFichiers = fichiers(['/parfum/flacon-100ml.glb', '/parfum/parfums.json', '/parfum/studio.hdr', '/parfum/emblem-gravure.png',
          ...cadrans.map(el => `/parfum/labels/${el.dataset.clock}.png`)], 'low').then(() => note('cadran'));
        note('fichiers');
      }
      // les autres pages : au survol d'un lien (200 ms), au doigt posé sur téléphone — Chrome seul ; ailleurs, rien
      if (HTMLScriptElement.supports?.('speculationrules')) {
        const s = document.createElement('script'); s.type = 'speculationrules';
        s.textContent = JSON.stringify({ prefetch: [{ eagerness: 'moderate', where: { and: [{ href_matches: '/*' },
          { not: { selector_matches: '[href^="#"], [download], [target="_blank"], [data-lecteur]' } }] } }] });
        document.head.append(s);
      }
      const loin = scrollY + innerHeight * 8;
      const imgs = $$('main img[loading="lazy"]').filter(i => !i.complete && i.getBoundingClientRect().top + scrollY < loin).slice(0, 12);
      const suite = () => {       // deux à la fois, aux moments libres
        const lot = imgs.splice(0, 2); if (!lot.length) return note('images');
        Promise.all(lot.map(i => { i.loading = 'eager'; return i.decode ? i.decode().catch(() => {}) : null; })).then(() => libre(suite));
      };
      libre(suite);
    });
    if (!tot || !aMonter.length) return;
    const calme = () => new Promise(r => {
      let t = 0;
      const arme = () => { clearTimeout(t); t = setTimeout(() => { removeEventListener('scroll', arme); libre(r); }, 300); };
      addEventListener('scroll', arme, { passive: true }); arme();
    });
    Promise.all([ecranParti, depart.then(() => cadranFichiers)]).then(calme).then(() => { note('monte'); aMonter.forEach(f => f()); });
  }

  /* Catalogue feuilleté (accueil) : le défilement tourne les pages ; feuille 0 = la couverture (p. 1, verso p. 2) */
  function initFlip() {
    const spread = $('[data-flip]'); if (!spread) return;
    const track = spread.closest('.flip'), N = 20, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CH = ['La couverture', 'La Préface', 'Le manifeste', 'Le fondateur', 'L’extrait de parfum', 'Summer Vibes', 'Hot Sand', 'Skin Obsession'];
    const P = n => `/assets/img/catalogue/p${String(n).padStart(2, '0')}.webp`;
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const W = Array.from({ length: N }, (_, i) => Math.pow((i + .5) / N, 1.6)), WS = W.reduce((a, b) => a + b, 0);
    let leaves = [];
    const build = () => {
      leaves.forEach(l => l.el.remove()); leaves = [];
      const pw = spread.querySelector('.flip__r').offsetWidth, ph = spread.offsetHeight, sw = pw / N;
      for (let k = 0; k < 7; k++) {
        const el = document.createElement('div'); el.className = 'flip__leaf';
        // page à plat d'un seul tenant (aucune jointure visible) ; les bandes ne servent que pendant le tour
        el.innerHTML = `<div class="flip__flat"><i style="background-image:url(${P(1 + 2 * k)})"></i><i class="b" style="background-image:url(${P(2 + 2 * k)})"></i></div>`;
        let parent = el; const strips = [];
        const fr = (x, f) => `<i class="fr${f}" style="background-image:url(${P(1 + 2 * k)});background-size:${pw}px ${ph}px;background-position:${x}px 0"></i>`;
        const bk = (x, f) => `<i class="bk${f}" style="background-image:url(${P(2 + 2 * k)});background-size:${pw}px ${ph}px;background-position:${x}px 0"></i>`;
        for (let i = 0; i < N; i++) {
          const st = document.createElement('div'); st.className = 'flip__strip'; st.style.width = sw + 'px';
          const last = i === N - 1, xb = -(pw - (i + 1) * sw);
          // bouche-trous derrière chaque bande, sauf côté reliure (pages serrées au centre)
          const fills = i === 0 ? '' : last ? fr(-i * sw + 3, ' fill last') + bk(xb, ' fill last') : fr(-i * sw + 3, ' fill') + bk(xb + 3, ' fill');
          st.innerHTML = fills + fr(-i * sw, '') + bk(xb, '');
          parent.appendChild(st); strips.push(st); parent = st;
        }
        spread.appendChild(el); leaves.push({ el, strips });
      }
      draw();
    };
    const draw = () => {
      const r = track.getBoundingClientRect(), P = clamp(-r.top / (r.height - innerHeight));
      // avec le chevet 3D, le livre ne s'ouvre qu'après le relais (CHEVET.livre) ; sinon, dès le début de la section
      const ch = track.classList.contains('flip--chevet'), prog = ch ? clamp((P - CHEVET.livre) / (1 - CHEVET.livre)) : P, p = prog * leaves.length;
      if (ch) {     // textes quand le plateau a glissé vers la droite, livre CSS en fondu sur le catalogue 3D
        const txt = clamp((P - CHEVET.txt) / (CHEVET.vol - CHEVET.txt)), livre = clamp((P - CHEVET.vol) / (CHEVET.fondu - CHEVET.vol));
        track.style.setProperty('--chevet-txt', txt.toFixed(3)); track.style.setProperty('--chevet-livre', livre.toFixed(3));
        track.classList.toggle('is-txt-off', !txt); track.classList.toggle('is-livre-off', !livre);
      }
      const t0 = still ? (p > .5 ? 1 : 0) : ease(clamp(p));
      spread.style.transform = `translateX(${(-25 * (1 - t0)).toFixed(2)}%)`;   // de face, bien droit
      spread.style.setProperty('--ouvre', t0.toFixed(4));   // la page de droite a glissé de t0 demi-page (ombre coupée au bois, chevet3d.js)
      spread.querySelector('.flip__l').style.opacity = t0 > .5 ? 1 : 0;
      spread.classList.toggle('is-closed', t0 < .5);
      leaves.forEach(({ el, strips }, i) => {
        const t = still ? (p > i + .5 ? 1 : 0) : ease(clamp(p - i)), lift = Math.sin(t * Math.PI);
        const bend = 95 * lift * (t < .5 ? 1 : .8), base = -180 * t - bend * .35;
        const z = (t > .5 ? 1 + i * .8 : 1 + (leaves.length - i) * .8) + lift * 14;
        el.style.transform = `translateZ(${z.toFixed(2)}px) rotateY(${base.toFixed(2)}deg)`;
        el.classList.toggle('is-flat', lift < .002);
        let acc = base, prev = 0;
        strips.forEach((st, j) => {
          const step = j === 0 ? 0 : bend * W[j] / WS * N / (N - 1) * .9;
          st.style.transform = `rotateY(${step.toFixed(2)}deg)`; acc += step;
          const c = Math.cos(acc * Math.PI / 180), sh = lift * (.04 + .2 * (1 - Math.abs(c)));
          st.style.setProperty('--sa', (j ? prev : sh).toFixed(3)); st.style.setProperty('--sb', sh.toFixed(3)); prev = sh;
        });
      });
      const k = Math.min(CH.length - 1, Math.round(p));
      $('[data-flip-n]').textContent = k ? `Pages ${2 * k} – ${2 * k + 1}` : 'Le catalogue · 56 pages';
      $('[data-flip-t]').textContent = CH[k];
      $('[data-flip-bar]').style.width = (prog * 100).toFixed(1) + '%';
    };
    let raf = 0;
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }, { passive: true });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 150); });
    build();
    chevet(track, draw);
  }

  /* Le chevet en 3D sous le catalogue (assets/js/chevet3d.js, Three.js). Phases, en fraction du défilement de la
     section : d'un seul mouvement (0 → vol, retours du 13/10), la caméra monte, se tourne de face et glisse jusqu'à
     poser le catalogue — qui ne bouge pas du plateau — sur la couverture du livre, à sa place habituelle, à droite (les
     textes viennent de txt à vol, sur le papier libéré) ; le livre CSS apparaît par-dessus (vol → fondu), puis se
     feuillette (livre → 1). Le mouvement tient ~2,5 écrans de défilement, le feuilletage ~2 (style.css).
     Sans WebGL 2, mouvement réduit, économie de données, ou si le chargement échoue : la section d'avant (bande de
     noyer, livre seul). Chargé à 3 écrans de la section, au premier moment libre après le chargement de la page
     (l'écran de chargement ne l'attend jamais) ; l'affiche (vue de trois quarts) tient la place jusqu'à la première image. */
  const CHEVET = { txt: .43, vol: .535, fondu: .562, livre: .581 };
  function chevet(track, draw) {
    const fond = $('.flip__chevet', track); if (!fond) return;
    const gl = () => { try { const c = document.createElement('canvas').getContext('webgl2'); c?.getExtension('WEBGL_lose_context')?.loseContext(); return !!c; } catch (e) { return false; } };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData || !('IntersectionObserver' in window && 'ResizeObserver' in window) || !gl()) { fond.remove(); return; }
    track.classList.add('flip--chevet'); draw();
    // repli en cours de route : la section d'avant, au même point du feuilletage (la section raccourcit)
    const repli = () => {
      if (!track.classList.contains('flip--chevet')) return;
      const r = track.getBoundingClientRect(), y = scrollY, P = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      track.classList.remove('flip--chevet', 'is-proche', 'is-3d', 'is-txt-off', 'is-livre-off'); fond.remove();
      const h = track.offsetHeight;
      if (r.bottom <= innerHeight) scrollTo({ top: y - (r.height - h), behavior: 'instant' });
      else if (r.top < 0) scrollTo({ top: y + r.top + Math.max(0, (P - CHEVET.livre) / (1 - CHEVET.livre)) * (h - innerHeight), behavior: 'instant' });
      draw();
    };
    // retour du catalogue (#catalogue, voir initLecteur) : au livre fermé, pas au début de la plongée — seulement si
    // le navigateur nous a posés en haut de la section (pas après un défilement ou une position restaurée ailleurs)
    if (location.hash === '#catalogue') {
      const auLivre = () => { const r = track.getBoundingClientRect(); if (Math.abs(r.top) < innerHeight / 3) scrollTo({ top: r.top + scrollY + CHEVET.livre * (track.offsetHeight - innerHeight), behavior: 'instant' }); };
      if (document.readyState === 'complete') auLivre(); else addEventListener('load', () => requestAnimationFrame(auLivre), { once: true });
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect(); track.classList.add('is-proche');
      new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }))
        .then(() => new Promise(r => 'requestIdleCallback' in window ? requestIdleCallback(r, { timeout: 1200 }) : setTimeout(r, 200)))
        .then(() => import('chevet3d')).then(m => m.mount(fond, track, { ...CHEVET, perdu: repli }))
        .then(() => {
          // la 3D arrive en pleine plongée : l'affiche (trois quarts, au départ) n'est plus la vue — coupe franche,
          // plutôt qu'un fondu de 0,6 s entre deux images différentes ; une fois l'affiche effacée (textes en place,
          // retour par #catalogue), elle reste effacée (is-3d lui rendrait sa pleine opacité sous le fondu : un meuble
          // fantôme derrière le livre) et la scène apparaît en fondu sur le papier
          const r = track.getBoundingClientRect(), P = -r.top / (r.height - innerHeight), c = $('canvas', fond);
          if (c && P >= CHEVET.vol) { fond.style.backgroundImage = 'none'; track.classList.add('is-3d'); }
          else if (c && P > .02) { c.style.transition = 'none'; track.classList.add('is-3d'); c.offsetWidth; c.style.transition = ''; }
          else track.classList.add('is-3d');
        }, repli);
    // (accueil : l'ouverture au défilement, .entete, met le catalogue 8 à 18 écrans plus bas ; la 3D ne doit pas figer
    // l'ouverture en cours : elle se met en place dès la page chargée, au premier moment libre, film encore plein cadre)
    }, { rootMargin: $('.entete') ? '2500% 0px' : '300% 0px' });
    io.observe(track);
  }

  /* Le catalogue 3D s'ouvre dans le site : la page glisse vers la gauche, le catalogue arrive de la droite,
     sous l'en-tête qui ne bouge pas (menu, panier). Il est servi dans un cadre (?embed=1) et dialogue par messages,
     sans aucune donnée : catalogue → site { source: 'librery-catalogue', type: 'pret' | 'fermer' | 'revenu' },
     site → catalogue { source: 'librery-boutique', type: 'ferme' | 'ouvert' | 'revenir' }.
     Depuis le chevet de l'accueil (bouton ou livre de la section, 3D en place), pas de glissement : le catalogue part de
     l'image clé même de la section et la remplace par un fondu (voir plus bas, ouvrirChevet).
     #feuilleter dans l'adresse : Précédent referme, un lien direct ouvre d'emblée. Clic du milieu, nouvel onglet
     ou sans JavaScript : le lien mène au catalogue, avec l'adresse de retour (?retour=). */
  function initLecteur() {
    // en local, ?cat=<adresse> remplace le catalogue en ligne (essais avec le catalogue servi en local)
    const CAT = (() => {
      const q = new URLSearchParams(location.search).get('cat');
      if (q && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) try { const u = new URL(q); if (/^https?:$/.test(u.protocol)) return u.origin + u.pathname.replace(/\/?$/, '/'); } catch (e) {}
      return CATALOGUE_URL;
    })();
    const ORIGINE = new URL(CAT).origin, ANCRE = '#feuilleter', html = document.documentElement, header = $('#header');
    // ce qui se fige sous le lecteur ; la barre d'achat (fixe, hors de <main>) ne glisse que si elle est sortie
    const scene = () => [$('.runhead'), $('main'), $('#sticky'), $('#site-footer')].filter(Boolean);
    const glisse = el => el.id !== 'sticky' || el.classList.contains('is-on');

    // déclencheurs : les liens vers la racine du catalogue (les PDF gardent leur nouvel onglet) et le livre de l'accueil
    const racine = new URL(CATALOGUE_URL);
    const liens = $$('a[href]').filter(a => { const u = new URL(a.href, location.href); return u.origin === racine.origin && /^\/(index\.html)?$/.test(u.pathname); });
    liens.forEach(a => {
      const u = new URL(a.href), ici = new URL(location.href); ici.hash = a.closest('#catalogue') ? 'catalogue' : '';
      u.searchParams.set('retour', ici.href); a.href = u.href; a.removeAttribute('target'); a.dataset.lecteur = '';
    });
    const livre = $('#catalogue [data-flip]');
    if (livre) { livre.dataset.lecteur = ''; Object.assign(livre, { tabIndex: 0 }); livre.setAttribute('role', 'button'); livre.setAttribute('aria-label', 'Feuilleter le catalogue'); }   // atteignable au clavier
    if (!liens.length && !livre && location.hash !== ANCRE) return;
    document.head.insertAdjacentHTML('beforeend', `<link rel="preconnect" href="${esc(ORIGINE)}">`);

    let panneau = null, vue = null, pret = false, ouvert = false, pousse = false, retourFocus = null, y = null, fx = [], jeton = 0, figes = [], films = [];
    // rien n'est dit au cadre avant son « pret » (il est encore vide, about:blank) : « pret » reçoit alors l'état du lecteur
    const dire = (type, plus) => pret && vue.contentWindow?.postMessage({ source: 'librery-boutique', type, ...plus }, ORIGINE);
    // haut du lecteur = bas de l'en-tête, bandeau visible ou non (sans le décalage de l'en-tête masqué au défilement)
    const placer = () => {
      if (!panneau || !header) return;
      const tr = getComputedStyle(header).transform, dy = tr && tr !== 'none' ? new DOMMatrixReadOnly(tr).m42 : 0;
      panneau.style.top = Math.max(0, Math.round(header.getBoundingClientRect().bottom - dy)) + 'px';
    };
    const fin = () => {
      panneau.hidden = true;                        // display: none : le catalogue ne dessine plus rien
      html.classList.remove('lecteur-ouvert');
      if (header) { header.style.top = ''; header.classList.remove('is-hidden'); }
      fx.forEach(a => a.cancel()); fx = [];
      figes.forEach(el => { el.inert = false; }); figes = [];
      films.forEach(v => v.play().catch(() => {})); films = [];
      if (y !== null && Math.abs(scrollY - y) > 1) scrollTo(0, y);
      if (retourFocus?.isConnected) retourFocus.focus({ preventScroll: true });
      retourFocus = null;
    };
    // ouverture : la page part à gauche en s'effaçant, le catalogue arrive de la droite ; fermeture : à rebours.
    // Animations Web (le réglage « réduire les animations » coupe les transitions CSS) : fondu seul dans ce cas.
    const animer = (sens, direct) => {
      if (!fx.length) {
        if (!sens) return fin();
        const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const o = { duration: calme ? 350 : 750, easing: calme ? 'ease' : 'cubic-bezier(.7,0,.2,1)', fill: 'both' };
        fx = [panneau.animate(calme ? { opacity: [0, 1] } : { transform: ['translateX(100%)', 'none'] }, o),
          ...figes.filter(glisse).map(el => el.animate(calme ? { opacity: [1, 0] } : { transform: ['none', 'translateX(-14%)'], opacity: [1, 0] }, o))];
      } else fx.forEach(a => { if ((a.playbackRate > 0) !== sens) a.reverse(); });
      if (direct) fx.forEach(a => a.finish());
      const j = ++jeton;
      Promise.all(fx.map(a => a.finished)).then(() => { if (j === jeton) sens ? creer() : fin(); }, () => {});   // ouvert : le cadre se charge
    };
    const fermer = () => { if (!ouvert) return; ouvert = false; if (etatChevet) return fermerChevet(); dire('ferme'); animer(false); };
    // focus dans le catalogue ; un cadre qui a déjà le focus (pris quand il était vide) ne le transmet pas à son document
    const viser = () => { if (document.activeElement === vue) vue.blur(); vue.focus({ preventScroll: true }); };
    // Retour, Échap, message « fermer » : Précédent si l'entrée #feuilleter est la nôtre, sinon on referme et on retire l'ancre
    const demander = () => {
      if (!ouvert) return;
      const notre = pousse && history.state?.lecteur;
      fermer();                                     // tout de suite : un double clic ne recule pas deux fois
      if (notre) history.back();
      else if (location.hash === ANCRE) history.replaceState(null, '', location.pathname + location.search);
    };
    // le cadre se prépare à l'avance hors champ : à sa vraie taille (un cadre masqué se croirait large de 0), rendu suspendu ;
    // le catalogue attend « ouvert » pour son entrée et sa musique. Ouvert à froid, il ne se charge qu'une fois le glissement
    // fini (charger = false) : là où le cadre partage le fil de la page (iPhone), son chargement figerait le glissement.
    // Un cadre déjà chargé ne change jamais d'adresse : il est remplacé par un cadre neuf (son premier chargement
    // n'ajoute rien à l'historique). Un src réaffecté (ou location.replace) laisse dans l'historique conjoint l'adresse
    // d'avant : Précédent, Retour et Échap (history.back) reculeraient dans le cadre caché au lieu de retirer #feuilleter.
    const aller = url => {
      if (vue._nav) { const n = vue.cloneNode(false); n.removeAttribute('src'); vue.replaceWith(n); vue = n; }
      if (url) { vue._nav = true; vue.src = url; }
    };
    const creer = (charger = true) => {
      if (!panneau) {
        body.insertAdjacentHTML('beforeend', `
          <div class="lecteur is-veille" id="lecteur" role="dialog" aria-modal="true" aria-label="Le catalogue LIBRERY" tabindex="-1">
            <button class="lecteur__retour" type="button" aria-label="Fermer le catalogue"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>Retour</button>
            <iframe class="lecteur__vue" title="Le catalogue LIBRERY en 3D" allow="autoplay; fullscreen"></iframe>
          </div>`);
        panneau = $('#lecteur'); vue = $('iframe', panneau);
        $('.lecteur__retour', panneau).addEventListener('click', demander);
        placer();
      }
      if (charger && !vue.dataset.mode) { pret = false; vue.dataset.mode = 'livre'; aller(CAT + '?embed=1'); }
    };
    const ouvrir = (depuis, direct) => {
      if (ouvert) return;
      if (etatChevet) { dire('ferme'); finChevet(); }            // fermeture du chevet en cours : achevée d'un coup
      // préparé en décor chevet : vidé (le cadre glisse vide, sur le fond brun), le catalogue habituel se charge ensuite
      if (vue?.dataset.mode === 'chevet') {
        pret = false; delete vue.dataset.mode; aller(null);
        panneau.classList.remove('lecteur--chevet', 'is-vu'); panneau.inert = false; delete panneau.dataset.etat; panneau.classList.add('is-veille');
      }
      ouvert = true; creer(false);
      retourFocus = depuis; y = direct ? null : scrollY;
      html.classList.add('lecteur-ouvert');         // défilement figé, en-tête plein et visible
      const an = $('#announce');
      if (header && an && body.classList.contains('page-home')) header.style.top = Math.max(0, an.getBoundingClientRect().bottom) + 'px';
      panneau.hidden = false; panneau.classList.remove('is-veille'); placer();
      figes = scene(); figes.forEach(el => { el.inert = true; });
      films = $$('video', $('main')).filter(v => !v.paused); films.forEach(v => v.pause());   // le film d'accueil ne tourne pas sous le catalogue
      animer(true, direct);
      // focus dans le catalogue s'il est prêt ; sinon sur le lecteur, ici : Échap referme pendant le chargement (« pret » l'y fera entrer)
      pret ? viser() : panneau.focus({ preventScroll: true });
      dire('ouvert');
      if (location.hash !== ANCRE) { history.pushState({ lecteur: 1 }, '', ANCRE); pousse = true; }
    };

    // ---------- depuis le chevet de l'accueil : le catalogue sur l'image clé de la section (décor « chevet ») ----------
    // La section #catalogue (chevet3d.js) s'arrête sur une image clé : livre fermé, d'aplomb, sur le plateau décalé à
    // droite (P entre CHEVET.fondu et CHEVET.livre). Le catalogue la reproduit d'après son adresse (contrat :
    // docs/chevet.md du dépôt librery-catalogue-3d) : couverture sur le rectangle du livre CSS, objectif du chevet (axe,
    // focale), plateau sous le livre, vignetage, papier — mesurés dans la page, en fractions du cadre.
    // Ouverture : la page à l'image clé (défilement doux s'il le faut, rendu affiné), le cadre à sa place sans glissement,
    // invisible (opacité 0 : il dessine, à sa vraie taille) et sans pointeur, les textes de la section s'effacent ; à
    // « pret » (image complète) ou « revenu » (cadre préparé d'avance, recadré), fondu de 180 ms. Préparé d'avance en
    // approchant de la section (plus bas, prechargerChevet) ; cliqué avant qu'il soit prêt, l'image clé reste avec ses
    // textes et le bouton dit « Ouverture… » jusqu'à « pret » (10 s au plus, puis le lecteur habituel). Retour, Échap,
    // Précédent : « revenir » (le livre se referme, la caméra revient à l'image clé), à « revenu » le fondu inverse, puis
    // les textes et l'en-tête tels qu'on les a quittés. Sans 3D (repli, mouvement réduit) : le lecteur habituel.
    const flip = livre?.closest('.flip'), fondChevet = flip && $('.flip__chevet', flip);
    const chevetVivant = () => !!(fondChevet?.isConnected && fondChevet.chevet && !fondChevet.chevet.arret && flip.classList.contains('is-3d'));
    // le catalogue sait-il reprendre l'image clé ? (data.js ; en local, ?cat= : le catalogue en chantier, qui le sait ;
    // ou il l'annonce lui-même, « pret » portant decors) — sinon, depuis la section aussi, le lecteur habituel : un
    // catalogue sans ce décor ne répond jamais en mode chevet
    let decorChevet = CATALOGUE_DECOR_CHEVET || CAT !== CATALOGUE_URL;
    // économie de données ou connexion lente (2G, 3G) : rien ne se charge d'avance (le catalogue, 1 Mo et plus ; en décor
    // chevet, près de 6 Mo) et, depuis la section aussi, le lecteur habituel — le décor n'y serait jamais prêt à temps
    const cx = navigator.connection, lent = !!cx && (cx.saveData || /2g|3g/.test(cx.effectiveType || ''));
    const depuisChevet = () => decorChevet && !lent && chevetVivant();
    const avancee = () => { const r = flip.getBoundingClientRect(); return -r.top / (r.height - innerHeight); };
    const surCle = () => { const p = avancee(); return p >= CHEVET.fondu && p <= CHEVET.livre; };
    // la page à l'image clé : défilement doux s'il le faut, puis l'arrêt et le rendu affiné du chevet (2,5 s au plus) ;
    // faux si le visiteur est parti ailleurs entre-temps
    const allerCle = () => new Promise(fini => {
      if (surCle() && fondChevet.dataset.rendu === 'net') return fini(true);
      if (!surCle()) { const r = flip.getBoundingClientRect(); scrollTo({ top: Math.round(scrollY + r.top + (CHEVET.fondu + CHEVET.livre) / 2 * (r.height - innerHeight)), behavior: 'smooth' }); }
      const t0 = performance.now(); let y0 = scrollY, calme = t0;
      const voir = () => {
        const t = performance.now();
        if (Math.abs(scrollY - y0) > .5) { y0 = scrollY; calme = t; }
        if (t - calme < 180 && t - t0 < 4000) return setTimeout(voir, 60);   // ça défile encore
        if (!surCle()) return fini(false);
        if (fondChevet.dataset.rendu === 'net' || t - calme > 2500) return fini(true);
        setTimeout(voir, 60);
      };
      setTimeout(voir, 60);
    });
    // l'image clé mesurée, en fractions du cadre (à sa place sous l'en-tête, même préparé hors champ). Livre fermé
    // (P ≤ CHEVET.livre), section épinglée ou pas encore : livre et canevas sont dans le bloc épinglé, mesurés là où il
    // se posera (dy : son écart à sa place épinglée, nul à l'image clé) — le cadre se prépare avant d'y arriver
    const r6 = v => +v.toFixed(6);
    const cadreChevet = () => {
      const st = $('.flip__sticky', flip), dy = st ? st.getBoundingClientRect().top - (parseFloat(getComputedStyle(st).top) || 0) : 0;
      const k = fondChevet.chevet.cle(), b = $('.flip__leaf', flip).getBoundingClientRect(), c = $('canvas', fondChevet).getBoundingClientRect();
      const B = { left: b.left, top: b.top - dy, width: b.width, height: b.height }, C = { left: c.left, top: c.top - dy, width: c.width, height: c.height };
      const v = vue.getBoundingClientRect(), tr = getComputedStyle(panneau).transform, m = tr && tr !== 'none' ? new DOMMatrixReadOnly(tr) : null;
      const I = { left: v.left - (m ? m.m41 : 0), top: v.top - (m ? m.m42 : 0), width: v.width, height: v.height };
      const F = Math.tan(k.fov * Math.PI / 360), co = Math.cos(k.pose.ry), si = Math.sin(k.pose.ry);
      return {
        cadre: [(B.left - I.left) / I.width, (B.top - I.top) / I.height, B.width / I.width, B.height / I.height].map(r6).join(),
        optique: [(C.left + C.width / 2 - I.left) / I.width, (C.top + C.height / 2 - I.top) / I.height, C.height / (2 * F) / I.height].map(r6).join(),
        table: [k.pose.ry * 180 / Math.PI, (-k.pose.x * co + k.pose.z * si) / k.hc, (-k.pose.x * si - k.pose.z * co) / k.hc, k.hc, k.ecart / k.hc].map(r6).join(),
        vignette: [k.vignette, Math.hypot(C.width, C.height) / 2 / I.height].map(r6).join(),
        papier: (getComputedStyle(html).getPropertyValue('--paper').trim() || '#f8f5ef').slice(1),
      };
    };
    const signe = c => [c.cadre, c.optique, c.table].join('|');
    const chargerChevet = c => { pret = false; vue.dataset.mode = 'chevet'; chargeAvec = signe(c); aller(CAT + '?' + new URLSearchParams({ embed: '1', decor: 'chevet', ...c }).toString().replace(/%2C/g, ',')); };
    // etatChevet : '' (lecteur habituel, ou fermé), 'attente' (invisible, le catalogue se prépare), 'ouvert', 'retour'
    // (le catalogue revient à l'image clé), 'fondu' (le fondu de sortie) ; chargeAvec : l'image clé que le cadre a reçue ;
    // enteteCache : l'en-tête, masqué au défilement à l'image clé, l'est de nouveau au retour
    let etatChevet = '', chargeAvec = '', fondu = null, garde = 0, enRoute = false, enteteCache = false, tAttente = 0, tTextes = 0;
    const TEXTES = 350;   // les textes de la section s'effacent avant la bascule (style.css, html.lecteur-chevet)
    const poser = e => { etatChevet = e; panneau.dataset.etat = e; html.classList.toggle('lecteur-attente', e === 'attente'); };
    // cliqué avant que le catalogue soit prêt : l'image clé reste, textes compris, et le bouton de la section dit
    // « Ouverture… » sur un filet d'or qui va et vient (style.css, html.lecteur-patience) ; même largeur, rien ne bouge
    const bouton = flip && $('.flip__cta a[data-lecteur]', flip);
    let patience = false;
    const patienter = oui => {
      if (patience === oui) return;
      patience = oui; html.classList.toggle('lecteur-patience', oui); panneau?.setAttribute('aria-busy', oui);
      if (!bouton) return;
      if (oui) { bouton.style.minWidth = bouton.getBoundingClientRect().width + 'px'; bouton.dataset.texte = bouton.textContent; bouton.textContent = 'Ouverture…'; }
      else { if (bouton.dataset.texte) bouton.textContent = bouton.dataset.texte; delete bouton.dataset.texte; bouton.style.minWidth = ''; }
    };
    async function ouvrirChevet(depuis) {
      if (ouvert || enRoute) return;
      if (etatChevet) return reprendre();
      enRoute = true; flip.classList.add('is-ouverture');
      const ok = await allerCle();
      enRoute = false; flip.classList.remove('is-ouverture');
      if (ouvert || !ok || !chevetVivant()) return;       // parti ailleurs entre-temps : rien
      ouvert = true; creer(false);
      retourFocus = depuis; y = scrollY; enteteCache = !!header?.classList.contains('is-hidden');
      clearTimeout(tTextes); html.classList.remove('lecteur-retour'); html.classList.add('lecteur-ouvert');
      const an = $('#announce');
      if (header && an && body.classList.contains('page-home')) header.style.top = Math.max(0, an.getBoundingClientRect().bottom) + 'px';
      panneau.classList.add('lecteur--chevet'); panneau.classList.remove('is-veille', 'is-vu'); panneau.hidden = false; panneau.inert = false; placer();
      figes = scene(); figes.forEach(el => { el.inert = true; });
      films = $$('video', $('main')).filter(v => !v.paused); films.forEach(v => v.pause());
      panneau.focus({ preventScroll: true });
      if (location.hash !== ANCRE) { history.pushState({ lecteur: 1, chevet: 1 }, '', ANCRE); pousse = true; }
      poser('attente'); tAttente = performance.now();
      const c = cadreChevet();
      if (vue.dataset.mode !== 'chevet') chargerChevet(c);
      // préparé d'avance et prêt : recadré, il répondra « revenu » ; les textes s'effacent pendant ce temps
      if (pret) { chargeAvec = signe(c); dire('revenir', c); html.classList.add('lecteur-chevet'); }
      else patienter(true);           // il se charge encore : les textes ne s'effaceront qu'à son « pret »
      // catalogue muet (réseau lent, décor absent) : le lecteur habituel plutôt qu'une page figée — au bout de 3 s s'il
      // n'avait qu'à se recadrer, de 10 s s'il se charge encore (≈ 6 Mo : 2 à 3 s sur la fibre, 6 à 7 s en 4G)
      clearTimeout(garde); garde = setTimeout(secours, pret ? 3000 : 10000);
    }
    // secours : le lecteur habituel, qui glisse depuis la droite avec son propre écran de chargement (le cadre préparé
    // en décor chevet est vidé par ouvrir) ; l'entrée #feuilleter déjà poussée reste la nôtre
    function secours() {
      clearTimeout(garde);
      if (!ouvert || etatChevet !== 'attente') return;
      const d = retourFocus; ouvert = false; dire('ferme'); finChevet(); ouvrir(d);
    }
    // fondu enchaîné : le catalogue, sur la même image, par-dessus la section (textes déjà effacés) ; puis « ouvert »
    // (son, barre, Retour)
    function basculer() {
      clearTimeout(garde);
      if (!ouvert || etatChevet !== 'attente') return;
      const reste = TEXTES - (performance.now() - tAttente);
      if (reste > 0) { garde = setTimeout(basculer, reste); return; }
      etatChevet = 'ouvert'; html.classList.remove('lecteur-attente');
      fondu = panneau.animate({ opacity: [0, 1] }, { duration: 180, easing: 'ease-out', fill: 'both' });
      fondu.finished.then(() => { if (etatChevet !== 'ouvert') return; poser('ouvert'); panneau.classList.add('is-vu'); dire('ouvert'); viser(); }, () => {});
    }
    function fermerChevet() {
      clearTimeout(garde);
      if (etatChevet !== 'ouvert') { dire('ferme'); return finChevet(); }      // jamais montré : rien à fondre
      poser('retour'); panneau.classList.remove('is-vu');
      dire('revenir', chevetVivant() ? cadreChevet() : {});
      garde = setTimeout(fondreRetour, 6000);                                 // sans « revenu » : refermé quand même
    }
    function fondreRetour() {
      clearTimeout(garde);
      if (etatChevet !== 'retour') return;
      etatChevet = 'fondu';
      fondu?.cancel(); fondu = panneau.animate({ opacity: [1, 0] }, { duration: 180, easing: 'ease-in', fill: 'both' });
      fondu.finished.then(() => { if (etatChevet === 'fondu') { dire('ferme'); finChevet(); } }, () => {});
    }
    function finChevet() {
      clearTimeout(garde); patienter(false); fin();
      if (enteteCache) header.classList.add('is-hidden');      // l'image clé telle qu'on l'a quittée
      if (html.classList.contains('lecteur-chevet')) {          // les textes reviennent en fondu
        html.classList.replace('lecteur-chevet', 'lecteur-retour');
        clearTimeout(tTextes); tTextes = setTimeout(() => html.classList.remove('lecteur-retour'), TEXTES + 50);
      }
      fondu?.cancel(); fondu = null; poser(''); panneau.classList.remove('is-vu'); preparer();   // prêt pour la fois suivante
    }
    // préparé : le cadre à sa place sous l'en-tête, invisible et hors d'atteinte (opacité 0, inerte, sans pointeur) ; il
    // dessine sa première image (caché hors champ, il ne dessinerait rien) puis ne fait plus rien : au clic, « revenu » vient aussitôt
    function preparer() {
      panneau.classList.add('lecteur--chevet'); panneau.classList.remove('is-veille', 'is-vu');
      panneau.hidden = false; panneau.inert = true; panneau.dataset.etat = 'prepa'; placer();
    }
    // rouvert pendant le retour (Suivant) : le catalogue reste, la barre revient
    function reprendre() {
      clearTimeout(garde);
      if (etatChevet === 'fondu') { fondu.cancel(); fondu = panneau.animate({ opacity: [1, 1] }, { fill: 'both' }); }
      ouvert = true; poser('ouvert'); panneau.classList.add('is-vu'); dire('ouvert'); viser();
      if (location.hash !== ANCRE) { history.pushState({ lecteur: 1, chevet: 1 }, '', ANCRE); pousse = true; }
    }
    const entrer = (depuis, el) => (el?.closest('#catalogue') && depuisChevet() ? ouvrirChevet : ouvrir)(depuis);

    document.addEventListener('click', e => {
      const el = e.target.closest('[data-lecteur]');
      if (!el || e.defaultPrevented || (el.tagName === 'A' && (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey))) return;
      e.preventDefault();
      // menu déroulé au survol : replié jusqu'à ce que la souris le quitte (il resterait par-dessus le lecteur)
      const sub = el.closest('.has-sub');
      if (sub?.matches(':hover')) { sub.classList.add('is-ferme'); sub.addEventListener('pointerleave', () => sub.classList.remove('is-ferme'), { once: true }); }
      // le focus reviendra sur le lien ; pas sur un lien du menu ouvert à la souris (il rouvrirait le menu)
      entrer(el.tagName === 'A' && (e.detail === 0 || !el.closest('.header')) ? el : el.matches('[data-flip]') ? el : null, el);
    });
    // le livre de l'accueil : Entrée ou Espace l'ouvrent, comme un bouton
    document.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-flip][data-lecteur]')) { e.preventDefault(); entrer(e.target, e.target); }
    });
    const suivre = () => {
      const veut = location.hash === ANCRE;
      if (veut && !ouvert) { pousse = !!history.state?.lecteur; history.state?.chevet && depuisChevet() ? ouvrirChevet(null) : ouvrir(null); }
      else if (!veut && ouvert) fermer();
    };
    addEventListener('popstate', suivre); addEventListener('hashchange', suivre);
    // Échap ici (le catalogue, lui, envoie « fermer ») ; le panier ou le menu ouverts passent d'abord
    addEventListener('keydown', e => { if (e.key === 'Escape' && ouvert && !$('#cart.is-open, #drawer.is-open')) demander(); }, true);
    addEventListener('message', e => {
      const d = e.data;
      if (!vue || e.source !== vue.contentWindow || e.origin !== ORIGINE || d?.source !== 'librery-catalogue') return;
      if (d.type === 'pret') {
        // prêt : il apprend s'il est vu (caché, il attend « ouvert ») ; ouvert pendant son chargement, le focus entre alors
        // dans son document (sauf si le visiteur l'a mis ailleurs, sur Retour ou l'en-tête)
        pret = true;
        if (Array.isArray(d.decors)) decorChevet = d.decors.includes('chevet');   // le catalogue dit ce qu'il sait faire
        if (vue.dataset.mode === 'chevet') {
          // décor chevet : préparé d'avance, il attend caché ; attendu, il remplace la section (recadré d'abord si la
          // page a changé depuis son adresse). Déjà montré par le délai de garde : il apprend qu'il est vu (en plein
          // fondu, « ouvert » viendra à sa fin) ; sur le retour, il est déjà sur l'image clé
          if (etatChevet === 'attente') {
            // attendu (cliqué avant qu'il soit prêt) : les textes s'effacent maintenant, le fondu suit (3 s de garde à
            // nouveau, pour un éventuel recadrage) ; le bouton garde « Ouverture… » en s'effaçant, finChevet le rétablit
            if (patience) { html.classList.replace('lecteur-patience', 'lecteur-chevet'); panneau.setAttribute('aria-busy', false); tAttente = performance.now(); clearTimeout(garde); garde = setTimeout(secours, 3000); }
            const c = chevetVivant() ? cadreChevet() : null;
            if (!c || signe(c) === chargeAvec) basculer(); else { chargeAvec = signe(c); dire('revenir', c); }
          } else if (panneau.dataset.etat === 'ouvert') { dire('ouvert'); if ([panneau, vue, body].includes(document.activeElement)) viser(); }
          else if (etatChevet === 'retour') fondreRetour();
          else if (etatChevet !== 'ouvert') dire('ferme');
          return;
        }
        dire(ouvert ? 'ouvert' : 'ferme');
        if (ouvert && [panneau, vue, body].includes(document.activeElement)) viser();
      } else if (d.type === 'revenu') { if (etatChevet === 'attente') basculer(); else if (etatChevet === 'retour') fondreRetour(); }
      else if (d.type === 'fermer') demander();
    });
    addEventListener('resize', () => { if (panneau && !panneau.hidden) placer(); });

    // préchargement : survol à la souris ou focus au clavier d'un lien, livre de l'accueil à l'écran (après une pause
    // du défilement, pour que le chargement ne saccade pas le feuilletage). Pas au toucher : le doigt « survole »
    // au moment même du clic, et sur téléphone le cadre partage souvent le fil de la page.
    // Depuis la section du chevet, le cadre se prépare en décor chevet (≈ 6 Mo, « pret » en 2 à 3 s sur la fibre, 6 à 7 s
    // en 4G : chargé au clic seulement, il arrivait trop tard), mesuré là où la section s'épinglera, livre fermé : à la
    // souris, dès que la 3D de la section est en place et le visiteur à trois écrans d'elle (au premier moment libre) ;
    // au toucher, le mouvement fini (image clé à l'écran), à l'arrêt du défilement. Jamais le catalogue habituel
    // d'abord sur l'accueil quand le décor chevet est prévu : il serait chargé pour rien. Rien en économie de données
    // ni sur une connexion lente (lent, plus haut).
    const prechargerChevet = () => {
      if (ouvert || etatChevet || !depuisChevet()) return false;
      if (vue?.dataset.mode === 'chevet') return true;
      if (avancee() > CHEVET.livre) return false;            // livre ouvert : sa couverture n'est plus mesurable
      creer(false); preparer(); chargerChevet(cadreChevet()); return true;
    };
    const accueil = el => decorChevet && el.closest?.('#catalogue') && flip?.classList.contains('flip--chevet');   // 3D prévue (montée ou en route)
    const prechauffer = e => { if (e.type === 'focus' ? e.target.matches(':focus-visible') : e.pointerType === 'mouse') accueil(e.currentTarget) ? prechargerChevet() : creer(); };
    if (!lent) liens.forEach(a => ['pointerenter', 'focus'].forEach(t => a.addEventListener(t, prechauffer)));
    if (livre && !lent && 'IntersectionObserver' in window) {
      livre.addEventListener('pointerenter', prechauffer);
      const sec = livre.closest('#catalogue'), souris = matchMedia('(hover: hover)').matches;
      let t = 0, proche = false, fait = false;
      // décor chevet (3D prévue) : dès qu'il se peut, comme dit plus haut ; sinon (3D absente ou en repli), le catalogue
      // habituel, à la souris, section à l'écran et défilement arrêté, comme avant
      const tenter = () => {
        if (fait) return;
        if (accueil(livre)) fait = chevetVivant() && (souris || avancee() >= CHEVET.vol) && prechargerChevet();
        else if (souris) { const r = sec.getBoundingClientRect(); fait = r.top < innerHeight && r.bottom > 0 && (creer(), true); }
        if (fait) { removeEventListener('scroll', repos); io.disconnect(); mo.disconnect(); }
      };
      const repos = () => { clearTimeout(t); t = setTimeout(tenter, 500); };
      const libre = () => 'requestIdleCallback' in window ? requestIdleCallback(tenter, { timeout: 1000 }) : setTimeout(tenter, 200);
      const io = new IntersectionObserver(([en]) => {
        proche = en.isIntersecting;
        if (proche) { addEventListener('scroll', repos, { passive: true }); libre(); } else removeEventListener('scroll', repos);
      }, { rootMargin: '300% 0px' });
      // la 3D de la section arrive (is-3d) ou se replie : on réessaie aussitôt à la souris ; au toucher, à l'arrêt du
      // défilement (les classes de la section changent aussi en plein geste, au passage de CHEVET.vol)
      const mo = new MutationObserver(() => { if (proche) (souris ? libre : repos)(); });
      io.observe(sec); if (flip) mo.observe(flip, { attributes: true, attributeFilter: ['class'] });
    }
    // lien direct (ou rechargement, retour d'une autre page) : ouvert d'emblée, sans glissement ; l'entrée est peut-être la nôtre
    if (location.hash === ANCRE) { pousse = !!history.state?.lecteur; ouvrir(null, true); }
  }

  /* film d'ouverture : lecture muette lancée explicitement (Safari, iPhone), bouton Pause / Lecture toujours visible.
     Si l'appareil bloque la lecture automatique (économie d'énergie), le bouton propose « Lecture ». */
  function filmControl(root) {
    const v = $('.coll-hero video, .s-hero__film', root), b = $('[data-film]', root); if (!v || !b || b.dataset.bound) return;
    b.dataset.bound = 1;
    if (v.dataset.mobile && matchMedia('(max-width: 800px)').matches) v.src = v.dataset.mobile;
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    const label = () => { b.textContent = v.paused ? 'Lecture' : 'Pause'; b.setAttribute('aria-label', v.paused ? 'Lire le film' : 'Mettre le film en pause'); };
    ['play', 'playing', 'pause'].forEach(e => v.addEventListener(e, label));
    b.addEventListener('click', () => { v.paused ? v.play().catch(() => {}) : v.pause(); });
    v.play().catch(() => {}); label();
  }

  /* date de livraison estimée : +3 jours ouvrés */
  function eta() { const d = new Date(); let n = 0; while (n < 3) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n++; } return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }

  /* ------------------------------------------------------------------ */
  /* L'horloge du sillage : la vaporisation, heure par heure            */
  /* (Shopify : snippet sillage.liquid, notes lues dans les métachamps)  */
  /* ------------------------------------------------------------------ */
  const cleanNote = n => n.replace(/\s+(STT|SFE|Ess|NP|FirAbs|Abs)\b/g, '').replace(/®/g, '').replace(/\s*\([^)]*\)/g, '').trim();
  const notesOf = p => p.materials ? p.materials.list : p.notes;
  const clockTime = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`;
  // le curseur suit sa règle (Vaporisation · 1 h · 2 h · 4 h · 8 h, à intervalles égaux) : position 0 → 480, minutes non linéaires
  const STOPS = [0, 60, 120, 240, 480];
  const posMin = v => { const k = Math.min(4, Math.max(0, v / 120)), i = Math.min(3, Math.floor(k)); return Math.round((STOPS[i] + (STOPS[i + 1] - STOPS[i]) * (k - i)) / 5) * 5; };
  // trois phases, en position du curseur, la même règle que les arcs du cadran : tête jusqu'à 30 min, cœur jusqu'à 4 h, fond ensuite
  const PHASES = ['Tête', 'Cœur', 'Fond'];
  const phaseAt = v => v < 60 ? 0 : v < 360 ? 1 : 2;
  // les notes des trois phases : celles du moment en grand, les autres en petit, estompées (leur nom devant)
  function clockRows(p) {
    const n = notesOf(p);
    return [n.tete, n.coeur, n.fond].map((v, i) =>
      `<li><span class="clock__k">${PHASES[i]}</span> <span class="clock__n">${v.split(/,\s*/).map(x => esc(cleanNote(x)).replace(/ /g, '&nbsp;')).join('&nbsp;· ')}</span></li>`).join('');
  }
  // l'affiche du cadran : la même scène, figée à la vaporisation (5:4, ordinateur ; « -m », carrée, téléphone), sous le rendu 3D
  const clockPoster = h => `--poster:url(/assets/img/sillage/${h}.webp);--poster-m:url(/assets/img/sillage/${h}-m.webp)`;
  const clockHTML = (p, head = '') => `
    <div class="clock" data-clock="${p.handle}">
      ${head}
      <div class="clock__stage" aria-hidden="true" style="${clockPoster(p.handle)}"></div>
      <div class="clock__txt">
        <p class="clock__t">Sur la peau depuis <b>0 min</b> — <em>Tête</em></p>
        <ol class="clock__rows">${clockRows(p)}</ol>
        <input type="range" min="0" max="480" step="5" value="0" aria-label="Temps écoulé depuis la vaporisation">
        <div class="clock__scale" aria-hidden="true"><span style="--k:0">Vaporisation</span><span style="--k:.25">1 h</span><span style="--k:.5">2 h</span><span style="--k:.75">4 h</span><span style="--k:1">8 h</span></div>
        <button class="tlink" type="button" data-clock-play>Laisser le temps passer</button>
      </div>
    </div>`;
  function bindClock(el) {
    const range = $('input', el), label = $('.clock__t b', el), nom = $('.clock__t em', el);
    let raf = 0, touched = false;
    const render = () => {
      const v = +range.value, m = posMin(v), i = phaseAt(v);
      label.textContent = clockTime(m); nom.textContent = PHASES[i];
      range.setAttribute('aria-valuetext', `${clockTime(m)}, ${PHASES[i].toLocaleLowerCase('fr')}`);
      $$('.clock__rows li', el).forEach((r, j) => { r.dataset.s = j < i ? 'passe' : j > i ? 'vient' : 'la'; });
      el.sillage?.setTime(v / 480);
    };
    // la course : de la vaporisation à 8 h, en 7 s ; le flacon reste à sa place, l'ombre tourne et l'onde fait le tour
    const play = () => {
      cancelAnimationFrame(raf); const t0 = performance.now(), D = 7000;
      const step = now => { const k = Math.min(1, Math.max(0, (now - t0) / D)); range.value = Math.round(k * 480 / 5) * 5; render(); if (k < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    range.addEventListener('input', () => { touched = true; cancelAnimationFrame(raf); render(); });
    $('[data-clock-play]', el).addEventListener('click', () => {
      touched = true;
      // téléphone : la scène et le bouton ne tiennent pas ensemble entre l'en-tête et la barre d'achat ; si le haut de la
      // scène (l'arc de la tête, d'où part l'onde) est sous l'en-tête, on la ramène juste dessous avant la course
      const st = $('.clock__stage', el);
      if (st && innerWidth <= 800 && st.getBoundingClientRect().top < (parseFloat(getComputedStyle(st).scrollMarginTop) || 68) - 1)
        st.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      play();
    });
    // la liste garde la hauteur de sa phase la plus haute : rien ne bouge sous elle quand la phase change
    const rows = $('.clock__rows', el); let large = 0;
    const fige = () => {
      const lis = $$('li', rows), etat = lis.map(r => r.dataset.s); let h = 0;
      rows.style.minHeight = ''; large = rows.clientWidth;
      for (let i = 0; i < 3; i++) { lis.forEach((r, j) => { r.dataset.s = j < i ? 'passe' : j > i ? 'vient' : 'la'; }); h = Math.max(h, rows.offsetHeight); }
      lis.forEach((r, j) => { r.dataset.s = etat[j]; }); rows.style.minHeight = h + 'px';
    };
    render(); fige();
    document.fonts?.ready.then(fige);
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (rows.clientWidth !== large) fige(); }).observe(rows);
    el.rerender = () => { render(); fige(); };
    sundial(el, () => range.value / 480);
    // lecture automatique une fois, quand la scène est bien à l'écran (aux trois quarts, ou sur l'essentiel de l'écran si elle
    // est plus haute que lui) : l'onde part sous les yeux ; la course attend le flacon (2,5 s au plus). Sans scène (pas de
    // WebGL 2, ou chargement manqué), l'horloge elle-même, à 45 %
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
      let lu = false; const ios = [];
      const lire = () => {
        if (lu) return; lu = true; ios.forEach(o => o.disconnect());
        Promise.race([el.dial, new Promise(r => setTimeout(r, 2500))]).then(() => { if (!touched) play(); });
      };
      const guette = (cible, assez) => {
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && cible.isConnected && assez(e)) lire(); },
          { threshold: [0, .1, .2, .3, .4, .45, .5, .6, .7, .75, .8, .9, 1] });
        io.observe(cible); ios.push(io);
      };
      const st = $('.clock__stage', el), horloge = e => e.intersectionRatio >= .44;
      if (st) {
        guette(st, e => e.intersectionRatio >= .74 || e.intersectionRect.height >= .7 * (e.rootBounds?.height || innerHeight));
        el.dial.then(() => { if (!lu && !st.isConnected) guette(el, horloge); });   // la scène retirée : l'horloge prend le relais
      } else guette(el, horloge);
    }
  }
  // le cadran solaire : le flacon du parfum et son ombre (assets/js/sillage3d.js, Three.js), chargé quand l'horloge
  // approche de l'écran ; sans WebGL 2, ou si le chargement échoue, l'horloge reste telle qu'avant
  let gl2;
  const hasGL2 = () => gl2 ??= (() => { try { const g = document.createElement('canvas').getContext('webgl2'); g?.getExtension('WEBGL_lose_context')?.loseContext(); return !!g; } catch (e) { return false; } })();
  function sundial(el, now) {
    let fait; el.dial = new Promise(r => fait = r);          // résolue quand le cadran est à l'écran, ou qu'il n'y sera pas
    const stage = $('.clock__stage', el); if (!stage) return fait();
    if (!('IntersectionObserver' in window && 'ResizeObserver' in window) || !hasGL2()) { stage.remove(); return fait(); }
    // monté à son approche, ou plus tôt, hors de l'écran, au premier calme après l'écran de chargement (initPrechauffe)
    let lance = false;
    const lancer = () => {
      if (lance) return; lance = true; io.disconnect();
      import('sillage3d').then(m => {
        const p = byHandle(el.dataset.clock);                // ses notes donnent les couleurs du lavis
        el.sillage = m.mount(stage, el.dataset.clock, now(), { notes: p && notesOf(p) });
        return el.sillage.ready.then(() => { stage.classList.add('is-on'); fait(); });
      }).catch(() => {
        el.sillage?.dispose(); el.sillage = null; fait();
        // à l'écran, l'affiche reste à sa place (pas de saut de page) ; hors de l'écran, la scène s'efface
        const r = stage.getBoundingClientRect(); if (r.top > innerHeight || r.bottom < 0) stage.remove();
      });
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) lancer(); }, { rootMargin: '300px 0px' });
    io.observe(stage);
    aMonter.push(lancer);
  }

  function initProduct() {
    const root = $('#product'); if (!root) return;
    const askedP = new URLSearchParams(location.search).get('p');
    // un produit en pause (Coffret à composer) mène au Coffret Découverte
    const p = byHandle(PAUSED_PRODUCTS.some(x => x.handle === askedP) ? 'coffret-decouverte' : askedP) || PRODUCTS[0];
    if (askedP && askedP !== p.handle && PAUSED_PRODUCTS.some(x => x.handle === askedP)) { const u = new URL(location.href); u.searchParams.set('p', p.handle); history.replaceState(null, '', u); }
    const col = COLLECTIONS[p.collection];
    const perf = p.perfumer && PERFUMERS[p.perfumer];
    const fmts = formatsOf(p); let current = fmts[0];
    const defFmt = p.fmtImages ? fmts[0].id : '100';   // packshot montré au chargement
    const isPerfume = !p.type; let picks = [];
    document.title = `${p.name} — LIBRERY`;
    const sample = fmts.find(f => f.id === '2');
    const perfumes = PRODUCTS.filter(x => !x.type);
    const related = PRODUCTS.filter(x => x.handle !== p.handle && x.collection === p.collection).concat(PRODUCTS.filter(x => x.collection !== p.collection && !x.type)).slice(0, 3);
    const acc = (t, c) => `<div class="acc"><button type="button" aria-expanded="false">${t}</button><div class="acc__panel">${c}</div></div>`;
    const cta = () => p.builder && picks.length < p.builder ? `Choisissez encore ${p.builder - picks.length} parfum${p.builder - picks.length > 1 ? 's' : ''}` : `Ajouter au panier — ${eur(current.price)}`;
    const story = p.description.slice(0, 2), more = p.description.slice(2);
    // une seule pyramide : si la « lecture des matières » (catalogue) existe, elle fait foi
    const notes = p.materials ? p.materials.list : p.notes;

    root.innerHTML = `
      <section class="pdp">
        <div class="pdp__media">
          <div class="pdp__gallery" id="gallery">${p.gallery.map((g, i) => {
            // ordinateur : une image par ligne, pleine colonne ; mobile : galerie à glisser
            // un seul packshot à la fois : celui du format choisi (le 30 ml n'apparaît qu'au clic sur « 30 ml »)
            const fmt = g === p.pack ? '100' : g === p.pack30 ? '30' : (p.fmtImages && Object.keys(p.fmtImages).find(k => p.fmtImages[k].includes(g))) || '';
            // tout packshot (flacon, coffret) est cadré au nombre d'or : frameGold
            return `<figure class="${g === p.pack || g === p.pack30 ? 'is-pack ' : ''}${gold(g) ? `is-gold" data-gold="${g}` : ''}"${fmt ? ` data-fmt="${fmt}"` : ''}${fmt && fmt !== defFmt ? ' hidden' : ''}>${pic(g, p.name, '(max-width: 900px) 100vw, 58vw', '', i === 0)}</figure>`;
          }).join('')}</div>
          <span class="pdp__count" id="gcount"></span>
        </div>
        <div class="pdp__info"><div class="pdp__box">
          <div class="pdp__crumbs"><span><a href="/bibliotheque">Bibliothèque</a> / <a href="/collection?c=${p.collection}">${esc(col.title)}</a></span></div>
          <h1 class="pdp__name">${nm(p.name)}</h1>
          <p class="pdp__type">${isPerfume ? `Extrait de parfum 25 %${p.isNew ? ' · Nouveauté' : ''}` : esc(p.subtitle)}</p>
          ${p.keyNotes && isPerfume ? `<p class="pdp__notes-line">${esc(p.keyNotes.replace(/ · /g, ', '))}</p>` : ''}
          ${p.families && isPerfume ? `<p class="pdp__fams">Famille ${p.families.map(f => `<a href="/bibliotheque?famille=${encodeURIComponent(f)}#familles">${f}</a>`).join(' · ')}</p>` : ''}
          <p class="pdp__desc">${p.tagline}</p>
          ${fmts.length > 1 ? `<div class="sizes" id="sizes">${fmts.map((f, i) => `<button type="button" data-f="${f.id}" class="${i ? '' : 'is-active'}">${f.label}<small>${eur(f.price)}</small></button>`).join('')}</div>` : ''}
          ${p.builder ? `<div class="builder"><div class="builder__head"><span>Vos parfums</span><b id="b-count">0 / ${p.builder}</b></div>
            <div class="builder__grid">${perfumes.map(x => `<button type="button" class="builder__item" data-h="${x.handle}"><span class="builder__thumb">${packPic(x.pack, '', '(max-width: 800px) 30vw, 9vw', '', true)}</span><span>${esc(x.name)}</span></button>`).join('')}</div></div>` : ''}
          <button class="btn btn--block" id="add" ${p.builder ? 'disabled' : ''}>${cta()}</button>
          ${isPerfume && sample ? `<button type="button" class="tlink pdp__try" id="try">Essayer d’abord : échantillon 2 ml, ${eur(sample.price)}</button>` : ''}
          <p class="pdp__small">${isPerfume ? `<b>Essayez-le avant de l’ouvrir.</b> Un 2 ml de ${esc(p.name)} accompagne chaque flacon ; s’il ne vous ressemble pas, renvoyez le flacon scellé, le retour est offert.` : p.handle === 'coffret-collection' ? `<b>Une collection entière.</b> Chaque parfum de la collection en extrait 30 ml, réunis dans un même coffret.` : `<b>Valeur recréditée.</b> Un code de la valeur du coffret vous est envoyé, à usage unique et valable 30 jours sur un flacon 100 ml.`}</p>
          <p class="pdp__small">Expédié sous 24 h ouvrées depuis Paris, livré ${eta()}. Deux échantillons offerts.</p>
          ${perf ? `<p class="pdp__by">Composé par <a href="#parfumeur">${esc(perf.name)}</a></p>` : ''}
          <div class="accordion">
            ${notes ? acc('Notes', `<dl class="notes-dl"><div><dt>Tête</dt><dd>${notes.tete}</dd></div><div><dt>Cœur</dt><dd>${notes.coeur}</dd></div><div><dt>Fond</dt><dd>${notes.fond}</dd></div></dl>`) : ''}
            ${isPerfume ? acc('Conseils d’utilisation', '<p>Un extrait se dépose, il ne se frotte pas. Deux ou trois vaporisations à vingt centimètres, sur le cou, les poignets ou les vêtements.</p>') : ''}
            ${acc('Ingrédients', '<p class="muted">Liste INCI complète et allergènes, renseignés dans la fiche produit Shopify.</p>')}
            ${acc('Livraison et retours', '<p>Livraison offerte dès 100 €, expédition sous 24 h ouvrées depuis Paris. Retours offerts sous 30 jours pour tout flacon scellé.</p>')}
          </div>
        </div></div>
      </section>

      <section class="block"><div class="wrap story">
        <div class="story__margin"></div>
        <div class="prose">${story.map(t => `<p>${t}</p>`).join('')}
          ${more.length ? `<div id="more" hidden>${more.map(t => `<p>${t}</p>`).join('')}${p.coda ? `<p>${p.coda.join(' ')}</p>` : ''}</div><button class="tlink more" id="more-btn">Lire la suite</button>` : ''}</div>
        ${p.notes && !p.materials ? `<dl class="story__notes"><div><dt>Tête</dt><dd>${p.notes.tete}</dd></div><div><dt>Cœur</dt><dd>${p.notes.coeur}</dd></div><div><dt>Fond</dt><dd>${p.notes.fond}</dd></div></dl>` : '<div></div>'}
      </div></section>

      ${p.materials ? `<section class="block materials"><div class="wrap split">
        <div><span class="ui">Lecture des matières</span><h2 class="h2" style="margin-top:12px">${esc(p.materials.title)}</h2>
          <dl><div><dt>Tête</dt><dd>${p.materials.list.tete}</dd></div><div><dt>Cœur</dt><dd>${p.materials.list.coeur}</dd></div><div><dt>Fond</dt><dd>${p.materials.list.fond}</dd></div></dl></div>
        <div class="prose">${p.materials.text.map(t => `<p>${t}</p>`).join('')}</div>
      </div></section>` : ''}

      ${isPerfume && notesOf(p) ? `<section class="block" id="sillage"><div class="wrap">
        <div class="row-head"><div><h2 class="h2">Le sillage, <em>heure par heure</em></h2><p>Un extrait se lit dans le temps. Les notes de tête s’évaporent, le cœur s’ouvre, le fond demeure : faites passer les heures.</p></div></div>
        ${clockHTML(p)}
      </div></section>` : ''}

      ${perf ? `<section class="block" id="parfumeur"><div class="wrap perfumer">
        <figure>${pic(perf.image, perf.name, '(max-width: 800px) 60vw, 25vw')}</figure>
        <div><span class="ui muted">Le parfumeur</span><h2 class="h2" style="margin:10px 0 18px">${esc(perf.name)}</h2>
          <div class="prose"><p>${perf.bio[0]}</p></div>
          ${perf.quote ? `<blockquote>« ${perf.quote} »</blockquote>` : ''}
          <p style="margin-top:22px"><a class="tlink" href="/preface#parfumeurs">Les parfumeurs de la maison</a></p></div>
      </div></section>` : ''}

      <section class="block"><div class="wrap">
        <div class="row-head"><div><h2 class="h2">Sur la même étagère</h2></div><a class="tlink" href="/bibliotheque">Toute la bibliothèque</a></div>
        <div class="grid grid--rail">${related.map(card).join('')}</div>
      </div></section>`;
    // barre d'achat collante : hors de <main>, que le glissement du lecteur (transformation de <main>) ne l'emporte pas
    $('main').insertAdjacentHTML('afterend', `<div class="sticky-buy" id="sticky" aria-hidden="true"><div class="wrap"><span class="n">${nm(p.name)}<span id="st-var">${esc(current.label)}</span></span><button class="btn" id="st-add">Ajouter — <span id="st-price">${eur(current.price)}</span></button></div></div>`);

    const shown = () => $$('#gallery figure:not([hidden])');
    const count = () => { const g = $('#gallery'), n = shown().length; $('#gcount').textContent = `${Math.min(n, Math.round(g.scrollLeft / (g.clientWidth || 1)) + 1)} / ${n}`; };
    const showPack = fmt => {
      if (new Set($$('#gallery [data-fmt]').map(f => f.dataset.fmt)).size < 2) return;
      const el = $(`#gallery [data-fmt="${fmt}"]`); if (!el) return;
      const changed = el.hidden;
      $$('#gallery [data-fmt]').forEach(f => { f.hidden = f.dataset.fmt !== fmt; });
      if (!changed) return count();   // même flacon (2 ml, ou 100 ml recliqué) : la page ne bouge pas
      const g = $('#gallery');
      if (g.scrollWidth > g.clientWidth + 4) g.scrollTo({ left: shown().indexOf(el) * g.clientWidth, behavior: 'smooth' });
      else if (el.getBoundingClientRect().top < parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'))) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      count();
    };
    showPack(defFmt); count();
    $$('#gallery figure.is-gold').forEach(frameGold);
    $$('#gallery [data-fmt] img').forEach(i => { i.loading = 'eager'; }); // le 30 ml s'affiche sans attente au clic
    const setFormat = id => {
      current = fmts.find(f => f.id === id) || current;
      $$('#sizes button').forEach(x => x.classList.toggle('is-active', x.dataset.f === current.id));
      $('#add').textContent = cta(); $('#st-var').textContent = current.label; $('#st-price').textContent = eur(current.price);
      showPack(p.fmtImages ? current.id : current.id === '30' ? '30' : '100');
    };
    $$('#sizes button').forEach(b => b.addEventListener('click', () => setFormat(b.dataset.f)));
    const add = () => {
      if (p.builder) { if (picks.length !== p.builder) { $('.builder').scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast(`Choisissez ${p.builder} parfums`); } return addToCart(p.handle, current.id, [...picks]); }
      addToCart(p.handle, current.id);
    };
    $('#add').addEventListener('click', add); $('#st-add').addEventListener('click', add);
    $('#try')?.addEventListener('click', () => { setFormat('2'); addToCart(p.handle, '2'); });
    $('#more-btn')?.addEventListener('click', e => { $('#more').hidden = false; e.target.remove(); });

    if (p.builder) $$('.builder__item').forEach(b => b.addEventListener('click', () => {
      const h = b.dataset.h, i = picks.indexOf(h);
      if (i > -1) picks.splice(i, 1); else if (picks.length < p.builder) picks.push(h); else return toast(`Votre coffret compte déjà ${p.builder} parfums`);
      $$('.builder__item').forEach(x => x.classList.toggle('is-on', picks.includes(x.dataset.h)));
      $('#b-count').textContent = `${picks.length} / ${p.builder}`;
      $('#add').disabled = picks.length < p.builder; $('#add').textContent = cta();
    }));

    // compteur de la galerie (mobile)
    const g = $('#gallery');
    g.addEventListener('scroll', count, { passive: true });

    // barre d'achat collante
    const st = $('#sticky');
    // (un écouteur de défilement plutôt qu'un IntersectionObserver : un défilement rapide peut sauter le bouton sans le croiser)
    let ticking = false;
    const syncSticky = () => { ticking = false; const show = $('#add').getBoundingClientRect().bottom < 0; st.classList.toggle('is-on', show); st.setAttribute('aria-hidden', !show); };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(syncSticky); } }, { passive: true });
    syncSticky();
    accordions(root);
    $$('[data-clock]', root).forEach(bindClock);
  }

  function initStores() {
    const list = $('#stores-list'); if (!list) return;
    let filter = 'all', q = '';
    const countries = ['France', ...[...new Set(STORES.map(s => s.country).filter(c => c !== 'France'))].sort((a, b) => a.localeCompare(b, 'fr'))];
    $('#stores-tabs').innerHTML = `<button data-c="all" class="is-active">Tous</button>` + countries.map(c => `<button data-c="${c}">${c}</button>`).join('');
    let map, markers = [];
    if (window.L) {
      map = L.map('map', { scrollWheelZoom: false }).setView([47.5, 4.5], 5);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19, className: 'librery-tiles' }).addTo(map);
      const icon = L.divIcon({ className: '', html: '<div class="librery-pin"></div>', iconSize: [12, 12], iconAnchor: [6, 6] });
      // une boutique en ligne n'a pas de repère (null garde l'alignement avec STORES)
      markers = STORES.map(s => s.online ? null : L.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.address)}<br>${esc(s.city)}, ${esc(s.country)}`));
    }
    const render = () => {
      const items = STORES.map((s, i) => ({ s, i })).filter(({ s }) => (filter === 'all' || s.country === filter) && (!q || (s.name + ' ' + s.address + ' ' + s.city + ' ' + s.country).toLowerCase().includes(q)));
      list.innerHTML = items.length ? items.map(({ s, i }) => `
        <div class="store" data-i="${i}" role="button" tabindex="0">
          <div class="store__name">${esc(s.name)}</div>
          <div class="store__addr">${s.online ? `Boutique en ligne, ${esc(s.country)}` : `${esc(s.address)}, ${esc(s.city)}, ${esc(s.country)}`}${s.note ? ` · ${esc(s.note)}` : ''}</div>
          <div class="store__links">${s.phone ? `<a href="tel:${s.phone.replace(/\s/g, '')}">${esc(s.phone)}</a>` : ''}${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">Site</a>` : ''}${s.online ? '' : `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address + ' ' + s.city)}" target="_blank" rel="noopener">Itinéraire</a>`}</div>
        </div>`).join('') : '<p class="store muted">Aucune adresse ne correspond.</p>';
      $('#stores-count').textContent = items.length + ' adresses';
      markers.forEach((m, i) => { if (map && m) items.some(x => x.i === i) ? m.addTo(map) : m.remove(); });
      const placed = items.filter(({ s }) => !s.online);
      if (map && placed.length) { const f = placed.filter(({ s }) => s.lng > -30 && s.lng < 60); map.fitBounds(L.latLngBounds((f.length ? f : placed).map(({ s }) => [s.lat, s.lng])), { padding: [50, 50], maxZoom: 13 }); }
      $$('.store[data-i]', list).forEach(el => {
        const go = () => { $$('.store', list).forEach(x => x.classList.remove('is-active')); el.classList.add('is-active'); const s = STORES[+el.dataset.i]; if (s.online) { if (s.url) window.open(s.url, '_blank', 'noopener'); return; } if (map) { map.flyTo([s.lat, s.lng], 15, { duration: .6 }); markers[+el.dataset.i].openPopup(); } };
        el.addEventListener('click', e => { if (!e.target.closest('a')) go(); }); el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      });
    };
    $$('#stores-tabs button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.c; $$('#stores-tabs button').forEach(x => x.classList.toggle('is-active', x === b)); render(); }));
    $('#stores-q').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); render(); });
    render();
  }

  function initQuiz() {
    const root = $('#quiz'); if (!root) return;
    const steps = $$('.quiz__step', root); let i = 0, score = {}, colBoost = '', forGift = false;
    const show = n => { i = n; steps.forEach((s, k) => s.classList.toggle('is-on', k === n)); $('#quiz-bar').style.width = (n / (steps.length - 1) * 100) + '%'; };
    $$('[data-next]', root).forEach(b => b.addEventListener('click', () => {
      forGift = b.dataset.for === 'offrir';
      $$('.quiz__q', root).forEach(q => { q.dataset.orig = q.dataset.orig || q.innerHTML; q.innerHTML = forGift ? q.dataset.gift : q.dataset.orig; });
      show(1);
    }));
    $$('.quiz__opts button', root).forEach(b => b.addEventListener('click', () => {
      if (b.closest('.quiz__step').dataset.q === 'palier') colBoost = b.dataset.v;
      else b.dataset.v.split(',').filter(Boolean).forEach(f => score[f] = (score[f] || 0) + 1);
      if (i < steps.length - 2) return show(i + 1);
      const ranked = PRODUCTS.filter(p => !p.type).map(p => ({ p, s: (p.families || []).reduce((t, f, k) => t + (score[f] || 0) * (k ? .7 : 1), 0) + (p.collection === colBoost ? .6 : 0) + (p.isNew ? .05 : 0) }))
        .sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.p);
      const top = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
      $('#quiz-title').textContent = top ? `Un portrait ${top[0].toLowerCase()}` : 'Votre portrait';
      $('#quiz-sub').textContent = top ? FAMILIES[top[0]] : '';
      $('#quiz-results').innerHTML = `<div class="grid">${ranked.map(card).join('')}</div>`; balanceGrids($('#quiz-results'));
      const c = $('#quiz-cta'); c.textContent = forGift ? 'Voir les idées cadeaux' : 'Les essayer en 2 ml'; c.href = forGift ? '/offrir' : '/produit?p=coffret-decouverte';
      show(steps.length - 1);
    }));
    $('[data-restart]', root).addEventListener('click', () => { score = {}; colBoost = ''; show(0); });
  }

  function initGifts() {
    $$('.grid[data-gift]').forEach(el => {   // les questions du portrait (h2.quiz__q) portent aussi data-gift : leur formulation « cadeau »
      el.innerHTML = el.dataset.gift.split(',').map(t => {
        if (t === 'quiz') return quizTile();
        const [h, f] = t.split('@'); const p = byHandle(h); if (!p) return '';
        const fmt = f && formatsOf(p).find(x => x.id === f);
        return card(fmt ? Object.assign({}, p, { formats: [fmt] }, fmt.id === '30' && p.pack30 ? { pack: p.pack30, pack30: null } : {}) : p);
      }).join('');
    });
  }

  /* Lexique : les cinq familles, leurs parfums (dominante en premier) */
  function initFamilies() {
    const el = $('#fam-list'); if (!el) return;
    el.innerHTML = Object.keys(FAMILIES).map(f => {
      const ps = PRODUCTS.filter(p => (p.families || []).includes(f)).sort((a, b) => a.families.indexOf(f) - b.families.indexOf(f));
      return `<a class="fam-row" href="/bibliotheque?famille=${encodeURIComponent(f)}#familles">
        <span class="fam-row__img">${pic(FAMILY_ART[f], '', '(max-width: 800px) 30vw, 12vw')}</span>
        <span class="fam-row__txt"><span class="h3">${f}</span><span class="fam-row__d">${esc(FAMILIES[f])}</span>
        <span class="fam-row__p">${ps.map(p => nm(p.name)).join(', ')}</span></span></a>`;
    }).join('');
  }

  function initLexClock() {
    const host = $('#lex-clock'); if (!host) return;
    const perfumes = PRODUCTS.filter(p => !p.type), h = 'hot-sand';
    host.innerHTML = clockHTML(byHandle(h), `<label class="clock__pick"><span>Parfum</span><select>${perfumes.map(x => `<option value="${x.handle}" ${x.handle === h ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`);
    const el = $('[data-clock]', host);
    bindClock(el);
    // autre parfum : ses notes, son flacon (même cadran, même heure)
    $('select', host).addEventListener('change', e => {
      const p = byHandle(e.target.value); el.dataset.clock = p.handle;
      $('.clock__rows', el).innerHTML = clockRows(p); el.rerender(); el.sillage?.setPerfume(p.handle, notesOf(p));
      $('.clock__stage', el)?.setAttribute('style', clockPoster(p.handle));
    });
  }

  function initContact() {
    const f = $('#contact-form'); if (!f) return;
    f.addEventListener('submit', e => { e.preventDefault(); f.outerHTML = '<p class="lede">Merci. Nous vous répondons sous deux jours ouvrés.</p>'; });
  }

  /* ------------------------------------------------------------------ */
  initCollection();            // avant l'en-tête : fixe le titre courant
  renderHeader(); renderFooter(); renderCartShell();
  $('#open-cart')?.addEventListener('click', openCart);
  initLoader(); initHero(); initHome(); initEntete(); initFlip(); filmControl(document); initLibrary(); initProduct(); initStores(); initQuiz(); initGifts(); initFamilies(); initLexClock(); initContact();
  initLecteur();               // après les pages : tous les liens vers le catalogue existent
  renderCart(); bindToasts(); bindCards(); accordions(); newsletters(); balanceGrids();
  initEdito();                 // en dernier : toutes les images éditoriales sont rendues
  initPrechauffe();            // après tout : les scènes 3D et les images de la page existent
})();
