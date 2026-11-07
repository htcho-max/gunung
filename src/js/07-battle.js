// ===== 헥스 전투: 엔진 =====
const TYPES = { inf: { name: '보병', ch: '보', move: 4 }, cav: { name: '기병', ch: '기', move: 6 }, arc: { name: '궁병', ch: '궁', move: 4 } };
const TER = {
  plain: { name: '평지', cost: 1, def: 1, col: '#9fae6e' },
  forest: { name: '숲', cost: 2, cavCost: 3, def: 1.2, col: '#5d7a45' },
  mount: { name: '산', cost: 3, cavCost: 99, def: 1.35, col: '#8a7d63' },
  river: { name: '강', cost: 3, def: .85, col: '#5f8fa8' },
  bridge: { name: '다리', cost: 1, def: .9, col: '#a58a5c' },
  castle: { name: '성곽', cost: 1, attCost: 2, def: 1, col: '#9b938a' },
  keep: { name: '본성', cost: 1, attCost: 2, def: 1, col: '#b8aa94' },
};
const BW = 16, BH = 11;
const DIRS_E = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const DIRS_O = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
const tIdx = (q, r) => r * BW + q;
const tQ = i => i % BW, tR = i => Math.floor(i / BW);
function hexNb(i) {
  const q = tQ(i), r = tR(i), D = r & 1 ? DIRS_O : DIRS_E, out = [];
  for (const [dq, dr] of D) { const nq = q + dq, nr = r + dr; if (nq >= 0 && nq < BW && nr >= 0 && nr < BH) out.push(tIdx(nq, nr)); }
  return out;
}
function hexDist(a, b) {
  const toCube = i => { const q = tQ(i), r = tR(i); const x = q - (r - (r & 1)) / 2; return [x, r, -x - r]; };
  const A = toCube(a), B = toCube(b);
  return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
}

// 전투 만들기. att/def: [{oid, troops, type}]
function makeBattle(opts) {
  const { attF, defF, cityId, fromId, att, def, attFood } = opts;
  const c = G.cities[cityId];
  const R = mulberry(cityId * 131 + fromId * 7 + G.year);
  const tiles = [];
  for (let i = 0; i < BW * BH; i++) tiles.push({ t: 'plain', fire: 0 });
  const keepQ = BW - 3, keepR = 5, keep = tIdx(keepQ, keepR);
  const blob = (type, n, size) => {
    for (let k = 0; k < n; k++) {
      let cur = tIdx(3 + Math.floor(R() * (BW - 8)), Math.floor(R() * BH));
      for (let s = 0; s < size; s++) { if (tQ(cur) > 2 && hexDist(cur, keep) > 2) tiles[cur].t = type; const nb = hexNb(cur); cur = nb[Math.floor(R() * nb.length)]; }
    }
  };
  const terrainBias = c.x < 300 || c.y > 560 ? 1 : 0; // 서쪽·남쪽은 산이 많음
  blob('forest', 3 + Math.floor(R() * 3), 6);
  blob('mount', 1 + terrainBias + Math.floor(R() * 2), 5);
  if (R() < .55 || [28, 29, 30, 35, 37].includes(cityId)) { // 강
    let q = 6 + Math.floor(R() * 3);
    const bridges = [Math.floor(R() * 4) + 1, Math.floor(R() * 4) + 6];
    for (let r = 0; r < BH; r++) {
      const i = tIdx(q, r); tiles[i].t = bridges.includes(r) ? 'bridge' : 'river';
      if (R() < .35) q = clamp(q + (R() < .5 ? -1 : 1), 5, 9);
    }
  }
  tiles[keep].t = 'keep';
  for (const n of hexNb(keep)) tiles[n].t = 'castle';
  const B = {
    tiles, keep, units: [], day: 1, maxDay: 30, side: 0, wind: Math.floor(R() * 6),
    attF, defF, cityId, fromId, food: [attFood, c.food], over: false, result: null,
    fx: [], captives: [], killed: [], fled: [[], []], interactive: false, auto: false, msgs: [], wall: c.wall,
  };
  // 배치
  const attSpots = []; for (let q = 0; q <= 2; q++) for (let r = 1; r < BH - 1; r++) attSpots.push(tIdx(q, r));
  attSpots.sort((a, b) => Math.abs(tR(a) - 5) - Math.abs(tR(b) - 5) + (tQ(b) - tQ(a)) * .1);
  const defSpots = [keep, ...hexNb(keep)].concat(hexNb(keep).flatMap(hexNb)).filter((v, i, a) => a.indexOf(v) === i && tiles[v].t !== 'mount' && tiles[v].t !== 'river');
  const place = (list, side, spots) => list.forEach((u, k) => {
    const o = G.officers[u.oid];
    let spot = spots.find(s => !B.units.some(x => x.at === s) && (u.type !== 'cav' || tiles[s].t !== 'mount')) ?? spots[0];
    B.units.push({ id: B.units.length, oid: u.oid, side, type: u.type, troops: u.troops, max: u.troops, morale: side === 1 ? 75 : 80, train: u.train ?? 60, at: spot, done: false, conf: 0, cmd: k === 0, alive: true });
  });
  place(att, 0, attSpots);
  place(def, 1, defSpots);
  return B;
}

