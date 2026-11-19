// ===== 규칙: 내정·인사·외교 (플레이어와 AI가 함께 씀) =====
const COST = { agri: 50, comm: 50, order: 20, wall: 80, train: 0, search: 0 };
const DEV_NAME = { agri: '개간', comm: '상업', order: '치안', wall: '성벽' };

function devMul(o, kind) { let m = hasSkill(o, '치정') ? 1.3 : 1; if (kind === 'agri' && hasSkill(o, '둔전')) m *= 1.5; if (kind === 'comm' && hasSkill(o, '상재')) m *= 1.5; if (kind === 'wall' && hasSkill(o, '축성')) m *= 1.5; if (kind === 'wall' && policyOf(o.f)?.wall) m *= policyOf(o.f).wall; return m; }
function cmdDevelop(o, c, kind) {
  if (c.gold < COST[kind]) return { ok: false, msg: '금이 모자랍니다' };
  let gain = 0, msg = '';
  if (kind === 'agri' || kind === 'comm') {
    const max = kind === 'agri' ? c.agriMax : c.commMax;
    if (c[kind] >= max) return { ok: false, msg: '이미 최대치입니다' };
    gain = Math.round((o.pol / 6 + ri(2, 8 + o.pol / 10)) * devMul(o, kind));
    c[kind] = Math.min(max, c[kind] + gain);
    msg = `${kind === 'agri' ? '농업' : '상업'} +${gain}`;
  } else if (kind === 'order') {
    if (c.order >= 100) return { ok: false, msg: '치안이 이미 최고입니다' };
    gain = Math.round((3 + o.war / 20 + o.lead / 25 + ri(0, 4)) * devMul(o, kind));
    c.order = Math.min(100, c.order + gain);
    msg = `치안 +${gain}`;
  } else if (kind === 'wall') {
    if (c.wall >= c.wallMax) return { ok: false, msg: '성벽이 이미 튼튼합니다' };
    gain = Math.round((o.pol / 5 + o.lead / 10 + ri(4, 14)) * devMul(o, kind));
    c.wall = Math.min(c.wallMax, c.wall + gain);
    msg = `성벽 +${gain}`;
  }
  c.gold -= COST[kind];
  o.acted = true; o.merit += 10 + Math.round(gain / 2); o.fame += chance(.3) ? 1 : 0;
  return { ok: true, msg, gain };
}

// 성 하나에 둘 수 있는 병사 상한
const troopMax = c => 12000 + c.size * 6000;
function draftMax(o, c) { return Math.max(0, Math.min(troopMax(c) - c.troops, 1000 + o.cha * 30 + o.lead * 10, Math.floor(c.pop * 0.08 / 100) * 100, Math.floor(c.gold * 10 / 100) * 100)); }
function cmdDraft(o, c, n) {
  n = Math.floor(n / 100) * 100;
  if (n <= 0) return { ok: false, msg: '징병할 인원이 없습니다' };
  const cost = Math.ceil(n / 10);
  if (c.gold < cost) return { ok: false, msg: '금이 모자랍니다' };
  c.gold -= cost; c.pop -= n;
  c.train = Math.round((c.train * c.troops + 25 * n) / (c.troops + n));
  c.troops += n; c.order = Math.max(0, c.order - Math.ceil(n / 600));
  o.acted = true; o.merit += 8 + Math.round(n / 300);
  return { ok: true, msg: `병사 +${fmt(n)} (금 −${cost})` };
}
function cmdTrain(o, c) {
  if (c.troops <= 0) return { ok: false, msg: '훈련할 병사가 없습니다' };
  if (c.train >= 100) return { ok: false, msg: '훈련이 이미 최고입니다' };
  const gain = Math.round((2 + o.lead / 16 + ri(0, 2) - c.troops / 12000) * (hasSkill(o, '훈련') ? 1.5 : 1));
  c.train = Math.min(100, c.train + Math.max(1, gain));
  o.acted = true; o.merit += 10;
  return { ok: true, msg: `훈련 +${Math.max(1, gain)}` };
}
function cmdSearch(o, c, forPlayer) {
  o.acted = true; o.merit += 8;
  for (const it of hiddenItemsIn(c.id)) {
    if (chance(.18 + o.int / 500 + (G.items[it.id].rumor ? .3 : 0))) {
      const to = forPlayer === 'self' ? o : (c.f >= 0 ? G.officers[G.factions[c.f].ruler] : o);
      giveItem(it.id, to); G.items[it.id].found = true;
      if (c.f >= 0 && to.f === me()?.f || to.id === G.player) logMsg(`${c.name}에서 ${eul(it.name)} 찾아 ${to.name}에게 바쳤습니다`, 'big');
      return { ok: true, msg: `${eul(it.name)} 찾았습니다!`, item: it, to };
    }
  }
  const hidden = roninIn(c.id).filter(r => !r.found);
  for (const r of shuffle(hidden)) {
    if (chance(.35 + o.int / 250 + o.cha / 400)) { r.found = true; return { ok: true, msg: `재야 인물 ${eul(r.name)} 찾았습니다`, found: r }; }
  }
  if (chance(.45)) {
    const g = ri(30, 60 + o.pol * 2);
    if (forPlayer === 'self') G.pgold += g; else c.gold += g;
    return { ok: true, msg: `금 ${g}을 찾았습니다`, gold: g };
  }
  if (chance(.25)) { o.fame += 2; return { ok: true, msg: '백성들에게서 소문을 들었습니다. 명성 +2' }; }
  return { ok: true, msg: '아무것도 찾지 못했습니다' };
}

