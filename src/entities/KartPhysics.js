/**
 * Super Kart 3D.js — arcade kart physics.
 * Pure-ish step mutating `kart.state` (plus a few private `kart._*` fields).
 * Model (all knobs from CONFIG.physics):
 *   - steer rate scales with speed (steerSpeedLow when slow, steerSpeed at
 *     speed, driftSteer while drifting)
 *   - drift: charge 0..1 while drifting above driftMinSpeed; releasing with
 *     charge >= driftReleaseBoost fires a mini-boost via kart.applyBoost()
 *   - lateral velocity with exponential grip (lateralGrip; looser while
 *     drifting) — produces the classic drift slide
 *   - friction, braking → reverse (reverseSpeed floor)
 *   - off-road: beyond road half-width, max speed scaled by
 *     CONFIG.track.offRoadMaxSpeedFactor
 *   - wall bounce at the road edge + grass margin (collisionBounce)
 *   - gravity / airtime with landing squash
 *   - squash & stretch: group.scale.y eases toward kart._scaleTarget
 *   - progress01 via lazy nearest-sample search on a cached waypoint lattice;
 *     lap increments when progress wraps 0→1 while facing startLine.direction
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const SAMPLES = 192; // points around the loop for nearest-sample search

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _tmp = new THREE.Vector3();

/** Build (once per track) the sampled lattice: positions, tangents, cumulative length. */
function ensureSamples(kart, track) {
  if (kart._samples && kart._samples.track === track) return kart._samples;
  const N = SAMPLES;
  const path = track.path;
  const pos = [];
  const tan = [];
  const len = [0];
  let total = 0;
  let prev = path.getPointAt(0);
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const p = path.getPointAt(t);
    const tg = path.getTangentAt(t);
    pos.push(p.clone());
    tan.push(new THREE.Vector3(tg.x, 0, tg.z).normalize());
    if (i > 0) total += p.distanceTo(prev);
    len.push(total);
    prev = p;
  }
  const samples = { track, N, pos, tan, len, total: Math.max(total, 0.001) };
  kart._samples = samples;
  kart._sampleIndex = 0;
  return samples;
}

/** Nearest-sample search around the previous best index (O(1) typical). */
function nearestSample(kart, samples) {
  const N = samples.N;
  const start = ((kart._sampleIndex % N) + N) % N;
  const p = kart.state.position;
  let best = start;
  let bestD = samples.pos[start].distanceToSquared(p);
  const RADIUS = 14;
  for (let r = 1; r <= RADIUS; r++) {
    const i1 = (start + r) % N;
    const d1 = samples.pos[i1].distanceToSquared(p);
    if (d1 < bestD) { bestD = d1; best = i1; }
    const i2 = (start - r + N) % N;
    const d2 = samples.pos[i2].distanceToSquared(p);
    if (d2 < bestD) { bestD = d2; best = i2; }
  }
  if (bestD > 900) {
    // teleported/respawned far away — full scan
    for (let i = 0; i < N; i++) {
      const d = samples.pos[i].distanceToSquared(p);
      if (d < bestD) { bestD = d; best = i; }
    }
  }
  kart._sampleIndex = best;

  const idx = best;
  const sp = samples.pos[idx];
  const tan = samples.tan[idx];
  const right = _right.set(tan.z, 0, -tan.x);
  const lateralDist = _tmp.copy(p).sub(sp).dot(right);
  return {
    idx,
    t: idx / N,
    progress01: samples.len[idx] / samples.total,
    lateralDist,
    groundY: sp.y,
    tan,
  };
}

function roadHalfWidth(track, t) {
  const w = typeof track.getRoadWidthAt === 'function'
    ? track.getRoadWidthAt(t)
    : CONFIG.track.roadWidth;
  return Math.max(1, w) / 2;
}

function dampAngle(cur, target, lambda, dt) {
  let d = target - cur;
  d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return cur + d * (1 - Math.exp(-lambda * dt));
}

function approach(cur, target, step) {
  if (cur < target) return Math.min(cur + step, target);
  return Math.max(cur - step, target);
}

