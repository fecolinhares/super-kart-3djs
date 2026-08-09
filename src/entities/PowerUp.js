/**
 * Super Kart 3D.js — power-up logic.
 * Owns the item type enum + weighted roll, the shared kart-introspection
 * helpers (heading / position / progress), the useItem() effect dispatcher,
 * and the projectile / hazard classes (ShellProjectile, Banana, StarEffect).
 *
 * All kart calls are duck-typed (kart.applyBoost, kart.hitShell, ...) so this
 * module never needs to import Kart — no circular dependency risk.
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Item types & weighted roll
// ---------------------------------------------------------------------------

export const PowerUpType = Object.freeze({
  MUSHROOM: 'mushroom',
  SHELL: 'shell',
  RED_SHELL: 'red_shell',
  BANANA: 'banana',
  STAR: 'star',
  LIGHTNING: 'lightning',
  BLUE_SHELL: 'blue_shell',
});

/** Roll weights — must sum to 1.0 (default / mid-pack). */
export const ITEM_WEIGHTS = Object.freeze([
  { type: PowerUpType.MUSHROOM, weight: 0.30 },
  { type: PowerUpType.SHELL, weight: 0.22 },
  { type: PowerUpType.RED_SHELL, weight: 0.18 },
  { type: PowerUpType.BANANA, weight: 0.15 },
  { type: PowerUpType.STAR, weight: 0.08 },
  { type: PowerUpType.LIGHTNING, weight: 0.07 },
]);

/**
 * Position-aware item roll (genre rubber-band): the leader gets defensive
 * items, the tail gets comeback items. `position01` = placement: 0 = 1st.
 */
const ROLL_LEADER = [
  { type: PowerUpType.MUSHROOM, weight: 0.14 },
  { type: PowerUpType.SHELL, weight: 0.30 },
  { type: PowerUpType.RED_SHELL, weight: 0.28 },
  { type: PowerUpType.BANANA, weight: 0.20 },
  { type: PowerUpType.STAR, weight: 0.05 },
  { type: PowerUpType.LIGHTNING, weight: 0.03 },
];
const ROLL_BACK = [
  { type: PowerUpType.MUSHROOM, weight: 0.24 },
  { type: PowerUpType.SHELL, weight: 0.13 },
  { type: PowerUpType.RED_SHELL, weight: 0.10 },
  { type: PowerUpType.BANANA, weight: 0.11 },
  { type: PowerUpType.STAR, weight: 0.20 },
  { type: PowerUpType.LIGHTNING, weight: 0.14 },
  { type: PowerUpType.BLUE_SHELL, weight: 0.08 }, // targeted anti-leader weapon
];

/**
 * Weighted random PowerUpType. Default (mid-pack): MUSHROOM 30%, SHELL 22%,
 * RED_SHELL 18%, BANANA 15%, STAR 8%, LIGHTNING 7%.
 * @param {number} [position01=0.5] 0 = leader, 1 = last.
 */
export function rollPowerUpType(position01 = 0.5) {
  const table = position01 < 0.33 ? ROLL_LEADER : position01 > 0.66 ? ROLL_BACK : ITEM_WEIGHTS;
  const r = Math.random();
  let acc = 0;
  for (const entry of table) {
    acc += entry.weight;
    if (r < acc) return entry.type;
  }
  return PowerUpType.MUSHROOM;
}

// ---------------------------------------------------------------------------
// Shared kart introspection helpers (duck-typed, allocation-light)
// ---------------------------------------------------------------------------

/** Horizontal heading of a kart as a THREE.Vector2 (x = sin, y = cos of yaw;
 *  yaw 0 faces +Z). Falls back to the group quaternion if state.heading is
 *  missing. */
export function headingVector(kart) {
  const st = kart.state || {};
  if (typeof st.heading === 'number') {
    return new THREE.Vector2(Math.sin(st.heading), Math.cos(st.heading));
  }
  if (st.heading && typeof st.heading.x === 'number' && typeof st.heading.z === 'number') {
    const h = st.heading;
    const len = Math.hypot(h.x, h.z) || 1;
    return new THREE.Vector2(h.x / len, h.z / len);
  }
  if (kart.group) {
    const q = kart.group.quaternion;
    const x = 2 * (q.x * q.z + q.w * q.y);
    const z = 1 - 2 * (q.x * q.x + q.y * q.y);
    return new THREE.Vector2(x, z);
  }
  return new THREE.Vector2(0, 1);
}

