// Le chevet de l'accueil (section #catalogue), d'après le prototype validé (_proto/meuble) : un chevet Poly Haven
// (CC0) garni de dix-huit flacons, en clair-obscur, rendu comme une photographie (chevet-photo.js).
// Les parfums : le cœur du prototype, greffé tel quel (retours du 14/10 — « sublime ») : par niche une lumière
// principale cachée (ombres dures), un contre-jour et la lumière du fond qui découpe les silhouettes ; velours noir
// réchauffé au pied ; verre épais aux faces vraiment planes et aux arêtes arrondies, lightformers du studio, carte
// cachée qui allume les jus, or champagne poli, dorure en relief, gravures ; étagères laquées en miroir, caustiques
// tracées puis cuites (assets/3d/chevet/caustiques.*).
// Le défilement de la section mène la caméra, puis le relais avec le livre feuilleté (CSS, main.js : initFlip) :
//  · 0 → vol : un seul mouvement (retours du 13/10 : avant, une plongée puis un relais, deux élans). De trois quarts,
//    à hauteur du caisson, la caméra monte, plonge, se tourne de face et, du même geste, glisse et pivote de l'angle
//    du catalogue, jusqu'à le poser exactement sur la couverture du livre fermé (mesurée dans la page). Le catalogue
//    ne bouge pas du plateau : le plateau entier passe à droite, un peu de biais ;
//  · vol → fondu : le livre CSS apparaît par-dessus, à la même place (main.js), puis le catalogue 3D s'efface ;
//  · ensuite : le plateau reste, immobile, sous le livre qui se feuillette (plus aucun rendu).
// Rendu à la demande, seulement quand la section est à l'écran ; affinage (TAA, occlusion) à l'arrêt du défilement.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { ConvexHull } from "three/addons/math/ConvexHull.js";
import { Photo, TONE } from "chevet-photo";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lisse = t => t * t * (3 - 2 * t);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * @param {HTMLElement} fond — le calque sous le livre (.flip__chevet), qui porte l'affiche
 * @param {HTMLElement} track — la section (.flip), dont le défilement mène tout
 * @param {{ vol: number, fondu: number, livre: number, perdu?: Function }} PH — phases (fractions du défilement)
 */
export async function mount(fond, track, PH) {
  const canvas = document.createElement("canvas"); canvas.setAttribute("aria-hidden", "true"); fond.prepend(canvas);
  const ctl = { arret: false, nettoyer: [] };
  try { return await monter(canvas, fond, track, PH, ctl); }
  catch (e) { ctl.dispose?.(); ctl.nettoyer.forEach(f => f()); canvas.remove(); throw e; }
}

