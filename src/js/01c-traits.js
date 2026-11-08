// ===== 장수 특기와 보물 =====
const SKILL_DEF = {
  무쌍: '일기토에서 더 정확히, 더 세게 친다 (명중 +8%, 피해 +25%).',
  돌격: '기병으로 맞붙어 칠 때 피해 +20%.',
  궁신: '활을 쏠 때 피해 +25%.',
  기습: '전투 첫 사흘 동안 주는 피해 +25%.',
  위풍: '곁에 붙은 적 부대의 사기가 날마다 3씩 떨어진다.',
  훈련: '훈련 효과 +50%.',
  수성: '성곽·본성에서 지킬 때 받는 피해 −20%.',
  수군: '물 위에서 싸울 때 주는 피해 +25%.',
  신산: '모든 계략의 성공 가능성 +12%.',
  화신: '화계 성공 +20%, 불이 하루 더 탄다.',
  귀모: '혼란 성공 +20%, 혼란이 하루 더 간다.',
  인덕: '등용 가능성 +12%. 군주라면 장수들의 충성이 잘 떨어지지 않는다.',
  치정: '개간·상업·치안·성벽 효과 +30%.',
  둔전: '개간 효과 +50%.',
  상재: '상업 효과 +50%.',
  축성: '성벽 공사 효과 +50%.',
};
const SKILL_OF = {
  여포: '무쌍 돌격 위풍', 관우: '무쌍 위풍 수군', 장비: '무쌍 위풍', 조운: '무쌍 돌격', 마초: '무쌍 돌격', 전위: '무쌍', 허저: '무쌍',
  황충: '무쌍 궁신', 하후연: '기습 궁신', 하후돈: '위풍 훈련', 장료: '기습 돌격 위풍', 감녕: '기습 수군', 태사자: '궁신 무쌍', 손책: '돌격 위풍',
  손견: '위풍 돌격', 방덕: '무쌍', 장합: '기습', 서황: '훈련', 조인: '수성 축성', 만총: '수성 축성', 장임: '수성', 심배: '수성', 문빙: '수성 수군',
  공손찬: '돌격 수성', 국의: '궁신', 한당: '궁신 수군', 고순: '훈련', 우금: '훈련', 위연: '기습', 여몽: '기습 수군', 등애: '기습 둔전',
  안량: '무쌍', 문추: '무쌍', 화웅: '무쌍', 마등: '돌격 인덕', 엄안: '궁신 수성',
  제갈량: '신산 화신 치정', 곽가: '신산 귀모', 순욱: '신산 치정', 순유: '신산 귀모', 가후: '신산 귀모', 사마의: '신산 귀모', 방통: '신산 화신',
  법정: '신산', 서서: '신산', 전풍: '신산', 저수: '신산', 진궁: '신산', 주유: '신산 화신 수군', 육손: '신산 화신 수군', 이유: '신산 귀모', 황개: '화신 수군',
  장흠: '수군', 주태: '수군', 채모: '수군', 장윤: '수군', 정보: '수군', 능조: '수군', 황조: '수군',
  유비: '인덕', 조조: '인덕 둔전 위풍', 손권: '인덕 수군', 원소: '인덕', 공융: '인덕', 유표: '인덕 치정',
  장소: '치정', 장굉: '치정', 노숙: '치정 상재', 사섭: '치정', 장로: '치정', 제갈근: '치정', 손소: '치정', 미축: '상재', 진등: '축성 치정',
};
function skillsOf(o) {
  if (o._sk) return o._sk;
  let s = SKILL_OF[o.name] ? SKILL_OF[o.name].split(' ') : [];
  if (!s.length) {
    if (o.war >= 88) s.push('무쌍');
    else if (o.lead >= 85 && o.war >= 80) s.push('돌격');
    if (o.int >= 86) s.push('신산');
    if (o.pol >= 86) s.push('치정');
  }
  Object.defineProperty(o, '_sk', { value: s, enumerable: false, configurable: true });
  return s;
}
const hasSkill = (o, k) => !!o && skillsOf(o).includes(k);

