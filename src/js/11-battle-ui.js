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
    this.vfx = []; this.imgs = {}; this.sprites = {}; this.ribbon = null; this.shakeT = 0;
    B.onFx = fx => { this.vfx.push({ ...fx, t0: performance.now() }); if (fx.big) this.shakeT = performance.now(); };
    B.onMsg = (t, k) => { const d = el('div', { class: k }, t); $('#blog').prepend(d); while ($('#blog').children.length > 6) $('#blog').lastChild.remove(); };
    for (const u of B.units) { const c = { x: 0, y: 0 }; u.vx = null; }
    showScreen('scrBattle'); this.panX = null; this.panY = null; this.resize();
    for (const u of B.units) { const c = this.center(u.at); u.vx = c.x; u.vy = c.y; }
    this.updTop(); this.panel();
    cancelAnimationFrame(this.raf); const loop = () => { this.draw(); this.raf = requestAnimationFrame(loop); }; loop();
    SFX.play('drum');
    bmsg(B, `${B.title || G.cities[B.cityId].name + ' 공방전'}이 시작되었다! 바람은 ${['동', '북동', '북서', '서', '남서', '남동'][B.wind]}쪽으로 분다`, 'big');
    while (!B.over) {
      for (const side of [0, 1]) {
        B.side = side; this.updTop(); this.showRibbon(side);
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
      let hp = [100, 100], round = 0, busy = false, over = false;
      const bars = [el('i', { style: 'width:100%' }), el('i', { style: 'width:100%' })];
      const hpTxt = [el('b', { class: 'num' }, '100'), el('b', { class: 'num' }, '100')];
      const side = (o, i) => el('div', { class: 'side' }, el('div', { style: 'display:flex;align-items:center;gap:8px' }, portraitImg(o, 'dpt'), el('div', {}, el('div', { class: 'disp', style: 'font-size:20px' }, o.name), el('div', { class: 'muted num', style: 'font-size:12px' }, `무력 ${o.war}`))), el('div', { class: 'hp' }, bars[i]), hpTxt[i]);
      const stage = el('canvas', { class: 'duelStage', width: 640, height: 220 });
      const logBox = el('div', { class: 'duelLog' });
      const btns = el('footer', {});
      const box = el('div', { class: 'modal wide', role: 'dialog', 'aria-modal': 'true' },
        el('header', {}, el('h4', {}, '일기토'), el('span', { class: 'muted num', id: 'duelRound', style: 'font-size:13px' }, '')),
        el('div', { class: 'body' }, stage, el('div', { class: 'duel' }, side(A, 0), el('div', { class: 'vs' }, '對'), side(D, 1)), logBox), btns);
      layer.innerHTML = ''; layer.append(box); layer.classList.add('on');
      // ── 무대
      const sx = stage.getContext('2d');
      const dpr = Math.min(2, devicePixelRatio || 1); stage.width = 640 * dpr; stage.height = 220 * dpr; sx.scale(dpr, dpr);
      const imgs = [A, D].map(o => { const im = new Image(); im.src = portraitURL(o); return im; });
      const cols = [facColor(B.units[cu.id].side === 0 ? B.attF : B.defF), facColor(tu.side === 0 ? B.attF : B.defF)];
      const horseCol = o => o.name === '여포' ? '#a8321d' : o.name === '조운' || o.name === '마초' ? '#e8e2d6' : o.name === '장비' ? '#2a2420' : ['#6b4a2e', '#4a3424', '#8a6a48', '#3a2a20'][hashStr(o.name) % 4];
      const weapon = o => ({ 관우: 'glaive', 장비: 'serpent', 여포: 'halberd', 조운: 'spear', 마초: 'spear', 황충: 'saber', 허저: 'saber', 전위: 'axes' })[o.name] || (o.war >= 80 ? 'spear' : 'saber');
      const R = [{ x: 120, y: 150, dir: 1, fall: 0, off: 0, flash: 0, guard: 0, turn: 0 }, { x: 520, y: 150, dir: -1, fall: 0, off: 0, flash: 0, guard: 0, turn: 0 }];
      const fx = []; let shakeT = 0, raf = 0;
      const drawRider = (i, now) => {
        const r = R[i], o = [A, D][i];
        const gal = Math.abs(r.vx || 0) > .5 ? 1 : .25, ph = now / (gal > .5 ? 90 : 300) + i;
        const bob = Math.sin(ph * 2) * 3 * gal;
        sx.save(); sx.translate(r.x, r.y + bob); sx.scale(r.dir * (r.turn ? -1 : 1), 1);
        // 그림자
        sx.fillStyle = 'rgba(0,0,0,.35)'; sx.beginPath(); sx.ellipse(0, 52 - bob, 52, 8, 0, 0, 7); sx.fill();
        // 말
        const hc = horseCol(o);
        sx.strokeStyle = shade(hc, -40); sx.lineWidth = 6; sx.lineCap = 'round';
        const leg = (lx, ofs) => { const a = Math.sin(ph + ofs) * .6 * gal; sx.beginPath(); sx.moveTo(lx, 10); sx.lineTo(lx + Math.sin(a) * 18, 30); sx.lineTo(lx + Math.sin(a) * 12 + 4, 50); sx.stroke(); };
        leg(-26, 0); leg(22, Math.PI);
        sx.fillStyle = hc; sx.beginPath(); sx.ellipse(0, 4, 40, 17, 0, 0, 7); sx.fill();
        sx.beginPath(); sx.moveTo(26, -4); sx.quadraticCurveTo(42, -22, 46, -38); sx.lineTo(60, -34); sx.quadraticCurveTo(62, -26, 54, -24); sx.quadraticCurveTo(46, -10, 36, 8); sx.closePath(); sx.fill();
        sx.fillStyle = shade(hc, -45); sx.beginPath(); sx.moveTo(30, -10); sx.quadraticCurveTo(38, -36, 46, -40); sx.lineTo(42, -28); sx.quadraticCurveTo(36, -14, 34, -4); sx.fill();
        sx.beginPath(); sx.moveTo(-38, 0); sx.quadraticCurveTo(-60, 4 + Math.sin(ph) * 6, -58, 26); sx.lineTo(-52, 24); sx.quadraticCurveTo(-52, 8, -38, 6); sx.fill();
        leg(-18, Math.PI * .7); leg(30, Math.PI * 1.6);
        sx.fillStyle = cols[i]; sx.fillRect(-16, -12, 30, 8);
        // 기수 (떨어지면 기울어짐)
        sx.save(); sx.translate(0, -12); sx.rotate(-r.fall * 1.4); sx.translate(-r.fall * 30, r.fall * 30);
        sx.fillStyle = shade(cols[i], -20); sx.beginPath(); sx.moveTo(-12, 0); sx.lineTo(12, 0); sx.lineTo(10, -34); sx.lineTo(-10, -34); sx.closePath(); sx.fill();
        sx.fillStyle = '#5d636b'; sx.fillRect(-12, -34, 24, 10);
        // 무기
        const sw = (r.swing || 0);
        sx.save(); sx.translate(8, -26); sx.rotate(-.9 + sw * 1.6 - (r.guard ? .9 : 0));
        const wp = weapon(o);
        sx.strokeStyle = '#4a3020'; sx.lineWidth = 3; sx.beginPath(); sx.moveTo(-14, 0); sx.lineTo(wp === 'saber' || wp === 'axes' ? 30 : 64, 0); sx.stroke();
        sx.fillStyle = '#e6e9ee'; sx.strokeStyle = '#8a9099'; sx.lineWidth = 1;
        if (wp === 'glaive') { sx.beginPath(); sx.moveTo(60, -2); sx.quadraticCurveTo(84, -16, 92, 2); sx.quadraticCurveTo(80, 4, 62, 4); sx.closePath(); sx.fill(); sx.stroke(); sx.fillStyle = '#2f6b46'; sx.beginPath(); sx.arc(58, 0, 3, 0, 7); sx.fill(); }
        else if (wp === 'serpent') { sx.beginPath(); sx.moveTo(62, -3); for (let k = 0; k < 5; k++) sx.lineTo(66 + k * 6, k % 2 ? 3 : -3); sx.lineTo(96, 0); sx.lineTo(66, 3); sx.closePath(); sx.fill(); sx.stroke(); }
        else if (wp === 'halberd') { sx.beginPath(); sx.moveTo(62, -2); sx.lineTo(90, 0); sx.lineTo(62, 2); sx.fill(); sx.beginPath(); sx.moveTo(56, -2); sx.quadraticCurveTo(52, -16, 62, -18); sx.quadraticCurveTo(60, -8, 64, -2); sx.fill(); sx.beginPath(); sx.moveTo(56, 2); sx.quadraticCurveTo(52, 16, 62, 18); sx.quadraticCurveTo(60, 8, 64, 2); sx.fill(); }
        else if (wp === 'spear') { sx.beginPath(); sx.moveTo(62, -3); sx.lineTo(82, 0); sx.lineTo(62, 3); sx.closePath(); sx.fill(); sx.stroke(); sx.fillStyle = '#c94a30'; sx.beginPath(); sx.moveTo(60, 0); sx.lineTo(54, 8); sx.lineTo(57, 0); sx.fill(); }
        else if (wp === 'axes') { sx.beginPath(); sx.moveTo(26, -2); sx.quadraticCurveTo(36, -14, 40, 0); sx.quadraticCurveTo(36, 14, 26, 2); sx.fill(); sx.stroke(); }
        else { sx.beginPath(); sx.moveTo(28, -3); sx.quadraticCurveTo(56, -6, 62, 0); sx.lineTo(28, 3); sx.closePath(); sx.fill(); sx.stroke(); }
        sx.restore();
        if (r.guard) { sx.strokeStyle = `rgba(160,210,255,${.5 + Math.sin(now / 80) * .3})`; sx.lineWidth = 3; sx.beginPath(); sx.arc(14, -30, 26, -1.2, 1.2); sx.stroke(); }
        // 머리 = 초상
        const im = imgs[i];
        sx.save(); sx.translate(0, -48); sx.scale(r.dir * (r.turn ? -1 : 1), 1);
        sx.beginPath(); sx.arc(0, 0, 16, 0, 7); sx.closePath(); sx.save(); sx.clip();
        if (im.complete && im.naturalWidth) sx.drawImage(im, 14, 6, 92, 92, -16, -16, 32, 32); else { sx.fillStyle = '#d6a87e'; sx.fill(); }
        sx.restore(); sx.strokeStyle = cols[i]; sx.lineWidth = 2.5; sx.stroke();
        sx.restore();
        sx.restore();
        if (r.flash > 0) { sx.fillStyle = `rgba(255,80,50,${r.flash})`; sx.beginPath(); sx.arc(0, -30, 40, 0, 7); sx.fill(); }
        sx.restore();
      };
      const loop = now => {
        raf = requestAnimationFrame(loop);
        sx.save();
        if (now - shakeT < 220) sx.translate((Math.random() - .5) * 8, (Math.random() - .5) * 6);
        // 들판
        const sky = sx.createLinearGradient(0, 0, 0, 220); sky.addColorStop(0, '#3a4a50'); sky.addColorStop(.55, '#6a6650'); sky.addColorStop(.56, '#7d8550'); sky.addColorStop(1, '#4a5a30');
        sx.fillStyle = sky; sx.fillRect(-10, -10, 660, 240);
        sx.fillStyle = 'rgba(30,40,40,.45)'; sx.beginPath(); sx.moveTo(0, 122); for (let k = 0; k <= 16; k++) sx.lineTo(k * 40, 100 + Math.sin(k * 1.7) * 14); sx.lineTo(640, 122); sx.fill();
        sx.fillStyle = 'rgba(200,170,110,.08)'; for (let k = 0; k < 6; k++) { sx.beginPath(); sx.ellipse(((now / 40 + k * 130) % 760) - 60, 190 + (k % 3) * 8, 30, 4, 0, 0, 7); sx.fill(); }
        // 깃발 두 개
        for (const [fxp, c2] of [[30, cols[0]], [610, cols[1]]]) { sx.strokeStyle = '#2a1a0a'; sx.lineWidth = 2; sx.beginPath(); sx.moveTo(fxp, 200); sx.lineTo(fxp, 120); sx.stroke(); sx.fillStyle = c2; sx.beginPath(); sx.moveTo(fxp, 122); for (let k = 1; k <= 5; k++) sx.lineTo(fxp + k * 5 * (fxp < 300 ? 1 : -1), 122 + Math.sin(now / 200 + k) * 2); sx.lineTo(fxp + 25 * (fxp < 300 ? 1 : -1), 146); sx.lineTo(fxp, 146); sx.fill(); }
        for (const i of [0, 1]) { const r = R[i]; r.flash = Math.max(0, r.flash - .04); drawRider(i, now); }
        // 불꽃과 숫자
        for (let k = fx.length - 1; k >= 0; k--) {
          const f = fx[k], t = (now - f.t0) / f.dur; if (t > 1) { fx.splice(k, 1); continue; }
          if (f.kind === 'spark') { for (let j = 0; j < 14; j++) { const a = j * .45 + f.t0, rr = 8 + t * 60; sx.fillStyle = `rgba(255,${200 + j * 3},120,${1 - t})`; sx.beginPath(); sx.arc(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr * .7, 2.2, 0, 7); sx.fill(); } sx.fillStyle = `rgba(255,255,230,${(1 - t) * .8})`; sx.beginPath(); sx.arc(f.x, f.y, 16 * (1 - t) + 4, 0, 7); sx.fill(); }
          if (f.kind === 'num') { sx.font = "bold 26px 'Song Myung',serif"; sx.textAlign = 'center'; sx.lineWidth = 5; sx.strokeStyle = 'rgba(30,8,4,.9)'; sx.globalAlpha = 1 - t * t; sx.strokeText(f.text, f.x, f.y - t * 40); sx.fillStyle = f.col; sx.fillText(f.text, f.x, f.y - t * 40); sx.globalAlpha = 1; }
          if (f.kind === 'word') { sx.font = "40px 'Song Myung',serif"; sx.textAlign = 'center'; sx.globalAlpha = Math.min(1, (1 - t) * 3); sx.lineWidth = 6; sx.strokeStyle = 'rgba(30,8,4,.9)'; sx.strokeText(f.text, 320, 70); sx.fillStyle = '#f3d991'; sx.fillText(f.text, 320, 70); sx.globalAlpha = 1; }
        }
        sx.restore();
      };
      raf = requestAnimationFrame(loop);
      const tween = (ms, fn) => new Promise(r => { const t0 = performance.now(); const tick = () => { const t = Math.min(1, (performance.now() - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(tick); else r(); }; tick(); });
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const play = async (acts, r) => {
        if (still) return;
        // 달려 나가 맞부딪힘
        const atk = acts.map(a => a === 'atk' || a === 'power');
        R[0].guard = acts[0] === 'guard'; R[1].guard = acts[1] === 'guard';
        const fled = r.fled;
        if (fled >= 0) {
          const f = R[fled]; f.turn = 1;
          await tween(700, t => { f.vx = 1; f.x += f.dir * -9; });
          f.vx = 0; return;
        }
        const x0 = [R[0].x, R[1].x];
        await tween(320, t => { const e = t * t; R[0].vx = 1; R[1].vx = 1; R[0].x = x0[0] + (290 - 60 - x0[0]) * e; R[1].x = x0[1] + (350 + 60 - x0[1]) * e; R[0].swing = atk[0] ? t : 0; R[1].swing = atk[1] ? t : 0; });
        SFX.play('clash'); fx.push({ kind: 'spark', x: 320, y: 112, t0: performance.now(), dur: 450 });
        if (acts.includes('power')) shakeT = performance.now();
        for (const i of [0, 1]) if (r.dmg[i] > 0) { R[i].flash = .7; fx.push({ kind: 'num', text: '−' + r.dmg[i], col: '#ffb09a', x: i ? 420 : 220, y: 80, t0: performance.now() + 60, dur: 900 }); if (r.dmg[i] >= 25) shakeT = performance.now(); }
        await tween(160, t => { R[0].swing = atk[0] ? 1 - t : 0; R[1].swing = atk[1] ? 1 - t : 0; });
        await tween(380, t => { R[0].x = 230 + (120 - 230) * t; R[1].x = 410 + (520 - 410) * t; R[0].vx = R[1].vx = t < .9 ? 1 : 0; });
        R[0].vx = R[1].vx = 0; R[0].guard = R[1].guard = false;
      };
      const close = () => { cancelAnimationFrame(raf); layer.classList.remove('on'); layer.innerHTML = ''; res(); };
      const finish = async (how, winner) => {
        over = true;
        if (how === 'ko' && !still) { const l = R[1 - winner]; fx.push({ kind: 'word', text: `${[A, D][winner].name} 승리!`, t0: performance.now(), dur: 2400 }); await tween(600, t => { l.fall = t; }); SFX.play('win'); }
        if (how === 'draw') fx.push({ kind: 'word', text: '승부 없음', t0: performance.now(), dur: 2000 });
        if (how === 'draw') duelFinish(B, cu, tu, 'draw');
        else if (how === 'fled') duelFinish(B, winner === 0 ? cu : tu, winner === 0 ? tu : cu, 'fled');
        else duelFinish(B, winner === 0 ? cu : tu, winner === 0 ? tu : cu, 'ko');
        btns.innerHTML = ''; let closed = false; const cl = () => { if (!closed) { closed = true; close(); } }; btns.append(el('button', { class: 'btn pri', onclick: cl }, '전장으로')); if (myIdx < 0) setTimeout(cl, 1800);
        btns.querySelector('button').focus();
      };
      const step = async act => {
        if (busy || over) return; busy = true; round++;
        $('#duelRound') && ($('#duelRound').textContent = `${round}합`);
        btns.querySelectorAll('button').forEach(b => b.disabled = true);
        const acts = [myIdx === 0 ? act : duelAI(A, D, hp[0], hp[1]), myIdx === 1 ? act : duelAI(D, A, hp[1], hp[0])];
        const r = duelRound(A, D, hp, acts);
        await play(acts, r);
        logBox.innerHTML = ''; r.text.forEach(t => logBox.append(el('div', {}, t)));
        busy = false;
        if (r.fled >= 0) { logBox.append(el('div', { style: 'color:var(--brass)' }, '일기토가 끝났다')); return finish('fled', 1 - r.fled); }
        hp[0] = Math.max(0, hp[0] - r.dmg[0]); hp[1] = Math.max(0, hp[1] - r.dmg[1]);
        bars[0].style.width = hp[0] + '%'; bars[1].style.width = hp[1] + '%'; hpTxt[0].textContent = hp[0]; hpTxt[1].textContent = hp[1];
        if (hp[0] <= 0 || hp[1] <= 0) { const w = hp[0] > hp[1] ? 0 : 1; logBox.append(el('div', { style: 'color:var(--brass)' }, `${[A, D][w].name}의 승리!`)); return finish('ko', w); }
        if (round >= 10) { logBox.append(el('div', {}, '날이 저물어 승부를 내지 못했다')); return finish('draw'); }
        if (myIdx < 0) setTimeout(() => step(null), 350); else drawBtns();
      };
      const drawBtns = () => {
        btns.innerHTML = '';
        const ic = { atk: 'sword', power: 'fire', guard: 'order', flee: 'retreat' };
        for (const [k, l] of Object.entries(DUEL_ACTS)) btns.append(el('button', { class: 'btn' + (k === 'atk' ? ' pri' : k === 'power' ? ' red' : ''), onclick: () => step(k) }, icon(ic[k]), l));
      };
      logBox.append(el('div', {}, `${wa(A.name)} ${iga(D.name)} 말을 몰아 맞선다!`));
      fx.push({ kind: 'word', text: '일기토!', t0: performance.now(), dur: 1400 });
      if (myIdx < 0) setTimeout(() => step(null), 900); else drawBtns();
    });
  },

  // ===== 그리기 =====
  showRibbon(side) {
    const B = this.B;
    const mine = B.playerSide != null && side === B.playerSide;
    const text = B.playerSide == null ? (side === 0 ? '공격군 차례' : '수비군 차례') : mine ? '아군 차례' : '적군 차례';
    this.ribbon = { text, sub: `${B.day}일째`, col: facColor(side === 0 ? B.attF : B.defF), t0: performance.now(), mine };
  },
  updTop() {
    const B = this.B, c = G.cities[B.cityId];
    const top = $('#btop'); top.innerHTML = '';
    const arrow = ['→', '↗', '↖', '←', '↙', '↘'][B.wind];
    top.append(el('div', { class: 'datePlaque' }, el('b', {}, B.title || `${c.name} 공방전`), el('small', {}, `${B.day}일째 / ${B.maxDay}일 · 바람 ${arrow}`)));
    const side = (f, food, n) => el('span', { class: 'chip', title: `${facName(f)}군 군량` }, el('span', { class: 'dot', style: `background:${facColor(f)}` }), `${facName(f)} `, el('span', { class: 'muted' }, `병 ${fmt(n)} · 쌀 ${fmt(food)}`));
    const tr = sd => B.units.filter(u => u.alive && u.side === sd).reduce((a, u) => a + u.troops, 0);
    top.append(el('div', { class: 'food' }, side(B.attF, B.food[0], tr(0)), side(B.defF, B.food[1], tr(1))));
    top.append(el('span', { class: 'sp' }));
    const tb = (ic, label, fn, cls = '') => el('button', { class: 'topBtn ' + cls, onclick: fn, 'aria-label': label }, icon(ic), el('span', {}, label));
    top.append(tb('fast', this.fast ? '보통 속도' : '빠르게', () => { this.fast = !this.fast; this.updTop(); }));
    if (B.ctrl && B.units.some(u => B.ctrl(u))) top.append(tb('auto', B.auto ? '직접 지휘' : '자동 전투', () => { B.auto = !B.auto; if (B.auto) this.endPhase(); this.updTop(); }));
    if (B.ctrl && B.units.some(u => B.ctrl(u)) && (B.ctrl(B.units.find(u => u.side === B.playerSide && u.cmd) || {}))) top.append(tb('retreat', '퇴각', () => this.retreat()));
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
      const bar = (v, max, cls) => el('div', { class: 'bar ' + cls }, el('i', { style: `width:${clamp(v / max * 100, 0, 100)}%` }));
      p.append(el('div', { class: 'uinfo' }, portraitImg(o, ''), el('div', { style: 'min-width:0;display:flex;flex-direction:column;gap:3px' },
        el('div', {}, el('span', { class: 'disp', style: 'font-size:19px' }, o.name), ' ', el('span', { class: 'muted', style: 'font-size:12px' }, `${TYPES[u.type].name}${u.cmd ? ' · 총대장' : ''} · ${facName(u.side === 0 ? B.attF : B.defF)}군${u.conf ? ' · 혼란' : ''} · ${TER[B.tiles[u.at].t].name}`)),
        el('div', { class: 'ubars' }, el('span', {}, '병사'), bar(u.troops, u.max, u.troops / u.max > .5 ? 'jade' : 'red'), el('b', {}, `${fmt(u.troops)}`), el('span', {}, '사기'), bar(u.morale, 100, ''), el('b', {}, u.morale)),
        el('div', { class: 'muted num', style: 'font-size:12px' }, `통${o.lead} 무${o.war} 지${o.int} · 훈련 ${u.train}${skillsOf(o).length ? ' · 특기 ' + skillsOf(o).join('·') : ''}${(o.items || []).length ? ' · ' + o.items.map(id => ITEM[id].name).join('·') : ''}`))));
    } else p.append(el('div', { class: 'uinfo muted', style: 'font-size:14px' }, this.myTurn() ? '내 부대를 눌러 움직이세요. 파란 칸으로 옮긴 뒤 행동을 고릅니다.' : '상대가 움직이는 중…'));
    this.info = null;
    const acts = el('div', { class: 'acts' });
    const A = (ic, label, fn, cls = '', dis = false) => el('button', { class: 'btn ' + cls, disabled: dis, onclick: fn }, icon(ic), label);
    if (this.myTurn() && this.sel && (this.mode === 'act' || this.mode === 'move')) {
      const s = this.sel, at = attackTargets(B, s), o = bOff(s);
      const go = (kind, list) => { this.mode = 'target'; this.tkind = kind; this.targets = list; this.panel(); };
      if (this.mode === 'move') acts.append(A('target', '제자리', () => { this.mode = 'act'; this.panel(); }));
      else {
        acts.append(A(s.type === 'arc' ? 'bow' : 'sword', s.type === 'arc' ? '사격' : '공격', () => go('attack', at.map(e => e.at)), 'pri', !at.length));
        const ft = tacticTargets(B, s, 'fire'), ct = tacticTargets(B, s, 'confuse');
        if (o.int >= 45) { acts.append(A('fire', '화계', () => go('fire', ft), '', !ft.length)); acts.append(A('confuse', '혼란', () => go('confuse', ct), '', !ct.length)); }
        const dt = enemiesOf(B, s).filter(e => hexDist(e.at, s.at) === 1);
        acts.append(A('duel', '일기토', () => go('duel', dt.map(e => e.at)), '', !dt.length));
        acts.append(A('wait', '대기', async () => { s.done = true; this.mode = 'idle'; this.sel = null; const left = B.units.some(x => x.alive && x.side === B.side && B.ctrl(x) && !x.done && !x.conf); if (!left) this.endPhase(); else this.autoSelect(); }));
        if (s.at !== this.prev) acts.append(A('undo', '되돌리기', () => { s.at = this.prev; this.selectUnit(s); }, 'ghost'));
      }
    }
    if (this.mode === 'target') acts.append(el('span', { class: 'muted', style: 'font-size:13px;align-self:center' }, this.tkind === 'fire' || this.tkind === 'confuse' ? '주황 칸을 고르세요 (숫자는 성공 가능성)' : '빨간 테두리의 적을 고르세요'), A('close', '취소', () => { this.mode = 'act'; this.targets = null; this.panel(); }, 'ghost'));
    if (this.myTurn()) acts.append(A('end', '턴 종료', () => this.endPhase(), 'red'));
    p.append(acts);
    setTimeout(() => this.resize(), 0);
  },
  hexPath(cx, cy, s, x = this.x) { x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 30); const px = cx + s * Math.cos(a), py = cy + s * Math.sin(a); k ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); },
  // 지형 칸 그림 (크기별로 한 번만 그려 둠)
  tileSprite(t, variant) {
    const s = this.hs, d = this.dpr, key = `${t}|${variant}|${s.toFixed(1)}|${d}`;
    if (this.sprites[key]) return this.sprites[key];
    const W = Math.ceil(s * 2 + 4), cv = document.createElement('canvas'); cv.width = W * d; cv.height = W * d;
    const x = cv.getContext('2d'); x.scale(d, d);
    const cx = W / 2, cy = W / 2, R = mulberry(variant * 977 + t.length * 31);
    this.hexPath(cx, cy, s - .4, x); x.save(); x.clip();
    const grad = (a, b) => { const g = x.createLinearGradient(0, cy - s, 0, cy + s); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, W, W); };
    const speck = (n, col, sz) => { x.fillStyle = col; for (let i = 0; i < n; i++) { x.beginPath(); x.arc(cx + (R() - .5) * s * 1.8, cy + (R() - .5) * s * 1.7, sz * (.5 + R()), 0, 7); x.fill(); } };
    const water = () => { grad('#6b9fb6', '#3f6f86'); x.strokeStyle = 'rgba(230,248,255,.4)'; x.lineWidth = 1.2; for (let k = -1; k <= 1; k++) { const yy = cy + k * s * .42 + (R() - .5) * 4; x.beginPath(); x.moveTo(cx - s, yy); for (let i = 0; i <= 8; i++) x.lineTo(cx - s + i * s / 4, yy + Math.sin(i * 1.4 + k) * 2); x.stroke(); } };
    const pine = (px, py, h) => {
      x.fillStyle = 'rgba(20,35,15,.35)'; x.beginPath(); x.ellipse(px + h * .15, py + h * .08, h * .32, h * .1, 0, 0, 7); x.fill();
      x.fillStyle = '#4a3420'; x.fillRect(px - h * .04, py - h * .15, h * .08, h * .2);
      for (let k = 0; k < 3; k++) { const yy = py - h * .15 - k * h * .24, ww = h * (.34 - k * .07); const g = x.createLinearGradient(px - ww, 0, px + ww, 0); g.addColorStop(0, '#4f7a3b'); g.addColorStop(1, '#22401f'); x.fillStyle = g; x.beginPath(); x.moveTo(px, yy - h * .36); x.lineTo(px - ww, yy); x.lineTo(px + ww, yy); x.closePath(); x.fill(); }
    };
    if (t === 'plain') {
      grad('#b4c27a', '#93a45f'); speck(14, 'rgba(70,95,40,.25)', s * .06); speck(8, 'rgba(255,250,200,.22)', s * .05);
      x.strokeStyle = 'rgba(60,85,35,.45)'; x.lineWidth = 1; for (let i = 0; i < 5; i++) { const px = cx + (R() - .5) * s * 1.4, py = cy + (R() - .5) * s * 1.3; x.beginPath(); x.moveTo(px - 2, py); x.lineTo(px - 3, py - 4); x.moveTo(px, py); x.lineTo(px, py - 5); x.moveTo(px + 2, py); x.lineTo(px + 3, py - 4); x.stroke(); }
      if (R() < .4) speck(3, 'rgba(240,210,120,.7)', s * .035);
    } else if (t === 'forest') {
      grad('#6f8b4b', '#4e6a35'); speck(10, 'rgba(30,50,20,.3)', s * .08);
      const pts = [[-.35, .05], [.3, .12], [-.02, -.2], [.05, .42], [-.4, .45], [.42, -.25]].slice(0, 4 + Math.floor(R() * 3));
      pts.sort((a, b) => a[1] - b[1]).forEach(([dx, dy]) => pine(cx + dx * s, cy + dy * s + s * .2, s * (.55 + R() * .2)));
    } else if (t === 'mount') {
      grad('#a2957a', '#7a6c52'); speck(10, 'rgba(60,45,30,.25)', s * .07);
      const peak = (px, py, w, h, snow) => {
        x.fillStyle = '#8c7c60'; x.beginPath(); x.moveTo(px - w, py); x.lineTo(px, py - h); x.lineTo(px + w, py); x.fill();
        x.fillStyle = '#5f5240'; x.beginPath(); x.moveTo(px, py - h); x.lineTo(px + w, py); x.lineTo(px + w * .15, py); x.closePath(); x.fill();
        if (snow) { x.fillStyle = '#f2efe6'; x.beginPath(); x.moveTo(px, py - h); x.lineTo(px - w * .32, py - h * .66); x.lineTo(px - w * .08, py - h * .72); x.lineTo(px + w * .1, py - h * .62); x.lineTo(px + w * .3, py - h * .7); x.closePath(); x.fill(); }
      };
      peak(cx + s * .35, cy + s * .45, s * .5, s * .8, false); peak(cx - s * .15, cy + s * .5, s * .62, s * 1.05, true);
    } else if (t === 'river') water();
    else if (t === 'water') { grad('#4f87a3', '#2c5870'); x.strokeStyle = 'rgba(220,240,255,.28)'; x.lineWidth = 1; for (let k = -2; k <= 2; k++) { const yy = cy + k * s * .34 + (R() - .5) * 3, x0 = cx - s + R() * s * .6; x.beginPath(); x.moveTo(x0, yy); x.quadraticCurveTo(x0 + s * .25, yy - 2.5, x0 + s * .5, yy); x.quadraticCurveTo(x0 + s * .75, yy + 2.5, x0 + s, yy); x.stroke(); } }
    else if (t === 'bridge') {
      water();
      x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(cx - s * .38, cy - s, s * .76, s * 2);
      for (let k = -6; k <= 6; k++) { x.fillStyle = k % 2 ? '#8a6a44' : '#7a5c38'; x.fillRect(cx - s * .34, cy + k * s * .16 - s * .07, s * .68, s * .14); }
      x.fillStyle = '#4e3620'; x.fillRect(cx - s * .4, cy - s, s * .07, s * 2); x.fillRect(cx + s * .33, cy - s, s * .07, s * 2);
    } else if (t === 'castle' || t === 'keep') {
      grad('#b5ac9c', '#8b8273');
      x.strokeStyle = 'rgba(60,52,42,.35)'; x.lineWidth = 1;
      for (let row = 0; row < 8; row++) { const yy = cy - s + row * s / 4; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); for (let col = 0; col < 7; col++) { const xx = (col + (row % 2) * .5) * s / 2.4; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + s / 4); x.stroke(); } }
      if (t === 'castle') {
        x.fillStyle = '#7d756a'; x.fillRect(cx - s * .7, cy - s * .2, s * 1.4, s * .5);
        x.fillStyle = '#6a6358'; for (let k = 0; k < 5; k++) x.fillRect(cx - s * .7 + k * s * .32, cy - s * .36, s * .18, s * .18);
        x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(cx - s * .7, cy - s * .2, s * 1.4, s * .06);
      } else {
        x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(cx + 3, cy + s * .5, s * .7, s * .16, 0, 0, 7); x.fill();
        x.fillStyle = '#e2d6bc'; x.fillRect(cx - s * .46, cy - s * .08, s * .92, s * .56);
        x.fillStyle = '#7a2a1c'; for (let k = -1; k <= 1; k++) x.fillRect(cx + k * s * .28 - s * .05, cy - s * .08, s * .1, s * .56);
        const roof = (yy, w, h) => { const g = x.createLinearGradient(0, yy - h, 0, yy); g.addColorStop(0, '#b0402a'); g.addColorStop(1, '#6e2214'); x.fillStyle = g; x.beginPath(); x.moveTo(cx - w, yy); x.quadraticCurveTo(cx - w * .55, yy - h * .25, cx - w * .5, yy - h); x.lineTo(cx + w * .5, yy - h); x.quadraticCurveTo(cx + w * .55, yy - h * .25, cx + w, yy); x.closePath(); x.fill(); x.fillStyle = '#e8c56f'; x.fillRect(cx - w * .5, yy - h - 1.5, w, 2); };
        roof(cy - s * .06, s * .72, s * .3); roof(cy - s * .42, s * .48, s * .26);
        x.fillStyle = '#3a1a10'; x.fillRect(cx - s * .1, cy + s * .2, s * .2, s * .28);
      }
    }
    x.restore();
    // 테두리: 위쪽 밝게, 아래쪽 어둡게
    this.hexPath(cx, cy, s - .6, x);
    const eg = x.createLinearGradient(0, cy - s, 0, cy + s); eg.addColorStop(0, 'rgba(255,250,220,.28)'); eg.addColorStop(1, 'rgba(0,0,0,.35)');
    x.strokeStyle = eg; x.lineWidth = 1.2; x.stroke();
    return this.sprites[key] = cv;
  },
  portraitImgEl(o) {
    let im = this.imgs[o.id];
    if (!im) { im = new Image(); im.src = portraitURL(o); this.imgs[o.id] = im; }
    return im;
  },
  draw() {
    const B = this.B; if (!B) return;
    const x = this.x, d = this.dpr, s = this.hs, now = performance.now();
    const r0 = this.cv.getBoundingClientRect();
    x.setTransform(d, 0, 0, d, 0, 0);
    // 바탕: 어두운 들판과 가장자리 그늘
    const bg = x.createRadialGradient(r0.width / 2, r0.height / 2, 50, r0.width / 2, r0.height / 2, Math.max(r0.width, r0.height) * .7);
    bg.addColorStop(0, '#1d2a24'); bg.addColorStop(1, '#090e10');
    x.fillStyle = bg; x.fillRect(0, 0, r0.width, r0.height);
    // 흔들림
    const sk = now - this.shakeT < 260 ? (1 - (now - this.shakeT) / 260) * 5 : 0;
    if (sk) x.translate((Math.random() - .5) * sk, (Math.random() - .5) * sk);
    // 판 그림자
    const tl = this.center(0), br = this.center(BW * BH - 1);
    x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(tl.x - s, tl.y - s + 6, br.x - tl.x + s * 2.8, br.y - tl.y + s * 2);
    const R = mulberry(B.cityId + 3);
    const W2 = Math.ceil(s * 2 + 4) / 2;
    for (let i = 0; i < B.tiles.length; i++) {
      const t = B.tiles[i], c = this.center(i), v = Math.floor(R() * 3);
      x.drawImage(this.tileSprite(t.t, v), c.x - W2, c.y - W2, W2 * 2, W2 * 2);
      if (t.fire > 0) {
        x.fillStyle = 'rgba(255,120,40,.18)'; this.hexPath(c.x, c.y, s - 1); x.fill();
        for (let k = 0; k < 5; k++) {
          const fx = c.x + Math.sin(now / 150 + k * 2 + i) * s * .32, fy = c.y + s * .3 - (k % 3) * s * .12;
          const fh = s * (.38 + .16 * Math.sin(now / 90 + k + i));
          const g = x.createLinearGradient(0, fy - fh * 1.4, 0, fy); g.addColorStop(0, 'rgba(255,240,150,.9)'); g.addColorStop(.5, 'rgba(255,150,40,.9)'); g.addColorStop(1, 'rgba(200,50,20,.85)');
          x.fillStyle = g; x.beginPath(); x.moveTo(fx - s * .15, fy); x.quadraticCurveTo(fx - s * .05, fy - fh, fx, fy - fh * 1.5); x.quadraticCurveTo(fx + s * .05, fy - fh, fx + s * .15, fy); x.fill();
        }
        for (let k = 0; k < 2; k++) { const ph = ((now / 1400 + k * .5 + i * .13) % 1); x.fillStyle = `rgba(60,55,50,${.35 * (1 - ph)})`; x.beginPath(); x.arc(c.x + Math.sin(ph * 6 + i) * s * .2, c.y - s * .4 - ph * s * 1.2, s * (.18 + ph * .3), 0, 7); x.fill(); }
      }
    }
    // 이동 가능 칸
    if (this.myTurn() && this.mode === 'move' && this.reach) {
      const pulse = .22 + Math.sin(now / 300) * .06;
      for (const [i] of this.reach) { const c = this.center(i); this.hexPath(c.x, c.y, s - 2); x.fillStyle = `rgba(110,190,255,${pulse})`; x.fill(); x.strokeStyle = 'rgba(180,225,255,.75)'; x.lineWidth = 1.2; x.stroke(); }
    }
    if (this.mode === 'target' && this.targets) {
      for (const i of this.targets) {
        const c = this.center(i); this.hexPath(c.x, c.y, s - 2);
        const tac = this.tkind === 'fire' || this.tkind === 'confuse';
        x.fillStyle = tac ? 'rgba(255,170,60,.18)' : 'rgba(255,70,40,.16)'; x.fill();
        x.strokeStyle = tac ? '#ffb347' : '#ff5a3c'; x.lineWidth = 3; x.setLineDash([6, 4]); x.lineDashOffset = -now / 40; x.stroke(); x.setLineDash([]);
        if (tac) { x.fillStyle = 'rgba(20,10,5,.75)'; roundRect(x, c.x - s * .45, c.y + s * .32, s * .9, s * .4, 4); x.fill(); x.fillStyle = '#ffd38a'; x.font = `bold ${Math.round(s * .32)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(Math.round(tacticChance(B, this.sel, this.tkind, i) * 100) + '%', c.x, c.y + s * .53); }
      }
    }
    // 부대 (위에서 아래 순서)
    const us = B.units.filter(u => u.alive).sort((a, b) => (a.vy ?? 0) - (b.vy ?? 0));
    for (const u of us) this.drawUnit(x, u, now);
    // 효과
    this.vfx = this.vfx.filter(f => now - f.t0 < 900);
    for (const f of this.vfx) this.drawFx(x, f, now);
    // 떠오르는 숫자
    B.fx = B.fx.filter(f => now - f.t0 < 1200);
    for (const f of B.fx) {
      const t = (now - f.t0) / 1200; if (t < 0) continue;
      const c = this.center(f.at), yy = c.y - s * .6 - Math.sqrt(t) * s * .9;
      x.globalAlpha = t < .7 ? 1 : (1 - t) / .3; x.font = `bold ${Math.round(s * .46)}px 'Gowun Dodum',sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 4; x.strokeStyle = 'rgba(40,10,5,.85)'; x.strokeText(f.text, c.x, yy);
      x.fillStyle = f.col; x.fillText(f.text, c.x, yy);
      x.globalAlpha = 1;
    }
    x.setTransform(d, 0, 0, d, 0, 0);
    // 차례 띠
    if (this.ribbon) {
      const t = (now - this.ribbon.t0) / 1100;
      if (t > 1) this.ribbon = null;
      else {
        const a = t < .15 ? t / .15 : t > .8 ? (1 - t) / .2 : 1, cy = r0.height * .32;
        x.globalAlpha = a;
        const g = x.createLinearGradient(0, 0, r0.width, 0); g.addColorStop(0, 'rgba(15,8,4,0)'); g.addColorStop(.25, 'rgba(15,8,4,.85)'); g.addColorStop(.75, 'rgba(15,8,4,.85)'); g.addColorStop(1, 'rgba(15,8,4,0)');
        x.fillStyle = g; x.fillRect(0, cy - 34, r0.width, 68);
        x.fillStyle = this.ribbon.col; x.fillRect(r0.width * .25, cy - 34, r0.width * .5, 2); x.fillRect(r0.width * .25, cy + 32, r0.width * .5, 2);
        x.font = "36px 'Song Myung',serif"; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = this.ribbon.mine ? '#f3d991' : '#f0b6a4'; x.fillText(this.ribbon.text, r0.width / 2 + (1 - a) * 30, cy - 4);
        x.font = "13px 'Gowun Dodum',sans-serif"; x.fillStyle = '#f0e5c9'; x.fillText(this.ribbon.sub, r0.width / 2, cy + 22);
        x.globalAlpha = 1;
      }
    }
    if (this.banner) {
      const t = Math.min(1, (now - this.banner.t0) / 400);
      x.fillStyle = `rgba(8,5,3,${.75 * t})`; x.fillRect(0, r0.height / 2 - 70, r0.width, 140);
      x.fillStyle = this.banner.good ? '#d6ad55' : '#c94a30'; x.fillRect(0, r0.height / 2 - 70, r0.width, 2); x.fillRect(0, r0.height / 2 + 68, r0.width, 2);
      x.save(); x.translate(r0.width / 2, r0.height / 2 - 12); x.scale(.8 + t * .2, .8 + t * .2);
      x.font = "64px 'Song Myung',serif"; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 6; x.strokeStyle = 'rgba(40,15,5,.9)'; x.strokeText(this.banner.text, 0, 0);
      x.fillStyle = this.banner.good ? '#f3d991' : '#ef8a6c'; x.fillText(this.banner.text, 0, 0); x.restore();
      x.font = "16px 'Gowun Dodum',sans-serif"; x.fillStyle = '#f0e5c9'; x.textAlign = 'center'; x.fillText(this.banner.sub, r0.width / 2, r0.height / 2 + 40);
    }
  },
  drawUnit(x, u, now) {
    const B = this.B, s = this.hs, c = this.center(u.at);
    if (u.vx == null) { u.vx = c.x; u.vy = c.y; }
    u.vx += (c.x - u.vx) * .35; u.vy += (c.y - u.vy) * .35;
    let px = u.vx, py = u.vy;
    if (u.lunge) { const tc = this.center(u.lunge.to); const k = Math.sin(Math.min(1, (now - u.lunge.t0) / (this.fast ? 90 : 220)) * Math.PI) * .38; px += (tc.x - px) * k; py += (tc.y - py) * k; }
    const o = bOff(u), col = facColor(u.fac ?? (u.side === 0 ? B.attF : B.defF)), rr = s * .6;
    const mine = B.ctrl && B.ctrl(u), dim = u.done && B.side === u.side && this.myTurn();
    if (B.tiles[u.at].t === 'water') { // 배
      const hw = rr * 1.55, hy = py + rr * .62, dir = u.side === 0 ? 1 : -1;
      // 돛
      x.fillStyle = 'rgba(240,228,200,.85)'; x.strokeStyle = 'rgba(60,40,20,.6)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(px - dir * rr * 1.05, py - rr * 1.15); x.lineTo(px - dir * rr * 1.05, py + rr * .1); x.lineTo(px - dir * rr * 1.65, py + rr * .1); x.quadraticCurveTo(px - dir * rr * 1.5, py - rr * .5, px - dir * rr * 1.05, py - rr * 1.15); x.fill(); x.stroke();
      x.fillStyle = col; x.fillRect(px - dir * rr * 1.08 - 1, py - rr * 1.3, 2, rr * .3);
      // 선체
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(px, hy + rr * .5, hw, rr * .16, 0, 0, 7); x.fill();
      const hg = x.createLinearGradient(0, hy - rr * .25, 0, hy + rr * .45); hg.addColorStop(0, '#9a6236'); hg.addColorStop(1, '#4a2a14');
      x.fillStyle = hg; x.beginPath(); x.moveTo(px - hw, hy - rr * .28); x.lineTo(px + hw, hy - rr * .28); x.quadraticCurveTo(px + hw * .85, hy + rr * .45, px + hw * .5, hy + rr * .45); x.lineTo(px - hw * .5, hy + rr * .45); x.quadraticCurveTo(px - hw * .85, hy + rr * .45, px - hw, hy - rr * .28); x.closePath(); x.fill();
      x.strokeStyle = '#2a170b'; x.lineWidth = 1.2; x.stroke();
      x.fillStyle = '#c99a5a'; x.fillRect(px - hw * .95, hy - rr * .32, hw * 1.9, rr * .09);
      x.fillStyle = 'rgba(255,255,255,.35)'; for (let k = -2; k <= 2; k++) { x.beginPath(); x.arc(px + k * hw * .32, hy + rr * .12, rr * .06, 0, 7); x.fill(); }
      if (B.chained && u.side === B.northSide) { x.strokeStyle = '#c8c8c0'; x.lineWidth = 2.4; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(px - hw * 1.45, hy + rr * .1); x.lineTo(px + hw * 1.45, hy + rr * .1); x.moveTo(px, hy + rr * .45); x.lineTo(px, hy + rr * 1.1); x.stroke(); x.setLineDash([]); }
    }
    // 그림자
    x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(px + 2, py + rr * .92, rr * .95, rr * .3, 0, 0, 7); x.fill();
    // 고리
    if (mine && !dim) { const g = x.createRadialGradient(px, py, rr, px, py, rr * 1.45); g.addColorStop(0, 'rgba(255,220,120,.55)'); g.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rr * 1.45, 0, 7); x.fill(); }
    const rg = x.createLinearGradient(px, py - rr, px, py + rr); rg.addColorStop(0, shade(col, 40)); rg.addColorStop(1, shade(col, -60));
    x.fillStyle = rg; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill();
    x.strokeStyle = mine ? '#f3d991' : 'rgba(20,10,5,.8)'; x.lineWidth = mine ? 1.6 : 1; x.stroke();
    // 초상
    const im = this.portraitImgEl(o), pr = rr * .78;
    x.save(); x.beginPath(); x.arc(px, py, pr, 0, 7); x.clip();
    x.fillStyle = '#1a2328'; x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    if (im.complete && im.naturalWidth) x.drawImage(im, 14, 6, 92, 92, px - pr, py - pr, pr * 2, pr * 2);
    if (dim) { x.fillStyle = 'rgba(10,15,18,.55)'; x.fillRect(px - pr, py - pr, pr * 2, pr * 2); }
    x.restore();
    // 병력 고리 게이지
    const fr = clamp(u.troops / u.max, 0, 1), gr = rr + s * .1;
    x.lineWidth = Math.max(2.5, s * .1); x.lineCap = 'round';
    x.strokeStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.arc(px, py, gr, 0, 7); x.stroke();
    x.strokeStyle = fr > .5 ? '#7fd1a9' : fr > .25 ? '#e9c25a' : '#ef5a3c';
    x.beginPath(); x.arc(px, py, gr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fr); x.stroke(); x.lineCap = 'butt';
    // 병종 표지
    const br = rr * .4, bx = px - rr * .78, by = py + rr * .62;
    x.fillStyle = shade(col, -70); x.strokeStyle = '#f3d991'; x.lineWidth = 1.2; x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill(); x.stroke();
    this.iconAt(x, u.type === 'cav' ? 'horse' : u.type === 'arc' ? 'bow' : 'sword', bx, by, br * 1.25, '#f3d991');
    // 총대장
    if (u.cmd) { x.fillStyle = '#f3d991'; x.strokeStyle = '#5a3f10'; x.lineWidth = 1; star(x, px + rr * .78, py - rr * .72, s * .2); x.fill(); x.stroke(); }
    // 혼란
    if (u.conf) { for (let k = 0; k < 3; k++) { const a = now / 300 + k * 2.1; x.fillStyle = '#ffe36b'; star(x, px + Math.cos(a) * rr * .9, py - rr * 1.05 + Math.sin(a) * rr * .2, s * .1); x.fill(); } }
    // 이름표
    const name = o.name, fs = Math.max(10, Math.round(s * .33));
    x.font = `${fs}px 'Song Myung',serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    const tw = x.measureText(name).width + 10, ny = py - rr - s * .3;
    x.fillStyle = 'rgba(18,10,5,.85)'; roundRect(x, px - tw / 2, ny - fs * .62, tw, fs * 1.25, 3); x.fill();
    x.fillStyle = col; x.fillRect(px - tw / 2, ny - fs * .62, tw, 2);
    x.fillStyle = mine ? '#f3d991' : '#f0e5c9'; x.fillText(name, px, ny + 1);
    if (this.sel === u) { x.strokeStyle = '#fff'; x.lineWidth = 2; x.setLineDash([4, 3]); x.lineDashOffset = -now / 50; x.beginPath(); x.arc(px, py, rr + s * .26, 0, 7); x.stroke(); x.setLineDash([]); }
  },
  iconAt(x, name, cx, cy, size, col) {
    this.iconPaths = this.iconPaths || {};
    if (!this.iconPaths[name]) this.iconPaths[name] = [...(ICONS[name] || '').matchAll(/d="([^"]+)"/g)].map(m => new Path2D(m[1]));
    x.save(); x.translate(cx - size / 2, cy - size / 2); x.scale(size / 24, size / 24);
    x.strokeStyle = col; x.lineWidth = 2.4; x.lineCap = 'round'; x.lineJoin = 'round';
    for (const p of this.iconPaths[name]) x.stroke(p);
    x.restore();
  },
  drawFx(x, f, now) {
    const s = this.hs, t = (now - f.t0) / 900;
    if (f.kind === 'slash') {
      const c = this.center(f.to), k = Math.min(1, t * 3);
      x.save(); x.translate(c.x, c.y); x.globalAlpha = 1 - Math.max(0, t * 3 - 1) / 2;
      x.strokeStyle = '#fffbe8'; x.lineCap = 'round';
      for (let i = 0; i < 3; i++) { x.lineWidth = 3 - i; x.beginPath(); x.arc(-s * .1 + i * 4, s * .1 - i * 4, s * .55, -2.4 + i * .2, -2.4 + i * .2 + k * 2); x.stroke(); }
      x.globalAlpha = 1; x.restore();
      if (t < .3) for (let i = 0; i < 6; i++) { const a = i * 1.05 + f.t0, rr = s * (.3 + t * 1.6); x.fillStyle = 'rgba(255,230,160,.9)'; x.beginPath(); x.arc(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, 1.6, 0, 7); x.fill(); }
    } else if (f.kind === 'arrow') {
      const A = this.center(f.from), Bc = this.center(f.to);
      for (let i = 0; i < 3; i++) {
        const tt = clamp(t * 2.6 - i * .15, 0, 1); if (tt <= 0 || tt >= 1) continue;
        const ox = (i - 1) * s * .18, px = A.x + (Bc.x - A.x) * tt + ox, py = A.y + (Bc.y - A.y) * tt - Math.sin(tt * Math.PI) * s * .9;
        const ang = Math.atan2((Bc.y - A.y) - Math.cos(tt * Math.PI) * s * .9 * Math.PI, Bc.x - A.x);
        x.save(); x.translate(px, py); x.rotate(ang); x.strokeStyle = '#3a2410'; x.lineWidth = 1.8; x.beginPath(); x.moveTo(-s * .3, 0); x.lineTo(s * .2, 0); x.stroke();
        x.fillStyle = '#ddd'; x.beginPath(); x.moveTo(s * .28, 0); x.lineTo(s * .16, -3); x.lineTo(s * .16, 3); x.fill(); x.restore();
      }
    } else if (f.kind === 'burst') {
      const c = this.center(f.at);
      x.fillStyle = `rgba(255,160,50,${.6 * (1 - t)})`; x.beginPath(); x.arc(c.x, c.y, s * (.3 + t * 1.2), 0, 7); x.fill();
      for (let i = 0; i < 10; i++) { const a = i * .63, rr = s * t * 1.4; x.fillStyle = `rgba(255,210,90,${1 - t})`; x.beginPath(); x.arc(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr - t * s * .5, 2.2, 0, 7); x.fill(); }
    } else if (f.kind === 'swirl') {
      const c = this.center(f.at);
      x.strokeStyle = `rgba(255,227,107,${1 - t})`; x.lineWidth = 2; x.beginPath();
      for (let a = 0; a < 12; a += .3) { const rr = a / 12 * s * .8; x.lineTo(c.x + Math.cos(a + t * 8) * rr, c.y + Math.sin(a + t * 8) * rr * .6); } x.stroke();
    } else if (f.kind === 'smoke') {
      const c = this.center(f.at);
      for (let i = 0; i < 5; i++) { const a = i * 1.26; x.fillStyle = `rgba(120,110,100,${.5 * (1 - t)})`; x.beginPath(); x.arc(c.x + Math.cos(a) * s * t * .8, c.y + Math.sin(a) * s * t * .5 - t * s * .6, s * (.25 + t * .35), 0, 7); x.fill(); }
    }
  },
};
