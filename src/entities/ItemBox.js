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

  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  // soft inner border
  g.strokeStyle = '#dbe7f2';
  g.lineWidth = 8;
  g.strokeRect(4, 4, size - 8, size - 8);
  // big red '?'
  g.fillStyle = '#ff3b4e';
  g.font = '900 86px "Baloo 2", "Nunito", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', size / 2, size / 2 + 6);

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
    // Golden light beam under the box — makes pickups readable at a glance.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(this.size * 0.42, this.size * 0.75, this.size * 2.6, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.set(this.base.x, this.base.y - this.size * 1.35, this.base.z);
    this.beam = beam;
    return mesh;
  }

  _makeMaterial() {
    const tex = questionTexture();
    const opts = {
      color: 0xffffff,
      emissive: 0xffd166, // golden glow — visible from far away
      emissiveIntensity: 0.5,
    };
    if (tex) opts.map = tex;
    if (_toonFactory && _toonResolved) {
      const mat = _toonFactory(0xffffff, opts);
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

    const bob = Math.sin(this.bobPhase) * 0.14;
    this.mesh.position.y = this.base.y + bob;
    this.mesh.rotation.y = this.base.yaw + Math.sin(this.wobble) * 0.12;
    if (this.beam) {
      this.beam.position.y = this.base.y - this.size * 1.35 + bob;
      const pulse = 0.18 + Math.sin(this.bobPhase * 1.3) * 0.06;
      this.beam.material.opacity = pulse;
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
    this.respawnTimer = CONFIG.game.itemBoxRespawnMs ?? CONFIG.items.itemBoxRespawnMs ?? 6000;
  }
}

/**
 * Place ~10 item boxes along the track, alternating sides of the road.
 * Deterministic jitter keeps spacing organic without RNG.
 */
export function createItemBoxes(track, count = BOX_COUNT) {
  const boxes = [];
  const jitter = [0.0, 0.016, -0.024, 0.031, -0.018, 0.022, -0.027, 0.014, -0.02, 0.026];
  for (let i = 0; i < count; i++) {
    const t = 0.06 + (i / count) * 0.92 + jitter[i % jitter.length];
    const side = i % 2 === 0 ? 1 : -1;
    boxes.push(new ItemBox(track, Math.min(Math.max(t, 0.001), 0.999), side));
  }
  return boxes;
}
