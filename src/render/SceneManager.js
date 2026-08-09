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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

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
