import * as THREE from 'three';
import type { App } from '../core/App';
import { clamp, Rng, smoothstep } from '../core/rng';
import type { FrameContext, QualitySettings, System } from '../core/types';
import type { Cue, Section, SectionKind } from '../show/ShowTypes';
import { renderCrowdBank, type CrowdBank } from './ambience/CrowdBank';

/** centre of the main PA (music distance / direction reference) */
const STAGE_PA = new THREE.Vector3(0, 14, -4);
/** rough centre of the audience field (crowd direction when standing outside it) */
const CROWD_CENTER_X = 0;
const CROWD_CENTER_Z = 70;
/** parameter update rate (Hz): gains are smoothed, so 15 Hz is plenty */
const UPDATE_DT = 1 / 15;
/** a cue fires only if its start lies within this window of the current show time */
const CUE_WINDOW = 0.25;

/** how excited the crowd is per section kind (0..1) */
const EXCITEMENT: Record<SectionKind, number> = {
  intro: 0.3,
  orchestral: 0.35,
  breakdown: 0.4,
  build: 0.45,
  drop: 0.75,
  climax: 0.95,
  vocal: 0.5,
  anticlimax: 0.8,
  outro: 0.5,
  silence: 0.25,
};
const QUIET: Partial<Record<SectionKind, true>> = { silence: true, breakdown: true, intro: true, orchestral: true, outro: true };

/** A looping bank layer that only runs while audible (buffer sources cost CPU even when muted). */
class LoopLayer {
  private src: AudioBufferSourceNode | null = null;
  private quietFor = 0;
  buffer: AudioBuffer | null = null;
  level = 0;
  constructor(
    private ctx: AudioContext,
    readonly gain: GainNode,
    private rng: Rng,
    private rate = 1,
  ) {}
  set(level: number, dt: number, tau = 0.35): void {
    const now = this.ctx.currentTime;
    this.level = level;
    if (level > 0.002 && this.buffer && !this.src) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.buffer;
      s.loop = true;
      s.playbackRate.value = this.rate;
      s.connect(this.gain);
      s.start(now, this.rng.range(0, this.buffer.duration));
      this.src = s;
    }
    this.gain.gain.setTargetAtTime(level, now, tau);
    if (level <= 0.002) {
      this.quietFor += dt;
      if (this.src && this.quietFor > 4) this.stop();
    } else this.quietFor = 0;
  }
  get running(): boolean {
    return !!this.src;
  }
  stop(): void {
    if (!this.src) return;
    try {
      this.src.stop();
      this.src.disconnect();
    } catch {
      /* ignore */
    }
    this.src = null;
  }
}

/**
 * Festival ambience that makes the empty-grounds Endshow feel attended:
 *  - procedural crowd bed (formant-voice babble, two decorrelated loops) + granular close chatter
 *  - roar swells in builds (a pure function of show time -> seek-safe), roars / whistles on drops
 *    and on crowd cues, applause after big moments and at the end of the show
 *  - level / stereo width / direction from the listener position: loud and enveloping inside the
 *    dense crowd, quieter at the bars and the back, very quiet high up in free / fly-over cameras
 *  - warm night wind, generator hum near FOH / bars
 *  - drives AudioEngine.setMusicDistance / setMusicDirection (air absorption, level, image)
 * Cue triggering is seek-safe: only cues whose start lies within the last 0.25 s of show time
 * fire, and only while playing (a seek never replays a burst of past cheers).
 */
