// 2단계: 칭호·관직·칙명·관문·이민족·재해·정사 모드
import { GAME, SHOTS } from './env.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(GAME);
const r = await p.evaluate(async () => {
  window.__fast = true; const out = [];
  Setup.scen = 200; Setup.yanyi = true; Setup.open(); Setup.start(G.officers.find(x => x.name === '조조').id);
  UI.modal = async o => { const ok = (o.buttons || []).find(b => b.cls === 'pri' && !(b.check && !b.check())); return ok ? ok.k : 'x'; };
  UI.choose = async o => (o.options.find(x => !x.disabled) || {}).k;
  const F = G.factions[me().f], c = G.cities[me().city];
  out.push(`천자 ${facName(empHolder())} @ ${G.cities[G.emp.city].name}`);
  out.push('칭호 조건: ' + (titleNeed(F, 1).join(',') || '충족'));
  setRank(F, 1, '위'); out.push('칭호 ' + F.title + ' rank ' + rankOf(F));
  const o = factionOfficers(F.id).find(x => !isRuler(x)); const before = o.lead; appoint(F, 'daejang', o); out.push(`대장군 ${o.name} 통 ${before}→${o.lead} 충 ${o.loy}`);
  leaveToRonin(o); cleanupOffices(); out.push(`떠난 뒤 통 ${o.lead} 관직 ${o.office}`);
  const t = G.factions.find(f => f.alive && f.id !== F.id); issueEdict(F, t.id); out.push(`칙명 → ${t.name} 역적 ${isRebel(t.id)}`);
  aiOffices(t); out.push(`AI 관직 ${Object.keys(t.offices || {}).length}개`);
  // 관문 전투판
  const ly = G.cities[CITY_BY_NAME['장안']];
  const B = makeBattle({ attF: F.id, defF: ly.f, cityId: ly.id, fromId: c.id, att: [{ oid: me().id, troops: 3000, type: 'inf' }], def: defendArmy(ly), attFood: 3000 });
  out.push(`관문 ${B.pass} 산 ${B.tiles.filter(x => x.t === 'mount').length}칸 성벽 ${B.wall}`);
  // 이민족·재해 여러 해
  const t0 = G.cities.reduce((a, x) => a + x.troops, 0);
  for (let i = 0; i < 24; i++) { G.month = (G.month % 12) + 1; await monthlyBarbarians(); }
  for (let i = 0; i < 5; i++) yearlyDisaster();
  out.push('이민족·재해 후 로그: ' + G.log.slice(-4).map(l => l.t || l).join(' / '));
  return out;
});
console.log(r.join('\n'));
// 정사 모드 능력치
const z = await p.evaluate(() => { Setup.yanyi = false; Setup.scen = 190; Setup.open(); const g = G.officers.find(o => o.name === '관우'), h = G.officers.find(o => o.name === '화웅'); return `정사: 관우 무 ${g.war}, 화웅 무 ${h.war}, yanyi=${G.yanyi}`; });
console.log(z);
// 화면: 조정 줄, 세력 목록
await p.goto(GAME);
await p.evaluate(() => { Setup.yanyi = true; Setup.scen = 200; Setup.open(); Setup.start(G.officers.find(x => x.name === '조조').id); });
for (let i = 0, idle = 0; i < 40 && idle < 4; i++) { const bt = await p.$('#modalLayer.on footer .btn.pri') || await p.$('#modalLayer.on footer .btn'); if (!bt) { idle++; await p.waitForTimeout(400); continue; } idle = 0; await bt.click(); await p.waitForTimeout(300); }
await p.evaluate(() => { UI.sel = me().city; UI.refresh(); }); await p.waitForTimeout(300);
await p.click('.cmd[title="관직"] >> visible=true'); await p.waitForTimeout(300); await p.screenshot({ path: SHOTS + 'court_offices.png' });
await p.click('#modalLayer.on footer .btn'); await p.waitForTimeout(200);
await p.evaluate(() => UI.factionList()); await p.waitForTimeout(300); await p.screenshot({ path: SHOTS + 'court_factions.png' });
console.log('ERR', errs.slice(0, 3)); await b.close();
