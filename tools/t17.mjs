// 강제로 적이 쳐들어오게 해서(달 넘김 중처럼 덮개 켠 상태) 실제 클릭이 되는지
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.evaluate(() => {
  window.__fast = true; Setup.scen = 200; Setup.open(); Setup.start(G.officers.find(x => x.name === '유비').id);
  UI.modal = async o => (o.buttons.find(b => b.cls === 'pri' && !(b.check && !b.check())) || o.buttons[0]).k;
  BattleUI.fast = true;
  const to = G.cities[CITY_BY_NAME['소패']], from = G.cities[ADJ[to.id].find(i => G.cities[i].f >= 0 && G.cities[i].f !== to.f)];
  const offs = officersIn(from.id, from.f).slice(0, 3);
  const army = offs.map(o => ({ oid: o.id, troops: 3000, type: autoType(o) }));
  BUSY = true; UI.busy(true);
  window.__war = runWar(from, to, army, 6000).then(() => { window.__done = true; BUSY = false; UI.busy(false); });
});
let clicks = 0, blocked = false;
for (let k = 0; k < 400 && !(await p.evaluate(() => window.__done)); k++) {
  await p.waitForTimeout(250);
  const st = await p.evaluate(() => ({ phase: !!BattleUI.phaseDone, m: !!document.querySelector('#modalLayer.on footer .btn:not([disabled])') }));
  try {
    if (st.m) await p.click('#modalLayer.on footer .btn:not([disabled])', { timeout: 2000 });
    else if (st.phase) { await p.click('#bpanel .btn.red', { timeout: 2000 }); clicks++; }
  } catch (e) { blocked = true; console.log('BLOCKED', e.message.split('\n').slice(0, 12).join(' | ')); await p.screenshot({ path: '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/blocked.png' }); break; }
}
console.log('done', await p.evaluate(() => !!window.__done), 'clicks', clicks, 'blocked', blocked, 'ERR', errs.slice(0, 2));
await b.close();
