"""Déclinaisons du flacon : seules la teinte du verre, celle du jus et
l'étiquette changent d'un parfum à l'autre. Couleurs mesurées sur les
photos détourées (contenu-actuel/images/detoures) : le jus au centre de
la face avant, le verre au socle, éclairci de moitié."""

# handle: (nom sur l'étiquette, teinte du verre, couleur du jus)
# Les couleurs sont en sRGB 0-1. Un verre "clair" vaut (1, 1, 1).
PARFUMS = {
    "ambert-sunset":    (["Ambert Sunset"],        (0.80, 0.60, 0.56), (0.77, 0.44, 0.35)),
    "hot-sand":         (["Hot Sand"],             (0.77, 0.67, 0.55), (0.67, 0.50, 0.32)),
    "magnetic-flowers": (["Magnetic", "Flowers"],  (1.00, 1.00, 1.00), (0.83, 0.71, 0.42)),
    "mango-wave":       (["Mango Wave"],           (0.56, 0.54, 0.72), (0.38, 0.31, 0.56)),
    "palmeira":         (["Palmeira"],             (0.72, 0.54, 0.70), (0.58, 0.17, 0.40)),
    "sun-ice":          (["Sun Ice"],              (0.87, 0.84, 0.59), (0.80, 0.73, 0.40)),
    "tonka-love":       (["Tonka Love"],           (1.00, 1.00, 1.00), (0.89, 0.69, 0.43)),
    "vanilla-plum":     (["Vanilla Plum"],         (1.00, 1.00, 1.00), (0.80, 0.55, 0.30)),
}
