/**
 * All sound in Little Wonder World is synthesised at runtime with the Web
 * Audio API — tiny, original, and nothing to download. The context is only
 * created/resumed after a user gesture, respecting autoplay rules.
 */
export type SoundId =
  | 'tap' | 'pickup' | 'drop' | 'pop' | 'chime' | 'discover' | 'splash' | 'honk' | 'bark' | 'meow' | 'quack' | 'ribbit'
  | 'boing' | 'ding' | 'swoosh' | 'grow' | 'draw' | 'click' | 'jingle' | 'whee' | 'tok' | 'munch' | 'purr' | 'ring'
  | 'door' | 'switch' | 'flutter' | 'rustle' | 'hello' | 'stamp' | 'fill' | 'squeak' | 'buzz' | 'shutter' | 'magic' | 'thud' | 'tick' | 'rain';

interface MusicSpec {
  root: number;
  scale: readonly number[];
  bpm: number;
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class AudioSystemImpl {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private voices = 0;
  private lastPlayed = new Map<SoundId, number>();
  private sfxOn = true;
  private musicOn = true;
  private sfxVol = 0.8;
  private musicVol = 0.35;
  private musicSpec: MusicSpec | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private melodyRng = 1;

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor({ latencyHint: 'interactive' });
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 4;
        this.master.connect(comp).connect(this.ctx.destination);
        this.sfx = this.ctx.createGain();
        this.music = this.ctx.createGain();
        this.sfx.connect(this.master);
        this.music.connect(this.master);
        this.applyVolumes();
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume().then(() => this.maybeStartMusic());
      else this.maybeStartMusic();
    } catch {
      this.ctx = null;
    }
  }

  setSettings(s: { sfxOn: boolean; musicOn: boolean; sfxVolume: number; musicVolume: number }): void {
    this.sfxOn = s.sfxOn;
    this.musicOn = s.musicOn;
    this.sfxVol = s.sfxVolume;
    this.musicVol = s.musicVolume;
    this.applyVolumes();
    if (!this.musicOn) this.stopScheduler();
    else this.maybeStartMusic();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfx.gain.setTargetAtTime(this.sfxOn ? this.sfxVol : 0, t, 0.05);
    this.music.gain.setTargetAtTime(this.musicOn ? this.musicVol * 0.5 : 0, t, 0.3);
  }

  /** Suspend everything while the page is hidden. */
  setHidden(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  // ------------------------------------------------------------------ voices
  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private tone(type: OscillatorType, f0: number, f1: number | null, t: number, dur: number, peak: number, opts: { attack?: number; filter?: number; q?: number; dest?: AudioNode; detune?: number } = {}) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (opts.detune) o.detune.value = opts.detune;
    if (f1 !== null) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    this.env(g, t, opts.attack ?? 0.005, peak, dur);
    let node: AudioNode = o;
    if (opts.filter) {
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = opts.filter;
      flt.Q.value = opts.q ?? 0.7;
      node.connect(flt);
      node = flt;
    }
    node.connect(g).connect(opts.dest ?? this.sfx);
    o.start(t);
    o.stop(t + (opts.attack ?? 0.005) + dur + 0.05);
    this.track(o);
  }

  private noise(t: number, dur: number, peak: number, type: BiquadFilterType, f0: number, f1: number | null, q = 1) {
    const ctx = this.ctx!;
    if (!this.noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f0, t);
    if (f1 !== null) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    flt.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, 0.006, peak, dur);
    src.connect(flt).connect(g).connect(this.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
    this.track(src);
  }

  private bell(freq: number, t: number, peak: number, dur = 1.2, dest?: AudioNode) {
    this.tone('sine', freq, null, t, dur, peak, { dest });
    this.tone('sine', freq * 2.76, null, t, dur * 0.4, peak * 0.25, { dest });
    this.tone('sine', freq * 5.4, null, t, dur * 0.15, peak * 0.08, { dest });
  }

  private track(n: AudioScheduledSourceNode) {
    this.voices++;
    n.onended = () => {
      this.voices--;
      n.disconnect();
    };
  }

  /** Play a sound effect. `pitch` scales the frequencies a little for variety. */
  play(id: SoundId, opts: { pitch?: number; volume?: number } = {}): void {
    if (!this.ctx || this.ctx.state !== 'running' || !this.sfxOn) return;
    if (this.voices > 40) return;
    const now = this.ctx.currentTime;
    const last = this.lastPlayed.get(id) ?? -1;
    const minGap = id === 'draw' ? 0.05 : id === 'tok' ? 0.04 : 0.03;
    if (now - last < minGap) return;
    this.lastPlayed.set(id, now);
    const p = opts.pitch ?? 1;
    const v = opts.volume ?? 1;
    const t = now + 0.005;
    switch (id) {
      case 'tap':
        this.tone('triangle', 880 * p, 660 * p, t, 0.09, 0.25 * v);
        break;
      case 'click':
        this.tone('triangle', 1200 * p, 900 * p, t, 0.05, 0.18 * v);
        break;
      case 'tick':
        this.tone('sine', 1600 * p, 1400 * p, t, 0.03, 0.1 * v);
        break;
      case 'pickup':
        this.tone('sine', 520 * p, 820 * p, t, 0.1, 0.22 * v);
        break;
      case 'drop':
        this.tone('sine', 300 * p, 140 * p, t, 0.14, 0.32 * v);
        this.noise(t, 0.05, 0.05 * v, 'lowpass', 800, null);
        break;
      case 'thud':
        this.tone('sine', 160 * p, 70 * p, t, 0.2, 0.4 * v);
        break;
      case 'pop':
        this.tone('sine', 380 * p, 1300 * p, t, 0.08, 0.28 * v);
        this.tone('sine', 900 * p, 1800 * p, t + 0.05, 0.06, 0.12 * v);
        break;
      case 'chime':
        [0, 4, 7].forEach((n, i) => this.bell(midi(76 + n) * p, t + i * 0.07, 0.12 * v, 0.8));
        break;
      case 'discover':
        [0, 4, 7, 12].forEach((n, i) => this.bell(midi(79 + n), t + i * 0.09, 0.13 * v, 1.1));
        break;
      case 'magic':
        [0, 7, 12, 16, 19].forEach((n, i) => this.bell(midi(72 + n) * p, t + i * 0.06, 0.08 * v, 0.9));
        break;
      case 'splash':
        this.noise(t, 0.35, 0.3 * v, 'bandpass', 2400, 500, 1.2);
        this.tone('sine', 600 * p, 200 * p, t, 0.15, 0.12 * v);
        break;
      case 'rain':
        this.noise(t, 2.6, 0.08 * v, 'highpass', 3000, 2500, 0.5);
        break;
      case 'honk':
        for (const dt of [0, 0.2]) {
          this.tone('square', 370 * p, null, t + dt, 0.12, 0.08 * v, { filter: 1400, detune: 0 });
          this.tone('square', 466 * p, null, t + dt, 0.12, 0.06 * v, { filter: 1400 });
        }
        break;
      case 'bark':
        for (const dt of [0, 0.16]) {
          this.tone('sawtooth', 210 * p, 120 * p, t + dt, 0.1, 0.14 * v, { filter: 900, q: 3 });
          this.noise(t + dt, 0.06, 0.06 * v, 'bandpass', 700, 400, 2);
        }
        break;
      case 'meow': {
        const ctx = this.ctx;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(520 * p, t);
        o.frequency.linearRampToValueAtTime(780 * p, t + 0.14);
        o.frequency.linearRampToValueAtTime(460 * p, t + 0.42);
        const flt = ctx.createBiquadFilter();
        flt.type = 'bandpass';
        flt.frequency.setValueAtTime(900, t);
        flt.frequency.linearRampToValueAtTime(1600, t + 0.15);
        flt.frequency.linearRampToValueAtTime(800, t + 0.42);
        flt.Q.value = 4;
        const g = ctx.createGain();
        this.env(g, t, 0.04, 0.22 * v, 0.42);
        o.connect(flt).connect(g).connect(this.sfx);
        o.start(t);
        o.stop(t + 0.5);
        this.track(o);
        break;
      }
      case 'quack':
        for (const dt of [0, 0.15]) this.tone('sawtooth', 300 * p, 220 * p, t + dt, 0.11, 0.12 * v, { filter: 1300, q: 6 });
        break;
      case 'ribbit':
        for (const dt of [0, 0.12]) this.tone('square', 180 * p, 140 * p, t + dt, 0.08, 0.08 * v, { filter: 700, q: 5 });
        break;
      case 'boing': {
        const ctx = this.ctx;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(180 * p, t);
        o.frequency.exponentialRampToValueAtTime(520 * p, t + 0.08);
        o.frequency.exponentialRampToValueAtTime(240 * p, t + 0.4);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 18;
        const lg = ctx.createGain();
        lg.gain.value = 30;
        lfo.connect(lg).connect(o.frequency);
        const g = ctx.createGain();
        this.env(g, t, 0.01, 0.3 * v, 0.42);
        o.connect(g).connect(this.sfx);
        o.start(t);
        lfo.start(t);
        o.stop(t + 0.5);
        lfo.stop(t + 0.5);
        this.track(o);
        break;
      }
      case 'ding':
        this.bell(1320 * p, t, 0.22 * v, 1.6);
        break;
      case 'ring':
        for (const dt of [0, 0.12, 0.24]) this.bell(2100 * p, t + dt, 0.07 * v, 0.25);
        break;
      case 'swoosh':
        this.noise(t, 0.3, 0.14 * v, 'bandpass', 600, 2400, 1.5);
        break;
      case 'flutter':
        for (let i = 0; i < 4; i++) this.noise(t + i * 0.05, 0.04, 0.07 * v, 'bandpass', 1800, null, 2);
        break;
      case 'rustle':
        this.noise(t, 0.4, 0.12 * v, 'highpass', 2500, 4000, 0.7);
        break;
      case 'grow':
        this.tone('sine', 330 * p, 990 * p, t, 0.45, 0.16 * v, { attack: 0.03 });
        this.bell(midi(84) * p, t + 0.35, 0.08 * v, 0.6);
        break;
      case 'draw':
        this.noise(t, 0.05, 0.035 * v, 'bandpass', 3200 * p, null, 1.4);
        break;
      case 'stamp':
        this.tone('sine', 220 * p, 110 * p, t, 0.1, 0.3 * v);
        this.noise(t, 0.04, 0.08 * v, 'lowpass', 1500, null);
        break;
      case 'fill':
        this.tone('sine', 300, 600, t, 0.3, 0.16 * v);
        this.noise(t, 0.3, 0.06 * v, 'bandpass', 600, 1800, 1);
        break;
      case 'jingle':
        [0, 4, 7, 12, 7, 4, 0].forEach((n, i) => this.bell(midi(81 + n), t + i * 0.16, 0.1 * v, 0.4));
        break;
      case 'whee':
        this.tone('sine', 900 * p, 300 * p, t, 0.5, 0.14 * v, { attack: 0.03 });
        break;
      case 'tok':
        this.tone('triangle', 520 * p, 380 * p, t, 0.06, 0.18 * v);
        break;
      case 'munch':
        for (let i = 0; i < 3; i++) this.noise(t + i * 0.13, 0.07, 0.14 * v, 'bandpass', 900, 500, 2);
        break;
      case 'purr': {
        const ctx = this.ctx;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = 55;
        const am = ctx.createOscillator();
        am.frequency.value = 22;
        const amg = ctx.createGain();
        amg.gain.value = 0.5;
        const g = ctx.createGain();
        g.gain.value = 0;
        am.connect(amg).connect(g.gain);
        const flt = ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.value = 300;
        const out = ctx.createGain();
        this.env(out, t, 0.15, 0.25 * v, 1.0);
        o.connect(flt).connect(g).connect(out).connect(this.sfx);
        o.start(t);
        am.start(t);
        o.stop(t + 1.2);
        am.stop(t + 1.2);
        this.track(o);
        break;
      }
      case 'door':
        this.tone('triangle', 240 * p, 180 * p, t, 0.08, 0.2 * v);
        this.tone('sine', 700 * p, 900 * p, t + 0.05, 0.18, 0.05 * v);
        break;
      case 'switch':
        this.tone('square', 1800, 1200, t, 0.02, 0.05 * v, { filter: 3000 });
        this.bell(midi(88), t + 0.03, 0.06 * v, 0.5);
        break;
      case 'hello':
        this.tone('sine', 620 * p, 880 * p, t, 0.12, 0.16 * v, { attack: 0.02 });
        this.tone('sine', 880 * p, 700 * p, t + 0.14, 0.16, 0.14 * v, { attack: 0.02 });
        break;
      case 'squeak':
        this.tone('sine', 1300 * p, 1900 * p, t, 0.08, 0.12 * v);
        break;
      case 'buzz':
        this.tone('sawtooth', 210 * p, 230 * p, t, 0.5, 0.05 * v, { filter: 900, attack: 0.05 });
        break;
      case 'shutter':
        this.noise(t, 0.05, 0.15 * v, 'highpass', 2000, null);
        this.noise(t + 0.09, 0.05, 0.12 * v, 'highpass', 2500, null);
        break;
    }
  }

  // ------------------------------------------------------------------ music
  setMusic(spec: MusicSpec | null): void {
    this.musicSpec = spec;
    this.stopScheduler();
    this.maybeStartMusic();
  }

  private maybeStartMusic(): void {
    if (!this.ctx || this.ctx.state !== 'running' || !this.musicOn || !this.musicSpec || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.2;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.schedule(), 120);
  }

  private stopScheduler(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private rand(): number {
    this.melodyRng = (this.melodyRng * 16807) % 2147483647;
    return (this.melodyRng - 1) / 2147483646;
  }

  /** A gentle generative music box: sparse pentatonic melody over soft chords. */
  private schedule(): void {
    if (!this.ctx || !this.musicSpec) return;
    const spec = this.musicSpec;
    const beat = 60 / spec.bpm / 2;
    while (this.nextNoteTime < this.ctx.currentTime + 0.4) {
      const t = this.nextNoteTime;
      const bar = Math.floor(this.step / 8) % 4;
      const chordRoots = [0, 5, 7, 3];
      if (this.step % 8 === 0) {
        const r = spec.root - 12 + (chordRoots[bar] ?? 0);
        for (const n of [0, 7, 12]) this.tone('triangle', midi(r + n), null, t, beat * 7, 0.035, { attack: 0.3, dest: this.music, filter: 900 });
      }
      if (this.rand() < (this.step % 2 === 0 ? 0.55 : 0.2)) {
        const deg = spec.scale[Math.floor(this.rand() * spec.scale.length)] ?? 0;
        const oct = this.rand() < 0.3 ? 12 : 0;
        this.bell(midi(spec.root + 12 + deg + oct), t, 0.045, 1.4, this.music);
      }
      this.step++;
      this.nextNoteTime += beat;
    }
  }
}

export const audio = new AudioSystemImpl();
