// 침공 방어 전투를 실제 마우스 클릭으로 진행 (덮개가 클릭을 막는지 확인)
import { chromium } from 'playwright';
const who = process.argv[2] || '원소', scen = +(process.argv[3] || 200), months = +(process.argv[4] || 12);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.evaluate(([who, scen]) => {
  window.__fast = true;
  Setup.scen = scen; Setup.open(); Setup.start(G.officers.find(x => x.name === who).id);
  UI.modal = async o => (o.buttons.find(b => b.cls === 'pri' && !(b.check && !b.check())) || o.buttons[0]).k;
  BattleUI.fast = true;
}, [who, scen]);
let clicks = 0, fails = 0, defended = 0;
for (let i = 0; i < months; i++) {
  const done = p.evaluate(async () => { await endMonth(); return true; });
  let fin = false; done.then(() => fin = true);
  const t0 = Date.now();
  while (!fin && Date.now() - t0 < 120000) {
    await p.waitForTimeout(200);
    const st = await p.evaluate(() => ({ phase: !!BattleUI.phaseDone, side: BattleUI.B && BattleUI.B.playerSide, duel: !!document.querySelector('#modalLayer.on footer .btn:not([disabled])') }));
    if (st.duel) { await p.click('#modalLayer.on footer .btn:not([disabled])', { timeout: 2000 }).catch(() => fails++); continue; }
    if (st.phase) {
      if (st.side === 1) defended++;
      try { await p.click('#bpanel .btn.red', { timeout: 3000 }); clicks++; } catch (e) { fails++; console.log('CLICK BLOCKED:', e.message.split('\n')[0]); break; }
    }
  }
  if (!fin) { console.log('STUCK', await p.evaluate(() => `${G.year}.${G.month}`)); break; }
}
console.log(who, scen, 'turn-end clicks', clicks, 'defense phases', defended, 'fails', fails, 'ERR', errs.slice(0, 3));
await b.close();
