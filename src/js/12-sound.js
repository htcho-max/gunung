// ===== 소리 (WebAudio 합성) =====
const SFX = {
  ctx: null, on: store('gunung.snd') !== '0',
  ensure() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.on = false; } } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  toggle() { this.on = !this.on; store('gunung.snd', this.on ? '1' : '0'); },
  tone(f, t0, dur, type = 'sine', vol = .15, f2) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .01); g.gain.exponentialRampToValueAtTime(.0005, t0 + dur);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + .05);
  },
  noise(t0, dur, vol = .2, ftype = 'bandpass', freq = 1200, q = 1, f2) {
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = buf;
    const fl = c.createBiquadFilter(); fl.type = ftype; fl.frequency.setValueAtTime(freq, t0); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur); fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0005, t0 + dur);
    s.connect(fl).connect(g).connect(c.destination); s.start(t0);
  },
  play(name) {
    if (!this.on) return;
    const c = this.ensure(); if (!c) return;
    const t = c.currentTime;
    const PENTA = [293.7, 329.6, 370, 440, 493.9, 587.3, 659.3, 740];
    switch (name) {
      case 'tick': this.tone(1400, t, .04, 'square', .03); break;
      case 'step': this.noise(t, .05, .05, 'lowpass', 600); break;
      case 'ok': this.tone(PENTA[3], t, .25, 'triangle', .1); this.tone(PENTA[5], t + .08, .35, 'triangle', .09); break;
      case 'no': this.tone(180, t, .18, 'sine', .14, 120); break;
      case 'gong': [110, 163, 227, 289].forEach((f, i) => this.tone(f, t, 2.2 - i * .3, 'sine', .07 - i * .012)); this.noise(t, .4, .05, 'bandpass', 400); break;
      case 'drum': for (let i = 0; i < 4; i++) { this.tone(95, t + i * .16, .3, 'sine', .3, 50); this.noise(t + i * .16, .08, .08, 'lowpass', 300); } break;
      case 'duel': for (let i = 0; i < 10; i++) this.tone(110, t + i * .07, .12, 'sine', .14 + i * .01, 60); this.tone(880, t + .75, .6, 'triangle', .06); break;
      case 'clash': this.noise(t, .14, .18, 'highpass', 2500); this.tone(1800 + Math.random() * 600, t, .22, 'square', .025); break;
      case 'arrow': this.noise(t, .25, .1, 'bandpass', 3000, 2, 900); break;
      case 'fire': this.noise(t, .9, .2, 'lowpass', 900, 1, 200); for (let i = 0; i < 6; i++) this.noise(t + Math.random() * .7, .03, .08, 'highpass', 3000); break;
      case 'confuse': this.tone(500, t, .5, 'sine', .08, 250); this.tone(520, t + .1, .45, 'sine', .06, 300); break;
      case 'miss': this.noise(t, .2, .06, 'lowpass', 800); break;
      case 'win': [0, 2, 4, 5, 7].forEach((k, i) => this.tone(PENTA[k], t + i * .11, .45, 'triangle', .1)); break;
      case 'lose': [5, 4, 2, 0].forEach((k, i) => this.tone(PENTA[k] / 2, t + i * .18, .6, 'triangle', .1)); break;
    }
  },
};

