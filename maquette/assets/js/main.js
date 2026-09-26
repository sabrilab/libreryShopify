/* ==========================================================================
   LIBRERY — comportements du site (v2)
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
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Image responsive : <nom>-m.webp (900 px) et <nom>.webp (1600–2000 px) */
  function pic(name, alt = '', sizes = '(max-width: 900px) 100vw, 50vw', cls = '', eager = false) {
    return `<img class="${cls}" src="${IMG + name}-m.webp" srcset="${IMG + name}-m.webp 900w, ${IMG + name}.webp 1800w" sizes="${sizes}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }
  window.LIB = { pic };

  /* ------------------------------------------------------------------ */
  /* En-tête, méga-menu, menu mobile, pied de page                       */
  /* ------------------------------------------------------------------ */
  function renderHeader() {
    const host = $('#site-header'); if (!host) return;
    const cur = k => (k === page ? 'aria-current="page"' : '');
    host.outerHTML = `
      <div class="announce" id="announce"><span class="is-on">Un 2 ml offert avec chaque flacon : essayez-le avant de l’ouvrir</span><span>Livraison offerte dès 100 € · deux échantillons au choix</span><span>Écrin cadeau et mot manuscrit offerts</span><span>Nouveau chapitre : Skin Obsession, par Coralie Spicher</span></div>
      <header class="header" id="header">
        <div class="header__in">
          <div style="display:flex;align-items:center;gap:24px">
            <button class="burger" aria-label="Ouvrir le menu" id="burger"><span></span><span></span></button>
            <nav class="nav" aria-label="Navigation principale">
              <div class="has-sub">
                <a href="/bibliotheque" ${cur('bibliotheque')}>Bibliothèque</a>
                <div class="mega"><div class="mega__in">
                  <div class="mega__col"><span class="label">Fragrances</span>
                    <a href="/collection?c=skin-obsession">Skin Obsession<small>Nouveau</small></a>
                    <a href="/collection?c=summer-vibes">Summer Vibes</a>
                    <a href="/collection?c=coffrets">Coffrets Découverte</a>
                    <a href="/bibliotheque">Toute la bibliothèque</a></div>
                  <div class="mega__col"><span class="label">Choisir & offrir</span>
                    <a href="/portrait-olfactif">Portrait olfactif</a>
                    <a href="/produit?p=coffret-a-composer">Coffret à composer</a>
                    <a href="/offrir">Offrir</a>
                    <a href="/collection?c=bougies">Bougies<small>Bientôt</small></a></div>
                  <a class="mega__card" href="/collection?c=summer-vibes"><div class="media">${pic('hero-summer', '', '25vw')}</div><span>Summer Vibes — Collection I</span></a>
                  <a class="mega__card" href="/collection?c=skin-obsession"><div class="media">${pic('hero-skin', '', '25vw')}</div><span>Skin Obsession — Collection II</span></a>
                </div></div>
              </div>
              <a href="/preface" ${cur('preface')}>La Préface</a>
              <a href="/lexique" ${cur('lexique')}>Le Lexique</a>
              <a href="/points-de-vente" ${cur('carte')}>La Carte</a>
            </nav>
          </div>
          <a href="/" class="logo" aria-label="LIBRERY — accueil">${LOGO_SVG}</a>
          <div class="utils">
            <a href="/offrir" class="u-hide">Offrir</a>
            <button type="button" class="u-hide u-hide-sm" data-toast="L’espace client sera celui de Shopify">Compte</button>
            <button type="button" id="open-cart">Panier (<span data-cart-count>0</span>)</button>
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
        <a href="/portrait-olfactif">Portrait olfactif</a>
        <a href="/offrir">Offrir</a>
        <a href="/preface">La Préface</a>
        <a href="/lexique">Le Lexique</a>
        <a href="/points-de-vente">La Carte</a>
        <a href="/services">Services</a>
        <a href="/contact">Contact</a>
        <span class="label">LIBRERY · Maison de parfum · Paris</span>
      </div>`;

    const msgs = $$('#announce span'); let am = 0;
    if (msgs.length > 1 && !reduced) setInterval(() => { msgs[am].classList.remove('is-on'); am = (am + 1) % msgs.length; msgs[am].classList.add('is-on'); }, 4200);
    const dn = $('#drawer-nav');
    $('#burger').addEventListener('click', () => { dn.classList.add('is-open'); dn.setAttribute('aria-hidden', 'false'); });
    $('#close-nav').addEventListener('click', () => { dn.classList.remove('is-open'); dn.setAttribute('aria-hidden', 'true'); });

    const header = $('#header');
    const overImage = document.body.classList.contains('page-home') || document.body.classList.contains('page-over');
    if (overImage) document.body.classList.add('page-home', 'has-announce');
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const hero = $('.s-hero, .coll-hero');
      const top = overImage && (!hero || y < hero.offsetHeight - 120);
      header.classList.toggle('is-top', top);
      header.classList.toggle('is-solid', !top && (y > 10 || !overImage));
      header.classList.toggle('is-hidden', y > 600 && y > lastY + 4 && !$('.has-sub:hover'));
      if (y < lastY - 4) header.classList.remove('is-hidden');
      lastY = y;
      document.documentElement.style.setProperty('--mega-top', header.getBoundingClientRect().bottom + 'px');
    };
    if (!overImage) header.classList.add('is-solid');
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function renderFooter() {
    const host = $('#site-footer'); if (!host) return;
    host.outerHTML = `
      <section class="services-strip" aria-label="Nos services"><div class="wrap">
        ${SERVICES.map(x => `<a href="/services"><strong>${x.t}</strong><span>${x.d}</span></a>`).join('')}
      </div></section>
      <footer class="footer">
        <div class="wrap">
          <div class="footer__outro reveal">
            <img src="${IMG}emblem-or.png" alt="">
            <p>L’histoire continue sur la peau.<br>Jusqu’au prochain chapitre.<br>Jusqu’à ce que vous écriviez le vôtre.</p>
          </div>
          <div class="footer__top">
            <div class="footer__brand"><div class="logo">${LOGO_SVG_PARIS}</div>
              <p>La bibliothèque olfactive, où chaque fragrance se fait récit et chaque note, un souvenir. Maison de parfum fondée à Paris par Bey Rafik.</p></div>
            <div><h4>Bibliothèque</h4><ul>
              <li><a href="/collection?c=skin-obsession">Skin Obsession</a></li>
              <li><a href="/collection?c=summer-vibes">Summer Vibes</a></li>
              <li><a href="/collection?c=coffrets">Coffrets Découverte</a></li>
              <li><a href="/collection?c=bougies">Bougies</a></li></ul></div>
            <div><h4>La Maison</h4><ul>
              <li><a href="/preface">La Préface</a></li>
              <li><a href="/preface#parfumeurs">Les parfumeurs</a></li>
              <li><a href="/lexique">Le Lexique</a></li>
              <li><a href="${CATALOGUE_URL}" target="_blank" rel="noopener">Le catalogue 3D</a></li></ul></div>
            <div><h4>Aide</h4><ul>
              <li><a href="/services">Services exclusifs</a></li>
              <li><a href="/offrir">Offrir</a></li>
              <li><a href="/contact">Contact</a></li>
              <li><a href="/points-de-vente">Points de vente</a></li>
              <li><a href="#" data-toast="Page reprise de la boutique Shopify">CGV & mentions</a></li>
              <li><a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a></li></ul></div>
          </div>
          <div class="footer__bottom"><span>© LIBRERY ${new Date().getFullYear()} — Paris</span><span>Visa · Mastercard · Amex · CB</span></div>
        </div>
      </footer>`;
  }

  /* ------------------------------------------------------------------ */
  /* Panier (démonstration)                                              */
  /* ------------------------------------------------------------------ */
  const CART_KEY = 'librery-cart-v2';
  const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } };
  let cart = readCart();
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} renderCart(); };

  /* Options de commande : 2 échantillons au choix, écrin, mot, facture sans prix */
  const EXTRA_KEY = 'librery-cart-extras';
  let extras = (() => { try { return JSON.parse(localStorage.getItem(EXTRA_KEY)) || {}; } catch (e) { return {}; } })();
  extras = Object.assign({ samples: ['', ''], gift: false, msg: '', noPrice: false }, extras);
  const saveExtras = () => { try { localStorage.setItem(EXTRA_KEY, JSON.stringify(extras)); } catch (e) {} };

  function addToCart(handle, fmtId, sel) {
    const key = sel ? sel.join(',') : '';
    const line = cart.find(l => l.h === handle && l.f === fmtId && (l.sel || []).join(',') === key);
    if (line) line.q += 1; else cart.push(sel ? { h: handle, f: fmtId, q: 1, sel } : { h: handle, f: fmtId, q: 1 });
    saveCart(); openCart();
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
      <div class="toast" id="toast" role="status"></div>`);
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
    $$('[data-cart-count]').forEach(el => el.textContent = items.reduce((s, i) => s + i.q, 0));
    if (!$('#cart-items')) return;
    const left = Math.max(0, FREE_SHIPPING - total);
    $('#cart-ship').innerHTML = (left > 0 ? `Plus que <strong>${eur(left)}</strong> pour la livraison offerte` : 'La livraison vous est offerte')
      + `<div class="bar"><span style="width:${Math.min(100, total / FREE_SHIPPING * 100)}%"></span></div>`;

    // « Essayez-le avant de l'ouvrir » : un 2 ml du même parfum pour chaque flacon 100 / 30 ml
    // échantillons pré-sélectionnés (parfums absents du panier), modifiables
    if (items.length && !extras.samples.every(Boolean)) {
      const inCart = items.map(i => i.h);
      const pool = PRODUCTS.filter(p => !p.type && !inCart.includes(p.handle)).sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      extras.samples = extras.samples.map((v, k) => v || (pool[k] ? pool[k].handle : ''));
      saveExtras();
    }
    const tryFirst = [...new Set(items.filter(i => ['100', '30'].includes(i.f)).map(i => i.p))];
    const perfumes = PRODUCTS.filter(p => !p.type);
    const opt = v => `<option value="">Choisir un parfum</option>` + perfumes.map(p => `<option value="${p.handle}" ${v === p.handle ? 'selected' : ''}>${esc(p.name)}</option>`).join('');

    $('#cart-items').innerHTML = items.length ? items.map((i, idx) => `
      <div class="line">
        <img class="line__img" src="${IMG + (i.p.pack || i.p.card)}-m.webp" alt="">
        <div><div class="line__name">${esc(i.p.name)}</div><div class="line__var">${esc(i.fmt.label)}</div>
          ${i.sel ? `<div class="line__sel">${i.sel.map(h => esc(byHandle(h)?.name || h)).join(' · ')}</div>` : ''}
          <div class="qty"><button data-q="-1" data-i="${idx}" aria-label="Retirer un">−</button><span>${i.q}</span><button data-q="1" data-i="${idx}" aria-label="Ajouter un">+</button></div></div>
        <div class="line__right"><span>${eur(i.total)}</span><button data-rm="${idx}">Retirer</button></div>
      </div>`).join('') + tryFirst.map(p => `
      <div class="line line--gift">
        <img class="line__img" src="${IMG + (p.pack || p.card)}-m.webp" alt="">
        <div><div class="line__name">${esc(p.name)} · 2 ml</div><div class="line__var">Essayez-le avant d’ouvrir votre flacon</div></div>
        <div class="line__right"><span>Offert</span></div>
      </div>`).join('') + `
      <div class="cart__opts">
        <div class="cart__opt"><span class="label">Vos deux échantillons offerts · présélectionnés pour vous, à modifier</span>
          <div class="cart__selects"><select data-sample="0" aria-label="Premier échantillon">${opt(extras.samples[0])}</select><select data-sample="1" aria-label="Second échantillon">${opt(extras.samples[1])}</select></div></div>
        <div class="cart__opt">
          <label class="check"><input type="checkbox" data-x="gift" ${extras.gift ? 'checked' : ''}><span>Écrin cadeau offert</span></label>
          ${extras.gift ? `<textarea data-x="msg" maxlength="200" placeholder="Votre mot, écrit à la main (200 caractères)">${esc(extras.msg)}</textarea>
          <label class="check"><input type="checkbox" data-x="noPrice" ${extras.noPrice ? 'checked' : ''}><span>Facture sans prix</span></label>` : ''}
        </div>
      </div>`
      : `<div class="cart__empty"><p>Votre bibliothèque attend son premier chapitre.</p><a class="btn btn--ghost" href="/bibliotheque">Découvrir les parfums</a>
          <p class="muted" style="font-size:14px;font-family:var(--texte);font-style:normal;margin-top:30px">Pas encore décidé ? <a class="link" href="/portrait-olfactif">Faire son portrait olfactif</a></p></div>`;
    const ready = extras.samples.every(Boolean);
    $('#cart-foot').innerHTML = items.length ? `
      <div class="cart__total"><span>Sous-total</span><span>${eur(total)}</span></div>
      <small>Taxes incluses · paiement en 3 fois possible · retours gratuits 30 jours.</small>
      ${ready ? '' : '<small class="cart__warn">Choisissez vos deux échantillons offerts pour continuer.</small>'}
      <button class="btn btn--block" ${ready ? '' : 'disabled'} data-toast="Le paiement sera celui de Shopify (Checkout)">Passer commande</button>` : '';

    $$('#cart-items [data-q]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i; cart[i].q += +b.dataset.q; if (cart[i].q < 1) cart.splice(i, 1); saveCart();
    }));
    $$('#cart-items [data-rm]').forEach(b => b.addEventListener('click', () => { cart.splice(+b.dataset.rm, 1); saveCart(); }));
    $$('#cart-items [data-sample]').forEach(el => el.addEventListener('change', () => { extras.samples[+el.dataset.sample] = el.value; saveExtras(); renderCart(); }));
    $$('#cart-items input[data-x]').forEach(el => el.addEventListener('change', () => { extras[el.dataset.x] = el.checked; saveExtras(); renderCart(); }));
    $$('#cart-items textarea[data-x]').forEach(el => el.addEventListener('input', () => { extras.msg = el.value; saveExtras(); }));
    bindToasts($('#cart-foot'));
  }

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
  /* Carte produit & carrousel                                           */
  /* ------------------------------------------------------------------ */
  function card(p, i = 0) {
    return `
      <a class="card reveal" style="--d:${(i % 3) * .12}s" href="/produit?p=${p.handle}">
        <div class="card__media">
          ${p.isNew ? '<span class="card__badge">Nouveauté</span>' : ''}${p.exclusive ? '<span class="card__badge">Exclusivité site</span>' : ''}
          ${pic(p.pack || p.card, p.name, '(max-width: 900px) 50vw, 33vw')}
          ${p.hover ? pic(p.hover, '', '(max-width: 900px) 50vw, 33vw', 'alt') : ''}
          ${p.hoverLabel ? `<span class="card__hover">${p.hoverLabel}</span>` : ''}
        </div>
        <div class="card__body">
          ${p.families ? `<p class="card__fam">${p.families.join(' · ')}</p>` : ''}
          <h3 class="card__name">${esc(p.name)}</h3>
          <p class="card__type">${p.type || 'Extrait de Parfum 25 %'}</p>
          <p class="card__price">Dès ${eur(minPrice(p))} · ${formatsOf(p).length} formats</p>
          <p class="card__notes">${esc(p.keyNotes)}</p>
        </div>
      </a>`;
  }
  function carousel(el) {
    const track = $('.carousel__track', el);
    const scope = el.closest('section') || el;
    const prev = $('[data-prev]', scope), next = $('[data-next]', scope), bar = $('.carousel__bar span', el);
    const update = () => {
      const max = track.scrollWidth - track.clientWidth, r = max > 0 ? track.scrollLeft / max : 0;
      const w = Math.min(100, track.clientWidth / track.scrollWidth * 100);
      if (bar) { bar.style.width = w + '%'; bar.style.left = (100 - w) * r + '%'; }
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft > max - 4;
    };
    const step = () => (track.firstElementChild?.getBoundingClientRect().width || 300) + 20;
    prev?.addEventListener('click', () => track.scrollBy({ left: -step() }));
    next?.addEventListener('click', () => track.scrollBy({ left: step() }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update); update();
  }

  /* ------------------------------------------------------------------ */
  /* Mouvement : révélations, parallaxe, pellicule                        */
  /* ------------------------------------------------------------------ */
  let io;
  function reveals() {
    const els = $$('.reveal:not(.is-in), .unveil:not(.is-in), .concentration:not(.is-in)');
    if (!('IntersectionObserver' in window) || reduced) { els.forEach(e => e.classList.add('is-in')); return; }
    io = io || new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    els.forEach(e => io.observe(e));
  }
  function parallax() {
    const els = $$('[data-parallax]'); if (!els.length || reduced) return;
    let ticking = false;
    const run = () => {
      const vh = window.innerHeight;
      els.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const k = parseFloat(el.dataset.parallax) || .12;
        el.style.transform = `translate3d(0, ${((r.top + r.height / 2) - vh / 2) * -k}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }
  function films() {
    $$('.film').forEach(f => {
      let down = false, x0 = 0, s0 = 0, moved = false;
      f.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = f.scrollLeft; f.classList.add('is-drag'); });
      window.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) moved = true; f.scrollLeft = s0 - dx; });
      window.addEventListener('pointerup', () => { down = false; f.classList.remove('is-drag'); });
      f.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);
    });
  }
  function accordions(root = document) {
    $$('.acc > button', root).forEach(b => {
      if (b.dataset.bound) return; b.dataset.bound = 1;
      b.addEventListener('click', () => { const open = b.parentElement.classList.toggle('is-open'); b.setAttribute('aria-expanded', open); });
    });
  }
  function newsletters() {
    $$('form[data-news]').forEach(f => f.addEventListener('submit', e => {
      e.preventDefault(); f.insertAdjacentHTML('afterend', '<p class="ok">Merci. Le prochain chapitre vous sera envoyé.</p>'); f.remove();
    }));
  }

  /* ================================================================== */
  /* Pages                                                              */
  /* ================================================================== */
  function initHome() {
    const hero = $('.s-hero'); if (!hero) return;
    // Diaporama « film » : fondu enchaîné + lent zoom, barres de progression
    const slides = $$('.s-hero__slide', hero), bars = $$('.s-hero__bars button', hero), cap = $('.s-hero__caption strong', hero);
    const DUR = 7000; let i = 0, timer;
    hero.style.setProperty('--dur', DUR + 'ms');
    const go = n => {
      slides[i].classList.remove('is-active');
      bars.forEach((b, k) => { b.classList.toggle('is-done', k < n); b.classList.remove('is-active'); });
      i = (n + slides.length) % slides.length;
      if (i === 0) bars.forEach(b => b.classList.remove('is-done'));
      const img = $('img', slides[i]); img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
      slides[i].classList.add('is-active'); void bars[i].offsetWidth; bars[i].classList.add('is-active');
      if (cap) cap.textContent = slides[i].dataset.caption || '';
      clearTimeout(timer); timer = setTimeout(() => go(i + 1), DUR);
    };
    bars.forEach((b, k) => b.addEventListener('click', () => go(k)));
    go(0);

    const fill = (sel, list) => { const el = $(sel); if (el) el.innerHTML = list.map(card).join(''); };
    fill('#so-track', PRODUCTS.filter(p => p.collection === 'skin-obsession'));
    fill('#sv-track', PRODUCTS.filter(p => p.collection === 'summer-vibes'));
    $$('.carousel').forEach(carousel);

    // Sommaire : aperçu de l'image au survol
    const prev = $('.s-contents__preview');
    if (prev) $$('.s-contents__list a').forEach((a, k) => a.addEventListener('mouseenter', () => {
      $$('img', prev).forEach((im, j) => im.classList.toggle('is-on', j === k));
    }));
  }

  /* Tuile « Portrait olfactif » insérée dans la grille (inspiration Byredo) */
  const quizTile = () => `
      <a class="card card--quiz reveal" href="/portrait-olfactif">
        <div class="card__media">${pic('camp-livre', '', '(max-width: 900px) 50vw, 33vw')}
          <div class="card__quiz"><span class="label">Portrait olfactif</span><strong>Quel chapitre vous ressemble ?</strong><span class="link">Quatre questions <span class="arr">→</span></span></div></div>
      </a>`;

  function initLibrary() {
    const root = $('#library'); if (!root) return;
    const ORDER = ['skin-obsession', 'summer-vibes', 'coffrets'];
    const q = new URLSearchParams(location.search);
    let filter = q.get('f') || 'all', fam = q.get('famille') || '', sort = 'default';
    // pastilles familles olfactives, avec le nombre de créations
    $('#lib-fams').innerHTML = `<span class="label">Familles</span>` + Object.keys(FAMILIES).map(f =>
      `<button class="pill pill--fam" data-fam="${f}" title="${esc(FAMILIES[f])}">${f} <sup>${PRODUCTS.filter(p => (p.families || []).includes(f)).length}</sup></button>`).join('');
    const render = () => {
      let list = PRODUCTS.filter(p => (filter === 'all' || p.collection === filter) && (!fam || (p.families || []).includes(fam)));
      if (sort === 'asc') list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
      if (sort === 'desc') list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
      if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      $('#lib-count').textContent = list.length + (list.length > 1 ? ' créations' : ' création');
      $$('#lib-pills .pill').forEach(b => b.classList.toggle('is-active', b.dataset.f === filter));
      $$('#lib-fams .pill').forEach(b => b.classList.toggle('is-active', b.dataset.fam === fam));
      $('#lib-fam-desc').textContent = fam ? FAMILIES[fam] : '';
      root.innerHTML = (filter === 'all' && !fam && sort === 'default')
        ? ORDER.map(c => {
            const col = COLLECTIONS[c], items = list.filter(p => p.collection === c);
            return `<div class="chapter"><span class="num">${col.number}</span><div><span class="runhead">${col.chapter}</span><h2 class="h2">${col.title}</h2></div>
                      <a class="link" href="/collection?c=${c}">Lire le chapitre <span class="arr">→</span></a></div>
                    <div class="grid-products">${items.map(card).join('')}${items.length % 3 ? quizTile() : ''}</div>`;
          }).join('')
        : `<div class="grid-products">${list.map(card).join('') || '<p class="muted">Aucune création pour ce filtre.</p>'}</div>`;
      reveals();
    };
    const url = () => { const u = new URLSearchParams(); if (filter !== 'all') u.set('f', filter); if (fam) u.set('famille', fam); history.replaceState(null, '', '/bibliotheque' + (u.toString() ? '?' + u : '')); };
    $$('#lib-pills .pill').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; url(); render(); }));
    $$('#lib-fams .pill').forEach(b => b.addEventListener('click', () => { fam = fam === b.dataset.fam ? '' : b.dataset.fam; url(); render(); }));
    $('#lib-sort').addEventListener('change', e => { sort = e.target.value; render(); });
    render();
  }

  function initCollection() {
    const root = $('#collection'); if (!root) return;
    const key = new URLSearchParams(location.search).get('c') || 'summer-vibes';
    const col = COLLECTIONS[key] || COLLECTIONS['summer-vibes'];
    const items = PRODUCTS.filter(p => p.collection === key);
    document.title = `${col.title} — LIBRERY`;

    const hero = `<section class="coll-hero">
        <div class="bg" data-parallax=".08">${pic(col.hero, col.title, '100vw', '', true)}</div>
        <div class="wrap coll-hero__txt">
          <span class="runhead">${col.number !== '—' ? col.number + ' · ' : ''}<b>${col.chapter}</b></span>
          <h1 class="display">${col.title}</h1><p class="lead">${col.epigraph}</p></div></section>`;

    const intro = `<section class="section"><div class="wrap coll-intro">
        <div class="reveal"><span class="runhead">${col.kicker}</span>
          <div class="prose dropcap" style="margin-top:30px;font-size:16.5px">${col.intro.map(t => `<p>${t}</p>`).join('')}</div></div>
        ${col.side ? `<div class="media unveil">${pic(col.side, '', '(max-width: 900px) 100vw, 45vw')}</div>` : ''}
      </div></section>`;

    const grid = items.length ? `<section class="section--tight on-sable"><div class="wrap">
        <div class="s-head"><div class="s-head__txt"><span class="runhead">Les créations</span><h2 class="h2">${items.length} ${items.length > 1 ? 'chapitres' : 'chapitre'}</h2></div>
          <a class="link" href="/bibliotheque">Toute la bibliothèque <span class="arr">→</span></a></div>
        <div class="grid-products">${items.map(card).join('')}</div></div></section>` : '';

    const chapters = col.chapters.length ? `<section class="section"><div class="wrap coll-chapters">
        ${col.chapters.map(ch => `<article class="coll-chapter reveal"><h2 class="h2">${ch.h}</h2>
          <div class="prose dropcap" style="font-size:16px">${ch.p.map(t => `<p>${t}</p>`).join('')}</div></article>`).join('')}
      </div></section>` : '';

    const soon = col.soon ? `<section class="section s-news on-sable"><div class="wrap">
        <span class="runhead">Liste d’attente</span><h2 class="h2">Être prévenu de la sortie</h2>
        <form data-news><input type="email" required placeholder="Votre adresse e-mail" aria-label="E-mail"><button>M’inscrire</button></form></div></section>` : '';

    root.innerHTML = hero + (col.soon ? soon : intro + grid + chapters);
    reveals(); newsletters();
  }

  // date de livraison estimée : +3 jours ouvrés
  function eta() {
    const d = new Date(); let n = 0;
    while (n < 3) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n++; }
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function initProduct() {
    const root = $('#product'); if (!root) return;
    const p = byHandle(new URLSearchParams(location.search).get('p')) || PRODUCTS[0];
    const col = COLLECTIONS[p.collection];
    const perf = p.perfumer && PERFUMERS[p.perfumer];
    const fmts = formatsOf(p); let current = fmts[0];
    const isPerfume = !p.type;
    let picks = [];
    document.title = `${p.name} — LIBRERY`;

    const notes = p.notes ? `<dl class="pdp__notes">
        <div><dt>Notes de tête</dt><dd>${p.notes.tete}</dd></div>
        <div><dt>Notes de cœur</dt><dd>${p.notes.coeur}</dd></div>
        <div><dt>Notes de fond</dt><dd>${p.notes.fond}</dd></div></dl>` : '';

    // « Bon à savoir » (inspiration Byredo)
    const tags = isPerfume ? [...(p.families || []), 'Extrait 25 %', 'Sans genre', perf ? 'Nez : ' + perf.name : ''].filter(Boolean) : [];

    // Coffret à composer : sélection de 5 parfums (inspiration Diptyque)
    const perfumes = PRODUCTS.filter(x => !x.type);
    const builder = p.builder ? `
      <div class="builder">
        <div class="builder__head"><span class="label">Vos chapitres</span><span class="builder__count" id="b-count">0 / ${p.builder}</span></div>
        <div class="builder__grid">${perfumes.map(x => `<button type="button" class="builder__item" data-h="${x.handle}">
          <img src="${IMG + (x.pack || x.card)}-m.webp" alt=""><span>${esc(x.name)}</span></button>`).join('')}</div>
      </div>` : '';

    const related = PRODUCTS.filter(x => x.handle !== p.handle && x.collection === p.collection)
      .concat(PRODUCTS.filter(x => x.collection !== p.collection && !x.type)).slice(0, 3);
    const storyImg = p.gallery[p.gallery.length - 1];
    const acc = (t, c) => `<div class="acc"><button type="button" aria-expanded="false">${t}</button><div class="acc__panel"><div><div class="prose">${c}</div></div></div></div>`;

    root.innerHTML = `
      <section class="pdp">
        <div class="pdp__gallery">${p.gallery.map((g, i) => `<div class="media">${pic(g, p.name, '(max-width: 900px) 100vw, 55vw', '', i === 0)}</div>`).join('')}</div>
        <div class="pdp__info"><div class="pdp__box">
          <div class="crumbs"><a href="/bibliotheque">Bibliothèque</a> · <a href="/collection?c=${p.collection}">${col.title}</a></div>
          <span class="runhead">${p.isNew ? 'Nouveauté · ' : ''}<b>${col.title}</b></span>
          <h1 class="pdp__name">${esc(p.name)}</h1>
          <p class="pdp__tag">${p.tagline}</p>
          ${perf ? `<span class="signature pdp__by">par ${perf.name}</span>` : '<div style="height:14px"></div>'}
          ${tags.length ? `<ul class="pdp__tags">${tags.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
          <div class="pdp__price"><b id="pdp-price">${eur(current.price)}</b><span>${p.subtitle || 'Extrait de Parfum 25 %'}</span></div>
          ${fmts.length > 1 ? `<div class="formats" id="pdp-formats">${fmts.map((f, i) => `<button type="button" data-f="${f.id}" class="${i ? '' : 'is-active'}"><b>${f.label}</b><small>${eur(f.price)}</small></button>`).join('')}</div>` : ''}
          ${builder}
          <button class="btn btn--block" id="pdp-add" ${p.builder ? 'disabled' : ''}>${p.builder ? `Choisissez encore ${p.builder} parfums` : 'Ajouter au panier'}</button>
          ${isPerfume ? `<button type="button" class="pdp__sample" id="pdp-sample">Commencer par l’échantillon 2 ml · ${eur(fmts.find(f => f.id === '2').price)}</button>
          <div class="tryfirst"><img src="${IMG}emblem-or.png" alt=""><div><strong>Essayez-le avant de l’ouvrir</strong>
            <span>Un 2 ml de ${esc(p.name)} accompagne votre flacon. Testez-le sur votre peau : si le parfum ne vous ressemble pas, renvoyez le flacon scellé, le retour est offert.</span></div></div>` :
          `<div class="tryfirst"><img src="${IMG}emblem-or.png" alt=""><div><strong>Votre coffret vous est remboursé</strong>
            <span>Un code de la valeur du coffret vous est envoyé, valable 90 jours sur un flacon 100 ml.</span></div></div>`}
          <p class="pdp__eta">Expédié sous 24 h depuis Paris · livraison estimée le <b>${eta()}</b></p>
          <ul class="pdp__assure"><li>Deux échantillons offerts au choix</li><li>Écrin cadeau & mot manuscrit offerts</li><li>Livraison offerte dès 100 € · retours 30 jours</li><li>Paiement en 3 fois sans frais</li></ul>
          ${notes}
          <div class="accordion">
            ${isPerfume ? acc('Conseils d’utilisation', '<p>Un extrait se dépose, il ne se frotte pas. Vaporisez à une vingtaine de centimètres, sur les points de chaleur — creux du cou, poignets, arrière des oreilles — ou sur les cheveux et les vêtements, où il se lira plus longtemps.</p><p>Concentré à 25 %, il demande peu : deux à trois vaporisations suffisent.</p>') : ''}
            ${acc('Ingrédients & allergènes', '<p class="muted">Liste INCI complète et allergènes à renseigner dans la fiche produit Shopify.</p>')}
            ${acc('Livraison & retours', '<p>Livraison offerte dès 100 € d’achat, expédition soignée depuis Paris. Retours gratuits sous 30 jours pour tout flacon non ouvert.</p>')}
            ${acc('Écrin cadeau', '<p>Chaque commande peut être glissée dans notre écrin, accompagnée d’un mot écrit à la main. Sur demande, la facture n’indique aucun prix.</p>')}
          </div>
        </div></div>
      </section>
      <div class="sticky-buy" id="sticky-buy" aria-hidden="true"><div class="wrap">
        <img src="${IMG + (p.pack || p.card)}-m.webp" alt=""><div><b>${esc(p.name)}</b><span id="sticky-var">${esc(current.label)} · ${eur(current.price)}</span></div>
        <button class="btn" id="sticky-add">Ajouter au panier</button></div></div>

      <section class="section"><div class="wrap pdp-story">
        <div class="media unveil">${pic(storyImg, '', '(max-width: 900px) 100vw, 40vw')}</div>
        <div class="reveal">
          <span class="runhead">Le récit</span>
          <div class="prose dropcap" style="margin-top:28px;font-size:16.5px">${p.description.map(t => `<p>${t}</p>`).join('')}</div>
          ${p.coda ? `<p class="coda">${p.coda.join('<br>')}</p>` : ''}
        </div>
      </div></section>

      ${p.materials ? `<section class="section on-brun pdp-materials"><div class="wrap grid">
        <div class="reveal"><span class="runhead">Une lecture olfactive des matières</span>
          <h2 class="h2" style="margin-top:16px;font-style:italic">${p.materials.title}</h2>
          <dl><div><dt>Tête</dt><dd>${p.materials.list.tete}</dd></div><div><dt>Cœur</dt><dd>${p.materials.list.coeur}</dd></div><div><dt>Fond</dt><dd>${p.materials.list.fond}</dd></div></dl>
          <p style="margin-top:34px"><a class="link" href="/lexique#glossaire">Comprendre les procédés <span class="arr">→</span></a></p></div>
        <div class="prose dropcap reveal" style="font-size:15.5px">${p.materials.text.map(t => `<p>${t}</p>`).join('')}</div>
      </div></section>` : ''}

      ${perf ? `<section class="section on-sable"><div class="wrap pdp-perfumer">
        <div class="media unveil">${pic(perf.image, perf.name, '(max-width: 900px) 100vw, 35vw')}</div>
        <div class="reveal"><span class="runhead">Le parfumeur</span>
          <span class="signature" style="display:block;margin:18px 0 6px;font-size:52px">${perf.name}</span>
          <span class="label" style="margin-bottom:24px">${perf.role}</span>
          <div class="prose">${perf.bio.slice(0, 2).map(t => `<p>${t}</p>`).join('')}</div>
          ${perf.quote ? `<blockquote>« ${perf.quote} »</blockquote>` : ''}
          <p style="margin-top:30px"><a class="link" href="/preface#parfumeurs">Les Alchimistes des Souvenirs <span class="arr">→</span></a></p></div>
      </div></section>` : ''}

      ${isPerfume ? `<section class="section--tight"><div class="wrap s-diptych">
        <div class="s-diptych__media"><div class="media unveil" style="aspect-ratio:3/2">${pic('summer-100', '', '(max-width: 900px) 100vw, 55vw')}</div></div>
        <div class="s-diptych__txt reveal"><span class="runhead"><b>Complétez votre bibliothèque</b></span>
          <h2 class="h2">Le Coffret à composer</h2>
          <p class="lead">Cinq parfums de votre choix en 2 ml — et la valeur du coffret recréditée sur votre flacon.</p>
          <a class="btn btn--ghost" href="/produit?p=coffret-a-composer">Composer mon coffret</a></div>
      </div></section>` : ''}

      <section class="section--tight on-sable"><div class="wrap">
        <div class="s-head"><div class="s-head__txt"><span class="runhead">Poursuivre la lecture</span><h2 class="h2">Découvrez aussi</h2></div>
          <a class="link" href="/bibliotheque">Toute la bibliothèque <span class="arr">→</span></a></div>
        <div class="grid-products">${related.map(card).join('')}</div>
      </div></section>`;

    const setFormat = id => {
      current = fmts.find(f => f.id === id) || current;
      $$('#pdp-formats button').forEach(x => x.classList.toggle('is-active', x.dataset.f === current.id));
      $('#pdp-price').textContent = eur(current.price);
      $('#sticky-var').textContent = `${current.label} · ${eur(current.price)}`;
    };
    $$('#pdp-formats button').forEach(b => b.addEventListener('click', () => setFormat(b.dataset.f)));
    const add = () => {
      if (p.builder) { if (picks.length !== p.builder) { $('.builder').scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast(`Choisissez ${p.builder} parfums`); } return addToCart(p.handle, current.id, [...picks]); }
      addToCart(p.handle, current.id);
    };
    $('#pdp-add').addEventListener('click', add);
    $('#sticky-add').addEventListener('click', add);
    $('#pdp-sample')?.addEventListener('click', () => { setFormat('2'); addToCart(p.handle, '2'); });

    if (p.builder) $$('.builder__item').forEach(b => b.addEventListener('click', () => {
      const h = b.dataset.h, i = picks.indexOf(h);
      if (i > -1) picks.splice(i, 1); else if (picks.length < p.builder) picks.push(h); else return toast(`Votre coffret compte déjà ${p.builder} parfums`);
      $$('.builder__item').forEach(x => x.classList.toggle('is-on', picks.includes(x.dataset.h)));
      $('#b-count').textContent = `${picks.length} / ${p.builder}`;
      const left = p.builder - picks.length, btn = $('#pdp-add');
      btn.disabled = left > 0; btn.textContent = left > 0 ? `Choisissez encore ${left} parfum${left > 1 ? 's' : ''}` : 'Ajouter au panier';
    }));

    // barre d'achat collante quand le bouton principal sort de l'écran
    const sticky = $('#sticky-buy');
    if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => {
      const show = !en.isIntersecting && en.boundingClientRect.top < 0;
      sticky.classList.toggle('is-on', show); sticky.setAttribute('aria-hidden', !show);
    }).observe($('#pdp-add'));
    accordions(root); reveals();
  }

  function initStores() {
    const list = $('#stores-list'); if (!list) return;
    let filter = 'all', q = '';
    const countries = ['France', ...new Set(STORES.map(s => s.country).filter(c => c !== 'France'))];
    $('#stores-pills').innerHTML = `<button class="pill is-active" data-c="all">Tous</button>` + countries.map(c => `<button class="pill" data-c="${c}">${c}</button>`).join('');
    let map, markers = [];
    if (window.L) {
      map = L.map('map', { scrollWheelZoom: false }).setView([47.5, 4.5], 5);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19, className: 'librery-tiles' }).addTo(map);
      const icon = L.divIcon({ className: '', html: '<div class="librery-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
      markers = STORES.map(s => L.marker([s.lat, s.lng], { icon }).addTo(map)
        .bindPopup(`<strong>${esc(s.name)}</strong><br>${esc(s.address)}<br>${esc(s.city)}, ${esc(s.country)}${s.phone ? '<br>' + esc(s.phone) : ''}`));
    }
    const render = () => {
      const items = STORES.map((s, i) => ({ s, i })).filter(({ s }) =>
        (filter === 'all' || s.country === filter) && (!q || (s.name + ' ' + s.address + ' ' + s.city + ' ' + s.country).toLowerCase().includes(q)));
      list.innerHTML = items.length ? items.map(({ s, i }) => `
        <div class="store" data-i="${i}" role="button" tabindex="0">
          <div class="store__name">${esc(s.name)}</div>
          <div class="store__addr">${esc(s.address)}<br>${esc(s.city)}, ${esc(s.country)}</div>
          <div class="store__links">${s.phone ? `<a href="tel:${s.phone.replace(/\s/g, '')}">${esc(s.phone)}</a>` : ''}${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">Site</a>` : ''}
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address + ' ' + s.city)}" target="_blank" rel="noopener">Itinéraire</a></div>
        </div>`).join('') : '<p class="store muted">Aucune adresse ne correspond.</p>';
      $('#stores-count').textContent = items.length + ' adresses';
      markers.forEach((m, i) => { if (map) items.some(x => x.i === i) ? m.addTo(map) : m.remove(); });
      if (map && items.length) {
        const focus = items.filter(({ s }) => s.lng > -30 && s.lng < 60);
        map.fitBounds(L.latLngBounds((focus.length ? focus : items).map(({ s }) => [s.lat, s.lng])), { padding: [60, 60], maxZoom: 13 });
      }
      $$('.store[data-i]', list).forEach(el => {
        const go = () => {
          $$('.store', list).forEach(x => x.classList.remove('is-active')); el.classList.add('is-active');
          const s = STORES[+el.dataset.i]; if (map) { map.flyTo([s.lat, s.lng], 15, { duration: .9 }); markers[+el.dataset.i].openPopup(); }
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

  function initLexique() {
    const nav = $$('.lex-nav a'); if (!nav.length) return;
    const obs = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) nav.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-40% 0px -55% 0px' });
    $$('.lex-section').forEach(s => obs.observe(s));
  }

  /* Portrait olfactif : 4 questions → familles pondérées → 3 parfums */
  function initQuiz() {
    const root = $('#quiz'); if (!root) return;
    const steps = $$('.quiz__step', root); let i = 0, score = {}, colBoost = '';
    const show = n => {
      i = n; steps.forEach((s, k) => s.classList.toggle('is-on', k === n));
      $('#quiz-bar').style.width = (n / (steps.length - 1) * 100) + '%';
    };
    let forGift = false;
    $$('[data-next]', root).forEach(b => b.addEventListener('click', () => {
      forGift = b.dataset.for === 'offrir';
      $$('.quiz__q', root).forEach(q => { q.dataset.orig = q.dataset.orig || q.innerHTML; q.innerHTML = forGift ? q.dataset.gift : q.dataset.orig; });
      show(1);
    }));
    $$('.quiz__opts button', root).forEach(b => b.addEventListener('click', () => {
      const q = b.closest('.quiz__step').dataset.q;
      if (q === 'palier') colBoost = b.dataset.v;
      else b.dataset.v.split(',').filter(Boolean).forEach(f => score[f] = (score[f] || 0) + 1);
      if (i < steps.length - 2) return show(i + 1);
      const ranked = PRODUCTS.filter(p => !p.type).map(p => ({
        p, s: (p.families || []).reduce((t, f, k) => t + (score[f] || 0) * (k ? .7 : 1), 0) + (p.collection === colBoost ? .6 : 0) + (p.isNew ? .05 : 0)
      })).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.p);
      const top = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
      $('#quiz-title').textContent = top ? `Un portrait ${top[0].toLowerCase()}` : 'Vos trois pages';
      $('#quiz-sub').textContent = top ? FAMILIES[top[0]] : '';
      $('#quiz-results').innerHTML = ranked.map((p, k) => `<a class="quiz__res" href="/produit?p=${p.handle}"><img src="${IMG + p.pack}-m.webp" alt=""><span class="n">${['I', 'II', 'III'][k]}.</span><b>${esc(p.name)}</b><em>${esc(p.keyNotes)}</em></a>`).join('');
      const cta = $('#quiz-cta');
      if (forGift) { cta.textContent = 'Offrir le Coffret à composer'; cta.href = '/offrir'; } else { cta.textContent = 'Les essayer en 2 ml'; cta.href = '/produit?p=coffret-a-composer'; }
      show(steps.length - 1);
    }));
    $('[data-restart]', root).addEventListener('click', () => { score = {}; colBoost = ''; show(1); });
  }

  /* Offrir : grilles par budget ; « handle@format » met en avant un format précis */
  function initGifts() {
    $$('[data-gift]').forEach(el => {
      el.innerHTML = el.dataset.gift.split(',').map((t, i) => {
        const [h, f] = t.split('@'); const p = byHandle(h); if (!p) return '';
        const fmt = f && formatsOf(p).find(x => x.id === f);
        return card(fmt ? Object.assign({}, p, { formats: [fmt], type: `${p.type || 'Extrait de Parfum'} · ${fmt.label}` }) : p, i);
      }).join('');
    });
  }

  function initContact() {
    const f = $('#contact-form'); if (!f) return;
    f.addEventListener('submit', e => { e.preventDefault(); f.outerHTML = '<p class="form__ok">Merci pour votre message. Nous vous répondrons très vite.</p>'; });
  }

  /* ------------------------------------------------------------------ */
  renderHeader(); renderFooter(); renderCartShell();
  $('#open-cart')?.addEventListener('click', openCart);
  initHome(); initLibrary(); initCollection(); initProduct(); initStores(); initLexique(); initContact(); initQuiz(); initGifts();
  renderCart(); bindToasts(); accordions(); newsletters(); films(); parallax(); reveals();
})();
