// ===== 전략 AI =====
function hostileNeighbors(c) { return ADJ[c.id].map(i => G.cities[i]).filter(x => x.f !== c.f && x.f >= 0 && !isAlly(c.f, x.f)); }
function threatOf(c) { return hostileNeighbors(c).reduce((m, x) => Math.max(m, x.troops * (.6 + x.train / 250)), 0); }
function troopTarget(c) {
  const front = hostileNeighbors(c).length > 0 || ADJ[c.id].some(i => G.cities[i].f < 0);
  const base = 2000 + c.size * 2500 + (front ? 5000 : 0);
  const want = Math.max(base, Math.min(threatOf(c) * .9, base * 1.6));
  return Math.min(c.food / 0.36 + 1500, want);
}

// 도시 하나의 한 달 내정 (AI 태수)
function aiCityTurn(c) {
  const offs = officersIn(c.id, c.f).filter(o => o.id !== G.player && !o.acted);
  if (!offs.length) return;
  const threat = threatOf(c);
  // 충성 낮은 장수 포상
  for (const t of officersIn(c.id, c.f)) if (t.loy < 72 && c.gold > 350 && t.id !== G.player && !isRuler(t)) cmdReward(null, c, t);
  const byPol = [...offs].sort((a, b) => b.pol - a.pol);
  for (const o of byPol) {
    if (o.acted) continue;
    const roninHere = roninIn(c.id).filter(r => r.found && r.id !== G.player && hireChance(o, r, c.f) > .15);
    if (c.order < 45) { cmdDevelop(o, c, 'order'); continue; }
    if (c.troops < troopTarget(c) - 500 && c.gold >= 120 && c.pop > 20000) {
      const n = Math.min(draftMax(o, c), Math.max(1000, troopTarget(c) - c.troops));
      if (n >= 500 && cmdDraft(o, c, n).ok) continue;
    }
    if (roninHere.length && o.cha >= 55) { cmdHire(o, c, roninHere.sort((a, b) => (b.lead + b.war + b.int) - (a.lead + a.war + a.int))[0]); continue; }
    if (c.train < 78 && c.troops > 1500 && o.lead >= 55 && chance(.7)) { cmdTrain(o, c); continue; }
    if (c.gold >= 90) {
      const kind = c.agri / c.agriMax < c.comm / c.commMax ? 'agri' : 'comm';
      if (cmdDevelop(o, c, kind).ok) continue;
      if (cmdDevelop(o, c, kind === 'agri' ? 'comm' : 'agri').ok) continue;
    }
    if (c.wall < c.wallMax && c.gold > 260 && threat > 0 && cmdDevelop(o, c, 'wall').ok) continue;
    if (c.train < 95 && c.troops > 1000) { cmdTrain(o, c); continue; }
    cmdSearch(o, c);
  }
}

