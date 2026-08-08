/**
 * Super Kart 3D.js — main bootstrap & wiring.
 * Controller-owned: do not rewrite during feature sub-agent tasks.
 */
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createScene } from './render/SceneManager.js';
import { GameLoop } from './game/GameLoop.js';
import { setState, getState, STATES } from './game/GameState.js';

// ---- boot ---------------------------------------------------------------
const container = document.getElementById('app');
const { scene, camera, renderer } = createScene(container);
const clock = new THREE.Clock();

// Ambient fill so the skeleton scene isn't pitch black (env replaces later).
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xfff2cc, 2.2);
sun.position.set(40, 60, 20);
scene.add(sun);

// Temporary placeholder kart so the skeleton renders something.
const tmp = new THREE.Mesh(
  new THREE.BoxGeometry(1, 0.6, 1.8),
  new THREE.MeshToonMaterial({ color: 0xff5a5f })
);
tmp.position.set(0, 1, 0);
scene.add(tmp);
camera.position.set(0, 3, 8);
camera.lookAt(0, 1, 0);

// ---- loop ---------------------------------------------------------------
const loop = new GameLoop();
loop.start((dt, t) => {
  tmp.rotation.y += dt * 0.8;
  camera.position.x = Math.sin(t * 0.3) * 2.5;
  camera.lookAt(0, 1, 0);
  renderer.render(scene, camera);
});

// ---- resize -------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for QA/demo hooks.
window.__sk3d = { scene, camera, renderer, getState };

console.log('[Super Kart 3D.js] booted. State:', getState());