export class AmbienceSystem implements System {
  readonly name = 'ambience';
  private app!: App;
  private enabled = true;
  private lite = false;
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private crowdIn!: GainNode;
  private widthLL!: GainNode;
  private widthRR!: GainNode;
  private widthLR!: GainNode;
  private widthRL!: GainNode;
  private crowdPan!: StereoPannerNode;
  private cheerBus!: GainNode;
  private fxBus!: GainNode;
  private bedA!: LoopLayer;
  private bedB!: LoopLayer;
  private roar!: LoopLayer;
  private applause!: LoopLayer;
  private wind!: LoopLayer;
  private windLP!: BiquadFilterNode;
  private humGain!: GainNode;
  private humPan!: StereoPannerNode;
  private bank: Partial<CrowdBank> = {};
  private bankState: 'idle' | 'rendering' | 'ready' | 'failed' = 'idle';
  private rng = new Rng(4242);
  private acc = 0;
  private rev = -1;
  private crowdCursor = 0;
  private secCursor = 0;
  private wasPlaying = false;
  private applauseBoost = 0;
  private nextGrain = 0;
  private activeCheers = 0;
  private activeGrains = 0;
  private fired = 0;
  private barsT = -1;
  private readonly bars: THREE.Vector3[] = [];
  private readonly fwd = new THREE.Vector3();
  private readonly pos = new THREE.Vector3();
  private readonly foh = new THREE.Vector3(0, 0, 110);
  /** crowd cues of the current show revision (ShowEngine.all() allocates when there are none) */
  private crowdCues: readonly Cue[] = [];
  private rig: { mode?: unknown } | null | undefined = undefined;
  private crowdSys: { densityAt?: (x: number, z: number) => number } | null | undefined = undefined;
  private hum = { sum: 0, x: 0, z: 0 };
  /** current values (stats / debug) */
  private readonly st = { density: 0, crowd: 0, width: 0, musicDist: 0, height: 0, excitement: 0, mode: 'first' };

  init(app: App): void {
    this.app = app;
    this.lite = app.device.mobile;
    app.events.on('show:ended', () => this.onShowEnded());
    const foh = app.anchors.get('foh')[0];
    if (foh) this.foh.set(foh.x, 0, foh.z);
  }

  update(ctx: FrameContext): void {
    const actx = this.app.audio.ctx;
    if (!actx || !this.enabled) return;
    if (!this.out) this.build(actx);
    this.cues(ctx);
    this.acc += ctx.dt;
    if (this.acc < UPDATE_DT) return;
    const dt = this.acc;
    this.acc = 0;
    this.mix(ctx, dt);
  }

  setQuality(q: QualitySettings): void {
    this.lite = this.app.device.mobile || q.level === 'mobile';
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    const a = this.app?.audio;
    if (!a?.ctx || !this.out) return;
    this.out.gain.setTargetAtTime(on ? 1 : 0, a.ctx.currentTime, 0.3);
    if (!on) {
      a.setMusicDistance(40);
      a.setMusicDirection(0, 0);
      for (const l of [this.bedA, this.bedB, this.roar, this.applause, this.wind]) l.set(0, 10);
    }
  }

  stats(): Record<string, number | string> {
    const s = this.st;
    return {
      bank: this.bankState,
      mode: s.mode,
      density: s.density.toFixed(2),
      crowd: s.crowd.toFixed(2),
      width: s.width.toFixed(2),
      musicDist: s.musicDist.toFixed(0),
      musicDb: this.app?.audio.spatial.gainDb.toFixed(1) ?? '0',
      excitement: s.excitement.toFixed(2),
      fired: this.fired,
      grains: this.activeGrains,
    };
  }

  dispose(): void {
    for (const l of [this.bedA, this.bedB, this.roar, this.applause, this.wind]) l?.stop();
    try {
      this.out?.disconnect();
    } catch {
      /* ignore */
    }
  }

  // ------------------------------------------------------------------ graph

