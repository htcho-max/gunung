// ===== 역사 사건 3: 합비 ~ 진의 통일 (215~280) =====
const facK = k => G.factions.find(f => f.key === k && f.alive) || null;
const rK = k => { const F = facK(k); return F ? G.officers[F.ruler] : null; };
const anyP = (...Fs) => Fs.some(F => F && pOf(F.id));
const after = (id, months) => G.evAt && G.evAt[id] != null && mIdx() >= G.evAt[id] + months;
function setTitle(F, t) { if (F) { F.title = t; F.rank = Math.max(F.rank || 0, rankFromTitle(t)); F.rankAt = mIdx(); F.nation = t.replace(/ ?(황제|왕|공)$/, '').replace(/ \(.*\)$/, '') || F.nation; logMsg(`${F.name}이(가) ${t}에 올랐습니다`, 'big'); } }
const kill = (o, why) => { if (o && o.st !== 'dead' && !isP(o)) killOfficer(o, why); };

EVENTS.push(
  // ── 청주병 (192): 조조가 황건의 무리를 거두어 정예로 삼음
  {
    id: 'qingzhou',
    cond: () => { const c = rulerNamed('조조'); return HIST() && c && G.year >= 192 && G.year <= 195 && citiesOf(c.f).length >= 1; },
    async run() {
      const c = rulerNamed('조조'), cs = citiesOf(c.f);
      await scene({ title: '청주병', involved: pOf(c.f), lines: [[null, '청주의 황건 무리 백만이 연주로 몰려들었다. 조조는 이들을 쳐서 항복을 받아 내고, 날랜 자를 골라 청주병이라 이름 붙였다.'], [c, '이들이면 천하를 다툴 만하다. 남은 이들에게는 땅을 나눠 주어 농사를 짓게 하라.']] });
      for (const x of cs) { x.troops = Math.min(troopMax(x), x.troops + Math.round(12000 / cs.length)); x.pop += 20000; }
      c.fame += 10;
    },
  },
  // ── 합비 전투 (215)
  {
    id: 'hefei',
    cond: () => { const W = facK('cc'), S = facK('sj'), zl = byName('장료'), h = cityN('수춘'); return HIST() && W && S && G.year >= 215 && onIn(zl, W.id) && h.f === W.id && ADJ[h.id].some(i => G.cities[i].f === S.id); },
    async run() {
      const W = facK('cc'), S = facK('sj'), zl = byName('장료'), lt = byName('능통'), q = rK('sj'), h = cityN('수춘');
      await scene({ title: '합비 — 장료, 강동을 울리다', involved: anyP(W, S), lines: [
        [null, '손권이 십만 대군으로 합비를 에워쌌다. 성안의 군사는 겨우 칠천.'],
        [zl, '적이 자리 잡기 전에 꺾어야 한다. 나를 따를 자는 앞으로!'],
        [null, '장료가 팔백 결사대를 이끌고 손권의 본진으로 뛰어들어 장수 둘을 베었다. 손권은 무덤 위로 달아나 겨우 몸을 피했다.'],
        [onIn(lt, S.id) ? lt : q, '주공, 어서 소요진 다리를 건너십시오! 이 몸이 뒤를 막겠습니다!'],
        [null, '그 뒤로 강동에서는 우는 아이도 "장료가 온다" 하면 울음을 그쳤다고 한다.'],
      ] });
      zl.fame += 15; if (onIn(lt, S.id)) lt.fame += 5;
      h.troops = Math.min(troopMax(h), h.troops + 3000);
      for (const i of ADJ[h.id]) { const c = G.cities[i]; if (c.f === S.id) c.troops = Math.round(c.troops * .8); }
      logMsg('합비에서 장료가 손권의 대군을 물리쳤습니다', 'big');
    },
  },
  // ── 정군산 (219)
  {
    id: 'dingjun',
    cond: () => { const L = facK('lb'), W = facK('cc'), hz = byName('황충'), hy = byName('하후연'), hj = cityN('한중'); return HIST() && L && W && G.year >= 218 && onIn(hz, L.id) && onIn(hy, W.id) && hj.f === W.id && ADJ[hj.id].some(i => G.cities[i].f === L.id); },
    async run() {
      const L = facK('lb'), W = facK('cc'), hz = byName('황충'), hy = byName('하후연'), fz = byName('법정'), hj = cityN('한중');
      await scene({ title: '정군산', involved: anyP(L, W), lines: [
        [onIn(fz, L.id) ? fz : null, '적이 녹각을 고치러 흩어졌습니다. 지금이 칠 때입니다!', '산 위에서 깃발이 흔들렸다.'],
        [hz, '늙었다고 얕보지 마라! 북을 울려라!'],
        [null, '황충이 산 위에서 내리꽂듯 돌격해 하후연을 단칼에 베었다. 위군은 무너졌고 한중은 유비의 손에 들어왔다.'],
      ] });
      kill(hy, '하후연이 정군산에서 황충에게 목이 베였습니다');
      handCity(hj, L.id, 12000); moveOfficer(hz, hj); hz.fame += 15;
      logMsg('정군산에서 황충이 하후연을 베고 한중을 얻었습니다', 'big');
    },
  },
  // ── 한중왕 (219)
  {
    id: 'hanzhong_king',
    cond: () => { const L = facK('lb'), lb = rulerNamed('유비'); return HIST() && L && lb && lb.f === L.id && cityN('한중').f === L.id && cityN('성도').f === L.id; },
    async run() {
      const L = facK('lb'), lb = rulerNamed('유비'), zg = byName('제갈량');
      await scene({ title: '한중왕', involved: pOf(L.id), lines: [
        [onIn(zg, L.id) ? zg : null, '조조가 위왕을 칭했으니, 주공께서도 왕위에 올라 한실의 깃발을 높이 드셔야 합니다.', '신하들이 유비에게 왕위에 오르기를 청했다.'],
        [lb, '…천하의 뜻이 그렇다면 따르겠소. 다만 한실을 다시 일으키는 일을 잊지 않으리다.'],
      ] });
      setTitle(L, '한중왕'); lb.fame += 10;
      for (const o of factionOfficers(L.id)) if (o !== lb) o.loy = Math.min(100, o.loy + 5);
    },
  },
  // ── 관우, 번성을 치다 (219)
  {
    id: 'fan_castle',
    cond: () => { const L = facK('lb'), W = facK('cc'), gy = byName('관우'); return HIST() && L && W && G.year >= 219 && onIn(gy, L.id) && cityN('강릉').f === L.id && cityN('양양').f === W.id; },
    async run() {
      const L = facK('lb'), W = facK('cc'), S = facK('sj'), gy = byName('관우'), yj = byName('우금'), pd = byName('방덕'), sm = byName('사마의'), xy = cityN('양양');
      moveOfficer(gy, cityN('강릉'));
      const ch = await scene({ title: '위진화하 — 물이 일곱 군을 삼키다', involved: anyP(L, W), lines: [
        [gy, '번성을 깨뜨리고 허도로 나아가겠다!'],
        [null, '가을 장마에 한수가 넘쳤다. 관우는 배를 몰아 물에 잠긴 우금의 일곱 군을 사로잡았고, 끝까지 버틴 방덕을 베었다.'],
        [onIn(pd, W.id) ? pd : null, '나는 위의 귀신이 될지언정 적의 장수는 되지 않겠다!', null],
      ].filter(x => x[0] || x[2] !== null), options: isP(gy) || isP(rulerOf(L.id)) ? [{ k: 'go', label: '번성을 친다 (역사대로)' }, { k: 'hold', label: '형주를 굳게 지킨다', danger: false }] : null });
      if (ch === 'hold') { logMsg('관우가 북진을 미루고 형주를 지켰습니다'); return; }
      if (onIn(yj, W.id) && !isP(yj)) { joinFaction(yj, L.id, cityN('강릉').id); yj.loy = 15; }
      kill(pd, '방덕이 번성에서 관우에게 목이 베였습니다');
      xy.troops = Math.round(xy.troops * .5); gy.fame += 20;
      await scene({ title: '위진화하', involved: anyP(W, S), lines: [
        [rulerOf(W.id), '관우의 위세가 하늘을 찌르는구나. 도읍을 옮겨야 하는가…'],
        [onIn(sm, W.id) ? sm : null, '손권은 관우가 커지는 것을 결코 바라지 않습니다. 강남을 떼어 주겠다 하고 그 뒤를 치게 하소서.', '위의 모사들은 손권과 손잡고 관우의 뒤를 치자고 했다.'],
      ] });
      if (S) { makeAllyFor(W.id, S.id, 24); addFocus(S.id, L.id, 18); }
      logMsg('관우가 번성에서 우금을 사로잡고 방덕을 베어 천하를 뒤흔들었습니다', 'big');
    },
  },
  // ── 맥성: 관우의 최후 (219~220)
  {
    id: 'maicheng',
    cond: () => { const L = facK('lb'), S = facK('sj'), jl = cityN('강릉'); return HIST() && L && S && G.ev.fan_castle && after('fan_castle', 2) && jl.f === L.id && ADJ[jl.id].some(i => G.cities[i].f === S.id) && (onIn(byName('여몽'), S.id) || onIn(byName('육손'), S.id)); },
    async run() {
      const L = facK('lb'), S = facK('sj'), gy = byName('관우'), gp = byName('관평'), ym = byName('여몽'), mf = byName('미방'), jl = cityN('강릉');
      let ch = 'stand';
      if (isP(gy)) ch = await scene({ title: '맥성', involved: true, lines: [[null, '흰옷을 입은 오군이 장사꾼으로 꾸미고 강을 건너 강릉을 빼앗았다. 관우는 작은 맥성에 갇혔다.']], options: [{ k: 'stand', label: '끝까지 싸운다 (역사대로)' }, { k: 'flee', label: '샛길로 익주를 향해 빠져나간다' }] });
      await scene({ title: '백의도강', involved: anyP(L, S), lines: [
        [onIn(ym, S.id) ? ym : null, '병사들은 모두 흰옷을 입고 장사꾼처럼 꾸며라. 봉화대를 소리 없이 넘는다.', '오군이 흰옷을 입고 몰래 강을 건넜다.'],
        [onIn(mf, L.id) ? mf : null, '…성문을 열어라. 오에 항복하겠다.', null],
        [gy, ch === 'flee' ? '여기서 죽을 수는 없다. 익주로 가서 형님을 뵙겠다!' : '옥은 부서져도 그 흰빛을 잃지 않고, 대나무는 타도 그 마디를 잃지 않는다!'],
      ].filter(x => x[0] || x[2] !== null) });
      handCity(jl, S.id, 10000);
      for (const n of ['무릉', '영릉']) { const c = cityN(n); if (c.f === L.id && ADJ[c.id].some(i => G.cities[i].f === S.id)) handCity(c, S.id, Math.round(c.troops * .6)); }
      if (onIn(mf, L.id) && !isP(mf)) joinFaction(mf, S.id, jl.id);
      if (ch === 'flee') { const cd = cityN('성도'); if (cd.f === L.id) { gy.city = cd.id; delete gy.travel; } gy.fame -= 5; }
      else {
        if (G.items && G.items.jeokto && G.items.jeokto.holder === gy.id) { const pz = byName('반장'); passItem('jeokto', onIn(pz, S.id) ? pz : rulerOf(S.id)); }
        if (G.items && G.items.cheongnyong && G.items.cheongnyong.holder === gy.id) { const pz = byName('반장'); passItem('cheongnyong', onIn(pz, S.id) ? pz : rulerOf(S.id)); }
        kill(gy, '관우가 맥성에서 사로잡혀 목숨을 잃었습니다'); kill(gp, '관평이 아버지와 함께 목숨을 잃었습니다');
      }
      addFocus(L.id, S.id, 36, '유비가 관우의 원수를 갚으려 합니다');
      logMsg('오가 형주를 빼앗았습니다', 'big');
    },
  },
  // ── 조조의 죽음과 위 건국 (220)
  {
    id: 'wei_found',
    cond: () => { const W = facK('cc'), cp = rulerNamed('조비'); return HIST() && W && cp && cp.f === W.id && G.year >= 220 && byName('조조').st === 'dead'; },
    async run() {
      const W = facK('cc'), cp = rulerNamed('조비');
      await scene({ title: '한의 선양, 위의 건국', involved: pOf(W.id), lines: [
        [null, '천하의 간웅 조조가 낙양에서 숨을 거두었다. 아들 조비는 헌제에게서 황제의 자리를 물려받았다. 사백 년 한 왕조가 끝났다.'],
        [cp, '하늘의 뜻에 따라 위를 세우노라. 연호를 황초라 하겠다.'],
      ] });
      setTitle(W, '위 황제'); cp.fame += 10; if (G.emp) G.emp.alive = false;
    },
  },
  {
    id: 'shu_found',
    cond: () => { const L = facK('lb'), lb = rulerNamed('유비'); return HIST() && G.ev.wei_found && L && lb && lb.f === L.id && G.year >= 221; },
    async run() {
      const L = facK('lb'), lb = rulerNamed('유비');
      await scene({ title: '촉한의 건국', involved: pOf(L.id), lines: [[null, '헌제가 죽었다는 소문이 성도에 닿았다. 신하들은 한의 대를 잇기를 청했다.'], [lb, '한실의 종친으로서 한의 이름을 지키겠다. 성도에서 황제의 자리에 오르노라.']] });
      setTitle(L, '촉한 황제');
    },
  },
  {
    id: 'wu_king',
    cond: () => { const S = facK('sj'), q = rulerNamed('손권'); return HIST() && G.ev.wei_found && S && q && q.f === S.id && G.year >= 221; },
    async run() { const S = facK('sj'); await scene({ title: '오왕', involved: pOf(S.id), lines: [[rulerOf(S.id), '위의 책봉을 받아 오왕이 되겠다. 지금은 몸을 낮출 때다.']] }); setTitle(S, '오왕'); },
  },
  {
    id: 'wu_found',
    cond: () => { const S = facK('sj'), q = rulerNamed('손권'); return HIST() && S && q && q.f === S.id && G.year >= 229; },
    async run() { const S = facK('sj'); await scene({ title: '오의 칭제', involved: pOf(S.id), lines: [[rulerOf(S.id), '하늘에 셋의 해가 있을 수는 없으나, 강동도 더는 남의 아래에 있지 않겠다. 무창에서 황제에 오르노라.']] }); setTitle(S, '오 황제'); },
  },
  // ── 장비의 죽음 (221)
  {
    id: 'zhangfei_death',
    cond: () => { const L = facK('lb'), zf = byName('장비'); return HIST() && L && onIn(zf, L.id) && !isP(zf) && G.ev.maicheng && G.year >= 221; },
    async run() {
      const zf = byName('장비'), L = facK('lb');
      await scene({ title: '장비의 죽음', involved: pOf(L.id), lines: [[zf, '사흘 안에 흰 갑옷과 흰 깃발을 마련하라! 형님의 원수를 갚으러 간다!'], [null, '매질을 견디다 못한 부하 범강과 장달이 술에 취해 잠든 장비의 목을 베어 오로 달아났다.']] });
      kill(zf, '장비가 부하의 손에 목숨을 잃었습니다');
    },
  },
  // ── 이릉대전 (222)
  {
    id: 'yiling',
    cond: () => { const L = facK('lb'), S = facK('sj'), lb = rulerNamed('유비'); return HIST() && L && S && lb && lb.f === L.id && G.ev.maicheng && after('maicheng', 12) && G.year >= 221 && (G.ev.shu_found || G.year >= 222) && facAdj(L.id, S.id) && onIn(byName('육손'), S.id); },
    async run() {
      const L = facK('lb'), S = facK('sj'), W = facK('cc'), lb = rulerNamed('유비'), ls = byName('육손'), zy = byName('조운'), hq = byName('황권'), ml = byName('마량');
      const ch = await scene({ title: '이릉 — 칠백 리의 영채', involved: anyP(L, S), lines: [
        [onIn(zy, L.id) ? zy : null, '나라의 원수는 조조이지 손권이 아닙니다. 위를 먼저 치셔야 합니다.', '신하들은 오를 치는 것을 말렸다.'],
        [lb, '운장과 익덕의 원수를 갚지 않고서 어찌 형제라 하겠는가!'],
      ].filter(x => x[0] || x[2] !== null), options: isP(lb) ? [{ k: 'go', label: '오를 친다 (역사대로)' }, { k: 'stop', label: '원한을 삼키고 군사를 거둔다' }] : null });
      if (ch === 'stop') { lb.fame += 5; G.focus = (G.focus || []).filter(x => !(x.f === L.id && x.t === S.id)); logMsg('유비가 신하들의 말을 듣고 오 정벌을 거두었습니다', 'big'); return; }
      await scene({ title: '이릉 — 불타는 숲', involved: anyP(L, S), lines: [
        [null, '유비는 무더위를 피해 숲속에 칠백 리에 걸쳐 영채를 늘어세웠다. 오의 젊은 대도독 육손은 반년 동안 싸우지 않고 기다렸다.'],
        [ls, '저들이 지쳤다. 바람이 분다 — 모든 영채에 불을 놓아라!'],
        [null, '불길이 숲을 따라 번져 촉군의 영채 사십여 곳이 잿더미가 되었다. 유비는 겨우 백제성으로 달아났다.'],
      ] });
      for (const c of G.cities) if (c.f === L.id && ADJ[c.id].some(i => G.cities[i].f === S.id)) c.troops = Math.round(c.troops * .45);
      lb.die = Math.min(lb.die, Math.max(G.year + 1, 223));
      if (W && onIn(hq, L.id) && !isP(hq)) joinFaction(hq, W.id, G.factions[W.id].capital);
      kill(ml, '마량이 이릉에서 목숨을 잃었습니다');
      ls.fame += 25;
      G.focus = (G.focus || []).filter(x => !(x.f === L.id && x.t === S.id));
      logMsg('이릉에서 육손이 유비의 대군을 불살랐습니다', 'big');
    },
  },
  // ── 백제성 탁고 (223)
  {
    id: 'baidi',
    cond: () => { const L = facK('lb'), ls = rulerNamed('유선'); return HIST() && L && ls && ls.f === L.id && byName('유비').st === 'dead' && onIn(byName('제갈량'), L.id); },
    async run() {
      const L = facK('lb'), S = facK('sj'), zg = byName('제갈량'), dz = byName('등지');
      await scene({ title: '백제성의 유언', involved: pOf(L.id), lines: [
        [null, '병석의 유비가 제갈량의 손을 잡았다.'],
        [null, '"그대의 재주는 조비의 열 배이니 반드시 나라를 안정시키고 대업을 이룰 것이오. 아들이 도울 만하면 돕고, 그렇지 못하면 그대가 스스로 맡으시오."'],
        [zg, '신이 어찌 팔다리의 힘을 다해 충성을 바치지 않겠습니까. 죽을 때까지 그리하겠습니다.'],
        [onIn(dz, L.id) ? dz : null, '오와 다시 손을 잡아야 위를 막을 수 있습니다. 제가 사신으로 가겠습니다.', null],
      ].filter(x => x[0] || x[2] !== null) });
      zg.loy = 100;
      if (S) { makeAllyFor(L.id, S.id, 60); addRel(L.id, S.id, 40); }
    },
  },
  // ── 남만 정벌 (225)
  {
    id: 'nanman',
    cond: () => { const L = facK('lb'), mh = byName('맹획'); return HIST() && L && G.year >= 225 && onIn(byName('제갈량'), L.id) && cityN('건녕').f === L.id && live(mh) && !isP(mh) && mh.f !== L.id; },
    async run() {
      const L = facK('lb'), zg = byName('제갈량'), mh = byName('맹획'), jn = cityN('건녕');
      await scene({ title: '칠종칠금', involved: pOf(L.id), lines: [
        [zg, '남만을 칠 때는 성을 치기보다 마음을 치는 것이 으뜸입니다.'],
        [null, '제갈량은 남만의 왕 맹획을 일곱 번 사로잡고 일곱 번 풀어 주었다.'],
        [mh, '승상은 하늘의 위엄을 지니셨습니다. 남쪽 사람들은 다시는 배반하지 않겠습니다!'],
      ] });
      if (mh.st === 'on') leaveToRonin(mh);
      joinFaction(mh, L.id, jn.id); mh.loy = 100;
      jn.order = 100; jn.troops = Math.min(troopMax(jn), jn.troops + 5000); zg.fame += 10;
    },
  },
  // ── 출사표 (227)
  {
    id: 'northern',
    cond: () => { const L = facK('lb'), W = facK('cc'); return HIST() && L && W && G.year >= 227 && onIn(byName('제갈량'), L.id) && cityN('한중').f === L.id && facAdj(L.id, W.id); },
    async run() {
      const L = facK('lb'), W = facK('cc'), zg = byName('제갈량'), jw = byName('강유'), hj = cityN('한중');
      await scene({ title: '출사표', involved: anyP(L, W), lines: [
        [zg, '선제께서 창업하신 지 반도 못 되어 중도에 붕어하시고, 지금 천하는 셋으로 나뉘어 익주는 지쳐 있으니, 이는 참으로 나라가 살고 죽는 때입니다…'],
        [zg, '…신은 다만 몸을 굽혀 온 힘을 다하고, 죽은 뒤에야 그만둘 것입니다.'],
        [null, '제갈량이 한중에서 북쪽으로 군사를 일으켰다.'],
      ] });
      addFocus(L.id, W.id, 72, '제갈량의 북벌');
      hj.troops = Math.min(troopMax(hj), hj.troops + 8000);
      if (live(jw) && jw.f !== L.id && !isP(jw)) {
        await scene({ title: '천수의 기린아', involved: pOf(L.id), lines: [[zg, '천수에서 이런 인재를 얻다니! 내가 배운 것을 모두 그대에게 전하겠다.'], [jw, '승상을 모시고 한실을 위해 힘을 다하겠습니다.']] });
        if (jw.st === 'on') leaveToRonin(jw);
        joinFaction(jw, L.id, hj.id); jw.loy = 100;
      }
    },
  },
  // ── 가정 (228)
  {
    id: 'jieting',
    cond: () => { const L = facK('lb'), ms = byName('마속'); return HIST() && L && G.ev.northern && after('northern', 10) && onIn(ms, L.id) && !isP(ms); },
    async run() {
      const L = facK('lb'), ms = byName('마속'), wp = byName('왕평'), zg = byName('제갈량'), hj = cityN('한중');
      const ch = await scene({ title: '가정 — 읍참마속', involved: pOf(L.id), lines: [
        [onIn(wp, L.id) ? wp : null, '길목을 지켜야 합니다. 산 위에 진을 치면 물길이 끊깁니다!', '부장이 길목에 진을 치라고 말렸다.'],
        [ms, '병법에 높은 곳에 올라 아래를 내려다보면 기세가 대나무를 쪼개듯 한다 했다!'],
        [null, '위의 장합이 산을 에워싸 물길을 끊자 마속의 군은 무너졌다. 가정을 잃은 제갈량은 군사를 거둘 수밖에 없었다.'],
        [onIn(zg, L.id) ? zg : null, '군율을 바로 세우지 않으면 어찌 적을 이기겠는가…', null],
      ].filter(x => x[0] || x[2] !== null), options: isP(zg) || isP(rulerOf(L.id)) ? [{ k: 'cut', label: '눈물을 흘리며 마속을 벤다 (역사대로)' }, { k: 'spare', label: '마속을 살려 둔다' }] : null });
      hj.troops = Math.round(hj.troops * .7);
      if (ch === 'spare') { for (const o of factionOfficers(L.id)) if (o !== ms) o.loy = Math.max(0, o.loy - 5); logMsg('마속을 살려 두자 장수들이 수군거립니다'); return; }
      kill(ms, '마속이 군령을 어긴 죄로 처형되었습니다 (읍참마속)');
      for (const o of factionOfficers(L.id)) o.loy = Math.min(100, o.loy + 3);
    },
  },
  // ── 오장원 (234)
  {
    id: 'wuzhang',
    cond: () => { const L = facK('lb'), zg = byName('제갈량'); return HIST() && L && G.ev.northern && zg && zg.st === 'dead'; },
    async run() {
      const L = facK('lb'), W = facK('cc'), sm = byName('사마의'), wy = byName('위연'), md = byName('마대'), jw = byName('강유');
      await scene({ title: '오장원 — 별이 지다', involved: anyP(L, W), lines: [
        [null, '오장원의 진중에서 큰 별이 떨어졌다. 승상 제갈량이 숨을 거두었다.'],
        [null, '촉군이 물러나자 사마의가 뒤쫓았다. 그때 수레 위에 깃털 부채를 든 제갈량이 나타났다 — 나무로 깎은 상이었다.'],
        [live(sm) ? sm : null, '공명이 살아 있다! 물러나라!', null],
        [null, '사람들은 "죽은 공명이 산 중달을 쫓았다"고 말했다.'],
      ].filter(x => x[0] || x[2] !== null) });
      if (onIn(wy, L.id) && !isP(wy) && onIn(md, L.id)) {
        await scene({ title: '위연의 반란', involved: pOf(L.id), lines: [[wy, '승상이 없다고 군을 물리다니! 누가 감히 나를 죽일 수 있겠느냐!'], [md, '내가 너를 죽이겠다!'], [null, '승상이 남긴 계책대로 마대가 위연의 목을 베었다.']] });
        kill(wy, '위연이 반란을 꾀하다 마대에게 목이 베였습니다');
      }
      if (onIn(jw, L.id)) { jw.fame += 10; jw.loy = 100; }
    },
  },
  // ── 고평릉 정변 (249)
  {
    id: 'gaoping',
    cond: () => { const W = facK('cc'), sm = byName('사마의'); return HIST() && W && G.year >= 249 && onIn(sm, W.id) && !isRuler(sm) && !isP(rulerOf(W.id)) && byName('조예').st === 'dead'; },
    async run() {
      const W = facK('cc'), sm = byName('사마의'), ss = byName('사마사'), old = rulerOf(W.id);
      await scene({ title: '고평릉 정변', involved: pOf(W.id), lines: [
        [null, '병들어 죽어 간다던 사마의가 황제와 조상이 고평릉에 간 틈을 타 낙양의 성문을 닫았다.'],
        [onIn(ss, W.id) ? ss : null, '아버지, 군사는 모두 준비되었습니다.', null],
        [sm, '조상의 무리는 나라를 어지럽혔다. 이제부터 사마씨가 위를 바로잡겠다.'],
      ].filter(x => x[0] || x[2] !== null) });
      W.ruler = sm.id; W.name = sm.name; W.capital = sm.city; sm.loy = 100; W.title = '위 (사마씨 집권)';
      if (old && old !== sm) old.loy = 30;
      logMsg('사마의가 고평릉 정변으로 위의 권력을 쥐었습니다', 'big');
    },
  },
  // ── 촉의 멸망 (263)
  {
    id: 'shu_fall',
    cond: () => { const W = facK('cc'), L = facK('lb'); return HIST() && W && L && G.year >= 263 && !isP(rulerOf(L.id)) && facAdj(W.id, L.id) && (cityN('성도').f === L.id || citiesOf(L.id).length <= 5) && ((onIn(byName('등애'), W.id) && onIn(byName('종회'), W.id)) || G.year >= 265); },
    async run() {
      const W = facK('cc'), L = facK('lb'), da = byName('등애'), zh = byName('종회'), jw = byName('강유'), ls = rulerOf(L.id);
      await scene({ title: '촉의 멸망', involved: anyP(W, L), lines: [
        [onIn(jw, L.id) ? jw : null, '검각을 지키는 한 위군은 한 걸음도 들어오지 못한다!', '촉군은 검각에서 종회의 대군을 막았다.'],
        [da, '음평의 샛길로 칠백 리 산을 넘는다. 길이 없으면 모포를 두르고 굴러 내려간다!'],
        [null, '등애가 험한 산을 넘어 성도 앞에 나타나자, 촉의 황제는 싸우지 않고 항복했다.'],
        [ls, '…이곳이 즐거워 촉이 생각나지 않는구려.'],
      ].filter(x => x[0] || x[2] !== null) });
      mergeFaction(L.id, W.id);
      await scene({ title: '종회의 난', involved: pOf(W.id), lines: [[zh, '촉 땅을 얻었으니 이제 내가 천하를 노리겠다.'], [null, '종회와 강유가 성도에서 반란을 꾀했으나 난군에게 죽었고, 등애도 그 와중에 목숨을 잃었다.']] });
      kill(zh, '종회가 반란을 꾀하다 죽었습니다'); kill(jw, '강유가 마지막까지 한실을 꿈꾸다 죽었습니다'); kill(da, '등애가 난군 속에서 목숨을 잃었습니다');
      logMsg('촉한이 멸망했습니다', 'big');
    },
  },
  // ── 진의 건국 (265)
  {
    id: 'jin_found',
    cond: () => { const W = facK('cc'), sy = rulerNamed('사마염'); return HIST() && W && sy && sy.f === W.id && G.year >= 265; },
    async run() { const W = facK('cc'); await scene({ title: '진의 건국', involved: pOf(W.id), lines: [[rulerOf(W.id), '위의 선양을 받아 진을 세우노라. 할아버지와 아버지가 닦은 길을 마무리하겠다.']] }); setTitle(W, '진 황제'); },
  },
  // ── 오의 멸망과 천하 통일 (280)
  {
    id: 'wu_fall',
    cond: () => { const W = facK('cc'), S = facK('sj'); return HIST() && G.ev.jin_found && W && S && G.year >= 279 && !isP(rulerOf(S.id)) && facAdj(W.id, S.id); },
    async run() {
      const W = facK('cc'), S = facK('sj'), dy = byName('두예');
      await scene({ title: '파죽지세 — 천하 통일', involved: anyP(W, S), lines: [
        [onIn(dy, W.id) ? dy : null, '지금 우리 군의 기세는 대나무를 쪼개는 것과 같습니다. 몇 마디만 쪼개면 나머지는 칼날을 따라 갈라집니다!', '진군이 장강을 따라 내려갔다.'],
        [null, '쇠사슬로 막은 장강도 진의 배를 막지 못했다. 오의 마지막 황제가 항복하니, 황건의 난으로부터 거의 백 년 만에 천하가 하나가 되었다.'],
      ].filter(x => x[0] || x[2] !== null) });
      mergeFaction(S.id, W.id);
      logMsg('진이 오를 멸하고 천하를 통일했습니다', 'big');
    },
  },
);
