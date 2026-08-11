/**
 * Super Kart 3D.js — item boxes.
 * Glossy toon '?' boxes placed in pairs along the track. They bob + spin,
 * grant a kart a random power-up on contact (via RaceManager.pickupItem),
 * then respawn after the configured delay.
 *
 * Tries to adopt the track agent's toonMaterial() factory from
 * src/render/Materials.js when it is available; otherwise falls back to a
 * plain THREE.MeshToonMaterial. Never imports it statically so this module
 * stays independent of the track agent's file.
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const BOX_COUNT = 10;

// --- optional adoption of the shared toon material factory -----------------
let _toonFactory = null;
let _toonResolved = false;
const _liveBoxes = new Set();

try {
  import('../render/Materials.js')
    .then((m) => {
      _toonFactory = typeof m.toonMaterial === 'function' ? m.toonMaterial : null;
      _toonResolved = true;
      for (const box of _liveBoxes) box._rebuildMaterial();
    })
    .catch(() => {
      _toonResolved = true; // track agent file not present yet — keep fallback
    });
} catch {
  _toonResolved = true; // environments without dynamic import
}

// --- shared '?' canvas texture -------------------------------------------------
let _questionTex = null;

function questionTexture() {
  // Canvas textures need the DOM — headless environments (tests, SSR) get a
  // plain toon material instead; the '?' still reads via emissive tint.
  if (typeof document === 'undefined') return null;
  if (_questionTex) return _questionTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');

  // Clean white-cream base with a whisper of warmth (MK8 pickup panel).
  const grad = g.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#fbf3de');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  // Rounded inner border (cream highlight on cream) — reads as a panel.
  g.strokeStyle = '#fffdf4';
  g.lineWidth = 10;
  g.strokeRect(8, 8, size - 16, size - 16);
  g.strokeStyle = '#e0c98f';
  g.lineWidth = 2;
  g.strokeRect(13, 13, size - 26, size - 26);
  // Big red '?' with a white halo + dark outline (the unmistakable pickup glyph,
  // readable even in compressed frames).
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 96px "Baloo 2", "Nunito", Arial, sans-serif';
  g.lineWidth = 6;
  g.strokeStyle = '#b02a2a';
  g.strokeText('?', size / 2, size / 2 + 4);
  g.lineWidth = 16;
  g.strokeStyle = '#ffffff';
  g.strokeText('?', size / 2, size / 2 + 4);
  g.fillStyle = '#e53e3e';
  g.fillText('?', size / 2, size / 2 + 4);
  // Tiny highlight dot on the '?' for gloss.
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath();
  g.arc(size * 0.44, size * 0.34, 7, 0, Math.PI * 2);
  g.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _questionTex = tex;
  return tex;
}

// --- helpers ------------------------------------------------------------------
function kartPos(kart) {
  const g = kart.group;
  if (g && g.position) return g.position;
  const st = kart.state || {};
  return st.position || { x: 0, y: 0, z: 0 };
}

export class ItemBox {
  constructor(track, t, side) {
    this.track = track;
    this.t = t;
    this.side = side; // +1 = right of road, -1 = left
    this.active = true;
    this.respawnTimer = 0;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.wobble = Math.random() * Math.PI * 2;
    this.size = CONFIG.items.boxRadius * 2; // cube edge length

    this.base = this._computeBase();
    this.mesh = this._buildMesh();
    _liveBoxes.add(this);
  }

  /** Center point + yaw on the road, offset laterally from the centerline. */
  _computeBase() {
    const path = this.track.path;
    const point = path.getPointAt(this.t);
    const tangent = path.getTangentAt(this.t);
    // perpendicular in the XZ plane
    const px = -tangent.z;
    const pz = tangent.x;
    const pl = Math.hypot(px, pz) || 1;
    const lateral = CONFIG.track.roadWidth * 0.32 * this.side;
    return {
      x: point.x + (px / pl) * lateral,
      y: point.y + this.size * 0.5 + 0.05,
      z: point.z + (pz / pl) * lateral,
      yaw: Math.atan2(tangent.x, tangent.z),
    };
  }

  _buildMesh() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.size, this.size, this.size),
      this._makeMaterial()
    );
    mesh.position.set(this.base.x, this.base.y, this.base.z);
    mesh.rotation.y = this.base.yaw;
    mesh.castShadow = true;
    // Dark cartoon outline (inverted hull) so the box pops from the road.
    const outline = new THREE.Mesh(
      new THREE.BoxGeometry(this.size * 1.045, this.size * 1.045, this.size * 1.045),
      new THREE.MeshBasicMaterial({ color: 0x1b2a41, side: THREE.BackSide })
    );
    mesh.add(outline);
    // Golden light beam under the box — makes pickups readable at a glance.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(this.size * 0.5, this.size * 0.85, this.size * 2.6, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.set(this.base.x, Math.max(this.base.y - this.size * 1.35, 0.18), this.base.z); // AUDIT: the light beam must end AT the road (0.18), not pierce below ground
    this.beam = beam;
    // Glowing golden ring around the box (MK8 pickup readability — replaces
    // the old orbiting arrow cones which read as sketchy placeholders).
    this.ring = new THREE.Group();
    this.ring.position.set(this.base.x, this.base.y, this.base.z);
    const ringGeo = new THREE.TorusGeometry(this.size * 1.0, 0.09, 10, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    this.ring.add(ringMesh);
    this.ringMesh = ringMesh;
    return mesh;
  }

  _makeMaterial() {
    const tex = questionTexture();
    if (tex) {
      // Unlit pickup panel: the toon gradient + warm scene light was tinting
      // the white-cream texture mustard (seen repeatedly in QA). A magic
      // pickup box reads as self-lit, so MeshBasicMaterial shows the exact
      // MK8-style colors: white panel, bold red '?'.
      return new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff });
    }
    const opts = {
      color: 0xffb703,
      emissive: 0xff8f00,
      emissiveIntensity: 0.3,
    };
    if (_toonFactory && _toonResolved) {
      const mat = _toonFactory(0xffb703, opts);
      if (mat && typeof mat.dispose === 'function') return mat;
    }
    return new THREE.MeshToonMaterial(opts);
  }

  /** Swap to the shared toon factory once it loads (keeps the '?' texture). */
  _rebuildMaterial() {
    if (!_toonResolved || !_toonFactory) return;
    const old = this.mesh.material;
    this.mesh.material = this._makeMaterial();
    if (old) {
      old.map = null; // the '?' texture is shared — never dispose it here
      old.dispose?.();
    }
  }

  reset() {
    this.active = true;
    this.mesh.visible = true;
    if (this.beam) this.beam.visible = true;
    if (this.ring) this.ring.visible = true;
    this.respawnTimer = 0;
  }

  /**
   * update(dt, karts, raceManager)
   * Bob + wobble animation, pickup detection (distance < pickupRadius and an
   * empty held-item slot), respawn countdown while consumed.
   */
  update(dt, karts, raceManager) {
    this.bobPhase += dt * CONFIG.items.boxBobSpeed;
    this.wobble += dt * 2.4;

    if (!this.active) {
      this.respawnTimer -= dt * 1000;
      if (this.respawnTimer <= 0) {
        this.active = true;
        this.mesh.visible = true;
      }
      return;
    }

    const bob = Math.sin(this.bobPhase) * 0.18;
    this.mesh.position.y = this.base.y + bob;
    // Continuous slow spin (MK8 pickup box) + a little wobble.
    this.mesh.rotation.y = this.base.yaw + Math.sin(this.wobble) * 0.1 + this.bobPhase * 0.55;
    if (this.beam) {
      this.beam.position.y = Math.max(this.base.y - this.size * 1.35, 0.18) + bob;
      const pulse = 0.3 + Math.sin(this.bobPhase * 1.3) * 0.1;
      this.beam.material.opacity = pulse;
    }
    if (this.ring) {
      this.ring.position.y = this.base.y + bob;
      this.ring.rotation.y += dt * 1.2;
      this.ringMesh.material.opacity = 0.65 + Math.sin(this.bobPhase * 1.7) * 0.25;
      this.ringMesh.scale.setScalar(1 + Math.sin(this.bobPhase * 1.7) * 0.06);
    }
    // Golden sparkles rising from the box (pickup aura — the missing "alive"
    // cue the vision critic kept flagging). Cheap: ~5 sparks every 0.18s.
    this._sparkAcc = (this._sparkAcc || 0) + dt;
    if (this._sparkAcc >= 0.18) {
      this._sparkAcc = 0;
      raceManager?.particles?.emit?.('sparkle', {
        x: this.mesh.position.x + (Math.random() - 0.5) * this.size * 0.8,
        y: this.mesh.position.y - this.size * 0.4,
        z: this.mesh.position.z + (Math.random() - 0.5) * this.size * 0.8,
      }, { count: 5, speed: 2.2, size: 0.2, color: 0xffd166, gravity: -1.5 });
    }

    const list = karts || [];
    const r = CONFIG.items.pickupRadius;
    const rr = r * r;
    for (const kart of list) {
      if (kart.finished || kart.heldItem) continue;
      const p = kartPos(kart);
      const dx = p.x - this.mesh.position.x;
      const dz = p.z - this.mesh.position.z;
      if (dx * dx + dz * dz < rr) {
        raceManager?.pickupItem?.(kart);
        this._consume();
        break;
      }
    }
  }

  _consume() {
    this.active = false;
    this.mesh.visible = false;
    if (this.beam) this.beam.visible = false;
    if (this.ring) this.ring.visible = false;
    this.respawnTimer = CONFIG.game.itemBoxRespawnMs ?? CONFIG.items.itemBoxRespawnMs ?? 6000;
  }
}

/**
 * Place item boxes along the track: a side-by-side PAIR just before the
 * first corner (the genre's classic), then singles alternating sides.
 * Deterministic jitter keeps spacing organic without RNG.
 */
export function createItemBoxes(track, count = 12) {
  const boxes = [];
  // Start pair: two boxes across the road right before turn 1.
  boxes.push(new ItemBox(track, 0.055, 1));
  boxes.push(new ItemBox(track, 0.085, -1));
  const jitter = [0.0, 0.016, -0.024, 0.031, -0.018, 0.022, -0.027, 0.014, -0.02, 0.026];
  const rest = Math.max(0, count - 2);
  for (let i = 0; i < rest; i++) {
    const t = 0.14 + (i / rest) * 0.82 + jitter[i % jitter.length];
    const side = i % 2 === 0 ? 1 : -1;
    boxes.push(new ItemBox(track, Math.min(Math.max(t, 0.001), 0.999), side));
  }
  return boxes;
}
