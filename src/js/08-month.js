// ===== 한 달 진행 =====
let BUSY = false;
async function endMonth() {
  if (BUSY || G.over) return;
  BUSY = true; UI.busy(true);
  try {
    // 1) AI 내정
    for (const c of G.cities) if (c.f >= 0 && !playerControls(c)) aiCityTurn(c);
    // 2) AI 외교·물자
    for (const F of G.factions) if (F.alive && !(isRuler(me()) && me().f === F.id)) { aiDiplomacy(F); aiLogistics(F); }
    if (isRuler(me())) { for (const c of G.cities) if (c.f === me().f && c.deleg) aiCityTurn(c); aiLogisticsDeleg(); }
    // 3) 출진
    let plans = [];
    for (const F of shuffle(G.factions.filter(f => f.alive))) {
      if (isRuler(me()) && me().f === F.id) { plans.push(...aiPlanAttacks(F).filter(p => p.from.deleg)); continue; }
      plans.push(...aiPlanAttacks(F));
    }
    for (const p of plans) {
      if (p.from.f < 0 || G.officers[p.army[0].oid].city !== p.from.id) continue; // 상황이 바뀜
      if (p.to.f === p.from.f || isAlly(p.from.f, p.to.f)) continue;
      p.army = p.army.filter(u => { const o = G.officers[u.oid]; return o.st === 'on' && o.f === p.from.f && o.city === p.from.id; });
      if (!p.army.length || p.from.troops < p.army.reduce((a, u) => a + u.troops, 0)) continue;
      G.factions[p.from.f].idle = 0;
      await runWar(p.from, p.to, p.army, p.food);
      if (G.over) return;
    }
    for (const F of G.factions) if (F.alive) F.idle = (F.idle || 0) + 1;
    for (const k in G.ally) if (G.ally[k] !== true && G.ally[k] <= mIdx()) { const [a, b] = k.split(',').map(Number); delete G.ally[k]; logMsg(`${facName(a)}군과 ${facName(b)}군의 동맹 기한이 끝났습니다`, 'dip'); }
    checkFactions();
    // 4) 달 넘김
    monthlyEconomy();
    await monthlyEvents();
    G.month++;
    if (G.month > 12) { G.month = 1; G.year++; await yearlyEvents(); }
    await runEvents();
    for (const o of G.officers) o.acted = false;
    G.ap = 3;
    assignGovs();
    aiOfficersDrift();
    await afterMonthChecks();
    if (!G.over) saveGame('auto');
    SFX.play('gong');
  } catch (e) { console.error(e); UI.toast('오류: ' + e.message); }
  finally { BUSY = false; UI.busy(false); UI.refresh(); }
}
function aiLogisticsDeleg() {
  const F = G.factions[me().f];
  // 위임한 성만: playerControls가 false인 성만 움직이므로 그대로 호출
  aiLogistics(F);
}

// 전쟁 하나를 처리 (플레이어가 끼면 직접 지휘)
async function runWar(from, to, army, food) {
  const defF = to.f;
  const B = launchAttack(from, to, army, food);
  if (!B) { UI.refresh(); return; }
  const P = me();
  const pIn = P && P.st === 'on' && B.units.some(u => u.oid === P.id);
  const pDefends = P && P.st === 'on' && P.f === defF && defF >= 0 && (playerControls(to) || (P.city === to.id));
  const pAttacks = P && P.st === 'on' && P.f === B.attF && (playerControls(from) || pIn);
  if (pIn || pDefends || pAttacks) {
    B.playerSide = (P.f === B.attF) ? 0 : 1;
    const full = (B.playerSide === 0 && playerControls(from) && (role() === 'ruler' || role() === 'gov')) || (B.playerSide === 1 && playerControls(to));
    B.ctrl = u => u.side === B.playerSide && (full || u.oid === P.id);
    if (!full && !pIn && B.playerSide === 1) { // 지켜보기만
      B.ctrl = () => false;
    }
    await UI.alert({ title: B.playerSide === 0 ? '출진' : '적의 침공!', text: B.playerSide === 0 ? `${facName(B.attF)}군 ${fmt(B.units.filter(u => u.side === 0).reduce((a, u) => a + u.troops, 0))}명이 ${eul(to.name)} 공격합니다.${!full ? '\n당신은 자기 부대만 지휘합니다.' : ''}` : `${facName(B.attF)}군이 ${eul(to.name)} 공격해 왔습니다!${!full && pIn ? '\n당신은 자기 부대만 지휘합니다.' : ''}${!pIn && !full ? '\n싸움을 지켜봅니다.' : ''}` });
    await BattleUI.run(B);
  } else {
    runBattleHeadless(B);
  }
  applyBattle(B);
  await resolveCaptives(B);
  if (P && B.playerSide != null) {
    const won = B.result.win === B.playerSide;
    if (won) SFX.play('win'); else SFX.play('lose');
  }
  if (P && (pIn || pDefends || pAttacks)) {
    await UI.alert({ title: B.result.win === B.playerSide ? '승리' : '패배', text: `${to.name} 전투 — ${B.result.why}.` });
  }
  checkFactions();
}

