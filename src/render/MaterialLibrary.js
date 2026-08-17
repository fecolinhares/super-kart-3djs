/**
 * Super Kart 3D.js — tiered material library.
 * Caches materials keyed by (qualityProfileName, materialType, corePropsHash).
 * Respects texture caps from VisualQualityProfile via Materials.canvasTexture.
 * Does NOT alter gameplay — only visual fidelity tiers.
 */
import * as THREE from 'three';
import { createQualityProfile, qualityReport } from './VisualQualityProfile.js';
import {
  toonMaterial,
  plasticMaterial,
  cartoonOutline,
  canvasTexture,
  getGradientMap,
  neonReflectionTexture,
  grilleTexture,
  cityRoadTexture,
  concreteTexture,
  dirtTexture,
  checkerTexture,
  bannerCheckerTexture,
  finishBannerTexture,
  finishBannerTextureMirrored,
  arrowTexture,
  finishLineTexture,
  skyTexture,
  turboPadTexture,
  turboPadChevronTexture,
  turboPadGlowTexture,
  grassTexture,
} from './Materials.js';

const _cache = new Map();

function hashCoreProps(props) {
  // Simple deterministic hash for material core props (color, emissive, etc.)
  // Exclude opts that affect texture cap (already handled by canvasTexture).
  const keys = Object.keys(props).filter(k => !['map', 'textureCap'].includes(k));
  return keys.map(k => `${k}:${props[k]}`).join('|');
}

function getQualityProfileName() {
  return window.__sk3dQualityProfile?.name ?? 'medium';
}

/**
 * Returns a toon material cached by quality tier.
 * The underlying toonMaterial() already uses MeshStandard/MeshPhysical.
 */
export function getToonMaterial(color, opts = {}) {
  const profileName = getQualityProfileName();
  const cacheKey = `toon|${profileName}|${hashCoreProps({ color, ...opts })}`;
  let mat = _cache.get(cacheKey);
  if (!mat) {
    mat = toonMaterial(color, opts);
    _cache.set(cacheKey, mat);
  }
  return mat;
}

/**
 * Returns a plastic material cached by quality tier.
 */
export function getPlasticMaterial(color, opts = {}) {
  const profileName = getQualityProfileName();
  const cacheKey = `plastic|${profileName}|${hashCoreProps({ color, ...opts })}`;
  let mat = _cache.get(cacheKey);
  if (!mat) {
    mat = plasticMaterial(color, opts);
    _cache.set(cacheKey, mat);
  }
  return mat;
}

/**
 * Returns a cartoon outline material (always cheap, but cached for consistency).
 */
export function getCartoonOutlineMaterial(color = 0x1b2a41, thickness = 0.045) {
  const profileName = getQualityProfileName();
  const cacheKey = `outline|${profileName}|${color}|${thickness}`;
  let mat = _cache.get(cacheKey);
  if (!mat) {
    // Outline is a MeshBasicMaterial — cheap, but we cache it anyway.
    mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
    });
    _cache.set(cacheKey, mat);
  }
  return mat;
}

/**
 * Returns a procedural texture (grass, dirt, etc.) respecting textureCap.
 * canvasTexture() already enforces the cap, so we just cache the result.
 */
export function getGrassTexture() {
  const profileName = getQualityProfileName();
  const cacheKey = `grass|${profileName}`;
  let tex = _cache.get(cacheKey);
  if (!tex) {
    tex = grassTexture();
    _cache.set(cacheKey, tex);
  }
  return tex;
}

export function getCityRoadTexture() {
  const profileName = getQualityProfileName();
  const cacheKey = `cityRoad|${profileName}`;
  let tex = _cache.get(cacheKey);
  if (!tex) {
    tex = cityRoadTexture();
    _cache.set(cacheKey, tex);
  }
  return tex;
}

export function getConcreteTexture() {
  const profileName = getQualityProfileName();
  const cacheKey = `concrete|${profileName}`;
  let tex = _cache.get(cacheKey);
  if (!tex) {
    tex = concreteTexture();
    _cache.set(cacheKey, tex);
  }
  return tex;
}

export function getDirtTexture() {
  const profileName = getQualityProfileName();
  const cacheKey = `dirt|${profileName}`;
  let tex = _cache.get(cacheKey);
  if (!tex) {
    tex = dirtTexture();
    _cache.set(cacheKey, tex);
  }
  return tex;
}

export function getNeonReflectionTexture() {
  const profileName = getQualityProfileName();
  const cacheKey = `neonReflect|${profileName}`;
  let tex = _cache.get(cacheKey);
  if (!tex) {
    tex = neonReflectionTexture();
    _cache.set(cacheKey, tex);
  }
  return tex;
}

export function getGrilleTexture() {
  const profileName = getQualityProfileName();
  const cacheKey = `grille|${profileName}`;
  let tex = _cache.get(cacheKey);
  if (!tex) {
    tex = grilleTexture();
    _cache.set(cacheKey, tex);
  }
  return tex;
}

/**
 * Clear the entire material/texture cache — useful when quality profile
 * changes at runtime (via ?quality=) and we want to force rebuild with new caps.
 */
export function clearMaterialCache() {
  _cache.clear();
}

/**
 * Debug: return cache size and keys.
 */
export function getMaterialCacheInfo() {
  return {
    size: _cache.size,
    keys: Array.from(_cache.keys()),
  };
}

// Auto-clear cache if quality profile changes at runtime.
let _lastProfileName = getQualityProfileName();
const _profileCheck = setInterval(() => {
  const current = getQualityProfileName();
  if (current !== _lastProfileName) {
    console.info('[MaterialLibrary] quality profile changed', _lastProfileName, '→', current);
    clearMaterialCache();
    _lastProfileName = current;
  }
}, 1500);
