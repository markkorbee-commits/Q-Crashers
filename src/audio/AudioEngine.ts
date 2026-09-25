/**
 * Web Audio graph:
 *   music source -> musicIn -> lowpass (perception) -> detune-ish wobble (delay mod) -> musicGain -> master -> out
 *   ambience -> ambienceGain -> master
 *   sfx -> sfxGain -> master
 * The AudioContext is created lazily on the first user gesture (autoplay policies).
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicIn!: GainNode;
  musicGain!: GainNode;
  ambienceGain!: GainNode;
  sfxGain!: GainNode;
  private lowpass!: BiquadFilterNode;
  private wobbleDelay!: DelayNode;
  private wobbleLfo!: OscillatorNode;
  private wobbleDepth!: GainNode;
  private volume = 0.85;
  private muted = false;

  /** must be called from a user gesture handler at least once */
  ensure(): AudioContext {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    }
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(ctx.destination);

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
    this.musicGain = ctx.createGain();
    this.musicIn.connect(this.lowpass).connect(this.wobbleDelay).connect(this.musicGain).connect(this.master);

    this.ambienceGain = ctx.createGain();
    this.ambienceGain.gain.value = 0.5;
    this.ambienceGain.connect(this.master);
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.master);
    return ctx;
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
   * pitch wow via a modulated delay, `boost` 0..1 brightens (overstimulation).
   */
  setPerception(muffle: number, wobble: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const f = 20000 * Math.pow(1 - Math.min(0.92, muffle), 2.2) + 350;
    this.lowpass.frequency.setTargetAtTime(Math.min(20000, f), now, 0.2);
    this.wobbleDepth.gain.setTargetAtTime(wobble * 0.004, now, 0.3);
    this.wobbleLfo.frequency.setTargetAtTime(0.2 + wobble * 0.4, now, 0.3);
  }
}
