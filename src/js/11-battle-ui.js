// ===== 헥스 전투: 화면 =====
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BattleUI = {
  B: null, cv: null, x: null, hs: 30, ox: 0, oy: 0, dpr: 1, sel: null, mode: 'idle', reach: null, targets: null, tkind: null, prev: null, fast: false, raf: 0, phaseDone: null,
  init() {
    this.cv = $('#bcv'); this.x = this.cv.getContext('2d');
    let down = null;
    this.cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY, moved: 0 }; });
    this.cv.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; down.moved = Math.max(down.moved, Math.abs(dx) + Math.abs(dy)); if (down.moved > 8 && (this.overW > 0 || this.overH > 0)) { this.panX = clamp(down.px + dx, -this.overW, 0); this.panY = clamp(down.py + dy, -this.overH, 0); this.layout(); } });
    this.cv.addEventListener('pointerup', e => { const d = down; down = null; if (!d || d.moved <= 8) this.click(e); });
    this.cv.addEventListener('pointercancel', () => down = null);
    new ResizeObserver(() => this.resize()).observe($('#bmain'));
  },
  resize() {
    const r = this.cv.getBoundingClientRect(); if (!r.width) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
    const panel = $('#bpanel').getBoundingClientRect().height || 60;
    const availH = r.height - panel - 8, availW = r.width - 8;
    this.hs = Math.max(26, Math.min(availW / (Math.sqrt(3) * (BW + .5)), availH / (1.5 * BH + .5)));
    const w = Math.sqrt(3) * this.hs * (BW + .5), h = this.hs * (1.5 * BH + .5);
    this.overW = Math.max(0, w - availW); this.overH = Math.max(0, h - availH);
    this.baseX = this.overW ? 4 : (r.width - w) / 2; this.baseY = this.overH ? 4 : Math.max(4, (availH - h) / 2 + 4);
    if (this.panX == null || !this.overW) this.panX = 0;
    if (this.panY == null || !this.overH) this.panY = 0;
    this.panX = clamp(this.panX, -this.overW, 0); this.panY = clamp(this.panY, -this.overH, 0);
    this.layout();
  },
  layout() { this.ox = this.baseX + this.panX; this.oy = this.baseY + this.panY; },
  focusOn(i) { if (!this.overW && !this.overH) return; const c = this.center(i); const r = this.cv.getBoundingClientRect(); this.panX = clamp(this.panX + r.width / 2 - c.x, -this.overW, 0); this.panY = clamp(this.panY + (r.height - 70) / 2 - c.y, -this.overH, 0); this.layout(); },
  center(i) { const q = tQ(i), r = tR(i), w = Math.sqrt(3) * this.hs; return { x: this.ox + w * (q + .5 * (r & 1)) + w / 2, y: this.oy + this.hs + r * 1.5 * this.hs }; },
  tileAt(px, py) { let best = -1, bd = 1e9; for (let i = 0; i < BW * BH; i++) { const c = this.center(i); const d = (c.x - px) ** 2 + (c.y - py) ** 2; if (d < bd) { bd = d; best = i; } } return bd < this.hs * this.hs ? best : -1; },

  async run(B) {
    this.B = B; B.interactive = true; this.sel = null; this.mode = 'idle';
    $('#blog').innerHTML = '';
    B.onMsg = (t, k) => { const d = el('div', { class: k }, t); $('#blog').prepend(d); while ($('#blog').children.length > 6) $('#blog').lastChild.remove(); };
    for (const u of B.units) { const c = { x: 0, y: 0 }; u.vx = null; }
    showScreen('scrBattle'); this.panX = null; this.panY = null; this.resize();
    for (const u of B.units) { const c = this.center(u.at); u.vx = c.x; u.vy = c.y; }
    this.updTop(); this.panel();
    cancelAnimationFrame(this.raf); const loop = () => { this.draw(); this.raf = requestAnimationFrame(loop); }; loop();
    SFX.play('drum');
    bmsg(B, `${G.cities[B.cityId].name} 공방전이 시작되었다! 바람은 ${['동', '북동', '북서', '서', '남서', '남동'][B.wind]}쪽으로 분다`, 'big');
    while (!B.over) {
      for (const side of [0, 1]) {
        B.side = side; this.updTop();
        const mine = B.units.filter(u => u.alive && u.side === side && B.ctrl && B.ctrl(u));
        if (mine.length && !B.auto) await this.playerPhase();
        if (battleCheck(B)) break;
        const ai = B.units.filter(u => u.alive && u.side === side && !u.done && !(B.ctrl && B.ctrl(u) && !B.auto));
        ai.sort((a, b) => (b.type === 'arc') - (a.type === 'arc'));
        for (const u of ai) { if (!u.alive || B.over) continue; await this.aiAct(u); if (battleCheck(B)) break; }
        if (B.over) break;
      }
      if (!B.over) { endDay(B); this.updTop(); await sleep(this.fast ? 60 : 220); }
    }
    this.sel = null; this.mode = 'idle'; this.panel();
    const won = B.result.win === B.playerSide;
    this.banner = { text: B.playerSide == null ? (B.result.win === 0 ? '공격군 승리' : '수비군 승리') : won ? '승리' : '패배', sub: B.result.why, t0: performance.now(), good: won };
    await sleep(1800);
    cancelAnimationFrame(this.raf); this.banner = null;
    showScreen('scrGame'); MapView.resize();
  },
  playerPhase() {
    return new Promise(res => { this.phaseDone = res; this.mode = 'idle'; this.sel = null; this.panel(); this.autoSelect(); });
  },
  endPhase() {
    if (!this.phaseDone) return;
    const B = this.B;
    for (const u of B.units) if (u.alive && u.side === B.side && B.ctrl(u)) u.done = true;
    this.sel = null; this.mode = 'idle'; this.reach = null; this.targets = null;
    const r = this.phaseDone; this.phaseDone = null; this.panel(); r();
  },
  autoSelect() {
    const B = this.B;
    const next = B.units.find(u => u.alive && u.side === B.side && B.ctrl(u) && !u.done && !u.conf);
    if (!next) { const anyLeft = B.units.some(u => u.alive && u.side === B.side && B.ctrl(u) && !u.done); if (!anyLeft || true) { /* 모두 끝 */ } }
    if (next) this.selectUnit(next); else this.panel();
  },
  selectUnit(u) { this.focusOn(u.at); this.sel = u; this.mode = 'move'; this.reach = reachable(this.B, u); this.prev = u.at; this.targets = null; this.panel(); },
  myTurn() { return !!this.phaseDone; },
  async click(e) {
    const B = this.B; if (!B || this.busyAnim) return;
    const r = this.cv.getBoundingClientRect();
    const i = this.tileAt(e.clientX - r.left, e.clientY - r.top); if (i < 0) return;
    const u = unitAt(B, i);
    if (!this.myTurn()) { if (u) { this.info = u; this.panel(); } return; }
    if (this.mode === 'target') {
      if (this.targets.includes(i)) await this.doAction(this.tkind, i);
      else { this.mode = 'act'; this.targets = null; this.panel(); }
      return;
    }
    if (this.mode === 'act') { if (u && u !== this.sel) { this.info = u; this.panel(); } return; }
    if (u && u.side === B.side && B.ctrl(u) && !u.done) {
      if (u === this.sel && this.mode === 'move') { this.mode = 'act'; this.panel(); return; }
      if (u.conf) { this.info = u; this.panel(); SFX.play('no'); return; }
      this.selectUnit(u); SFX.play('tick'); return;
    }
    if (this.mode === 'move' && this.sel && this.reach.has(i) && !u) {
      this.busyAnim = true; await this.moveAlong(this.sel, pathTo(B, this.sel, i)); this.busyAnim = false;
      if (battleCheck(B)) { this.endPhase(); return; }
      this.mode = 'act'; this.panel(); return;
    }
    if (u) { this.info = u; this.panel(); }
  },
  async moveAlong(u, path) {
    for (let k = 1; k < path.length; k++) { u.at = path[k]; SFX.play('step'); await sleep(this.fast ? 40 : 110); }
    u.at = path[path.length - 1];
  },
  async lunge(a, d) { a.lunge = { to: d.at, t0: performance.now() }; await sleep(this.fast ? 90 : 220); a.lunge = null; },
  async doAction(kind, target) {
    const B = this.B, u = this.sel; this.busyAnim = true;
    if (kind === 'attack') { const t = unitAt(B, target); await this.lunge(u, t); doAttack(B, u, t); u.done = true; }
    else if (kind === 'fire' || kind === 'confuse') { doTactic(B, u, kind, target); u.done = true; await sleep(250); }
    else if (kind === 'duel') {
      const t = unitAt(B, target);
      if (duelAccept(B, u, t)) await this.duel(u, t, 0); else { bmsg(B, `${eun(bOff(t).name)} 일기토를 피했다`); SFX.play('no'); }
      u.done = true;
    }
    this.busyAnim = false;
    this.mode = 'idle'; this.sel = null; this.targets = null; this.reach = null;
    if (battleCheck(B)) { this.endPhase(); return; }
    const left = B.units.some(x => x.alive && x.side === B.side && B.ctrl(x) && !x.done && !x.conf);
    if (!left) { await sleep(150); this.endPhase(); return; }
    this.autoSelect();
  },
  async aiAct(u) {
    const B = this.B;
    const plan = aiPlan(B, u);
    if (!plan) { u.done = true; return; }
    if (plan.tile != null && plan.tile !== u.at) await this.moveAlong(u, pathTo(B, u, plan.tile));
    if (battleCheck(B)) return;
    if (plan.act) {
      const a = plan.act;
      if (a.kind === 'attack') { const t = B.units[a.target]; if (t.alive) { await this.lunge(u, t); doAttack(B, u, t); } }
      else if (a.kind === 'duel') {
        const t = B.units[a.target];
        if (t.alive && B.ctrl && B.ctrl(t) && !B.auto) {
          const ch = await UI.choose({ title: '일기토 신청', portrait: bOff(u), text: `${iga(bOff(u).name)} ${bOff(t).name}에게 일기토를 청해 왔다!\n${bOff(u).name} 무력 ${bOff(u).war} · ${bOff(t).name} 무력 ${bOff(t).war}`, options: [{ k: 'y', label: '받아들인다' }, { k: 'n', label: '피한다 (사기 −10)' }] });
          if (ch === 'y') await this.duel(u, t, 1); else { t.morale = clamp(t.morale - 10, 0, 100); bmsg(B, `${eun(bOff(t).name)} 일기토를 피했다`); }
        } else if (t.alive) { if (duelAccept(B, u, t)) { const pIn = B.ctrl && (B.ctrl(u) || B.ctrl(t)); if (pIn) await this.duel(u, t, -1); else duelAuto(B, u, t); } else bmsg(B, `${eun(bOff(t).name)} 일기토를 피했다`); }
      } else { doTactic(B, u, a.kind, a.target); await sleep(this.fast ? 80 : 260); }
    }
    u.done = true;
    await sleep(this.fast ? 30 : 90);
  },

  // 일기토 화면. me: 0 = 내가 신청, 1 = 내가 받음, -1 = 지켜봄
  duel(cu, tu, me) {
    const B = this.B;
    const A = bOff(cu), D = bOff(tu);
    const myIdx = me === 0 ? 0 : me === 1 ? 1 : -1;
    SFX.play('duel');
    return new Promise(res => {
      const layer = $('#modalLayer');
      let hp = [100, 100], round = 0;
      const bars = [el('i', { style: 'width:100%' }), el('i', { style: 'width:100%' })];
      const side = (o, i) => el('div', { class: 'side' }, portraitImg(o), el('div', { class: 'disp', style: 'font-size:20px' }, o.name), el('div', { class: 'muted num', style: 'font-size:13px' }, `무력 ${o.war}`), el('div', { class: 'hp' }, bars[i]));
      const logBox = el('div', { class: 'duelLog' });
      const btns = el('footer', {});
      const box = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
        el('header', {}, el('h4', {}, '일기토')),
        el('div', { class: 'body' }, el('div', { class: 'duel' }, side(A, 0), el('div', { class: 'vs' }, '對'), side(D, 1)), logBox), btns);
      layer.innerHTML = ''; layer.append(box); layer.classList.add('on');
      const close = () => { layer.classList.remove('on'); layer.innerHTML = ''; res(); };
      const finish = (how, winner) => {
        if (how === 'draw') duelFinish(B, cu, tu, 'draw');
        else if (how === 'fled') duelFinish(B, winner === 0 ? cu : tu, winner === 0 ? tu : cu, 'fled');
        else duelFinish(B, winner === 0 ? cu : tu, winner === 0 ? tu : cu, 'ko');
        btns.innerHTML = ''; let closed = false; const cl = () => { if (!closed) { closed = true; close(); } }; btns.append(el('button', { class: 'btn pri', onclick: cl }, '전장으로')); if (myIdx < 0) setTimeout(cl, 1600);
        btns.querySelector('button').focus();
      };
      const step = act => {
        round++;
        const acts = [myIdx === 0 ? act : duelAI(A, D, hp[0], hp[1]), myIdx === 1 ? act : duelAI(D, A, hp[1], hp[0])];
        const r = duelRound(A, D, hp, acts);
        logBox.innerHTML = ''; r.text.forEach(t => logBox.append(el('div', {}, t)));
        if (r.dmg[0] + r.dmg[1] > 0) SFX.play('clash');
        if (r.fled >= 0) { logBox.append(el('div', { style: 'color:var(--brass)' }, '일기토가 끝났다')); return finish('fled', 1 - r.fled); }
        hp[0] = Math.max(0, hp[0] - r.dmg[0]); hp[1] = Math.max(0, hp[1] - r.dmg[1]);
        bars[0].style.width = hp[0] + '%'; bars[1].style.width = hp[1] + '%';
        if (hp[0] <= 0 || hp[1] <= 0) { const w = hp[0] > hp[1] ? 0 : 1; logBox.append(el('div', { style: 'color:var(--brass)' }, `${[A, D][w].name}의 승리!`)); SFX.play('win'); return finish('ko', w); }
        if (round >= 10) { logBox.append(el('div', {}, '날이 저물어 승부를 내지 못했다')); return finish('draw'); }
        if (myIdx < 0) setTimeout(() => step(null), 650); else drawBtns();
      };
      const drawBtns = () => {
        btns.innerHTML = '';
        for (const [k, l] of Object.entries(DUEL_ACTS)) btns.append(el('button', { class: 'btn' + (k === 'atk' ? ' pri' : ''), onclick: () => step(k) }, l));
      };
      logBox.append(el('div', {}, `${wa(A.name)} ${iga(D.name)} 말을 몰아 맞선다!`));
      if (myIdx < 0) setTimeout(() => step(null), 700); else drawBtns();
    });
  },

  // ===== 그리기 =====
  updTop() {
    const B = this.B, c = G.cities[B.cityId];
    const top = $('#btop'); top.innerHTML = '';
    const arrow = ['→', '↗', '↖', '←', '↙', '↘'][B.wind];
    top.append(el('span', { class: 'ttl' }, `${c.name} 공방전`), el('span', { class: 'muted num', style: 'font-size:13px' }, `${B.day}일째 / ${B.maxDay} · 바람 ${arrow}`));
    top.append(el('span', { class: 'food num' }, el('span', { class: 'dot', style: `background:${facColor(B.attF)};margin-right:4px` }), `군량 ${fmt(B.food[0])}  `, el('span', { class: 'dot', style: `background:${facColor(B.defF)};margin:0 4px 0 8px` }), `군량 ${fmt(B.food[1])}`));
    top.append(el('span', { class: 'sp' }));
    top.append(el('button', { class: 'btn sm', onclick: () => { this.fast = !this.fast; this.updTop(); } }, this.fast ? '보통 속도' : '빠르게'));
    if (B.ctrl && B.units.some(u => B.ctrl(u))) top.append(el('button', { class: 'btn sm', onclick: () => { B.auto = !B.auto; if (B.auto) this.endPhase(); this.updTop(); } }, B.auto ? '직접 지휘' : '자동 전투'));
    if (B.ctrl && B.units.some(u => B.ctrl(u)) && (B.ctrl(B.units.find(u => u.side === B.playerSide && u.cmd) || {}))) top.append(el('button', { class: 'btn sm red', onclick: () => this.retreat() }, '퇴각'));
  },
  async retreat() {
    const B = this.B;
    if (!(await UI.confirm('퇴각', B.playerSide === 0 ? '군을 물려 돌아갑니다.' : '성을 버리고 물러납니다.'))) return;
    B.over = true; B.result = { win: 1 - B.playerSide, why: B.playerSide === 0 ? '공격군이 스스로 물러났다' : '수비군이 성을 버리고 물러났다' };
    if (B.playerSide === 1) for (const u of B.units) if (u.alive && u.side === 1) { u.alive = false; B.fled[1].push({ oid: u.oid, troops: u.troops }); }
    this.endPhase();
  },
  panel() {
    const B = this.B, p = $('#bpanel'); p.innerHTML = '';
    const u = this.sel || this.info;
    if (u) {
      const o = bOff(u);
      p.append(el('div', { class: 'uinfo' }, portraitImg(o, ''), el('div', { style: 'min-width:0' },
        el('div', {}, el('span', { class: 'disp', style: 'font-size:18px' }, o.name), ' ', el('span', { class: 'muted', style: 'font-size:13px' }, `${TYPES[u.type].name}${u.cmd ? ' · 총대장' : ''} · ${facName(u.side === 0 ? B.attF : B.defF)}군${u.conf ? ' · 혼란' : ''}`)),
        el('div', { class: 'muted num', style: 'font-size:13px' }, `병사 ${fmt(u.troops)}/${fmt(u.max)} · 사기 ${u.morale} · 훈련 ${u.train} · 통${o.lead} 무${o.war} 지${o.int} · ${TER[B.tiles[u.at].t].name}`))));
    } else p.append(el('div', { class: 'uinfo muted', style: 'font-size:14px' }, this.myTurn() ? '내 부대를 눌러 움직이세요. 파란 칸으로 옮긴 뒤 행동을 고릅니다.' : '상대가 움직이는 중…'));
    this.info = null;
    const acts = el('div', { class: 'acts' });
    if (this.myTurn() && this.sel && (this.mode === 'act' || this.mode === 'move')) {
      const s = this.sel, at = attackTargets(B, s), o = bOff(s);
      const go = (kind, list) => { this.mode = 'target'; this.tkind = kind; this.targets = list; this.panel(); };
      if (this.mode === 'move') acts.append(el('button', { class: 'btn sm', onclick: () => { this.mode = 'act'; this.panel(); } }, '제자리에서 행동'));
      else {
        acts.append(el('button', { class: 'btn sm pri', disabled: !at.length, onclick: () => go('attack', at.map(e => e.at)) }, s.type === 'arc' ? '사격' : '공격'));
        const ft = tacticTargets(B, s, 'fire'), ct = tacticTargets(B, s, 'confuse');
        if (o.int >= 45) { acts.append(el('button', { class: 'btn sm', disabled: !ft.length, onclick: () => go('fire', ft) }, '화계')); acts.append(el('button', { class: 'btn sm', disabled: !ct.length, onclick: () => go('confuse', ct) }, '혼란')); }
        const dt = enemiesOf(B, s).filter(e => hexDist(e.at, s.at) === 1);
        acts.append(el('button', { class: 'btn sm', disabled: !dt.length, onclick: () => go('duel', dt.map(e => e.at)) }, '일기토'));
        acts.append(el('button', { class: 'btn sm', onclick: async () => { s.done = true; this.mode = 'idle'; this.sel = null; const left = B.units.some(x => x.alive && x.side === B.side && B.ctrl(x) && !x.done && !x.conf); if (!left) this.endPhase(); else this.autoSelect(); } }, '대기'));
        if (s.at !== this.prev) acts.append(el('button', { class: 'btn sm ghost', onclick: () => { s.at = this.prev; this.selectUnit(s); } }, '이동 취소'));
      }
    }
    if (this.mode === 'target') acts.append(el('span', { class: 'muted', style: 'font-size:13px' }, this.tkind === 'fire' || this.tkind === 'confuse' ? '주황 칸을 고르세요 (숫자는 성공 가능성)' : '빨간 테두리의 적을 고르세요'), el('button', { class: 'btn sm ghost', onclick: () => { this.mode = 'act'; this.targets = null; this.panel(); } }, '취소'));
    if (this.myTurn()) acts.append(el('button', { class: 'btn sm red', onclick: () => this.endPhase() }, '턴 종료'));
    p.append(acts);
    setTimeout(() => this.resize(), 0);
  },
  hexPath(cx, cy, s) { const x = this.x; x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 30); const px = cx + s * Math.cos(a), py = cy + s * Math.sin(a); k ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); },
  draw() {
    const B = this.B; if (!B) return;
    const x = this.x, d = this.dpr, s = this.hs, now = performance.now();
    x.setTransform(d, 0, 0, d, 0, 0);
    x.fillStyle = '#0d1417'; x.fillRect(0, 0, this.cv.width, this.cv.height);
    const R = mulberry(B.cityId + 3);
    for (let i = 0; i < B.tiles.length; i++) {
      const t = B.tiles[i], c = this.center(i), T = TER[t.t];
      const n = R();
      this.hexPath(c.x, c.y, s - .5);
      x.fillStyle = shade(T.col, Math.round((n - .5) * 14)); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1; x.stroke();
      this.glyph(t.t, c.x, c.y, s, n);
      if (t.fire > 0) {
        for (let k = 0; k < 4; k++) {
          const fx = c.x + Math.sin(now / 150 + k * 2 + i) * s * .3, fy = c.y + s * .25 - k * s * .1;
          const fh = s * (.35 + .15 * Math.sin(now / 90 + k + i));
          x.fillStyle = k % 2 ? 'rgba(255,190,70,.85)' : 'rgba(230,80,30,.8)';
          x.beginPath(); x.moveTo(fx - s * .14, fy); x.quadraticCurveTo(fx, fy - fh * 1.5, fx + s * .14, fy); x.fill();
        }
      }
    }
    // 이동 가능 칸
    if (this.myTurn() && this.mode === 'move' && this.reach) {
      for (const [i] of this.reach) { const c = this.center(i); this.hexPath(c.x, c.y, s - 2); x.fillStyle = 'rgba(110,190,255,.28)'; x.fill(); x.strokeStyle = 'rgba(160,215,255,.6)'; x.lineWidth = 1; x.stroke(); }
    }
    if (this.mode === 'target' && this.targets) {
      for (const i of this.targets) {
        const c = this.center(i); this.hexPath(c.x, c.y, s - 2);
        const tac = this.tkind === 'fire' || this.tkind === 'confuse';
        x.strokeStyle = tac ? '#ffb347' : '#ff5a3c'; x.lineWidth = 3; x.stroke();
        if (tac) { x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(c.x - s * .45, c.y + s * .35, s * .9, s * .38); x.fillStyle = '#ffd38a'; x.font = `${Math.round(s * .32)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(Math.round(tacticChance(B, this.sel, this.tkind, i) * 100) + '%', c.x, c.y + s * .54); }
      }
    }
    // 부대
    for (const u of B.units) {
      if (!u.alive) continue;
      const c = this.center(u.at);
      if (u.vx == null) { u.vx = c.x; u.vy = c.y; }
      u.vx += (c.x - u.vx) * .35; u.vy += (c.y - u.vy) * .35;
      let px = u.vx, py = u.vy;
      if (u.lunge) { const tc = this.center(u.lunge.to); const k = Math.sin(Math.min(1, (now - u.lunge.t0) / (this.fast ? 90 : 220)) * Math.PI) * .35; px += (tc.x - px) * k; py += (tc.y - py) * k; }
      const col = facColor(u.side === 0 ? B.attF : B.defF);
      const rr = s * .62;
      x.globalAlpha = u.done && B.side === u.side && this.myTurn() ? .55 : 1;
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(px, py + rr * .8, rr * .9, rr * .3, 0, 0, 7); x.fill();
      x.fillStyle = '#1a2328'; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill();
      x.lineWidth = Math.max(2, s * .12); x.strokeStyle = col; x.stroke();
      if (B.ctrl && B.ctrl(u)) { x.lineWidth = 1.5; x.strokeStyle = '#e8c86a'; x.beginPath(); x.arc(px, py, rr + s * .1, 0, 7); x.stroke(); }
      x.fillStyle = '#efe4cc'; x.font = `${Math.round(s * .5)}px 'Song Myung',serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(TYPES[u.type].ch, px, py + 1);
      if (u.cmd) { x.fillStyle = '#e8c86a'; x.beginPath(); x.arc(px + rr * .75, py - rr * .75, s * .14, 0, 7); x.fill(); }
      // 이름
      const name = bOff(u).name;
      x.font = `${Math.max(10, Math.round(s * .34))}px 'Gowun Dodum',sans-serif`;
      const tw = x.measureText(name).width + 6;
      x.fillStyle = 'rgba(12,18,20,.78)'; x.fillRect(px - tw / 2, py - rr - s * .42, tw, s * .4);
      x.fillStyle = '#efe4cc'; x.fillText(name, px, py - rr - s * .22);
      // 병력 막대
      const bw = s * 1.1, bh = Math.max(3, s * .12);
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(px - bw / 2, py + rr + 2, bw, bh);
      x.fillStyle = u.troops / u.max > .5 ? '#7fc29b' : u.troops / u.max > .25 ? '#e0b44c' : '#d9573b';
      x.fillRect(px - bw / 2, py + rr + 2, bw * clamp(u.troops / u.max, 0, 1), bh);
      if (u.conf) { x.fillStyle = '#ffe36b'; x.font = `${Math.round(s * .4)}px sans-serif`; x.fillText('?', px - rr * .8, py - rr * .6); }
      if (this.sel === u) { x.strokeStyle = '#fff'; x.lineWidth = 2; x.setLineDash([4, 3]); x.beginPath(); x.arc(px, py, rr + s * .2, 0, 7); x.stroke(); x.setLineDash([]); }
      x.globalAlpha = 1;
    }
    // 떠오르는 숫자
    B.fx = B.fx.filter(f => now - f.t0 < 1100);
    for (const f of B.fx) {
      const t = (now - f.t0) / 1100; if (t < 0) continue;
      const c = this.center(f.at);
      x.globalAlpha = 1 - t; x.font = `bold ${Math.round(s * .42)}px sans-serif`; x.textAlign = 'center';
      x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.7)'; x.strokeText(f.text, c.x, c.y - s * .5 - t * s * .8);
      x.fillStyle = f.col; x.fillText(f.text, c.x, c.y - s * .5 - t * s * .8);
      x.globalAlpha = 1;
    }
    if (this.banner) {
      const r = this.cv.getBoundingClientRect();
      x.fillStyle = 'rgba(10,15,17,.7)'; x.fillRect(0, r.height / 2 - 60, r.width, 120);
      x.font = "56px 'Song Myung',serif"; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = this.banner.good ? '#e8c86a' : '#e88a70'; x.fillText(this.banner.text, r.width / 2, r.height / 2 - 12);
      x.font = "16px 'Gowun Dodum',sans-serif"; x.fillStyle = '#efe4cc'; x.fillText(this.banner.sub, r.width / 2, r.height / 2 + 34);
    }
  },
  glyph(t, cx, cy, s, n) {
    const x = this.x;
    if (t === 'forest') {
      for (const [dx, dy] of [[-.3, .1], [.25, .15], [0, -.25]]) { const px = cx + dx * s, py = cy + dy * s; x.fillStyle = '#2f4a2a'; x.beginPath(); x.moveTo(px, py - s * .32); x.lineTo(px - s * .2, py + s * .12); x.lineTo(px + s * .2, py + s * .12); x.fill(); x.fillStyle = '#4a3420'; x.fillRect(px - 1, py + s * .12, 2, s * .1); }
    } else if (t === 'mount') {
      x.fillStyle = '#6a5d48'; x.beginPath(); x.moveTo(cx - s * .6, cy + s * .35); x.lineTo(cx - s * .1, cy - s * .45); x.lineTo(cx + s * .35, cy + s * .35); x.fill();
      x.fillStyle = '#e8e2d2'; x.beginPath(); x.moveTo(cx - s * .1, cy - s * .45); x.lineTo(cx - s * .24, cy - s * .2); x.lineTo(cx + s * .03, cy - s * .2); x.fill();
      x.fillStyle = '#75684f'; x.beginPath(); x.moveTo(cx + s * .05, cy + s * .35); x.lineTo(cx + s * .35, cy - s * .15); x.lineTo(cx + s * .62, cy + s * .35); x.fill();
    } else if (t === 'river') {
      x.strokeStyle = 'rgba(220,240,250,.45)'; x.lineWidth = 1.5;
      for (const dy of [-.2, .15]) { x.beginPath(); x.moveTo(cx - s * .45, cy + dy * s); x.quadraticCurveTo(cx - s * .2, cy + dy * s - s * .15, cx, cy + dy * s); x.quadraticCurveTo(cx + s * .2, cy + dy * s + s * .15, cx + s * .45, cy + dy * s); x.stroke(); }
    } else if (t === 'bridge') {
      x.fillStyle = '#6a5034'; for (let k = -2; k <= 2; k++) x.fillRect(cx - s * .5, cy + k * s * .16 - s * .05, s, s * .1);
    } else if (t === 'castle') {
      x.fillStyle = '#7d756c'; x.fillRect(cx - s * .55, cy - s * .3, s * 1.1, s * .6);
      x.fillStyle = '#5e5850'; for (let k = 0; k < 4; k++) x.fillRect(cx - s * .55 + k * s * .3, cy - s * .42, s * .18, s * .14);
      x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; for (let k = 1; k < 3; k++) { x.beginPath(); x.moveTo(cx - s * .55, cy - s * .3 + k * s * .2); x.lineTo(cx + s * .55, cy - s * .3 + k * s * .2); x.stroke(); }
    } else if (t === 'keep') {
      x.fillStyle = '#8a3a2a'; x.beginPath(); x.moveTo(cx - s * .6, cy - s * .05); x.quadraticCurveTo(cx, cy - s * .5, cx + s * .6, cy - s * .05); x.fill();
      x.fillStyle = '#d8ccb4'; x.fillRect(cx - s * .38, cy - s * .05, s * .76, s * .42);
      x.fillStyle = '#4a2a20'; x.fillRect(cx - s * .1, cy + s * .1, s * .2, s * .27);
    } else if (t === 'plain' && n > .7) {
      x.strokeStyle = 'rgba(70,90,40,.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx - s * .2, cy + s * .1); x.lineTo(cx - s * .16, cy - s * .05); x.moveTo(cx + s * .15, cy + s * .2); x.lineTo(cx + s * .2, cy + s * .05); x.stroke();
    }
  },
};
