// 시나리오 고르기 화면 + 적벽 수전 화면
import { chromium } from 'playwright';
const SH = '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.evaluate(() => { Setup.scen = 208; Setup.open(); });
await p.waitForTimeout(400); await p.screenshot({ path: SH + 'scen_pick.png' });
await p.click('.modeCard >> nth=0'); await p.waitForTimeout(300); await p.screenshot({ path: SH + 'scen_rulers.png' });
// 손권으로 시작 → 사건 진행 (첫 선택지)
await p.evaluate(() => { Setup.start(G.officers.find(x => x.name === '손권').id); });
for (let i = 0; i < 40; i++) {
  await p.waitForTimeout(450);
  if (await p.evaluate(() => !$('#scrBattle').hidden)) break;
  const bt = await p.$('#modalLayer .btn.pri');
  if (bt) { await bt.click(); continue; }
  await p.evaluate(() => { if (!$('#busy') || $('#busy').hidden) document.querySelector('#bEnd')?.click(); });
}
const inBattle = await p.evaluate(() => !$('#scrBattle').hidden);
console.log('battle', inBattle, await p.evaluate(() => `${G.year}.${G.month} ev=${Object.keys(G.ev).slice(-4).join(',')}`));
if (inBattle) {
  await p.waitForTimeout(1500); await p.screenshot({ path: SH + 'chibi0.png' });
  console.log(await p.evaluate(() => { const B = BattleUI.B; return JSON.stringify({ chained: B.chained, kuyuk: B.kuyuk, wind: B.wind, units: B.units.map(u => bOff(u).name + (u.ally ? '*' : '') + ':' + u.side + ':' + u.troops) }); }));
  // 아군 차례 넘기기 몇 번
  for (let d = 0; d < 3; d++) { await p.evaluate(() => { const B = BattleUI.B; for (const u of B.units) if (u.side === B.playerSide) u.done = true; }); await p.evaluate(() => BattleUI.endPhase && BattleUI.endPhase()); await p.waitForTimeout(4000); }
  await p.screenshot({ path: SH + 'chibi1.png' });
  console.log(await p.evaluate(() => { const B = BattleUI.B; return 'day ' + B.day + ' fires ' + B.tiles.filter(t => t.fire).length + ' att ' + B.units.filter(u => u.alive && u.side === 0).reduce((a, u) => a + u.troops, 0); }));
}
console.log('ERR', errs);
await b.close();
