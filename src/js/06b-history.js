// ===== 역사 흐름 장치 (설정에서 '역사를 따라'일 때) =====
// 1) 세력권: 세력마다 역사에서 다투던 지역. 그 밖으로는 초반에 잘 나가지 않음
// 2) 숙원(focus): 사건이 정해 주는 '이 세력을 쳐라'. 세력권 제한을 풀고 공격 문턱을 낮춤
// 3) 후계자: 역사 속 후계자가 살아 있으면 그가 뒤를 이음
// 4) 천하의 견제: 한 세력이 너무 커지면 이웃이 연합함
// 5) 역사 속 몰년: 사건으로 죽는 인물은 사건이 먼저 오도록 미뤄 둠
const HIST = () => !G || G.hist !== false;

const SPHERES = Object.fromEntries(Object.entries({
  dz: '장안 홍농 낙양 안정',
  md: '무위 천수 안정 장안 한중',
  ly: '성도 자동 강주 건녕 한중',
  hf: '업 진양 남피',
  ys: '업 남피 진양 평원 계 북평 복양 북해',
  gz: '계 북평 평원 남피 양평',
  gd: '양평 북평',
  lb: '평원 북해 소패 하비 여남 신야',
  kr: '북해 평원',
  cc: '진류 복양 허창 여남 소패 하비 완 낙양',
  tq: '하비 소패 북해 수춘',
  ysh: '완 여남 수춘 여강 신야 허창',
  lbi: '양양 강릉 강하 장사 무릉 영릉 계양 신야',
  sj: '장사 계양 영릉 무릉 강하 시상 여강 건업 오 회계 남해',
  ...SCEN_EXTRA_SPHERES,
}).map(([k, v]) => [k, new Set(v.split(' '))]));

// 역사 속 후계자
const HEIRS = { 유언: '유장', 손견: '손책', 손책: '손권', 원소: '원상', 조조: '조비', 마등: '마초', 공손도: '공손강', 공손찬: '공손속', 동탁: '이각', 유표: '채모', 유비: '유선', 조비: '조예', 손권: '손휴', 손휴: '손호', 사마의: '사마사', 사마사: '사마소', 사마소: '사마염' };
// 사건으로 죽는 인물: 자연사를 이 해까지 미룸
const EVENT_DEATH = { 동탁: 194, 손견: 194, 도겸: 196, 왕윤: 194, 손책: 202, 한복: 193, 하후연: 220, 관우: 220, 관평: 220, 방덕: 220, 장비: 222, 마속: 229, 위연: 235, 종회: 265 };

const SJ_LATE = new Set(['장사', '계양', '영릉', '무릉', '강하', '남해']); // 손씨가 형주 남부로 나아간 것은 적벽 뒤
// 삼국 정립 뒤(215~)의 세력권: 위는 북쪽, 촉은 익주(+북벌 길), 오는 강남
const NORTH = '허창 진류 복양 여남 소패 하비 낙양 홍농 완 수춘 장안 업 남피 진양 계 북평 평원 북해 신야 양양 무위 천수 안정 양평';
const LATE_SPH = {
  cc: y => new Set((NORTH + ' 한중 강릉 여강' + (y >= 262 ? ' 자동 성도 강주 건녕' : '') + (y >= 279 ? ' 건업 오 회계 시상 강하 장사 계양 남해 무릉 영릉' : '')).split(' ')),
  lb: y => new Set(('성도 자동 강주 건녕 한중' + (y < 220 ? ' 강릉 무릉 영릉 장사 양양' : ' 천수 안정 무위 장안')).split(' ')),
  sj: y => new Set('건업 오 회계 여강 시상 강하 장사 계양 남해 강릉 무릉 영릉 수춘'.split(' ')),
};
function inSphere(F, t) { if (G.year >= 215 && LATE_SPH[F.key] && HIST()) return LATE_SPH[F.key](G.year).has(t.name); const sp = SPHERES[F.key]; if (F.key === 'sj' && G.year < 209 && SJ_LATE.has(t.name)) return false; return !sp || sp.has(t.name); }
function sphereLoose(F) {
  if (F && F.key === 'dz' && !G.ev.chain && !G.ev.dong_death) return 9; // 동탁은 살아 있는 동안 관중을 지킴
  return G.year < 192 ? 9 : G.year < 196 ? .8 : G.year < 202 ? .4 : G.year < 208 ? .15 : G.year < 215 ? 0 : G.year < 280 ? .35 : 0;
}

