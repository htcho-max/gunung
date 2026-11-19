// ===== 역사 사건 2: 관도 이후 ~ 입촉 =====
const rulerOf = f => f >= 0 ? G.officers[G.factions[f].ruler] : null;
const keyRuler = k => { const F = G.factions.find(f => f.key === k && f.alive); return F ? rulerOf(F.id) : null; };
const pOf = f => { const P = me(); return !!P && P.st === 'on' && P.f === f; };
// 성을 다른 세력에 넘김. 원래 세력 장수는 가까운 자기 성으로 물러나거나 재야로
function handCity(c, f, troops) {
  const old = c.f;
  if (old >= 0 && old !== f) {
    const home = G.cities.filter(x => x.f === old && x.id !== c.id);
    for (const o of officersIn(c.id, old)) {
      const to = home.find(h => ADJ[h.id].includes(c.id)) || home[0];
      if (to) o.city = to.id; else leaveToRonin(o);
    }
  }
  c.f = f; c.gov = -1; c.deleg = false;
  if (troops != null) c.troops = Math.min(troopMax(c), troops);
  c.order = Math.max(c.order, 45);
}
function moveOfficer(o, c) { if (o && o.st === 'on') { delete o.travel; const oc = G.cities[o.city]; if (oc.gov === o.id) oc.gov = -1; o.city = c.id; } }
function passItem(id, to) { const st = G.items && G.items[id]; if (!st || !to || to.st === 'dead') return false; if (st.holder >= 0 && G.officers[st.holder].id === G.player) return false; giveItemRaw(G, id, to); return true; }

