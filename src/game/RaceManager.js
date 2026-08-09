/**
 * Super Kart 3D.js — race orchestration.
 * Owns the race loop: countdown, kart/AI/item-box/projectile updates,
 * standings, finish detection and item pickups. Karts are built by the
 * controller and passed in via init() — this module never constructs them.
 *
 * Kart API is duck-typed wherever possible; Kart is imported only for an
 * instanceof sanity check in init().
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Kart } from '../entities/Kart.js';
import { AIController } from '../entities/AIController.js';
import { createItemBoxes } from '../entities/ItemBox.js';
import { rollPowerUpType, useItem as applyItemEffect } from '../entities/PowerUp.js';

const COUNTDOWN_SECONDS = CONFIG.game.countdownMs[0] || 3;
const FINISH_SCORE_BASE = 1e9;

// ---- Kart-contact physics (audit r2) --------------------------------------
const CONTACT_R = 1.55;
const CONTACT_R2 = CONTACT_R * CONTACT_R;
const CONTACT_SNAP_MAX = 0.42;     // max positional correction/frame (no teleport)
const CONTACT_SPIN_LAT_MIN = 7.0;  // m/s lateral closing speed to trigger a spin-out
const CONTACT_SPIN_MS = 550;       // rammer spin duration (mild side-swipe)
const CONTACT_SPIN_MS_MAX = 950;   // rammer spin duration (severe T-bone)
const CONTACT_RAM_COOLDOWN = 1.1;  // s per kart between spin triggers
const CONTACT_SFX_COOLDOWN = 0.22; // s between crash SFX (pack collisions)

// ---------------------------------------------------------------------------
// Coin pickups (audit r3: "no coins") — small gold cylinders near the road
// edge. Each coin grants +1% top speed (cap +10%, CONFIG.items.coinSpeedCap)
// via kart.addCoin(); Kart exposes `cruiseSpeed` as base * (1 + coins*0.01),
// which KartPhysics targets every frame. Placement is deterministic (fixed
// jitter like createItemBoxes), single-collect per race, reset on restart.
// ---------------------------------------------------------------------------

class Coin {
  constructor(track, t, side, jitter) {
    this.track = track;
    this.t = t;
    this.side = side;
    this.active = true;
    this.bobPhase = (t * 40 + side * 3) % (Math.PI * 2);
    this.base = this._computeBase(track, t, side, jitter);
    this.mesh = this._buildMesh();
  }

  /** Center point on the road, offset laterally toward the EDGE (off the
   *  racing line, on the asphalt — MK8 coin rows hug the kerb). */
  _computeBase(track, t, side, jitter) {
    const path = track.path;
    const tt = Math.min(Math.max(t, 0.001), 0.999);
    const point = path.getPointAt(tt);
    const tangent = path.getTangentAt(tt);
    // perpendicular in the XZ plane (same math as ItemBox)
    const px = -tangent.z;
    const pz = tangent.x;
    const pl = Math.hypot(px, pz) || 1;
    const lateral = CONFIG.track.roadWidth * (0.36 + jitter * 0.08) * side;
    return {
      x: point.x + (px / pl) * lateral,
      y: point.y + 0.45,
      z: point.z + (pz / pl) * lateral,
    };
  }

  _buildMesh() {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.06, 18),
      new THREE.MeshToonMaterial({ color: 0xffd166, emissive: 0xffaa00, emissiveIntensity: 0.35 })
    );
    mesh.position.set(this.base.x, this.base.y, this.base.z);
    mesh.castShadow = true;
    // bright rim so the coin reads as a coin, not a pebble
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.02, 8, 18),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4 })
    );
    rim.rotation.x = Math.PI / 2;
    mesh.add(rim);
    return mesh;
  }

  reset() {
    this.active = true;
    if (this.mesh) this.mesh.visible = true;
  }

  update(dt, karts, raceManager) {
    if (!this.active) return;
    this.bobPhase += dt * 2.6;
    if (this.mesh) {
      this.mesh.position.y = this.base.y + Math.sin(this.bobPhase) * 0.12;
      this.mesh.rotation.y += dt * 3.2; // spinning coin
    }
    const list = karts || [];
    const r = CONFIG.items.coinPickupRadius;
    const rr = r * r;
    for (const kart of list) {
      if (!kart || kart.finished) continue;
      const p = kart.group ? kart.group.position : kart.state?.position;
      if (!p) continue;
      const dx = p.x - this.base.x;
      const dz = p.z - this.base.z;
      if (dx * dx + dz * dz < rr) {
        if (this._collect(kart, raceManager)) break;
      }
    }
  }

  _collect(kart, raceManager) {
    if (!kart.addCoin || !kart.addCoin()) return false; // capped — coin stays for rivals
    this.active = false;
    if (this.mesh) this.mesh.visible = false;
    // Player gets the sparkle + blip; AI stays quiet (matches item pickups).
    if (raceManager && kart === raceManager.player) {
      raceManager.audio?.play?.('itemPickup');
      raceManager.particles?.emit?.('sparkle', new THREE.Vector3(this.base.x, this.base.y + 0.2, this.base.z), {
        count: 10, speed: 3.2, size: 0.18, color: 0xffd166,
      });
    }
    return true;
  }

  dispose() {
    this.mesh?.geometry?.dispose?.();
    this.mesh?.material?.dispose?.();
  }
}