const bOff = u => G.officers[u.oid];
const unitAt = (B, i) => B.units.find(u => u.alive && u.at === i);
const enemiesOf = (B, u) => B.units.filter(x => x.alive && x.side !== u.side);
function terrDef(B, u, i) {
  const t = B.tiles[i].t;
  if ((t === 'castle' || t === 'keep') && u.side === 1) return 1.3 + Math.min(.7, B.wall / 1400) + (t === 'keep' ? .1 : 0);
  return TER[t].def;
}
function moveCost(B, u, i) {
  const T = TER[B.tiles[i].t];
  if (B.tiles[i].fire > 0) return 99;
  if (u.type === 'cav' && T.cavCost) return T.cavCost;
  if (u.side === 0 && T.attCost) return T.attCost;
  return T.cost;
}
// 갈 수 있는 칸: Map(칸 → 남은 이동력)
function reachable(B, u) {
  const mp = TYPES[u.type].move;
  const best = new Map([[u.at, mp]]);
  const q = [u.at];
  const zoc = new Set(); for (const e of enemiesOf(B, u)) for (const n of hexNb(e.at)) zoc.add(n);
  while (q.length) {
    const cur = q.shift(); const left = best.get(cur);
    if (cur !== u.at && zoc.has(cur)) continue; // 적 옆에 들어서면 멈춤
    for (const n of hexNb(cur)) {
      const occ = unitAt(B, n);
      if (occ && occ.side !== u.side) continue;
      const c = moveCost(B, u, n); if (c > left) continue;
      const rem = left - c;
      if ((best.get(n) ?? -1) < rem) { best.set(n, rem); q.push(n); }
    }
  }
  for (const k of [...best.keys()]) { const occ = unitAt(B, k); if (occ && occ !== u) best.delete(k); }
  return best;
}
function pathTo(B, u, dest) { // 간단한 경로(애니메이션용)
  const prev = new Map([[u.at, -1]]); const q = [u.at];
  const reach = reachable(B, u);
  while (q.length) { const c = q.shift(); if (c === dest) break; for (const n of hexNb(c)) if (!prev.has(n) && (reach.has(n) || (unitAt(B, n) && unitAt(B, n).side === u.side))) { prev.set(n, c); q.push(n); } }
  const path = []; let c = dest; while (c !== -1 && c != null) { path.unshift(c); c = prev.get(c); }
  return path[0] === u.at ? path : [u.at, dest];
}

