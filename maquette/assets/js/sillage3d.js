/* Le sillage, heure par heure : le cadran solaire, épuré.
   Le vrai flacon du parfum (modèle de /parfum, mêmes matières que la visionneuse) se dresse au centre
   d'un cercle fin coupé en trois arcs : tête, cœur, fond. Un soleil bas tourne avec le temps ;
   l'ombre franche du flacon est la seule aiguille : son bout touche le cercle, un point d'or l'y marque,
   et l'arc qu'elle désigne passe à l'or. Le flacon et l'appareil restent à leur place : seuls le soleil et l'ombre tournent.
   L'onde colorée : un lavis sur le papier, le long du cercle, peint par le temps ; ses teintes sont celles
   des notes du moment (voir « les couleurs du sillage »), la part passée sèche derrière comme un sillage.
   À la vaporisation (0 min), une première touche translucide est déjà posée sur l'arc de la tête.
   Rendu à la demande uniquement (jamais de boucle au repos), en pause hors de l'écran.
   mount(el, handle, t, { notes }) → { ready, setTime(t01), setPerfume(handle, notes), dispose() } ;
   t01 = position du curseur ; notes : { tete, coeur, fond }. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

/* --- les couleurs du sillage ---------------------------------------------------------------
   Chaque note a une teinte de la maison : poudrée, jamais vive, accordée au papier (--paper) et à l'or (--gold).
   Shopify : un métaobjet « note » (clé, famille, nuance, teinte, chaleur), relié aux parfums ; ici en dur en attendant.
   clé : un mot du nom de la note, sans accents ni majuscules ; la première clé contenue dans le nom l'emporte
   (du plus précis au plus général : « eau de jasmin » avant « jasmin », « lait d amande » avant « lait » et « amande »).
   chaleur : 0 = la plus fraîche, la plus volatile … 1 = la plus chaude, la plus tenace ; elle range les teintes d'une phase.
   Familles : frais (hespéridé, aromatique, aquatique, vert), floral, fruité, épicé, gourmand, ambré, boisé, cuir, musqué. */
