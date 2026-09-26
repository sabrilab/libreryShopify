/* ==========================================================================
   LIBRERY — comportements de la maquette
   (en-tête, pied de page, panier, cartes produits, carrousels, pages)
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
  const page = document.body.dataset.page || '';

  /* ------------------------------------------------------------------ */
  /* Visuels : image réelle ou placeholder élégant                       */
  /* ------------------------------------------------------------------ */
  function placeholder(p, cls = '', tag = 'Visuel à venir') {
    return `<div class="ph ph--flacon ${cls}" style="--tone:${p.tone || 'var(--creme-2)'}">
      <div class="ph__inner"><div class="ph__bottle"></div><div class="ph__name">${esc(p.name)}</div><div class="ph__tag">${tag}</div></div></div>`;
  }
  function media(p, i = 0, cls = '') {
    const src = p.images && p.images[i];
    return src ? `<img class="${cls}" src="${IMG + src}" alt="${esc(p.name)}" loading="lazy">` : placeholder(p, cls);
  }

  /* ------------------------------------------------------------------ */
  /* En-tête + menu mobile + pied de page                                */
  /* ------------------------------------------------------------------ */
  const NAV = [
    { href: '/', label: 'Accueil', key: 'home' },
    { label: 'Bibliothèque', key: 'bibliotheque', href: '/bibliotheque', sub: [
      { eyebrow: 'Fragrances' },
      { href: '/collection?c=skin-obsession', label: 'Skin Obsession', tag: 'Nouveau' },
      { href: '/collection?c=summer-vibes', label: 'Summer Vibes' },
      { href: '/collection?c=coffrets', label: 'Coffrets Découverte' },
      { eyebrow: 'Maison' },
      { href: '/collection?c=bougies', label: 'Bougies', tag: 'Bientôt' },
      { href: '/bibliotheque', label: 'Toute la bibliothèque' }
    ] },
    { href: '/preface', label: 'La Préface', key: 'preface' },
    { href: '/lexique', label: 'Le Lexique', key: 'lexique' },
    { href: '/points-de-vente', label: 'La Carte', key: 'carte' },
    { href: '/contact', label: 'Contact', key: 'contact' }
  ];

  function renderHeader() {
    const host = $('#site-header');
    if (!host) return;
    const nav = NAV.map(n => n.sub
      ? `<div class="has-sub"><button type="button" onclick="location.href='${n.href}'" ${n.key === page ? 'aria-current="page"' : ''}>${n.label}</button>
          <div class="submenu">${n.sub.map(s => s.eyebrow ? `<span class="eyebrow">${s.eyebrow}</span>` : `<a href="${s.href}">${s.label}${s.tag ? `<span class="soon">${s.tag}</span>` : ''}</a>`).join('')}</div></div>`
      : `<a href="${n.href}" ${n.key === page ? 'aria-current="page"' : ''}>${n.label}</a>`).join('');

    host.outerHTML = `
      <div class="announce">Livraison offerte dès 100 € d’achat · Extraits de parfum concentrés à 25 %</div>
      <header class="header" id="header">
        <div class="header__in">
          <div class="header__left">
            <button class="burger" aria-label="Menu" id="burger"><span></span><span></span></button>
            <a href="/" class="logo" aria-label="LIBRERY — accueil">LIBRERY</a>
          </div>
          <nav class="nav" aria-label="Navigation principale">${nav}</nav>
          <div class="utils">
            <button type="button" class="u-hide" data-toast="La recherche sera branchée sur Shopify">Rechercher</button>
            <button type="button" class="u-hide u-hide-sm" data-toast="L’espace client sera celui de Shopify">Compte</button>
            <button type="button" id="open-cart">Panier (<span class="count" data-cart-count>0</span>)</button>
          </div>
        </div>
      </header>
      <div class="drawer-nav" id="drawer-nav" aria-hidden="true">
        <button class="drawer-nav__close" id="close-nav">Fermer</button>
        <a href="/">Accueil</a>
        <a href="/bibliotheque">Bibliothèque</a>
        <div class="sub">
          <a href="/collection?c=skin-obsession">Skin Obsession</a>
          <a href="/collection?c=summer-vibes">Summer Vibes</a>
          <a href="/collection?c=coffrets">Coffrets Découverte</a>
          <a href="/collection?c=bougies">Bougies</a>
        </div>
        <a href="/preface">La Préface</a>
        <a href="/lexique">Le Lexique</a>
        <a href="/points-de-vente">La Carte</a>
        <a href="/contact">Contact</a>
        <span class="eyebrow">Maison de parfum · Paris</span>
      </div>`;

    const dn = $('#drawer-nav');
    $('#burger').addEventListener('click', () => { dn.classList.add('is-open'); dn.setAttribute('aria-hidden', 'false'); });
    $('#close-nav').addEventListener('click', () => { dn.classList.remove('is-open'); dn.setAttribute('aria-hidden', 'true'); });

    // En-tête transparent sur la vidéo d'accueil
    if (document.body.classList.contains('page-home')) {
      document.body.classList.add('has-announce');
      const header = $('#header');
      const hero = $('.s-hero');
      const onScroll = () => {
        const y = window.scrollY;
        header.classList.toggle('is-scrolled', y > 35);
        header.classList.toggle('is-over', !hero || y < hero.offsetHeight - 90);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  function renderFooter() {
    const host = $('#site-footer');
    if (!host) return;
    host.outerHTML = `
      <footer class="footer">
        <div class="wrap">
          <div class="footer__top">
            <div class="footer__brand">
              <img src="${IMG}site/logo-white.webp" alt="LIBRERY Paris">
              <p>La bibliothèque olfactive, où chaque fragrance se fait récit et chaque note, un souvenir.</p>
            </div>
            <div><h4>Bibliothèque</h4><ul>
              <li><a href="/collection?c=skin-obsession">Skin Obsession</a></li>
              <li><a href="/collection?c=summer-vibes">Summer Vibes</a></li>
              <li><a href="/collection?c=coffrets">Coffrets Découverte</a></li>
              <li><a href="/collection?c=bougies">Bougies</a></li></ul></div>
            <div><h4>La Maison</h4><ul>
              <li><a href="/preface">La Préface</a></li>
              <li><a href="/preface#parfumeurs">Nos parfumeurs</a></li>
              <li><a href="/lexique">Le Lexique</a></li>
              <li><a href="/points-de-vente">Points de vente</a></li></ul></div>
            <div><h4>Aide</h4><ul>
              <li><a href="/contact">Contact</a></li>
              <li><a href="#" data-toast="Page existante reprise de Shopify">CGV</a></li>
              <li><a href="#" data-toast="Page existante reprise de Shopify">Mentions légales</a></li>
              <li><a href="#" data-toast="Page existante reprise de Shopify">Confidentialité</a></li>
              <li><a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a></li></ul></div>
          </div>
          <div class="footer__word" aria-hidden="true">LIBRERY</div>
          <div class="footer__bottom"><span>© LIBRERY ${new Date().getFullYear()} — Maison de parfum, Paris</span><span>Visa · Mastercard · Amex · CB</span></div>
        </div>
      </footer>
`;
  }

  /* ------------------------------------------------------------------ */
  /* Panier (démo, stockage local)                                       */
  /* ------------------------------------------------------------------ */
  const CART_KEY = 'librery-cart';
  const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } };
  let cart = readCart();
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} renderCart(); };

  function addToCart(handle, fmtId, qty = 1) {
    const line = cart.find(l => l.h === handle && l.f === fmtId);
    if (line) line.q += qty; else cart.push({ h: handle, f: fmtId, q: qty });
    saveCart();
    openCart();
  }

  function renderCartShell() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="overlay" id="overlay"></div>
      <aside class="cart" id="cart" aria-label="Panier" aria-hidden="true">
        <div class="cart__head"><h3>Votre panier</h3><button id="close-cart">Fermer</button></div>
        <div class="cart__ship" id="cart-ship"></div>
        <div class="cart__items" id="cart-items"></div>
        <div class="cart__foot" id="cart-foot"></div>
      </aside>
      <div class="toast" id="toast"></div>`);
    $('#overlay').addEventListener('click', closeAll);
    $('#close-cart').addEventListener('click', closeAll);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
  }
  function openCart() { $('#cart').classList.add('is-open'); $('#overlay').classList.add('is-open'); $('#cart').setAttribute('aria-hidden', 'false'); }
  function closeAll() {
    $('#cart')?.classList.remove('is-open'); $('#overlay')?.classList.remove('is-open'); $('#cart')?.setAttribute('aria-hidden', 'true');
    $('#drawer-nav')?.classList.remove('is-open');
  }

  function renderCart() {
    const items = cart.map(l => {
      const p = byHandle(l.h); if (!p) return null;
      const f = formatsOf(p).find(x => x.id === l.f) || formatsOf(p)[0];
      return { ...l, p, fmt: f, total: f.price * l.q };
    }).filter(Boolean);
    const total = items.reduce((s, i) => s + i.total, 0);
    const count = items.reduce((s, i) => s + i.q, 0);
    $$('[data-cart-count]').forEach(el => el.textContent = count);
    if (!$('#cart-items')) return;

    const left = Math.max(0, FREE_SHIPPING - total);
    $('#cart-ship').innerHTML = (left > 0 ? `Plus que <strong>${eur(left)}</strong> pour la livraison offerte` : 'La livraison vous est offerte')
      + `<div class="bar"><span style="width:${Math.min(100, total / FREE_SHIPPING * 100)}%"></span></div>`;

    $('#cart-items').innerHTML = items.length ? items.map((i, idx) => `
      <div class="line">
        ${i.p.images ? `<img class="line__img" src="${IMG + i.p.images[0]}" alt="">` : `<div class="line__img ph" style="--tone:${i.p.tone}"><div class="ph__inner" style="padding:6px"><div class="ph__name">${esc(i.p.name)}</div></div></div>`}
        <div>
          <div class="line__name">${esc(i.p.name)}</div>
          <div class="line__var">${esc(i.fmt.label)}</div>
          <div class="qty"><button data-q="-1" data-i="${idx}" aria-label="Retirer un">−</button><span>${i.q}</span><button data-q="1" data-i="${idx}" aria-label="Ajouter un">+</button></div>
        </div>
        <div class="line__right"><span>${eur(i.total)}</span><button data-rm="${idx}">Retirer</button></div>
      </div>`).join('')
      : `<div class="cart__empty"><p>Votre bibliothèque attend son premier chapitre.</p><a class="btn btn--ghost" href="/bibliotheque">Découvrir les parfums</a></div>`;

    $('#cart-foot').innerHTML = items.length ? `
      <div class="cart__total"><span>Sous-total</span><span>${eur(total)}</span></div>
      <small>Taxes incluses. Frais de livraison calculés à l’étape suivante.</small>
      <button class="btn btn--block" data-toast="Le paiement sera celui de Shopify (Checkout)">Passer commande</button>` : '';

    $$('#cart-items [data-q]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i; cart[i].q += +b.dataset.q; if (cart[i].q < 1) cart.splice(i, 1); saveCart();
    }));
    $$('#cart-items [data-rm]').forEach(b => b.addEventListener('click', () => { cart.splice(+b.dataset.rm, 1); saveCart(); }));
    bindToasts($('#cart-foot'));
  }

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-in');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-in'), 2600);
  }
  function bindToasts(root = document) {
    $$('[data-toast]', root).forEach(el => {
      if (el.dataset.toastBound) return; el.dataset.toastBound = 1;
      el.addEventListener('click', e => { e.preventDefault(); toast(el.dataset.toast); });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Carte produit (inspiration D'orsay : visuel au survol)              */
  /* ------------------------------------------------------------------ */
  function card(p) {
    const hasAlt = p.images && p.images[1];
    const altLabel = p.collection === 'summer-vibes' ? 'Existe en 30 ml' : 'Découvrir';
    return `
      <a class="card reveal" href="/produit?p=${p.handle}">
        <div class="card__media">
          ${p.isNew ? '<span class="card__badge">Nouveauté</span>' : ''}
          ${p.exclusive ? '<span class="card__badge">Exclu site</span>' : ''}
          ${media(p, 0)}
          ${hasAlt ? `<img class="alt" src="${IMG + p.images[1]}" alt="" loading="lazy">` : ''}
          <span class="card__hover-label">${altLabel}</span>
        </div>
        <div class="card__body">
          <h3 class="card__name">${esc(p.name)}</h3>
          <p class="card__type">${p.type || 'Extrait de Parfum'}</p>
          <p class="card__price">Dès ${eur(minPrice(p))}</p>
          <p class="card__notes">${esc(p.keyNotes)}</p>
        </div>
      </a>`;
  }

  function carousel(el) {
    const track = $('.carousel__track', el);
    const prev = $('[data-prev]', el.closest('section') || el);
    const next = $('[data-next]', el.closest('section') || el);
    const bar = $('.carousel__bar span', el);
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const r = max > 0 ? track.scrollLeft / max : 0;
      const w = Math.min(100, track.clientWidth / track.scrollWidth * 100);
      if (bar) { bar.style.width = w + '%'; bar.style.left = (100 - w) * r + '%'; }
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft > max - 4;
    };
    const step = () => (track.firstElementChild?.getBoundingClientRect().width || 300) + 20;
    prev?.addEventListener('click', () => track.scrollBy({ left: -step() }));
    next?.addEventListener('click', () => track.scrollBy({ left: step() }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Apparition au scroll                                                */
  /* ------------------------------------------------------------------ */
  function reveals() {
    const els = $$('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(e => io.observe(e));
  }

  /* ------------------------------------------------------------------ */
  /* Accordéons                                                          */
  /* ------------------------------------------------------------------ */
  function accordions(root = document) {
    $$('.acc > button', root).forEach(b => b.addEventListener('click', () => {
      const acc = b.parentElement; const open = acc.classList.toggle('is-open'); b.setAttribute('aria-expanded', open);
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Newsletter                                                          */
  /* ------------------------------------------------------------------ */
  function newsletters() {
    $$('form[data-news]').forEach(f => f.addEventListener('submit', e => {
      e.preventDefault();
      f.insertAdjacentHTML('afterend', '<p class="ok">Merci. Le prochain chapitre vous sera envoyé.</p>');
      f.remove();
    }));
  }

  /* ================================================================== */
  /* Pages                                                              */
  /* ================================================================== */

  /* Accueil ----------------------------------------------------------- */
  function initHome() {
    const v = $('.s-hero video');
    const bar = $('.s-hero__progress span');
    if (v && bar) {
      v.addEventListener('timeupdate', () => { if (v.duration) bar.style.width = (v.currentTime / v.duration * 100) + '%'; });
      const snd = $('.s-hero__sound');
      snd?.addEventListener('click', () => { v.muted = !v.muted; snd.textContent = v.muted ? 'Son — off' : 'Son — on'; });
    }
    const fill = (sel, list) => { const el = $(sel); if (el) el.innerHTML = list.map(card).join(''); };
    fill('#so-track', PRODUCTS.filter(p => p.collection === 'skin-obsession'));
    fill('#sv-track', PRODUCTS.filter(p => p.collection === 'summer-vibes'));
    $$('.carousel').forEach(carousel);
  }

  /* Bibliothèque ------------------------------------------------------ */
  function initLibrary() {
    const root = $('#library'); if (!root) return;
    const ORDER = ['skin-obsession', 'summer-vibes', 'coffrets'];
    const params = new URLSearchParams(location.search);
    let filter = params.get('f') || 'all';
    let sort = 'default';

    const render = () => {
      let list = PRODUCTS.filter(p => filter === 'all' || p.collection === filter);
      if (sort === 'asc') list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
      if (sort === 'desc') list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
      if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      $('#lib-count').textContent = list.length + (list.length > 1 ? ' créations' : ' création');
      $$('.pill', $('#lib-pills')).forEach(b => b.classList.toggle('is-active', b.dataset.f === filter));

      if (filter === 'all' && sort === 'default') {
        root.innerHTML = ORDER.map(c => {
          const items = list.filter(p => p.collection === c); const col = COLLECTIONS[c];
          return `<div class="chapter"><span class="eyebrow">${col.chapter}</span><h2 class="h2">${col.title}</h2><a class="link" href="/collection?c=${c}">Lire la collection</a></div>
                  <div class="grid-products">${items.map(card).join('')}</div>`;
        }).join('');
      } else {
        root.innerHTML = `<div class="grid-products">${list.map(card).join('')}</div>`;
      }
      reveals();
    };
    $$('.pill', $('#lib-pills')).forEach(b => b.addEventListener('click', () => {
      filter = b.dataset.f; history.replaceState(null, '', filter === 'all' ? '/bibliotheque' : '/bibliotheque?f=' + filter); render();
    }));
    $('#lib-sort').addEventListener('change', e => { sort = e.target.value; render(); });
    render();
  }

  /* Collection -------------------------------------------------------- */
  function initCollection() {
    const root = $('#collection'); if (!root) return;
    const key = new URLSearchParams(location.search).get('c') || 'summer-vibes';
    const col = COLLECTIONS[key] || COLLECTIONS['summer-vibes'];
    const items = PRODUCTS.filter(p => p.collection === key);
    document.title = `${col.title} — LIBRERY`;

    const hero = col.image
      ? `<section class="coll-hero"><img src="${IMG + col.image}" alt=""><div class="wrap coll-hero__txt">
           <span class="eyebrow" style="color:#e8e2d8">${col.kicker} · ${col.chapter}</span><h1 class="display">${col.title}</h1><p class="lead">${col.lead}</p></div></section>`
      : `<section class="coll-hero coll-hero--plain"><div class="wrap coll-hero__txt">
           <span class="eyebrow">${col.kicker} · ${col.chapter}</span><h1 class="display">${col.title}</h1><p class="lead">${col.lead}</p></div></section>`;

    const grid = items.length ? `<section class="section--tight"><div class="wrap">
        <div class="filters"><span class="filters__count">${items.length} ${items.length > 1 ? 'créations' : 'création'}</span><a class="link" href="/bibliotheque">Toute la bibliothèque</a></div>
        <div class="grid-products">${items.map(card).join('')}</div></div></section>` : '';

    const soon = col.soon ? `<section class="section s-news"><div class="wrap">
        <span class="eyebrow">Liste d’attente</span><h2 class="h2">Être prévenu de la sortie</h2>
        <form data-news><input type="email" required placeholder="Votre adresse e-mail" aria-label="E-mail"><button>M’inscrire</button></form></div></section>` : '';

    const story = col.body.length ? `<section class="section"><div class="wrap">
        <div class="coll-story">${col.body.map((b, i) => `<div class="coll-story__block reveal">
          ${b.h ? `<h2 class="h3">${b.h}</h2>` : '<span class="eyebrow" style="display:block;margin-bottom:20px">Le récit</span>'}
          <div class="prose ${i === 0 ? 'dropcap' : ''}">${b.p.map(t => `<p>${t}</p>`).join('')}</div></div>`).join('')}</div>
      </div></section>` : '';

    const coffretNote = key === 'coffrets' ? `<section class="section--tight bg-creme"><div class="wrap" style="max-width:860px;text-align:center">
        <span class="eyebrow">Le principe</span><p class="lead" style="margin-top:18px">Après votre commande, un code d’une valeur équivalente à celle du coffret 2 ml vous est envoyé par e-mail. Valable 90 jours sur l’achat d’un parfum 100 ml.</p></div></section>` : '';

    root.innerHTML = hero + grid + coffretNote + story + soon;
    reveals(); newsletters();
  }

  /* Fiche produit ----------------------------------------------------- */
  function initProduct() {
    const root = $('#product'); if (!root) return;
    const p = byHandle(new URLSearchParams(location.search).get('p')) || PRODUCTS[0];
    const col = COLLECTIONS[p.collection];
    const perf = p.perfumer && PERFUMERS[p.perfumer];
    const fmts = formatsOf(p);
    let current = fmts[0];
    document.title = `${p.name} — LIBRERY`;

    const gallery = p.images ? p.images.map(src => `<img src="${IMG + src}" alt="${esc(p.name)}">`).join('')
      : [placeholder(p), placeholder(p, '', 'Ambiance à venir'), placeholder(p, '', 'Packaging à venir')].join('');

    const pyramid = p.notes ? `<dl class="pyramid">
        <div class="pyramid__row"><dt>Note de tête</dt><dd>${p.notes.tete}</dd></div>
        <div class="pyramid__row"><dt>Note de cœur</dt><dd>${p.notes.coeur}</dd></div>
        <div class="pyramid__row"><dt>Note de fond</dt><dd>${p.notes.fond}</dd></div></dl>` : '';

    const accs = [];
    if (perf) accs.push(['Parfumeur', `<div class="prose"><p><strong style="font-weight:500">${perf.name}</strong></p><p>${perf.bio[0]}</p><p><a class="link" href="/preface#parfumeurs">Les Alchimistes des Souvenirs</a></p></div>`]);
    if (pyramid) accs.push(['Pyramide olfactive', pyramid]);
    if (p.materials) accs.push(['La lecture des matières', `<div class="prose">
        <p class="muted" style="font-size:13px"><strong>Tête</strong> — ${p.materials.list.tete}<br><strong>Cœur</strong> — ${p.materials.list.coeur}<br><strong>Fond</strong> — ${p.materials.list.fond}</p>
        ${p.materials.text.map(t => `<p>${t}</p>`).join('')}<p><a class="link" href="/lexique#glossaire">Comprendre les procédés</a></p></div>`]);
    accs.push(['Ingrédients', `<div class="prose"><p class="muted">Liste INCI complète à renseigner (fiche produit Shopify). Extrait de parfum concentré à 25 %.</p></div>`]);
    accs.push(['Livraison & retours', `<div class="prose"><p>Livraison offerte dès 100 € d’achat. Expédition soignée depuis Paris. Échantillon 2 ml : le premier chapitre avant le livre entier.</p></div>`]);

    const related = PRODUCTS.filter(x => x.handle !== p.handle && x.collection === p.collection).concat(PRODUCTS.filter(x => x.collection !== p.collection && !x.type)).slice(0, 3);

    root.innerHTML = `
      <section class="pdp">
        <div class="pdp__gallery">${gallery}</div>
        <div class="pdp__info">
          <div class="pdp__box">
            <div class="crumbs"><a href="/bibliotheque">Bibliothèque</a> / <a href="/collection?c=${p.collection}">${col.title}</a></div>
            ${p.isNew ? '<div class="pdp__meta">Nouveauté · ' + col.title + '</div>' : ''}
            ${p.exclusive ? '<div class="pdp__meta">Exclusivité site</div>' : ''}
            <h1 class="pdp__name">${esc(p.name)}</h1>
            <p class="pdp__type">${p.subtitle || 'Extrait de Parfum'}</p>
            <p class="pdp__short">${p.short}</p>
            <p class="pdp__price" id="pdp-price">${eur(current.price)}</p>
            <div class="formats" id="pdp-formats">${fmts.map((f, i) => `<button type="button" data-f="${f.id}" class="${i ? '' : 'is-active'}">${f.label}</button>`).join('')}</div>
            <button class="btn btn--block" id="pdp-add">Ajouter au panier</button>
            <div class="pdp__reassure"><span>Extrait de parfum · 25 % de concentration</span><span>Livraison offerte dès 100 €</span>${p.collection !== 'coffrets' ? '<span>Échantillon 2 ml disponible</span>' : '<span>Code de la valeur du coffret offert</span>'}</div>
          </div>
        </div>
      </section>

      <section class="section"><div class="wrap pdp-desc">
        <div class="pdp-desc__txt reveal">
          <span class="eyebrow">Description</span>
          <div class="prose dropcap" style="margin-top:24px">${p.description.map(t => `<p>${t}</p>`).join('')}</div>
          <div class="accordion">${accs.map(([t, c]) => `<div class="acc"><button type="button" aria-expanded="false">${t}</button><div class="acc__panel"><div>${c}</div></div></div>`).join('')}</div>
        </div>
        <div class="pdp-desc__media reveal">${p.images ? `<img src="${IMG + (p.images[2] || p.images[0])}" alt="">` : placeholder(p, '', 'Visuel d’ambiance à venir')}</div>
      </div></section>

      <section class="section--tight bg-creme"><div class="wrap">
        <div class="s-head"><div class="s-head__txt"><span class="eyebrow">Découvrez aussi…</span></div><a class="link" href="/bibliotheque">Toute la bibliothèque</a></div>
        <div class="grid-products">${related.map(card).join('')}</div>
      </div></section>`;

    $$('#pdp-formats button').forEach(b => b.addEventListener('click', () => {
      $$('#pdp-formats button').forEach(x => x.classList.remove('is-active')); b.classList.add('is-active');
      current = fmts.find(f => f.id === b.dataset.f); $('#pdp-price').textContent = eur(current.price);
    }));
    $('#pdp-add').addEventListener('click', () => addToCart(p.handle, current.id));
    accordions(root); reveals();
    $('.acc', root)?.classList.add('is-open');
  }

  /* Points de vente --------------------------------------------------- */
  function initStores() {
    const list = $('#stores-list'); if (!list) return;
    let filter = 'all', q = '';
    const countries = ['France', ...new Set(STORES.map(s => s.country).filter(c => c !== 'France'))];
    $('#stores-pills').innerHTML = `<button class="pill is-active" data-c="all">Tous</button>` + countries.map(c => `<button class="pill" data-c="${c}">${c}</button>`).join('');

    let map, markers = [];
    if (window.L) {
      map = L.map('map', { scrollWheelZoom: false, zoomControl: true }).setView([47.5, 4.5], 5);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap', maxZoom: 19, className: 'librery-tiles'
      }).addTo(map);
      const icon = L.divIcon({ className: '', html: '<div class="librery-pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
      markers = STORES.map(s => L.marker([s.lat, s.lng], { icon }).addTo(map)
        .bindPopup(`<strong>${esc(s.name)}</strong><br>${esc(s.address)}<br>${esc(s.city)}, ${esc(s.country)}${s.phone ? '<br>' + esc(s.phone) : ''}`));
    }

    const render = () => {
      const items = STORES.map((s, i) => ({ s, i })).filter(({ s }) =>
        (filter === 'all' || s.country === filter) &&
        (!q || (s.name + ' ' + s.address + ' ' + s.city + ' ' + s.country).toLowerCase().includes(q)));
      list.innerHTML = items.length ? items.map(({ s, i }) => `
        <div class="store" data-i="${i}" role="button" tabindex="0">
          <div class="store__name">${esc(s.name)}</div>
          <div class="store__addr">${esc(s.address)}<br>${esc(s.city)}, ${esc(s.country)}</div>
          <div class="store__links">${s.phone ? `<a href="tel:${s.phone.replace(/\s/g, '')}">${esc(s.phone)}</a>` : ''}${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">Site</a>` : ''}
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address + ' ' + s.city)}" target="_blank" rel="noopener">Itinéraire</a></div>
        </div>`).join('') : '<p class="store muted">Aucune adresse ne correspond.</p>';
      $('#stores-count').textContent = items.length + ' adresses';
      markers.forEach((m, i) => { const vis = items.some(x => x.i === i); if (map) vis ? m.addTo(map) : m.remove(); });
      if (map && items.length) {
        // Vue d'ensemble : on cadre l'Europe (l'Australie reste accessible via le filtre)
        const focus = items.filter(({ s }) => s.lng > -30 && s.lng < 60);
        const b = L.latLngBounds((focus.length ? focus : items).map(({ s }) => [s.lat, s.lng]));
        map.fitBounds(b, { padding: [60, 60], maxZoom: 13 });
      }
      $$('.store[data-i]', list).forEach(el => {
        const go = () => {
          $$('.store', list).forEach(x => x.classList.remove('is-active')); el.classList.add('is-active');
          const s = STORES[+el.dataset.i]; if (map) { map.flyTo([s.lat, s.lng], 15, { duration: .8 }); markers[+el.dataset.i].openPopup(); }
        };
        el.addEventListener('click', e => { if (!e.target.closest('a')) go(); });
        el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      });
    };
    $$('#stores-pills .pill').forEach(b => b.addEventListener('click', () => {
      filter = b.dataset.c; $$('#stores-pills .pill').forEach(x => x.classList.toggle('is-active', x === b)); render();
    }));
    $('#stores-q').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); render(); });
    render();
  }

  /* Lexique ----------------------------------------------------------- */
  function initLexique() {
    const nav = $$('.lex-nav a'); if (!nav.length) return;
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) nav.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-40% 0px -55% 0px' });
    $$('.lex-section').forEach(s => io.observe(s));
    const cmp = $('.comparison');
    if (cmp) $('input', cmp).addEventListener('input', e => {
      const v = e.target.value; $('.top', cmp).style.clipPath = `inset(0 ${100 - v}% 0 0)`; $('.handle', cmp).style.left = v + '%';
    });
  }

  /* Contact ----------------------------------------------------------- */
  function initContact() {
    const f = $('#contact-form'); if (!f) return;
    f.addEventListener('submit', e => {
      e.preventDefault();
      f.outerHTML = '<p class="form__ok">Merci pour votre message. Nous vous répondrons très vite.</p>';
    });
  }

  /* ------------------------------------------------------------------ */
  renderHeader();
  renderFooter();
  renderCartShell();
  $('#open-cart')?.addEventListener('click', openCart);
  initHome(); initLibrary(); initCollection(); initProduct(); initStores(); initLexique(); initContact();
  renderCart(); bindToasts(); accordions($('.static-acc') || document.createElement('div')); newsletters(); reveals();
})();