// ===== 배경 음악: 오음계로 그때그때 지어 부름 =====
const BGM = {
  on: store('gunung.bgm') !== '0', mood: null, want: null, out: null, timer: null, next: 0, step: 0, deg: 0, phrase: [], vol: .55,
  MOODS: {
    // 지도: 느린 칠현금, 낮은 울림
    map: { bpm: 66, root: 146.83, scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], drone: [0, 7], pluck: .085, rest: .38, drum: null },
    // 전투: 북과 날카로운 관악
    battle: { bpm: 108, root: 110, scale: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22], drone: [0, 7], pluck: .07, rest: .22, drum: [1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1], brass: true },
    // 처음 화면: 장엄하게
    title: { bpm: 58, root: 130.81, scale: [0, 2, 4, 7, 9, 12, 14, 16, 19], drone: [0, 7, 12], pluck: .08, rest: .45, drum: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
  },
  toggle() { this.on = !this.on; store('gunung.bgm', this.on ? '1' : '0'); if (this.on) this.play(this.want || 'map', true); else this.stop(); },
  play(mood, force) {
    this.want = mood;
    if (!this.on || window.__fast) return;
    const c = SFX.ctx; if (!c) return; // 첫 터치 뒤에 시작
    if (this.mood === mood && !force && this.timer) return;
    this.stop(true);
    this.mood = mood; this.out = c.createGain(); this.out.gain.setValueAtTime(0, c.currentTime); this.out.gain.linearRampToValueAtTime(this.vol, c.currentTime + 2);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; this.out.connect(lp).connect(c.destination);
    this.next = c.currentTime + .15; this.step = 0; this.deg = 2; this.phrase = [];
    this.timer = setInterval(() => this.tick(), 90);
  },
  stop(fade) {
    if (this.timer) clearInterval(this.timer); this.timer = null;
    const c = SFX.ctx, o = this.out;
    if (o && c) { o.gain.cancelScheduledValues(c.currentTime); o.gain.setValueAtTime(o.gain.value, c.currentTime); o.gain.linearRampToValueAtTime(0, c.currentTime + (fade ? .8 : .2)); setTimeout(() => { try { o.disconnect(); } catch (e) { } }, 1200); }
    this.out = null; this.mood = null;
  },
  tick() {
    const c = SFX.ctx; if (!c || !this.out || document.hidden) return;
    const M = this.MOODS[this.mood], eighth = 60 / M.bpm / 2;
    while (this.next < c.currentTime + .5) { this.note(M, this.next, this.step, eighth); this.next += eighth; this.step++; }
  },
  hz(M, deg, oct = 0) { const n = M.scale.length, d = ((deg % n) + n) % n, o = Math.floor(deg / n) + oct; return M.root * 2 ** ((M.scale[d] + 12 * o) / 12); },
  note(M, t, step, eighth) {
    const c = SFX.ctx, bar = Math.floor(step / 8), pos = step % 8;
    // 울림(4마디마다 바뀜)
    if (step % 32 === 0) { const shift = [0, 0, 3, -1][(bar / 4) % 4] || 0; for (const d of M.drone) this.pad(M.root / 2 * 2 ** ((d + (shift > 0 ? M.scale[shift] : 0)) / 12), t, eighth * 32); }
    // 북
    if (M.drum) { const k = step % 16; if (M.drum[k]) this.drum(t, k === 0 ? .55 : .32); if (M.brass && k % 2 === 1) this.tick2(t); }
    // 가락: 마디마다 새 구절, 구절 끝은 으뜸음으로
    if (pos === 0) this.phrase = this.makePhrase(M, bar);
    const d = this.phrase[pos];
    if (d != null) M.brass && pos % 4 === 0 ? this.horn(this.hz(M, d), t, eighth * 2.2) : this.pluck(this.hz(M, d), t, eighth * (pos === 7 ? 4 : 2.5), M.pluck);
  },
  makePhrase(M, bar) {
    const out = [], n = M.scale.length;
    for (let i = 0; i < 8; i++) {
      if (i > 0 && Math.random() < M.rest) { out.push(null); continue; }
      const mv = [-2, -1, -1, 1, 1, 2, 0, 3][Math.floor(Math.random() * 8)];
      this.deg = clamp(this.deg + mv, 0, n - 1);
      out.push(this.deg);
    }
    if (bar % 4 === 3) { out[6] = null; out[7] = Math.random() < .5 ? 0 : 5; this.deg = out[7]; }
    return out;
  },
  pluck(f, t, dur, vol) {
    const c = SFX.ctx;
    for (const [m, v, ty] of [[1, vol, 'triangle'], [2, vol * .25, 'sine'], [3, vol * .08, 'sine']]) {
      const o = c.createOscillator(), g = c.createGain(); o.type = ty;
      o.frequency.setValueAtTime(f * m * 1.012, t); o.frequency.exponentialRampToValueAtTime(f * m, t + .06);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .005); g.gain.exponentialRampToValueAtTime(.0004, t + dur);
      o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + .05);
    }
  },
  horn(f, t, dur) {
    const c = SFX.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); fl.type = 'lowpass'; fl.frequency.setValueAtTime(600, t); fl.frequency.linearRampToValueAtTime(1600, t + dur * .4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.04, t + .06); g.gain.setValueAtTime(.04, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(fl).connect(g).connect(this.out); o.start(t); o.stop(t + dur + .05);
  },
  pad(f, t, dur) {
    const c = SFX.ctx;
    for (const det of [-4, 4]) {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; o.detune.value = det;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035, t + 1.5); g.gain.setValueAtTime(.035, t + dur - 1.5); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + .1);
    }
  },
  drum(t, v) {
    const c = SFX.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(45, t + .25);
    g.gain.setValueAtTime(v * .5, t); g.gain.exponentialRampToValueAtTime(.0005, t + .45);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + .5);
  },
  tick2(t) {
    const c = SFX.ctx, n = Math.floor(c.sampleRate * .03), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter(); s.buffer = buf; fl.type = 'highpass'; fl.frequency.value = 4000; g.gain.value = .05;
    s.connect(fl).connect(g).connect(this.out); s.start(t);
  },
};
document.addEventListener('pointerdown', () => { if (SFX.on || BGM.on) { SFX.ensure(); if (BGM.want) BGM.play(BGM.want); } }, { once: true });
