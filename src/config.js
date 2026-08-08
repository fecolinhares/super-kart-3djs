/**
 * Super Kart 3D.js — central tuning constants.
 * Single source of truth for gameplay, physics and rendering knobs.
 * UI copy is 100% English (project convention).
 */

export const CONFIG = {
  game: {
    totalLaps: 3,
    numKarts: 6, // 1 player + 5 AI
    countdownMs: [3, 2, 1, 0], // 0 === GO
    itemBoxRespawnMs: 6000,
    raceTimeoutMs: 5 * 60 * 1000,
  },

  physics: {
    maxSpeed: 42,
    boostSpeed: 64,
    reverseSpeed: -12,
    acceleration: 26,
    braking: 40,
    steerSpeed: 1.9, // rad/s at full speed (was 2.6 — too jerky)
    steerSpeedLow: 3.2, // rad/s when slow
    driftSteer: 3.6,
    driftMinSpeed: 12,
    driftChargeRate: 1.0, // 0..1 per second while drifting
    driftReleaseBoost: 0.75, // mini-boost if charge >= this
    friction: 3.2,
    lateralGrip: 8.5,
    gravity: -32,
    kartMass: 1.0,
    collisionBounce: 0.35,
    airControl: 1.2,
  },

  kart: {
    chassisLength: 1.7,
    chassisWidth: 1.05,
    chassisHeight: 0.55,
    wheelRadius: 0.34,
    wheelWidth: 0.24,
    playerColors: [0xff5a5f, 0x2ec4ff, 0xffd166, 0x6cff8f, 0xc86bff, 0xff9f45],
    // Roster of 6 drivers — each kart gets a character so karts and their
    // chibi drivers are visually distinct: body color, racing suit, helmet
    // and a colored helmet stripe (accent). `stats` describe the archetype
    // (1-10) and are reserved for future tuning — not yet applied to physics.
    characters: [
      { name: 'Turbo', color: 0xff5a5f, suitColor: 0xf4f6f8, helmetColor: 0xff5a5f, accentColor: 0xffd166, stats: { speed: 8, accel: 5, handling: 7 } },
      { name: 'Comet', color: 0x2ec4ff, suitColor: 0x1b2a41, helmetColor: 0x2ec4ff, accentColor: 0xffffff, stats: { speed: 9, accel: 4, handling: 5 } },
      { name: 'Bolt', color: 0xffd166, suitColor: 0xff5a5f, helmetColor: 0xffd166, accentColor: 0x1b2a41, stats: { speed: 6, accel: 9, handling: 5 } },
      { name: 'Daisy', color: 0x6cff8f, suitColor: 0xff9ff0, helmetColor: 0x6cff8f, accentColor: 0xffffff, stats: { speed: 5, accel: 6, handling: 9 } },
      { name: 'King', color: 0xc86bff, suitColor: 0xffd166, helmetColor: 0xc86bff, accentColor: 0x2ec4ff, stats: { speed: 6, accel: 7, handling: 7 } },
      { name: 'Pip', color: 0xff9f45, suitColor: 0x2ec4ff, helmetColor: 0xff9f45, accentColor: 0xffd166, stats: { speed: 5, accel: 8, handling: 7 } },
    ],
  },

  track: {
    // Track shape is defined by waypoints in TrackBuilder; these are global
    // visual/geometry knobs shared with physics collision.
    roadWidth: 9,
    roadEdge: 0.9, // grass margin width
    curveSmoothness: 40, // segments per curve
    offRoadMaxSpeedFactor: 0.45,
    // Turbo pad cluster centers (normalized path positions). KartPhysics
    // triggers a boost when a kart's progress01 is within 0.015 of one.
    turboPadTs: [0.18, 0.72],
  },

  items: {
    boxRadius: 1.0,
    boxBobSpeed: 2.0,
    pickupRadius: 2.8, // generous — at 43 m/s the kart crosses 2.1m per 0.05s frame
    shellSpeed: 46,
    shellHomingTurnRate: 3.2,
    bananaRadius: 0.7,
    starDurationMs: 4000,
    lightningDurationMs: 4500,
    lightningScale: 0.55,
    mushroomBoostMs: 1500,
    maxHeldItems: 1,
  },

  ai: {
    rubberBandFactor: 0.5,
    targetSpeedError: 8,
    steerPredictAhead: 6.0,
    itemUseChancePerSec: 0.5,
    crashRecoverMs: 1200,
  },

  camera: {
    fov: 62,
    followDistance: 7.2,
    followHeight: 3.4,
    lookAhead: 4.5,
    lookHeight: 1.2,
    lerp: 5.0,
    shakeIntensity: 0.02,
  },

  render: {
    antialias: true,
    pixelRatioCap: 2,
    bloomStrength: 0.55,
    bloomRadius: 0.45,
    bloomThreshold: 0.95,
    vignetteStrength: 0.3,
    colorGradeSaturation: 1.18,
    colorGradeContrast: 1.08,
    shadows: true,
    shadowMapSize: 2048,
    fogDensity: 0.004,
  },

  audio: {
    masterVolume: 0.8,
    musicVolume: 0.34,
    engineVolume: 0.5,
  },

  debug: {
    showWaypoints: false,
    showPhysicsDebug: false,
    logFps: false,
  },
};
