// Briques du film : maquettes navigateur et iPhone, textes qui arrivent, curseur, images clés.
import React from 'react';
import { AbsoluteFill, Easing, Img, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from 'remotion';

// polices du site, servies en local (Libre Caslon Display et Text, Hanken Grotesk)
const FONTS = [
  ['Libre Caslon Display', 'normal', '400', 'LibreCaslonDisplay-normal-400'],
  ['Libre Caslon Text', 'normal', '400', 'LibreCaslonText-normal-400'],
  ['Libre Caslon Text', 'italic', '400', 'LibreCaslonText-italic-400'],
  ['Hanken Grotesk', 'normal', '400', 'HankenGrotesk-normal-400'],
  ['Hanken Grotesk', 'normal', '500', 'HankenGrotesk-normal-500'],
];
const wait = delayRender('polices');
Promise.all(FONTS.flatMap(([fam, style, weight, file]) => ['latin', 'latin-ext'].map(sub => {
  const ff = new FontFace(fam, `url(${staticFile(`fonts/${file}-${sub}.woff2`)}) format('woff2')`, { style, weight });
  return ff.load().then(x => document.fonts.add(x));
}))).then(() => continueRender(wait), e => { console.error(e); continueRender(wait); });

export const display = "'Libre Caslon Display', Georgia, serif";
export const serif = "'Libre Caslon Text', Georgia, serif";
export const sans = "'Hanken Grotesk', Arial, sans-serif";

export const C = { paper: '#f4efe6', paper2: '#ebe4d8', ink: '#2f2b28', grey: '#6f665d', gold: '#b7916a', dark: '#231a13', cream: '#efe6d6' };
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
export const io = Easing.bezier(0.65, 0, 0.35, 1);
export const out = Easing.bezier(0.16, 1, 0.3, 1);
export const BEAT = 18; // ≈ 100 battements par minute à 30 images/s

/** valeur interpolée entre des images clés [[image, valeur], …] */
export const kf = (f, pts, e = io) => {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (f <= pts[i][0]) return interpolate(f, [pts[i - 1][0], pts[i][0]], [pts[i - 1][1], pts[i][1]], { ...clamp, easing: e });
  }
  return pts[pts.length - 1][1];
};
export const ramp = (f, a, b, e = out) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: e });

export const Dark = ({ children, style }) => (
  <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 65% 40%, #3a2c20 0%, ${C.dark} 60%, #160f0a 100%)`, color: C.cream, ...style }}>{children}</AbsoluteFill>
);
export const Paper = ({ children, alt, style }) => (
  <AbsoluteFill style={{ background: alt ? C.paper2 : C.paper, color: C.ink, ...style }}>{children}</AbsoluteFill>
);