// [clé, famille, nuance, teinte, chaleur] — dans l'ordre de recherche : la première clé contenue dans le nom l'emporte
export const NOTES = [
  ['eau de jasmin', 'frais', 'aquatique', '#c3e0e1', 0.20],             // Eau de jasmin
  ['neroli', 'frais', 'hespéridé fleuri', '#dae6c1', 0.18],             // Néroli
  ['bergamote', 'frais', 'hespéridé', '#e2e3a6', 0.05],                 // Bergamote
  ['fleur d oranger', 'floral', 'fleur blanche', '#ecdab7', 0.42],      // Fleur d’oranger
  ['orange', 'frais', 'hespéridé', '#f2d195', 0.12],                    // Orange
  ['sauge', 'frais', 'aromatique', '#afc5aa', 0.25],                    // Sauge sclarée
  ['cardamome', 'épicé', 'épice fraîche', '#b1d0bf', 0.30],             // Cardamome
  ['poire', 'fruité', 'fruit vert', '#d5e0ad', 0.20],                   // Poire
  ['pomme', 'fruité', 'fruit vert', '#c1dba8', 0.22],                   // Pomme
  ['pistache', 'gourmand', 'gourmand vert', '#bdcba1', 0.60],           // Pistache grillée
  ['mangue', 'fruité', 'fruit solaire', '#f0c485', 0.40],               // Mangue
  ['peche', 'fruité', 'fruit solaire', '#f1c7ac', 0.38],                // Pêche
  ['abricot', 'fruité', 'fruit solaire', '#eab489', 0.48],              // Abricot
  ['framboise', 'fruité', 'baie', '#cf8b9b', 0.38],                     // Framboise
  ['fraise', 'fruité', 'baie', '#dc9a99', 0.36],                        // Fraise
  ['cassis', 'fruité', 'baie', '#987292', 0.32],                        // Cassis
  ['myrtille', 'fruité', 'baie', '#8e8eb3', 0.35],                      // Myrtille
  ['grenade', 'fruité', 'baie', '#c07c82', 0.38],                       // Grenade
  ['prune sechee', 'fruité', 'fruit confit', '#9d7282', 0.60],          // Prune séchée
  ['prune', 'fruité', 'fruit confit', '#a97d95', 0.55],                 // Prune
  ['jasmin', 'floral', 'fleur blanche', '#ede3c2', 0.42],               // Jasmin
  ['tubereuse', 'floral', 'fleur blanche', '#eddbc5', 0.48],            // Tubéreuse
  ['ylang', 'floral', 'fleur blanche', '#e6d9a9', 0.50],                // Ylang-ylang
  ['orchidee', 'floral', 'fleur poudrée', '#e0bbcf', 0.45],             // Orchidée
  ['heliotrope', 'floral', 'fleur poudrée', '#d6c7e2', 0.55],           // Héliotrope
  ['osmanthus', 'floral', 'fleur fruitée', '#edc197', 0.55],            // Osmanthus
  ['violette', 'floral', 'fleur poudrée', '#b0a3cc', 0.45],             // Violette
  ['iris', 'floral', 'fleur poudrée', '#bdbad3', 0.50],                 // Iris pallida
  ['rose', 'floral', 'fleur rosée', '#e5b6bc', 0.45],                   // Rose
  ['poivre', 'épicé', 'épice', '#aa9b93', 0.55],                        // Poivre
  ['safran', 'épicé', 'épice', '#d69d6b', 0.65],                        // Safran
  ['cannelle', 'épicé', 'épice chaude', '#b68168', 0.72],               // Cannelle
  ['lait d amande', 'gourmand', 'lacté', '#edddc6', 0.60],              // Lait d’amande
  ['amande grillee', 'gourmand', 'grillé', '#caaf93', 0.72],            // Amande grillée
  ['amande', 'gourmand', 'lacté', '#eadac3', 0.60],                     // Amande
  ['sesame', 'gourmand', 'grillé', '#d0bb96', 0.68],                    // Sésame
  ['chocolat blanc', 'gourmand', 'lacté', '#eed9b8', 0.66],             // Chocolat blanc
  ['chantilly', 'gourmand', 'lacté', '#ebe3cd', 0.62],                  // Crème chantilly
  ['lait', 'gourmand', 'lacté', '#e9e1cd', 0.62],                       // Lait
  ['caramel', 'gourmand', 'caramel', '#c3936a', 0.80],                  // Caramel salé
  ['toffee', 'gourmand', 'caramel', '#b58767', 0.82],                   // Toffee
  ['cassonade', 'gourmand', 'caramel', '#be9a76', 0.80],                // Cassonade
  ['praline', 'gourmand', 'caramel', '#b58f7b', 0.80],                  // Praline
  ['tahiti', 'gourmand', 'vanillé', '#eddec2', 0.74],                   // Vanille de Tahiti
  ['tahitensis', 'gourmand', 'vanillé', '#eddec2', 0.74],               // Vanille de Tahiti
  ['planifolia', 'gourmand', 'vanillé', '#cbab84', 0.85],               // Vanille Planifolia
  ['vanille', 'gourmand', 'vanillé', '#e7d8b4', 0.76],                  // Vanille
  ['tonka', 'gourmand', 'vanillé', '#c0a27e', 0.82],                    // Fève tonka
  ['benjoin', 'ambré', 'résine', '#c59b77', 0.90],                      // Benjoin Siam
  ['myrrhe', 'ambré', 'résine', '#ab897e', 0.86],                       // Myrrhe
  ['ambroxan', 'ambré', 'ambré boisé', '#d4c5af', 0.72],                // Ambroxan
  ['ambre', 'ambré', 'ambre', '#d3a470', 0.92],                         // Ambre
  ['cuir', 'cuir', 'cuir', '#a6806c', 0.90],                            // Cuir
  ['santal', 'boisé', 'bois crémeux', '#d5b7a6', 0.78],                 // Santal
  ['dreamwood', 'boisé', 'bois crémeux', '#d5c0ad', 0.76],              // Dreamwood
  ['cedre', 'boisé', 'bois sec', '#b3a692', 0.74],                      // Cèdre
  ['cashmeran', 'boisé', 'bois musqué', '#cab5b0', 0.75],               // Cashmeran
  ['mousse de chene', 'boisé', 'mousse', '#899075', 0.80],              // Mousse de chêne
  ['musc', 'musqué', 'musc', '#e6dacd', 0.70],                          // Musc blanc
];
const PAPIER = '#f8f5ef';
const plat = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/[’'`]/g, ' ').replace(/\s+/g, ' ').trim();
export const noteDe = nom => { const p = plat(nom); return NOTES.find(([k]) => p.includes(k)) || null; };

// OKLab : on mélange les teintes comme l'œil les voit (pas de gris boueux entre deux couleurs)
const lin = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const gam = c => c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055;
function lab(hex) {
  const n = parseInt(hex.slice(1), 16), r = lin((n >> 16 & 255) / 255), g = lin((n >> 8 & 255) / 255), b = lin((n & 255) / 255);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
function rvb([L, a, b]) {
  const l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3, s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s]
    .map(c => Math.round(Math.min(1, Math.max(0, gam(c))) * 255));
}
const hex = c => '#' + rvb(c).map(x => x.toString(16).padStart(2, '0')).join('');
const melange = (p, q, k) => p.map((x, i) => x + (q[i] - x) * k);
const ecart = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
// moyenne de plusieurs teintes, sa chroma rendue à la moyenne des chromas (le mélange ne se ternit pas).
// Si leurs teintes s'opposent (un lilas et un vert…), la moyenne serait un gris qu'on recolorerait au hasard (un kaki) :
// on garde alors une seule de ces notes, celle qui s'écarte le plus des deux bouts de la phase (sa gamme reste entière)
function moyenne(cs, bouts) {
  const m = cs.reduce((s, c) => s.map((x, i) => x + c[i] / cs.length), [0, 0, 0]);
  const ch = cs.reduce((s, c) => s + Math.hypot(c[1], c[2]), 0) / cs.length, r = Math.hypot(m[1], m[2]) / (ch || 1);
  if (r < .55) return cs.reduce((g, c) => { const e = Math.min(...bouts.map(b => ecart(c, b))); return e > g[0] ? [e, c] : g; }, [-1, cs[0]])[1];
  return [m[0], m[1] / (r || 1), m[2] / (r || 1)];
}
// une note presque blanche (lait, musc, fleurs blanches) doit encore se lire sur le papier : clarté plafonnée
const presence = c => {
  if (c[0] <= .855) return c;
  const ch = Math.hypot(c[1], c[2]), k = ch < .04 ? .04 / (ch || 1) : 1;   // et un soupçon de crème, plutôt qu'un gris
  return ch ? [.855, c[1] * k, c[2] * k] : [.855, .012, .038];
};

// les teintes d'une phase : 2 ou 3 repères, de la plus fraîche à la plus chaude (l'ordre de l'évaporation)
export function degrade(liste) {
  const vues = new Set(), ts = [];
  for (const n of String(liste || '').split(/\s*[,·]\s*/)) { const e = noteDe(n); if (e && !vues.has(e[3])) { vues.add(e[3]); ts.push(e); } }
  ts.sort((a, b) => a[4] - b[4]);                          // tri stable : à chaleur égale, l'ordre du parfumeur
  let st = ts.map(e => lab(e[3]));
  if (!st.length) st = [lab('#d9c9b3')];                    // aucune note connue : un voile du papier, doré
  if (st.length > 3) st = [st[0], moyenne(st.slice(1, -1), [st[0], st[st.length - 1]]), st[st.length - 1]];
  if (st.length === 1) st = [melange(st[0], lab(PAPIER), .35), st[0]];
  return st.map(c => hex(presence(c)));
}
export const degrades = n => ({ tete: degrade(n.tete), coeur: degrade(n.coeur), fond: degrade(n.fond) });

// la bande de couleur le long de la course (s de 0 à 1, comme le curseur) : RGBA 8 bits, sRGB, N × 1
// chaque phase étale ses repères sur son arc ; d'une phase à l'autre, les teintes se fondent (mouillé sur mouillé)
export const PHASES_S = [0, .125, .75, 1];
export function bande(g, N = 256) {
  const rep = [];
  [g.tete, g.coeur, g.fond].forEach((st, j) => { const a = PHASES_S[j], b = PHASES_S[j + 1];
    st.forEach((h, i) => rep.push([a + (b - a) * (.14 + .72 * i / (st.length - 1)), lab(h)])); });
  const out = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1); let j = 0;
    while (j < rep.length - 2 && s > rep[j + 1][0]) j++;
    let k = Math.min(1, Math.max(0, (s - rep[j][0]) / (rep[j + 1][0] - rep[j][0]))); k = k * k * (3 - 2 * k);
    out.set([...rvb(melange(rep[j][1], rep[j + 1][1], k)), 255], i * 4);
  }
  return out;
}
/* --- fin des couleurs du sillage --- */

