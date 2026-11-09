// 여러 장수 한꺼번에 이동
import { GAME, SHOTS } from './env.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(GAME);
await p.evaluate(() => { window.__fast = true; Setup.scen = 200; Setup.open(); Setup.start(G.officers.find(x => x.name === '조조').id); });
for (let i = 0; i < 12; i++) { const bt = await p.$('#modalLayer.on footer .btn.pri') || await p.$('#modalLayer.on footer .btn'); if (!bt) break; await bt.click(); await p.waitForTimeout(300); }
const info = await p.evaluate(() => { const c = G.cities[me().city]; UI.sel = c.id; UI.refresh(); return `${c.name} 장수 ${officersIn(c.id, c.f).length}`; });
console.log(info);
await p.click('.cmd[title="이동"]'); await p.waitForTimeout(300);
await p.click('#modalLayer.on .pickList .offRow >> nth=0'); await p.waitForTimeout(150); // 첫 성
await p.click('#modalLayer.on footer .btn.pri'); await p.waitForTimeout(300);
const rows = await p.$$('#modalLayer.on .pickList.multi .offRow');
for (const i of [0, 1, 2]) await rows[i].click();
await rows[1].click(); // 하나 빼기
await p.screenshot({ path: SHOTS + 'multi_move.png' });
const picked = await p.$$eval('#modalLayer.on .pickList.multi .offRow.on .n', xs => xs.map(x => x.textContent));
await p.click('#modalLayer.on footer .btn.pri'); await p.waitForTimeout(300);
const r = await p.evaluate(names => names.map(n => { const o = G.officers.find(x => x.name === n); return `${n}@${G.cities[o.city].name}${o.travel ? '→' + G.cities[o.travel.to].name : ''} acted=${o.acted}`; }).join(' | '), picked);
console.log('picked', picked.join(','), '\n', r, '\nERR', errs);
await b.close();