function hireChance(o, target, f) {
  const ruler = G.officers[G.factions[f].ruler];
  if (target.st === 'ronin') {
    if (G.player !== target.id && (isSworn(target, o) || isSworn(target, ruler))) return .95;
    let p = .28 + o.cha / 260 + (25 - affDist(target, ruler)) / 90 + (hasSkill(o, '인덕') ? .12 : 0);
    if (target.tag && target.fk && G.factions.find(x => x.key === target.fk && x.alive && x.id !== f)) p *= .25;
    if (target.tag) { const lord = G.factions.find(x => x.alive && G.officers[x.ruler].tag === target.tag); if (lord && lord.id !== f) p *= .1; }
    if (G.player === target.id) return 0;
    p += (policyOf(f)?.hire || 0) + rankOf(G.factions[f]) * .03 - (isRebel(f) ? .1 : 0);
    return clamp(p, .04, .9);
  }
  if (target.st !== 'on' || target.f === f || target.f < 0) return 0;
  if (isRuler(target) || G.player === target.id) return 0;
  const tr = G.officers[G.factions[target.f].ruler];
  if (target.tag && target.tag === tr.tag) return 0;
  if (target.loy >= 95) return 0;
  const p = (100 - target.loy) / 100 * (.45 + o.cha / 200) + (25 - affDist(target, ruler)) / 160 - (25 - affDist(target, tr)) / 160 + (hasSkill(o, '인덕') ? .1 : 0);
  return clamp(p, 0, .8);
}
function cmdHire(o, c, target) {
  o.acted = true;
  const p = hireChance(o, target, c.f);
  if (chance(p)) {
    const wasEnemy = target.st === 'on';
    if (wasEnemy) logMsg(`${iga(target.name)} ${facName(target.f)}군을 떠나 ${facName(c.f)}군에 들어갔습니다`);
    joinFaction(target, c.f, c.id);
    o.merit += 40;
    return { ok: true, msg: `${eun(target.name)} 기꺼이 따르겠다고 합니다!`, joined: true };
  }
  o.merit += 5;
  if (target.st === 'on') target.loy = Math.max(0, target.loy - ri(1, 4)); // 흔들림
  return { ok: true, msg: `${eun(target.name)} 거절했습니다`, joined: false };
}
function joinFaction(t, f, cid) {
  if (t.st === 'on' && t.f >= 0) {
    const oc = G.cities[t.city]; if (oc.gov === t.id) oc.gov = -1;
  }
  t.st = 'on'; t.f = f; t.city = cid; t.found = true; t.acted = true; delete t.travel;
  const ruler = G.officers[G.factions[f].ruler];
  t.loy = (t.tag && t.tag === ruler.tag) ? 100 : clamp(78 - affDist(t, ruler) / 2 + ri(0, 12), 55, 96);
  t.merit = Math.max(t.merit, 100);
}
function cmdReward(giver, c, t) {
  if (c.gold < 100) return { ok: false, msg: '금이 모자랍니다 (100 필요)' };
  if (t.loy >= 100) return { ok: false, msg: '이미 충성이 지극합니다' };
  c.gold -= 100; const g = ri(5, 10); t.loy = Math.min(100, t.loy + g);
  return { ok: true, msg: `${t.name} 충성 +${g}` };
}
// ===== 먼 길: 길을 따라 한 칸에 한 달 (바로 옆 성은 그달에 도착) =====
// f가 있으면 그 세력의 성만 지나감, 없으면(재야) 어디든
function routesFrom(cid, f) {
  const prev = { [cid]: -1 }, q = [cid], out = [];
  while (q.length) {
    const a = q.shift();
    for (const b of ADJ[a]) {
      if (prev[b] !== undefined) continue;
      if (f != null && G.cities[b].f !== f) continue;
      prev[b] = a; q.push(b);
      const path = [b]; for (let k = a; k !== -1; k = prev[k]) path.unshift(k);
      out.push({ c: G.cities[b], path, months: path.length - 2 });
    }
  }
  return out;
}
function routeTo(from, to, f) { return routesFrom(from, f).find(r => r.c.id === to) || null; }
function nearestOwn(cid, f) {
  if (G.cities[cid].f === f) return cid;
  const r = routesFrom(cid, null).find(r => r.c.f === f); return r ? r.c.id : -1;
}
function travelLeft(o) { return o.travel ? Math.max(0, o.travel.eta - mIdx()) : 0; }
// 지도에 그릴 현재 위치(길 위 비율)
function travelPos(t) {
  const tot = Math.max(1, t.eta - t.start), done = clamp((mIdx() - t.start + .5) / (tot + 1), 0, 1);
  const segs = t.path.length - 1, u = done * segs, i = Math.min(segs - 1, Math.floor(u)), fr = u - i;
  const A = G.cities[t.path[i]], B = G.cities[t.path[i + 1]];
  return { x: A.x + (B.x - A.x) * fr, y: A.y + (B.y - A.y) * fr };
}
function cmdMove(o, to, path) {
  const from = G.cities[o.city]; if (from.gov === o.id) from.gov = -1;
  const months = path ? path.length - 2 : 0;
  if (months <= 0) { o.city = to; delete o.travel; }
  else o.travel = { to, path, start: mIdx(), eta: mIdx() + months };
  o.acted = true;
  return months;
}
function cmdTransport(o, from, to, gold, food, troops, path) {
  const months = path ? path.length - 2 : 0;
  if (months > 0) {
    gold = clamp(Math.floor(gold), 0, from.gold); food = clamp(Math.floor(food), 0, from.food); troops = clamp(Math.floor(troops / 100) * 100, 0, from.troops);
    from.gold -= gold; from.food -= food; from.troops -= troops;
    (G.convoys = G.convoys || []).push({ f: from.f, from: from.id, to: to.id, gold, food, troops, train: from.train, path, start: mIdx(), eta: mIdx() + months, oid: o.id });
    o.acted = true; o.merit += 6 + months * 3;
    return { ok: true, msg: `${ro(to.name)} 금 ${fmt(gold)}·쌀 ${fmt(food)}·병사 ${fmt(troops)}을 보냈습니다. ${months}달 뒤 도착합니다` };
  }
  gold = clamp(Math.floor(gold), 0, from.gold); food = clamp(Math.floor(food), 0, from.food); troops = clamp(Math.floor(troops / 100) * 100, 0, Math.min(from.troops, Math.max(0, troopMax(to) - to.troops)));
  from.gold -= gold; to.gold += gold; from.food -= food; to.food += food;
  if (troops > 0) { to.train = Math.round((to.train * to.troops + from.train * troops) / (to.troops + troops)); from.troops -= troops; to.troops += troops; }
  o.acted = true; o.merit += 6;
  return { ok: true, msg: `${to.name}에 금 ${fmt(gold)}·쌀 ${fmt(food)}·병사 ${fmt(troops)} 보냄` };
}