const DIR = '/parfum/';
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// mètres ; le flacon fait 135 mm de haut, 63 × 48 mm au sol
const R = .106;                   // le cercle : le bout de l'ombre s'y pose
// la course, comme le curseur, de gauche à droite : de l'arrière gauche à l'arrière droit en passant devant ;
// le cercle reste ouvert derrière le flacon. Angle au sol (x, z) : π = gauche, π/2 = devant, 0 = droite.
// Tournée d'un cran vers la droite (ROT) : au milieu de la course l'ombre part en diagonale, jamais droit vers
// le spectateur, où elle prolongerait le flacon comme un reflet
const ROT = -.38, A0 = Math.PI * 1.25 + ROT, A1 = -Math.PI * .25 + ROT;
const ang = t => A0 + (A1 - A0) * t;
// phases, en position du curseur (la même règle que le texte) : tête jusqu'à 30 min, cœur jusqu'à 4 h, fond ensuite
const PHASES = [['Tête', 0, .125], ['Cœur', .125, .75], ['Fond', .75, 1]];
const phase = t => t < .125 ? 0 : t < .75 ? 1 : 2;
const VUE = 62;                   // plongée de l'appareil (degrés) : le cercle se lit presque rond
const ETIRE = 1 / Math.sin(THREE.MathUtils.degToRad(VUE));   // une profondeur au sol, vue d'en haut, se raccourcit d'autant
// lumière basse et chaude, qui se réchauffe à peine avec les heures ; l'ombre la suit
const SOLEIL = [[0, '#fff0de'], [1, '#ffd6aa']];
const OMBRE = [[0, '#2c2119'], [1, '#341f0f']];

const rampe = (stops, t, out) => out.set(stops[0][1]).lerp(new THREE.Color(stops[1][1]), Math.min(1, Math.max(0, t)));

/* --- le lavis du cadran : l'onde colorée ---------------------------------------------------------
   Un plan posé sous les filets ; tout y est fonction du curseur (uT) : rien ne bouge au repos.
   s = position le long de la course, dans l'unité du curseur. Le front de l'onde est au bout de l'ombre (s = uT) :
   l'ombre est le pinceau. Derrière lui, la couleur des notes de chaque moment sèche en une trace plus claire ;
   devant, le papier reste blanc. La vaporisation y est déjà posée : une touche sur l'arc de la tête, et sa moucheture.
   Bord organique, auréole du lavis séché, halo qui s'élargit en s'effaçant, grain du papier dans le pigment seulement. */
const BRUIT = /* glsl */`
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float bruit(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1., 0.)), u.x), mix(h21(i + vec2(0., 1.)), h21(i + 1.), u.x), u.y); }`;
const LAVIS_VERT = /* glsl */`
varying vec2 vSol;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.);
  vSol = w.xz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const LAVIS_FRAG = /* glsl */`
