/** speed of sound (m/s): the music reaches a listener d m from the PA d / 343 s after it left the stage */
export const SPEED_OF_SOUND = 343;
/** DelayNode buffer of the distance delay (s) and the longest delay used (1.45 s ≈ 500 m) */
const DELAY_BUFFER = 1.5;
const MAX_MUSIC_DELAY = 1.45;
/** delay cut: gate fade out, delay jump in silence, fade back in (s) */
const CUT_OUT = 0.04;
const CUT_IN = 0.1;
/**
 * fastest delay slew while moving (s/s = pitch shift): 1.5 % ≈ 5 m/s (a quarter semitone), above running
 * speed (3.4 m/s); a faster (free camera) flight builds up a lag that the gate dips catch up
 */
const MAX_DELAY_RATE = 0.015;
/** a change of the target this large within one update is a jump (s ≈ 27 m), not motion */
const JUMP_STEP = 0.08;
/** accumulated lag behind the target that is cut even while still moving (s ≈ 50 m) */
const MAX_LAG = 0.15;
/** once the listener has (nearly) stopped (target rate below this, s/s ≈ 5 m/s), a lag above SETTLE_LAG is cut */
const SETTLED_RATE = 0.015;
const SETTLE_LAG = 0.04;
/**
 * each slew step is a linear ramp ending this far ahead (s), longer than the 15 Hz update interval, so
 * a new ramp always starts where the running one ends (in the future). An automation event starting at
 * `currentTime` would begin in the past on the audio thread and step the delay by a few samples: a click.
 */
const SLEW_AHEAD = 0.1;

