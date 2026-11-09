import { GAME, SHOTS } from './env.mjs';
// 초상화 모음
import { chromium } from 'playwright';
const SH = SHOTS;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(GAME);
const names = process.argv[2] ? process.argv[2].split(',') : null;
await p.evaluate(names => {
  newGame({});
  const list = names ? names.map(n => G.officers.find(o => o.name === n)) : G.officers.slice(0, 60);
  document.body.innerHTML = '<div id="gal" style="display:grid;grid-template-columns:repeat(12,96px);gap:6px;padding:10px;background:#0e1417"></div>';
  for (const o of list) { const d = document.createElement('div'); d.style.cssText = 'color:#eee;font:12px sans-serif;text-align:center'; d.innerHTML = `<img src="${portraitURL(o)}" width="96" height="112"><div>${o.name}</div>`; document.getElementById('gal').append(d); }
}, names);
await p.waitForTimeout(300);
await p.screenshot({ path: SH + 'gallery.png', fullPage: true });
console.log('ERR', errs);
await b.close();