// 세력의 군사 행동: 출진 목록을 돌려줌
function aiPlanAttacks(F) {
  const ruler = G.officers[F.ruler];
  const aggr = .85 + (ruler.war - 60) / 160 - (ruler.int - 60) / 400;
  const plans = [];
  const graceForPlayer = mIdx() - (G.start || 0) <= DIFF().grace;
  const pf = me() && me().st === 'on' ? me().f : -2;
  if (G.tut && F.key === 'yt') return plans; // 튜토리얼: 황건 잔당은 가만히
  for (const c of G.cities.filter(x => x.f === F.id)) {
    if (playerControls(c)) continue;
    const offs = officersIn(c.id, F.id).filter(o => o.id !== G.player && !o.busyWar);
    if (!offs.length) continue;
    const targets = ADJ[c.id].map(i => G.cities[i]).filter(t => t.f !== F.id && !isAlly(F.id, t.f) && !plans.some(p => p.to === t));
    let bestT = null, bestS = 0;
    for (const t of targets) {
      if (t.f === pf && graceForPlayer) continue;
      if (G.tut && t.f >= 0 && G.factions[t.f].key === 'yt') continue; // 튜토리얼 목표는 남겨 둠
      const tOffs = t.f >= 0 ? officersIn(t.id, t.f) : [];
      if (t.f < 0 || !tOffs.length) {
        if (c.troops >= 5000 && offs.length >= 2 && histEmptyOK(F, t)) { const s = 2 + t.size; if (s > bestS) { bestS = s; bestT = t; } }
        continue;
      }
      const top = [...offs].sort((a, b) => (b.lead + b.war) - (a.lead + a.war)).slice(0, 5);
      const myQ = top.reduce((a, o) => a + o.lead * .55 + o.war * .45, 0) / top.length;
      const thQ = tOffs.slice(0, 5).reduce((a, o) => a + o.lead * .6 + o.int * .2 + o.war * .2, 0) / Math.min(5, tOffs.length);
      const myPow = c.troops * .75 * myQ * (.6 + c.train / 250);
      const tEff = Math.min(t.troops, tOffs.slice(0, 5).reduce((a, o) => a + troopCap(o), 0));
      const thPow = tEff * thQ * (.6 + t.train / 250) * (1.15 + Math.min(.5, t.wall / 2000));
      const ratio = myPow / Math.max(1, thPow);
      const need = Math.max(.95, DIFF().base / aggr - Math.min(.35, (F.idle || 0) * .015)) + (t.f === pf ? DIFF().vsP : 0) + histNeed(F, t);
      if (ratio > need && c.food > c.troops * .3) { const s = ratio * (1 + t.size / 5) + (getRel(F.id, t.f) < 30 ? .3 : 0); if (s > bestS) { bestS = s; bestT = t; } }
    }
    if (!bestT) continue;
    const empty = bestT.f < 0 || !officersIn(bestT.id, bestT.f).length;
    let army;
    if (empty) {
      const o = [...offs].sort((a, b) => (a.lead + a.war) - (b.lead + b.war))[Math.min(1, offs.length - 1)];
      if (o.id === c.gov && offs.length > 1) continue;
      army = [{ oid: o.id, troops: Math.min(Math.floor(c.troops * .35 / 100) * 100, 4000), type: autoType(o) }];
    } else {
      const pool = offs.filter(o => o.id !== c.gov);
      if (!pool.length) continue; // 태수는 성을 지킴
      let top = [...pool].sort((a, b) => (b.lead + b.war) - (a.lead + a.war)).slice(0, 5);
      // 플레이어가 이 성의 장수면 데려갈 수 있음
      const P = me();
      if (P && P.st === 'on' && P.f === F.id && P.city === c.id && !P.travel && !isRuler(P) && c.gov !== P.id && top.length < 5 && (P.lead + P.war > 110 || chance(.5))) top.push(P);
      const tr = splitTroops(top, Math.floor(c.troops * .78));
      army = top.map((o, i) => ({ oid: o.id, troops: tr[i], type: autoType(o) })).filter(u => u.troops >= 500);
      if (!army.length) continue;
      // 목표에 붙은 다른 우리 성에서도 함께 출진 (협공)
      for (const s of attackSources(c, bestT).slice(1)) {
        if (army.length >= 5) break;
        if (playerControls(s) || s.troops < 5000) continue;
        const so = officersIn(s.id, F.id).filter(o => o.id !== s.gov && o.id !== G.player && !o.busyWar).sort((a, b) => (b.lead + b.war) - (a.lead + a.war))[0];
        if (!so || !chance(.8)) continue;
        const t = Math.min(troopCap(so), Math.floor(s.troops * .45 / 100) * 100);
        if (t >= 1500) army.push({ oid: so.id, troops: t, type: autoType(so), src: s.id });
      }
      // 성벽이 두꺼우면 가장 약한 부대가 충차를 끔
      if (army.length >= 3 && bestT.wall >= 380 && chance(.6)) { const w = army.reduce((m, u) => G.officers[u.oid].war < G.officers[m.oid].war ? u : m, army[army.length - 1]); if (w !== army[0] && w.oid !== G.player) w.type = 'ram'; }
    }
    const tot = army.reduce((a, u) => a + u.troops, 0);
    const food = Math.min(attackSources(c, bestT).filter(s => s === c || army.some(u => u.src === s.id)).reduce((a, s) => a + s.food, 0), Math.ceil(tot * 32 / 80));
    plans.push({ from: c, to: bestT, army, food });
  }
  return plans;
}

