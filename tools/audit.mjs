// 장기 진행 불변식 점검: node tools/audit.mjs 시나리오 인물 달 [역할행동 0|1]
import { chromium } from 'playwright';
const scen = +(process.argv[2] || 190), who = process.argv[3] || '조조', months = +(process.argv[4] || 120), act = process.argv[5] === '1';
const b = await chromium.launch(); const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0, 3).join(' / '))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text().slice(0, 300)); });
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.evaluate(([scen, who]) => {
  window.__fast = true; Setup.scen = scen; Setup.open();
  Setup.start(G.officers.find(x => x.name === who).id);
  UI.modal = async o => (o.buttons && o.buttons.length ? (o.buttons.find(b => b.cls === 'pri' && !(b.check && !b.check())) || o.buttons.find(b => !(b.check && !b.check())) || o.buttons[0]).k : 'ok');
  BattleUI.run = async B => { B.auto = true; runBattleHeadless(B); };
  window.__audit = () => {
    const bad = [], N = v => typeof v !== 'number' || !isFinite(v);
    for (const c of G.cities) {
      for (const k of ['gold', 'food', 'troops', 'agri', 'comm', 'order', 'wall', 'train', 'pop']) if (c[k] != null && (N(c[k]) || c[k] < 0)) bad.push(`${c.name}.${k}=${c[k]}`);
      if (c.f >= 0 && !G.factions[c.f]?.alive) bad.push(`${c.name} 죽은 세력 소유`);
      if (c.f >= 0 && c.troops > troopMax(c) * 1.02) bad.push(`${c.name} 병력 초과 ${c.troops}/${troopMax(c)}`);
      if (c.gov >= 0) { const g = G.officers[c.gov]; if (g.st !== 'on' || g.f !== c.f || g.city !== c.id || g.travel) bad.push(`${c.name} 태수 이상 ${g.name}`); }
    }
    for (const F of G.factions) if (F.alive) {
      const r = G.officers[F.ruler]; if (!r || r.st !== 'on' || r.f !== F.id) bad.push(`${F.name} 군주 이상 ${r && r.name}/${r && r.st}`);
      if (!G.cities.some(c => c.f === F.id)) bad.push(`${F.name} 성 없이 살아 있음`);
    }
    for (const o of G.officers) {
      if (o.st === 'on') { if (!G.factions[o.f]?.alive) bad.push(`${o.name} 죽은 세력 소속`); else if (!o.travel && G.cities[o.city].f !== o.f) bad.push(`${o.name} 남의 성(${G.cities[o.city].name})에 있음`); }
      if (o.st === 'ronin' && o.f !== -1) bad.push(`${o.name} 재야인데 f=${o.f}`);
      if (o.travel && o.travel.eta < mIdx()) bad.push(`${o.name} 이동 지연`);
      if (o.st !== 'dead' && (N(o.loy) || o.loy < 0 || o.loy > 100)) bad.push(`${o.name} 충성 ${o.loy}`);
    }
    for (const id in G.items || {}) { const st = G.items[id]; if (st.holder >= 0 && G.officers[st.holder].st === 'dead') bad.push(`보물 ${id} 주인이 죽음`); }
    for (const v of G.convoys || []) if (v.eta < mIdx()) bad.push('수송대 지연');
    return bad;
  };
}, [scen, who]);
const seen = new Map(); let slow = 0, maxMs = 0;
for (let i = 0; i < months; i++) {
  if (act) await p.evaluate(async () => { // 플레이어 흉내: 군주면 모든 성 위임, 장수면 근무
    const P = me(); if (!P || P.st === 'dead') return;
    if (isRuler(P)) for (const c of G.cities) if (c.f === P.f) c.deleg = true;
  });
  const t0 = Date.now();
  const r = await Promise.race([p.evaluate(async () => { await endMonth(); return 1; }), new Promise(r => setTimeout(() => r(0), 60000))]);
  const ms = Date.now() - t0; maxMs = Math.max(maxMs, ms); if (ms > 3000) slow++;
  if (!r) { console.log('STUCK', await p.evaluate(() => `${G.year}.${G.month}`)); break; }
  const bad = await p.evaluate(() => window.__audit());
  for (const x of bad) { const k = x.replace(/[0-9\-]+/g, '#'); if (!seen.has(k)) seen.set(k, `${await p.evaluate(() => G.year + '.' + G.month)} ${x}`); }
  if (await p.evaluate(() => G.over)) { console.log('GAME OVER', await p.evaluate(() => `${G.year}.${G.month}`)); break; }
}
const fin = await p.evaluate(() => { const fs = G.factions.filter(f => f.alive).map(f => f.name + G.cities.filter(c => c.f === f.id).length).join(' '); return `${G.year}.${G.month} 나=${me().name}(${me().st}, ${role()}) 세력 ${fs}`; });
// 저장/불러오기
const sl = await p.evaluate(() => { try { saveGame('2'); const a = JSON.stringify(G); loadGame('2'); const b = JSON.stringify(G); return a.length === b.length ? 'save/load ok ' + a.length : 'save/load 차이 ' + a.length + ' vs ' + b.length; } catch (e) { return 'save/load 오류 ' + e.message; } });
console.log(`[${scen} ${who} ${months}달] ${fin}\n  ${sl} · 가장 느린 달 ${maxMs}ms, 3초 넘은 달 ${slow}`);
for (const v of seen.values()) console.log('  !', v);
console.log('  ERR', errs.length, errs.slice(0, 4));
await b.close();
