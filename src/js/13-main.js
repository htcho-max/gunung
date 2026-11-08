// ===== 시작 화면·설정·도움말 =====
function showScreen(id) {
  for (const s of $$('#app > section')) s.hidden = s.id !== id;
  if (id === 'scrTitle') { drawTitleBg(); $('#bCont').hidden = !saveMeta('auto'); }
}

function startPlaying(isNew) {
  showScreen('scrGame');
  MapView.fitted = false; MapView.resize();
  UI.sel = me() ? me().city : 0;
  UI.refresh();
  if (isNew) {
    const P = me(), r = role();
    const txt = {
      ruler: `${iga(P.name)} 되어 ${facName(P.f)}군을 이끕니다.\n성을 눌러 명령을 내리고, 할 일을 마치면 '다음 달로'를 누르세요.\n장수마다 한 달에 한 가지 일을 합니다.`,
      gov: `${G.cities[P.city].name} 태수로서 이 성의 내정과 군사를 맡습니다. 군주의 다른 성들은 알아서 움직입니다.`,
      officer: `${facName(P.f)}군의 장수로 시작합니다.\n한 달에 행동력 3으로 근무·단련·친교를 하며 공을 쌓으세요. 출진에 뽑히면 직접 부대를 이끕니다.\n뜻이 맞지 않으면 하야해 떠날 수도 있습니다.`,
      ronin: `재야의 몸으로 ${G.cities[P.city].name}에서 시작합니다.\n떠돌며 인재와 사귀고, 빈 땅에서 거병하거나 마음에 드는 군주에게 사관하세요.`,
    }[r];
    UI.queue({ title: `${G.year}년 ${G.month}월`, portrait: P, text: `${(SCENARIOS[G.scen] || SCENARIOS[190]).desc}\n\n${txt}` });
    UI.flush().then(() => runEvents()).then(() => UI.refresh());
  }
}

