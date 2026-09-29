"""Dossier client (PDF) des trois films Skin Obsession : intention,
structure, règles de composition fondées sur le nombre d'or, storyboard
plan par plan de chaque parfum (images tirées des vidéos).

    python 3d/scripts/dossier_client.py      # → 3d/dossier-client/LIBRERY-Skin-Obsession-films.pdf
"""
import html
import os
import subprocess

import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEOS = os.path.join(ROOT, "videos")
SORTIE = os.path.join(ROOT, "dossier-client")
POLICES = os.path.join(ROOT, "..", "video", "public", "fonts")
PHI = (1 + 5 ** 0.5) / 2

PARFUMS = [
    {
        "handle": "vanilla-plum", "nom": "Vanilla Plum",
        "accord": "Gourmand, fruité, ambré",
        "ingredients": "prune noire (entière et ouverte sur son noyau), gousses de vanille, fleur de vanillier, "
                       "bâton de cannelle, graines de vanille",
        "vedettes": ["la prune noire", "la gousse de vanille", "la fleur de vanillier"],
        "note": "La prune donne la chair et la couleur, la vanille la profondeur : les gousses souples dessinent "
                "les grandes diagonales du plan final, la fleur de vanillier apporte la lumière.",
    },
    {
        "handle": "magnetic-flowers", "nom": "Magnetic Flowers",
        "accord": "Floral blanc, fruité, lumineux",
        "ingredients": "poire Williams (entière, et une poire qui se fend puis s'ouvre), jasmin, tubéreuse, "
                       "fleur d'oranger, feuille de sauge, pétales",
        "vedettes": ["la poire", "le jasmin", "la fleur d'oranger"],
        "note": "La poire qui s'ouvre sur sa chair blanche fait le lien avec le thème de la peau ; les fleurs "
                "blanches, cireuses et translucides, donnent la sensualité de l'accord.",
    },
    {
        "handle": "tonka-love", "nom": "Tonka Love",
        "accord": "Ambré, boisé, chaleureux",
        "ingredients": "fèves tonka, amandes, pépite et ruban d'ambre, zeste d'agrume en spirale, copeau de santal",
        "vedettes": ["la fève tonka", "le zeste d'agrume", "l'ambre"],
        "note": "La fève tonka, ridée et presque noire, est la signature ; l'ambre et le zeste apportent la "
                "lumière dorée, les amandes et le santal la douceur boisée.",
    },
]

# Découpage commun (s). Les durées sont tirées du nombre d'or : voir la page
# « Règles ».
PLANS = [
    (0.00, 3.54, "Ouverture sur la peau", "La caméra part au ras de la peau de {v0} : on ne voit d'abord que sa "
     "texture. Elle glisse le long de la surface, puis remonte et recule pour révéler l'ingrédient entier."),
    (3.54, 4.89, "Le capot", "Gros plan sur le capot or rose et son emblème gravé, en légère orbite."),
    (4.89, 7.08, "Deuxième ingrédient", "Même mouvement de drone : départ sur la texture de {v1}, puis "
     "révélation."),
    (7.08, 8.43, "Troisième ingrédient", "Frôlement plus long sur {v2}, qui prépare le retour au flacon."),
    (8.43, 9.27, "L'étiquette", "Glissé de l'épaule du flacon vers son nom."),
    (9.27, 15.0, "La révélation", "La caméra recule depuis le capot jusqu'au flacon entier, centré. Pendant ce "
     "temps, les ingrédients sont attirés vers un point situé au dos du flacon et s'y posent en grappe."),
]
# Images du storyboard : (temps, légende courte).
IMAGES = [
    (0.35, "0,35 s · la peau"), (1.60, "1,6 s · la surface défile"), (3.20, "3,2 s · l'ingrédient révélé"),
    (4.20, "4,2 s · le capot gravé"), (5.30, "5,3 s · deuxième texture"), (6.80, "6,8 s · révélation"),
    (7.60, "7,6 s · troisième ingrédient"), (8.85, "8,85 s · l'étiquette"), (10.2, "10,2 s · recul"),
    (11.8, "11,8 s · l'attraction"), (13.4, "13,4 s · la grappe se pose"), (14.7, "14,7 s · plan final"),
]


