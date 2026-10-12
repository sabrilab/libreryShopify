const { chromium } = require('/Users/svbri/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/Users/svbri/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); await p.goto('file://' + path.resolve('bois.html'));
  for (const [n, w, h, ex, ey, expo] of [['bureau', 2400, 820, 9.6, 3.3, 1.6], ['bureau-m', 1200, 900, 4.4, 3.3, 1.6]]) {
    const d = await p.evaluate(a => window.cuire(...a), [w, h, ex, ey, expo]);
    fs.writeFileSync(n + '.png', Buffer.from(d.split(',')[1], 'base64')); console.log(n);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
