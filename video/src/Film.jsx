// LIBRERY — film de présentation du site (1920 × 1080, 30 i/s, ≈ 81 s), sur « aeria ».
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BEAT, Browser, C, Cursor, Dark, Fade, Hud, Kick, Paper, Phone, Rule, Words, clamp, display, io, kf, out, ramp, sans, serif } from './ui';

// découpage : chaque scène commence sur un temps de la musique
export const SCENES = [
  ['intro', 150], ['promesse', 108], ['accueil', 324], ['ecran', 180], ['survol', 306],
  ['fiche', 252], ['sillage', 180], ['mobile', 234], ['mur', 216], ['montage', 108], ['fin', 198],
];
export const TOTAL = SCENES.reduce((s, [, d]) => s + d, 0);

// ---------------------------------------------------------------- 1. « Librairie interactive », puis le logo
const Intro = ({ dur }) => {
  const f = useCurrentFrame();
  const word = 'Librairie interactive';
  const outT = ramp(f, 64, 84, io);
  const logo = ramp(f, 80, 120);
  return (
    <Dark>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', fontFamily: display, fontSize: 104, letterSpacing: `${interpolate(f, [0, 80], [0.18, 0.02], clamp)}em`, color: C.cream,
          opacity: 1 - outT, filter: `blur(${outT * 14}px)`, transform: `scale(${1 + outT * 0.06})`, whiteSpace: 'pre' }}>
          {word.split('').map((ch, i) => {
            const p = ramp(f, 6 + i * 1.6, 30 + i * 1.6);
            return <span key={i} style={{ opacity: p, filter: `blur(${(1 - p) * 10}px)`, display: 'inline-block', transform: `translateY(${(1 - p) * 20}px)`, fontStyle: i > 9 ? 'italic' : undefined, fontFamily: i > 9 ? serif : undefined }}>{ch}</span>;
          })}
        </div>
        <div style={{ position: 'absolute', width: 760, opacity: logo, filter: `blur(${(1 - logo) * 16}px)`, transform: `scale(${1.1 - logo * 0.1 + ramp(f, 120, dur, io) * 0.03})` }}>
          <Img src={staticFile('img/logo-librery-paris-cream.svg')} style={{ width: '100%', display: 'block' }} />
        </div>
        <div style={{ position: 'absolute', top: 780, width: 320 }}><Rule at={100} dur={40} color={C.gold} /></div>
        <Kick at={112} color="rgba(239,230,214,.6)" style={{ position: 'absolute', top: 810 }}>Le nouveau site · 2026</Kick>
      </AbsoluteFill>
    </Dark>
  );
};

// ---------------------------------------------------------------- 2. la promesse
const Promesse = () => (
  <Paper>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Kick at={0} style={{ marginBottom: 40 }}>La bibliothèque olfactive</Kick>
      <Words lines={['Un site qui se lit', 'comme le *catalogue.*']} at={6} size={132} stagger={4} align="center" color={C.ink} />
    </AbsoluteFill>
  </Paper>
);

// ---------------------------------------------------------------- 3. l'accueil en 3D, on fait défiler
const HOME = [[0, 0], [70, 0], [100, 880], [140, 880], [170, 1860], [200, 1860], [226, 2690], [256, 2690], [282, 3620], [306, 3620], [324, 4300]];
const HOME_CAPS = [[0, '01', 'L’ouverture de campagne'], [96, '02', 'La nouveauté, Skin Obsession'], [166, '03', 'Les images de campagne'], [222, '04', 'Le catalogue, livre ouvert'], [278, '05', 'L’étagère des matières']];
const Accueil = ({ dur }) => {
  const f = useCurrentFrame();
  const e = ramp(f, 0, 80, io);
  const cap = [...HOME_CAPS].reverse().find(c => f >= c[0]);
  const capP = ramp(f, cap[0] + 4, cap[0] + 22);
  return (
    <Paper alt>
      <AbsoluteFill style={{ perspective: 2600 }}>
        <div style={{ position: 'absolute', left: 560, top: 120, transformStyle: 'preserve-3d',
          transform: `translate3d(${(1 - e) * 120}px, ${(1 - e) * 260}px, ${(1 - e) * -500}px) rotateX(${(1 - e) * 34 + 3}deg) rotateY(${-(1 - e) * 22 - 6}deg) rotateZ(${(1 - e) * 6}deg) scale(${1 + ramp(f, 80, dur, io) * 0.03})` }}>
          <Browser w={1260} src="cap/d-home.jpg" y={kf(f, HOME)} />
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 80, top: 120, width: 380 }}>
        <Kick at={10}>L’accueil</Kick>
        <Words lines={['L’accueil,', 'section par', '*section.*']} at={16} size={62} color={C.ink} style={{ marginTop: 22 }} />
      </div>
      <div style={{ position: 'absolute', left: 80, top: 760, width: 380, opacity: capP, transform: `translateY(${(1 - capP) * 16}px)` }}>
        <div style={{ fontFamily: display, fontSize: 22, color: C.gold }}>{cap[1]}</div>
        <div style={{ fontFamily: serif, fontSize: 30, lineHeight: 1.2, marginTop: 8 }}>{cap[2]}</div>
      </div>
      <Hud n="01" label="Accueil" at={20} />
    </Paper>
  );
};

