/**
 * Super Kart 3D.js — main bootstrap & wiring (controller-owned).
 * Boots the full stack: scene → environment → track → postfx → audio →
 * race → menu/HUD/touch. Handles game state machine, camera follow,
 * keyboard input and the ?demo cinematic autopilot used by visual QA.
 */
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createScene } from './render/SceneManager.js';
import { GameLoop } from './game/GameLoop.js';
import { setState, getState, STATES, onStateChange } from './game/GameState.js';
import { buildTrack } from './track/TrackBuilder.js';
import { Environment } from './track/Environment.js';
import { PostFX } from './render/PostFX.js';
import { AudioManager } from './audio/AudioManager.js';
import { RaceManager } from './game/RaceManager.js';
import { Kart } from './entities/Kart.js';
import { AIController } from './entities/AIController.js';
import { createItemBoxes } from './entities/ItemBox.js';
import { ParticleSystem } from './render/Particles.js';
import { Menu } from './ui/Menu.js';
import { HUD } from './ui/HUD.js';
import { TouchControls } from './ui/TouchControls.js';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const container = document.getElementById('app');
const { scene, camera, renderer } = createScene(container);

const env = new Environment();
env.buildEnvironment(scene);
const track = buildTrack(scene);

const postfx = new PostFX(renderer, scene, camera);
const audio = new AudioManager();
const particles = new ParticleSystem(scene);
const raceManager = new RaceManager(scene, camera);
const hud = new HUD();
const menu = new Menu({ onStart: startRace, onColor: setPlayerColor });
const touch = new TouchControls({ onSteer: setTouchSteer, onItem: () => pressItem() });

const DEMO = new URLSearchParams(location.search).has('demo');
let playerColor = CONFIG.kart.playerColors[0];
let playerKart = null;
let aiKarts = [];
let aiControllers = [];
let countdownT = 0;
let countdownIndex = 0;

// Boot lands on the title menu (menu overlay + orbit camera).
setState(STATES.MENU);
menu.show();
if (DEMO) startRace(); // demo autopilot for QA: jump straight into the race

// ---------------------------------------------------------------------------
// Karts
// ---------------------------------------------------------------------------
function buildGridPositions(count) {
  // 2 rows x 3 cols behind the start line
  const out = [];
  const dir = track.startLine.direction.clone().normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  for (let i = 0; i < count; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const pos = track.startLine.position
      .clone()
      .addScaledVector(dir, -(row + 1) * 3.6)
      .addScaledVector(perp, (col - 1) * 2.7);
    pos.y += 0.1;
    out.push({ position: pos, heading: Math.atan2(dir.x, dir.z) });
  }
  return out;
}

function setPlayerColor(color) {
  playerColor = color;
  if (playerKart) {
    playerKart.setBodyColor(color);
  }
}

function buildKarts() {
  const slots = buildGridPositions(CONFIG.game.numKarts);
  const colors = CONFIG.kart.playerColors;

  // Player in slot 0 (back row center) unless demo.
  const playerSlot = DEMO ? 1 : 0;
  const playerPos = DEMO ? slots[1] : slots[0];

  playerKart = new Kart({
    color: playerColor,
    isPlayer: true,
    startPosition: playerPos.position,
    startHeading: playerPos.heading,
  });
  scene.add(playerKart.group);

  aiKarts = [];
  aiControllers = [];
  for (let i = 0; i < CONFIG.game.numKarts; i++) {
    if (!DEMO && i === playerSlot) continue;
    if (DEMO && i === 1) continue; // slot 1 reserved for player visual
    const slot = slots[i];
    const kart = new Kart({
      color: colors[i],
      isPlayer: false,
      startPosition: slot.position,
      startHeading: slot.heading,
    });
    scene.add(kart.group);
    aiKarts.push(kart);
    const ctrl = new AIController(kart, track, raceManager);
    aiControllers.push(ctrl);
  }

  if (DEMO) {
    // Player kart becomes an AI too — cinematic autopilot for QA captures.
    const ctrl = new AIController(playerKart, track, raceManager);
    aiControllers.push(ctrl);
  }
}

