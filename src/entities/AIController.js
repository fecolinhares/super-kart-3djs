/**
 * Super Kart 3D.js — AI drivers.
 * Follows the track centerline with look-ahead steering, applies rubber-band
 * speed tuning vs the player, uses held items smartly (targeting the player),
 * and releases controls during crash/spin-out recovery.
 *
 * Kart API is duck-typed (kart.setControls, kart.state, kart.finished).
 * Uses raceManager.centerline (a cached sampled path) for navigation; falls
 * back to track.waypoints when the manager has no cache.
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { headingVector, progressScore, signedAngle, PowerUpType, kartPosition } from './PowerUp.js';

/** Full steering lock reached at this heading error (radians). */
const STEER_FULL_AT = 0.7;

export class AIController {
  constructor(kart, track, raceManager, aiIndex = 0) {
    this.kart = kart;
    this.track = track;
    this.raceManager = raceManager;

    this.centerline = null;
    this.spacing = 2.5;
    this.nearIdx = 0;

    this.crashUntil = -1; // manager elapsed time when we may steer again
    this.itemAccum = 0; // item-use accumulator (chance per second)

    // Apply the driver's stats (1-10) as a difficulty curve (audit F2):
    //   speed    → base cruise speed (0.95-1.05 x maxSpeed)
    //   accel    → throttle eagerness (0.75-1.0 floor)
    //   handling → steering authority (0.85-1.15 look-ahead steering gain)
    const st = kart.character?.stats || { speed: 7, accel: 7, handling: 7 };
    this.stats = st;
    // Per-driver lateral lane offset (audit v4 F3: all AI hugged the same
    // centerline → train formation). Deterministic golden-ratio spread seeded
    // from the roster index (NOT kart.position — that was 0 at construction,
    // so every rival got the identical offset and drove one behind the other).
    this.laneOffset = aiIndex !== undefined && aiIndex !== null
      ? (aiIndex * 0.61803398875 - Math.floor(aiIndex * 0.61803398875) - 0.5) * CONFIG.track.roadWidth * 0.62
      : 0;
    this._initPath();
  }

  /** Resolve the steering reference path (raceManager cache > waypoints). */
  _initPath() {
    const rm = this.raceManager;
    if (rm && rm.centerline && rm.centerline.length) {
      this.centerline = rm.centerline;
      this.spacing = rm.centerlineSpacing || 2.5;
      return;
    }
    const wp = this.track && this.track.waypoints;
    if (wp && wp.length) {
      this.centerline = wp;
      const len = (this.track && this.track.length) || wp.length * this.spacing;
      this.spacing = Math.max(1.2, len / wp.length);
    }
  }

  /** Called by RaceManager.restart() to clear per-race state. */
  reset() {
    this.nearIdx = 0;
    this.crashUntil = -1;
    this.itemAccum = 0;
  }

  update(dt) {
    const kart = this.kart;
    const st = kart.state || {};
    const now = (this.raceManager && this.raceManager.elapsed) || 0;

    // Crash recovery: while spinning out, release all controls.
    if (st.spinOut) {
      this.crashUntil = now + CONFIG.ai.crashRecoverMs;
      kart.setControls?.({ steer: 0, throttle: 0, brake: 1, drift: false, useItem: false });
      return;
    }
    if (now < this.crashUntil) {
      kart.setControls?.({ steer: 0, throttle: 0, brake: 0.6, drift: false, useItem: false });
      return;
    }

    this._drive(dt, !!kart.finished);

    if (!kart.finished) this._maybeUseItem(dt);
  }

  // -------------------------------------------------------------------------
  // Steering / throttle
  // -------------------------------------------------------------------------

