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
//   setEngineLoop(kartId, speed01)  — continuous engine per kart;
//                                 remembered and applied on init
//   setMasterVolume(v), setMusicVolume(v)
// All calls before init() are safe (no-op or remembered).
// ============================================================

import { CONFIG } from '../config.js';
import { renderSfx } from './sfx.js';
import { MusicEngine } from './music.js';

const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'];

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
    this._pendingEngine = new Map();  // kartId -> speed01 (pre-init)

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
    for (const [kartId, speed01] of this._pendingEngine) {
      this.setEngineLoop(kartId, speed01);
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
   * @param {Object} [opts] { volume=1, rate=1, pan=0, delay=0 }.
   */
  play(name, { volume = 1, rate = 1, pan = 0, delay = 0 } = {}) {
    if (!this._ctx || !this._master) return;
    renderSfx(this._ctx, this._master, name, {
      volume,
      rate,
      pan,
      at: this._ctx.currentTime + Math.max(0, delay),
    });
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
   * speed01 (0 idle … 1 full rev), through a lowpass, into a gain
   * scaled by CONFIG.audio.engineVolume. Updates are smoothed with
   * setTargetAtTime (no zipper noise).
   * @param {string} kartId
   * @param {number} speed01 0..1 normalized speed.
   */
  setEngineLoop(kartId, speed01) {
    const s = Math.max(0, Math.min(1, speed01));
    if (!this._ctx || !this._master) {
      // Remember and apply on init().
      this._pendingEngine.set(kartId, s);
      return;
    }
    const existing = this._engineLoops.get(kartId);
    if (existing) {
      this._updateEngineLoop(existing, s);
    } else {
      this._engineLoops.set(kartId, this._createEngineLoop(s));
    }
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
      this._engineLoops.delete(kartId);
    }
  }

  /** Stops every engine loop (race restart / teardown). */
  clearEngineLoops() {
    for (const kartId of [...this._engineLoops.keys()]) {
      this.removeEngineLoop(kartId);
    }
    this._pendingEngine.clear();
  }

  _createEngineLoop(speed01) {
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
    lfoGain.gain.value = 4; // cents of detune wobble
    lfo.connect(lfoGain);
    lfoGain.connect(base.detune);
    base.connect(flt);
    oct.connect(flt);
    sub.connect(flt);
    flt.connect(shaper);
    shaper.connect(gain);
    gain.connect(this._master);
    base.start();
    oct.start();
    sub.start();
    noise.start();
    lfo.start();
    const loop = { base, oct, sub, flt, shaper, gain, lfo, noise, nBand, speed01: 0 };
    this._updateEngineLoop(loop, speed01);
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

  _updateEngineLoop(loop, speed01) {
    const t = this._ctx.currentTime;
    const tc = 0.06; // smooth updates, no zipper noise
    const baseFreq = 55 + speed01 * 150;
    loop.base.frequency.setTargetAtTime(baseFreq, t, tc);
    loop.oct.frequency.setTargetAtTime(baseFreq * 2.02, t, tc);
    loop.sub.frequency.setTargetAtTime(baseFreq * 0.5, t, tc);
    loop.flt.frequency.setTargetAtTime(300 + speed01 * 1500, t, tc);
    loop.nBand.frequency.setTargetAtTime(220 + speed01 * 900, t, tc);
    loop.gain.gain.setTargetAtTime(this._engineVolume * (0.30 + speed01 * 0.62), t, tc);
    loop.speed01 = speed01;
  }

  /* ---------------- Volume ---------------- */

  /** Sets the master volume (0..1), smoothed to avoid clicks. */
  setMasterVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._ctx && this._master) {
      this._master.gain.setTargetAtTime(this._volume, this._ctx.currentTime, 0.02);
    }
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
