// ===== 시나리오 =====
// factions: [키, 군주, 색, '성 …', '장수 …(군주 포함)', 병력 배율]
// dead: 몰년과 상관없이 이미 죽은 인물, ronin: '이름@도시', done: 이미 지나간 사건, items: 보물 주인
const SCENARIOS = {
  190: { year: 190, month: 1, title: '190년 · 반동탁 연합', desc: '동탁이 낙양에서 천자를 끼고 폭정을 일삼는다. 각지의 제후들이 들고일어나는 난세의 시작.' },
  195: {
    year: 195, month: 1, title: '195년 · 군웅할거', desc: '동탁은 죽고 천하는 갈가리 찢겼다. 조조와 여포는 연주를 두고 다투고, 유비는 서주를 얻었으며, 손책은 강동으로 건너간다.',
    factions: [
      ['dz', '이각', '#6b4a8a', '장안 홍농 안정', '이각 곽사 장제 가후 단외 장수 양봉 서황', 1.1],
      ['md', '마등', '#b08a3e', '무위 천수', '마등 한수 마초 방덕 성공영 염행', 1.1],
      ['ly', '유장', '#3f7f6e', '성도 자동 강주 건녕', '유장 장임 엄안 황권 장송 오의 이엄 냉포 법정', 1.05],
      ['zl', '장로', '#d2b04c', '한중', '장로', .9],
      ['ys', '원소', '#c9a227', '업 남피 진양', '원소 저수 심배 장합 진림 안량 문추 전풍 봉기 허유 곽도 순심 고람 원담 원상', 1.35],
      ['gz', '공손찬', '#e8e8e0', '계 북평 평원', '공손찬 전해 관정 공손속', 1.1],
      ['gd', '공손도', '#7a6a5a', '양평', '공손도 공손강 양의', 1],
      ['cc', '조조', '#2f5fa8', '진류 허창', '조조 하후돈 하후연 조인 조홍 악진 이전 순욱 순유 정욱 우금 전위 허저 만총', 1.15],
      ['lp', '여포', '#b2577a', '복양', '여포 진궁 장료 고순 장패', 1.25],
      ['lb', '유비', '#3d8c4a', '하비 소패', '유비 관우 장비 간옹 관평 미축 미방 손건 진등 진규 조표', .95],
      ['kr', '공융', '#9a6a8a', '북해', '공융 손소 무안국', .8],
      ['ysh', '원술', '#c4762e', '수춘 여남 완 여강', '원술 기령 장훈 교유 염상 뇌박 진란', 1.25],
      ['sj', '손책', '#c0392b', '건업', '손책 정보 황개 한당 손분 오경 손정 주유 장소 장굉 주태 장흠 여몽', 1.1],
      ['wl', '왕랑', '#7f8fd6', '회계', '왕랑', .8],
      ['ybh', '엄백호', '#8fbf5a', '오', '엄백호', .8],
      ['lbi', '유표', '#6e9a3a', '양양 강릉 강하 장사 무릉 영릉 계양', '유표 괴량 괴월 채모 황조 문빙 장윤 황충 이적', 1.05],
      ['sx', '사섭', '#4fb3a3', '남해', '사섭', .8],
    ],
    dead: '번조 화웅 서영 우보 동민 이유 경무 반봉 국의 엄강 조무 왕윤 동탁 손견 한복 도겸',
    ronin: '조운@계 태사자@시상 곽가@허창 노숙@수춘 화흠@여강 장연@진양 감녕@강주 위연@양양 서서@신야 방통@양양 마량@양양 사마의@낙양 육손@오 제갈근@오 능조@건업',
    done: 'peach qingzhou coalition luoyang_fire jade_seal sunjian_death jizhou chain dong_death cao_song xuzhou sun_zhou',
    items: { okse: '원술' },
    focus: [['cc', 'lp', 24], ['lp', 'cc', 24], ['ys', 'gz', 24], ['gz', 'ys', 24], ['sj', 'wl', 18], ['sj', 'ybh', 18]],
    ally: [['ys', 'cc', 24], ['sj', 'ysh', 12]],
  },
  200: {
    year: 200, month: 1, title: '200년 · 관도대전', desc: '하북 네 주를 얻은 원소와 천자를 맞아들인 조조. 천하를 가를 결전이 관도에서 벌어지려 한다. 유비는 서주에서 조조에게 반기를 들었다.',
    factions: [
      ['cc', '조조', '#2f5fa8', '허창 진류 복양 여남 낙양 홍농 완 수춘 장안', '조조 하후돈 하후연 조인 조홍 악진 이전 순욱 순유 곽가 정욱 우금 허저 서황 만총 장료 장패 가후 장수 진등 진규 단외 공융 화흠 왕랑', 1.2],
      ['lb', '유비', '#3d8c4a', '소패 하비', '유비 관우 장비 조운 간옹 관평 미축 미방 손건', 1],
      ['ys', '원소', '#c9a227', '업 남피 진양 계 북평 평원 북해', '원소 저수 심배 장합 진림 안량 문추 전풍 봉기 허유 곽도 순심 고람 원담 원상', 1.4],
      ['gd', '공손도', '#7a6a5a', '양평', '공손도 공손강 양의', 1],
      ['sj', '손책', '#c0392b', '건업 오 회계 여강 시상', '손책 손권 주유 정보 황개 한당 손분 손정 오경 장소 장굉 주태 장흠 여몽 태사자 노숙 제갈근 능조', 1.1],
      ['lbi', '유표', '#6e9a3a', '양양 강릉 강하 장사 무릉 영릉 계양 신야', '유표 괴량 괴월 채모 황조 문빙 장윤 황충 이적 감녕', 1.05],
      ['ly', '유장', '#3f7f6e', '성도 자동 강주 건녕', '유장 장임 엄안 황권 장송 오의 이엄 냉포 법정', 1.05],
      ['zl', '장로', '#d2b04c', '한중', '장로', .95],
      ['md', '마등', '#b08a3e', '무위 천수 안정', '마등 한수 마초 방덕 마대 성공영 염행', 1.1],
      ['sx', '사섭', '#4fb3a3', '남해', '사섭', .85],
    ],
    dead: '번조 화웅 서영 우보 동민 이유 경무 반봉 국의 엄강 조무 왕윤 동탁 손견 한복 도겸 이각 곽사 장제 양봉 여포 진궁 고순 원술 기령 교유 공손찬 관정 공손속 전해 전위 엄백호 조표',
    ronin: '제갈량@신야 서서@신야 방통@양양 마량@양양 마속@양양 위연@양양 사마의@낙양 육손@오 장연@진양 전예@계',
    done: 'peach qingzhou coalition luoyang_fire jade_seal sunjian_death jizhou chain dong_death cao_song xuzhou sun_zhou li_guo emperor yuan_emperor xiapi yijing',
    items: { jeokto: '조조', gojeong: '손책', chilseong: null },
    focus: [['cc', 'lb', 12]],
    ally: [['ys', 'lb', 24]],
  },
  208: {
    year: 208, month: 9, title: '208년 · 적벽대전', desc: '북방을 평정한 조조가 형주를 삼키고 백만 대군으로 장강을 내려온다. 강하로 쫓긴 유비와 강동의 손권은 손을 잡을 것인가.',
    factions: [
      ['cc', '조조', '#2f5fa8', '허창 진류 복양 여남 소패 하비 낙양 홍농 완 수춘 장안 업 남피 진양 계 북평 평원 북해 신야 양양 강릉', '조조 하후돈 하후연 조인 조홍 조비 악진 이전 순욱 순유 정욱 우금 허저 서황 만총 장료 장패 가후 장합 고람 진림 문빙 채모 장윤 괴월 사마의 서서 전예 화흠 왕랑 장연 마등', 1.25],
      ['sj', '손권', '#c0392b', '건업 오 회계 여강 시상', '손권 주유 정보 황개 한당 손분 손정 장소 장굉 주태 장흠 여몽 노숙 제갈근 감녕 육손', 1.15],
      ['lb', '유비', '#3d8c4a', '강하', '유비 관우 장비 조운 제갈량 간옹 미축 미방 손건 관평 이적', 1.1],
      ['ly', '유장', '#3f7f6e', '성도 자동 강주 건녕', '유장 장임 엄안 황권 장송 오의 이엄 냉포 법정', 1.05],
      ['zl', '장로', '#d2b04c', '한중', '장로', .95],
      ['md', '마초', '#b08a3e', '무위 천수 안정', '마초 한수 방덕 마대 성공영 염행', 1.1],
      ['gd', '공손강', '#7a6a5a', '양평', '공손강 양의', 1],
      ['sx', '사섭', '#4fb3a3', '남해', '사섭', .85],
    ],
    dead: '번조 화웅 서영 우보 동민 이유 경무 반봉 국의 엄강 조무 왕윤 동탁 손견 한복 도겸 이각 곽사 장제 양봉 여포 진궁 고순 원술 기령 교유 공손찬 관정 공손속 전해 전위 엄백호 조표 원소 원담 원상 안량 문추 전풍 저수 심배 봉기 허유 곽도 순심 공손도 손책 오경 태사자 능조 곽가 공융 유표 괴량 황조 진등 진규 장수 단외',
    ronin: '황충@장사 위연@장사 방통@시상 마량@무릉 마속@무릉 등애@신야',
    done: 'peach qingzhou coalition luoyang_fire jade_seal sunjian_death jizhou chain dong_death cao_song xuzhou sun_zhou li_guo emperor yuan_emperor xiapi yijing guandu sun_ce_death xushu three_visits yuan_split guanyu_return changban',
    items: { jeokto: '관우', cheonggang: '조운', jeongno: '유비', gojeong: '손권', okse: null },
    focus: [['cc', 'sj', 24], ['cc', 'lb', 24]],
    ally: [['sj', 'lb', 36]],
  },

  219: {
    year: 219, month: 7, title: '219년 · 한중왕과 형주', desc: '정군산에서 하후연을 벤 유비가 한중왕에 올랐다. 형주의 관우는 북쪽 번성을 노리고, 강동의 손권은 형주를 되찾을 기회를 엿본다.',
    factions: [
      ['cc', '조조', '#2f5fa8', '허창 진류 복양 여남 소패 하비 낙양 홍농 완 수춘 장안 업 남피 진양 계 북평 평원 북해 신야 양양 무위 천수 안정', '조조 하후돈 조인 조홍 조비 조진 조휴 장료 서황 장합 우금 방덕 허저 만총 가후 사마의 정욱 화흠 왕랑 전예 문빙 장패 곽회 하후패 학소 왕쌍 등애 진태', 1.3],
      ['lb', '유비', '#3d8c4a', '성도 자동 강주 건녕 한중 강릉 무릉 영릉', '유비 관우 장비 조운 제갈량 황충 마초 법정 위연 관평 이적 마량 마속 엄안 황권 오의 이엄 미방 미축 간옹 관흥 장포 왕평 요화 장의 비의 장완 동윤 마대 등지', 1.2],
      ['sj', '손권', '#c0392b', '건업 오 회계 여강 시상 강하 장사 계양 남해', '손권 여몽 육손 감녕 장흠 주태 장소 제갈근 한당 서성 반장 주환 주연 정봉 손소 사섭', 1.15],
      ['gd', '공손강', '#7a6a5a', '양평', '공손강', 1],
    ],
    dead: '하후연 능통 악진 진림 노숙',
    ronin: '강유@천수 맹획@건녕',
    done: 'peach qingzhou coalition luoyang_fire jade_seal sunjian_death jizhou chain dong_death cao_song xuzhou sun_zhou li_guo emperor yuan_emperor xiapi yijing guandu sun_ce_death xushu three_visits yuan_split guanyu_return changban liubei_rout baekmun jingzhou_surrender chibi shu_entry luofeng hefei dingjun hanzhong_king',
    items: { jeokto: '관우', cheonggang: '조운', jeongno: '유비', gojeong: '손권' },
    focus: [['lb', 'cc', 18], ['sj', 'lb', 18]],
    ally: [],
  },
  221: {
    year: 221, month: 7, title: '221년 · 삼국 정립', desc: '조조가 죽고 조비가 한의 선양을 받아 위를 세웠다. 유비는 촉한의 황제가 되었고, 관우와 장비를 잃은 원한을 갚으려 오를 향해 군사를 일으킨다.',
    factions: [
      ['cc', '조비', '#2f5fa8', '허창 진류 복양 여남 소패 하비 낙양 홍농 완 수춘 장안 업 남피 진양 계 북평 평원 북해 신야 양양 무위 천수 안정', '조비 조인 조홍 조진 조휴 장료 서황 장합 허저 만총 가후 사마의 화흠 왕랑 전예 문빙 장패 곽회 하후패 학소 왕쌍 우금 등애 진태', 1.3],
      ['lb', '유비', '#3d8c4a', '성도 자동 강주 건녕 한중', '유비 조운 제갈량 황권 마초 위연 마량 마속 이엄 오의 관흥 장포 왕평 요화 장의 비의 장완 동윤 마대 등지 미축', 1.25],
      ['sj', '손권', '#c0392b', '건업 오 회계 여강 시상 강하 장사 계양 남해 강릉 무릉 영릉', '손권 육손 주태 장소 제갈근 한당 서성 반장 주환 주연 정봉 손소 사섭 미방', 1.2],
      ['gd', '공손강', '#7a6a5a', '양평', '공손강', 1],
    ],
    dead: '관우 관평 장비 황충 법정 여몽 감녕 장흠 조조 하후돈 하후연 방덕 정욱 능통 노숙',
    ronin: '강유@천수 맹획@건녕',
    done: 'peach qingzhou coalition luoyang_fire jade_seal sunjian_death jizhou chain dong_death cao_song xuzhou sun_zhou li_guo emperor yuan_emperor xiapi yijing guandu sun_ce_death xushu three_visits yuan_split guanyu_return changban liubei_rout baekmun jingzhou_surrender chibi shu_entry luofeng hefei dingjun hanzhong_king fan_castle maicheng wei_found shu_found zhangfei_death',
    items: { cheonggang: '조운', jeongno: '유비', gojeong: '손권', jeokto: null },
    focus: [['lb', 'sj', 24]],
    ally: [['cc', 'sj', 18]],
  },
  234: {
    year: 234, month: 2, title: '234년 · 오장원', desc: '제갈량이 마지막 북벌에 나섰다. 오장원에서 사마의와 마주한 채 별이 지려 한다. 조예의 위, 유선의 촉, 손권의 오가 천하를 셋으로 나누었다.',
    factions: [
      ['cc', '조예', '#2f5fa8', '허창 진류 복양 여남 소패 하비 낙양 홍농 완 수춘 장안 업 남피 진양 계 북평 평원 북해 신야 양양 무위 천수 안정 양평', '조예 사마의 사마사 사마소 곽회 진태 하후패 만총 전예 등애 가충', 1.3],
      ['lb', '유선', '#3d8c4a', '성도 자동 강주 건녕 한중', '유선 제갈량 위연 강유 마대 왕평 요화 장의 비의 장완 동윤 등지 오의 관흥 맹획', 1.2],
      ['sj', '손권', '#c0392b', '건업 오 회계 여강 시상 강하 장사 계양 남해 강릉 무릉 영릉', '손권 육손 제갈근 장소 주환 주연 정봉 반장 손등 제갈각 손소', 1.2],
    ],
    dead: '조비 조진 조휴 장합 학소 왕쌍 조운 마량 마속 황권 이엄 미방 장포 서성',
    ronin: '',
    done: 'peach qingzhou coalition luoyang_fire jade_seal sunjian_death jizhou chain dong_death cao_song xuzhou sun_zhou li_guo emperor yuan_emperor xiapi yijing guandu sun_ce_death xushu three_visits yuan_split guanyu_return changban liubei_rout baekmun jingzhou_surrender chibi shu_entry luofeng hefei dingjun hanzhong_king fan_castle maicheng wei_found shu_found wu_found zhangfei_death yiling baidi nanman northern jieting',
    items: { gojeong: '손권', jeongno: '유선' },
    focus: [['lb', 'cc', 24], ['cc', 'lb', 24]],
    ally: [['lb', 'sj', 48]],
  },
};
const SCEN_EXTRA_SPHERES = { lp: '복양 진류 소패 하비 허창', zl: '한중 자동', wl: '회계 오', ybh: '오 회계', sx: '남해 계양 영릉' };

