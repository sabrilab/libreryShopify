/* Le chevet de l'accueil en images rendues (Blender, Cycles) : la séquence remplace la 3D en temps réel.
   Même mouvement que chevet3d.js (la caméra en a été relevée image par image : 121 images sur la plongée), même
   relais avec le livre CSS, même interface pour main.js (mount → ctl). Rien à calculer pendant le défilement : une
   ou deux images posées sur un canevas 2D, fondues l'une dans l'autre — fluide sur téléphone comme sur ordinateur.

   Deux jeux : « paysage » (ordinateur, rendu pour un canevas de 1440 × 828) et « portrait » (téléphone, 390 × 784).
   Chaque image est rendue un peu plus grande que son canevas (marge) : à l'écran, elle est recalée par une simple
   similitude (échelle + translation) qui pose la couverture du catalogue de la dernière image exactement sur le livre
   CSS, quelle que soit la taille de la fenêtre ; ce qui dépasse est du papier (fond du canevas).

   Chargement : du grossier au fin (une image sur 8, puis sur 4, 2, 1) — la séquence est lisible dès les 16 premières
   images ; décodage hors du fil principal (createImageBitmap), seulement autour de la position courante (mémoire
   bornée), le reste gardé compressé. */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const NIVEAUX = [8, 4, 2, 1];
const GARDE = 18;                 // images décodées gardées en mémoire (≈ 6 Mo chacune)

export async function mount(fond, track, PH) {
  const ctl = { arret: false, qualite: null, nettoyer: [] };
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); fond.prepend(canvas);
  try { return await monter(canvas, fond, track, PH, ctl); }
  catch (e) { ctl.arret = true; ctl.nettoyer.forEach(f => f()); canvas.remove(); throw e; }
}