// 공격력 계산
function powAtk(u) { const o = bOff(u); return (o.lead * .55 + o.war * .45) * (.6 + u.train / 250) * (.55 + u.morale / 220); }
function powDef(u) { const o = bOff(u); return (o.lead * .6 + o.int * .2 + o.war * .2) * (.6 + u.train / 250) * (.55 + u.morale / 220); }
function canRange(a) { return a.type === 'arc'; }
function attackTargets(B, u, from = u.at) {
  return enemiesOf(B, u).filter(e => { const d = hexDist(from, e.at); return canRange(u) ? d >= 1 && d <= 2 : d === 1; });
}
function estDamage(B, a, d, ranged) {
  let m = powAtk(a) / Math.max(10, powDef(d) * terrDef(B, d, d.at));
  if (a.type === 'cav' && !ranged) m *= 1.2;
  if (d.type === 'inf' && a.type === 'cav') m *= .82;
  if (d.type === 'arc' && !ranged) m *= 1.15;
  if (ranged) m *= .72;
  if (B.tiles[a.at].t === 'river') m *= .85;
  return Math.min(d.troops, Math.round(a.troops * .1 * m));
}
function doAttack(B, a, d) {
  const ranged = hexDist(a.at, d.at) > 1 || a.type === 'arc';
  const pm = B.playerSide == null ? 1 : a.side === B.playerSide ? DIFF().pDmg : 1 / DIFF().pDmg;
  const dmg = Math.round(estDamage(B, a, d, ranged) * (.85 + rand() * .3) * pm);
  d.troops -= dmg; d.morale = clamp(d.morale - Math.round(dmg / Math.max(1, d.troops + dmg) * 45) - 1, 0, 100);
  a.morale = clamp(a.morale + 2, 0, 100);
  let cdmg = 0;
  const counter = d.troops > 0 && (ranged ? (d.type === 'arc' && hexDist(a.at, d.at) <= 2) : true);
  if (counter) {
    cdmg = Math.round(estDamage(B, d, a, ranged) * .45 * (.85 + rand() * .3) * (d.type === 'arc' && !ranged ? .6 : 1));
    a.troops -= cdmg; a.morale = clamp(a.morale - Math.round(cdmg / Math.max(1, a.troops + cdmg) * 30), 0, 100);
  }
  if (B.onFx) B.onFx({ kind: ranged ? 'arrow' : 'slash', from: a.at, to: d.at, big: !ranged && dmg > 350 });
  bfx(B, d.at, '−' + fmt(dmg), '#ffd2c2'); if (cdmg) bfx(B, a.at, '−' + fmt(cdmg), '#ffd2c2', 200);
  SFX.play(ranged ? 'arrow' : 'clash');
  checkRout(B, d, a); checkRout(B, a, d);
  return dmg;
}
function checkRout(B, u, by) {
  if (!u.alive) return;
  if (u.troops > 0 && u.morale > 6) return;
  routUnit(B, u, by, u.troops <= 0 ? '전멸' : '궤주');
}
function routUnit(B, u, by, why) {
  if (B.onFx) B.onFx({ kind: 'smoke', at: u.at });
  u.alive = false; u.troops = Math.max(0, u.troops);
  const o = bOff(u);
  const adjE = enemiesOf(B, u).filter(e => hexDist(e.at, u.at) === 1).length;
  const pCap = clamp(.15 + adjE * .12 + (by ? (bOff(by).war - o.war) / 300 : 0), .05, .7);
  if (chance(pCap)) { B.captives.push(u.oid); bmsg(B, `${o.name} 부대 ${why} — ${iga(o.name)} 붙잡혔다!`, 'bad'); }
  else { B.fled[u.side].push({ oid: u.oid, troops: Math.round(Math.max(0, u.troops) * .5) }); bmsg(B, `${o.name} 부대 ${why} — ${eun(o.name)} 달아났다`); }
}
function bmsg(B, t, k = '') { B.msgs.push({ t, k }); if (B.msgs.length > 40) B.msgs.shift(); if (B.onMsg) B.onMsg(t, k); }
function bfx(B, at, text, col, delay = 0) { if (B.interactive) B.fx.push({ at, text, col, t0: performance.now() + delay }); }

// 계략
function tacticChance(B, u, kind, target) {
  const o = bOff(u);
  if (o.int < 45) return 0;
  if (kind === 'fire') {
    const tt = B.tiles[target].t; if (tt === 'river' || tt === 'bridge' || B.tiles[target].fire) return 0;
    const occ = unitAt(B, target);
    const di = occ ? bOff(occ).int : 45;
    let p = .35 + (o.int - di) / 110 + (tt === 'forest' ? .15 : 0) - ((tt === 'castle' || tt === 'keep') ? .2 : 0);
    return clamp(p, .05, .9);
  }
  if (kind === 'confuse') { const t = unitAt(B, target); if (!t || t.side === u.side) return 0; return clamp(.3 + (o.int - bOff(t).int) / 80, .05, .85); }
  return 0;
}
function tacticTargets(B, u, kind, from = u.at) {
  const out = [];
  for (let i = 0; i < B.tiles.length; i++) {
    const d = hexDist(from, i); if (d < 1 || d > 2) continue;
    if (kind === 'confuse') { const t = unitAt(B, i); if (t && t.side !== u.side && !t.conf) out.push(i); }
    else { const t = unitAt(B, i); if ((t && t.side !== u.side) || (!t && B.tiles[i].t === 'forest' && enemiesOf(B, u).some(e => hexDist(e.at, i) === 1))) out.push(i); }
  }
  return out.filter(i => tacticChance(B, u, kind, i) > 0);
}
function doTactic(B, u, kind, target) {
  const p = tacticChance(B, u, kind, target), o = bOff(u);
  u.morale = clamp(u.morale, 0, 100);
  if (!chance(p)) { bmsg(B, `${o.name}의 ${kind === 'fire' ? '화계가' : '혼란 계략이'} 간파당했다`); bfx(B, target, '실패', '#ddd'); SFX.play('miss'); return false; }
  if (kind === 'fire') {
    B.tiles[target].fire = B.tiles[target].t === 'forest' ? 3 : 2;
    if (B.onFx) B.onFx({ kind: 'burst', at: target });
    const t = unitAt(B, target); if (t) burn(B, t);
    bmsg(B, `${o.name}의 화계! 불길이 치솟는다`, 'good'); SFX.play('fire');
  } else {
    const t = unitAt(B, target); t.conf = 1 + (chance(.4) ? 1 : 0);
    bmsg(B, `${o.name}의 계략에 ${bOff(t).name} 부대가 혼란에 빠졌다`, 'good'); bfx(B, target, '혼란', '#e8d06a'); if (B.onFx) B.onFx({ kind: 'swirl', at: target }); SFX.play('confuse');
  }
  bOff(u).merit += 6;
  return true;
}
function burn(B, u) {
  const d = Math.round(u.troops * (.1 + rand() * .08)) + 60;
  u.troops -= d; u.morale = clamp(u.morale - 6, 0, 100);
  bfx(B, u.at, '🔥−' + fmt(d), '#ffb36b');
  checkRout(B, u, null);
}