  private build(actx: AudioContext): void {
    this.ctx = actx;
    const g = (v: number) => {
      const n = actx.createGain();
      n.gain.value = v;
      return n;
    };
    const out = g(0);
    out.connect(this.app.audio.ambienceIn);
    out.gain.setTargetAtTime(1, actx.currentTime, 0.8);
    this.out = out;

    // crowd bus: stereo width (M/S style matrix) -> direction pan
    this.crowdIn = g(1);
    const split = actx.createChannelSplitter(2);
    const merge = actx.createChannelMerger(2);
    this.widthLL = g(1);
    this.widthRR = g(1);
    this.widthLR = g(0);
    this.widthRL = g(0);
    this.crowdIn.connect(split);
    split.connect(this.widthLL, 0).connect(merge, 0, 0);
    split.connect(this.widthRL, 0).connect(merge, 0, 1);
    split.connect(this.widthRR, 1).connect(merge, 0, 1);
    split.connect(this.widthLR, 1).connect(merge, 0, 0);
    this.crowdPan = actx.createStereoPanner();
    merge.connect(this.crowdPan).connect(out);

    const bedA = g(0),
      bedB = g(0),
      roar = g(0),
      applause = g(0);
    bedA.connect(this.crowdIn);
    // loop B plays channel-swapped and slightly slower: decorrelated from loop A
    const swapS = actx.createChannelSplitter(2);
    const swapM = actx.createChannelMerger(2);
    bedB.connect(swapS);
    swapS.connect(swapM, 0, 1);
    swapS.connect(swapM, 1, 0);
    swapM.connect(this.crowdIn);
    roar.connect(this.crowdIn);
    applause.connect(this.crowdIn);
    this.bedA = new LoopLayer(actx, bedA, this.rng, 1);
    this.bedB = new LoopLayer(actx, bedB, this.rng, 0.968);
    this.roar = new LoopLayer(actx, roar, this.rng, 1);
    this.applause = new LoopLayer(actx, applause, this.rng, 1);
    this.cheerBus = g(1);
    this.cheerBus.connect(this.crowdIn);
    this.fxBus = g(1);
    this.fxBus.connect(out);

    // warm night wind
    this.windLP = actx.createBiquadFilter();
    this.windLP.type = 'lowpass';
    this.windLP.frequency.value = 500;
    this.windLP.Q.value = 0.4;
    const windG = g(0);
    windG.connect(this.windLP).connect(out);
    this.wind = new LoopLayer(actx, windG, this.rng, 1);

    // generator hum (50 Hz mains-style harmonics + diesel rumble), positional
    const hum = actx.createOscillator();
    hum.frequency.value = 50;
    hum.setPeriodicWave(actx.createPeriodicWave(new Float32Array([0, 0.35, 1, 0.55, 0.4, 0.18, 0.1]), new Float32Array(7)));
    const humLP = actx.createBiquadFilter();
    humLP.type = 'lowpass';
    humLP.frequency.value = 420;
    this.humGain = g(0);
    this.humPan = actx.createStereoPanner();
    hum.connect(humLP).connect(this.humGain).connect(this.humPan).connect(out);
    hum.start();

    this.startBank();
  }

  private startBank(): void {
    if (this.bankState !== 'idle') return;
    this.bankState = 'rendering';
    renderCrowdBank({
      lite: this.lite,
      onItem: (name, value) => {
        (this.bank as Record<string, unknown>)[name] = value;
        if (name === 'murmur') {
          this.bedA.buffer = value as AudioBuffer;
          this.bedB.buffer = value as AudioBuffer;
        } else if (name === 'roar') this.roar.buffer = value as AudioBuffer;
        else if (name === 'applause') this.applause.buffer = value as AudioBuffer;
        else if (name === 'wind') this.wind.buffer = value as AudioBuffer;
      },
    })
      .then(() => (this.bankState = 'ready'))
      .catch((e) => {
        this.bankState = 'failed';
        console.warn('[ambience] crowd bank failed', e);
      });
  }

  // ------------------------------------------------------------------ show cues (seek-safe)

