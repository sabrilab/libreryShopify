// Rendu « photographique » du chevet de l'accueil (chevet3d.js), adapté du catalogue 3D (librery-catalogue-3d/src/rendu.js)
// et du prototype validé (_proto/meuble/photo.js).
// Deux régimes :
//  · en mouvement (défilement) : un rendu direct suréchantillonné (MSAA), à définition plafonnée (ech), par une caméra
//    jumelle (sa propre cible de réfraction, à mi-définition), puis la finition photo ;
//  · à l'arrêt : affinage progressif, image après image (TAA : 32 échantillons décalés d'une fraction de
//    pixel, ce qui lisse les filets clairs des arêtes du verre), occlusion ambiante (GTAO), même finition.
// Finition en deux passes plein écran : développement (profondeur de champ légère calculée sur la profondeur,
// halo retenu des reflets les plus vifs et halation chaude, tone mapping filmique, pied de courbe et virage des noirs)
// — moyenné d'une étape d'affinage à l'autre, la spirale du flou tournant à chaque fois — puis tirage (vignetage et
// grain fin, sur le sujet seulement). Le fond reste exactement le papier du site : la scène est rendue sur fond
// transparent et posée sur le papier à la fin (pas de couture avec la page).
import * as THREE from "three";
import { TAARenderPass } from "three/addons/postprocessing/TAARenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

const VERT = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