/** fondu d'entrée et de sortie d'une scène (images locales) */
export const Fade = ({ dur, inn = 10, outn = 10, children }) => {
  const f = useCurrentFrame();
  const o = Math.min(inn ? ramp(f, 0, inn, io) : 1, outn ? 1 - ramp(f, dur - outn, dur, io) : 1);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const Lock = () => (
  <svg viewBox="0 0 10 12" style={{ width: '.7em', height: '.85em' }}><path d="M2 5V3.5a3 3 0 0 1 6 0V5M1.5 5h7v6h-7z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
);

/** navigateur : `y` = défilement en pixels CSS du site (largeur 1440) */
export const Browser = ({ w, src, y = 0, siteW = 1440, path = '', dark, fit, style }) => (
  <div style={{ position: 'absolute', width: w, fontSize: (w / 1000) * 16, borderRadius: '.75em', overflow: 'hidden', background: '#fff',
    boxShadow: dark ? '0 3.5em 6em -2.5em rgba(0,0,0,.8)' : '0 3em 6em -2.5em rgba(40,28,18,.45), 0 1em 2em -1.4em rgba(40,28,18,.25)', ...style }}>
    <div style={{ height: '2.25em', background: dark ? '#3a2e25' : '#e6e0d6', display: 'flex', alignItems: 'center', gap: '.44em', padding: '0 .9em', position: 'relative' }}>
      {[0, 1, 2].map(i => <i key={i} style={{ width: '.62em', height: '.62em', borderRadius: '50%', background: dark ? '#5e4f42' : '#cdc3b4' }} />)}
      <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', height: '1.9em', padding: '0 1.4em', minWidth: '38%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.6em',
        borderRadius: '.6em', background: dark ? '#2c221a' : '#f5f1ea', fontFamily: sans, fontSize: '.72em', color: dark ? '#b9a893' : '#7c7064', whiteSpace: 'nowrap' }}>
        <Lock />librery-refonte.vercel.app{path}
      </span>
    </div>
    <div style={{ height: w * 0.625, overflow: 'hidden', position: 'relative', background: C.paper }}>
      <Img src={staticFile(src)} style={fit ? { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' } : { width: '100%', display: 'block', transform: `translateY(${(-y * w) / siteW}px)` }} />
    </div>
  </div>
);

/** iPhone graphite : `w` = largeur de l'écran ; `y` = défilement en pixels CSS (largeur 390) */
export const Phone = ({ w, src, y = 0, siteW = 390, fit, style }) => (
  <div style={{ position: 'absolute', width: w, height: (w * 844) / 390, padding: '.5625em', boxSizing: 'content-box', fontSize: (w / 290) * 16, borderRadius: '3.25em',
    background: 'linear-gradient(150deg, #3b3632 0%, #121110 45%, #2a2623 100%)',
    boxShadow: 'inset 0 0 0 .1em rgba(255,255,255,.16), inset 0 0 0 .19em #0c0b0a, 0 3em 5em -2.2em rgba(10,6,4,.6), 0 1.2em 2em -1.4em rgba(10,6,4,.4)', ...style }}>
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '2.75em', overflow: 'hidden', background: '#f8f5ef' }}>
      <Img src={staticFile(src)} style={fit ? { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' } : { width: '100%', display: 'block', transform: `translateY(${(-y * w) / siteW}px)` }} />
      <span style={{ position: 'absolute', top: '.7em', left: '50%', transform: 'translateX(-50%)', width: '31%', height: '1.7em', borderRadius: '1.25em', background: '#050505' }} />
    </div>
  </div>
);

/** texte qui monte mot à mot, derrière un masque. `lines` : tableau de lignes ; *mot* = italique */
export const Words = ({ lines, at = 0, size = 96, color, stagger = 3, dur = 26, font = display, lh = 1.04, style, align }) => {
  const f = useCurrentFrame();
  let k = 0;
  return (
    <div style={{ fontFamily: font, fontSize: size, lineHeight: lh, color, textAlign: align, letterSpacing: '-.01em', ...style }}>
      {lines.map((line, li) => (
        <div key={li}>
          {line.split(' ').map((word, i, arr) => {
            const it = word.startsWith('*');
            const p = ramp(f, at + k * stagger, at + k++ * stagger + dur);
            return (
              <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0 .04em .14em', margin: '0 -.04em -.14em' }}>
                <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 108}%)`, fontFamily: it ? serif : undefined, fontStyle: it ? 'italic' : undefined }}>
                  {word.replace(/\*/g, '')}{i < arr.length - 1 ? ' ' : ''}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** petite ligne en capitales (surtitre) qui apparaît en fondu */
export const Kick = ({ children, at = 0, color = C.gold, style }) => {
  const f = useCurrentFrame(); const p = ramp(f, at, at + 20);
  return <div style={{ fontFamily: sans, fontSize: 17, letterSpacing: '.16em', textTransform: 'uppercase', color, opacity: p, transform: `translateY(${(1 - p) * 12}px)`, ...style }}>{children}</div>;
};

/** filet qui se trace */
export const Rule = ({ at = 0, dur = 30, color = 'rgba(47,43,40,.2)', style }) => {
  const f = useCurrentFrame();
  return <div style={{ height: 1, background: color, transformOrigin: 'left', transform: `scaleX(${ramp(f, at, at + dur, io)})`, ...style }} />;
};

export const Cursor = ({ x, y, press = 0 }) => (
  <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: x, top: y, width: 40, height: 40, transform: `scale(${1 - press * 0.15})`, transformOrigin: '6px 4px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.3))', zIndex: 20 }}>
    <path d="M5 3l14 8-6.2 1.6L9.5 19z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

/** légende de chapitre en bas de l'écran */
export const Hud = ({ n, label, dark, at = 6 }) => {
  const f = useCurrentFrame(); const p = ramp(f, at, at + 20);
  const col = dark ? 'rgba(239,230,214,.55)' : 'rgba(47,43,40,.55)';
  return (
    <div style={{ position: 'absolute', left: 80, right: 80, bottom: 44, display: 'flex', justifyContent: 'space-between', fontFamily: sans, fontSize: 15, letterSpacing: '.14em', textTransform: 'uppercase', color: col, opacity: p }}>
      <span><b style={{ color: C.gold, fontWeight: 400, marginRight: 18 }}>{n}</b>{label}</span>
      <span>librery-refonte.vercel.app</span>
    </div>
  );
};
