/**
 * Super Kart 3D.js — toon materials + procedural canvas textures.
 * The cartoon look is built here: 3-step gradient-map toon shading,
 * crisp dark outlines (inverted hull) and procedural textures.
 */
import * as THREE from 'three';

let _gradientMap = null;

/**
 * 3-step toon gradient map (8x1, NearestFilter) shared by all toon materials.
 * U axis = light intensity → dark / mid / light bands = classic cel shading.
 */
export function getGradientMap() {
  if (_gradientMap) return _gradientMap;
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3d4a63'; // shadow band
  ctx.fillRect(0, 0, 2, 1);
  ctx.fillStyle = '#9fb0cc'; // mid band
  ctx.fillRect(2, 0, 4, 1);
  ctx.fillStyle = '#ffffff'; // lit band
  ctx.fillRect(6, 0, 2, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  _gradientMap = tex;
  return tex;
}

/**
 * Toon material with the shared gradient map.
 * opts: { emissive, emissiveIntensity, transparent, opacity, side }
 */
export function toonMaterial(color, opts = {}) {
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    map: opts.map || null, // textures (e.g. the '?' box) must actually show
  });
  if (opts.map) mat.needsUpdate = true;
  return mat;
}

const _outlineTmp = new THREE.Mesh();

/**
 * Adds a crisp dark cartoon outline to a mesh by cloning it as an
 * inverted-hull BackSide mesh (scaled slightly along normals). The outline
 * mesh is added to the same parent so it moves with the object.
 * Returns the outline mesh (store it if you need to toggle visibility).
 */
export function cartoonOutline(mesh, color = 0x1b2a41, thickness = 0.045) {
  const outlineMat = new THREE.MeshToonMaterial({
    color,
    side: THREE.BackSide,
  });
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.set(
    1 + thickness,
    1 + thickness,
    1 + thickness
  );
  outline.renderOrder = -1;
  mesh.add(outline);
  return outline;
}

/**
 * Procedural canvas texture helper.
 * drawFn(ctx, size) draws the pattern; returns a CanvasTexture.
 * opts: { repeat, wrap } — repeat = [x, y] tile counts.
 */
export function canvasTexture(size, drawFn, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  return tex;
}

// ---------------------------------------------------------------------------
// Shared procedural textures (cached, created lazily)
// ---------------------------------------------------------------------------
let _grassTex = null;
let _roadTex = null;
let _checkerTex = null;
let _bannerCheckerTex = null;
let _skyTex = null;
let _turboPadTex = null;

/** Grass: two-tone green noise dots, tileable. */
export function grassTexture() {
  if (_grassTex) return _grassTex;
  _grassTex = canvasTexture(
    128,
    (ctx, s) => {
      ctx.fillStyle = '#3faf4e';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        ctx.fillStyle = Math.random() > 0.5 ? '#47bb57' : '#379c45';
        ctx.fillRect(x, y, 2, 2);
      }
      // soft darker patches
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = '#2f8f43';
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 14 + Math.random() * 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    { repeat: [30, 30] }
  );
  return _grassTex;
}

/** Asphalt: dark blue-grey with fine speckle + tire wear tracks, tileable. */
export function roadTexture() {
  if (_roadTex) return _roadTex;
  _roadTex = canvasTexture(
    128,
    (ctx, s) => {
      ctx.fillStyle = '#5a6b7d';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 500; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#52626f' : '#64768a';
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      // tire wear tracks (two darker ribbons running along the road)
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#3c4654';
      ctx.fillRect(0, Math.floor(s * 0.28), s, 5);
      ctx.fillRect(0, Math.floor(s * 0.66), s, 5);
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#2f3844';
      ctx.fillRect(0, Math.floor(s * 0.34), s, 3);
      ctx.fillRect(0, Math.floor(s * 0.72), s, 3);
      ctx.globalAlpha = 1;
      // subtle white wear flecks
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 24; i++) {
        ctx.fillRect(Math.random() * s, Math.floor(s * 0.28) + Math.random() * 6, 3, 1);
      }
      ctx.globalAlpha = 1;
    },
    { repeat: [4, 4] }
  );
  return _roadTex;
}

/** Checkered start line (2x8 squares, classic black/white). 2 across the
 *  short axis (3.2m travel length) x 8 along the road width (7.8m) — the
 *  box UVs stretch U along X (short) and V along Z (wide), so 2x8 gives
 *  near-square checker squares on the asphalt. */
export function checkerTexture() {
  if (_checkerTex) return _checkerTex;
  _checkerTex = canvasTexture(
    128,
    (ctx, s) => {
      const cw = s / 2;
      const ch = s / 8;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 8; j++) {
          ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#1b2a41';
          ctx.fillRect(i * cw, j * ch, cw, ch);
        }
      }
    }
  );
  return _checkerTex;
}

/** Gantry banner checker: 8x2 (8 along the wide banner, 2 tall). */
export function bannerCheckerTexture() {
  if (_bannerCheckerTex) return _bannerCheckerTex;
  _bannerCheckerTex = canvasTexture(
    256,
    (ctx, s) => {
      const cw = s / 8;
      const ch = s / 2;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#1b2a41';
          ctx.fillRect(i * cw, j * ch, cw, ch);
        }
      }
      // Bold FINISH word across the middle of the banner, on a solid band
      // so it stays readable over the checker pattern.
      ctx.fillStyle = '#1b2a41';
      ctx.fillRect(0, s * 0.32, s, s * 0.36);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 60px "Baloo 2", "Nunito", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FINISH', s / 2, s / 2 + 3);
    }
  );
  return _bannerCheckerTex;
}

/** Sky gradient dome texture. */
export function skyTexture() {
  if (_skyTex) return _skyTex;
  _skyTex = canvasTexture(
    2,
    (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, '#3fa9e8');
      g.addColorStop(0.45, '#6fc4f2');
      g.addColorStop(0.75, '#a8e6ff');
      g.addColorStop(1, '#d9f4ff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
  );
  return _skyTex;
}

/** Turbo pad: bright yellow base with white zebra chevron stripes (reads as
 *  a speed-up pad from the chase camera, no lighting needed). */
export function turboPadTexture() {
  if (_turboPadTex) return _turboPadTex;
  _turboPadTex = canvasTexture(
    128,
    (ctx, s) => {
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(0, 0, s, s);
      // white diagonal stripes (zebra/chevron)
      ctx.fillStyle = '#ffffff';
      const stripeW = 20;
      for (let i = -s; i < s * 2; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + stripeW, 0);
        ctx.lineTo(i + stripeW - s, s);
        ctx.lineTo(i - s, s);
        ctx.closePath();
        ctx.fill();
      }
      // thin amber divider lines between stripes for contrast
      ctx.strokeStyle = '#f0a530';
      ctx.lineWidth = 3;
      for (let i = -s; i < s * 2; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i + stripeW + 2, 0);
        ctx.lineTo(i + stripeW + 2 - s, s);
        ctx.stroke();
      }
    }
  );
  return _turboPadTex;
}