// 목표를 정하고 병력·장수를 집결지로 모음
function aiLogistics(F) {
  const cs = G.cities.filter(x => x.f === F.id && !playerControls(x));
  if (!cs.length) return;
  const pf = me() && me().st === 'on' ? me().f : -2;
  const grace = mIdx() - (G.start || 0) <= DIFF().grace;
  let tgt = F.target != null ? G.cities[F.target] : null;
  const bad = t => !t || t.f === F.id || isAlly(F.id, t.f) || !ADJ[t.id].some(i => G.cities[i].f === F.id) || (grace && t.f === pf);
  const fT = focusTargets(F.id);
  if (bad(tgt) || chance(.04) || (fT.length && tgt && !fT.includes(tgt.f) && chance(.3))) {
    let best = null, bs = 1e18;
    for (const c of G.cities.filter(x => x.f === F.id)) for (const i of ADJ[c.id]) {
      const t = G.cities[i]; if (t.f === F.id || isAlly(F.id, t.f) || (grace && t.f === pf)) continue;
      if (t.f < 0 && !histEmptyOK(F, t)) continue;
      const s = (t.f < 0 ? 0 : t.troops * (1.15 + t.wall / 2000)) - t.size * 1500 + rand() * 3000 + histTargetBias(F, t);
      if (s < bs) { bs = s; best = t; }
    }
    F.target = best ? best.id : null; tgt = best;
  }
  if (!tgt) return;
  const stage = ADJ[tgt.id].map(i => G.cities[i]).filter(x => x.f === F.id).sort((a, b) => b.troops - a.troops)[0];
  if (!stage) return;
  const next = { [stage.id]: -1 }, q = [stage.id];
  while (q.length) { const a = q.shift(); for (const b of ADJ[a]) if (G.cities[b].f === F.id && next[b] === undefined) { next[b] = a; q.push(b); } }
  for (const c of cs) {
    if (c === stage || next[c.id] === undefined) continue;
    const to = G.cities[next[c.id]];
    const keep = Math.max(2500, threatOf(c) * .55);
    const offs = officersIn(c.id, F.id).filter(o => o.id !== G.player);
    if (c.troops - keep >= 1500 && offs.length) cmdTransport(offs.find(o => o.id !== c.gov) || offs[0], c, to, Math.max(0, c.gold - 400), Math.max(0, c.food - Math.max(5000, c.troops * .4)), c.troops - keep);
    const free = offs.filter(o => o.id !== c.gov && !isRuler(o));
    if (free.length >= 2 || (free.length === 1 && threatOf(c) === 0)) cmdMove(free.sort((a, b) => (b.war + b.lead) - (a.war + a.lead))[0], to.id);
  }
}

// 외교
function aiDiplomacy(F) {
  const others = G.factions.filter(x => x.alive && x.id !== F.id);
  const myCities = G.cities.filter(c => c.f === F.id);
  const neighbors = new Set(); myCities.forEach(c => ADJ[c.id].forEach(i => { const f = G.cities[i].f; if (f >= 0 && f !== F.id) neighbors.add(f); }));
  for (const o of others) {
    if (isAlly(F.id, o.id)) {
      if (getRel(F.id, o.id) < 25 && chance(.15) && !(G.marry && G.marry[relKey(F.id, o.id)])) breakAlly(F.id, o.id);
      continue;
    }
    if (!neighbors.has(o.id) && chance(.04)) addRel(F.id, o.id, 3);
    var pf = me() && me().st === 'on' && isRuler(me()) ? me().f : -2;
    const common = [...neighbors].some(n => n !== o.id && G.cities.some(c => c.f === o.id && ADJ[c.id].some(i => G.cities[i].f === n)) && factionPower(n) > factionPower(F.id));
    if (getRel(F.id, o.id) >= 70 && (common || o.id === pf) && chance(.05)) {
      if (o.id === pf) { G.pendingOffers = G.pendingOffers || []; G.pendingOffers.push({ from: F.id, kind: 'ally' }); }
      else { makeAlly(F.id, o.id); logMsg(`${F.name}군과 ${o.name}군이 동맹을 맺었습니다`, 'dip'); }
    }
  }
}

// 재야 장수들의 떠돌기, 낮은 충성 이탈
function aiOfficersDrift() {
  for (const o of G.officers) {
    if (o.id === G.player) continue;
    if (o.st === 'ronin' && chance(.12)) { o.city = pick(ADJ[o.city]); o.found = false; }
    if (o.st === 'on' && !isRuler(o) && o.loy < 35 && chance(.06)) { logMsg(`${eun(o.name)} ${facName(o.f)}군을 떠났습니다`); leaveToRonin(o); }
  }
}
