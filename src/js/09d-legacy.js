// ===== 역사와 비교 · 업적 · 인물 관계와 대사 · 엔딩 =====

// ── 실제 역사 연표: 사건 id가 그 무렵(±2년) 역사대로 일어났으면 '같음'
const REAL_HISTORY = [
  [190, '반동탁 연합이 일어나고, 동탁이 낙양을 불태우고 장안으로 옮기다', 'luoyang_fire'],
  [191, '손견이 낙양에서 전국옥새를 얻다', 'jade_seal'],
  [191, '원소가 한복에게서 기주를 넘겨받다', 'jizhou'],
  [192, '손견이 현산에서 황조의 군사에게 죽다', 'sunjian_death'],
  [192, '왕윤의 연환계로 여포가 동탁을 죽이다', 'chain'],
  [192, '조조가 청주의 황건을 거두어 청주병을 만들다', 'qingzhou'],
  [193, '조조의 아버지 조숭이 서주에서 죽다', 'cao_song'],
  [194, '도겸이 죽으며 유비에게 서주를 넘기다', 'xuzhou'],
  [195, '이각과 곽사가 싸우고 천자가 낙양으로 피하다', 'li_guo'],
  [196, '조조가 천자를 허도로 맞아들이다', 'emperor'],
  [197, '원술이 황제를 칭하다', 'yuan_emperor'],
  [198, '여포가 하비에서 사로잡혀 백문루에서 죽다', 'baekmun'],
  [199, '공손찬이 역경루에서 원소에게 무너지다', 'yijing'],
  [200, '관도대전에서 조조가 원소를 이기다', 'guandu'],
  [200, '손책이 자객에게 죽고 손권이 뒤를 잇다', 'sun_ce_death'],
  [200, '관우가 조조를 떠나 유비에게 돌아가다', 'guanyu_return'],
  [205, '원담과 원상이 서로 싸우다 무너지다', 'yuan_split'],
  [207, '유비가 삼고초려로 제갈량을 얻다', 'three_visits'],
  [208, '유표가 죽고 형주가 조조에게 항복하다', 'jingzhou_surrender'],
  [208, '장판파에서 조운과 장비가 이름을 떨치다', 'changban'],
  [208, '적벽에서 손권·유비 연합이 조조의 대군을 불사르다', 'chibi'],
  [211, '유비가 익주로 들어가다', 'shu_entry'],
  [215, '합비에서 장료가 손권을 물리치다', 'hefei'],
  [219, '정군산에서 황충이 하후연을 베고 유비가 한중을 얻다', 'dingjun'],
  [219, '유비가 한중왕에 오르다', 'hanzhong_king'],
  [219, '관우가 번성에서 우금을 사로잡고 방덕을 베다', 'fan_castle'],
  [220, '관우가 맥성에서 죽고 형주가 오에 넘어가다', 'maicheng'],
  [220, '조조가 죽고 조비가 위를 세우다', 'wei_found'],
  [221, '유비가 촉한의 황제가 되다', 'shu_found'],
  [222, '이릉에서 육손이 유비를 크게 이기다', 'yiling'],
  [223, '유비가 백제성에서 제갈량에게 뒤를 맡기다', 'baidi'],
  [225, '제갈량이 남만의 맹획을 일곱 번 사로잡다', 'nanman'],
  [227, '제갈량이 출사표를 올리고 북벌에 나서다', 'northern'],
  [228, '가정에서 마속이 지고 처형되다', 'jieting'],
  [229, '손권이 오의 황제가 되다', 'wu_found'],
  [234, '제갈량이 오장원에서 죽다', 'wuzhang'],
  [249, '사마의가 고평릉 정변으로 권력을 쥐다', 'gaoping'],
  [263, '등애가 성도에 들어가 촉이 멸망하다', 'shu_fall'],
  [265, '사마염이 진을 세우다', 'jin_found'],
  [280, '진이 오를 멸하고 천하를 통일하다', 'wu_fall'],
];
// 이 판에서: 'same' | 'diff' | 'late' | 'early' | 'none' | 'future'
function histStatus(row) {
  const [y, , id] = row;
  const at = G.evAt && G.evAt[id];
  const startY = START_YEAR + Math.floor(((G.start || 1) - 1) / 12);
  if (y < startY) return 'before';
  if (G.ev && G.ev[id] && at == null) return 'before';
  if (at != null) {
    if (G.div && G.div[id]) return 'diff';
    const gy = START_YEAR + Math.floor((at - 1) / 12);
    return Math.abs(gy - y) <= 2 ? 'same' : gy < y ? 'early' : 'late';
  }
  return G.year > y + 2 ? 'none' : 'future';
}
function histMatch() {
  const due = REAL_HISTORY.filter(r => { const s = histStatus(r); return s !== 'future' && s !== 'before'; });
  const ok = due.filter(r => histStatus(r) === 'same').length;
  return { ok, n: due.length, pct: due.length ? Math.round(ok / due.length * 100) : 100 };
}
function yearlyHistoryNote() {
  const rows = REAL_HISTORY.filter(r => r[0] === G.year);
  if (rows.length) logMsg(`실제 역사에서 ${G.year}년에는 — ${rows.map(r => r[1]).join(' / ')}`, 'hist');
}

