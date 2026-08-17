/**
 * Super Kart 3D.js — renderer / scene / camera factory.
 * Controller-owned base. PostFX (bloom etc.) is added by the track agent.
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: CONFIG.render.antialias,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Mobile perf tier (audit v4 F8): coarse pointers get a lower pixel ratio —
  // the GPU stays headroom-free for bloom + shadows on phones.
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const cap = coarse ? Math.min(CONFIG.render.pixelRatioCap, 1.5) : CONFIG.render.pixelRatioCap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
  if (CONFIG.render.shadows) {
    renderer.shadowMap.enabled = true;
    // PCF + shadow.radius gives VISIBLY softer edges (the lighting agent
    // flagged: radius is INERT with PCFSoftShadowMap — the vision critic
    // wanted softer contact shadows). QA/?test drops to 1024.
    const TEST = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('test');
    renderer.shadowMap.type = TEST ? THREE.PCFShadowMap : THREE.PCFShadowMap;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  container.appendChild(renderer.domElement);

  // AUDIT (Jarvis QA loop 2026-08-11): WebGL context loss froze the game
  // silently (the rAF loop dies with no JS error — no handler existed).
  // Real-GPU post chains (UnrealBloom HalfFloat) can crash the GPU process
  // seconds into the race; without a handler the game just freezes. Prevent
  // the default (so the browser CAN restore) and, if we don't recover fast,
  // reload with bloom disabled (?nobl=1) so the race is still playable.
  const glCanvas = renderer.domElement;
  let _ctxLostAt = 0;
  glCanvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    _ctxLostAt = Date.now();
    console.warn('[Super Kart] WebGL context lost — attempting recovery (fallback: ?nobl=1)');
    // If the browser doesn't restore quickly, hard-reload without bloom.
    setTimeout(() => {
      if (Date.now() - _ctxLostAt >= 2000) {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('nobl')) url.searchParams.set('nobl', '1');
        window.location.href = url.toString();
      }
    }, 2000);
  });
  glCanvas.addEventListener('webglcontextrestored', () => {
    console.warn('[Super Kart] WebGL context restored');
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // replaced by sky dome later

  const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 4, 9);
  camera.lookAt(0, 1, 0);

  return { scene, camera, renderer };
}
