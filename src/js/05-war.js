// ===== 전쟁: 출진·점령·포로 =====
function autoType(o) { return o.war >= 82 && o.lead >= 70 ? 'cav' : (o.int > o.war + 8 ? 'arc' : 'inf'); }
function troopCap(o) { return 1500 + o.lead * 90; }
// 부대 나누기: 통솔에 비례, 상한 있음
function splitTroops(offs, total) {
  const w = offs.map(o => o.lead + 20), sw = w.reduce((a, b) => a + b, 0);
  let out = offs.map((o, i) => Math.min(troopCap(o), Math.floor(total * w[i] / sw / 100) * 100));
  return out;
}
function defendArmy(c) {
  let offs = officersIn(c.id, c.f);
  offs.sort((a, b) => (b.id === c.gov) - (a.id === c.gov) || (b.lead + b.war) - (a.lead + a.war));
  if (offs[0] && c.gov >= 0 && offs[0].id !== c.gov) { const g = offs.find(o => o.id === c.gov); if (g) offs = [g, ...offs.filter(o => o !== g)]; }
  offs = offs.slice(0, 5);
  const tr = splitTroops(offs, c.troops);
  return offs.map((o, i) => ({ oid: o.id, troops: Math.max(tr[i], 200), type: autoType(o), train: c.train })).filter(u => u.troops > 0);
}

// 출진. 빈 성이면 바로 점령, 아니면 전투를 돌려줌
function launchAttack(from, to, army, food) {
  const attF = from.f;
  const total = army.reduce((a, u) => a + u.troops, 0);
  from.troops -= total; from.food -= food;
  army.forEach(u => { const o = G.officers[u.oid]; o.acted = true; if (from.gov === o.id) from.gov = -1; u.train = from.train; });
  const defOffs = to.f >= 0 ? officersIn(to.id, to.f) : [];
  if (to.f < 0 || !defOffs.length) {
    // 무혈 입성
    const prevF = to.f;
    const gained = to.f >= 0 ? Math.round(to.troops * .3) : 0;
    occupy(to, attF, army.map(u => u.oid), total + gained, from.train, food);
    if (prevF >= 0) logMsg(`${facName(attF)}군이 장수 없는 ${eul(to.name)} 손쉽게 차지했습니다`, 'war');
    else logMsg(`${facName(attF)}군이 빈 땅 ${eul(to.name)} 차지했습니다`, 'war');
    G.officers[army[0].oid].merit += 80;
    checkFactions();
    return null;
  }
  const B = makeBattle({ attF, defF: to.f, cityId: to.id, fromId: from.id, att: army, def: defendArmy(to), attFood: food });
  return B;
}
function occupy(c, f, oids, troops, train, food) {
  c.f = f; c.troops = Math.min(troops, troopMax(c)); c.train = train; c.food += food; c.deleg = false;
  c.order = Math.max(20, c.order - 10);
  for (const id of oids) { const o = G.officers[id]; if (o.st === 'on') o.city = c.id; }
  c.gov = -1;
  // 지휘관 또는 공적 높은 이가 태수
  const cands = oids.map(id => G.officers[id]).filter(o => o.st === 'on' && o.city === c.id);
  if (cands.length) c.gov = cands[0].id;
  assignGovs();
}

