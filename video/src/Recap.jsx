// LIBRERY — vidéo récap pour Nolwenn et Rafiq : ce qui a été fait depuis le PDF du 12/10 (1920 × 1080, 30 i/s).
// Captures : capture-recap.js, capture-sillage.js ; liste des images : node gen-recap-data.js (src/recap-data.js).
import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Browser, C, Dark, Fade, Hud, Kick, Paper, Phone, Rule, Words, clamp, display, io, kf, ramp, sans, serif } from './ui';
import DATA from './recap-data';

const META = DATA.meta;
const WE = DATA.weekend; // captures du site du week-end (vide tant qu'il n'est pas prêt)

// ---------------------------------------------------------------- briques
/** cadre doré qui se trace autour d'un élément (coordonnées CSS de la capture, `k` = échelle) */
const Mark = ({ b, k, at = 30, pad = 10 }) => {
  const f = useCurrentFrame(); const p = ramp(f, at, at + 22, io);
  if (!b) return null;
  return <div style={{ position: 'absolute', left: (b.x - pad) * k, top: (b.y - pad) * k, width: (b.width + 2 * pad) * k, height: (b.height + 2 * pad) * k,
    border: `2px solid ${C.gold}`, borderRadius: 6, opacity: p, transform: `scale(${1.08 - p * 0.08})`, boxShadow: `0 0 0 ${(1 - p) * 30}px rgba(183,145,106,0)`, background: 'rgba(183,145,106,.08)' }} />;
};
const ShotB = ({ name, w, at }) => (
  <Browser w={w} src={`recap/${name}.jpg`} fit>
    <Img src={staticFile(`recap/${name}.jpg`)} style={{ width: '100%', display: 'block' }} />
    {(META[name]?.marks || []).map((b, i) => <Mark key={i} b={b} k={w / 1440} at={at + i * 8} />)}
  </Browser>
);
const ShotP = ({ name, w, at, y = 0 }) => (
  <Phone w={w} src={`recap/${name}.jpg`}>
    <Img src={staticFile(`recap/${name}.jpg`)} style={{ width: '100%', display: 'block', transform: `translateY(${-y}px)` }} />
    {(META[name]?.marks || []).map((b, i) => <Mark key={i} b={b} k={w / 390} at={at + i * 8} />)}
  </Phone>
);
/** colonne de texte à gauche : surtitre, titre, puces */
const Side = ({ kick, title, lines = [], dark, at = 4, top = 170 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', left: 90, top, width: 470 }}>
      <Kick at={at}>{kick}</Kick>
      <Words lines={title} at={at + 6} size={60} color={dark ? C.cream : C.ink} style={{ marginTop: 24 }} />
      <div style={{ marginTop: 40 }}>
        {lines.map((l, i) => {
          const p = ramp(f, at + 34 + i * 14, at + 54 + i * 14);
          return <div key={i} style={{ fontFamily: serif, fontSize: 25, lineHeight: 1.4, color: dark ? 'rgba(239,230,214,.75)' : C.grey, marginTop: 16, paddingLeft: 26, position: 'relative', opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>
            <span style={{ position: 'absolute', left: 0, top: '.62em', width: 12, height: 1, background: C.gold }} />{l}
          </div>;
        })}
      </div>
    </div>
  );
};
/** entrée d'un écran en légère perspective */
const Enter = ({ children, f, from = 1, left, top }) => {
  const e = ramp(f, 0, 46, io);
  return <div style={{ position: 'absolute', left, top, opacity: e, transform: `translateX(${(1 - e) * 140 * from}px) rotateY(${-(1 - e) * 14 * from}deg)` }}>{children}</div>;
};

// ---------------------------------------------------------------- 1. ouverture
const Ouverture = ({ dur }) => {
  const f = useCurrentFrame();
  const logo = ramp(f, 4, 40);
  return (
    <Dark>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 520, opacity: logo, filter: `blur(${(1 - logo) * 14}px)`, transform: `scale(${1.06 - logo * 0.06})`, marginTop: -160 }}>
          <Img src={staticFile('img/logo-librery-paris-cream.svg')} style={{ width: '100%', display: 'block' }} />
        </div>
        <div style={{ width: 300, marginTop: 50 }}><Rule at={30} dur={36} color={C.gold} /></div>
        <Words lines={['Depuis le PDF du *12 octobre*']} at={44} size={64} color={C.cream} align="center" style={{ marginTop: 50 }} />
        <Kick at={70} color="rgba(239,230,214,.6)" style={{ marginTop: 34 }}>Le point pour Nolwenn et Rafiq · 15 octobre</Kick>
      </AbsoluteFill>
    </Dark>
  );
};