async function monter(canvas, fond, track, PH, ctl) {
  const etat = e => { fond.dataset.rendu = e; };
  etat('charge');
  const portrait = fond.clientWidth < fond.clientHeight;
  const base = `/assets/3d/chevet/seq/${portrait ? 'portrait' : 'paysage'}/`;
  const M = await fetch(base + 'manifest.json').then(r => { if (!r.ok) throw new Error('manifest'); return r.json(); });
  const N = M.n, url = i => `${base}${String(i).padStart(3, '0')}.webp?v=${M.version}`;
  const g = canvas.getContext('2d', { alpha: false }); if (!g) throw new Error('canvas');
  const papier = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#f8f5ef';

  // ---------- chargement : du grossier au fin, quatre à la fois ----------
  const blobs = new Array(N), arrivee = [];
  const ordre = [];
  for (const p of NIVEAUX) for (let i = 0; i < N; i++) if (i % p === 0 && (p === NIVEAUX[0] || i % (2 * p) !== 0)) ordre.push(i);
  const premiers = ordre.filter(i => i % NIVEAUX[0] === 0).length;
  let suivant = 0, enCours = 0, recus = 0, finCharge;
  const charge = new Promise(r => finCharge = r);
  const pompe = () => {
    while (!ctl.arret && enCours < 4 && suivant < ordre.length) {
      const i = ordre[suivant++]; enCours++;
      fetch(url(i), { priority: suivant <= premiers ? 'high' : 'low' }).then(r => r.ok ? r.blob() : null).catch(() => null).then(b => {
        enCours--; if (b) { blobs[i] = b; recus++; if (ctl.arret) return; voisins(); kick(); }
        if (recus === premiers || suivant >= ordre.length && !enCours) finCharge();
        pompe();
      });
    }
  };
  pompe();

  // ---------- décodage autour de la position courante ----------
  const decode = new Map();       // i → ImageBitmap (ou promesse en cours)
  let iCourant = 0;
  function bitmap(i) {
    const d = decode.get(i);
    if (d && !(d instanceof Promise)) { decode.delete(i); decode.set(i, d); return d; }   // (récent : en fin de liste)
    if (!d && blobs[i]) {
      decode.set(i, createImageBitmap(blobs[i]).then(b => {
        if (ctl.arret) return b.close?.();
        decode.set(i, b); purger(); kick();
      }, () => decode.delete(i)));
    }
    return null;
  }
  function purger() {
    if (decode.size <= GARDE) return;
    const loin = [...decode.entries()].filter(([, b]) => !(b instanceof Promise)).sort((a, b) => Math.abs(b[0] - iCourant) - Math.abs(a[0] - iCourant));
    for (const [i, b] of loin.slice(0, decode.size - GARDE)) { b.close?.(); decode.delete(i); }
  }
  // les images voisines de la position courante, dans le sens du défilement d'abord
  let sens = 1;
  function voisins() { for (let k = 0; k <= 5; k++) for (const s of [sens, -sens]) { const i = iCourant + s * k; if (i >= 0 && i < N && blobs[i]) bitmap(i); } }
  // l'image disponible la plus proche de f (l'exacte arrive au décodage suivant)
  function proche(f) {
    for (let k = 0; k < N; k++) for (const i of [Math.round(f) - k, Math.round(f) + k]) {
      if (i < 0 || i >= N) continue; const b = decode.get(i); if (b && !(b instanceof Promise)) return [i, b];
    }
    return null;
  }

  // ---------- recalage : la couverture de la dernière image sur le livre CSS ----------
  let cw = 1, ch = 1, dpr = 1, cvMesure = null;
  const leaf = () => track.querySelector('.flip__leaf');
  function couverture(P) {
    const c = canvas.getBoundingClientRect();
    if (P <= PH.livre && leaf()) { const b = leaf().getBoundingClientRect(); if (b.width) return cvMesure = { x: b.left - c.left, y: b.top - c.top, w: b.width, h: b.height }; }
    if (cvMesure) return cvMesure;
    const s = track.querySelector('.flip__stage').getBoundingClientRect(), pg = track.querySelector('.flip__r'), w = pg.offsetWidth, h = pg.offsetHeight;
    return { x: s.left + s.width / 2 - w / 2 - c.left, y: s.top + s.height / 2 - h / 2 - c.top, w, h };
  }
  // la vue de référence (le canevas pour lequel la séquence a été rendue) posée à l'écran : échelle s, centre (cx, cy)
  function vue(cv) {
    const s = (cv.h / M.cv.h + cv.w / M.cv.w) / 2;
    const cx = cv.x + cv.w / 2 + s * (M.cw / 2 - (M.cv.x + M.cv.w / 2)), cy = cv.y + cv.h / 2 + s * (M.ch / 2 - (M.cv.y + M.cv.h / 2));
    return { s, cx, cy };
  }
  // l'ombre du livre CSS coupée au contour du plateau (comme chevet3d.js : polygone dans le repère du livre fermé)
  let boisCle = '';
  function ombreSurBois(V) {
    const r = track.querySelector('.flip__r'); if (!r || !M.bois) return;
    const cle = V.s.toFixed(4); if (cle === boisCle) return; boisCle = cle;
    r.style.setProperty('--bois', `polygon(${M.bois.map(([x, y]) => `calc(${((x - M.cv.x) * V.s).toFixed(1)}px - var(--pw) * var(--ouvre, 0) / 2) ${((M.ch - y - M.cv.y) * V.s).toFixed(1)}px`).join()})`);
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    cw = Math.max(1, canvas.clientWidth); ch = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    dernier = '';
  }

  // ---------- dessin : à la demande, une image quand la position change ----------
  let pend = 0, dernier = '', vu = false, P = 0, Vcourante = null;
  function kick() { if (!pend && !ctl.arret) pend = requestAnimationFrame(frame); }
  function frame() {
    pend = 0; if (ctl.arret || !vu) return;
    const r = track.getBoundingClientRect(); P = clamp(-r.top / (r.height - innerHeight));
    const Pe = Math.min(P, PH.vol);
    // un seul mouvement : la part u du chemin faite (cosinus sur 0 → vol), comme chevet3d.js ; les images sont
    // régulièrement espacées en u (vitesse d'écran constante le long du chemin)
    const u = .5 - Math.cos(Math.PI * clamp(Pe / PH.vol)) / 2, f = u * (N - 1);
    const i = Math.round(f); if (i !== iCourant) { sens = i > iCourant ? 1 : -1; iCourant = i; voisins(); }
    // les deux images arrivées qui encadrent f (voisines dès que la séquence est complète ; une sur 8 au début) :
    // fondues l'une dans l'autre au prorata — le mouvement reste continu même avant l'arrivée des images fines
    let i0 = Math.floor(f), i1 = Math.ceil(f);
    while (i0 > 0 && !blobs[i0]) i0--; while (i1 < N - 1 && !blobs[i1]) i1++;
    if (!blobs[i0]) i0 = i1; if (!blobs[i1]) i1 = i0;
    const t = i1 > i0 ? (f - i0) / (i1 - i0) : 0;
    const b0 = bitmap(i0), b1 = t > .004 ? bitmap(i1) : b0;
    let A, B = null, k = 0, net = false, ia = i0;
    if (b0 && b1) { A = b0; B = b1 !== b0 ? b1 : null; k = t; net = i1 - i0 <= 1; }
    else { const p = proche(f); if (!p) return; [ia, A] = p; }
    const cv = couverture(P), V = vue(cv); Vcourante = V;
    const cle = [ia, B ? i1 : -1, k.toFixed(3), cv.x.toFixed(1), cv.y.toFixed(1), cv.w.toFixed(1), cv.h.toFixed(1), cw, ch].join();
    if (cle === dernier) return; dernier = cle;
    ombreSurBois(V);
    const w = M.cw * M.marge * V.s * dpr, h = M.ch * M.marge * V.s * dpr, x = V.cx * dpr - w / 2, y = V.cy * dpr - h / 2;
    g.globalAlpha = 1; g.fillStyle = papier; g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(A, x, y, w, h);
    if (B && k > .004) { g.globalAlpha = k; g.drawImage(B, x, y, w, h); g.globalAlpha = 1; }
    etat(net ? 'net' : 'vif');
  }

  const surDefil = () => kick();
  addEventListener('scroll', surDefil, { passive: true });
  let rt = 0;
  const surTaille = () => { clearTimeout(rt); rt = setTimeout(() => { resize(); cvMesure = null; boisCle = ''; kick(); }, 220); };
  const ro = new ResizeObserver(() => { if (canvas.clientWidth !== cw || canvas.clientHeight !== ch) surTaille(); });
  ro.observe(fond); addEventListener('resize', surTaille);
  const io = new IntersectionObserver(([e]) => { vu = e.isIntersecting; if (vu) { dernier = ''; kick(); } });
  io.observe(track);
  function fin() {
    ctl.arret = true; cancelAnimationFrame(pend); clearTimeout(rt);
    removeEventListener('scroll', surDefil); removeEventListener('resize', surTaille); ro.disconnect(); io.disconnect();
    for (const b of decode.values()) if (!(b instanceof Promise)) b.close?.();
    decode.clear();
  }
  ctl.nettoyer.push(fin);
  resize();

  // prêt : les premières images arrivées (une sur 8), celle de la position courante décodée
  await charge;
  if (ctl.arret) throw new Error('chevet arrêté');
  { const r = track.getBoundingClientRect(), u = .5 - Math.cos(Math.PI * clamp(Math.min(clamp(-r.top / (r.height - innerHeight)), PH.vol) / PH.vol)) / 2;
    iCourant = Math.round(u * (N - 1)); voisins();
    const p = ordre.slice(0, premiers).sort((a, b) => Math.abs(a - iCourant) - Math.abs(b - iCourant))[0];
    if (blobs[p]) { const b = await createImageBitmap(blobs[p]); decode.set(p, b); } }
  vu = true; frame();

  // l'image clé, pour le catalogue 3D ouvert depuis la section (initLecteur, décor « chevet ») : l'objectif de la
  // séquence, la pose du catalogue sur le plateau, et la vue de référence posée à l'écran (axe optique, focale)
  const cle = () => M.cle;
  const optique = () => {
    const c = canvas.getBoundingClientRect(), V = Vcourante || vue(couverture(P));
    return { left: c.left + V.cx - M.cw * V.s / 2, top: c.top + V.cy - M.ch * V.s / 2, width: M.cw * V.s, height: M.ch * V.s };
  };
  const mesure = () => {
    const b = leaf()?.getBoundingClientRect(), c = canvas.getBoundingClientRect(), V = Vcourante;
    return { P, rendu: fond.dataset.rendu, decodees: decode.size, recues: recus, n: N, vue: V, livre: b && { x: b.left - c.left, y: b.top - c.top, w: b.width, h: b.height } };
  };
  fond.chevet = ctl;
  return Object.assign(ctl, { cle, optique, mesure, invalider: () => { dernier = ''; kick(); }, dispose: () => { fin(); canvas.remove(); } });
}
