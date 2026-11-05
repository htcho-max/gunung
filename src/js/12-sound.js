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
document.addEventListener('pointerdown', () => SFX.on && SFX.ensure(), { once: true });
