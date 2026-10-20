// DRIFTWOOD HOME — sound, synthesized with the Web Audio API: the surf, wind, birds and crickets, rain and thunder,
// a crackling fire, the things Josh does, and a gentle guitar tune that changes with the time of day.
export class Sound {
  constructor() { this.ctx = null; this.vol = 0.6; this.musicOn = true; this.mood = 'day'; this.last = {}; this.amb = {}; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.28 : 0; this.musicBus.connect(this.master);
    const n = this.ctx.sampleRate * 2; this.noiseBuf = this.ctx.createBuffer(1, n, this.ctx.sampleRate); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // looping beds: surf (rising and falling), rain, the fire's crackle
    this.amb.surf = this.bed(420, 'lowpass', 0.08, 0.09); this.amb.rain = this.bed(2600, 'bandpass', 0, 0); this.amb.wind = this.bed(700, 'bandpass', 0.02, 0.05); this.amb.fire = this.bed(1800, 'highpass', 0, 0);
    this.loop();
  }
  bed(freq, type, vol, lfo) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; g.gain.value = vol;
    if (lfo) { const o = this.ctx.createOscillator(), og = this.ctx.createGain(); o.frequency.value = 0.09; og.gain.value = lfo; o.connect(og); og.connect(g.gain); o.start(); }
    s.connect(f); f.connect(g); g.connect(this.master); s.start(); return g;
  }
  // set the surroundings: { rain: 0..1, fire: 0..1, night }
  setAmbience(a) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.amb.rain.gain.setTargetAtTime((a.rain || 0) * 0.18, t, 0.8); this.amb.fire.gain.setTargetAtTime((a.fire || 0) * 0.05, t, 0.4);
    this.amb.wind.gain.setTargetAtTime(0.02 + (a.rain || 0) * 0.06, t, 1);
    this.mood = a.mood || this.mood; this.night = a.night;
    // now and then: a bird by day, crickets by night, a crackle of the fire
    if (Math.random() < 0.02 && !a.rain) a.night ? this.cricket() : this.bird();
    if (a.fire > 0.2 && Math.random() < 0.08) this.noise(t, 0.03, 3000, 0.08 * a.fire, 'highpass');
  }
  tone(t, f, dur, type = 'triangle', vol = 0.1, f2, dest) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(t, dur, freq, vol = 0.2, type = 'lowpass', dest) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  bird() { const t = this.ctx.currentTime, f = 2000 + Math.random() * 1500; for (let i = 0; i < 3; i++) this.tone(t + i * 0.12, f, 0.09, 'sine', 0.025, f * 1.3); }
  cricket() { const t = this.ctx.currentTime; for (let i = 0; i < 6; i++) this.tone(t + i * 0.05, 4200, 0.03, 'square', 0.006); }
  play(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    if (this.last[name] && t - this.last[name] < 0.06) return; this.last[name] = t;
    switch (name) {
      case 'pick': this.noise(t, 0.12, 1800, 0.12, 'bandpass'); this.tone(t, 500, 0.08, 'triangle', 0.05, 700); break;
      case 'chop': this.noise(t, 0.08, 900, 0.3); this.tone(t, 160, 0.12, 'triangle', 0.12, 90); break;
      case 'fall': this.noise(t, 0.8, 300, 0.35); this.tone(t + 0.3, 80, 0.5, 'sine', 0.2, 40); break;
      case 'splash': this.noise(t, 0.4, 900, 0.22); break;
      case 'eat': for (let i = 0; i < 3; i++) this.noise(t + i * 0.12, 0.06, 1500, 0.1, 'bandpass'); break;
      case 'drink': for (let i = 0; i < 3; i++) this.tone(t + i * 0.15, 300, 0.1, 'sine', 0.08, 200); break;
      case 'craft': this.noise(t, 0.1, 2000, 0.1, 'bandpass'); this.tone(t + 0.1, 660, 0.15, 'triangle', 0.08); this.tone(t + 0.22, 880, 0.2, 'triangle', 0.08); break;
      case 'build': for (let i = 0; i < 4; i++) { this.noise(t + i * 0.15, 0.07, 700, 0.25); this.tone(t + i * 0.15, 200, 0.08, 'triangle', 0.08, 120); } break;
      case 'crate': this.noise(t, 0.3, 600, 0.25); this.tone(t + 0.2, 523, 0.2, 'triangle', 0.08); this.tone(t + 0.32, 784, 0.3, 'triangle', 0.08); break;
      case 'light': this.noise(t, 0.6, 1200, 0.25, 'bandpass'); this.tone(t, 200, 0.6, 'sawtooth', 0.03, 400); break;
      case 'horn': this.tone(t, 110, 2.2, 'sawtooth', 0.09, 105); this.tone(t, 165, 2.2, 'triangle', 0.06); break;
      case 'thunder': this.noise(t, 2.5, 160, 0.5); this.noise(t + 0.1, 1.2, 600, 0.2); break;
      case 'hurt': this.tone(t, 220, 0.2, 'sawtooth', 0.08, 110); break;
      case 'page': this.noise(t, 0.25, 4000, 0.06, 'highpass'); break;
      case 'deny': this.tone(t, 200, 0.15, 'square', 0.04, 150); break;
      case 'click': this.tone(t, 800, 0.04, 'triangle', 0.05); break;
      case 'catch': this.noise(t, 0.1, 1200, 0.15, 'bandpass'); this.tone(t, 600, 0.12, 'triangle', 0.08, 900); break;
      case 'flare': this.noise(t, 1.2, 2500, 0.3, 'bandpass'); this.tone(t, 400, 1.2, 'sawtooth', 0.05, 1600); break;
      case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(t + i * 0.16, f, 0.5, 'triangle', 0.08)); break;
    }
  }
  // a quiet fingerpicked guitar: arpeggios that change with the mood (day, night, home)
  loop() {
    const PROG = { day: [[0, 4, 7, 12], [-3, 0, 4, 9], [5, 9, 12, 17], [-5, -1, 2, 7]], night: [[-3, 0, 4, 9], [-7, -3, 0, 5], [-8, -5, -1, 4], [-5, -1, 2, 7]], home: [[0, 4, 7, 12], [5, 9, 12, 16], [-3, 0, 4, 9], [7, 11, 14, 19]] };
    const root = 196, f = (n) => root * Math.pow(2, n / 12);
    let i = 0, next = this.ctx.currentTime + 0.5;
    setInterval(() => {
      if (!this.musicOn) { next = this.ctx.currentTime + 0.2; return; }
      const prog = PROG[this.mood] || PROG.day, step = this.mood === 'night' ? 0.42 : 0.32;
      while (next < this.ctx.currentTime + 0.3) {
        const bar = Math.floor(i / 8) % 4, ch = prog[bar], k = i % 8, pat = [0, 2, 1, 3, 2, 1, 3, 2][k];
        if (k === 0) this.tone(next, f(ch[0] - 12), step * 3.5, 'triangle', 0.08, null, this.musicBus);
        this.tone(next, f(ch[pat]), step * 2.2, 'triangle', 0.045, null, this.musicBus);
        next += step; i++;
      }
    }, 60);
  }
  setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.value = on ? 0.28 : 0; }
}
