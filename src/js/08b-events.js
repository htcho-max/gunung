// ===== 역사 사건 =====
// 각 사건은 한 번만 일어남. cond()가 참이 되는 달에 run()을 실행.
// 선택지의 첫 번째는 언제나 역사대로 흘러가는 쪽(자동 시험도 이쪽을 고름).
const byName = n => G.officers.find(o => o.name === n);
const live = o => !!o && (o.st === 'on' || o.st === 'ronin');
const onIn = (o, f) => !!o && o.st === 'on' && o.f === f;
const rulerNamed = n => { const o = byName(n); return o && o.st === 'on' && isRuler(o) ? o : null; };
const isP = o => !!o && o.id === G.player;
const facAdj = (a, b) => G.cities.some(c => c.f === a && ADJ[c.id].some(i => G.cities[i].f === b));
const cityN = n => G.cities[CITY_BY_NAME[n]];
const scenesOn = () => store('gunung.scenes') !== '0';

// 장면 보여 주기. 당사자가 아니고 장면을 꺼 두었으면 첫 선택지를 돌려줌
async function scene({ title, lines, options, involved }) {
  if (!involved && !scenesOn()) return options ? options[0].k : 'ok';
  const body = el('div', { class: 'scene' },
    el('div', { class: 'eyebrow' }, `${G.year}년 ${G.month}월 · 역사 사건`),
    lines.map(([who, text, alt]) => who
      ? el('div', { class: 'sline' }, portraitImg(who, ''), el('div', { class: 'say' }, el('b', { class: 'disp' }, who.name), el('p', {}, text)))
      : el('p', { class: 'nar' }, alt || text)));
  SFX.play('gong');
  if (!options) { await UI.modal({ title, body, wide: true, buttons: [{ k: 'ok', label: '계속', cls: 'pri' }] }); return 'ok'; }
  return UI.modal({ title, body, wide: true, col: options.length > 2, buttons: options.map((o, i) => ({ k: o.k, label: o.label, cls: i === 0 ? 'pri' : '', danger: o.danger })) });
}

// 세력 합치기 (서주 양도)
function mergeFaction(from, to) {
  for (const c of G.cities) if (c.f === from) { c.f = to; c.gov = -1; c.deleg = false; }
  for (const o of G.officers) if (o.st === 'on' && o.f === from) { const cid = o.city; joinFaction(o, to, cid); o.acted = false; }
  G.factions[from].alive = false;
  for (const k in G.ally) if (k.split(',').map(Number).includes(from)) delete G.ally[k];
  assignGovs();
}
// 한 성을 들고 갈라져 나가기 (연환계 뒤 여포)
function splitOff(leader, c, oldF, followers) {
  const home = G.cities.filter(x => x.f === oldF && x.id !== c.id);
  for (const o of officersIn(c.id, oldF)) {
    if (o === leader || followers.includes(o)) continue;
    if (home.length) o.city = (home.find(h => ADJ[h.id].includes(c.id)) || home[0]).id; else leaveToRonin(o);
  }
  leaveToRonin(leader);
  const F = createFaction(leader, c, c.troops, true);
  for (const f of followers) { if (c.gov === f.id) c.gov = -1; f.st = 'on'; f.f = F.id; f.city = c.id; f.loy = 90; }
  G.rel[relKey(F.id, oldF)] = 0;
  assignGovs();
  return F;
}

