// Web Audio API Synthesizer Engine
export interface AudioEvent {
  time: number; // ms from track start
  type: "kick" | "snare" | "hihat" | "crash" | "synth" | "bass" | "clap" | "sweep";
  freq?: number;
  dur?: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private startCtxTime: number = 0;

  start(events: AudioEvent[]): number {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.45;
    this.masterGain.connect(this.ctx.destination);

    this.startCtxTime = this.ctx.currentTime + 0.05;

    for (const ev of events) {
      const t = this.startCtxTime + ev.time / 1000;
      switch (ev.type) {
        case "kick":
          this.kick(t);
          break;
        case "snare":
          this.snare(t);
          break;
        case "hihat":
          this.hihat(t);
          break;
        case "crash":
          this.crash(t);
          break;
        case "synth":
          this.synth(t, ev.freq ?? 440, ev.dur ?? 200);
          break;
        case "bass":
          this.bass(t, ev.freq ?? 55, ev.dur ?? 400);
          break;
        case "clap":
          this.clap(t);
          break;
        case "sweep":
          this.sweep(t, ev.dur ?? 2000);
          break;
      }
    }
    return performance.now();
  }

  stop() {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(0, this.ctx?.currentTime ?? 0);
    }
    setTimeout(() => {
      if (this.ctx && this.ctx.state !== "closed") {
        this.ctx.close().catch(() => {});
      }
      this.ctx = null;
      this.masterGain = null;
    }, 100);
  }

  private kick(t: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.masterGain);
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  private snare(t: number) {
    if (!this.ctx || !this.masterGain) return;
    // Noise component
    const len = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.connect(hp);
    hp.connect(g);
    g.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.12);
    // Tone
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.connect(og);
    og.connect(this.masterGain);
    osc.frequency.value = 180;
    og.gain.setValueAtTime(0.4, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  private hihat(t: number) {
    if (!this.ctx || !this.masterGain) return;
    const len = Math.floor(this.ctx.sampleRate * 0.04);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.connect(hp);
    hp.connect(g);
    g.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.04);
  }

  private crash(t: number) {
    if (!this.ctx || !this.masterGain) return;
    const len = Math.floor(this.ctx.sampleRate * 0.8);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 5000;
    bp.Q.value = 0.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    noise.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.8);
  }

  private clap(t: number) {
    if (!this.ctx || !this.masterGain) return;
    for (let i = 0; i < 3; i++) {
      const offset = t + i * 0.01;
      const len = Math.floor(this.ctx.sampleRate * 0.06);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < len; j++) d[j] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2500;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.5, offset);
      g.gain.exponentialRampToValueAtTime(0.001, offset + 0.06);
      noise.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      noise.start(offset);
      noise.stop(offset + 0.06);
    }
  }

  private synth(t: number, freq: number, durMs: number) {
    if (!this.ctx || !this.masterGain) return;
    const dur = durMs / 1000;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + dur);
    lp.Q.value = 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.setValueAtTime(0.2, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  private bass(t: number, freq: number, durMs: number) {
    if (!this.ctx || !this.masterGain) return;
    const dur = durMs / 1000;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    // Sub oscillator
    const sub = this.ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = freq / 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.3, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    sub.connect(sg);
    g.connect(this.masterGain);
    sg.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);
    sub.start(t);
    sub.stop(t + dur);
  }

  private sweep(t: number, durMs: number) {
    if (!this.ctx || !this.masterGain) return;
    const dur = durMs / 1000;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + dur);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(200, t);
    lp.frequency.exponentialRampToValueAtTime(8000, t + dur);
    lp.Q.value = 5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.35, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);
  }
}
