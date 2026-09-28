/* ==========================================================================
   LIBRERY — Laboratoire : huit expériences d'interaction (sans bibliothèque externe)
   Toutes respectent prefers-reduced-motion et ne tournent que lorsqu'elles sont visibles.
   ========================================================================== */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const img = n => `/assets/img/v2/${n}-m.webp?v=${(typeof IMGW !== 'undefined' && IMGW[n] || [])[2] || ''}`;
  /* progression 0 → 1 d'une section haute pendant qu'on la traverse */
  const progress = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };

  /* ---------------------------------------------------------------- 01 */
  function playIntro() {
    if (still) return;
    const o = document.createElement('div');
    o.className = 'intro';
    o.innerHTML = `<div class="intro__in"><div class="intro__mark">${typeof LOGO_SVG !== 'undefined' ? LOGO_SVG : 'LIBRERY'}</div><div class="intro__line"></div><p class="intro__sub">La bibliothèque olfactive</p></div>`;
    document.body.appendChild(o);
    requestAnimationFrame(() => o.classList.add('is-run'));
    setTimeout(() => o.classList.add('is-out'), 2300);
    setTimeout(() => o.remove(), 3400);
  }
  $('[data-intro-play]')?.addEventListener('click', playIntro);
  playIntro();

  /* ---------------------------------------------------------------- 02 */
  function sillage(root) {
    const cv = $('canvas', root), ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = Math.min(2, devicePixelRatio || 1), parts = [], last = 0, px = null, py = null, visible = false, t = 0;
    // une goutte de lumière dorée, dessinée une fois puis réutilisée
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 128;
    const sg = sprite.getContext('2d'), grd = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(240,212,165,.62)'); grd.addColorStop(.4, 'rgba(214,170,112,.26)'); grd.addColorStop(1, 'rgba(183,145,106,0)');
    sg.fillStyle = grd; sg.fillRect(0, 0, 128, 128);
    const size = () => { const r = root.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const spawn = (x, y, vx, vy, n) => { for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * 10, y: y + (Math.random() - .5) * 10, vx: vx * .12 + (Math.random() - .5) * .6, vy: vy * .12 + (Math.random() - .5) * .6, r: 16 + Math.random() * 26, life: 1, d: .007 + Math.random() * .008, s: Math.random() * 6.28 }); if (parts.length > 320) parts.splice(0, parts.length - 320); };
    const move = e => {
      const r = root.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (px !== null) spawn(x, y, x - px, y - py, 5);
      px = x; py = y; last = performance.now(); root.classList.add('is-touched');
    };
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', () => { px = py = null; });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(root);
    const frame = now => {
      requestAnimationFrame(frame);
      if (!visible) return;
      t += .016;
      if (now - last > 1600 && !still) { // au repos : une volute dérive seule
        const x = W * (.5 + .32 * Math.sin(t * .7)), y = H * (.55 + .22 * Math.sin(t * 1.1 + 1));
        spawn(x, y, Math.cos(t * .7) * 8, Math.cos(t * 1.1 + 1) * 6, 2);
      }
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx + Math.sin(t * 2 + p.s) * .35; p.y += p.vy - .45; p.vx *= .97; p.vy *= .97; p.r *= 1.012; p.life -= p.d;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.pow(p.life, 1.4) * .6;
        ctx.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    };
    requestAnimationFrame(frame);
  }
  $$('[data-sillage]').forEach(sillage);

  /* ---------------------------------------------------------------- 03, 04, 05 : liés au défilement */
  const book = $('[data-book]'), bookEl = book && $('.book3d__book', book);
  const ink = $('[data-ink]'), words = [];
  if (ink) {
    const p = $('.ink__txt', ink);
    p.innerHTML = p.textContent.split(/(\s+)/).map(w => /\s+/.test(w) ? w : `<span>${w}</span>`).join('');
    words.push(...$$('span', p));
  }
  const hs = $('[data-hshelf]'), track = hs && $('.hshelf__track', hs), bar = hs && $('.hshelf__bar span', hs);
  if (hs && typeof SHELF !== 'undefined') {
    track.innerHTML = SHELF.map((m, i) => {
      const pr = PRODUCTS.find(x => x.handle === m.h);
      return `<a class="hshelf__item" href="/produit?p=${m.h}"><figure><img src="${img(m.img)}" alt="${m.t}" loading="lazy"></figure><p class="fig">${String(i + 1).padStart(2, '0')} — ${m.t}</p><b>${pr ? pr.name : ''}</b></a>`;
    }).join('');
  }
  const sizeShelf = () => { if (hs) hs.style.height = (track.scrollWidth - innerWidth + innerHeight) + 'px'; };
  sizeShelf(); addEventListener('resize', sizeShelf); addEventListener('load', sizeShelf);

  let ticking = false;
  const onScroll = () => {
    ticking = false;
    if (bookEl) bookEl.style.setProperty('--open', ease(clamp((progress(book) - .12) / .66)));
    if (ink) { const n = Math.floor(clamp((progress(ink) - .05) / .8) * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); }
    if (hs) {
      const p = progress(hs), dist = track.scrollWidth - innerWidth;
      track.style.transform = `translate3d(${-p * dist}px,0,0)`;
      bar.style.width = (p * 100) + '%';
      $$('.hshelf__item img', track).forEach((im, i) => { im.style.transform = `scale(1.12) translate3d(${(p * dist / 18) - i * 12}px,0,0)`; });
    }
  };
  if (!still) addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------------------------------------------------------------- 06 */
  $$('[data-tilt]').forEach(el => {
    if (still) return;
    const set = e => {
      const r = el.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      el.style.setProperty('--ry', (nx * 16).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-ny * 12).toFixed(2) + 'deg');
      el.style.setProperty('--sx', ((nx + .5) * 100).toFixed(1) + '%'); el.style.setProperty('--sy', ((ny + .5) * 100).toFixed(1) + '%');
      el.classList.add('is-live');
    };
    el.addEventListener('pointermove', set);
    el.addEventListener('pointerdown', set);
    const reset = () => { el.classList.remove('is-live'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
    el.addEventListener('pointerleave', reset); el.addEventListener('pointerup', reset); el.addEventListener('pointercancel', reset);
  });

  /* ---------------------------------------------------------------- 07 */
  const clock = $('[data-clock]');
  if (clock && typeof PRODUCTS !== 'undefined') {
    const p = PRODUCTS.find(x => x.handle === 'hot-sand');
    const rows = [['Tête', p.notes.tete], ['Cœur', p.notes.coeur], ['Fond', p.notes.fond]];
    $('.clock__rows', clock).innerHTML = rows.map(([k, v]) => `<div class="clock__row"><span>${k}</span><div class="clock__notes">${v.split(/,\s*/).map(n => `<i>${n}</i>`).join('')}</div></div>`).join('');
    const lerp = (t, a, b, va, vb) => va + (vb - va) * clamp((t - a) / (b - a));
    // intensité perçue de chaque étage selon le temps (en minutes)
    const curve = [
      t => t < 15 ? 1 : lerp(t, 15, 60, 1, 0),
      t => t < 30 ? lerp(t, 0, 30, .2, 1) : t < 240 ? 1 : lerp(t, 240, 360, 1, .1),
      t => t < 120 ? lerp(t, 20, 120, .15, 1) : lerp(t, 360, 480, 1, .8)
    ];
    const range = $('input', clock), label = $('.clock__t b', clock), rowEls = $$('.clock__row', clock);
    const fmt = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`;
    const render = () => {
      const m = +range.value; label.textContent = fmt(m);
      rowEls.forEach((r, i) => { const v = curve[i](m); $$('i', r).forEach(n => { n.style.opacity = (.1 + .9 * v).toFixed(2); n.style.filter = `blur(${((1 - v) * 1.6).toFixed(2)}px)`; }); });
    };
    range.addEventListener('input', render); render();
    $('[data-clock-play]', clock).addEventListener('click', () => {
      const t0 = performance.now(), D = 7000;
      const step = now => { const k = clamp((now - t0) / D); range.value = Math.round(k * 480); render(); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------------- 08 : View Transitions */
  const morph = $('[data-morph]');
  if (morph && typeof PRODUCTS !== 'undefined') {
    const list = ['tonka-love', 'vanilla-plum', 'hot-sand', 'palmeira'].map(h => PRODUCTS.find(x => x.handle === h));
    morph.innerHTML = list.map(p => `<button type="button" class="morph__card" data-h="${p.handle}"><figure><img src="${img(p.pack)}" alt=""></figure><b>${p.name}</b><small>${p.keyNotes.replace(/ · /g, ', ')}</small></button>`).join('');
    const vt = fn => document.startViewTransition && !still ? document.startViewTransition(fn) : fn();
    $$('.morph__card', morph).forEach(b => b.addEventListener('click', () => {
      const p = list.find(x => x.handle === b.dataset.h), from = $('img', b);
      from.style.viewTransitionName = 'flacon';
      vt(() => {
        from.style.viewTransitionName = '';
        const s = document.createElement('div'); s.className = 'sheet';
        s.innerHTML = `<button type="button" class="sheet__close">Fermer</button><div class="sheet__img"><img src="/assets/img/v2/${p.pack}.webp?v=${(IMGW[p.pack] || [])[2] || ''}" alt="${p.name}" style="view-transition-name:flacon"></div>
          <div class="sheet__txt"><span class="fig">Extrait de parfum 25 %</span><h3>${p.name}</h3><p>${p.tagline}</p><p>${p.keyNotes.replace(/ · /g, ', ')}</p><a class="btn" href="/produit?p=${p.handle}" style="align-self:flex-start;margin-top:10px">Voir la fiche</a></div>`;
        document.body.appendChild(s); document.documentElement.style.overflow = 'hidden';
        $('.sheet__close', s).addEventListener('click', () => {
          vt(() => { s.remove(); document.documentElement.style.overflow = ''; from.style.viewTransitionName = 'flacon'; });
          setTimeout(() => { from.style.viewTransitionName = ''; }, 900);
        });
      });
    }));
  }
})();