  private cues(ctx: FrameContext): void {
    const show = this.app.show;
    const t = ctx.showTime;
    if (show.revision !== this.rev) this.crowdCues = show.all('crowd');
    const crowd = this.crowdCues;
    const secs = show.tempo.sections;
    const jumped = ctx.seeked || ctx.showDt < -1e-4 || ctx.showDt > 0.5;
    if (show.revision !== this.rev || jumped || !ctx.showPlaying || !this.wasPlaying) {
      // resync: point at the first event AFTER now, never replay the past
      this.rev = show.revision;
      this.crowdCursor = firstAfter(crowd, t);
      this.secCursor = firstSectionAfter(secs, t);
      this.wasPlaying = ctx.showPlaying;
      return;
    }
    while (this.crowdCursor < crowd.length && crowd[this.crowdCursor].t <= t) {
      const c = crowd[this.crowdCursor++];
      if (t - c.t <= CUE_WINDOW) this.onCrowdCue(c);
    }
    while (this.secCursor < secs.length && secs[this.secCursor].start <= t) {
      const i = this.secCursor++;
      if (t - secs[i].start <= CUE_WINDOW) this.onSection(secs[i], i > 0 ? secs[i - 1] : null);
    }
  }

  private onCrowdCue(c: Cue): void {
    const k = typeof c.p.intensity === 'number' ? clamp(c.p.intensity, 0, 1.5) : 1;
    if (c.fx === 'cheer') this.cheer(0.85 * k, 2);
    else if (c.fx === 'mood') {
      const s = c.p.state;
      if (s === 'cheer') this.cheer(0.8 * k, 1);
      else if (s === 'jump') this.cheer(0.55 * k, 1);
      else if (s === 'handsup') this.cheer(0.45 * k, 0);
    }
  }

  private onSection(sec: Section, prev: Section | null): void {
    if (sec.kind === 'drop' || sec.kind === 'climax') this.cheer(0.75 + 0.25 * sec.energy, sec.kind === 'climax' ? 3 : 2);
    else if (sec.kind === 'anticlimax') this.cheer(0.55, 1);
    else if (sec.kind === 'silence' && prev && prev.energy >= 0.65) this.cheer(0.6, 1);
  }

  private onShowEnded(): void {
    if (!this.out) return;
    this.cheer(1, 3);
    this.applauseBoost = 1;
  }

  // ------------------------------------------------------------------ one-shots

  /** big crowd reaction + `whistles` whistles scattered over the next seconds */
  private cheer(intensity: number, whistles: number): void {
    const actx = this.ctx;
    const cheers = this.bank.cheers;
    if (!actx || !cheers?.length || !this.enabled) return;
    this.fired++;
    if (this.activeCheers < 3) {
      const src = actx.createBufferSource();
      src.buffer = cheers[this.rng.int(0, cheers.length - 1)];
      src.playbackRate.value = this.rng.range(0.95, 1.05);
      const g = actx.createGain();
      g.gain.value = clamp(intensity, 0, 1.2) * 1.05;
      src.connect(g).connect(this.cheerBus);
      src.start(actx.currentTime + this.rng.range(0.03, 0.12));
      this.activeCheers++;
      src.onended = () => {
        this.activeCheers--;
        g.disconnect();
      };
    }
    for (let i = 0; i < whistles; i++) this.whistle(0.3 + 0.4 * intensity, this.rng.range(0.2, 2.5));
  }

  private whistle(level: number, delay = 0): void {
    const actx = this.ctx;
    const ws = this.bank.whistles;
    if (!actx || !ws?.length) return;
    const src = actx.createBufferSource();
    src.buffer = ws[this.rng.int(0, ws.length - 1)];
    src.playbackRate.value = this.rng.range(0.92, 1.08);
    const g = actx.createGain();
    // distance of the whistler: mostly a few metres to tens of metres away
    const dist = this.rng.range(3, 35);
    g.gain.value = level * this.st.crowd * (1 / (1 + dist / 8)) * 1.6;
    const p = actx.createStereoPanner();
    p.pan.value = this.rng.range(-0.9, 0.9);
    src.connect(g).connect(p).connect(this.fxBus);
    src.start(actx.currentTime + delay);
    src.onended = () => p.disconnect();
  }