EVENTS.push(
  // ── 조조의 동정: 유비가 서주를 잃고 형주로
  {
    id: 'liubei_rout',
    cond: () => {
      const c = rulerNamed('조조'), l = rulerNamed('유비'), b = rulerNamed('유표');
      return HIST() && c && l && b && G.year >= 200 && G.year <= 202 && facAdj(c.f, l.f) && citiesOf(l.f).length <= 2 && cityN('신야').f === b.f && !isP(b);
    },
    async run() {
      const c = rulerNamed('조조'), l = rulerNamed('유비'), b = rulerNamed('유표'), gy = byName('관우'), gj = byName('곽가');
      const inv = isP(c) || pOf(l.f) || pOf(c.f);
      const ch = await scene({ title: '조조의 동정', involved: inv, lines: [
        [onIn(gj, c.f) ? gj : null, '원소는 굼떠서 쉬이 움직이지 못합니다. 그 사이에 유비를 먼저 치소서.', '조조의 모사들은 원소가 움직이기 전에 유비부터 치자고 했다.'],
        [c, '유비는 인걸이다. 지금 치지 않으면 반드시 뒷날의 걱정거리가 된다.'],
        [null, '조조가 몸소 대군을 이끌고 서주로 들이닥쳤다. 유비군은 하룻밤 사이에 흩어졌다.'],
      ], options: isP(l) ? [{ k: 'flee', label: '서주를 버리고 형주 유표에게 몸을 의탁한다' }, { k: 'stay', label: '끝까지 서주를 지킨다', danger: true }] : null });
      if (ch === 'stay') {
        addFocus(c.f, l.f, 18, '조조가 유비를 끝장내려 합니다');
        for (const x of citiesOf(c.f).filter(x => ADJ[x.id].some(i => G.cities[i].f === l.f))) x.troops = Math.min(troopMax(x), x.troops + 5000);
        return;
      }
      const xy = cityN('신야');
      // 관우는 조조에게 몸을 맡김 (세 가지 약속)
      let guan = false;
      if (onIn(gy, l.f) && !isP(gy)) guan = true;
      else if (onIn(gy, l.f) && isP(gy)) guan = (await scene({ title: '세 가지 약속', involved: true, lines: [[null, '하비성에 갇힌 관우에게 장료가 찾아와 항복을 권한다.']], options: [{ k: 'yes', label: '"형님의 소식을 들으면 곧 떠나겠소" — 조조에게 몸을 맡긴다' }, { k: 'no', label: '형님을 따라 형주로 간다' }] })) === 'yes';
      const lcs = citiesOf(l.f);
      const offs = factionOfficers(l.f).filter(o => o !== l && !(guan && o === gy));
      handCity(xy, l.f, 5000); xy.train = Math.max(xy.train, 55); xy.food = Math.max(xy.food, 6000);
      for (const x of lcs) { x.f = c.f; x.troops = Math.round(x.troops * .5); x.gov = -1; }
      moveOfficer(l, xy); for (const o of offs) moveOfficer(o, xy);
      G.factions[l.f].capital = xy.id;
      if (guan) { const cap = G.cities.find(x => x.f === c.f && x.id === G.factions[c.f].capital) || lcs[0]; joinFaction(gy, c.f, (cap || lcs[0]).id); gy.loy = 30; G.guanCao = true; }
      makeAllyFor(l.f, b.f, 36); addRel(l.f, b.f, 30);
      await scene({ title: '신야로', involved: inv, lines: [
        [l, '천하에 몸 둘 곳이 없구나. 같은 종친인 경승(유표)에게 의지하자.'],
        [b, '현덕이 왔다니 반갑구려. 신야에 머물며 북쪽을 막아 주시오.'],
        guan ? [gy, '형님이 계신 곳을 알면 천 리라도 찾아가겠소. 그때까지만 조공에게 몸을 맡기겠소.'] : [null, '유비는 남은 무리를 이끌고 형주로 내려갔다.'],
      ] });
      assignGovs();
      logMsg(`유비가 서주를 잃고 형주 신야에 몸을 의탁했습니다${guan ? ' · 관우는 조조에게 몸을 맡겼습니다' : ''}`, 'big');
    },
  },

  // ── 관우 천리행
  {
    id: 'guanyu_return',
    cond: () => { const g = byName('관우'), l = rulerNamed('유비'), c = rulerNamed('조조'); return !!(c && l && onIn(g, c.f) && g.tag && g.tag === l.tag && G.year >= 200 && (G.ev.guandu || G.year >= 201 || G.month >= 6)); },
    async run() {
      const g = byName('관우'), l = rulerNamed('유비'), c = rulerNamed('조조'), zf = byName('장비'), zl = byName('장료');
      const inv = isP(c) || isP(g) || pOf(l.f) || pOf(c.f);
      await scene({ title: '백마', involved: inv, lines: [
        [null, '원소의 맹장 안량이 백마를 에워쌌다. 관우가 적토마를 몰아 만군 속으로 뛰어든다.'],
        [g, '조공께서 베푸신 은혜, 이것으로 갚았소.'],
        [null, '관우는 단숨에 안량의 목을 베어 돌아왔다.'],
      ] });
      const anl = byName('안량'); if (live(anl) && anl.st === 'on' && anl.f !== c.f && !isP(anl) && chance(.7)) killOfficer(anl, '안량이 백마에서 관우에게 목이 베였습니다');
      let ch = 'go';
      if (isP(g)) ch = await scene({ title: '괘인봉금', involved: true, lines: [[null, `형님 유비가 ${G.cities[l.city].name}에 있다는 소식이 들려왔다.`]], options: [{ k: 'go', label: '인수를 걸어 두고 형님을 찾아 떠난다' }, { k: 'stay', label: '조공 곁에 남는다' }] });
      else if (isP(c)) ch = await scene({ title: '괘인봉금', involved: true, lines: [[g, '형님이 계신 곳을 알았으니 떠나겠소. 받은 금은 창고에 봉해 두고, 한수정후의 인수는 걸어 두었소.'], [onIn(zl, c.f) ? zl : null, '운장은 떠날 사람입니다. 붙잡으면 원한만 남습니다.', '장수들이 뒤를 쫓아 베자고 한다.']], options: [{ k: 'go', label: '"제 주인을 잊지 않으니 참으로 의사로다" — 보내 준다' }, { k: 'stay', label: '관문을 닫고 붙잡는다', danger: true }] });
      if (ch === 'stay') { if (isP(c)) { g.loy = 25; c.fame -= 5; logMsg('조조가 관우를 붙잡아 두었습니다. 관우의 마음은 떠나 있습니다'); } return; }
      if (!isP(g) && G.items && G.items.jeokto && G.items.jeokto.holder >= 0 && G.officers[G.items.jeokto.holder].f === c.f && G.items.jeokto.holder !== G.player) passItem('jeokto', g);
      if (YANYI()) await scene({ title: '오관참육장', involved: inv, lines: [
        [null, '두 형수의 수레를 호위하며 관우는 다섯 관문을 지나고 여섯 장수를 베었다.'],
        [g, '나는 승상께 작별을 고하고 떠나는 길이다. 길을 막는 자는 용서하지 않겠다!'],
        [onIn(zf, l.f) ? zf : null, '형님이 조조에게 항복했다고? …오해였구려! 형님, 이 장비를 용서하시오!', '고성에서 세 형제가 다시 만났다.'],
        [l, '운장, 돌아왔구나!'],
      ] });
      else await scene({ title: '괘인봉금', involved: inv, lines: [[null, '관우는 조조에게서 받은 재물을 모두 봉해 두고 작별 편지를 남긴 채 떠났다.'], [c, '저마다 제 주인을 위하는 것이니 뒤쫓지 말라.'], [l, '운장, 돌아왔구나!']] });
      joinFaction(g, l.f, l.city); g.loy = 100; g.fame += 15; G.guanCao = false;
      logMsg('관우가 다섯 관문을 지나 유비에게 돌아왔습니다 (천리행)', 'big');
    },
  },

  // ── 백문루: 여포의 최후
  {
    id: 'baekmun',
    cond: () => { const c = rulerNamed('조조'), l = rulerNamed('여포'); return HIST() && c && l && !isP(l) && !pOf(l.f) && G.ev.xiapi && (G.year >= 199 || (G.year === 198 && G.month >= 10)) && citiesOf(l.f).length <= 2 && facAdj(c.f, l.f); },
    async run() {
      const c = rulerNamed('조조'), l = rulerNamed('여포'), cg = byName('진궁'), zl = byName('장료'), gs = byName('고순'), lb = byName('유비');
      const inv = isP(c) || pOf(c.f);
      const lbHere = live(lb) && lb.st === 'on' && (lb.f === c.f || isRuler(lb));
      const ch = await scene({ title: '백문루', involved: inv, lines: [
        [null, '두 달 넘게 버틴 하비성. 조조가 기수와 사수를 터 성안을 물바다로 만들자, 여포의 부하들이 진궁을 묶어 성문을 열었다.'],
        [l, '명공이 걱정하던 이 여포가 이제 굴복했소. 명공이 보병을 이끌고 내가 기병을 이끌면 천하는 손쉽게 평정될 것이오.'],
        [lbHere ? lb : null, '명공께서는 정건양(정원)과 동태사(동탁)의 일을 잊으셨습니까?', '곁에 있던 이가 정원과 동탁의 일을 떠올리게 했다.'],
        [l, '이 귀 큰 놈아! 네가 가장 믿지 못할 놈이로구나!'],
        [onIn(cg, l.f) ? cg : null, '내 늙은 어머니와 처자의 목숨은 명공께 달렸소. 어서 나를 죽여 군법을 밝히시오.', null],
      ].filter(x => x[0] || x[2] !== null), options: isP(c) ? [{ k: 'kill', label: '여포를 목 졸라 죽인다' }, { k: 'spare', label: '여포를 살려 장수로 쓴다', danger: true }] : null });
      const lcs = citiesOf(l.f);
      if (live(l) && G.items && G.items.jeokto && G.items.jeokto.holder === l.id) passItem('jeokto', c);
      for (const x of lcs) { handCity(x, c.f, Math.round(x.troops * .6)); }
      const cap = lcs[0] || G.cities.find(x => x.f === c.f);
      if (onIn(zl, l.f) && !isP(zl)) { joinFaction(zl, c.f, cap.id); zl.loy = 85; }
      const others = factionOfficers(l.f).filter(o => o !== l && o !== cg && o !== gs && o !== zl);
      if (onIn(cg, l.f)) killOfficer(cg, '진궁이 백문루에서 스스로 죽음을 택했습니다');
      if (onIn(gs, l.f)) killOfficer(gs, '고순이 백문루에서 목숨을 잃었습니다');
      for (const o of others) { if (o.id === G.player) continue; if (chance(.6)) joinFaction(o, c.f, cap.id); else leaveToRonin(o); }
      if (ch === 'spare') {
        G.factions[l.f].alive = false; for (const k in G.ally) if (k.split(',').map(Number).includes(l.f)) delete G.ally[k];
        joinFaction(l, c.f, cap.id); l.loy = 35;
        logMsg('조조가 여포를 살려 장수로 거두었습니다', 'big');
      } else {
        destroyFaction(l.f, '여포군이 하비에서 무너졌습니다');
        killOfficer(l, '여포가 백문루에서 목숨을 잃었습니다');
      }
      assignGovs();
    },
  },

  // ── 원담·원상의 분열
  {
    id: 'yuan_split',
    cond: () => { const s = rulerNamed('원상'), t = byName('원담'), y = byName('원소'); return HIST() && s && y && y.st === 'dead' && onIn(t, s.f) && !isP(t) && citiesOf(s.f).length >= 3; },
    async run() {
      const s = rulerNamed('원상'), t = byName('원담'), sb = byName('심배'), gd = byName('곽도');
      const inv = isP(s) || pOf(s.f);
      const ch = await scene({ title: '형제의 다툼', involved: inv, lines: [
        [null, '원소가 피를 토하고 죽었다. 심배와 봉기는 유언을 꾸며 셋째 아들 원상을 세웠다.'],
        [t, '내가 맏이다! 아버지의 뒤를 잇는 것은 마땅히 나여야 한다.'],
        [onIn(sb, s.f) ? sb : null, '현사(원담)는 곽도의 꾐에 빠져 있습니다. 결코 병권을 내주어서는 안 됩니다.', '두 형제의 측근들은 서로를 헐뜯었다.'],
      ], options: isP(s) ? [{ k: 'split', label: '형의 요구를 물리친다' }, { k: 'appease', label: '형에게 청주를 맡기고 달랜다' }] : null });
      if (ch === 'appease') { t.loy = 95; s.fame += 5; logMsg('원상이 형 원담을 달래 하북이 갈라지지 않았습니다', 'big'); return; }
      const cands = ['남피', '평원', '북해'].map(cityN).filter(x => x.f === s.f && x.id !== G.factions[s.f].capital);
      const home = cands[0] || citiesOf(s.f).find(x => x.id !== G.factions[s.f].capital);
      if (!home) return;
      if (home.troops < 6000) home.troops = 6000;
      const fol = [gd].filter(o => onIn(o, s.f) && !isP(o));
      const F = splitOff(t, home, s.f, fol);
      G.rel[relKey(F.id, s.f)] = 0;
      addFocus(s.f, F.id, 18); addFocus(F.id, s.f, 18);
      const c = rulerNamed('조조');
      if (c) { addFocus(c.f, s.f, 30); addFocus(c.f, F.id, 30); }
      logMsg(`원담이 ${home.name}에서 원상에게 등을 돌렸습니다. 하북이 둘로 갈라졌습니다`, 'big');
    },
  },

  // ── 형주의 항복
  {
    id: 'jingzhou_surrender',
    cond: () => { const F = G.factions.find(f => f.key === 'lbi' && f.alive), b = byName('유표'), c = rulerNamed('조조'); return HIST() && F && b && b.st === 'dead' && c && G.year >= 207 && !isP(rulerOf(F.id)) && facAdj(c.f, F.id); },
    async run() {
      const F = G.factions.find(f => f.key === 'lbi' && f.alive), r = rulerOf(F.id), c = rulerNamed('조조'), km = byName('채모'), kw = byName('괴월');
      await scene({ title: '형주의 항복', involved: isP(c) || pOf(F.id) || pOf(c.f), lines: [
        [null, '유표가 죽자 조조의 대군이 남쪽으로 내려왔다. 형주의 신하들은 싸우지 않고 항복하기로 했다.'],
        [onIn(kw, F.id) ? kw : onIn(km, F.id) ? km : r, '조조는 천자를 끼고 있으니 맞서면 역적이 됩니다. 형주 아홉 군을 바치는 것만이 살길입니다.'],
        [c, '형주를 얻은 것보다 이도(괴월)를 얻은 것이 더 기쁘구나.'],
      ] });
      mergeFaction(F.id, c.f);
      for (const o of [km, byName('장윤')]) if (onIn(o, c.f)) o.loy = Math.max(o.loy, 70);
      logMsg(`${F.name}군이 형주를 들어 조조에게 항복했습니다`, 'big');
    },
  },

  // ── 장판파
  {
    id: 'changban',
    cond: () => { const c = rulerNamed('조조'), l = rulerNamed('유비'); return HIST() && c && l && (G.ev.jingzhou_surrender || G.year >= 209) && G.year >= 207 && facAdj(c.f, l.f) && citiesOf(l.f).length <= 2 && cityN('강하').f !== l.f; },
    async run() {
      const c = rulerNamed('조조'), l = rulerNamed('유비'), zy = byName('조운'), zf = byName('장비'), zg = byName('제갈량');
      const inv = isP(c) || pOf(l.f) || pOf(c.f);
      const ch = await scene({ title: '장판파', involved: inv, lines: [
        [null, '조조의 철기 오천이 하루 밤낮에 삼백 리를 달려 당양 장판에서 유비를 따라잡았다. 십만 백성이 유비를 따라 피란하던 길이었다.'],
        [onIn(zg, l.f) ? zg : null, '주공, 강하의 유기 공자에게 몸을 의탁하소서. 그곳에서 강동과 손을 잡아야 합니다.', '참모들은 강하로 피하자고 했다.'],
      ], options: isP(l) ? [{ k: 'flee', label: '백성과 함께 강하로 피한다' }, { k: 'stand', label: '이곳에서 조조를 막는다', danger: true }] : null });
      if (ch === 'stand') { addFocus(c.f, l.f, 18, '조조가 유비를 뒤쫓습니다'); return; }
      await scene({ title: '장판파', involved: inv, lines: [
        [onIn(zy, l.f) ? zy : null, '주공, 아두 공자를 품에 안고 왔습니다! 이 조자룡, 죽을죄를 지었습니다.', '난군 속에서 한 장수가 유비의 어린 아들을 품고 빠져나왔다.'],
        [l, '이 어린 것 때문에 나의 대장을 잃을 뻔했구나!'],
        [onIn(zf, l.f) ? zf : null, '나는 연인 장익덕이다! 누가 감히 나와 죽기로 싸우겠느냐!', '다리 위에서 한 장수가 고함을 지르자 조조군이 물러섰다.'],
        [null, '장판교 아래로 조조의 군사들이 물러났다. 유비는 무리를 이끌고 한진을 건너 강하로 갔다.'],
      ] });
      if (onIn(zy, l.f)) { zy.fame += 10; if (G.items && G.items.cheonggang && G.items.cheonggang.holder >= 0 && G.officers[G.items.cheonggang.holder].f === c.f) passItem('cheonggang', zy); }
      if (onIn(zf, l.f)) zf.fame += 8;
      const jx = cityN('강하'), lcs = citiesOf(l.f);
      handCity(jx, l.f, 10000); jx.train = Math.max(jx.train, 60); jx.food = Math.max(jx.food, 8000); jx.wall = Math.max(jx.wall, 300);
      for (const x of lcs) if (x !== jx) { const tr = x.troops; x.troops = Math.round(tr * .4); jx.troops = Math.min(troopMax(jx), jx.troops + Math.round(tr * .35)); x.f = c.f; x.gov = -1; }
      for (const o of factionOfficers(l.f)) moveOfficer(o, jx);
      G.factions[l.f].capital = jx.id;
      assignGovs();
      logMsg('유비가 장판에서 조조를 따돌리고 강하로 피했습니다', 'big');
    },
  },

  // ── 적벽대전
  {
    id: 'chibi',
    cond: () => {
      const c = rulerNamed('조조'), q = keyRuler('sj');
      if (!c || !q || G.over || q.f === c.f) return false;
      if (!(G.ev.changban || G.ev.jingzhou_surrender || G.year >= 209) || G.year < 208 || (G.year === 208 && G.month < 9)) return false;
      return !!chibiFront(c.f, q.f);
    },
    async run() {
      const c = rulerNamed('조조'), q = keyRuler('sj'), l = rulerNamed('유비');
      const zy = byName('주유'), ls = byName('노숙'), zg = byName('제갈량'), hg = byName('황개'), pt = byName('방통'), jz = byName('장소'), cy = byName('정욱');
      const inv = isP(c) || isP(q) || pOf(c.f) || pOf(q.f) || (l && pOf(l.f));
      const ally = l && l.f !== c.f && l.f !== q.f ? l : null;
      const zgSide = ally && onIn(zg, ally.f) ? zg : onIn(zg, q.f) ? zg : null;
      // 1. 항전이냐 항복이냐
      const ch = await scene({ title: '적벽 — 강동의 결단', involved: inv, lines: [
        [c, `이번에 팔십만 수군을 거느리고 장군과 오 땅에서 사냥을 하려 하오.`],
        [onIn(jz, q.f) ? jz : null, '조조는 천자를 끼고 있고 형주의 수군까지 얻었습니다. 항복하는 것이 강동을 지키는 길입니다.', '강동의 문신들은 모두 항복하자고 했다.'],
        [onIn(ls, q.f) ? ls : null, '저 같은 이는 항복해도 벼슬을 얻겠지만, 장군께서 항복하시면 어디로 돌아가시렵니까?', null],
        [zgSide, '조조의 군사는 멀리 와서 지쳤고, 북쪽 사람들은 물에 익숙하지 않습니다. 강노의 끝은 비단도 뚫지 못하는 법입니다.', null],
        [onIn(zy, q.f) ? zy : null, '조조는 한의 역적입니다. 정병 오만만 주시면 반드시 깨뜨리겠습니다!', null],
      ].filter(x => x[0] || x[2] !== null), options: isP(q) ? [{ k: 'fight', label: '책상 모서리를 베며 "다시 항복을 말하는 자는 이 책상과 같다!"' }, { k: 'submit', label: '조조에게 항복한다', danger: true }] : null });
      if (ch === 'submit') {
        mergeFaction(q.f, c.f); logMsg('손권이 조조에게 항복했습니다. 강동이 조조의 손에 들어갔습니다', 'big'); return;
      }
      if (ally) { makeAllyFor(q.f, ally.f, 36); addRel(q.f, ally.f, 30); }
      // 2. 연환계
      let chained = true;
      const p2 = await scene({ title: '연환계', involved: inv, lines: [
        [live(pt) ? pt : null, '큰 배와 작은 배를 서른 척, 쉰 척씩 쇠고리로 엮고 널빤지를 까십시오. 사람은 물론 말도 평지처럼 달릴 수 있습니다.', '한 선비가 찾아와 배를 쇠사슬로 묶으면 뱃멀미가 없어진다고 일렀다.'],
        [onIn(cy, c.f) ? cy : null, '배를 묶어 두면 화공을 당했을 때 피할 길이 없습니다.', null],
        [c, '지금은 한겨울이라 서북풍만 분다. 동남풍이 불 리 없는데 화공이 두려우랴!'],
      ].filter(x => x[0] || x[2] !== null), options: isP(c) ? [{ k: 'chain', label: '배를 쇠사슬로 묶는다 (뱃멀미가 사라짐)' }, { k: 'free', label: '배를 묶지 않는다' }] : null });
      chained = p2 !== 'free';
      // 3. 고육계
      let kuyuk = onIn(hg, q.f);
      if (kuyuk) {
        const p3 = await scene({ title: '고육계', involved: inv, lines: [
          [zy, '황공복(황개)이 군령을 어겼다. 곤장 백 대를 쳐라!'],
          [hg, '…매를 맞은 이 몸이 조조에게 항복하겠다는 글을 보내겠소. 조조가 믿게 하려면 살을 찢어야 하오.'],
          [null, '등이 터지도록 매를 맞은 황개가 조조에게 항복 편지를 보냈다.'],
        ], options: isP(c) ? [{ k: 'believe', label: '황개의 항복을 받아들인다' }, { k: 'doubt', label: '거짓 항복이다. 믿지 않는다' }] : null });
        kuyuk = p3 !== 'doubt';
      }
      // 4. 동남풍
      const eastWind = !!zgSide || (live(zg) && chance(.5)) || chance(.4);
      await scene({ title: '동남풍', involved: inv, lines: [
        YANYI() ? [zgSide, '남병산에 칠성단을 쌓고 사흘 밤낮으로 바람을 빌겠습니다.', '겨울 하늘에 구름이 몰려든다.'] : [null, '한겨울이었지만 이 무렵 장강에는 드물게 동남풍이 부는 날이 있었다. 주유는 그날을 기다렸다.'],
        [null, eastWind ? '동짓달 스무날 밤, 깃발이 서북쪽으로 펄럭였다. 동남풍이다!' : '바람은 끝내 바뀌지 않았다. 강동은 제 힘으로 싸워야 한다.'],
      ] });
      // 5. 수전
      const fr = chibiFront(c.f, q.f); if (!fr) return;
      const [from, to] = fr;
      const atk = factionOfficers(c.f);
      const pickA = [...atk].sort((a, b) => (hasSkill(b, '수군') - hasSkill(a, '수군')) * 60 + (b.lead + b.war) - (a.lead + a.war) + (b.city === from.id) * 40 - (a.city === from.id) * 40 - (isRuler(b) ? 30 : 0) + (isRuler(a) ? 30 : 0));
      const army0 = pickA.slice(0, 6);
      if (isRuler(c) && !army0.includes(c) && !isP(c)) army0[5] = c;
      for (const o of army0) moveOfficer(o, from);
      if (HIST()) from.troops = Math.max(from.troops, Math.min(troopMax(from), 52000));
      from.food = Math.max(from.food, 30000);
      const tr = splitTroops(army0, from.troops);
      const army = army0.map((o, i) => ({ oid: o.id, troops: Math.max(800, tr[i]), type: autoType(o) }));
      if (army[0]) { const k = army.findIndex(u => u.oid === c.id); if (k > 0) army.unshift(...army.splice(k, 1)); }
      // 수비: 강동의 장수를 모음
      const dPick = factionOfficers(q.f).sort((a, b) => (b === zy) - (a === zy) || (hasSkill(b, '수군') - hasSkill(a, '수군')) * 50 + (b.lead + b.war) - (a.lead + a.war)).slice(0, 5);
      for (const o of dPick) moveOfficer(o, to);
      if (onIn(zy, q.f)) to.gov = zy.id;
      if (HIST()) to.troops = Math.max(to.troops, Math.min(troopMax(to), 30000));
      to.train = Math.max(to.train, 75); to.food = Math.max(to.food, 12000);
      // 원군: 유비
      const allies = [];
      if (ally) {
        const home = G.cities[ally.city];
        const aoffs = factionOfficers(ally.f).sort((a, b) => (b.id === G.player) - (a.id === G.player) || (b.lead + b.war) - (a.lead + a.war)).filter(o => !isRuler(o) || o.id === G.player).slice(0, 2);
        for (const o of aoffs) { const t = Math.min(troopCap(o), 3500, Math.max(0, G.cities[o.city].troops - 1000)); if (t >= 800) { G.cities[o.city].troops -= t; allies.push({ oid: o.id, troops: t, type: autoType(o), fac: ally.f, home: o.city, train: G.cities[o.city].train }); } }
      }
      SFX.play('drum');
      await runWar(from, to, army, 9000, { naval: { chained, kuyuk, eastWind }, allies, title: '적벽대전' });
      // 6. 결과
      if (to.f === q.f) {
        const lines = [[null, '불길이 강을 덮고 하늘을 태웠다. 조조의 선단은 잿더미가 되었고 북군은 오림으로 달아났다.']];
        const gy = byName('관우');
        if (ally && onIn(gy, ally.f)) lines.push([gy, '…지난날 승상께 받은 은혜가 있으니, 이번만은 길을 열어 드리겠소.'], [c, '운장, 그대의 의리를 잊지 않겠소.']);
        lines.push([c, '봉효(곽가)가 살아 있었다면 내가 이 지경에 이르지 않았을 것을!']);
        await scene({ title: '적벽 — 화용도', involved: inv, lines });
        if (HIST()) {
          for (const n of ['강릉', '양양']) { const x = cityN(n); if (x.f === c.f) x.troops = Math.round(x.troops * .55); }
          const jl = cityN('강릉'); if (jl.f === c.f && ADJ[jl.id].some(i => G.cities[i].f === q.f)) handCity(jl, q.f, 9000);
          if (ally) for (const n of ['장사', '무릉', '영릉', '계양']) { const x = cityN(n); if (x.f === -1 || x.f === c.f) { handCity(x, ally.f, Math.max(x.troops, 3500)); x.gold = Math.max(x.gold, 400); x.food = Math.max(x.food, 5000); } }
          if (ally) { const hz = byName('황충'), wy = byName('위연'); for (const o of [hz, wy]) if (o && o.st === 'ronin' && !isP(o) && G.cities[o.city].f === ally.f) joinFaction(o, ally.f, o.city); }
        }
        G.focus = (G.focus || []).filter(x => !(x.f === c.f && (x.t === q.f || (ally && x.t === ally.f))));
        if (onIn(zy, q.f)) zy.fame += 20;
        if (zgSide) zg.fame += 10;
        logMsg('적벽에서 손권·유비 연합군이 조조의 대군을 불살랐습니다. 천하가 셋으로 나뉠 기틀이 섰습니다', 'big');
      } else {
        await scene({ title: '적벽 — 강동이 무너지다', involved: inv, lines: [[c, '장강도 나를 막지 못하는구나! 이제 강동은 내 것이다.'], [null, '조조의 대군이 장강을 건넜다. 역사와 다른 천하가 열린다.']] });
        addFocus(c.f, q.f, 24);
      }
    },
  },

  // ── 유비 입촉
  {
    id: 'shu_entry',
    cond: () => { const l = rulerNamed('유비'), y = rulerNamed('유장'); return HIST() && l && y && G.year >= 211 && (G.ev.chibi || G.year >= 212) && citiesOf(l.f).length >= 2 && !isP(y) && G.cities.some(x => x.f === y.f && ADJ[x.id].some(i => G.cities[i].f === l.f) || x.f === y.f && x.name === '자동'); },
    async run() {
      const l = rulerNamed('유비'), y = rulerNamed('유장'), zs = byName('장송'), fz = byName('법정'), hq = byName('황권'), pt = byName('방통');
      const inv = isP(l) || pOf(l.f) || pOf(y.f);
      const ch = await scene({ title: '서천 지도', involved: inv, lines: [
        [onIn(zs, y.f) ? zs : null, '익주의 산천과 관문, 곳간이 모두 이 지도에 있습니다. 유계옥(유장)은 어리석어 익주를 지키지 못합니다.', '익주에서 온 사자가 서천의 지도를 바쳤다.'],
        [y, '장로가 쳐들어올까 두렵다. 종친 유현덕을 불러 한중을 막게 하겠다.'],
        [onIn(hq, y.f) ? hq : null, '유비를 부르는 것은 호랑이를 집 안에 들이는 일입니다!', null],
        [onIn(pt, l.f) ? pt : null, '형주는 이미 황폐하고 동쪽에는 손권, 북쪽에는 조조가 있습니다. 익주를 얻어야 대업을 이룹니다.', null],
      ].filter(x => x[0] || x[2] !== null), options: isP(l) ? [{ k: 'enter', label: '군사를 이끌고 익주로 들어간다' }, { k: 'no', label: '같은 종친을 칠 수는 없다' }] : null });
      if (ch === 'no') { l.fame += 5; return; }
      for (const o of [fz]) if (o && (onIn(o, y.f) || o.st === 'ronin') && !isP(o)) { joinFaction(o, l.f, l.city); o.loy = 95; }
      const gate = G.cities.find(x => x.f === y.f && x.name === '자동') || G.cities.find(x => x.f === y.f && ADJ[x.id].some(i => G.cities[i].f === l.f));
      if (gate && citiesOf(y.f).length > 1) {
        handCity(gate, l.f, Math.max(9000, Math.round(gate.troops * .5)));
        const go = factionOfficers(l.f).filter(o => !isRuler(o) && o.id !== G.player && byName('제갈량') !== o && byName('관우') !== o).sort((a, b) => (b.lead + b.war + b.int) - (a.lead + a.war + a.int)).slice(0, 4);
        for (const o of go) moveOfficer(o, gate);
      }
      delete G.ally[relKey(l.f, y.f)]; G.rel[relKey(l.f, y.f)] = 10;
      addFocus(l.f, y.f, 36, '유비가 익주를 노립니다');
      logMsg('유비가 익주로 들어갔습니다', 'big');
    },
  },

  // ── 낙봉파
  {
    id: 'luofeng',
    cond: () => { const l = rulerNamed('유비'), pt = byName('방통'); return HIST() && l && onIn(pt, l.f) && !isP(pt) && G.ev.shu_entry && G.year >= 214 && rulerNamed('유장'); },
    async run() {
      const pt = byName('방통'), l = rulerNamed('유비');
      await scene({ title: '낙봉파', involved: pOf(l.f), lines: [
        [pt, '주공의 백마를 빌려 타고 지름길로 낙성을 치겠습니다.'],
        [null, '좁은 골짜기에 들어선 순간 숲에서 화살이 비 오듯 쏟아졌다. 골짜기의 이름은 낙봉파 — 봉황이 떨어지는 언덕이었다.'],
      ] });
      killOfficer(pt, '방통이 낙봉파에서 화살에 맞아 세상을 떠났습니다');
    },
  },
);

// 적벽의 싸움터: 조조의 성(강릉 우선)과 이웃한 손권의 성(시상·강하·여강 우선)
function chibiFront(cf, qf) {
  const fromPref = ['강릉', '양양', '강하', '여강', '수춘', '여남'];
  const toPref = ['시상', '강하', '여강', '건업', '장사', '강릉'];
  // 장강을 따라 내려오는 길: 강릉·양양 → 시상·강하 (이웃이 아니어도 물길로)
  for (const [fn, tn] of [['강릉', '시상'], ['강릉', '강하'], ['양양', '시상'], ['강하', '시상']]) { const f = cityN(fn), t = cityN(tn); if (f.f === cf && t.f === qf) return [f, t]; }
  for (const tn of toPref) { const t = cityN(tn); if (t.f !== qf) continue; for (const fn of fromPref) { const f = cityN(fn); if (f.f === cf && ADJ[f.id].includes(t.id)) return [f, t]; } }
  for (const t of G.cities) if (t.f === qf) { const f = ADJ[t.id].map(i => G.cities[i]).find(x => x.f === cf); if (f) return [f, t]; }
  return null;
}