// ---------------------------------------------------------------- 4. plein écran : le diaporama
const Ecran = () => {
  const f = useCurrentFrame();
  const shots = ['liv/d-hero1.jpg', 'liv/d-hero2.jpg', 'liv/d-hero3.jpg'];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {shots.map((s, i) => {
        const a = i * 60, o = i === 0 ? 1 : ramp(f, a - 6, a + 8, io);
        return <Img key={s} src={staticFile(s)} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center bottom', transformOrigin: 'center 70%', opacity: f >= a - 6 ? o : 0, transform: `scale(${1.02 + (f - a) * 0.0009})` }} />;
      })}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,.45), transparent 30%)' }} />
      <div style={{ position: 'absolute', right: 80, bottom: 90, textAlign: 'right', color: '#fff' }}>
        <Words lines={['Trois images,', 'une *barre de progression.*']} at={8} size={46} color="#fff" />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5. le survol : la mise en situation en temps réel
const CARDS = [
  { n: ['Tonka', 'Love'], notes: 'Amande grillée, Caramel salé, Tonka', k: 'tonka-love', scene: 'tonka-love-1' },
  { n: ['Vanilla', 'Plum'], notes: 'Prune, Accord lait, Vanille', k: 'vanilla-plum', scene: 'vanilla-plum-2' },
  { n: ['Magnetic', 'Flowers'], notes: 'Poire, Tubéreuse, Santal', k: 'magnetic-flowers', scene: 'magnetic-flowers-1' },
];
const CW = 372, CX = 640, CY = 190, CG = 36;
const HOVER = [[40, 104], [112, 176], [184, 306]]; // survol de chaque carte (images locales)
const Survol = () => {
  const f = useCurrentFrame();
  const cx = kf(f, [[0, 1500], [30, CX + CW * 0.55], [104, CX + CW * 0.55], [118, CX + CW + CG + CW * 0.5], [176, CX + CW + CG + CW * 0.5], [190, CX + 2 * (CW + CG) + CW * 0.45], [236, CX + 2 * (CW + CG) + CW * 0.45], [252, CX + 2 * (CW + CG) + 150]], out);
  const cy = kf(f, [[0, 1000], [30, CY + 260], [104, CY + 280], [118, CY + 250], [176, CY + 270], [190, CY + 240], [236, CY + 290], [252, CY + CW * 1.25 + 118]], out);
  const s30 = ramp(f, 256, 272, io);
  return (
    <Paper>
      <div style={{ position: 'absolute', left: 80, top: 190, width: 480 }}>
        <Kick at={4}>Au survol</Kick>
        <Words lines={['Le parfum', 'prend *vie.*']} at={10} size={88} color={C.ink} style={{ marginTop: 24 }} />
        <div style={{ marginTop: 40, fontFamily: serif, fontSize: 24, lineHeight: 1.45, color: C.grey, opacity: ramp(f, 40, 60) }}>
          La mise en situation apparaît en fondu, puis un lent travelling. « 30 ml » montre le flacon de voyage.
        </div>
      </div>
      {CARDS.map((c, i) => {
        const [a, b] = HOVER[i];
        const h = Math.min(ramp(f, a, a + 18, io), 1 - ramp(f, b, b + 16, io));
        const t = Math.max(0, f - a);
        const x = CX + i * (CW + CG);
        const inP = ramp(f, i * 5, i * 5 + 30);
        const is30 = i === 2 ? s30 : 0;
        return (
          <div key={c.k} style={{ position: 'absolute', left: x, top: CY, width: CW, opacity: inP, transform: `translateY(${(1 - inP) * 60}px)` }}>
            <div style={{ position: 'relative', width: CW, height: CW * 1.25, overflow: 'hidden', background: '#efedea' }}>
              <Img src={staticFile(`img/${c.k}-pack.webp`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 - is30 }} />
              <Img src={staticFile(`img/${c.k}-pack30.webp`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: is30 }} />
              <Img src={staticFile(`img/${c.scene}.webp`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: h * (1 - is30), transform: `scale(${1.04 + t * 0.0014}) translateY(${-t * 0.12}px)` }} />
            </div>
            <div style={{ fontFamily: sans, fontSize: 13, color: C.grey, marginTop: 16 }}>Nouveauté</div>
            <div style={{ fontFamily: serif, fontSize: 30, marginTop: 4 }}>{c.n[0]} <i>{c.n[1]}</i></div>
            <div style={{ fontFamily: serif, fontSize: 19, color: C.grey, marginTop: 4 }}>{c.notes}</div>
            <div style={{ fontFamily: sans, fontSize: 15, marginTop: 10, display: 'flex', gap: 22 }}>
              <span>100 ml — 170 €</span>
              <span style={{ borderBottom: `1px solid ${is30 ? C.ink : 'transparent'}`, color: is30 ? C.ink : C.grey }}>30 ml — 75 €</span>
            </div>
          </div>
        );
      })}
      <Cursor x={cx} y={cy} press={Math.max(0, 1 - Math.abs(f - 256) / 5)} />
      <Hud n="02" label="Bibliothèque · survol" at={20} />
    </Paper>
  );
};