// ── 업적 (브라우저에 오래 남음)
const ACHS = [
  ['peach', '도원결의', '유비·관우·장비로 도원결의를 맺다'],
  ['threevisits', '삼고초려', '제갈량을 우리 세력에 맞아들이다'],
  ['chibi_fire', '적벽의 불꽃', '손권 또는 유비 쪽에서 적벽대전을 이기다'],
  ['chibi_cao', '역사를 뒤집다', '조조로 적벽대전을 이기다'],
  ['spare_lubu', '사람 중의 여포', '백문루에서 여포를 살려 쓰다'],
  ['save_guanyu', '맥성 탈출', '관우를 맥성에서 살려 내다'],
  ['no_yiling', '원한을 삼키다', '이릉 출병을 거두다'],
  ['spare_masu', '마속을 살리다', '가정 뒤 마속을 살려 두다'],
  ['emperor_hold', '천자를 품다', '천자를 모신 세력이 되다'],
  ['edict', '칙명', '천자의 이름으로 칙명을 내리다'],
  ['king', '왕좌', '왕에 오르다'],
  ['throne', '천명', '황제에 오르다'],
  ['unify', '천하통일', '천하를 하나로 모으다'],
  ['unify_liu', '한실 부흥', '유비의 세력으로 천하를 통일하다'],
  ['unify_zhengshi', '정사의 영웅', '정사 모드로 천하를 통일하다'],
  ['ronin_ruler', '맨손에서 군주로', '재야나 신무장에서 시작해 군주가 되다'],
  ['sworn3', '형제의 맹세', '의형제를 셋 맺다'],
  ['treasure5', '보물 창고', '보물 다섯 점을 모으다'],
  ['wins50', '백전노장', '전투에서 50번 이기다'],
  ['historian', '역사가', '234년 이후까지 역사 일치율 80% 이상을 지키다'],
  ['offices', '조정을 세우다', '관직 여덟 자리를 채우다'],
  ['barb', '변방을 다스리다', '이민족을 회유하거나 토벌하다'],
];
const ACH = Object.fromEntries(ACHS.map(a => [a[0], a]));
function achStore() { try { return JSON.parse(store('gunung.ach') || '{}'); } catch (e) { return {}; } }
function unlock(id) {
  G.ach = G.ach || {}; if (G.ach[id] || !ACH[id]) return;
  G.ach[id] = `${G.year}.${G.month}`;
  const all = achStore(); if (!all[id]) { all[id] = new Date().toISOString().slice(0, 10); store('gunung.ach', JSON.stringify(all)); }
  logMsg(`업적 달성: 「${ACH[id][1]}」 — ${ACH[id][2]}`, 'big');
  if (typeof UI !== 'undefined' && UI.toast) UI.toast(`🏆 업적 「${ACH[id][1]}」`);
  SFX.play('win');
}
function checkAch() {
  const P = me(); if (!P || !G) return;
  const F = P.st === 'on' ? G.factions[P.f] : null;
  if (G.ev && G.ev.peach && ['유비', '관우', '장비'].includes(P.name)) unlock('peach');
  if (F && onIn(byName('제갈량'), F.id)) unlock('threevisits');
  if (F && empHolder() === F.id) unlock('emperor_hold');
  if (F && isRuler(P) && rankOf(F) >= 2) unlock('king');
  if (F && isRuler(P) && rankOf(F) >= 3) unlock('throne');
  if (F && isRuler(P) && (P.created || G.startRonin)) unlock('ronin_ruler');
  if ((P.sworn || []).length >= 3) unlock('sworn3');
  if (F && itemsOfFaction(F.id).length >= 5) unlock('treasure5');
  if ((G.stats.wins || 0) >= 50) unlock('wins50');
  if (F && Object.keys(F.offices || {}).length >= 8) unlock('offices');
  const d = G.div || {};
  if (d.baekmun === 'spare') unlock('spare_lubu'); if (d.maicheng === 'flee') unlock('save_guanyu'); if (d.yiling === 'stop') unlock('no_yiling'); if (d.jieting === 'spare') unlock('spare_masu');
  if (G.chibiWin && F) { if (G.chibiWin === 'coalition' && ['sj', 'lb'].includes(F.key)) unlock('chibi_fire'); if (G.chibiWin === 'cao' && F.key === 'cc') unlock('chibi_cao'); }
  if (G.year >= 234 && HIST() && histMatch().pct >= 80 && (G.start || 1) <= 12) unlock('historian');
}

