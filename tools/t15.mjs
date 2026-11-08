// 침공당했을 때 멈춤 찾기: 실제 전투 화면으로 여러 달 진행
import { chromium } from 'playwright';
const who = process.argv[2] || '공융', months = +(process.argv[3] || 24), scen = +(process.argv[4] || 190);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.evaluate(([who, scen]) => {
  window.__fast = true; window.addEventListener('unhandledrejection', e => console.error('UNHANDLED ' + (e.reason && e.reason.stack || e.reason)));
  Setup.scen = scen; Setup.open(); Setup.start(G.officers.find(x => x.name === who).id);
  UI.modal = async o => (o.buttons.find(b => b.cls === 'pri' && !(b.check && !b.check())) || o.buttons[0]).k;
  BattleUI.fast = true; window.__bt = 0; window.__dm = 0; setInterval(() => { const bt = document.querySelector('#modalLayer.on footer .btn:not([disabled])'); if (bt) { window.__dm++; bt.click(); } }, 250);
  const pp = BattleUI.playerPhase.bind(BattleUI);
  BattleUI.playerPhase = function () { window.__bt++; const pr = pp(); setTimeout(() => this.endPhase(), 5); return pr; };
}, [who, scen]);
let stuck = false;
for (let i = 0; i < months; i++) {
  const r = await Promise.race([p.evaluate(async () => { await endMonth(); return `${G.year}.${G.month}`; }), new Promise(r => setTimeout(() => r('TIMEOUT'), 90000))]);
  if (r === 'TIMEOUT') { stuck = true; console.log('STUCK at', await p.evaluate(() => `${G.year}.${G.month} screen=${['scrGame','scrBattle'].filter(id => !$('#'+id).hidden)} modal=${$('#modalLayer').className} busy=${!$('#busy').hidden} B.over=${BattleUI.B && BattleUI.B.over} day=${BattleUI.B && BattleUI.B.day} side=${BattleUI.B && BattleUI.B.side} phase=${!!BattleUI.phaseDone}`)); await p.screenshot({ path: '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/stuck.png' }); break; }
  if (await p.evaluate(() => G.over)) break;
}
console.log(who, scen, 'battles(player phases)', await p.evaluate(() => window.__bt), 'stuck', stuck, await p.evaluate(() => `${G.year}.${G.month} ${me().st}`));
console.log('ERR', errs.slice(0, 4));
await b.close();
