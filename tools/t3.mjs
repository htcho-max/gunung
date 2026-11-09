import { GAME, SHOTS } from './env.mjs';
// 장수 플레이: 실제 전투 화면 코드를 자동 전투로 돌림
import { chromium } from 'playwright';
const who = process.argv[2] || '관우', months = +(process.argv[3] || 24);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
await p.goto(GAME); await p.evaluate(() => window.__fast = true);
await p.evaluate(who => {
  Setup.open(); Setup.start(G.officers.find(x => x.name === who).id);
  UI.modal = async o => (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k;
  const orig = BattleUI.run; window.__battles = 0;
  BattleUI.run = B => { window.__battles++; B.auto = true; BattleUI.fast = true; return orig.call(BattleUI, B); };
}, who);
for (let i = 0; i < months; i++) {
  await p.evaluate(async () => { // 개인 행동 3번
    const P = me(); if (P.st !== 'on' && P.st !== 'ronin') return;
    if (role() === 'officer') { for (let k = 0; k < 3 && G.ap > 0; k++) { const r = cmdDevelop(P, G.cities[P.city], ['agri', 'comm', 'order'][k]); if (r.ok) { G.ap--; P.merit += 15; } } }
  });
  await p.evaluate(() => endMonth());
}
console.log(await p.evaluate(() => `${me().name} ${me().st} ${role()} 공적${me().merit} ${G.cities[me().city].name} | 전투(직접) ${window.__battles} 전체 ${G.stats.battles}`));
console.log(await p.evaluate(() => G.log.filter(l => /관우|태수/.test(l.text)).slice(0, 6).map(l => l.t + ' ' + l.text).join('\n')));
console.log('ERR', errs.slice(0, 5));
await b.close();
