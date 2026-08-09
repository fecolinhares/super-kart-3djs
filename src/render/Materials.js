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
  ctx.fillStyle = '#d8dee8'; // mid band — NEUTRAL (was #9fb0cc: cast blue-gray
  ctx.fillRect(2, 0, 4, 1); //  over every mid-tone, killing saturated paint)
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

/**
 * Shared glossy painted-plastic PBR material — the MK8 painted-plastic cue:
 * cartoon body shells read as polished toys, not raw matte plastic.
 * Requires scene.environment (set in main.js) to show reflections.
 * opts: { roughness, metalness, clearcoat, clearcoatRoughness, envMapIntensity }
 */
export function plasticMaterial(color, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: opts.roughness ?? 0.24,
    metalness: opts.metalness ?? 0.05,
    clearcoat: opts.clearcoat ?? 1.0,
    clearcoatRoughness: opts.clearcoatRoughness ?? 0.15,
    envMapIntensity: opts.envMapIntensity ?? 1.6,
  });
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
let _concreteTex = null;
/** Urban concrete: grey pavement with speckle, expansion lines + patches.
 *  Used by NEON CITY's ground (vision critic: flat black void needs detail). */
export function concreteTexture() {
  if (_concreteTex) return _concreteTex;
  _concreteTex = canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#4a4d5c';
      ctx.fillRect(0, 0, s, s);
      // speckle
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#585b6c' : '#3c3f4e';
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      // expansion joints (horizontal + vertical lines)
      ctx.strokeStyle = '#33363f';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (s / 4) * i);
        ctx.lineTo(s, (s / 4) * i);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo((s / 4) * i, 0);
        ctx.lineTo((s / 4) * i, s);
        ctx.stroke();
      }
      // worn dark patches
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = '#33363f';
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 12 + Math.random() * 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    { repeat: [80, 80] }
  );
  return _concreteTex;
}

let _dirtTex = null;
let _checkerTex = null;
let _bannerCheckerTex = null;
let _skyTex = null;
let _turboPadTex = null;

/** Dirt shoulder: tan earth with speckle + worn patches (audit V3 — the
 *  shoulder was a flat untextured ribbon, the loudest "draft" cue left). */
export function dirtTexture() {
  if (_dirtTex) return _dirtTex;
  _dirtTex = canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#d9b98c';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#c9a97c' : '#e2c69b';
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      // worn darker patches
      ctx.globalAlpha = 0.16;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = '#a5845c';
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 14 + Math.random() * 24, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // scattered pebbles
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#8f7452';
      for (let i = 0; i < 120; i++) {
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      ctx.globalAlpha = 1;
    },
    { repeat: [20, 20] }
  );
  return _dirtTex;
}

/** Grass: layered green noise + blade strokes + soft patches, tileable. */
export function grassTexture() {
  if (_grassTex) return _grassTex;
  _grassTex = canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#3faf4e';
      ctx.fillRect(0, 0, s, s);
      // base two-tone speckle
      for (let i = 0; i < 2600; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        ctx.fillStyle = Math.random() > 0.5 ? '#47bb57' : '#379c45';
        ctx.fillRect(x, y, 2, 2);
      }
      // individual grass blades (short strokes, slight color variation)
      for (let i = 0; i < 320; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const len = 4 + Math.random() * 7;
        const a = Math.random() * Math.PI;
        ctx.strokeStyle = Math.random() > 0.5 ? '#4cc25e' : '#2f8f43';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
      // soft darker + lighter patches — SMALL and numerous (vision critic:
      // big patches read as banding; fine stipple reads as natural variation)
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = i % 2 ? '#2f8f43' : '#357f46';
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 9 + Math.random() * 16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 22; i++) {
        ctx.fillStyle = '#55cc68';
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 8 + Math.random() * 14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    { repeat: [50, 50] }
  );
  return _grassTex;
}

