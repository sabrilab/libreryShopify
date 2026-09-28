"""Génère l'étiquette (sérigraphie dorée) de chaque parfum, et parfums.json.

La texture couvre un carré de 48 x 48 mm centré sur la face avant du
flacon (la texture est dessinée pour z = 36 à 84 mm ; geometrie.etiquette
place le plan 4,5 mm plus haut, de 40,5 à 88,5 mm, calé sur les photos). Noms en OPTIDelphian, la typo du catalogue. Blanc + canal alpha : la teinte or est
donnée par le matériau, pour que toutes les étiquettes partagent le même.

    python 3d/scripts/labels.py
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

from parfums import PARFUMS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMBLEM = os.path.join(ROOT, "..", "maquette", "assets", "img", "v2", "emblem-blanc.png")
# Typo des noms de parfum du catalogue (titres des fiches) : OPTIDelphian,
# capitales incises. Sous-ensemble extrait du PDF du catalogue
# (librery-catalogue-3d) : contient les lettres des huit noms et de
# « EXTRAIT DE PARFUM ».
FONT = os.path.join(ROOT, "fonts", "OPTIDelphian-sous-ensemble.cff")
WEB = os.path.join(ROOT, "..", "maquette", "parfum")  # servi sur /parfum
OUT = os.path.join(WEB, "labels")

SIZE = 2048
MM = SIZE / 48.0          # pixels par millimètre
TOP = 84.0                # z (mm) du bord haut de la texture (maquette de 100,6 mm)


def y_of(z_mm):
    return (TOP - z_mm) * MM


# Hauteurs réelles (mm depuis le dessous du flacon), relevées sur les photos
# studio de face (contenu-actuel/images/detoures, échelle : hauteur du
# flacon = 135,2 mm). La texture est dessinée 4,5 mm plus bas que le plan
# d'étiquette (voir l'en-tête) : on retranche DECALAGE.
DECALAGE = 4.5
EMBLEME_CENTRE, EMBLEME_H = 75.0, 19.0     # clé comprise, cercle ≈ 16 mm de large
NOM_BASE, NOM_CAP, NOM_LARGEUR = 52.9, 5.8, 35.5   # PALMEIRA 5,6 × 33 ; AMBERT SUNSET 4,0 × 36,5
INTERLIGNE = 6.0                           # MAGNETIC / FLOWERS
EXTRAIT_ECART, EXTRAIT_CAP, EXTRAIT_LARGEUR = 2.9, 2.2, 26.5


def text_line(draw, text, cap_mm, z_baseline, tracking=0.02, max_w=40.0, largeur=None, espace=1.0):
    """Centre une ligne dont la hauteur des capitales vaut cap_mm, réduite
    si elle dépasse max_w ; `largeur` impose la largeur exacte (en jouant
    sur l'interlettrage)."""
    text = text.upper()
    probe = ImageFont.truetype(FONT, 400)
    cap = probe.getbbox("H")[3] - probe.getbbox("H")[1]
    size = int(400 * cap_mm * MM / cap)
    while True:
        font = ImageFont.truetype(FONT, size)
        track = tracking * size
        widths = [font.getlength(ch) * (espace if ch == " " else 1) for ch in text]
        total = sum(widths) + track * (len(text) - 1)
        if total <= max_w * MM:
            break
        size -= 4
    if largeur:
        track = (largeur * MM - sum(widths)) / (len(text) - 1)
        total = largeur * MM
    x = (SIZE - total) / 2
    y = y_of(z_baseline - DECALAGE)
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=(255, 255, 255, 255), anchor="ls")
        x += w + track
    return total / MM, size


def build(handle, lines):
    img = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))

    emblem = Image.open(EMBLEM).convert("RGBA")
    h = int(EMBLEME_H * MM)
    w = int(emblem.width * h / emblem.height)
    emblem = emblem.resize((w, h), Image.LANCZOS)
    img.alpha_composite(emblem, ((SIZE - w) // 2, int(y_of(EMBLEME_CENTRE - DECALAGE) - h / 2)))

    draw = ImageDraw.Draw(img)
    base = NOM_BASE
    for k, ligne in enumerate(lines):
        largeur, _ = text_line(draw, ligne, NOM_CAP if len(lines) == 1 else 5.0, base, max_w=NOM_LARGEUR)
        print(f"  {ligne!r} : {largeur:.1f} mm de large")
        if k < len(lines) - 1:
            base -= INTERLIGNE
    text_line(draw, "EXTRAIT DE PARFUM", EXTRAIT_CAP, base - EXTRAIT_ECART, max_w=40, largeur=EXTRAIT_LARGEUR, espace=2.2)

    img.save(os.path.join(OUT, handle + ".png"), optimize=True)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for handle, (lines, _glass, _juice) in PARFUMS.items():
        build(handle, lines)
        print("étiquette", handle)

    # Même source pour la visionneuse Three.js.
    data = {h: {"nom": " ".join(l), "verre": g, "jus": j}
            for h, (l, g, j) in PARFUMS.items()}
    with open(os.path.join(WEB, "parfums.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
