import { GAME } from './env.mjs';
// 전투 통계: AI끼리 몇 해를 돌려 공성 승률·전투 일수·세력 크기를 봄
import { chromium } from 'playwright';
const runs = +(process.argv[2] || 2), months = +(process.argv[3] || 96), scen = +(process.argv[4] || 190);
const b = await chromium.launch();
const errs = []; const all = [];
for (let r = 0; r < runs; r++) {
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(GAME); await p.evaluate(() => window.__fast = true);
  await p.evaluate(scen => {
    Setup.diff = 1; Setup.hist = true; Setup.scen = scen; Setup.open(); Setup.start(G.officers.find(x => x.name === '공융').id);
    UI.modal = async o => (o.buttons && o.buttons.length ? (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k : 'ok');
    window.__bs = [];
    BattleUI.run = async B => { B.auto = true; runBattleHeadless(B); };
    const orig = runBattleHeadless;
    window.runBattleHeadless = runBattleHeadless = function (B) { const at = B.units.filter(u => u.side === 0).reduce((a, u) => a + u.troops, 0), dt = B.units.filter(u => u.side === 1).reduce((a, u) => a + u.troops, 0), n0 = B.units.filter(u => u.side === 0).length, w0 = B.wall; const t0 = performance.now(); const r = orig(B); window.__bs.push({ win: r.win, day: B.day, at, dt, n0, w0, ms: performance.now() - t0, why: r.why, naval: !!B.naval }); return r; };
  }, scen);
  for (let i = 0; i < months; i++) await p.evaluate(() => endMonth());
  const res = await p.evaluate(() => ({ bs: window.__bs, line: G.factions.filter(f => f.alive).map(f => [f.key, citiesOf(f.id).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x.join('')).join(' '), year: G.year }));
  all.push(...res.bs); console.log(`판${r + 1} ${res.year}: ${res.line} · 전투 ${res.bs.length}`);
  await p.close();
}
const n = all.length, aw = all.filter(x => x.win === 0).length;
const avg = k => (all.reduce((a, x) => a + x[k], 0) / Math.max(1, n)).toFixed(1);
const fav = all.filter(x => x.at > x.dt * 1.5), favW = fav.filter(x => x.win === 0).length;
console.log(`전투 ${n} · 공격 승률 ${(aw / n * 100).toFixed(0)}% · 평균 ${avg('day')}일 · 평균 ${avg('ms')}ms · 병력 1.5배 이상 공격 ${fav.length}건 승률 ${(favW / Math.max(1, fav.length) * 100).toFixed(0)}%`);
const why = {}; all.forEach(x => why[x.why] = (why[x.why] || 0) + 1); console.log(why);
console.log('ERR', errs.slice(0, 5));
await b.close();
