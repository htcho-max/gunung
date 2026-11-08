// ===== 천하 지도 =====
const MapView = {
  cv: null, x: null, s: 1, ox: 0, oy: 0, bg: null, base: null, baseKey: '', dpr: 1, fitted: false, anims: [], parts: [], lastPaint: 0,
  init() {
    this.cv = $('#map'); this.x = this.cv.getContext('2d');
    this.buildBg(); this.buildNearest();
    $('#zIn').append(icon('zoomin')); $('#zOut').append(icon('zoomout')); $('#zMe').append(icon('target'));
    const loop = t => { requestAnimationFrame(loop); if (t - this.lastPaint < 33) return; if (!G || $('#scrGame').hidden || document.hidden) return; this.paint(t); };
    requestAnimationFrame(loop);
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
  // ===== 배경 그림 (한 번만) =====
  buildBg() {
    const W = 2000, H = 1520, k = 2;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const R = mulberry(19);
    const landPath = () => { x.beginPath(); LAND_POLY.forEach(([px, py], i) => i ? x.lineTo(px * k, py * k) : x.moveTo(px * k, py * k)); x.closePath(); };
    // 바다: 짙은 청록 + 청해파 무늬
    const sea = x.createRadialGradient(W * .9, H * .7, 50, W * .8, H * .6, W);
    sea.addColorStop(0, '#2b5560'); sea.addColorStop(1, '#14272e');
    x.fillStyle = sea; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(190,225,225,.07)'; x.lineWidth = 2;
    for (let yy = 0; yy < H + 40; yy += 26) for (let xx = (yy / 26 % 2) * 26; xx < W + 52; xx += 52) {
      for (let r = 24; r > 4; r -= 7) { x.beginPath(); x.arc(xx, yy, r, Math.PI, 0); x.stroke(); }
    }
    // 땅
    x.save(); landPath();
    x.shadowColor = 'rgba(0,0,0,.65)'; x.shadowBlur = 40; x.fillStyle = '#d7c79f'; x.fill(); x.shadowBlur = 0; x.clip();
    // 지역 빛깔: 북쪽 황토, 남쪽 푸른 들, 서쪽 산지
    const band = (x0, y0, x1, y1, col) => { const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); };
    band(0, 0, 0, 640, 'rgba(206,166,92,.55)');
    band(0, H, 0, 760, 'rgba(118,150,82,.55)');
    band(0, 0, 640, 0, 'rgba(150,118,80,.45)');
    band(W * .75, 0, W * .45, 0, 'rgba(160,170,120,.25)');
    // 얼룩과 비단 결
    for (let i = 0; i < 1400; i++) { const r = 10 + R() * 60; x.fillStyle = `rgba(${R() < .5 ? '110,85,50' : '255,248,225'},${R() * .05})`; x.beginPath(); x.ellipse(R() * W, R() * H, r, r * (.4 + R() * .5), R() * 3, 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(100,78,45,.05)'; x.lineWidth = 1; for (let yy = 0; yy < H; yy += 4) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy + 2); x.stroke(); }
    // 숲 (남쪽과 강가)
    const nearCity = (px, py) => CITY_DEFS.some(c => Math.hypot(c[2] - px, c[3] - py) < 26);
    for (let i = 0; i < 260; i++) {
      const px = 40 + R() * 860, py = 330 + R() * 400;
      if (!inLand(px, py) || nearCity(px, py)) continue;
      const n = 3 + Math.floor(R() * 5);
      for (let j = 0; j < n; j++) {
        const tx = (px + (R() - .5) * 22) * k, ty = (py + (R() - .5) * 12) * k, tr = (3 + R() * 2.5) * k;
        x.fillStyle = 'rgba(40,60,30,.35)'; x.beginPath(); x.ellipse(tx + 3, ty + tr * .9, tr, tr * .4, 0, 0, 7); x.fill();
        x.fillStyle = R() < .5 ? '#4f6b3a' : '#5d7a44'; x.beginPath(); x.arc(tx, ty, tr, 0, 7); x.fill();
        x.fillStyle = 'rgba(200,220,150,.25)'; x.beginPath(); x.arc(tx - tr * .3, ty - tr * .3, tr * .45, 0, 7); x.fill();
      }
    }
    // 산: 먹 번짐
    for (const [mx, my] of MOUNTAINS) {
      for (let j = 0; j < 4; j++) {
        const px = (mx + j * 13 - 20 + R() * 6) * k, py = (my + (j % 2) * 7) * k, h = (14 + R() * 12) * k, w = h * (.75 + R() * .3);
        const g = x.createLinearGradient(px - w, 0, px + w, 0);
        g.addColorStop(0, 'rgba(170,150,110,.85)'); g.addColorStop(.5, 'rgba(120,98,66,.9)'); g.addColorStop(.52, 'rgba(78,62,40,.9)'); g.addColorStop(1, 'rgba(60,48,30,.85)');
        x.fillStyle = g;
        x.beginPath(); x.moveTo(px - w, py); x.quadraticCurveTo(px - w * .4, py - h * .55, px, py - h); x.quadraticCurveTo(px + w * .4, py - h * .55, px + w, py); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(40,28,15,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(px - w, py); x.quadraticCurveTo(px - w * .4, py - h * .55, px, py - h); x.quadraticCurveTo(px + w * .4, py - h * .55, px + w, py); x.stroke();
        x.fillStyle = 'rgba(245,240,225,.55)'; x.beginPath(); x.moveTo(px, py - h); x.lineTo(px - w * .22, py - h * .7); x.lineTo(px - w * .05, py - h * .74); x.lineTo(px + w * .12, py - h * .68); x.closePath(); x.fill();
      }
    }
    // 강
    for (const rv of RIVERS) {
      const path = () => { x.beginPath(); rv.pts.forEach(([px, py], i) => { if (!i) x.moveTo(px * k, py * k); else { const [qx, qy] = rv.pts[i - 1]; x.quadraticCurveTo(qx * k, qy * k, (qx + px) / 2 * k, (qy + py) / 2 * k); } }); };
      x.lineJoin = 'round'; x.lineCap = 'round';
      path(); x.strokeStyle = 'rgba(60,90,100,.35)'; x.lineWidth = (rv.w + 4) * k; x.stroke();
      path(); x.strokeStyle = '#6a9cae'; x.lineWidth = rv.w * k; x.stroke();
      path(); x.strokeStyle = 'rgba(225,245,250,.4)'; x.lineWidth = 1.6; x.stroke();
      const mid = rv.pts[Math.floor(rv.pts.length / 2)];
      x.font = `${14 * k}px 'Song Myung', serif`; x.fillStyle = 'rgba(30,60,75,.7)'; x.fillText(rv.name, mid[0] * k + 8, mid[1] * k + 24);
    }
    x.restore();
    // 해안선: 두 겹
    landPath(); x.strokeStyle = 'rgba(55,40,20,.75)'; x.lineWidth = 3; x.stroke();
    landPath(); x.strokeStyle = 'rgba(230,240,235,.18)'; x.lineWidth = 10; x.globalCompositeOperation = 'destination-over'; x.stroke(); x.globalCompositeOperation = 'source-over';
    // 나침반
    const cx = 930 * k, cy = 690 * k, cr = 34 * k;
    x.save(); x.translate(cx, cy);
    x.strokeStyle = 'rgba(214,173,85,.6)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, cr, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, cr * .82, 0, 7); x.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, L = i % 2 ? cr * .55 : cr * .95; x.fillStyle = i % 2 ? 'rgba(214,173,85,.45)' : 'rgba(240,215,150,.8)'; x.beginPath(); x.moveTo(Math.cos(a) * L, Math.sin(a) * L); x.lineTo(Math.cos(a + .25) * cr * .16, Math.sin(a + .25) * cr * .16); x.lineTo(Math.cos(a - .25) * cr * .16, Math.sin(a - .25) * cr * .16); x.fill(); }
    x.fillStyle = '#f3d991'; x.font = `${13 * k}px 'Song Myung', serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('北', 0, -cr - 12 * k);
    x.restore();
    // 테두리
    x.strokeStyle = 'rgba(214,173,85,.55)'; x.lineWidth = 3; x.strokeRect(10, 10, W - 20, H - 20);
    x.strokeStyle = 'rgba(214,173,85,.25)'; x.lineWidth = 1.5; x.strokeRect(20, 20, W - 40, H - 40);
    this.bg = cv;
  },
  // 땅 칸마다 가장 가까운 성 (영토 색칠용)
  buildNearest() {
    const GW = 250, GH = 190; this.GW = GW; this.GH = GH;
    const n = new Int16Array(GW * GH).fill(-1);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const wx = i * 4 + 2, wy = j * 4 + 2;
      if (!inLand(wx, wy)) continue;
      let best = -1, bd = 1e9;
      CITY_DEFS.forEach((c, ci) => { const d = Math.hypot(c[2] - wx, c[3] - wy) - c[5] * 4; if (d < bd) { bd = d; best = ci; } });
      n[j * GW + i] = best;
    }
    this.near = n;
  },
  // 배경 + 영토 + 길 (주인이 바뀔 때만 다시)
  buildBase() {
    const key = G.cities.map(c => c.f).join(',');
    if (this.base && key === this.baseKey) return;
    this.baseKey = key;
    const W = 2000, H = 1520;
    const cv = this.base || document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.drawImage(this.bg, 0, 0);
    // 영토
    const { GW, GH, near } = this;
    const t = document.createElement('canvas'); t.width = GW; t.height = GH;
    const tx = t.getContext('2d'), img = tx.createImageData(GW, GH);
    const rgb = hex => { const v = parseInt(hex.slice(1), 16); return [v >> 16, v >> 8 & 255, v & 255]; };
    const owner = i => near[i] < 0 ? -2 : G.cities[near[i]].f;
    const cols = G.factions.map(f => rgb(f.color));
    for (let i = 0; i < GW * GH; i++) {
      const f = owner(i); if (f < 0) continue;
      const [r, g, b] = cols[f];
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 120;
    }
    tx.putImageData(img, 0, 0);
    x.save(); x.imageSmoothingEnabled = true; x.globalCompositeOperation = 'multiply'; x.globalAlpha = .9; x.drawImage(t, 0, 0, W, H); x.restore();
    x.save(); x.globalAlpha = .35; x.drawImage(t, 0, 0, W, H); x.restore();
    // 경계: 점선
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const id = j * GW + i, f = owner(id); if (f === -2) continue;
      const rt = i + 1 < GW ? owner(id + 1) : -2, dn = j + 1 < GH ? owner(id + GW) : -2;
      const edge = (rt !== -2 && rt !== f) || (dn !== -2 && dn !== f);
      if (!edge || (i + j) % 2) continue;
      x.fillStyle = f >= 0 ? shade(G.factions[f].color, -70) : 'rgba(70,55,35,.55)';
      x.beginPath(); x.arc(i * 8 + 8, j * 8 + 8, 2.6, 0, 7); x.fill();
    }
    // 길
    x.lineCap = 'round'; x.setLineDash([9, 7]);
    for (let a = 0; a < G.cities.length; a++) for (const b of ADJ[a]) {
      if (b < a) continue; const A = G.cities[a], Bc = G.cities[b];
      x.strokeStyle = 'rgba(70,50,25,.6)'; x.lineWidth = 2.6;
      x.beginPath(); x.moveTo(A.x * 2, A.y * 2); x.lineTo(Bc.x * 2, Bc.y * 2); x.stroke();
    }
    x.setLineDash([]);
    this.base = cv;
  },
  draw() { if (!G || !this.x) return; this.paint(performance.now()); },
  paint(now) {
    if (!G || !this.x) return;
    this.lastPaint = now;
    this.buildBase();
    const x = this.x, d = this.dpr, s = this.s;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#0b1114'; x.fillRect(0, 0, this.cv.width, this.cv.height);
    x.setTransform(d * s, 0, 0, d * s, d * this.ox, d * this.oy);
    x.drawImage(this.base, 0, 0, 1000, 760);
    const sel = G.cities[UI.sel];
    // 고른 성의 길
    if (sel) {
      x.lineCap = 'round';
      for (const b of ADJ[sel.id]) {
        const B = G.cities[b];
        x.strokeStyle = 'rgba(40,20,5,.5)'; x.lineWidth = 4; x.beginPath(); x.moveTo(sel.x, sel.y); x.lineTo(B.x, B.y); x.stroke();
        x.strokeStyle = '#f3d991'; x.lineWidth = 2; x.setLineDash([6, 4]); x.lineDashOffset = -now / 60;
        x.beginPath(); x.moveTo(sel.x, sel.y); x.lineTo(B.x, B.y); x.stroke(); x.setLineDash([]);
      }
    }
    const P = me();
    const caps = new Set(G.factions.filter(f => f.alive).map(f => G.officers[f.ruler]?.city));
    // 성: 위에서 아래 순서로 (겹칠 때 자연스럽게)
    const order = [...G.cities].sort((a, b) => a.y - b.y);
    for (const c of order) this.drawCity(x, c, now, caps.has(c.id), P);
    // 고른 성 고리
    if (sel) {
      const r = 14 + sel.size * 2 + Math.sin(now / 250) * 2;
      x.strokeStyle = 'rgba(255,241,196,.9)'; x.lineWidth = 2;
      x.beginPath(); x.ellipse(sel.x, sel.y + 3, r * 1.3, r * .7, 0, 0, 7); x.stroke();
      x.strokeStyle = 'rgba(214,173,85,.5)'; x.lineWidth = 4;
      x.beginPath(); x.ellipse(sel.x, sel.y + 3, r * 1.3 + 4, r * .7 + 3, 0, 0, 7); x.stroke();
    }
    // 나
    if (P && P.st !== 'dead') {
      const c = G.cities[P.city], bob = Math.sin(now / 300) * 2;
      const px = c.x - 20, py = c.y - 26 + bob;
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(c.x - 20, c.y + 4, 5, 2, 0, 0, 7); x.fill();
      x.fillStyle = '#c94a30'; x.strokeStyle = '#2a1205'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(px, py + 14); x.quadraticCurveTo(px - 9, py + 2, px - 9, py - 4); x.arc(px, py - 4, 9, Math.PI, 0); x.quadraticCurveTo(px + 9, py + 2, px, py + 14); x.fill(); x.stroke();
      x.fillStyle = '#fff4ea'; x.font = "bold 10px 'Gowun Dodum',sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('나', px, py - 3);
    }
    // 출진 화살표·전투 표시
    this.anims = this.anims.filter(a => now - a.t0 < a.dur + (a.hold || 0));
    for (const a of this.anims) this.drawAnim(x, a, now);
    // 계절
    x.setTransform(d, 0, 0, d, 0, 0);
    this.drawSeason(x, now);
    this.legend();
  },
  drawCity(x, c, now, isCap, P) {
    const z = this.s;
    const col = c.f >= 0 ? G.factions[c.f].color : '#8c8676';
    const sz = 4.6 + c.size * 1.45;
    const w = sz * 2.3, h = sz * 1.15, bx = c.x - w / 2, by = c.y - h / 2 + 2;
    // 그림자
    x.fillStyle = 'rgba(30,20,10,.35)'; x.beginPath(); x.ellipse(c.x + 2, by + h + 1, w * .62, h * .35, 0, 0, 7); x.fill();
    // 내 세력 성은 은은한 빛
    if (P && P.st === 'on' && c.f === P.f) { const g = x.createRadialGradient(c.x, c.y, 2, c.x, c.y, w * 1.1); g.addColorStop(0, 'rgba(255,225,140,.45)'); g.addColorStop(1, 'rgba(255,225,140,0)'); x.fillStyle = g; x.beginPath(); x.arc(c.x, c.y, w * 1.1, 0, 7); x.fill(); }
    // 성벽
    const wg = x.createLinearGradient(0, by, 0, by + h); wg.addColorStop(0, '#cdbf9e'); wg.addColorStop(1, '#8f8266');
    x.fillStyle = wg; x.strokeStyle = '#3a2c18'; x.lineWidth = .9;
    x.beginPath(); x.rect(bx, by, w, h); x.fill(); x.stroke();
    const cn = Math.max(3, Math.round(w / 3.4)), cw = w / (cn * 2 - 1);
    for (let i = 0; i < cn; i++) { x.fillRect(bx + i * cw * 2, by - 2, cw, 2); x.strokeRect(bx + i * cw * 2, by - 2, cw, 2); }
    x.fillStyle = '#2b1e10'; x.beginPath(); x.moveTo(c.x - sz * .32, by + h); x.lineTo(c.x - sz * .32, by + h * .45); x.arc(c.x, by + h * .45, sz * .32, Math.PI, 0); x.lineTo(c.x + sz * .32, by + h); x.fill();
    // 누각 (큰 성)
    if (c.size >= 3 || c.f < 0) {
      const tw = w * (c.size >= 4 ? .62 : .48), th = h * .55, ty = by - th - 1;
      x.fillStyle = '#d9cdb0'; x.fillRect(c.x - tw * .36, ty + th * .35, tw * .72, th * .65); x.strokeRect(c.x - tw * .36, ty + th * .35, tw * .72, th * .65);
      const roof = c.f >= 0 ? col : '#77705f';
      x.fillStyle = roof; x.strokeStyle = shade(roof.startsWith('#') ? roof : '#777777', -60);
      x.beginPath(); x.moveTo(c.x - tw * .62, ty + th * .42); x.quadraticCurveTo(c.x - tw * .3, ty + th * .3, c.x - tw * .3, ty); x.lineTo(c.x + tw * .3, ty); x.quadraticCurveTo(c.x + tw * .3, ty + th * .3, c.x + tw * .62, ty + th * .42); x.closePath(); x.fill(); x.stroke();
      if (c.size >= 5) { x.beginPath(); x.moveTo(c.x - tw * .42, ty + 1); x.quadraticCurveTo(c.x - tw * .2, ty - th * .1, c.x - tw * .2, ty - th * .35); x.lineTo(c.x + tw * .2, ty - th * .35); x.quadraticCurveTo(c.x + tw * .2, ty - th * .1, c.x + tw * .42, ty + 1); x.closePath(); x.fill(); x.stroke(); }
    }
    // 깃발
    if (c.f >= 0) {
      const fx = bx + w - 1, fy = by - (c.size >= 3 ? h * 1.25 : h * .9) - 8, fw = 11, fh = 7.5;
      x.strokeStyle = '#2a1a0a'; x.lineWidth = .9; x.beginPath(); x.moveTo(fx, by); x.lineTo(fx, fy - 1); x.stroke();
      const ph = now / 260 + c.id;
      x.fillStyle = col; x.strokeStyle = shade(col, -70); x.lineWidth = .6;
      x.beginPath(); x.moveTo(fx, fy);
      for (let i = 1; i <= 6; i++) x.lineTo(fx + fw * i / 6, fy + Math.sin(ph + i * .9) * 1.2 * i / 6);
      for (let i = 6; i >= 0; i--) x.lineTo(fx + fw * i / 6, fy + fh + Math.sin(ph + i * .9) * 1.2 * i / 6);
      x.closePath(); x.fill(); x.stroke();
      if (z > .75) { x.fillStyle = lum(col) > .6 ? '#2a1a0a' : '#fff6e4'; x.font = "6px 'Song Myung',serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(G.factions[c.f].name[0], fx + fw / 2, fy + fh / 2 + Math.sin(ph + 3) * .6); }
      if (isCap) { x.fillStyle = '#f3d991'; x.strokeStyle = '#5a3f10'; x.lineWidth = .7; star(x, fx, fy - 4, 3.2); x.fill(); x.stroke(); }
    }
    // 이름표
    const fs = (c.size >= 4 ? 12.5 : 11) / Math.max(.85, Math.min(1.25, this.s));
    x.font = `${fs}px 'Song Myung',serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    const tw = x.measureText(c.name).width + 8, ly = by + h + 8;
    const mine = P && P.st === 'on' && c.f === P.f;
    x.fillStyle = 'rgba(28,18,10,.82)'; roundRect(x, c.x - tw / 2, ly - fs * .62, tw, fs * 1.25, 3); x.fill();
    if (c.f >= 0) { x.fillStyle = col; x.fillRect(c.x - tw / 2, ly - fs * .62, 2.5, fs * 1.25); }
    if (mine) { x.strokeStyle = '#d6ad55'; x.lineWidth = .8; roundRect(x, c.x - tw / 2, ly - fs * .62, tw, fs * 1.25, 3); x.stroke(); }
    x.fillStyle = mine ? '#f3d991' : '#f0e5c9'; x.fillText(c.name, c.x + 1, ly + .5);
    if (z > 1.3 && c.f >= 0) { x.font = '8px sans-serif'; x.fillStyle = 'rgba(40,25,10,.85)'; x.fillText('兵 ' + fmt(c.troops), c.x, ly + fs + 2); }
  },
  // ===== 계절 =====
  drawSeason(x, now) {
    const m = G.month, kind = (m === 12 || m <= 2) ? 'snow' : m <= 4 ? 'petal' : (m >= 9 && m <= 11) ? 'leaf' : null;
    if (!kind || matchMedia('(prefers-reduced-motion: reduce)').matches) { this.parts.length = 0; return; }
    const r = this.cv.getBoundingClientRect(), W = r.width, H = r.height;
    const want = kind === 'snow' ? 70 : 26;
    if (this.parts.length && this.parts[0].kind !== kind) this.parts.length = 0;
    while (this.parts.length < want) this.parts.push({ kind, x: Math.random() * W, y: Math.random() * H, v: .3 + Math.random() * .6, ph: Math.random() * 6, s: .6 + Math.random() * .8 });
    for (const p of this.parts) {
      p.y += p.v * (kind === 'snow' ? 1.2 : .9); p.x += Math.sin(now / 900 + p.ph) * .4 + (kind === 'snow' ? 0 : .35);
      if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; } if (p.x > W + 10) p.x = -10;
      if (kind === 'snow') { x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.arc(p.x, p.y, 1.6 * p.s, 0, 7); x.fill(); }
      else {
        x.save(); x.translate(p.x, p.y); x.rotate(now / 700 + p.ph);
        x.fillStyle = kind === 'petal' ? 'rgba(247,190,205,.85)' : (p.ph > 3 ? 'rgba(214,120,52,.85)' : 'rgba(200,160,60,.85)');
        x.beginPath(); x.ellipse(0, 0, 4 * p.s, 2.2 * p.s, 0, 0, 7); x.fill(); x.restore();
      }
    }
  },
  // ===== 출진·전투 연출 =====
  animOK() { return !$('#scrGame').hidden && !document.hidden && !window.__fast; },
  march(from, to, f, dur = 650) {
    const sp = +(store('gunung.anim') ?? 1); if (!this.animOK() || sp <= 0) return Promise.resolve();
    dur = Math.round(dur * sp);
    this.anims.push({ kind: 'march', from, to, col: facColor(f), t0: performance.now(), dur, hold: 350 * sp });
    return new Promise(r => setTimeout(r, dur + 250 * sp));
  },
  flash(cid, text, col) { if (!this.animOK()) return; this.anims.push({ kind: 'flash', at: cid, text, col, t0: performance.now(), dur: 1600 }); },
  drawAnim(x, a, now) {
    const t = clamp((now - a.t0) / a.dur, 0, 1);
    if (a.kind === 'march') {
      const A = G.cities[a.from], B = G.cities[a.to];
      const mx = (A.x + B.x) / 2 + (B.y - A.y) * .18, my = (A.y + B.y) / 2 - (B.x - A.x) * .18;
      const pt = u => ({ x: (1 - u) * (1 - u) * A.x + 2 * (1 - u) * u * mx + u * u * B.x, y: (1 - u) * (1 - u) * A.y + 2 * (1 - u) * u * my + u * u * B.y });
      const e = 1 - Math.pow(1 - t, 2);
      x.lineCap = 'round';
      x.strokeStyle = 'rgba(20,10,5,.55)'; x.lineWidth = 7; x.beginPath(); for (let u = 0; u <= e; u += .04) { const p = pt(u); u ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); } x.stroke();
      x.strokeStyle = a.col; x.lineWidth = 4; x.stroke();
      const h = pt(e), h2 = pt(Math.max(0, e - .04)), ang = Math.atan2(h.y - h2.y, h.x - h2.x);
      x.save(); x.translate(h.x, h.y); x.rotate(ang);
      x.fillStyle = a.col; x.strokeStyle = 'rgba(20,10,5,.8)'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(9, 0); x.lineTo(-5, -7); x.lineTo(-2, 0); x.lineTo(-5, 7); x.closePath(); x.fill(); x.stroke(); x.restore();
      if (t >= 1) { // 부딪힘
        const k = (now - a.t0 - a.dur) / (a.hold || 1);
        x.save(); x.translate(B.x, B.y - 6); x.globalAlpha = 1 - k * .7; x.scale(1 + k * .5, 1 + k * .5);
        x.strokeStyle = '#fff3cf'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-8, -8); x.lineTo(8, 8); x.moveTo(8, -8); x.lineTo(-8, 8); x.stroke();
        x.restore();
      }
    } else if (a.kind === 'flash') {
      const c = G.cities[a.at], y = c.y - 26 - t * 18;
      x.globalAlpha = t < .8 ? 1 : (1 - t) * 5;
      x.font = "13px 'Song Myung',serif"; x.textAlign = 'center'; x.textBaseline = 'middle';
      const tw = x.measureText(a.text).width + 14;
      x.fillStyle = 'rgba(28,14,6,.88)'; roundRect(x, c.x - tw / 2, y - 10, tw, 20, 4); x.fill();
      x.strokeStyle = a.col; x.lineWidth = 1.2; roundRect(x, c.x - tw / 2, y - 10, tw, 20, 4); x.stroke();
      x.fillStyle = a.col; x.fillText(a.text, c.x, y + 1);
      x.globalAlpha = 1;
    }
  },
  monthBanner() {
    if (!this.animOK()) return;
    const b = $('#monthBanner'); if (!b) return;
    $('#mbDate').textContent = `${G.year}년 ${G.month}월`;
    $('#mbSub').textContent = `${eraName(G.year)} · ${SEASON(G.month)}`;
    b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  },
  legend() {
    const lg = $('#legend'); if (!lg) return;
    const rows = G.factions.filter(f => f.alive).map(f => ({ f, n: citiesOf(f.id).length })).filter(r => r.n).sort((a, b) => b.n - a.n).slice(0, 10);
    const key = rows.map(r => r.f.id + ':' + r.n).join();
    if (lg.dataset.k === key) return; lg.dataset.k = key;
    lg.innerHTML = ''; rows.forEach(r => lg.append(el('span', {}, el('span', { class: 'dot', style: `background:${r.f.color};margin-right:4px` }), `${r.f.name} ${r.n}`)));
  },
};
function inLand(px, py) {
  let inside = false;
  for (let i = 0, j = LAND_POLY.length - 1; i < LAND_POLY.length; j = i++) {
    const [xi, yi] = LAND_POLY[i], [xj, yj] = LAND_POLY[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function star(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); }
function lum(hex) { const v = parseInt(hex.slice(1), 16); return ((v >> 16) * .299 + (v >> 8 & 255) * .587 + (v & 255) * .114) / 255; }