// ── 인물 관계: 원수(foe)·맞수(rival)·은혜(debt)
const RELS = [
  ['마초', '조조', 'foe', '아버지 마등의 원수'], ['손책', '황조', 'foe', '아버지 손견의 원수'], ['손권', '황조', 'foe', '아버지 손견의 원수'],
  ['감녕', '능통', 'foe', '아버지 능조를 죽인 원수'], ['관우', '여몽', 'foe', '형주를 빼앗은 원수'], ['관흥', '반장', 'foe', '아버지 관우의 원수'],
  ['유비', '여포', 'foe', '서주를 빼앗은 자'], ['관우', '조조', 'debt', '하비에서 받은 은혜'],
  ['제갈량', '사마의', 'rival', '평생의 맞수'], ['강유', '등애', 'rival', '서쪽의 맞수'], ['주유', '제갈량', 'rival', '적벽의 두 지략가'], ['육손', '유비', 'rival', '이릉의 맞수'],
  ['허저', '마초', 'rival', '위수의 맞대결'], ['장비', '여포', 'rival', '호로관의 맞대결'], ['태사자', '손책', 'rival', '신정의 맞대결'],
];
function relOf(a, b) {
  for (const [x, y, t, why] of RELS) if ((a.name === x && b.name === y) || (a.name === y && b.name === x)) return { t, why, first: a.name === x };
  return null;
}
// 원수의 세력에는 들어가지 않음
function foeBlocks(target, ruler) { const r = relOf(target, ruler); return !!r && r.t === 'foe'; }