// 일기토
function duelAccept(B, chal, targ) {
  const a = bOff(chal), d = bOff(targ);
  if (d.war >= a.war - 4) return chance(.75);
  if (d.war >= a.war - 12) return chance(.35);
  return chance(.1);
}
const DUEL_ACTS = { atk: '공격', power: '필살', guard: '방어', flee: '도주' };
function duelAI(me, op, hp, ohp) {
  if (hp < 25 && me.war < op.war && chance(.45)) return 'flee';
  const r = rand();
  if (ohp < 30 && r < .4) return 'power';
  return r < .2 ? 'guard' : r < .42 ? 'power' : 'atk';
}
function duelRound(A, Bo, hp, act) { // act: [a행동, b행동] → 결과
  const res = { dmg: [0, 0], fled: -1, text: [] };
  const P = [A, Bo];
  for (let s = 0; s < 2; s++) {
    if (act[s] === 'flee') {
      if (chance(.45 + (P[s].war - P[1 - s].war) / 200)) { res.fled = s; res.text.push(`${iga(P[s].name)} 말머리를 돌려 달아났다!`); return res; }
      res.text.push(`${iga(P[s].name)} 달아나려다 막혔다`);
    }
  }
  const open = [false, false];
  for (let s = 0; s < 2; s++) {
    const me = P[s], op = P[1 - s], a = act[s], oa = act[1 - s];
    if (a !== 'atk' && a !== 'power') continue;
    let hit = clamp(.56 + (me.war - op.war) / 110, .15, .92);
    if (a === 'power') hit -= .16;
    if (chance(hit)) {
      let dmg = 7 + me.war / 8 + ri(0, 6);
      if (a === 'power') dmg *= 2.1;
      if (oa === 'guard') dmg *= .4;
      if (open[1 - s]) dmg *= 1.4;
      res.dmg[1 - s] += Math.round(dmg);
      res.text.push(`${me.name}의 ${a === 'power' ? '필살 일격' : '공격'}! ${Math.round(dmg)}`);
    } else {
      if (a === 'power') open[s] = true;
      res.text.push(`${me.name}의 ${a === 'power' ? '필살 일격이 빗나갔다' : '공격이 막혔다'}`);
      if (oa === 'guard' && chance(.5)) { const cd = Math.round(5 + op.war / 12); res.dmg[s] += cd; res.text.push(`${op.name}의 반격! ${cd}`); }
    }
  }
  return res;
}
// 결과 적용. winSide: 이긴 쪽 유닛, lose 유닛, how: 'ko'|'fled'|'draw'
function duelFinish(B, wu, lu, how) {
  const w = bOff(wu), l = bOff(lu);
  if (how === 'draw') { bmsg(B, `${wa(w.name)} ${l.name}의 일기토는 승부가 나지 않았다`); return; }
  if (how === 'fled') { lu.morale = clamp(lu.morale - 25, 0, 100); wu.morale = clamp(wu.morale + 10, 0, 100); bmsg(B, `${eun(l.name)} 일기토에서 달아났다. 부대 사기 저하!`); w.fame += 3; return; }
  w.fame += 8; w.merit += 60;
  wu.morale = clamp(wu.morale + 15, 0, 100);
  lu.alive = false;
  const r = rand();
  if (r < (w.war >= 92 ? .3 : .18)) { B.killed.push(lu.oid); bmsg(B, `${iga(w.name)} 일기토에서 ${eul(l.name)} 베었다!`, 'big'); }
  else if (r < .65) { B.captives.push(lu.oid); bmsg(B, `${iga(w.name)} 일기토에서 ${eul(l.name)} 사로잡았다!`, 'big'); }
  else { B.fled[lu.side].push({ oid: lu.oid, troops: Math.round(lu.troops * .4) }); bmsg(B, `${eun(l.name)} 일기토에 져서 부상을 입고 달아났다`, 'big'); }
}
function duelAuto(B, chal, targ) {
  const A = bOff(chal), D = bOff(targ); let hp = [100, 100];
  for (let round = 0; round < 10; round++) {
    const r = duelRound(A, D, hp, [duelAI(A, D, hp[0], hp[1]), duelAI(D, A, hp[1], hp[0])]);
    if (r.fled >= 0) return duelFinish(B, r.fled === 0 ? targ : chal, r.fled === 0 ? chal : targ, 'fled');
    hp[0] -= r.dmg[0]; hp[1] -= r.dmg[1];
    if (hp[0] <= 0 || hp[1] <= 0) { const aw = hp[0] > hp[1]; return duelFinish(B, aw ? chal : targ, aw ? targ : chal, 'ko'); }
  }
  duelFinish(B, chal, targ, 'draw');
}