def images(handle):
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    src = os.path.join(VIDEOS, handle + ".mp4")
    dos = os.path.join(SORTIE, "images", handle)
    os.makedirs(dos, exist_ok=True)
    chemins = []
    for t, _ in IMAGES:
        out = os.path.join(dos, f"{t:05.2f}.jpg")
        subprocess.run([ff, "-y", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1",
                        "-q:v", "3", out], check=True)
        chemins.append(out)
    return chemins


def police(nom, fichier, poids=400, style="normal"):
    return (f"@font-face{{font-family:'{nom}';src:url('file://{os.path.abspath(os.path.join(POLICES, fichier))}') "
            f"format('woff2');font-weight:{poids};font-style:{style};}}")


def e(s):
    return html.escape(s)


def fmt(x):
    return f"{x:.2f}".replace(".", ",")


def page_storyboard(p, chemins):
    v = p["vedettes"]
    cases = "".join(
        f'<figure><img src="file://{c}"><figcaption>{e(leg)}</figcaption></figure>'
        for c, (_, leg) in zip(chemins, IMAGES))
    plans = "".join(
        f'<tr><td class="t">{fmt(a)} – {fmt(b)} s</td><td><b>{e(titre)}</b> · '
        f'{e(txt.format(v0=v[0], v1=v[1], v2=v[2]))}</td></tr>'
        for a, b, titre, txt in PLANS)
    return f"""
<section class="page parfum">
  <header class="tete"><span class="sur">04 · Storyboard</span><h2>{e(p['nom'])}</h2><span class="accord">{e(p['accord'])}</span></header>
  <div class="planche">{cases}</div>
  <div class="deux">
    <table class="plans">{plans}</table>
    <div class="ing">
      <h3>Les ingrédients</h3>
      <p>{e(p['ingredients'])[0].upper() + e(p['ingredients'])[1:]}.</p>
      <p>{e(p['note'])}</p>
    </div>
  </div>
</section>"""


def frise():
    """Frise des 15 s, à l'échelle, avec les repères φ."""
    L = 100.0
    blocs = []
    for a, b, titre, _ in PLANS:
        blocs.append(f'<div class="bloc{" rev" if a >= 9.27 else ""}" style="left:{a / 15 * L:.3f}%;'
                     f'width:{(b - a) / 15 * L:.3f}%"><span>{e(titre)}</span><i>{fmt(b - a)} s</i></div>')
    return f"""<div class="frise">{''.join(blocs)}
      <div class="repere" style="left:{9.27 / 15 * 100:.3f}%"><span>15 / φ = 9,27 s</span></div></div>
      <div class="graduation">{''.join(f'<span style="left:{k / 15 * 100:.3f}%">{k}</span>' for k in range(0, 16, 1))}</div>"""


def construire():
    os.makedirs(SORTIE, exist_ok=True)
    planches = {p["handle"]: images(p["handle"]) for p in PARFUMS}
    finales = "".join(f'<figure><img src="file://{planches[p["handle"]][-1]}"><figcaption>{e(p["nom"])}</figcaption></figure>'
                      for p in PARFUMS)
    css = "".join([
        police("Caslon Display", "LibreCaslonDisplay-normal-400-latin.woff2"),
        police("Caslon Text", "LibreCaslonText-normal-400-latin.woff2"),
        police("Caslon Text", "LibreCaslonText-italic-400-latin.woff2", style="italic"),
        police("Hanken", "HankenGrotesk-normal-400-latin.woff2"),
        police("Hanken", "HankenGrotesk-normal-500-latin.woff2", 500),
    ]) + CSS
    doc = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>LIBRERY · Skin Obsession · films</title>
<style>{css}</style></head><body>

<section class="page couverture">
  <div class="haut"><span class="marque">LIBRERY</span><span>Paris</span></div>
  <div class="titre">
    <span class="sur">Collection Skin Obsession</span>
    <h1>Trois films<br>d'ingrédients</h1>
    <p class="chapo">Vanilla Plum · Magnetic Flowers · Tonka Love<br>Format vertical 9:16, 15 secondes</p>
  </div>
  <div class="trio">{finales}</div>
  <p class="pied">Dossier de réalisation : intention, structure, règles de composition et storyboard.</p>