async function monter(canvas, fond, track, PH, ctl) {
  const MOBILE = matchMedia("(pointer: coarse)").matches || innerWidth < 800;
  const Q = new URLSearchParams(location.search);
  // niveaux de qualité :
  //  · « haute » (ordinateur) : miroirs des étagères à mi-définition, verre épais et dispersion à l'arrêt ;
  //  · « mobile » : miroirs au tiers, verre simple face, dispersion réduite, quatre lightformers ;
  //  · « basse » (peu de mémoire, ou machine qui peine même au budget de pixels réduit) : sans miroirs, dispersion,
  //    lightformers du verre ni occlusion (?qualite=… pour l'essai)
  const MEMOIRE = navigator.deviceMemory;
  let QUAL = ["haute", "mobile", "basse"].includes(Q.get("qualite")) ? Q.get("qualite") : MEMOIRE && MEMOIRE <= 4 ? "basse" : MOBILE ? "mobile" : "haute";
  const HAUTE = QUAL === "haute";
  // réglages de l'éclairage et des matières (ceux du prototype ; à l'essai : ?cle=1.8&lfEtiqCarte=2…)
  const PARAMS = { fond: 2, chute: .05, haut: .06, hautCote: .05, diffus: .04, carte: .3, cle: 1.5, dos: .22, dosBas: .16, cleOmbre: 1, dosOmbre: 3,
    laque: 1, mirNet: .6, laqueAlb: 1, caustique: 38, causB: .5, causK: 1.5, causFlou: .15, env: 1, verreDisp: .55, balance: 1, jusD: .04, jusPale: 1.25, ambre: 1, velours: 1, soleil: 1, velAlb: 6, drapeau: 1, socle: .5, fondBas: .75, masque: 1, zDrapeau: .195, zCle: .118, cleAngle: .52,
    lisse: 30, rayon: .0012, areteVerre: 3, areteOr: 1, areteVif: .4, rugoNiche: .6, orRugo: .06, orAniso: .12, oGrad: .6, mur: 0, murX: -.08, murY: .14, murYBas: .11,
    murSpot: .55, murSpotAngle: .42, murPenombre: 1, decalX: -.012, rim: .8,
    lf: 1, lfOr: .12, lfG: 25, lfD: 14, lfCle: 30, lfCleOr: .2, lfFond: 2.5, lfPlafond: 25, lfFace: 6, lfOrCarte: .95, lfHaut: 1.2, lfEtiq: 1, lfHautW: .36, lfHautH: .3, lfEtiqCarte: 1.5,
    menisque: .15, dorure: 4, gravN: 6, etiqN: 3, gravSocle: .14, gravLueur: 0, tube: 1.1, tubeLueur: .85, parOr: .11, parV: .22,
    scrim: .5, pieceOr: 3, oFlag: .1, carteJus: 4, carteP: .3, carteY: .03, carteSerre: 2.5, carteBas: .2, carteYBas: .035, carteSerreBas: 1.8, carteHautPale: .35, jusBord: .15 };
  const K = { ...PARAMS, ...Object.fromEntries([...Q].filter(([k]) => k in PARAMS).map(([k, v]) => [k, +v])) };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  ctl.dispose = () => { ctl.arret = true; renderer.dispose(); renderer.forceContextLoss(); };
  // densité plafonnée à 2 (1,5 sur téléphone, 1,25 en qualité basse) pour l'image nette à l'arrêt ; en mouvement, un
  // budget de pixels (photo.ech, dans resize) : ~1,2 sur un écran Retina de 1440 × 900 — abaissé encore si l'image en
  // mouvement reste lente (mesurer). L'anticrénelage vient du MSAA en mouvement et du TAA à l'arrêt
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUAL === "basse" ? 1.25 : MOBILE ? 1.5 : 2));
  let BUDGET = MOBILE ? 1.2e6 : 1.8e6;
  const BUDGET_MIN = MOBILE ? .6e6 : .9e6;
  // définition de l'image réfractée (verre, jus) : moitié en mouvement, pleine à l'arrêt en qualité haute, ¾ ailleurs.
  // Chaque caméra a sa propre cible de réfraction dans three.js : l'image en mouvement est rendue par une caméra
  // jumelle (chevet-photo.js) — les deux cibles gardent chacune leur taille, aucune réallocation
  const REFR = { vif: .5, net: () => QUAL === "haute" ? 1 : .75 };
  renderer.toneMapping = THREE.NoToneMapping;            // tone mapping filmique dans la finition (chevet-photo.js)
  // ombres dures (PCF, carte fine) ; recalculées seulement quand les flacons ou le catalogue disparaissent
  renderer.shadowMap.enabled = true; renderer.localClippingEnabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  // rendu à la demande (voir frame) ; rien n'est dessiné avant que la scène soit complète (pret)
  let pret = false, dernier = "", invalide = true, affinage = false, pend = 0, minuterie = 0, derniereVive = 0, dernierDefil = 0, vu = false, P = 0;
  function kick() { if (pret && !pend && !ctl.arret) pend = requestAnimationFrame(() => frame(false)); }
  function invalider() { invalide = true; kick(); }
  const etat = e => { fond.dataset.rendu = e; };
  etat("charge");
  // une pause entre deux gros morceaux de la mise en place : la page continue de défiler (pas de longue tâche)
  const souffle = async () => { await new Promise(r => setTimeout(r)); if (ctl.arret) throw new Error("chevet arrêté"); };
  const scene = new THREE.Scene();
  scene.background = null;                               // fond transparent : la finition pose la scène sur le papier du site

  // lumière de la pièce : un soleil franc et haut, d'en haut à gauche, devant (l'ombre diagonale du plateau et du
  // montant gauche), un contre-jour léger à droite, presque pas d'ambiance ; les niches ont leurs propres lumières
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x2a1d14, 0.03));
  const key = new THREE.DirectionalLight(0xfffaf5, 3.4 * K.soleil);
  key.target.position.set(0, .38, 0);
  key.position.set(-.7, 1.75, 1).normalize().multiplyScalar(2).add(key.target.position);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -.52, right: .52, top: .52, bottom: -.52, near: 1.3, far: 2.7 });
  key.shadow.bias = -.0004; key.shadow.normalBias = .0012;
  scene.add(key, key.target);
  // (le contre-jour accroche aussi le flanc droit du chevet, que l'objectif voit de trois quarts : un noir velouté où
  // le fil du bois se lit, plus une plaque noire)
  const rim = new THREE.DirectionalLight(0xfff1df, K.rim);
  rim.target.position.set(0, .38, 0); rim.position.set(1.2, 0.9, -0.6).normalize().multiplyScalar(2).add(rim.target.position);
  rim.castShadow = true; rim.shadow.mapSize.set(1024, 1024);
  Object.assign(rim.shadow.camera, { left: -.52, right: .52, top: .52, bottom: -.52, near: 1.3, far: 2.7 });
  rim.shadow.bias = -.0006; rim.shadow.normalBias = .002;
  scene.add(rim, rim.target);

  // chargements : un gestionnaire à soi (le cadran du sillage a le sien) ; la scène ne s'affiche qu'une fois tout arrivé
  const mgr = new THREE.LoadingManager();
  let attente = 0, vide = null;
  const iS = mgr.itemStart, iE = mgr.itemEnd;
  mgr.itemStart = u => { attente++; iS.call(mgr, u); };
  mgr.itemEnd = u => { iE.call(mgr, u); if (--attente === 0) { renderer.shadowMap.needsUpdate = true; invalider(); vide?.(); } };
  const loader = new GLTFLoader(mgr), tex = new THREE.TextureLoader(mgr);
  // étiquettes et emblème : copies de 512 px pour la scène (assets/3d/chevet ; les originaux de /parfum font 2048 px,
  // 200 Mo de mémoire graphique pour quelques dizaines de pixels à l'écran), décodées hors du fil principal
  // (ImageBitmap) quand le navigateur le permet : la règle de GLTFLoader pour les textures du chevet
  const ua = navigator.userAgent, ver = re => +(re.exec(ua)?.[1] ?? 0);
  const BITMAP = typeof createImageBitmap !== "undefined" && !(/^((?!chrome|android).)*safari/i.test(ua) && ver(/Version\/(\d+)/) < 17) && !(/Firefox\//.test(ua) && ver(/Firefox\/(\d+)/) < 98);
  function image(url, retourne) {
    if (!BITMAP) { const t = tex.load(url); t.flipY = retourne; return t; }
    const t = new THREE.Texture(); t.flipY = false;     // une ImageBitmap se retourne au décodage, pas au chargement
    new THREE.ImageBitmapLoader(mgr).setOptions({ premultiplyAlpha: "none", ...(retourne && { imageOrientation: "flipY" }) })
      .load(url, b => { t.image = b; t.needsUpdate = true; });
    return t;
  }
  // dessins dont on tire des cartes (normales, rugosité) et textures en convention glTF : décodés dans le sens du
  // fichier (jamais retournés), sans conversion de couleur
  const dessin = url => new Promise((ok, ko) => BITMAP
    ? new THREE.ImageBitmapLoader(mgr).setOptions({ premultiplyAlpha: "none", colorSpaceConversion: "none" }).load(url, ok, undefined, ko)
    : new THREE.ImageLoader(mgr).load(url, ok, undefined, ko));
  const C = (LIBRERY_BASE + "/assets/3d/chevet/");
  const HANDLES = ["palmeira", "ambert-sunset", "mango-wave", "hot-sand", "sun-ice", "vanilla-plum", "tonka-love", "magnetic-flowers"];
  const [meuble, flaconG, parfums, hdr, plateauG, EMB_IMG, cauMeta, cauImage, ...etiquettes] = await Promise.all([
    loader.loadAsync(C + "ClassicNightstand_01_1k.gltf"),
    loader.loadAsync((LIBRERY_BASE + "/parfum/flacon-100ml.glb")),
    fetch((LIBRERY_BASE + "/parfum/parfums.json")).then(r => { if (!r.ok) throw new Error("parfums.json"); return r.json(); }),
    new RGBELoader(mgr).loadAsync((LIBRERY_BASE + "/parfum/studio.hdr")),   // vrai studio photo (Poly Haven « studio_small_09 », CC0)
    loader.loadAsync(C + "plateau.glb"),                   // le dessus, détaché du modèle (uv dépliées, faces planes franches)
    dessin(C + "emblem-gravure.webp"),
    fetch(C + "caustiques.json").then(r => r.ok ? r.json() : null).catch(() => null),
    dessin(C + "caustiques.png").catch(() => null),        // (sans elles, la scène se passe de caustiques)
    ...HANDLES.map(h => dessin(`${C}labels/${h}.webp`)),
  ]);
  // étiquettes : dorure (couleur) et relief (carte de normales, plus bas) tirés du même dessin
  const ETIQ = Object.fromEntries(HANDLES.map((h, i) => { const t = new THREE.Texture(etiquettes[i]); t.needsUpdate = true; return [h, t]; }));
  // la pièce (bois du meuble, catalogue) : le studio réel, très bas — de vrais reflets sur le vernis, sans éclairer
  // la scène. Les flacons, eux, ont le studio de leur niche (envNiche)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const STUDIO = pmrem.fromEquirectangular(hdr).texture; hdr.dispose(); pmrem.dispose();
  const ROT_ENV = new THREE.Euler(0, -.9, 0);
  scene.environment = STUDIO; scene.environmentIntensity = .1; scene.environmentRotation.copy(ROT_ENV);

  // ---------- le chevet (Poly Haven, CC0) ----------
  let bois;
  meuble.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; bois = bois || o.material; } });
  // occlusion des sculptures : canal R de la texture « arm » (non branché par le glTF), sur la lumière d'ambiance seule
  bois.aoMap = bois.roughnessMap; bois.aoMapIntensity = 1;
  scene.add(meuble.scene);
  // étagère ajoutée dans le caisson, même bois
  const etagere = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.014, 0.33), bois.clone());
  etagere.position.set(0, 0.405, -0.01); etagere.castShadow = etagere.receiveShadow = true; scene.add(etagere);
  // ses UV pris sur l'île du plancher dans l'atlas Poly Haven (u = .563 − .473 z, v = .870 + .479 x)
  {
    const P = etagere.geometry.attributes.position, N = etagere.geometry.attributes.normal, U = etagere.geometry.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i), x = P.getX(i) + (Math.abs(N.getX(i)) > .5 ? y : 0), z = P.getZ(i) + etagere.position.z + (Math.abs(N.getZ(i)) > .5 ? y : 0);
      U.setXY(i, .563 - .473 * z, .870 + .479 * x);
    }
  }
  // bandeau sous le chant avant de l'étagère (même bois) : il cache la réglette LED de la niche du dessous, comme la
  // traverse du plateau cache celle du dessus
  const bandeau = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.011, 0.012), etagere.material);
  bandeau.position.set(0, 0.398 - .0055, 0.155 - .006); bandeau.castShadow = bandeau.receiveShadow = true; scene.add(bandeau);
  { const U = bandeau.geometry.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, .49 + U.getX(i) * .01, .87 + U.getY(i) * .2); }
  scene.updateMatrixWorld(true);
  // relevé du caisson par rayons lancés dans le modèle : plancher, dessous du plateau, fond, parois
  const sonde = new THREE.Raycaster();
  const toucher = (o, d, objets = [meuble.scene, etagere]) => { sonde.set(o, d); const h = sonde.intersectObjects(objets, true)[0]; return h ? h.point : null; };
  const CAISSON = {
    plancher: toucher(V(0, .39, 0), V(0, -1, 0)).y, plafond: toucher(V(0, .5, 0), V(0, 1, 0)).y,
    fond: toucher(V(0, .5, 0), V(0, 0, -1)).z, g: toucher(V(0, .5, 0), V(-1, 0, 0)).x, d: toucher(V(0, .5, 0), V(1, 0, 0)).x,
    sousEtagere: etagere.position.y - .007, surEtagere: etagere.position.y + .007,
    avant: .185, avantEtagere: .155,                    // relevés : fin des parois (≈ 0,185) ; chant de l'étagère
  };
  const NICHES = [[CAISSON.plancher, CAISSON.sousEtagere], [CAISSON.surEtagere, CAISSON.plafond]];
  // ---------- le plateau : le noyer du bureau du catalogue, net (retours du 13/10) ----------
  // Le dessus Poly Haven (atlas 1k, îlot collé au bord de l'image : bande avant striée de blocs JPEG, usure peinte,
  // normales lissées jusqu'au chanfrein) est remplacé par plateau.glb : les mêmes 226 triangles, uv dépliées sur la
  // moulure et les chants (le fil passe l'arête sans s'étirer, 6 700 texels/m), normales franches sur les faces planes.
  // Mêmes fichiers dans le décor « chevet » du catalogue 3D. Après le relevé du caisson (le plafond est le dessous du
  // plateau, touché par un rayon)
  const ANISO = renderer.capabilities.getMaxAnisotropy();
  for (const c of ["map", "normalMap", "roughnessMap"]) if (bois[c]) bois[c].anisotropy = ANISO;   // le corps, vu en biais
  let corps; meuble.scene.traverse(o => { if (o.isMesh) corps = o; });
  {
    const g = corps.geometry, Pp = g.attributes.position, Ix = g.index.array, garde = [];
    for (let t = 0; t < Ix.length; t += 3) if (Math.min(Pp.getY(Ix[t]), Pp.getY(Ix[t + 1]), Pp.getY(Ix[t + 2])) < .6757) garde.push(Ix[t], Ix[t + 1], Ix[t + 2]);
    g.setIndex(garde);                                    // le corps sans son dessus
  }
  // le corps s'efface en fondu quand il passe sous le plateau (catalogue) : même bois, transparent, posé seulement le
  // temps du fondu (opaque, il reste dans l'image de réfraction des flacons) ; programme compilé à la mise en place
  const boisFondu = bois.clone(); boisFondu.transparent = true;
  const carte = (n, srgb) => { const t = image((LIBRERY_BASE + "/assets/3d/chevet/") + n, false); t.anisotropy = ANISO; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const plateau = plateauG.scene.getObjectByName("Plateau");
  plateau.material = new THREE.MeshPhysicalMaterial({
    // couleur 4k (2k sur téléphone) ; relief et rugosité 2k : à l'image clé, même sur Retina, le dessus est lu au
    // niveau 1 des mip-maps de la 4k
    map: carte(`plateau-noyer-${MOBILE ? "2k" : "4k"}.webp`, true), normalMap: carte("plateau-noyer-normale-2k.webp"),
    normalScale: new THREE.Vector2(1, -1),                // carte en +Y = haut de l'image, lue avec les uv glTF (v vers le bas)
    roughnessMap: carte("plateau-noyer-rugosite-2k.webp"), roughness: 1, metalness: 0,
    clearcoat: .42, clearcoatRoughness: .32, specularIntensity: .32, envMapIntensity: .9,   // vernis satiné du bureau du catalogue
  });
  plateau.castShadow = plateau.receiveShadow = true; scene.add(plateau);
  // ---------- les niches : leurs lumières, leur velours, leurs studios (le prototype) ----------
  // tout ce qui est dans le caisson est dans un groupe : vus d'en haut, sous le plateau, on ne le dessine plus
  const rangees = new THREE.Group(); scene.add(rangees);
  const LARG = CAISSON.d - CAISSON.g, CX = (CAISSON.g + CAISSON.d) / 2;
  // les projecteurs des niches n'éclairent que l'intérieur du caisson : pour tout ce qui est dehors (bois extérieur du
  // chevet, catalogue), leur calcul — et les 17 lectures de chaque carte d'ombre — est sauté par un test de position
  // (branche cohérente sur de grandes zones : le coût de la lumière principale et du contre-jour reste dans les niches)
  const NICHE_MIN = V(CAISSON.g - .012, CAISSON.plancher - .012, CAISSON.fond - .012), NICHE_MAX = V(CAISSON.d + .012, CAISSON.plafond + .012, CAISSON.avant + .02);
  // …et l'intérieur des niches, derrière le drapeau : ni le soleil de la pièce (arrêté par le drapeau) ni son
  // contre-jour (arrêté par le dos et les parois du caisson) n'y arrivent — leur calcul (et les 17 lectures de leurs
  // cartes d'ombre) y est sauté. Chaque surface d'une niche ne calcule que les deux projecteurs de SA niche (ceux de
  // l'autre niche sont derrière l'étagère) : 2 projecteurs au lieu de 4 projecteurs + 2 soleils.
  const ABRI_MIN = V(CAISSON.g - .001, CAISSON.plancher - .001, CAISSON.fond - .01), ABRI_MAX = V(CAISSON.d + .001, CAISSON.plafond + .001, K.zDrapeau - .006);
  const NICHE_Y = (CAISSON.sousEtagere + CAISSON.surEtagere) / 2;
  const v3 = v => `vec3(${v.x.toFixed(5)}, ${v.y.toFixed(5)}, ${v.z.toFixed(5)})`;
  // une seule interpolée pour la position dans le monde, partagée par les greffes (niche, lightformers, parallaxe,
  // velours) : chacune en gardait la sienne — trois ou quatre interpolées de trop par matière, alors que leur nombre est
  // compté (16 sur bien des téléphones, et chaque ombre de projecteur en prend une)
  const MONDE = "#ifndef MONDE_W\n#define MONDE_W\nvarying vec3 vMondeW;\n#endif\n";
  function posMonde(sh) {
    if (sh.vertexShader.includes("vMondeW =")) return;
    sh.vertexShader = MONDE + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvMondeW = (modelMatrix * vec4(transformed, 1.)).xyz;");
  }
  const GLSL_NICHE = `const vec3 nicheMin = ${v3(NICHE_MIN)}, nicheMax = ${v3(NICHE_MAX)}, abriMin = ${v3(ABRI_MIN)}, abriMax = ${v3(ABRI_MAX)};
  const float NICHE_Y = ${NICHE_Y.toFixed(5)};
  ${MONDE}#define vNicheW vMondeW
  bool dansNiche() { return all(greaterThan(vNicheW, nicheMin)) && all(lessThan(vNicheW, nicheMax)); }
  bool dansAbri() { return all(greaterThan(vNicheW, abriMin)) && all(lessThan(vNicheW, abriMax)); }
  `;
  // mixte : surfaces dedans et dehors (le bois du chevet, le catalogue) — test de position ; sinon : toujours dans
  // une niche, derrière le drapeau (flacons, velours)
  // Les projecteurs sont triés à la compilation : chaque matière ne garde, dans sa boucle de lumières, que ceux qui
  // peuvent l'éclairer — ceux de sa niche, et le projecteur du fond (« la lumière du fond » d'un Caravage, qui découpe
  // les silhouettes) pour le seul velours. Un projecteur sauté par un test (même sur un uniforme) coûtait presque
  // autant qu'un projecteur calculé : la boucle déroulée gonflait chaque shader des flacons (mesuré : deux projecteurs
  // de plus, +12 ms par image à 1280 × 720, quand bien même aucun flacon ne les calculait). L'ordre est celui de
  // three.js (WebGLLights : ceux qui ont une ombre d'abord, puis l'ordre de la scène) ; une ombre ajoutée ou retirée
  // (qualité basse) change le nombre d'ombres, donc les programmes : ils sont recompilés, et l'ordre relu.
  function spotsActifs(mur, niche) {
    const l = []; scene.traverseVisible(o => { if (o.isSpotLight) l.push(o); });
    const rang = o => (o.castShadow ? 2 : 0) + (o.map ? 1 : 0);
    return l.map((o, k) => ({ o, k })).sort((a, b) => rang(b.o) - rang(a.o) || a.k - b.k).map(({ o }, i) => ({ o, i }))
      .filter(({ o }) => (mur || !o.userData.mur) && (niche == null || (o.position.y > NICHE_Y) === (niche === 1))).map(({ i }) => i);
  }
  // mode : « mixte » (test de position, dedans et dehors), « pos » (toujours dans une niche, laquelle d'après la
  // position), « bas » / « haut » (matière propre à une niche : les projecteurs de l'autre niche sont retirés)
  function chunkLumieres(mode, actifs) {
    const mixte = mode === "mixte", parPos = mode === "mixte" || mode === "pos";
    let c = THREE.ShaderChunk.lights_fragment_begin;
    const coupe = (debut, f) => {
      const a = c.indexOf(debut), i0 = c.indexOf("#pragma unroll_loop_start", a), fin = "#pragma unroll_loop_end", i1 = c.indexOf(fin, a) + fin.length;
      if (a < 0 || i0 < 0 || i1 < fin.length) { console.error("lights_fragment_begin : boucle introuvable", debut); return; }
      c = c.slice(0, i0) + f(c.slice(i0, i1)) + c.slice(i1);
    };
    coupe("#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )", b => {
      const fin = "reflectedLight );\n\t}\n\t#pragma unroll_loop_end";
      if (!b.includes("spotLight = spotLights[ i ];") || !b.includes(fin)) { console.error("boucle des projecteurs : forme inattendue"); return b; }
      const garde = actifs.length ? actifs.map(i => `UNROLLED_LOOP_INDEX == ${i}`).join(" || ") : "0 == 1";
      b = b.replace("spotLight = spotLights[ i ];", `#if ( ${garde} )\n\t\tspotLight = spotLights[ i ];\n\t\tif (${parPos ? "((transpose(mat3(viewMatrix)) * (spotLight.position - viewMatrix[3].xyz)).y > NICHE_Y) == (vNicheW.y > NICHE_Y)" : "true"}) {`)
        .replace(fin, "reflectedLight );\n\t\t}\n#endif\n\t}\n\t#pragma unroll_loop_end");
      return mixte ? "if (dansNiche()) {\n" + b + "\n}" : b;
    });
    coupe("#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )", b => (mixte ? "if (!dansAbri()) {\n" : "if (false) {\n") + b + "\n}");
    return c;
  }
  // niche : 0 / 1 pour une matière propre à une niche (sa clé de programme doit alors la porter : nicheCle) ;
  // mur : le velours, qui reçoit aussi le projecteur du fond
  function lumieresNiche(sh, mixte = false, mur = false, niche = null) {
    posMonde(sh);
    sh.fragmentShader = GLSL_NICHE + sh.fragmentShader.replace("#include <lights_fragment_begin>",
      chunkLumieres(mixte ? "mixte" : niche === 1 ? "haut" : niche === 0 ? "bas" : "pos", spotsActifs(mur, mixte ? null : niche)));
  }
  const nicheCle = n => "-n" + n;
  // la laque des étagères : sous le vernis, un bois foncé un peu moins noir que le bois nu (albédo (,03 ; ,022 ; ,016),
  // le fil du bois à peine) — la lumière de la clé, ses ombres dures et les caustiques s'y lisent
  const ALBEDO_LAQUE = new THREE.Color(.03, .022, .016);
  function spotsDansNiche(m) {
    m.onBeforeCompile = sh => {
      // (dans les niches, le bois verni ne renvoie plus l'éclat dur du projecteur en coins blancs : le brillant des
      // étagères est porté par la laque — le miroir —, le bois n'y garde qu'un lustre large)
      sh.fragmentShader = sh.fragmentShader.replace("#include <lights_physical_fragment>", `
        if (${K.laqueAlb > 0 ? "true" : "false"} && dansNiche() && vNicheW.z < ${CAISSON.avant.toFixed(4)} && (abs(vNicheW.y - ${CAISSON.plancher.toFixed(5)}) < .0012 || abs(vNicheW.y - ${CAISSON.surEtagere.toFixed(5)}) < .0012)) {
          float filBois = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722)) / .0094;
          diffuseColor.rgb = vec3(${ALBEDO_LAQUE.toArray().map(c => c.toFixed(4)).join(", ")}) * mix(1., clamp(filBois, 0., 3.), .35);
        }
        #include <lights_physical_fragment>`)
        .replace("#include <lights_fragment_begin>", `if (dansNiche()) material.roughness = max(material.roughness, ${K.rugoNiche.toFixed(3)});\n#include <lights_fragment_begin>`);
      lumieresNiche(sh, true);
    };
    m.customProgramCacheKey = () => "spots-niche-" + m.type;
    m.needsUpdate = true;
    return m;
  }
  // (le bois du corps, son double transparent du fondu, l'étagère et son bandeau, le dessus du plateau)
  if (K.masque) [bois, boisFondu, etagere.material, plateau.material].forEach(spotsDansNiche);
  // drapeau noir de photographe devant l'ouverture (invisible à l'objectif : il ne fait qu'ombrer) : le soleil de la
  // pièce n'entre plus dans les niches — l'intérieur ne reçoit que sa lumière principale et son contre-jour
  const DRAPEAUX = [];
  if (K.drapeau) {
    const m = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
    const d = new THREE.Mesh(new THREE.PlaneGeometry(LARG + .004, CAISSON.plafond - CAISSON.plancher), m);
    d.position.set(CX, (CAISSON.plancher + CAISSON.plafond) / 2, K.zDrapeau); d.castShadow = true; d.renderOrder = -1; scene.add(d); DRAPEAUX.push(d);
    // et un petit drapeau contre la paroi droite, devant le grand : le soleil ne frappe plus le chant intérieur du montant
    const dd = new THREE.Mesh(new THREE.PlaneGeometry(CAISSON.avant - K.zDrapeau + .03, CAISSON.plafond - CAISSON.plancher), m);
    dd.rotation.y = -Math.PI / 2; dd.position.set(CAISSON.d - .003, (CAISSON.plancher + CAISSON.plafond) / 2, (K.zDrapeau - .01 + CAISSON.avant + .02) / 2);
    dd.castShadow = true; scene.add(dd); DRAPEAUX.push(dd);
  }

  // ---------- calques : 0 = la photo ; 1 = le monde vu par les miroirs (doublures simplifiées, sans lumières) ----------
  // Les doublures écrivent dans l'alpha leur distance au miroir (0 au contact → 1 au loin) : la laque floute et
  // éteint le reflet en s'éloignant du point de contact, comme un vrai vernis.
  const uMiroir = { plan: { value: new THREE.Vector4(0, 1, 0, 0) }, portee: { value: .12 } };
  function refletable(m, plus) {
    m.onBeforeCompile = sh => {
      if (plus) plus(sh);
      sh.uniforms.miroirPlan = uMiroir.plan; sh.uniforms.miroirPortee = uMiroir.portee;
      sh.vertexShader = "varying vec3 vMirW;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvMirW = (modelMatrix * vec4(transformed, 1.)).xyz;");
      sh.fragmentShader = "uniform vec4 miroirPlan; uniform float miroirPortee; varying vec3 vMirW;\n" +
        sh.fragmentShader.replace(/}\s*$/, "gl_FragColor.a = clamp(abs(dot(miroirPlan.xyz, vMirW) + miroirPlan.w) / miroirPortee, 0., 1.);\n}");
    };
    m.customProgramCacheKey = () => "refletable-" + m.type + (plus ? "+" + plus.cle : "");
    return m;
  }
  // (calque 1 : la niche du haut, calque 2 : celle du bas — chaque miroir ne rend que la sienne)
  const calqueNiche = n => n ? 1 : 2;
  const doublure = (o, n) => { o.layers.set(calqueNiche(n)); rangees.add(o); return o; };
  // retouche d'un morceau de shader de three.js : le texte du morceau est retouché puis inséré à la place de son
  // « #include » (remplacer dans le shader avant l'inclusion des morceaux ne trouverait rien)
  await souffle();
  function morceau(nom, ...paires) {
    let c = THREE.ShaderChunk[nom];
    for (const [a, b] of paires) { if (!c.includes(a)) console.error("morceau introuvable :", nom, a); c = c.replace(a, b); }
    return c;
  }

  // ---------- doublure de chaque niche : velours noir, réchauffé au pied par une réglette cachée ----------
  // La niche est tapissée de velours noir (fond et côtés). Une réglette en L, couchée au pied du fond puis des côtés,
  // derrière les flacons, lèche le velours vers le haut et s'éteint en quelques centimètres : c'est ce que les jus voient
  // en transparence (ils s'allument dans leur masse) — y compris ceux de gauche, que l'objectif de trois quarts voit
  // devant la paroi gauche, pas devant le fond. Au-dessus des épaules, le velours est noir : les capots s'y découpent.
  // Le velours reçoit aussi les lumières. Plans opaques : ils entrent dans l'image de réfraction des flacons.
  const ZPAROI = .178;                                   // les côtés tapissés s'arrêtent juste derrière le chant avant
  const GLSL_HAUT = `#define HAUT_FOND ${K.haut.toFixed(4)}\n#define HAUT_COTE ${K.hautCote.toFixed(4)}\n`;
  const GRAD = /* glsl */`
  // y : mètres au-dessus de l'étagère ; prof : intensité le long de la réglette ; s : abscisse le long de la réglette (m)
  vec3 lueurPied(float y, float prof, float s, float chute, float haut) {
    // la réglette est cachée derrière le rang arrière : sa lueur ne dépasse pas les épaules des flacons (≈ 11 cm au fond,
    // 8 cm sur les côtés, que l'objectif voit de biais)
    float I = exp(-y / chute) * exp(-pow(y / haut, 6.)) * prof;
    I *= 1. + .14 * pow(.5 + .5 * cos(s * 6.2831853 / .02), 2.) * exp(-y / .012);  // festons des LED (pas de 2 cm) au pied
    vec3 c = mix(vec3(.30, .14, .06), vec3(1., .72, .45), smoothstep(.45, 1., I));
    return c * I;
  }
  float profFond(float u) { return .35 + .65 * exp(-pow((u - .5) / .45, 2.)); }      // u : 0 à gauche → 1 à droite
  float profCote(float w) { return .4 * (1. - smoothstep(.3, .9, w)); }               // w : 0 au fond → 1 devant
  `;
  const S = THREE.MathUtils.smoothstep;
  const profFond = u => .35 + .65 * Math.exp(-(((u - .5) / .45) ** 2)), profCote = w => .4 * (1 - S(w, .3, .9));
  // le même dégradé en image (studio des reflets, doublures des miroirs), + le velours. cote : 0 fond, -1 gauche, 1 droite
  // (image dans le repère uv du plan tourné comme dans la scène)
  function degradeCanvas(hN, cote = 0) {
    const NX = 64, NY = 128, c = document.createElement("canvas"); c.width = NX; c.height = NY; const x = c.getContext("2d"), im = x.createImageData(NX, NY);
    const P = ZPAROI - CAISSON.fond;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const u = (i + .5) / NX, y = (1 - (j + .5) / NY) * hN;
      const w = cote < 0 ? 1 - u : u, prof = cote ? profCote(w) : profFond(u), sAbs = cote ? CAISSON.fond + w * P : CAISSON.g + u * LARG;
      let I = Math.exp(-y / K.chute) * Math.exp(-((y / (cote ? K.hautCote : K.haut)) ** 6)) * prof;
      I *= 1 + .14 * (.5 + .5 * Math.cos(sAbs * Math.PI * 2 / .02)) ** 2 * Math.exp(-y / .012);
      const b = S(I, .45, 1), col = [0, 1, 2].map(n => (([.30, .14, .06][n]) * (1 - b) + [1, .72, .45][n] * b) * I + [.004, .0024, .0017][n]);
      const o = 4 * (j * NX + i); col.forEach((v, n) => im.data[o + n] = Math.min(255, Math.pow(Math.min(1, v / 1.2), 1 / 2.2) * 255)); im.data[o + 3] = 255;
    }
    x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const uFond = { lum: { value: K.fond }, chute: { value: K.chute } };
  // niveau de la réglette par niche : les jus pâles de Skin Obsession (en bas) en demandent moins que ceux de Summer Vibes
  const LUM_NICHE = [K.fondBas, 1];
  // velours de coton noir, chaud : presque aucun reflet, un lustre (sheen) rasant qui le fait « velouté »
  const VELOURS = new THREE.Color().setRGB(.013, .008, .0055).multiplyScalar(K.velAlb);
  function materiauFond(y0, h, cote = 0) {
    const m = new THREE.MeshPhysicalMaterial({ color: VELOURS, roughness: 1, metalness: 0, sheen: K.velours, sheenColor: new THREE.Color().setRGB(.30, .16, .085), sheenRoughness: .5, envMapIntensity: .25 });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { lumFond: uFond.lum, chute: uFond.chute, fondBas: { value: y0 }, hNiche: { value: h }, fondG: { value: CAISSON.g }, fondL: { value: LARG },
        fondZ: { value: CAISSON.fond }, fondP: { value: ZPAROI - CAISSON.fond }, cote: { value: cote }, lumNiche: { value: LUM_NICHE[y0 > .3 ? 1 : 0] },
        // la tache de lumière sur le velours (le fond d'un Caravage) : un projecteur à grille posé hors champ éclaire le
        // fond derrière les capots, en haut à gauche, et s'éteint en diagonale vers la droite et vers le bas — les
        // épaules et les capots s'y détachent, le reste des flacons reste sur le noir
        murC: { value: new THREE.Vector3(CX + K.murX, y0 + (y0 > .3 ? K.murY : K.murYBas), CAISSON.fond) }, murCol: { value: new THREE.Color(1, .6, .32).multiplyScalar(K.mur) } });
      posMonde(sh);
      sh.fragmentShader = GLSL_HAUT + MONDE + "#define vFondW vMondeW\nuniform float lumFond, lumNiche, chute, fondBas, hNiche, fondG, fondL, fondZ, fondP, cote; uniform vec3 murC, murCol;\n" + GRAD +
        "\nfloat h12f(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }\n" +
        sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          float yN = vFondW.y - fondBas;
          totalEmissiveRadiance += (cote == 0. ? lueurPied(yN, profFond((vFondW.x - fondG) / fondL), vFondW.x, chute, HAUT_FOND)
                                               : lueurPied(yN, profCote((vFondW.z - fondZ) / fondP), vFondW.z, chute, HAUT_COTE)) * lumFond * lumNiche;
          if (${K.mur > 0 ? "true" : "false"}) {
            // (ancienne tache peinte, remplacée par le projecteur du fond — ?mur=.08 pour comparer)
            vec2 dm = cote == 0. ? vec2((vFondW.x - murC.x) / .17, (vFondW.y - murC.y) / .075) : vec2((vFondW.z - murC.z) / .2 + (cote > 0. ? 3. : 1.2), (vFondW.y - murC.y) / .075);
            float pente = (vFondW.x - murC.x) * .9 - (vFondW.y - murC.y) * 1.4;      // l'ombre diagonale du faisceau
            totalEmissiveRadiance += murCol * exp(-dot(dm, dm)) * (1. - smoothstep(-.02, .09, pente));
          }
          totalEmissiveRadiance *= 1. + (h12f(gl_FragCoord.xy) - .5) * .06;`);
      lumieresNiche(sh, false, true, y0 > .3 ? 1 : 0);
    };
    m.customProgramCacheKey = () => "fond-velours" + nicheCle(y0 > .3 ? 1 : 0);
    return m;
  }
  // les lumières de chaque niche
  //  · la lumière principale (« la » lumière du tableau) : un projecteur à faisceau serré caché dans l'angle avant
  //    gauche, sous le plafond de la niche, ≈ 2 400 K, ombres dures ; il rase le rang en diagonale vers le fond à droite ;
  //  · le contre-jour : un projecteur haut au fond, un peu à droite, ≈ 3 000 K (un peu plus blanc : il détache), qui
  //    embrase le haut des capots, allume les jus (diffusion vers l'avant) et couche leur ombre colorée vers nous.
  const CLE = new THREE.Color().setRGB(1, .66, .38), DOS = new THREE.Color().setRGB(1, .80, .60);
  const FONDS = [], SPOTS = [], CLES = [], MURS = [], DEGRADES = [], DEGRADES_COTES = [];
  for (const [i, [y0, y1]] of NICHES.entries()) {
    const h = y1 - y0;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(LARG, h), materiauFond(y0, h));
    f.position.set(CX, y0 + h / 2, CAISSON.fond + .0015); f.receiveShadow = true; rangees.add(f); FONDS.push(f);
    const D = degradeCanvas(h); DEGRADES.push(D);
    doublure(new THREE.Mesh(f.geometry, refletable(new THREE.MeshBasicMaterial({ map: D, color: new THREE.Color(1.2, 1.2, 1.2).multiplyScalar(K.fond * LUM_NICHE[i]) }))), i).position.copy(f.position);
    // les côtés tapissés (et leurs doublures pour la laque)
    const gc = new THREE.PlaneGeometry(ZPAROI - CAISSON.fond, h), DC = [];
    for (const cote of [-1, 1]) {
      const pc = new THREE.Mesh(gc, materiauFond(y0, h, cote));
      pc.position.set(cote < 0 ? CAISSON.g + .0015 : CAISSON.d - .0015, y0 + h / 2, (CAISSON.fond + ZPAROI) / 2); pc.rotation.y = -cote * Math.PI / 2;
      pc.receiveShadow = true; rangees.add(pc); FONDS.push(pc);
      const dc = degradeCanvas(h, cote); DC.push(dc);
      const d = doublure(new THREE.Mesh(gc, refletable(new THREE.MeshBasicMaterial({ map: dc, color: new THREE.Color(1.2, 1.2, 1.2).multiplyScalar(K.fond * LUM_NICHE[i]) }))), i);
      d.position.copy(pc.position); d.rotation.copy(pc.rotation);
    }
    DEGRADES_COTES.push(DC);
    const c = new THREE.SpotLight(CLE, K.cle, 1.2, K.cleAngle, .65, 2);
    c.position.set(CAISSON.g + .03, y1 - .012, K.zCle); c.target.position.set(CX + .03, y0 + .035, -.03);   // (derrière le drapeau)
    c.castShadow = true; c.shadow.mapSize.set(2048, 2048); c.shadow.bias = -.0003; c.shadow.normalBias = .0008; c.shadow.radius = K.cleOmbre;
    c.shadow.camera.near = .03; c.shadow.camera.far = .8;
    scene.add(c, c.target); CLES.push(c);
    // (contre-jour : un peu plus faible en bas, où les jus pâles laissent tout passer ; son ombre en qualité haute seulement)
    const s = new THREE.SpotLight(DOS, i ? K.dos : K.dosBas, .9, .55, .6, 2);
    s.position.set(CX + .06, y1 - .012, CAISSON.fond + .03); s.target.position.set(CX - .01, y0, .08);
    s.castShadow = HAUTE && K.dosOmbre > 0; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -.0004; s.shadow.normalBias = .001; s.shadow.radius = K.dosOmbre;
    s.shadow.camera.near = .02; s.shadow.camera.far = .6;
    scene.add(s, s.target); SPOTS.push(s);
    // la lumière du fond : un petit projecteur à grille, caché dans l'angle avant gauche à hauteur des capots, qui
    // n'éclaire que le velours du fond (spotsActifs) — une plage chaude derrière les capots, où les silhouettes dures
    // des flacons (jus, capots, tubes : le verre laisse passer) viennent se poser en ombres franches, en diagonale vers
    // la droite comme celles de la lumière principale. Le clair-obscur se lit enfin : l'ombre tombe sur du clair
    if (K.murSpot > 0) {
      const m = new THREE.SpotLight(CLE, K.murSpot, .95, K.murSpotAngle, K.murPenombre, 2);
      m.position.set(CAISSON.g + .06, y0 + (i ? .165 : .148), .15); m.target.position.set(CX + K.murX + .02, y0 + (i ? .115 : .1), CAISSON.fond);
      // (son ombre en qualité haute seulement : chaque ombre de projecteur coûte une interpolée à toutes les matières)
      m.castShadow = HAUTE; m.shadow.mapSize.set(1024, 1024); m.shadow.bias = -.0004; m.shadow.normalBias = .0008; m.shadow.radius = 1;
      m.shadow.camera.near = .03; m.shadow.camera.far = .6;
      m.userData.mur = true; scene.add(m, m.target); MURS.push(m);
    }
  }

  // ---------- reflets : le studio noir de chaque niche (PMREM d'une petite scène, sans HDR) ----------
  // Ce qu'un flacon reflète : du noir presque partout (le velours, le bois, la pièce éteinte) — c'est le noir qui fait
  // briller le verre. Les sources nettes (bandes, boîte de la clé, réglette, cartes) sont des « lightformers »
  // analytiques, calculés avec leur vraie parallaxe (plus bas) : elles ne sont pas dans ces studios (pas de doublon).
  //  · verre et jus : le noir, le velours et sa lueur de pied, l'étagère laquée ;
  //  · or, emblème, dorure : en plus, la pièce un peu moins noire (×3), un grand scrim chaud devant à gauche, une carte
  //    frontale en dégradé, et derrière à droite un drapeau chaud très faible (l'or dans l'ombre vire à l'ambre, jamais
  //    au kaki).
  function texDegrade(stops) {
    const c = document.createElement("canvas"); c.width = 4; c.height = 64; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 64);
    for (const [o, col] of stops) g.addColorStop(o, col); x.fillStyle = g; x.fillRect(0, 0, 4, 64); return new THREE.CanvasTexture(c);
  }
  function envNiche(i, pourOr) {
    const [y0, y1] = NICHES[i], yc = y0 + .065, e = new THREE.Scene();      // origine : au cœur des flacons
    const piece = document.createElement("canvas"); piece.width = 4; piece.height = 64;
    { const x = piece.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, "#000000"); g.addColorStop(.5, "#030201"); g.addColorStop(.62, "#080504"); g.addColorStop(1, "#040202"); x.fillStyle = g; x.fillRect(0, 0, 4, 64); }
    const tp = new THREE.CanvasTexture(piece); tp.colorSpace = THREE.SRGBColorSpace;
    // (l'or : la pièce un peu moins noire — le côté d'ombre d'un capot reste de l'or sombre, pas un trou)
    e.add(new THREE.Mesh(new THREE.SphereGeometry(4, 32, 16), new THREE.MeshBasicMaterial({ map: tp, side: THREE.BackSide, color: new THREE.Color(1, 1, 1).multiplyScalar(pourOr ? K.pieceOr : 1) })));
    // le grand scrim de la lumière principale, dans la pièce devant à gauche et en hauteur (or seulement) : toute face
    // de capot tournée vers l'objectif ou vers la gauche prend un or chaud, plus clair en haut à gauche, qui s'éteint
    // vers la droite et vers le bas — le modelé du clair-obscur, quel que soit l'angle de la caméra
    if (pourOr && K.scrim > 0) {
      const n = 64, c = document.createElement("canvas"); c.width = c.height = n; const x = c.getContext("2d"), im = x.createImageData(n, n), S = THREE.MathUtils.smoothstep;
      for (let j = 0; j < n; j++) for (let ii = 0; ii < n; ii++) {
        const u = ii / (n - 1), v = j / (n - 1);
        const L = Math.pow(1 - S(u, .15, 1), 1.3) * (1 - .8 * S(v, .3, 1)) * S(u, 0, .06) * S(v, 0, .06) * S(1 - v, 0, .1), k = 4 * (j * n + ii);
        im.data[k] = im.data[k + 1] = im.data[k + 2] = Math.round(255 * L); im.data[k + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      const az = -.45, el = .26, D = 1.1, m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: new THREE.Color(1, .86, .72).multiplyScalar(K.scrim * K.env), side: THREE.DoubleSide }));
      m.position.set(Math.sin(az) * Math.cos(el) * D, Math.sin(el) * D, Math.cos(az) * Math.cos(el) * D); m.lookAt(0, 0, 0); e.add(m);
    }
    const AV = CAISSON.avant, P = AV - CAISSON.fond, cz = (AV + CAISSON.fond) / 2, H = y1 - y0;
    const plan = (w, h, c, x, y, z, rx, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), c.isMaterial ? c : new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), side: THREE.DoubleSide }));
      m.position.set(x, y - yc, z); m.rotation.set(rx, ry, 0); e.add(m); return m;
    };
    plan(LARG, P, [.012, .0065, .0035], CX, y0, cz, -Math.PI / 2, 0);                    // étagère laquée (la lueur du pied y traîne)
    plan(LARG, P, [.0015, .001, .0006], CX, y1, cz, Math.PI / 2, 0);                      // plafond
    const PZ = ZPAROI - CAISSON.fond, czp = (ZPAROI + CAISSON.fond) / 2;                // parois tapissées (la lueur du pied y court)
    plan(PZ, H, new THREE.MeshBasicMaterial({ map: DEGRADES_COTES[i][0], color: new THREE.Color(1.2, 1.2, 1.2).multiplyScalar(K.fond * LUM_NICHE[i]), side: THREE.DoubleSide }), CAISSON.g, (y0 + y1) / 2, czp, 0, Math.PI / 2);
    plan(PZ, H, new THREE.MeshBasicMaterial({ map: DEGRADES_COTES[i][1], color: new THREE.Color(1.2, 1.2, 1.2).multiplyScalar(K.fond * LUM_NICHE[i]), side: THREE.DoubleSide }), CAISSON.d, (y0 + y1) / 2, czp, 0, -Math.PI / 2);
    plan(LARG, H, new THREE.MeshBasicMaterial({ map: DEGRADES[i], color: new THREE.Color(1.2, 1.2, 1.2).multiplyScalar(K.fond * LUM_NICHE[i]) }), CX, (y0 + y1) / 2, CAISSON.fond, 0, 0);
    if (pourOr) {
      // carte réflecteur au-dessus de l'objectif, en dégradé (blanc → noir), faible
      const carte = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .8), new THREE.MeshBasicMaterial({ map: texDegrade([[0, "#fff"], [.55, "#c4c4c4"], [.85, "#3a3a3a"], [1, "#000"]]),
        color: new THREE.Color(1, .9, .8).multiplyScalar(K.carte * K.env), side: THREE.DoubleSide }));
      carte.position.set(.05, .09, 1.0); carte.lookAt(0, 0, 0); e.add(carte);
      // drapeau chaud derrière à droite (azimut 140°, 60° × 80° vus du cœur des flacons, tout près)
      if (K.oFlag > 0) {
        const A = THREE.MathUtils.degToRad(140), d = .09, W = 2 * d * Math.tan(THREE.MathUtils.degToRad(30)), Hf = 2 * d * Math.tan(THREE.MathUtils.degToRad(40));
        const m = new THREE.Mesh(new THREE.PlaneGeometry(W, Hf), new THREE.MeshBasicMaterial({ map: texDegrade([[0, "#fff"], [.6, "#bbb"], [1, "#555"]]),
          color: new THREE.Color(1, .66, .36).multiplyScalar(K.oFlag * K.env), side: THREE.DoubleSide }));
        m.position.set(d * Math.sin(A), 0, d * Math.cos(A)); m.lookAt(0, 0, 0); e.add(m);
      }
    }
    const g = new THREE.PMREMGenerator(renderer), t = g.fromScene(e, 0, .002, 20).texture; g.dispose();
    e.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.map?.dispose(); o.material.dispose(); } });
    return t;
  }
  // deux studios par niche, comme un photographe drape ses cartes pour chaque matière : le verre et le jus n'ont que le
  // noir (faces noires, le jus se lit) ; l'or et la dorure ont en plus le scrim, la carte et le drapeau chauds
  const ENV_OR = [envNiche(0, true), envNiche(1, true)]; await souffle();
  const ENV_VERRE = [envNiche(0, false), envNiche(1, false)]; await souffle();

  // ---------- lightformers analytiques : les sources du studio, vues en reflet avec leur vraie parallaxe ----------
  // Une carte d'environnement est à l'infini : sur une face plane, elle ne donne qu'un aplat, le même pour tous les
  // flacons. Ici chaque source est un vrai rectangle posé près des flacons : le rayon réfléchi de chaque pixel (verre,
  // or, dorure) est lancé vers lui, et sa forme nette se dessine sur les faces et les biseaux — à une place différente
  // pour chaque flacon, qui glisse quand la caméra bouge (le « filet » des photos de parfum). Bords adoucis selon la
  // rugosité et la distance, étirés le long du brossage de l'or (anisotropie). Elles n'éclairent rien : elles ne vivent
  // que dans les reflets (les bandes, les cartes et les drapeaux du photographe, hors champ). Le reflet s'ajoute à celui
  // de l'environnement avant le Fresnel de three.js (même énergie).
  // Par rectangle : lfC centre ; lfU / lfV axes (xyz) et demi-tailles (w) ; lfE couleur × intensité (rgb, linéaire) et
  // « cœur » (w : le centre du diffuseur plus fort que ses bords) ; lfG dégradé le long de V (valeur en bas, en haut, et
  // entre quelles abscisses v ∈ [−1, 1] elle passe de l'une à l'autre) ; lfD douceur des bords en u et en v.
  const LF_N = 6;
  const LF_GLSL = /* glsl */`
  #define LF_N ${LF_N}
  uniform vec3 lfC[LF_N];
  uniform vec4 lfU[LF_N], lfV[LF_N], lfE[LF_N], lfG[LF_N];
  uniform vec2 lfD[LF_N];
  uniform float lfForce;
  ${MONDE}#define vLfW vMondeW
  vec3 lightformers(vec3 P, vec3 R, float rough, vec3 T, float aT) {
    vec3 s = vec3(0.);
    if (lfForce <= 0.) return s;
    float a2 = .0025 + 2.2 * rough * rough;
    for (int i = 0; i < LF_NB; i++) {
      if (lfE[i].r + lfE[i].g + lfE[i].b <= 0.) continue;
      vec3 n = cross(lfU[i].xyz, lfV[i].xyz);
      float dn = dot(R, n);
      if (abs(dn) < 1e-5) continue;
      float t = dot(lfC[i] - P, n) / dn;
      if (t <= 0.) continue;
      vec3 H = P + R * t - lfC[i];
      float u = dot(H, lfU[i].xyz) / lfU[i].w, v = dot(H, lfV[i].xyz) / lfV[i].w;
      float bu = lfD[i].x + t * (a2 + aT * abs(dot(T, lfU[i].xyz))) / lfU[i].w, bv = lfD[i].y + t * (a2 + aT * abs(dot(T, lfV[i].xyz))) / lfV[i].w;
      float m = (1. - smoothstep(1. - bu, 1. + bu, abs(u))) * (1. - smoothstep(1. - bv, 1. + bv, abs(v)));
      float g = mix(lfG[i].x, lfG[i].y, smoothstep(lfG[i].z, lfG[i].w, v)) * (1. - lfE[i].w * min(u * u, 1.));
      s += lfE[i].rgb * max(m * g, 0.);
    }
    return lfForce * s;
  }`;
  // un rectangle lumineux : centre c, tourné vers « vise », w × h (m) ; horiz : son axe U imposé (sinon horizontal)
  function lfRect({ c, vise, w, h, k = 1, col, bas = 1, haut = 1, g0 = -1, g1 = 1, du = .1, dv = .1, coeur = 0, horiz }) {
    const n = vise.clone().sub(c).normalize();
    const U = horiz ? horiz.clone().normalize() : new THREE.Vector3().crossVectors(Math.abs(n.y) > .95 ? V(0, 0, -1) : V(0, 1, 0), n).normalize();
    const W = new THREE.Vector3().crossVectors(n, U).normalize();
    return { C: c.clone(), U: new THREE.Vector4(U.x, U.y, U.z, w / 2), V: new THREE.Vector4(W.x, W.y, W.z, h / 2),
      E: new THREE.Vector4(col.r * k, col.g * k, col.b * k, coeur), G: new THREE.Vector4(bas, haut, g0, g1), D: new THREE.Vector2(du, dv) };
  }
  // les cartes qui suivent l'objectif (le photographe les replace à chaque prise de vue), posées par leur direction vue
  // d'un point de référence (cœur des flacons de la niche + yRef, zRef) :
  //  · « suit » : en miroir de la caméra par rapport aux faces avant (azimut −az_cam, élévation −el_cam), décalée de
  //    (az, el) — le grand dégradé de l'or poli des faces du capot reste le même pendant tout le défilement ;
  //  · « dessus » : en miroir par rapport au dessus du capot (azimut az_cam + 180°, élévation +el_cam) — le dessus du
  //    capot reflète une carte dorée (l'emblème gravé s'y lit en creux, sombre) ; éteinte en vue basse.
  const coeurNiche = i => V(CX, NICHES[i][0] + .065, 0), deg = THREE.MathUtils.radToDeg, rad = THREE.MathUtils.degToRad;
  function lfPose(i, f, cam) {
    if (!f.suit && !f.dessus) return lfRect(f);
    const c0 = coeurNiche(i).add(V(0, f.yRef || 0, f.zRef || 0));
    let az = f.az || 0, el = f.el || 0, gain = 1;
    if (cam) {
      const d = cam.clone().sub(c0), azc = deg(Math.atan2(d.x, d.z)), elc = deg(Math.atan2(d.y, Math.hypot(d.x, d.z)));
      if (f.suit) { az -= azc; el -= elc; } else { az += azc + 180; el += elc; gain = THREE.MathUtils.smoothstep(elc, 8, 25); }
    } else if (f.dessus) gain = 0;
    el = THREE.MathUtils.clamp(el, -89.5, 89.5);
    const A = rad(az), E = rad(el), r = lfRect({ ...f, c: c0.clone().add(V(Math.sin(A) * Math.cos(E), Math.sin(E), Math.cos(A) * Math.cos(E)).multiplyScalar(f.d)), vise: c0 });
    r.E.x *= gain; r.E.y *= gain; r.E.z *= gain;
    return r;
  }
  const JEUX = [];
  function lfJeu(i, formes, force = 1) {
    const R = formes.map(f => lfPose(i, f, null));
    while (R.length < LF_N) R.push(null);
    const j = {
      lfC: { value: R.map(r => r ? r.C : V(0, -100, 0)) },
      lfU: { value: R.map(r => r ? r.U : new THREE.Vector4(1, 0, 0, 1e-3)) },
      lfV: { value: R.map(r => r ? r.V : new THREE.Vector4(0, 1, 0, 1e-3)) },
      lfE: { value: R.map(r => r ? r.E : new THREE.Vector4()) },
      lfG: { value: R.map(r => r ? r.G : new THREE.Vector4(1, 1, -1, 1)) },
      lfD: { value: R.map(r => r ? r.D : new THREE.Vector2(.1, .1)) },
      lfForce: { value: force },
    };
    Object.defineProperty(j, "n", { value: formes.length, enumerable: false });
    JEUX.push({ i, F: formes, j }); return j;
  }
  // à chaque nouvelle vue : les cartes qui suivent la caméra sont replacées (quelques vecteurs, aucun shader recompilé)
  function majLF(cam) {
    for (const { i, F, j } of JEUX) F.forEach((f, n) => {
      if (!f.suit && !f.dessus) return;
      const r = lfPose(i, f, cam); j.lfC.value[n].copy(r.C); j.lfU.value[n].copy(r.U); j.lfV.value[n].copy(r.V); j.lfE.value[n].copy(r.E);
    });
  }
  // le studio de chaque niche, en mètres dans le repère du chevet
  const BLANC_CHAUD = new THREE.Color().setRGB(1, .84, .66);
  function studioNiche(i) {
    const [y0, y1] = NICHES[i], g = CAISSON.g, d = CAISSON.d, fd = CAISSON.fond, av = i ? CAISSON.avant : CAISSON.avantEtagere, h0 = y0 + .085;
    const haut = { bas: .65, haut: 1, g0: -1.3, g1: 1 };                     // clair en haut (le filet se perd vers le bas)
    const v = [
      // 1. la bande de la lumière principale, côté gauche (dans le velours de la paroi, invisible) : vue presque de
      //    profil, elle tombe sur le biseau avant gauche de chaque flacon — le long filet chaud, net, du côté éclairé
      { c: V(g + .006, h0, -.045), vise: V(CX + 1, h0, -.045), w: .045, h: .17, col: new THREE.Color(1, .74, .48), k: K.lfG, du: .04, dv: .04, coeur: .25, ...haut },
      // 2. son pendant à droite, plus faible et un peu plus blanc : le liseré du côté sombre (biseau avant droit)
      { c: V(d - .006, h0, -.03), vise: V(CX - 1, h0, -.03), w: .035, h: .17, col: new THREE.Color(1, .86, .72), k: K.lfD, du: .04, dv: .04, coeur: .25, ...haut },
      // 3. la boîte de la lumière principale, à sa place (angle avant gauche, sous le plafond) : l'éclat des arêtes hautes
      { c: CLES[i].position.clone(), vise: CLES[i].target.position.clone(), w: .085, h: .055, col: CLE, k: K.lfCle, du: .08, dv: .08, coeur: .3, bas: .5, haut: 1, g0: -1.3, g1: 1 },
      // 4. « dark field » : un panneau bas tendu sur le fond, derrière le rang arrière, clair au pied — vu en incidence
      //    rasante sur les flancs, il découpe chaque silhouette d'un liseré lumineux sur le noir
      { c: V(CX, y0 + .028, fd + .02), vise: V(CX, y0 + .028, 1), w: LARG - .05, h: .056, col: BLANC_CHAUD, k: K.lfFond, du: .05, dv: .05, coeur: .2, bas: 1, haut: 0, g0: -1, g1: 1.3 },
      // 5. réglette du plafond, devant : le trait clair des épaules et des arêtes hautes du capot
      { c: V(CX, y1 - .004, av - .045), vise: V(CX, y0, av - .045), w: LARG * .8, h: .008, col: BLANC_CHAUD, k: K.lfPlafond, du: .02, dv: .02, coeur: .15, horiz: V(1, 0, 0) },
      // 6. bande haute et étroite hors champ, côté objectif à droite : le filet du biseau avant droit, de face
      { c: V(d + .16, y0 + .11, av + .32), vise: V(CX, y0 + .07, -.005), w: .04, h: .34, col: new THREE.Color(1, .88, .74), k: K.lfFace, du: .03, dv: .03, coeur: .3, bas: .75, haut: 1, g0: -1.3, g1: 1 },
    ];
    // l'or : les mêmes sources, bien plus faibles (le métal les renvoie entières), + la carte graduée qui suit l'objectif
    // (bas .35 → haut 1, bord inférieur net) et la carte du dessus des capots
    const fois = (f, k) => ({ ...f, k: f.k * k });
    // L'or du produit est un zamak doré pâle, champagne (relevé sur le packshot : faces du capot ≈ (243, 228, 207)) : ses
    // cartes sont presque neutres — c'est la pièce (velours, bois, jus) qui reste chaude, pas le métal. La carte graduée
    // a un bord inférieur net et un bas presque noir : chaque face avant du capot montre l'« horizon » de l'or poli, un
    // reflet clair en haut tranché net sur une bande sombre en bas
    const orCarte = { suit: true, yRef: .056, zRef: .03, az: 0, el: 10.4, d: .30, w: .50, h: .12, col: new THREE.Color(1, .92, .82), k: K.lfOrCarte, bas: .05, haut: 1, g0: -1, g1: -.55, du: .02, dv: .01 };
    const dessus = { dessus: true, yRef: .07, az: 0, el: 0, d: .25, w: K.lfHautW, h: K.lfHautH, col: new THREE.Color(1, .93, .85), k: K.lfHaut, du: .5, dv: .5 };
    const o = [fois(v[0], K.lfOr), fois(v[2], K.lfCleOr), fois(v[4], K.lfOr), orCarte, dessus, fois(v[1], K.lfOr)];
    // la dorure des étiquettes : sa propre carte claire, qui suit l'objectif en miroir des faces avant (un peu sous
    // l'horizon) — la dorure prend un éclat or pâle sous tous les angles, même devant un jus clair, sans aucune émission
    const etiqCarte = { suit: true, yRef: 0, zRef: .03, az: 0, el: -4, d: .30, w: .5, h: .2, col: new THREE.Color(1, .95, .88), k: K.lfEtiqCarte, du: .25, dv: .25 };
    const e = [o[0], o[1], o[2], orCarte, o[5], etiqCarte];
    // niveaux de qualité : haute et moyenne, toutes les sources ; mobile, 4 sources (verre 1, 3, 5, 6 ; or 1, 2, 4, 5 ;
    // étiquettes 1, 2, 4 + leur carte) ; basse, l'or et les étiquettes seuls
    return QUAL === "haute" || QUAL === "moyenne" ? { verre: v, or: o, etiq: e }
      : { verre: QUAL === "mobile" ? [v[0], v[2], v[4], v[5]] : [], or: [o[0], o[1], o[3], o[4]], etiq: [o[0], o[1], orCarte, etiqCarte] };
  }
  const STUDIOS = [studioNiche(0), studioNiche(1)];
  const LF_VERRE = STUDIOS.map((s, i) => K.lf && s.verre.length ? lfJeu(i, s.verre) : null);
  const LF_OR = STUDIOS.map((s, i) => K.lf ? lfJeu(i, s.or) : null);
  const LF_ETIQ = STUDIOS.map((s, i) => K.lf ? lfJeu(i, s.etiq, K.lfEtiq) : null);
  // greffe dans un MeshStandard/Physical (à appeler dans onBeforeCompile)
  function avecLF(sh, jeu) {
    if (!jeu) return;
    Object.assign(sh.uniforms, jeu);
    posMonde(sh);
    sh.fragmentShader = `#define LF_NB ${jeu.n}\n` + sh.fragmentShader.replace("#include <lights_pars_begin>", "#include <lights_pars_begin>\n" + LF_GLSL)
      .replace("#include <lights_fragment_maps>", `#include <lights_fragment_maps>
      #if defined( RE_IndirectSpecular )
      {
        #ifdef USE_ANISOTROPY
          vec3 lfT = inverseTransformDirection(material.anisotropyT, viewMatrix); float lfA = material.alphaT;
        #else
          vec3 lfT = vec3(0.); float lfA = 0.;
        #endif
        vec3 lfR = normalize(mix(reflect(-geometryViewDir, geometryNormal), geometryNormal, material.roughness * material.roughness));
        radiance += lightformers(vLfW, inverseTransformDirection(lfR, viewMatrix), material.roughness, lfT, lfA);
        #ifdef USE_CLEARCOAT
          clearcoatRadiance += lightformers(vLfW, inverseTransformDirection(reflect(-geometryViewDir, geometryClearcoatNormal), viewMatrix), material.clearcoatRoughness, vec3(0.), 0.);
        #endif
      }
      #endif`);
  }
  const cleLF = jeu => jeu ? "lf" + jeu.n : "";
  // reflets en parallaxe (cubemap « corrigée ») : le studio des reflets n'est plus à l'infini mais sur une sphère de
  // rayon R autour du flacon (comme les cartes d'un photographe, posées tout près) — sur une face plane, chaque point
  // voit un endroit différent du studio : le dégradé de la carte descend le long du capot, la lueur du pied glisse.
  // centre : le centre de la sphère dans le repère de l'objet (le flacon, ou l'emblème pour son décalque)
  function parallaxe(sh, centre, R) {
    if (!(R > 0)) return;
    sh.uniforms.parC = { value: centre }; sh.uniforms.parR = { value: R };
    posMonde(sh);
    sh.vertexShader = "uniform vec3 parC; varying vec3 vParC;\n" + sh.vertexShader.replace("#include <project_vertex>",
      "#include <project_vertex>\nvParC = (modelMatrix * vec4(parC, 1.)).xyz;");
    sh.fragmentShader = MONDE + "#define vParW vMondeW\nuniform float parR; varying vec3 vParC;\n" + sh.fragmentShader.replace("#include <envmap_physical_pars_fragment>", morceau("envmap_physical_pars_fragment",
      ["reflectVec = inverseTransformDirection( reflectVec, viewMatrix );",
       "reflectVec = inverseTransformDirection( reflectVec, viewMatrix );\n\t\t\t{ vec3 p = vParW - vParC; float b = dot(p, reflectVec), c = dot(p, p) - parR * parR; reflectVec = normalize(p + (-b + sqrt(max(b * b - c, 0.))) * reflectVec); }"]));
  }
  await souffle();
  // sol : le papier du site, avec une ombre de contact douce sous le meuble, calculée une fois ; elle s'efface au
  // relais (la caméra finit presque à l'aplomb du bord gauche du plateau : elle y faisait un voile gris sur le papier)
  let sol;
  {
    const L = 1.1, N = 256, rt = new THREE.WebGLRenderTarget(N, N), s = new THREE.Scene();
    s.overrideMaterial = new THREE.ShaderMaterial({ side: THREE.DoubleSide,
      vertexShader: "varying float h; void main() { vec4 w = modelMatrix * vec4(position, 1.); h = w.y; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: "varying float h; void main() { float a = 1. - smoothstep(0., .3, h); gl_FragColor = vec4(vec3(a * a), 1.); }" });
    s.add(meuble.scene.clone());
    const cam = new THREE.OrthographicCamera(-L / 2, L / 2, L / 2, -L / 2, 0, .32); cam.rotation.x = Math.PI / 2;   // regarde vers le haut
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(s, cam); renderer.setRenderTarget(null);
    const px = new Uint8Array(N * N * 4); renderer.readRenderTargetPixels(rt, 0, 0, N, N, px); rt.dispose();
    const c0 = document.createElement("canvas"); c0.width = c0.height = N; c0.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(px.buffer), N, N), 0, 0);
    const c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d");
    x.filter = "blur(3px)"; x.drawImage(c0, 0, 0); x.globalAlpha = .7; x.filter = "blur(11px)"; x.drawImage(c0, 0, 0);
    sol = new THREE.Mesh(new THREE.PlaneGeometry(L, L), new THREE.MeshBasicMaterial({ color: 0x1f160f, alphaMap: new THREE.CanvasTexture(c), transparent: true, opacity: .42, depthWrite: false }));
    sol.rotation.x = -Math.PI / 2; sol.position.y = .0005; scene.add(sol);
  }
  await souffle();

  // ---------- les flacons (le vrai 100 ml : capot carré à encoches en V, emblème gravé, verre épais facetté) ----------
  const NIVEAU = .0815, JUS_MIN = V(-.0229, .0249, -.0154), JUS_MAX = V(.0229, NIVEAU, .0154);
  function uvBoite(g, s = 1 / .07) {
    const P = g.attributes.position, N = g.attributes.normal, uv = new Float32Array(P.count * 2);
    for (let i = 0; i < P.count; i++) {
      const nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i)), nz = Math.abs(N.getZ(i));
      const [u, v] = nx >= ny && nx >= nz ? [P.getZ(i) + .31, P.getY(i)] : ny >= nz ? [P.getX(i), P.getZ(i) + .53] : [P.getX(i) + Math.sign(N.getZ(i)) * .17, P.getY(i)];
      uv[2 * i] = u * s; uv[2 * i + 1] = v * s;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  }
  // normales « optiques » : le modèle lissait ses normales d'une facette à l'autre (jusqu'à 23° d'écart sur la grande
  // face avant) — chaque face plane se comportait en miroir courbe, et les reflets s'y tordaient en arcs (« verre en
  // plastique »). Recalculées : moyenne pondérée par l'aire des seules faces voisines à moins de 30° — les grandes
  // faces restent rigoureusement planes (un reflet y est un trait droit et net), les arêtes vives. Les triangles
  // dégénérés du modèle (8 dans le jus, 8 dans le verre) ne pèsent rien et prennent la moyenne de leurs voisins
  // (jamais de normale nulle : elle donnerait des points noirs et des carrés de halo). Géométrie déployée (sans index).
  // Pour chaque arête de chaque triangle : la normale de la facette voisine si le pli dépasse 30°, et la hauteur du
  // triangle sur cette arête — le shader en tire la distance du fragment à l'arête et y arrondit la normale (rayon
  // 1,2 mm, comme le verre moulé) : le filet clair qui court le long de chaque arête.
  function aplatir(g0, degres = K.lisse) {
    const g = g0.index ? g0.toNonIndexed() : g0.clone(), P = g.attributes.position, n = P.count / 3, cmin = Math.cos(degres * Math.PI / 180);
    const fn = new Float32Array(n * 3), fa = new Float32Array(n), a = V(), b = V(), c = V(), N0 = g.attributes.normal;
    for (let t = 0; t < n; t++) {
      a.fromBufferAttribute(P, 3 * t); b.fromBufferAttribute(P, 3 * t + 1); c.fromBufferAttribute(P, 3 * t + 2);
      b.sub(a); c.sub(a); b.cross(c); const aire = b.length() / 2;
      if (!(aire > 1e-11)) continue;                                   // dégénéré : poids nul, pas de normale propre
      fa[t] = aire; b.normalize();
      if (N0) { a.fromBufferAttribute(N0, 3 * t).add(c.fromBufferAttribute(N0, 3 * t + 1)).add(c.fromBufferAttribute(N0, 3 * t + 2)); if (a.dot(b) < 0) b.negate(); }
      fn.set([b.x, b.y, b.z], 3 * t);
    }
    const dot = (t, u) => fn[3 * t] * fn[3 * u] + fn[3 * t + 1] * fn[3 * u + 1] + fn[3 * t + 2] * fn[3 * u + 2];
    const cle = i => Math.round(P.getX(i) * 2e5) + "," + Math.round(P.getY(i) * 2e5) + "," + Math.round(P.getZ(i) * 2e5), carte = new Map();
    for (let i = 0; i < P.count; i++) { const k = cle(i); (carte.get(k) || carte.set(k, []).get(k)).push(i / 3 | 0); }
    const N = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const t = i / 3 | 0; let x = 0, y = 0, z = 0;
      for (const u of new Set(carte.get(cle(i)))) {
        if (!fa[u] || (fa[t] && dot(t, u) < cmin)) continue;           // (triangle dégénéré : tous ses voisins comptent)
        x += fn[3 * u] * fa[u]; y += fn[3 * u + 1] * fa[u]; z += fn[3 * u + 2] * fa[u];
      }
      let l = Math.hypot(x, y, z);
      if (!(l > 1e-12) && N0) { x = N0.getX(i); y = N0.getY(i); z = N0.getZ(i); l = Math.hypot(x, y, z); }
      if (!(l > 1e-12)) { x = 0; y = 1; z = 0; l = 1; }
      N.set([x / l, y / l, z / l], 3 * i);
    }
    g.setAttribute("normal", new THREE.BufferAttribute(N, 3)); g.deleteAttribute("tangent");
    const ek = (i, j) => { const a = cle(i), b = cle(j); return a < b ? a + "|" + b : b + "|" + a; }, aretes = new Map();
    for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) { const key = ek(3 * t + (k + 1) % 3, 3 * t + (k + 2) % 3); (aretes.get(key) || aretes.set(key, []).get(key)).push(t); }
    const bary = new Float32Array(P.count * 3), haut = new Float32Array(P.count * 3), NB = [0, 1, 2].map(() => new Float32Array(P.count * 3));
    for (let t = 0; t < n; t++) {
      const f0 = fa[t] ? [fn[3 * t], fn[3 * t + 1], fn[3 * t + 2]] : [N[9 * t], N[9 * t + 1], N[9 * t + 2]], h = [-1, -1, -1], nb = [f0, f0, f0];
      if (fa[t]) for (let k = 0; k < 3; k++) {
        const i = 3 * t + (k + 1) % 3, j = 3 * t + (k + 2) % 3;
        a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, j); const L = a.distanceTo(b);
        let best = -1, bd = 2;
        for (const u of aretes.get(ek(i, j))) { if (u === t || !fa[u]) continue; const d = dot(t, u); if (d < bd) { bd = d; best = u; } }
        if (best >= 0 && bd < cmin) { h[k] = 2 * fa[t] / Math.max(L, 1e-9); nb[k] = [fn[3 * best], fn[3 * best + 1], fn[3 * best + 2]]; }
      }
      for (let k = 0; k < 3; k++) {
        const i = 3 * t + k; bary.set([k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0], 3 * i); haut.set(h, 3 * i);
        for (let e = 0; e < 3; e++) NB[e].set(nb[e], 3 * i);
      }
    }
    g.setAttribute("aBary", new THREE.BufferAttribute(bary, 3)); g.setAttribute("aHaut", new THREE.BufferAttribute(haut, 3));
    NB.forEach((A, e) => g.setAttribute("aNb" + e, new THREE.BufferAttribute(A, 3)));
    g.computeBoundingBox(); g.computeBoundingSphere(); return g;
  }
  // le shader des arêtes arrondies (à greffer dans un MeshStandard/Physical) : R = rayon (m) ; l'arête arrondie d'un
  // verre épais renvoie plus que sa seule réflexion de surface (la lumière y entre et s'y réfléchit totalement) : son
  // reflet est renforcé (×(1 + éclat)) — un filet vif, sans blanchir les faces planes. En mouvement, le renfort est
  // réduit (uArete : ×,4) : le MSAA moyenne les valeurs avant le tone mapping, et un filet de 1 px trop vif crénelait
  // en escalier les arêtes du verre et des capots, puis « sautait » au lissé de l'affinage
  const uArete = { value: 1 };
  function aretesArrondies(sh, R = K.rayon, eclat = K.areteVerre) {
    if (!(R > 0)) return;
    sh.uniforms.areteK = uArete;
    sh.vertexShader = "attribute vec3 aBary, aHaut, aNb0, aNb1, aNb2;\nvarying vec3 vBary, vHaut, vNb0, vNb1, vNb2;\n" + sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\nvBary = aBary; vHaut = aHaut; vNb0 = normalMatrix * aNb0; vNb1 = normalMatrix * aNb1; vNb2 = normalMatrix * aNb2;");
    sh.fragmentShader = "uniform float areteK;\nvarying vec3 vBary, vHaut, vNb0, vNb1, vNb2;\nfloat aretePoids = 0.;\nvec3 nbSur(vec3 v, vec3 f) { return dot(v, v) > 1e-12 ? normalize(v) : f; }\n" + sh.fragmentShader.replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
      {
        vec3 nA = normal, d = vBary * vHaut, w = (1. - smoothstep(vec3(0.), vec3(${(+R).toFixed(5)}), d)) * step(vec3(1e-7), vHaut);
        // vers la bissectrice des deux facettes au ras de l'arête (normale arrondie), la face elle-même au-delà du rayon
        nA += (nbSur(vNb0, normal) * faceDirection - normal) * .5 * w.x;
        nA += (nbSur(vNb1, normal) * faceDirection - normal) * .5 * w.y;
        nA += (nbSur(vNb2, normal) * faceDirection - normal) * .5 * w.z;
        normal = dot(nA, nA) > 1e-12 ? normalize(nA) : normal;
        aretePoids = max(w.x, max(w.y, w.z));
      }`).replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
      reflectedLight.indirectSpecular *= 1. + ${(+eclat).toFixed(2)} * areteK * aretePoids;`);
  }
  // les pièces enfermées dans le capot (poussoir, col, tige de la pompe) ne se voient jamais : retirées (≈ 52 000
  // triangles de moins à chaque passe — image, réfraction, miroirs)
  { const caches = []; flaconG.scene.traverse(o => { if (o.isMesh && /^(Poussoir|Col|Tige)$/.test(o.name)) caches.push(o); }); caches.forEach(o => o.removeFromParent()); }
  // les doublures des miroirs gardent la géométrie indexée d'origine (la version « aplatie » ci-dessous est déployée,
  // trois sommets par triangle : trois fois plus de travail par sommet, inutile dans un reflet flou)
  const GEO_MIROIR = new Map();
  flaconG.scene.traverse(o => { if (o.isMesh) GEO_MIROIR.set(o.name, o.geometry); });
  for (const o of (() => { const l = []; flaconG.scene.traverse(o => { if (o.isMesh && K.lisse > 0 && /^(Verre|VerreSocle|Or|Jus)$/.test(o.material.name)) l.push(o); }); return l; })()) { o.geometry = aplatir(o.geometry); await souffle(); }
  flaconG.scene.traverse(o => {
    if (!o.isMesh) return;
    if (o.material.name === "Jus") {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i += 3) {
        let haut = 0;
        for (let k = 0; k < 3; k++) if (P.getY(i + k) > NIVEAU) { P.setY(i + k, NIVEAU); haut++; }
        if (haut === 3) for (let k = 0; k < 3; k++) N.setXYZ(i + k, 0, 1, 0);
      }
      g.computeBoundingSphere(); g.computeBoundingBox(); o.geometry = g;
      // (et le jus du reflet, au même niveau)
      const gm = GEO_MIROIR.get(o.name).clone(), Pm = gm.attributes.position;
      for (let i = 0; i < Pm.count; i++) if (Pm.getY(i) > NIVEAU) Pm.setY(i, NIVEAU);
      gm.computeBoundingSphere(); GEO_MIROIR.set(o.name, gm);
    }
    if (o.material.name === "Verre" || o.material.name === "VerreSocle") uvBoite(o.geometry);
    if (o.material.name === "Or") {
      const g = o.geometry, P = g.attributes.position, N = g.attributes.normal;
      // capot : le dessus est une face plane (le modèle y lissait les normales jusqu'au centre : l'or paraissait bombé,
      // la gravure ne se lisait pas sur un vrai plan)
      if (o.name === "Capot") for (let i = 0; i < P.count; i++) if (P.getY(i) > .13505) N.setXYZ(i, 0, 1, 0);
      // or brossé : la verticale couchée dans la surface sur les flancs (les reflets s'étirent en longs filets
      // verticaux), x sur le dessus — fondu sur les chanfreins (pas de couture)
      const T = new Float32Array(P.count * 4), n = V(), a = V(), b = V();
      for (let i = 0; i < P.count; i++) {
        n.fromBufferAttribute(N, i);
        a.set(0, 1, 0).addScaledVector(n, -n.y).normalize();
        b.set(1, 0, 0).addScaledVector(n, -n.x).normalize();
        a.lerp(b, THREE.MathUtils.smoothstep(Math.abs(n.y), .55, .95)).normalize();
        T.set([a.x, a.y, a.z, 1], 4 * i);
      }
      g.setAttribute("tangent", new THREE.BufferAttribute(T, 4));
    }
  });
  // verre vécu, mais propre (vitrine de joaillier) : micro-rayures rares, poussière fine, pas de traces de doigts ;
  // en rugosité seulement (vert), visibles dans les reflets uniquement
  function imperfections() {
    const N = 512, c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d");
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    x.fillStyle = "rgb(0,4,0)"; x.fillRect(0, 0, N, N);                               // verre poli (rugosité ≈ 0,016)
    for (let i = 0; i < 40; i++) {
      const x0 = rnd() * N, y0 = rnd() * N, l = 4 + rnd() * rnd() * 50, a = rnd() * Math.PI;
      x.strokeStyle = `rgba(0,${120 + rnd() * 80 | 0},0,${.15 + rnd() * .3})`; x.lineWidth = .4 + rnd() * .4;
      x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(x0 + Math.cos(a) * l / 2 + (rnd() - .5) * 6, y0 + Math.sin(a) * l / 2 + (rnd() - .5) * 6, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); x.stroke();
    }
    for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(0,160,0,${.15 + rnd() * .4})`; x.fillRect(rnd() * N, rnd() * N, 1, 1); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
  }
  const IMPERF = imperfections(); await souffle();
  // longueur réelle du trajet du regard dans le bloc de jus (boîte en repère du flacon) : la teinte suit l'épaisseur
  // traversée, plus dense par la tranche, plus claire en haut et sur les bords
  const CHEMIN_JUS = `
  uniform vec3 jusMin, jusMax;
  float cheminJus() {
    mat3 R = mat3(modelMatrix); vec3 t = modelMatrix[3].xyz;
    vec3 o = transpose(R) * (cameraPosition - t), p = transpose(R) * (vWorldPosition - t), d = normalize(p - o);
    vec3 inv = 1. / d, t0 = (jusMin - o) * inv, t1 = (jusMax - o) * inv, a = min(t0, t1), b = max(t0, t1);
    float tn = max(max(a.x, a.y), a.z), tf = min(min(b.x, b.y), b.z);
    return clamp(min(tf, length(p - o)) - max(tn, 0.), 0., .08);
  }`;
  const ombreDesFlacons = new THREE.Box3().setFromObject(flaconG.scene);
  // relief en image : l'alpha d'un dessin (blanc sur transparent) posé sur du noir donne une carte de hauteur ;
  // un léger flou arrondit l'arête (gravure, dorure à chaud)
  function relief(img, n, flou, fond = "#000") {
    const c = document.createElement("canvas"); c.width = n; c.height = Math.round(n * img.height / img.width); const x = c.getContext("2d");
    x.fillStyle = fond; x.fillRect(0, 0, c.width, c.height); x.filter = `blur(${flou}px)`; x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  // masque élargi : le dessin flouté et cumulé trois fois (le flanc du relief y tient), blanc sur noir
  function masque(img, n, elargir) {
    const c = document.createElement("canvas"); c.width = n; c.height = Math.round(n * img.height / img.width); const x = c.getContext("2d");
    x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height); x.filter = `blur(${elargir}px)`;
    for (let k = 0; k < 3; k++) x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  function teinte(img, n, couleurFond, couleurDessin) {
    const c = document.createElement("canvas"); c.width = n; c.height = Math.round(n * img.height / img.width); const x = c.getContext("2d");
    const d = document.createElement("canvas"); d.width = c.width; d.height = c.height; const y = d.getContext("2d");
    y.filter = "blur(.6px)"; y.drawImage(img, 0, 0, c.width, c.height); y.filter = "none"; y.globalCompositeOperation = "source-in"; y.fillStyle = couleurDessin; y.fillRect(0, 0, c.width, c.height);
    x.fillStyle = couleurFond; x.fillRect(0, 0, c.width, c.height); x.drawImage(d, 0, 0); return c;
  }
  const canvasTex = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  // carte de normales tirée d'un dessin (alpha) : hauteur = alpha flouté (creux : inversée), pente par Sobel — une vraie
  // gravure (le flanc des traits accroche la lumière d'un côté, s'ombre de l'autre) ; sensY : +1 si v monte avec
  // l'image (PlaneGeometry), −1 en convention glTF (flipY = false)
  function carteNormales(img, n, flou, force, creux, sensY = 1) {
    const c = relief(img, n, flou), W = c.width, H = c.height, src = c.getContext("2d").getImageData(0, 0, W, H).data;
    const h = new Float32Array(W * H); for (let i = 0; i < W * H; i++) h[i] = (creux ? -1 : 1) * src[4 * i] / 255;
    const o = document.createElement("canvas"); o.width = W; o.height = H; const x = o.getContext("2d"), im = x.createImageData(W, H);
    const A = (i, j) => h[Math.min(H - 1, Math.max(0, j)) * W + Math.min(W - 1, Math.max(0, i))];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const gx = (A(i + 1, j - 1) + 2 * A(i + 1, j) + A(i + 1, j + 1) - A(i - 1, j - 1) - 2 * A(i - 1, j) - A(i - 1, j + 1)) / 8;
      const gy = (A(i - 1, j + 1) + 2 * A(i, j + 1) + A(i + 1, j + 1) - A(i - 1, j - 1) - 2 * A(i, j - 1) - A(i + 1, j - 1)) / 8;
      let nx = -gx * force, ny = gy * force * sensY, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const k = 4 * (j * W + i); im.data[k] = (nx * .5 + .5) * 255; im.data[k + 1] = (ny * .5 + .5) * 255; im.data[k + 2] = (nz * .5 + .5) * 255; im.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0); return o;
  }
  const DEF = 512;                                                   // définition des cartes tirées des dessins

  // l'or des capots : le zamak doré pâle des packshots (champagne : bleu/rouge ≈ ,85 sur la photo de marque, pas le
  // laiton), poli miroir (rugosité ,06, à peine brossé : anisotropie ,12, verticale sur les flancs), sans vernis — son
  // dégradé vient des cartes du studio (lightformers) et de la parallaxe
  const OR = new THREE.Color().setRGB(.95, .88, .78, THREE.SRGBColorSpace);
  const OR_REGLAGES = { metalness: 1, roughness: K.orRugo, anisotropy: K.orAniso, anisotropyRotation: 0, clearcoat: 0, envMapIntensity: 1 };
  // dorure à chaud des étiquettes : un or crème très clair, comme sur les étiquettes réelles (lisible sur tous les jus)
  const DORURE = new THREE.Color().setRGB(1, .95, .86, THREE.SRGBColorSpace);
  // emblème gravé dans le dessus du capot : la même dorure, creusée (carte de normales tirée du dessin, relief creux),
  // le fond des traits bruni (#3a2614) et mat (rugosité ,45) — sur le champ doré et poli du dessus (,06), il se lit en
  // creux sombre. Décalque masqué : transparent hors des traits (le dessus garde son propre poli, à plat)
  await souffle();
  const EMB = {
    normale: canvasTex(carteNormales(EMB_IMG, DEF, 1.3 * DEF / 1024, K.gravN, true)),
    rugo: canvasTex(teinte(EMB_IMG, DEF, "rgb(0,15,0)", "rgb(0,115,0)")),          // ,06 hors traits, ,45 dans les traits
    couleur: canvasTex(teinte(EMB_IMG, DEF, "#ffffff", "#3a2614"), true),
    masque: canvasTex(masque(EMB_IMG, DEF, 3 * DEF / 1024)),
  };
  let capotMesh; flaconG.scene.traverse(o => { if (o.isMesh && o.name === "Capot") capotMesh = o; });
  capotMesh.geometry.computeBoundingBox();
  const HAUT_CAPOT = capotMesh.geometry.boundingBox.max.y;
  {
    const bb = capotMesh.geometry.boundingBox, hauteur = .026, largeur = hauteur * 1844 / 2080;   // 23 × 26 mm
    const e = new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur), new THREE.MeshPhysicalMaterial());
    e.name = "EmblemeCapot"; e.rotation.x = -Math.PI / 2; e.position.set((bb.min.x + bb.max.x) / 2, bb.max.y + .00001, (bb.min.z + bb.max.z) / 2);
    capotMesh.add(e);
  }
  // centres de la parallaxe des reflets (repère de l'objet) : le cœur du capot pour l'or (et, pour le décalque de
  // l'emblème couché sur le dessus, le même point dans son repère), le cœur du flacon pour le verre et le jus
  const PAR_OR = V(0, .121, 0), PAR_EMB = V(0, 0, -(HAUT_CAPOT - .121)), PAR_VERRE = V(0, .06, 0), PAR_JUS = V(0, .055, 0);
  // « LIBRERY Paris » moulé au dos du socle (sur le vrai flacon, on le lit à l'envers à travers le verre, au milieu de
  // la facette avant du socle) : un décalque juste derrière la face arrière du socle, vu seulement par la réfraction —
  // dépoli clair, ses lettres en relief (carte de normales) accrochent la lumière ; effacé quand il tombe sous le pixel
  const GRAV_SOCLE = (() => {
    const W = 1024, H = 470, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    x.translate(W, 0); x.scale(-1, 1);                                  // à l'envers vu de face (lisible de dos)
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "alphabetic";
    x.font = "600 205px Futura, 'Avenir Next', Avenir, 'Gill Sans', 'Trebuchet MS', sans-serif";
    x.save(); x.translate(W / 2, 215); x.scale(1, 1.08); x.fillText("LIBRERY", 0, 0); x.restore();
    x.font = "500 175px Futura, 'Avenir Next', Avenir, 'Gill Sans', 'Trebuchet MS', sans-serif"; x.fillText("Paris", W / 2, 420);
    return c;
  })();
  let GRAV_MAT = null;
  if (K.gravSocle > 0) {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(.023, .023 * 470 / 1024), new THREE.MeshStandardMaterial());
    e.name = "GravureSocle"; e.position.set(0, .0098, -.0242);
    flaconG.scene.add(e);
    GRAV_MAT = new THREE.MeshStandardMaterial({ name: "GravureSocle", color: new THREE.Color(1, .97, .92).multiplyScalar(K.gravSocle), alphaMap: canvasTex(GRAV_SOCLE), alphaTest: .35,
      normalMap: canvasTex(carteNormales(GRAV_SOCLE, 1024, 2.2, 5, false)), roughness: .45, metalness: 0, envMapIntensity: 1.4,
      // (?gravLueur : le verre dépoli des lettres diffuse la lumière qui traverse le socle — à 0, les lettres se lisent en
      // sombre sur la lueur du pied vue à travers le socle, ce qui les rend le plus lisibles)
      emissive: new THREE.Color(1, .8, .6).multiplyScalar(K.gravLueur) });
    GRAV_MAT.onBeforeCompile = sh => {
      // seulement de près : quand les lettres tombent sous le pixel (plus de ~14 texels par pixel), elles ne feraient
      // qu'une tache — on les efface en fondu tramé (vues d'ensemble)
      sh.fragmentShader = sh.fragmentShader.replace("#include <alphatest_fragment>", `#include <alphatest_fragment>
        { float tx = max(fwidth(vAlphaMapUv.x) * 1024., fwidth(vAlphaMapUv.y) * 470.);
          float hh = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          if (smoothstep(10., 18., tx) > hh) discard; }`);
      lumieresNiche(sh);
    };
    GRAV_MAT.customProgramCacheKey = () => "grav-socle";
  }
  // dorure à chaud en léger relief : carte de normales tirée de l'alpha (le bord des lettres accroche un filet de lumière)
  await souffle();
  const ETIQ_NORM = {};
  for (const h of HANDLES) { const t = canvasTex(carteNormales(ETIQ[h].image, DEF, DEF / 1024, K.etiqN, false, -1)); t.flipY = false; ETIQ_NORM[h] = t; await souffle(); }
  for (const h of HANDLES) { ETIQ[h].colorSpace = THREE.SRGBColorSpace; ETIQ[h].flipY = false; ETIQ[h].anisotropy = 8; ETIQ[h].needsUpdate = true; }

  const habits = {}, VERRES = [], DISPERSES = [];
  // verre épais « double face » (la face arrière extérieure entre dans l'image réfractée : les biseaux du dos et les
  // reflets internes du socle se voient à travers) — seulement sur l'image arrêtée (affinage), en qualité haute :
  // ≈ 5 ms de plus par image à 1280 × 720, inutile pendant le défilement
  const VERRE_EPAIS = HAUTE && Q.get("verre2") !== "0";
  let epais = false;
  function verreEpais(oui) {
    oui = oui && VERRE_EPAIS && QUAL === "haute"; if (oui === epais) return; epais = oui;
    for (const m of VERRES) { m.side = oui ? THREE.DoubleSide : THREE.FrontSide; m.needsUpdate = true; }
  }
  const dispVerre = () => QUAL === "haute" ? K.verreDisp : QUAL === "mobile" ? .3 : 0;
  const dispJus = () => QUAL === "haute" ? .15 : 0;
  // la dispersion (trois lectures de l'image réfractée au lieu d'une) coûte un cinquième de l'image : elle n'est
  // calculée qu'à l'arrêt — en mouvement, l'irisation fine des arêtes ne se verrait pas (programmes des deux variantes
  // compilés au chargement : prechauffer)
  let dispersee = true;
  function dispersion(oui) {
    if (oui === dispersee) return; dispersee = oui;
    for (const m of DISPERSES) m.dispersion = !oui ? 0 : m.userData.dispJus ? dispJus() : dispVerre() * (QUAL === "haute" ? m.userData.disp || 1 : 1);
  }
  const puissance = (c, k) => new THREE.Color(c.r ** k, c.g ** k, c.b ** k);
  // équilibre des blancs du jus : vu à travers le jus, c'est surtout le panneau du fond (orangé) qui éclaire ; sous
  // cette lumière un jus prune vire au rouge fuchsia. Comme le photographe corrige sa balance, la teinte d'absorption
  // des jus froids est compensée de la couleur du panneau (Palmeira reste prune), alors que le bois, la lueur de la
  // niche et les jus chauds restent chauds
  const TEINTE_FOND = [1, .9, .4];
  // la couleur de chaque flacon vu en transparence sur fond blanc, relevée sur les packshots du catalogue (corps du
  // flacon, sous l'étiquette) : c'est elle que le jus doit rendre en contre-jour (?pack=0 : couleurs de parfums.json)
  const PACK = { palmeira: [.37, .11, .25], "mango-wave": [.41, .38, .51], "ambert-sunset": [.76, .33, .09], "hot-sand": [.87, .67, .15],
    "sun-ice": [.88, .87, .03], "tonka-love": [.89, .79, .6], "vanilla-plum": [.89, .69, .35], "magnetic-flowers": [.88, .78, .52] };
  const AVEC_PACK = Q.get("pack") !== "0";
  // les jus pâles de Skin Obsession (champagne, pêche) : un peu plus clairs en épaisseur
  const PALES = new Set(["tonka-love", "magnetic-flowers", "vanilla-plum"]);
  // (seulement pour les jus froids — prune, lavande — : les jus chauds restent ambre, comme le veut la vitrine)
  function equilibre(c) {
    const k = K.balance * THREE.MathUtils.smoothstep(c.b - c.g, -.01, .03);
    const o = new THREE.Color(c.r / TEINTE_FOND[0] ** k, c.g / TEINTE_FOND[1] ** k, c.b / TEINTE_FOND[2] ** k), m = Math.max(o.r, o.g, o.b);
    return m > 1 ? o.multiplyScalar(1 / m) : o;
  }
  // virage ambré en profondeur : un colorant jaune pâle absorbe le bleu, et un peu le vert — sous une forte épaisseur,
  // un jus champagne tourne au miel (jamais à l'olive ni au kaki). Seulement les jus champagne et pêche
  // (r ≥ g ≥ b et ,70 ≤ g/r ≤ ,92 sur la couleur du packshot : Tonka, Magnetic, Vanilla, Hot Sand) — ni Sun Ice
  // (chartreuse en vrai), ni Ambert (orangé), ni les prunes et lavandes.
  function ambrer(c, srgb, k = K.ambre) {
    const [r, g, b] = srgb;
    if (!(k > 0) || !(r >= g && g >= b) || g / r < .70 || g / r > .92) return c.clone();
    const s = THREE.MathUtils.clamp((c.r - c.b) / Math.max(c.r, 1e-3), 0, 1);
    return new THREE.Color(c.r, c.g * (1 - .1 * k * s), c.b * (1 - .3 * k * s));
  }
  // toutes les matières des flacons : n'y sont calculés que les deux projecteurs de leur niche (lumieresNiche)
  function materiaux(handle, niche) {
    const cle = handle + niche; if (habits[cle]) return habits[cle];
    const p = parfums[handle], srgbJus = AVEC_PACK && PACK[handle] || p.jus, jus = new THREE.Color().setRGB(...srgbJus, THREE.SRGBColorSpace);
    const verre = new THREE.Color().setRGB(...p.verre, THREE.SRGBColorSpace), teinteV = p.verre.some(c => c < 0.95), M = {};
    const LFV = LF_VERRE[niche], LFO = LF_OR[niche], LFE = LF_ETIQ[niche];
    // le jus et sa carte cachée (partagés avec le tube plongeur, qui baigne dedans)
    const l = jus.r * .2126 + jus.g * .7152 + jus.b * .0722, pale = PALES.has(handle);
    const attJ = ambrer(equilibre(jus), srgbJus);
    const dJ = AVEC_PACK ? K.jusD * (teinteV ? 1.1 : 1) * (pale ? K.jusPale : 1) : (teinteV ? .07 : .03) * THREE.MathUtils.clamp(.6 + l, .8, 1.25);
    // la carte cachée : moins forte et plus haute en bas (Skin Obsession : des jus pâles qui laissent tout passer —
    // elle remplit le corps d'une lueur pêche au lieu d'un point chaud au pied)
    const sat = 1 - Math.min(jus.r, jus.g, jus.b) / Math.max(jus.r, jus.g, jus.b, 1e-3);
    const carteJus = new THREE.Color(1, .78, .54).multiplyScalar(K.carteJus * (niche ? 1 : K.carteBas) * (K.carteP + (1 - K.carteP) * sat));
    const carteForme = niche ? new THREE.Vector2(K.carteY, K.carteSerre) : new THREE.Vector2(K.carteYBas, K.carteSerreBas);
    // vue de haut, la carte cachée s'éteint — sauf pour les jus pâles, qui sans elle viraient au verre fumé gris
    const carteHaut = pale ? K.carteHautPale : 0;
    flaconG.scene.traverse(o => {
      if (!o.isMesh) return;
      if (o.name === "GravureSocle") { if (GRAV_MAT) M.GravureSocle = GRAV_MAT; return; }
      if (o.name === "EmblemeCapot") {
        M.Embleme = new THREE.MeshPhysicalMaterial({ ...OR_REGLAGES, name: "Embleme", color: OR.clone(), map: EMB.couleur, roughness: 1, roughnessMap: EMB.rugo, normalMap: EMB.normale,
          alphaMap: EMB.masque, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
        M.Embleme.onBeforeCompile = sh => { avecLF(sh, LFO); parallaxe(sh, PAR_EMB, K.parOr); lumieresNiche(sh, false, false, niche); };
        M.Embleme.customProgramCacheKey = () => "embleme" + cleLF(LFO) + nicheCle(niche);
        return;
      }
      if (M[o.material.name]) return;
      const nom = o.material.name, m = o.material.clone(); m.name = nom;
      if (nom === "Verre" || nom === "VerreSocle") {
        const socle = nom === "VerreSocle";
        // cristal épais : ior 1,52, dispersion (l'arc-en-ciel fin des arêtes, l'éclat du bijou), parois de 8,5 mm,
        // socle plein (épaisseur de réfraction plus forte : il loupe ce qu'il y a derrière)
        Object.assign(m, { roughness: 1, metalness: 0, transmission: 1, ior: 1.52, thickness: socle ? .036 : .017, specularIntensity: 1,
          dispersion: dispVerre() * (socle && QUAL === "haute" ? 1.3 : 1), side: THREE.FrontSide, envMapIntensity: 1 });
        m.userData.disp = socle ? 1.3 : 1; DISPERSES.push(m);
        m.roughnessMap = IMPERF.clone(); m.roughnessMap.offset.set(Math.random(), Math.random()); VERRES.push(m);
        m.attenuationColor = verre.clone().lerp(equilibre(jus), teinteV ? .2 : .5);
        // (la couleur de packshot compte déjà le verre teinté : le verre s'éclaircit d'autant)
        m.attenuationDistance = (teinteV ? (AVEC_PACK ? .05 : .035) : .06) * (socle ? 1.6 : 1);
        m.color = teinteV ? jus.clone().lerp(verre, .35).lerp(new THREE.Color(1, 1, 1), .3) : new THREE.Color(1, 1, 1).lerp(m.attenuationColor, .4);
        // (teinte du jus ramenée à pleine intensité : même un jus sombre, prune ou lavande, allume son socle de sa couleur)
        const jv = puissance(jus, 1.6), lu = jv.clone().multiplyScalar(1 / Math.max(jv.r, jv.g, jv.b, 1e-3)).lerp(verre, .15).multiplyScalar(K.socle * .35 * (teinteV ? 1.1 : .8));
        m.onBeforeCompile = sh => {
          aretesArrondies(sh, K.rayon, K.areteVerre);
          avecLF(sh, LFV);
          parallaxe(sh, PAR_VERRE, K.parV);
          // double face : la paroi du fond du flacon (face arrière extérieure) entre dans l'image réfractée — on voit
          // les biseaux du dos à travers l'épaisseur ; les parois de la cavité, elles, ne doivent pas masquer le jus
          sh.vertexShader = "varying vec3 vObj;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
          // (et jamais l'intérieur de la face du dessous du socle : vue d'en haut à travers le verre, sa normale retournée
          // vers le haut y renvoyait le panneau bas du studio — une semelle crème, plate, sous chaque flacon pâle, qui
          // n'apparaissait qu'à l'affinage)
          sh.fragmentShader = "varying vec3 vObj;\n" + sh.fragmentShader.replace("void main() {", "void main() {\n bool dosV = !gl_FrontFacing;\n#ifdef FLIP_SIDED\n dosV = true;\n#endif\n if (dosV && (vObj.y < .0015 || (max(abs(vObj.x) / .0315, abs(vObj.z) / .024) < .93 && vObj.y > .021))) discard;");
          sh.fragmentShader = sh.fragmentShader.replace("#include <transmission_fragment>", morceau("transmission_fragment",
            // parois épaisses : vues par la tranche, la lumière y fait plus de chemin — arêtes plus denses, plus teintées
            ["material.attenuationDistance = attenuationDistance;",
             "material.attenuationDistance = attenuationDistance * mix(.4, 1., abs(dot(normalize(normal), normalize(vViewPosition))));"],
            // le vécu (rayures, poussière) ne trouble que les reflets : la réfraction garde la netteté du verre poli
            ["n, v, material.roughness, material.diffuseColor", "n, v, min(material.roughness, .02), material.diffuseColor"],
            // verre épais vu en incidence rasante : le rayon réfracté se perd par réflexion totale vers les parois
            // sombres — l'arête se dessine en trait sombre, comme sur une photo en contre-jour
            ["totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );",
             "totalDiffuse = mix( totalDiffuse, transmitted.rgb * mix(.35, 1., smoothstep(.05, .42, abs(dot(n, v)))), material.transmission );"]));
          if (socle) {
            // le socle massif s'allume de la couleur du jus quand le panneau du fond l'éclaire par derrière
            sh.uniforms.lueurSocle = { value: lu };
            sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 lueurSocle;")
              .replace("#include <opaque_fragment>", "outgoingLight += lueurSocle * (.35 + .65 * pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 2.));\n#include <opaque_fragment>");
          }
          lumieresNiche(sh, false, false, niche);
        };
        m.customProgramCacheKey = () => (socle ? "socle-f2" : "verre-f2") + m.side + cleLF(LFV) + nicheCle(niche);
      } else if (nom === "Jus") {
        Object.assign(m, { roughness: 0, metalness: 0, transmission: 1, ior: 1.36, thickness: .03, dispersion: dispJus(), side: THREE.DoubleSide, envMapIntensity: .7 });
        m.userData.dispJus = true; DISPERSES.push(m);
        m.attenuationColor = attJ.clone(); m.attenuationDistance = dJ;
        m.color = new THREE.Color(1, 1, 1);
        const diffus = jus.clone().multiply(jus).multiplyScalar(K.diffus);
        m.onBeforeCompile = sh => {
          Object.assign(sh.uniforms, { jusMin: { value: JUS_MIN }, jusMax: { value: JUS_MAX }, jusDiffus: { value: diffus }, carteJus: { value: carteJus }, carteForme: { value: carteForme }, carteHaut: { value: carteHaut } });
          parallaxe(sh, PAR_JUS, K.parV);
          sh.fragmentShader = sh.fragmentShader.replace("#include <transmission_pars_fragment>", "#include <transmission_pars_fragment>\nuniform vec3 jusDiffus, carteJus; uniform vec2 carteForme; uniform float carteHaut;\n" + `#define K_MENISQUE ${K.menisque.toFixed(3)}\n` + CHEMIN_JUS)
            .replace("#include <transmission_fragment>", morceau("transmission_fragment",
              // la teinte suit le trajet réel du regard dans le jus
              ["material.attenuationDistance = attenuationDistance;", "material.attenuationDistance = attenuationDistance * clamp(thickness / max(cheminJus(), .002), .6, 3.);"],
              // diffusion interne : la lumière reçue ressort teintée, plus fort là où le trajet est long — le jus ne
              // s'allume que là où la lumière le touche (le clair-obscur est gardé). Vu par la tranche, le bloc de jus
              // s'assombrit (la lumière se perd en réflexion totale contre les parois) : des bords sombres qui donnent
              // son volume au liquide, même pâle — plus une lanterne de lait uniforme
              ["totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );",
               `totalDiffuse = transmitted.rgb * mix(${K.jusBord.toFixed(3)}, 1., smoothstep(.05, .42, abs(dot(n, v)))) * material.transmission + totalDiffuse * jusDiffus * (.35 + .65 * smoothstep(.004, .03, cheminJus()));`]))
            .replace("#include <opaque_fragment>", `{
              vec3 pl = transpose(mat3(modelMatrix)) * (vWorldPosition - modelMatrix[3].xyz);
              // la carte cachée du photographe de liquides : un carton découpé à la silhouette, juste derrière chaque
              // flacon, éclairé — invisible (le flacon le cache), il allume le jus dans sa masse : plus clair en bas au
              // centre, plus dense vers les flancs et la surface (Beer-Lambert sur le vrai trajet). Comme la vraie carte,
              // elle ne se voit qu'à hauteur du flacon : vue de haut, plus de lanterne
              {
                float chc = cheminJus();
                vec3 Tc = pow(max(attenuationColor, vec3(.002)), vec3(chc / attenuationDistance));
                vec2 qc = vec2(pl.x / .024, (pl.y - carteForme.x) / .042);
                float vue = mix(carteHaut, 1., 1. - smoothstep(.15, .55, abs(normalize(vWorldPosition - cameraPosition).y)));
                outgoingLight += carteJus * exp(-dot(qc, qc) * carteForme.y) * Tc * smoothstep(.003, .015, chc) * vue;
              }
              // ménisque : sous la surface, le liquide remonte contre le verre et renvoie la lumière — un filet clair
              float men = smoothstep(jusMax.y - .0018, jusMax.y - .0003, pl.y) * step(pl.y, jusMax.y - .00004);
              outgoingLight = mix(outgoingLight, outgoingLight * 2.2 + .006, .75 * men);
              // (et la surface elle-même, vue presque de profil, renvoie la lumière chaude de la niche : un filet net)
              outgoingLight += carteJus * K_MENISQUE * men;
            }
            #include <opaque_fragment>`);
          lumieresNiche(sh, false, false, niche);
        };
        m.customProgramCacheKey = () => "jus-f2" + nicheCle(niche);
      } else if (nom === "Or") {
        const o = M[nom] = new THREE.MeshPhysicalMaterial({ ...OR_REGLAGES, name: nom, color: OR.clone() });
        o.onBeforeCompile = sh => {
          aretesArrondies(sh, K.rayon, K.areteOr);
          avecLF(sh, LFO);
          parallaxe(sh, PAR_OR, K.parOr);
          // carte graduée (subterfuge de photographe) : sur les flancs du capot, le reflet s'éteint vers le bas (×,4 au
          // pied → ×1,21 en haut) — le dégradé de l'or poli des photos de joaillerie
          if (K.oGrad > 0) {
            sh.vertexShader = "varying float vYc;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvYc = position.y;");
            sh.fragmentShader = "varying float vYc;\n" + sh.fragmentShader.replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
              if (vYc > .1066) {
                float gy = smoothstep(.1069, .1352, vYc), side = 1. - abs(inverseTransformDirection(normal, viewMatrix).y);
                reflectedLight.indirectSpecular *= mix(1., mix(1. - ${K.oGrad.toFixed(3)}, 1. + .35 * ${K.oGrad.toFixed(3)}, gy), side);
              }`);
          }
          lumieresNiche(sh, false, false, niche);
        };
        o.customProgramCacheKey = () => "or-f2" + cleLF(LFO) + nicheCle(niche);
        return;
      } else if (nom === "Plastique") {
        // tube plongeur en polyéthylène dans le jus : presque le même indice — un fil à peine plus sombre, sans reflet
        // blanc. Opaque (sinon three.js ne le montre pas à travers le jus), il cachait la paroi du fond du jus, allumée par
        // la carte cachée : un épais fil noir en travers des étiquettes. Il s'allume donc comme le jus qui l'entoure (la
        // carte cachée vue à travers ≈ 1,5 cm de jus), sous la surface seulement : ≈ 85 % de la lueur du jus, un trait fin
        const tube = M[nom] = new THREE.MeshStandardMaterial({ name: nom, color: puissance(jus, 1.2).multiplyScalar(K.tube), roughness: .6, metalness: 0, envMapIntensity: .3 });
        const kT = .015 / dJ, Tt = new THREE.Color(attJ.r ** kT, attJ.g ** kT, attJ.b ** kT).multiply(carteJus).multiplyScalar(K.tubeLueur);
        tube.onBeforeCompile = sh => {
          Object.assign(sh.uniforms, { tubeLueur: { value: Tt }, carteForme: { value: carteForme }, carteHaut: { value: carteHaut }, niveau: { value: NIVEAU } });
          sh.vertexShader = "varying vec3 vTube, vTubeW;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvTube = position; vTubeW = (modelMatrix * vec4(position, 1.)).xyz;");
          sh.fragmentShader = "uniform vec3 tubeLueur; uniform vec2 carteForme; uniform float carteHaut, niveau; varying vec3 vTube, vTubeW;\n" + sh.fragmentShader.replace("#include <opaque_fragment>", `{
              vec2 qc = vec2(vTube.x / .024, (vTube.y - carteForme.x) / .042);
              float vue = mix(carteHaut, 1., 1. - smoothstep(.15, .55, abs(normalize(vTubeW - cameraPosition).y)));
              // (au-dessus du jus, dans l'air : un fil de plastique clair, à peine visible — plus le bâton orangé)
              outgoingLight = outgoingLight * mix(.15, 1., step(vTube.y, niveau)) + tubeLueur * exp(-dot(qc, qc) * carteForme.y) * vue * step(vTube.y, niveau);
            }
            #include <opaque_fragment>`);
          lumieresNiche(sh, false, false, niche);
        };
        tube.customProgramCacheKey = () => "tube-l" + nicheCle(niche);
        return;
      } else if (nom === "Serigraphie") {
        // dorure à chaud : de l'or en léger relief (carte de normales), qui ne s'allume que sous un reflet (aucune émission)
        M[nom] = new THREE.MeshPhysicalMaterial({ name: nom, map: ETIQ[handle], transparent: true, depthWrite: false, alphaTest: .02,
          metalness: 1, roughness: .14, color: DORURE.clone(), normalMap: ETIQ_NORM[handle], clearcoat: .2, clearcoatRoughness: .1, envMapIntensity: K.dorure });
        M[nom].onBeforeCompile = sh => { avecLF(sh, LFE); parallaxe(sh, PAR_VERRE, K.parV); lumieresNiche(sh, false, false, niche); };
        M[nom].customProgramCacheKey = () => "etiquette" + cleLF(LFE) + nicheCle(niche);
        return;
      }
      M[nom] = m;
    });
    for (const [nom, m] of Object.entries(M)) { m.envMap = /^(Verre|VerreSocle|Jus|Plastique|GravureSocle)$/.test(nom) ? ENV_VERRE[niche] : ENV_OR[niche]; m.envMapIntensity = m.envMapIntensity ?? 1; }
    return habits[cle] = M;
  }
  function habiller(flacon, handle, niche) {
    const M = materiaux(handle, niche);
    flacon.traverse(o => {
      if (!o.isMesh) return; const nom = o.name === "EmblemeCapot" ? "Embleme" : o.name === "GravureSocle" ? "GravureSocle" : o.material.name;
      o.material = M[nom]; o.receiveShadow = true;
      o.castShadow = !(nom === "Verre" || nom === "VerreSocle" || nom === "Serigraphie" || nom === "Embleme" || nom === "GravureSocle");
      if (nom === "Serigraphie") o.renderOrder = 2;
      if (nom === "Embleme") o.renderOrder = 3;
    });
    return flacon;
  }
  // doublures des flacons pour les miroirs : jus lumineux (contre-jour), socle teinté, or au studio de la niche
  const doublures = {};
  const DEGRADE_JUS = sh => {
    sh.vertexShader = "varying vec3 vLoc; varying float vFace;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvLoc = position; vFace = abs(normalize(normalMatrix * normal).z);");
    sh.fragmentShader = "varying vec3 vLoc; varying float vFace;\n" + sh.fragmentShader.replace("#include <opaque_fragment>",
      "outgoingLight *= (1.25 - .75 * smoothstep(.02, .09, vLoc.y)) * (.35 + .65 * vFace);\n#include <opaque_fragment>");
  };
  DEGRADE_JUS.cle = "jus";
  function materiauxDoublure(handle, niche) {
    const cle = handle + niche; if (doublures[cle]) return doublures[cle];
    // le jus du reflet a la couleur que le vrai flacon montre : la lueur du pied (1 ; 0,72 ; 0,45) passée à travers
    // ≈ 4,5 cm de jus (son atténuation réelle) — un jus lavande ou prune reste sombre dans la laque comme sur l'étagère
    const MJ = materiaux(handle, niche).Jus, ac = MJ.attenuationColor, kT = .045 / MJ.attenuationDistance;
    const vif = new THREE.Color(ac.r ** kT, ac.g ** kT, ac.b ** kT).multiply(new THREE.Color(1, .72, .45)).multiplyScalar(K.fond * LUM_NICHE[niche] * .22);
    const verre = new THREE.Color().setRGB(...parfums[handle].verre, THREE.SRGBColorSpace);
    return doublures[cle] = {
      // le jus : lumineux en bas (contre-jour), plus dense vers la surface, plus sombre sur les flancs
      Jus: refletable(new THREE.MeshBasicMaterial({ color: vif }), DEGRADE_JUS),
      VerreSocle: refletable(new THREE.MeshBasicMaterial({ color: vif.clone().multiplyScalar(.75).lerp(verre, .15) }), DEGRADE_JUS),
      // la paroi de verre, à peine : ses arêtes prennent le studio de la niche
      Verre: refletable(new THREE.MeshStandardMaterial({ color: verre, metalness: 0, roughness: .04, envMap: ENV_VERRE[niche], envMapIntensity: 1, transparent: true, opacity: .22, depthWrite: false })),
      // l'étiquette, à l'envers dans le reflet
      Serigraphie: refletable(new THREE.MeshBasicMaterial({ map: ETIQ[handle], color: DORURE.clone().multiplyScalar(.45), transparent: true, alphaTest: .3, depthWrite: false })),
      Or: refletable(new THREE.MeshStandardMaterial({ color: OR, metalness: 1, roughness: .12, envMap: ENV_OR[niche], envMapIntensity: 1.3 })),
    };
  }
  // ---------- caustiques : tracées une fois (photons à travers le vrai flacon), cuites en une image ----------
  // Un petit traceur de photons (cuisson-caustiques.js, ?cuire=1) a envoyé la lumière du contre-jour de chaque niche à
  // travers le verre (n 1,52) et le jus (n 1,36) — réfraction, Fresnel, réflexion totale, 9 rebonds, 40 000 photons par
  // flacon — jusqu'à l'étagère. Par flacon, une image de l'étagère dans son repère (128 × 256) : R = flux passé par le
  // jus, L = longueur moyenne de jus traversée, B = flux passé par le verre seul, A = flux que le verre a dévié (là où il
  // serait tombé tout droit : la scène l'y éclaire déjà). Rendu : un plan additif sur l'étagère, couleur = lumière ×
  // albédo de la laque / π × (R·T_jus(L) + B − A) × teinte du verre — le noyau coloré concentré par le bloc de jus, les
  // filets nets des biseaux, la flaque qui tombe devant le flacon. La scène étant fixe, rien n'est calculé au chargement.
  const CAUSTIQUES = [];
  // Une caustique est de la lumière concentrée, pas une tache : seuls les filets focalisés et le noyau teinté du jus
  // restent vifs (courbe en puissance 1,5, le flux du verre seul compté à moitié), et elle s'adoucit en s'éloignant du
  // pied — la pénombre d'une source de vraie taille (≈ 3 cm à 20 cm : flou ≈ 0,15 × la distance au pied, lu dans les
  // mip-maps de l'atlas) ; ses bords s'éteignent en fondu (aucun bord de tuile ne peut se voir)
  const causticMat = () => new THREE.ShaderMaterial({
    uniforms: { tC: { value: null }, tuile: { value: new THREE.Vector4() }, decA: { value: 0 }, s: { value: 1 }, lum: { value: new THREE.Color() },
      attJ: { value: new THREE.Color(1, 1, 1) }, dJ: { value: .03 }, tg: { value: new THREE.Color(1, 1, 1) },
      bornes: { value: new THREE.Vector4() } },
    defines: { CAUS_B: K.causB.toFixed(3), CAUS_K: K.causK.toFixed(3), CAUS_FLOU: K.causFlou.toFixed(4) },
    vertexShader: `varying vec2 vUv, vLoc; varying vec3 vW; void main() { vUv = uv; vLoc = position.xz; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tC; uniform vec4 tuile, bornes; uniform vec3 lum, attJ, tg; uniform float decA, s, dJ; varying vec2 vUv, vLoc; varying vec3 vW;
      void main() {
        if (vW.x < bornes.x || vW.x > bornes.y || vW.z < bornes.z || vW.z > bornes.w) discard;     // (découpée à la niche)
        vec2 uv = tuile.xy + vUv * tuile.zw;
        float d = length(max(abs(vLoc) - vec2(.0315, .024), 0.)), lod = clamp(log2(max(1., d * 1000. * CAUS_FLOU)), 0., 3.);
        vec3 c = textureLod(tC, uv, lod).rgb; float a = textureLod(tC, uv + vec2(0., decA), lod).r;
        float R = pow(c.r, 2.2), B = pow(c.b, 2.2), A = pow(a, 2.2), L = c.g * .1;
        vec3 Tj = pow(max(attJ, vec3(1e-4)), vec3(L / dJ));
        vec3 e = s * pow(max((R * Tj + CAUS_B * B) * tg - vec3(A), 0.), vec3(CAUS_K));
        vec2 f = smoothstep(0., .1, vUv) * smoothstep(0., .1, 1. - vUv);
        gl_FragColor = vec4(min(lum * e * f.x * f.y, vec3(4.)), 1.);
      }`,
    transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
  function planCaustique(pose, e, atlas, meta) {
    const { u0, u1, v0, v1, a } = e, ax = a[0], az = a[1], bx = -az, bz = ax, y = .0009;
    const P = (u, v) => [u * bx + v * ax, y, u * bz + v * az];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([...P(u0, v0), ...P(u1, v0), ...P(u1, v1), ...P(u0, v1)], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); geo.setIndex([0, 1, 2, 0, 2, 3]);
    const M = habits[pose.handle + pose.niche], mat = causticMat(), u = mat.uniforms, AW = meta.cols * meta.W, AH = 2 * meta.rows * meta.H;
    u.tC.value = atlas; u.s.value = e.s; u.decA.value = meta.rows * meta.H / AH;
    u.tuile.value.set((e.col * meta.W + .5) / AW, (e.lig * meta.H + .5) / AH, (meta.W - 1) / AW, (meta.H - 1) / AH);
    const l = SPOTS[pose.niche];
    u.lum.value.copy(l.color).multiplyScalar(l.intensity * e.force * K.caustique / Math.PI).multiply(ALBEDO_LAQUE);
    u.attJ.value.copy(M.Jus.attenuationColor); u.dJ.value = M.Jus.attenuationDistance;
    // le verre teinté colore aussi la lumière (≈ 2 parois de 8,5 mm)
    const vg = M.Verre; u.tg.value.setRGB(...[vg.attenuationColor.r, vg.attenuationColor.g, vg.attenuationColor.b].map(c => Math.pow(Math.max(c, 1e-4), .017 / vg.attenuationDistance)));
    u.bornes.value.set(CAISSON.g + .001, CAISSON.d - .001, CAISSON.fond, pose.niche ? CAISSON.avantEtagere : CAISSON.avant);
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 1; m.frustumCulled = false; pose.f.add(m);
    CAUSTIQUES.push(m);
  }
  function chargerCaustiques(meta, image) {
    if (!(K.caustique > 0) || Q.get("caustiques") === "0" || !meta || !image) return;
    const atlas = new THREE.Texture(image);
    atlas.flipY = false; atlas.colorSpace = THREE.NoColorSpace; atlas.generateMipmaps = true; atlas.minFilter = THREE.LinearMipmapLinearFilter; atlas.magFilter = THREE.LinearFilter; atlas.needsUpdate = true;
    for (const e of meta.poses) { const pose = POSES[e.i]; if (pose && pose.handle === e.handle && pose.niche === e.niche) planCaustique(pose, e, atlas, meta); }
  }
  // liseré de contact : là où le verre touche la laque, un trait sombre serré autour du pied (rectangle arrondi
  // 63 × 48 mm, rayon 5 mm, flou 2 mm)
  const contactTex = (() => {
    const k = 4, W = 75 * k, H = 60 * k, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
    x.filter = `blur(${2 * k}px)`; x.fillStyle = "#fff"; x.beginPath(); x.roundRect((W - 63 * k) / 2, (H - 48 * k) / 2, 63 * k, 48 * k, 5 * k); x.fill();
    return new THREE.CanvasTexture(c);
  })();
  const contactMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: contactTex, transparent: true, opacity: .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const contactGeo = new THREE.PlaneGeometry(.075, .06);
  // posé exactement sur la surface : rayons vers le bas sous les quatre coins de l'empreinte et au centre, on garde le plus haut
  const PIED = -ombreDesFlacons.min.y, POSES = [];
  function poser(handle, x, z, lacet, niche) {
    const plafond = niche ? CAISSON.plafond : CAISSON.sousEtagere;
    const f = habiller(flaconG.scene.clone(true), handle, niche); f.rotation.y = lacet;
    const c = Math.cos(lacet), s = Math.sin(lacet); let y = -Infinity;
    for (const [u, w] of [[0, 0], [.03, .022], [.03, -.022], [-.03, .022], [-.03, -.022]]) {
      const h = toucher(V(x + u * c + w * s, plafond - .01, z - u * s + w * c), V(0, -1, 0)); if (h) y = Math.max(y, h.y);
    }
    f.position.set(x, y + PIED, z); rangees.add(f);
    const o = new THREE.Mesh(contactGeo, contactMat); o.rotation.order = "YXZ"; o.rotation.set(-Math.PI / 2, lacet, 0);
    o.position.set(x, y + .0003, z); o.renderOrder = 1; rangees.add(o);
    // sa doublure (calque 1) : seulement le jus, le socle, la paroi, l'étiquette et l'or
    const D = materiauxDoublure(handle, niche), d = flaconG.scene.clone(true);
    d.traverse(o => { if (!o.isMesh) return; const nom = o.name === "EmblemeCapot" ? null : o.material.name; o.material = D[nom] || null; o.visible = !!D[nom]; o.layers.set(calqueNiche(niche));
      if (GEO_MIROIR.has(o.name)) o.geometry = GEO_MIROIR.get(o.name); });
    d.position.copy(f.position); d.rotation.y = lacet; d.layers.set(calqueNiche(niche)); rangees.add(d);
    POSES.push({ handle, x, y, z, niche, f });
  }
  // les étagères remplies : deux rangées décalées d'un demi-pas, ordre varié, lacets légers, deux flacons tournés
  // (empreintes vérifiées : ≥ 6 mm entre flacons, ~2 cm des parois). Summer Vibes en haut, Skin Obsession en bas.
  const SUMMER = [
    ["palmeira", -.117, -.038, .05], ["ambert-sunset", -.041, -.046, -.38], ["mango-wave", .043, -.040, .07], ["hot-sand", .118, -.036, -.04],
    ["mango-wave", -.157, .027, .09], ["hot-sand", -.079, .036, -.05], ["palmeira", .002, .025, .03], ["sun-ice", .080, .034, -.08], ["ambert-sunset", .156, .028, .12]];
  const SKIN = [
    ["vanilla-plum", -.118, -.034, -.06], ["tonka-love", -.038, -.028, .05], ["magnetic-flowers", .041, -.038, .40], ["vanilla-plum", .117, -.030, -.03],
    ["tonka-love", -.156, .040, -.10], ["magnetic-flowers", -.077, .034, .04], ["vanilla-plum", .001, .042, -.07], ["tonka-love", .079, .036, .06], ["magnetic-flowers", .157, .039, -.04]];
  // (les deux étagères glissées de 12 mm vers la gauche : vu de trois quarts depuis la droite, le dernier flacon du
  // premier rang ne se cache plus derrière la paroi — son étiquette se lit en entier)
  for (const [h, x, z, a] of SUMMER) { poser(h, x + K.decalX, z, a, 1); await souffle(); }
  for (const [h, x, z, a] of SKIN) { poser(h, x + K.decalX, z, a, 0); await souffle(); }
  chargerCaustiques(cauMeta, cauImage);
  await souffle();

  // ---------- miroirs plans : les étagères laquées ----------
  // Une caméra miroir rend le calque 1 (doublures, sans lumières : peu coûteux) dans une image à mi-définition,
  // mipmappée ; recalculée seulement quand la caméra bouge (le TAA tremble, le miroir non : il n'en a pas besoin).
  class Miroir {
    constructor(normale, point, portee, echelle, calque) {
      this.n = normale.clone().normalize(); this.p = point.clone(); this.portee = portee; this.echelle = echelle;
      this.plan = new THREE.Plane().setFromNormalAndCoplanarPoint(this.n, this.p);
      this.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
      this.cam = new THREE.PerspectiveCamera(); this.cam.layers.set(calque);
      this.m = new THREE.Matrix4(); this.cle = "";
    }
    setSize(w, h) { this.rt.setSize(Math.max(1, Math.round(w * this.echelle)), Math.max(1, Math.round(h * this.echelle))); this.cle = ""; }
    rendre(renderer, scene, camera) {
      camera.updateMatrixWorld();
      const cle = camera.matrixWorld.elements.join() + camera.projectionMatrix.elements.join();
      if (cle === this.cle) return; this.cle = cle;
      const n = this.n, P = this.p, cp = V().setFromMatrixPosition(camera.matrixWorld);
      if (cp.clone().sub(P).dot(n) <= 0) return;
      const R = new THREE.Matrix4().extractRotation(camera.matrixWorld);
      const vue = P.clone().sub(cp).reflect(n).negate().add(P);
      const regard = V(0, 0, -1).applyMatrix4(R).add(cp), cible = P.clone().sub(regard).reflect(n).negate().add(P);
      const c = this.cam; c.position.copy(vue); c.up.set(0, 1, 0).applyMatrix4(R).reflect(n); c.lookAt(cible);
      c.far = camera.far; c.updateMatrixWorld(); c.projectionMatrix.copy(camera.projectionMatrix);
      this.m.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
      // plan de coupe oblique (Lengyel) : rien de ce qui est derrière le miroir
      const pl = this.plan.clone().applyMatrix4(c.matrixWorldInverse), cl = new THREE.Vector4(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant), pm = c.projectionMatrix, q = new THREE.Vector4();
      q.x = (Math.sign(cl.x) + pm.elements[8]) / pm.elements[0]; q.y = (Math.sign(cl.y) + pm.elements[9]) / pm.elements[5]; q.z = -1; q.w = (1 + pm.elements[10]) / pm.elements[14];
      cl.multiplyScalar(2 / cl.dot(q)); pm.elements[2] = cl.x; pm.elements[6] = cl.y; pm.elements[10] = cl.z + 1 - .0005; pm.elements[14] = cl.w;
      uMiroir.plan.value.set(n.x, n.y, n.z, -n.dot(P)); uMiroir.portee.value = this.portee;
      const rt0 = renderer.getRenderTarget(), cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
      renderer.setRenderTarget(this.rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, c);
      renderer.setRenderTarget(rt0); renderer.setClearColor(cc, ca);
    }
  }
  const MIROIRS = [
    new Miroir(V(0, 1, 0), V(0, CAISSON.plancher, 0), .15, HAUTE ? .5 : 1 / 3, calqueNiche(0)),
    new Miroir(V(0, 1, 0), V(0, CAISSON.surEtagere, 0), .15, HAUTE ? .5 : 1 / 3, calqueNiche(1)),
  ];
  // la laque : vernis épais sur le bois de l'étagère (Fresnel du vernis, n = 1,5) — le reflet est net au pied du
  // flacon puis se floute et s'éteint en montant ; le bois s'assombrit un peu sous le reflet (il est recouvert)
  const LAQUES = [];
  for (const [i, mi] of MIROIRS.entries()) {
    const y = i ? CAISSON.surEtagere : CAISSON.plancher, z0 = CAISSON.fond, z1 = i ? CAISSON.avantEtagere - .001 : CAISSON.avant + .01;
    const geo = new THREE.PlaneGeometry(LARG - .002, z1 - z0); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, defines: { NET: (+K.mirNet || 0).toFixed(3) },
      uniforms: { tRefl: { value: mi.rt.texture }, mRefl: { value: mi.m }, force: { value: K.laque } },
      vertexShader: `uniform mat4 mRefl; varying vec4 vR; varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vR = mRefl * w; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform sampler2D tRefl; uniform float force; varying vec4 vR; varying vec3 vW;
        void main() {
          vec3 v = normalize(cameraPosition - vW); float F = .04 + .96 * pow(1. - clamp(v.y, 0., 1.), 5.);
          vec2 uv = vR.xy / vR.w; float h = textureLod(tRefl, uv, 0.).a;
          // (laque tendue : le reflet reste net plus haut — NET ,6)
          vec4 r = textureLod(tRefl, uv, .5 + 4.5 * (1. - NET) * h);
          float fade = pow(1. - clamp(r.a, 0., 1.), 1.6 * (1. - .7 * NET));
          float k = clamp(F * force, 0., 1.);
          gl_FragColor = vec4(r.rgb * fade * k, k * .55);
        }`,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
    const o = new THREE.Mesh(geo, mat); o.position.set(CX, y + .0004, (z0 + z1) / 2); o.renderOrder = .5; rangees.add(o); LAQUES.push(o);
  }
  let AVEC_MIROIRS = QUAL !== "basse" && QUAL !== "moyenne";
  // (vus d'en haut, sous le plateau, les étagères ne se voient plus : leurs miroirs non plus)
  function majMiroirs() { if (AVEC_MIROIRS && rangees.visible) for (const m of MIROIRS) m.rendre(renderer, scene, camera); }

  // ---------- le catalogue posé sur le plateau (le prototype : sa place, son angle, sa taille) ----------
  // proportions du livre CSS (--ratio : 1,4144) : au relais, l'un recouvre l'autre exactement
  const CH = .36, CW = CH / 1.4144, CT = .009;
  const couv = tex.load((LIBRERY_BASE + "/assets/img/catalogue/p01.webp")); couv.colorSpace = THREE.SRGBColorSpace; couv.anisotropy = 8;
  const dos = tex.load((LIBRERY_BASE + "/assets/img/catalogue/p02.webp")); dos.colorSpace = THREE.SRGBColorSpace;
  const tranche = new THREE.MeshStandardMaterial({ color: 0xf1ece2, roughness: .9 });
  // couverture : éclairée sur le plateau ; au relais, elle passe peu à peu à l'image même du livre CSS qui la
  // remplace — l'image passée par l'inverse du tone mapping « neutre » de la finition (chevet-photo.js), qui la
  // développe donc à ses valeurs exactes (au grain près) : pas de saut de teinte au fondu
  const uImage = { value: 0 };
  const couvMat = new THREE.MeshStandardMaterial({ map: couv, roughness: .55 });
  couvMat.onBeforeCompile = sh => {
    sh.uniforms.uImage = uImage;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      uniform float uImage;
      vec3 neutreInverse(vec3 y) {                 // Khronos PBR Neutral (three.js r170), à l'envers
        float np = max(y.r, max(y.g, y.b)); vec3 c = y;
        // plafond : le blanc pur rendrait une valeur sans fin (halo, débordements) ; au-delà de 252/255, on s'arrête
        if (np >= .76) { np = min(np, .97); float pk = .52 + .0576 / (1. - np), g = 1. - 1. / (.15 * (pk - np) + 1.); c = (y - np * g) / (1. - g) * pk / np; }
        float m = min(c.r, min(c.g, c.b));
        return c + (m >= .04 ? .04 : sqrt(max(m, 0.) / 6.25) - m);
      }`)
      .replace("#include <map_fragment>", "#include <map_fragment>\n vec3 couvImage = diffuseColor.rgb;")
      .replace("#include <opaque_fragment>", "outgoingLight = mix(outgoingLight, neutreInverse(couvImage), uImage);\n#include <opaque_fragment>");
    lumieresNiche(sh, true);                               // (hors des niches : leurs projecteurs n'y sont pas calculés)
  };
  couvMat.customProgramCacheKey = () => "couv-v2";
  const dosMat = new THREE.MeshStandardMaterial({ map: dos, roughness: .7 });
  if (K.masque) [tranche, dosMat].forEach(spotsDansNiche);
  const cat = new THREE.Mesh(new THREE.BoxGeometry(CW, CT, CH), [tranche, tranche, couvMat, dosMat, tranche, tranche]);
  // posé à la main, et il n'en bouge plus : en haut à gauche du plateau, de biais, il déborde du bord gauche (~3 cm)
  // et du fond (~5 cm). Il porte son ombre sur le bois mais n'en reçoit aucune : la couverture garde ses vraies couleurs
  const POSE = { x: -.15, y: .70 + CT / 2 + .0005, z: -.045, ry: .085 };
  cat.position.set(POSE.x, POSE.y, POSE.z); cat.rotation.y = POSE.ry; cat.castShadow = true; scene.add(cat);
  // ombre de contact sous le catalogue : un liseré serré (~2 mm) le long des tranches, là où le papier touche le bois
  let ombreCat;
  {
    const E = .004, W = CW + 2 * E, H = CH + 2 * E, k = 512 / W;
    const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(H * k); const x = c.getContext("2d");
    x.filter = "blur(" + (.0009 * k).toFixed(1) + "px)"; x.fillStyle = "#fff"; x.fillRect(E * k, E * k, CW * k, CH * k);
    const t = new THREE.CanvasTexture(c);
    ombreCat = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: t, transparent: true, opacity: .35, depthWrite: false,
      // coupée aux arêtes extérieures du plateau (moulure comprise : c'est du bois), jamais dans le vide ; mêmes
      // plans que BORD dans le décor « chevet » du catalogue 3D
      clippingPlanes: [new THREE.Plane(new THREE.Vector3(1, 0, 0), .2732), new THREE.Plane(new THREE.Vector3(0, 0, 1), .2066)] }));
    ombreCat.rotation.set(-Math.PI / 2, 0, POSE.ry); ombreCat.position.set(POSE.x + .0012, .7003, POSE.z - .0016); scene.add(ombreCat);
  }

  // ---------- caméra : un seul mouvement, de trois quarts jusqu'à l'image clé (retours du 13/10) ----------
  // Avant : une plongée jusqu'à l'aplomb du centre du plateau, un arrêt, puis un relais qui glissait, pivotait et
  // reculait — deux élans, et la rotation comme la distance faisaient un aller-retour. Désormais chaque grandeur de la
  // caméra (élévation, azimut, distance, point visé) va droit de sa valeur de départ à celle de l'image clé, sur un
  // seul chemin v ∈ [0, 1] où le glissement vers la droite commence dès le départ. Le chemin est parcouru à vitesse
  // d'écran constante (abscisse curviligne de ce qui se voit : meuble, catalogue, dessus du plateau), et une seule
  // courbe en cosinus l'étale sur tout le défilement 0 → vol : une seule cloche de vitesse, nulle au départ comme à
  // l'arrivée sur la couverture.
  const camera = new THREE.PerspectiveCamera(30, 1, .01, 20);
  // départ (retours du 14/10) : de trois quarts à 22° (et non 35° : la paroi droite ne mange plus le dernier flacon de
  // chaque rang), déjà près des étagères (×,72 de la vue d'ensemble : les deux niches remplissent l'image, les flacons
  // se lisent), visée à hauteur des niches
  // (en portrait, ×,84 : le meuble vu de trois quarts y tient en largeur)
  const T0 = V(K.decalX, .40, 0), AZ0 = .38, EL0 = .03, PRES0 = .72, PRES_PORTRAIT = .84, F = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const Y_CAT = POSE.y + CT / 2;                          // dessus du catalogue
  let R0 = 2, cw = 1, ch = 1;
  // part du chemin faite par chaque grandeur à l'avancée v, réglée pour que le geste se lise d'un seul tenant (relevé
  // sur 1440 × 900, 1280 × 720, 1920 × 1080 et 390 × 844, la première version du 13/10 en regard) : la rotation de
  // face tôt — sinon, en plongée de biais, l'image penche puis se redresse (8° aller et retour, 1° désormais) ; le
  // glissement dès le départ et la hauteur visée régulière — le catalogue va presque en ligne droite de sa place sur
  // le plateau à la couverture (flèche de 5 % de la corde, au lieu d'un L : il descendait, puis partait à droite) ;
  // la montée régulière, qui s'achève avec le reste. Vitesses du catalogue et du plateau : une seule cloche chacune
  // (avant : un replat après le sommet, le second élan).
  // Puis (14/10) la montée plus tôt, sans élan final : l'élévation (v^1,25 auparavant) tournait encore à pleine
  // vitesse à l'arrivée, alors que tout le reste ralentissait ; d'aplomb, tourner autour du point visé ne déplace
  // presque pas le plateau mais fait glisser ce qui est 70 cm plus bas — la façade et les pieds remontaient sous le
  // bord avant en accélérant (0,25 → 0,32 px par px défilé de P 0,39 à 0,47 en 1440 × 900) pendant que plateau et
  // catalogue freinaient : un second mouvement. La montée finit désormais en douceur, la façade passe sous le plateau
  // pendant l'élan (partie à P 0,425), et la fin n'est plus que glissement et approche : ce qui reste du meuble va
  // à la vitesse du plateau, jamais plus vite. Le relèvement en regard, sur six tailles d'écran : catalogue et plateau
  // toujours d'une seule cloche, flèche du trajet du catalogue 3 à 5 % de sa corde, inclinaison de l'image 1,5°
  // au plus sur ordinateur, 2,1° sur téléphone (2,2° et 2,4° auparavant)
  const PART = { el: v => 1 - (1 - v) ** 1.85, az: v => 1 - (1 - v) ** 10, R: v => v, y: v => v, xz: v => 1 - (1 - v) ** 2.2 };
  // l'image clé : la distance qui donne au catalogue la hauteur de la couverture (cv, pixels du canevas) ; le point
  // visé, sous la caméra d'aplomb, décalé dans les axes de l'image (tournés de l'angle du catalogue) pour que le
  // centre du catalogue tombe sur celui de la couverture
  function arrivee(cv) {
    const R = CH * ch / (2 * F * cv.h), c = Math.cos(POSE.ry), sn = Math.sin(POSE.ry);
    const a = ((cv.x + cv.w / 2) / cw * 2 - 1) * R * F * camera.aspect, b = (1 - (cv.y + cv.h / 2) / ch * 2) * R * F;
    return { R, cible: V(POSE.x - c * a + sn * b, Y_CAT, POSE.z + sn * a + c * b) };
  }
  const _c = V(0, 0, 0), _h = V(0, 0, 0);
  function placer(v, A) {
    const el = EL0 + (Math.PI / 2 - EL0) * PART.el(v), az = AZ0 + (POSE.ry - AZ0) * PART.az(v), R = R0 + (A.R - R0) * PART.R(v), g = PART.xz(v);
    _c.set(T0.x + (A.cible.x - T0.x) * g, T0.y + (A.cible.y - T0.y) * PART.y(v), T0.z + (A.cible.z - T0.z) * g);
    _h.set(Math.sin(az), 0, Math.cos(az));                 // direction horizontale vers la caméra
    camera.position.copy(_c).addScaledVector(_h, R * Math.cos(el)); camera.position.y += R * Math.sin(el);
    camera.up.set(0, Math.cos(el), 0).addScaledVector(_h, -Math.sin(el));   // d'aplomb : le haut de l'image = le fond du meuble, tourné de az
    camera.lookAt(_c);
  }
  // le chemin, réglé à l'écran : déplacement moyen, d'un pas de v au suivant, des points témoins du meuble (dessus,
  // façade, flanc), des coins du catalogue et des sommets du dessus du plateau (poids 1 : 1,75 : 1,75), cumulé ; refait
  // quand la couverture ou le canevas changent (l'arrivée en dépend). On y relève aussi le moment où le contenu du
  // caisson, puis le corps du meuble, passent sous le plateau : on cesse de les dessiner là
  const TEMOINS = [];
  for (const x of [-.27, -.135, 0, .135, .27]) for (const z of [-.2, -.1, 0, .1, .2]) TEMOINS.push(V(x, .70, z));
  for (const x of [-.27, 0, .27]) for (const y of [.05, .25, .45, .65]) TEMOINS.push(V(x, y, .21));
  for (const z of [-.2, 0, .2]) for (const y of [.05, .35, .65]) TEMOINS.push(V(.28, y, z));
  const sommets = (g, garder) => { const p = g.attributes.position, l = []; for (let i = 0; i < p.count; i++) { const s = V(p.getX(i), p.getY(i), p.getZ(i)); if (garder(s)) l.push(s); } return l; };
  cat.updateMatrixWorld();
  const COINS_CAT = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, z]) => V(a * CW / 2, CT / 2, z * CH / 2).applyMatrix4(cat.matrixWorld));
  const BASE = [[TEMOINS, 1], [COINS_CAT, 1.75], [sommets(plateau.geometry, s => s.y > .699), 1.75]], POIDS = BASE.reduce((s, [, p]) => s + p, 0);
  // seuls les sommets de l'enveloppe convexe comptent : le contour d'un nuage de points à l'écran, comme son plus grand
  // dépassement hors d'un contour convexe, tombe toujours sur un sommet de l'enveloppe de sa projection, qui est
  // l'image d'un sommet de son enveloppe 3D (CORPS : 1 479 sommets, une centaine sur l'enveloppe) — tracer en devient ~10 fois moins cher
  const coque = l => { const h = new ConvexHull().setFromPoints(l), s = new Set(); for (const f of h.faces) { let e = f.edge; do { s.add(e.head().point); e = e.next; } while (e !== f.edge); } return [...s]; };
  const CONTOUR = coque(sommets(plateau.geometry, () => true));                               // la silhouette du plateau
  const CORPS = coque(sommets(corps.geometry, s => s.y < .6757 && (Math.abs(s.x) > .23 || Math.abs(s.z) > .16)));   // seul le pourtour peut dépasser
  // (sans les plans des caustiques : découpés à la niche dans leur shader, ils débordent du caisson en géométrie)
  const CAISSON_BOITE = (() => { const c = CAUSTIQUES.map(m => [m, m.parent]); c.forEach(([m]) => m.removeFromParent());
    const b = new THREE.Box3().setFromObject(rangees).union(new THREE.Box3().setFromObject(etagere)); c.forEach(([m, p]) => p.add(m)); return b; })();
  FONDS.forEach(f => CAISSON_BOITE.union(new THREE.Box3().setFromObject(f)));
  const CONTENU = [0, 1, 2, 3, 4, 5, 6, 7].map(i => V(i & 1 ? CAISSON_BOITE.max.x : CAISSON_BOITE.min.x, i & 2 ? CAISSON_BOITE.max.y : CAISSON_BOITE.min.y, i & 4 ? CAISSON_BOITE.max.z : CAISSON_BOITE.min.z));
  const _q = V(0, 0, 0);
  const ecran = (p, o = [0, 0]) => { _q.copy(p).project(camera); o[0] = (_q.x + 1) / 2 * cw; o[1] = (_q.y + 1) / 2 * ch; return o; };   // pixels, y vers le haut
  // enveloppe convexe (chaîne monotone, sens trigonométrique) ; dépassement d'un point hors d'elle, en pixels
  function enveloppe(p) {
    p.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), bas = [], haut = [];
    for (const q of p) { while (bas.length > 1 && x(bas[bas.length - 2], bas[bas.length - 1], q) <= 0) bas.pop(); bas.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (haut.length > 1 && x(haut[haut.length - 2], haut[haut.length - 1], q) <= 0) haut.pop(); haut.push(q); }
    return bas.slice(0, -1).concat(haut.slice(0, -1));
  }
  const _e = [0, 0];
  function depasse(H, pts) {
    let d = -Infinity;
    for (const p of pts) {
      const q = ecran(p, _e); let e = -Infinity;
      for (let i = 0; i < H.length; i++) {
        const a = H[i], b = H[(i + 1) % H.length], ex = b[0] - a[0], ey = b[1] - a[1];
        e = Math.max(e, (ey * (q[0] - a[0]) - ex * (q[1] - a[1])) / Math.hypot(ex, ey));   // > 0 : hors du côté
      }
      d = Math.max(d, e);
    }
    return d;
  }
  let chemin = null, avancee = { u: 0, v: 0 };          // avancee : la dernière image (essais : mesure)
  // gardé tant que le canevas n'a pas changé de taille et que la couverture n'a pas bougé d'un demi-pixel : sa mesure
  // varie d'un centième de pixel selon la position du défilement (arrondis de la mise en page), et refaire le chemin
  // pour si peu coûtait une longue tâche à l'arrivée dans la section (l'écart au relais reste d'un centième de pixel)
  function tracer(cv) {
    if (chemin && chemin.cw === cw && chemin.ch === ch && ["x", "y", "w", "h"].every(k => Math.abs(chemin.cv[k] - cv[k]) < .5)) return chemin;
    const A = arrivee(cv), N = 400, S = new Float64Array(N + 1), avant = BASE.map(([l]) => l.map(() => [0, 0])), o = [0, 0];
    const dCorps = new Float64Array(N + 1).fill(Infinity), dContenu = new Float64Array(N + 1).fill(Infinity);
    let bois = null;                                       // le contour du plateau à l'arrivée (pixels, y vers le haut)
    for (let i = 0; i <= N; i++) {
      placer(i / N, A); camera.updateMatrixWorld();
      let d = 0;
      BASE.forEach(([l, poids], j) => {
        let s = 0;
        l.forEach((w, k) => { const a = avant[j][k]; ecran(w, o); if (i) s += Math.hypot(o[0] - a[0], o[1] - a[1]); a[0] = o[0]; a[1] = o[1]; });
        d += poids * s / l.length;
      });
      S[i] = i ? S[i - 1] + d / POIDS + 1e-9 : 0;
      // au-dessus du plateau, ce qui se projette dans son contour est dessous : caché
      if (camera.position.y > .75) { const H = enveloppe(CONTOUR.map(p => ecran(p))); dContenu[i] = depasse(H, CONTENU); dCorps[i] = depasse(H, CORPS); if (i === N) bois = H; }
    }
    // le contenu du caisson (flacons, étagère, fonds) : caché pour de bon à partir de iF (plus rien ne dépasse jusqu'à
    // l'arrivée) ; le corps : il dépasse d'un rien à l'arrivée (la caméra finit presque à l'aplomb du bord gauche, les
    // pieds, plus larges que le dessus, sortent par la parallaxe ; le catalogue 3D le cache aussi), effacé après le
    // contenu, là où il dépasse le moins
    let iF = N; while (iF > 0 && dContenu[iF - 1] < -.5) iF--;
    let iC = iF, m = Infinity;
    for (let i = iF; i <= N; i++) m = Math.min(m, dCorps[i]);
    while (iC < N && dCorps[iC] > Math.max(m, 0) + .1) iC++;
    const L = S[N];
    return chemin = { cv: { x: cv.x, y: cv.y, w: cv.w, h: cv.h }, cw, ch, A, vF: iF / N, vC: iC / N, depasse: dCorps[iC], bois,
      v: u => { const s = u * L; let a = 0, b = N; while (b - a > 1) { const m = (a + b) >> 1; if (S[m] <= s) a = m; else b = m; } return (a + (s - S[a]) / (S[b] - S[a])) / N; } };
  }
  // le catalogue s'efface une fois le livre CSS posé dessus ; vu d'en haut, le contenu du caisson puis le corps du
  // meuble passent sous le plateau : on ne les dessine plus (ni dans les ombres). Sa couverture prend peu à peu l'image
  // du livre (fin du mouvement) ; l'aberration chromatique s'éteint dès que le plateau monte dans l'image (elle
  // éclatait le filet du chanfrein en lignes bleue et magenta, et cernait le catalogue d'un filet que le livre n'a pas) ;
  // le flou d'objectif aussi (d'aplomb, tout le plateau est au point : l'image clé est nette d'un bord à l'autre), et
  // le grain (dans les sombres du noyer, il piquait le dessus d'un bruit gris ; la couverture rejoint ainsi l'image du
  // livre au pixel près, et le plateau celui du décor « chevet » du catalogue 3D, presque sans grain)
  // Le corps passe sous le plateau en fondu, sur la fin (v de vC − .04 à vC, jamais avant que le contenu du caisson
  // ne soit caché : opaque, il reste dans l'image de réfraction des flacons) ; coupé d'un coup, ses pieds, qui dépassent
  // encore du bord avant sur bien des écrans (10 px en 1024 × 768), disparaissaient d'une image à l'autre.
  // Au relais (lv : 0 → 1 de vol à fondu), l'ombre du catalogue 3D s'efface pendant que celle du livre CSS apparaît
  // (style.css), et le catalogue se résorbe sous la couverture — son épaisseur (un filet de tranche dépassait au
  // coin), et ses bords d'un pixel (antialiasés, ils débordaient d'un tiers de pixel celui, net, du livre CSS : un
  // filet clair au bas de la couverture) : quand il disparaît, à fondu, plus rien ne change d'un coup
  let opaciteCorps = 1;
  function catalogue(P, u, v, C, lv) {
    const c = P < PH.fondu, r = v < C.vF, v0 = Math.max(C.vF, C.vC - .04);
    const o = v >= C.vC ? 0 : v <= v0 ? 1 : 1 - lisse((v - v0) / (C.vC - v0)), k = o > 0;
    if (cat.visible !== c || rangees.visible !== r || corps.visible !== k) renderer.shadowMap.needsUpdate = true;
    cat.visible = ombreCat.visible = c; rangees.visible = etagere.visible = bandeau.visible = r; corps.visible = k;
    corps.material = o < 1 ? boisFondu : bois; boisFondu.opacity = opaciteCorps = o;
    ombreCat.material.opacity = .35 * (1 - lv);
    key.shadow.intensity = rim.shadow.intensity = c ? 1 - lv : 1;
    // (les bords, sur la fin seulement : le livre presque opaque cache le bois qu'ils découvrent)
    const e = 1 - .98 * lv, s = 1 - lisse(clamp((lv - .8) / .2)) * 2.2 / Math.min(C.cv.w, C.cv.h); cat.scale.set(s, e, s); cat.position.y = Y_CAT - CT / 2 * e;
    sol.material.opacity = .42 * (1 - lisse(clamp((u - .45) / .35))); sol.visible = sol.material.opacity > 0;   // sans ombre portée : rien à recalculer
    uImage.value = lisse(clamp((u - .7) / .3));
    photo.reglages.aberration = ABERRATION * (1 - lisse(clamp((u - .1) / .35))) * (1 - uImage.value);
    photo.reglages.flou = FLOU * (1 - lisse(clamp((u - .5) / .3)));
    photo.reglages.grain = GRAIN * (1 - lisse(clamp((u - .5) / .3)));
    // le clair-obscur (pied de courbe, virage des noirs, exposition retenue, vignetage appuyé) se lève en même temps :
    // à l'arrivée, la couverture développée rejoint l'image du livre CSS (tone mapping neutre seul)
    const fin = lisse(clamp((u - .5) / .3)), g = photo.reglages;
    g.pied = COURBE * (1 - fin); g.virage = VIRAGE * (1 - fin); g.exposition = EXPO + (1 - EXPO) * fin; g.vignette = VIGNETTE + (VIGNETTE_FIN - VIGNETTE) * fin;
  }
  // mise au point : sur la rangée de devant (les étiquettes) au départ, puis elle glisse sur le catalogue quand la
  // caméra monte, et y reste
  const NET0 = V(K.decalX, (CAISSON.plancher + CAISSON.surEtagere) / 2 + .064, .058), NET1 = V(POSE.x, .70 + CT, POSE.z);
  const _f = V(0, 0, 0);
  function miseAuPoint(v) {
    _f.copy(NET0).lerp(NET1, ease(clamp((PART.el(v) - .1) / .5)));
    camera.updateMatrixWorld(); return Math.max(.05, -_f.applyMatrix4(camera.matrixWorldInverse).z);
  }

  // ---------- rendu photographique (chevet-photo.js) : réglages du prototype ----------
  const photo = new Photo(renderer, scene, camera, { mobile: MOBILE, tm: TONE.neutral });
  // clair-obscur : pied de courbe creusé (noirs veloutés, sans les boucher), virage des noirs profonds, vignetage plus
  // présent, grain fin, halation retenue sur les seuls éclats ; aberration à peine (sur valeurs plafonnées)
  const ABERRATION = .08, FLOU = 28, GRAIN = .034, COURBE = .07, VIRAGE = .55, EXPO = .95, VIGNETTE = .2, VIGNETTE_FIN = .12;
  Object.assign(photo.reglages, { virage: VIRAGE, exposition: EXPO, flou: FLOU, flouMax: 4, bloom: .07, halo: .03, seuil: 2.6, vignette: VIGNETTE, grain: GRAIN, aberration: ABERRATION, pied: COURBE, ao: .6 });
  photo.ombresSeules = DRAPEAUX;
  if (Q.has("etapes")) photo.etapes = Math.max(1, +Q.get("etapes") || 1);   // essais, films : moins d'étapes d'affinage

  // budget de pixels de l'image en mouvement (le reste — l'affinage — à pleine définition)
  const majEch = () => { photo.ech = Math.min(1, Math.sqrt(BUDGET / (cw * ch * renderer.getPixelRatio() ** 2))); };
  function resize() {
    cw = Math.max(1, canvas.clientWidth); ch = Math.max(1, canvas.clientHeight);
    renderer.setSize(cw, ch, false); camera.aspect = cw / ch; camera.updateProjectionMatrix(); photo.setSize(cw, ch); majEch();
    const dpr = renderer.getPixelRatio();
    for (const m of MIROIRS) m.setSize(cw * dpr, ch * dpr);
    // vue de départ : près des étagères (×,72 de la vue où tout le meuble — sphère de ~0,47 m — tient dans l'image)
    R0 = .47 / Math.sin(Math.atan(F * Math.min(1, camera.aspect))) * .98 * (camera.aspect < 1 ? PRES_PORTRAIT : PRES0);
    // affinage : au-delà de 3 Mpx (Retina en densité 2), une étape = un seul rendu (32 étapes) — jamais plus de ~60 ms
    // de travail en file quand le défilement reprend
    photo.taa.sampleLevel = MOBILE || cw * ch * dpr * dpr > 3e6 ? 0 : 1;
    if (!Q.has("etapes") && QUAL !== "basse") photo.etapes = photo.taa.sampleLevel ? 16 : 32;
  }
  resize();

  // ---------- qualité en marche : si l'image en mouvement reste lente, le budget de pixels baisse, puis la qualité ----------
  // 12 images en mouvement mesurées, après 3 images de mise en route : lecture d'un pixel avant (le GPU a fini l'image
  // précédente) et après — le temps réel de l'image (÷ 1,1 : CPU et GPU en série). (Les requêtes de chronométrage du
  // GPU comptent aussi, sous ANGLE / Metal, le travail encore en file : deux fois trop.) Une baisse n'est décidée que
  // sur deux séries, d'après la meilleure des deux médianes (une rafale d'un autre onglet ne décide pas seule) :
  // au-delà de SEUIL ms, budget × (SEUIL / médiane)² (jusqu'à BUDGET_MIN), nouvelle mesure ; au plancher, qualité
  // basse. Sans recompiler (les ombres restent), sans à-coup.
  const MESURE = { vues: 0, t: [], series: [], fini: QUAL === "basse" || Q.has("qualite") || Q.get("adapte") === "0" }, _px = new Uint8Array(4), gl = renderer.getContext();
  const SEUIL = MOBILE ? 36 : 30;
  function passerBasse() {
    QUAL = "basse"; AVEC_MIROIRS = false; LAQUES.forEach(o => o.visible = false);
    for (const j of LF_VERRE) if (j) j.lfForce.value = 0;
    verreEpais(false); dispersee = null; dispersion(false);
    photo.etapes = Q.has("etapes") ? photo.etapes : 8; photo.sansAO = true;
  }
  function mesurer(ms) {
    MESURE.t.push(ms); if (MESURE.t.length < 12) return;
    MESURE.series.push(MESURE.t.sort((a, b) => a - b)[6] / 1.1); MESURE.t = []; MESURE.vues = 0;
    const med = Math.min(...MESURE.series), lent = med > SEUIL;
    if (lent && MESURE.series.length < 2) return;
    MESURE.series = [];
    if (lent && BUDGET > BUDGET_MIN + 1) { BUDGET = Math.max(BUDGET_MIN, BUDGET * Math.min(.8, (SEUIL / med) ** 2)); majEch(); }
    else if (lent) { passerBasse(); MESURE.fini = true; }
    else MESURE.fini = true;
    ctl.qualite = { med: +med.toFixed(1), budget: BUDGET, ech: +photo.ech.toFixed(3), qualite: QUAL, fini: MESURE.fini };
  }
  if (QUAL === "basse") passerBasse();
  // l'image en mouvement : verre simple face, sans dispersion, filets des arêtes adoucis, réfraction à mi-définition
  function rendreVif() { verreEpais(false); dispersion(false); uArete.value = K.areteVif; renderer.transmissionResolutionScale = REFR.vif; majMiroirs(); photo.vif(); }
  function imageVive(mouvement) {
    if (!mouvement || MESURE.fini || ++MESURE.vues <= 3) { rendreVif(); return; }
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, _px);
    const t0 = performance.now(); rendreVif();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, _px); mesurer(performance.now() - t0);
  }

  // la couverture du livre fermé : mesurée tant que le livre est fermé, gardée ensuite ; sans mesure (livre déjà
  // ouvert au chargement, ou après un redimensionnement), déduite de la scène : centrée, d'une page de large
  let cvMesure = null;
  const leaf = () => track.querySelector(".flip__leaf");
  function couverture(P) {
    const c = canvas.getBoundingClientRect();
    if (P <= PH.livre && leaf()) { const b = leaf().getBoundingClientRect(); if (b.width) return cvMesure = { x: b.left - c.left, y: b.top - c.top, w: b.width, h: b.height }; }
    if (cvMesure) return cvMesure;
    const s = track.querySelector(".flip__stage").getBoundingClientRect(), pg = track.querySelector(".flip__r"), w = pg.offsetWidth, h = pg.offsetHeight;
    return { x: s.left + s.width / 2 - w / 2 - c.left, y: s.top + s.height / 2 - h / 2 - c.top, w, h };
  }

  // rendu à la demande : une image quand l'état de la scène change (défilement, taille, texture arrivée) ; à l'arrêt,
  // quelques images d'affinage (≈ 160 ms après le dernier mouvement), puis plus rien. Hors de l'écran : rien.
  // l'ombre du livre CSS (style.css, .flip--chevet .flip__r::before) coupée au contour du plateau à l'arrivée : sur le
  // bois seulement, jamais sur le papier là où le livre déborde (comme le décor « chevet » du catalogue 3D). Polygone
  // dans le repère de la page de droite, livre fermé ; le livre ouvert, la page glisse d'une demi-page (--ouvre, main.js)
  let boisPose = null;
  function ombreSurBois(C, cv) {
    boisPose = C; const r = track.querySelector(".flip__r"); if (!r || !C.bois) return;
    r.style.setProperty("--bois", `polygon(${C.bois.map(([x, y]) => `calc(${(x - cv.x).toFixed(1)}px - var(--pw) * var(--ouvre, 0) / 2) ${(ch - y - cv.y).toFixed(1)}px`).join()})`);
  }
  function frame(force) {
    pend = 0; if (ctl.arret || (!vu && !force)) return;
    const r = track.getBoundingClientRect(); P = clamp(-r.top / (r.height - innerHeight));
    // au-delà du vol, le catalogue est sous la couverture du livre (seule son ombre s'efface, lv), puis effacé : l'image
    // ne change plus
    const Pe = P < PH.vol ? P : P < PH.fondu ? PH.vol : PH.fondu, lv = clamp((P - PH.vol) / (PH.fondu - PH.vol)), cv = couverture(P);
    const cle = [Pe.toFixed(5), lv.toFixed(3), cv.x.toFixed(2), cv.y.toFixed(2), cv.w.toFixed(2), cv.h.toFixed(2), cw, ch].join();
    if (invalide || cle !== dernier) {
      const invalideAvant = invalide;
      invalide = false; dernier = cle;
      // un seul mouvement : la part u du chemin faite (cosinus sur 0 → vol), à l'avancée v qui la donne à l'écran
      const C = tracer(cv), u = .5 - Math.cos(Math.PI * clamp(Pe / PH.vol)) / 2, v = C.v(u);
      placer(v, C.A); avancee = { u, v };
      if (C !== boisPose) ombreSurBois(C, cv);
      catalogue(Pe, u, v, C, lv); photo.reglages.focus = miseAuPoint(v);
      camera.updateMatrixWorld(); majLF(camera.position);    // les cartes du studio qui suivent l'objectif
      imageVive(!force && !invalideAvant); derniereVive = performance.now(); affinage = true; etat("vif");
      kick();                                              // l'image suivante dira si le défilement continue
      return;
    }
    if (!affinage) return;
    // l'arrêt, c'est l'arrêt du défilement (pas seulement de l'image : figée sous le livre, elle ne change plus)
    const reste = 160 - (performance.now() - Math.max(derniereVive, dernierDefil));
    if (reste > 0) { clearTimeout(minuterie); minuterie = setTimeout(kick, reste); return; }
    // à l'arrêt : verre épais, dispersion, filets des arêtes entiers, réfraction pleine
    verreEpais(true); dispersion(true); uArete.value = 1; renderer.transmissionResolutionScale = REFR.net();
    affinage = photo.affiner();
    if (affinage) kick(); else etat("net");
  }

  const surDefil = () => { dernierDefil = performance.now(); kick(); };
  addEventListener("scroll", surDefil, { passive: true });
  // nouvelle taille : après la reconstruction du livre (main.js, 150 ms), nouvelle mesure de la couverture
  let rt = 0;
  const surTaille = () => { clearTimeout(rt); rt = setTimeout(() => { resize(); cvMesure = null; invalider(); }, 220); };
  const ro = new ResizeObserver(() => { if (canvas.clientWidth !== cw || canvas.clientHeight !== ch) surTaille(); });
  ro.observe(fond);
  addEventListener("resize", surTaille);
  const io = new IntersectionObserver(([e]) => { vu = e.isIntersecting; if (vu) invalider(); });
  io.observe(track);
  const perdu = e => { if (ctl.arret) return; e.preventDefault(); fin(); PH.perdu?.(); };
  canvas.addEventListener("webglcontextlost", perdu);
  function fin() {
    ctl.arret = true; cancelAnimationFrame(pend); clearTimeout(minuterie); clearTimeout(rt);
    removeEventListener("scroll", surDefil); removeEventListener("resize", surTaille); ro.disconnect(); io.disconnect();
    canvas.removeEventListener("webglcontextlost", perdu);
  }
  ctl.nettoyer.push(fin);

  // tout est arrivé (textures comprises), shaders compilés : première image, puis la scène remplace l'affiche
  await new Promise(r => attente ? (vide = r) : r());
  // textures envoyées à la carte une à une, chacune dans sa tâche : pas de longue tâche pendant que la page défile
  const textures = new Set();
  scene.traverse(o => [].concat(o.material || []).forEach(m => { for (const k in m) if (m[k]?.isTexture && !m[k].isRenderTargetTexture) textures.add(m[k]); }));
  for (const t of textures) { renderer.initTexture(t); await souffle(); }
  renderer.shadowMap.needsUpdate = true;
  // programmes compilés en parallèle avant la première image, dans les conditions du rendu : vers une cible à sortie
  // linéaire (photo.rtScene, pas l'écran), pour les deux régimes — en mouvement (verre simple face, sans dispersion) et
  // à l'arrêt (verre épais, dispersion) —, chacun d'abord avec la face arrière des matériaux transmissifs doubles (la
  // passe de transmission de three.js les rend d'abord ainsi) ; le bois transparent du fondu du corps, porté le temps
  // de la compilation par un double invisible du corps (mêmes réglages : ombres reçues) ; puis les passes de la finition
  const fantome = new THREE.Mesh(corps.geometry, boisFondu); fantome.receiveShadow = fantome.castShadow = true; fantome.visible = false; scene.add(fantome);
  // par petits lots (six matières à la fois, une pause entre deux : pas de longue tâche), chaque matière portée par
  // un maillage de sa propre géométrie (ses attributs décident aussi du programme), avec les lumières de la scène ;
  // seulement ce que voit l'objectif (calque 0) — les doublures des miroirs, sans lumières, se compilent à leur tour
  const reps = new Map();
  scene.traverse(o => { if (o.isMesh && o.layers.test(camera.layers)) for (const m of [].concat(o.material)) if (m && !reps.has(m)) reps.set(m, o); });
  const tous = [...reps], lot = new THREE.Scene();
  for (const repos of [false, true]) {
    dispersion(repos); verreEpais(repos);
    for (const arriere of [true, false]) {
      const liste = arriere ? tous.filter(([m]) => m.transmission > 0 && m.side === THREE.DoubleSide) : tous;
      for (let i = 0; i < liste.length; i += 6) {
        const part = liste.slice(i, i + 6);
        for (const [m, o] of part) { if (arriere) { m.side = THREE.BackSide; m.needsUpdate = true; } lot.add(new THREE.Mesh(o.geometry, m)); }
        renderer.setRenderTarget(photo.rtScene);
        await renderer.compileAsync(lot, camera, scene).catch(() => {});
        if (arriere) for (const [m] of part) { m.side = THREE.DoubleSide; m.needsUpdate = true; }
        lot.clear(); await souffle();
      }
    }
  }
  verreEpais(false); dispersion(false);
  renderer.setRenderTarget(null); scene.remove(fantome);
  await photo.prechauffer();
  if (ctl.arret) throw new Error("chevet arrêté");
  pret = true; frame(true);
  // mesure du relais (essais) : coins de la couverture 3D et du livre CSS, en pixels de la fenêtre
  const mesure = () => {
    const c = canvas.getBoundingClientRect(), b = leaf()?.getBoundingClientRect();
    camera.updateMatrixWorld();
    const gl = COINS_CAT.map(w => {                         // le catalogue à sa place (sans la résorption du relais)
      const p = w.clone().project(camera);
      return [c.left + (p.x + 1) / 2 * c.width, c.top + (1 - p.y) / 2 * c.height];
    });
    const css = b && [[b.left, b.top], [b.right, b.top], [b.right, b.bottom], [b.left, b.bottom]];
    // points témoins à l'écran (vitesse du mouvement) et avancée sur le chemin
    const pts = TEMOINS.map(w => { const p = w.clone().project(camera); return [c.left + (p.x + 1) / 2 * c.width, c.top + (1 - p.y) / 2 * c.height]; });
    const etat = { ...avancee, vF: chemin?.vF, vC: chemin?.vC, depasse: chemin?.depasse, flacons: rangees.visible, corps: corps.visible, opaciteCorps };
    return { P, visible: cat.visible, gl, css, pts, etat, ecart: css ? Math.max(...gl.flatMap((g, i) => [Math.abs(g[0] - css[i][0]), Math.abs(g[1] - css[i][1])])) : null };
  };
  // l'image clé, pour le catalogue 3D ouvert depuis la section (main.js, initLecteur : décor « chevet » du catalogue) :
  // objectif, pose du catalogue sur le plateau, écart entre le dessus de sa couverture et celui du plateau, vignetage
  const DESSUS = new THREE.Box3().setFromObject(plateau).max.y;
  const cle = () => ({ fov: camera.fov, pose: { x: POSE.x, z: POSE.z, ry: POSE.ry }, hc: CH, ecart: Y_CAT - DESSUS, vignette: VIGNETTE_FIN });
  fond.chevet = ctl;
  return Object.assign(ctl, { mesure, cle, invalider, dispose: () => { fin(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); } });
}