// 승패
function battleCheck(B) {
  if (B.over) return true;
  const alive = s => B.units.filter(u => u.alive && u.side === s);
  const cmdAlive = s => B.units.some(u => u.alive && u.side === s && u.cmd);
  let res = null;
  const k = unitAt(B, B.keep);
  if (k && k.side === 0) res = { win: 0, why: '본성을 점령했다' };
  else if (!alive(1).length) res = { win: 0, why: '수비군이 모두 무너졌다' };
  else if (!alive(0).length) res = { win: 1, why: '공격군이 모두 무너졌다' };
  else if (!cmdAlive(0)) res = { win: 1, why: '공격군 총대장이 쓰러져 퇴각했다' };
  else if (!cmdAlive(1)) res = { win: 0, why: '수비군 총대장이 쓰러졌다' };
  if (res) { B.over = true; B.result = res; return true; }
  return false;
}
function endDay(B) {
  // 불
  const burning = [];
  B.tiles.forEach((t, i) => { if (t.fire > 0) burning.push(i); });
  for (const i of burning) {
    const u = unitAt(B, i); if (u) burn(B, u);
    for (const n of hexNb(i)) {
      const t = B.tiles[n];
      if (t.fire || t.t === 'river' || t.t === 'bridge' || t.t === 'mount') continue;
      const downwind = hexNb(i)[B.wind] === n;
      if (chance((t.t === 'forest' ? .3 : .08) + (downwind ? .25 : 0))) { t.fire = t.t === 'forest' ? 3 : 1; const v = unitAt(B, n); if (v) burn(B, v); }
    }
    B.tiles[i].fire--;
  }
  // 군량
  for (const s of [0, 1]) {
    const tr = B.units.filter(u => u.alive && u.side === s).reduce((a, u) => a + u.troops, 0);
    B.food[s] -= Math.ceil(tr / 80);
    if (B.food[s] <= 0) { B.food[s] = 0; for (const u of B.units) if (u.alive && u.side === s) { u.morale = clamp(u.morale - 9, 0, 100); checkRout(B, u, null); } if (B.interactive) bmsg(B, `${s === 0 ? '공격군' : '수비군'}의 군량이 바닥났다! 사기가 떨어진다`, 'bad'); }
  }
  for (const u of B.units) { if (u.conf > 0) u.conf--; u.done = false; }
  if (chance(.2)) B.wind = (B.wind + (chance(.5) ? 1 : 5)) % 6;
  B.day++;
  if (!B.over && B.day > B.maxDay) { B.over = true; B.result = { win: 1, why: '30일을 버텨 내 공격군이 물러갔다' }; }
  battleCheck(B);
}

