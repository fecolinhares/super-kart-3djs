/**
 * Super Kart 3D.js — Kart entity.
 * AAA cartoon kart: low wide toon-shaded chassis with dark inverted-hull
 * outlines, 4 wheels (spin + front steering), cockpit + windshield, spoiler,
 * exhaust pipes, and a chibi driver (round head, big eyes, kart-color helmet).
 * Owns the kart's visual state + effect timers; delegates movement to
 * KartPhysics.step(). Emits juice particles (exhaust / boost flame / drift
 * smoke / star trail / off-road dust) via ctx.particles.
 *
 * Group origin sits at ground contact (y = 0 = road), so squash & stretch
 * scales up from the wheels — the classic cartoon deformation.
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import * as Materials from '../render/Materials.js';
import { KartPhysics } from './KartPhysics.js';

const OUTLINE = 0x1b2a41;

export class Kart {
  /**
   * @param {object} opts
   * @param {number} opts.color         — kart body color (hex); wins over character.color when given
   * @param {object} opts.character     — identity from CONFIG.kart.characters
   *   {name, color, suitColor, helmetColor, accentColor, stats}
   * @param {boolean} opts.isPlayer     — player kart?
   * @param {THREE.Vector3} opts.startPosition
   * @param {number} opts.startHeading  — radians
   */
  constructor({ color, isPlayer = false, number = 1, startPosition, startHeading = 0, character = null }) {
    this.isPlayer = isPlayer;
    this.number = number;
    this.character = character;
    this.characterName = character ? character.name : null;
    // Save the grid position/heading — Kart.restart() relies on them to
    // actually reset the race (was missing → restart "continued where it left").
    this.startPosition = startPosition ? startPosition.clone() : new THREE.Vector3();
    this.startHeading = startHeading;
    this.group = new THREE.Group();
    this.group.name = isPlayer ? 'kart-player' : 'kart-ai';

    this.rideHeight = CONFIG.kart.wheelRadius + 0.04;
    this.state = {
      speed: 0,
      position: (startPosition ? startPosition.clone() : new THREE.Vector3()),
      heading: startHeading,
      drifting: false,
      driftCharge: 0,
      boost: false,
      turboBoostMs: 0, // turbo pad boost timer (ms); KartPhysics sets, _tickEffects drains
      offRoad: false,
      spinOut: false,
      lap: 0,
      progress01: 0,
      finished: false,
      vY: 0,
    };

    // RaceManager-owned (contract)
    this.finished = false;
    this.position = 0; // race rank
    this.totalTime = 0;
    this.heldItem = null;

    // effect flags / timers (ms)
    this.invincible = false;
    this.starred = false;
    this._boostMs = 0;
    this._starMs = 0;
    this._invMs = 0;
    this._invCount = 0;
    this._spinMs = 0;
    this._spinDir = 1;

    // physics private state (mutated by KartPhysics)
    this._scaleTarget = 1;
    this._scaleMs = 0;
    this._latVel = 0;
    this._airTime = 0;
    this._nudgeVel = new THREE.Vector3();
    this._lastProgress = 0;
    this._sampleIndex = 0;
    this._samples = null;
    this._prevY = 0;
    this._bounce = 0;
    this._bounceTimer = 0;
    this._startDir = new THREE.Vector3(0, 0, 1);

    this._controls = { steer: 0, throttle: false, brake: false, drift: false, useItem: false };
    this._steerTarget = 0;

    // particle emitters (local-space offsets, manual world transform — no matrix dependency)
    this._pipeOffset = new THREE.Vector3(0, this.rideHeight + 0.16, -0.94);
    this._exhaustAcc = 0;
    this._driftAcc = 0;
    this._dustAcc = 0;
    this._starAcc = 0;
    this._sideFlip = 1;
    this._t = 0;

    // scratch (no per-frame allocation)
    this._v = new THREE.Vector3();
    this._pv = new THREE.Vector3();
    this._back = new THREE.Vector3();
    this._side = new THREE.Vector3();
    this._starColor = new THREE.Color();

    // Body color: explicit `color` opt wins (menu picker); otherwise the
    // character's identity color, falling back to the classic default.
    const bodyColor = color !== undefined ? color : (character ? character.color : 0xff5a5f);
    this._buildMesh(bodyColor, character);

    this.group.position.copy(this.state.position);
    this.group.rotation.y = startHeading;
  }

  // ---- construction -------------------------------------------------------

  _mat(color, opts = {}) {
    if (typeof Materials.toonMaterial === 'function') return Materials.toonMaterial(color, opts);
    return new THREE.MeshToonMaterial({ color, gradientMap: this._gradientTexture(), ...opts });
  }

  _gradientTexture() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 1;
      const g = canvas.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 4, 0);
      grad.addColorStop(0, '#4a4a4a');
      grad.addColorStop(0.5, '#9a9a9a');
      grad.addColorStop(1, '#ffffff');
      g.fillStyle = grad;
      g.fillRect(0, 0, 4, 1);
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      return tex;
    } catch {
      return null; // no DOM (node smoke tests) — MeshToonMaterial default gradient
    }
  }

  _outline(mesh) {
    if (typeof Materials.cartoonOutline === 'function') {
      Materials.cartoonOutline(mesh, OUTLINE, 0.05);
      return;
    }
    // fallback: inverted hull
    const hull = new THREE.Mesh(
      mesh.geometry.clone(),
      new THREE.MeshBasicMaterial({ color: OUTLINE, side: THREE.BackSide })
    );
    hull.scale.setScalar(1.05);
    hull.castShadow = false;
    mesh.add(hull);
  }

  _mesh(geo, mat, x, y, z, { cast = true, rx = 0, ry = 0, rz = 0, parent } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = cast;
    (parent || this.group).add(m);
    return m;
  }

  _buildMesh(color, character) {
    const KC = CONFIG.kart;

    // Soft blob shadow under the kart (cartoon contact shadow). depthWrite off
    // + polygonOffset so it never z-fights the asphalt.
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 18),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    blob.renderOrder = 1;
    this.group.add(blob);

    const body = this._mat(color);
    const bodyDark = this._mat(new THREE.Color(color).multiplyScalar(0.82).getHex());
    // keep refs so the player can repaint (setBodyColor)
    this._bodyMat = body;
    this._bodyDarkMat = bodyDark;
    const dark = this._mat(0x2a2f3a);
    const tire = this._mat(0x232830);
    const hub = this._mat(0xdfe6ee);
    const white = this._mat(0xf4f6f8);
    const skin = this._mat(0xffd9b3);
    const glass = this._mat(0xbfe8ff, { transparent: true, opacity: 0.35 });
    const steel = this._mat(0x5a6472);
    const tip = this._mat(0xff9f45);

    // ---- chassis ------------------------------------------------------------
    const chassis = this._mesh(
      new THREE.BoxGeometry(KC.chassisLength * 0.92, 0.34, KC.chassisWidth),
      body,
      0, KC.wheelRadius + 0.3, 0
    );
    this._outline(chassis);

    // Rounded hood (sphere squashed) — breaks the flat box silhouette so the
    // kart reads as a molded body, not a crate (MK8-style).
    const hood = this._mesh(
      new THREE.SphereGeometry(0.42, 18, 12),
      body,
      0, KC.wheelRadius + 0.34, 0.3
    );
    hood.scale.set(1.2, 0.62, 1.35);
    this._outline(hood);

    // nose cone (rounded tip pointing forward — classic kart nose)
    const noseCone = this._mesh(
      new THREE.ConeGeometry(0.3, 0.8, 10),
      bodyDark,
      0, KC.wheelRadius + 0.24, 1.0,
      { rx: Math.PI / 2 }
    );
    this._outline(noseCone);

    // front bumper (rounded via cylinder)
    this._mesh(
      new THREE.CylinderGeometry(0.17, 0.2, KC.chassisWidth * 0.96, 14),
      dark,
      0, 0.42, 1.02,
      { rx: Math.PI / 2 }
    );
    // headlights
    this._mesh(new THREE.SphereGeometry(0.075, 10, 8), white, -0.2, 0.46, 1.02);
    this._mesh(new THREE.SphereGeometry(0.075, 10, 8), white, 0.2, 0.46, 1.02);

    // cockpit + windshield + seat
    const cockpit = this._mesh(
      new THREE.BoxGeometry(0.78, 0.26, 0.62),
      body,
      0, KC.wheelRadius + 0.62, -0.12
    );
    this._outline(cockpit);
    this._mesh(new THREE.BoxGeometry(0.64, 0.2, 0.04), glass, 0, 1.04, 0.3, { rx: -0.28, cast: false });
    this._mesh(new THREE.BoxGeometry(0.5, 0.44, 0.07), bodyDark, 0, 0.98, -0.44);

    // Race number plate on the nose (kart identity).
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 128;
    numCanvas.height = 128;
    const nctx = numCanvas.getContext('2d');
    nctx.fillStyle = '#ffffff';
    nctx.fillRect(0, 0, 128, 128);
    nctx.fillStyle = '#1b2a41';
    nctx.font = 'bold 80px sans-serif';
    nctx.textAlign = 'center';
    nctx.textBaseline = 'middle';
    nctx.fillText(String(this.number), 64, 68);
    const numTex = new THREE.CanvasTexture(numCanvas);
    numTex.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.36, 0.07),
      new THREE.MeshToonMaterial({ color: 0xffffff })
    );
    plate.material.map = numTex;
    plate.position.set(0, KC.wheelRadius + 0.5, 0.72);
    plate.rotation.x = -0.2;
    this.group.add(plate);

    // Rear number plate (visible from the chase camera).
    const plateBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.4, 0.06),
      new THREE.MeshToonMaterial({ color: 0xffffff })
    );
    plateBack.material.map = numTex;
    plateBack.position.set(0, KC.wheelRadius + 0.62, -0.9);
    plateBack.rotation.x = 0.12;
    this.group.add(plateBack);

    // hood racing stripes
    this._mesh(new THREE.BoxGeometry(0.05, 0.03, 0.7), white, -0.17, 0.835, 0.12, { cast: false });
    this._mesh(new THREE.BoxGeometry(0.05, 0.03, 0.7), white, 0.17, 0.835, 0.12, { cast: false });

    // fenders over the wheels
    const fy = KC.wheelRadius + 0.12;
    const fz = KC.chassisLength / 2 - 0.16;
    const fx = KC.chassisWidth / 2 + 0.1;
    for (const s of [-1, 1]) {
      this._mesh(new THREE.BoxGeometry(0.46, 0.16, 0.3), bodyDark, s * fx, fy, fz);
      this._mesh(new THREE.BoxGeometry(0.46, 0.16, 0.3), bodyDark, s * fx, fy, -fz);
    }

    // spoiler
    const wing = this._mesh(
      new THREE.BoxGeometry(0.06, 0.22, 1.06),
      body,
      0, 1.08, -0.92
    );
    this._outline(wing);
    this._mesh(new THREE.BoxGeometry(0.06, 0.34, 0.06), dark, -0.3, 0.86, -0.84);
    this._mesh(new THREE.BoxGeometry(0.06, 0.34, 0.06), dark, 0.3, 0.86, -0.84);

    // exhaust pipes (+ orange tips)
    for (const s of [-1, 1]) {
      this._mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.26, 10),
        steel, s * 0.22, 0.52, -0.94,
        { rx: Math.PI / 2, cast: false }
      );
      this._mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10),
        tip, s * 0.22, 0.52, -1.06,
        { rx: Math.PI / 2, cast: false }
      );
    }

    // ---- wheels -------------------------------------------------------------
    const wR = KC.wheelRadius;
    const wW = KC.wheelWidth;
    const wy = wR;
    const wz = KC.chassisLength / 2 - 0.18;
    const wx = KC.chassisWidth / 2 + 0.18;
    const tireGeo = new THREE.CylinderGeometry(wR, wR, wW, 16);
    const hubGeo = new THREE.CylinderGeometry(0.13, 0.13, wW + 0.02, 12);
    const rimGeo = new THREE.TorusGeometry(wR - 0.03, 0.022, 6, 18);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const root = new THREE.Group();
        root.position.set(sx * wx, wy, sz * wz);
        this.group.add(root);
        const spin = new THREE.Group(); // rolls around kart X axis
        root.add(spin);
        // CylinderGeometry's axis is Y; tilt the wheel so its axle runs
        // along X (lateral). Without this the tire stood upright and spun
        // sideways — the "lying wheels rolling laterally" bug.
        const tilt = new THREE.Group();
        tilt.rotation.z = Math.PI / 2;
        spin.add(tilt);
        tilt.add(new THREE.Mesh(tireGeo, tire));
        tilt.add(new THREE.Mesh(hubGeo, hub));
        // Rim (torus) is a DIRECT child of spin, rotated so its axis is X —
        // concentric with the tilted tire. As a child of tilt it kept its Z
        // axis and rolled sideways like a spinning coin.
        const rim = new THREE.Mesh(rimGeo, hub);
        rim.rotation.y = Math.PI / 2;
        rim.castShadow = false;
        spin.add(rim);
        this._wheels = this._wheels || [];
        this._wheels.push({ root, spin, isFront: sz > 0 });
      }
    }
    this._frontWheels = this._wheels.filter((w) => w.isFront);

    // ---- driver (chibi: round head, big eyes, kart-color helmet) -------------
    const drv = new THREE.Group();
    drv.position.set(0, 0, 0);
    // Slightly oversized chibi driver (MK8 proportions: the racer is a big
    // part of the kart silhouette, not a dot behind the wheel).
    drv.scale.set(1.18, 1.18, 1.18);
    this.group.add(drv);

    // torso + arms reaching to the wheel (raised so the driver is visible
    // above the cockpit — the original was hidden behind the seat).
    // Racing suit recolored by the character identity (falls back to white).
    const suit = character ? this._mat(character.suitColor) : white;
    this._mesh(new THREE.CapsuleGeometry(0.14, 0.3, 6, 12), suit, 0, 0.94, -0.02, { parent: drv });
    for (const s of [-1, 1]) {
      this._mesh(
        new THREE.CapsuleGeometry(0.05, 0.24, 4, 8),
        suit, s * 0.15, 0.98, 0.1,
        { parent: drv, rx: 1.15 }
      );
      this._mesh(new THREE.SphereGeometry(0.05, 10, 8), skin, s * 0.15, 0.86, 0.2, { parent: drv, cast: false });
    }
    // steering wheel
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.022, 8, 18),
      dark
    );
    wheel.position.set(0, 0.9, 0.26);
    wheel.rotation.y = Math.PI;
    wheel.castShadow = false;
    drv.add(wheel);

    // head + face (bigger, higher, pushed forward — readable from behind)
    this._mesh(new THREE.SphereGeometry(0.17, 20, 16), skin, 0, 1.2, 0.1, { parent: drv });
    // Helmet recolored per character (own material so setBodyColor can still
    // repaint it alongside the body — classic menu color picker behavior).
    const helmetMat = character ? this._mat(character.helmetColor) : body;
    this._helmetMat = helmetMat;
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.175, 20, 16),
      helmetMat
    );
    helmet.position.set(0, 1.3, -0.02);
    helmet.scale.set(1, 0.8, 1);
    helmet.castShadow = true;
    drv.add(helmet);
    this._outline(helmet);
    this._mesh(new THREE.TorusGeometry(0.175, 0.02, 6, 18), bodyDark, 0, 1.2, -0.02, { parent: drv, rx: Math.PI / 2, cast: false });
    // Helmet accent stripe — the character's color mark instead of a name
    // decal (no text): a thin ring around the helmet equator, proud of the
    // shell so it reads from the chase camera.
    if (character) {
      this._mesh(
        new THREE.TorusGeometry(0.178, 0.02, 6, 24),
        this._mat(character.accentColor),
        0, 1.3, -0.02,
        { parent: drv, rx: Math.PI / 2, cast: false }
      );
    }

    for (const s of [-1, 1]) {
      this._mesh(new THREE.SphereGeometry(0.055, 10, 8), 0xffffff, s * 0.068, 1.24, 0.22, { parent: drv, cast: false });
      this._mesh(new THREE.SphereGeometry(0.026, 8, 6), 0x1b2a41, s * 0.068, 1.24, 0.26, { parent: drv, cast: false });
      this._mesh(new THREE.SphereGeometry(0.01, 6, 4), 0xffffff, s * 0.068 + 0.012, 1.245, 0.273, { parent: drv, cast: false });
    }
  }

  // ---- public API -----------------------------------------------------------

  setControls({ steer, throttle, brake, drift, useItem } = {}) {
    if (steer !== undefined) this._steerTarget = THREE.MathUtils.clamp(steer, -1, 1);
    if (throttle !== undefined) this._controls.throttle = !!throttle;
    if (brake !== undefined) this._controls.brake = !!brake;
    if (drift !== undefined) this._controls.drift = !!drift;
    if (useItem !== undefined) this._controls.useItem = !!useItem;
  }

  /**
   * Repaint the player kart body (menu color picker).
   * @param {number} color — 0xRRGGBB
   */
  setBodyColor(color) {
    if (!this._bodyMat) return;
    this._bodyMat.color.setHex(color);
    this._bodyDarkMat.color.setHex(new THREE.Color(color).multiplyScalar(0.82).getHex());
    // helmet matches body color too (chibi driver)
    if (this._helmetMat) this._helmetMat.color.setHex(color);
  }

  /** Convenience read of the latest input (used by power-ups / AI tooling). */
  get input() {
    return this._controls;
  }

  /** Full reset for race restart — position, heading, timers, progress. */
  restart() {
    const s = this.state;
    if (this.startPosition) s.position.copy(this.startPosition);
    if (typeof this.startHeading === 'number') s.heading = this.startHeading;
    s.speed = 0;
    s.lap = 0;
    s.progress01 = 0;
    s.drifting = false;
    s.driftCharge = 0;
    s.boost = false;
    s.turboBoostMs = 0;
    s.offRoad = false;
    s.spinOut = false;
    s.finished = false;
    s.vY = 0;
    this.finished = false;
    this.totalTime = null;
    this.position = 0;
    this.heldItem = null;
    this.invincible = false;
    this.starred = false;
    this._boostMs = 0;
    this._starMs = 0;
    this._invMs = 0;
    this._spinMs = 0;
    this._scaleMs = 0;
    this._scaleTarget = 1;
    this._latVel = 0;
    this._nudgeVel.set(0, 0, 0);
    this._lastProgress = 0; // avoids a phantom lap on restart
    this._controls = { steer: 0, throttle: false, brake: false, drift: false, useItem: false };
    this._steerTarget = 0;
    this.group.position.copy(s.position);
    this.group.rotation.set(0, s.heading, 0);
    this.group.scale.set(1, 1, 1);
  }

  get progress01() {
    return this.state.progress01;
  }

  get lap() {
    return this.state.lap;
  }

  /** Drift mini-boost, mushroom, star, etc. */
  applyBoost(durationMs) {
    this._boostMs = Math.max(this._boostMs, durationMs);
    this._scaleTarget = 1.06; // stretch
    this._scaleMs = Math.max(this._scaleMs, 420);
  }

  /** Star: invincible + long boost + rainbow trail. */
  setStarred(b) {
    this.starred = !!b;
    if (b) {
      this.setInvincible(true, CONFIG.items.starDurationMs);
      this._starMs = Math.max(this._starMs, CONFIG.items.starDurationMs);
      this.applyBoost(CONFIG.items.starDurationMs);
    }
  }

  /** Lightning shrink / growth juice. */
  applyScale(scale, durationMs) {
    this._scaleTarget = scale;
    this._scaleMs = Math.max(this._scaleMs, durationMs);
  }

  /** Banana: spin-out. No-op while invincible. */
  hitBanana() {
    if (this.invincible) return;
    this._spinMs = 1500;
    this._spinDir = Math.random() < 0.5 ? -1 : 1;
    this.state.speed *= 0.3;
    this._scaleTarget = 0.92;
    this._scaleMs = Math.max(this._scaleMs, 300);
  }

  /** Shell: heavier crash — spin-out + hop + lateral shove. */
  hitShell() {
    if (this.invincible) return;
    this._spinMs = 2100;
    this._spinDir = Math.random() < 0.5 ? -1 : 1;
    this.state.speed *= 0.12;
    this.state.vY = 3.2; // pop up, gravity brings it down
    this._nudgeVel.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(5);
    this._scaleTarget = 0.9;
    this._scaleMs = Math.max(this._scaleMs, 380);
  }

  /** Invincibility (ref-counted so star + item invincibility can overlap). */
  setInvincible(b, durationMs = 2500) {
    if (b) {
      this._invCount += 1;
      this._invMs = Math.max(this._invMs, durationMs);
      this.invincible = true;
    } else {
      this._invCount = Math.max(0, this._invCount - 1);
      if (this._invCount === 0) {
        this.invincible = false;
        this._invMs = 0;
      }
    }
  }

  /** Directional impulse (shell knock, explosion push). dir: world Vector3. */
  nudge(dir) {
    if (!dir) return;
    this._nudgeVel.copy(dir).setY(0);
    if (this._nudgeVel.lengthSq() > 0.001) this._nudgeVel.normalize().multiplyScalar(5.5);
    this.state.speed *= 0.9;
  }

  /** Reset for race restarts (RaceManager may also rebuild karts directly). */
  reset(position, heading = 0) {
    this.state.speed = 0;
    this.state.vY = 0;
    this.state.drifting = false;
    this.state.driftCharge = 0;
    this.state.boost = false;
    this.state.turboBoostMs = 0;
    this.state.offRoad = false;
    this.state.spinOut = false;
    this.state.lap = 0;
    this.state.progress01 = 0;
    this.state.finished = false;
    this.finished = false;
    this.position = 0;
    this.totalTime = 0;
    this.heldItem = null;
    this._boostMs = 0;
    this._starMs = 0;
    this._spinMs = 0;
    this._scaleTarget = 1;
    this._scaleMs = 0;
    this._latVel = 0;
    this._airTime = 0;
    this._nudgeVel.set(0, 0, 0);
    this._lastProgress = 0;
    this._bounce = 0;
    if (position) this.state.position.copy(position);
    this.state.heading = heading;
    this.group.position.copy(this.state.position);
    this.group.rotation.y = heading;
    this.group.scale.set(1, 1, 1);
  }

  // ---- per-frame update ------------------------------------------------------

  update(dt, ctx = {}) {
    this._t += dt;
    const s = this.state;
    this._tickEffects(dt);

    if (ctx.track) {
      if (ctx.track.startLine && ctx.track.startLine.direction) {
        this._startDir.set(ctx.track.startLine.direction.x, 0, ctx.track.startLine.direction.z).normalize();
      }
      // Smooth steering (avoids jerky snap on input / AI corrections).
      this._controls.steer = THREE.MathUtils.lerp(
        this._controls.steer,
        this._steerTarget,
        Math.min(1, 9 * dt)
      );
      KartPhysics.step(this, this._controls, dt, ctx.track);
    }
    s.finished = this.finished;

    // sync transform
    this.group.position.copy(s.position);
    this.group.rotation.y = s.heading;

    // lean into turns, nose-up on accel
    const speed01 = Math.min(1, Math.abs(s.speed) / CONFIG.physics.maxSpeed);
    const steerVis = this._controls.steer * speed01;
    const rollTarget = -steerVis * 0.09 - (s.drifting ? this._controls.steer * 0.035 : 0);
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, rollTarget, Math.min(1, 6 * dt));
    const pitchTarget = s.spinOut ? 0 : (this._controls.throttle ? 0.05 : (this._controls.brake ? -0.04 : 0));
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, pitchTarget, Math.min(1, 5 * dt));

    this._animateWheels(dt);
    if (ctx.particles) this._emitParticles(ctx.particles, dt);
  }

  _tickEffects(dt) {
    const s = this.state;
    const ms = dt * 1000;

    if (this._boostMs > 0) {
      this._boostMs = Math.max(0, this._boostMs - ms);
      // keep a gentle stretch while boosting
      if (this._scaleMs < 250) {
        this._scaleTarget = 1.05;
        this._scaleMs = 250;
      }
    }
    s.boost = this._boostMs > 0;

    // Turbo pad boost (set by KartPhysics when crossing a pad).
    if (s.turboBoostMs > 0) {
      s.turboBoostMs = Math.max(0, s.turboBoostMs - ms);
    }

    if (this._starMs > 0) {
      this._starMs = Math.max(0, this._starMs - ms);
      if (this._starMs <= 0) this.starred = false;
    }
    if (this._invMs > 0) {
      this._invMs = Math.max(0, this._invMs - ms);
      if (this._invMs <= 0) {
        this._invMs = 0;
        this._invCount = 0;
        this.invincible = false;
      }
    }
    if (this._spinMs > 0) {
      this._spinMs = Math.max(0, this._spinMs - ms);
      s.spinOut = this._spinMs > 0;
    } else {
      s.spinOut = false;
    }
    if (this._scaleMs > 0) {
      this._scaleMs = Math.max(0, this._scaleMs - ms);
      if (this._scaleMs <= 0) this._scaleTarget = 1;
    }
  }

  _animateWheels(dt) {
    const spin = (this.state.speed / CONFIG.kart.wheelRadius) * dt;
    for (const w of this._wheels) w.spin.rotation.x += spin;
    const steerAngle = this._controls.steer * (this.state.drifting ? 0.5 : 0.38);
    for (const fw of this._frontWheels) {
      fw.root.rotation.y = THREE.MathUtils.lerp(fw.root.rotation.y, steerAngle, Math.min(1, 8 * dt));
    }
  }

  // ---- particles -------------------------------------------------------------

  /** Manual local→world transform (group rotation is only heading + small lean). */
  _localToWorld(out, lx, ly, lz) {
    const p = this.group.position;
    const h = this.state.heading;
    const c = Math.cos(h);
    const s = Math.sin(h);
    out.set(p.x + lx * c + lz * s, p.y + ly, p.z - lx * s + lz * c);
  }

  _emitParticles(particles, dt) {
    const s = this.state;
    const speedAbs = Math.abs(s.speed);
    const h = s.heading;
    this._back.set(-Math.sin(h), 0, -Math.cos(h)); // kart's backward direction

    // exhaust puffs
    this._exhaustAcc += dt;
    const exhaustEvery = s.boost ? 0.02 : 0.05;
    if (this._exhaustAcc >= exhaustEvery && speedAbs > 0.4 && !s.spinOut) {
      this._exhaustAcc = 0;
      this._localToWorld(this._pv, 0, this._pipeOffset.y, this._pipeOffset.z);
      const puff = 1.5 + Math.min(3.5, speedAbs * 0.09);
      this._v.copy(this._back).multiplyScalar(puff);
      particles.emit('exhaust', this._pv, {
        velocity: this._v,
        spread: 0.45,
        size: 0.16 + Math.min(0.12, speedAbs * 0.004),
        color: s.offRoad ? 0xb89a72 : 0xd7dde4,
      });
    }

    // boost flame
    if (s.boost && !s.spinOut) {
      this._localToWorld(this._pv, 0, this._pipeOffset.y, this._pipeOffset.z);
      this._v.copy(this._back).multiplyScalar(8.5);
      particles.emit('boost', this._pv, {
        velocity: this._v,
        spread: 1.0,
        size: 0.34,
        color: this._boostMs > CONFIG.items.mushroomBoostMs ? 0x7fd8ff : 0xffb25e,
      });
    }

    // drift smoke (rear wheels) — color tracks charge: white → yellow → orange
    if (s.drifting && speedAbs >= CONFIG.physics.driftMinSpeed) {
      this._driftAcc += dt;
      if (this._driftAcc >= 0.05) {
        this._driftAcc = 0;
        this._localToWorld(this._pv, this._sideFlip * 0.7, this.rideHeight + 0.1, -0.72);
        this._v.copy(this._back).multiplyScalar(0.8);
        this._side.set(Math.cos(h), 0, -Math.sin(h)).multiplyScalar(this._controls.steer * 2.2);
        this._v.add(this._side);
        const charge = s.driftCharge;
        const driftColor = charge < 0.33 ? 0xffffff : charge < 0.66 ? 0xffd166 : 0xff9f45;
        particles.emit('drift', this._pv, { velocity: this._v, spread: 0.7, size: 0.3, color: driftColor });
      }
    }
    this._sideFlip = -this._sideFlip;

    // off-road dust
    if (s.offRoad && speedAbs > 5 && !s.spinOut) {
      this._dustAcc += dt;
      if (this._dustAcc >= 0.08) {
        this._dustAcc = 0;
        this._localToWorld(this._pv, this._sideFlip * 0.7, this.rideHeight + 0.08, -0.72);
        this._v.copy(this._back).multiplyScalar(1.2).addScaledVector(this._side, 0);
        particles.emit('drift', this._pv, { velocity: this._v, spread: 0.9, size: 0.26, color: 0x9a7f57, duration: 0.7 });
      }
    }

    // star rainbow trail
    if (this.starred) {
      this._starAcc += dt;
      if (this._starAcc >= 0.03) {
        this._starAcc = 0;
        this._localToWorld(this._pv, 0, this.rideHeight + 0.5, -0.75);
        this._v.copy(this._back).multiplyScalar(1.0);
        this._starColor.setHSL((this._t * 0.8) % 1, 1.0, 0.62);
        particles.emit('starTrail', this._pv, {
          velocity: this._v,
          color: this._starColor.getHex(),
          size: 0.3,
        });
      }
    }
  }
}
