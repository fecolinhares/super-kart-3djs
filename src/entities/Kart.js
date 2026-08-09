/**
 * Super Kart 3D.js — Kart entity.
 * AAA cartoon kart: low wide PBR chassis (glossy clearcoat paint, matte
 * rubber, polished chrome, transparent glass), 4 wheels (spin + front
 * steering), molded shell with panel seams + side intakes + splitter,
 * shaped rear wing, and an expressive driver leaning forward gripping the
 * steering wheel. Owns the kart's visual state + effect timers; delegates
 * movement to KartPhysics.step(). Emits juice particles (exhaust / boost
 * flame / drift smoke / star trail / off-road dust) via ctx.particles.
 *
 * Group origin sits at ground contact (y = 0 = road), so squash & stretch
 * scales up from the wheels — the classic cartoon deformation.
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import * as Materials from '../render/Materials.js';
import { PowerUpType } from './PowerUp.js';
import { KartPhysics } from './KartPhysics.js';

const OUTLINE = 0x1b2a41;

/** Held-item bubble colors (PowerUpType value → orb tint). */
const HELD_ITEM_COLORS = {
  mushroom: 0xff5a5f,
  shell: 0x43d64b,
  red_shell: 0xff3b3b,
  banana: 0xffd166,
  star: 0xffd700,
  lightning: 0x2ec4ff,
  blue_shell: 0x1f3fc8,
};

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
    this.cruiseSpeed = undefined; // AI rubber-band override must not leak across restarts (audit F9)
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
    this._trickArmed = false;

    // Held-item bubble (audit v5 #1: a recolored orb isn't the item — MK8
    // shows the actual item). Mini toon meshes per type + orb fallback.
    this.heldItemGroup = new THREE.Group();
    this.heldItemGroup.position.set(0, 0.72, -0.72);
    this._heldMeshes = {};
    // mushroom: red cap + white stem
    const mush = new THREE.Group();
    mush.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), this._mat(0xff5a5f)));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.1, 8), this._mat(0xf4f6f8));
    stem.position.y = -0.1;
    mush.add(stem);
    mush.scale.setScalar(0.95);
    this._heldMeshes.mushroom = mush;
    // shell family: squashed sphere, tinted per type
    const mkShell = (c) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), this._mat(c));
      s.scale.set(0.75, 1, 1.15);
      return s;
    };
    this._heldMeshes.shell = mkShell(0x43d64b);
    this._heldMeshes.red_shell = mkShell(0xff3b3b);
    this._heldMeshes.blue_shell = mkShell(0x1f3fc8);
    // banana: tilted yellow cylinder
    const ban = new THREE.Group();
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.24, 10), this._mat(0xffd166));
    b1.rotation.z = 0.45;
    ban.add(b1);
    this._heldMeshes.banana = ban;
    // star: flattened gold octahedron
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), this._mat(0xffd700));
    star.scale.set(1, 0.7, 1);
    this._heldMeshes.star = star;
    // lightning / anything else: colored orb fallback
    this._heldOrb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this._heldOrbMat = this._heldOrb.material;
    this.heldItemGroup.add(this._heldOrb);
    this.heldItemGroup.add(new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.02, 10, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
    ));
    for (const key of Object.keys(this._heldMeshes)) this.heldItemGroup.add(this._heldMeshes[key]);
    this.heldItemGroup.visible = false;
    this.group.add(this.heldItemGroup);

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

  _outline(mesh, thickness = 0.03) {
    if (typeof Materials.cartoonOutline === 'function') {
      Materials.cartoonOutline(mesh, OUTLINE, thickness);
      return;
    }
    // fallback: inverted hull
    const hull = new THREE.Mesh(
      mesh.geometry.clone(),
      new THREE.MeshBasicMaterial({ color: OUTLINE, side: THREE.BackSide })
    );
    hull.scale.setScalar(1 + thickness);
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
    const accent = character ? character.accentColor : 0xffd166;

    // ---- PBR materials (distinct surface responses, MK8 pipeline) -----------
    // Glossy painted plastic for the body shell — the MK8 painted-toy cue:
    // clearcoat + bumped IBL so the paint visibly reflects.
    const carPaint = Materials.plasticMaterial(color, { envMapIntensity: 2.2, roughness: 0.2 });
    const body = this._mat(color);
    const bodyDark = this._mat(new THREE.Color(color).multiplyScalar(0.82).getHex());
    // keep refs so the player can repaint (setBodyColor)
    this._bodyMat = body;
    this._bodyDarkMat = bodyDark;
    this._carPaintMat = carPaint;
    // Matte trim plastic (splitter, intakes, arches, cockpit rim).
    const dark = this._mat(0x232833);
    // Dead-flat rubber (tires) — deliberately NOT glossy: roughness 0.95
    // against the clearcoat paint = the MK8 material separation.
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x161a20, roughness: 0.95, metalness: 0 });
    const tireDark = new THREE.MeshStandardMaterial({ color: 0x0a0d11, roughness: 0.98, metalness: 0 });
    // Polished chrome (rims, hubs, exhaust) — mirror metal vs painted plastic.
    const chrome = new THREE.MeshPhysicalMaterial({
      color: 0xdde4ec, metalness: 0.95, roughness: 0.1, envMapIntensity: 2.4,
    });
    // Curved transparent PBR glass (windshield).
    const glassPBR = new THREE.MeshPhysicalMaterial({
      color: 0xa8d8ff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.5,
      envMapIntensity: 2.0, depthWrite: false, clearcoat: 1.0, clearcoatRoughness: 0.1,
    });
    const white = this._mat(0xf4f6f8);
    const skin = this._mat(0xffd9b3);
    // Subtle emissive headlight lens.
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfff6e0, emissive: 0xfff2d0, emissiveIntensity: 0.45, roughness: 0.25,
    });
    const tip = this._mat(0xff9f45);

    // Soft blob shadow under the kart (cartoon contact shadow). Radial
    // gradient texture (soft edge — a hard circle read as a decal per the
    // vision critic). depthWrite off + polygonOffset so it never z-fights.
    const blobTex = (() => {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(32, 32, 6, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0,0,0,0.62)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.32)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c);
      return t;
    })();
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 24),
      new THREE.MeshBasicMaterial({
        map: blobTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
    blob.scale.set(1, 1, 0.78); // narrower across the kart, longer along it
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    blob.renderOrder = 1;
    this.group.add(blob);

    // ---- molded shell (48-segment lathe lozenge) -----------------------------
    // Continuous molded body: a high-segment lathe hull (nose→body→tail) in
    // glossy clearcoat paint. No fat inverted-hull outlines on the big painted
    // parts: PBR needs bare surface, and panel seams carry the detail read.
    const hullProfile = [
      new THREE.Vector2(0.02, 0.34),
      new THREE.Vector2(0.26, 0.40),
      new THREE.Vector2(0.44, 0.50),
      new THREE.Vector2(0.52, 0.60),
      new THREE.Vector2(0.56, 0.70), // widest hips of the shell
      new THREE.Vector2(0.53, 0.79),
      new THREE.Vector2(0.42, 0.87),
      new THREE.Vector2(0.26, 0.925),
      new THREE.Vector2(0.0, 0.96),
    ];
    const hull = new THREE.Mesh(new THREE.LatheGeometry(hullProfile, 48), carPaint);
    hull.scale.set(1, 1, 1.5); // elongate along the kart axis (footprint ~1.7 x 1.05)
    hull.castShadow = true;
    this.group.add(hull);
    // Recessed cockpit tub — a dark dish sunk into the shell top; the driver
    // sits in it (the MK8 cockpit-opening read instead of a flat deck).
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 18), dark);
    cockpit.position.set(0, 0.92, -0.14);
    cockpit.scale.set(0.95, 0.14, 0.8);
    cockpit.castShadow = false;
    this.group.add(cockpit);
    // Molded nose cowl (rounded prow) + tail cap.
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24), carPaint);
    nose.position.set(0, 0.6, 0.62);
    nose.scale.set(0.85, 0.5, 0.55);
    nose.castShadow = true;
    this.group.add(nose);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), carPaint);
    tail.position.set(0, 0.62, -0.6);
    tail.scale.set(0.85, 0.5, 0.45);
    tail.castShadow = true;
    this.group.add(tail);
    // Rear side pods — fill the chase-cam silhouette between wing and body.
    for (const s of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), carPaint);
      pod.position.set(s * 0.5, 0.6, -0.55);
      pod.scale.set(0.9, 0.8, 1.6);
      pod.castShadow = true;
      this.group.add(pod);
    }

    // Fender flares — molded PAINTED arches over every wheel (same clearcoat
    // as the shell = merged bodywork, not stuck-on black) + a dark inner lip
    // that defines the arch cut line against the tire.
    const flareGeo = new THREE.TorusGeometry(0.42, 0.055, 12, 28, Math.PI);
    flareGeo.rotateY(Math.PI / 2); // ring in the ZY plane — arcs over the tire
    const archLipGeo = new THREE.TorusGeometry(0.36, 0.02, 10, 26, Math.PI);
    archLipGeo.rotateY(Math.PI / 2);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const flare = new THREE.Mesh(flareGeo, carPaint);
        flare.position.set(sx * 0.705, 0.37, sz * 0.67);
        flare.castShadow = true;
        this.group.add(flare);
        const lip = new THREE.Mesh(archLipGeo, dark);
        lip.position.set(sx * 0.705, 0.36, sz * 0.67);
        lip.castShadow = false;
        this.group.add(lip);
      }
    }

    // Side intakes — stepped dark scoops on the flanks (molded vent panels).
    for (const s of [-1, 1]) {
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.34), dark);
      scoop.position.set(s * 0.57, 0.56, 0.08);
      scoop.rotation.z = s * -0.14;
      scoop.castShadow = false;
      this.group.add(scoop);
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.2), tireDark);
      vent.position.set(s * 0.6, 0.56, 0.08);
      vent.rotation.z = s * -0.14;
      vent.castShadow = false;
      this.group.add(vent);
    }

    // Panel-line seams — thin darker strips (molded bodywork parting lines).
    for (const s of [-1, 1]) {
      this._mesh(new THREE.BoxGeometry(0.03, 0.022, 0.7), dark, s * 0.55, 0.66, -0.12, { cast: false });
    }
    this._mesh(new THREE.BoxGeometry(0.36, 0.02, 0.03), dark, 0, 0.93, 0.42, { cast: false });
    // ---- racing graphics (audit r3): accent stripes + side numbers + nose band ----
    // The shell was a monochrome lozenge — these give it the painted-kart read:
    // accent bands hug the lathe flanks, a number decal rides each side, and an
    // accent visor band curves across the nose cowl. All parented to this.group
    // so they follow the kart; setBodyColor retints only the base paint, so the
    // accent graphics keep the character's accent color.
    const accentMat = this._mat(accent);
    // Hull radius at a given height — linear sample of the lathe profile (the
    // shell is a surface of revolution, so radius at height y = profile.x).
    const hullR = (y) => {
      for (let i = 0; i < hullProfile.length - 1; i++) {
        const a = hullProfile[i];
        const b = hullProfile[i + 1];
        if (y >= a.y && y <= b.y) {
          const t = (y - a.y) / (b.y - a.y);
          return a.x + (b.x - a.x) * t;
        }
      }
      return hullProfile[hullProfile.length - 1].x;
    };
    // 1) Flank accent stripes — three thin elliptical arc bands wrapping the
    //    shell's curved flanks. Each is a torus arc in the XZ plane scaled by
    //    the hull's 1.5x Z elongation, so it hugs the shell profile exactly.
    const flankArc = (100 * Math.PI) / 180;
    for (const y of [0.56, 0.64, 0.72]) {
      const r = hullR(y) + 0.006; // just proud of the paint
      const flankStripeGeo = new THREE.TorusGeometry(r, 0.02, 10, 24, flankArc);
      flankStripeGeo.rotateX(Math.PI / 2); // ring in the XZ plane (belt around Y)
      for (const s of [-1, 1]) {
        const flankStripe = new THREE.Mesh(flankStripeGeo, accentMat);
        flankStripe.scale.set(1, 1, 1.5); // match the shell's elongation
        flankStripe.rotation.y = s > 0 ? 0 : Math.PI; // arc centered on this flank
        flankStripe.position.set(0, y, 0);
        flankStripe.castShadow = false;
        this.group.add(flankStripe);
      }
    }
    // 2) Side number decal — canvas badge (white disc + accent ring + number)
    //    on a small plane over each flank, tilted to follow the shell surface.
    const sideNumCanvas = document.createElement('canvas');
    sideNumCanvas.width = 128;
    sideNumCanvas.height = 128;
    const sctx = sideNumCanvas.getContext('2d');
    sctx.clearRect(0, 0, 128, 128);
    sctx.fillStyle = '#ffffff';
    sctx.beginPath();
    sctx.arc(64, 64, 56, 0, Math.PI * 2);
    sctx.fill();
    sctx.strokeStyle = '#' + new THREE.Color(accent).getHexString();
    sctx.lineWidth = 7;
    sctx.beginPath();
    sctx.arc(64, 64, 49, 0, Math.PI * 2);
    sctx.stroke();
    sctx.fillStyle = '#1b2a41';
    sctx.font = '900 74px "Baloo 2", "Nunito", Arial, sans-serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText(String(this.number), 64, 68);
    const sideNumTex = new THREE.CanvasTexture(sideNumCanvas);
    sideNumTex.colorSpace = THREE.SRGBColorSpace;
    const sideDecalMat = this._mat(0xffffff, { map: sideNumTex, transparent: true });
    sideDecalMat.depthWrite = false; // no quad-corner slivers over the shell
    for (const s of [-1, 1]) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), sideDecalMat);
      decal.position.set(s * 0.558, 0.7, 0.15);
      decal.rotation.y = s * (Math.PI / 2 - 0.12); // tilt to hug the curved flank
      decal.castShadow = false;
      this.group.add(decal);
    }
    // 3) Nose accent — curved visor band across the nose cowl front, following
    //    the cowl's squashed cross-section (arc centered on +Z).
    const noseAccentGeo = new THREE.TorusGeometry(0.34, 0.02, 10, 24, (70 * Math.PI) / 180);
    noseAccentGeo.rotateX(Math.PI / 2); // ring in the XZ plane
    noseAccentGeo.rotateY((-55 * Math.PI) / 180); // shift arc to center on +Z (55..125 deg)
    const noseAccent = new THREE.Mesh(noseAccentGeo, accentMat);
    noseAccent.scale.set(1, 1, 0.55 / 0.85); // match cowl's Z vs X squash
    noseAccent.position.set(0, 0.6, 0.62); // nose cowl center
    noseAccent.castShadow = false;
    this.group.add(noseAccent);

    // Front splitter — dark aero blade under the nose + small end fences.
    this._mesh(new THREE.BoxGeometry(0.92, 0.05, 0.26), dark, 0, 0.3, 0.97, { cast: false });
    for (const s of [-1, 1]) {
      this._mesh(new THREE.BoxGeometry(0.03, 0.1, 0.2), dark, s * 0.44, 0.29, 0.97, { cast: false });
    }
    // Dark lower-nose chin panel (contrast under the painted prow).
    const chinPanel = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), dark);
    chinPanel.position.set(0, 0.44, 0.62);
    chinPanel.scale.set(0.9, 0.42, 0.5);
    chinPanel.castShadow = false;
    this.group.add(chinPanel);

    // Headlights — subtle emissive lenses in chrome bezels.
    for (const s of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.072, 18, 14), headlightMat);
      lens.position.set(s * 0.26, 0.56, 0.84);
      lens.scale.set(0.75, 0.9, 0.5);
      lens.castShadow = false;
      this.group.add(lens);
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.014, 8, 22), chrome);
      bezel.rotation.z = Math.PI / 2; // ring in YZ plane (hole along X) — faces fwd
      bezel.position.set(s * 0.26, 0.56, 0.85);
      bezel.castShadow = false;
      this.group.add(bezel);
    }

    // Curved glossy windshield — half-cylinder dome over the cockpit.
    const wind = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.6, 20, 1, true, 0, Math.PI),
      glassPBR
    );
    wind.position.set(0, 1.04, 0.26);
    wind.rotation.x = -0.3;
    wind.rotation.z = Math.PI / 2;
    wind.castShadow = false;
    this.group.add(wind);

    // Seat: bucket seat + bolsters + headrest (dark leather trim behind driver).
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.48, 0.1, 1, 4, 1), bodyDark);
    seat.position.set(0, 0.92, -0.36);
    seat.rotation.x = 0.14;
    seat.castShadow = true;
    this.group.add(seat);
    for (const s of [-1, 1]) {
      const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 0.13, 1, 3, 1), bodyDark);
      bolster.position.set(s * 0.19, 0.9, -0.37);
      bolster.rotation.x = 0.14;
      bolster.rotation.z = s * 0.16;
      bolster.castShadow = false;
      this.group.add(bolster);
    }
    const headrest = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), bodyDark);
    headrest.position.set(0, 1.1, -0.42);
    headrest.scale.set(1, 0.9, 0.75);
    headrest.castShadow = true;
    this.group.add(headrest);

    // ---- rear wing: curved blade + dark lower element + endplates + pylon ----
    // Half-pipe painted blade (convex face toward the chase camera) + a dark
    // lower blade (split-wing read) — a shaped aero wing, not a plank.
    const wingGroup = new THREE.Group();
    wingGroup.position.set(0, 1.1, -0.88);
    wingGroup.rotation.z = -Math.PI / 2; // blade spans X; convex face faces -Z
    const blade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 1.14, 32, 1, false, Math.PI, Math.PI),
      carPaint
    );
    blade.rotation.x = 0.12; // slight negative angle (downforce)
    blade.castShadow = true;
    wingGroup.add(blade);
    const lowerBlade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 1.06, 24, 1, false, Math.PI, Math.PI),
      dark
    );
    lowerBlade.rotation.x = 0.12;
    lowerBlade.position.y = -0.16;
    lowerBlade.castShadow = false;
    wingGroup.add(lowerBlade);
    this.group.add(wingGroup);
    // Wingtip endplates (painted) with dark edge trim.
    for (const s of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.3, 0.5), carPaint);
      plate.position.set(s * 0.58, 1.1, -0.88);
      plate.castShadow = true;
      this.group.add(plate);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.52), dark);
      trim.position.set(s * 0.58, 0.96, -0.88);
      trim.castShadow = false;
      this.group.add(trim);
    }
    // Center pylon (tapered) + side mount pods (molded, not sticks).
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.32, 14), bodyDark);
    pylon.position.set(0, 1.0, -0.86);
    pylon.castShadow = true;
    this.group.add(pylon);
    for (const s of [-1, 1]) {
      const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.24, 12), dark);
      mount.position.set(s * 0.4, 1.0, -0.86);
      mount.rotation.x = 0.25;
      mount.castShadow = false;
      this.group.add(mount);
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), dark);
      pod.position.set(s * 0.4, 0.84, -0.84);
      pod.castShadow = false;
      this.group.add(pod);
    }

    // Brake lights (emissive red tail lamps that flare on brake — update())
    // in chrome bezels + a subtle always-on rear glow bar under the wing.
    this._brakeLampMat = new THREE.MeshStandardMaterial({
      color: 0x7a0000,
      emissive: 0xff2222,
      emissiveIntensity: 0.0,
      roughness: 0.4,
    });
    for (const s of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 14), this._brakeLampMat);
      lamp.position.set(s * 0.36, 0.74, -0.9);
      lamp.scale.set(1.15, 1, 0.7);
      lamp.castShadow = false;
      this.group.add(lamp);
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 20), chrome);
      bezel.rotation.z = Math.PI / 2;
      bezel.position.set(s * 0.36, 0.74, -0.915);
      bezel.castShadow = false;
      this.group.add(bezel);
    }
    const rearGlow = new THREE.MeshStandardMaterial({
      color: 0x5a0000, emissive: 0xff3322, emissiveIntensity: 0.35, roughness: 0.5,
    });
    const glowBar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.035, 0.025), rearGlow);
    glowBar.position.set(0, 1.0, -0.93);
    this.group.add(glowBar);

    // Race number badge on the nose tip (kart identity, faces forward).
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 128;
    numCanvas.height = 128;
    const nctx = numCanvas.getContext('2d');
    nctx.fillStyle = '#ffffff';
    nctx.fillRect(0, 0, 128, 128);
    nctx.fillStyle = '#1b2a41';
    nctx.font = 'bold 104px sans-serif';
    nctx.textAlign = 'center';
    nctx.textBaseline = 'middle';
    nctx.fillText(String(this.number), 64, 70);
    const numTex = new THREE.CanvasTexture(numCanvas);
    numTex.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    plate.material.map = numTex;
    plate.position.set(0, 0.66, 0.86);
    this.group.add(plate);

    // Rear number plate + dark frame (visible from the chase camera).
    const plateBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.54, 0.07),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    plateBack.material.map = numTex;
    plateBack.position.set(0, 0.72, -0.78);
    plateBack.rotation.x = 0.12;
    this.group.add(plateBack);
    const plateFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.58, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x1b2a41 })
    );
    plateFrame.position.set(0, 0.72, -0.815);
    plateFrame.rotation.x = 0.12;
    this.group.add(plateFrame);

    // Exhaust pipes — polished chrome barrels + hot tips (particles spawn here).
    for (const s of [-1, 1]) {
      this._mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.26, 16),
        chrome, s * 0.28, 0.5, -0.94,
        { rx: Math.PI / 2, cast: false }
      );
      this._mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.05, 16),
        tip, s * 0.28, 0.5, -1.06,
        { rx: Math.PI / 2, cast: false }
      );
    }

    // ---- wheels: tire + tread + sidewall stripe + 5-spoke chrome rim --------
    const wR = KC.wheelRadius;
    const wW = KC.wheelWidth;
    const wy = wR;
    const wz = KC.chassisLength / 2 - 0.18;
    const wx = KC.chassisWidth / 2 + 0.18;
    const faceX = wW / 2;

    const tireGeo = new THREE.CylinderGeometry(wR, wR, wW, 28);
    // Raised tread ribs (3 rings around the circumference — readable at close-up).
    const treadGeo = new THREE.TorusGeometry(wR - 0.006, 0.015, 8, 40);
    // Deep center groove ring (the "readable tread" cue).
    const grooveGeo = new THREE.TorusGeometry(wR - 0.002, 0.008, 8, 40);
    // Sidewall stripe ring — proud ring on the tire face (accent color).
    const stripeGeo = new THREE.TorusGeometry(0.24, 0.016, 8, 32);
    // Chrome rim parts (all in the YZ plane — axle along X).
    const rimDiscGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.022, 24);
    const rimLipGeo = new THREE.TorusGeometry(0.215, 0.018, 8, 28);
    const spokeGeo = new THREE.BoxGeometry(0.022, 0.15, 0.05);
    const hubGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.034, 18);
    const hubCapGeo = new THREE.SphereGeometry(0.032, 12, 10);
    const lugGeo = new THREE.SphereGeometry(0.016, 8, 6);
    const stripeMat = character ? this._mat(accent) : white;

    this._wheels = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const root = new THREE.Group();
        root.position.set(sx * wx, wy, sz * wz);
        this.group.add(root);
        const spin = new THREE.Group(); // rolls around kart X axis
        root.add(spin);
        // CylinderGeometry's axis is Y; tilt the wheel so its axle runs
        // along X (lateral).
        const tilt = new THREE.Group();
        tilt.rotation.z = Math.PI / 2;
        spin.add(tilt);
        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.castShadow = true;
        tilt.add(tire);
        // Tread ribs (roll with the tire — reads as rolling rubber).
        for (const tx of [-0.08, 0, 0.08]) {
          const rib = new THREE.Mesh(treadGeo, tireDark);
          rib.position.x = tx;
          tilt.add(rib);
        }
        const groove = new THREE.Mesh(grooveGeo, tireDark);
        tilt.add(groove);
        // Sidewall stripe rings on both faces.
        const st1 = new THREE.Mesh(stripeGeo, stripeMat);
        st1.position.x = faceX - 0.002;
        const st2 = new THREE.Mesh(stripeGeo, stripeMat);
        st2.position.x = -(faceX - 0.002);
        tilt.add(st1, st2);
        // Chrome rim — DIRECT child of spin (axis X) so it rolls with the
        // wheel (the historic "disc child of tilt spun like a coin" bug).
        const rimX = faceX + 0.014;
        const disc = new THREE.Mesh(rimDiscGeo, chrome);
        disc.rotation.z = Math.PI / 2;
        disc.position.x = rimX;
        disc.castShadow = false;
        spin.add(disc);
        const lip = new THREE.Mesh(rimLipGeo, chrome);
        lip.rotation.z = Math.PI / 2; // ring in YZ — faces outward, not edge-on
        lip.position.x = rimX + 0.01;
        lip.castShadow = false;
        spin.add(lip);
        // 5 spokes — thin radial boxes between hub and lip.
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const spoke = new THREE.Mesh(spokeGeo, chrome);
          spoke.rotation.x = a;
          spoke.position.set(rimX + 0.008, Math.cos(a) * 0.12, Math.sin(a) * 0.12);
          spoke.castShadow = false;
          spin.add(spoke);
        }
        const hub = new THREE.Mesh(hubGeo, chrome);
        hub.rotation.z = Math.PI / 2;
        hub.position.x = rimX + 0.016;
        hub.castShadow = false;
        spin.add(hub);
        const hubCap = new THREE.Mesh(hubCapGeo, chrome);
        hubCap.position.x = rimX + 0.032;
        hubCap.castShadow = false;
        spin.add(hubCap);
        // 5 lug nuts matching the spokes.
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const lug = new THREE.Mesh(lugGeo, chrome);
          lug.position.set(rimX + 0.045, Math.cos(a) * 0.088, Math.sin(a) * 0.088);
          lug.castShadow = false;
          spin.add(lug);
        }
        this._wheels.push({ root, spin, isFront: sz > 0 });
      }
    }
    this._frontWheels = this._wheels.filter((w) => w.isFront);

    // ---- driver: torso + shoulders + arms gripping the wheel -----------------
    const drv = new THREE.Group();
    drv.position.set(0, 0, 0);
    drv.scale.set(1.12, 1.12, 1.12);
    this.group.add(drv);

    const suit = character ? this._mat(character.suitColor) : white;
    const up = new THREE.Vector3(0, 1, 0);

    // Torso — rounded capsule leaned forward into the drive pose.
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.26, 8, 16), suit);
    torso.position.set(0, 0.94, -0.06);
    torso.rotation.x = 0.32;
    torso.castShadow = true;
    drv.add(torso);
    // Racing stripe down the chest (accent color).
    const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.3, 0.02), this._mat(accent));
    chestStripe.position.set(0, 0.94, 0.088);
    chestStripe.rotation.x = 0.32;
    chestStripe.castShadow = false;
    drv.add(chestStripe);
    // Shoulders (suit pads).
    for (const s of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), suit);
      sh.position.set(s * 0.135, 1.0, -0.09);
      sh.scale.set(1, 0.88, 1.1);
      sh.castShadow = false;
      drv.add(sh);
    }

    // Steering wheel — 3-spoke, dark leather rim + chrome spokes/hub.
    const steerGroup = new THREE.Group();
    steerGroup.position.set(0, 0.92, 0.24);
    drv.add(steerGroup);
    const sRim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.024, 12, 28), dark);
    sRim.rotation.x = Math.PI / 2; // ring in XY plane — faces the driver
    sRim.castShadow = false;
    steerGroup.add(sRim);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.022), chrome);
      sp.position.set(Math.cos(a) * 0.052, Math.sin(a) * 0.052, 0);
      sp.rotation.z = a;
      sp.castShadow = false;
      steerGroup.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), chrome);
    hub.castShadow = false;
    steerGroup.add(hub);

    // Arms — upper arm + forearm (bent elbows), gloved hands gripping the rim.
    for (const s of [-1, 1]) {
      const shX = s * 0.135, shY = 1.0, shZ = -0.09;
      const elX = s * 0.16, elY = 0.985, elZ = 0.05;
      const hX = s * 0.105, hY = 0.92, hZ = 0.24;
      const ua = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.13, 6, 10), suit);
      ua.position.set((shX + elX) / 2, (shY + elY) / 2, (shZ + elZ) / 2);
      ua.quaternion.setFromUnitVectors(up, new THREE.Vector3(elX - shX, elY - shY, elZ - shZ).normalize());
      ua.castShadow = false;
      drv.add(ua);
      const fa = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.15, 6, 10), suit);
      fa.position.set((elX + hX) / 2, (elY + hY) / 2, (elZ + hZ) / 2);
      fa.quaternion.setFromUnitVectors(up, new THREE.Vector3(hX - elX, hY - elY, hZ - elZ).normalize());
      fa.castShadow = false;
      drv.add(fa);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 12), dark);
      hand.position.set(hX, hY, hZ);
      hand.scale.set(1, 1, 1.15);
      hand.castShadow = false;
      drv.add(hand);
    }

    // Neck + helmet (character colored, glossy visor, fine outline).
    this._mesh(new THREE.SphereGeometry(0.055, 14, 10), skin, 0, 1.14, 0.1, { parent: drv, cast: false });
    const helmetMat = character ? this._mat(character.helmetColor) : body;
    this._helmetMat = helmetMat;
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 32, 24),
      helmetMat
    );
    helmet.position.set(0, 1.24, 0.06);
    helmet.scale.set(1, 0.85, 1.02);
    helmet.castShadow = true;
    drv.add(helmet);
    this._outline(helmet, 0.025);
    // Glossy visor band across the helmet front (dark reflective glass).
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 22, 14),
      new THREE.MeshPhysicalMaterial({
        color: 0x0e1a28, roughness: 0.05, metalness: 0.5,
        clearcoat: 1.0, envMapIntensity: 2.2,
      })
    );
    visor.position.set(0, 1.26, 0.17);
    visor.scale.set(1.05, 0.28, 0.62);
    visor.castShadow = false;
    drv.add(visor);
    // Chin guard below the visor.
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), dark);
    chin.position.set(0, 1.14, 0.18);
    chin.scale.set(1, 0.55, 0.75);
    chin.castShadow = false;
    drv.add(chin);
    // Helmet accent stripe — the character's color mark (equator ring).
    if (character) {
      this._mesh(
        new THREE.TorusGeometry(0.163, 0.016, 8, 32),
        this._mat(character.accentColor),
        0, 1.24, 0.06,
        { parent: drv, cast: false }
      );
    }
  }

  // ---- public API -----------------------------------------------------------

  setControls({ steer, throttle, brake, drift, useItem } = {}) {
    if (steer !== undefined) this._steerTarget = THREE.MathUtils.clamp(steer, -1, 1);
    // Throttle stays a FLOAT (AI corner-lift 0.3/0.8, rubber-band easing
    // 0.88×) — coercing to boolean killed the AI's designed corner behavior
    // and the "ease off when ahead" half of rubber-banding (audit F3).
    if (throttle !== undefined) this._controls.throttle = THREE.MathUtils.clamp(throttle, 0, 1);
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
    if (this._carPaintMat) this._carPaintMat.color.setHex(color);
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
    this.cruiseSpeed = undefined; // audit F9: rubber-band override must not leak
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
    // AUDIT r2: stale trick/slipstream state leaked into the fresh race —
    // an armed trick or drafting slingshot fired right after GO.
    this._wasDrafting = false;
    this._airTime = 0;
    this._trickArmed = false;
    this._prevY = 0;
    this._offRoadT = 0; // AUDIT r3: no grass-exit kick from the previous race
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
    if (this._blockWithHeldItem()) return; // hold a shell/banana → absorb
    this._spinMs = 1500;
    this._spinDir = Math.random() < 0.5 ? -1 : 1;
    this.state.speed *= 0.3;
    this._scaleTarget = 0.92;
    this._scaleMs = Math.max(this._scaleMs, 300);
    this._onHit?.('banana'); // player hit feedback hook (screen flash + label)
  }

  /** Shell: heavier crash — spin-out + hop + lateral shove.
   *  opts: { blue } — blue shells BYPASS held-item blocking (MK8 spiny:
   *  only star/invincibility protects; a held shell can't shield it). */
  hitShell(opts = {}) {
    if (this.invincible) return;
    if (!opts.blue && this._blockWithHeldItem()) return; // MK8 item-hold pillar
    this._spinMs = 2100;
    this._spinDir = Math.random() < 0.5 ? -1 : 1;
    this.state.speed *= 0.12;
    this.state.vY = 3.2; // pop up, gravity brings it down
    this._nudgeVel.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(5);
    this._scaleTarget = 0.9;
    this._scaleMs = Math.max(this._scaleMs, 380);
    this._onHit?.(opts.blue ? 'blue' : 'shell'); // player hit feedback hook
  }

  /** Holding a shell/banana behind blocks an incoming hit (MK8 pillar).
   *  Consumes the held item. Returns true when the hit was absorbed. */
  _blockWithHeldItem() {
    if (!this.heldItem) return false;
    if (this.heldItem !== PowerUpType.SHELL && this.heldItem !== PowerUpType.BANANA && this.heldItem !== PowerUpType.RED_SHELL) return false;
    this.heldItem = null;
    return true;
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
    // Brake lights flare (audit v5 #2).
    if (this._brakeLampMat) {
      const braking = this._controls.brake || s.spinOut;
      const target = braking ? 1.4 : 0;
      this._brakeLampMat.emissiveIntensity += (target - this._brakeLampMat.emissiveIntensity) * Math.min(1, 10 * dt);
    }
    this._tickEffects(dt);
    // Held-item bubble sync (audit v5): show the per-type mesh (orb fallback).
    if (this.heldItemGroup) {
      const has = !!this.heldItem;
      this.heldItemGroup.visible = has;
      if (has) {
        for (const key of Object.keys(this._heldMeshes)) {
          this._heldMeshes[key].visible = key === this.heldItem;
        }
        const hasMesh = !!this._heldMeshes[this.heldItem];
        if (this._heldOrb) this._heldOrb.visible = !hasMesh;
        if (!hasMesh) {
          const c = HELD_ITEM_COLORS[this.heldItem] || 0xffffff;
          if (this._heldOrbMat.color.getHex() !== c) this._heldOrbMat.color.setHex(c);
        }
        this.heldItemGroup.rotation.y += dt * 2.4; // gentle spin
      }
    }
    // Trick (MK8 pillar): pressing throttle mid-air arms a trick; landing
    // with it armed grants a mini-boost (the air system is now reachable
    // via the trick ramps).
    if (this._airTime > 0.25 && this._controls.throttle) this._trickArmed = true; // audit v4: 0.35 was above the ramp's airtime
    if (this._trickArmed && this._airTime <= 0.02 && !this.state.spinOut) {
      this._trickArmed = false;
      this.applyBoost(320);
      this._onTrick?.();
    }

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
      KartPhysics.step(this, this._controls, dt, ctx.track, ctx.raceManager);
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

    // slipstream wake (audit v3 F1 asked for wake particles): faint streaks
    // trailing the kart while drafting — the visual "you're in the slipstream".
    if (s.draft && speedAbs > 6 && !s.spinOut) {
      this._draftAcc = (this._draftAcc || 0) + dt;
      if (this._draftAcc >= 0.05) {
        this._draftAcc = 0;
        this._localToWorld(this._pv, 0, 0.3, -0.7);
        this._v.copy(this._back).multiplyScalar(2.2);
        particles.emit('dust', this._pv, { velocity: this._v, spread: 0.3, size: 0.12, color: 0xbfd8ff });
      }
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

    // speed dust (motion cue — vision critic: no visible movement effects;
    // MK8 kicks a little tire dust when accelerating hard)
    if (speedAbs > 30 && !s.spinOut && !s.offRoad && (s.throttle > 0.5 || s.boost)) {
      this._speedDustAcc = (this._speedDustAcc || 0) + dt;
      if (this._speedDustAcc >= 0.1) {
        this._speedDustAcc = 0;
        this._localToWorld(this._pv, this._sideFlip * 0.55, 0.06, -0.6);
        this._v.copy(this._back).multiplyScalar(1.0);
        particles.emit('dust', this._pv, { velocity: this._v, spread: 0.5, size: 0.14, color: 0xd8d4c8, duration: 0.5 });
      }
    }

    // exhaust puffs (subtle, MK8-style — gives the kart a living feel)
    if (speedAbs > 5 && s.throttle > 0.1 && !s.spinOut) {
      this._exhAcc = (this._exhAcc || 0) + dt;
      if (this._exhAcc >= 0.22) {
        this._exhAcc = 0;
        this._localToWorld(this._pv, 0, this._pipeOffset.y - 0.12, this._pipeOffset.z - 0.1);
        this._v.copy(this._back).multiplyScalar(1.4);
        particles.emit('dust', this._pv, { velocity: this._v, spread: 0.18, size: 0.1, color: 0xe8e4da, duration: 0.35 });
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
