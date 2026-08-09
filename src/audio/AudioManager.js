// ============================================================
// Super Kart 3D.js — AudioManager
// Thin manager over the pure synthesis in sfx.js / music.js:
//   - Lazy AudioContext (autoplay policy) created on init(), which
//     runs on the first user gesture (also auto-attached).
//   - Master chain: volume gain (CONFIG.audio.masterVolume) →
//     DynamicsCompressor (threshold -14, knee 18, ratio 5) →
//     destination.
//   - One-shot SFX via renderSfx(), procedural music via MusicEngine,
//     continuous per-kart engine loops.
//
// Contract (ARCHITECTURE.md):
//   new AudioManager()
//   init()                      — first user gesture; builds ctx + master
//   play(name, opts)            — one-shot SFX; safe no-op before init
//   startMusic()/stopMusic()/nextTrack()
//   setEngineLoop(kartId, speed01, pose?) — continuous engine per kart;
//                                 pose {x,z,heading?} enables StereoPanner
//                                 pan + distance rolloff vs the listener;
//                                 remembered and applied on init
//   setListenerPose({x,y,z,heading}) — camera/listener for positional audio
//   crowdCheer(intensity), setCrowdProximity(0..1) — crowd ambience
//   setMasterVolume(v), setMusicVolume(v)
// All calls before init() are safe (no-op or remembered).
// ============================================================

import { CONFIG } from '../config.js';
import { renderSfx, engineGear } from './sfx.js';
import { MusicEngine } from './music.js';