// ---------------------------------------------------------------- 2. vos retours, appliqués
const Notes = () => {
  const f = useCurrentFrame();
  return (
    <Paper>
      <Side kick="Vos retours · 1" title={['Les notes de', '*Skin Obsession.*']} lines={['Notes principales revues avec Rafiq.', 'Listes de notes sans « Accord » ni « FirAbs ».']} />
      <AbsoluteFill style={{ perspective: 2400 }}>
        <Enter f={f} left={640} top={150}><ShotB name="pdp-mf" w={1190} at={50} /></Enter>
      </AbsoluteFill>
      <Hud n="01" label="Vos retours · fiches parfum" at={20} />
    </Paper>
  );
};
const Code = () => {
  const f = useCurrentFrame();
  const sw = ramp(f, 100, 130, io);
  return (
    <Paper alt>
      <Side kick="Vos retours · 2" title={['Le code', '*recrédité.*']} lines={['Réservé au Coffret Découverte 2 ml.', 'À usage unique, valable 30 jours sur un 100 ml.']} />
      <AbsoluteFill style={{ perspective: 2400 }}>
        <Enter f={f} left={640} top={150}>
          <div style={{ opacity: 1 - sw }}><ShotB name="coffret" w={1190} at={50} /></div>
          <div style={{ position: 'absolute', left: 0, top: 0, opacity: sw }}><ShotB name="services" w={1190} at={120} /></div>
        </Enter>
      </AbsoluteFill>
      <Hud n="01" label="Vos retours · coffrets et services" at={20} />
    </Paper>
  );
};
const Stores = () => {
  const f = useCurrentFrame();
  return (
    <Paper>
      <Side kick="Vos retours · 3" title={['Les points', 'de *vente.*']} lines={['Olfactions (Toulouse) ajouté.', 'Imm Couture et Odor BXL retirés.']} />
      <AbsoluteFill style={{ perspective: 2400 }}>
        <Enter f={f} left={640} top={150}><ShotB name="stores" w={1190} at={50} /></Enter>
      </AbsoluteFill>
      <Hud n="01" label="Vos retours · la carte" at={20} />
    </Paper>
  );
};
const Paiement = () => {
  const f = useCurrentFrame();
  return (
    <Paper alt>
      <Side kick="Vos retours · 4" title={['Les moyens', 'de *paiement.*']} lines={['Les logos officiels, en pied de page.', 'Sur ordinateur et sur iPhone.']} />
      <AbsoluteFill style={{ perspective: 2400 }}>
        <Enter f={f} left={640} top={190}><ShotB name="pied" w={1010} at={50} /></Enter>
        <Enter f={f} from={-1} left={1530} top={120}><ShotP name="pied-m" w={300} at={60} /></Enter>
      </AbsoluteFill>
      <Hud n="01" label="Vos retours · pied de page" at={20} />
    </Paper>
  );
};

// ---------------------------------------------------------------- 3. la fiche produit
const Fiche = () => {
  const f = useCurrentFrame();
  return (
    <Paper>
      <Side kick="La fiche produit" title={['Le flacon au', '*nombre d’or.*']} lines={['Le packshot est cadré sur la hauteur de l’écran : le flacon occupe 1/φ du cadre.', 'Même règle sur ordinateur et sur iPhone.']} />
      <AbsoluteFill style={{ perspective: 2400 }}>
        <Enter f={f} left={640} top={190}><ShotB name="pdp-tl" w={1010} at={999} /></Enter>
        <Enter f={f} from={-1} left={1530} top={120}><ShotP name="pdp-vp-m" w={300} at={999} /></Enter>
      </AbsoluteFill>
      <Hud n="02" label="Fiche produit" at={20} />
    </Paper>
  );
};