uniform float uT, uFort, uGrain;
uniform vec2 uGraine;
uniform sampler2D uBande;
varying vec2 vSol;
#define RC ${(R - .0008).toFixed(4)}
#define A0 ${A0.toFixed(5)}
#define COURSE ${(A0 - A1).toFixed(5)}
${BRUIT}
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * bruit(p); p = p * 2.03 + 17.1; a *= .5; } return v / .9375; }
void main() {
  float r = length(vSol), dr0 = r - RC;
  if (abs(dr0) > .032) discard;
  // s : la position le long de la course, comme le curseur (0 = vaporisation, 1 = 8 h) ; derrière le flacon, < 0 ou > 1
  float s = mod(A0 - atan(vSol.y, vSol.x), 6.2831853) / COURSE;
  if (s > 1.1667) s -= 1.3333;
  if (s < -.04 || s > 1.04 || (s > uT + .05 && s > .2)) discard;        // rien à peindre : l'avenir reste blanc
  // le bruit : un lavis, pas un trait
  vec2 q = vSol * 70. + uGraine;
  vec2 w = vec2(fbm(q), fbm(q + 5.2)) - .5;
  float n = fbm(vSol * 150. + w * 1.8 + uGraine * 1.7);               // bord organique (≈ 6 mm)
  float n2 = fbm(vSol * 40. + uGraine * 2.3);                         // flaques de pigment (≈ 25 mm)
  // l'âge de la couleur à cet endroit (en unités du curseur) : fraîche au front, sèche derrière
  float age = max(0., uT - s);
  float frais = exp(-age / .06);
  float vif = mix(.5, 1., exp(-age / .25));                           // .5 : la trace sèche qui demeure
  float depart = smoothstep(0., .004, uT);
  float pose = 1. - smoothstep(.115, .16, s + (n2 - .5) * .05);          // la touche de la vaporisation couvre l'arc de la tête
  float front = (1. - smoothstep(uT - .012, uT + .02, s + (n - .5) * .03)) * depart;
  float couvre = max(front, pose) * smoothstep(-.016, .008, s + (n2 - .5) * .014) * (1. - smoothstep(.985, 1.025, s + (n2 - .5) * .014));
  // la goutte au bout du pinceau : le front s'élargit et déborde vers l'extérieur, hors de l'ombre
  float bout = exp(-pow((s - uT) / .022, 2.)) * depart;
  // la touche seule (pas encore le pinceau) : un vrai lavis, le cœur clair et le bord séché plus soutenu ;
  // un peu plus large au départ, elle se resserre quand le pinceau repasse dessus
  float poseSeule = pose * (1. - front);
  float large = s < .14 ? 1.05 - .2 * smoothstep(0., .3, uT) : 1.;
  float wl = mix(.0058, .0085, frais) * large + .003 * bout;
  float dr = dr0 - .003 * bout;
  float forme = 1. - abs(dr) / wl + (n - .5) * .45;
  float c = smoothstep(0., .22, forme) * couvre;
  float aureole = smoothstep(0., .08, forme) * (1. - smoothstep(.08, .32, forme)) * couvre;   // le bord plus soutenu du lavis séché
  // l'onde : un halo qui s'élargit en s'effaçant derrière le front
  float aw = .011 + .016 * (1. - exp(-age / .1));
  float onde = exp(-(dr * dr) / (aw * aw)) * exp(-age / .12) * couvre * (1. - smoothstep(.022, .032, abs(dr)));
  // la moucheture de la vaporisation : de fines gouttes posées autour de l'arc de la tête
  vec2 g = vSol * 900. + uGraine, cel = floor(g);
  float hg = h21(cel), dg = length(g - cel - vec2(h21(cel + vec2(7.1, 3.3)), h21(cel + vec2(1.9, 8.7))));
  float zone = (1. - smoothstep(.12, .17, s)) * smoothstep(-.03, 0., s) * exp(-(dr * dr) / .000144) * (.2 + .8 * exp(-uT / .25));   // les gouttes s'évaporent plus vite que le pigment
  float goutte = step(1. - .2 * zone, hg) * (1. - smoothstep(.14 + .18 * hg, .22 + .18 * hg, dg));
  // le grain du papier, seulement dans le pigment
  float dens = (.74 + .45 * (n2 - .5)) * (1. + uGrain * (bruit(vSol * 1500. + uGraine) - .5) * 2.);
  float a = uFort * c * vif * dens * mix(1., .55, poseSeule) + .26 * aureole * vif * (.5 + .5 * frais) * mix(1., 1.35, poseSeule)
          + .34 * onde * (.8 + .4 * (n2 - .5)) + .3 * goutte * vif;
  vec3 col = texture2D(uBande, vec2(clamp(s, 0., 1.), .5)).rgb * (1. - .08 * aureole);
  gl_FragColor = vec4(col, min(a, .72));                         // translucide : le filet d'or et le point se lisent au travers
  #include <colorspace_fragment>
}`;

// ressources communes (une seule fois par page)
let commun;
const ressources = () => commun ||= Promise.all([
  new GLTFLoader().loadAsync(DIR + 'flacon-100ml.glb'),
  fetch(DIR + 'parfums.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
  document.fonts ? document.fonts.load('500 40px "Hanken Grotesk"').catch(() => {}) : null,
]);

// un nom de phase en petites capitales, au sol mais tourné vers l'appareil : droit et net, jamais penché par la perspective
// (lettres blanches, teintées par la matière)
function mot(s, cap) {
  const px = 72, c = document.createElement('canvas'), g = c.getContext('2d');
  const fonte = `500 ${px}px "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif`, up = s.toLocaleUpperCase('fr'), sp = .16 * px;
  g.font = fonte;
  const w = Math.ceil([...up].reduce((n, ch) => n + g.measureText(ch).width + sp, -sp)) + 8;
  c.width = w; c.height = Math.ceil(px * 1.05);
  g.font = fonte; g.fillStyle = '#fff'; g.textBaseline = 'middle';
  let x = 4; for (const ch of up) { g.fillText(ch, x, c.height / 2 + px * .04); x += g.measureText(ch).width + sp; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const k = cap / (.72 * px);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(c.width * k, c.height * k),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -THREE.MathUtils.degToRad(VUE); m.renderOrder = 1;
  m.userData.prof = c.height * k * ETIRE;                 // la place qu'il prend au sol, vu de l'appareil
  return m;
}
// un arc du cercle, à plat (RingGeometry tourne dans l'autre sens que nos angles au sol)
const arc = (a0, a1, w) => new THREE.RingGeometry(R - w / 2, R + w / 2, Math.max(8, Math.round((a0 - a1) * 40)), 1, -a0, a0 - a1);

