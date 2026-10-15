/* ==========================================================================
   LIBRERY — l'effet « feuille » des photos (accueil : tirages de l'ouverture, mosaïques de campagne)
   Quand une photo bouge, elle se comporte comme une feuille de papier : ses bords fuient un peu vers l'arrière, la partie
   qui traîne ondule, une lumière rasante en dessine le volume ; à l'arrêt elle redevient plane et l'image d'origine
   (nette, pleine définition) reprend sa place. L'amplitude suit la vitesse du défilement : rien ne bouge sans geste.

   Un seul contexte WebGL 2, hors de la page, pour toutes les photos : chaque photo y est un plan subdivisé (maillage
   28 × 36) déformé dans le shader, puis recopié dans une petite toile posée dans son cadre — la toile hérite donc de
   toutes les transformations CSS du cadre (rotation, profondeur, masque), rien n'est à resynchroniser.
   Coût : nul à l'arrêt (toiles masquées, boucle arrêtée) ; en mouvement, un tracé + une copie par photo visible.
   Textures préparées à l'avance, réduites (1024 px au plus sur téléphone), libérées quand la photo s'éloigne.
   Sans WebGL 2, ou si l'on a demandé moins d'animations : Feuille ne fait rien, les photos restent telles quelles.

   API (main.js) : Feuille.drive(cadre, img, enveloppe 0→1, dx, dy, recadrage [u0, v0, du, dv] | fonction, échelle)
     enveloppe : part de l'effet à cet instant (0 = plane) ; dx, dy : sens du déplacement de la photo à l'écran pour un
     défilement vers le bas (y vers le haut) ; recadrage : la partie de l'image visible dans le cadre ;
     échelle : agrandissement CSS du cadre (définition de la toile).
   Feuille.prepare(cadre, img) : prépare la texture d'avance (au repos).
   ========================================================================== */
