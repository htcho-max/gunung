// ===== 헥스 전투: 엔진 =====
const TYPES = { inf: { name: '보병', ch: '보', move: 4 }, cav: { name: '기병', ch: '기', move: 6 }, arc: { name: '궁병', ch: '궁', move: 4 }, xbow: { name: '노병', ch: '노', move: 3 }, ram: { name: '충차', ch: '차', move: 3 }, tower: { name: '정란', ch: '란', move: 3 }, cata: { name: '투석', ch: '석', move: 3 } };
const SIEGE_T = new Set(['ram', 'tower', 'cata']);
const TYPE_DESC = { inf: '기병에 강하고 고르게 싸움', cav: '빠르고 돌격이 셈', arc: '1~2칸 밖에서 쏨', xbow: '2~3칸 밖에서 세게 쏘지만 붙은 적은 못 쏨', ram: '성문·성벽을 크게 부숨, 들판에서는 약함', tower: '높은 망루에서 1~3칸을 쏨. 성벽 위의 적도 방어 이점 없이 맞힘', cata: '2~4칸 밖으로 돌을 날려 성벽을 부수고 적 부대 주변까지 맞힘. 붙은 적은 못 침' };
const RANGE = { arc: [1, 2], xbow: [2, 3], tower: [1, 3], cata: [2, 4] };
// 진형: 총대장의 통솔이 min 이상이어야 씀
const FORMS = {
  none: { name: '진형 없음', atk: 1, def: 1, mv: 0, min: 0, desc: '' },
  eorin: { name: '어린진', atk: 1.1, def: 1.05, mv: 0, min: 55, desc: '물고기 비늘처럼 겹친 진. 공격 +10%, 방어 +5%' },
  bang: { name: '방원진', atk: .9, def: 1.22, mv: -1, min: 60, desc: '둥글게 지키는 진. 방어 +22%, 공격 −10%, 이동 −1' },
  bong: { name: '봉시진', atk: 1.2, def: .85, mv: 1, min: 72, desc: '화살촉처럼 찌르는 진. 공격 +20%, 이동 +1, 방어 −15%' },
  hak: { name: '학익진', atk: 1, def: .95, mv: 0, min: 80, wrap: true, desc: '학의 날개처럼 감싸는 진. 적에게 붙은 아군 하나마다 공격 +7% (최대 +21%)' },
};
const formsFor = o => Object.keys(FORMS).filter(k => o && (typeof o === 'number' ? o : o.lead) >= FORMS[k].min);
// 진형을 펼 수 있는 수준: 총대장의 통솔, 또는 군사(지력 높은 장수)의 지력 −5
function formLevel(B, side) { const us = B.units.filter(u => u.side === side && u.alive); const cmd = us.find(u => u.cmd); return Math.max(cmd ? bOff(cmd).lead : 0, ...us.map(u => bOff(u).int - 5)); }
const formOf = (B, side) => FORMS[(B.form && B.form[side]) || 'none'];
function aiFormation(B, side) {
  const cmd = B.units.find(u => u.side === side && u.cmd && u.alive); if (!cmd) return 'none';
  const av = formsFor(formLevel(B, side));
  const mine = B.units.filter(u => u.side === side).reduce((a, u) => a + u.troops, 0), theirs = B.units.filter(u => u.side !== side).reduce((a, u) => a + u.troops, 0);
  if (side === 1) return av.includes('bang') && mine < theirs * 1.1 ? 'bang' : av.includes('eorin') ? 'eorin' : 'none';
  if (av.includes('hak') && B.units.filter(u => u.side === side).length >= 4 && mine > theirs) return 'hak';
  if (av.includes('bong') && mine > theirs * 1.15) return 'bong';
  return av.includes('eorin') ? 'eorin' : 'none';
}
// 의형제(또는 도원결의 묶음)
function isSworn(a, b) { return !!a && !!b && a !== b && (((a.sworn || []).includes(b.id)) || (a.tag === 'B1' && b.tag === 'B1')); }
const TER = {
  plain: { name: '평지', cost: 1, def: 1, col: '#9fae6e' },
  forest: { name: '숲', cost: 2, cavCost: 3, def: 1.2, col: '#5d7a45' },
  mount: { name: '산', cost: 3, cavCost: 99, def: 1.35, col: '#8a7d63' },
  river: { name: '강', cost: 3, def: .85, col: '#5f8fa8' },
  water: { name: '장강', cost: 1, def: .95, col: '#3f6f86' },
  bridge: { name: '다리', cost: 1, def: .9, col: '#a58a5c' },
  castle: { name: '성곽', cost: 1, attCost: 2, def: 1, col: '#9b938a' },
  keep: { name: '본성', cost: 1, attCost: 2, def: 1, col: '#b8aa94' },
  wall: { name: '성벽', cost: 1, def: 1, col: '#8d857a' },
  gate: { name: '성문', cost: 1, def: 1, col: '#7a5a3a' },
  breach: { name: '무너진 성벽', cost: 2, def: 1, col: '#9a9184' },
  gateo: { name: '부서진 성문', cost: 1, def: .95, col: '#8a6a4a' },
};
const isWallT = t => t === 'wall' || t === 'gate';
const isFort = t => t === 'castle' || t === 'keep' || t === 'wall' || t === 'gate';
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
  if (opts.naval) { // 장강 수전: 서쪽은 오림, 가운데는 강, 동쪽은 적벽
    for (let i = 0; i < BW * BH; i++) { const q = tQ(i); tiles[i].t = q <= 1 ? (R() < .3 ? 'forest' : 'plain') : q <= 11 ? 'water' : (R() < .25 ? 'forest' : 'plain'); }
    for (const r of [0, 1, 9, 10]) if (R() < .6) tiles[tIdx(14 + (R() < .5 ? 1 : 0), r)].t = 'mount';
  }
  const passName = !opts.naval && PASSES[G.cities[cityId]?.name];
  if (passName) { // 관문: 양옆이 산으로 막힌 좁은 길
    for (let q = 6; q <= 10; q++) for (let r = 0; r < BH; r++) if (r <= 3 || r >= 7) tiles[tIdx(q, r)].t = 'mount'; else if (tiles[tIdx(q, r)].t === 'mount' || tiles[tIdx(q, r)].t === 'river') tiles[tIdx(q, r)].t = 'plain';
  }
  tiles[keep].t = 'keep';
  for (const n of hexNb(keep)) tiles[n].t = 'castle';
  const B = {
    tiles, keep, units: [], day: 1, maxDay: 30, side: 0, wind: Math.floor(R() * 6),
    attF, defF, cityId, fromId, food: [attFood, c.food], over: false, result: null,
    fx: [], captives: [], killed: [], fled: [[], []], interactive: false, auto: false, msgs: [], wall: c.wall,
  };
  if (passName) { B.pass = passName; B.wall += 150; bmsg(B, `${passName} — 양옆이 깎아지른 산인 좁은 관문이다. 지키는 쪽이 유리하다`, 'big'); }
  if (!opts.naval) setupWalls(B);
  if (opts.naval) {
    B.naval = true; B.northSide = 0; B.chained = !!opts.naval.chained; B.kuyuk = !!opts.naval.kuyuk;
    if (opts.naval.eastWind) { B.wind = 3; B.windLock = true; } // 동남풍: 불길이 서쪽(조조 쪽)으로
  }
  // 배치
  const attSpots = []; for (let q = opts.naval ? 2 : 0; q <= (opts.naval ? 4 : 2); q++) for (let r = 1; r < BH - 1; r++) attSpots.push(tIdx(q, r));
  attSpots.sort((a, b) => Math.abs(tR(a) - 5) - Math.abs(tR(b) - 5) + (tQ(b) - tQ(a)) * .1);
  const defSpots = [keep, ...hexNb(keep)].concat(hexNb(keep).flatMap(hexNb)).filter((v, i, a) => a.indexOf(v) === i && tiles[v].t !== 'mount' && tiles[v].t !== 'river' && tiles[v].t !== 'water');
  const place = (list, side, spots) => list.forEach((u, k) => {
    const o = G.officers[u.oid];
    let spot = spots.find(s => !B.units.some(x => x.at === s) && (u.type !== 'cav' || tiles[s].t !== 'mount')) ?? spots[0];
    B.units.push({ id: B.units.length, oid: u.oid, side, type: u.type, troops: u.troops, max: u.troops, morale: side === 1 ? 75 : 80, train: u.train ?? 60, at: spot, done: false, conf: 0, cmd: k === 0 && !u.ally && !u.flank, alive: true, ally: !!u.ally, fac: u.fac, home: u.home, src: u.src });
  });
  // 다른 성에서 온 부대는 그 성 방향의 가장자리(위·아래)에서 협공
  const mainSrc = att[0] && att[0].src != null ? att[0].src : fromId;
  const main = att.filter(u => u.src == null || u.src === mainSrc), flank = att.filter(u => !(u.src == null || u.src === mainSrc));
  place(main, 0, attSpots);
  if (flank.length) {
    const T = G.cities[cityId], F0 = G.cities[mainSrc];
    const side = s => { const S = G.cities[s]; const cr = (F0.x - T.x) * (S.y - T.y) - (F0.y - T.y) * (S.x - T.x); return cr < 0 ? 'top' : 'bottom'; };
    const edge = e => { const out = []; for (let q = 3; q <= 9; q++) for (const r of e === 'top' ? [0, 1] : [BH - 1, BH - 2]) { const i = tIdx(q, r); if (tiles[i].t !== 'mount' && tiles[i].t !== 'river' && tiles[i].t !== 'water' && tiles[i].t !== 'castle' && tiles[i].t !== 'keep') out.push(i); } return out.sort((a, b) => tQ(a) - tQ(b)); };
    const groups = {}; for (const u of flank) (groups[side(u.src)] = groups[side(u.src)] || []).push({ ...u, flank: true });
    for (const e in groups) place(groups[e], 0, edge(e).concat(attSpots));
    B.flankFrom = [...new Set(flank.map(u => u.src))];
    bmsg(B, `${B.flankFrom.map(i => G.cities[i].name).join('·')}에서 온 부대가 옆에서 협공한다!`, 'big');
    G.stats.flank = (G.stats.flank || 0) + 1;
  }
  place(def, 1, defSpots);
  if (opts.allies && opts.allies.length) place(opts.allies.map(u => ({ ...u, ally: true })), 1, defSpots.filter(s => tQ(s) >= 11).concat(defSpots));
  B.form = [aiFormation(B, 0), aiFormation(B, 1)];
  B.place = place; B.defSpots = defSpots;
  return B;
}