  /** granular close chatter: a slice of the babble bed, panned around the listener */
  private grain(level: number): void {
    const actx = this.ctx;
    const buf = this.bank.murmur;
    if (!actx || !buf || this.activeGrains >= (this.lite ? 2 : 4)) return;
    const dur = this.rng.range(0.7, 2);
    const off = this.rng.range(0, buf.duration - dur - 0.05);
    const src = actx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = this.rng.range(0.9, 1.1);
    const g = actx.createGain();
    const now = actx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(level, now + 0.12);
    g.gain.setValueAtTime(level, now + dur - 0.2);
    g.gain.linearRampToValueAtTime(0, now + dur);
    const p = actx.createStereoPanner();
    p.pan.value = this.rng.range(-1, 1);
    src.connect(g).connect(p).connect(this.fxBus);
    src.start(now, off, dur);
    this.activeGrains++;
    src.onended = () => {
      this.activeGrains--;
      p.disconnect();
    };
  }

  // ------------------------------------------------------------------ mix (15 Hz)

  private mix(ctx: FrameContext, dt: number): void {
    const app = this.app;
    const audio = app.audio;
    const actx = this.ctx!;
    const now = actx.currentTime;
    if (this.rig === undefined) this.rig = (app.get('camera') as unknown as { mode?: unknown } | undefined) ?? null;
    const mode = typeof this.rig?.mode === 'string' ? this.rig.mode : 'first';
    const onFoot = mode === 'first' || mode === 'third';
    const cinematic = mode === 'flyover' || mode === 'showcam';
    const cam = app.camera;
    if (onFoot) this.pos.set(app.playerPos.x, app.playerPos.y + 1.7, app.playerPos.z);
    else this.pos.copy(cam.position);
    const h = Math.max(0, this.pos.y - (onFoot ? app.playerPos.y : 0));
    cam.getWorldDirection(this.fwd);
    let fx = this.fwd.x,
      fz = this.fwd.z;
    const fl = Math.hypot(fx, fz) || 1;
    fx /= fl;
    fz /= fl;
    // right vector of a listener facing (fx, fz): (-fz, fx)
    const rx = -fz,
      rz = fx;

    // --- position -> crowd presence
    this.refreshBars(ctx.time);
    const d = this.densityAt(this.pos.x, this.pos.z);
    const heightF = 1 - 0.92 * smoothstep(4, 30, h);
    const crowd = heightF * (0.28 + 0.72 * d);
    const width = clamp(0.3 + 0.7 * d, 0, 1);
    let cx = CROWD_CENTER_X - this.pos.x,
      cz = CROWD_CENTER_Z - this.pos.z;
    const cl = Math.hypot(cx, cz) || 1;
    cx /= cl;
    cz /= cl;
    const crowdPan = (cx * rx + cz * rz) * (1 - d) * 0.7 * smoothstep(5, 30, cl);
    const s = this.st;
    s.density = d;
    s.crowd = crowd;
    s.width = width;
    s.height = h;
    s.mode = mode;

    // --- show state -> excitement, swells
    const playing = ctx.showPlaying;
    const t = ctx.showTime;
    const sec = app.show.section(t);
    const inSec = !!sec && t >= sec.start && t < sec.end;
    const kind: SectionKind = inSec ? sec!.kind : 'silence';
    const energy = inSec ? sec!.energy : 0;
    const progress = inSec ? clamp((t - sec!.start) / Math.max(0.01, sec!.end - sec!.start), 0, 1) : 0;
    const excitement = playing ? (kind === 'build' ? 0.4 + 0.55 * progress * progress : EXCITEMENT[kind]) : 0.2;
    s.excitement = excitement;
    const quiet = !playing || !!QUIET[kind];
    // roar bed: builds swell with progress (pure function of show time -> seek-safe)
    let roar = 0;
    if (playing) {
      if (kind === 'build') roar = energy * progress * progress * 0.9;
      else if (kind === 'climax') roar = 0.32;
      else if (kind === 'drop' || kind === 'anticlimax') roar = 0.2 + 0.1 * energy;
      else if (kind === 'vocal') roar = 0.1;
      // right after a drop starts the one-shot roar takes over; keep the bed low for 2 s
      if (inSec && isDrop(kind) && t - sec!.start < 2) roar *= 0.4;
    }
    // applause after big moments (silence following an energetic section) + end of show
    let applause = 0;
    if (playing && inSec && kind === 'silence') {
      const secs = app.show.tempo.sections;
      const i = secs.indexOf(sec!);
      const prev = i > 0 ? secs[i - 1] : null;
      if (prev && prev.energy >= 0.6) applause = 0.75 * Math.exp(-(t - sec!.start) / 5);
    }
    this.applauseBoost *= Math.exp(-dt / 7);
    applause = Math.max(applause, this.applauseBoost * 0.9);

    // --- apply crowd layers
    const bed = (quiet ? 0.62 : 0.42) * crowd;
    this.bedA.set(bed * 0.55, dt);
    this.bedB.set(bed * 0.45, dt);
    const cheerLevel = heightF * (0.45 + 0.55 * d);
    this.roar.set(roar * cheerLevel * 0.8, dt, 0.5);
    this.applause.set(applause * cheerLevel * 0.9, dt, 0.4);
    this.cheerBus.gain.setTargetAtTime(cheerLevel, now, 0.3);
    const a = (1 + width) / 2,
      b = (1 - width) / 2;
    this.widthLL.gain.setTargetAtTime(a, now, 0.3);
    this.widthRR.gain.setTargetAtTime(a, now, 0.3);
    this.widthLR.gain.setTargetAtTime(b, now, 0.3);
    this.widthRL.gain.setTargetAtTime(b, now, 0.3);
    this.crowdPan.pan.setTargetAtTime(clamp(crowdPan, -1, 1), now, 0.25);

    // --- wind: gentle warm gusts, stronger high up
    const tt = ctx.time;
    const gust = clamp(0.55 + 0.25 * Math.sin(tt * 0.13) + 0.2 * Math.sin(tt * 0.37 + 1.3) + 0.1 * Math.sin(tt * 1.1), 0.2, 1);
    const wind = (0.05 + 0.22 * smoothstep(3, 80, h) + (cinematic ? 0.04 : 0)) * gust;
    this.wind.set(wind, dt, 0.6);
    this.windLP.frequency.setTargetAtTime(320 + 520 * gust + 400 * smoothstep(10, 80, h), now, 0.5);

    // --- generator hum near FOH / bars
    const hs = this.hum;
    hs.sum = hs.x = hs.z = 0;
    this.addHum(this.foh.x + 9, this.foh.z + 10, 0.05, h);
    for (let i = 0; i < this.bars.length; i++) this.addHum(this.bars[i].x, this.bars[i].z, 0.035, h);
    const hum = Math.min(0.06, hs.sum);
    this.humGain.gain.setTargetAtTime(hum * (1 + 0.05 * Math.sin(tt * 0.7)), now, 0.4);
    const hl = Math.hypot(hs.x, hs.z) || 1;
    this.humPan.pan.setTargetAtTime(clamp(((hs.x / hl) * rx + (hs.z / hl) * rz) * 0.8, -1, 1), now, 0.3);

    // --- music distance / direction
    if (cinematic) {
      audio.setMusicDistance(45);
      audio.setMusicDirection(0, 0);
      s.musicDist = 45;
    } else {
      const dx = STAGE_PA.x - this.pos.x,
        dz = STAGE_PA.z - this.pos.z;
      const horiz = Math.hypot(dx, dz);
      const dist = Math.hypot(horiz, STAGE_PA.y - this.pos.y);
      audio.setMusicDistance(dist);
      const sx = dx / (horiz || 1),
        sz = dz / (horiz || 1);
      // the PA spans ~60 m: close to the stage there is no single direction
      const spread = smoothstep(12, 45, horiz);
      audio.setMusicDirection((sx * rx + sz * rz) * spread, Math.max(0, -(sx * fx + sz * fz)) * spread);
      s.musicDist = dist;
    }

    // --- close chatter grains (quiet moments inside the crowd)
    if (this.bank.murmur && d > 0.25 && h < 6 && quiet && tt >= this.nextGrain) {
      this.grain(0.18 + 0.3 * d * heightF);
      const rate = (this.lite ? 0.6 : 1.2) * d;
      this.nextGrain = tt + -Math.log(1 - this.rng.next() * 0.999) / Math.max(0.05, rate);
    }
    // --- spontaneous whistles when the crowd is hyped
    if (playing && excitement > 0.55 && this.bank.whistles && this.rng.next() < dt * 0.22 * excitement * (0.3 + 0.7 * d)) this.whistle(0.35 + 0.3 * excitement);
  }