// ---------------------------------------------------------------- 7. la fiche produit, ordinateur et mobile
const PDP_D = [[0, 0], [56, 0], [96, 1960], [134, 1960], [176, 3860], [210, 3860], [252, 7380]];
const PDP_M = [[0, 0], [70, 0], [104, 760], [140, 760], [176, 1650], [212, 1650], [252, 2350]];
const Fiche = ({ dur }) => {
  const f = useCurrentFrame();
  const e = ramp(f, 0, 50, io);
  return (
    <Paper alt>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 56, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Words lines={['La fiche *produit.*']} at={4} size={54} color={C.ink} />
        <div style={{ fontFamily: serif, fontSize: 22, color: C.grey, opacity: ramp(f, 20, 40) }}>Les images en pleine colonne, l’achat toujours à portée de main.</div>
      </div>
      <Rule at={8} style={{ position: 'absolute', left: 80, right: 80, top: 138 }} />
      <AbsoluteFill style={{ perspective: 2400 }}>
        <div style={{ position: 'absolute', left: 80, top: 180, transform: `translateX(${(1 - e) * -160}px) rotateY(${(1 - e) * 16}deg)`, opacity: e }}>
          <Browser w={1270} src="cap/d-pdp.jpg" y={kf(f, PDP_D)} path="/produit?p=tonka-love" />
        </div>
        <div style={{ position: 'absolute', left: 1454, top: 180, transform: `translateX(${(1 - e) * 160}px) rotateY(${-(1 - e) * 16}deg)`, opacity: e }}>
          <Phone w={342} src="cap/m-pdp.jpg" y={kf(f, PDP_M)} />
        </div>
      </AbsoluteFill>
    </Paper>
  );
};

// ---------------------------------------------------------------- 8. l'horloge du sillage
const Sillage = () => {
  const f = useCurrentFrame();
  const i = Math.round(kf(f, [[34, 0], [150, 48]], io));
  return (
    <Paper style={{ background: '#f8f5ee' }}>
      <div style={{ position: 'absolute', left: 80, top: 150 }}>
        <Kick at={2}>Sur chaque fiche · dans le Lexique</Kick>
        <Words lines={['Le sillage,', 'heure par *heure.*']} at={8} size={104} color={C.ink} style={{ marginTop: 26 }} />
      </div>
      <div style={{ position: 'absolute', left: 80, top: 590, width: 1760, opacity: ramp(f, 20, 40), transform: `scale(${1 + ramp(f, 30, 180, io) * 0.02})`, transformOrigin: 'left center' }}>
        <Img src={staticFile(`cap/clock/${String(i).padStart(2, '0')}.jpg`)} style={{ width: '100%', display: 'block', mixBlendMode: 'multiply' }} />
      </div>
      <Hud n="03" label="L’horloge du sillage" at={20} />
    </Paper>
  );
};