// halo : seule la part de lumière au-dessus du seuil rayonne (les éclats de l'or et des arêtes du verre),
// réduite au quart de la définition ; chaque point plafonné à 12 (une étincelle isolée ne fait plus une tache carrée
// dans le halo)
// (cadre, lim : en mouvement, l'image n'occupe qu'un coin des cibles — voir Photo.ech ; on n'en sort jamais)
const SEUIL = `uniform sampler2D tColor; uniform vec2 texel, cadre, lim; uniform float seuil; varying vec2 vUv;
void main() {
  vec3 s = vec3(0.); vec2 uv = vUv * cadre;
  s += min(texture2D(tColor, min(uv + texel * vec2(-1., -1.), lim)).rgb, vec3(12.));
  s += min(texture2D(tColor, min(uv + texel * vec2( 1., -1.), lim)).rgb, vec3(12.));
  s += min(texture2D(tColor, min(uv + texel * vec2(-1.,  1.), lim)).rgb, vec3(12.));
  s += min(texture2D(tColor, min(uv + texel * vec2( 1.,  1.), lim)).rgb, vec3(12.));
  s *= .25;
  float l = max(s.r, max(s.g, s.b));
  gl_FragColor = vec4(s * max(l - seuil, 0.) / max(l, 1e-4), 1.);
}`;
// flou gaussien séparable (9 points en 5 lectures)
const FLOU = `uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
void main() {
  vec3 s = texture2D(tSrc, vUv).rgb * .2270270270;
  s += (texture2D(tSrc, vUv + dir * 1.3846153846).rgb + texture2D(tSrc, vUv - dir * 1.3846153846).rgb) * .3162162162;
  s += (texture2D(tSrc, vUv + dir * 3.2307692308).rgb + texture2D(tSrc, vUv - dir * 3.2307692308).rgb) * .0702702703;
  gl_FragColor = vec4(s, 1.);
}`;
// développement : profondeur de champ (« un seul passage », d'après D. Gustafsson, 2018 : spirale d'or, chaque
// échantillon pèse selon son propre cercle de confusion — un premier plan flou déborde sur le net, pas
// l'inverse), aberration chromatique à peine aux bords (jamais contre le papier : elle y dessinait un liseré
// cyan), halo, tone mapping. Sortie prémultipliée (couleur × alpha, alpha) : à l'arrêt, chaque étape
// d'affinage tourne la spirale et s'ajoute à la moyenne — le flou devient lisse, sans grésillement aux bords
const DEVELOP = `#include <packing>
#include <tonemapping_pars_fragment>
uniform sampler2D tColor, tDepth, tBloom, tHalo;
uniform vec3 teinteHalo;
uniform vec2 texel, cadre, lim;
uniform float cameraNear, cameraFar, focus, cocK, cocMax, pas, demi, exposition, bloom, halo, aberration, pied, tour, virage;
varying vec2 vUv;
float vz(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
float coc(float z) { return min(cocMax, cocK * abs(1. / focus - 1. / z)); }
float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  vec2 uv = vUv * cadre;
  vec4 c0 = texture2D(tColor, uv), col = c0;
#if FLOU_ON
  float z0 = vz(uv), s0 = coc(z0), tot = 1., r = pas * (.5 + h12(gl_FragCoord.yx + tour * 7.31)), ang = h12(gl_FragCoord.xy + tour * 17.93) * 6.2831853;
  for (int i = 0; i < FLOU_N; i++) {
    if (r >= cocMax) break;
    vec2 tc = min(uv + vec2(cos(ang), sin(ang)) * r * texel, lim);
    vec4 sc = texture2D(tColor, tc);
    float sz = vz(tc), ss = coc(sz);
    if (sz > z0) ss = min(ss, s0 * 2.);
    float m = smoothstep(r - demi, r + demi, ss);
    col += mix(col / tot, sc, m); tot += 1.;
    ang += 2.39996323; r += pas * pas / r;
  }
  col /= tot;
#endif
  vec2 d = vUv - .5;
  // aberration chromatique : rouge et bleu décalés vers les bords, sur les seuls contrastes internes au sujet
  vec2 o = d * 2. * aberration * texel;
  vec4 cr = texture2D(tColor, min(uv + o, lim)), cb = texture2D(tColor, min(uv - o, lim));
  float wa = smoothstep(.98, 1., min(c0.a, min(cr.a, cb.a)));
  // (sur des valeurs plafonnées : un éclat très fort ne doit pas tracer un liseré vert ou magenta)
  col.r += (min(cr.r, 1.5) - min(c0.r, 1.5)) * wa;
  col.b += (min(cb.b, 1.5) - min(c0.b, 1.5)) * wa;
  float a = clamp(col.a, 0., 1.);
  // halo serré des éclats + halation large et chaude (la lumière qui diffuse dans l'émulsion autour des hautes
  // lumières, rougeâtre) — elle ne naît que des éclats au-dessus du seuil
  vec3 lin = max(col.rgb, 0.) / max(a, 1e-3) + texture2D(tBloom, vUv).rgb * bloom + texture2D(tHalo, vUv).rgb * halo * teinteHalo;
  lin *= exposition;
#if TM == 0
  vec3 t = AgXToneMapping(lin);
#elif TM == 1
  vec3 t = ACESFilmicToneMapping(lin);
#else
  vec3 t = NeutralToneMapping(lin);
#endif
  // pied de courbe (clair-obscur) : les ombres se creusent un peu, sur la luminance seule (les teintes ne bougent pas),
  // sans boucher les noirs ; les tons clairs (la couverture du catalogue) ne bougent presque pas
  float Lt = max(dot(t, vec3(.2126, .7152, .0722)), 1e-5);
  t *= pow(Lt, pied);
  // virage des seuls noirs profonds, vers une terre d'ombre presque neutre — les jus et l'or, plus clairs, gardent
  // toute leur couleur
  t = mix(t, vec3(Lt) * vec3(1.08, 1., .9), virage * (1. - smoothstep(.002, .05, Lt)));
  gl_FragColor = vec4(sRGBTransferOETF(vec4(t, 1.)).rgb * a, a);
}`;
// tirage : vignetage et grain sur l'image développée (moyennée à l'arrêt), puis posée sur le papier du site
const TIRAGE = `uniform sampler2D tDev;
uniform float vignette, grain, graine, aspect;
uniform vec2 centre, cadre, lim;
uniform vec3 papier;
varying vec2 vUv;
float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  vec4 dv = texture2D(tDev, min(vUv * cadre, lim));
  float a = clamp(dv.a, 0., 1.);
  vec3 c = dv.rgb / max(a, 1e-3);
  vec2 d = vUv - centre;
  // vignetage du sujet (le papier reste le papier), centré sur l'axe de l'objectif (décentrement compris)
  float v = length(d * 2. * vec2(aspect, 1.)) / length(vec2(aspect, 1.));
  c *= 1. - vignette * smoothstep(.3, 1.05, v);
  // grain argentique : bruit triangulaire, plus présent dans les ombres et les tons moyens
  float n = h12(gl_FragCoord.xy + graine * 113.17) + h12(gl_FragCoord.xy * 1.731 + graine * 71.3) - 1.;
  c += n * grain * (1. - .55 * dot(c, vec3(.2126, .7152, .0722)));
  gl_FragColor = vec4(mix(papier, c, a), 1.);
}`;