// 전투 결과를 세상에 적용 (포로 처리는 따로)
function applyBattle(B) {
  const att = B.attF, def = B.defF, c = G.cities[B.cityId], from = G.cities[B.fromId];
  const win = B.result.win;
  const alive = s => B.units.filter(u => u.alive && u.side === s);
  const capturedSet = new Set(B.captives);
  G.stats.battles++;
  // 죽은 장수
  for (const id of B.killed) { const o = G.officers[id]; if (o.st === 'on') killOfficer(o, `${eun(o.name)} 전장에서 목숨을 잃었습니다`); }
  const attAlive = alive(0), defAlive = alive(1);
  const attCmd = B.units.find(u => u.side === 0 && u.cmd);
  if (win === 0) {
    const winners = attAlive.map(u => u.oid).filter(id => G.officers[id].st === 'on');
    let tr = attAlive.reduce((a, u) => a + u.troops, 0);
    // 수비 생존자는 이웃 성으로 물러남
    const retreat = ADJ[c.id].map(i => G.cities[i]).filter(x => x.f === def).sort((a, b) => b.troops - a.troops)[0];
    const defLeft = [...defAlive.map(u => ({ oid: u.oid, troops: u.troops })), ...B.fled[1]];
    // 싸우지 않은 성 안의 장수들
    for (const o of officersIn(c.id, def)) if (!B.units.some(u => u.oid === o.id)) defLeft.push({ oid: o.id, troops: 0 });
    for (const d of defLeft) {
      const o = G.officers[d.oid]; if (o.st !== 'on' || capturedSet.has(o.id)) continue;
      if (retreat && chance(.85)) { o.city = retreat.id; retreat.troops += Math.round(d.troops * .7); }
      else { B.captives.push(o.id); capturedSet.add(o.id); }
    }
    c.gold = Math.round(c.gold * .5);
    c.food = Math.round(B.food[1] * .5);
    c.wall = Math.max(60, Math.round(c.wall * .8));
    occupy(c, att, attCmd && attCmd.alive ? [attCmd.oid, ...winners.filter(x => x !== attCmd.oid)] : winners, tr, B.units[0].train, B.food[0]);
    for (const f of B.fled[0]) { const o = G.officers[f.oid]; if (o.st === 'on') { o.city = from.id; from.troops += f.troops; } }
    if (from.f !== att) { /* 출발 성을 그 사이 잃었으면 */ for (const f of B.fled[0]) { const o = G.officers[f.oid]; if (o.st === 'on') o.city = c.id; } }
    logMsg(`${facName(att)}군이 ${eul(c.name)} 함락했습니다 (${B.result.why})`, 'war');
    for (const u of attAlive) { const o = G.officers[u.oid]; o.merit += 120; o.fame += 4; }
    if (attCmd) { const o = G.officers[attCmd.oid]; o.fame += 6; }
  } else {
    // 공격 실패 → 돌아감
    const back = from.f === att ? from : (G.cities.find(x => x.f === att && ADJ[x.id].includes(c.id)) || G.cities.find(x => x.f === att));
    const retList = [...attAlive.map(u => ({ oid: u.oid, troops: u.troops })), ...B.fled[0]];
    for (const r of retList) {
      const o = G.officers[r.oid]; if (o.st !== 'on' || capturedSet.has(o.id)) continue;
      if (back) { o.city = back.id; back.troops += r.troops; } else { B.captives.push(o.id); }
    }
    if (back) back.food += B.food[0];
    c.troops = defAlive.reduce((a, u) => a + u.troops, 0) + B.fled[1].reduce((a, f) => a + f.troops, 0);
    c.food = B.food[1];
    c.wall = Math.max(60, c.wall - ri(10, 40));
    for (const f of B.fled[1]) { const o = G.officers[f.oid]; if (o.st === 'on') o.city = c.id; }
    logMsg(`${facName(def)}군이 ${eul(c.name)} 지켜 냈습니다 (${B.result.why})`, 'war');
    for (const u of defAlive) { const o = G.officers[u.oid]; o.merit += 100; o.fame += 3; }
  }
  if (win === (B.playerSide ?? -1)) G.stats.wins++;
  // 전쟁은 우호를 깎음
  if (att >= 0 && def >= 0) addRel(att, def, -15);
  assignGovs();
}