  _drive(dt, finished) {
    const kart = this.kart;
    const st = kart.state || {};
    const pos = kartPosition(kart);
    const heading = headingVector(kart);

    // Look-ahead waypoint: steerPredictAhead meters along the path from the
    // kart's nearest centerline sample.
    let target;
    const near = this._findNearest(pos);
    if (near >= 0 && this.centerline) {
      const look = Math.max(1, Math.round(CONFIG.ai.steerPredictAhead / this.spacing));
      const idx = (near + look) % this.centerline.length;
      target = this.centerline[idx];
      // Lateral lane offset: hold a personal racing line (audit v4 F3).
      if (this.laneOffset) {
        const p0 = this.centerline[idx];
        const p1 = this.centerline[(idx + 1) % this.centerline.length];
        let tx = p1.x - p0.x;
        let tz = p1.z - p0.z;
        const tl = Math.hypot(tx, tz) || 1;
        tx /= tl;
        tz /= tl;
        target = { x: p0.x + -tz * this.laneOffset, z: p0.z + tx * this.laneOffset };
      }
    } else {
      // No path data — dead-reckon straight ahead.
      target = { x: pos.x + heading.x * 10, z: pos.z + heading.y * 10 };
    }

    const toTargetX = target.x - pos.x;
    const toTargetZ = target.z - pos.z;
    const tl = Math.hypot(toTargetX, toTargetZ) || 1;
    const err = signedAngle(heading, { x: toTargetX / tl, y: toTargetZ / tl });

    // signedAngle(a,b) = h(a) - h(b). With the current physics, positive
    // steer DECREASES heading (turns right). Target right of kart → err > 0
    // → positive steer. (Was -err before the steering-sign fix.)
    // Handling stat scales steering authority (audit F2 difficulty curve).
    const hGain = 0.85 + (this.stats?.handling || 7) / 10 * 0.3;
    let steer = THREE.MathUtils.clamp((err / STEER_FULL_AT) * hGain, -1, 1);

    // Hazard avoidance (audit r3: CPUs were free banana/shell fodder — no
    // steering response to hazards on their line). Steer away from any live
    // item within ~5m roughly ahead.
    const items = this.raceManager?.activeItems;
    if (items && items.length) {
      for (const it of items) {
        const m = it && it.mesh;
        if (!m) continue;
        const hx = m.position.x - pos.x;
        const hz = m.position.z - pos.z;
        const dist = Math.hypot(hx, hz);
        if (dist > 5 || dist < 0.01) continue;
        const dot = (hx / dist) * heading.x + (hz / dist) * heading.y; // ~ahead?
        if (dot < 0.6) continue;
        // Cross product sign: >0 → hazard left of the kart → steer right.
        const side = (heading.x * hz - heading.y * hx) / dist;
        steer = THREE.MathUtils.clamp(steer + (side > 0 ? 1 : -1) * 0.75, -1, 1);
        break;
      }
    }

    let throttle = 1;
    let brake = 0;
    let drift = false;
    const absErr = Math.abs(err);
    // NOTE: never set brake for slow-down — in this physics brake = reverse.
    // Slowing is handled by easing the throttle; the path-pull turns the kart.
    if (absErr > 0.9) {
      // Hairpin: crawl while the damp-pull rotates us toward the path.
      throttle = 0.3;
    } else if (absErr > 0.5) {
      // Soft corner: lift a bit.
      throttle = 0.8;
    }

    const speed = st.speed ?? 0;
    if (speed < -0.5) {
      // Reversing (after a collision) — throttle FORWARD to exit reverse.
      // (brake would accelerate backwards toward reverseSpeed in this physics.)
      throttle = 1;
      brake = 0;
    }

    // Rubber-band vs the player: speed up when behind, ease off when ahead.
    const player = this.raceManager && this.raceManager.player;
    if (player && player !== kart) {
      const d = progressScore(player) - progressScore(kart); // >0 → AI behind
      // NOTE: d is a progress diff in 0..1, so the divisor must be ~1.5 — the
      // old /400 made the whole term ~0.001 (rubber-band numerically dead).
      const factor = THREE.MathUtils.clamp((d * CONFIG.ai.rubberBandFactor) / 1.5, -0.12, 0.3);
      // Real comeback: throttle alone can't raise TOP SPEED (physics caps at
      // maxSpeed/boostSpeed), so behind-AIs also get a cruiseSpeed override.
      // The driver's speed stat scales the whole cruise envelope (F2 curve).
      // AUDIT r2: when the AI is AHEAD the statScale caps at 1.0 — leading
      // rivals used to out-pace the player without items (feels unfair).
      const statScale = d > 0.03
        ? 0.95 + (this.stats?.speed || 7) / 10 * 0.1
        : Math.min(1.0, 0.95 + (this.stats?.speed || 7) / 10 * 0.1);
      if (d > 0.03) {
        const boost = Math.min(0.12, d * 0.3); // audit v4: capped +12% (was +22% — felt like cheating)
        kart.cruiseSpeed = CONFIG.physics.maxSpeed * (1 + boost) * statScale;
      } else {
        kart.cruiseSpeed = CONFIG.physics.maxSpeed * statScale;
      }
      throttle = THREE.MathUtils.clamp(throttle * (1 + factor), 0, 1.35);
    }

    // Drift style through committed corners (only while racing).
    // Accel stat raises the throttle floor → eager starters pull away (F2).
    const aGain = 0.6 + (this.stats?.accel || 7) / 10 * 0.5;
    if (!finished && absErr > 0.55 && speed > CONFIG.physics.driftMinSpeed) {
      drift = true;
      throttle = Math.max(throttle * aGain, 1);
    }

    kart.setControls?.({ steer, throttle, brake, drift, useItem: false });
  }