// ── 고유 대사
const SIG = {
  장비: '연인 장익덕이 여기 있다! 누가 나와 죽기로 싸우겠느냐!', 조운: '상산의 조자룡이다! 길을 비켜라!', 관우: '하찮은 무리가 감히 나를 막겠느냐.', 여포: '사람 중엔 여포, 말 중엔 적토라 했다!',
  마초: '서량의 마맹기가 왔다! 아버지의 원수를 갚으리라!', 허저: '웃통을 벗어 던져라! 끝장을 보자!', 전위: '주공께는 한 걸음도 다가오지 못한다!', 황충: '늙었다고 얕보지 마라! 이 활과 칼은 아직 녹슬지 않았다!',
  위연: '누가 감히 나를 죽이겠느냐!', 손책: '강동의 소패왕이다! 나를 막을 자 누구냐!', 태사자: '대장부가 세상에 나서 칠 척 칼을 차고 천자의 섬돌에 오르리라!', 감녕: '방울 소리를 들어라! 금범적 감흥패가 왔다!',
  장료: '팔백으로 십만을 뚫은 장문원이다!', 하후돈: '부모에게서 받은 눈이니 버릴 수 없다!', 방덕: '관을 짊어지고 왔다. 오늘 너 아니면 내가 죽는다!', 문추: '하북의 문추다!', 안량: '하북의 안량이다! 나와라!',
  화웅: '연합군의 장수들이여, 누가 내 칼을 받겠느냐!', 강유: '한실을 위해 끝까지 싸우겠다!', 등애: '길이 없으면 길을 만든다!', 문앙: '단기로 만군을 뚫어 보이리라!', 서황: '공과 사는 다르다!', 장합: '물러서지 마라!',
  조조: '내가 천하를 버릴지언정, 천하가 나를 버리게 하지는 않으리라.', 유비: '한실을 다시 일으키기 위해 싸운다!', 손권: '강동의 운명이 이 한 싸움에 걸렸다.',
  제갈량: '바람과 물과 땅이 모두 우리 편이다.', 사마의: '서두르지 마라. 기다리는 자가 이긴다.', 주유: '이 싸움, 내 손바닥 안에 있다.', 육손: '서생이라 얕보면 그것이 너의 패배다.',
};
const PAIR_LINES = {
  '장비|여포': ['세 성의 종놈 여포야! 연인 장비가 왔다!', '시끄러운 놈이로구나. 한 창에 꿰어 주마!'],
  '허저|마초': ['호치 허중강이다! 오늘 결판을 내자!', '네가 그 범 같은 바보로구나. 덤벼라!'],
  '조운|문추': ['상산의 조자룡이 상대해 주마!', '애송이가 감히!'],
  '태사자|손책': ['손책! 동래의 태사자가 혼자 왔다!', '좋다! 강동의 사내답게 한판 붙자!'],
  '관우|황충': ['노장군의 칼 솜씨를 보고 싶었소.', '관운장, 오늘은 사정 두지 않겠소!'],
  '장비|마초': ['연인 장익덕이다! 밤이 새도록 싸워 보자!', '횃불을 밝혀라! 끝을 보자!'],
  '강유|등애': ['등애! 오늘이야말로 끝을 내자!', '강백약, 네 북벌도 여기까지다.'],
  '감녕|능통': ['…공적, 지난 일은 칼로 갚겠다는 것이냐.', '아버지의 원수! 오늘은 피하지 마라!'],
  '관우|화웅': ['데운 술이 식기 전에 돌아오겠소.', '이름 없는 마궁수 따위가!'],
};
function duelOpening(A, D) {
  const k1 = `${A.name}|${D.name}`, k2 = `${D.name}|${A.name}`;
  if (PAIR_LINES[k1]) return [[A, PAIR_LINES[k1][0]], [D, PAIR_LINES[k1][1]]];
  if (PAIR_LINES[k2]) return [[D, PAIR_LINES[k2][0]], [A, PAIR_LINES[k2][1]]];
  const out = []; for (const o of [A, D]) if (SIG[o.name]) out.push([o, SIG[o.name]]);
  const r = relOf(A, D); if (r) out.push([null, r.t === 'foe' ? `— ${r.why}. 두 사람의 눈에 불꽃이 튄다.` : r.t === 'rival' ? `— ${r.why}가 다시 마주했다.` : `— ${r.why}가 있는 사이다.`]);
  return out;
}