// 외교
function dipGift(env, fromF, toF, gold) {
  const c = G.cities.find(x => x.f === fromF && x.id === env.city);
  if (!c || c.gold < gold) return { ok: false, msg: '금이 모자랍니다' };
  c.gold -= gold; const d = Math.round(gold / 25 + env.cha / 15 + ri(0, 4));
  addRel(fromF, toF, d); env.acted = true; env.merit += 15;
  return { ok: true, msg: `${facName(toF)}와의 우호 +${d} (지금 ${getRel(fromF, toF)})` };
}
function allyChance(env, fromF, toF) {
  const r = getRel(fromF, toF);
  if (r < 55) return 0;
  const powA = factionPower(fromF), powB = factionPower(toF);
  let p = (r - 50) / 50 * (.45 + env.cha / 200);
  if (powA < powB * .4) p *= .6; // 너무 약하면 얕봄
  return clamp(p, 0, .9);
}
function dipAlly(env, fromF, toF) {
  env.acted = true;
  if (chance(allyChance(env, fromF, toF))) { makeAlly(fromF, toF); addRel(fromF, toF, 10); env.merit += 60; logMsg(`${facName(fromF)}군과 ${facName(toF)}군이 동맹을 맺었습니다`, 'dip'); return { ok: true, msg: `${facName(toF)}군과 동맹을 맺었습니다!` }; }
  addRel(fromF, toF, -3);
  return { ok: true, msg: `${facName(toF)}군이 동맹을 거절했습니다` };
}
function breakAlly(a, b) { delete G.ally[relKey(a, b)]; addRel(a, b, -40); logMsg(`${facName(a)}군이 ${facName(b)}군과의 동맹을 끊었습니다`, 'dip'); }
function plotChance(env, t) {
  if (t.st !== 'on' || isRuler(t)) return 0;
  const tr = G.officers[G.factions[t.f].ruler];
  if (t.tag && t.tag === tr.tag) return 0;
  return clamp(.3 + (env.int - t.int) / 90, .05, .85);
}
function plotSow(env, t) {
  env.acted = true;
  if (chance(plotChance(env, t))) { const d = ri(6, 14); t.loy = Math.max(0, t.loy - d); env.merit += 25; return { ok: true, msg: `이간 성공 — ${t.name} 충성 −${d} (지금 ${t.loy})` }; }
  return { ok: true, msg: '이간이 들통나 실패했습니다' };
}

