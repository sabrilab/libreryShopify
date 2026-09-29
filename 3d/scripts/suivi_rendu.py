"""Suivi des rendus vidéo en cours : images faites, secondes par image,
fin estimée, pour chaque parfum. Lit les dossiers 3d/videos/<parfum>/.

    python 3d/scripts/suivi_rendu.py              # état actuel (JSON)
    python 3d/scripts/suivi_rendu.py --boucle 60  # une ligne JSON par minute, quand ça bouge

Dans le JSON, "apercu" est le chemin de la dernière image rendue.
"""
import argparse
import glob
import json
import os
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEOS = os.path.join(ROOT, "videos")
ORDRE = ["magnetic-flowers", "vanilla-plum", "tonka-love"]
NOMS = {"magnetic-flowers": "Magnetic Flowers", "vanilla-plum": "Vanilla Plum", "tonka-love": "Tonka Love"}
IMAGES_24 = 360            # 15 s à 24 i/s


def etat():
    parfums, total_restant = [], 0.0
    vitesse_connue = None
    for h in ORDRE:
        d = os.path.join(VIDEOS, h)
        imgs = sorted(glob.glob(os.path.join(d, "img_*.jpg")), key=os.path.getmtime)
        mp4 = os.path.join(VIDEOS, h + ".mp4")
        n = len(imgs)
        # Une image sur deux si img_0001, img_0003… ; sinon toutes.
        nums = sorted(int(os.path.basename(f)[4:8]) for f in imgs)
        pas = (nums[1] - nums[0]) if len(nums) > 1 else 1
        total = IMAGES_24 // pas
        dates = [os.path.getmtime(f) for f in imgs]
        s_img = None
        if n >= 3 and dates:
            recents = dates[-min(12, n):]
            s_img = (recents[-1] - recents[0]) / (len(recents) - 1)
            vitesse_connue = s_img
        # Prête quand le MP4 est écrit et n'a plus bougé depuis 20 s (le
        # montage avec interpolation prend une bonne minute).
        fini = n >= total and os.path.exists(mp4) and (not dates or os.path.getmtime(mp4) >= dates[-1]) \
            and time.time() - os.path.getmtime(mp4) > 20
        # Images d'un rendu interrompu, pas encore effacées : ce parfum attend son tour.
        if not fini and dates and time.time() - dates[-1] > 180:
            imgs, dates, n = [], [], 0
        if fini:
            statut = "prête"
        elif n >= total:
            statut = "montage"
        elif n == 0:
            statut = "en attente"
        else:
            statut = "en cours"
        restant = 0.0 if fini else (total - n) * (s_img or vitesse_connue or 5.5) + 20
        total_restant += restant
        parfums.append({
            "handle": h, "nom": NOMS[h], "statut": statut, "faites": min(n, total), "total": total,
            "s_par_image": round(s_img, 2) if s_img else None,
            "restant_s": round(restant), "fin_estimee": None,
            "apercu": imgs[-1] if imgs else None,
            "derniere_image_a": round(dates[-1]) if dates else None,
        })
    # Les vidéos passent l'une après l'autre : la fin de chacune s'additionne.
    maintenant, cumul = time.time(), 0.0
    for p in parfums:
        if p["statut"] == "prête":
            continue
        if p["statut"] == "en attente" and vitesse_connue:
            p["restant_s"] = round(p["total"] * vitesse_connue + 20)
        cumul += p["restant_s"]
        p["fin_estimee"] = round(maintenant + cumul)
    return {"maj": round(maintenant), "parfums": parfums, "fin_tout": round(maintenant + cumul)}


def document(chemin, videos=None):
    """Écrit l'état + une miniature (data URI JPEG 180×320) de la dernière
    image de chaque vidéo : c'est le document lu par la page de suivi."""
    import base64
    import io
    from PIL import Image
    e = etat()
    apercus = {}
    for p in e["parfums"]:
        src = p.pop("apercu")
        if src and os.path.exists(src):
            im = Image.open(src).convert("RGB")
            im.thumbnail((180, 320))
            b = io.BytesIO()
            im.save(b, "JPEG", quality=72)
            apercus[p["handle"]] = "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
        elif os.path.exists(os.path.join(VIDEOS, p["handle"] + ".mp4")) and p["statut"] == "prête":
            pass
    e["apercus"] = apercus
    # Liens des vidéos terminées, lisibles sur la page (fichier tenu à jour
    # à chaque vidéo publiée).
    if videos and os.path.exists(videos):
        e["videos"] = json.load(open(videos))
    with open(chemin, "w") as f:
        json.dump(e, f, ensure_ascii=False)
    return e


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--boucle", type=float, help="intervalle en secondes")
    ap.add_argument("--document", help="écrit le document de la page de suivi (JSON)")
    ap.add_argument("--videos", help="JSON {parfum: lien de la vidéo} à joindre au document")
    a = ap.parse_args()
    if a.document:
        e = document(a.document, a.videos)
        print(json.dumps({"maj": e["maj"], "etat": [(p["handle"], p["statut"], p["faites"]) for p in e["parfums"]]}))
    elif not a.boucle:
        print(json.dumps(etat(), ensure_ascii=False))
    else:
        dernier = None
        while True:
            e = etat()
            cle = [(p["faites"], p["statut"]) for p in e["parfums"]]
            if cle != dernier:
                print(json.dumps(e, ensure_ascii=False), flush=True)
                dernier = cle
            if all(p["statut"] == "prête" for p in e["parfums"]):
                break
            time.sleep(a.boucle)