// ── 엔딩
const ENDINGS = {
  유비: '돗자리를 짜던 탁현의 사내가 마침내 천하를 하나로 모았다. 한실은 다시 일어섰고, 사람들은 그의 어진 다스림을 오래도록 노래했다.',
  조조: '난세의 간웅은 천하를 손에 넣었다. 둔전으로 백성을 먹이고 인재를 가리지 않고 썼으니, 그가 세운 나라는 굳건했다.',
  손권: '강동의 푸른 눈의 군주는 장강을 넘어 천하를 아울렀다. 아버지와 형이 꿈꾸던 일을 그가 이루었다.',
  손책: '소패왕은 짧을 것이라던 운명을 넘어 천하를 휩쓸었다. 강동의 젊은 호랑이가 온 땅의 주인이 되었다.',
  원소: '사세삼공의 명문은 마침내 천하를 얻었다. 하북의 대군이 남쪽을 덮었다.',
  동탁: '폭군은 끝내 천하를 쥐었다. 그러나 백성들은 숨죽여 그의 끝을 기다렸다.',
  여포: '천하무쌍의 무장이 천하의 주인이 되었다. 적토마의 말발굽 소리가 온 땅에 울렸다.',
  유표: '형주의 선비 군주가 천하를 하나로 모았다. 전란을 피해 모였던 학자들이 새 나라의 기틀을 세웠다.',
  마등: '서량의 기병이 천하를 달렸다. 강족과 한족이 함께 사는 새 나라가 열렸다.', 마초: '서량의 금마초가 아버지의 원수를 갚고 천하를 손에 넣었다.',
  유장: '험한 촉 땅의 주인이 뜻밖에도 천하를 하나로 모았다.', 공손찬: '백마의종의 주인이 북쪽에서 내려와 천하를 차지했다.',
  사마의: '기다릴 줄 알았던 자가 끝내 천하를 얻었다. 사마씨의 시대가 열렸다.', 사마염: '할아버지와 아버지가 닦은 길 끝에서 진의 황제가 천하를 하나로 모았다.',
  제갈량: '와룡이 날아올랐다. 승상의 손으로 천하가 다시 하나가 되었다.',
};
function endingText(F, P) {
  const r = G.officers[F.ruler];
  let t = ENDINGS[r.name] || (r.created || r.gen ? `이름 없던 ${r.name}이(가) 난세를 끝내고 천하의 주인이 되었다. 역사책은 그 이름을 새로 써야 했다.` : `${r.name}이(가) 천하를 하나로 모았다. 아무도 예상하지 못한 결말이었다.`);
  const add = [];
  if (F.rank >= 3) add.push(`${F.title}로서 새 왕조의 첫 장을 열었다.`);
  const gy = byName('관우'); if (gy && gy.st !== 'dead' && G.year > 220 && gy.f === F.id) add.push('형주를 잃지 않은 관우는 늙도록 천하에 이름을 떨쳤다.');
  const zg = byName('제갈량'); if (zg && zg.st !== 'dead' && G.year > 234 && zg.f === F.id) add.push('제갈량은 오장원을 넘어 살아남아 새 나라의 법도를 세웠다.');
  if (G.div && G.div.chibi) add.push('적벽의 불길이 다르게 번졌던 날부터 역사는 다른 길을 걸었다.');
  const m = histMatch();
  add.push(m.pct >= 70 ? `역사 일치율 ${m.pct}% — 대체로 역사의 물줄기를 따라 흘렀다.` : m.pct >= 40 ? `역사 일치율 ${m.pct}% — 역사와 닮았으나 곳곳에서 다른 길로 갈라졌다.` : `역사 일치율 ${m.pct}% — 우리가 아는 삼국지와는 전혀 다른 이야기가 되었다.`);
  if (G.year < 220) add.push(`황건의 난으로부터 ${G.year - 184}년, 생각보다 이른 통일이었다.`);
  return [t, ...add].join('\n\n');
}
