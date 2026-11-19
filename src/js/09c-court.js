// ===== 조정과 세상: 천자·칭호·관직·칙명, 세력 정책, 이민족, 재해, 관문, 정사/연의 =====
const YANYI = () => !G || G.yanyi !== false;
const YY = (yanyi, zhengshi) => YANYI() ? yanyi : zhengshi;

// ── 천자(헌제): 천자가 머무는 성을 가진 세력이 천자를 끼고 있음
function empHolder() { if (!G.emp || !G.emp.alive) return -1; return G.cities[G.emp.city].f; }
function setEmpCity(name) { if (G.emp && G.emp.alive) G.emp.city = CITY_BY_NAME[name]; }
function initEmperor(g, year) {
  g.emp = year >= 220 ? { alive: false, city: CITY_BY_NAME['허창'] } : { alive: true, city: CITY_BY_NAME[year < 191 ? '낙양' : year < 196 ? '장안' : '허창'] };
}

// ── 칭호: 0 없음, 1 공, 2 왕, 3 황제
const RANK_NAME = ['', '공', '왕', '황제'];
const NATION_NAMES = ['위', '한', '촉한', '오', '연', '초', '제', '양', '진', '조'];
function rankOf(F) { return F.rank || 0; }
function titleNeed(F, r) {
  const n = citiesOf(F.id).length, need = [0, 6, 10, 15][r];
  const wait = r > 1 && F.rankAt != null ? mIdx() - F.rankAt : 99;
  const emp = empHolder();
  const why = [];
  if (n < need) why.push(`성 ${need}개 이상 (지금 ${n})`);
  if (r > 1 && wait < 12) why.push(`앞 칭호에서 1년이 지나야 함 (${12 - wait}달 남음)`);
  if (r === 3 && G.emp && G.emp.alive && emp !== F.id) why.push('한의 천자가 살아 있음 (천자를 모시면 선양을 받을 수 있음)');
  return why;
}
function setRank(F, r, nation) {
  F.rank = r; F.rankAt = mIdx(); if (nation) F.nation = nation;
  const nm = F.nation || '';
  F.title = r === 3 ? `${nm} 황제` : `${nm}${RANK_NAME[r]}`;
  for (const o of factionOfficers(F.id)) if (!isRuler(o)) o.loy = Math.min(100, o.loy + 5 * r);
  G.officers[F.ruler].fame += 10 * r;
  if (r === 3) {
    if (G.emp && G.emp.alive && empHolder() === F.id) { G.emp.alive = false; logMsg(`한의 천자가 ${F.name}에게 자리를 물려주었습니다. 한 왕조가 끝났습니다`, 'big'); }
    for (const o of G.factions) if (o.alive && o.id !== F.id) addRel(o.id, F.id, -15);
  }
  logMsg(`${F.name}이(가) ${F.title}에 올랐습니다`, 'big');
}
// 역사 사건의 칭호도 단계와 맞춤
function rankFromTitle(t) { return /황제/.test(t) ? 3 : /왕/.test(t) ? 2 : /공/.test(t) ? 1 : 0; }

