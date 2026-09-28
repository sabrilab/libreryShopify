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


def text_line(draw, text, cap_mm, z_baseline, tracking=0.06, max_w=40):
    """Centre une ligne dont la hauteur des capitales vaut cap_mm."""
    text = text.upper()
    probe = ImageFont.truetype(FONT, 400)
    cap = probe.getbbox("H")[3] - probe.getbbox("H")[1]
    size = int(400 * cap_mm * MM / cap)
    while True:
        font = ImageFont.truetype(FONT, size)
        track = tracking * size
        widths = [font.getlength(ch) for ch in text]
        total = sum(widths) + track * (len(text) - 1)
        if total <= max_w * MM:
            break
        size -= 4
    x = (SIZE - total) / 2
    y = y_of(z_baseline)
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=(255, 255, 255, 255), anchor="ls")
        x += w + track


def build(handle, lines):
    img = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))

    emblem = Image.open(EMBLEM).convert("RGBA")
    h = int(16.5 * MM)
    w = int(emblem.width * h / emblem.height)
    emblem = emblem.resize((w, h), Image.LANCZOS)
    img.alpha_composite(emblem, ((SIZE - w) // 2, int(y_of(72.0) - h / 2)))

    draw = ImageDraw.Draw(img)
    if len(lines) == 1:
        text_line(draw, lines[0], 3.0, 50.8)
        text_line(draw, "EXTRAIT DE PARFUM", 1.55, 47.6, tracking=0.04)
    else:
        text_line(draw, lines[0], 3.0, 53.6)
        text_line(draw, lines[1], 3.0, 49.4)
        text_line(draw, "EXTRAIT DE PARFUM", 1.55, 46.2, tracking=0.04)

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