/**
 * Web Audio graph (one AudioContext for the whole app):
 *
 *   music source -> musicIn -> distance delay (d / 343 s) -> delay gate -> perception lowpass
 *        -> perception low / high shelf -> wobble delay
 *        -> distance air-absorption lowpass -> rear high-shelf -> stereo width (M/S) -> direction pan
 *        -> distance gain -> musicGain -> master
 *   wobble delay -> perception echo send (two cross-fed delays, off by default) -> stereo width (M/S)
 *        (so the echo follows the width, direction pan and distance / perception level like the dry music)
 *   heartbeat (one persistent 48 Hz oscillator -> envelope gain, silent by default) -> master
 *   ambience (AmbienceSystem) -> ambienceIn -> perception lowpass -> ambienceGain -> master
 *   sfx -> sfxGain -> master
 *   master -> safety limiter -> destination
 *
 * The distance delay (setMusicDelay) makes the music arrive later the further the listener stands from
 * the PA while the picture stays at the stage (light is instant): it is NOT part of outputDelay(), so
 * the ShowClock keeps following the emitted sound. Crowd vocals and cheers add the same lag
 * (AmbienceSystem: the Tribe around you reacts to what it hears).
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
  private percLowShelf!: BiquadFilterNode;
  private percHighShelf!: BiquadFilterNode;
  private echoSend!: GainNode;
  private heartGain!: GainNode;
  private distDelay!: DelayNode;
  /** mutes the delay line's output while its delay jumps (teleport, mode switch, seek) */
  private delayGate!: GainNode;
  /** audio-clock time the current delay cut is over (the delay is not slewed before) */
  private cutUntil = 0;
  /** audio-clock time the last scheduled delay automation (slew ramp or cut jump) ends */
  private slewEnd = 0;
  /** gate schedule of the running cut: fade out from `v0` at `start` to 0 at `closed`, fade in from `open` */
  private readonly cut = { start: 0, v0: 1, closed: 0, open: 0 };
  /**
   * audio-clock time from which the input of the delay line (musicIn) is fresh: entered after the last
   * jump of the source (a seek / pause / restart makes everything before it stale, musicJump) and not
   * heard yet (a cut records the input heard so far). A cut reopens the gate only once the line outputs
   * input from this time on (freshAt + delay), so raising the delay can neither expose pre-seek audio
   * still in the line nor replay music already heard.
   */
  private freshAt = 0;
  /** delay target of the last update and how fast it moves (s/s, smoothed) */
  private readonly delayTrack = { target: 0, rate: 0 };
  /** counts delay cuts: AmbienceSystem re-times the crowd vocals scheduled with the old delay */
  delayCuts = 0;
  private volume = 0.85;
  private muted = false;
  private readyCbs: ((ctx: AudioContext) => void)[] = [];
  /**
   * last applied spatial values (for stats / avoiding redundant automation); `delay` = the distance
   * delay of the music (s) the listener hears now (crowd one-shots add it too)
   */
  readonly spatial = { distance: 40, gainDb: 0, cutoff: 20000, pan: 0, rear: 0, width: 1, delay: 0 };
  /**
   * perception mix (PerceptionSystem, T5d): stereo width multiplier, level (dB), low / high shelf (dB),
   * echo send 0..1 and the share of the distance level drop that is kept (1 = all of it). Identity = 1, 0, 0, 0, 0, 1.
   */
  readonly percMix = { width: 1, gainDb: 0, lowDb: 0, highDb: 0, echo: 0, distDrop: 1 };
  private lastMuffle = 0;
  /** audio-clock time of the next scheduled heartbeat (0 = not running) */
  private nextBeatAt = 0;

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
    // perception shelves (0 dB = identity)
    this.percLowShelf = ctx.createBiquadFilter();
    this.percLowShelf.type = 'lowshelf';
    this.percLowShelf.frequency.value = 90;
    this.percLowShelf.gain.value = 0;
    this.percHighShelf = ctx.createBiquadFilter();
    this.percHighShelf.type = 'highshelf';
    this.percHighShelf.frequency.value = 5000;
    this.percHighShelf.gain.value = 0;
    // distance delay first, so the dry music and the perception echo (tapped after the wobble delay)
    // arrive together; the gate sits AFTER the delay line: only its output can hide a delay jump
    this.distDelay = ctx.createDelay(DELAY_BUFFER);
    this.distDelay.delayTime.value = 0;
    this.delayGate = ctx.createGain();
    this.delayGate.gain.value = 1;
    this.musicIn.connect(this.distDelay).connect(this.delayGate);
    this.delayGate.connect(this.lowpass).connect(this.percLowShelf).connect(this.percHighShelf).connect(this.wobbleDelay).connect(this.distLowpass).connect(this.rearShelf).connect(split);
    merge.connect(this.dirPan).connect(this.distGain).connect(this.musicGain).connect(this.master);

    // perception echo (ketamine: sound far away, a wide echo): send gain 0 = off
    this.echoSend = ctx.createGain();
    this.echoSend.gain.value = 0;
    const echoL = ctx.createDelay(1);
    const echoR = ctx.createDelay(1);
    echoL.delayTime.value = 0.29;
    echoR.delayTime.value = 0.41;
    const echoTone = ctx.createBiquadFilter();
    echoTone.type = 'lowpass';
    echoTone.frequency.value = 2400;
    echoTone.Q.value = 0.5;
    const fbL = ctx.createGain();
    const fbR = ctx.createGain();
    fbL.gain.value = fbR.gain.value = 0.42;
    const echoMerge = ctx.createChannelMerger(2);
    this.wobbleDelay.connect(this.echoSend).connect(echoTone);
    echoTone.connect(echoL);
    echoTone.connect(echoR);
    // cross-fed feedback: the echo bounces between the sides (a wide, distant space)
    echoL.connect(fbL).connect(echoR);
    echoR.connect(fbR).connect(echoL);
    echoL.connect(echoMerge, 0, 0);
    echoR.connect(echoMerge, 0, 1);
    // into the width stage: far from the PA the echo drops with the distance model like the dry sound, and
    // the perception level (-4 dB for ketamine) applies to it too
    echoMerge.connect(split);

    // heartbeat: one persistent 48 Hz oscillator, beats are gain envelopes scheduled on the audio clock
    const heartOsc = ctx.createOscillator();
    heartOsc.type = 'sine';
    heartOsc.frequency.value = 48;
    this.heartGain = ctx.createGain();
    this.heartGain.gain.value = 0;
    heartOsc.connect(this.heartGain).connect(this.master);
    heartOsc.start();

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
   * Media tracks subtract it so visuals match what is HEARD. The distance delay (setMusicDelay) is
   * deliberately NOT included: the show clock stays at the stage (light instant, sound lags).
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
   * pitch wow via a modulated delay (depth up to 9 ms; `rateHz` overrides the wow rate, e.g. a slow
   * drift). The muffle also applies (a bit less) to the crowd ambience.
   */
  setPerception(muffle: number, wobble: number, rateHz?: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const m = Math.max(0, Math.min(0.92, muffle));
    const f = 20000 * Math.pow(1 - m, 2.2) + 350;
    this.lowpass.frequency.setTargetAtTime(Math.min(20000, f), now, 0.2);
    const fa = 20000 * Math.pow(1 - m * 0.85, 2.2) + 500;
    if (Math.abs(m - this.lastMuffle) > 1e-4) this.ambLowpass.frequency.setTargetAtTime(Math.min(20000, fa), now, 0.25);
    this.lastMuffle = m;
    const w = Math.max(0, Math.min(1, wobble));
    // the delay line idles at 12 ms: the depth must stay below that
    this.wobbleDepth.gain.setTargetAtTime(w * 0.009, now, 0.3);
    this.wobbleLfo.frequency.setTargetAtTime(rateHz !== undefined && rateHz > 0 ? rateHz : 0.2 + w * 0.4, now, 0.3);
  }

  /**
   * Perception mix (T5d): stereo width multiplier, music level (dB), low shelf (90 Hz) and high shelf (5 kHz)
   * gains (dB), echo send 0..1 and the share of the distance model's level drop that is kept. Multiplied
   * into the distance model in one place (applySpatial), so it never fights setMusicDistance. Throttle-safe:
   * unchanged values do nothing.
   */
  setPerceptionMix(widthScale: number, gainDb: number, lowShelfDb: number, highShelfDb: number, echo = 0, distDrop = 1): void {
    if (!this.ctx) return;
    const q = this.percMix;
    const w = Math.max(0, Math.min(1.6, widthScale));
    const g = Math.max(-24, Math.min(6, gainDb));
    const lo = Math.max(-12, Math.min(8, lowShelfDb));
    const hi = Math.max(-12, Math.min(8, highShelfDb));
    const e = Math.max(0, Math.min(1, echo));
    const dd = Math.max(0, Math.min(1, distDrop));
    const now = this.ctx.currentTime;
    if (Math.abs(lo - q.lowDb) > 0.01) this.percLowShelf.gain.setTargetAtTime(lo, now, 0.3);
    if (Math.abs(hi - q.highDb) > 0.01) this.percHighShelf.gain.setTargetAtTime(hi, now, 0.3);
    if (Math.abs(e - q.echo) > 0.002) this.echoSend.gain.setTargetAtTime(0.5 * e, now, 0.4);
    q.lowDb = lo;
    q.highDb = hi;
    q.echo = e;
    if (Math.abs(w - q.width) < 0.002 && Math.abs(g - q.gainDb) < 0.01 && Math.abs(dd - q.distDrop) < 0.002) return;
    q.width = w;
    q.gainDb = g;
    q.distDrop = dd;
    this.applySpatial(now);
  }

  /**
   * Heartbeat close by (XTC, heat danger, ketamine): `levelDb` of the "lub" (-Infinity = silent), `bpm`
   * sets the spacing, `phase` 0..1 aligns a restart with the simulated heart. Beats are gain envelopes
   * scheduled ahead on the audio clock (lub 70 ms, dub 60 ms at 0.6 level, 0.3 of a period later): no node
   * per beat. Call from a throttled path (e.g. 5 Hz).
   */
  setHeartbeat(bpm: number, levelDb: number, phase = 0): void {
    if (!this.ctx) return;
    const g = this.heartGain.gain;
    const now = this.ctx.currentTime;
    if (!(levelDb > -80) || !(bpm > 20)) {
      if (this.nextBeatAt > 0) {
        g.cancelScheduledValues(now);
        g.setTargetAtTime(0, now, 0.05);
        this.nextBeatAt = 0;
      }
      return;
    }
    const period = 60 / Math.min(220, bpm);
    const amp = Math.pow(10, Math.min(0, levelDb) / 20);
    if (this.nextBeatAt < now) this.nextBeatAt = now + 0.05 + (1 - (((phase % 1) + 1) % 1)) * period * 0.999;
    const horizon = now + 0.5;
    while (this.nextBeatAt < horizon) {
      const t = this.nextBeatAt;
      g.setValueAtTime(0, t);
      g.linearRampToValueAtTime(amp, t + 0.012);
      g.setTargetAtTime(0, t + 0.07, 0.02);
      const t2 = t + 0.3 * period;
      g.setValueAtTime(0, t2);
      g.linearRampToValueAtTime(amp * 0.6, t2 + 0.012);
      g.setTargetAtTime(0, t2 + 0.06, 0.02);
      this.nextBeatAt = t + period;
    }
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
    this.distLowpass.frequency.setTargetAtTime(s.cutoff, now, 0.25);
    this.applySpatial(now);
  }

  /** level and stereo width = distance model x perception mix (the only place that sets them) */
  private applySpatial(now: number): void {
    const s = this.spatial;
    const q = this.percMix;
    this.distGain.gain.setTargetAtTime(Math.pow(10, (s.gainDb * q.distDrop + q.gainDb) / 20), now, 0.25);
    const w = s.width * q.width;
    const a = (1 + w) / 2;
    const b = (1 - w) / 2;
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

  /**
   * Distance delay of the music: `seconds` = listener distance / 343 (0 for the Show camera and the
   * fly-over: the film's sound is synced to its picture), `dt` = time since the previous call.
   * Walking or running slews the delay (the tiny pitch shift is the physical Doppler shift, capped at
   * 1.5 % ≈ 5 m/s; faster flights build up a lag). A jump of the target (teleport, spot), `cut` (camera
   * mode switch, audio source switch, a reposition), a lag above 0.15 s, or a lag left over after a fast
   * flight once the listener slows down are hidden in a short gate dip instead: fade out 40 ms, set the
   * delay in silence, fade in 100 ms once the line outputs fresh input (see `freshAt`).
   */
  setMusicDelay(seconds: number, dt: number, cut = false): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const s = this.spatial;
    const tr = this.delayTrack;
    const target = Math.max(0, Math.min(MAX_MUSIC_DELAY, Number.isFinite(seconds) ? seconds : 0));
    const step = Math.abs(target - tr.target);
    const h = Math.max(1e-3, dt);
    tr.rate += (step / h - tr.rate) * (1 - Math.exp(-h / 0.25));
    tr.target = target;
    const gap = target - s.delay;
    const lag = Math.abs(gap);
    if (lag < 1e-4) return;
    if ((cut && lag > 0.003) || step > JUMP_STEP || lag > MAX_LAG || (tr.rate < SETTLED_RATE && lag > SETTLE_LAG)) {
      this.cutDelay(target, now);
      return;
    }
    // a dip is running: it already set the delay; walking on is slewed after it
    if (now < this.cutUntil) return;
    const max = MAX_DELAY_RATE * h;
    const d = this.distDelay.delayTime;
    // after a pause in the automation a ramp would start at the last event (maybe seconds ago) and
    // jump: anchor it just ahead of the audio thread at the value the delay rests at
    if (this.slewEnd < now + 0.01) d.setValueAtTime(s.delay, now + 0.02);
    s.delay += Math.max(-max, Math.min(max, gap));
    this.slewEnd = now + SLEW_AHEAD;
    d.linearRampToValueAtTime(s.delay, this.slewEnd);
  }

  /**
   * The music source jumped or stopped (seek, track swap, restart, pause): what is still travelling
   * through the delay line belongs to the old position. From `lead` s on (when the old material has
   * stopped entering musicIn; the new one may start then or later) the input is fresh; the gate mutes
   * the line until that input comes out. Without a distance delay nothing is in flight and nothing
   * changes (Show camera, fly-over), but the bookkeeping still applies: a cut that raises the delay
   * shortly afterwards (the Moments menu's "Watch from <spot>" teleports and seeks in one click) must
   * not reopen onto the pre-seek input still in the line.
   */
  musicJump(lead = 0.05): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.freshAt = Math.max(this.freshAt, now + Math.max(0, lead));
    const lag = this.spatial.delay;
    if (lag < CUT_OUT) return;
    this.cutDelay(lag, now);
  }

  /**
   * Gate dip: fade out, jump the delay while silent, fade back in once the line outputs fresh input
   * (`freshAt` + the new delay; a delay raised by a teleport gives a short silence equal to the extra
   * travel time instead of replaying music already heard, as physics would).
   */
  private cutDelay(target: number, now: number): void {
    const g = this.delayGate.gain;
    const d = this.distDelay.delayTime;
    const c = this.cut;
    const inDip = now < this.cutUntil;
    // a dip still fading out keeps its close time (the fade just continues); otherwise fade out now
    const closing = inDip && now < c.closed;
    const closedNow = inDip && now >= c.closed && now < c.open;
    const closeAt = closing ? c.closed : now + CUT_OUT;
    // what has been heard: while the gate is (partly) open the listener hears the input of `delay` s
    // ago, until the fade out ends (the delay is held until then). Fully closed: nothing new was heard
    if (!closedNow) this.freshAt = Math.max(this.freshAt, closeAt - d.value);
    const v0 = this.gateAt(now);
    // anchor the fade out at the gate's current value. Mid-dip cancelAndHoldAtTime freezes the running
    // ramp atomically; with no dip running it must NOT be used: after the last event Chrome inserts no
    // anchor, so the new ramp would start at the previous event (seconds ago) and step the gate down
    if (inDip && typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(now);
    else {
      g.cancelScheduledValues(now);
      g.setValueAtTime(v0, now);
    }
    g.linearRampToValueAtTime(0, closeAt);
    const t1 = closeAt + 0.005;
    // freeze a running slew ramp where it is (cancelling it would snap the delay back while still
    // audible), then jump in silence
    if (typeof d.cancelAndHoldAtTime === 'function') d.cancelAndHoldAtTime(now);
    else {
      const v = d.value;
      d.cancelScheduledValues(now);
      d.setValueAtTime(v, now);
    }
    d.setValueAtTime(target, t1);
    this.slewEnd = t1;
    // reopen once the line outputs input from `freshAt` on (a new cut may shorten a running dip:
    // every reason to keep it closed is in `freshAt`)
    const open = Math.max(t1, this.freshAt + target);
    g.setValueAtTime(0, open);
    g.linearRampToValueAtTime(1, open + CUT_IN);
    c.start = now;
    c.v0 = v0;
    c.closed = closeAt;
    c.open = open;
    this.cutUntil = open + CUT_IN;
    this.spatial.delay = target;
    this.delayCuts++;
  }

  /** gate value the scheduled dip gives at audio time `t` (1 outside a dip) */
  private gateAt(t: number): number {
    const c = this.cut;
    if (t >= this.cutUntil) return 1;
    if (t < c.closed) return c.v0 * Math.max(0, Math.min(1, (c.closed - t) / Math.max(1e-3, c.closed - c.start)));
    if (t < c.open) return 0;
    return Math.max(0, Math.min(1, (t - c.open) / CUT_IN));
  }
}
