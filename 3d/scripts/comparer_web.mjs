// Capture la page /parfum depuis la caméra ajustée de chaque photo
// (ajustement.json), pour comparer photo | rendu web.
//
//   node 3d/scripts/comparer_web.mjs http://localhost:8080 3d/renders/web
//
// Nécessite Playwright (npm i -g playwright) et un serveur sur maquette/ :
//   npx http-server maquette -p 8080
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");

const [, , base = "http://localhost:8080", out = "3d/renders/web", echelle = "2"] = process.argv;
const here = path.dirname(new URL(import.meta.url).pathname);
const fit = JSON.parse(fs.readFileSync(path.join(here, "ajustement.json"), "utf8"));
const HAUTEUR = 420;                       // hauteur de travail d'ajuster.py
const TAILLES = {                          // taille des détourés d'origine
  "ambert-sunset": [699, 1508], "tonka-love": [569, 1054],
  "vanilla-plum": [467, 969], "magnetic-flowers": [400, 877],
};
const s = Number(echelle);
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
for (const [handle, cam] of Object.entries(fit.cameras)) {
  const [W, H] = TAILLES[handle];
  const w = Math.round(W * HAUTEUR / H), h = HAUTEUR;
  const page = await browser.newPage({ viewport: { width: w * s, height: h * s }, ignoreHTTPSErrors: true });
  if (process.env.THREE_LOCAL) {
    // Copie locale de three (réseau instable) : THREE_LOCAL=/chemin/vers/three/
    await page.route("https://cdn.jsdelivr.net/npm/three@0.170.0/**", (r) => r.fulfill({
      body: fs.readFileSync(process.env.THREE_LOCAL + r.request().url().split("three@0.170.0/")[1]),
      contentType: "application/javascript",
    }));
    await page.route("https://fonts.**", (r) => r.abort());
  }
  page.on("pageerror", (e) => console.log(handle, "erreur :", e.message));
  await page.goto(`${base}/parfum/?fixe#${handle}`);
  await page.waitForSelector("#loading", { state: "detached", timeout: 90000 });
  const [yaw, pitch, dist, f, cx, cy] = cam;
  await page.evaluate(([c, w, h]) => window.flacon.photo(c, w, h),
    [[yaw, pitch, dist, f * s, cx * s, cy * s], w * s, h * s]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, `${handle}.png`) });
  await page.close();
  console.log("capture", handle);
}
await browser.close();