const Setup = {
  mode: null, tab: 'all', stats: null, diff: +(store('gunung.diff') ?? 1), hist: store('gunung.hist') !== '0', scen: SCENARIOS[store('gunung.scen')] ? +store('gunung.scen') : 190,
  open() {
    newGame({ diff: this.diff, hist: this.hist, scen: this.scen }); // 고르기용 상태
    showScreen('scrSetup');
    this.renderModes();
  },
  renderModes() {
    const box = $('#setupInner'); box.innerHTML = '';
    const card = (k, title, desc) => el('button', { class: 'modeCard', onclick: () => { this.mode = k; k === 'create' ? this.renderCreate() : this.renderPick(); } }, el('b', {}, title), el('span', { class: 'muted', style: 'font-size:14px' }, desc));
    box.append(el('div', { style: 'display:flex;align-items:center;gap:10px' }, el('button', { class: 'btn sm ghost', onclick: () => showScreen('scrTitle') }, '◂ 처음으로'), el('h2', {}, '시나리오')),
      el('div', { class: 'scenRow' }, Object.values(SCENARIOS).map(sc => el('button', { class: 'scenCard' + (this.scen === sc.year ? ' on' : ''), 'aria-pressed': this.scen === sc.year ? 'true' : 'false', onclick: () => { this.scen = sc.year; store('gunung.scen', String(sc.year)); this.open(); } }, el('b', {}, sc.title.split(' · ')[1]), el('span', { class: 'num' }, sc.year + '년')))),
      el('p', { class: 'muted', style: 'margin:0;max-width:65ch' }, SCENARIOS[this.scen].desc + ` 세력 ${G.factions.length}, 누구로 난세를 살아갈지 고르세요.`),
      el('div', { style: 'display:flex;flex-direction:column;gap:6px' },
        el('div', { class: 'tabs', role: 'radiogroup', 'aria-label': '난이도' }, DIFFS.map((d, i) => el('button', { class: 'tab' + (this.diff === i ? ' on' : ''), role: 'radio', 'aria-checked': this.diff === i ? 'true' : 'false', onclick: () => { this.diff = i; G.diff = i; store('gunung.diff', String(i)); this.renderModes(); } }, d.name))),
        el('div', { class: 'muted', style: 'font-size:13px' }, DIFFS[this.diff].desc),
        el('div', { class: 'tabs', role: 'radiogroup', 'aria-label': '역사 흐름', style: 'margin-top:6px' }, [[true, '역사를 따라'], [false, '자유롭게']].map(([v, n]) => el('button', { class: 'tab' + (this.hist === v ? ' on' : ''), role: 'radio', 'aria-checked': this.hist === v ? 'true' : 'false', onclick: () => { this.hist = v; store('gunung.hist', v ? '1' : '0'); this.open(); } }, n))),
        el('div', { class: 'muted', style: 'font-size:13px' }, this.hist ? '제후들은 역사에서 다투던 지역 안에서 주로 싸우고, 인물은 역사 속 해에 세상을 떠나며, 큰 사건이 역사대로 일어납니다. 내가 고른 인물만은 오래 삽니다.' : '세력권과 역사 속 몰년 없이, 사건 조건만 맞으면 일어납니다.')),
      el('div', { class: 'modeCards' },
        card('ruler', '군주로 시작', '세력 하나를 맡아 모든 성을 다스립니다. 고전적인 방식.'),
        card('officer', '장수로 시작', '군주 밑의 장수나 재야 인물이 되어 출세하거나 떠돌거나 독립합니다.'),
        card('create', '신무장 만들기', '나만의 인물을 만들어 재야에서 시작하거나 빈 땅에서 거병합니다.')));
  },
  renderPick(successor) {
    const box = $('#setupInner'); box.innerHTML = '';
    const ruler = this.mode === 'ruler' && !successor;
    box.append(el('div', { style: 'display:flex;align-items:center;gap:10px' }, el('button', { class: 'btn sm ghost', onclick: () => successor ? (showScreen('scrGame'), UI.refresh()) : this.renderModes() }, '◂ 뒤로'), el('h2', {}, successor ? '이어서 할 인물' : ruler ? '세력 고르기' : '인물 고르기')));
    if (ruler) {
      const grid = el('div', { class: 'ofGrid' });
      for (const F of G.factions.filter(f => f.alive)) {
        const r = G.officers[F.ruler], cs = citiesOf(F.id), offs = factionOfficers(F.id);
        grid.append(el('button', { class: 'ofCard', style: `box-shadow:inset 4px 0 0 ${F.color}`, onclick: () => this.start(r.id) }, portraitImg(r), el('div', { style: 'min-width:0' },
          el('div', { style: 'display:flex;align-items:center;gap:6px' }, el('span', { class: 'dot', style: `background:${F.color}` }), el('span', { class: 'nm' }, r.name)),
          el('div', { class: 'muted', style: 'font-size:12px' }, `${cs.map(c => c.name).join('·')} · 장수 ${offs.length} · 병력 ${fmt(cs.reduce((a, c) => a + c.troops, 0))}`),
          el('div', { class: 'stats5' }, statSpans(r)), bioOf(r) ? el('div', { class: 'bl' }, bioOf(r).text) : null)));
      }
      box.append(grid); return;
    }
    const tabs = el('div', { class: 'tabs' });
    const fs = [['all', '전체'], ...G.factions.filter(f => f.alive).map(f => [f.id, f.name]), ['ronin', '재야']];
    for (const [k, n] of fs) tabs.append(el('button', { class: 'tab' + (this.tab === k ? ' on' : ''), onclick: () => { this.tab = k; this.renderPick(successor); } }, typeof k === 'number' ? el('span', { class: 'dot', style: `background:${G.factions[k].color}` }) : null, n));
    box.append(tabs);
    const list = G.officers.filter(o => (o.st === 'on' || o.st === 'ronin') && (this.tab === 'all' || (this.tab === 'ronin' ? o.st === 'ronin' : o.f === this.tab)));
    list.sort((a, b) => (b.lead + b.war + b.int + b.pol + b.cha) - (a.lead + a.war + a.int + a.pol + a.cha));
    const grid = el('div', { class: 'ofGrid' });
    for (const o of list) grid.append(el('button', { class: 'ofCard', onclick: () => successor ? this.continueAs(o.id) : this.start(o.id) }, portraitImg(o), el('div', { style: 'min-width:0' },
      el('div', { style: 'display:flex;align-items:center;gap:6px' }, el('span', { class: 'dot', style: `background:${facColor(o.f)}` }), el('span', { class: 'nm' }, o.name), el('span', { class: 'muted', style: 'font-size:12px' }, `${o.st === 'ronin' ? '재야' : rankName(o)} · ${G.cities[o.city].name} · ${age(o)}세`)),
      el('div', { class: 'stats5' }, statSpans(o)), bioOf(o) ? el('div', { class: 'bl' }, bioOf(o).text) : null)));
    box.append(grid);
  },
  openPick(successor) { showScreen('scrSetup'); this.tab = 'all'; this.mode = 'officer'; this.renderPick(true); },
  continueAs(id) { G.player = id; G.ap = 3; G.over = false; G.pgold = 100; startPlaying(false); UI.toast(`${G.officers[id].name}의 이야기를 이어 갑니다`); },
  start(id) { G.player = id; G.pgold = 100; const po = G.officers[id]; po.die = Math.max(po.die, po.born + 66); saveGame('auto'); startPlaying(true); },
  roll() {
    const s = {}; let tot = 0;
    for (const k of ['lead', 'war', 'int', 'pol', 'cha']) { s[k] = ri(35, 85); tot += s[k]; }
    while (tot < 320) { const k = pick(Object.keys(s)); if (s[k] < 95) { s[k]++; tot++; } }
    while (tot > 360) { const k = pick(Object.keys(s)); if (s[k] > 30) { s[k]--; tot--; } }
    this.stats = s;
  },
  renderCreate() {
    if (!this.stats) this.roll();
    const box = $('#setupInner'); box.innerHTML = '';
    const nm = el('input', { type: 'text', id: 'newName', maxlength: 4, placeholder: '예: 한결', value: this.name || '' , oninput: e => this.name = e.target.value.trim() });
    const pts = el('b', { class: 'num' });
    const statBox = el('div', { style: 'display:flex;flex-direction:column;gap:6px' });
    const drawStats = () => {
      statBox.innerHTML = '';
      const tot = Object.values(this.stats).reduce((a, b) => a + b, 0);
      pts.textContent = tot;
      for (const k of ['lead', 'war', 'int', 'pol', 'cha']) {
        statBox.append(el('div', { style: 'display:grid;grid-template-columns:44px 36px 1fr auto;gap:8px;align-items:center' }, el('span', { class: 'muted' }, STAT_NAMES[k]), el('b', { class: 'num' }, this.stats[k]), el('div', { class: 'bar' }, el('i', { style: `width:${this.stats[k]}%` })),
          el('span', { style: 'display:flex;gap:4px' },
            el('button', { class: 'btn sm', 'aria-label': STAT_NAMES[k] + ' 내리기', onclick: () => { if (this.stats[k] > 20) { this.stats[k] -= 5; this.spare = (this.spare || 0) + 5; drawStats(); } } }, '−'),
            el('button', { class: 'btn sm', 'aria-label': STAT_NAMES[k] + ' 올리기', onclick: () => { if ((this.spare || 0) >= 5 && this.stats[k] <= 95) { this.stats[k] += 5; this.spare -= 5; drawStats(); } } }, '+'))));
      }
      statBox.append(el('div', { class: 'muted', style: 'font-size:13px' }, `남은 점수 ${this.spare || 0} — 한 능력을 내려 다른 능력에 옮길 수 있습니다`));
    };
    drawStats();
    const empties = G.cities.filter(c => c.f < 0);
    const startSel = el('select', { id: 'newStart' }, el('option', { value: 'ronin' }, '재야로 시작'), el('option', { value: 'rise' }, '빈 땅에서 거병 (군주)'));
    const citySel = el('select', { id: 'newCity' }, G.cities.map(c => el('option', { value: c.id, selected: c.name === '허창' }, `${c.name}${c.f < 0 ? ' (빈 땅)' : ` (${facName(c.f)})`}`)));
    startSel.onchange = () => { citySel.innerHTML = ''; (startSel.value === 'rise' ? empties : G.cities).forEach(c => citySel.append(el('option', { value: c.id }, `${c.name}${c.f < 0 ? ' (빈 땅)' : ` (${facName(c.f)})`}`))); };
    box.append(el('div', { style: 'display:flex;align-items:center;gap:10px' }, el('button', { class: 'btn sm ghost', onclick: () => this.renderModes() }, '◂ 뒤로'), el('h2', {}, '신무장 만들기')),
      el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;align-items:start' },
        el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
          el('label', { class: 'fld' }, '이름 (한글 2~4자)', nm),
          el('label', { class: 'fld' }, '시작', startSel),
          el('label', { class: 'fld' }, '도시', citySel),
          el('div', { class: 'muted', style: 'font-size:13px' }, `나이는 스무 살(${G.year - 20}년생)입니다.`)),
        el('div', { style: 'display:flex;flex-direction:column;gap:10px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:14px' },
          el('div', { style: 'display:flex;align-items:center;gap:10px' }, el('span', { class: 'muted' }, '능력 합계'), pts, el('button', { class: 'btn sm', style: 'margin-left:auto', onclick: () => { this.roll(); this.spare = 0; drawStats(); SFX.play('tick'); } }, '🎲 다시 굴리기')),
          statBox)),
      el('div', {}, el('button', { class: 'btn pri', style: 'padding:12px 28px;font-size:16px', onclick: () => this.createStart(startSel.value, +citySel.value) }, '이 인물로 시작')));
  },
  createStart(how, cid) {
    const name = (this.name || '').trim();
    if (!/^[가-힣]{2,4}$/.test(name)) { UI.toast('이름은 한글 2~4자로 지어 주세요'); return; }
    if (G.officers.some(o => o.name === name)) { UI.toast('이미 있는 이름입니다'); return; }
    const s = this.stats;
    const o = { id: G.officers.length, name, born: G.year - 20, die: G.year + 46 + ri(0, 10), ...s, f: -1, city: cid, loy: 0, merit: 0, fame: 30, st: 'ronin', acted: false, ideal: ri(0, 99), tag: '', found: true, home: cid, fk: '', created: true, bond: {} };
    G.officers.push(o); G.player = o.id; G.pgold = 300;
    if (how === 'rise') { if (G.cities[cid].f >= 0) { UI.toast('빈 땅을 골라 주세요'); return; } createFaction(o, G.cities[cid], 3000); }
    saveGame('auto'); startPlaying(true);
  },
};
function statSpans(o) { return ['lead', 'war', 'int', 'pol', 'cha'].map(k => el('span', {}, STAT_NAMES[k][0], el('i', {}, ' ' + o[k]))); }

