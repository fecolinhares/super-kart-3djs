/**
 * Super Kart 3D.js — toon materials + procedural canvas textures.
 * The cartoon look is built here: 3-step gradient-map toon shading,
 * crisp dark outlines (inverted hull) and procedural textures.
 */
import * as THREE from 'three';

let _gradientMap = null;

/**
 * Toon gradient map shared by all toon materials.
 * AUDITOR FIX: the old map was 8x1 with THREE hard bands (2px dark / 4px
 * mid / 2px white, NearestFilter) — every large surface (road, terrain,
 * grandstand, chassis) shaded in harsh flat bands that read "low poly".
 * Now 64x1 with SMOOTH transitions (dark→mid→light with soft ramps): the
 * cel look survives, but surfaces shade like a premium cartoon, not a
 * 3-band posterize.
 */
export function getGradientMap() {
  if (_gradientMap) return _gradientMap;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0.0, '#3d4a63');   // shadow
  grad.addColorStop(0.22, '#3d4a63');  // hold shadow
  grad.addColorStop(0.42, '#8d97ab');  // soft ramp into mid
  grad.addColorStop(0.60, '#d8dee8');  // mid (neutral — keeps paint saturated)
  grad.addColorStop(0.78, '#eef1f5');  // soft ramp into lit
  grad.addColorStop(1.0, '#ffffff');   // lit
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.NearestFilter;  // still stepwise across the 64px ramp
  tex.magFilter = THREE.NearestFilter;  // (band count high enough to read smooth)
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  _gradientMap = tex;
  return tex;
}

/**
 * Cartoon material — AAA REBUILD (MK8D pipeline).
 * The old MeshToonMaterial + 3-band gradient map shaded every surface in
 * harsh flat bands — the single loudest "low-poly/draft" cue the user keeps
 * flagging. MK8D is PBR-stylized (vibrant colors, continuous shading, glossy
 * highlights), so this now returns MeshStandardMaterial: it responds to the
 * 3-point rig AND the sunny-sky IBL with smooth gradients + subtle sheen.
 * Contract is unchanged ({color, emissive, emissiveIntensity, transparent,
 * opacity, side, map}) — every existing call site keeps working.
 */