// ---------------------------------------------------------------- 9. mobile : trois iPhone en 3D
const Mobile = ({ dur }) => {
  const f = useCurrentFrame();
  const e = ramp(f, 0, 60, io);
  const M_HOME = [[0, 0], [50, 0], [80, 900], [110, 900], [140, 2560], [170, 2560], [200, 3900], [234, 5000]];
  const M_LIB = [[0, 0], [60, 0], [96, 700], [140, 700], [180, 1800], [234, 2600]];
  const M_PDP = [[0, 0], [70, 0], [104, 900], [150, 900], [190, 2860], [234, 3300]];
  const ph = [
    { src: 'cap/m-lib.jpg', y: kf(f, M_LIB), x: 700, r: 24, z: -260 },
    { src: 'cap/m-home.jpg', y: kf(f, M_HOME), x: 1090, r: 0, z: 0 },
    { src: 'cap/m-pdp.jpg', y: kf(f, M_PDP), x: 1480, r: -24, z: -260 },
  ];
  return (
    <Dark>
      <div style={{ position: 'absolute', left: 110, top: 360, width: 460 }}>
        <Kick at={4}>Mobile</Kick>
        <Words lines={['Pensé d’abord', 'pour le *pouce.*']} at={10} size={76} color={C.cream} style={{ marginTop: 24 }} />
      </div>
      <AbsoluteFill style={{ perspective: 2200 }}>
        {ph.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: p.x - 170, top: 150, transformStyle: 'preserve-3d',
            transform: `translate3d(0, ${(1 - e) * (300 + i * 80)}px, ${p.z}px) rotateY(${p.r * (0.6 + 0.4 * e) + Math.sin(f / 40 + i) * 2}deg) rotateX(${(1 - e) * 20}deg)` }}>
            <Phone w={340} src={p.src} y={p.y} />
          </div>
        ))}
      </AbsoluteFill>
      <Hud n="04" label="Chaque écran a sa mise en page" dark at={20} />
    </Dark>
  );
};