function applyScenario(g, sc) {
  g.year = sc.year; g.month = sc.month; g.scen = sc.year;
  const byN = n => g.officers.find(o => o.name === n);
  // 세력
  g.factions = sc.factions.map(([key, rn, color], i) => ({ id: i, key, name: rn, color, ruler: -1, alive: true, capital: -1, rn }));
  const fk = Object.fromEntries(g.factions.map(f => [f.key, f.id]));
  // 성
  for (const c of g.cities) { c.f = -1; c.troops = 0; c.gov = -1; }
  const grow = 1 + (sc.year - 190) * .05;
  sc.factions.forEach(([key, rn, color, cs, os, mul], i) => {
    for (const n of cs.split(' ')) {
      const c = g.cities[CITY_BY_NAME[n]]; c.f = i;
      c.troops = Math.round((2500 + c.size * 1900) * (mul || 1) * (1 + (sc.year - 190) * .03) / 100) * 100;
      c.train = ri(55, 75); c.order = ri(55, 80); c.gold = 400 + c.size * 160; c.food = 6000 + c.size * 3000;
    }
  });
  for (const c of g.cities) { c.agri = Math.min(c.agriMax, Math.round(c.agri * grow)); c.comm = Math.min(c.commMax, Math.round(c.comm * grow)); if (c.f < 0) c.troops = 0; }
  // 인물
  const dead = new Set((sc.dead || '').split(' ').filter(Boolean));
  const listed = {};
  sc.factions.forEach(([key, rn, color, cs, os], i) => { const first = CITY_BY_NAME[cs.split(' ')[0]]; os.split(' ').forEach(n => listed[n] = [i, first]); });
  const ron = Object.fromEntries((sc.ronin || '').split(' ').filter(Boolean).map(s => { const [n, c] = s.split('@'); return [n, CITY_BY_NAME[c]]; }));
  for (const o of g.officers) {
    o.f = -1; o.found = false;
    if (dead.has(o.name)) { o.st = 'dead'; continue; }
    if (sc.year - o.born < 16) { o.st = 'unborn'; continue; }
    if (listed[o.name]) {
      const [fi, c0] = listed[o.name];
      o.st = 'on'; o.f = fi;
      if (g.cities[o.city]?.f !== fi) o.city = c0;
    } else if (o.hdie < sc.year && !ron[o.name]) { o.st = 'dead'; continue; }
    else { o.st = 'ronin'; if (ron[o.name] != null) o.city = ron[o.name]; }
    if (o.die <= sc.year) o.die = sc.year + 1 + ri(0, 2);
  }
  // 군주와 각 성 배치: 장수는 그 세력의 성에 고루
  g.factions.forEach(f => {
    const r = byN(f.rn); r.st = 'on'; r.f = f.id;
    const cs = g.cities.filter(c => c.f === f.id);
    f.ruler = r.id; if (g.cities[r.city].f !== f.id) r.city = cs[0].id; f.capital = r.city;
    const offs = g.officers.filter(o => o.st === 'on' && o.f === f.id && o !== r);
    offs.forEach((o, k) => { if (g.cities[o.city].f !== f.id || (cs.length > 1 && k % 2)) o.city = cs[(k + 1) % cs.length].id; });
  });
  // 사건·동맹·숙원
  g.ev = {}; for (const id of (sc.done || '').split(' ').filter(Boolean)) g.ev[id] = true;
  g.start = (sc.year - START_YEAR) * 12 + sc.month;
  return { fk };
}
function applyScenarioAfter(g, sc, fk) {
  for (const [a, b, m] of sc.ally || []) if (fk[a] != null && fk[b] != null) g.ally[relKey(fk[a], fk[b])] = g.start + m;
  for (const [a, b, m] of sc.focus || []) if (fk[a] != null && fk[b] != null) g.focus.push({ f: fk[a], t: fk[b], until: g.start + m });
  for (const id in sc.items || {}) {
    const st = g.items[id]; if (!st) continue;
    if (st.holder >= 0) takeItemRaw(g, id);
    const n = sc.items[id];
    const o = n ? g.officers.find(x => x.name === n) : null;
    if (o && o.st !== 'dead') giveItemRaw(g, id, o); else { st.city = CITY_BY_NAME['허창']; st.found = false; }
  }
  // 죽은 주인의 보물은 그 고향에 숨음
  for (const it of ITEMS) { const st = g.items[it.id]; if (st.holder >= 0 && g.officers[st.holder].st === 'dead') { const o = g.officers[st.holder]; takeItemRaw(g, it.id); st.city = o.home; st.found = false; } }
}