/** World position of a kart (Object3D.position or state.position). */
export function kartPosition(kart) {
  const g = kart.group;
  if (g && g.position) return g.position;
  const st = kart.state || {};
  return st.position || { x: 0, y: 0, z: 0 };
}

/** Race progress score: lap * 1000 + progress01 (bigger = further along). */
export function progressScore(kart) {
  const st = kart.state || {};
  const lap = st.lap ?? kart.lap ?? 0;
  const prog = st.progress01 ?? kart.progress01 ?? 0;
  return lap * 1000 + prog;
}

/** Signed horizontal angle from vector a to vector b (radians, [-PI, PI]).
 *  Heading convention: h(v) = atan2(v.x, v.z); result = h(a) - h(b). */
export function signedAngle(a, b) {
  const cross = a.x * b.y - a.y * b.x;
  const dot = a.x * b.x + a.y * b.y;
  return Math.atan2(cross, dot);
}

// ---------------------------------------------------------------------------
// useItem — apply the held item's effect
// ---------------------------------------------------------------------------

/**
 * Apply the effect of kart.heldItem and consume it.
 * ctx = { scene, karts, raceManager, audio, particles, targetKart }
 * - scene: THREE.Scene to spawn projectiles into
 * - karts: all race karts (for homing targets / lightning victims)
 * - raceManager: used to register live items (addActiveItem) + particles/audio
 * - targetKart: preferred homing target (AI passes the player)
 * All audio/particle calls are optional-safe.
 */
export function useItem(kart, ctx = {}) {
  const type = kart.heldItem;
  if (!type) return;
  kart.heldItem = null; // consume immediately
  // AUDIT r4 (rear throw): main.js sets kart._rearThrow before releasing a
  // hold that crossed the arm threshold. Consumed here so it never leaks
  // into a later use (ctx.rear is the programmatic path — AI never sets it).
  const rear = !!(ctx.rear || kart._rearThrow);
  kart._rearThrow = false;
  const audio = ctx.audio;

  switch (type) {
    case PowerUpType.MUSHROOM:
      kart.applyBoost?.(CONFIG.items.mushroomBoostMs);
      audio?.play?.('boost');
      // Big-use juice (user: item use felt weak — the mushroom should POP).
      ctx.particles?.emit?.('boost', kartPosition(kart), { count: 18, speed: 8.5, size: 0.32 });
      ctx.particles?.emit?.('sparkle', kartPosition(kart), { count: 16, speed: 5, size: 0.28, color: 0xffd166 });
      break;

    case PowerUpType.SHELL: {
      const proj = new ShellProjectile(kart, { homing: false, rear, ...ctx });
      ctx.raceManager?.addActiveItem?.(proj);
      audio?.play?.('shell');
      ctx.particles?.emit?.('sparkle', kartPosition(kart), { count: 8, speed: 4, size: 0.22 });
      break;
    }

    case PowerUpType.RED_SHELL: {
      // Rear-thrown red shells home on the nearest rival BEHIND the shooter
      // (MK8D: backward reds punish chasers).
      const target = pickRedShellTarget(kart, ctx, rear);
      const proj = new ShellProjectile(kart, { homing: !!target, targetKart: target, rear, ...ctx });
      ctx.raceManager?.addActiveItem?.(proj);
      audio?.play?.('redShell');
      ctx.particles?.emit?.('sparkle', kartPosition(kart), { count: 8, speed: 4, size: 0.22 });
      break;
    }

    case PowerUpType.BLUE_SHELL: {
      // Spiny-style: homes in on the RACE LEADER (position 1). Un-dodgeable
      // pressure valve for tail-enders (MK8 blue-shell pillar).
      let leader = null;
      for (const k of ctx.karts || []) {
        if (k.finished) continue;
        if (!leader || k.position < leader.position) leader = k;
      }
      const proj = new ShellProjectile(kart, { homing: true, targetKart: leader, blue: true, rear, ...ctx });
      ctx.raceManager?.addActiveItem?.(proj);
      audio?.play?.('redShell');
      ctx.particles?.emit?.('sparkle', kartPosition(kart), { count: 12, speed: 5, size: 0.26, color: 0x1f3fc8 });
      break;
    }

    case PowerUpType.BANANA: {
      const banana = new Banana(kart, { ...ctx, rear });
      ctx.raceManager?.addActiveItem?.(banana);
      audio?.play?.('banana'); // cartoon boing (was generic 'useItem' blip)
      break;
    }

    case PowerUpType.STAR: {
      kart.setStarred?.(true);
      kart.applyBoost?.(CONFIG.items.starDurationMs);
      audio?.play?.('star');
      const fx = new StarEffect(kart, CONFIG.items.starDurationMs, ctx.raceManager);
      ctx.raceManager?.addActiveItem?.(fx);
      break;
    }

    case PowerUpType.LIGHTNING: {
      const karts = ctx.karts || [];
      for (const other of karts) {
        if (other === kart || other.finished) continue;
        if (other.starred || other.invincible) continue; // audit F4: invincible riders are protected
        other.applyScale?.(CONFIG.items.lightningScale, CONFIG.items.lightningDurationMs);
        // MK8-style: lightning knocks the held item away + a small hop
        // (audit v5 #4 — victims kept their shield AND had no shock animation).
        // AUDIT r3: knocks BOTH held slots (dual-slot) + triple stacks.
        if (other.heldItem) other.heldItem = null;
        other._heldItemCount = 1;
        if (other.heldItem2) other.heldItem2 = null;
        other._heldItem2Count = 1;
        other.state.vY = Math.max(other.state.vY ?? 0, 2.4);
        // Electric burst on each victim (art-bible: drama on hit).
        ctx.particles?.emit?.('lightning', kartPosition(other), { count: 18, speed: 7.5, size: 0.34 });
      }
      audio?.play?.('lightning');
      break;
    }

    default:
      break;
  }
}