// 보물: holder(처음 가진 인물) 또는 city(숨어 있는 곳)
const ITEMS = [
  { id: 'jeokto', name: '적토마', kind: '명마', desc: '하루에 천 리를 달린다는 붉은 명마. "사람 중에 여포, 말 중에 적토."', bonus: { war: 2 }, move: 2, holder: '여포' },
  { id: 'jeolyeong', name: '절영', kind: '명마', desc: '조조가 아끼던 말. 완성에서 화살을 맞으면서도 주인을 태우고 달렸다.', move: 1, bonus: { lead: 1 }, holder: '조조' },
  { id: 'jeongno', name: '적로', kind: '명마', desc: '주인을 해친다는 흉마였으나, 단계를 뛰어넘어 유비를 구했다.', move: 1, bonus: { cha: 2 }, city: '양양' },
  { id: 'cheongnyong', name: '청룡언월도', kind: '무기', desc: '무게 82근의 큰 칼. 관우가 평생 들었다.', bonus: { war: 3 }, holder: '관우' },
  { id: 'sapmo', name: '장팔사모', kind: '무기', desc: '길이 한 장 여덟 자, 뱀처럼 굽은 날의 창.', bonus: { war: 3 }, holder: '장비' },
  { id: 'banghwa', name: '방천화극', kind: '무기', desc: '여포의 화극. 원문 밖에서 화살로 이것을 맞혀 싸움을 말렸다.', bonus: { war: 3 }, holder: '여포' },
  { id: 'uicheon', name: '의천검', kind: '무기', desc: '조조가 몸에 지니던 보검.', bonus: { war: 1, cha: 2 }, holder: '조조' },
  { id: 'cheonggang', name: '청강검', kind: '무기', desc: '쇠를 진흙처럼 벤다는 보검. 장판에서 조운이 하후은에게서 빼앗았다.', bonus: { war: 3 }, city: '허창' },
  { id: 'ssanggo', name: '쌍고검', kind: '무기', desc: '유비가 쓰던 한 쌍의 칼.', bonus: { war: 2, cha: 1 }, holder: '유비' },
  { id: 'gojeong', name: '고정도', kind: '무기', desc: '손견이 쓰던 큰 칼. 손씨 집안에 대대로 전해졌다.', bonus: { war: 2 }, holder: '손견' },
  { id: 'chilseong', name: '칠성보도', kind: '무기', desc: '왕윤의 보도. 연의에서 조조가 이것으로 동탁을 찌르려 했다.', bonus: { war: 1, int: 1 }, holder: '왕윤' },
  { id: 'sonja', name: '손자병법', kind: '병법서', desc: '오의 손무가 지은 병법의 으뜸.', bonus: { lead: 5 }, city: '오' },
  { id: 'yukdo', name: '육도', kind: '병법서', desc: '태공망이 지었다는 병법서.', bonus: { lead: 3, int: 2 }, city: '낙양' },
  { id: 'maengdeok', name: '맹덕신서', kind: '병법서', desc: '조조가 여러 병법서를 풀이해 엮은 책.', bonus: { lead: 2, int: 3 }, holder: '조조' },
  { id: 'taepyeong', name: '태평요술서', kind: '비서', desc: '황건적 장각이 남화노선에게서 받았다는 도술서.', bonus: { int: 5 }, city: '진양' },
  { id: 'chunchu', name: '춘추좌씨전', kind: '경전', desc: '관우가 늘 곁에 두고 읽던 역사서.', bonus: { pol: 3, cha: 2 }, city: '북해' },
  { id: 'cheongnang', name: '청낭서', kind: '의서', desc: '명의 화타의 의술을 담은 책. 지닌 이의 수명이 늘어난다.', life: 6, city: '소패' },
  { id: 'baegu', name: '백우선', kind: '보물', desc: '제갈량이 늘 손에 든 흰 깃털 부채.', bonus: { int: 2, lead: 1 }, holder: '제갈량' },
  { id: 'okse', name: '전국옥새', kind: '보물', desc: '진시황 때부터 전해진 황제의 도장. 지닌 이에게 천명이 있다고들 믿었다.', bonus: { cha: 6 } },
];
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
function setupItems(g) {
  g.items = {};
  for (const it of ITEMS) {
    const h = it.holder ? g.officers.find(o => o.name === it.holder) : null;
    g.items[it.id] = { holder: -1, city: it.city ? CITY_BY_NAME[it.city] : -1, found: false };
    if (h && h.st !== 'dead') giveItemRaw(g, it.id, h);
  }
}
function giveItemRaw(g, id, o) {
  const it = ITEM[id], st = g.items[id];
  if (st.holder >= 0) takeItemRaw(g, id);
  st.holder = o.id; st.city = -1; st.found = true;
  o.items = o.items || []; if (!o.items.includes(id)) o.items.push(id);
  for (const k in it.bonus || {}) o[k] = Math.min(100, o[k] + it.bonus[k]);
  if (it.life && !(o.lifeBy || []).includes(id)) { o.die += it.life; o.lifeBy = [...(o.lifeBy || []), id]; }
}
function takeItemRaw(g, id) {
  const it = ITEM[id], st = g.items[id];
  if (st.holder < 0) return;
  const o = g.officers[st.holder];
  o.items = (o.items || []).filter(x => x !== id);
  for (const k in it.bonus || {}) o[k] = Math.max(1, o[k] - it.bonus[k]);
  st.holder = -1;
}
const giveItem = (id, o) => giveItemRaw(G, id, o);
// 보물을 잃음: 그 성 어딘가에 남음 (탐색으로 다시 찾을 수 있음)
function dropItems(o) { for (const id of [...(o.items || [])]) { takeItemRaw(G, id); G.items[id].city = o.city; G.items[id].found = false; } }
function itemMove(o) { return (o.items || []).reduce((a, id) => a + (ITEM[id].move || 0), 0); }
function itemsOfFaction(f) { return ITEMS.filter(it => { const h = G.items?.[it.id]?.holder; return h >= 0 && G.officers[h].st === 'on' && G.officers[h].f === f; }); }
function hiddenItemsIn(cid) { return ITEMS.filter(it => G.items?.[it.id] && G.items[it.id].holder < 0 && G.items[it.id].city === cid); }