// ---------------------------------------------------------------- 4. la 3D, prête mais masquée
const Titre3D = () => (
  <Dark>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Kick at={0}>Chapitre suivant</Kick>
      <Words lines={['La 3D,', 'prête mais *masquée.*']} at={8} size={120} color={C.cream} align="center" style={{ marginTop: 34 }} />
      <Kick at={50} color="rgba(239,230,214,.6)" style={{ marginTop: 44 }}>Ce que nous avons préparé · invisible sur le site pour l’instant</Kick>
    </AbsoluteFill>
  </Dark>
);
const Caché = ({ at = 40 }) => {
  const f = useCurrentFrame(); const p = ramp(f, at, at + 20);
  return <div style={{ position: 'absolute', right: 90, top: 70, padding: '12px 22px', border: `1px solid ${C.gold}`, color: C.gold, fontFamily: sans, fontSize: 16, letterSpacing: '.16em', textTransform: 'uppercase', opacity: p }}>Masqué pour l’instant</div>;
};
const Chevet = ({ dur }) => {
  const f = useCurrentFrame();
  const fr = DATA.chevet, n = fr.length;
  const i = Math.round(kf(f, [[40, 0], [dur - 40, n - 1]], io));
  const e = ramp(f, 0, 40, io);
  return (
    <Dark>
      <Side dark kick="L’accueil · le chevet" title={['Le chevet,', 'rendu dans *Blender.*']} lines={['Des images figées en haute définition, jouées au défilement, à la place de la 3D en temps réel.', 'Plus fluide sur téléphone, net sur écran Retina.']} />
      <div style={{ position: 'absolute', left: 900, top: 70, opacity: e, transform: `translateY(${(1 - e) * 80}px)` }}>
        <Phone w={430} src="">
          <Img src={staticFile(`recap/chevet/${fr[i]}`)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </Phone>
      </div>
      <div style={{ position: 'absolute', left: 1450, top: 330, width: 380, fontFamily: display, fontSize: 30, color: C.cream, opacity: ramp(f, 60, 80) }}>
        <div style={{ fontFamily: sans, fontSize: 15, letterSpacing: '.16em', color: C.gold, textTransform: 'uppercase' }}>Image</div>
        <div style={{ fontSize: 96, lineHeight: 1.1 }}>{String(i + 1).padStart(3, '0')}</div>
        <div style={{ fontFamily: serif, fontSize: 22, color: 'rgba(239,230,214,.6)' }}>sur {DATA.chevetTotal} · version iPhone</div>
      </div>
      <Caché />
      <Hud n="03" label="3D · le chevet de l’accueil" dark at={20} />
    </Dark>
  );
};
const Sillage = ({ dur }) => {
  const f = useCurrentFrame();
  const n = DATA.sillage.length;
  const i = Math.round(kf(f, [[60, 0], [dur - 40, n - 1]], io));
  return (
    <Paper style={{ background: '#f8f5ee' }}>
      <div style={{ position: 'absolute', left: 90, top: 80 }}>
        <Kick at={2}>Sur chaque fiche parfum · dans le Lexique</Kick>
        <Words lines={['De la *vaporisation* à 8 h.']} at={8} size={72} color={C.ink} style={{ marginTop: 22 }} />
        <div style={{ fontFamily: serif, fontSize: 25, color: C.grey, marginTop: 16, opacity: ramp(f, 30, 50) }}>Le flacon en 3D, son ombre qui tourne comme un cadran solaire, et l’onde colorée par les notes du parfum.</div>
      </div>
      <div style={{ position: 'absolute', left: 140, top: 330, width: 1640, opacity: ramp(f, 20, 44), transform: `scale(${1 + ramp(f, 40, dur, io) * 0.02})`, transformOrigin: 'left center' }}>
        <Img src={staticFile(`recap/${DATA.sillage[i]}`)} style={{ width: '100%', display: 'block', mixBlendMode: 'multiply' }} />
      </div>
      <Caché />
      <Hud n="03" label="3D · le cadran du sillage" at={20} />
    </Paper>
  );
};
const Feuille = () => {
  const f = useCurrentFrame();
  return (
    <Paper alt>
      <div style={{ position: 'absolute', left: 90, top: 80, width: 1400 }}>
        <Kick at={2}>L’accueil · photos de campagne</Kick>
        <Words lines={['L’effet *feuille.*']} at={8} size={72} color={C.ink} style={{ marginTop: 22 }} />
        <div style={{ fontFamily: serif, fontSize: 25, color: C.grey, marginTop: 16, opacity: ramp(f, 30, 50) }}>Les photos se posent comme des tirages sur papier, à l’ouverture et dans les mosaïques.</div>
      </div>
      <AbsoluteFill style={{ perspective: 2400 }}>
        <Enter f={f} left={90} top={300}>
          <Browser w={1080} src="" fit><OffthreadVideo src={staticFile('recap/feuille-ordinateur.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Browser>
        </Enter>
        <Enter f={f} from={-1} left={1400} top={250}>
          <Phone w={330} src=""><OffthreadVideo src={staticFile('recap/feuille-iphone.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Phone>
        </Enter>
      </AbsoluteFill>
      <Caché />
      <Hud n="03" label="Animation · l’effet feuille" at={20} />
    </Paper>
  );
};
const Carton = () => (
  <Dark>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Words lines={['Tout cela est *masqué*', 'sur le site pour l’instant.']} at={4} size={84} color={C.cream} align="center" />
      <div style={{ width: 300, marginTop: 50 }}><Rule at={40} dur={30} color={C.gold} /></div>
      <Words lines={['On le perfectionne ensemble, puis on le réactive.']} at={56} size={40} font={serif} color="rgba(239,230,214,.75)" align="center" style={{ marginTop: 44 }} />
    </AbsoluteFill>
  </Dark>
);

// ---------------------------------------------------------------- 5. le site de ce week-end
const Weekend = ({ dur }) => {
  const f = useCurrentFrame();
  const ready = WE.length > 0;
  const lines = ['Le format d’avant, avec moins d’animations.', 'Le film Skin Obsession de retour en accueil.', 'Le nouveau film, au bouchon doré, dans Summer Vibes.'];
  if (!ready) return (
    <Paper>
      <Side kick="En ligne ce week-end" title={['Le site,', 'version *simplifiée.*']} lines={lines} />
      <div style={{ position: 'absolute', left: 760, top: 300, width: 1000, height: 500, border: `1px dashed ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontSize: 18, letterSpacing: '.16em', textTransform: 'uppercase', color: C.gold }}>Captures du site du week-end · à venir</div>
      <Hud n="04" label="Le site de ce week-end" at={20} />
    </Paper>
  );
  // une capture par temps : ordinateur à gauche, iPhone à droite quand il existe
  const per = Math.floor((dur - 20) / WE.length);
  const k = Math.min(WE.length - 1, Math.floor(f / per));
  const s = WE[k], t = f - k * per;
  const o = Math.min(ramp(t, 0, 14, io), k === WE.length - 1 ? 1 : 1 - ramp(t, per - 10, per, io));
  return (
    <Paper>
      <Side kick="En ligne ce week-end" title={['Le site,', 'version *simplifiée.*']} lines={lines} />
      <div style={{ position: 'absolute', left: 640, top: 150, opacity: o }}>
        <Browser w={s.m ? 860 : 1190} src={`recap/we/${s.d}`} y={kf(t, [[0, 0], [60, 0], [per, s.y || 0]])} siteW={1440} />
        {s.m && <div style={{ position: 'absolute', left: 900, top: -30 }}><Phone w={300} src={`recap/we/${s.m}`} y={kf(t, [[0, 0], [60, 0], [per, s.ym || 0]])} /></div>}
        <div style={{ position: 'absolute', left: 0, top: (s.m ? 860 : 1190) * 0.625 + 80, width: 860, fontFamily: serif, fontSize: 26, color: C.ink }}>{s.label}</div>
      </div>
      <Hud n="04" label="Le site de ce week-end" at={20} />
    </Paper>
  );
};

// ---------------------------------------------------------------- 6. et ensuite
const Suite = () => {
  const f = useCurrentFrame();
  const items = [
    ['Shopify', 'Le thème et l’import sont prêts : passage sur libreryparfum.com dès les accès à la boutique.'],
    ['Vos photos', 'Packagings, fourreaux et coffrets, pour les visuels de marque.'],
    ['Bougies', 'La page attend son contenu.'],
    ['Boutiques', 'La liste des nouveaux points de vente (dont la Hongrie).'],
  ];
  return (
    <Paper alt>
      <div style={{ position: 'absolute', left: 90, top: 120 }}>
        <Kick at={2}>Et ensuite</Kick>
        <Words lines={['La *suite.*']} at={8} size={96} color={C.ink} style={{ marginTop: 22 }} />
      </div>
      <div style={{ position: 'absolute', left: 760, top: 150, width: 1060 }}>
        {items.map(([t, d], i) => {
          const p = ramp(f, 20 + i * 16, 44 + i * 16);
          return <div key={t} style={{ borderTop: '1px solid rgba(47,43,40,.18)', padding: '30px 0', display: 'flex', gap: 40, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
            <span style={{ fontFamily: display, fontSize: 24, color: C.gold, width: 40 }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontFamily: serif, fontSize: 36, width: 260 }}>{t}</span>
            <span style={{ fontFamily: serif, fontSize: 25, lineHeight: 1.4, color: C.grey, flex: 1 }}>{d}</span>
          </div>;
        })}
      </div>
    </Paper>
  );
};
const Fin = ({ dur }) => {
  const f = useCurrentFrame();
  const logo = ramp(f, 4, 44);
  return (
    <Dark>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 560, opacity: logo, filter: `blur(${(1 - logo) * 14}px)`, marginTop: -60 }}>
          <Img src={staticFile('img/logo-librery-paris-cream.svg')} style={{ width: '100%', display: 'block' }} />
        </div>
        <div style={{ marginTop: 50, fontFamily: sans, fontSize: 20, letterSpacing: '.08em', color: 'rgba(239,230,214,.6)', opacity: ramp(f, 40, 60) }}>librery-refonte.vercel.app</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#000', opacity: ramp(f, dur - 40, dur, io) }} />
    </Dark>
  );
};

export const RSCENES = [
  ['ouverture', 165, Ouverture], ['notes', 165, Notes], ['code', 210, Code], ['stores', 150, Stores], ['paiement', 165, Paiement],
  ['fiche', 165, Fiche], ['titre3d', 120, Titre3D], ['chevet', 300, Chevet], ['sillage', 255, Sillage], ['feuille', 330, Feuille],
  ['carton', 150, Carton], ['weekend', WE.length ? 165 * WE.length + 20 : 180, Weekend], ['suite', 210, Suite], ['fin', 150, Fin],
];
export const RTOTAL = RSCENES.reduce((s, [, d]) => s + d, 0);
const FADES = { ouverture: [0, 8], fin: [8, 0] };

export const Recap = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Audio src={staticFile('audio/aeria.mp3')} volume={f => interpolate(f, [0, 20, RTOTAL - 90, RTOTAL], [0, 0.85, 0.85, 0], clamp)} />
      {RSCENES.map(([k, d, P]) => {
        const [fi, fo] = FADES[k] || [8, 8];
        const s = <Sequence key={k} from={at} durationInFrames={d} name={k}><Fade dur={d} inn={fi} outn={fo}><P dur={d} /></Fade></Sequence>;
        at += d; return s;
      })}
      <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(120% 100% at 50% 50%, transparent 60%, rgba(0,0,0,.12) 100%)' }} />
    </AbsoluteFill>
  );
};