function showHelp() {
  UI.modal({ title: '하는 법', wide: true, cancel: 'x', buttons: [{ k: 'x', label: '닫기', cls: 'pri' }], body: el('div', { style: 'display:flex;flex-direction:column;gap:10px;max-width:68ch;font-size:14px' },
    el('p', { style: 'margin:0' }, '한 턴은 한 달입니다. 할 일을 마치고 오른쪽 아래 「다음 달로」를 누르면 다른 세력이 움직이고, 세금(매달)과 추수(7월)가 들어옵니다.'),
    el('p', { style: 'margin:0' }, el('b', {}, '군주·태수 '), '성을 눌러 명령합니다. 장수 한 명이 한 달에 한 가지 일을 합니다. 개간은 쌀, 상업은 금, 치안은 인구와 징병, 성벽은 수비를 돕습니다. 군주는 다른 성을 「위임」해 태수에게 맡길 수 있습니다.'),
    el('p', { style: 'margin:0' }, el('b', {}, '장수 '), '한 달에 행동력 3. 근무로 공을 쌓으면 태수가 됩니다. 태수가 되면 「독립」해 군주가 될 수도 있습니다. 「하야」하면 재야로 돌아갑니다.'),
    el('p', { style: 'margin:0' }, el('b', {}, '재야 '), '어디든 떠돌 수 있습니다. 「탐색」으로 재야 인물을 만나고 「친교」로 사귀세요. 빈 땅(회색 성)에서 「거병」하면 친한 재야 인물이 따라옵니다. 남의 성에서는 「사관」을 청할 수 있습니다.'),
    el('p', { style: 'margin:0' }, el('b', {}, '전투 '), '공격군은 30일 안에 본성(붉은 지붕 칸)을 차지하거나 수비군을 무너뜨려야 합니다. 총대장(노란 점)이 쓰러지면 그쪽이 집니다. 보병은 기병에 강하고, 기병은 빠르며, 궁병은 두 칸 밖에서 쏩니다. 지력 45 이상이면 화계와 혼란을 쓸 수 있고, 불은 바람을 타고 숲으로 번집니다. 적 옆에 붙으면 일기토를 청할 수 있습니다.'),
    el('p', { style: 'margin:0' }, el('b', {}, '수전 '), '적벽대전은 장강 위에서 배로 싸웁니다. 수군 특기가 없는 북쪽 군사는 뱃멀미로 힘이 빠지지만, 배를 쇠사슬로 묶으면 멀미가 사라지는 대신 불이 묶인 배를 타고 번집니다. 동남풍이 불면 불길은 서쪽으로 갑니다.'),
    el('p', { style: 'margin:0' }, el('b', {}, '포로 '), '사로잡은 장수는 등용하거나 풀어 주거나 처단합니다. 처단은 같은 세력 장수들의 마음을 흔듭니다.'),
    el('p', { class: 'muted', style: 'margin:0' }, '매달 초 자동 저장됩니다. 메뉴에서 세 칸에 따로 저장할 수 있습니다. 인물과 사건은 역사·연의를 바탕으로 했고, 능력치는 이 게임에서 새로 매겼습니다.')) });
}

