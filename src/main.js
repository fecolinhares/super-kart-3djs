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

const DEMO = new URLSearchParams(location.search).has('demo');
const TEST = new URLSearchParams(location.search).has('test'); // fast no-postfx mode for gameplay testing

const env = new Environment();
const track = buildTrack(scene);
env.buildEnvironment(scene, track); // track passed so props avoid the road

const postfx = new PostFX(renderer, scene, camera);
if (TEST) postfx.enabled = false; // software GL runs ~30x faster without bloom
const audio = new AudioManager();
const particles = new ParticleSystem(scene);
const raceManager = new RaceManager(scene, camera);
const hud = new HUD(track);
const menu = new Menu({ onStart: startRace, onColor: setPlayerColor, onSound: (n) => audio.play(n) });
const touch = new TouchControls({ onSteer: setTouchSteer, onItem: () => pressItem() });

// Default player color matches their character's identity color; the menu
// picker can override it (setPlayerColor → setBodyColor).
let playerColor = CONFIG.kart.characters[0].color;
let playerKart = null;
let aiKarts = [];
let aiControllers = [];
let countdownT = 0;
let countdownIndex = -1;
let offroadT = 0.55; // off-road gravel SFX accumulator (feedback audit)
let lastHeldItem = null;
let turboParticleAcc = 0; // accumulator: burst once per 0.1s while turbo-boosting

// Boot lands on the title menu (menu overlay + orbit camera).
setState(STATES.MENU);
menu.show();
if (DEMO || TEST) startRace(); // demo autopilot / fast test mode jump straight in

// Quality gate (audio lifecycle): pause all audio when the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    audio.suspend();
  } else {
    audio.resume();
  }
});

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

/** Drift mini-boost drama: SFX + golden spark burst on release (all karts). */
function wireMiniBoost(kart) {
  kart._onMiniBoost = () => {
    if (!kart.isPlayer) audio.play('driftReleaseMiniBoost', { volume: 0.45, pan: (kart.group.position.x - playerKart.group.position.x) * 0.02 });
    else audio.play('driftReleaseMiniBoost', { volume: 0.8 });
    if (particles) {
      particles.emit('sparkle', kart.state.position.clone().add(new THREE.Vector3(0, 0.6, 0)), {
        count: 18, speed: 5.5, size: 0.3, spread: 1.8, color: 0xffd166,
      });
    }
  };
}

function buildKarts() {
  const slots = buildGridPositions(CONFIG.game.numKarts);
  const characters = CONFIG.kart.characters; // roster: [0] player, [1..5] AI
  // Player in slot 0 (back row center) unless demo.
  const playerSlot = DEMO ? 1 : 0;
  const playerPos = DEMO ? slots[1] : slots[0];

  playerKart = new Kart({
    color: playerColor, // menu picker wins; defaults to character[0].color
    character: characters[0],
    isPlayer: true,
    number: 1,
    startPosition: playerPos.position,
    startHeading: playerPos.heading,
  });
  scene.add(playerKart.group);
  wireMiniBoost(playerKart);

  aiKarts = [];
  aiControllers = [];
  let aiNum = 2;
  let charIdx = 1; // AI roster: characters[1..5] (player owns characters[0])
  for (let i = 0; i < CONFIG.game.numKarts; i++) {
    if (!DEMO && i === playerSlot) continue;
    if (DEMO && i === 1) continue; // slot 1 reserved for player visual
    const slot = slots[i];
    const kart = new Kart({
      character: characters[charIdx % characters.length],
      isPlayer: false,
      number: aiNum++,
      startPosition: slot.position,
      startHeading: slot.heading,
    });
    charIdx++;
    scene.add(kart.group);
    wireMiniBoost(kart);
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
  raceManager.useItem(playerKart);
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
const COUNTDOWN_MARKS = [3, 2, 1, 0]; // 0 === GO
const COUNTDOWN_STEP = TEST ? 0.25 : 0.6; // snappier start; test mode even faster

// Start-light animation on the gantry (countdown 3-2-1 → green on GO).
const LAMP_RED = 0xff3b30;
const LAMP_GREEN = 0x4ade80;
const LAMP_OFF = 0x3a4252;

function setStartLights(state) {
  // state: 0 = all off, 1..3 = n red lamps lit, 4 = all green
  if (!track.startLights) return;
  const green = state >= 4;
  const lit = Math.min(state, 3);
  track.startLights.forEach((lamp, i) => {
    const on = i < lit || green;
    lamp.material.color.setHex(on ? (green ? LAMP_GREEN : LAMP_RED) : LAMP_OFF);
    lamp.material.emissive.setHex(on ? (green ? LAMP_GREEN : LAMP_RED) : 0x000000);
    lamp.material.emissiveIntensity = on ? 1.4 : 0;
  });
}

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
    // Cruise mode (genre standard): the kart keeps driving automatically at
    // reduced speed, engine hums quietly and the music swells over the SFX.
    playerKart.cruiseSpeed = CONFIG.physics.maxSpeed * 0.6;
    aiControllers.push(new AIController(playerKart, track, raceManager));
    audio.setMusicVolume(1);
    audio.play('finish');
    setTimeout(() => audio.play('victory'), 400);
    setState(STATES.FINISHED);
  };
  playerKart.position = CONFIG.game.numKarts; // starts last on the grid
  menu.hide();
  hud.show();
  hud.reset();
  if (isTouchMode()) touch.show();
  audio.startMusic();
  countdownT = 0;
  countdownIndex = -1;
  setState(STATES.COUNTDOWN);
}