export const TONE = { agx: 0, aces: 1, neutral: 2 };

export class Photo {
  /**
   * @param {THREE.WebGLRenderer} renderer — sans tone mapping (fait ici), pixel ratio déjà fixé
   * @param {{ mobile: boolean, tm: number, papier: string, flouN: number }} o
   */
  constructor(renderer, scene, camera, { mobile = false, tm = TONE.neutral, papier = "#f8f5ef", flouN = mobile ? 80 : 128 } = {}) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.mobile = mobile;
    // La scène est rendue sur fond transparent (alpha 0) pour être posée sur le papier. Or three.js, quand le fond
    // est transparent, remplit l'image de réfraction (transmission) de BLANC à 50 % : chaque arête du verre, dont le
    // rayon réfracté tombe dans un trou de cette image, se dessinait en filet blanc d'un pixel (aspect fil de fer).
    // On rend donc la scène sans effacer la cible (déjà effacée en transparent) avec un fond opaque très sombre :
    // c'est ce fond, couleur de l'intérieur du caisson, que voit la réfraction.
    const rendre = renderer.render.bind(renderer), fondRefraction = new THREE.Color(0x070504), _c = new THREE.Color();
    // (Les cartes d'ombre, quand elles sont recalculées, laissent l'effacement en blanc opaque : on les calcule
    // d'abord, sur une image jetée.)
    renderer.render = (s, c) => {
      const a = renderer.getClearAlpha();
      if (s !== scene || a >= 1) return rendre(s, c);
      renderer.getClearColor(_c); const ac = renderer.autoClear;
      if (renderer.shadowMap.needsUpdate) { rendre(s, c); renderer.setClearColor(_c, a); renderer.clear(); }
      else if (ac) renderer.clear();               // effacement transparent de la cible, comme avant
      renderer.autoClear = false; renderer.setClearColor(fondRefraction, 1);
      rendre(s, c);
      renderer.setClearColor(_c, a); renderer.autoClear = ac;
    };
    const hf = THREE.HalfFloatType, dpr = renderer.getPixelRatio();
    this.dpr = dpr;
    // MSAA du rendu en mouvement : 4 échantillons, 2 au-delà de 1,75 de densité (mémoire)
    this.rtScene = new THREE.WebGLRenderTarget(1, 1, { type: hf, samples: dpr > 1.75 ? 2 : 4, depthTexture: new THREE.DepthTexture(1, 1) });
    this.rtAO = new THREE.WebGLRenderTarget(1, 1, { type: hf, depthBuffer: false });
    this.rtH1 = new THREE.WebGLRenderTarget(1, 1, { type: hf, depthBuffer: false });
    this.rtH2 = new THREE.WebGLRenderTarget(1, 1, { type: hf, depthBuffer: false });
    this.rtH3 = new THREE.WebGLRenderTarget(1, 1, { type: hf, depthBuffer: false });    // halation : 1/8 de la définition
    this.rtH4 = new THREE.WebGLRenderTarget(1, 1, { type: hf, depthBuffer: false });
    this.rtDev = new THREE.WebGLRenderTarget(1, 1, { type: hf, depthBuffer: false });   // image développée (moyenne à l'arrêt)
    // profondeur nette pour la profondeur de champ en qualité basse (sans GTAO) : le TAA recopie sa moyenne dans
    // rtScene et en efface la profondeur — la mise au point lirait « l'infini » partout (tout serait flou)
    this.rtProf = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) });
    this.matProf = new THREE.MeshBasicMaterial({ colorWrite: false });

    // l'image en mouvement est rendue par une caméra jumelle : three.js tient une cible de réfraction (transmission)
    // par caméra — celle du mouvement (au budget de pixels, à mi-définition) et celle de l'affinage (pleine) gardent
    // chacune leur taille : aucune réallocation au départ ni à l'arrêt du défilement
    this.camVif = new THREE.PerspectiveCamera();
    this.taa = new TAARenderPass(scene, camera, 0x000000, 0);
    // des étapes légères (1 ou 2 rendus de la scène chacune, 32 échantillons au total) : quand le défilement reprend
    // pendant l'affinage, la première image en mouvement n'attend derrière l'étape déjà envoyée que 30 à 60 ms
    this.taa.sampleLevel = mobile ? 0 : 1;
    this.taa.accumulate = true;
    this.etapes = mobile ? 32 : 16;
    this.gtao = new GTAOPass(scene, camera, 1, 1);
    this.gtao.blendIntensity = 0;
    this.gtao.updateGtaoMaterial({ radius: .05, distanceExponent: 1.6, thickness: .025, scale: 1, samples: mobile ? 8 : 12 });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: mobile ? 8 : 16 });

    const mat = (fragmentShader, uniforms, defines = {}) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, defines, depthTest: false, depthWrite: false, toneMapped: false });
    // part des cibles occupée par l'image (coordonnées de texture) et dernier point lisible : partagés par les passes
    const cadre = { value: new THREE.Vector2(1, 1) }, lim = { value: new THREE.Vector2(1, 1) };
    this.qSeuil = new FullScreenQuad(mat(SEUIL, { tColor: { value: null }, texel: { value: new THREE.Vector2() }, seuil: { value: 2.5 }, cadre, lim }));
    this.qFlou = new FullScreenQuad(mat(FLOU, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } }));
    // le papier en valeurs d'affichage (sRGB), tel quel : il est mélangé après le tone mapping
    const hex = parseInt(papier.slice(1), 16), pap = new THREE.Vector3((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255);
    this.uFinal = {
      tColor: { value: null }, tDepth: { value: null }, tBloom: { value: this.rtH1.texture }, tHalo: { value: this.rtH3.texture }, halo: { value: 0 }, teinteHalo: { value: new THREE.Vector3(1, .55, .3) },
      texel: { value: new THREE.Vector2() }, cameraNear: { value: camera.near }, cameraFar: { value: camera.far },
      focus: { value: 2 }, cocK: { value: 0 }, cocMax: { value: 6 }, pas: { value: 1 }, demi: { value: .5 },
      exposition: { value: 1 }, bloom: { value: .06 }, aberration: { value: .7 }, pied: { value: .1 }, virage: { value: 0 }, tour: { value: 0 }, toneMappingExposure: { value: 1 }, cadre, lim,
    };
    this.matFinal = mat(DEVELOP, this.uFinal, { FLOU_ON: 1, TM: tm, FLOU_N: flouN });
    // moyenne glissante dans rtDev : nouvelle × 1/(n+1) + ancienne × n/(n+1) (alpha constant du mélange)
    Object.assign(this.matFinal, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ConstantAlphaFactor, blendDst: THREE.OneMinusConstantAlphaFactor,
      blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.ConstantAlphaFactor, blendDstAlpha: THREE.OneMinusConstantAlphaFactor, blendAlpha: 1 });
    this.qFinal = new FullScreenQuad(this.matFinal);
    this.uTirage = { tDev: { value: this.rtDev.texture }, vignette: { value: .14 }, grain: { value: .035 }, graine: { value: 0 }, aspect: { value: 1 }, centre: { value: new THREE.Vector2(.5, .5) }, papier: { value: pap }, cadre, lim };
    this.uCadre = cadre.value; this.uLim = lim.value;
    this.qTirage = new FullScreenQuad(mat(TIRAGE, this.uTirage, {}));
    // réglages lus à chaque image (en pixels CSS : le rendu ne dépend pas de la densité de l'écran)
    this.reglages = { focus: 2, flou: 45, flouMax: 6, exposition: 1, bloom: .06, halo: 0, seuil: 2.5, vignette: .14, grain: .035, aberration: .7, pied: .1, ao: .5, virage: 0 };
    this.etape = 0;
    this.sansAO = false;                              // qualité basse : affinage sans GTAO
    this.ombresSeules = [];                           // objets qui ne font qu'ombrer (drapeaux) : absents de la passe GTAO,
                                                      // dont la profondeur sert aussi à la profondeur de champ
    this.taille = new THREE.Vector2(1, 1);
    this.vue = new THREE.Vector2(1, 1);             // pixels réellement rendus (coin bas-gauche des cibles)
    this.centre = new THREE.Vector2(.5, .5);         // axe de l'objectif dans l'image (coordonnées de texture)
    // en mouvement, l'image est rendue à cette fraction de la définition (budget de pixels, voir chevet3d.js), dans
    // un coin des mêmes cibles, puis agrandie au tirage ; l'affinage à l'arrêt revient à la pleine définition
    this.ech = 1;
  }

  setTonemapping(tm) { this.matFinal.defines.TM = tm; this.matFinal.needsUpdate = true; }

  /** programmes des passes compilés d'avance, en parallèle (sinon : compilation bloquante à la première image, puis
   *  au premier affinage). Les passes plein écran se rendent sans lumières, vers une cible (sortie linéaire) ou
   *  l'écran pour le tirage ; le rendu des normales (GTAO) dans la scène, avec ses lumières */
  prechauffer() {
    const r = this.renderer, cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), plan = new THREE.PlaneGeometry(2, 2);
    const groupe = ms => { const s = new THREE.Scene(); ms.forEach(m => s.add(new THREE.Mesh(plan, m))); return s; };
    const normales = this.gtao.normalMaterial;
    const passes = [this.taa, this.gtao].flatMap(p => Object.values(p).filter(v => v?.isMaterial && v !== normales));
    const rt0 = r.getRenderTarget(), att = [];
    r.setRenderTarget(this.rtDev);
    att.push(r.compileAsync(groupe([this.qSeuil.material, this.qFlou.material, this.matFinal, ...passes]), cam));
    if (normales) att.push(r.compileAsync(groupe([normales]), this.camera, this.scene));
    r.setRenderTarget(null);
    att.push(r.compileAsync(groupe([this.qTirage.material]), cam));
    r.setRenderTarget(rt0);
    return Promise.all(att).catch(() => {}).finally(() => plan.dispose());
  }

  setSize(w, h) {
    const W = Math.max(1, Math.round(w * this.dpr)), H = Math.max(1, Math.round(h * this.dpr));
    this.taille.set(W, H);
    this.rtScene.setSize(W, H); this.rtAO.setSize(W, H); this.rtDev.setSize(W, H); this.rtProf.setSize(W, H);
    this.rtH1.setSize(Math.max(1, W >> 2), Math.max(1, H >> 2)); this.rtH2.setSize(Math.max(1, W >> 2), Math.max(1, H >> 2));
    this.rtH3.setSize(Math.max(1, W >> 3), Math.max(1, H >> 3)); this.rtH4.setSize(Math.max(1, W >> 3), Math.max(1, H >> 3));
    this.taa.setSize(W, H);
    if (this.taa.holdRenderTarget) { this.taa.holdRenderTarget.dispose(); this.taa.holdRenderTarget = undefined; }   // créé à la première taille, jamais redimensionné
    this.gtao.setSize(W, H);
    this.uTirage.aspect.value = w / h;
    this.etape = 0;
  }

  /** une image en mouvement : rendu direct (MSAA) puis finition ; le grain bouge d'une image à l'autre */
  vif() {
    const r = this.renderer, c = this.camVif;
    c.copy(this.camera, false); c.updateMatrixWorld(true);
    this._cadrer(this.ech);                          // avant setRenderTarget, qui lit la fenêtre de la cible
    r.setRenderTarget(this.rtScene); r.setClearColor(0x000000, 0); r.clear(); r.render(this.scene, c);
    this.uTirage.graine.value = (this.uTirage.graine.value + .6180339) % 1;
    this._finir(this.rtScene.texture, this.rtScene.depthTexture, 1.0, 0);
    this.etape = 0;
  }

  /** une étape d'affinage à l'arrêt ; renvoie true tant qu'il en reste */
  affiner() {
    const r = this.renderer;
    // (première étape : pleine définition, l'image d'attente du TAA et le premier échantillon, un seul rendu chacun —
    // elle porte aussi l'occlusion ; les suivantes, 2^sampleLevel échantillons)
    const sl = this.taa.sampleLevel;
    if (this.etape === 0) { this.taa.accumulateIndex = -1; this.taa.sampleLevel = 0; this._cadrer(1); }
    this.taa.render(r, this.rtScene, this.rtScene);   // accumulation, résultat dans rtScene
    this.taa.sampleLevel = sl;
    if (this.sansAO) {
      // qualité basse : pas d'occlusion ambiante ; la profondeur, rendue une fois (sans couleur) au début de l'affinage
      if (this.etape === 0) {
        const s = this.scene, om = s.overrideMaterial, bg = s.background;
        for (const o of this.ombresSeules) o.visible = false;
        s.overrideMaterial = this.matProf; s.background = null;
        r.setRenderTarget(this.rtProf); r.setClearColor(0x000000, 0); r.clear(); r.render(s, this.camera);
        s.overrideMaterial = om; s.background = bg;
        for (const o of this.ombresSeules) o.visible = true;
      }
      this._finir(this.rtScene.texture, this.rtProf.depthTexture, .6, this.etape + 1);
    } else {
      // occlusion retenue (elle n'assombrit que les creux), à pleine force dès la 3e étape : la moyenne la fond sans à-coup
      const g = this.gtao;
      g.blendIntensity = Math.min(1, (this.etape + 1) / 3) * this.reglages.ao;
      if (this.etape === 0) {
        for (const o of this.ombresSeules) o.visible = false;
        g.render(r, this.rtAO, this.rtScene);           // rtScene × occlusion → rtAO ; profondeur nette (sans décalage) dans gtao.depthTexture
        for (const o of this.ombresSeules) o.visible = true;
      } else {
        // la scène est fixe et la passe d'occlusion n'est pas décalée : son résultat (débruité) est le même à chaque
        // étape — on ne refait que le mélange (deux passes plein écran au lieu d'un rendu de la scène + l'occlusion)
        g.copyMaterial.uniforms.tDiffuse.value = this.rtScene.texture; g.copyMaterial.blending = THREE.NoBlending;
        g.renderPass(r, g.copyMaterial, this.rtAO);
        g.blendMaterial.uniforms.intensity.value = g.blendIntensity; g.blendMaterial.uniforms.tDiffuse.value = g.pdRenderTarget.texture;
        g.renderPass(r, g.blendMaterial, this.rtAO);
      }
      this._finir(this.rtAO.texture, g.depthTexture, .6, this.etape + 1);
    }
    this.etape++;
    return this.etape < this.etapes;
  }

  /** l'image occupe le coin bas-gauche des cibles, à la fraction s de leur définition */
  _cadrer(s) {
    const W = this.taille.x, H = this.taille.y, w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
    this.vue.set(w, h); this.rtScene.viewport.set(0, 0, w, h); this.rtDev.viewport.set(0, 0, w, h);
    this.uCadre.set(w / W, h / H); this.uLim.set((w - .5) / W, (h - .5) / H);
  }

  _finir(couleur, profondeur, pasCss, n) {
    // k : pixels rendus par pixel CSS (moindre en mouvement si le budget l'impose)
    const r = this.renderer, g = this.reglages, u = this.uFinal, W = this.taille.x, H = this.taille.y, k = this.dpr * this.vue.y / H;
    // halo des éclats : seuil + réduction au quart, puis flou horizontal et vertical
    const s = this.qSeuil.material.uniforms;
    s.tColor.value = couleur; s.texel.value.set(1 / W, 1 / H); s.seuil.value = g.seuil;
    r.setRenderTarget(this.rtH1); this.qSeuil.render(r);
    const f = this.qFlou.material.uniforms, w4 = this.rtH1.width, h4 = this.rtH1.height;
    f.tSrc.value = this.rtH1.texture; f.dir.value.set(1.25 / w4, 0); r.setRenderTarget(this.rtH2); this.qFlou.render(r);
    f.tSrc.value = this.rtH2.texture; f.dir.value.set(0, 1.25 / h4); r.setRenderTarget(this.rtH1); this.qFlou.render(r);
    if (g.halo > 0) {                                   // halation : le halo serré, réduit au 1/8 et flouté deux fois plus large, deux passes
      const w8 = this.rtH3.width, h8 = this.rtH3.height;
      f.tSrc.value = this.rtH1.texture; f.dir.value.set(2.5 / w8, 0); r.setRenderTarget(this.rtH4); this.qFlou.render(r);
      f.tSrc.value = this.rtH4.texture; f.dir.value.set(0, 2.5 / h8); r.setRenderTarget(this.rtH3); this.qFlou.render(r);
      f.tSrc.value = this.rtH3.texture; f.dir.value.set(1.6 / w8, 0); r.setRenderTarget(this.rtH4); this.qFlou.render(r);
      f.tSrc.value = this.rtH4.texture; f.dir.value.set(0, 1.6 / h8); r.setRenderTarget(this.rtH3); this.qFlou.render(r);
    }
    // finition
    u.tColor.value = couleur; u.tDepth.value = profondeur; u.texel.value.set(1 / W, 1 / H);
    u.cameraNear.value = this.camera.near; u.cameraFar.value = this.camera.far;
    const e = H / this.dpr / 860;                        // les réglages sont donnés pour un écran de 860 px de haut
    u.focus.value = g.focus; u.cocK.value = g.flou * e * k; u.cocMax.value = Math.max(1, g.flouMax * e * k);
    u.pas.value = pasCss * k; u.demi.value = .5 * k;
    u.exposition.value = g.exposition; u.bloom.value = g.bloom; u.halo.value = g.halo ?? 0; u.pied.value = g.pied; u.virage.value = g.virage ?? 0; u.aberration.value = g.aberration * k;
    // n = 0 : image en mouvement (remplace) ; n ≥ 1 : n-ième étape d'affinage, ajoutée à la moyenne (spirale tournée)
    u.tour.value = n + this.uTirage.graine.value * 31.7; this.matFinal.blendAlpha = 1 / Math.max(1, n);
    // sans effacement : la moyenne se fait avec ce que contient déjà rtDev
    const ac = r.autoClear; r.autoClear = false; r.setRenderTarget(this.rtDev); this.qFinal.render(r); r.autoClear = ac;
    const t = this.uTirage; t.vignette.value = g.vignette; t.grain.value = g.grain * Math.sqrt(this.dpr); t.centre.value.copy(this.centre);   // le grain, lui, à la définition de l'écran
    r.setRenderTarget(null); this.qTirage.render(r);
  }
}
