// 3단계: 술집·의형제·혼인·임무 + 원군·진형 헤드리스 확인
import { chromium } from 'playwright';
const SH = '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
await p.goto('file:///home/claude/gunung/dist/index.html'); await p.evaluate(() => window.__fast = true);
const out = await p.evaluate(async () => {
  Setup.open(); Setup.start(G.officers.find(x => x.name === '조운').id);
  const log = [];
  UI.modal = async o => { log.push('M:' + o.title); return (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k; };
  // 임무
  { const c = G.cities[me().city]; if (c.gov === me().id) { c.gov = factionOfficers(me().f).find(o => o !== me() && !isRuler(o)).id; } }
  log.push('role ' + role());
  G.missionNext = 0; for (let i = 0; i < 6 && !G.mission; i++) monthlyMission();
  await UI.flush();
  log.push('mission ' + (G.mission && missionText(G.mission)));
  // 술집 여러 번
  for (let i = 0; i < 6; i++) { G.ap = 3; await pTavern(); }
  log.push('rumor ' + ITEMS.filter(it => G.items[it.id].rumor).map(it => it.name).join(','));
  // 의형제
  const P = me(), t = factionOfficers(P.f).find(o => o !== P && !isRuler(o));
  P.bond = { [t.id]: 85 }; t.city = P.city;
  const mr = Math.random; Math.random = () => 0; await offerSworn(P, t); Math.random = mr;
  log.push('sworn ' + (P.sworn || []).map(id => G.officers[id].name).join(',') + ' / ' + isSworn(t, P));
  // 임무 완수 흉내
  if (G.mission) { const M = G.mission; if (M.kind === 'search') M.got = 1; else if (M.kind === 'bond') P.bond[M.tid] = (P.bond[M.tid] || 0) + 30; else if (M.kind === 'train') P.lead += 1; else { const c = G.cities[M.cid]; c[M.kind] += 50; } checkMission(); await UI.flush(); }
  log.push('merit ' + P.merit + ' mission ' + !!G.mission);
  // 혼인 (원소 → 공손찬이 아닌 이웃 세력)
  const ys = G.factions.find(f => f.key === 'ys'), cc = G.factions.find(f => f.key === 'cc');
  G.rel[relKey(ys.id, cc.id)] = 90; const c = G.cities[G.factions[ys.id].capital]; c.gold = 2000;
  const env = officersIn(c.id, ys.id)[0]; Math.random = () => 0; const r = dipMarry(env, c, ys.id, cc.id); Math.random = mr;
  log.push('marry ' + r.ok + ' ally ' + allyLeft(ys.id, cc.id));
  return log;
});
console.log(out.join('\n'));
await p.evaluate(() => { UI.refresh(); });
await p.waitForTimeout(400); await p.screenshot({ path: SH + 'life.png' });
// 원군·진형: 헤드리스 전투 여러 번
const st = await p.evaluate(() => {
  let rf = 0, forms = {}, rams = 0;
  for (let k = 0; k < 30; k++) {
    const from = G.cities[CITY_BY_NAME['진류']], to = G.cities[CITY_BY_NAME['낙양']];
    from.troops = 30000; to.troops = 20000; to.wall = 500;
    for (const i of ADJ[to.id]) if (G.cities[i].f === to.f) G.cities[i].troops = 15000;
    for (const o of G.officers) o.acted = false;
    const offs = officersIn(from.id, from.f).slice(0, 4);
    const army = offs.map((o, i) => ({ oid: o.id, troops: 5000, type: i === 3 ? 'ram' : i === 2 ? 'xbow' : autoType(o) }));
    const B = makeBattle({ attF: from.f, defF: to.f, cityId: to.id, fromId: from.id, att: army, def: defendArmy(to), attFood: 9000 });
    const l = gatherReinforce(B, to); rf += l.length;
    forms[B.form.join('/')] = (forms[B.form.join('/')] || 0) + 1;
    const w0 = B.wall; runBattleHeadless(B); if (B.wall < w0) rams++;
    returnAllies(B);
  }
  return { rf, forms, rams };
});
console.log(JSON.stringify(st));
console.log('ERR', errs.slice(0, 5));
await b.close();