// ---------------------------------------------------------------- 10. le mur d'écrans
const D = ['d-skin', 'd-book', 'd-lib-fams', 'd-pdp-top', 'd-coll', 'd-preface', 'd-lex-clock', 'd-quiz-res', 'd-carte', 'd-offrir', 'd-coll-summer', 'd-pdp-sillage', 'd-services', 'd-shelf', 'd-coll-coffrets', 'd-lib-gourmand', 'd-preface-perf', 'd-composer'];
const M = ['m-hero1', 'm-skin', 'm-book', 'm-lib-fams', 'm-pdp-top', 'm-pdp-sillage', 'm-coll', 'm-preface', 'm-lex-fams', 'm-quiz-res', 'm-carte', 'm-footer', 'm-shelf', 'm-card-swipe', 'm-index', 'm-coll-summer'];
const Mur = ({ dur }) => {
  const f = useCurrentFrame();
  const cols = Array.from({ length: 8 }, (_, c) => c);
  const figs = [['91', 'écrans'], ['11', 'modèles de page'], ['1', 'thème Shopify']];
  const fi = Math.min(2, Math.floor(Math.max(0, f - 30) / 60));
  const fp = ramp(f, 30 + fi * 60, 44 + fi * 60) * (fi < 2 ? 1 - ramp(f, 80 + fi * 60, 90 + fi * 60) : 1);
  return (
    <Dark>
      <AbsoluteFill style={{ perspective: 2600, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -700, top: -900, width: 3400, height: 3000, transform: `rotateX(38deg) rotateZ(-24deg) scale(${1.02 + f * 0.0006})`, display: 'flex', gap: 34 }}>
          {cols.map(c => {
            const mob = c % 2 === 1;
            const list = (mob ? M : D).slice((c * 3) % 10).concat((mob ? M : D));
            const dir = c % 2 ? 1 : -1;
            return (
              <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: 34, transform: `translateY(${dir * f * 2.4 - (c % 2 ? 900 : 200)}px)`, width: mob ? 260 : 560 }}>
                {list.slice(0, 9).map((s, i) => (
                  <Img key={i} src={staticFile(`liv/${s}.jpg`)} style={{ width: '100%', aspectRatio: mob ? '390/844' : '16/10', objectFit: 'cover', objectPosition: 'top', borderRadius: mob ? 30 : 10, boxShadow: '0 30px 60px -30px rgba(0,0,0,.8)' }} />
                ))}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(60% 55% at 50% 50%, rgba(22,15,10,.86) 0%, rgba(22,15,10,.45) 60%, rgba(22,15,10,.2) 100%)' }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ opacity: fp, transform: `translateY(${(1 - fp) * 30}px)` }}>
          <div style={{ fontFamily: display, fontSize: 240, lineHeight: 1, color: C.cream }}>{figs[fi][0]}</div>
          <div style={{ fontFamily: sans, fontSize: 24, letterSpacing: '.18em', textTransform: 'uppercase', color: C.gold, marginTop: 20 }}>{figs[fi][1]}</div>
        </div>
      </AbsoluteFill>
    </Dark>
  );
};

// ---------------------------------------------------------------- 11. montage rapide, sur le temps
const MONT = ['d-lib-fams', 'd-coll-summer', 'd-preface-perf', 'd-lex-fams', 'd-quiz-res', 'd-carte', 'd-offrir', 'd-coll-mosaic', 'd-composer', 'd-cart', 'd-coll-coffrets', 'd-footer'];
const Montage = () => {
  const f = useCurrentFrame();
  const i = Math.min(MONT.length - 1, Math.floor(f / 9));
  const t = f - i * 9;
  return (
    <AbsoluteFill style={{ background: C.paper2, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', left: 205, top: 70, transform: `scale(${1.0 + t * 0.004})` }}>
        <Browser w={1510} src={`liv/${MONT[i]}.jpg`} fit />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 12. fin : le logo, le lien
const Fin = ({ dur }) => {
  const f = useCurrentFrame();
  const logo = ramp(f, 4, 44);
  const url = ramp(f, 60, 84);
  return (
    <Dark>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 620, opacity: logo, filter: `blur(${(1 - logo) * 14}px)`, transform: `scale(${1.06 - logo * 0.06})`, marginTop: -120 }}>
          <Img src={staticFile('img/logo-librery-paris-cream.svg')} style={{ width: '100%', display: 'block' }} />
        </div>
        <Words lines={['La bibliothèque olfactive, sur tous les *écrans.*']} at={30} size={44} color={C.cream} align="center" style={{ marginTop: 56 }} />
        <div style={{ marginTop: 64, display: 'flex', alignItems: 'center', gap: 18, padding: '22px 44px', background: C.cream, color: C.dark, fontFamily: sans, fontSize: 22, letterSpacing: '.1em', textTransform: 'uppercase', opacity: url, transform: `translateY(${(1 - url) * 20}px)` }}>
          Découvrir le site <span style={{ fontSize: 26 }}>↗</span>
        </div>
        <div style={{ marginTop: 26, fontFamily: sans, fontSize: 20, letterSpacing: '.08em', color: 'rgba(239,230,214,.6)', opacity: ramp(f, 76, 96) }}>librery-refonte.vercel.app</div>
        <Kick at={100} color={C.gold} style={{ position: 'absolute', bottom: 70 }}>Prêt pour Shopify</Kick>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#000', opacity: ramp(f, dur - 40, dur, io) }} />
    </Dark>
  );
};

const PARTS = { intro: Intro, promesse: Promesse, accueil: Accueil, ecran: Ecran, survol: Survol, fiche: Fiche, sillage: Sillage, mobile: Mobile, mur: Mur, montage: Montage, fin: Fin };
const FADES = { intro: [0, 8], ecran: [0, 0], montage: [0, 0], mur: [8, 0], fin: [0, 0] };

export const Film = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Audio src={staticFile('audio/aeria.mp3')} volume={f => interpolate(f, [0, 20, TOTAL - 90, TOTAL], [0, 0.9, 0.9, 0], clamp)} />
      {SCENES.map(([k, d]) => {
        const P = PARTS[k], [fi, fo] = FADES[k] || [8, 8];
        const s = <Sequence key={k} from={at} durationInFrames={d} name={k}><Fade dur={d} inn={fi} outn={fo}><P dur={d} /></Fade></Sequence>;
        at += d; return s;
      })}
      {/* léger vignettage et grain pour l'unité de l'image */}
      <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(120% 100% at 50% 50%, transparent 60%, rgba(0,0,0,.12) 100%)' }} />
    </AbsoluteFill>
  );
};