</section>

<section class="page">
  <header class="tete"><span class="sur">01</span><h2>L'intention</h2></header>
  <div class="colonnes">
    <div>
      <h3>La peau, d'abord</h3>
      <p>Skin Obsession parle de la peau. Chaque film commence donc au plus près d'une matière : la peau
      mouchetée d'une poire, le velouté d'une prune, les rides d'une fève tonka, le grain d'un zeste. On ne
      reconnaît pas encore l'ingrédient, on le touche presque. Puis la caméra prend de la hauteur et le révèle.</p>
      <h3>Une danse d'ingrédients</h3>
      <p>Les ingrédients de chaque parfum flottent et tournent lentement dans un décor beige chaud, éclairé par
      une lumière rasante. Ils sont choisis parmi les notes du parfum pour leur force évocatrice, et modélisés
      d'après nature : rien n'est parfaitement droit ni symétrique.</p>
      <h3>Le parfum qui attire</h3>
      <p>Au moment où le flacon apparaît en entier, les ingrédients sont attirés vers un point situé à son dos.
      Ils convergent en s'enroulant légèrement, ralentissent et se posent en grappe resserrée autour de lui : le
      parfum rassemble ses matières. Le film se termine sur ce plan produit, flacon centré.</p>
    </div>
    <div>
      <h3>Une série</h3>
      <p>Les trois films partagent la même structure, les mêmes mouvements de caméra et le même décor. Seuls les
      ingrédients, le jus et l'étiquette changent : ils se reconnaissent comme une collection et peuvent être
      diffusés ensemble ou séparément.</p>
      <h3>Le flacon, fidèle</h3>
      <p>Le flacon est modélisé à ses cotes réelles : verre facetté de 63 × 48 × 103,5 mm, capot de
      36,5 × 31,3 × 28,3 mm en or rose, emblème gravé sur le dessus du capot, étiquette sérigraphiée aux
      dimensions des flacons de la boutique, dans la typographie du catalogue.</p>
      <h3>Ce que sont ces vidéos</h3>
      <p>Ce sont des animatiques 3D : elles fixent le mouvement, le rythme, les cadrages et la composition. Le
      rendu final photoréaliste sera produit à partir de ces mouvements et des photos réelles des produits.</p>
    </div>
  </div>
</section>

<section class="page">
  <header class="tete"><span class="sur">02</span><h2>La structure</h2></header>
  <p class="intro">Quinze secondes en deux temps : une traversée des matières, puis la révélation du flacon.
  La bascule tombe au nombre d'or de la durée, à 15 / φ = 9,27 s (φ = 1,618).</p>
  {frise()}
  <table class="plans large">{''.join(f'<tr><td class="t">{fmt(a)} – {fmt(b)} s</td><td><b>{e(t)}</b> · {e(x.format(v0="l’ingrédient vedette", v1="un deuxième ingrédient", v2="un troisième ingrédient"))}</td></tr>' for a, b, t, x in PLANS)}</table>
  <p class="intro">Les plans d'ingrédients sont montés en coupes franches, sans fondus : le rythme vient du
  mouvement de caméra à l'intérieur de chaque plan. Plus longue, la révélation est d'un seul tenant.</p>
</section>