function monthlyEconomy() {
  for (const c of G.cities) {
    if (c.f >= 0) {
      const pf = me() && me().st === 'on' ? me().f : -2;
      const inc = c.f === pf ? DIFF().pInc : DIFF().aiInc;
      c.gold += Math.round((c.comm / 4 + c.pop / 25000) * inc);
      c.food -= Math.round(c.troops * .03);
      if (G.month === 7) c.food += Math.round(c.agri * 22 * (.55 + c.order / 220) * inc);
      if (c.troops > troopMax(c)) { const loss = Math.round((c.troops - troopMax(c)) * .3); c.troops -= loss; c.pop += loss; }
      if (c.food < 0) { const loss = Math.round(c.troops * .25); c.troops -= loss; c.food = 0; if (c.f === me()?.f) logMsg(`${c.name}에 군량이 떨어져 병사 ${fmt(loss)}명이 달아났습니다`, 'bad'); }
      if (c.gold > 30000) c.gold = 30000;
    } else {
      c.gold += 20; if (G.month === 7) c.food += Math.round(c.agri * 8);
    }
    c.pop = Math.round(c.pop * (1 + (c.order - 45) / 6000));
    if (chance(.3)) c.order = clamp(c.order + (c.order > 60 ? -1 : 0) + (c.troops > 2000 ? 0 : -1), 0, 100);
    c.troops = Math.max(0, c.troops);
  }
  // 충성 흐름
  for (const o of G.officers) {
    if (o.st !== 'on' || isRuler(o) || o.id === G.player) continue;
    const r = G.officers[G.factions[o.f].ruler];
    if (o.tag && o.tag === r.tag) { o.loy = 100; continue; }
    const drift = (r.cha - 65) / 40 - affDist(o, r) / 40;
    if (chance(.4)) o.loy = clamp(Math.round(o.loy + drift + (chance(.5) ? 0 : -1)), 0, 100);
  }
  // 플레이어 봉록
  const P = me();
  if (P && P.st === 'on') G.pgold += isRuler(P) ? 0 : 20 + Math.floor(P.merit / 100);
}

async function monthlyEvents() {
  // 동맹 제의
  const offers = G.pendingOffers || []; G.pendingOffers = [];
  for (const of of offers) {
    if (!isRuler(me())) break;
    const F = G.factions[of.from]; if (!F.alive || isAlly(F.id, me().f)) continue;
    const ch = await UI.choose({ title: '동맹 제의', portrait: G.officers[F.ruler], text: `${F.name}군의 사자가 왔습니다. "우리 두 나라가 3년 동안 손을 잡는 것이 어떻겠습니까?"`, options: [{ k: 'y', label: '동맹을 맺는다' }, { k: 'n', label: '거절한다' }] });
    if (ch === 'y') { makeAlly(F.id, me().f); logMsg(`${F.name}군과 동맹을 맺었습니다`, 'dip'); }
    else addRel(F.id, me().f, -8);
  }
  // 태수 임명 알림
  const P = me();
  if (P && P.st === 'on' && !isRuler(P)) {
    const c = G.cities[P.city];
    if (c.gov !== P.id) {
      const gov = c.gov >= 0 ? G.officers[c.gov] : null;
      if (P.merit >= 700 && (!gov || (!isRuler(gov) && govScore(P) > govScore(gov) * .95)) && chance(.5)) {
        c.gov = P.id;
        await UI.alert({ title: '태수 임명', portrait: G.officers[G.factions[P.f].ruler], text: `그간의 공을 인정받아 ${c.name} 태수로 임명되었습니다.\n이제 이 성의 내정과 군사를 맡습니다.` });
        logMsg(`${eun(P.name)} ${c.name} 태수가 되었습니다`, 'big');
      }
    }
  }
}

async function yearlyEvents() {
  // 수명
  for (const o of G.officers) {
    if ((o.st === 'on' || o.st === 'ronin') && G.year >= o.die && chance(.65)) {
      const notable = o.id === G.player || isRuler(o) || (me() && o.f === me().f && o.f >= 0);
      killOfficer(o, notable ? `${eun(o.name)} 병으로 세상을 떠났습니다 (향년 ${age(o)}세)` : null);
    }
  }
  // 새 인물 등장
  for (const o of G.officers) {
    if (o.st !== 'unborn' || G.year - o.born < 16) continue;
    const F = o.fk ? G.factions.find(f => f.key === o.fk && f.alive) : null;
    if (F) { o.st = 'on'; o.f = -1; joinFaction(o, F.id, G.officers[F.ruler].city); logMsg(`${eun(o.name)} 자라서 ${F.name}군에 들어왔습니다`); }
    else { o.st = 'ronin'; o.f = -1; o.found = false; }
  }
  checkFactions();
  assignGovs();
}

async function afterMonthChecks() {
  const P = me();
  if (!P || P.st === 'dead') return;
  // 통일
  const alive = G.factions.filter(f => f.alive && G.cities.some(c => c.f === f.id));
  const owned = G.cities.filter(c => c.f >= 0);
  if (alive.length === 1 && owned.length === G.cities.length) {
    const F = alive[0];
    G.over = true;
    const mine = P.st === 'on' && P.f === F.id;
    await UI.alert({ title: mine ? '천하 통일!' : '천하가 정해지다', portrait: G.officers[F.ruler], text: mine ? `${G.year}년 ${G.month}월, ${F.name}군이 천하를 하나로 모았습니다.\n${P.name}의 이름은 길이 전해질 것입니다.` : `${F.name}군이 천하를 통일했습니다.` });
    UI.gameOver(mine);
  }
}

// 플레이어가 죽었을 때
function onPlayerDeath(o, f, wasRuler) {
  if (wasRuler && f >= 0 && G.factions[f].alive) {
    const n = G.officers[G.factions[f].ruler];
    if (n && n.st === 'on') {
      G.player = n.id;
      UI.queue({ title: '대를 잇다', portrait: n, text: `${eun(o.name)} 세상을 떠났습니다. 이제 ${iga(n.name)} 뜻을 이어 세력을 이끕니다.` });
      return;
    }
  }
  UI.queue({ title: '영웅의 죽음', portrait: o, text: `${eun(o.name)} 세상을 떠났습니다.\n다른 인물로 이어서 할 수 있습니다.`, after: () => UI.pickSuccessor() });
}
