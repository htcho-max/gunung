// 여러 성에서 함께 출진 (협공)
import { chromium } from 'playwright';
const SH = '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html');
const info = await p.evaluate(() => {
  window.__fast = true; Setup.scen = 200; Setup.open(); Setup.start(G.officers.find(x => x.name === '조조').id);
  const F = me().f;
  // 우리 성 둘 이상과 붙은 적 성
  let best = null;
  for (const t of G.cities) if (t.f >= 0 && t.f !== F && !isAlly(F, t.f)) { const n = ADJ[t.id].filter(i => G.cities[i].f === F && officersIn(i, F).length); if (n.length >= 2 && (!best || n.length > best[1].length)) best = [t, n]; }
  const [t, n] = best; window.__T = t.id; window.__C = n[0];
  for (const i of n) G.cities[i].troops = Math.max(G.cities[i].troops, 20000);
  return `${t.name} ← ${n.map(i => G.cities[i].name).join(',')}`;
});
console.log('target', info);
// 실제 창 열기
for (let i = 0; i < 4; i++) { const bt = await p.$('#modalLayer.on footer .btn.pri'); if (!bt) break; await bt.click(); await p.waitForTimeout(250); }
await p.evaluate(() => { const c = G.cities[window.__C]; const orig = UI.pickCity; UI.pickCity = async () => G.cities[window.__T]; window.__atk = UI.cmdAttack(c); });
await p.waitForTimeout(600);
// 협공 성의 장수 한 명 체크
const flankBox = await p.evaluate(() => { const lab = [...document.querySelectorAll('#modalLayer .tag')].find(x => x.closest('label')); return lab ? lab.closest('label').querySelector('input').id : null; });
console.log('flank checkbox', flankBox);
if (flankBox) { const n = await p.evaluate(() => document.querySelectorAll('#modalLayer input[type=checkbox]:checked').length); if (n >= 5) await p.click('#modalLayer input[type=checkbox]:checked >> nth=4'); await p.click('#' + flankBox); await p.waitForTimeout(200); }
await p.screenshot({ path: SH + 'flank_modal.png' });
const before = await p.evaluate(() => ADJ[window.__T].filter(i => G.cities[i].f === me().f).map(i => `${G.cities[i].name}:${G.cities[i].troops}`).join(' '));
await p.evaluate(() => { const orig = BattleUI.run.bind(BattleUI); BattleUI.run = B => { window.__B = B; B.auto = true; BattleUI.fast = true; return orig(B); }; UI.modal = async o => (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k; });
await p.click('#modalLayer footer .btn.red');
await p.waitForTimeout(2500); await p.screenshot({ path: SH + 'flank_battle.png' });
await p.evaluate(() => window.__atk);
console.log(await p.evaluate(() => { const B = window.__B; if (!B) return 'no battle'; return `units ${B.units.filter(u => u.side === 0).map(u => bOff(u).name + '@' + G.cities[u.src].name + (u.cmd ? '*' : '')).join(' ')} flankFrom ${(B.flankFrom || []).map(i => G.cities[i].name)} → win ${B.result.win} ${B.result.why}`; }));
console.log('before', before, '\nafter ', await p.evaluate(() => ADJ[window.__T].filter(i => G.cities[i].f === me().f).map(i => `${G.cities[i].name}:${G.cities[i].troops} [${officersIn(i, me().f).map(o => o.name).join(',')}]`).join(' ') + ' | target ' + G.cities[window.__T].name + ' f=' + facName(G.cities[window.__T].f)));
console.log('ERR', errs.slice(0, 3)); await b.close();
