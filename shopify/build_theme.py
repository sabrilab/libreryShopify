#!/usr/bin/env python3
"""
LIBRERY — fabrique le thème Shopify (dossier shopify/theme/) à partir de la maquette.

    cd maquette && python3 build.py        # d'abord : pages assemblées et ?v= à jour
    python3 shopify/build_theme.py         # puis : thème Shopify régénéré
    shopify theme check --path shopify/theme
    shopify theme push --unpublished --path shopify/theme   # jour J, voir shopify/MIGRATION.md

Principe (« pont ») : la maquette reste la source. Le thème reprend ses pages assemblées, son CSS et ses scripts
presque tels quels ; seules changent les adresses (Shopify : /products/…, /collections/…, /pages/…),
l'hébergement des médias (réglage du thème « base_medias ») et le panier, qui passe à la caisse Shopify.
Les gabarits écrits à la main (mise en page, pont de données, caisse) sont dans shopify/theme-src/.

Chaque retouche du code de la maquette est une substitution exacte comptée : si la maquette change au point
qu'une substitution ne s'applique plus, le script s'arrête et dit laquelle (plutôt qu'un thème faux en silence).
Après une modification de la maquette (par exemple le nouveau chevet en images Blender), relancer ce script.
"""
import json
import re
import shutil
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
MAQ = RACINE / 'maquette'
SRC = RACINE / 'shopify' / 'theme-src'
OUT = RACINE / 'shopify' / 'theme'

# pages de la maquette → modèle Shopify. « page.<suffixe> » = page Shopify au gabarit de ce suffixe.
PAGES = {
    'index': 'index',
    'bibliotheque': 'page.bibliotheque',
    'preface': 'page.preface',
    'lexique': 'page.lexique',
    'points-de-vente': 'page.points-de-vente',
    'portrait-olfactif': 'page.portrait-olfactif',
    'offrir': 'page.offrir',
    'services': 'page.services',
    'contact': 'page.contact',
    'produit': 'product',
    'collection': 'collection',
}
# /labo (non lié dans la navigation) et /parfum/ (visionneuse à ne pas montrer) ne passent pas sur Shopify.

ROUTES_PAGES = 'bibliotheque|preface|lexique|points-de-vente|portrait-olfactif|offrir|services|contact'

ERREURS = []


def remplacer(texte, ancien, nouveau, fois, ou):
    """Substitution exacte, comptée : `fois` occurrences attendues (None = au moins une)."""
    n = texte.count(ancien)
    if (fois is None and n == 0) or (fois is not None and n != fois):
        ERREURS.append(f'{ou} : « {ancien[:70]} » trouvé {n} fois, {fois if fois is not None else "≥ 1"} attendu')
        return texte
    return texte.replace(ancien, nouveau)


def routes(texte):
    """Adresses de la maquette → adresses Shopify (dans le HTML comme dans le JS)."""
    texte = re.sub(r'/produit\?p=', '/products/', texte)
    texte = re.sub(r'/collection\?c=', '/collections/', texte)
    # /bibliotheque, /preface… quand l'adresse commence une chaîne ou un attribut (pas « page-bibliotheque »)
    texte = re.sub(r'(?<=["\'`])/(' + ROUTES_PAGES + r')(?=[?#"\'`]|$)', r'/pages/\1', texte)
    return texte


def medias_js(texte, ou):
    """'/assets/…' et '/parfum/…' → préfixés par window.LIBRERY_BASE (vide = même site, comme la maquette)."""
    n = 0

    def guillemet(m):
        nonlocal n
        n += 1
        return f'(LIBRERY_BASE + {m.group(1)}/{m.group(2)}/'

    def gabarit(m):
        nonlocal n
        n += 1
        return f'{m.group(1)}${{LIBRERY_BASE}}/{m.group(2)}/'

    # début d'une chaîne '…' ou "…" : on referme la parenthèse à la fin de la chaîne
    texte = re.sub(r'''(['"])/(assets|parfum)/((?:(?!\1).)*)\1''',
                   lambda m: (guillemet(m) + m.group(3) + m.group(1) + ')'), texte)
    # dans un gabarit `…` : début du gabarit ou url(…)
    texte = re.sub(r'(`|\()/(assets|parfum)/', gabarit, texte)
    reste = re.sub(r'''LIBRERY_BASE \+ ['"]/|\$\{LIBRERY_BASE\}/''', '', texte)
    reste = re.sub(r'/\*.*?\*/', '', reste, flags=re.S)
    reste = re.sub(r'(?m)^\s*//.*$', '', reste)
    for m in re.finditer(r'''(?<![\w.:/-])/(assets|parfum)/''', reste):
        ligne = reste[:m.start()].count('\n') + 1
        ERREURS.append(f'{ou} : adresse /{m.group(1)}/ non préfixée (vers la ligne {ligne}) : {reste[m.start():m.start() + 60]!r}')
    return texte, n