// 원군 들이기: list [{oid,troops,type,fac,home,train}]
function addReinforce(B, list, side) {
  const spots = side === 1 ? B.defSpots.filter(s => tQ(s) >= 12).concat(B.defSpots) : [];
  B.place(list.map(u => ({ ...u, ally: true })), side, spots.length ? spots : B.defSpots);
  for (const u of list) bmsg(B, `${facName(u.fac)}군 원군 — ${G.officers[u.oid].name} 부대 ${fmt(u.troops)}명이 도착했다`, 'big');
}
const bOff = u => G.officers[u.oid];
const unitAt = (B, i) => B.units.find(u => u.alive && u.at === i);
const enemiesOf = (B, u) => B.units.filter(x => x.alive && x.side !== u.side);
function terrDef(B, u, i) {
  const t = B.tiles[i].t;
  if (isWallT(t) && u.side === 1) return 1.45 + Math.min(.7, B.wall / 1400);
  if ((t === 'castle' || t === 'keep') && u.side === 1) return (B.walls ? 1.15 + Math.min(.4, B.wall / 2400) : 1.3 + Math.min(.7, B.wall / 1400)) + (t === 'keep' ? .1 : 0);
  return TER[t].def;
}
function moveCost(B, u, i) {
  const T = TER[B.tiles[i].t];
  if (B.tiles[i].fire > 0) return 99;
  if (u.side === 0 && isWallT(B.tiles[i].t)) return 99; // 성벽·성문은 부숴야 지나감
  if (u.type === 'cav' && T.cavCost) return T.cavCost;
  if (u.side === 0 && T.attCost) return T.attCost;
  return T.cost;
}
// 갈 수 있는 칸: Map(칸 → 남은 이동력)
function reachable(B, u) {
  const mp = Math.max(1, TYPES[u.type].move + itemMove(bOff(u)) + formOf(B, u.side).mv);
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
function canRange(a) { return !!RANGE[a.type]; }
function inRange(u, d) { const r = RANGE[u.type]; return r ? d >= r[0] && d <= r[1] : d === 1; }
function attackTargets(B, u, from = u.at) {
  return enemiesOf(B, u).filter(e => inRange(u, hexDist(from, e.at)));
}
function estDamage(B, a, d, ranged) {
  let td = terrDef(B, d, d.at); if (a.type === 'tower' && td > 1) td = 1 + (td - 1) * .3; // 정란은 성벽 위를 내려다보고 쏨
  let m = powAtk(a) / Math.max(10, powDef(d) * td);
  if (a.type === 'cav' && !ranged) m *= 1.2 * (policyOf(a.side === 0 ? B.attF : (a.fac ?? B.defF))?.cav || 1);
  if (B.naval) { const pf = a.side === 0 ? B.attF : (a.fac ?? B.defF); if (policyOf(pf)?.naval) m *= policyOf(pf).naval; }
  if (d.type === 'inf' && a.type === 'cav') m *= .82;
  if (d.type === 'arc' && !ranged) m *= 1.15;
  if (ranged) m *= a.type === 'xbow' ? .95 : a.type === 'tower' ? .85 : a.type === 'cata' ? .6 : .72;
  const onWall = d.side === 1 && isFort(B.tiles[d.at].t);
  if (a.type === 'ram') m *= onWall && !ranged ? 2.4 : .45;
  if (SIEGE_T.has(d.type)) m *= 1.3;
  if (a.type === 'tower' || a.type === 'cata') m *= .9;
  const fa = formOf(B, a.side), fd = formOf(B, d.side);
  m *= fa.atk / fd.def;
  const rl = relOf(bOff(a), bOff(d)); if (rl && rl.t === 'foe') m *= 1.1; // 원수끼리는 더 맹렬히
  const around = Math.min(3, B.units.filter(x => x.alive && x !== a && x.side === a.side && hexDist(x.at, d.at) === 1).length);
  m *= 1 + around * .06; // 둘러싸고 치면 더 셈
  if (fa.wrap) m *= 1 + around * .07;
  if (B.units.some(x => x.alive && x !== a && x.side === a.side && hexDist(x.at, a.at) <= 2 && isSworn(bOff(a), bOff(x)))) m *= 1.1;
  if (B.tiles[a.at].t === 'river' && !B.naval) m *= .85;
  const ao = bOff(a), dO = bOff(d);
  if (a.type === 'cav' && !ranged && hasSkill(ao, '돌격')) m *= 1.2;
  if (ranged && hasSkill(ao, '궁신')) m *= 1.25;
  if (B.day <= 3 && hasSkill(ao, '기습')) m *= 1.25;
  if ((B.naval || B.tiles[a.at].t === 'river') && hasSkill(ao, '수군')) m *= 1.25;
  if (d.side === 1 && isFort(B.tiles[d.at].t) && hasSkill(dO, '수성')) m *= .8;
  if (B.naval && a.side === B.northSide && !hasSkill(ao, '수군') && !B.chained) m *= .8; // 북방 군사는 배멀미 (연환이면 덜함)
  return Math.min(d.troops, Math.round(a.troops * .1 * m));
}
function doAttack(B, a, d) {
  const ranged = hexDist(a.at, d.at) > 1 || canRange(a);
  const pm = B.playerSide == null ? 1 : a.side === B.playerSide ? DIFF().pDmg : 1 / DIFF().pDmg;
  const dmg = Math.round(estDamage(B, a, d, ranged) * (.85 + rand() * .3) * pm);
  d.troops -= dmg; d.morale = clamp(d.morale - Math.round(dmg / Math.max(1, d.troops + dmg) * 45) - 1, 0, 100);
  a.morale = clamp(a.morale + 2, 0, 100);
  let cdmg = 0;
  const counter = d.troops > 0 && (ranged ? (canRange(d) && inRange(d, hexDist(a.at, d.at))) : true);
  if ((a.type === 'ram' || a.type === 'cata') && B.walls && B.walls[d.at] && B.walls[d.at].hp > 0) hitWall(B, a, d.at, .5);
  if (a.type === 'cata') for (const n of hexNb(d.at)) { const z = unitAt(B, n); if (z && z.side !== a.side && z.alive) { const sp = Math.round(dmg * .25); z.troops -= sp; bfx(B, n, '−' + fmt(sp), '#ffd2c2', 150); checkRout(B, z, a); } }
  if (counter) {
    cdmg = Math.round(estDamage(B, d, a, ranged) * .45 * (.85 + rand() * .3) * (canRange(d) && !ranged ? .6 : 1));
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
// 간파: 대상 곁(2칸)에 지력 높은 아군이 있으면 그 지력 −10으로 막아 줌
function guardInt(B, t) { let v = bOff(t).int; for (const x of B.units) if (x.alive && x !== t && x.side === t.side && hexDist(x.at, t.at) <= 2) v = Math.max(v, bOff(x).int - 10); return v; }
const tacRange = o => o.int >= 85 ? 3 : 2;
const TAC_NAME = { fire: '화계', confuse: '혼란', fear: '위보', rally: '고무' };
const TAC_MIN = { fire: 45, confuse: 45, fear: 50, rally: 60 };
function tacticChance(B, u, kind, target) {
  const o = bOff(u);
  if (o.int < (TAC_MIN[kind] || 45)) return 0;
  const sk = (hasSkill(o, '신산') ? .12 : 0) + (o.office === '군사' ? .06 : 0);
  if (kind === 'fire') {
    const tt = B.tiles[target].t; if (tt === 'river' || tt === 'bridge' || tt === 'water' && !unitAt(B, target) || B.tiles[target].fire) return 0;
    const occ = unitAt(B, target);
    const di = occ ? guardInt(B, occ) : 45;
    let p = .35 + (o.int - di) / 110 + (tt === 'forest' ? .15 : 0) - (isFort(tt) ? .2 : 0) + sk + (hasSkill(o, '화신') ? .2 : 0);
    return clamp(p, .05, .95);
  }
  if (kind === 'confuse' || kind === 'fear') { const t = unitAt(B, target); if (!t || t.side === u.side) return 0; return clamp((kind === 'fear' ? .38 : .3) + (o.int - guardInt(B, t)) / 80 + sk + (hasSkill(o, '귀모') ? .2 : 0), .05, .92); }
  if (kind === 'rally') { const t = unitAt(B, target); if (!t || t.side !== u.side) return 0; return clamp(.5 + (o.int - 60) / 90 + (o.cha - 50) / 200 + sk, .3, .95); }
  return 0;
}
function tacticTargets(B, u, kind, from = u.at) {
  const out = [], rg = tacRange(bOff(u));
  for (let i = 0; i < B.tiles.length; i++) {
    const d = hexDist(from, i); if (d > rg || (d < 1 && kind !== 'rally')) continue;
    const t = unitAt(B, i);
    if (kind === 'confuse') { if (t && t.side !== u.side && !t.conf) out.push(i); }
    else if (kind === 'fear') { if (t && t.side !== u.side) out.push(i); }
    else if (kind === 'rally') { const tt = t || (i === from ? u : null); if (tt && tt.side === u.side && (tt.conf || tt.morale < 92)) out.push(i); }
    else { if ((t && t.side !== u.side) || (!t && B.tiles[i].t === 'forest' && enemiesOf(B, u).some(e => hexDist(e.at, i) === 1))) out.push(i); }
  }
  return out.filter(i => tacticChance(B, u, kind, i) > 0 || (kind === 'rally' && i === from));
}
function doTactic(B, u, kind, target) {
  const o = bOff(u);
  const p = kind === 'rally' && target === u.at && !unitAt(B, target) ? tacticChance(B, u, kind, u.at) : tacticChance(B, u, kind, target);
  if (!chance(p)) { bmsg(B, `${o.name}의 ${TAC_NAME[kind]}${kind === 'rally' ? '가 먹히지 않았다' : (kind === 'fire' ? '가' : '가') + ' 간파당했다'}`); bfx(B, target, '실패', '#ddd'); SFX.play('miss'); return false; }
  if (kind === 'fire') {
    B.tiles[target].fire = (B.tiles[target].t === 'forest' ? 3 : 2) + (hasSkill(o, '화신') ? 1 : 0);
    if (B.onFx) B.onFx({ kind: 'burst', at: target });
    const t = unitAt(B, target); if (t) burn(B, t);
    if (B.walls && B.walls[target] && B.walls[target].gate && B.walls[target].hp > 0) { const w = B.walls[target]; const d = Math.round(w.max * .18); w.hp -= d; bmsg(B, `성문에 불이 붙었다! 내구 −${d}`, 'good'); if (w.hp <= 0) breakWall(B, target); recalcWall(B); }
    bmsg(B, `${o.name}의 화계! 불길이 치솟는다`, 'good'); SFX.play('fire');
  } else if (kind === 'confuse') {
    const t = unitAt(B, target); t.conf = 1 + (chance(.4) ? 1 : 0) + (hasSkill(o, '귀모') ? 1 : 0);
    bmsg(B, `${o.name}의 계략에 ${bOff(t).name} 부대가 혼란에 빠졌다`, 'good'); bfx(B, target, '혼란', '#e8d06a'); if (B.onFx) B.onFx({ kind: 'swirl', at: target }); SFX.play('confuse');
  } else if (kind === 'fear') {
    const t = unitAt(B, target), d = 12 + Math.round(o.int / 8) + ri(0, 6);
    t.morale = clamp(t.morale - d, 0, 100);
    bmsg(B, `${o.name}의 위보! “${pick(['후방이 뚫렸다!', '본진이 불탔다!', '총대장이 달아났다!', '원군은 오지 않는다!'])}” — ${bOff(t).name} 부대 사기 −${d}`, 'good'); bfx(B, target, '사기−' + d, '#e8d06a'); if (B.onFx) B.onFx({ kind: 'swirl', at: target }); SFX.play('confuse');
    checkRout(B, t, null);
  } else if (kind === 'rally') {
    const t = unitAt(B, target) || u, d = 12 + Math.round(o.cha / 10);
    t.morale = clamp(t.morale + d, 0, 100); const wasC = t.conf; t.conf = 0;
    bmsg(B, `${o.name}의 고무 — ${bOff(t).name} 부대 사기 +${d}${wasC ? ', 혼란에서 벗어났다' : ''}`, 'good'); bfx(B, t.at, '사기+' + d, '#9fe3b8'); SFX.play('tick');
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
    let hit = clamp(.56 + (me.war - op.war) / 110 + (hasSkill(me, '무쌍') ? .08 : 0), .15, .94);
    if (a === 'power') hit -= .16;
    if (chance(hit)) {
      let dmg = (7 + me.war / 8 + ri(0, 6)) * (hasSkill(me, '무쌍') ? 1.25 : 1);
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
      const v = unitAt(B, n);
      let p = (t.t === 'forest' ? .3 : .08) + (downwind ? .25 : 0);
      if (t.t === 'water') { // 물 위에서는 배가 있어야 번짐
        if (!v) continue;
        p = .18 + (downwind ? .4 : 0);
        if (B.chained && v.side === B.northSide && B.tiles[i].t === 'water') p = .9; // 쇠사슬로 묶인 배
      }
      if (chance(p)) { t.fire = t.t === 'forest' ? 3 : t.t === 'water' ? 2 : 1; if (v) burn(B, v); if (t.t === 'water' && B.onFx) B.onFx({ kind: 'burst', at: n }); }
    }
    B.tiles[i].fire--;
  }
  // 군량
  for (const s of [0, 1]) {
    const tr = B.units.filter(u => u.alive && u.side === s).reduce((a, u) => a + u.troops, 0);
    B.food[s] -= Math.ceil(tr / 80);
    if (B.food[s] <= 0) { B.food[s] = 0; for (const u of B.units) if (u.alive && u.side === s) { u.morale = clamp(u.morale - 9, 0, 100); checkRout(B, u, null); } if (B.interactive) bmsg(B, `${s === 0 ? '공격군' : '수비군'}의 군량이 바닥났다! 사기가 떨어진다`, 'bad'); }
  }
  for (const u of B.units) if (u.alive && hasSkill(bOff(u), '위풍')) for (const e of enemiesOf(B, u)) if (hexDist(e.at, u.at) === 1) e.morale = clamp(e.morale - 3, 0, 100);
  for (const u of B.units) { if (u.conf > 0) u.conf--; u.done = false; }
  if (!B.windLock && chance(.2)) B.wind = (B.wind + (chance(.5) ? 1 : 5)) % 6;
  B.day++;
  if (B.kuyuk && B.day === 2) { // 황개의 거짓 항복: 불붙인 배가 돌진
    const ships = B.units.filter(u => u.alive && u.side === B.northSide && B.tiles[u.at].t === 'water').sort((a, b) => hexDist(a.at, B.keep) - hexDist(b.at, B.keep)).slice(0, 3);
    if (ships.length) bmsg(B, '항복하러 온다던 황개의 배에서 불길이 솟는다! 화선이 조조의 선단으로 돌진한다', 'good');
    for (const u of ships) { B.tiles[u.at].fire = 2; burn(B, u); if (B.onFx) B.onFx({ kind: 'burst', at: u.at }); }
    if (ships.length) SFX.play('fire');
  }
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
      const fo = siegeFocus(B);
      if (fo != null && u.cmd && !weak && dk <= 3) pos -= 160; // 성벽이 멀쩡하면 총대장은 화살 닿는 곳에 붙지 않음
      if (fo != null && !weak) { const df = hexDist(tile, fo); pos += u.type === 'cata' ? (df >= 2 && df <= 4 ? 140 : -df * 12) : canRange(u) ? 0 : df === 1 ? 150 : -df * 15; }
    } else {
      const tt = B.tiles[tile].t;
      pos = (tt === 'keep' ? 120 : tt === 'gate' ? 110 : tt === 'wall' ? 95 : tt === 'castle' ? 70 : 0) - Math.max(0, dk - 2) * 55;
      if (nearE > 6) pos -= dk * 20; // 적이 멀면 성에 붙어 있기
      if (u.cmd && tile === keep) pos += 80;
    }
    const adjE = enemies.filter(e => hexDist(e.at, tile) === 1);
    if (canRange(u)) pos -= adjE.length * (u.type === 'xbow' || u.type === 'cata' ? 160 : 120) * (isWallT(B.tiles[tile].t) ? .4 : 1);
    if (u.cmd) pos -= Math.max(0, adjE.length - 1) * 90;
    if (u.cmd && u.side === 0 && B.walls) pos -= enemies.filter(e => canRange(e) && inRange(e, hexDist(tile, e.at)) && isFort(B.tiles[e.at].t)).length * 55; // 성벽 위 궁병의 사정거리는 피함
    if (weak) pos -= adjE.length * 150;
    if (tile !== u.at) pos -= 1;
    // 이동 후 행동
    let act = null, av = 0;
    const save = u.at; u.at = tile;
    for (const e of attackTargets(B, u, tile)) {
      const ranged = canRange(u);
      const dmg = estDamage(B, u, e, ranged);
      const back = ranged && !(canRange(e) && inRange(e, hexDist(tile, e.at))) ? 0 : estDamage(B, e, u, ranged) * .45;
      let v = dmg - back * .9 + (e.cmd ? 220 : 0) + (dmg >= e.troops * .9 ? 500 : 0) + (e.type === 'arc' && !ranged ? 60 : 0);
      if (weak) v -= 200;
      if (v > av) { av = v; act = { kind: 'attack', target: e.id }; }
    }
    // 공성: 성벽·성문 부수기 / 수리
    for (const wi of wallTargets(B, u, tile)) {
      const w = B.walls[wi], dmg = structDmg(u), back = wallBackfire(B, u, wi, tile);
      const v = dmg * (u.type === 'ram' || u.type === 'cata' ? 3 : 2) + (dmg >= w.hp ? 500 : 0) + (w.gate ? 40 : 0) - back * .9 - (weak ? 200 : 0);
      if (v > av) { av = v; act = { kind: 'siege', target: wi }; }
    }
    for (const wi of repairTargets(B, u, tile)) { const w = B.walls[wi]; const v = Math.min(w.max - w.hp, repairAmt(u)) * 2.2 * (w.hp < w.max * .5 ? 1.6 : 1); if (v > av) { av = v; act = { kind: 'repair', target: wi }; } }
    if (o.int >= 50) {
      for (const kind of ['confuse', 'fire', 'fear', 'rally']) {
        if (o.int < TAC_MIN[kind]) continue;
        for (const ti of tacticTargets(B, u, kind, tile)) {
          const p = tacticChance(B, u, kind, ti); const t = unitAt(B, ti) || (ti === tile ? u : null);
          let v = kind === 'confuse' ? p * (t ? t.troops * .18 + (t.cmd ? 200 : 0) : 0)
            : kind === 'fear' ? p * (t ? t.troops * .1 + (t.morale < 30 ? 350 : 0) + (t.cmd ? 120 : 0) : 0)
            : kind === 'rally' ? p * (t ? (92 - t.morale) * 9 + (t.conf ? 420 : 0) : 0)
            : p * ((t ? t.troops * .17 : 0) + hexNb(ti).filter(n => { const z = unitAt(B, n); return z && z.side !== u.side && B.tiles[n].t === 'forest'; }).length * 300);
          if (B.tiles[ti].t === 'forest' && hexNb(ti).some(n => { const z = unitAt(B, n); return z && z.side === u.side; })) v -= 400; // 아군 옆 숲불은 위험
          if (v > av) { av = v; act = { kind, target: ti }; }
        }
      }
    }
    if (o.war >= 70) {
      for (const e of enemies.filter(e => hexDist(e.at, tile) === 1)) {
        const diff = o.war - bOff(e).war;
        if (diff >= 12) { const v = 380 + diff * 10 + (e.cmd ? 300 : 0); if (v > av && chance(YANYI() ? .5 : .22)) { av = v; act = { kind: 'duel', target: e.id }; } }
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
  battleOpening(B);
  while (!B.over && guard++ < 2000) {
    for (const side of [0, 1]) {
      const us = B.units.filter(u => u.alive && u.side === side);
      us.sort((a, b) => canRange(b) - canRange(a));
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
  else if (act.kind === 'siege') doSiege(B, u, act.target);
  else if (act.kind === 'repair') doRepair(B, u, act.target);
  else if (TAC_NAME[act.kind]) doTactic(B, u, act.kind, act.target);
  else if (act.kind === 'duel') { const t = B.units[act.target]; if (t && t.alive && duelAccept(B, u, t)) duelAuto(B, u, t); else if (t) bmsg(B, `${eun(bOff(t).name)} 일기토를 피했다`); }
  u.done = true;
}
