// ===== 공성전: 성벽·성문, 공성 병기, 군사의 계책 =====
// 본성 둘레 두 칸째에 성벽을 두르고 서·북서·남서에 성문을 둠.
// 공격군은 성벽·성문을 부숴야(무너진 성벽·부서진 성문) 안으로 들어갈 수 있음.
function setupWalls(B) {
  B.walls = {}; B.wall0 = B.wall;
  const ring = []; for (let i = 0; i < BW * BH; i++) if (hexDist(i, B.keep) === 2) ring.push(i);
  const kr = tR(B.keep), west = r => ring.filter(i => tR(i) === r).sort((a, b) => tQ(a) - tQ(b))[0];
  const gates = new Set([west(kr), west(kr - 2), west(kr + 2)].filter(x => x != null));
  for (const i of ring) {
    const g = gates.has(i), max = Math.round(g ? B.wall * .4 + 60 : B.wall * .6 + 80);
    B.tiles[i].t = g ? 'gate' : 'wall'; B.tiles[i].fire = 0;
    B.walls[i] = { hp: max, max, gate: g };
  }
}
function recalcWall(B) {
  if (!B.walls) return;
  let hp = 0, mx = 0; for (const k in B.walls) { hp += Math.max(0, B.walls[k].hp); mx += B.walls[k].max; }
  B.wall = Math.round(B.wall0 * (.3 + .7 * hp / Math.max(1, mx)));
}
const wallsLeft = B => B.walls ? Object.values(B.walls).filter(w => w.hp > 0) : [];
// 한 번에 성벽을 깎는 양
function structDmg(u) {
  const o = bOff(u);
  const base = { ram: 110 + o.war / 3, cata: 70 + o.int / 4, inf: 22 + o.war / 5, cav: 10 + o.war / 10 }[u.type] || 0;
  const f = SIEGE_T.has(u.type) ? clamp(u.troops / 1500, .5, 1) : clamp(u.troops / 2500, .3, 1.2);
  return Math.round(base * f);
}
function wallTargets(B, u, from = u.at) {
  if (!B.walls || u.side !== 0 || !structDmg(u)) return [];
  const out = [];
  for (const k in B.walls) { const i = +k, w = B.walls[k]; if (w.hp <= 0) continue; const d = hexDist(from, i); if (u.type === 'cata' ? d >= 2 && d <= 4 : d === 1) out.push(i); }
  return out;
}
// 성벽 위 수비군이 내리는 화살·돌 (붙어서 성벽을 치는 부대만 맞음)
function wallBackfire(B, u, wi, from = u.at) {
  if (u.type === 'cata') return 0;
  let s = 0;
  for (const d of B.units) if (d.alive && d.side === 1 && isWallT(B.tiles[d.at].t) && (d.at === wi || hexDist(d.at, from) === 1)) s += estDamage(B, d, u, true) * .25;
  return s;
}
function hitWall(B, u, wi, mult = 1) {
  const w = B.walls[wi]; if (!w || w.hp <= 0) return 0;
  const d = Math.max(1, Math.round(structDmg(u) * mult * (.85 + rand() * .3)));
  w.hp -= d;
  bfx(B, wi, (w.gate ? '성문' : '성벽') + '−' + d, '#e9d7a8');
  if (w.hp <= 0) breakWall(B, wi);
  recalcWall(B);
  return d;
}
function breakWall(B, wi, why) {
  const w = B.walls[wi]; w.hp = 0;
  B.tiles[wi].t = w.gate ? 'gateo' : 'breach';
  bmsg(B, why || (w.gate ? '성문이 부서졌다! 공격군이 쏟아져 들어간다' : '성벽 한쪽이 무너졌다! 틈으로 길이 열렸다'), 'big');
  for (const x of B.units) if (x.alive) x.morale = clamp(x.morale + (x.side === 1 ? -8 : 5), 0, 100);
  const occ = unitAt(B, wi); if (occ) { occ.troops -= Math.round(occ.troops * .1); checkRout(B, occ, null); }
  if (B.onFx) B.onFx({ kind: 'burst', at: wi, big: true });
  SFX.play('clash');
  G.stats.breach = (G.stats.breach || 0) + 1;
}
function doSiege(B, u, wi) {
  const w = B.walls[wi]; if (!w || w.hp <= 0) return;
  const pm = B.playerSide == null ? 1 : u.side === B.playerSide ? DIFF().pDmg : 1 / DIFF().pDmg;
  if (B.onFx) B.onFx({ kind: u.type === 'cata' ? 'arrow' : 'slash', from: u.at, to: wi, big: u.type === 'ram' });
  const d = hitWall(B, u, wi, pm);
  if (u.type === 'ram' && d && B.interactive) bmsg(B, `${bOff(u).name}의 충차가 ${w.gate ? '성문' : '성벽'}을 들이받았다 (내구 ${Math.max(0, w.hp)}/${w.max})`);
  const back = Math.round(wallBackfire(B, u, wi) * (.85 + rand() * .3) / pm);
  if (back > 0) { u.troops -= back; u.morale = clamp(u.morale - Math.round(back / Math.max(1, u.troops + back) * 25), 0, 100); bfx(B, u.at, '−' + fmt(back), '#ffd2c2', 200); checkRout(B, u, null); }
  SFX.play(u.type === 'cata' ? 'arrow' : 'clash');
  bOff(u).merit += 3;
}
// 수리: 수비군이 성벽 위나 곁에서
const repairAmt = u => { const o = bOff(u); return Math.round((30 + o.int / 4 + o.lead / 8) * (hasSkill(o, '축성') ? 1.5 : 1)); };
function repairTargets(B, u, from = u.at) {
  if (!B.walls || u.side !== 1) return [];
  const out = [];
  for (const k in B.walls) { const i = +k, w = B.walls[k]; if (w.hp > 0 && w.hp < w.max && hexDist(from, i) <= 1) out.push(i); }
  return out;
}
function doRepair(B, u, wi) {
  const w = B.walls[wi]; if (!w || w.hp <= 0) return;
  const a = Math.min(w.max - w.hp, repairAmt(u)); w.hp += a; recalcWall(B);
  bfx(B, wi, '수리+' + a, '#9fe3b8'); if (B.interactive) bmsg(B, `${bOff(u).name} 부대가 ${w.gate ? '성문' : '성벽'}을 보수했다 (+${a})`);
  SFX.play('tick'); bOff(u).merit += 2;
}
// 공격군 AI가 노릴 곳: 이미 열린 틈이 있으면 없음, 아니면 가장 약한 성문·성벽
function siegeFocus(B) {
  if (!B.walls) return null;
  if (B._fo && B._fo.day === B.day && B._fo.n === wallsLeft(B).length) return B._fo.v;
  let v = null;
  const open = Object.keys(B.walls).some(k => B.walls[k].hp <= 0 && hexNb(+k).some(n => hexDist(n, B.keep) === 3 && !isWallT(B.tiles[n].t)));
  if (!open) {
    const att = B.units.filter(u => u.alive && u.side === 0);
    let best = 1e9;
    for (const k in B.walls) {
      const i = +k, w = B.walls[k]; if (w.hp <= 0) continue;
      if (!hexNb(i).some(n => hexDist(n, B.keep) === 3)) continue; // 바깥에서 닿지 않는 곳
      const dist = att.length ? att.reduce((a, u) => a + hexDist(u.at, i), 0) / att.length : 0;
      const sc = w.hp + dist * 25;
      if (sc < best) { best = sc; v = i; }
    }
  }
  B._fo = { day: B.day, n: wallsLeft(B).length, v };
  return v;
}