  // ------------------------------------------------------------------ world model

  /** accumulate one generator's hum level + direction (listener at this.pos, height h) */
  private addHum(x: number, z: number, amp: number, h: number): void {
    const dx = x - this.pos.x,
      dz = z - this.pos.z;
    const dist = Math.hypot(dx, dz, h * 0.8);
    const l = amp / (1 + (dist / 9) ** 2);
    this.hum.sum += l;
    this.hum.x += (dx / (dist || 1)) * l;
    this.hum.z += (dz / (dist || 1)) * l;
  }

  /** 0..1 crowd density at a ground position (crowd system if it exposes densityAt, else layout model) */
  private densityAt(x: number, z: number): number {
    if (this.crowdSys === undefined) this.crowdSys = (this.app.get('crowd') as unknown as { densityAt?: (x: number, z: number) => number } | undefined) ?? null;
    const crowdSys = this.crowdSys;
    let d: number | null = null;
    if (crowdSys && typeof crowdSys.densityAt === 'function') {
      try {
        const v = crowdSys.densityAt(x, z);
        if (Number.isFinite(v)) d = clamp(v, 0, 1);
      } catch {
        /* fall back */
      }
    }
    if (d === null) {
      // design-bible layout: packed in front of the stage, thinning towards the back and sides
      const front = smoothstep(2, 10, z) * (1 - 0.55 * smoothstep(35, 190, z)) * (1 - smoothstep(215, 265, z));
      const w = 58 + 0.28 * Math.max(0, z);
      d = front * (1 - smoothstep(0.6 * w, w, Math.abs(x)));
    }
    // quieter at the bars (people queue and talk, no dense dancing crowd)
    let bar = 0;
    for (let i = 0; i < this.bars.length; i++) bar = Math.max(bar, 1 - smoothstep(6, 28, Math.hypot(this.bars[i].x - x, this.bars[i].z - z)));
    return clamp(d * (1 - 0.6 * bar), 0, 1);
  }

  private refreshBars(time: number): void {
    if (this.barsT >= 0 && time - this.barsT < 2) return;
    this.barsT = time;
    this.bars.length = 0;
    for (const it of this.app.interactables) {
      if (/bar|drink|beer|tap/i.test(`${it.id} ${it.label}`)) this.bars.push(it.position);
    }
  }
}

function isDrop(k: SectionKind): boolean {
  return k === 'drop' || k === 'climax' || k === 'anticlimax';
}

/** index of the first cue with t > time (cues sorted by t) */
function firstAfter(cues: readonly Cue[], time: number): number {
  let lo = 0,
    hi = cues.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].t <= time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function firstSectionAfter(secs: readonly Section[], time: number): number {
  let lo = 0,
    hi = secs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (secs[mid].start <= time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
