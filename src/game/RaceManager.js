/**
 * Super Kart 3D.js — race orchestration.
 * Owns the race loop: countdown, kart/AI/item-box/projectile updates,
 * standings, finish detection and item pickups. Karts are built by the
 * controller and passed in via init() — this module never constructs them.
 *
 * Kart API is duck-typed wherever possible; Kart is imported only for an
 * instanceof sanity check in init().
 */
import { CONFIG } from '../config.js';
import { Kart } from '../entities/Kart.js';
import { AIController } from '../entities/AIController.js';
import { createItemBoxes } from '../entities/ItemBox.js';
import { rollPowerUpType, useItem as applyItemEffect } from '../entities/PowerUp.js';

const COUNTDOWN_SECONDS = CONFIG.game.countdownMs[0] || 3;
const FINISH_SCORE_BASE = 1e9;

export class RaceManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.karts = [];
    this.aiControllers = [];
    this.itemBoxes = [];
    this.activeItems = []; // ShellProjectile / Banana / StarEffect

    this.player = null;
    this.track = null;
    this.audio = null;
    this.particles = null;

    this.elapsed = 0;
    this.phase = 'idle'; // idle | countdown | race | finished
    this.countdown = 0;
    this.raceOver = false;
    this.finishOrder = [];
    this.playerFinished = false;

    // Cached sampled centerline (for AI look-ahead + off-track culling).
    this.centerline = null;
    this.centerlineSpacing = 2.5;
  }

  /**
   * init({ track, playerKart, aiKarts, itemBoxes, audio })
   * `particles` is accepted as an extra optional field (kart.update ctx).
   * Item boxes are auto-created from the track when not supplied.
   */
  init({ track, playerKart, aiKarts, itemBoxes, audio, particles }) {
    this.track = track || null;
    this.player = playerKart || null;
    this.karts = playerKart ? [playerKart, ...(aiKarts || [])] : [...(aiKarts || [])];
    this.audio = audio || null;
    this.particles = particles || null;

    if (playerKart && Kart && !(playerKart instanceof Kart)) {
      console.warn('[RaceManager] playerKart is not a Kart instance — continuing with duck-typed API.');
    }

    this.itemBoxes =
      itemBoxes && itemBoxes.length ? itemBoxes : track ? createItemBoxes(track) : [];

    // Add item-box meshes (+ golden beams) to the scene — they were never
    // added before, so pickups were invisible on the track.
    if (this.scene) {
      for (const box of this.itemBoxes) {
        if (box.mesh) this.scene.add(box.mesh);
        if (box.beam) this.scene.add(box.beam);
        if (box.arrows) this.scene.add(box.arrows);
      }
    }

    this.aiControllers = (aiKarts || []).map((k) => new AIController(k, track, this));

    // Build the navigation cache for AI + projectile off-track culling.
    if (track && track.path && typeof track.path.getSpacedPoints === 'function') {
      this.centerline = track.path.getSpacedPoints(240);
      const len = track.length || 500;
      this.centerlineSpacing = Math.max(1.5, len / 240);
    } else if (track && track.waypoints && track.waypoints.length) {
      this.centerline = track.waypoints;
      const len = track.length || 500;
      this.centerlineSpacing = Math.max(1.5, len / track.waypoints.length);
    }

    return this;
  }

  /** Begin a fresh race (countdown first). */
  start() {
    this.elapsed = 0;
    // The visual 3-2-1-GO countdown is driven by main.js (GameState COUNTDOWN).
    // Going straight to 'race' avoids a SECOND hidden countdown here — which
    // made karts sit still for another ~3s game-time after GO.
    this.phase = 'race';
    this.raceOver = false;
    this.finishOrder = [];
    this.playerFinished = false;
  }

  /** Reset karts / hazards / boxes and start over. */
  restart() {
    for (const it of this.activeItems) {
      if (it.mesh) this.scene?.remove(it.mesh);
      it.dispose?.();
    }
    this.activeItems = [];
    for (const box of this.itemBoxes) box.reset?.();
    for (const ctrl of this.aiControllers) ctrl.reset?.();
    for (const kart of this.karts) this._resetKart(kart);
    this.start();
  }

  /** Intended to be overridden by the controller: onPlayerFinish(place, totalTime). */
  onPlayerFinish(_place, _totalTime) {
    // default no-op
  }

  get countdownInt() {
    return Math.max(0, Math.ceil(this.countdown));
  }

  // -------------------------------------------------------------------------
  // Per-frame update
  // -------------------------------------------------------------------------

  update(dt) {
    if (this.phase === 'idle') return;

    this.elapsed += dt;

    for (const box of this.itemBoxes) box.update?.(dt, this.karts, this);
    this._updateActiveItems(dt);

    if (this.phase === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.countdown = 0;
        this.phase = 'race';
        this.audio?.play?.('go');
      }
      return;
    }

    // race / finished: karts keep driving (finished ones cruise around).
    const ctx = { track: this.track, raceManager: this, particles: this.particles };
    for (const kart of this.karts) kart.update?.(dt, ctx);
    for (const ctrl of this.aiControllers) ctrl.update(dt);
    this._resolveKartCollisions();

    if (this.phase === 'race') {
      this._updateStandings();
      this._checkFinishes();
      if (this.elapsed >= CONFIG.game.raceTimeoutMs) this._forceFinish();
      if (this.raceOver) this.phase = 'finished';
    }
  }

  /** Push overlapping karts apart (simple circle collision). */
  _resolveKartCollisions() {
    const karts = this.karts;
    const R = 1.55;
    const R2 = R * R;
    for (let i = 0; i < karts.length; i++) {
      const a = karts[i];
      if (!a.state) continue;
      for (let j = i + 1; j < karts.length; j++) {
        const b = karts[j];
        if (!b.state) continue;
        const dx = b.state.position.x - a.state.position.x;
        const dz = b.state.position.z - a.state.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < R2 && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const overlap = (R - d) / 2;
          const nx = dx / d;
          const nz = dz / d;
          a.state.position.x -= nx * overlap;
          a.state.position.z -= nz * overlap;
          b.state.position.x += nx * overlap;
          b.state.position.z += nz * overlap;
          a.nudge?.({ x: -nx, y: 0, z: -nz });
          b.nudge?.({ x: nx, y: 0, z: nz });
        }
      }
    }
  }

  /** Advance projectiles/effects; sweep dead ones out of the scene. */
  _updateActiveItems(dt) {
    const items = this.activeItems;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.dead) {
        if (it.mesh) this.scene?.remove(it.mesh);
        it.dispose?.();
        items.splice(i, 1);
        continue;
      }
      it.update?.(dt, this.karts);
    }
  }

  /** Register a live item (projectile / hazard / star effect). */
  addActiveItem(item) {
    this.activeItems.push(item);
  }

  // -------------------------------------------------------------------------
  // Standings & finish detection
  // -------------------------------------------------------------------------

  /**
   * getStandings() → [{ kart, position, lap, progress01, finished }]
   * Sorted by race progress: finished karts first (by finish order), then
   * lap * 1000 + progress01 descending. Also writes kart.position (1-based).
   */
  getStandings() {
    const rows = this.karts.map((kart) => {
      const st = kart.state || {};
      const lap = st.lap ?? kart.lap ?? 0;
      const progress01 = st.progress01 ?? kart.progress01 ?? 0;
      const finished = !!(kart.finished || st.finished);
      let score = lap * 1000 + progress01;
      if (finished) {
        const fi = this.finishOrder.indexOf(kart);
        score = FINISH_SCORE_BASE - (fi >= 0 ? fi : this.karts.length) * 1000;
      }
      return { kart, position: 0, lap, progress01, finished, score };
    });
    rows.sort((a, b) => b.score - a.score);
    rows.forEach((r, i) => {
      r.position = i + 1;
      r.kart.position = i + 1;
      delete r.score;
    });
    return rows;
  }

  _updateStandings() {
    this.getStandings(); // also refreshes kart.position
  }

  _checkFinishes() {
    const total = CONFIG.game.totalLaps;
    for (const kart of this.karts) {
      if (kart.finished) continue;
      const st = kart.state || {};
      const lap = st.lap ?? kart.lap ?? 0;
      if (lap >= total) {
        kart.finished = true;
        kart.totalTime = this.elapsed;
        this.finishOrder.push(kart);
        if (kart === this.player && !this.playerFinished) {
          this.playerFinished = true;
          this.onPlayerFinish(this.finishOrder.length, this.elapsed);
        }
      }
    }
    if (this.finishOrder.length >= this.karts.length && this.karts.length > 0) {
      this.raceOver = true;
    }
  }

  /** Timeout safety net: award everyone the remaining spots. */
  _forceFinish() {
    for (const kart of this.karts) {
      if (kart.finished) continue;
      kart.finished = true;
      kart.totalTime = this.elapsed;
      this.finishOrder.push(kart);
    }
    if (this.player && !this.playerFinished) {
      this.playerFinished = true;
      this.onPlayerFinish(this.finishOrder.indexOf(this.player) + 1, this.elapsed);
    }
    this.raceOver = true;
  }

  // -------------------------------------------------------------------------
  // Items
  // -------------------------------------------------------------------------

  /** Roll a weighted PowerUpType and hand it to the kart. */
  pickupItem(kart) {
    if (!kart || kart.heldItem) return null;
    const type = rollPowerUpType();
    kart.heldItem = type;
    this.audio?.play?.('itemPickup');
    return type;
  }

  /** Central item-usage entry point — builds the ctx for PowerUp.useItem.
   *  AI passes the player as the preferred homing target; the player passes
   *  none (PowerUp then picks the nearest rival ahead). */
  useItem(kart) {
    if (!kart || !kart.heldItem) return;
    const targetKart = kart === this.player ? null : this.player;
    applyItemEffect(kart, {
      scene: this.scene,
      karts: this.karts,
      raceManager: this,
      audio: this.audio,
      particles: this.particles,
      targetKart,
    });
  }

  // -------------------------------------------------------------------------
  // Restart helpers
  // -------------------------------------------------------------------------

  _resetKart(kart) {
    kart.finished = false;
    kart.totalTime = null;
    kart.position = 0;
    kart.heldItem = null;
    if (typeof kart.restart === 'function') {
      kart.restart();
      return;
    }
    const st = kart.state;
    if (st) {
      if (kart.startPosition && st.position) st.position.copy(kart.startPosition);
      if (typeof kart.startHeading === 'number') st.heading = kart.startHeading;
      st.speed = 0;
      st.lap = 0;
      st.progress01 = 0;
      st.spinOut = false;
      st.offRoad = false;
    }
  }
}
