import { GAME, SHOTS } from './env.mjs';
// 화면 모음: PC·태블릿·폰
import { chromium, devices } from 'playwright';
const SH = SHOTS + 'shots/';
import fs from 'fs'; fs.mkdirSync(SH, { recursive: true });
const b = await chromium.launch();
const errs = [];
for (const [tag, ctxOpt] of [['pc', { viewport: { width: 1366, height: 768 } }], ['tab', { viewport: { width: 1024, height: 768 }, hasTouch: true }], ['phone', devices['iPhone 13']]]) {
  const ctx = await b.newContext(ctxOpt); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(tag + ' ' + e.message));
  await p.goto(GAME); await p.waitForTimeout(900);
  await p.screenshot({ path: SH + tag + '_1title.png' });
  await p.evaluate(() => { window.__fast = true; Setup.scen = 190; Setup.open(); }); await p.waitForTimeout(400);
  await p.screenshot({ path: SH + tag + '_2setup.png' });
  await p.evaluate(() => Setup.start(G.officers.find(x => x.name === '유비').id)); await p.waitForTimeout(500);
  await p.screenshot({ path: SH + tag + '_3intro.png' });
  for (let i = 0; i < 6; i++) { const bt = await p.$('#modalLayer.on footer .btn.pri'); if (!bt) break; await bt.click(); await p.waitForTimeout(300); }
  await p.waitForTimeout(500); await p.screenshot({ path: SH + tag + '_4map.png' });
  await p.evaluate(() => UI.officerInfo(G.officers.find(x => x.name === '관우'))); await p.waitForTimeout(400);
  await p.screenshot({ path: SH + tag + '_5officer.png' });
  await p.evaluate(() => { document.querySelector('#modalLayer.on footer .btn')?.click(); });
  await p.waitForTimeout(300);
  // 전투
  await p.evaluate(() => { const c = G.cities[me().city]; const to = G.cities[ADJ[c.id].find(i => G.cities[i].f >= 0 && G.cities[i].f !== c.f && officersIn(i, G.cities[i].f).length) ?? ADJ[c.id][0]]; const army = officersIn(c.id, c.f).slice(0, 3).map(o => ({ oid: o.id, troops: 2000, type: autoType(o) })); c.troops = Math.max(c.troops, 8000); window.__w = runWar(c, to, army, 2000); });
  await p.waitForTimeout(1600);
  for (let i = 0; i < 3; i++) { const bt = await p.$('#modalLayer.on footer .btn.pri'); if (!bt) break; await bt.click(); await p.waitForTimeout(500); }
  await p.waitForTimeout(800); await p.screenshot({ path: SH + tag + '_6battle.png' });
  await ctx.close();
}
console.log('ERR', errs); await b.close();