// ── 관직
const OFFICES = [
  { id: 'gunsa', name: '군사', rank: 0, b: { int: 4 }, desc: '지력 +4' },
  { id: 'pyogi', name: '표기장군', rank: 0, b: { lead: 3, war: 2 }, desc: '통솔 +3 · 무력 +2' },
  { id: 'geogi', name: '거기장군', rank: 0, b: { lead: 2, war: 3 }, desc: '통솔 +2 · 무력 +3' },
  { id: 'jeon', name: '전장군', rank: 0, b: { lead: 2, war: 2 }, desc: '통솔 +2 · 무력 +2' },
  { id: 'hu', name: '후장군', rank: 0, b: { lead: 2, war: 2 }, desc: '통솔 +2 · 무력 +2' },
  { id: 'jwa', name: '좌장군', rank: 0, b: { lead: 2, war: 2 }, desc: '통솔 +2 · 무력 +2' },
  { id: 'u', name: '우장군', rank: 0, b: { lead: 2, war: 2 }, desc: '통솔 +2 · 무력 +2' },
  { id: 'sangseo', name: '상서령', rank: 1, b: { pol: 4 }, desc: '정치 +4' },
  { id: 'daejang', name: '대장군', rank: 1, b: { lead: 5 }, desc: '통솔 +5' },
  { id: 'sado', name: '사도', rank: 2, b: { pol: 3, cha: 3 }, desc: '정치 +3 · 매력 +3' },
  { id: 'seungsang', name: '승상', rank: 2, b: { int: 3, pol: 4 }, desc: '지력 +3 · 정치 +4' },
  { id: 'daesama', name: '대사마', rank: 3, b: { lead: 4, war: 2 }, desc: '통솔 +4 · 무력 +2' },
];
const OFFICE = Object.fromEntries(OFFICES.map(o => [o.id, o]));
const officeOK = (F, of) => rankOf(F) >= of.rank || (of.rank <= 2 && empHolder() === F.id);
function officeOf(o) { return o.office ? OFFICE[o.office] : null; }
function removeOffice(o) {
  if (!o || !o.office) return;
  for (const k in o.offB || {}) o[k] -= o.offB[k];
  const F = G.factions[o.offF]; if (F && F.offices) delete F.offices[o.office];
  o.office = null; o.offB = null; o.offF = null;
}
function appoint(F, offId, o) {
  F.offices = F.offices || {};
  const cur = F.offices[offId]; if (cur != null) removeOffice(G.officers[cur]);
  removeOffice(o);
  const of = OFFICE[offId], add = {};
  for (const k in of.b) { const v = Math.max(0, Math.min(of.b[k], 100 - o[k])); o[k] += v; add[k] = v; }
  o.office = offId; o.offB = add; o.offF = F.id; F.offices[offId] = o.id;
  if (!isRuler(o)) o.loy = Math.min(100, o.loy + 15);
}
function cleanupOffices() {
  for (const o of G.officers) if (o.office && (o.st !== 'on' || o.f !== o.offF || !G.factions[o.offF].alive || isRuler(o))) removeOffice(o);
}
function aiOffices(F) {
  if (pOf(F.id) && isP(G.officers[F.ruler])) return;
  F.offices = F.offices || {};
  const pool = factionOfficers(F.id).filter(o => !isRuler(o) && !o.office && !isP(o));
  for (const of of OFFICES) {
    if (F.offices[of.id] != null || !officeOK(F, of)) continue;
    const k = Object.keys(of.b)[0];
    pool.sort((a, b) => b[k] - a[k]);
    const o = pool.shift(); if (!o) break;
    appoint(F, of.id, o);
  }
}

// ── 칙명: 천자를 낀 세력이 적을 역적으로 몰아붙임
const isRebel = f => !!(G.rebel && G.rebel[f] > mIdx());
function issueEdict(F, t) {
  (G.rebel = G.rebel || {})[t] = mIdx() + 24; F.edictAt = mIdx();
  for (const o of G.factions) if (o.alive && o.id !== t) addRel(o.id, t, -15);
  for (const o of factionOfficers(t)) if (!isRuler(o) && !isP(o)) o.loy = Math.max(0, o.loy - 6);
  if (pOf(F.id)) unlock('edict');
  logMsg(`천자의 칙명: ${G.factions[t].name}군을 역적으로 삼아 천하에 토벌을 명했습니다`, 'big');
}
const edictReady = F => F.edictAt == null || mIdx() - F.edictAt >= 12;

// ── 세력 고유 정책
const POLICY = {
  cc: { name: '둔전제', desc: '병사가 농사를 지어 쌀 수확 +20%', food: 1.2 },
  lb: { name: '인덕', desc: '인재가 모여듦: 등용 확률 +6%', hire: .06 },
  ys: { name: '사세삼공', desc: '4대에 걸친 명문가: 등용 확률 +6%', hire: .06 },
  sj: { name: '강동 수군', desc: '수전에서 공격 +15%, 산월의 침입이 줄어듦', naval: 1.15 },
  md: { name: '서량 철기', desc: '기병 공격 +10%, 강족과 친함', cav: 1.1 },
  dz: { name: '서량 정예', desc: '기병 공격 +10%', cav: 1.1 },
  gz: { name: '백마의종', desc: '기병 공격 +10%', cav: 1.1 },
  zl: { name: '오두미도', desc: '치안이 60 아래로 떨어지지 않음', order: 60 },
  ly: { name: '천부지국', desc: '험한 익주: 성벽 수리 효과 +30%', wall: 1.3 },
};
const policyOf = f => f >= 0 && G.factions[f] ? POLICY[G.factions[f].key] || null : null;