def medias_html(texte):
    """Dans le HTML d'une section : la base des médias vient du réglage du thème."""
    return re.sub(r'(?<=["\' ,(])/(assets|parfum)/', r'{{ settings.base_medias }}/\1/', texte)


def lire_page(nom):
    html = (MAQ / f'{nom}.html').read_text(encoding='utf-8')
    corps = re.search(r'<body([^>]*)>', html)
    attrs = dict(re.findall(r'([\w-]+)="([^"]*)"', corps.group(1)))
    main = re.search(r'<main>\n?(.*?)\n?</main>', html, re.S).group(1)
    # scripts propres à la page (Leaflet…) : entre </div id=site-footer> et les scripts communs
    fin = html[html.index('</main>'):]
    propres = [l for l in fin.splitlines()
               if (l.startswith('<script') or l.startswith('<link')) and '/assets/js/' not in l]
    titre = re.search(r'<title>(.*?)</title>', html).group(1)
    if '{{' in main or '{%' in main:
        ERREURS.append(f'{nom}.html contient déjà des balises Liquid')
    return {'attrs': attrs, 'main': main, 'scripts': propres, 'titre': titre}


def section(nom, corps, intitule):
    schema = {'name': intitule[:25], 'tag': 'div', 'class': f'librery-{nom}'}
    return (f'{{%- comment -%}} Généré par shopify/build_theme.py depuis maquette/{nom}.html — ne pas éditer ici. {{%- endcomment -%}}\n'
            f'{corps}\n\n{{% schema %}}\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n{{% endschema %}}\n')


# --------------------------------------------------------------------------------------------------
# Retouches de main.js : adresses lues dans le contexte Shopify, panier vers la caisse Shopify.
MAIN_JS = [
    # collection demandée : le contexte Shopify (window.LIBRERY_CTX), plus le paramètre ?c= de la maquette
    ("const asked = new URLSearchParams(location.search).get('c');",
     "const asked = (window.LIBRERY_CTX || {}).collection || null;  // Shopify : /collections/<handle>", 1),
    ("if (asked !== null && asked !== key) { const u = new URL(location.href); u.searchParams.set('c', key); history.replaceState(null, '', u); }",
     "// Shopify : une collection masquée est dépubliée (404 + redirection), l'adresse ne se réécrit plus ici", 1),
    ("const askedP = new URLSearchParams(location.search).get('p');",
     "const askedP = (window.LIBRERY_CTX || {}).product || null;  // Shopify : /products/<handle>", 1),
    ("if (askedP && askedP !== p.handle && PAUSED_PRODUCTS.some(x => x.handle === askedP)) { const u = new URL(location.href); u.searchParams.set('p', p.handle); history.replaceState(null, '', u); }",
     "// Shopify : un produit en pause est un brouillon (404 + redirection), l'adresse ne se réécrit plus ici", 1),
    # panier : un format épuisé ou absent de la boutique ne s'ajoute pas
    ("  function addToCart(handle, fmtId, sel) {\n",
     "  function addToCart(handle, fmtId, sel) {\n"
     "    const refus = window.LIBRERY_SHOPIFY && LIBRERY_SHOPIFY.refus(handle, fmtId);  // Shopify : stock et variantes\n"
     "    if (refus) return toast(refus);\n", 1),
    # compte client et pages légales : celles de Shopify (pages déjà présentes dans la boutique actuelle)
    ('<button type="button" class="u-hide" data-toast="Le compte client sera celui de Shopify">Compte</button>',
     '<a class="u-hide" href="/account">Compte</a>', 1),
    ('<a href="#" data-toast="Pages légales reprises de Shopify">CGV</a>',
     '<a href="/pages/conditions-generales-de-vente-cgv">CGV</a>', 1),
    ('<a href="#" data-toast="Pages légales reprises de Shopify">Mentions légales</a>',
     '<a href="/pages/mentions-legales">Mentions légales</a>', 1),
    ('<a href="#" data-toast="Pages légales reprises de Shopify">Confidentialité</a>',
     '<a href="/pages/politique-de-confidentialite">Confidentialité</a>', 1),
    # « Commander » : la caisse Shopify (assets/librery-shopify.js) au lieu du message d'attente
    ('<button class="btn btn--block" data-toast="Le paiement sera celui de Shopify">Commander</button>',
     '<button class="btn btn--block" data-checkout>Commander</button>', 1),
]