(function () {
  'use strict';
  const NOOP = { drive() {}, prepare() {}, on: false };
  window.Feuille = NOOP;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !window.WebGL2RenderingContext) return;
  const glc = document.createElement('canvas');
  let gl = null, dead = false, U = {}, nIdx = 0;

  const small = matchMedia('(max-width: 800px)');
  const TEX = () => (small.matches ? 1024 : 1600), DPR = () => Math.min(devicePixelRatio || 1, 2);
  const NX = 28, NY = 36;

  /* ---- le maillage et le shader -------------------------------------------------------------------- */
  const VS = `#version 300 es
  in vec2 aP;                                  // 0 → 1 (u vers la droite, v vers le bas)
  uniform vec2 uS;                             // taille du cadre (px CSS)
  uniform vec2 uD;                             // sens du mouvement (repère de la photo, y vers le haut)
  uniform float uA, uPh;                       // amplitude 0 → 1, phase de l'ondulation
  uniform vec4 uC;                             // recadrage
  out vec2 vUv; out float vL;
  // profondeur d'un point de la feuille (≤ 0 : rien ne sort du cadre, la perspective rapproche du centre)
  float zf(vec2 q) {
    vec2 n = q / uS;
    float s = dot(n, uD), t = dot(n, vec2(-uD.y, uD.x));           // le long du mouvement (+0,5 : bord d'attaque), en travers
    float tr = clamp(.5 - s, 0., 1.);                               // 0 au bord d'attaque → 1 au bord qui traîne
    float bow = t * t * 4.;                                         // les côtés fuient
    float wav = .5 + .5 * sin(s * 7.5 + t * 1.8 + uPh);              // l'ondulation, qui court vers l'arrière
    float L = min(uS.x, uS.y);
    return -L * uA * (.10 * bow + .26 * tr * tr * (.3 + .7 * wav) + .04 * tr);
  }
  void main() {
    vec2 q = (aP - .5) * uS * vec2(1., -1.);
    float z = zf(q), e = 2.;
    vec3 n = normalize(vec3(-(zf(q + vec2(e, 0.)) - z) / e, -(zf(q + vec2(0., e)) - z) / e, 1.));
    vec3 L = normalize(vec3(-.35, .55, 1.));
    float l = dot(n, L) / L.z;                                      // 1 à plat
    vL = clamp(1. + (l - 1.) * 3., .72, 1.1);
    vUv = uC.xy + aP * uC.zw;
    float F = 2.4 * max(uS.x, uS.y);                                // focale : le plan z = 0 remplit exactement la toile
    gl_Position = vec4(q.x / (uS.x * .5), q.y / (uS.y * .5), 0., (F - z) / F);
  }`;
  const FS = `#version 300 es
  precision mediump float;
  in vec2 vUv; in float vL;
  uniform sampler2D uT;
  out vec4 o;
  void main() { vec4 c = texture(uT, vUv); o = vec4(c.rgb * vL, 1.); }`;
  // le contexte n'est créé qu'à la première photo à préparer (les autres pages n'en ouvrent aucun)
  function setup() {
    if (gl || dead) return !!gl;
    try { gl = glc.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false, powerPreference: 'low-power' }); } catch (e) {}
    if (!gl) { dead = true; return false; }
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { dead = true; gl = null; return false; }
    gl.useProgram(pr);
    ['uS', 'uD', 'uA', 'uPh', 'uC', 'uT'].forEach(k => { U[k] = gl.getUniformLocation(pr, k); });
    const verts = new Float32Array((NX + 1) * (NY + 1) * 2), idx = new Uint16Array(NX * NY * 6);
    for (let j = 0, k = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { verts[k++] = i / NX; verts[k++] = j / NY; }
    for (let j = 0, k = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      idx.set([a, c, b, b, c, d], k); k += 6;
    }
    gl.bindVertexArray(gl.createVertexArray());
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const aP = gl.getAttribLocation(pr, 'aP'); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.uniform1i(U.uT, 0); gl.clearColor(0, 0, 0, 0); nIdx = idx.length;
    glc.addEventListener('webglcontextlost', () => { dead = true; all.forEach(off); });
    return true;
  }

  /* ---- la vitesse du défilement : un souffle signé, −1 → 1 ----------------------------------------- */
  let flow = 0, lastY = scrollY, lastT = performance.now(), v = 0;
  addEventListener('scroll', () => {
    const t = performance.now(), dt = Math.max(8, t - lastT);
    v = (scrollY - lastY) / dt; lastY = scrollY; lastT = t; kick();
  }, { passive: true });

  /* ---- les photos ----------------------------------------------------------------------------------- */
  const all = new Set();
  const far = new IntersectionObserver(es => es.forEach(e => { const f = e.target._fe; if (f && !(f.near = e.isIntersecting)) free(f); }), { rootMargin: '150% 0px' });
  function bind(host, img) {
    const f = host._fe = { host, img, cv: null, cx: null, tex: null, prep: 0, near: true, env: 0, dx: 0, dy: 1, crop: [0, 0, 1, 1], k: 1, a: 0, av: 0, ph: Math.random() * 6, on: false, w: 0, h: 0 };
    all.add(f); far.observe(host);
    return f;
  }
  const idle = window.requestIdleCallback ? cb => requestIdleCallback(cb, { timeout: 400 }) : cb => setTimeout(cb, 60);
  let queue = [], busy = false;
  function prepare(host, img) {
    const f = host._fe || bind(host, img);
    if (f.tex || f.prep || !setup()) return;
    f.prep = 1; queue.push(f); pump();
  }
  // une texture par moment de repos : jamais deux envois d'image dans la même image du défilement
  function pump() {
    if (busy || !queue.length) return; busy = true;
    idle(() => {
      busy = false; const f = queue.shift(); if (!f) return;
      const img = f.img;
      if (!img.complete || !img.naturalWidth) { f.prep = 0; img.addEventListener('load', () => prepare(f.host, img), { once: true }); return pump(); }
      if (f.near && !dead) upload(f);
      f.prep = 0; pump();
    });
  }
  function upload(f) {
    const img = f.img, m = TEX(), s = Math.min(1, m / Math.max(img.naturalWidth, img.naturalHeight));
    let source = img;
    if (s < 1) {                                                      // réduite une fois pour toutes (mémoire du téléphone)
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height); source = c;
    }
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    f.tex = t;
  }
  function free(f) {
    off(f);
    if (f.tex) { if (!dead) gl.deleteTexture(f.tex); f.tex = null; }
    if (f.cv) { f.cv.width = f.cv.height = 0; f.w = f.h = 0; }
  }
  function off(f) { if (f.on) { f.on = false; f.host.classList.remove('fe-on'); } }

  function drive(host, img, env, dx, dy, crop, k) {
    const f = host._fe || bind(host, img);
    f.env = env; if (crop) f.crop = crop; if (k) f.k = k;
    if (dx || dy) { const l = Math.hypot(dx, dy); f.dx = dx / l; f.dy = dy / l; }
    if (!f.tex) prepare(host, img);
    kick();
  }

  /* ---- la boucle : ne tourne que tant qu'une feuille bouge ------------------------------------------ */
  let raf = 0, last = 0, gw = 0, gh = 0, sized = 0;
  addEventListener('resize', () => { sized++; });
  function kick() { if (!raf && gl && !dead && !api.manual) raf = requestAnimationFrame(tick); }
  function tick(t) {
    raf = 0;
    const dt = Math.min(.05, last ? (t - last) / 1000 : 1 / 60); last = t;
    // le souffle : monte vite, retombe en douceur ; la vitesse s'éteint d'elle-même sans nouvel évènement de défilement
    if (t - lastT > 90) v *= Math.pow(.2, dt * 6);
    const g = api.force != null ? api.force : Math.max(-1, Math.min(1, v / 2.2));     // force : réglages et captures
    flow += (g - flow) * (1 - Math.exp(-dt / (Math.abs(g) > Math.abs(flow) ? .07 : .24)));
    let moving = Math.abs(flow) > .002;
    for (const f of all) {
      if (!f.near) continue;
      // un ressort un peu souple : la feuille dépasse à peine et se repose
      const target = f.env * flow;
      f.av += ((target - f.a) * 140 - f.av * 13) * dt; f.a += f.av * dt;
      f.ph += dt * (2.2 + 5 * Math.abs(f.a));
      const A = Math.abs(f.a);
      if (A > .004 || Math.abs(f.av) > .02) moving = true;
      if (!f.tex || A < (f.on ? .003 : .008)) { off(f); continue; }
      draw(f, A, f.a < 0 ? -1 : 1);
    }
    if (api.manual) return;
    if (moving) raf = requestAnimationFrame(tick); else last = 0;
  }
  function draw(f, A, sg) {
    const host = f.host;
    if (!f.cv) {
      f.cv = document.createElement('canvas'); f.cv.className = 'fe-cv'; f.cv.setAttribute('aria-hidden', 'true');
      f.cx = f.cv.getContext('2d');
      const veil = host.querySelector(':scope > i'); host.insertBefore(f.cv, veil || null);
    }
    // taille du cadre (hors transformations) : relevée à l'entrée en mouvement et après un redimensionnement seulement
    if (!f.on || f.sz !== sized) { f.W = host.offsetWidth; f.H = host.offsetHeight; f.sz = sized; }
    const W = f.W, H = f.H; if (!W || !H) return off(f);
    const d = DPR() * f.k, cap = small.matches ? 1100 : 1800;
    let pw = Math.round(W * d), ph = Math.round(H * d); const s = Math.min(1, cap / Math.max(pw, ph)); pw = Math.round(pw * s); ph = Math.round(ph * s);
    if (Math.abs(pw - f.w) > f.w * .08 || Math.abs(ph - f.h) > f.h * .08) { f.cv.width = f.w = pw; f.cv.height = f.h = ph; }
    pw = f.w; ph = f.h;
    if (pw > gw || ph > gh) { glc.width = gw = Math.max(gw, pw); glc.height = gh = Math.max(gh, ph); }
    const c = typeof f.crop === 'function' ? f.crop() : f.crop;
    gl.viewport(0, 0, pw, ph); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, f.tex);
    gl.uniform2f(U.uS, W, H); gl.uniform2f(U.uD, f.dx * sg, f.dy * sg);
    gl.uniform1f(U.uA, Math.min(1.2, A)); gl.uniform1f(U.uPh, f.ph); gl.uniform4f(U.uC, c[0], c[1], c[2], c[3]);
    gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_SHORT, 0);
    f.cx.clearRect(0, 0, pw, ph);
    f.cx.drawImage(glc, 0, gh - ph, pw, ph, 0, 0, pw, ph);
    if (!f.on) { f.on = true; host.classList.add('fe-on'); }
  }

  /* recadrage d'une image « object-fit: cover » dans son cadre, avec le zoom et le décalage CSS (scale, translate) en cours */
  function coverCrop(host, img) {
    const W = host.offsetWidth, H = host.offsetHeight, nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
    const cs = getComputedStyle(img), sc = parseFloat(cs.scale) || 1, tr = (cs.translate || '').split(' ');
    const ty = tr[1] ? (tr[1].endsWith('%') ? parseFloat(tr[1]) * H / 100 : parseFloat(tr[1]) || 0) : 0;
    const c = Math.max(W / nw, H / nh) * sc, dw = nw * c, dh = nh * c;
    return [.5 - W / (2 * dw), (dh / 2 - H / 2 - ty) / dh, W / dw, H / dh];
  }

  // force / manual / step : pour les réglages et les films de démonstration (pas à pas, sans horloge)
  const api = window.Feuille = { drive, prepare, coverCrop, on: true, force: null, manual: false, step: dt => { if (!last) last = performance.now(); tick(last + dt * 1000); } };
})();
