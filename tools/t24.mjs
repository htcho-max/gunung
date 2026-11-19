import { GAME, SHOTS } from './env.mjs';
// 공성전: 성벽·성문, 공성 병기, 계책, 10부대 출진
import { chromium } from 'playwright';
const b = await chromium.launch(); const errs = [];
const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(GAME); await p.evaluate(() => window.__fast = true);
await p.evaluate(() => { Setup.diff = 1; Setup.hist = true; Setup.scen = 200; Setup.open(); Setup.start(G.officers.find(x => x.name === '조조').id); });
for (let i = 0, idle = 0; i < 40 && idle < 4; i++) { const bt = await p.$('#modalLayer.on footer .btn.pri') || await p.$('#modalLayer.on footer .btn'); if (!bt) { idle++; await p.waitForTimeout(300); continue; } idle = 0; await bt.click(); await p.waitForTimeout(200); }
const r = await p.evaluate(() => {
  const cc = G.officers.find(x => x.name === '조조'), F = G.factions[cc.f];
  let from = null, to = null, bn = 0;
  for (const c of citiesOf(cc.f)) for (const i of ADJ[c.id]) { const t = G.cities[i]; if (t.f >= 0 && t.f !== cc.f) { const n = officersIn(i, t.f).length; if (n > bn) { bn = n; from = c; to = t; } } }
  const offs = [...officersIn(from.id, cc.f), ...factionOfficers(cc.f).filter(o => o.city !== from.id)].slice(0, 4);
  const army = offs.map((o, i) => ({ oid: o.id, troops: 3000, type: ['inf', 'ram', 'cata', 'tower'][i] }));
  from.troops = 50000; from.food = 50000;
  const B = makeBattle({ attF: cc.f, defF: to.f, cityId: to.id, fromId: from.id, att: army, def: defendArmy(to), attFood: 20000 });
  const walls = Object.values(B.walls), gates = walls.filter(w => w.gate).length;
  const ram = B.units.find(u => u.type === 'ram');
  const gi = +Object.keys(B.walls).find(k => B.walls[k].gate);
  // 충차를 성문 옆에 두고 공성
  const spot = hexNb(gi).find(n => hexDist(n, B.keep) === 3 && !unitAt(B, n));
  ram.at = spot; const before = B.walls[gi].hp; const wt = wallTargets(B, ram).includes(gi); doSiege(B, ram, gi);
  const blocked = moveCost(B, ram, B.keep - 2) ;
  const cost = moveCost(B, ram, +Object.keys(B.walls).find(k => !B.walls[k].gate));
  const ti = B.units.find(u => u.type === 'tower'), dU = B.units.find(u => u.side === 1);
  // 계책
  const st0 = strategist(B, 0), st1 = strategist(B, 1);
  const opts0 = stratOptions(B, 0), opts1 = stratOptions(B, 1);
  B.walls[gi].hp = 1; doSiege(B, ram, gi);
  const opened = B.tiles[gi].t;
  // 계략 대상
  const strat = B.units.filter(u => u.side === 0).sort((a, b) => bOff(b).int - bOff(a).int)[0];
  const tk = ['fire', 'confuse', 'fear', 'rally'].map(k => k + ':' + tacticTargets(B, strat, k).length);
  window.__B = B;
  return { city: to.name, wall: B.wall0, walls: walls.length, gates, before, after: B.walls[gi].hp, wt, cost, opened, st0: st0 && bOff(st0).name, st1: st1 && bOff(st1).name, opts0, opts1, tk, defN: B.units.filter(u => u.side === 1).length, form: formLevel(B, 0) };
});
console.log(JSON.stringify(r));
// 화면: 실제 전투 화면
await p.evaluate(() => { const B = window.__B; B.playerSide = 0; B.ctrl = u => u.side === 0; UI.choose = async o => o.options[0].k; BattleUI.run(B); });
await p.waitForTimeout(1500);
await p.screenshot({ path: SHOTS + 't24_siege.png' });
// 지략가 선택 → 계략 메뉴
await p.evaluate(() => { const B = window.__B; const s = B.units.filter(u => u.side === 0 && u.alive).sort((a, b) => bOff(b).int - bOff(a).int)[0]; const d = B.units.find(u => u.side === 1 && u.alive); s.at = hexNb(d.at).map(n => hexNb(n)).flat().find(n => !unitAt(B, n) && hexDist(n, d.at) === 2 && B.tiles[n].t !== 'wall' && B.tiles[n].t !== 'gate') ?? s.at; BattleUI.selectUnit(s); BattleUI.mode = 'act'; BattleUI.panel(); });
await p.waitForTimeout(300);
await p.click('#bpanel .btn:has-text("계략")'); await p.waitForTimeout(300);
await p.screenshot({ path: SHOTS + 't24_tac.png' });
await p.click('#bpanel .btn:has-text("위보")'); await p.waitForTimeout(400);
await p.screenshot({ path: SHOTS + 't24_fear.png' });
// 충차 공성 대상
await p.evaluate(() => { const B = window.__B; const r = B.units.find(u => u.type === 'ram' && u.alive); const gi = +Object.keys(B.walls).find(k => B.walls[k].hp > 0); r.at = hexNb(gi).find(n => hexDist(n, B.keep) === 3 && !unitAt(B, n)); r.done = false; BattleUI.selectUnit(r); BattleUI.mode = 'act'; BattleUI.panel(); });
await p.click('#bpanel .btn:has-text("공성")'); await p.waitForTimeout(400);
await p.screenshot({ path: SHOTS + 't24_ram.png' });
// 헤드리스로 몇 판: 성 공략 결과
const st = await p.evaluate(() => {
  const out = [];
  for (let k = 0; k < 30; k++) {
    const B0 = window.__B, from = G.cities[B0.fromId], to = G.cities[B0.cityId], cc = { f: B0.attF };
    const offs = officersIn(from.id, cc.f).slice(0, 6); if (offs.length < 6) offs.push(...factionOfficers(cc.f).filter(o => !offs.includes(o)).slice(0, 6 - offs.length));
    const army = offs.map((o, i) => ({ oid: o.id, troops: 4000, type: i === 3 ? 'ram' : i === 4 ? 'cata' : autoType(o) }));
    const B = makeBattle({ attF: cc.f, defF: to.f, cityId: to.id, fromId: from.id, att: army, def: defendArmy(to), attFood: 30000 });
    const at = B.units.filter(u => u.side === 0).reduce((a, u) => a + u.troops, 0), dt = B.units.filter(u => u.side === 1).reduce((a, u) => a + u.troops, 0);
    const r = runBattleHeadless(B); out.push(`${r.win === 0 ? 'W' : 'L'}${B.day}${r.why.slice(0, 6)}(${Math.round(at / 1000)}k/${Math.round(dt / 1000)}k,깬곳${Object.values(B.walls).filter(w => w.hp <= 0).length},${B.stratUsed ? Object.values(B.stratUsed).join('/') : '-'})`);
  }
  return out.join(' ');
});
console.log(st);
console.log('ERR', errs.slice(0, 5));
await b.close();
