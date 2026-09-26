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
  function pic(name, alt = '', sizes = '(max-width: 800px) 100vw, 50vw', cls = '', eager = false) {
    return `<img class="${cls}" src="${IMG + name}-m.webp" srcset="${IMG + name}-m.webp ${(IMGW[name] || [800])[0]}w, ${IMG + name}.webp ${(IMGW[name] || [0, 1600])[1]}w" sizes="${sizes}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }

  /* Icônes au trait (32 px, trait 1 px) — snippet icon.liquid dans Shopify */
  const ICONS = {
    vial: '<path d="M11 13.5h7v13.2a1.3 1.3 0 0 1-1.3 1.3h-4.4a1.3 1.3 0 0 1-1.3-1.3z"/><path d="M12.2 9h4.6v4.5h-4.6z"/><path d="M13.4 9V6.5h2.2V9"/><path d="M11 19h7"/><path d="M24 7.5c1.3 1.8 2 3 2 4a2 2 0 0 1-4 0c0-1 .7-2.2 2-4z"/>',
    vials: '<path d="M7.5 13h6v12.8a1.2 1.2 0 0 1-1.2 1.2H8.7a1.2 1.2 0 0 1-1.2-1.2z"/><path d="M8.6 9h3.8v4H8.6z"/><path d="M7.5 18.5h6"/><path d="M18.5 13h6v12.8a1.2 1.2 0 0 1-1.2 1.2h-3.6a1.2 1.2 0 0 1-1.2-1.2z"/><path d="M19.6 9h3.8v4h-3.8z"/><path d="M18.5 18.5h6"/>',
    gift: '<path d="M6 13h20v4H6z"/><path d="M7.5 17h17v10h-17z"/><path d="M16 13v14"/><path d="M16 13c-1.5-3.8-5.5-5.2-6.3-3.2-.7 1.8 2.6 3.2 6.3 3.2z"/><path d="M16 13c1.5-3.8 5.5-5.2 6.3-3.2.7 1.8-2.6 3.2-6.3 3.2z"/>',
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
        <span>Écrin cadeau et mot manuscrit offerts</span>
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
                    <a href="/collection?c=bougies">Bougies<small>bientôt</small></a>
                    <a href="/bibliotheque">Tous les parfums</a></div>
                  <div class="mega__col"><span class="ui">Choisir</span>
                    <a href="/portrait-olfactif">Portrait olfactif</a>
                    <a href="/produit?p=coffret-a-composer">Coffret à composer</a>
                    <a href="/offrir">Offrir</a>
                    <a href="${CATALOGUE_URL}" target="_blank" rel="noopener">Le catalogue</a></div>
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
            <a href="/portrait-olfactif">Portrait olfactif</a>
          </div>
          <a href="/preface">Préface <span class="folio">p. 6</span></a>
          <a href="/lexique">Lexique</a>
          <a href="/points-de-vente">Carte</a>
          <a href="/offrir">Offrir</a>
        </nav>
        <div class="drawer__foot"><a href="/services">Services</a><a href="/contact">Contact</a><span>LIBRERY, maison de parfum, Paris</span></div>
      </div>`;

    // titre courant (running head) des pages intérieures
    if (body.dataset.run) {
      $('#header').insertAdjacentHTML('afterend', `<div class="runhead"><div class="wrap"><span>LIBRERY — ${esc(body.dataset.run)}</span>${body.dataset.folio ? `<span class="folio">p. ${esc(body.dataset.folio)}</span>` : ''}</div></div>`);
    }

    const msgs = $$('#announce span'); let am = 0;
    if (msgs.length > 1) setInterval(() => { msgs[am].classList.remove('is-on'); am = (am + 1) % msgs.length; msgs[am].classList.add('is-on'); }, 4500);

    const dr = $('#drawer');
    $('#menu-btn').addEventListener('click', () => { dr.classList.add('is-open'); dr.setAttribute('aria-hidden', 'false'); });
    $('#close-nav').addEventListener('click', () => { dr.classList.remove('is-open'); dr.setAttribute('aria-hidden', 'true'); });

    // en-tête transparent sur l'image d'accueil, masqué en descendant
    const header = $('#header'); const over = body.classList.contains('page-home');
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY, hero = $('.s-hero');
      const top = over && hero && y < hero.offsetHeight - 80;
      header.classList.toggle('is-top', !!top);
      header.classList.toggle('is-solid', over && !top);
      header.classList.toggle('is-hidden', y > 500 && y > lastY + 4 && !$('.has-sub:hover'));
      if (y < lastY - 4) header.classList.remove('is-hidden');
      lastY = y;
    };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  function renderFooter() {
    const host = $('#site-footer'); if (!host) return;
    host.outerHTML = `
      <section class="block" aria-label="Services"><div class="wrap">
        ${page === 'services' ? '' : `<div class="services">${SERVICES.map(x => `<a href="/services">${icon(x.i)}<b>${x.t}</b><span>${x.d}</span></a>`).join('')}</div>`}
        ${$('main form[data-news]') ? '' : `<div class="letter"${page === 'services' ? '' : ' style="margin-top:56px"'}>
          <div><h2 class="h2">Lettre de la maison</h2><p>Les nouveaux chapitres avant tout le monde, et un 2 ml glissé dans votre première commande.</p></div>
          <form class="field-line" data-news><input type="email" required placeholder="Votre adresse e-mail" aria-label="Votre adresse e-mail"><button>S’inscrire</button></form>
        </div>`}
      </div></section>
      <footer class="footer"><div class="wrap">
        <div class="footer__grid">
          <div><a href="/" class="logo">${LOGO_SVG_PARIS}</a>
            <p class="footer__about">Maison de parfum fondée à Paris par Bey Rafik. Extraits de parfum concentrés à 25 %.</p></div>
          <div><h4>Bibliothèque</h4><ul>
            <li><a href="/collection?c=skin-obsession">Skin Obsession</a></li>
            <li><a href="/collection?c=summer-vibes">Summer Vibes</a></li>
            <li><a href="/collection?c=coffrets">Coffrets</a></li>
            <li><a href="/portrait-olfactif">Portrait olfactif</a></li></ul></div>
          <div><h4>La maison</h4><ul>
            <li><a href="/preface">Préface</a></li>
            <li><a href="/preface#parfumeurs">Parfumeurs</a></li>
            <li><a href="/lexique">Lexique</a></li>
            <li><a href="${CATALOGUE_URL}" target="_blank" rel="noopener">Catalogue</a></li></ul></div>
          <div><h4>Aide</h4><ul>
            <li><a href="/services">Services</a></li>
            <li><a href="/offrir">Offrir</a></li>
            <li><a href="/points-de-vente">Points de vente</a></li>
            <li><a href="/contact">Contact</a></li></ul></div>
        </div>
        <div class="footer__legal"><span>© LIBRERY ${new Date().getFullYear()}, Paris</span><span><a href="#" data-toast="Pages légales reprises de Shopify">CGV · Mentions légales · Confidentialité</a></span></div>
      </div></footer>`;
  }

  /* ------------------------------------------------------------------ */
  /* Panier : essayer d'abord, 2 échantillons au choix, écrin, mot       */
  /* ------------------------------------------------------------------ */
  const CART_KEY = 'librery-cart-v2', EXTRA_KEY = 'librery-cart-extras';
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  let cart = load(CART_KEY, []);
  let extras = Object.assign({ samples: ['', ''], gift: false, msg: '', noPrice: false }, load(EXTRA_KEY, {}));
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
    const items = cart.map(l => {
      const p = byHandle(l.h); if (!p) return null;
      const f = formatsOf(p).find(x => x.id === l.f) || formatsOf(p)[0];
      return { ...l, p, fmt: f, total: f.price * l.q };
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
    const thumb = (p, f) => `${IMG + (f === '30' && p.pack30 ? p.pack30 : p.pack || p.card)}-m.webp`;

    $('#cart-items').innerHTML = items.length ? items.map((i, idx) => `
      <div class="line">
        <span class="line__img${i.p.pack ? ' is-pack' : ''}"><img src="${thumb(i.p, i.fmt.id)}" alt=""></span>
        <div><div class="line__name">${nm(i.p.name)}</div><div class="line__var">${esc(i.fmt.label)}</div>
          ${i.sel ? `<div class="line__sel">${i.sel.map(h => esc(byHandle(h)?.name || h)).join(', ')}</div>` : ''}
          <div class="qty"><button data-q="-1" data-i="${idx}" aria-label="Retirer un">−</button><span>${i.q}</span><button data-q="1" data-i="${idx}" aria-label="Ajouter un">+</button></div></div>
        <div class="line__right"><span>${eur(i.total)}</span><button data-rm="${idx}">Retirer</button></div>
      </div>`).join('') + tryFirst.map(p => `
      <div class="line line--gift">
        <span class="line__img${p.pack ? ' is-pack' : ''}"><img src="${thumb(p)}" alt=""></span>
        <div><div class="line__name">${nm(p.name)}, 2 ml</div><div class="line__var">Pour l’essayer avant d’ouvrir le flacon</div></div>
        <div class="line__right"><span>Offert</span></div>
      </div>`).join('') + `
      <div class="cart__opts">
        <div class="cart__opt"><span class="ui">Vos deux échantillons offerts (modifiables)</span>
          <div class="cart__selects"><select data-sample="0" aria-label="Premier échantillon">${opt(extras.samples[0])}</select><select data-sample="1" aria-label="Second échantillon">${opt(extras.samples[1])}</select></div></div>
        <div class="cart__opt">
          <label class="check"><input type="checkbox" data-x="gift" ${extras.gift ? 'checked' : ''}><span>Écrin cadeau offert</span></label>
          ${extras.gift ? `<textarea data-x="msg" maxlength="200" placeholder="Votre mot, recopié à la main (200 caractères)">${esc(extras.msg)}</textarea>
          <label class="check"><input type="checkbox" data-x="noPrice" ${extras.noPrice ? 'checked' : ''}><span>Facture sans prix</span></label>` : ''}
        </div>
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
    $$('#cart-items input[data-x]').forEach(el => el.addEventListener('change', () => { extras[el.dataset.x] = el.checked; saveExtras(); renderCart(); }));
    $$('#cart-items textarea[data-x]').forEach(el => el.addEventListener('input', () => { extras.msg = el.value; saveExtras(); }));
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
      ? `<video class="card__scene" src="${p.video}" poster="${IMG + p.scene}-m.webp" muted loop playsinline preload="none"></video>`
      : p.scene ? pic(p.scene, '', S_CARD, 'card__scene') : '';
    const prices = isPerfume
      ? `<span class="card__fmts"><span>${f[0].label} — ${eur(f[0].price)}</span>${f30 && p.pack30 ? `<span class="card__f30" data-f30>${f30.label} — ${eur(f30.price)}</span>` : ''}</span>`
      : `<span class="card__meta">${esc(p.subtitle || p.type)} — dès ${eur(minPrice(p))}</span>`;
    return `
      <a class="card" href="/produit?p=${p.handle}">
        <div class="card__media">
          <div class="card__track">
            <div class="card__slide">${pic(p.pack || p.card, p.name, S_CARD)}${p.pack30 ? pic(p.pack30, '', S_CARD, 'card__30') : ''}</div>
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
      <a class="card tile" href="${href}"><div class="card__media">${pic(img, '', S_CARD)}</div>
        <div class="card__body"><h3 class="card__name">${title}</h3><span class="card__meta">${meta}</span></div></a>`;
  /* grande tuile sur deux colonnes : l'image de campagne dans la grille */
  const wideTile = (key, img) => { const c = COLLECTIONS[key]; return c && c.wide ? `
      <a class="card tile card--wide" href="/collection?c=${key}"><div class="card__media">${pic(img || c.wide, c.title, '(max-width: 800px) 100vw, 66vw')}</div>
        <div class="card__body"><span class="card__flag">${esc(c.chapter)}</span><h3 class="card__name">${nm(c.title)}</h3><span class="card__meta">Lire le chapitre${c.folio ? ', p. ' + c.folio : ''}</span></div></a>` : ''; };
  /* mosaïque de trois images légendées (bloc « image-mosaic » dans Shopify) */
  const mosaic = (key, n0 = 1) => { const c = COLLECTIONS[key]; return c && c.mosaic ? `<div class="mosaic">${c.mosaic.map(([img, cap], i) =>
      `<figure>${pic(img, cap, '(max-width: 800px) 100vw, 40vw')}<figcaption class="fig">fig. ${n0 + i} — ${esc(cap)}</figcaption></figure>`).join('')}</div>` : ''; };
  const builderTile = () => tile('/produit?p=coffret-a-composer', 'hero-collection', 'Coffret <em>à composer</em>', 'Cinq parfums en 2 ml — 30 €');
  const storesTile = () => tile('/points-de-vente', 'camp-mercedes', 'Nos <em>adresses</em>', 'Treize lieux où nos récits prennent vie');
  const quizTile = () => tile('/portrait-olfactif', 'camp-livre', 'Portrait <em>olfactif</em>', 'Quatre questions pour trouver votre parfum');

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

  /* ================================================================== */
  /* Pages                                                              */
  /* ================================================================== */
  function initHome() {
    const so = $('#so-grid'), sv = $('#sv-grid'); if (!so) return;
    so.innerHTML = PRODUCTS.filter(p => p.collection === 'skin-obsession').map(card).join('');
    const svp = PRODUCTS.filter(p => p.collection === 'summer-vibes').map(card);
    sv.innerHTML = svp.slice(0, 3).join('') + wideTile('summer-vibes', 'hero-summer') + svp.slice(3).join('') + builderTile() + quizTile();
    $$('[data-mosaic]').forEach(el => { el.innerHTML = mosaic(el.dataset.mosaic, +el.dataset.fig || 1); });
    const sh = $('#shelf');
    if (sh) sh.innerHTML = SHELF.map(m => { const p = byHandle(m.h); return `<a class="shelf__item" href="/produit?p=${m.h}"><figure>${pic(m.img, m.t, '(max-width: 800px) 62vw, 22vw')}</figure>
        <span class="fig">${esc(m.t)}</span><span class="shelf__name">${nm(p.name)}</span></a>`; }).join('');
    $$('[data-shelf]').forEach(b => b.addEventListener('click', () => sh.scrollBy({ left: +b.dataset.shelf * (sh.clientWidth + 20) / 2, behavior: 'smooth' })));
  }

  function initLibrary() {
    const root = $('#library'); if (!root) return;
    const ORDER = ['skin-obsession', 'summer-vibes', 'coffrets'];
    const q = new URLSearchParams(location.search);
    let filter = q.get('f') || 'all', fam = q.get('famille') || '', sort = 'default';
    $('#lib-fams').innerHTML = `<span class="ui">Famille</span><button data-fam="" class="is-active">Toutes</button>` + Object.keys(FAMILIES).map(f =>
      `<button data-fam="${f}">${f}<sup>${PRODUCTS.filter(p => (p.families || []).includes(f)).length}</sup></button>`).join('');
    const render = () => {
      let list = PRODUCTS.filter(p => (filter === 'all' || p.collection === filter) && (!fam || (p.families || []).includes(fam)));
      if (sort === 'asc') list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
      if (sort === 'desc') list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
      if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      $('#lib-count').textContent = list.length + (list.length > 1 ? ' créations' : ' création');
      $$('#lib-cols button').forEach(b => b.classList.toggle('is-active', b.dataset.f === filter));
      $$('#lib-fams button').forEach(b => b.classList.toggle('is-active', b.dataset.fam === fam));
      $('#lib-desc').textContent = fam ? FAMILIES[fam] : '';
      root.innerHTML = (filter === 'all' && !fam && sort === 'default')
        ? ORDER.map(c => {
            const col = COLLECTIONS[c], items = list.filter(p => p.collection === c);
            return `<div class="chapter"><h2 class="h2">${nm(col.title)}</h2>${col.folio ? `<span class="folio">p. ${col.folio}</span>` : ''}<a class="tlink" href="/collection?c=${c}">Lire</a></div>
                    <div class="grid">${c === 'skin-obsession' ? items.map(card).join('') + wideTile(c) + builderTile()
                      : c === 'summer-vibes' ? items.slice(0, 3).map(card).join('') + wideTile(c) + items.slice(3).map(card).join('') + quizTile() + storesTile()
                      : items.map(card).join('')}</div>`;
          }).join('')
        : `<div class="grid">${list.map(card).join('') || '<p class="muted">Aucune création pour ce filtre.</p>'}</div>`;
      balanceGrids(root);
    };
    const url = () => { const u = new URLSearchParams(); if (filter !== 'all') u.set('f', filter); if (fam) u.set('famille', fam); history.replaceState(null, '', '/bibliotheque' + (u.toString() ? '?' + u : '')); };
    $$('#lib-cols button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; url(); render(); }));
    $$('#lib-fams button').forEach(b => b.addEventListener('click', () => { fam = b.dataset.fam; url(); render(); }));
    $('#lib-sort').addEventListener('change', e => { sort = e.target.value; render(); });
    render();
  }

  function initCollection() {
    const root = $('#collection'); if (!root) return;
    const key = new URLSearchParams(location.search).get('c') || 'summer-vibes';
    const col = COLLECTIONS[key] || COLLECTIONS['summer-vibes'];
    const items = PRODUCTS.filter(p => p.collection === key);
    document.title = `${col.title} — LIBRERY`;
    body.dataset.run = col.title; if (col.folio) body.dataset.folio = col.folio;

    root.innerHTML = `
      <section class="coll-hero">${pic(col.hero, col.title, '100vw', '', true)}<div class="scrim-b"></div>
        <div class="coll-hero__txt"><div class="wrap"><h1 class="h1">${nm(col.title)}</h1>${col.folio ? `<span class="folio">p. ${col.folio}</span>` : ''}</div></div></section>
      <section class="block"><div class="wrap split">
        <div><span class="ui muted">${esc(col.chapter)}</span></div>
        <div><p class="epigraph">${col.epigraph}</p><div class="prose">${col.intro.map(t => `<p>${t}</p>`).join('')}</div></div>
      </div></section>
      ${col.soon ? `<section class="block"><div class="wrap letter">
          <div><h2 class="h2">Être prévenu de la sortie</h2><p>Un e-mail, le jour où ce chapitre s’ouvre.</p></div>
          <form class="field-line" data-news><input type="email" required placeholder="Votre adresse e-mail" aria-label="E-mail"><button>M’inscrire</button></form></div></section>` : ''}
      ${items.length ? `<section class="block"><div class="wrap">
          <div class="row-head"><div><h2 class="h2">Les parfums</h2></div><span class="ui muted">${items.length} ${items.length > 1 ? 'créations' : 'création'}</span></div>
          <div class="grid">${items.map(card).join('')}${key === 'coffrets' ? '' : builderTile() + (items.length % 3 === 0 ? quizTile() + storesTile() : '')}</div></div></section>` : ''}
      ${col.mosaic ? `<section class="block block--tight"><div class="wrap">${mosaic(key)}</div></section>` : ''}
      ${col.chapters.length ? `<section class="block"><div class="wrap chapters">
          ${col.chapters.map(ch => `<article class="split"><h2 class="h2">${ch.h}</h2><div class="prose">${ch.p.map(t => `<p>${t}</p>`).join('')}</div></article>`).join('')}
        </div></section>` : ''}`;
    newsletters();
  }

  /* date de livraison estimée : +3 jours ouvrés */
  function eta() { const d = new Date(); let n = 0; while (n < 3) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n++; } return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }

  function initProduct() {
    const root = $('#product'); if (!root) return;
    const p = byHandle(new URLSearchParams(location.search).get('p')) || PRODUCTS[0];
    const col = COLLECTIONS[p.collection];
    const perf = p.perfumer && PERFUMERS[p.perfumer];
    const fmts = formatsOf(p); let current = fmts[0];
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
            const cap = g === p.pack ? `${esc(p.name)}, 100 ml` : g === p.pack30 ? `${esc(p.name)}, 30 ml` : '';
            // rythme : deux packshots côte à côte, une pleine largeur, deux, une…
            const full = !(g === p.pack || g === p.pack30) && ((i - (p.pack30 ? 2 : 0)) % 3 === 0 || i === p.gallery.length - 1 && (i - (p.pack30 ? 2 : 0)) % 3 === 1);
            return `<figure class="${full ? 'is-full' : ''}${g === p.pack || g === p.pack30 ? ' is-pack' : ''}">${pic(g, p.name, full ? '(max-width: 900px) 100vw, 58vw' : '(max-width: 900px) 100vw, 29vw', '', i === 0)}<figcaption class="fig">fig. ${i + 1}${cap ? ' — ' + cap : ''}</figcaption></figure>`;
          }).join('')}</div>
          <span class="pdp__count" id="gcount">1 / ${p.gallery.length}</span>
        </div>
        <div class="pdp__info"><div class="pdp__box">
          <div class="pdp__crumbs"><span><a href="/bibliotheque">Bibliothèque</a> / <a href="/collection?c=${p.collection}">${esc(col.title)}</a></span>${p.folio ? `<span class="folio">p. ${p.folio}</span>` : ''}</div>
          <h1 class="pdp__name">${nm(p.name)}</h1>
          <p class="pdp__type">${isPerfume ? `Extrait de parfum 25 %${p.isNew ? ' · Nouveauté' : ''}` : esc(p.subtitle)}</p>
          ${p.keyNotes && isPerfume ? `<p class="pdp__notes-line">${esc(p.keyNotes.replace(/ · /g, ', '))}</p>` : ''}
          <p class="pdp__desc">${p.tagline}</p>
          ${fmts.length > 1 ? `<div class="sizes" id="sizes">${fmts.map((f, i) => `<button type="button" data-f="${f.id}" class="${i ? '' : 'is-active'}">${f.label}<small>${eur(f.price)}</small></button>`).join('')}</div>` : ''}
          ${p.builder ? `<div class="builder"><div class="builder__head"><span>Vos parfums</span><b id="b-count">0 / ${p.builder}</b></div>
            <div class="builder__grid">${perfumes.map(x => `<button type="button" class="builder__item" data-h="${x.handle}"><span class="builder__thumb"><img src="${IMG + x.pack}-m.webp" alt=""></span><span>${esc(x.name)}</span></button>`).join('')}</div></div>` : ''}
          <button class="btn btn--block" id="add" ${p.builder ? 'disabled' : ''}>${cta()}</button>
          ${isPerfume && sample ? `<button type="button" class="tlink pdp__try" id="try">Essayer d’abord : échantillon 2 ml, ${eur(sample.price)}</button>` : ''}
          <p class="pdp__small">${isPerfume ? `<b>Essayez-le avant de l’ouvrir.</b> Un 2 ml de ${esc(p.name)} accompagne chaque flacon ; s’il ne vous ressemble pas, renvoyez le flacon scellé, le retour est offert.` : `<b>Valeur recréditée.</b> Un code de la valeur du coffret vous est envoyé, valable 90 jours sur un flacon 100 ml.`}</p>
          <p class="pdp__small">Expédié sous 24 h depuis Paris, livré ${eta()}. Deux échantillons et écrin offerts.</p>
          ${perf ? `<p class="pdp__by">Composé par <a href="#parfumeur">${esc(perf.name)}</a></p>` : ''}
          <div class="accordion">
            ${notes ? acc('Notes', `<dl class="notes-dl"><div><dt>Tête</dt><dd>${notes.tete}</dd></div><div><dt>Cœur</dt><dd>${notes.coeur}</dd></div><div><dt>Fond</dt><dd>${notes.fond}</dd></div></dl>`) : ''}
            ${isPerfume ? acc('Conseils d’utilisation', '<p>Un extrait se dépose, il ne se frotte pas. Deux ou trois vaporisations à vingt centimètres, sur le cou, les poignets ou les vêtements.</p>') : ''}
            ${acc('Ingrédients', '<p class="muted">Liste INCI complète et allergènes, renseignés dans la fiche produit Shopify.</p>')}
            ${acc('Livraison, retours et écrin', '<p>Livraison offerte dès 100 €, retours offerts sous 30 jours pour tout flacon scellé. Écrin et mot manuscrit offerts, facture sans prix sur demande.</p>')}
          </div>
        </div></div>
      </section>
      <div class="sticky-buy" id="sticky" aria-hidden="true"><div class="wrap"><span class="n">${nm(p.name)}<span id="st-var">${esc(current.label)}</span></span><button class="btn" id="st-add">Ajouter — <span id="st-price">${eur(current.price)}</span></button></div></div>

      <section class="block"><div class="wrap story">
        <div class="story__margin">${p.folio ? `<span class="folio">p. ${p.folio}</span>` : ''}</div>
        <div class="prose">${story.map(t => `<p>${t}</p>`).join('')}
          ${more.length ? `<div id="more" hidden>${more.map(t => `<p>${t}</p>`).join('')}${p.coda ? `<p>${p.coda.join(' ')}</p>` : ''}</div><button class="tlink more" id="more-btn">Lire la suite</button>` : ''}</div>
        ${p.notes && !p.materials ? `<dl class="story__notes"><div><dt>Tête</dt><dd>${p.notes.tete}</dd></div><div><dt>Cœur</dt><dd>${p.notes.coeur}</dd></div><div><dt>Fond</dt><dd>${p.notes.fond}</dd></div></dl>` : '<div></div>'}
      </div></section>

      ${p.materials ? `<section class="block materials"><div class="wrap split">
        <div><span class="ui">Lecture des matières</span><h2 class="h2" style="margin-top:12px">${esc(p.materials.title)}</h2>
          <dl><div><dt>Tête</dt><dd>${p.materials.list.tete}</dd></div><div><dt>Cœur</dt><dd>${p.materials.list.coeur}</dd></div><div><dt>Fond</dt><dd>${p.materials.list.fond}</dd></div></dl></div>
        <div class="prose">${p.materials.text.map(t => `<p>${t}</p>`).join('')}</div>
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

    const setFormat = id => {
      current = fmts.find(f => f.id === id) || current;
      $$('#sizes button').forEach(x => x.classList.toggle('is-active', x.dataset.f === current.id));
      $('#add').textContent = cta(); $('#st-var').textContent = current.label; $('#st-price').textContent = eur(current.price);
      // mobile : la galerie glisse sur le flacon du format choisi
      const gi = p.gallery.indexOf(current.id === '30' ? p.pack30 : p.pack), gal = $('#gallery');
      if (gi > -1 && gal.scrollWidth > gal.clientWidth + 4) gal.scrollTo({ left: gi * gal.clientWidth, behavior: 'smooth' });
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
    g.addEventListener('scroll', () => { $('#gcount').textContent = `${Math.round(g.scrollLeft / g.clientWidth) + 1} / ${p.gallery.length}`; }, { passive: true });

    // barre d'achat collante
    const st = $('#sticky');
    // (un écouteur de défilement plutôt qu'un IntersectionObserver : un défilement rapide peut sauter le bouton sans le croiser)
    let ticking = false;
    const syncSticky = () => { ticking = false; const show = $('#add').getBoundingClientRect().bottom < 0; st.classList.toggle('is-on', show); st.setAttribute('aria-hidden', !show); };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(syncSticky); } }, { passive: true });
    syncSticky();
    accordions(root);
  }

  function initStores() {
    const list = $('#stores-list'); if (!list) return;
    let filter = 'all', q = '';
    const countries = ['France', ...new Set(STORES.map(s => s.country).filter(c => c !== 'France'))];
    $('#stores-tabs').innerHTML = `<button data-c="all" class="is-active">Tous</button>` + countries.map(c => `<button data-c="${c}">${c}</button>`).join('');
    let map, markers = [];
    if (window.L) {
      map = L.map('map', { scrollWheelZoom: false }).setView([47.5, 4.5], 5);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19, className: 'librery-tiles' }).addTo(map);
      const icon = L.divIcon({ className: '', html: '<div class="librery-pin"></div>', iconSize: [12, 12], iconAnchor: [6, 6] });
      markers = STORES.map(s => L.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.address)}<br>${esc(s.city)}, ${esc(s.country)}`));
    }
    const render = () => {
      const items = STORES.map((s, i) => ({ s, i })).filter(({ s }) => (filter === 'all' || s.country === filter) && (!q || (s.name + ' ' + s.address + ' ' + s.city + ' ' + s.country).toLowerCase().includes(q)));
      list.innerHTML = items.length ? items.map(({ s, i }) => `
        <div class="store" data-i="${i}" role="button" tabindex="0">
          <div class="store__name">${esc(s.name)}</div>
          <div class="store__addr">${esc(s.address)}, ${esc(s.city)}, ${esc(s.country)}</div>
          <div class="store__links">${s.phone ? `<a href="tel:${s.phone.replace(/\s/g, '')}">${esc(s.phone)}</a>` : ''}${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">Site</a>` : ''}<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address + ' ' + s.city)}" target="_blank" rel="noopener">Itinéraire</a></div>
        </div>`).join('') : '<p class="store muted">Aucune adresse ne correspond.</p>';
      $('#stores-count').textContent = items.length + ' adresses';
      markers.forEach((m, i) => { if (map) items.some(x => x.i === i) ? m.addTo(map) : m.remove(); });
      if (map && items.length) { const f = items.filter(({ s }) => s.lng > -30 && s.lng < 60); map.fitBounds(L.latLngBounds((f.length ? f : items).map(({ s }) => [s.lat, s.lng])), { padding: [50, 50], maxZoom: 13 }); }
      $$('.store[data-i]', list).forEach(el => {
        const go = () => { $$('.store', list).forEach(x => x.classList.remove('is-active')); el.classList.add('is-active'); const s = STORES[+el.dataset.i]; if (map) { map.flyTo([s.lat, s.lng], 15, { duration: .6 }); markers[+el.dataset.i].openPopup(); } };
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
      const c = $('#quiz-cta'); c.textContent = forGift ? 'Voir les idées cadeaux' : 'Les essayer en 2 ml'; c.href = forGift ? '/offrir' : '/produit?p=coffret-a-composer';
      show(steps.length - 1);
    }));
    $('[data-restart]', root).addEventListener('click', () => { score = {}; colBoost = ''; show(0); });
  }

  function initGifts() {
    $$('[data-gift]').forEach(el => {
      el.innerHTML = el.dataset.gift.split(',').map(t => {
        if (t === 'quiz') return quizTile();
        const [h, f] = t.split('@'); const p = byHandle(h); if (!p) return '';
        const fmt = f && formatsOf(p).find(x => x.id === f);
        return card(fmt ? Object.assign({}, p, { formats: [fmt] }, fmt.id === '30' && p.pack30 ? { pack: p.pack30, pack30: null } : {}) : p);
      }).join('');
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
  initHome(); initLibrary(); initProduct(); initStores(); initQuiz(); initGifts(); initContact();
  renderCart(); bindToasts(); bindCards(); accordions(); newsletters(); balanceGrids();
})();