export function toonMaterial(color, opts = {}) {
  // AUDIT r2: clearcoat/envMapIntensity promote the material to
  // MeshPhysicalMaterial — glossy surfaces (racing line, wet surfaces) get
  // real specular instead of reading flat matte.
  const usePhysical = opts.clearcoat !== undefined || opts.envMapIntensity !== undefined;
  const mat = usePhysical
    ? new THREE.MeshPhysicalMaterial({
        color,
        roughness: opts.roughness ?? 0.82,
        metalness: opts.metalness ?? 0.0,
        emissive: opts.emissive || 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        clearcoat: opts.clearcoat ?? 0,
        clearcoatRoughness: opts.clearcoatRoughness ?? 0.3,
        envMapIntensity: opts.envMapIntensity ?? 1,
        transparent: !!opts.transparent,
        opacity: opts.opacity ?? 1,
        side: opts.side ?? THREE.FrontSide,
        map: opts.map || null, // textures (e.g. the '?' box) must actually show
      })
    : new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.82,
        metalness: opts.metalness ?? 0.0,
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
  // MeshBasicMaterial (was MeshToonMaterial) — the outline must not depend
  // on the retired toon gradient map; unlit black reads the same.
  const outlineMat = new THREE.MeshBasicMaterial({
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
  // AUDIT r2: global anisotropy kills the moiré shimmer on repeated grass /
  // dirt / concrete tiles at grazing chase-cam angles (only roadTexture set
  // it before).
  tex.anisotropy = 8;
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
      // LARGE soft mow/stripe variation (audit r5: from chase distance the
      // fine stipple reads as uniform green — big low-alpha patches break
      // the monotony without banding).
      ctx.globalAlpha = 0.14;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? '#2f8f43' : '#57c96b';
        ctx.beginPath();
        ctx.ellipse(Math.random() * s, Math.random() * s, 34 + Math.random() * 30, 22 + Math.random() * 20, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    { repeat: [50, 50] }
  );
  return _grassTex;
}

/** Asphalt: dark blue-grey with fine speckle + tire wear + cracks, tileable.
 *  USER/VISION FIX: the old tile had CONTINUOUS horizontal wear bands
 *  (fillRect across the whole tile) that repeated every ~16m and read as
 *  hard horizontal banding from the chase cam. Wear is now broken into
 *  irregular dashed ribbons + scattered patches so no straight line repeats.
 */
export function roadTexture() {
  if (_roadTex) return _roadTex;
  _roadTex = canvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#5a6b7d';
      ctx.fillRect(0, 0, s, s);
      // dense speckle (stone feel)
      for (let i = 0; i < 6200; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#52626f' : '#64768a';
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      // Tire wear: TWO dashed ribbons (broken dashes, never a full line) —
      // the dash gaps break the periodic banding the old fillRect caused.
      const wearY = [s * 0.27, s * 0.64];
      for (const wy of wearY) {
        for (let x = 0; x < s; x += 7 + Math.random() * 10) {
          const len = 5 + Math.random() * 14;
          const alpha = 0.14 + Math.random() * 0.14;
          ctx.fillStyle = '#2e3846';
          ctx.globalAlpha = alpha;
          ctx.fillRect(x, wy + (Math.random() - 0.5) * 4, len, 3 + Math.random() * 2);
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillStyle = '#252e3a';
          ctx.fillRect(x, wy + 4 + (Math.random() - 0.5) * 3, len, 2);
        }
      }
      // Racing-line rubber buildup: a heavier darkened band between the two
      // tire ribbons — SPLIT into overlapping irregular segments (a single
      // wide fillRect repeated every tile read as broad tonal striping).
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#3a4554';
      for (let x = -10; x < s + 10; x += 5 + Math.random() * 9) {
        ctx.fillRect(x, s * 0.43 + (Math.random() - 0.5) * 6, 9 + Math.random() * 12, s * 0.10 + Math.random() * 6);
      }
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = '#313b49';
      for (let x = -10; x < s + 10; x += 6 + Math.random() * 8) {
        ctx.fillRect(x, s * 0.45 + (Math.random() - 0.5) * 8, 4 + Math.random() * 8, 2 + Math.random() * 3);
      }
      ctx.globalAlpha = 1;
      // Scattered oil/rubber patches — MEDIUM size, many, low alpha (big
      // single blobs repeated = visible macro banding; small many = natural).
      for (let i = 0; i < 26; i++) {
        ctx.globalAlpha = 0.10 + Math.random() * 0.10;
        ctx.fillStyle = Math.random() > 0.5 ? '#2b3542' : '#333f4e';
        ctx.beginPath();
        ctx.ellipse(Math.random() * s, Math.random() * s, 8 + Math.random() * 16, 4 + Math.random() * 9, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      // Slightly lighter worn sheen patches (rubbered-in racing line).
      for (let i = 0; i < 18; i++) {
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = '#6d7f92';
        ctx.beginPath();
        ctx.ellipse(Math.random() * s, Math.random() * s, 10 + Math.random() * 18, 5 + Math.random() * 10, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // subtle cracks (short dark jagged strokes)
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = '#2f3844';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const len = 8 + Math.random() * 22;
        const a = Math.random() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5);
        ctx.lineTo(x + Math.cos(a + 0.4) * len, y + Math.sin(a + 0.4) * len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // fine white wear flecks along the racing line
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 90; i++) {
        ctx.fillRect(Math.random() * s, s * 0.27 + Math.random() * 8 - 4, 3 + Math.random() * 3, 1);
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
 *  near-square checker squares on the asphalt.
 *  AUDIT r11 (FECO): 128px -> 512px so painted checkers read crisp, not
 *  blocky, at chase-cam distance. */
export function checkerTexture() {
  if (_checkerTex) return _checkerTex;
  _checkerTex = canvasTexture(
    512,
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

/** Gantry edge checker: crisp 8x2 (8 along, 2 tall) black/white checker,
 *  256px. PURE pattern — the FINISH text lives in finishBannerTexture.
 *  AUDIT r11 (FECO): the old 512px SQUARE canvas baked 118px glyphs that
 *  mapped ~4.7x wider than tall across the wide banner plane — the
 *  'stretched low-res' banner. Used now as the checkered trim on the
 *  gantry beam's track-facing faces. */
export function bannerCheckerTexture() {
  if (_bannerCheckerTex) return _bannerCheckerTex;
  _bannerCheckerTex = canvasTexture(
    256,
    (ctx, s) => {
      const cw = s / 8;
      const ch = s / 2;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#0f1218';
          ctx.fillRect(i * cw, j * ch, cw, ch);
        }
      }
    }
  );
  return _bannerCheckerTex;
}

/** Gantry FINISH banner: 512x128 — aspect-matched to the ~9.8m x 2.1m
 *  banner plane (~4.7:1), so the artwork maps 1:1 with NO stretching
 *  (AUDIT r11 FECO: the old square 512px canvas made the FINISH glyphs
 *  4.7x wider than tall — the stretched low-res look). Navy field, big
 *  white FINISH, crisp checkered bands top + bottom — MK8D style. */
let _finishBannerTex = null;
export function finishBannerTexture() {
  if (_finishBannerTex) return _finishBannerTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  // Navy field.
  g.fillStyle = '#14213d';
  g.fillRect(0, 0, 512, 128);
  // Checkered bands (top + bottom edges): 16 crisp cells across.
  const bandH = 22;
  const cells = 16;
  const cw = 512 / cells;
  for (const by of [0, 128 - bandH]) {
    for (let i = 0; i < cells; i++) {
      g.fillStyle = i % 2 === 0 ? '#ffffff' : '#0f1218';
      g.fillRect(i * cw, by, cw, bandH);
    }
  }
  // Pinstripe separators so the bands read as a designed border.
  g.fillStyle = '#3d4f78';
  g.fillRect(0, bandH, 512, 2);
  g.fillRect(0, 128 - bandH - 2, 512, 2);
  // Big white FINISH centered on the navy field, dark offset copy behind
  // for contrast so it stays crisp from the chase camera.
  g.font = '900 76px "Baloo 2", "Nunito", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#0a1120';
  g.fillText('FINISH', 258, 66);
  g.fillStyle = '#ffffff';
  g.fillText('FINISH', 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  _finishBannerTex = tex;
  return _finishBannerTex;
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

/** Finish-line painted on the asphalt: classic 8x2 checker band.
 *  AUDIT r11 (FECO): 1024px + 8x2 — the ~1.1m squares stay razor crisp
 *  across the ~8.8m plane under the gantry (no stretched low-res strip). */
let _finishTex = null;
export function finishLineTexture() {
  if (_finishTex) return _finishTex;
  _finishTex = canvasTexture(
    1024,
    (ctx, s) => {
      const cw = s / 8;
      const ch = s / 2;
      for (let i = 0; i < 8; i++) {
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