// 역사 속 세력 크기: 그해까지 이 정도 성을 넘으면 공격을 망설임
const HIST_CAP = { sj: [[197, 5], [203, 7], [208, 8], [215, 11], [279, 13]], cc: [[196, 5], [199, 9], [203, 14], [208, 22], [262, 26], [279, 31]], lb: [[213, 6], [221, 10], [262, 6]], ys: [[199, 9]], md: [[210, 6]], ly: [[214, 5]], lbi: [[208, 9]], dz: [[200, 5]], zl: [[214, 2]] };
function capPenalty(F) {
  const tb = HIST_CAP[F.key]; if (!tb) return 0;
  const row = tb.find(([y]) => G.year <= y); if (!row) return 0;
  const n = G.cities.filter(c => c.f === F.id).length;
  return n >= row[1] ? .6 + (n - row[1]) * .35 : 0;
}

// 숙원
function addFocus(f, t, months, why) {
  if (f < 0 || t < 0 || f === t) return;
  G.focus = (G.focus || []).filter(x => !(x.f === f && x.t === t));
  G.focus.push({ f, t, until: mIdx() + months });
  if (why) logMsg(why, 'war');
}
function hasFocus(f, t) { return t >= 0 && (G.focus || []).some(x => x.f === f && x.t === t && x.until > mIdx() && G.factions[t]?.alive); }
function focusTargets(f) { return (G.focus || []).filter(x => x.f === f && x.until > mIdx() && G.factions[x.t]?.alive).map(x => x.t); }

// 공격 문턱에 더할 값 (양수면 덜 공격)
function histNeed(F, t) {
  if (!HIST()) return 0;
  if (t.f >= 0 && hasFocus(F.id, t.f)) return -.3;
  return (inSphere(F, t) ? 0 : sphereLoose(F)) + capPenalty(F);
}
// 빈 땅을 차지해도 되는가 (초반엔 자기 지역만)
function histEmptyOK(F, t) { return !HIST() || inSphere(F, t) || G.year >= 193; }
// 병력 모을 목표 고르기: 점수(낮을수록 좋음)에 더할 값
function histTargetBias(F, t) {
  if (!HIST()) return 0;
  if (t.f >= 0 && hasFocus(F.id, t.f)) return -12000;
  return inSphere(F, t) ? -2000 : Math.min(3, sphereLoose(F)) * 20000;
}

function makeAllyFor(a, b, months) { if (a < 0 || b < 0 || a === b) return; G.ally[relKey(a, b)] = mIdx() + months; }

// 천하의 견제: 해마다 1월에 확인
async function checkHegemon() {
  if (!HIST() || G.year >= 206) return;
  const total = G.cities.length, pf = me() && me().st === 'on' ? me().f : -2;
  G.heg = G.heg || {};
  for (const F of G.factions) {
    if (!F.alive || F.id === pf) continue;
    const n = citiesOf(F.id).length;
    if (n < total * .3 || (G.heg[F.id] && mIdx() - G.heg[F.id] < 48)) continue;
    G.heg[F.id] = mIdx();
    const nb = new Set(); citiesOf(F.id).forEach(c => ADJ[c.id].forEach(i => { const f = G.cities[i].f; if (f >= 0 && f !== F.id) nb.add(f); }));
    const members = [...nb].filter(f => G.factions[f].alive);
    if (members.length < 2 && !members.includes(pf)) continue;
    const ai = members.filter(f => f !== pf);
    for (const a of ai) { for (const b of ai) if (a < b) makeAllyFor(a, b, 24); addFocus(a, F.id, 24); if (isAlly(a, F.id)) delete G.ally[relKey(a, F.id)]; addRel(a, F.id, -20); }
    const lines = [[null, `${F.name}군이 천하의 ${Math.round(n / total * 100)}%를 손에 넣자, 이웃 제후들이 두려움에 떨기 시작했다.`],
      [null, `${ai.map(f => G.factions[f].name).join('·')}의 사자들이 오가며 ${F.name}군을 함께 치기로 맹세한다.`]];
    let ch = 'no';
    if (members.includes(pf) && isRuler(me())) ch = await scene({ title: `반${F.name} 연합`, involved: true, lines: [...lines, [null, '우리에게도 연합에 들어오라는 사자가 왔다.']], options: [{ k: 'join', label: '연합에 들어간다 (2년 동맹)' }, { k: 'no', label: '들어가지 않는다' }] });
    else await scene({ title: `반${F.name} 연합`, involved: members.includes(pf), lines });
    if (ch === 'join') for (const a of ai) makeAllyFor(a, pf, 24);
    logMsg(`반${F.name} 연합이 맺어졌습니다 (${ai.map(f => G.factions[f].name).join('·')})`, 'big');
  }
}