function restartRace() {
  audio.clearEngineLoops(); // restart engine sounds from scratch (no echo/doubling)
  raceManager.restart();
  if (playerKart) playerKart.position = CONFIG.game.numKarts;
  hud.reset();
  hud.show();
  countdownT = 0;
  countdownIndex = -1;
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

/** Wavy fabric animation for the finish-line banner (segmented plane). */
function waveBanner(t) {
  const banner = track?.startLine?.banner;
  if (!banner || !banner.geometry?.attributes?.position) return;
  const pos = banner.geometry.attributes.position;
  const amp = 0.12; // subtle fabric wave — keeps FINISH legible at distance
  const freq = 0.55;
  const speed = 2.4;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin(x * freq + t * speed) * amp + Math.sin(x * freq * 2.1 - t * speed * 0.7) * amp * 0.35);
  }
  pos.needsUpdate = true;
  banner.geometry.computeVertexNormals();
}

function updateCamera(dt, t) {
  if (window.__freezeCam) return; // QA hook: freeze the chase camera
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
        .addScaledVector(_fwd, -CONFIG.camera.followDistance - 4.2)
        .addScaledVector(_side, sway);
      desired.y += CONFIG.camera.followHeight + 2.2 + Math.sin(t * 0.4) * 0.8;
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
      setStartLights(mark === 0 ? 4 : mark); // 3/2/1 → red lamps, GO → green
      if (mark === 0 && raceManager.karts.length) {
        // Start burst: tire smoke at every kart + confetti over the grid.
        for (const k of raceManager.karts) {
          if (!k.state) continue;
          particles.emit('exhaust', k.state.position, { count: 22, color: 0xcfd6e0, speed: 3.0 });
        }
        const gridKart = raceManager.karts[Math.floor(raceManager.karts.length / 2)];
        if (gridKart && gridKart.state) {
          particles.emit('confetti', gridKart.state.position, { count: 90 });
          particles.emit('confetti', gridKart.state.position, { count: 70, color: 0xffd166 });
        }
      }
    }
    if (countdownT >= COUNTDOWN_STEP * COUNTDOWN_MARKS.length) {
      raceManager.start();
      setState(STATES.RACE);
      hud.countdown(null); // clear
    }
    hud.update(raceManager, playerKart, raceManager.karts); // live rank during countdown too
    updateCamera(dt, t);
  }

  if (state === STATES.RACE || state === STATES.FINISHED) {
    waveBanner(t);
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
      hud.update(raceManager, playerKart, raceManager.karts);
      // Toast the item the player just picked up — ICON first, then name.
      if (playerKart.heldItem && playerKart.heldItem !== lastHeldItem) {
        lastHeldItem = playerKart.heldItem;
        // Keys match PowerUpType VALUES (lowercase): mushroom, shell, red_shell…
        const ITEMS = {
          mushroom: ['🍄', 'Mushroom'],
          shell: ['🐢', 'Green Shell'],
          red_shell: ['🐢', 'Red Shell'],
          banana: ['🍌', 'Banana'],
          star: ['⭐', 'Star'],
          lightning: ['⚡', 'Lightning'],
        };
        const [icon, name] = ITEMS[playerKart.heldItem] || ['❓', playerKart.heldItem];
        hud.showMessage(`${icon} ${name}`);
      } else if (!playerKart.heldItem) {
        lastHeldItem = null;
      }
    } else {
      // FINISHED — cruise: AI drives the player at reduced speed, engines
      // keep humming quietly while the music swells (genre standard).
      for (const ctrl of aiControllers) ctrl.update(dt);
      raceManager.update(dt);
      hud.update(raceManager, playerKart, raceManager.karts);
    }
    // Continuous engine loops — race AND cruise (pitch follows speed; in
    // cruise the reduced speed naturally lowers pitch + volume).
    const pSpeed01 = Math.min(1, Math.abs(playerKart.state.speed) / CONFIG.physics.maxSpeed);
    audio.setEngineLoop('player', pSpeed01);
    for (let i = 0; i < aiKarts.length; i++) {
      const s01 = Math.min(1, Math.abs(aiKarts[i].state.speed) / CONFIG.physics.maxSpeed);
      audio.setEngineLoop('ai' + i, s01 * 0.35); // AI engines quieter
    }
    if (playerKart.state.boost > 0) {
      particles.emit('boost', playerKart.state.position, { color: 0xffa63d });
    }
    if (playerKart.state.drifting) {
      particles.emit('drift', playerKart.state.position, { color: 0xffffff });
    }
    // Turbo pad boost: golden spark burst every ~0.1s while active.
    if (playerKart.state.turboBoostMs > 0) {
      turboParticleAcc += dt;
      if (turboParticleAcc >= 0.1) {
        turboParticleAcc = 0;
        particles.emit('boost', playerKart.state.position, {
          color: 0xffd166,
          count: 14,
          speed: 6.0,
          size: 0.3,
          spread: 1.6,
        });
      }
    } else {
      turboParticleAcc = 0;
    }
    // Off-road gravel rumble (feedback audit: surface/danger cue).
    if (playerKart.state.offRoad && playerKart.state.speed > 2) {
      offroadT += dt;
      if (offroadT >= 0.55) { offroadT = 0; audio.play('offroad', { volume: 0.5 }); }
    } else {
      offroadT = 0.55; // ready to fire immediately when leaving the road
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
  updateCamera, // QA hook: can be stubbed to freeze the chase camera
  DEMO,
};

console.log('[Super Kart 3D.js] booted. Demo mode:', DEMO, '| State:', getState());
