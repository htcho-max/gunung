import { chromium } from 'playwright';
const SH = '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.evaluate(() => { Setup.open(); Setup.start(G.officers.find(x => x.name === '유비').id); UI._close('ok'); });
await p.waitForTimeout(300);
await p.evaluate(() => { const c = G.cities[CITY_BY_NAME['평원']], t = G.cities[CITY_BY_NAME['남피']]; c.troops = 12000; runWar(c, t, [{ oid: G.officers.find(o => o.name === '관우').id, troops: 5000, type: 'cav' }, { oid: me().id, troops: 4000, type: 'inf' }, { oid: G.officers.find(o => o.name === '장비').id, troops: 3000, type: 'cav' }], 4000); });
await p.waitForTimeout(1300); await p.click('#modalLayer .btn.pri'); await p.waitForTimeout(800);
await p.evaluate(() => { const B = BattleUI.B; const g = B.units.find(u => bOff(u).name === '관우'); const e = B.units.find(u => u.side === 1); e.at = hexNb(g.at)[0]; BattleUI.duel(g, e, 0); });
await p.waitForTimeout(1200); await p.screenshot({ path: SH + 'duel0.png' }); await p.click('#modalLayer footer .btn >> nth=1'); await p.waitForTimeout(330);
await p.screenshot({ path: SH + 'duel.png' });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(1100); const bt = await p.$('#modalLayer footer .btn:not([disabled])'); if (!bt) continue; const t = await bt.textContent(); if (/전장으로/.test(t)) { await p.screenshot({ path: SH + 'duel_end.png' }); break; } await bt.click(); }
console.log('ERR', errs);
await b.close();