<section class="page">
  <header class="tete"><span class="sur">03</span><h2>Les règles du nombre d'or</h2></header>
  <p class="intro">Le nombre d'or, φ = (1 + √5) / 2 ≈ 1,618, et ses dérivés (1/φ = 0,618, 1/φ² = 0,382,
  l'angle d'or de 137,5°, la suite de Fibonacci) règlent les temps, les angles et les proportions du mouvement.</p>
  <div class="regles">
    <div><h3>Temps</h3><ul>
      <li>La révélation du flacon commence à <b>15 / φ = 9,27 s</b>.</li>
      <li>Les durées des plans sont des divisions successives par φ : <b>3,54 s · 2,19 s · 1,35 s · 0,84 s</b>
      (chacune vaut la précédente divisée par 1,618).</li>
      <li>Dans chaque plan d'ingrédient, le frôlement de la peau occupe <b>1/φ² = 38 %</b> du plan, la
      révélation les 62 % restants.</li>
      <li>Pour Magnetic Flowers, la poire se fissure à <b>3,54 / φ² = 1,35 s</b>, puis s'ouvre en deux.</li>
    </div>
    <div><h3>Angles</h3><ul>
      <li>En remontant, la caméra tourne autour de l'ingrédient de <b>137,5° / φ² = 52,5°</b> : l'angle d'or
      ramené à la durée du plan.</li>
      <li>Chaque moitié de la poire pivote de <b>34°</b> (nombre de Fibonacci) vers la caméra.</li>
      <li>Pendant l'attraction, les ingrédients s'enroulent autour du flacon de <b>1/φ radian</b> au plus, puis
      se posent sans pirouette.</li>
    </div>
    <div><h3>Mouvement</h3><ul>
      <li>Au sortir de la peau, la caméra s'éloigne selon une progression géométrique : sa distance est
      multipliée par le même facteur à chaque instant, ce qui donne une vitesse perçue constante, comme un
      drone qui prend de la hauteur.</li>
      <li>L'attraction suit une courbe <b>1 − (1 − t)^φ²</b> : un départ franc puis une longue décélération
      jusqu'à la pose.</li>
      <li>Les ingrédients n'arrivent jamais en paquet : leurs départs sont échelonnés selon la suite
      <b>k · φ</b> (partie décimale), qui répartit les instants le plus régulièrement possible.</li>
    </div>
    <div><h3>Composition</h3><ul>
      <li>Le plan final réunit <b>8 ingrédients</b> (nombre de Fibonacci), choisis parmi les plus évocateurs ;
      les autres quittent doucement le cadre pendant le recul.</li>
      <li>Ils convergent vers un point placé au dos du flacon, à mi-hauteur, et se resserrent autour de lui.</li>
      <li>Le flacon est centré dans le cadre 9:16 et occupe près de la moitié de sa hauteur.</li>
      <li>Les ingrédients ne se touchent jamais et ne traversent jamais le flacon : ils s'effleurent et
      s'écartent, comme en apesanteur.</li>
    </div>
  </div>
</section>

{''.join(page_storyboard(p, planches[p['handle']]) for p in PARFUMS)}

<section class="page">
  <header class="tete"><span class="sur">05</span><h2>Le plan final</h2></header>
  <div class="trio grand">{finales}</div>
  <p class="intro">Même cadrage pour les trois films : flacon de face, centré, légèrement vu d'au-dessus ; les
  ingrédients forment derrière lui une grappe serrée qui déborde de sa silhouette, avec une grande diagonale
  (gousse, tige ou zeste) pour la dynamique. Ce dernier plan tient environ une seconde et demie : il se prête au
  packshot fixe, à la bannière et au visuel de fin.</p>
  <p class="intro">Les films sont livrés en 9:16. Le cadrage centré du flacon permet aussi des déclinaisons en 4:5
  et 1:1 pour les réseaux sociaux.</p>
</section>

</body></html>"""
    chemin_html = os.path.join(SORTIE, "dossier.html")
    with open(chemin_html, "w", encoding="utf-8") as f:
        f.write(doc)
    pdf = os.path.join(SORTIE, "LIBRERY-Skin-Obsession-films.pdf")
    script = f"""
const {{ chromium }} = require('/opt/node22/lib/node_modules/playwright');
(async () => {{
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://{chemin_html}', {{ waitUntil: 'load' }});
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({{ path: '{pdf}', format: 'A4', printBackground: true, preferCSSPageSize: true }});
  await b.close();
}})();"""
    subprocess.run(["node", "-e", script], check=True)
    return pdf


CSS = """
@page { size: A4; margin: 0; }
:root { --papier:#F1EBE2; --encre:#2B231D; --sourdine:#7A6D62; --filet:#D8CDBF; --or:#A8694A; --rev:#E7D2C2; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--papier); color: var(--encre); font-family: 'Hanken', 'Helvetica Neue', Arial, sans-serif;
  font-size: 9.6pt; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 210mm; height: 297mm; padding: 16mm 16mm 14mm; page-break-after: always; overflow: hidden;
  display: flex; flex-direction: column; gap: 6mm; background: var(--papier); }