// ===== 군사의 계책: 싸움 앞에 지략가가 내는 꾀 =====
const STRATS = {
  raid: { name: '야습', sides: [0, 1], base: 0, desc: '밤에 적진을 덮쳐 두 부대에 피해를 주고 사기를 꺾음' },
  rumor: { name: '유언비어', sides: [0, 1], base: .05, desc: '헛소문을 퍼뜨려 적군 모두 사기 −10' },
  supply: { name: '양도 차단', sides: [0, 1], base: -.05, desc: '적의 보급로를 끊어 군량 −40%' },
  ambush: { name: '매복', sides: [0, 1], base: 0, desc: '복병이 적 앞줄 두 부대를 쳐서 혼란에 빠뜨림' },
  traitor: { name: '내응', sides: [0], base: -.3, need: B => !!B.walls, desc: '성 안의 내통자가 성문 하나를 열어 줌' },
  scorch: { name: '견벽청야', sides: [1], base: .1, desc: '들판을 비워 공격군 군량 −30%' },
  prep: { name: '수성 준비', sides: [1], base: .25, need: B => !!B.walls, desc: '성벽·성문을 미리 보강해 내구 +35%' },
};
function strategist(B, side) {
  const us = B.units.filter(u => u.alive && u.side === side);
  const st = us.sort((a, b) => bOff(b).int - bOff(a).int)[0];
  return st && bOff(st).int >= 65 ? st : null;
}
function stratOptions(B, side) { return Object.keys(STRATS).filter(k => STRATS[k].sides.includes(side) && (!STRATS[k].need || STRATS[k].need(B))); }
function stratChance(B, side, k) {
  const st = strategist(B, side); if (!st) return 0;
  const o = bOff(st), oi = Math.max(0, ...B.units.filter(u => u.alive && u.side !== side).map(u => bOff(u).int));
  return clamp(.4 + (o.int - oi) / 70 + STRATS[k].base + (hasSkill(o, '신산') ? .1 : 0) + (o.office === '군사' ? .08 : 0), .08, .92);
}
function applyStrat(B, side, k) {
  const st = strategist(B, side); if (!st) return false;
  const o = bOff(st), S = STRATS[k], foe = B.units.filter(u => u.alive && u.side !== side), mine = B.units.filter(u => u.alive && u.side === side);
  B.stratUsed = B.stratUsed || {}; B.stratUsed[side] = k;
  if (!chance(stratChance(B, side, k))) {
    bmsg(B, `${o.name}의 ${S.name} 계책이 간파당했다`, 'bad');
    if (k === 'raid' || k === 'ambush') for (const u of mine) u.morale = clamp(u.morale - 4, 0, 100);
    return false;
  }
  o.merit += 20; o.fame += 1;
  if (k === 'raid') {
    for (const u of shuffle([...foe]).slice(0, 2)) { const d = Math.round(u.troops * (.08 + rand() * .05)); u.troops -= d; u.morale = clamp(u.morale - 12, 0, 100); bfx(B, u.at, '−' + fmt(d), '#ffd2c2'); }
    bmsg(B, `${o.name}의 계책 — 야습! 밤을 틈타 적진을 덮쳤다`, 'big');
  } else if (k === 'rumor') { for (const u of foe) u.morale = clamp(u.morale - 10, 0, 100); bmsg(B, `${o.name}의 계책 — 유언비어! 적진이 술렁인다 (적 사기 −10)`, 'big'); }
  else if (k === 'supply') { B.food[1 - side] = Math.round(B.food[1 - side] * .6); bmsg(B, `${o.name}의 계책 — 양도 차단! 적의 군량이 줄었다`, 'big'); }
  else if (k === 'ambush') {
    const front = [...foe].sort((a, b) => Math.min(...mine.map(m => hexDist(m.at, a.at))) - Math.min(...mine.map(m => hexDist(m.at, b.at)))).slice(0, 2);
    for (const u of front) { const d = Math.round(u.troops * .08); u.troops -= d; u.conf = Math.max(u.conf, 1); bfx(B, u.at, '복병!', '#e8d06a'); }
    bmsg(B, `${o.name}의 계책 — 매복! 복병이 ${front.map(u => bOff(u).name).join('·')} 부대를 덮쳤다`, 'big');
  } else if (k === 'traitor') {
    const g = Object.keys(B.walls).map(Number).filter(i => B.walls[i].gate && B.walls[i].hp > 0);
    if (g.length) breakWall(B, pick(g), `${o.name}의 계책 — 내응! 성 안의 내통자가 성문을 열었다`); recalcWall(B);
  } else if (k === 'scorch') { B.food[0] = Math.round(B.food[0] * .7); bmsg(B, `${o.name}의 계책 — 견벽청야! 들판을 비워 공격군이 먹을 것을 구하지 못한다`, 'big'); }
  else if (k === 'prep') { for (const w of Object.values(B.walls)) { w.max = Math.round(w.max * 1.35); w.hp = Math.round(w.hp * 1.35); } bmsg(B, `${o.name}의 계책 — 수성 준비! 성벽과 성문을 단단히 보강했다`, 'big'); }
  return true;
}
const STRAT_VAL = { raid: 1, rumor: .9, supply: .75, ambush: 1, traitor: 1.15, scorch: .8, prep: 1.1 };
function aiStrat(B, side) {
  const st = strategist(B, side); if (!st || bOff(st).int < 70 || !chance(.85)) return;
  const opts = stratOptions(B, side).map(k => [k, stratChance(B, side, k) * STRAT_VAL[k] * (.85 + rand() * .3)]).sort((a, b) => b[1] - a[1]);
  if (opts.length && opts[0][1] > .25) applyStrat(B, side, opts[0][0]);
}
// 싸움 시작: 아직 계책을 안 낸 쪽은 AI가 냄
function battleOpening(B) {
  if (B.opened) return; B.opened = true;
  for (const side of [0, 1]) if (!(B.stratDone || []).includes(side)) aiStrat(B, side);
}