// ── 이민족
const BARBS = [
  { name: '강족', cities: ['무위', '천수', '안정'], friend: 'md' },
  { name: '오환', cities: ['계', '북평', '양평'] },
  { name: '남만', cities: ['건녕'], gone: () => G.ev && G.ev.nanman },
  { name: '산월', cities: ['회계', '오', '건업'], half: 'sj' },
];
async function monthlyBarbarians() {
  G.barb = G.barb || {};
  for (const b of BARBS) {
    if (b.gone && b.gone()) continue;
    if ((G.barb[b.name] || 0) > mIdx()) continue;
    const cs = b.cities.map(cityN).filter(c => c.f >= 0 && !(b.friend && G.factions[c.f].key === b.friend));
    if (!cs.length) continue;
    let p = .015; if (b.half && cs.some(c => G.factions[c.f].key === b.half)) p /= 2;
    if (!chance(p)) continue;
    const c = pick(cs), gov = c.gov >= 0 ? G.officers[c.gov] : null;
    const mine = me() && me().st === 'on' && c.f === me().f && playerControls(c);
    if (mine) {
      const k = await UI.choose({ title: `${b.name}의 침입`, text: `${b.name}이 ${c.name} 경계를 넘어 노략질을 하고 있습니다.\n\n회유하면 금 300을 주고 2년 동안 평화를 얻으며 그들 중 일부가 병사가 됩니다. 토벌하면 병사를 잃지만 명성을 얻고 1년 동안 잠잠해집니다.`, options: [{ k: 'calm', label: `회유한다 (금 300, 지금 ${fmt(c.gold)})`, disabled: c.gold < 300 }, { k: 'war', label: '군사를 내어 토벌한다' }] });
      unlock('barb');
      if (k === 'calm' && c.gold >= 300) { c.gold -= 300; c.troops = Math.min(troopMax(c), c.troops + 1500); G.barb[b.name] = mIdx() + 24; UI.toast(`${b.name}을 회유했습니다. 병사 1,500이 합류했습니다`); continue; }
      c.troops = Math.round(c.troops * .92); G.officers[G.factions[c.f].ruler].fame += 5; G.barb[b.name] = mIdx() + 12; UI.toast(`${b.name}을 토벌했습니다. 명성 +5`); continue;
    }
    if (gov && gov.war >= 80) { gov.fame += 3; c.troops = Math.round(c.troops * .96); G.barb[b.name] = mIdx() + 12; continue; }
    c.troops = Math.round(c.troops * (.8 + rand() * .1)); c.order = Math.max(0, c.order - 10); c.pop = Math.round(c.pop * .97);
    G.barb[b.name] = mIdx() + 6;
  }
}