  /** Nearest centerline sample index (rolling window + full-scan fallback). */
  _findNearest(pos) {
    const cl = this.centerline;
    if (!cl || !cl.length) return -1;
    const n = cl.length;
    const r = 8;
    let best = this.nearIdx;
    let bestD = Infinity;
    for (let i = this.nearIdx - r; i <= this.nearIdx + r; i++) {
      const j = ((i % n) + n) % n;
      const p = cl[j];
      const dx = p.x - pos.x;
      const dz = p.z - pos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    // Fell far away (crash off track / respawn) — rescan everything.
    const slack = this.spacing * 20;
    if (bestD > slack * slack) {
      best = 0;
      bestD = Infinity;
      for (let j = 0; j < n; j++) {
        const p = cl[j];
        const dx = p.x - pos.x;
        const dz = p.z - pos.z;
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
    }
    this.nearIdx = best;
    return best;
  }

  // -------------------------------------------------------------------------
  // Item usage
  // -------------------------------------------------------------------------

  /** Accumulate a per-second use chance; fire when it crosses 1. */
  _maybeUseItem(dt) {
    const kart = this.kart;
    if (!kart.heldItem) {
      this.itemAccum = 0;
      return;
    }
    this.itemAccum += CONFIG.ai.itemUseChancePerSec * dt;
    if (this.itemAccum < 1) return;
    this.itemAccum = 0;
    if (this._shouldUseItem()) {
      this.raceManager?.useItem?.(kart);
    }
  }

  /** Smart use conditions — items are held until the moment is right. */
  _shouldUseItem() {
    const kart = this.kart;
    const type = kart.heldItem;
    const player = this.raceManager && this.raceManager.player;
    const d = player ? progressScore(player) - progressScore(kart) : 0;

    switch (type) {
      case PowerUpType.STAR:
        return true; // always pop it
      case PowerUpType.MUSHROOM:
        if (kart.state && kart.state.offRoad) return true; // recover speed
        if (d > 30) return true; // big catch-up gap
        {
          const err = this._headingErrorToPlayer();
          return err !== null && Math.abs(err) < 0.4 && d > 0;
        }
      case PowerUpType.SHELL:
      case PowerUpType.RED_SHELL:
        if (d <= 0) return false; // nobody ahead to hit
        {
          const err = this._headingErrorToPlayer();
          return err === null || Math.abs(err) < 1.2;
        }
      case PowerUpType.BANANA:
        return d < -10; // lead is safe → drop a trap
      case PowerUpType.LIGHTNING:
        return d > 5 && d < 150; // rival close ahead → shrink them
      default:
        return true;
    }
  }

  /** Signed heading error toward the player, or null if no player exists. */
  _headingErrorToPlayer() {
    const player = this.raceManager && this.raceManager.player;
    if (!player) return null;
    const pos = kartPosition(this.kart);
    const pp = kartPosition(player);
    const dx = pp.x - pos.x;
    const dz = pp.z - pos.z;
    const l = Math.hypot(dx, dz);
    if (l < 1) return 0;
    return signedAngle(headingVector(this.kart), { x: dx / l, y: dz / l });
  }
}