const EVENTS = [
  // ── 도원결의: 유비·관우·장비로 시작하면 처음에 한 번
  {
    id: 'peach',
    cond: () => mIdx() <= 1 && ['유비', '관우', '장비'].some(n => isP(byName(n))) && ['유비', '관우', '장비'].every(n => onIn(byName(n), byName('유비').f)),
    async run() {
      const [a, b, c] = ['유비', '관우', '장비'].map(byName);
      await scene({ title: '도원결의', involved: true, lines: [
        [null, '복숭아꽃이 흐드러진 장비의 집 뒤뜰. 세 사람이 향을 피우고 하늘에 고한다.'],
        [a, '비록 성은 다르나 형제가 되어, 마음과 힘을 합쳐 어려움에 빠진 이를 돕겠습니다.'],
        [b, '한날한시에 나기를 바라지 않으나, 한날한시에 죽기를 바랍니다.'],
        [c, '하늘과 땅이 이 마음을 굽어보소서! 저버리는 자는 하늘과 사람이 함께 벌하리라!'],
      ] });
      for (const o of [a, b, c]) o.fame += 3;
    },
  },

  // ── 낙양 방화와 장안 천도
  {
    id: 'luoyang_fire',
    cond: () => { const d = rulerNamed('동탁'); return d && mIdx() >= 3 && cityN('낙양').f === d.f && cityN('장안').f === d.f; },
    async run() {
      const d = rulerNamed('동탁'), li = byName('이유'), F = G.factions[d.f];
      const ly = cityN('낙양'), ca = cityN('장안');
      const ch = await scene({ title: '낙양 방화', involved: isP(d) || onIn(me(), d.f), lines: [
        [null, '반동탁 연합군이 사수관과 호뢰관으로 밀려든다.'],
        [live(li) ? li : null, '연합군의 기세가 거셉니다. 낙양을 불태우고 천자를 모셔 장안으로 옮기소서. 관중은 지키기 쉬운 땅입니다.', '모사들이 낙양을 버리고 지키기 쉬운 장안으로 천도하자고 아뢴다.'],
        [d, '좋다! 백성들도 모두 끌고 가라. 낙양에는 풀 한 포기 남기지 마라!'],
      ], options: isP(d) ? [{ k: 'go', label: '낙양을 불태우고 장안으로 천도한다' }, { k: 'stay', label: '낙양을 지킨다' }] : null });
      if (ch === 'stay') { logMsg('동탁이 천도를 거두고 낙양에 남았습니다', 'big'); return; }
      ca.gold += Math.round(ly.gold * .8); ly.gold = Math.round(ly.gold * .2);
      ca.pop += Math.round(ly.pop * .3); ly.pop = Math.round(ly.pop * .4);
      ly.comm = Math.round(ly.comm * .4); ly.agri = Math.round(ly.agri * .7); ly.order = Math.max(10, ly.order - 30);
      ly.wall = Math.round(ly.wall * .6);
      const move = Math.round(ly.troops * .5); ly.troops -= move; ca.troops += move;
      for (const o of [d, li].filter(o => onIn(o, d.f))) { if (ly.gov === o.id) ly.gov = -1; o.city = ca.id; }
      F.capital = ca.id;
      d.fame -= 5; d.cha = Math.max(1, d.cha - 3);
      logMsg('동탁이 낙양을 불태우고 장안으로 천도했습니다', 'big');
      assignGovs();
    },
  },

  // ── 손견, 우물에서 옥새를 줍다
  {
    id: 'jade_seal',
    cond: () => G.ev.luoyang_fire && !!rulerNamed('손견') && mIdx() >= 4,
    async run() {
      const s = rulerNamed('손견'), cp = byName('정보'), ysh = rulerNamed('원술');
      const ch = await scene({ title: '전국옥새', involved: isP(s) || onIn(me(), s.f), lines: [
        [null, '불탄 낙양에 들어선 손견의 군사들이 건장전 남쪽 우물에서 오색 빛을 본다.'],
        [s, '이것은… 전국옥새가 아닌가! 「하늘에서 명을 받으니 영원히 창성하리라」.'],
        [onIn(cp, s.f) ? cp : null, '하늘이 주공께 뜻을 보이신 것입니다. 다만 이 일은 결코 새어 나가서는 안 됩니다.', '곁에 있던 장수들이 이 일을 비밀에 부치자고 입을 모은다.'],
      ], options: isP(s) ? [{ k: 'keep', label: '옥새를 몰래 간직한다' }, { k: 'give', label: '조정에 바친다' }] : null });
      if (ch === 'give') { s.fame += 8; for (const f of G.factions) if (f.alive && f.id !== s.f) addRel(s.f, f.id, 5); logMsg('손견이 옥새를 조정에 바쳤습니다', 'big'); return; }
      s.fame += 15; s.cha = Math.min(100, s.cha + 2);
      G.sealHolder = s.f;
      if (ysh) addRel(s.f, ysh.f, -20);
      logMsg('손견이 낙양의 우물에서 전국옥새를 손에 넣었다는 소문이 돕니다', 'big');
    },
  },

  // ── 손견, 현산에서 지다
  {
    id: 'sunjian_death',
    cond: () => { const s = rulerNamed('손견'); const lb = G.factions.find(f => f.key === 'lbi' && f.alive); return s && lb && mIdx() >= 16 && mIdx() <= 40 && (facAdj(s.f, lb.id) || (HIST() && mIdx() >= 24)) && chance(HIST() ? .2 + Math.max(0, mIdx() - 16) * .06 : .2); },
    async run() {
      const s = rulerNamed('손견'), hz = byName('황조'), lb = G.factions.find(f => f.key === 'lbi');
      const lines = [
        [null, `손견이 ${lb.name}군을 쳐서 강을 건넌다. 쫓기던 황조의 군사가 현산 쪽으로 달아난다.`],
        [live(hz) ? hz : null, '현산 숲에 활과 돌을 숨겨 두었다. 손견이 홀로 쫓아오면 그때다!', '현산의 숲속에 활과 돌을 든 군사들이 숨어 있다.'],
      ];
      if (isP(s)) {
        const ch = await scene({ title: '현산', involved: true, lines: [...lines, [s, '적이 겁을 먹고 달아난다. 이대로 끝까지 쫓을 것인가…']], options: [{ k: 'chase', label: '끝까지 추격한다', danger: true }, { k: 'stop', label: '추격을 멈추고 진을 친다' }] });
        if (ch === 'stop') { s.fame += 2; logMsg('손견이 현산 앞에서 추격을 멈췄습니다', 'big'); return; }
        if (chance(.5)) { await scene({ title: '현산', involved: true, lines: [[null, '숲에서 화살과 돌이 비처럼 쏟아졌지만, 손견은 칼을 휘둘러 가까스로 빠져나왔다.']] }); s.fame += 6; return; }
      } else {
        await scene({ title: '손견의 최후', involved: onIn(me(), s.f) || onIn(me(), lb.id), lines: [...lines, [null, '숲에서 쏟아진 화살과 돌에 강동의 호랑이가 쓰러졌다.']] });
      }
      killOfficer(s, `${eun(s.name)} 현산에서 매복에 걸려 전사했습니다 (향년 ${age(s)}세)`);
    },
  },

  // ── 연환계: 왕윤·초선·여포
  {
    id: 'chain',
    cond: () => { const d = rulerNamed('동탁'), lb = byName('여포'), wy = byName('왕윤'); return d && mIdx() >= 28 && onIn(lb, d.f) && G.cities.filter(c => c.f === d.f).length >= 2 && (onIn(wy, d.f) || mIdx() >= 34); },
    async run() {
      const d = rulerNamed('동탁'), lb = byName('여포'), wy0 = byName('왕윤'), oldF = d.f;
      const wy = onIn(wy0, oldF) ? wy0 : null;
      const lines = [
        wy ? [wy, '역적 동탁을 칼로 이길 수 없다면, 사람의 마음으로 무너뜨려야 한다. 초선아, 너를 여포에게 주겠다 약속하고 동탁에게 바치겠다.'] : [null, '사도 왕윤은 가희 초선을 여포와 동탁 두 사람에게 모두 약속하여 그 사이를 갈라놓았다.'],
        [null, '초선은 두 사람 사이를 오가며 눈물로 여포의 마음을 흔든다.'],
        [lb, '의부라는 자가 내 여인을 빼앗다니… 더는 참지 않겠다!'],
      ];
      let ch = 'go';
      if (isP(d)) {
        ch = await scene({ title: '연환계', involved: true, lines: [[wy, `${wy ? '' : '사도 왕윤이 아룁니다. '}승상께 가희 초선을 바칩니다.`], [null, '여포가 초선을 바라보는 눈빛이 심상치 않다. 이유가 몰래 아뢴다. "초선을 여포에게 내리시어 그 마음을 붙드소서."']], options: [{ k: 'go', label: '초선을 곁에 둔다' }, { k: 'no', label: '이유의 말대로 초선을 여포에게 준다' }] });
      } else if (isP(lb)) {
        ch = await scene({ title: '연환계', involved: true, lines: [...lines, [wy, `${wy ? '' : '왕윤이 은밀히 전한다. '}장군, 나라를 위해 역적을 베소서. 천하가 장군의 이름을 기억할 것이오.`]], options: [{ k: 'go', label: '동탁을 벤다' }, { k: 'no', label: '그래도 의부를 따른다' }] });
      } else if (wy && isP(wy)) {
        ch = await scene({ title: '연환계', involved: true, lines: lines.slice(0, 2), options: [{ k: 'go', label: '계책을 끝까지 밀고 간다' }, { k: 'no', label: '그만둔다' }] });
      }
      if (ch === 'no') {
        lb.loy = 100;
        if (wy && !isP(wy)) { leaveToRonin(wy); logMsg(`${eun(wy.name)} 계책이 드러날까 두려워 장안을 떠났습니다`, 'big'); }
        else logMsg('연환계는 끝내 실행되지 않았습니다', 'big');
        assignGovs(); return;
      }
      await scene({ title: '동탁의 최후', involved: onIn(me(), oldF), lines: [
        ...(isP(d) || isP(lb) || isP(wy) ? [] : lines),
        [null, '미오성에서 입궐하던 동탁이 수레에서 내리는 순간, 여포의 방천화극이 그의 목을 꿰뚫었다.'],
        [lb, '조서를 받들어 역적 동탁을 벤다!'],
        [null, '장안 저잣거리의 백성들이 춤을 추었다. 그러나 동탁의 옛 부하들이 곧 칼을 거꾸로 들었다.'],
      ] });
      // 여포와 따르는 이들은 뒤를 잇는 후보에서 빼 둠
      const followers = ['장료', '고순'].map(byName).filter(o => onIn(o, oldF) && !isRuler(o));
      for (const o of [lb, ...followers]) o.f = -1;
      killOfficer(d, `${eun(d.name)} 여포의 손에 죽었습니다 (연환계)`);
      for (const o of [lb, ...followers]) o.f = oldF;
      if (!G.factions[oldF].alive) { for (const o of [lb, ...followers]) if (o.st === 'on') leaveToRonin(o); return; }
      const nr = G.officers[G.factions[oldF].ruler];
      let c = G.cities[lb.city];
      if (c.f !== oldF || nr.city === c.id) c = G.cities.filter(x => x.f === oldF && x.id !== nr.city).sort((a, b) => b.troops - a.troops)[0];
      if (!c) { leaveToRonin(lb); return; }
      for (const f of followers) { const oc = G.cities[f.city]; if (oc.gov === f.id) oc.gov = -1; f.city = c.id; }
      if (lb.city !== c.id) { const oc = G.cities[lb.city]; if (oc.gov === lb.id) oc.gov = -1; lb.city = c.id; }
      splitOff(lb, c, oldF, followers);
      if (wy && onIn(wy, oldF) && !isP(wy)) killOfficer(wy, `${eun(wy.name)} ${nr.name}의 군사에게 죽었습니다`);
      logMsg(`${eun(lb.name)} ${c.name}에서 따로 일어섰고, 동탁군은 ${nr.name}${josa(nr.name, '이', '가').slice(nr.name.length)} 이끕니다`, 'big');
    },
  },

  // ── 도겸, 서주를 유비에게 맡기다
  {
    id: 'xuzhou',
    cond: () => { const t = rulerNamed('도겸'), lb = rulerNamed('유비'); if (!t || !lb || isP(t) || G.year < 194) return false; const near = G.cities.some(c => c.f === lb.f && ADJ[c.id].some(i => G.cities[i].f === t.f || ADJ[i].some(j => G.cities[j].f === t.f))); return near; },
    async run() {
      const t = rulerNamed('도겸'), lb = rulerNamed('유비'), mz = byName('미축');
      const from = t.f, to = lb.f;
      const ch = await scene({ title: '서주 양도', involved: isP(lb) || onIn(me(), from), lines: [
        [null, `병이 깊어진 ${t.name}${josa(t.name, '이', '가').slice(t.name.length)} 머리맡에 유비를 불렀다.`],
        [t, '천하가 어지러운데 내 아들들은 그릇이 못 되오. 서주의 백성을 맡을 사람은 현덕 공뿐이오. 부디 거절하지 마시오.'],
        [onIn(mz, from) ? mz : null, '서주의 백성이 모두 사군을 바라고 있습니다.', '서주의 관리와 백성들이 길을 막고 유비에게 머물러 달라고 청한다.'],
      ], options: isP(lb) ? [{ k: 'take', label: '서주를 받는다' }, { k: 'no', label: '끝내 사양한다' }] : null });
      if (ch === 'no') { lb.fame += 10; killOfficer(t, `${eun(t.name)} 병으로 세상을 떠났습니다`); logMsg('유비가 서주를 사양했습니다', 'big'); return; }
      mergeFaction(from, to);
      for (const x of G.focus || []) if (x.t === from) x.t = to;
      killOfficer(t, null);
      lb.fame += 8;
      logMsg(`${eun(t.name)} 세상을 떠나며 서주를 유비에게 넘겼습니다`, 'big');
    },
  },

  // ── 단금지교: 손책과 주유
  {
    id: 'sun_zhou',
    cond: () => { const s = byName('손책'), z = byName('주유'); return s && s.st === 'on' && age(s) >= 19 && z && z.st === 'ronin'; },
    async run() {
      const s = byName('손책'), z = byName('주유');
      const ch = await scene({ title: '단금지교', involved: isP(s) || isP(z) || onIn(me(), s.f), lines: [
        [null, '서성에서 함께 자란 동갑내기 두 사람이 다시 만났다.'],
        [s, '공근, 강동을 평정하려 하네. 자네가 곁에 있어 주게.'],
        [z, '백부, 우리 둘이 마음을 합하면 그 날카로움은 쇠도 끊을 것이오.'],
      ], options: isP(z) ? [{ k: 'yes', label: '손책을 돕는다' }, { k: 'no', label: '아직은 홀로 길을 간다' }] : null });
      if (ch === 'no') return;
      joinFaction(z, s.f, s.city); z.loy = 100; z.tag = s.tag || z.tag;
      if (!isP(s) && G.cities[s.city].f === s.f) G.cities[s.city].troops += 3000;
      logMsg(`${eun(z.name)} 손책과 의를 맺고 ${facName(s.f)}군에 들어왔습니다`, 'big');
    },
  },

  // ── 조조, 천자를 맞이하다
  {
    id: 'emperor',
    cond: () => { const c = rulerNamed('조조'); return c && G.year >= 196 && (cityN('허창').f === c.f || cityN('낙양').f === c.f); },
    async run() {
      const c = rulerNamed('조조'), xy = byName('순욱');
      const ch = await scene({ title: '봉천자', involved: isP(c) || onIn(me(), c.f), lines: [
        [null, '이각과 곽사의 난을 피해 낙양으로 돌아온 천자는 끼니조차 잇지 못하고 있었다.'],
        [onIn(xy, c.f) ? xy : null, '천자를 받들어 따르지 않는 자를 호령하소서. 이것이 대의이며 대략입니다.', '모사들이 천자를 받들어 천하를 호령하자고 권한다.'],
        [c, '좋다. 천자를 허도로 모시겠다.'],
      ], options: isP(c) ? [{ k: 'yes', label: '천자를 맞이한다' }, { k: 'no', label: '천자는 짐이 될 뿐이다' }] : null });
      if (ch === 'no') return;
      const cap = cityN('허창').f === c.f ? cityN('허창') : cityN('낙양');
      cap.gold += 1500; cap.food += 8000;
      for (const x of G.cities) if (x.f === c.f) x.order = Math.min(100, x.order + 10);
      c.fame += 20; G.emperor = c.f;
      for (const f of G.factions) if (f.alive && f.id !== c.f) addRel(c.f, f.id, -5);
      logMsg(`${eun(c.name)} 천자를 ${cap.name}에 모셨습니다`, 'big');
    },
  },

  // ── 관도대전
  {
    id: 'guandu',
    cond: () => { const c = rulerNamed('조조'), y = rulerNamed('원소'); return c && y && G.year >= 199 && facAdj(c.f, y.f); },
    async run() {
      const c = rulerNamed('조조'), y = rulerNamed('원소'), hy = byName('허유');
      delete G.ally[relKey(c.f, y.f)]; G.rel[relKey(c.f, y.f)] = 0;
      addFocus(c.f, y.f, 30); addFocus(y.f, c.f, 30);
      const lines = [
        [null, '하북을 손에 넣은 원소가 대군을 일으켜 남쪽으로 내려온다. 조조는 관도에서 이를 막는다.'],
        [y, '조조 따위가 천자를 끼고 거들먹거리는구나. 단숨에 짓밟아 주마!'],
      ];
      let ch = 'defect';
      if (isP(y) && onIn(hy, y.f)) {
        ch = await scene({ title: '관도대전', involved: true, lines: [...lines, [hy, '주공, 조조의 본진 허도가 비었습니다. 날랜 군사로 허도를 치소서!']], options: [{ k: 'defect', label: '허유의 말을 물리친다' }, { k: 'heed', label: '허유의 계책을 받아들인다' }] });
      } else {
        await scene({ title: '관도대전', involved: isP(c) || onIn(me(), c.f) || onIn(me(), y.f), lines });
      }
      const ycs = G.cities.filter(x => x.f === y.f && ADJ[x.id].some(i => G.cities[i].f === c.f)).sort((a, b) => b.food - a.food);
      if (ch === 'heed') {
        const ccs = G.cities.filter(x => x.f === c.f && ADJ[x.id].some(i => G.cities[i].f === y.f));
        for (const x of ccs) { x.troops = Math.round(x.troops * .85); x.order = Math.max(0, x.order - 10); }
        hy.loy = 100;
        await scene({ title: '관도대전', involved: true, lines: [[null, '원소군의 기습에 조조의 후방이 흔들렸다.']] });
        return;
      }
      if (onIn(hy, y.f) && !isP(hy)) {
        const dest = G.cities.find(x => x.f === c.f && ADJ[x.id].some(i => G.cities[i].f === y.f)) || G.cities.find(x => x.f === c.f);
        joinFaction(hy, c.f, dest.id);
      }
      if (ycs[0]) { ycs[0].food = Math.round(ycs[0].food * .35); for (const x of ycs) x.troops = Math.round(x.troops * .9); }
      await scene({ title: '오소 습격', involved: isP(c) || isP(y) || onIn(me(), c.f) || onIn(me(), y.f), lines: [
        [onIn(hy, c.f) ? hy : null, '원소의 군량은 모두 오소에 쌓여 있소. 그곳만 불태우면 원소군은 사흘을 못 버팁니다.', '원소 진영에서 넘어온 자가 군량이 오소에 쌓여 있다고 알려 왔다.'],
        [c, '하하, 자원(허유)이 왔으니 일은 끝났다! 내가 직접 오소를 치겠다.'],
        [null, `오소의 군량 창고가 불길에 휩싸였다. ${ycs[0] ? ycs[0].name + '의 쌀이 바닥나고 ' : ''}원소군의 사기가 꺾였다.`],
      ] });
      logMsg('관도에서 조조가 오소의 군량을 불태웠습니다', 'big');
    },
  },

  // ── 서서의 천거
  {
    id: 'xushu',
    cond: () => { const l = rulerNamed('유비'), x = byName('서서'); if (!l || !x || x.st !== 'ronin') return false; const near = G.cities.some(c => c.f === l.f && (c.id === x.city || ADJ[c.id].includes(x.city))); return (G.year >= 195 && near) || G.year >= 200; },
    async run() {
      const l = rulerNamed('유비'), x = byName('서서');
      const ch = await scene({ title: '서서', involved: isP(l) || isP(x) || onIn(me(), l.f), lines: [
        [null, '저잣거리에서 한 선비가 노래를 부른다. "어진 임금은 선비를 구하는데, 선비는 밝은 주인을 모르는구나."'],
        [l, '그대의 노래에 뜻이 있구려. 나와 함께 백성을 구하지 않겠소?'],
        [x, '단복이라 불러 주십시오. 미력하나마 사군을 돕겠습니다.'],
      ], options: isP(x) ? [{ k: 'yes', label: '유비를 섬긴다' }, { k: 'no', label: '좀 더 지켜본다' }] : null });
      if (ch === 'no') return;
      joinFaction(x, l.f, l.city); x.loy = 95;
      logMsg(`${eun(x.name)} 유비를 섬기게 되었습니다`, 'big');
    },
  },

  // ── 삼고초려
  {
    id: 'three_visits',
    cond: () => { const l = rulerNamed('유비'), z = byName('제갈량'); return l && z && z.st === 'ronin' && G.year >= 200 && (G.ev.xushu || G.year >= 203); },
    async run() {
      const l = rulerNamed('유비'), z = byName('제갈량'), x = byName('서서'), gy = byName('관우'), zf = byName('장비');
      const sx = onIn(x, l.f) ? x : null;
      await scene({ title: '와룡', involved: isP(l) || isP(z) || onIn(me(), l.f), lines: [
        [sx, '융중에 와룡이라 불리는 제갈공명이 있습니다. 그는 불러서 올 사람이 아니니, 사군께서 몸소 찾아가셔야 합니다.', '수경 선생 사마휘가 말한다. "복룡과 봉추, 둘 중 하나만 얻어도 천하를 평정할 수 있소. 복룡은 융중의 제갈공명이오."'],
        [l, '내가 직접 찾아가겠소.'],
      ] });
      if (isP(z)) {
        const c = await scene({ title: '삼고초려', involved: true, lines: [[null, '눈보라를 뚫고 세 번째로 찾아온 유비가 섬돌 아래에서 공명이 낮잠에서 깨기를 기다린다.']], options: [{ k: 'yes', label: '유비를 따른다' }, { k: 'no', label: '초야에 남는다' }] });
        if (c === 'no') { l.fame += 5; return; }
      } else if (isP(l)) {
        const v1 = await scene({ title: '첫 번째 방문', involved: true, lines: [[null, '융중 초가집. 동자가 문을 연다. "선생님은 아침 일찍 나가셨습니다. 언제 돌아오실지 모릅니다."'], [onIn(zf, l.f) ? zf : null, '형님, 촌사람 하나 때문에 이게 무슨 고생입니까. 돌아갑시다!', '따라온 이들이 투덜거린다.']], options: [{ k: 'again', label: '날을 잡아 다시 찾아간다' }, { k: 'stop', label: '그만둔다' }] });
        if (v1 === 'stop') return;
        const v2 = await scene({ title: '두 번째 방문', involved: true, lines: [[null, '한겨울, 눈보라를 뚫고 다시 찾아갔으나 공명은 벗과 함께 놀러 나가고 없었다. 유비는 글을 남기고 돌아선다.'], [onIn(gy, l.f) ? gy : null, '형님, 두 번이나 찾아갔으면 예는 다한 것입니다. 이름만 높은 자가 아닐까 걱정입니다.', '따르는 이들은 이름만 높은 선비가 아니냐며 고개를 젓는다.']], options: [{ k: 'again', label: '봄이 오면 세 번째로 찾아간다' }, { k: 'stop', label: '그만둔다' }] });
        if (v2 === 'stop') return;
      }
      await scene({ title: '삼고초려', involved: isP(l) || isP(z) || onIn(me(), l.f), lines: [
        [null, '세 번째 방문. 낮잠을 자는 공명을 깨우지 않고, 유비는 섬돌 아래에서 한나절을 서서 기다렸다.'],
        [z, '조조는 이미 백만 대군을 거느리고 천자를 끼고 있으니 다툴 수 없습니다. 손권은 강동을 삼대째 다스려 백성이 따르니 도울지언정 칠 수 없습니다. 형주와 익주를 차지하여 솥발처럼 셋으로 나누어 선 뒤에야 중원을 도모할 수 있습니다.'],
        [l, '선생의 말씀에 눈앞의 구름이 걷혔습니다. 부디 저를 도와주십시오.'],
        [z, '장군께서 이토록 마음을 다하시니, 견마의 수고를 아끼지 않겠습니다.'],
      ] });
      joinFaction(z, l.f, l.city); z.loy = 100; z.tag = l.tag || z.tag;
      l.fame += 10;
      logMsg(`${eun(z.name)} 삼고초려 끝에 유비를 섬기게 되었습니다 (천하삼분지계)`, 'big');
    },
  },
// ── 반동탁 연합: 시작할 때 동맹 1년, 동탁을 함께 침
  {
    id: 'coalition',
    cond: () => mIdx() <= 3 && !!rulerNamed('동탁') && !!rulerNamed('원소'),
    async run() {
      const d = rulerNamed('동탁'), y = rulerNamed('원소'), c = byName('조조');
      const keys = ['ys', 'cc', 'sj', 'ysh', 'hf', 'kr', 'gz', 'tq'];
      const mem = G.factions.filter(f => f.alive && keys.includes(f.key)).map(f => f.id);
      for (const a of mem) { for (const b of mem) if (a < b) makeAllyFor(a, b, 12); addFocus(a, d.f, 12); addRel(a, d.f, -30); }
      await scene({ title: '반동탁 연합', involved: mem.includes(me()?.f) || onIn(me(), d.f), lines: [
        [null, '동관에 격문이 나붙었다. 역적 동탁을 치자는 조조의 거짓 조서에 열여덟 제후가 호응한다.'],
        [onIn(c, c?.f) ? c : null, '천하의 제후들이여, 함께 역적을 쳐 한실을 바로 세웁시다!', '격문을 띄운 이는 진류의 조조였다.'],
        [y, '사세삼공의 이름을 걸고, 이 원본초가 맹주를 맡겠소.'],
        [null, `${mem.map(f => G.factions[f].name).join('·')}의 군이 동맹을 맺었다 (1년). 동탁은 사수관과 호뢰관에서 이를 막는다.`],
      ] });
      logMsg('반동탁 연합이 결성되었습니다 (맹주 원소, 1년 동맹)', 'big');
    },
  },

  // ── 원소, 기주를 얻다
  {
    id: 'jizhou',
    cond: () => { const y = rulerNamed('원소'), H = G.factions.find(f => f.key === 'hf' && f.alive); return y && H && mIdx() >= 16 && !isP(G.officers[H.ruler]) && facAdj(y.f, H.id); },
    async run() {
      const y = rulerNamed('원소'), H = G.factions.find(f => f.key === 'hf' && f.alive), h = G.officers[H.ruler], fg = byName('봉기'), from = H.id;
      await scene({ title: '기주 양도', involved: isP(y) || onIn(me(), from) || onIn(me(), y.f), lines: [
        [onIn(fg, y.f) ? fg : null, '공손찬을 꾀어 기주를 치게 하면 한복은 겁을 먹고 주공께 기주를 바칠 것입니다.', '원소의 모사들은 공손찬을 부추겨 한복을 겁주었다.'],
        [h, h.name === '한복' ? '나는 본래 원씨의 옛 관리였소. 재주도 원본초만 못하니 기주를 그에게 맡기겠소.' : '기주를 지킬 힘이 없으니, 원본초 공께 의탁하겠소.'],
        [null, '저수와 심배 같은 기주의 인재들이 원소 아래로 들어갔다. 하북의 패자가 태어나는 순간이었다.'],
      ] });
      mergeFaction(from, y.f);
      if (HIST()) for (const c of citiesOf(y.f)) { c.troops = Math.min(troopMax(c), c.troops + 2500); c.gold += 400; }
      logMsg('한복이 기주를 원소에게 넘겼습니다', 'big');
    },
  },

  // ── (역사를 따라) 연환계가 어긋나도 동탁은 192년에 쓰러짐
  {
    id: 'dong_death',
    cond: () => HIST() && mIdx() >= 31 && !!rulerNamed('동탁') && !isP(rulerNamed('동탁')) && !isP(byName('여포')),
    async run() {
      const d = rulerNamed('동탁'), wy = byName('왕윤');
      G.ev.chain = true;
      await scene({ title: '동탁의 최후', involved: onIn(me(), d.f), lines: [
        [onIn(wy, d.f) ? wy : null, '역적의 명은 오늘로 끝이다.', '사도 왕윤이 은밀히 무사들을 모았다.'],
        [null, '입궐하던 동탁은 궁문 앞에서 숨어 있던 무사들의 창에 찔려 쓰러졌다. 장안의 백성들은 그의 배꼽에 심지를 꽂아 불을 밝혔다고 한다.'],
      ] });
      killOfficer(d, `${eun(d.name)} 장안에서 암살당했습니다`);
    },
  },

  // ── 조숭 피살: 조조가 도겸을 원수로 삼다
  {
    id: 'cao_song',
    cond: () => { const c = rulerNamed('조조'), t = rulerNamed('도겸'); return c && t && G.year >= 193 && G.month >= 6; },
    async run() {
      const c = rulerNamed('조조'), t = rulerNamed('도겸');
      const ch = await scene({ title: '조숭 피살', involved: isP(c) || isP(t) || onIn(me(), c.f) || onIn(me(), t.f), lines: [
        [null, '낭야에서 피난하던 조조의 아버지 조숭 일가가 서주를 지나다 도겸의 부하 장개에게 몰살당했다.'],
        [c, '도겸, 이 원수는 서주 땅을 피로 씻어서라도 갚겠다!'],
      ], options: isP(c) ? [{ k: 'war', label: '서주를 친다 (도겸군을 숙적으로)' }, { k: 'calm', label: '분을 삭이고 때를 기다린다' }] : null });
      if (ch === 'calm') { c.fame += 5; return; }
      delete G.ally[relKey(c.f, t.f)]; G.rel[relKey(c.f, t.f)] = 0;
      addFocus(c.f, t.f, 24, '조조가 아버지의 원수를 갚으려 서주를 노립니다');
    },
  },

  // ── 이각·곽사의 난
  {
    id: 'li_guo',
    cond: () => { const F = G.factions.find(f => f.key === 'dz' && f.alive); if (!F || G.year < 195) return false; const r = G.officers[F.ruler]; const other = r.name === '이각' ? byName('곽사') : r.name === '곽사' ? byName('이각') : null; return !!other && onIn(other, F.id) && citiesOf(F.id).length >= 2 && !isP(other); },
    async run() {
      const F = G.factions.find(f => f.key === 'dz' && f.alive), r = G.officers[F.ruler];
      const other = r.name === '이각' ? byName('곽사') : byName('이각');
      await scene({ title: '이각·곽사의 난', involved: onIn(me(), F.id), lines: [
        [null, '동탁이 죽은 뒤 장안을 차지한 이각과 곽사는 서로를 의심하기 시작했다.'],
        [other, `${r.name}, 네가 천자를 끼고 홀로 권세를 누리려 하는구나!`],
        [null, '장안 거리에서 두 사람의 군사가 맞붙었고, 그 틈에 천자는 낙양으로 몸을 피했다.'],
      ] });
      let c = G.cities.filter(x => x.f === F.id && x.id !== r.city).sort((a, b) => b.troops - a.troops)[0];
      if (!c) return;
      const oc = G.cities[other.city]; if (oc.gov === other.id) oc.gov = -1; other.city = c.id;
      const NF = splitOff(other, c, F.id, []);
      addFocus(NF.id, F.id, 24); addFocus(F.id, NF.id, 24);
      logMsg(`${eun(other.name)} ${r.name}와 갈라서서 ${c.name}에서 따로 섰습니다`, 'big');
    },
  },

  // ── 원술 칭제
  {
    id: 'yuan_emperor',
    cond: () => !!rulerNamed('원술') && G.year >= 197,
    async run() {
      const y = rulerNamed('원술'), F = G.factions[y.f];
      const ch = await scene({ title: '원술 칭제', involved: isP(y) || onIn(me(), y.f) || G.cities.some(c => c.f === me()?.f && ADJ[c.id].some(i => G.cities[i].f === y.f)), lines: [
        [null, '수춘에서 원술이 스스로 황제라 일컫고 나라 이름을 중(仲)이라 했다.'],
        [y, '한의 운은 다했다. 옥새와 하늘의 뜻이 내게 있으니, 짐이 천명을 받는다!'],
        [null, '천하의 제후들이 한목소리로 원술을 역적이라 꾸짖었다.'],
      ], options: isP(y) ? [{ k: 'yes', label: '황제를 칭한다 (금 3,000, 모두가 적이 됨)' }, { k: 'no', label: '아직 때가 아니다' }] : null });
      if (ch === 'no') return;
      const cap = G.cities[y.city]; if (cap.f === y.f) cap.gold += 3000;
      for (const f of G.factions) if (f.alive && f.id !== y.f) { delete G.ally[relKey(f.id, y.f)]; addRel(f.id, y.f, -40); if (facAdj(f.id, y.f)) addFocus(f.id, y.f, 24); }
      for (const o of factionOfficers(y.f)) if (!isRuler(o) && !(o.tag && o.tag === y.tag)) o.loy = Math.max(0, o.loy - 12);
      y.fame -= 10;
      logMsg('원술이 황제를 칭했습니다. 천하가 그를 역적이라 부릅니다', 'big');
    },
  },

  // ── 하비성: 조조가 여포를 노림
  {
    id: 'xiapi',
    cond: () => { const c = rulerNamed('조조'), l = rulerNamed('여포'); return c && l && G.year >= 197 && G.month >= 9 && facAdj(c.f, l.f); },
    async run() {
      const c = rulerNamed('조조'), l = rulerNamed('여포'), cg = byName('진궁');
      await scene({ title: '하비 공방', involved: isP(c) || isP(l) || onIn(me(), c.f) || onIn(me(), l.f), lines: [
        [c, '여포는 승냥이 같은 자다. 지금 없애지 않으면 뒷날 큰 화가 된다.'],
        [onIn(cg, l.f) ? cg : null, '장군, 성 밖에 진을 쳐 기각지세를 이루소서. 성 안에만 있으면 굶어 죽습니다.', '여포의 모사들은 성 밖으로 나가 싸우자고 간했지만 여포는 듣지 않았다.'],
        [l, '내게는 적토마와 방천화극이 있다. 무엇이 두려우랴!'],
      ] });
      delete G.ally[relKey(c.f, l.f)];
      addFocus(c.f, l.f, 24, '조조가 여포를 치러 나섭니다');
    },
  },

  // ── 역경: 원소가 공손찬을 몰아붙임
  {
    id: 'yijing',
    cond: () => { const y = rulerNamed('원소'), g = rulerNamed('공손찬'); return y && g && G.year >= 198 && facAdj(y.f, g.f); },
    async run() {
      const y = rulerNamed('원소'), g = rulerNamed('공손찬');
      await scene({ title: '역경루', involved: isP(y) || isP(g) || onIn(me(), y.f) || onIn(me(), g.f), lines: [
        [g, '역경에 높은 누각을 쌓고 곡식 삼백만 섬을 쌓아 두었다. 천하가 어지러워도 여기서 버티면 그만이다.'],
        [null, '공손찬이 성에 틀어박히자 원소는 땅굴을 파서 누각을 무너뜨리기로 했다.'],
      ] });
      addFocus(y.f, g.f, 30, '원소가 공손찬을 끝장내려 합니다');
      if (HIST()) for (const c of citiesOf(y.f).filter(c => ADJ[c.id].some(i => G.cities[i].f === g.f))) { c.troops = Math.min(troopMax(c), c.troops + 6000); c.train = Math.max(c.train, 75); }
      for (const c of citiesOf(g.f)) c.wall = Math.min(c.wallMax, c.wall + 150);
    },
  },

  // ── 손책의 죽음
  {
    id: 'sun_ce_death',
    cond: () => { const s = rulerNamed('손책'); return HIST() && s && !isP(s) && G.year >= 200 && G.month >= 4; },
    async run() {
      const s = rulerNamed('손책'), q = byName('손권');
      await scene({ title: '소패왕의 죽음', involved: onIn(me(), s.f), lines: [
        [null, '사냥을 나간 손책이 허공의 식객들이 쏜 화살에 얼굴을 맞았다.'],
        [s, `중원의 군사를 이끌고 천하와 다투는 일은 네가 나만 못하다. 그러나 어진 이를 들어 강동을 지키는 일은 내가 너만 못하다. ${onIn(q, s.f) ? '중모야, 강동을 부탁한다.' : ''}`],
      ] });
      killOfficer(s, `${eun(s.name)} 자객의 화살에 맞은 상처로 세상을 떠났습니다 (향년 ${age(s)}세)`);
    },
  },

];

async function runEvents() {
  G.ev = G.ev || {};
  for (const ev of EVENTS) {
    if (G.ev[ev.id] || G.over) continue;
    let ok = false;
    try { ok = !!ev.cond(); } catch (e) { console.error('사건 조건 오류', ev.id, e); }
    if (!ok) continue;
    G.ev[ev.id] = true;
    try { await ev.run(); } catch (e) { console.error('사건 오류', ev.id, e); }
    checkFactions(); assignGovs();
    if (UI.q.length) await UI.flush();
  }
}