// ===== 전투 AI =====
function aiPlan(B, u) {
  if (u.conf > 0) return null;
  const o = bOff(u);
  const reach = reachable(B, u);
  const keep = B.keep;
  const weak = u.troops < u.max * .25;
  const keepFree = !unitAt(B, keep) || unitAt(B, keep) === u;
  let best = { score: -1e9 };
  const enemies = enemiesOf(B, u);
  const nearE = Math.min(...enemies.map(e => hexDist(e.at, u.at)), 99);
  for (const [tile] of reach) {
    let pos = 0;
    const dk = hexDist(tile, keep);
    if (u.side === 0) {
      pos = weak ? dk * 25 : -dk * 45;
      if (tile === keep && keepFree) pos += 9000;
    } else {
      const tt = B.tiles[tile].t;
      pos = (tt === 'keep' ? 120 : tt === 'castle' ? 70 : 0) - Math.max(0, dk - 2) * 55;
      if (nearE > 6) pos -= dk * 20; // 적이 멀면 성에 붙어 있기
      if (u.cmd && tile === keep) pos += 80;
    }
    const adjE = enemies.filter(e => hexDist(e.at, tile) === 1);
    if (u.type === 'arc') pos -= adjE.length * 120;
    if (u.cmd) pos -= Math.max(0, adjE.length - 1) * 90;
    if (weak) pos -= adjE.length * 150;
    if (tile !== u.at) pos -= 1;
    // 이동 후 행동
    let act = null, av = 0;
    const save = u.at; u.at = tile;
    for (const e of attackTargets(B, u, tile)) {
      const ranged = u.type === 'arc';
      const dmg = estDamage(B, u, e, ranged);
      const back = ranged && e.type !== 'arc' ? 0 : estDamage(B, e, u, ranged) * .45;
      let v = dmg - back * .9 + (e.cmd ? 220 : 0) + (dmg >= e.troops * .9 ? 500 : 0) + (e.type === 'arc' && !ranged ? 60 : 0);
      if (weak) v -= 200;
      if (v > av) { av = v; act = { kind: 'attack', target: e.id }; }
    }
    if (o.int >= 55) {
      for (const kind of ['confuse', 'fire']) {
        for (const ti of tacticTargets(B, u, kind, tile)) {
          const p = tacticChance(B, u, kind, ti); const t = unitAt(B, ti);
          let v = kind === 'confuse' ? p * (t ? t.troops * .18 + (t.cmd ? 200 : 0) : 0) : p * ((t ? t.troops * .17 : 0) + hexNb(ti).filter(n => { const z = unitAt(B, n); return z && z.side !== u.side && B.tiles[n].t === 'forest'; }).length * 300);
          if (B.tiles[ti].t === 'forest' && hexNb(ti).some(n => { const z = unitAt(B, n); return z && z.side === u.side; })) v -= 400; // 아군 옆 숲불은 위험
          if (v > av) { av = v; act = { kind, target: ti }; }
        }
      }
    }
    if (o.war >= 70) {
      for (const e of enemies.filter(e => hexDist(e.at, tile) === 1)) {
        const diff = o.war - bOff(e).war;
        if (diff >= 12) { const v = 380 + diff * 10 + (e.cmd ? 300 : 0); if (v > av && chance(.5)) { av = v; act = { kind: 'duel', target: e.id }; } }
      }
    }
    u.at = save;
    const score = pos + av;
    if (score > best.score) best = { score, tile, act };
  }
  return best;
}
// 전투를 보이지 않게 끝까지 (AI 대 AI)
function runBattleHeadless(B) {
  let guard = 0;
  while (!B.over && guard++ < 2000) {
    for (const side of [0, 1]) {
      const us = B.units.filter(u => u.alive && u.side === side);
      us.sort((a, b) => (b.type === 'arc') - (a.type === 'arc'));
      for (const u of us) {
        if (!u.alive || B.over) continue;
        const plan = aiPlan(B, u);
        if (plan && plan.tile != null) u.at = plan.tile;
        if (battleCheck(B)) break;
        if (plan && plan.act) execAct(B, u, plan.act, true);
        if (battleCheck(B)) break;
      }
      if (B.over) break;
    }
    if (!B.over) endDay(B);
  }
  return B.result;
}
function execAct(B, u, act, headless) {
  if (act.kind === 'attack') { const t = B.units[act.target]; if (t && t.alive) doAttack(B, u, t); }
  else if (act.kind === 'fire' || act.kind === 'confuse') doTactic(B, u, act.kind, act.target);
  else if (act.kind === 'duel') { const t = B.units[act.target]; if (t && t.alive && duelAccept(B, u, t)) duelAuto(B, u, t); else if (t) bmsg(B, `${eun(bOff(t).name)} 일기토를 피했다`); }
  u.done = true;
}
