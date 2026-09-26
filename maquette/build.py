"""Assemble les pages : src/<page>.html (+ en-tête commun src/_head.html) -> <page>.html
Chaque fichier src commence par une ligne « <!-- title: ... | page: ... | body: ... --> »."""
import re, pathlib
root = pathlib.Path(__file__).parent
head = (root / 'src/_head.html').read_text(encoding='utf8')
for f in sorted((root / 'src').glob('[!_]*.html')):
    src = f.read_text(encoding='utf8')
    meta = dict(re.findall(r'(\w+):\s*([^|]+?)\s*(?:\||-->)', src.split('\n', 1)[0]))
    body = src.split('\n', 1)[1]
    out = (head.replace('{{TITLE}}', meta.get('title', 'LIBRERY'))
           + f'</head>\n<body data-page="{meta.get("page", "")}" class="{meta.get("body", "")}">\n'
           + '<div id="site-header"></div>\n<main>\n' + body.rstrip() + '\n</main>\n<div id="site-footer"></div>\n'
           + meta.get('scripts', '').replace('\\n', '\n')
           + '<script src="/assets/js/data.js"></script>\n<script src="/assets/js/main.js"></script>\n</body>\n</html>\n')
    (root / f.name).write_text(out, encoding='utf8')
    print('ok', f.name)