/** Asphalt: dark blue-grey with fine speckle + tire wear + cracks, tileable. */
export function roadTexture() {
  if (_roadTex) return _roadTex;
  _roadTex = canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#5a6b7d';
      ctx.fillRect(0, 0, s, s);
      // dense speckle (stone feel)
      for (let i = 0; i < 2200; i++) {
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
      // large oil/rubber patches (macro contrast — reads in screenshots)
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#2b3542';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * s, Math.random() * s, 18 + Math.random() * 30, 10 + Math.random() * 18, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#6d7f92';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * s, Math.random() * s, 14 + Math.random() * 24, 8 + Math.random() * 14, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      // subtle cracks (short dark jagged strokes)
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#2f3844';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const len = 6 + Math.random() * 16;
        const a = Math.random() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5);
        ctx.lineTo(x + Math.cos(a + 0.4) * len, y + Math.sin(a + 0.4) * len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // subtle white wear flecks
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
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
    512,
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
      // so it stays readable over the checker pattern. 512px canvas keeps
      // the glyphs crisp even from the chase camera.
      ctx.fillStyle = '#1b2a41';
      ctx.fillRect(0, s * 0.28, s, s * 0.44);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 118px "Baloo 2", "Nunito", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FINISH', s / 2, s / 2 + 4);
    }
  );
  return _bannerCheckerTex;
}

/** Direction arrow painted on the road at sharp corners (white chevron on
 *  a transparent card, so MeshBasicMaterial reads it unlit over asphalt). */
let _arrowTex = null;
export function arrowTexture() {
  if (_arrowTex) return _arrowTex;
  _arrowTex = canvasTexture(
    128,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.translate(s / 2, s / 2);
      // Two chevrons pointing "up" the road direction.
      ctx.strokeStyle = '#f4f6f8';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-34, 16);
      ctx.lineTo(0, -26);
      ctx.lineTo(34, 16);
      ctx.moveTo(-18, 40);
      ctx.lineTo(0, 0);
      ctx.lineTo(18, 40);
      ctx.stroke();
      // Thin amber outline for pop.
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  );
  return _arrowTex;
}

/** Finish-line painted on the asphalt: classic 8x2 checker band. */
let _finishTex = null;
export function finishLineTexture() {
  if (_finishTex) return _finishTex;
  _finishTex = canvasTexture(
    256,
    (ctx, s) => {
      const cw = s / 6;
      const ch = s / 2;
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#0f1218';
          ctx.fillRect(i * cw, j * ch, cw, ch);
        }
      }
    }
  );
  return _finishTex;
}

/** Sky gradient dome texture: painted sun disc + glow + horizon haze
 *  (audit V3 — was a bare 2px gradient, read as a placeholder backdrop). */
export function skyTexture() {
  if (_skyTex) return _skyTex;
  _skyTex = canvasTexture(
    512,
    (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, '#2e9be8');
      g.addColorStop(0.4, '#6fc4f2');
      g.addColorStop(0.72, '#b8e6ff');
      g.addColorStop(0.88, '#e8f7ff'); // horizon haze
      g.addColorStop(1, '#d9f4ff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      // sun disc + halo (center of the dome — visible straight ahead)
      const sunX = s * 0.5;
      const sunY = s * 0.18;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#fff7cf';
      ctx.beginPath();
      ctx.arc(sunX, sunY, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fffdf0';
      ctx.beginPath();
      ctx.arc(sunX, sunY, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
      // a few faint high cloud wisps
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        const cx = Math.random() * s;
        const cy = s * (0.1 + Math.random() * 0.35);
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * (0.06 + Math.random() * 0.05), s * 0.012, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  );
  return _skyTex;
}

/** Turbo pad: bright amber base with three bold white chevrons ">>>" pointing
 *  along the track direction (reads as a speed-up pad instantly). */
export function turboPadTexture() {
  if (_turboPadTex) return _turboPadTex;
  _turboPadTex = canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#ffc233';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = s * 0.09;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < 3; i++) {
        const cx = s * 0.5;
        const cy = s * (0.26 + i * 0.24);
        const half = s * 0.16;
        ctx.beginPath();
        ctx.moveTo(cx - half, cy - half);
        ctx.lineTo(cx + half, cy);
        ctx.lineTo(cx - half, cy + half);
        ctx.stroke();
      }
    }
  );
  return _turboPadTex;
}