const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class AudioManager {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._volume = CONFIG.audio.masterVolume;
    this._musicVolume = CONFIG.audio.musicVolume;
    this._engineVolume = CONFIG.audio.engineVolume;

    this._music = null;
    this._musicRequested = false;
    this._engineLoops = new Map();    // kartId -> loop node graph
    this._pendingEngine = new Map();  // kartId -> { speed01, pose } (pre-init)

    this._listener = null;            // { x, y, z, heading } — camera/listener
    this._crowd = null;               // crowd ambience graph
    this._crowdProximity = 0;         // 0..1 grandstand proximity (wash boost)
    this._lastCheerAt = 0;            // crowdCheer cooldown timestamp (ms)

    this._unlock = () => this.init();
    this._attachUnlock();
  }

  /* ---------------- Context + master chain ---------------- */

  /**
   * Creates the AudioContext and master chain. Called on the first
   * user gesture (autoplay policy); idempotent. Applies engine loops
   * and music requests that arrived before init.
   *
   * Master chain (USER/VISION FIX — was gain→compressor→destination,
   * which sounded dry and "8-bit"):
   *   master gain → EQ (hp 28 / presence 3k / hshelf 11k) → waveshaper
   *   (soft tanh saturation for warmth) → compressor → destination
   *   with a subtle CONVOLUTION REVERB send (procedural IR) so SFX and
   *   music share a believable space instead of playing bone-dry.
   * @returns {AudioContext|null}
   */
  init() {
    if (this._ctx) {
      this._resume();
      return this._ctx;
    }
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      console.warn('[AudioManager] WebAudio is not available in this browser.');
      return null;
    }
    this._ctx = new Ctx();
    this._master = this._ctx.createGain();
    this._master.gain.value = this._volume;

    // --- EQ (subtractive + presence) ------------------------------------
    const eq = this._ctx.createBiquadFilter();
    eq.type = 'highpass';
    eq.frequency.value = 28; // kill sub rumble below audibility
    const presence = this._ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 3200;
    presence.Q.value = 0.8;
    presence.gain.value = 1.5; // presence — arcade punch
    const hshelf = this._ctx.createBiquadFilter();
    hshelf.type = 'highshelf';
    hshelf.frequency.value = 11000;
    hshelf.gain.value = -2; // tame harsh digital highs

    // --- Waveshaper (soft saturation — analog warmth, kills the raw-osc
    // "8-bit" edge) --------------------------------------------------------
    const shaper = this._ctx.createWaveShaper();
    shaper.curve = this._softClipCurve(220);

    const comp = this._ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 5;
    comp.attack.value = 0.002;
    comp.release.value = 0.18;

    this._master.connect(eq);
    eq.connect(presence);
    presence.connect(hshelf);
    hshelf.connect(shaper);
    shaper.connect(comp);
    comp.connect(this._ctx.destination);

    // --- Reverb send (procedural IR — generated, no assets) --------------
    this._reverb = this._createReverb(this._ctx);
    const reverbSend = this._ctx.createGain();
    reverbSend.gain.value = 0.14;
    const reverbWet = this._ctx.createGain();
    reverbWet.gain.value = 0.9;
    this._master.connect(reverbSend);
    reverbSend.connect(this._reverb);
    this._reverb.connect(reverbWet);
    reverbWet.connect(presence); // wet returns before the shaper/compressor
    this._reverbSend = reverbSend;

    // Apply engine loops remembered before init().
    for (const [kartId, pending] of this._pendingEngine) {
      this.setEngineLoop(kartId, pending.speed01, pending.pose);
    }
    this._pendingEngine.clear();

    // Start music if it was requested before init().
    if (this._musicRequested) this.startMusic();

    this._resume();
    return this._ctx;
  }

  /** Soft tanh-ish clip curve for the master waveshaper (warm saturation). */
  _softClipCurve(n = 220) {
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(1.6 * x);
    }
    return curve;
  }

  /** Procedural impulse response: decaying noise burst (2s), stereo-ish. */
  _createReverb(ctx) {
    const len = Math.floor(ctx.sampleRate * 2.0);
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        // exponentially decaying noise; slight lowpass smoothing per sample
        const white = Math.random() * 2 - 1;
        last = last * 0.6 + white * 0.4;
        data[i] = last * Math.pow(1 - i / len, 2.2) * (ch === 1 ? 1.0 : 0.9);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buffer;
    return conv;
  }

  _resume() {
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
  }

  /** Pause the whole AudioContext (tab hidden). Quality gate: audio lifecycle. */
  suspend() {
    if (this._ctx && this._ctx.state === 'running') {
      this._ctx.suspend().catch(() => {});
    }
  }

  /** Resume the AudioContext after the tab becomes visible again. */
  resume() {
    this._resume();
  }

  _attachUnlock() {
    if (typeof window === 'undefined') return;
    for (const evt of GESTURE_EVENTS) {
      window.addEventListener(evt, this._unlock, { capture: true, passive: true });
    }
  }

  _detachUnlock() {
    if (typeof window === 'undefined') return;
    for (const evt of GESTURE_EVENTS) {
      window.removeEventListener(evt, this._unlock, { capture: true });
    }
  }

  /* ---------------- One-shot SFX ---------------- */

  /**
   * Plays a synthesized SFX (recipe in sfx.js). Safe no-op before
   * init() — the engine/UI may call this on any frame.
   * @param {string} name SFX name (see sfx.js).
   * @param {Object} [opts] { volume=1, rate=1, pan=0, delay=0, ... } —
   *   extra recipe opts (intensity, speed01, dur) are forwarded.
   */
  play(name, opts = {}) {
    if (!this._ctx || !this._master) return;
    const { volume = 1, rate = 1, pan = 0, delay = 0 } = opts;
    const resolved = this._resolveSfxName(name, { volume, rate, pan, delay });
    renderSfx(this._ctx, this._master, resolved.name, {
      ...opts,
      volume,
      rate,
      pan,
      at: this._ctx.currentTime + Math.max(0, delay),
    });
    this._hookCrowd(resolved.name);
  }

  /**
   * Context-aware SFX name resolution (audit r2, dedupe). main.js still
   * announces FINAL LAP as play('posUp', { volume: 0.7 }) — the overtake
   * blip is posUp @0.5, so the 0.7 call is uniquely the final-lap
   * announcement. Route it to the dedicated 'finalLap' jingle so the last
   * lap stops reusing the overtake sound. Once main.js is renamed to
   * play('finalLap'), this alias becomes dead code and can be removed.
   */
  _resolveSfxName(name, { volume = 1 } = {}) {
    if (name === 'posUp' && volume > 0.6) return { name: 'finalLap' };
    return { name };
  }

  /**
   * Crowd ambience hooks — fire automatically off the existing play()
   * call sites (no main.js wiring needed for these):
   *   countdown/go → stadium wakes up (crowd wash swells in)
   *   posUp / finalLap → small cheer (overtake, or the final lap)
   *   finish / victory → big cheer
   */
  _hookCrowd(name) {
    if (!this._ctx) return;
    if (name === 'countdown' || name === 'go') {
      this._startCrowd();
    } else if (name === 'posUp' || name === 'finalLap') {
      this.crowdCheer(0.35);
    } else if (name === 'finish' || name === 'victory') {
      this.crowdCheer(1);
    }
  }

  /* ---------------- Music ---------------- */

  /** Starts the procedural racing playlist. */
  startMusic() {
    this._musicRequested = true;
    if (!this._ctx || !this._master) return; // starts on init()
    if (this._music) return;                 // already running
    this._music = new MusicEngine(this._ctx, {
      output: this._master,
      volume: this._musicVolume,
      onEnded: () => {}, // the engine advances the playlist itself
    });
    this._music.start();
    this.play('musicIntro', { volume: 0.8 });
  }

  /** Stops the music (fast fade out). */
  stopMusic() {
    this._musicRequested = false;
    if (this._music) {
      this._music.stop();
      this._music = null;
    }
  }

  /** Skips to the next track in the playlist. */
  nextTrack() {
    if (this._music) this._music.next();
  }

  /** Name of the currently playing track (or null). */
  get currentTrack() {
    return this._music ? this._music.currentTrack : null;
  }

  /* ---------------- Continuous engine loops ---------------- */

  /**
   * Creates or updates a continuous engine sound for a kart.
   * Oscillator pair: sawtooth base + square octave, pitch mapped from
   * the piecewise GEAR MAP (audit r2 — upshift pitch drops + throttle
   * load), through a lowpass, into a gain scaled by
   * CONFIG.audio.engineVolume. Updates are smoothed with setTargetAtTime
   * (no zipper noise). Positional audio (audit r2): each loop carries a
   * StereoPannerNode + distance gain updated every call from the
   * listener's bearing — pass `pose` {x, z, heading?} and feed the
   * camera/player via setListenerPose (or the 'player' loop's own pose).
   * @param {string} kartId
   * @param {number} speed01 0..1 normalized speed.
   * @param {Object} [pose] { x, z, heading? } kart world position (y unused).
   */
  setEngineLoop(kartId, speed01, pose = null) {
    const s = Math.max(0, Math.min(1, speed01));
    if (!this._ctx || !this._master) {
      // Remember and apply on init().
      this._pendingEngine.set(kartId, { speed01: s, pose });
      return;
    }
    if (kartId === 'player' && pose) {
      // Chase camera sits behind the player kart looking along its
      // heading — the player pose IS a good listener proxy. A caller may
      // still override with the real camera pose via setListenerPose().
      this._listener = {
        x: pose.x ?? 0,
        y: pose.y ?? 0,
        z: pose.z ?? 0,
        heading: pose.heading ?? 0,
      };
    }
    const existing = this._engineLoops.get(kartId);
    if (existing) {
      this._updateEngineLoop(existing, s, pose, kartId);
    } else {
      this._engineLoops.set(kartId, this._createEngineLoop(s, pose));
    }
  }

  /**
   * Sets the listening position for positional audio: the camera (or the
   * player kart as a proxy). `heading` is the camera yaw in radians —
   * forward = (sin heading, 0, cos heading), matching kart heading.
   * @param {{x:number, y?:number, z:number, heading?:number}} pose
   */
  setListenerPose({ x = 0, y = 0, z = 0, heading = 0 } = {}) {
    this._listener = { x, y, z, heading };
  }

  /** Stops and removes one kart's engine loop. */
  removeEngineLoop(kartId) {
    this._pendingEngine.delete(kartId);
    const loop = this._engineLoops.get(kartId);
    if (loop) {
      try {
        loop.base.stop();
        loop.oct.stop();
        loop.sub?.stop();
        loop.lfo.stop();
        loop.noise?.stop();
      } catch { /* already stopped */ }
      loop.base.disconnect();
      loop.oct.disconnect();
      loop.sub?.disconnect();
      loop.flt.disconnect();
      loop.shaper?.disconnect();
      loop.gain.disconnect();
      loop.noise?.disconnect();
      loop.nBand?.disconnect();
      loop.distGain?.disconnect();
      loop.panner?.disconnect();
      this._engineLoops.delete(kartId);
    }
  }

  /** Stops every engine loop + the crowd wash (race restart / teardown). */
  clearEngineLoops() {
    for (const kartId of [...this._engineLoops.keys()]) {
      this.removeEngineLoop(kartId);
    }
    this._pendingEngine.clear();
    this._stopCrowd();
  }

  _createEngineLoop(speed01, pose = null) {
    const ctx = this._ctx;
    const base = ctx.createOscillator();
    base.type = 'sawtooth';
    const oct = ctx.createOscillator();
    oct.type = 'square';
    // Sub oscillator: sine one octave BELOW the base — gives the motor
    // physical low-end body (USER/VISION FIX: the old 2-osc engine was a
    // thin synth buzz; a sub + saturation reads as a real combustion engine).
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 1.2;
    // Soft saturation on the motor voice (waveshaper — analog warmth).
    const shaper = ctx.createWaveShaper();
    shaper.curve = this._softClipCurve(160);
    const gain = ctx.createGain();
    // Combustion noise: white noise through a bandpass in the motor band.
    const noise = ctx.createBufferSource();
    noise.buffer = this._noiseBuffer();
    noise.loop = true;
    const nBand = ctx.createBiquadFilter();
    nBand.type = 'bandpass';
    nBand.Q.value = 0.7;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.06; // subtle — makes it sound like an engine, not a synth
    noise.connect(nBand);
    nBand.connect(nGain);
    nGain.connect(gain);
    // Small detune LFO for engine roughness.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 22;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 3; // cents of detune wobble (scaled by load below)
    lfo.connect(lfoGain);
    lfoGain.connect(base.detune);
    base.connect(flt);
    oct.connect(flt);
    sub.connect(flt);
    flt.connect(shaper);
    shaper.connect(gain);
    // --- Positional stage (audit r2): distance gain + StereoPanner. ---
    // Every engine voice funnels through this so AI karts pan left/right
    // and roll off with distance from the listener. When no pose/listener
    // is known the values stay 0 / 1 — legacy centered full-volume sound.
    const distGain = ctx.createGain();
    distGain.gain.value = 1;
    let panner = null;
    if (typeof ctx.createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.value = 0;
      gain.connect(panner);
      panner.connect(distGain);
    } else {
      gain.connect(distGain); // no panner support — distance only
    }
    distGain.connect(this._master);
    base.start();
    oct.start();
    sub.start();
    noise.start();
    lfo.start();
    const loop = { base, oct, sub, flt, shaper, gain, lfo, lfoGain, noise, nBand, distGain, panner, pose, speed01: 0 };
    this._updateEngineLoop(loop, speed01, pose);
    return loop;
  }

  _noiseBuffer() {
    if (this._noiseBuf) return this._noiseBuf;
    const ctx = this._ctx;
    const len = ctx.sampleRate * 1.0;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
      sum += data[i];
    }
    const mean = sum / len;
    for (let i = 0; i < len; i++) data[i] -= mean; // DC block
    this._noiseBuf = buf;
    return buf;
  }

  _updateEngineLoop(loop, speed01, pose = null, kartId = null) {
    const t = this._ctx.currentTime;
    const tc = 0.06; // smooth updates, no zipper noise
    // Piecewise gear map (audit r2): RPM climbs within a gear and DROPS on
    // upshift; `load` (throttle proxy) drives volume + detune roughness,
    // `lug` (strain right after a shift) muffles the top end.
    const { rpm, local, load, ratio } = engineGear(speed01);
    const lug = (1 - local) * load;
    loop.base.frequency.setTargetAtTime(rpm, t, tc);
    loop.oct.frequency.setTargetAtTime(rpm * 2.02, t, tc);
    loop.sub.frequency.setTargetAtTime(rpm * 0.5, t, tc);
    loop.flt.frequency.setTargetAtTime(300 + ratio * 1500 - lug * 250, t, tc);
    loop.nBand.frequency.setTargetAtTime(220 + ratio * 900, t, tc);
    loop.gain.gain.setTargetAtTime(this._engineVolume * (0.28 + 0.64 * (0.7 * load + 0.3 * local)), t, tc);
    loop.lfoGain.gain.setTargetAtTime(3 + load * 4, t, tc); // roughness grows with throttle
    loop.speed01 = speed01;
    if (pose) loop.pose = pose;
    this._updateSpatial(loop, t);
  }

  /**
   * Per-frame positional update (audit r2): pans the engine left/right by
   * the kart's bearing from the listener (camera) and rolls the gain off
   * with distance. Listener convention: forward = (sin heading, 0, cos
   * heading), right = (cos heading, 0, -sin heading) — matches the game's
   * kart heading (main.js builds forward as (sin h, 0, cos h)).
   */
  _updateSpatial(loop, t) {
    const tc = 0.05;
    const pose = loop.pose;
    const L = this._listener;
    if (!pose || !L) {
      // No spatial data: centered, full distance (legacy behavior).
      if (loop.panner) loop.panner.pan.setTargetAtTime(0, t, tc);
      loop.distGain.gain.setTargetAtTime(1, t, tc);
      return;
    }
    const dx = pose.x - L.x;
    const dz = pose.z - L.z;
    const dist = Math.hypot(dx, dz);
    const yaw = L.heading ?? 0;
    const lateral = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    const depth = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const MAX_PAN = 16;   // units for full-left/full-right
    const pan = clamp(lateral / MAX_PAN, -1, 1);
    const REF = 12;       // distance rolloff reference (gain 0.5 at 12u)
    const gain = clamp(REF / (REF + dist), 0.22, 1) * (depth < -8 ? 0.8 : 1);
    if (loop.panner) loop.panner.pan.setTargetAtTime(pan, t, tc);
    loop.distGain.gain.setTargetAtTime(gain, t, tc);
  }

  /* ---------------- Crowd ambience (audit r2) ---------------- */

  /**
   * Continuous crowd wash: looped noise through two bandpass layers
   * (620Hz murmur body + 2100Hz sibilance) at low volume, with a slow LFO
   * wandering the murmur center so it reads as a live crowd, not static
   * hiss. Auto-started by play('countdown'|'go') and faded out by
   * clearEngineLoops() (race restart / menu).
   */
  _startCrowd() {
    if (!this._ctx || !this._master) return;
    if (!this._crowd) this._createCrowd();
    const t = this._ctx.currentTime;
    this._crowd.gain.gain.cancelScheduledValues(t);
    this._crowd.gain.gain.setTargetAtTime(this._crowdLevel(), t, 1.2); // slow swell in
  }

  _stopCrowd() {
    if (this._crowd && this._ctx) {
      const t = this._ctx.currentTime;
      this._crowd.gain.gain.cancelScheduledValues(t);
      this._crowd.gain.gain.setTargetAtTime(0.0001, t, 0.8);
    }
  }

  _createCrowd() {
    const ctx = this._ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    // Murmur body — the classic stadium "shhh".
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 620;
    bp.Q.value = 0.5;
    // Slow wander LFO on the murmur center (a crowd shifts, it never sits).
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 130;
    lfo.connect(lfoG);
    lfoG.connect(bp.frequency);
    // Raised-voice sibilance layer, quieter and higher.
    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.value = 2100;
    bp2.Q.value = 1.4;
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(bp);
    src.connect(bp2);
    bp.connect(gain);
    bp2.connect(g2);
    g2.connect(gain);
    gain.connect(this._master);
    src.start();
    lfo.start();
    this._crowd = { src, bp, bp2, gain, lfo };
  }

  /** Wash level: baseline murmur + proximity boost (both subtle). */
  _crowdLevel() {
    return 0.045 + this._crowdProximity * 0.05;
  }

  /**
   * Grandstand proximity (0..1) — feed per frame from the player's
   * distance to the nearest grandstand (main.js side). Closer → louder
   * wash, and a cheer fires when the player pulls up close.
   * @param {number} p01 0..1 proximity.
   */
  setCrowdProximity(p01) {
    const p = Math.max(0, Math.min(1, p01));
    this._crowdProximity = p;
    if (this._crowd && this._ctx) {
      this._crowd.gain.gain.setTargetAtTime(this._crowdLevel(), this._ctx.currentTime, 0.3);
    }
    if (p > 0.7 && this._ctx) this.crowdCheer(0.5 + p * 0.4, 2600);
  }

  /**
   * One-shot crowd cheer burst (sfx 'cheer'), cooldown-gated so rapid
   * overtake chains don't fire overlapping roars. Also briefly swells the
   * wash gain. Safe before init (no-op).
   * @param {number} [intensity] 0..1 (default 0.5).
   * @param {number} [minGapMs] cooldown between bursts (default 1200).
   */
  crowdCheer(intensity = 0.5, minGapMs = 1200) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this._lastCheerAt < minGapMs) return;
    this._lastCheerAt = now;
    this.play('cheer', { volume: 0.9, intensity: Math.max(0.05, Math.min(1, intensity)) });
    if (this._crowd && this._ctx) this._swellCrowd(intensity);
  }

  /** Temporary wash bump under a cheer, then settle back. */
  _swellCrowd(intensity) {
    const g = this._crowd.gain.gain;
    const t = this._ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(this._crowdLevel() + intensity * 0.05, t, 0.1);
    g.setTargetAtTime(this._crowdLevel(), t + 1.6, 0.5);
  }

  /* ---------------- Volume ---------------- */

  /** Sets the master volume (0..1), smoothed to avoid clicks. */
  setMasterVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._ctx && this._master) {
      this._master.gain.setTargetAtTime(this._volume, this._ctx.currentTime, 0.02);
    }
  }

  /** Mute toggle (pause overlay Sound button). Restores the last volume. */
  toggleMute() {
    if (this._muted) this.setMuted(false);
    else this.setMuted(true);
  }

  setMuted(m) {
    this._muted = !!m;
    if (!this._ctx || !this._master) return;
    if (this._muted) {
      this._master.gain.cancelScheduledValues(this._ctx.currentTime);
      this._master.gain.setTargetAtTime(0, this._ctx.currentTime, 0.02);
    } else {
      this._master.gain.cancelScheduledValues(this._ctx.currentTime);
      this._master.gain.setTargetAtTime(this._volume, this._ctx.currentTime, 0.02);
    }
  }

  get muted() {
    return !!this._muted;
  }

  /** Sets the music bus volume (0..1), independent of master. */
  setMusicVolume(v) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    if (this._music) this._music.setVolume(this._musicVolume);
  }

  /** True once the context + master chain exist. */
  get isReady() {
    return this._ctx !== null && this._master !== null;
  }

  /* ---------------- Lifecycle ---------------- */

  destroy() {
    this._detachUnlock();
    this.stopMusic();
    this.clearEngineLoops();
    if (this._ctx) {
      try {
        this._ctx.close();
      } catch { /* context already closed */ }
      this._ctx = null;
      this._master = null;
    }
  }
}
