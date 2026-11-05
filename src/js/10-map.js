// ===== 천하 지도 =====
const MapView = {
  cv: null, x: null, s: 1, ox: 0, oy: 0, bg: null, dpr: 1, fitted: false,
  init() {
    this.cv = $('#map'); this.x = this.cv.getContext('2d');
    this.buildBg();
    const pts = new Map(); let drag = null, pinch = null, moved = 0;
    this.cv.addEventListener('pointerdown', e => { this.cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, ox: this.ox, oy: this.oy }; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; drag = null; } });
    this.cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.zoomAt(pinch.cx, pinch.cy, pinch.s * d / pinch.d / this.s); moved = 99; return; }
      if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy)); this.ox = drag.ox + dx; this.oy = drag.oy + dy; this.clampView(); this.draw(); }
    });
    const up = e => { const was = pts.has(e.pointerId); pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (was && moved < 8 && pts.size === 0) this.click(e); if (!pts.size) drag = null; };
    this.cv.addEventListener('pointerup', up); this.cv.addEventListener('pointercancel', e => { pts.delete(e.pointerId); drag = null; pinch = null; });
    this.cv.addEventListener('wheel', e => { e.preventDefault(); this.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    $('#zIn').onclick = () => { const r = this.cv.getBoundingClientRect(); this.zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.3); };
    $('#zOut').onclick = () => { const r = this.cv.getBoundingClientRect(); this.zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.3); };
    $('#zMe').onclick = () => { if (me()) { UI.sel = me().city; this.focus(me().city); UI.refresh(); } };
    new ResizeObserver(() => { this.resize(); }).observe($('#mapWrap'));
  },
  resize() {
    const r = this.cv.getBoundingClientRect(); if (!r.width || !G) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
    if (!this.fitted) this.fit();
    this.clampView(); this.draw();
  },
  fit() {
    const r = this.cv.getBoundingClientRect();
    this.s = Math.min(r.width / 1000, r.height / 760);
    if (r.width < 600) this.s = Math.max(this.s, r.width / 640); // 휴대폰은 조금 확대
    this.ox = (r.width - 1000 * this.s) / 2; this.oy = (r.height - 760 * this.s) / 2;
    this.fitted = true;
    if (me() && r.width < 600) this.focus(me().city, true);
  },
  focus(cid, noDraw) {
    const r = this.cv.getBoundingClientRect(), c = G.cities[cid];
    this.ox = r.width / 2 - c.x * this.s; this.oy = r.height / 2 - c.y * this.s; this.clampView(); if (!noDraw) this.draw();
  },
  clampView() {
    const r = this.cv.getBoundingClientRect();
    const w = 1000 * this.s, h = 760 * this.s;
    this.ox = w < r.width ? (r.width - w) / 2 : clamp(this.ox, r.width - w - 40, 40);
    this.oy = h < r.height ? (r.height - h) / 2 : clamp(this.oy, r.height - h - 40, 40);
  },
  zoomAt(cx, cy, f) {
    const r = this.cv.getBoundingClientRect();
    const ns = clamp(this.s * f, Math.min(r.width / 1000, r.height / 760) * .9, 3.2);
    const px = cx - r.left, py = cy - r.top;
    const wx = (px - this.ox) / this.s, wy = (py - this.oy) / this.s;
    this.s = ns; this.ox = px - wx * ns; this.oy = py - wy * ns; this.clampView(); this.draw();
  },
  click(e) {
    if (!G) return;
    const r = this.cv.getBoundingClientRect();
    const wx = (e.clientX - r.left - this.ox) / this.s, wy = (e.clientY - r.top - this.oy) / this.s;
    let best = null, bd = 30 / Math.max(.6, this.s);
    for (const c of G.cities) { const d = Math.hypot(c.x - wx, c.y - wy); if (d < bd) { bd = d; best = c; } }
    if (best) { UI.sel = best.id; SFX.play('tick'); UI.refresh(); }
  },
  buildBg() {
    const W = 2000, H = 1520, k = 2;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    // 바다
    const sea = x.createLinearGradient(0, 0, W, H); sea.addColorStop(0, '#22404a'); sea.addColorStop(1, '#1a3139');
    x.fillStyle = sea; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(180,210,210,.08)'; x.lineWidth = 2;
    for (let i = 0; i < 70; i++) { const yy = (i * 23) % H, xx = 1500 + (i * 137) % 500; x.beginPath(); x.arc(xx, yy, 14, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
    // 땅 (비단)
    x.save(); x.beginPath(); LAND_POLY.forEach(([px, py], i) => i ? x.lineTo(px * k, py * k) : x.moveTo(px * k, py * k)); x.closePath();
    x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 30; x.fillStyle = '#d6c69e'; x.fill(); x.shadowBlur = 0; x.clip();
    const R = mulberry(19);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${R() < .5 ? '120,95,55' : '255,250,230'},${R() * .06})`; x.fillRect(R() * W, R() * H, 2 + R() * 6, 1 + R() * 2); }
    // 비단 결
    x.strokeStyle = 'rgba(110,85,50,.05)'; x.lineWidth = 1; for (let yy = 0; yy < H; yy += 5) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy + 3); x.stroke(); }
    // 산
    for (const [mx, my] of MOUNTAINS) {
      for (let j = 0; j < 3; j++) {
        const px = (mx + j * 14 - 14) * k, py = (my + (j % 2) * 6) * k, h = (16 + R() * 10) * k;
        x.fillStyle = 'rgba(120,98,66,.32)'; x.beginPath(); x.moveTo(px - h * .7, py); x.lineTo(px, py - h); x.lineTo(px + h * .7, py); x.fill();
        x.strokeStyle = 'rgba(70,52,30,.45)'; x.lineWidth = 2; x.beginPath(); x.moveTo(px - h * .7, py); x.lineTo(px, py - h); x.lineTo(px + h * .5, py - h * .3); x.stroke();
      }
    }
    // 강
    for (const rv of RIVERS) {
      x.strokeStyle = '#6f9cad'; x.lineWidth = rv.w * k; x.lineJoin = 'round'; x.lineCap = 'round';
      x.beginPath(); rv.pts.forEach(([px, py], i) => { if (!i) x.moveTo(px * k, py * k); else { const [qx, qy] = rv.pts[i - 1]; x.quadraticCurveTo(qx * k, qy * k, (qx + px) / 2 * k, (qy + py) / 2 * k); } }); x.stroke();
      x.strokeStyle = 'rgba(220,240,240,.25)'; x.lineWidth = 1.5; x.stroke();
      const mid = rv.pts[Math.floor(rv.pts.length / 2)];
      x.fillStyle = 'rgba(40,70,85,.75)'; x.font = `${13 * k}px 'Song Myung', serif`; x.fillText(rv.name, mid[0] * k + 8, mid[1] * k + 22);
    }
    x.restore();
    // 해안선
    x.strokeStyle = 'rgba(60,45,25,.6)'; x.lineWidth = 3; x.beginPath(); LAND_POLY.forEach(([px, py], i) => i ? x.lineTo(px * k, py * k) : x.moveTo(px * k, py * k)); x.stroke();
    this.bg = cv;
  },
  draw() {
    if (!G || !this.x) return;
    const x = this.x, d = this.dpr, s = this.s;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#0d1417'; x.fillRect(0, 0, this.cv.width, this.cv.height);
    x.setTransform(d * s, 0, 0, d * s, d * this.ox, d * this.oy);
    x.drawImage(this.bg, 0, 0, 1000, 760);
    const sel = G.cities[UI.sel];
    // 길
    x.lineCap = 'round';
    for (let a = 0; a < G.cities.length; a++) for (const b of ADJ[a]) {
      if (b < a) continue; const A = G.cities[a], Bc = G.cities[b];
      const hl = sel && (a === sel.id || b === sel.id);
      x.strokeStyle = hl ? 'rgba(201,162,74,.95)' : 'rgba(90,66,36,.55)'; x.lineWidth = hl ? 2.4 : 1.4;
      x.setLineDash(hl ? [] : [4, 3]);
      x.beginPath(); x.moveTo(A.x, A.y); x.lineTo(Bc.x, Bc.y); x.stroke();
    }
    x.setLineDash([]);
    const P = me();
    // 도시
    for (const c of G.cities) {
      const r = 6 + c.size * 1.3;
      const col = facColor(c.f);
      if (c.f >= 0 && P && P.st === 'on' && c.f === P.f) { x.fillStyle = 'rgba(201,162,74,.25)'; x.beginPath(); x.arc(c.x, c.y, r + 7, 0, 7); x.fill(); }
      // 성 모양
      x.fillStyle = c.f >= 0 ? col : 'rgba(214,198,158,.9)';
      x.strokeStyle = '#2a1e10'; x.lineWidth = 1.6;
      x.beginPath(); x.rect(c.x - r, c.y - r * .75, r * 2, r * 1.5); x.fill(); x.stroke();
      // 성가퀴
      for (let i = 0; i < 4; i++) { const bx = c.x - r + i * r * 2 / 3.5; x.fillRect(bx, c.y - r * .75 - 3, r * .38, 3); x.strokeRect(bx, c.y - r * .75 - 3, r * .38, 3); }
      if (c.f < 0) { x.strokeStyle = 'rgba(42,30,16,.6)'; x.beginPath(); x.moveTo(c.x - r * .5, c.y); x.lineTo(c.x + r * .5, c.y); x.stroke(); }
      // 이름
      x.font = `${c.size >= 4 ? 15 : 13}px 'Song Myung', serif`; x.textAlign = 'center'; x.textBaseline = 'top';
      x.lineWidth = 3.2; x.strokeStyle = 'rgba(232,220,190,.92)'; x.strokeText(c.name, c.x, c.y + r * .75 + 3);
      x.fillStyle = '#21170c'; x.fillText(c.name, c.x, c.y + r * .75 + 3);
      if (s > 1.35 && c.f >= 0) { x.font = '9px sans-serif'; x.fillStyle = 'rgba(33,23,12,.8)'; x.fillText(fmt(c.troops), c.x, c.y + r * .75 + 19); }
    }
    // 선택
    if (sel) { x.strokeStyle = '#fff1c4'; x.lineWidth = 2; x.setLineDash([5, 3]); x.beginPath(); x.arc(sel.x, sel.y, 6 + sel.size * 1.3 + 10, 0, 7); x.stroke(); x.setLineDash([]); }
    // 나
    if (P && P.st !== 'dead') {
      const c = G.cities[P.city];
      x.fillStyle = '#c4472f'; x.strokeStyle = '#2a1e10'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(c.x + 12, c.y - 26); x.lineTo(c.x + 12, c.y - 6); x.stroke();
      x.beginPath(); x.moveTo(c.x + 12, c.y - 26); x.lineTo(c.x + 26, c.y - 21); x.lineTo(c.x + 12, c.y - 16); x.fill(); x.stroke();
      x.font = "10px 'Gowun Dodum',sans-serif"; x.fillStyle = '#fff4ea'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('나', c.x + 17, c.y - 21);
    }
    this.legend();
  },
  legend() {
    const lg = $('#legend'); if (!lg) return;
    const rows = G.factions.filter(f => f.alive).map(f => ({ f, n: citiesOf(f.id).length })).filter(r => r.n).sort((a, b) => b.n - a.n).slice(0, 10);
    const key = rows.map(r => r.f.id + ':' + r.n).join();
    if (lg.dataset.k === key) return; lg.dataset.k = key;
    lg.innerHTML = ''; rows.forEach(r => lg.append(el('span', {}, el('span', { class: 'dot', style: `background:${r.f.color};margin-right:4px` }), `${r.f.name} ${r.n}`)));
  },
};