h1, h2 { font-family: 'Caslon Display', Georgia, serif; font-weight: 400; margin: 0; line-height: 1.02; }
h3 { font-family: 'Hanken', sans-serif; font-weight: 500; font-size: 8pt; letter-spacing: .14em;
  text-transform: uppercase; color: var(--or); margin: 0 0 1.5mm; }
p { margin: 0 0 3mm; }
b { font-weight: 500; }
.sur { font-size: 8pt; letter-spacing: .18em; text-transform: uppercase; color: var(--sourdine); }
.tete { display: flex; align-items: baseline; gap: 5mm; border-bottom: .3mm solid var(--filet); padding-bottom: 3mm; }
.tete h2 { font-size: 26pt; }
.tete .accord { margin-left: auto; font-family: 'Caslon Text', Georgia, serif; font-style: italic; color: var(--sourdine); }
.couverture { justify-content: space-between; }
.couverture .haut { display: flex; justify-content: space-between; font-size: 8pt; letter-spacing: .3em; text-transform: uppercase; }
.couverture .marque { font-weight: 500; }
.couverture h1 { font-size: 44pt; margin: 3mm 0 4mm; }
.chapo { font-family: 'Caslon Text', Georgia, serif; font-style: italic; font-size: 12pt; color: var(--sourdine); }
.pied { font-size: 8.5pt; color: var(--sourdine); border-top: .3mm solid var(--filet); padding-top: 3mm; margin: 0; }
.trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; }
.trio figure { margin: 0; }
.trio img { width: 100%; aspect-ratio: 9/16; object-fit: cover; display: block; border-radius: 1mm; }
.trio figcaption { font-family: 'Caslon Text', Georgia, serif; font-size: 10pt; margin-top: 2mm; text-align: center; }
.trio.grand img { border-radius: 1.2mm; }
.colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: 9mm; }
.colonnes p { font-size: 9.8pt; }
.colonnes h3 { margin-top: 3mm; }
.intro { font-size: 10.2pt; max-width: 160mm; }
.frise { position: relative; height: 22mm; margin-top: 4mm; }
.bloc { position: absolute; top: 0; height: 100%; border: .3mm solid var(--papier); background: #E3D8CB;
  padding: 1.5mm 1.8mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
.bloc.rev { background: var(--rev); }
.bloc span { font-size: 7.2pt; line-height: 1.2; }
.bloc i { font-style: normal; font-size: 7pt; color: var(--sourdine); }
.repere { position: absolute; top: -4mm; bottom: -3mm; border-left: .5mm solid var(--or); }
.repere span { position: absolute; top: -4.5mm; left: 1.5mm; white-space: nowrap; font-size: 7.5pt; color: var(--or); font-weight: 500; }
.graduation { position: relative; height: 5mm; font-size: 6.5pt; color: var(--sourdine); }
.graduation span { position: absolute; transform: translateX(-50%); }
table.plans { border-collapse: collapse; width: 100%; font-size: 8.3pt; }
table.plans td { border-top: .25mm solid var(--filet); padding: 1.6mm 2mm 1.6mm 0; vertical-align: top; }
table.plans td.t { white-space: nowrap; color: var(--sourdine); width: 25mm; font-variant-numeric: tabular-nums; }
table.plans.large { font-size: 9.4pt; }
.regles { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm 9mm; }
.regles ul { margin: 0; padding-left: 4mm; }
.regles li { margin-bottom: 1.8mm; font-size: 9.2pt; }
.planche { display: grid; grid-template-columns: repeat(6, 1fr); gap: 2.5mm; }
.planche figure { margin: 0; }
.planche img { width: 100%; aspect-ratio: 9/16; object-fit: cover; display: block; border-radius: .8mm; }
.planche figcaption { font-size: 6.6pt; color: var(--sourdine); margin-top: 1mm; line-height: 1.25; }
.deux { display: grid; grid-template-columns: 1.55fr 1fr; gap: 7mm; }
.ing p { font-size: 8.8pt; }
"""

if __name__ == "__main__":
    print(construire())
