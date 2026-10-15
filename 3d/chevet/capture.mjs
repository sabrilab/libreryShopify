// Exporte la scène du chevet (géométrie + poses) et le chemin de caméra pour une taille d'écran
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const TRAVAIL = process.env.CHEVET_TRAVAIL || `${RACINE}/3d/chevet/travail`;
const [W, H, N, tag] = [+process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
const SITE = 'http://localhost:4173';
const NM = process.env.THREE_LOCAL || '';   // three@0.170.0 local (si le CDN est inaccessible)
const src = fs.readFileSync(`${RACINE}/maquette/assets/js/chevet3d.js`, 'utf8');
const patched = src.replace('fond.chevet = ctl;', `fond.chevet = ctl; ctl.exp = { camera, tracer, placer, couverture, scene, POSES, rangees, cat, corps, plateau, etagere, bandeau, FONDS, meuble, CAISSON, K, NICHES, CLES, SPOTS, MURS, key, rim, LARG, CX, CW, CH, CT, POSE, catalogue: (P,u,v,C,lv)=>catalogue(P,u,v,C,lv), miseAuPoint };`);
if (patched === src) throw new Error('patch');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const mobile = W < 800;
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
if (NM) await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.170\.0\/(.*)/, async r => {
  const p = r.request().url().replace(/.*three@0\.170\.0\//, '');
  await r.fulfill({ path: `${NM}/${p}`, contentType: 'text/javascript' });
});
await page.route(/\/assets\/js\/chevet3d\.js/, r => r.fulfill({ body: patched, contentType: 'text/javascript' }));
await page.addInitScript(() => { try { sessionStorage.setItem('librery-vu', '1'); } catch (e) {} });
await page.goto(SITE + '/?qualite=basse&etapes=1&adapte=0', { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('.flip__chevet')?.chevet?.exp, null, { timeout: 600000 });
const data = await page.evaluate(async ({ N }) => {
  const ctl = document.querySelector('.flip__chevet').chevet, E = ctl.exp, cam = E.camera;
  const track = document.querySelector('.flip');
  const cv = E.couverture(0), C = E.tracer(cv);
  const frames = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, v = C.v(u); E.placer(v, C.A); cam.updateMatrixWorld();
    frames.push({ u, v, m: [...cam.matrixWorld.elements], focus: E.miseAuPoint(v) });
  }
  // la couverture CSS dans la fenêtre (référence pour recaler la séquence)
  const canvas = document.querySelector('.flip__chevet canvas').getBoundingClientRect();
  return { fov: cam.fov, aspect: cam.aspect, near: cam.near, cw: canvas.width, ch: canvas.height, cv, vF: C.vF, vC: C.vC, frames,
    poses: E.POSES.map(p => ({ handle: p.handle, niche: p.niche, x: p.x, y: p.y, z: p.z, lacet: p.f.rotation.y })),
    cle: ctl.cle(), caisson: E.CAISSON, larg: E.LARG, cx: E.CX, cat: { w: E.CW, h: E.CH, t: E.CT, pose: E.POSE }, bois: C.bois };
}, { N });
fs.writeFileSync(`${TRAVAIL}/out/camera-${tag}.json`, JSON.stringify(data));
if (process.argv[6] === 'glb') {
  const b64 = await page.evaluate(async () => {
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const THREE = await import('three');
    const E = document.querySelector('.flip__chevet').chevet.exp;
    const out = new THREE.Scene();
    const add = (o, name) => { const c = o.clone(false); c.name = name; c.geometry = o.geometry; o.updateMatrixWorld(true);
      c.matrixAutoUpdate = false; c.matrix.copy(o.matrixWorld); c.material = new THREE.MeshStandardMaterial({ name }); out.add(c); };
    add(E.corps, 'corps'); add(E.plateau, 'plateau'); add(E.etagere, 'etagere'); add(E.bandeau, 'bandeau');
    E.FONDS.forEach((f, i) => add(f, 'fond_' + i));
    const gl = await new GLTFExporter().parseAsync(out, { binary: true });
    let s = ''; const u8 = new Uint8Array(gl); for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192));
    return btoa(s);
  });
  fs.writeFileSync(`${TRAVAIL}/out/chevet-scene.glb`, Buffer.from(b64, 'base64'));
}
console.log('ok', tag, data.frames.length, data.cv, data.cw, data.ch);
await browser.close();