/* --- matières : la recette de la visionneuse /parfum --- */
function studio() {                                       // studio dessiné, en attendant (ou à défaut de) l'HDRI
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16), new THREE.MeshBasicMaterial({ color: 0x7d736a, side: THREE.BackSide })));
  const box = (w, h, x, y, z, k, tint = 0xfff6ec) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, .3, 0); env.add(m);
  };
  box(.5, 3.2, -2.2, .8, 1.2, 9); box(.4, 3.2, 2.3, .8, .6, 7); box(2.6, 1.6, 0, 3.2, .4, 3);
  box(3, 1.4, 0, .6, -2.6, 2, 0xffe9d2); box(1.2, .5, -1.2, 1.8, 2.4, 3); box(2.4, 1.2, .3, .5, 3, 1.6, 0xfff1e4);
  box(1, 3.4, -1.3, .8, 2.3, .02, 0); box(1, 3.4, 1.5, .8, 2.1, .02, 0);
  return env;
}

export function mount(el, handle, t0 = 0, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });   // lève une erreur sans WebGL 2
  el.append(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 800 ? 1.5 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;          // ombre franche : bord net, juste lissé
  renderer.shadowMap.autoUpdate = false;

  const couleurs = { paper: css('--paper') || '#f8f5ef', grey: css('--grey') || '#6a6159', gold: css('--gold') || '#b7916a' };
  const papier = new THREE.Color(couleurs.paper), or = new THREE.Color(couleurs.gold);
  const filet = papier.clone().lerp(new THREE.Color(couleurs.grey), .42);          // filet gris, à peine plus foncé que le papier
  const encre = papier.clone().lerp(new THREE.Color(couleurs.grey), .8);
  const scene = new THREE.Scene();
  scene.background = papier;                              // le verre réfracte ce qui est derrière lui : un vrai fond, celui de la page
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = studio();
  scene.environment = pmrem.fromScene(env, .01).texture;
  env.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  scene.environmentIntensity = .8;
  // le studio s'incline avec l'appareil (vue plongeante) : une boîte à lumière passe dans le dessus du capot,
  // l'or y reste or et l'emblème gravé se lit, au lieu du plafond noir du studio
  scene.environmentRotation.set(.75, -.9, 0);
  const camera = new THREE.PerspectiveCamera(24, 5 / 4, .02, 4);
  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const jetables = [];                                    // tout ce qu'il faudra libérer
  const garde = x => (jetables.push(x), x);

  // le soleil : une seule lumière, ombre portée nette
  const soleil = new THREE.DirectionalLight(0xffffff, 2.3);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  Object.assign(soleil.shadow.camera, { left: -.09, right: .09, top: .09, bottom: -.09, near: .05, far: 1.4 });
  soleil.shadow.bias = -.0004; soleil.shadow.normalBias = 0;
  soleil.target.position.set(0, .068, 0);
  scene.add(soleil, soleil.target);

  // l'ombre, seule sur le papier (le papier lui-même est le fond de la page) ; elle s'éteint au-delà du cercle
  const sol = new THREE.Mesh(garde(new THREE.PlaneGeometry(.6, .6)), garde(new THREE.ShadowMaterial({ opacity: .7, transparent: true, depthWrite: false, toneMapped: false })));
  sol.rotation.x = -Math.PI / 2; sol.position.y = .0003; sol.receiveShadow = true; sol.renderOrder = 3;
  sol.material.onBeforeCompile = s => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vSol;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSol = (modelMatrix * vec4(transformed, 1.)).xz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vSol;')
      .replace('opacity * ( 1.0 - getShadowMask() )', `opacity * ( 1.0 - getShadowMask() ) * (1. - smoothstep(${(R + .006).toFixed(4)}, ${(R + .02).toFixed(4)}, length(vSol)))`);
  };
  scene.add(sol);
  // contact : un voile très court sous le socle, pour que le flacon pèse sur le papier
  const contact = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), d = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    d.addColorStop(0, 'rgba(0,0,0,.5)'); d.addColorStop(.55, 'rgba(0,0,0,.18)'); d.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = d; g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(.085, .07)), garde(new THREE.MeshBasicMaterial({ map: garde(new THREE.CanvasTexture(c)), color: 0x3a2a1e, transparent: true, depthWrite: false, toneMapped: false })));
    m.rotation.x = -Math.PI / 2; m.position.y = .0002; m.renderOrder = 2; return m;
  })();
  scene.add(contact);

  // le cadran : trois arcs, leurs noms, le point d'or (refaits si l'échelle change)
  const graphe = new THREE.Group(); scene.add(graphe);
  let arcs = [], mots = [], point;
  // (transparents : ils se dessinent après le lavis, par-dessus lui)
  const matArc = [0, 1, 2].map(() => garde(new THREE.MeshBasicMaterial({ color: filet, transparent: true, toneMapped: false })));
  const matPoint = garde(new THREE.MeshBasicMaterial({ color: or, transparent: true, depthWrite: false, toneMapped: false }));

  // la bande de couleurs du parfum, le long de la course (texture 256 × 1, sRGB)
  const bandeTex = garde(new THREE.DataTexture(new Uint8Array(256 * 4), 256, 1));
  Object.assign(bandeTex, { colorSpace: THREE.SRGBColorSpace, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false });
  // le lavis : un plan sous les filets, peint par le temps (rendu à la demande, comme le reste)
  const lavis = new THREE.Mesh(garde(new THREE.PlaneGeometry(2 * (R + .036), 2 * (R + .036))), garde(new THREE.ShaderMaterial({
    vertexShader: LAVIS_VERT, fragmentShader: LAVIS_FRAG, transparent: true, depthWrite: false,
    uniforms: { uT: { value: t0 }, uFort: { value: .82 }, uGrain: { value: .12 },
      uGraine: { value: new THREE.Vector2() }, uBande: { value: bandeTex } } })));
  lavis.rotation.x = -Math.PI / 2; lavis.position.y = .00005; lavis.renderOrder = -1;
  scene.add(lavis);
  // chaque parfum son coup de pinceau : un décalage du bruit tiré de son nom
  const graine = h => { let x = 2166136261; for (const c of String(h)) x = Math.imul(x ^ c.charCodeAt(0), 16777619); x >>>= 0; return new THREE.Vector2(x % 997 / 9.97, (x >>> 10) % 991 / 9.91); };
  function colorer(h, notes) {                           // à l'appel de mount, puis à chaque changement de parfum
    bandeTex.image.data.set(bande(degrades(notes || {}))); bandeTex.needsUpdate = true;
    lavis.material.uniforms.uGraine.value.copy(graine(h));
    ask();
  }

  // flacon
  let flacon, parfums, mat = {}, etiquettes = {}, silhouette = [];
  const tex = new THREE.TextureLoader();
  const etiquette = h => etiquettes[h] ||= tex.loadAsync(`${DIR}labels/${h}.png`).then(t => {
    t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return garde(t);
  });
  // tout se télécharge ensemble, dès maintenant : le modèle, l'étiquette, l'emblème du capot, l'HDRI du studio
  const charge = ressources();
  etiquette(handle).catch(() => {});
  const embleme = garde(tex.load(DIR + 'emblem-gravure.png', () => ask()));
  embleme.colorSpace = THREE.SRGBColorSpace; embleme.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // l'HDRI du studio photo, comme la visionneuse ; le studio dessiné reste si elle tarde, elle le remplace en arrivant
  const hdr = new RGBELoader().loadAsync(DIR + 'studio.hdr').then(h => {
    if (disposed) return;
    const old = scene.environment; scene.environment = pmrem.fromEquirectangular(h).texture; h.dispose(); old.dispose();
    scene.environmentIntensity = .72; ask();
  }).catch(() => {});
  function habiller(gltf) {
    flacon = gltf.scene.clone(true);
    flacon.rotation.y = -.42;                               // de trois quarts : la face et la tranche droite
    const vus = new Map();
    flacon.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false;
      const nom = o.material.name;
      if (!vus.has(nom)) vus.set(nom, garde(o.material.clone()));
      o.material = vus.get(nom);
      if (nom === 'Serigraphie') { o.castShadow = false; o.renderOrder = 5; }
    });
    mat = Object.fromEntries(vus);
    const glass = mat.Verre, socle = mat.VerreSocle;
    for (const m of [glass, socle]) if (m) Object.assign(m, { roughness: 0, metalness: 0, transmission: 1, ior: 1.5, thickness: m === socle ? .024 : .017,
      specularIntensity: 1, dispersion: .35, side: THREE.FrontSide, envMapIntensity: 1 });
    Object.assign(mat.Jus, { roughness: 0, metalness: 0, transmission: 1, ior: 1.36, thickness: .03, side: THREE.DoubleSide, envMapIntensity: .6 });
    Object.assign(mat.Or, { metalness: 1, roughness: .08, envMapIntensity: 1.1 });
    mat.Or.color.setRGB(.95, .83, .70, THREE.SRGBColorSpace);                      // or champagne, légèrement rosé
    mat.Plastique = garde(new THREE.MeshStandardMaterial({ roughness: .25, metalness: 0 }));
    flacon.traverse(o => {
      if (!o.isMesh) return;
      if (['Virole', 'Col', 'Poussoir', 'Capot'].includes(o.name)) o.material = mat.Or;
      if (['TubePlongeur', 'Tige'].includes(o.name)) o.material = mat.Plastique;
    });
    const label = mat.Serigraphie;
    Object.assign(label, { transparent: true, depthWrite: false, alphaTest: .02, metalness: .35, roughness: .3, envMapIntensity: 1.2 });
    label.color.setRGB(1, .95, .86, THREE.SRGBColorSpace);
    // une dorure imprimée, pas une enseigne : juste assez d'éclat propre pour rester lisible sur un jus sombre
    label.emissive.setRGB(.8, .74, .62).multiplyScalar(.12);
    // emblème gravé sur le dessus du capot (vu d'en haut, il compte)
    const cap = flacon.getObjectByName('Capot');
    if (cap) {
      cap.geometry.computeBoundingBox();
      const bb = cap.geometry.boundingBox;
      const h = .026, e = new THREE.Mesh(garde(new THREE.PlaneGeometry(h * 1844 / 2080, h)), garde(new THREE.MeshStandardMaterial({ map: embleme, color: 0x3b271a, metalness: .5, roughness: .55,
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
      e.rotation.x = -Math.PI / 2; e.renderOrder = 5;
      e.position.set((bb.min.x + bb.max.x) / 2, bb.max.y + .00001, (bb.min.z + bb.max.z) / 2);
      cap.add(e);
    }
    scene.add(flacon);
    // la silhouette du flacon (quelques centaines de sommets) : de quoi mesurer son ombre
    flacon.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    flacon.traverse(o => {
      if (!o.isMesh || o.name === 'Serigraphie' || !o.castShadow) return;
      const p = o.geometry.attributes.position, pas = Math.max(1, Math.floor(p.count / 400));
      for (let i = 0; i < p.count; i += pas) silhouette.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).toArray());
    });
  }
  const teinteOmbre = new THREE.Color();
  async function teindre(h) {
    const p = parfums[h]; if (!p) return;
    const map = await etiquette(h);
    if (disposed || h !== voulu) return;
    const jus = new THREE.Color().setRGB(...p.jus, THREE.SRGBColorSpace);
    const verre = new THREE.Color().setRGB(...p.verre, THREE.SRGBColorSpace), teinte = p.verre.some(c => c < .95);
    const glass = mat.Verre, socle = mat.VerreSocle;
    glass.attenuationColor.copy(verre).lerp(jus, teinte ? .2 : .5);
    glass.attenuationDistance = teinte ? .035 : .06;
    if (teinte) glass.color.copy(jus).lerp(verre, .35).lerp(new THREE.Color(1, 1, 1), .3);
    else glass.color.set(1, 1, 1).lerp(glass.attenuationColor, .4);
    if (socle) { socle.attenuationColor.copy(glass.attenuationColor); socle.color.copy(glass.color); socle.attenuationDistance = glass.attenuationDistance * 1.6; }
    mat.Jus.attenuationColor.copy(jus); mat.Jus.attenuationDistance = teinte ? .07 : .042; mat.Jus.color.set(1, 1, 1);
    mat.Plastique.color.copy(jus).lerp(new THREE.Color(1, 1, 1), .3);
    mat.Serigraphie.map = mat.Serigraphie.emissiveMap = map; mat.Serigraphie.needsUpdate = true;
    teinteOmbre.copy(jus).multiplyScalar(.3);                // l'ombre garde un souffle de la couleur du jus
    renderer.shadowMap.needsUpdate = true;
    ask();
  }

  // hauteur du soleil pour que le bout de l'ombre touche juste le cercle, dans la direction a
  function hauteur(a) {
    const ux = Math.cos(a), uz = Math.sin(a);
    const portee = k => { let m = -1; for (const [x, y, z] of silhouette) m = Math.max(m, x * ux + z * uz + y * k); return m; };   // k = 1 / tan(élévation)
    let lo = .05, hi = 3;
    for (let i = 0; i < 22; i++) { const k = (lo + hi) / 2; if (portee(k) > R - .0006) hi = k; else lo = k; }
    return Math.atan(1 / lo);
  }

  // le temps : position du soleil, couleur, ombre, l'arc et le point
  const sc = new THREE.Color(), oc = new THREE.Color(), dir = new THREE.Vector3();
  let actif = -1;
  function poser(t) {
    const a = ang(t), el = silhouette.length ? hauteur(a) : THREE.MathUtils.degToRad(52);
    dir.set(-Math.cos(a) * Math.cos(el), Math.sin(el), -Math.sin(a) * Math.cos(el));   // le soleil fait face à l'ombre
    soleil.position.copy(soleil.target.position).addScaledVector(dir, .6);
    soleil.color.copy(rampe(SOLEIL, t, sc));
    sol.material.color.copy(rampe(OMBRE, t, oc)).lerp(teinteOmbre, .22);
    point?.position.set(Math.cos(a) * R, .0006, Math.sin(a) * R);
    const i = phase(t);
    if (i !== actif) {
      actif = i;
      matArc.forEach((m, j) => m.color.copy(j === i ? or : filet));
      mots.forEach((m, j) => m.material.color.copy(j === i ? or : encre));
      arcs.forEach((m, j) => { m.geometry.dispose(); m.geometry = arcGeo(j); });
    }
    lavis.material.uniforms.uT.value = t;                  // le front de l'onde suit le bout de l'ombre
  }

  // les filets et les lettres gardent à peu près leur taille à l'écran (un peu plus grands sur une petite scène)
  let ech = 0;
  const trait = j => (j === actif ? .00095 : .0005) * ech;
  const arcGeo = j => { const [, t0, t1] = PHASES[j], blanc = .022; return arc(ang(t0) - (t0 ? blanc : 0), ang(t1) + (t1 < 1 ? blanc : 0), trait(j)); };
  function ecrire(w) {
    const e = Math.min(1.6, Math.max(1, Math.round(640 / w * 20) / 20)); if (e === ech) return false; ech = e;
    graphe.clear();
    arcs.forEach(m => m.geometry.dispose()); mots.forEach(m => { m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); }); point?.geometry.dispose();
    arcs = PHASES.map((_, j) => { const m = new THREE.Mesh(arcGeo(j), matArc[j]); m.rotation.x = -Math.PI / 2; m.position.y = .0001; return m; });
    mots = PHASES.map(([s, t0, t1]) => {
      const m = mot(s, .0038 * e), a = ang((t0 + t1) / 2), lw = m.geometry.parameters.width, lh = m.userData.prof;
      // un peu à l'écart du cercle : le bord frais du lavis ne passe pas sous leurs premières lettres
      const d = R + .0075 * e + Math.abs(Math.cos(a)) * lw / 2 + Math.abs(Math.sin(a)) * lh / 2;
      m.position.set(Math.cos(a) * d, .0001, Math.sin(a) * d);
      return m;
    });
    point = new THREE.Mesh(new THREE.CircleGeometry(.0019 * e, 32), matPoint);
    point.rotation.x = -Math.PI / 2; point.renderOrder = 6;
    graphe.add(...arcs, ...mots, point);
    actif = -1; poser(cur);
    return true;
  }

  // cadrage : le cercle, ses noms et le haut du flacon, quelle que soit la proportion de la scène
  const pts = [], v = new THREE.Vector3(), box = new THREE.Box3();
  function cadrer(w, h) {
    camera.aspect = w / h;
    const r = w / h, e = THREE.MathUtils.degToRad(VUE);
    const cible = new THREE.Vector3(0, .03, 0), right = new THREE.Vector3(1, 0, 0), up = new THREE.Vector3(0, Math.cos(e), -Math.sin(e));
    const tous = [...pts];
    for (const m of mots) { box.setFromObject(m); for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) tous.push(new THREE.Vector3(x, y, z)); }
    let d = .9;
    const viser = () => { camera.position.set(0, Math.sin(e), Math.cos(e)).multiplyScalar(d).add(cible); camera.lookAt(cible); camera.updateMatrixWorld(); camera.updateProjectionMatrix(); };
    for (let n = 0; n < 6; n++) {
      viser();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of tous) { v.copy(p).project(camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      cible.addScaledVector(right, (x0 + x1) / 2 * d * tan * r).addScaledVector(up, (y0 + y1) / 2 * d * tan);
      d *= Math.max((x1 - x0) / 2 / .94, (y1 - y0) / 2 / .9);
    }
    viser();                                             // la pose, tenue : seuls le soleil et l'ombre tournent
  }

  // rendu à la demande
  let raf = 0, vu = true, sale = true, pret = false, disposed = false, voulu = handle, cur = t0, but = t0, avant = 0;
  const ask = () => { sale = true; if (!raf && vu && pret && !disposed) { el.dataset.state = 'busy'; raf = requestAnimationFrame(image); } };
  function image(now) {
    raf = 0;
    const dt = avant ? Math.min(.25, (now - avant) / 1000) : 1 / 60; avant = now;
    cur = calme ? but : cur + (but - cur) * (1 - Math.exp(-dt / .09));
    if (Math.abs(but - cur) < 5e-4) cur = but;
    poser(cur);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    sale = false;
    if (cur !== but) ask(); else { avant = 0; el.dataset.state = 'idle'; }
  }
  const taille = () => {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    if (pts.length) { ecrire(w); cadrer(w, h); }
    ask();
  };
  const ro = new ResizeObserver(taille); ro.observe(el);
  // hors de l'écran, plus d'image : au retour, l'image en retard est rendue
  const io = new IntersectionObserver(([e]) => { vu = e.isIntersecting; if (!vu) avant = 0; if (vu && sale) ask(); });
  io.observe(el);
  colorer(handle, opts.notes);

  const ready = (async () => {
    const [gltf, pj] = await charge;
    if (disposed) return;
    parfums = pj;
    habiller(gltf);
    // points à faire tenir dans l'image : le cercle et le haut du flacon
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R)); }
    const bb = new THREE.Box3().setFromObject(flacon);
    for (const x of [bb.min.x, bb.max.x]) for (const z of [bb.min.z, bb.max.z]) pts.push(new THREE.Vector3(x, bb.max.y + .004, z));
    // le parfum voulu : il a pu changer pendant le chargement (menu du Lexique) ; teindre l'ancien ne suffirait pas
    for (let h; h !== voulu && !disposed;) await teindre(h = voulu);
    // l'HDRI, un instant au plus : le flacon ne fait pas attendre la course des heures
    await Promise.race([hdr, new Promise(ok => setTimeout(ok, 800))]);
    if (disposed) return;
    pret = true;
    // shaders compilés hors du fil principal quand le navigateur le permet (sinon, à la première image)
    try { if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera).catch(() => {}); }
    catch (e) { /* compilés à la première image */ }
    if (disposed) return;
    taille();
    // monté d'avance hors de l'écran (main.js, initPrechauffe) : une image tout de même, au calme — textures envoyées
    // à la carte, programmes liés, ombre calculée ; la première image à l'écran ne coûte plus rien (sinon ~0,8 s figée)
    if (!vu && !raf && el.clientWidth) image(performance.now());
    // prête quand la première image est rendue : le canevas apparaît sur le cadran de l'affiche, sans trou
    await new Promise(ok => { const w = () => (el.dataset.state === 'idle' || !vu ? ok() : requestAnimationFrame(w)); requestAnimationFrame(w); });
  })();

  return {
    ready,
    setTime(t) { but = Math.min(1, Math.max(0, +t || 0)); if (!pret) cur = but; ask(); },
    setPerfume(h, notes) { if (h === voulu) return; voulu = h; colorer(h, notes); if (parfums) teindre(h); },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      jetables.forEach(x => x.dispose?.());
      arcs.forEach(m => m.geometry.dispose()); point?.geometry.dispose();
      mots.forEach(m => { m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); }); scene.environment?.dispose(); pmrem.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