/** Deterministic coin row: fixed jitter, alternating sides, near the kerb. */
export function createCoins(track, count = 10) {
  const coins = [];
  const n = Math.max(4, count);
  const jitter = [0.0, 0.5, -0.4, 0.3, -0.5, 0.4, -0.3, 0.5, -0.2, 0.2, -0.6, 0.6];
  for (let i = 0; i < n; i++) {
    const t = 0.06 + (i / n) * 0.88 + ((i % 5) - 2) * 0.012;
    const side = i % 2 === 0 ? 1 : -1;
    coins.push(new Coin(track, t, side, jitter[i % jitter.length]));
  }
  return coins;
}

export class RaceManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.karts = [];
    this.aiControllers = [];
    this.itemBoxes = [];
    this.coins = []; // gold coin pickups (audit r3)
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

    // AUDIT r3: leak fix — Menu→StartRace re-added boxes without removing
    // the previous ones (scene grew unbounded). Drop the old set first.
    if (this.itemBoxes && this.scene) {
      for (const box of this.itemBoxes) {
        if (box.mesh) this.scene.remove(box.mesh);
        if (box.beam) this.scene.remove(box.beam);
        if (box.arrows) this.scene.remove(box.arrows);
        box.mesh?.geometry?.dispose?.();
      }
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

    // AUDIT r3: coin pickups — drop the previous set (leak-safe), then place
    // a deterministic row near the road edge from the track path.
    if (this.coins && this.scene) {
      for (const c of this.coins) {
        if (c.mesh) this.scene.remove(c.mesh);
        c.dispose?.();
      }
    }
    this.coins = track ? createCoins(track, CONFIG.items.coinCount) : [];
    if (this.scene) {
      for (const c of this.coins) if (c.mesh) this.scene.add(c.mesh);
    }

    this.aiControllers = (aiKarts || []).map((k, i) => new AIController(k, track, this, i));

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
    for (const coin of this.coins) coin.reset?.();
    // AUDIT FIX (gameplay): the finish handler pushes a cruise controller for
    // the player kart; rebuild would re-randomize AI lanes (kart.position is
    // rank, all reset to numKarts), so instead drop the player's extra
    // controller (unless the demo autopilot owns the player) and reset the
    // rest in place.
    this.aiControllers = this.aiControllers.filter((c) => c.kart !== this.player || this._playerAI);
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
    // Full-primary karts can still grab a box into their RESERVE slot
    // (ItemBox only picks up into an empty primary — audit r3 dual-slot).
    this._updateReservePickups();
    for (const coin of this.coins) coin.update?.(dt, this.karts, this);
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
    this._resolveKartCollisions(dt);

    if (this.phase === 'race') {
      this._updateStandings();
      this._checkFinishes();
      if (this.elapsed >= CONFIG.game.raceTimeoutMs) this._forceFinish();
      if (this.raceOver) this.phase = 'finished';
    }
  }

  /** Push overlapping karts apart (speed-aware circle collision).
   *  AUDIT FIX (gameplay): the old version pushed BOTH karts symmetrically
   *  with a fixed nudge — a 64 m/s rear-end shoved the front kart sideways
   *  as hard as the rear-ender, and finished/cruising karts were rammed like
   *  targets. Now the impulse scales with the relative speed along the
   *  contact normal (the rear-ender loses more speed), and finished karts
   *  are only separated, never accelerated.
   *  AUDIT r2: the positional snap is clamped so karts never visibly
   *  teleport, and side-swipe / T-bone contacts spin out the RAMMER. */
  _resolveKartCollisions(dt = 0.016) {
    const karts = this.karts;
    for (let i = 0; i < karts.length; i++) {
      const a = karts[i];
      if (!a.state) continue;
      const ac = a._ramCooldown || 0;
      if (ac > 0) a._ramCooldown = Math.max(0, ac - dt);
      for (let j = i + 1; j < karts.length; j++) {
        const b = karts[j];
        if (!b.state) continue;
        const bc = b._ramCooldown || 0;
        if (bc > 0) b._ramCooldown = Math.max(0, bc - dt);
        const dx = b.state.position.x - a.state.position.x;
        const dz = b.state.position.z - a.state.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 >= CONTACT_R2 || d2 <= 0.0001) continue;
        const d = Math.sqrt(d2);
        const overlap = (CONTACT_R - d) / 2;
        const nx = dx / d;
        const nz = dz / d;
        // Speed-aware: how fast is B approaching A along the contact normal?
        // Positive = B is closing on A (rear-ender). Scale the positional
        // shove and speed penalty by that closing speed — clamped so even a
        // hard 64 m/s hit can't snap karts across the track in one frame.
        const relSpeed = (b.state.speed || 0) - (a.state.speed || 0);
        const closing = Math.max(0, Math.abs(relSpeed) * 0.35);
        const rawA = overlap + closing * 0.02;
        const rawB = overlap - closing * 0.01;
        const pushA = Math.max(-CONTACT_SNAP_MAX, Math.min(CONTACT_SNAP_MAX, rawA));
        const pushB = Math.max(-CONTACT_SNAP_MAX, Math.min(CONTACT_SNAP_MAX, rawB));
        a.state.position.x -= nx * pushA;
        a.state.position.z -= nz * pushA;
        b.state.position.x += nx * pushB;
        b.state.position.z += nz * pushB;
        // Finished karts are obstacles, not pinballs: never accelerate them.
        if (!a.finished) a.nudge?.({ x: -nx, y: 0, z: -nz });
        if (!b.finished) b.nudge?.({ x: nx, y: 0, z: nz });
        // Rear-ender pays a small speed penalty for the shove.
        if (relSpeed > 1 && !b.finished) b.state.speed *= 0.985;
        // Lateral-shear contact (audit r2): side-swipes and T-bones spin out
        // the rammer; rear-ends have ~zero lateral component and stay gentle
        // shoves.
        this._resolveContactSpin(a, b, nx, nz);
      }
    }
  }

  /** Side-swipe / T-bone spin-out (audit r2). The lateral closing speed is
   *  the relative velocity PERPENDICULAR to the contact normal — ~0 for
   *  rear-ends, large for rams. Above the threshold, the kart moving most
   *  laterally across the contact (the rammer) gets a brief spin-out via the
   *  kart's existing _spinMs timer (KartPhysics spins s.heading + decays
   *  speed while it runs; AIController releases controls during it). */
  _resolveContactSpin(a, b, nx, nz) {
    const ha = a.state.heading || 0;
    const hb = b.state.heading || 0;
    const vaX = Math.sin(ha) * (a.state.speed || 0);
    const vaZ = Math.cos(ha) * (a.state.speed || 0);
    const vbX = Math.sin(hb) * (b.state.speed || 0);
    const vbZ = Math.cos(hb) * (b.state.speed || 0);
    const relX = vbX - vaX;
    const relZ = vbZ - vaZ;
    // |relV × n| (2D) — the lateral component of the relative velocity.
    const latClose = Math.abs(relX * nz - relZ * nx);
    if (latClose < CONTACT_SPIN_LAT_MIN) return;
    // Rammer = the kart whose own motion is most lateral to the contact.
    const latA = Math.abs(vaX * nz - vaZ * nx);
    const latB = Math.abs(vbX * nz - vbZ * nx);
    const rammer = latB > latA ? b : a;
    if (rammer.finished || rammer.invincible || rammer.starred) return;
    if ((rammer._ramCooldown || 0) > 0) return;
    rammer._ramCooldown = CONTACT_RAM_COOLDOWN;
    const severity = Math.min(1, (latClose - CONTACT_SPIN_LAT_MIN) / 18);
    const spinMs = Math.round(CONTACT_SPIN_MS + (CONTACT_SPIN_MS_MAX - CONTACT_SPIN_MS) * severity);
    if (typeof rammer._spinMs === 'number') {
      rammer._spinMs = Math.max(rammer._spinMs || 0, spinMs);
      rammer._spinDir = Math.random() < 0.5 ? -1 : 1;
    } else {
      rammer.state.spinOut = true; // duck-typed fallback
    }
    this._playContactSfx(a, b, latClose);
    // Small camera shake — only when the player is part of the hit.
    if ((a === this.player || b === this.player) && typeof window !== 'undefined' && window.__sk3d?.addShake) {
      window.__sk3d.addShake(Math.min(0.55, 0.18 + severity * 0.3), 0.35);
    }
  }

  /** Impact SFX ('crash') with world-X pan + volume scaled by lateral speed. */
  _playContactSfx(a, b, latClose) {
    if (!this.audio?.play) return;
    if (this._lastCrashSfx !== undefined && this.elapsed - this._lastCrashSfx < CONTACT_SFX_COOLDOWN) return;
    this._lastCrashSfx = this.elapsed;
    const midX = (a.state.position.x + b.state.position.x) / 2;
    const pan = (midX - (this.player?.state?.position.x ?? midX)) * 0.04;
    const vol = Math.min(0.85, 0.35 + (latClose / 30) * 0.5);
    this.audio.play('crash', { volume: vol, pan: Math.max(-0.9, Math.min(0.9, pan)) });
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

  /** Roll a weighted PowerUpType and hand it to the kart. The roll is
   *  position-aware: leaders get defensive items, tail-enders get comebacks.
   *  AUDIT r3 dual-slot: fills the primary first, the reserve slot otherwise;
   *  ~1-in-6 boxes grant a TRIPLE (3 identical items queued as a stack —
   *  using one auto-queues the next via useItem). */
  pickupItem(kart) {
    if (!kart || (kart.heldItem && kart.heldItem2)) return null; // both slots full
    const n = this.karts.length || 6;
    const pos01 = n > 1 ? Math.max(0, Math.min(1, (kart.position - 1) / (n - 1))) : 0.5;
    const type = rollPowerUpType(pos01);
    // Triple box: the whole stack rides in ONE slot (MK8: your hold slot
    // shows ×3 and refills itself as you use it). Reserved for the free slot
    // so a full primary + empty reserve still queues behind heldItem2.
    const triple = Math.random() < CONFIG.items.tripleChance;
    if (kart.heldItem) {
      kart.heldItem2 = type;
      kart._heldItem2Count = triple ? 3 : 1;
    } else {
      kart.heldItem = type;
      kart._heldItemCount = triple ? 3 : 1;
    }
    // Player gets the full 'pickup' fanfare from main.js's heldItem change
    // hook; AI pickups keep a quiet discrete blip (no double chime — audit F2).
    if (kart !== this.player) this.audio?.play?.('itemPickup');
    return type;
  }

  /** Reserve-slot pickup pass: ItemBox.update() skips karts whose PRIMARY
   *  slot is full, so it can never fill heldItem2. This pass extends box
   *  eligibility to karts with a full primary + empty reserve (MK8 dual-slot:
   *  hold a defensive item AND carry a second one for later). */
  _updateReservePickups() {
    const r = CONFIG.items.pickupRadius;
    const rr = r * r;
    for (const box of this.itemBoxes) {
      if (!box || !box.active || !box.mesh) continue;
      for (const kart of this.karts) {
        if (!kart || kart.finished) continue;
        if (!kart.heldItem || kart.heldItem2) continue; // only full-primary, empty-reserve
        const p = kart.group ? kart.group.position : kart.state?.position;
        if (!p) continue;
        const dx = p.x - box.mesh.position.x;
        const dz = p.z - box.mesh.position.z;
        if (dx * dx + dz * dz < rr) {
          this.pickupItem(kart); // primary full -> lands in heldItem2
          box._consume?.();
          break;
        }
      }
    }
  }

  /** Central item-usage entry point — builds the ctx for PowerUp.useItem.
   *  AI shells/red shells target the nearest rival AHEAD of the shooter
   *  (standings-based, not always the player — audit r2); the player passes
   *  none (PowerUp then picks the nearest rival ahead itself).
   *  AUDIT r3 dual-slot: an empty primary pulls the reserve slot forward
   *  (Space always works); triple stacks auto-queue the next item after use. */
  useItem(kart) {
    if (!kart || (!kart.heldItem && !kart.heldItem2)) return;
    if (!kart.heldItem && kart.heldItem2) this._promoteHeldItem(kart);
    if (!kart.heldItem) return;
    const stackCount = kart._heldItemCount || 1;
    const stackType = kart.heldItem;
    const targetKart = kart === this.player ? null : this._pickRivalAhead(kart);
    applyItemEffect(kart, {
      scene: this.scene,
      karts: this.karts,
      raceManager: this,
      audio: this.audio,
      particles: this.particles,
      targetKart,
    });
    // MK8 triple: the next of a triple stack refills the freed hold slot.
    if (stackType && stackCount > 1) {
      kart._heldItemCount = stackCount - 1;
      kart.heldItem = stackType;
    } else {
      kart._heldItemCount = 1;
    }
  }

  /** Move the reserve slot into the primary (whole stack moves; the primary
   *  is empty when called). Slot-2 singles promote too, so pressing use with
   *  only a reserve item still fires it. */
  _promoteHeldItem(kart) {
    if (!kart.heldItem2) return;
    kart.heldItem = kart.heldItem2;
    kart._heldItemCount = kart._heldItem2Count || 1;
    kart.heldItem2 = null;
    kart._heldItem2Count = 1;
  }

  /** Nearest rival AHEAD of the shooter by race standings (position 1 =
   *  leader; getStandings() rows before the shooter are all ahead). Returns
   *  null when nobody is ahead (leader / unknown kart). */
  _pickRivalAhead(shooter) {
    const rows = this.getStandings();
    let myIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].kart === shooter) { myIdx = i; break; }
    }
    if (myIdx <= 0) return null;
    const myScore = rows[myIdx].lap * 1000 + rows[myIdx].progress01;
    let best = null;
    let bestDiff = Infinity;
    for (let i = 0; i < myIdx; i++) {
      const r = rows[i];
      if (r.finished) continue;
      const diff = r.lap * 1000 + r.progress01 - myScore;
      if (diff > 0 && diff < bestDiff) { bestDiff = diff; best = r.kart; }
    }
    return best;
  }

  // -------------------------------------------------------------------------
  // Restart helpers
  // -------------------------------------------------------------------------

  _resetKart(kart) {
    kart.finished = false;
    kart.totalTime = null;
    kart.position = 0;
    kart.heldItem = null;
    kart.heldItem2 = null; // dual-slot + triple stacks reset with the race
    kart._heldItemCount = 1;
    kart._heldItem2Count = 1;
    kart._coins = 0;
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