/** Choose the homing target for a red shell: preferred target if it is ahead
 *  of the owner, otherwise the nearest rival ahead of the owner. With
 *  `behind` (rear throw, audit r4) it picks the nearest rival BEHIND the
 *  owner instead — backward reds hunt chasers, MK8D-style. */
function pickRedShellTarget(owner, ctx, behind = false) {
  const karts = ctx.karts || [];
  const preferred = ctx.targetKart;
  if (!behind && preferred && preferred !== owner && !preferred.finished && isAheadOf(owner, preferred)) {
    return preferred;
  }
  const opos = kartPosition(owner);
  const dir = headingVector(owner);
  let best = null;
  let bestD = Infinity;
  for (const k of karts) {
    if (k === owner || k.finished) continue;
    const p = kartPosition(k);
    const dx = p.x - opos.x;
    const dz = p.z - opos.z;
    const along = dx * dir.x + dz * dir.y; // positive = ahead of owner
    if (behind ? along >= 0 : along <= 0) continue;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

function isAheadOf(a, b) {
  return progressScore(b) - progressScore(a) > 0.001;
}

// ---------------------------------------------------------------------------
// ShellProjectile
// ---------------------------------------------------------------------------

/** A shell: green = straight, red = homing. Hits any kart (except the owner
 *  for the first 0.5s) within 1.0m → kart.hitShell(). Lifetime 8s, culled
 *  when it flies off the road. `rear` shells (hold-to-throw-back, audit r4)
 *  spawn at the kart tail and travel against its heading. */
export class ShellProjectile {
  constructor(ownerKart, opts = {}) {
    this.owner = ownerKart;
    this.homing = !!opts.homing;
    this.target = opts.targetKart || null;
    this.scene = opts.scene || null;
    this.raceManager = opts.raceManager || null;
    this.audio = opts.audio || this.raceManager?.audio || null;
    this.age = 0;
    this.life = 8; // seconds
    this.dead = false;
    this.speed = CONFIG.items.shellSpeed;
    this.rear = !!opts.rear;
    this.dir = headingVector(ownerKart);
    // Rear throws travel AGAINST the kart's heading (spawn lands at the tail
    // via the same offset math below — dir is already negated).
    if (this.rear) this.dir.multiplyScalar(-1);

    this.centerline = opts.centerline || this.raceManager?.centerline || null;
    this.spacing = opts.spacing || this.raceManager?.centerlineSpacing || 2.5;
    this._nearIdx = 0;
    this._offAccum = 0;

    const opos = kartPosition(ownerKart);
    const color = this.homing ? (opts.blue ? 0x1f3fc8 : 0xff3b3b) : 0x43d64b;
    this.blue = !!opts.blue;
    // AUDIT r4: blue shell ARC — the spiny flies HIGH with a ground shadow
    // warning before diving on the leader (MK8 drama, no more blue-painted
    // red shell). Resets on construction; the update() below drives it.
    this._arcT = 0;
    this._vY = 0;
    this._descended = false;
    this._shadow = null;
    this.mesh = buildShellMesh(color);
    this.mesh.position.set(
      opos.x + this.dir.x * 1.5,
      opos.y + 0.35,
      opos.z + this.dir.y * 1.5
    );
    this.mesh.rotation.y = Math.atan2(this.dir.x, this.dir.y);
    this.mesh.castShadow = true;
    this.scene?.add(this.mesh);
  }

  update(dt, karts) {
    this.age += dt;
    if (this.age > this.life) {
      this.die();
      return;
    }
    // AUDIT r5 (CRITICAL FIX): `m` was declared AFTER the blue-arc block —
    // a thrown blue shell hit the TDZ and threw ReferenceError every frame
    // for its whole lifetime (froze the race). Hoisted here.
    const m = this.mesh;

    // Homing: steer toward the target kart at shellHomingTurnRate.
    if (this.homing && this.target && !this.target.finished) {
      const tp = kartPosition(this.target);
      const dx = tp.x - this.mesh.position.x;
      const dz = tp.z - this.mesh.position.z;
      const dl = Math.hypot(dx, dz) || 1;
      const desired = { x: dx / dl, y: dz / dl };
      const err = signedAngle(this.dir, desired); // h_dir - h_desired
      const maxTurn = CONFIG.items.shellHomingTurnRate * dt;
      const delta = THREE.MathUtils.clamp(-err, -maxTurn, maxTurn);
      this._rotateDir(delta);
    }

    // Blue shell ARC phase (audit r4): fly high toward the leader with a
    // ground shadow warning, then dive. Ground-homing only after descent.
    if (this.blue && !this._descended) {
      this._arcT += dt;
      if (!this._shadow) {
        this._shadow = new THREE.Mesh(
          new THREE.CircleGeometry(0.95, 20),
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false })
        );
        this._shadow.rotation.x = -Math.PI / 2;
        this._shadow.renderOrder = 5;
        this.scene?.add(this._shadow);
      }
      const leader = (this.target && !this.target.finished) ? this.target : (karts || []).find((k) => !k.finished && !k.invincible);
      if (leader) {
        const tp = kartPosition(leader);
        const dx = tp.x - m.position.x;
        const dz = tp.z - m.position.z;
        const dl = Math.hypot(dx, dz) || 1;
        const err = signedAngle(this.dir, { x: dx / dl, y: dz / dl });
        this._rotateDir(THREE.MathUtils.clamp(-err, -1.6 * dt, 1.6 * dt));
      }
      m.position.x += this.dir.x * this.speed * 1.7 * dt;
      m.position.z += this.dir.y * this.speed * 1.7 * dt;
      if (this._arcT < 0.12) this._vY = CONFIG.items.blueShellLift; // launch pop
      this._vY -= CONFIG.items.blueShellGravity * dt;
      m.position.y += this._vY * dt;
      if (this._shadow) this._shadow.position.set(m.position.x, 0.05, m.position.z);
      // Descend when falling back near the ground — switch to the normal
      // homing dive (the shadow warning has done its job).
      if (m.position.y <= 3.4 && this._arcT > 0.9) {
        this._descended = true;
        if (this._shadow) { this.scene?.remove(this._shadow); this._shadow = null; }
        m.position.y = 1.2;
      }
      return;
    }

    // Advance along current heading (m hoisted above the homing block).
    m.position.x += this.dir.x * this.speed * dt;
    m.position.z += this.dir.y * this.speed * dt;
    m.rotation.y = Math.atan2(this.dir.x, this.dir.y);

    // Green shell follows the racing line (MK8 behavior): steer toward the
    // nearest centerline tangent so it hugs the track instead of flying off
    // in a straight line and dying in the off-track culling — the classic
    // "shell does nothing" bug. Rear shells fly straight back instead.
    if (!this.homing && !this.rear && this.centerline && this.centerline.length) {
      const cl = this.centerline;
      const n = cl.length;
      let best = this._nearIdx;
      let bestD = Infinity;
      for (let i = this._nearIdx - 6; i <= this._nearIdx + 6; i++) {
        const j = ((i % n) + n) % n;
        const q = cl[j];
        const ddx = q.x - m.position.x;
        const ddz = q.z - m.position.z;
        const d = ddx * ddx + ddz * ddz;
        if (d < bestD) { bestD = d; best = j; }
      }
      this._nearIdx = best;
      const p0 = cl[best];
      const p1 = cl[(best + 1) % n];
      const tdx = p1.x - p0.x;
      const tdz = p1.z - p0.z;
      const tl = Math.hypot(tdx, tdz) || 1;
      const desired = { x: tdx / tl, y: tdz / tl };
      const err = signedAngle(this.dir, desired);
      const maxTurn = 2.4 * dt; // gentle — hugs wide corners without snaking
      const delta = THREE.MathUtils.clamp(-err, -maxTurn, maxTurn);
      this._rotateDir(delta);
    }

    // Collision with karts (radius 2.0 — a shell that passes near a kart
    // counts; 1.0 required near-perfect aim and felt like it "did nothing").
    const list = karts || [];
    for (const k of list) {
      if (k === this.owner && this.age < 0.5) continue; // spawn grace
      if (k.finished) continue;
      const p = kartPosition(k);
      const dx = p.x - m.position.x;
      const dz = p.z - m.position.z;
      if (dx * dx + dz * dz < 4.0) {
        this._hit(k, p);
        return;
      }
    }

    // Cull when it leaves the road (throttled check).
    if (this.centerline && this.centerline.length) {
      this._offAccum += dt;
      if (this._offAccum >= 0.15) {
        this._offAccum = 0;
        if (this._isOffTrack()) this.die();
      }
    }
  }

  _rotateDir(delta) {
    const c = Math.cos(delta);
    const s = Math.sin(delta);
    const x = this.dir.x * c + this.dir.y * s;
    const y = -this.dir.x * s + this.dir.y * c;
    this.dir.set(x, y);
  }

  _hit(victim, pos) {
    this.raceManager?.particles?.emit?.('explosion', new THREE.Vector3(pos.x, pos.y + 0.6, pos.z));
    victim?.hitShell?.({ blue: !!this.blue }); // blue shells bypass item-hold (audit v4)
    this.audio?.play?.('crash');
    this.die();
  }

  _isOffTrack() {
    const cl = this.centerline;
    const n = cl.length;
    const m = this.mesh.position;
    let best = this._nearIdx;
    let bestD = Infinity;
    const r = 8;
    for (let i = this._nearIdx - r; i <= this._nearIdx + r; i++) {
      const j = ((i % n) + n) % n;
      const p = cl[j];
      const dx = p.x - m.x;
      const dz = p.z - m.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    this._nearIdx = best;
    const limit = CONFIG.track.roadWidth * 1.8;
    return bestD > limit * limit;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.scene?.remove(this.mesh);
    // AUDIT r4: drop the arc shadow if it died mid-flight (e.g. timeout).
    if (this._shadow) { this.scene?.remove(this._shadow); this._shadow = null; }
  }

  dispose() {
    disposeObject(this.mesh);
  }
}

// ---------------------------------------------------------------------------
// Banana
// ---------------------------------------------------------------------------

/** A banana dropped behind the owner. Collision → kart.hitBanana() (spin-out).
 *  Fades out after 25s so stale hazards don't linger forever. `rear` drops
 *  (hold-to-throw-back, audit r4) land further back so they read as thrown. */
export class Banana {
  constructor(ownerKart, opts = {}) {
    this.owner = ownerKart;
    this.scene = opts.scene || null;
    this.raceManager = opts.raceManager || null;
    this.audio = opts.audio || this.raceManager?.audio || null;
    this.age = 0;
    this.life = 25;
    this.dead = false;

    this.centerline = opts.centerline || this.raceManager?.centerline || null;
    this.spacing = opts.spacing || this.raceManager?.centerlineSpacing || 2.5;
    this._nearIdx = 0;
    this._offAccum = 0;

    const opos = kartPosition(ownerKart);
    const drop = opts.rear ? -2.2 : -1.5; // rear drops land further behind
    const behind = headingVector(ownerKart).multiplyScalar(drop);
    this.mesh = buildBananaMesh();
    this.mesh.position.set(opos.x + behind.x, opos.y + 0.3, opos.z + behind.y);
    this.mesh.rotation.y = Math.random() * Math.PI * 2;
    this.mesh.castShadow = true;
    this.scene?.add(this.mesh);
  }

  update(dt, karts) {
    this.age += dt;
    if (this.age > this.life) {
      this.die();
      return;
    }
    // Blink in the final seconds as a fair-play warning.
    if (this.age > this.life - 2.5) {
      this.mesh.visible = Math.floor(this.age * 6) % 2 === 0;
    }

    const m = this.mesh;
    const radius = CONFIG.items.bananaRadius;
    const rr = radius * radius;
    const list = karts || [];
    for (const k of list) {
      if (k === this.owner && this.age < 0.5) continue; // spawn grace
      if (k.finished) continue;
      const p = kartPosition(k);
      const dx = p.x - m.position.x;
      const dz = p.z - m.position.z;
      if (dx * dx + dz * dz < rr) {
        k.hitBanana?.();
        this.audio?.play?.('crash');
        this.die();
        return;
      }
    }

    // Cull bananas that end up far off the road (throttled).
    if (this.centerline && this.centerline.length) {
      this._offAccum += dt;
      if (this._offAccum >= 0.5) {
        this._offAccum = 0;
        if (this._isOffTrack()) this.die();
      }
    }
  }

  _isOffTrack() {
    const cl = this.centerline;
    const n = cl.length;
    const m = this.mesh.position;
    let best = this._nearIdx;
    let bestD = Infinity;
    const r = 8;
    for (let i = this._nearIdx - r; i <= this._nearIdx + r; i++) {
      const j = ((i % n) + n) % n;
      const p = cl[j];
      const dx = p.x - m.x;
      const dz = p.z - m.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    this._nearIdx = best;
    const limit = CONFIG.track.roadWidth * 2.0;
    return bestD > limit * limit;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.scene?.remove(this.mesh);
  }

  dispose() {
    disposeObject(this.mesh);
  }
}

// ---------------------------------------------------------------------------
// StarEffect — rainbow trail + timed expiry
// ---------------------------------------------------------------------------

/** Drives the star power-up lifecycle: emits starTrail particles while active
 *  and flips kart.setStarred(false) when the duration elapses. */
export class StarEffect {
  constructor(ownerKart, durationMs, raceManager) {
    this.owner = ownerKart;
    this.remaining = durationMs;
    this.raceManager = raceManager || null;
    this.dead = false;
    this._trailAccum = 0;
  }

  update(dt) {
    this.remaining -= dt * 1000;
    if (this.remaining <= 0) {
      this.owner.setStarred?.(false);
      this.dead = true;
      return;
    }
    this._trailAccum -= dt;
    if (this._trailAccum <= 0) {
      this._trailAccum = 0.045;
      const p = kartPosition(this.owner);
      this.raceManager?.particles?.emit?.('starTrail', new THREE.Vector3(p.x, p.y + 0.7, p.z));
    }
  }

  dispose() {
    // no mesh to clean up
  }
}

// ---------------------------------------------------------------------------
// Visual builders
// ---------------------------------------------------------------------------

function buildShellMesh(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshToonMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.25,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), bodyMat);
  body.scale.set(1, 0.85, 1.5);
  g.add(body);

  const spikeMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.15,
  });
  const spikeGeo = new THREE.ConeGeometry(0.09, 0.26, 6);
  for (let i = 0; i < 3; i++) {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.position.set((i - 1) * 0.26, 0.3, 0);
    g.add(spike);
  }
  return g;
}

function buildBananaMesh() {
  const g = new THREE.Group();
  const peelMat = new THREE.MeshToonMaterial({
    color: 0xffd23f,
    emissive: 0xffaa00,
    emissiveIntensity: 0.15,
  });
  // Bent tube laid flat on the road (torus arc rotated into the XZ plane).
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.11, 8, 14, Math.PI * 1.15), peelMat);
  arc.rotation.x = Math.PI / 2;
  g.add(arc);

  const tipMat = new THREE.MeshToonMaterial({ color: 0xd99a26 });
  const tip1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), tipMat);
  tip1.position.set(0.26, 0.05, 0.1);
  g.add(tip1);
  const tip2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), tipMat);
  tip2.position.set(-0.23, 0.05, -0.1);
  g.add(tip2);
  return g;
}

/** Dispose geometry + materials of an Object3D subtree. */
export function disposeObject(obj) {
  obj?.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose?.();
    const mats = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
    for (const m of mats) {
      if (m && typeof m.dispose === 'function') m.dispose();
    }
  });
}
