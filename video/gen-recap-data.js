// Liste les images de la vidéo récap pour Remotion (src/recap-data.js) : séquence du chevet (chevet/full si le rendu
// complet est là, sinon la planche découpée), cadran du sillage, captures du site du week-end (recap/we/we.json).
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, 'public/recap');
const ls = (d, re = /\.jpg$/) => fs.existsSync(`${R}/${d}`) ? fs.readdirSync(`${R}/${d}`).filter(f => re.test(f)).sort() : [];
const full = ls('chevet/full');
const data = {
  meta: JSON.parse(fs.readFileSync(`${R}/meta.json`)),
  chevet: full.length ? full.map(f => `full/${f}`) : ls('chevet/seq').map(f => `seq/${f}`),
  chevetTotal: full.length || 121,
  sillage: ls('sillage-magnetic-flowers').map(f => `sillage-magnetic-flowers/${f}`),
  visuels: ls('vm'),
  weekend: fs.existsSync(`${R}/we/we.json`) ? JSON.parse(fs.readFileSync(`${R}/we/we.json`)) : [],
};
fs.writeFileSync(path.resolve(__dirname, 'src/recap-data.js'), '// généré par gen-recap-data.js\nexport default ' + JSON.stringify(data) + ';\n');
console.log('chevet', data.chevet.length, 'sillage', data.sillage.length, 'week-end', data.weekend.length);