function factionPower(f) {
  let p = 0;
  for (const c of G.cities) if (c.f === f) p += c.troops * (.6 + c.train / 250);
  return p;
}
function factionOfficers(f) { return G.officers.filter(o => o.st === 'on' && o.f === f); }

// ===== 죽음·계승·멸망 =====
function killOfficer(o, why) {
  const wasRuler = isRuler(o);
  dropItems(o);
  const c = G.cities[o.city];
  if (c && c.gov === o.id) c.gov = -1;
  const f = o.f;
  o.st = 'dead'; o.f = -1;
  if (why) logMsg(why, 'death');
  if (wasRuler && f >= 0) succession(f, o);
  if (o.id === G.player) onPlayerDeath(o, f, wasRuler);
}
function succession(f, old) {
  const F = G.factions[f];
  const cands = factionOfficers(f);
  if (!cands.length) { destroyFaction(f, `${F.name}군은 이어받을 사람이 없어 무너졌습니다`); return null; }
  cands.sort((a, b) => ((b.tag && b.tag === old.tag) - (a.tag && a.tag === old.tag)) * 1000 + (b.merit / 10 + b.cha + b.lead) - (a.merit / 10 + a.cha + a.lead));
  const heir = HIST() && HEIRS[old.name] ? cands.find(o => o.name === HEIRS[old.name]) : null;
  const n = heir || cands[0];
  F.ruler = n.id; n.loy = 100; F.name = n.name; F.capital = n.city;
  logMsg(`${iga(n.name)} ${old.name}의 뒤를 이어 군주가 되었습니다`, 'big');
  // 충성이 낮은 장수는 흩어지기도
  for (const o of cands) if (o !== n && o.loy < 50 && chance(.4) && o.id !== G.player) { leaveToRonin(o); }
  assignGovs();
  return n;
}
function leaveToRonin(o) {
  const c = G.cities[o.city]; if (c.gov === o.id) c.gov = -1;
  o.st = 'ronin'; o.f = -1; o.found = true; o.loy = 0;
}
function destroyFaction(f, why) {
  const F = G.factions[f]; if (!F.alive) return;
  F.alive = false;
  for (const c of G.cities) if (c.f === f) { c.f = -1; c.gov = -1; c.deleg = false; }
  for (const o of G.officers) if (o.st === 'on' && o.f === f) { o.st = 'ronin'; o.f = -1; o.found = true; }
  for (const k in G.ally) if (k.split(',').map(Number).includes(f)) delete G.ally[k];
  logMsg(why || `${F.name}군이 멸망했습니다`, 'big');
}
function checkFactions() {
  for (const F of G.factions) {
    if (!F.alive) continue;
    if (!G.cities.some(c => c.f === F.id)) {
      const r = G.officers[F.ruler];
      destroyFaction(F.id, `${F.name}군이 마지막 성을 잃고 멸망했습니다`);
      if (r && r.st === 'ronin' && r.id === G.player) UI.queue({ title: '세력 멸망', text: '모든 성을 잃었습니다. 이제 재야의 몸으로 다시 일어서야 합니다.' });
    }
  }
}