def construire():
    if OUT.exists():
        shutil.rmtree(OUT)
    for d in ('layout', 'templates', 'sections', 'snippets', 'assets', 'config', 'locales'):
        (OUT / d).mkdir(parents=True)

    # 1. fichiers écrits à la main
    for f in SRC.rglob('*'):
        if f.is_file():
            cible = OUT / f.relative_to(SRC)
            cible.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, cible)

    # 2. scripts
    js = MAQ / 'assets' / 'js'
    bilan = {}
    for nom in ('logo.js', 'imgw.js', 'paiement.js', 'data.js', 'main.js', 'chevet3d.js', 'chevet-photo.js', 'sillage3d.js'):
        t = (js / nom).read_text(encoding='utf-8')
        if nom == 'main.js':
            for ancien, nouveau, fois in MAIN_JS:
                t = remplacer(t, ancien, nouveau, fois, nom)
        t = routes(t)
        t, n = medias_js(t, nom)
        bilan[nom] = n
        (OUT / 'assets' / nom).write_text(t, encoding='utf-8')

    # 3. feuille de style : url(/assets/…) → réglage du thème (style.css.liquid)
    css = (MAQ / 'assets' / 'css' / 'style.css').read_text(encoding='utf-8')
    if '{{' in css or '{%' in css:
        ERREURS.append('style.css contient « {{ » ou « {% »')
    css, n = re.subn(r'url\((["\']?)/(assets|parfum)/', r'url(\1{{ settings.base_medias }}/\2/', css)
    bilan['style.css'] = n
    (OUT / 'assets' / 'style.css.liquid').write_text(css, encoding='utf-8')

    # 4. pages → sections + modèles
    pages = {}
    for nom, modele in PAGES.items():
        p = lire_page(nom)
        pages[nom] = p
        corps = medias_html(routes(p['main']))
        if nom == 'contact':
            corps = remplacer(corps, '<form class="form" id="contact-form">',
                              '<form class="form" id="contact-form" method="post" action="{{ routes.root_url | append: \'/contact\' | replace: \'//\', \'/\' }}#contact-form">'
                              '<input type="hidden" name="form_type" value="contact"><input type="hidden" name="utf8" value="✓">', 1, 'contact.html')
            corps = corps.replace('<input id="c-name"', '<input id="c-name" name="contact[name]"')
            corps = corps.replace('<input id="c-mail"', '<input id="c-mail" name="contact[email]"')
            corps = corps.replace('<select id="c-sub"', '<select id="c-sub" name="contact[Sujet]"')
            corps = corps.replace('<textarea id="c-msg"', '<textarea id="c-msg" name="contact[body]"')
        if nom == 'produit':
            corps += '\n{% render \'librery-produit-shopify\', product: product %}'
        if nom == 'collection':
            corps += '\n{% render \'librery-collection-shopify\', collection: collection %}'
        (OUT / 'sections' / f'librery-{nom}.liquid').write_text(section(nom, corps, p['titre'].split(' — ')[0]), encoding='utf-8')
        (OUT / 'templates' / f'{modele}.json').write_text(json.dumps(
            {'sections': {'main': {'type': f'librery-{nom}', 'settings': {}}}, 'order': ['main']}, indent=2), encoding='utf-8')

    # 5. attributs <body>, titre courant et scripts propres à chaque page → snippet lu par layout/theme.liquid
    lignes = ['{%- comment -%} Généré par shopify/build_theme.py : attributs <body> et scripts propres à chaque page de la maquette. {%- endcomment -%}',
              '{%- case lp -%}']
    for nom, p in pages.items():
        a = p['attrs']
        lignes.append(f"  {{%- when '{nom}' -%}}")
        attrs = f'data-page="{a.get("data-page", "")}" class="{a.get("class", "")}"' + (f' data-run="{a["data-run"]}"' if a.get('data-run') else '')
        lignes.append(f"    {{%- if partie == 'body' -%}}{attrs}{{%- else -%}}{''.join(l.replace('<script src=', '<script defer src=') for l in p['scripts'])}{{%- endif -%}}")
    lignes.append("  {%- else -%}")
    lignes.append("    {%- if partie == 'body' -%}data-page=\"page\" class=\"\"{%- endif -%}")
    lignes.append('{%- endcase -%}')
    (OUT / 'snippets' / 'librery-page.liquid').write_text('\n'.join(lignes) + '\n', encoding='utf-8')

    # 6. écran de chargement (SVG du logo) : repris de la maquette
    loader = re.search(r'(<div class="loader" id="loader".*?</span></div>)', (MAQ / 'index.html').read_text(encoding='utf-8'), re.S)
    # (la version simplifiée du 15/10 n'a plus d'écran de chargement : snippet vide dans ce cas)
    (OUT / 'snippets' / 'librery-loader.liquid').write_text((loader.group(1) if loader else '') + '\n', encoding='utf-8')

    if ERREURS:
        print('ÉCHEC — la maquette a changé à un endroit que le thème retouche :', file=sys.stderr)
        for e in ERREURS:
            print('  - ' + e, file=sys.stderr)
        sys.exit(1)
    print('thème Shopify écrit dans', OUT.relative_to(RACINE))
    print('adresses de médias préfixées :', ', '.join(f'{k} {v}' for k, v in bilan.items() if v))


if __name__ == '__main__':
    construire()
