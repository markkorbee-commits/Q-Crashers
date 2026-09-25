/**
 * Web Audio graph (one AudioContext for the whole app):
 *
 *   music source -> musicIn -> perception lowpass -> wobble delay
 *        -> distance air-absorption lowpass -> rear high-shelf -> stereo width (M/S) -> direction pan
 *        -> distance gain -> musicGain -> master
 *   ambience (AmbienceSystem) -> ambienceIn -> perception lowpass -> ambienceGain -> master
 *   sfx -> sfxGain -> master
 *   master -> safety limiter -> destination
 *
 * The AudioContext is created lazily on the first user gesture (autoplay policies).
 * All parameter changes are smoothed (setTargetAtTime) so callers may update them every frame.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicIn!: GainNode;
  musicGain!: GainNode;
  /** input for ambience beds (goes through the perception muffle, then ambienceGain) */
  ambienceIn!: GainNode;
  ambienceGain!: GainNode;
  sfxGain!: GainNode;
  private limiter!: DynamicsCompressorNode;
  private lowpass!: BiquadFilterNode;
  private ambLowpass!: BiquadFilterNode;
  private wobbleDelay!: DelayNode;
  private wobbleLfo!: OscillatorNode;
  private wobbleDepth!: GainNode;
  private distLowpass!: BiquadFilterNode;
  private rearShelf!: BiquadFilterNode;
  private widthLL!: GainNode;
  private widthRR!: GainNode;
  private widthLR!: GainNode;
  private widthRL!: GainNode;
  private dirPan!: StereoPannerNode;
  private distGain!: GainNode;
  private volume = 0.85;
  private muted = false;
  private readyCbs: ((ctx: AudioContext) => void)[] = [];
  /** last applied spatial values (for stats / avoiding redundant automation) */
  readonly spatial = { distance: 40, gainDb: 0, cutoff: 20000, pan: 0, rear: 0, width: 1 };
  private lastMuffle = 0;

  /** must be called from a user gesture handler at least once */
  ensure(): AudioContext {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      return this.ctx;
    }
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    this.ctx = ctx;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -2;
    this.limiter.knee.value = 3;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.16;
    this.limiter.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.limiter);

    this.musicIn = ctx.createGain();
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 20000;
    this.lowpass.Q.value = 0.5;
    this.wobbleDelay = ctx.createDelay(0.1);
    this.wobbleDelay.delayTime.value = 0.012;
    this.wobbleLfo = ctx.createOscillator();
    this.wobbleLfo.frequency.value = 0.35;
    this.wobbleDepth = ctx.createGain();
    this.wobbleDepth.gain.value = 0;
    this.wobbleLfo.connect(this.wobbleDepth).connect(this.wobbleDelay.delayTime);
    this.wobbleLfo.start();

    // --- distance / direction model (see setMusicDistance / setMusicDirection) ---
    this.distLowpass = ctx.createBiquadFilter();
    this.distLowpass.type = 'lowpass';
    this.distLowpass.frequency.value = 20000;
    this.distLowpass.Q.value = 0.4;
    this.rearShelf = ctx.createBiquadFilter();
    this.rearShelf.type = 'highshelf';
    this.rearShelf.frequency.value = 3200;
    this.rearShelf.gain.value = 0;
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    this.widthLL = ctx.createGain();
    this.widthRR = ctx.createGain();
    this.widthLR = ctx.createGain();
    this.widthRL = ctx.createGain();
    this.widthLL.gain.value = this.widthRR.gain.value = 1;
    this.widthLR.gain.value = this.widthRL.gain.value = 0;
    split.connect(this.widthLL, 0).connect(merge, 0, 0);
    split.connect(this.widthRL, 0).connect(merge, 0, 1);
    split.connect(this.widthRR, 1).connect(merge, 0, 1);
    split.connect(this.widthLR, 1).connect(merge, 0, 0);
    this.dirPan = ctx.createStereoPanner();
    this.distGain = ctx.createGain();
    this.musicGain = ctx.createGain();
    this.musicIn.connect(this.lowpass).connect(this.wobbleDelay).connect(this.distLowpass).connect(this.rearShelf).connect(split);
    merge.connect(this.dirPan).connect(this.distGain).connect(this.musicGain).connect(this.master);

    this.ambienceIn = ctx.createGain();
    this.ambLowpass = ctx.createBiquadFilter();
    this.ambLowpass.type = 'lowpass';
    this.ambLowpass.frequency.value = 20000;
    this.ambLowpass.Q.value = 0.5;
    this.ambienceGain = ctx.createGain();
    this.ambienceGain.gain.value = 0.5;
    this.ambienceIn.connect(this.ambLowpass).connect(this.ambienceGain).connect(this.master);
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.master);

    const cbs = this.readyCbs;
    this.readyCbs = [];
    for (const cb of cbs) {
      try {
        cb(ctx);
      } catch (e) {
        console.warn('[audio] ready callback failed', e);
      }
    }
    return ctx;
  }

  /** run `cb` once the AudioContext exists (immediately if it already does) */
  onReady(cb: (ctx: AudioContext) => void): void {
    if (this.ctx) cb(this.ctx);
    else this.readyCbs.push(cb);
  }

  /** true when the context exists and is running (audio is actually being rendered) */
  get running(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /**
   * Look-ahead delay of a DynamicsCompressorNode (Blink/WebKit/Gecko share the 6 ms pre-delay).
   * The master limiter adds it to everything that is heard.
   */
  static readonly COMPRESSOR_DELAY = 0.006;

  /**
   * Seconds between a sample entering `musicIn` and reaching the listener: master limiter
   * look-ahead + base latency + output latency (can be 150+ ms on Bluetooth headphones).
   * Media tracks subtract it so visuals match what is HEARD.
   */
  outputDelay(): number {
    const ctx = this.ctx;
    if (!ctx) return 0;
    const out = (ctx as AudioContext & { outputLatency?: number }).outputLatency;
    const base = ctx.baseLatency;
    return AudioEngine.COMPRESSOR_DELAY + (Number.isFinite(base) ? base : 0) + (Number.isFinite(out) ? (out as number) : 0);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.03);
  }
  getVolume() {
    return this.volume;
  }
  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.03);
  }
  isMuted() {
    return this.muted;
  }

  /**
   * Perception-driven audio: `muffle` 0..1 closes a low-pass (alcohol), `wobble` 0..1 adds slow
   * pitch wow via a modulated delay. The muffle also applies (a bit less) to the crowd ambience.
   */
  setPerception(muffle: number, wobble: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const m = Math.max(0, Math.min(0.92, muffle));
    const f = 20000 * Math.pow(1 - m, 2.2) + 350;
    this.lowpass.frequency.setTargetAtTime(Math.min(20000, f), now, 0.2);
    const fa = 20000 * Math.pow(1 - m * 0.85, 2.2) + 500;
    if (Math.abs(m - this.lastMuffle) > 1e-4) this.ambLowpass.frequency.setTargetAtTime(Math.min(20000, fa), now, 0.25);
    this.lastMuffle = m;
    this.wobbleDepth.gain.setTargetAtTime(wobble * 0.004, now, 0.3);
    this.wobbleLfo.frequency.setTargetAtTime(0.2 + wobble * 0.4, now, 0.3);
  }

  /** music level (dB) at a listening distance from the main PA, with delay-tower support */
  static distanceGainDb(meters: number): number {
    const d = Math.max(0, meters);
    if (d <= 30) return 0;
    // delay towers (z ~ 95 / 170) keep the field loud up to ~150 m
    if (d <= 150) return -0.021 * (d - 30);
    return Math.max(-30, -2.5 - 7 * Math.log2(d / 150));
  }

  /** air absorption low-pass cutoff (Hz) at a listening distance */
  static distanceCutoff(meters: number): number {
    return Math.min(20000, 20000 / (1 + Math.pow(Math.max(0, meters) / 150, 1.7)));
  }

  /**
   * Distance model for the music: subtle high-frequency air absorption, level drop and a narrower
   * stereo image far from the stage. FOH (~110 m) stays loud (delay towers); 300 m is quieter and
   * duller. Cheap to call every frame (values are smoothed).
   */
  setMusicDistance(meters: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const s = this.spatial;
    if (Math.abs(meters - s.distance) < 0.25) return;
    s.distance = meters;
    s.gainDb = AudioEngine.distanceGainDb(meters);
    s.cutoff = AudioEngine.distanceCutoff(meters);
    s.width = 1 - 0.45 * Math.min(1, Math.max(0, (meters - 60) / 360));
    this.distGain.gain.setTargetAtTime(Math.pow(10, s.gainDb / 20), now, 0.25);
    this.distLowpass.frequency.setTargetAtTime(s.cutoff, now, 0.25);
    const a = (1 + s.width) / 2;
    const b = (1 - s.width) / 2;
    this.widthLL.gain.setTargetAtTime(a, now, 0.3);
    this.widthRR.gain.setTargetAtTime(a, now, 0.3);
    this.widthLR.gain.setTargetAtTime(b, now, 0.3);
    this.widthRL.gain.setTargetAtTime(b, now, 0.3);
  }

  /**
   * Where the stage is relative to the listener's facing: `pan` -1 (left) .. 1 (right) shifts the
   * image slightly, `rear` 0..1 (stage behind you) softens the highs (head shadow). Subtle on purpose.
   */
  setMusicDirection(pan: number, rear: number): void {
    if (!this.ctx) return;
    const s = this.spatial;
    const p = Math.max(-1, Math.min(1, pan)) * 0.28;
    const r = Math.max(0, Math.min(1, rear));
    if (Math.abs(p - s.pan) < 0.004 && Math.abs(r - s.rear) < 0.01) return;
    s.pan = p;
    s.rear = r;
    const now = this.ctx.currentTime;
    this.dirPan.pan.setTargetAtTime(p, now, 0.12);
    this.rearShelf.gain.setTargetAtTime(-5 * r, now, 0.2);
  }
}