// ── 재해 (해마다 1월)
const REGIONS = {
  북방: ['업', '남피', '진양', '계', '북평', '평원'], 중원: ['허창', '진류', '복양', '여남', '낙양', '완'], 서주: ['소패', '하비', '북해', '수춘'],
  관중: ['장안', '홍농', '안정', '천수', '무위'], 형주: ['양양', '강릉', '신야', '강하', '장사', '무릉', '영릉', '계양'], 강동: ['건업', '오', '회계', '여강', '시상'], 익주: ['성도', '자동', '강주', '한중', '건녕'],
};
function yearlyDisaster() {
  let kind = null, reg = null;
  if (HIST() && G.year === 217) { kind = 'plague'; reg = '중원'; }
  else if (HIST() && G.year === 209) { kind = 'plague'; reg = '형주'; }
  else if (chance(.28)) { kind = pick(['plague', 'locust', 'locust', 'flood']); reg = pick(Object.keys(REGIONS)); }
  if (!kind) return;
  const cs = REGIONS[reg].map(cityN);
  const nm = { plague: '역병', locust: '메뚜기 떼', flood: '큰물' }[kind];
  for (const c of cs) {
    if (kind === 'plague') { c.troops = Math.round(c.troops * .88); c.pop = Math.round(c.pop * .94); }
    if (kind === 'locust') c.food = Math.round(c.food * .65);
    if (kind === 'flood') { c.agri = Math.round(c.agri * .85); c.wall = Math.max(0, c.wall - 50); }
  }
  if (kind === 'plague' && G.year === 217 && HIST()) for (const n of ['진림']) { const o = byName(n); if (o && o.st !== 'dead' && !isP(o)) killOfficer(o, `${n}이(가) 역병으로 세상을 떠났습니다`); }
  const mineHit = me() && me().st === 'on' && cs.some(c => c.f === me().f);
  logMsg(`${reg}에 ${nm}이(가) 돌았습니다`, mineHit ? 'big' : '');
  if (mineHit) UI.queue({ title: nm, text: `${reg} 지방(${cs.filter(c => c.f === me().f).map(c => c.name).join('·')})에 ${nm}이(가) 휩쓸고 지나갔습니다.\n${{ plague: '병사와 백성이 많이 죽었습니다.', locust: '곳간의 쌀을 갉아먹었습니다.', flood: '논밭과 성벽이 쓸려 갔습니다.' }[kind]}` });
}

// ── 관문: 이 성을 칠 때 전장이 좁은 고갯길이 됨
const PASSES = { 낙양: '호로관', 장안: '동관', 한중: '양평관', 자동: '검각' };

// ── 정사 모드 능력치 (연의에서 부풀려지거나 깎인 인물)
const ZHENGSHI_ADJ = { 관우: { war: -4 }, 장비: { war: -3 }, 조운: { war: -3, lead: 2 }, 제갈량: { lead: -4, int: -2, pol: 2 }, 주유: { lead: 3, int: 2 }, 손견: { war: 3, lead: 2 }, 마초: { war: -2 }, 황충: { war: -3 }, 위연: { lead: 3 }, 방통: { int: -3 }, 화웅: { war: -8 }, 장료: { war: 2, lead: 2 }, 순욱: { pol: 2 }, 노숙: { int: 3, lead: 2 }, 여몽: { int: 2 }, 강유: { int: -3 }, 사마의: { lead: 2 } };
function applyZhengshi(g) {
  for (const o of g.officers) { const a = ZHENGSHI_ADJ[o.name]; if (a) for (const k in a) o[k] = clamp(o[k] + a[k], 1, 100); }
}

// ── 매달 / 해마다
async function monthlyCourt() {
  cleanupOffices();
  // 천자를 손에 넣은 세력이 바뀌면 알림
  const h = empHolder();
  if (G.emp && G.emp.alive && h !== G.empLast) { if (h >= 0 && G.empLast != null) logMsg(`${G.factions[h].name}군이 천자를 손에 넣었습니다`, 'big'); G.empLast = h; }
  // 천자를 끼면 매달 명성이 조금씩
  if (h >= 0) G.officers[G.factions[h].ruler].fame += 1;
  // AI의 칙명
  if (h >= 0 && !pOf(h) && G.month === 3 && edictReady(G.factions[h]) && chance(.5)) {
    const rivals = G.factions.filter(f => f.alive && f.id !== h && facAdj(h, f.id) && !isAlly(h, f.id)).sort((a, b) => citiesOf(b.id).length - citiesOf(a.id).length);
    if (rivals[0]) issueEdict(G.factions[h], rivals[0].id);
  }
  await monthlyBarbarians();
  for (const c of G.cities) { const pol = policyOf(c.f); if (pol && pol.order) c.order = Math.max(c.order, pol.order); }
}
function yearlyCourt() {
  for (const F of G.factions) if (F.alive) aiOffices(F);
  yearlyDisaster();
}