// 포로 처리: 이긴/잡은 쪽이 결정
async function resolveCaptives(B) {
  const list = [...new Set(B.captives)];
  for (const id of list) {
    const o = G.officers[id];
    if (o.st !== 'on') continue;
    const mySide = B.units.find(u => u.oid === id)?.side;
    const captorF = mySide === 0 ? B.defF : mySide === 1 ? B.attF : (o.f === B.attF ? B.defF : B.attF);
    if (captorF < 0 || !G.factions[captorF].alive) { continue; }
    if (o.f === captorF) continue;
    await decideCaptive(captorF, o);
  }
  checkFactions();
}
async function decideCaptive(captorF, o) {
  const ruler = G.officers[G.factions[captorF].ruler];
  if (o.items && o.items.length) { const names = o.items.map(id => ITEM[id].name); for (const id of [...o.items]) giveItem(id, ruler); logMsg(`${facName(captorF)}군이 ${o.name}에게서 ${names.join('·')}${josa(names[names.length - 1], '을', '를').slice(-1)} 빼앗았습니다`, 'big'); }
  const P = me();
  const playerDecides = P && P.st === 'on' && P.f === captorF && isRuler(P);
  if (o.id === G.player) {
    const ch = await UI.choose({ title: '포로가 되다', portrait: ruler, text: `${facName(captorF)}군에 사로잡혔습니다. ${iga(ruler.name)} 묻습니다. "내 밑에서 일해 보지 않겠는가?"`, options: [{ k: 'yes', label: '항복하고 섬긴다' }, { k: 'no', label: '거절한다' }] });
    if (ch === 'yes') { const wasRuler = isRuler(o); const oldF = o.f; joinFaction(o, captorF, ruler.city); if (wasRuler) succession(oldF, o); logMsg(`${eun(o.name)} ${facName(captorF)}군에 항복했습니다`, 'big'); return; }
    const pExec = clamp(.15 + (60 - ruler.cha) / 180 + (isRuler(o) ? .2 : 0), .05, .6);
    if (chance(pExec)) { killOfficer(o, `${eun(o.name)} ${ruler.name}에게 처형당했습니다`); return; }
    releaseCaptive(o, captorF);
    await UI.alert({ title: '석방', text: `${eun(ruler.name)} 의기를 높이 사 풀어 주었습니다.` });
    return;
  }
  if (playerDecides) {
    const p = captiveHireChance(captorF, o);
    const ch = await UI.choose({ title: '포로 처분', portrait: o, text: `${facName(o.f)}군의 ${eul(o.name)} 사로잡았습니다.\n통솔 ${o.lead} · 무력 ${o.war} · 지력 ${o.int} · 정치 ${o.pol} · 매력 ${o.cha}`, options: [{ k: 'hire', label: `등용한다 (가능성 ${Math.round(p * 100)}%)` }, { k: 'free', label: '풀어 준다' }, { k: 'kill', label: '처단한다', danger: true }] });
    if (ch === 'hire') {
      if (chance(p)) { const wasRuler = isRuler(o), oldF = o.f; joinFaction(o, captorF, ruler.city); if (wasRuler) succession(oldF, o); await UI.alert({ title: '등용 성공', portrait: o, text: `${eun(o.name)} 고개를 숙이고 따르겠다고 합니다.` }); return; }
      await UI.alert({ title: '등용 실패', portrait: o, text: `"두 주군을 섬길 수는 없소." ${eun(o.name)} 거절했습니다. 풀어 줍니다.` });
      releaseCaptive(o, captorF); return;
    }
    if (ch === 'kill') { killOfficer(o, `${eun(o.name)} 처단되었습니다`); for (const x of factionOfficers(captorF)) x.loy = Math.max(0, x.loy - (affDist(x, o) < 10 ? 6 : 1)); return; }
    releaseCaptive(o, captorF); addRel(captorF, o.f, 5); return;
  }
  // AI 결정
  const p = captiveHireChance(captorF, o);
  if (chance(p)) { const wasRuler = isRuler(o), oldF = o.f; joinFaction(o, captorF, ruler.city); logMsg(`${eun(o.name)} 포로가 된 뒤 ${facName(captorF)}군에 들어갔습니다`); if (wasRuler) succession(oldF, o); return; }
  const pExec = clamp(.1 + (60 - ruler.cha) / 200 + (isRuler(o) ? .35 : 0), .03, .7);
  if (chance(pExec)) { killOfficer(o, `${eun(o.name)} ${facName(captorF)}군에 처형당했습니다`); return; }
  releaseCaptive(o, captorF);
}
function captiveHireChance(captorF, o) {
  if (isRuler(o)) return .03;
  const ruler = G.officers[G.factions[captorF].ruler];
  const myRuler = o.f >= 0 ? G.officers[G.factions[o.f].ruler] : null;
  if (myRuler && o.tag && o.tag === myRuler.tag) return .02;
  return clamp(.25 + (100 - o.loy) / 160 + (25 - affDist(o, ruler)) / 80 + (hasSkill(ruler, '인덕') ? .1 : 0), .05, .88);
}
function releaseCaptive(o, captorF) {
  const F = o.f >= 0 ? G.factions[o.f] : null;
  if (F && F.alive) {
    const home = G.cities.filter(c => c.f === o.f);
    if (home.length) { const c = G.cities[o.city]; if (c.gov === o.id) c.gov = -1; o.city = (home.find(h => ADJ[h.id].includes(o.city)) || home[0]).id; logMsg(`${eun(o.name)} 풀려나 ${facName(o.f)}군으로 돌아갔습니다`); assignGovs(); return; }
  }
  leaveToRonin(o);
}