// ---------------------------------------------------------------------------
// Input (desktop keyboard)
// ---------------------------------------------------------------------------
const input = { steer: 0, throttle: 0, brake: false, drift: false };
const keys = new Set();
let touchSteer = 0;

function setTouchSteer(v) {
  touchSteer = v;
}

function isTouchMode() {
  return matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;
}

function readKeyboardInput() {
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const right = keys.has('ArrowRight') || keys.has('KeyD');
  const up = keys.has('ArrowUp') || keys.has('KeyW');
  const down = keys.has('ArrowDown') || keys.has('KeyS');
  input.steer = (right ? 1 : 0) - (left ? 1 : 0);
  input.throttle = up ? 1 : 0;
  input.brake = down;
  input.drift = keys.has('ShiftLeft') || keys.has('ShiftRight');
}

function pressItem() {
  if (getState() !== STATES.RACE || !playerKart) return;
  if (!playerKart.heldItem) return;
  raceManager.useHeldItem(playerKart);
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  audio.init(); // first gesture unlocks audio (autoplay policy)
  keys.add(e.code);
  if (e.code === 'Space') {
    e.preventDefault();
    pressItem();
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    // Pause toggles handled by state machine below.
  }
  if (e.code === 'KeyR') {
    if (getState() === STATES.FINISHED || getState() === STATES.RACE) restartRace();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('pointerdown', () => audio.init(), { once: false });
window.addEventListener('touchstart', () => audio.init(), { passive: true });

// ---------------------------------------------------------------------------
// Race lifecycle
// ---------------------------------------------------------------------------
let raceStarted = false;
const COUNTDOWN_MARKS = [3, 2, 1, 0]; // 0 === GO
const COUNTDOWN_STEP = 0.8; // seconds of game-time per number

function startRace() {
  buildKarts();
  const boxes = createItemBoxes(track);
  raceManager.init({
    track,
    playerKart,
    aiKarts,
    itemBoxes: boxes,
    audio,
    particles,
  });
  raceManager.onPlayerFinish = (place, time) => {
    hud.showFinish(place, time);
    audio.play('finish');
    setTimeout(() => audio.play('victory'), 400);
    setState(STATES.FINISHED);
  };
  menu.hide();
  hud.show();
  hud.reset();
  if (isTouchMode()) touch.show();
  audio.startMusic();
  countdownT = 0;
  countdownIndex = 0;
  setState(STATES.COUNTDOWN);
}

function restartRace() {
  raceManager.restart();
  hud.reset();
  hud.show();
  countdownT = 0;
  countdownIndex = 0;
  setState(STATES.COUNTDOWN);
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _side = new THREE.Vector3();

let baseFov = CONFIG.camera.fov;
let shakeTimer = 0;
let shakeMag = 0;

function updateCamera(dt, t) {
  if (DEMO) {
    // Cinematic autopilot: chase the player kart with a swaying side offset
    // so QA frames show karts, road and environment up close.
    if (playerKart) {
      const st = playerKart.state;
      const group = playerKart.group;
      _fwd.set(0, 0, 1).applyQuaternion(group.quaternion);
      _side.set(_fwd.z, 0, -_fwd.x);
      const sway = Math.sin(t * 0.13) * 3.4;
      const desired = st.position
        .clone()
        .addScaledVector(_fwd, -CONFIG.camera.followDistance - 2.5)
        .addScaledVector(_side, sway);
      desired.y += CONFIG.camera.followHeight + 1.4 + Math.sin(t * 0.4) * 0.8;
      const lerp = 1 - Math.exp(-2.4 * dt);
      camPos.lerp(desired, lerp);
      camera.position.copy(camPos);
      const look = st.position.clone().addScaledVector(_fwd, 6);
      look.y += 1.5;
      lookTarget.lerp(look, Math.min(1, dt * 5));
      camera.lookAt(lookTarget);
    }
    return;
  }

  const k = playerKart;
  if (!k) return;
  const st = k.state;
  const group = k.group;

  _fwd.set(0, 0, 1).applyQuaternion(group.quaternion);
  _side.set(_fwd.z, 0, -_fwd.x);

  camTarget.copy(st.position).addScaledVector(_fwd, CONFIG.camera.lookAhead);
  camTarget.y += CONFIG.camera.lookHeight;

  const desired = st.position
    .clone()
    .addScaledVector(_fwd, -CONFIG.camera.followDistance)
    .addScaledVector(_side, 0)
    .addScaledVector(_fwd, 0);
  desired.y += CONFIG.camera.followHeight;

  const lerp = 1 - Math.exp(-CONFIG.camera.lerp * dt);
  camPos.lerp(desired, lerp);
  camera.position.copy(camPos);

  const targetFov = baseFov + (st.boost > 0 ? 6 : 0);
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
  camera.updateProjectionMatrix();

  if (shakeTimer > 0) {
    shakeTimer -= dt;
    camera.position.x += (Math.random() - 0.5) * shakeMag;
    camera.position.y += (Math.random() - 0.5) * shakeMag;
  }

  lookTarget.lerp(camTarget, Math.min(1, dt * 8));
  camera.lookAt(lookTarget);
}

function addShake(mag, duration) {
  shakeMag = mag;
  shakeTimer = duration;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const loop = new GameLoop();
let menuAngle = 0;

loop.start((dt, t) => {
  // Environment animation (clouds, water, flags).
  env.update(dt, t);

  const state = getState();

  if (state === STATES.MENU) {
    // Slow showcase orbit around the track.
    menuAngle += dt * 0.08;
    const r = 30;
    camera.position.set(Math.cos(menuAngle) * r, 14, Math.sin(menuAngle) * r);
    camera.lookAt(0, 3, 0);
  }

  if (state === STATES.COUNTDOWN) {
    countdownT += dt;
    const idx = Math.floor(countdownT / COUNTDOWN_STEP);
    if (idx !== countdownIndex && idx < COUNTDOWN_MARKS.length) {
      countdownIndex = idx;
      const mark = COUNTDOWN_MARKS[idx];
      hud.countdown(mark === 0 ? 'GO' : String(mark));
      audio.play(mark === 0 ? 'go' : 'countdown');
    }
    if (countdownT >= COUNTDOWN_STEP * COUNTDOWN_MARKS.length) {
      raceManager.start();
      setState(STATES.RACE);
      hud.countdown(null); // clear
    }
    updateCamera(dt, t);
  }

  if (state === STATES.RACE || state === STATES.FINISHED) {
    if (state === STATES.RACE) {
      // Player input
      if (!DEMO) {
        readKeyboardInput();
        const steer = isTouchMode() ? touchSteer : input.steer;
        playerKart.setControls({
          steer,
          throttle: isTouchMode() ? 1 : input.throttle || (input.brake ? -1 : 0),
          brake: input.brake,
          drift: input.drift,
        });
      }
      for (const ctrl of aiControllers) ctrl.update(dt);
      raceManager.update(dt);
      hud.update(raceManager, playerKart);
      if (playerKart.state.boost > 0) {
        particles.emit('boost', playerKart.state.position, { color: 0xffa63d });
      }
      if (playerKart.state.drifting) {
        particles.emit('drift', playerKart.state.position, { color: 0xffffff });
      }
    }
    updateCamera(dt, t);
  }

  particles.update(dt);
  postfx.render(dt);
});

// ---------------------------------------------------------------------------
// Public QA hooks
// ---------------------------------------------------------------------------
window.__sk3d = {
  scene,
  camera,
  renderer,
  getState,
  raceManager,
  playerKart: () => playerKart,
  track,
  audio,
  particles,
  startRace,
  restartRace,
  addShake,
  DEMO,
};

console.log('[Super Kart 3D.js] booted. Demo mode:', DEMO, '| State:', getState());