let TITLE = null;
function drawTitleBg() {
  const cv = $('#titleBg'), r = cv.getBoundingClientRect(); if (!r.width) return;
  const d = Math.min(2, devicePixelRatio || 1); cv.width = r.width * d; cv.height = r.height * d;
  const W = r.width, H = r.height;
  // 움직이지 않는 산과 해는 한 번만 그림
  const st = document.createElement('canvas'); st.width = cv.width; st.height = cv.height;
  const x = st.getContext('2d'); x.scale(d, d);
  const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#16242a'); sky.addColorStop(.55, '#2d3b3b'); sky.addColorStop(1, '#0e1417');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  const sr = Math.min(W, H) * .1, sg = x.createRadialGradient(W * .72, H * .3, sr * .2, W * .72, H * .3, sr * 2.6);
  sg.addColorStop(0, 'rgba(230,110,70,.35)'); sg.addColorStop(1, 'rgba(230,110,70,0)'); x.fillStyle = sg; x.fillRect(0, 0, W, H);
  x.fillStyle = '#c94a30'; x.beginPath(); x.arc(W * .72, H * .3, sr, 0, 7); x.fill();
  const R = mulberry(5);
  const layers = [['rgba(62,80,82,.75)', .55, 60], ['rgba(40,55,58,.88)', .66, 80], ['rgba(22,32,36,.97)', .8, 110]];
  for (const [col, base, amp] of layers) {
    x.fillStyle = col; x.beginPath(); x.moveTo(0, H);
    let y = H * base;
    for (let px = 0; px <= W + 20; px += 20) { y = clamp(y + (R() - .5) * amp * .6, H * base - amp, H * base + amp * .4); x.lineTo(px, y - Math.abs(Math.sin(px / (90 + amp))) * amp); }
    x.lineTo(W, H); x.fill();
  }
  TITLE = { cv, st, W, H, d, mist: Array.from({ length: 7 }, (_, i) => ({ y: H * (.45 + i * .07), x: R() * W, w: W * (.4 + R() * .4), v: .08 + R() * .15 })) };
  if (!TITLE.raf) titleLoop();
}
function titleLoop() {
  if (!TITLE) return;
  TITLE.raf = requestAnimationFrame(titleLoop);
  if ($('#scrTitle').hidden || document.hidden) return;
  const { cv, st, W, H, d } = TITLE, now = performance.now();
  const x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(st, 0, 0); x.setTransform(d, 0, 0, d, 0, 0);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 안개
  for (const m of TITLE.mist) {
    if (!still) { m.x += m.v; if (m.x > W) m.x = -m.w; }
    const g = x.createRadialGradient(m.x + m.w / 2, m.y, 10, m.x + m.w / 2, m.y, m.w / 2);
    g.addColorStop(0, 'rgba(200,210,205,.10)'); g.addColorStop(1, 'rgba(200,210,205,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(m.x + m.w / 2, m.y, m.w / 2, 26, 0, 0, 7); x.fill();
  }
  // 깃발 행렬
  for (let i = 0; i < 26; i++) {
    const px = W * .08 + i * W * .033, py = H * .86 + Math.sin(i) * 4, ph = still ? 0 : now / 280 + i * .7;
    x.strokeStyle = 'rgba(10,14,16,.95)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(px, py); x.lineTo(px, py - 36); x.stroke();
    x.fillStyle = i % 5 === 0 ? 'rgba(201,74,48,.95)' : 'rgba(10,14,16,.95)';
    x.beginPath(); x.moveTo(px, py - 36);
    for (let k = 1; k <= 4; k++) x.lineTo(px + k * 3, py - 36 + Math.sin(ph + k) * 1.5 * k / 4);
    for (let k = 4; k >= 0; k--) x.lineTo(px + k * 3, py - 21 + Math.sin(ph + k) * 1.5 * k / 4);
    x.fill();
  }
}

// ===== 시작 =====
function boot() {
  $('#verTxt').textContent = 'v' + VERSION;
  MapView.init(); BattleUI.init();
  $('#bNew').onclick = () => { SFX.play('gong'); Setup.open(); };
  $('#bCont').onclick = () => { if (loadGame('auto')) startPlaying(false); };
  $('#bLoad').onclick = async () => { G = G || newGame(); const ok = await UI.loadDialog(); if (!ok && !me()) showScreen('scrTitle'); };
  $('#bHelp').onclick = () => showHelp();
  window.addEventListener('resize', () => { if (!$('#scrTitle').hidden) drawTitleBg(); });
  showScreen('scrTitle');
}
boot();
