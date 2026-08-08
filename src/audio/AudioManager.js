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
    const comp = this._ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 5;
    comp.attack.value = 0.002;
    comp.release.value = 0.18;
    this._master.gain.value = this._volume;
    this._master.connect(comp);
    comp.connect(this._ctx.destination);

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

  _resume() {
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
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
        loop.lfo.stop();
      } catch { /* already stopped */ }
      loop.base.disconnect();
      loop.oct.disconnect();
      loop.flt.disconnect();
      loop.gain.disconnect();
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
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 0.9;
    const gain = ctx.createGain();
    // Small detune LFO for engine roughness.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 26;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 6; // cents of detune wobble
    lfo.connect(lfoGain);
    lfoGain.connect(base.detune);
    base.connect(flt);
    oct.connect(flt);
    flt.connect(gain);
    gain.connect(this._master);
    base.start();
    oct.start();
    lfo.start();
    const loop = { base, oct, flt, gain, lfo, speed01: 0 };
    this._updateEngineLoop(loop, speed01);
    return loop;
  }

  _updateEngineLoop(loop, speed01) {
    const t = this._ctx.currentTime;
    const tc = 0.06; // smooth updates, no zipper noise
    const baseFreq = 55 + speed01 * 150;
    loop.base.frequency.setTargetAtTime(baseFreq, t, tc);
    loop.oct.frequency.setTargetAtTime(baseFreq * 2, t, tc);
    loop.flt.frequency.setTargetAtTime(280 + speed01 * 1400, t, tc);
    loop.gain.gain.setTargetAtTime(this._engineVolume * (0.35 + speed01 * 0.65), t, tc);
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