function updateDrift(kart, input, dt, speedAbs) {
  const s = kart.state;
  const P = CONFIG.physics;
  const can = speedAbs >= P.driftMinSpeed && !s.spinOut;
  if (input.drift && can) {
    if (!s.drifting) { s.drifting = true; s.driftCharge = 0; }
    s.driftCharge = Math.min(1, s.driftCharge + P.driftChargeRate * dt * (1 + Math.abs(input.steer) * 0.6));
  } else if (s.drifting) {
    if (s.driftCharge >= P.driftReleaseBoost) kart.applyBoost(750); // mini-boost
    s.drifting = false;
    s.driftCharge = 0;
  }
}

function updateLap(kart, near) {
  const s = kart.state;
  const p = s.progress01;
  const last = kart._lastProgress;
  if (last > 0.85 && p < 0.15) {
    // crossed the seam forward — check we're heading along startLine.direction
    _fwd.set(Math.sin(s.heading), 0, Math.cos(s.heading));
    if (_fwd.dot(kart._startDir) > 0.35 && !kart.finished) {
      s.lap += 1;
    }
  }
  kart._lastProgress = p;
}

export class KartPhysics {
  /**
   * Advance one kart by dt seconds.
   * @param {object} kart  — Kart instance (state + group + effect hooks)
   * @param {object} input — { steer, throttle, brake, drift, useItem }
   * @param {number} dt    — seconds
   * @param {object} track — { path, startLine, getRoadWidthAt? }
   */
  static step(kart, input, dt, track) {
    if (!track || !track.path || dt <= 0) return;
    const s = kart.state;
    const P = CONFIG.physics;
    const T = CONFIG.track;

    const samples = ensureSamples(kart, track);
    const near = nearestSample(kart, samples);
    const halfW = roadHalfWidth(track, near.t);
    const wallAt = halfW + (T.roadEdge ?? 0.9);

    s.progress01 = near.progress01;
    updateLap(kart, near);

    // Turbo pads: within 0.015 of a pad's t (and not already boosting) →
    // start a 1.2s turbo. Guarded so it only fires once per pass (the
    // timer outlasts the trigger window while the kart crosses the pad).
    if (track.turboPads && track.turboPads.ts && !s.boost && s.turboBoostMs <= 0) {
      for (let i = 0; i < track.turboPads.ts.length; i++) {
        if (Math.abs(s.progress01 - track.turboPads.ts[i]) <= 0.015) {
          s.turboBoostMs = 1200;
          break;
        }
      }
    }

    const tan = near.tan;
    const fwd = _fwd.set(Math.sin(s.heading), 0, Math.cos(s.heading));
    const right = _right.set(tan.z, 0, -tan.x);
    const speedAbs = Math.abs(s.speed);

    // ---- steering ---------------------------------------------------------
    if (s.spinOut) {
      s.heading += kart._spinDir * 8.5 * dt;
      s.speed = approach(s.speed, 0, 20 * dt);
      s.drifting = false;
    } else {
      const speed01 = Math.min(1, speedAbs / P.maxSpeed);
      let rate = P.steerSpeed + (P.steerSpeedLow - P.steerSpeed) * (1 - speed01);
      if (s.drifting) rate = P.driftSteer;
      if (kart._airTime > 0.05) rate *= P.airControl * 0.4; // reduced control airborne
      const steerSign = s.speed < 0 ? -1 : 1;
      const steerEff = input.steer * steerSign * (speedAbs > 0.25 ? 1 : 0.3);
      // NOTE: heading += would turn LEFT on positive steer (Three.js right-hand
      // rule: forward +Z, right = -X). Invert so +steer = right turn.
      s.heading -= steerEff * rate * dt;
      // gentle pull toward the path tangent (forgiving handling, helps AI)
      const tanAngle = Math.atan2(tan.x, tan.z);
      // Off-road: weaken the pull so the player can steer BACK to the track
      // (a strong pull keeps the kart running parallel in the grass forever).
      const pull = s.offRoad ? 0.1 : s.drifting ? 0.2 : 0.45;
      s.heading = dampAngle(s.heading, tanAngle, pull, dt);
      updateDrift(kart, input, dt, speedAbs);
    }

    // ---- speed -------------------------------------------------------------
    let target = (s.boost || s.turboBoostMs > 0) ? P.boostSpeed : (kart.cruiseSpeed || P.maxSpeed);
    s.offRoad = Math.abs(near.lateralDist) > halfW;
    if (s.offRoad) target *= T.offRoadMaxSpeedFactor;
    if (s.spinOut) target = 0;

    if (!s.spinOut) {
      if (input.throttle) s.speed += P.acceleration * dt;
      if (input.brake) s.speed -= P.braking * dt;
    }
    const fr = P.friction * (s.offRoad ? 1.8 : 1);
    s.speed -= Math.sign(s.speed) * Math.min(speedAbs, fr * dt);
    const maxAbs = Math.abs(target);
    if (Math.abs(s.speed) > maxAbs) {
      s.speed = approach(s.speed, Math.sign(s.speed) * maxAbs, (s.offRoad ? 22 : 14) * dt);
    }
    if (s.speed < P.reverseSpeed) s.speed = P.reverseSpeed;

    // ---- lateral velocity (drift slide) -------------------------------------
    let lat = kart._latVel || 0;
    const grip = s.drifting ? 1.5 : P.lateralGrip;
    lat *= Math.exp(-grip * dt);
    if (s.drifting && input.steer !== 0 && !s.spinOut) lat += input.steer * 5.2 * dt;
    kart._latVel = lat;

    // ---- integrate position ---------------------------------------------------
    _move.copy(fwd).multiplyScalar(s.speed).addScaledVector(right, lat);
    s.position.addScaledVector(_move, dt);
    if (kart._nudgeVel && kart._nudgeVel.lengthSq() > 1e-6) {
      s.position.addScaledVector(kart._nudgeVel, dt);
      kart._nudgeVel.multiplyScalar(Math.exp(-3.5 * dt));
      if (kart._nudgeVel.lengthSq() < 0.002) kart._nudgeVel.set(0, 0, 0);
    }

    // ---- wall bounce at road edge + grass margin -------------------------------
    const lateralDist = near.lateralDist;
    if (Math.abs(lateralDist) > wallAt) {
      const overshoot = Math.abs(lateralDist) - wallAt;
      s.position.addScaledVector(right, -Math.sign(lateralDist) * overshoot * 1.15);
      kart._latVel = -lat * P.collisionBounce;
      s.speed *= Math.max(0.25, 1 - overshoot * 0.5);
      // steer the nose back toward the track center
      s.heading = dampAngle(s.heading, Math.atan2(tan.x, tan.z), 6, dt);
      kart._bounce = 1;
      kart._bounceTimer = 0.3;
      kart._scaleTarget = 0.92;
      kart._scaleMs = Math.max(kart._scaleMs, 260);
    }

    // ---- height / gravity -----------------------------------------------------
    const groundY = near.groundY + kart.rideHeight;
    if (s.position.y > groundY + 0.06) {
      // airborne
      s.vY += P.gravity * dt;
      s.position.y += s.vY * dt;
      kart._airTime += dt;
      if (s.position.y <= groundY) {
        s.position.y = groundY;
        s.vY = 0;
        if (kart._airTime > 0.05) {
          kart._scaleTarget = 0.92; // landing squash
          kart._scaleMs = Math.max(kart._scaleMs, 240);
        }
        kart._airTime = 0;
      }
    } else {
      s.position.y = groundY;
      s.vY = 0;
      kart._airTime = 0;
      // squash rolling off a fast drop
      if (groundY < kart._prevY - 0.16) {
        kart._scaleTarget = 0.94;
        kart._scaleMs = Math.max(kart._scaleMs, 240);
      }
    }
    kart._prevY = groundY;

    // ---- squash & stretch -------------------------------------------------------
    if (kart._scaleMs > 0) kart._scaleMs -= dt * 1000;
    else kart._scaleTarget = 1;
    const sy = kart.group.scale.y;
    kart.group.scale.y = sy + (kart._scaleTarget - sy) * Math.min(1, 10 * dt);
    kart.group.scale.x = 1;
    kart.group.scale.z = 1;

    if (kart._bounceTimer > 0) kart._bounceTimer -= dt;
    else kart._bounce = 0;

    // keep heading in a sane range
    s.heading = ((s.heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  }
}

/** Bare-function alias for callers that prefer a plain step(). */
export const step = (kart, input, dt, track) => KartPhysics.step(kart, input, dt, track);