// 달이 바뀔 때: 길 위의 장수와 수송대 도착
function monthlyTravel() {
  const now = mIdx(), P = me();
  for (const o of G.officers) {
    if (!o.travel || o.st === 'dead') { if (o.travel && o.st === 'dead') delete o.travel; continue; }
    if (now < o.travel.eta) continue;
    let to = o.travel.to;
    if (o.st === 'on' && G.cities[to].f !== o.f) {
      const alt = nearestOwn(to, o.f);
      if (o.id === G.player || (P && o.f === P.f)) logMsg(`${G.cities[to].name}이(가) 다른 세력의 손에 넘어가 ${o.name}은(는) ${alt >= 0 ? G.cities[alt].name + '(으)로 향했습니다' : '갈 곳을 잃었습니다'}`);
      if (alt >= 0) to = alt;
    }
    o.city = to; delete o.travel;
    if (o.st === 'ronin' && o.id === G.player) for (const x of roninIn(to)) x.found = x.found || chance(.5);
    if (o.id === G.player) logMsg(`${G.cities[to].name}에 도착했습니다`, 'big');
  }
  const keep = [];
  for (const v of G.convoys || []) {
    if (now < v.eta) { keep.push(v); continue; }
    let to = G.cities[v.to];
    if (to.f !== v.f) { const alt = nearestOwn(v.to, v.f); to = alt >= 0 ? G.cities[alt] : null; }
    const mine = P && P.st === 'on' && P.f === v.f;
    if (!to) { if (mine) logMsg(`${G.cities[v.to].name}(으)로 가던 수송대가 갈 곳을 잃고 흩어졌습니다`); continue; }
    to.gold += v.gold; to.food += v.food;
    const room = Math.max(0, troopMax(to) - to.troops), t = Math.min(v.troops, room);
    if (t > 0) { to.train = Math.round((to.train * to.troops + v.train * t) / (to.troops + t)); to.troops += t; }
    if (mine) logMsg(`수송대가 ${to.name}에 도착했습니다 (금 ${fmt(v.gold)}·쌀 ${fmt(v.food)}·병사 ${fmt(t)}${v.troops > t ? ` · 병력 한도로 ${fmt(v.troops - t)}명 흩어짐` : ''})`);
  }
  G.convoys = keep;
}
