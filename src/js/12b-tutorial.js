// ===== 튜토리얼: 유비로 평원에서 시작해 내정 → 징병 → 다음 달 → 복양의 황건 잔당 토벌까지 =====
const Tutorial = {
  timer: null, box: null, ring: null, base: null,
  start() {
    newGame({ diff: 0, hist: true, scen: 190 });
    const P = G.officers.find(o => o.name === '유비');
    G.player = P.id; G.pgold = 100; P.die = Math.max(P.die, P.born + 66);
    const pw = cityN('평원'), py = cityN('복양');
    pw.troops = Math.max(pw.troops, 9000); pw.gold = Math.max(pw.gold, 1500); pw.food = Math.max(pw.food, 12000); pw.train = Math.max(pw.train, 60);
    // 복양에 자리 잡은 황건 잔당 (관해)
    const mk = (name, st) => { const o = { id: G.officers.length, name, born: 160, die: 230, ...st, f: -1, city: py.id, loy: 60, merit: 0, fame: 10, st: 'ronin', acted: false, ideal: 50, tag: '', found: true, home: py.id, fk: '', gen: 'war', bond: {} }; G.officers.push(o); return o; };
    const gh = mk('관해', { lead: 52, war: 70, int: 22, pol: 15, cha: 40 }), bw = mk('배원소', { lead: 40, war: 58, int: 25, pol: 20, cha: 35 });
    const F = { id: G.factions.length, key: 'yt', name: '관해', color: '#d9c25a', ruler: gh.id, alive: true, capital: py.id };
    G.factions.push(F);
    for (const o of [gh, bw]) { o.st = 'on'; o.f = F.id; o.loy = 70; }
    py.f = F.id; py.troops = 3200; py.train = 30; py.gold = 300; py.food = 4000; py.order = 30; py.wall = Math.min(py.wall, 200);
    G.factions.forEach(o => { if (o.id !== F.id) G.rel[relKey(o.id, F.id)] = 10; });
    G.tut = { step: 0 };
    assignGovs(); saveGame('auto');
    startPlaying(false);
    this.resume();
  },
  resume() { if (!G || !G.tut) return; this.ensureDom(); this.show(); clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 300); },
  stop(done) {
    clearInterval(this.timer); this.timer = null;
    if (this.box) this.box.remove(); if (this.ring) this.ring.remove(); this.box = this.ring = null;
    if (G && G.tut) { G.tut = null; if (done) UI.toast('튜토리얼을 마쳤습니다. 이대로 이어서 천하를 노려 보세요!'); runEvents().then(() => UI.refresh()); }
  },
  ensureDom() {
    if (this.box) return;
    this.ring = el('div', { class: 'tutRing' });
    this.box = el('div', { class: 'tutBox', role: 'dialog', 'aria-live': 'polite' });
    document.body.append(this.ring, this.box);
  },
  get S() { return TUT_STEPS[G.tut.step]; },
  show() {
    const s = this.S; if (!s) return this.stop(true);
    if (s.enter) s.enter();
    this.base = s.snap ? s.snap() : null;
    const b = this.box; b.innerHTML = '';
    b.append(el('div', { class: 'tutHead' }, el('span', { class: 'tutNo' }, `${G.tut.step + 1} / ${TUT_STEPS.length}`), el('b', {}, s.title), el('button', { class: 'tutX', title: '튜토리얼 그만두기', onclick: async () => { if (await UI.confirm('튜토리얼을 그만둘까요? 게임은 이대로 이어집니다.')) this.stop(false); } }, '그만두기')),
      el('div', { class: 'tutText' }, typeof s.text === 'function' ? s.text() : s.text),
      el('button', { class: 'tutMore', onclick: () => { this.open = !this.open; this.place(); } }, '설명 보기'));
    this.open = innerWidth >= 760;
    if (!s.wait) b.append(el('div', { class: 'tutFoot' }, el('button', { class: 'btn pri sm', onclick: () => this.next() }, s.last ? '시작하기' : '다음')));
    else b.append(el('div', { class: 'tutFoot muted' }, s.hint || '직접 해 보세요'));
    this.scrolled = false;
    this.place();
  },
  next() { if (!G.tut) return; SFX.play('tick'); G.tut.step++; this.show(); },
  tick() {
    if (!G || !G.tut || !this.box) return;
    const s = this.S; if (!s) return this.stop(true);
    if (s.wait) { let ok = false; try { ok = s.wait(this.base); } catch (e) { } if (ok) { SFX.play('ok'); G.tut.step++; this.show(); return; } }
    this.place();
  },
  place() {
    const s = this.S, b = this.box, ring = this.ring; if (!s || !b) return;
    const sel = typeof s.at === 'function' ? s.at() : s.at;
    const t = sel ? [...document.querySelectorAll(sel)].find(x => x.offsetParent !== null) : null;
    const W = innerWidth, H = innerHeight, bw = Math.min(360, W - 24);
    b.style.width = bw + 'px';
    const modalOn = $('#modalLayer').classList.contains('on'), battle = inBattle();
    // 창이 열려 있으면 작게 접고 클릭을 막지 않음, 전장에서는 작게 접어 두고 '설명 보기'로 펼침
    b.classList.toggle('dim', modalOn);
    b.classList.toggle('mini', modalOn || (battle && !this.open));
    b.classList.toggle('inBattle', battle);
    const mb = b.querySelector('.tutMore'); if (mb) mb.textContent = this.open ? '접기' : '설명 보기';
    if (modalOn) { ring.style.display = 'none'; b.style.left = (W - bw) / 2 + 'px'; b.style.top = '6px'; return; }
    if (battle) {
      const r = t ? t.getBoundingClientRect() : null;
      if (t && r.width < W * .6) ring.style.cssText = `display:block;left:${r.left - 5}px;top:${r.top - 5}px;width:${r.width + 10}px;height:${r.height + 10}px`; else ring.style.display = 'none';
      const bt = $('#btop').getBoundingClientRect(), bp = $('#bpanel').getBoundingClientRect(), bh = b.offsetHeight;
      if (W < 760) { b.style.left = '12px'; b.style.top = Math.max(bt.bottom + 6, bp.top - bh - 8) + 'px'; }
      else { b.style.left = (W - bw - 12) + 'px'; b.style.top = (bt.bottom + 8) + 'px'; }
      return;
    }
    if (t && !this.scrolled) { // 목표가 화면 밖(휴대폰 아래 칸 등)이면 보이게 굴림
      const r0 = t.getBoundingClientRect(); this.scrolled = true;
      if (r0.bottom > H - 10 || r0.top < 0) { t.scrollIntoView({ block: 'center' }); }
    }
    if (t) {
      const r = t.getBoundingClientRect();
      ring.style.cssText = `display:block;left:${r.left - 5}px;top:${r.top - 5}px;width:${r.width + 10}px;height:${r.height + 10}px`;
      const bh = b.offsetHeight;
      let top = r.bottom + 14; if (top + bh > H - 8) top = r.top - bh - 14; if (top < 8) top = Math.min(H - bh - 8, Math.max(8, r.top + 10));
      let left = clamp(r.left + r.width / 2 - bw / 2, 12, W - bw - 12);
      // 대상이 넓게 퍼져 있으면(지도·전장) 구석에
      if (r.width > W * .6 && r.height > H * .4) { top = 12; left = W - bw - 12; if (W < 700) { top = H - bh - 12; left = 12; } }
      b.style.left = left + 'px'; b.style.top = top + 'px';
    } else {
      ring.style.display = 'none';
      const bh = b.offsetHeight;
      if (modalOn) { b.style.left = (W - bw) / 2 + 'px'; b.style.top = '8px'; }
      else { b.style.left = (W - bw) / 2 + 'px'; b.style.top = Math.max(12, (H - bh) / 2 - 60) + 'px'; }
    }
  },
};
const tutCity = () => cityN('평원'), tutTarget = () => cityN('복양');
const inBattle = () => !$('#scrBattle').hidden;
const TUT_STEPS = [
  { title: '천하로 오신 것을 환영합니다', text: '190년, 동탁이 낙양을 차지하고 천하가 어지럽습니다.\n당신은 평원의 작은 세력을 이끄는 유비입니다. 곁에는 관우와 장비가 있습니다.\n\n이 튜토리얼에서는 성을 다스리고, 군사를 모으고, 첫 싸움에서 이기는 데까지 함께 해 봅니다. 언제든 오른쪽 위 \'그만두기\'로 끝낼 수 있습니다.' },
  { title: '천하의 지도', at: '#mapWrap', enter: () => { MapView.focus(tutCity().id); UI.sel = tutCity().id; UI.refresh(); }, text: '색칠된 땅이 각 세력의 영토이고, 성마다 깃발이 꽂혀 있습니다.\n빨간 \'나\' 표시가 지금 내가 있는 평원입니다.\n\n성을 누르면 오른쪽(휴대폰은 아래)에 그 성의 정보가 나옵니다. 끌어서 지도를 옮기고, 휠·손가락으로 확대할 수 있습니다.' },
  { title: '위쪽 막대', at: '#top', text: '왼쪽은 날짜와 내 얼굴·신분, 가운데는 세력의 금·쌀·병사 합계입니다.\n오른쪽 버튼은 세력 목록, 장수 목록, 메뉴(저장·불러오기·소리·하는 법)입니다.' },
  { title: '성 정보', at: '.cityHead', text: () => `평원의 인구·금·쌀·병사가 보입니다.\n\n• 금은 매달 상업에 따라 들어옵니다.\n• 쌀은 해마다 7월에 농업에 따라 거둡니다. 병사들이 매달 쌀을 먹습니다.\n• 병사는 징병으로 늘리고, 훈련으로 강하게 만듭니다.` },
  { title: '내정: 개간', at: '.cmd[title="개간"]', snap: () => tutCity().agri, wait: b => tutCity().agri > b, hint: '\'개간\'을 누르고 장수를 고르세요', text: '명령은 장수에게 맡깁니다. 장수 한 명은 한 달에 한 가지 일만 할 수 있습니다.\n\n\'개간\'을 눌러 장수를 고르세요. 정치가 높은 장수일수록 효과가 큽니다. 농업이 오르면 가을에 쌀이 더 들어옵니다.' },
  { title: '군사: 징병', at: '.cmd[title="징병"]', snap: () => tutCity().troops, wait: b => tutCity().troops > b, hint: '\'징병\'을 누르고 병사 수를 정하세요', text: '이웃 복양에 황건 잔당이 자리 잡았습니다. 싸우려면 병사가 필요합니다.\n\n\'징병\'을 눌러 병사를 모으세요. 병사 100명에 금 10이 들고, 많이 뽑으면 치안이 조금 떨어집니다.' },
  { title: '쓸 수 있는 장수', at: '.cmdT', text: '명령 칸 위의 \'쓸 수 있는 장수\' 수가 줄었습니다. 일을 맡은 장수는 이번 달에 다시 쓸 수 없습니다.\n\n장수가 많을수록 한 달에 많은 일을 할 수 있으니, \'탐색\'으로 재야의 인재를 찾고 \'등용\'으로 데려오세요.' },
  { title: '다음 달로', at: '#bEnd', snap: () => mIdx(), wait: b => mIdx() > b && $('#busy').classList.contains('on') === false, hint: '\'다음 달로\'를 누르세요', text: '할 일을 마쳤으면 \'다음 달로\'를 누릅니다.\n그러면 다른 세력들이 움직이고, 금이 들어오고, 장수들이 다시 일할 수 있게 됩니다.' },
  { title: '적을 살펴보기', at: '#mapWrap', enter: () => MapView.focus(tutTarget().id), wait: () => UI.sel === tutTarget().id, hint: '지도에서 복양을 누르세요', text: '평원 바로 아래(남쪽) 복양에 노란 깃발의 황건 잔당이 있습니다. 우두머리는 관해입니다.\n\n지도에서 복양을 눌러 병력을 확인해 보세요.' },
  { title: '적의 힘', at: '.cityHead', text: () => `복양의 병사는 ${fmt(tutTarget().troops)}명, 우리 평원은 ${fmt(tutCity().troops)}명입니다. 훈련도 우리가 높습니다.\n\n병사가 적보다 넉넉하면 싸움이 쉬워집니다. 다른 세력의 성은 정보가 대략만 보일 때도 있습니다.` },
  { title: '출진', at: '.cmd[title="출진"]', enter: () => { UI.sel = tutCity().id; MapView.focus(tutCity().id); UI.refresh(); }, wait: () => inBattle(), overModal: true, hint: '평원에서 \'출진\' → 복양 → 출진!', text: '평원을 다시 고르고 \'출진\'을 누르세요. 목표로 복양을 고르면 부대 편성 창이 열립니다.\n\n부대마다 장수·병종·병사 수를 정합니다. 첫 번째 장수가 총대장입니다. 그대로 \'출진!\'을 눌러도 됩니다.' },
  { title: '진형과 전장', at: '#bcv', overModal: true, text: '전투가 시작되었습니다! (진형을 묻는 창이 뜨면 추천을 고르면 됩니다)\n\n왼쪽이 우리 부대, 오른쪽 성벽 안의 붉은 지붕 칸이 적의 본성입니다. 30일 안에 본성을 차지하거나 적을 모두 물리치면 이깁니다.\n\n성은 성벽과 성문(나무 문)으로 둘러싸여 있어, 성문 옆에 붙어 「공성」으로 부숴야 안으로 들어갈 수 있습니다.' },
  { title: '부대 움직이기', at: '#bcv', snap: () => BattleUI.B ? BattleUI.B.units.filter(u => u.side === 0).map(u => u.at).join() : '', wait: b => !inBattle() || (BattleUI.B && BattleUI.B.units.filter(u => u.side === 0).map(u => u.at).join() !== b), hint: '밝은 칸을 눌러 이동', text: '금테가 둘린 부대가 지금 고른 부대입니다. 밝게 표시된 칸이 갈 수 있는 곳입니다.\n\n적 쪽으로 한 칸을 눌러 움직여 보세요. 다른 부대를 누르면 그 부대로 바뀝니다.' },
  { title: '공격과 대기', at: '#bpanel', wait: () => !inBattle() || (BattleUI.B && BattleUI.B.day >= 2), hint: '이번 날을 마치면 다음으로 넘어갑니다', text: '움직인 뒤 아래 칸에서 할 일을 고릅니다.\n• 공격/사격: 붉게 표시된 적을 누름 (궁병은 두 칸 밖에서 쏨)\n• 공성: 성문·성벽을 부숨 (충차·투석이 특히 셈)\n• 계략: 화계·혼란·위보·고무 (지력이 높을수록 잘 됨)\n• 일기토: 무력에 자신 있는 장수끼리\n• 대기: 이번에는 쉼\n\n모든 부대가 움직이면 적 차례가 됩니다. \'턴 종료\'로 바로 넘길 수도 있습니다.' },
  { title: '끝까지 싸우기', at: '#btop', wait: () => !inBattle(), hint: '싸움이 끝나면 다음으로 넘어갑니다', text: '이런 식으로 날마다 부대를 움직입니다.\n위쪽 \'자동\' 버튼을 누르면 남은 싸움을 맡길 수 있고, \'퇴각\'하면 싸움을 접고 돌아갑니다.\n\n군량이 떨어지면 사기가 무너지니 오래 끌지 마세요!' },
  { title: '싸움의 결과', text: () => tutTarget().f === me().f ? '복양을 차지했습니다! 🎉\n\n사로잡은 적장은 등용하거나 풀어 주거나 처단할 수 있습니다. 새로 얻은 성은 치안이 낮으니 \'치안\'으로 다스려 주세요.' : '이번에는 복양을 얻지 못했습니다.\n\n괜찮습니다. 징병과 훈련으로 힘을 기른 뒤 다시 출진해 보세요. 병사는 적의 1.5배 이상이면 든든합니다.' },
  { title: '더 알아 두면 좋은 것', text: '• 성이 늘어나면 \'위임\'으로 태수에게 맡길 수 있습니다.\n• \'외교\'로 이웃과 동맹을 맺어 등 뒤를 지키세요.\n• 장수의 충성이 낮으면 떠나거나 배신합니다. \'포상\'으로 마음을 얻으세요.\n• 역사 속 사건(반동탁 연합, 삼고초려…)이 때가 되면 일어납니다.\n• 메뉴의 \'하는 법\'에 모든 규칙이 있습니다. 게임은 매달 자동 저장됩니다.' },
  { title: '이제 천하를 향해', last: true, text: '튜토리얼은 여기까지입니다. 이 게임을 그대로 이어서 하셔도 되고, 처음 화면에서 다른 인물·시나리오로 새로 시작해도 됩니다.\n\n난세의 영웅이 되시길!' },
];
