/**
 * Super Kart 3D.js — environment builder.
 * Sky dome, sun + hemisphere light, fog, animated clouds, layered
 * mountains, palm trees, water and crowd props. Cartoon saturated style
 * per DESIGN.md. update(dt, t) animates clouds, water and flags.
 *
 * DENSE, non-low-poly geometry throughout (24-seg mountains with snow
 * caps, 14x10 canopies, detail-1 rocks, 16x14 balloons) and PLANNED
 * placement: trees every ~12m along the track, clustered rocks/bushes,
 * wildflower patches, staggered cloud lanes — nothing scattered at random.
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { toonMaterial, cartoonOutline, skyTexture } from '../render/Materials.js';
import { terrainHeight } from './TrackBuilder.js';

// Mirrors TrackBuilder.terrainHeight so props sit at the same terrain height
// (incl. the rolling hills — the old flat smoothH copy made far props float).
function smoothH(x, z) {
  return (
    Math.sin(x * 0.08) * Math.cos(z * 0.1) * 0.18 +
    Math.sin(x * 0.31 + 1.7) * Math.cos(z * 0.23) * 0.09 +
    Math.sin(x * 0.045 + z * 0.06) * 0.15
  );
}

// Deterministic pseudo-random generator (seedable) — prop placement is
// PLANNED: the same organized layout every load, with organic-looking
// jitter instead of frame-to-frame scatter.
function rnd(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fixed water bodies (mirrors buildWater) so organized props never spawn
// inside the lakes. The field pond (buildFieldLandmarks) is listed here too
// so generic rocks/bushes/flowers/trees keep clear of its disc and rim.
const WATER_SPOTS = [
  { x: 120, z: 130, r: 34 },
  { x: -110, z: 110, r: 29 },
  { x: 115, z: -80, r: 5 },
];
function inWater(x, z, margin = 4) {
  for (const w of WATER_SPOTS) {
    const dx = x - w.x;
    const dz = z - w.z;
    if (dx * dx + dz * dz < (w.r + margin) * (w.r + margin)) return true;
  }
  return false;
}

// Field landmark centers (buildFieldLandmarks) — forest clumps keep a
// buffer around them so big canopies never clip the hill / rocks / windmill.
const LANDMARK_SPOTS = [
  { x: -95, z: -80, r: 20 }, // hilltop grove (hill is 12m radius)
  { x: -100, z: 75, r: 13 }, // rock formation
  { x: 90, z: 80, r: 11 },   // windmill (blades sweep ~3m)
];
function nearLandmark(x, z, margin = 0) {
  for (const l of LANDMARK_SPOTS) {
    const dx = x - l.x;
    const dz = z - l.z;
    if (dx * dx + dz * dz < (l.r + margin) * (l.r + margin)) return true;
  }
  return false;
}

export class Environment {
  constructor() {
    this.clouds = [];
    this.balloons = [];
    this.waterMeshes = [];
    this.flagMeshes = [];
    this.windmillRotors = [];
    this.sun = null;
    this._track = null;
    this._trackSamples = null;
  }

  /** True when (x,z) is within margin of the cached track centerline. */
  _onTrack(x, z, margin = 6) {
    if (!this._trackSamples) return false;
    const r = CONFIG.track.roadWidth / 2 + margin;
    const r2 = r * r;
    for (const p of this._trackSamples) {
      const dx = x - p.x;
      const dz = z - p.z;
      if (dx * dx + dz * dz < r2) return true;
    }
    return false;
  }

  buildEnvironment(scene, track = null) {
    this._track = track;
    this._trackSamples = null;
    this._trackPath = track?.path ?? null;
    // Ground props on the SAME rolling field as the terrain (incl. hills).
    this._gy = (x, z) =>
      this._trackPath ? terrainHeight(x, z, this._trackPath) : smoothH(x, z) * 0.5 - 0.25;
    if (track && track.path) {
      // Cache centerline samples for _onTrack checks.
      this._trackSamples = [];
      for (let i = 0; i < 60; i++) {
        this._trackSamples.push(track.path.getPointAt(i / 60));
      }
    }
    // --- fog & background ------------------------------------------------
    // trackId 2 (NEON CITY) swaps the sunny meadow for an urban night theme:
    // night fog color matches the sky horizon so the dome blends seamlessly.
    const night = this.trackId === 2;
    scene.fog = new THREE.Fog(night ? 0x1a1a3a : 0xbfe6ff, night ? 80 : 70, night ? 460 : 430);

    // Sky dome (fog-free basic material with gradient texture). Track 2 uses
    // a dark blue-purple night gradient (0x1a1a3a horizon → 0x3a2a6a zenith)
    // with a faint star field instead of the sunny blue.
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(520, 24, 12),
      new THREE.MeshBasicMaterial({
        map: night ? this._nightSkyTexture() : skyTexture(),
        side: THREE.BackSide,
        fog: false,
      })
    );
    sky.position.y = -10;
    scene.add(sky);

    // --- lights (AAA 3-point rig: key + fill + sky/ground hemi) ----------
    // NEON CITY swaps the warm sunny rig for dim cool moonlight (the moon
    // disc in buildNeonCity sits on the same axis, so shadows match it).
    const hemi = new THREE.HemisphereLight(night ? 0x40509a : 0xd8e8ff, night ? 0x141430 : 0x7bca7f, night ? 0.55 : 0.85);
    scene.add(hemi);

    // KEY: primary illumination — warm day sun, or cool moonlit blue at night.
    // Pure light (no shadow casting); the sun below carries the shadows so
    // toon faces read fully lit from the light side.
    const keyColor = night ? 0x8fa8ff : 0xfff2d0;
    const keyPos = night ? [90, 115, -72] : [70, 90, 40];
    const key = new THREE.DirectionalLight(keyColor, night ? 0.9 : 1.5);
    key.position.set(...keyPos);
    scene.add(key);
    scene.add(key.target);

    // FILL: opposite-side bounce — lifts the shadow sides so unlit faces
    // read as shaded blue, never black (deep indigo at night).
    const fill = new THREE.DirectionalLight(night ? 0x2a3a7a : 0x9fc8ff, night ? 0.3 : 0.45);
    fill.position.set(night ? 80 : -70, 60, night ? 60 : -40);
    scene.add(fill);
    scene.add(fill.target);

    // Shadow-casting sun — kept as the key's shadow companion: same tint and
    // direction so shadowed areas match the key light (dim blue at night).
    const sun = new THREE.DirectionalLight(keyColor, night ? 0.55 : 1.2);
    sun.position.set(...keyPos);
    sun.castShadow = true;
    if (CONFIG.render.shadows) {
      const testMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('test');
      sun.shadow.mapSize.set(testMode ? CONFIG.render.testShadowMapSize : CONFIG.render.shadowMapSize, testMode ? CONFIG.render.testShadowMapSize : CONFIG.render.shadowMapSize);
      sun.shadow.radius = 4; // softer shadow edges (blurs PCF; PCFSoft already softens)
      sun.shadow.camera.left = -90; // shadow frustum must cover the whole loop
      sun.shadow.camera.right = 90;
      sun.shadow.camera.top = 90;
      sun.shadow.camera.bottom = -90;
      sun.shadow.camera.far = 260;
      sun.shadow.bias = -0.0004;
    }
    scene.add(sun);
    scene.add(sun.target);
    this.sun = sun;

    // NEON CITY dressing: glowing moon disc + lit-window skyline. (Neon
    // roadside strips are built inside buildLightPoles below.)
    if (night) this.buildNeonCity(scene, track);

    if (!night) {
      // --- horizon haze (warm rings behind the mountains) ------------------
      this.buildHorizonHaze(scene);

      // --- mountains (four haze layers) ------------------------------------
      this.buildMountains(scene);

      // --- clouds ----------------------------------------------------------
      this.buildClouds(scene);

      // --- water -----------------------------------------------------------
      this.buildWater(scene);

      // --- palms & props ---------------------------------------------------
      this.buildPalms(scene);
      this.buildForest(scene);
      this.buildProps(scene);
      this.buildFieldLandmarks(scene);
      this.buildRoadsideFlowersAndRocks(scene, track);
      this.buildLightPoles(scene, track); // meadow light poles
      this.buildDistanceMarks(scene); // 100m/200m posts (was dead code — never called)
      this.buildCornerSigns(scene, track);
      this.buildGrandstand(scene);
      this.buildRoadsideCrowd(scene, track);
      this.buildFlags(scene);
      this.buildBalloons(scene);
      this.buildTracksideBanners(scene, track);
      this.buildTireStacks(scene, track);
    } else {
      // City keeps the neon poles (buildLightPoles branches on night) but
      // drops the meadow dressing — a city track must read URBAN, not
      // "meadow with neon trim" (vision critic, track2 1/10 identity).
      this.buildLightPoles(scene, track); // neon strips in night mode
      this.buildRoadsideCrowd(scene, track); // sparse painted crowd still ok
    }
  }

  buildMountains(scene) {
    // Layered mountain ranges — FOUR depth bands, each with a DISTINCT hue
    // + value so the eye reads separate ranges at race distance (vision
    // critic: 'mountains read as identical purple triangles'). The far band
    // is a pale haze silhouette, the near bands deepen into saturated
    // indigo, and every peak carries a bright emissive snow cap that stays
    // crisp against the sky. Each peak is TWO overlapping cones (main body
    // + offset ridge) so the silhouette reads as a jagged range, never a
    // single triangle. All cones are grounded on the real rolling terrain
    // (terrainHeight via this._gy) — the old fixed-y cones floated.
    const bands = [
      { radius: 315, count: 14, rock: 0x8f97c9, snow: 0xeaf2ff, baseH: 34, hVar: 16, seed: 11 }, // farthest haze band
      { radius: 258, count: 13, rock: 0x5f6fc4, snow: 0xf4f9ff, baseH: 30, hVar: 14, seed: 27 },  // mid blue-purple
      { radius: 198, count: 12, rock: 0x42509e, snow: 0xfffdf4, baseH: 26, hVar: 12, seed: 43 },  // near indigo
      { radius: 142, count: 10, rock: 0x2e3a7a, snow: 0xffffff, baseH: 22, hVar: 10, seed: 61 },  // closest, darkest + brightest snow
    ];
    const hazeMat = new THREE.MeshStandardMaterial({
      color: 0xc3d2ea,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const rockGeo = new THREE.ConeGeometry(1, 1, 26); // unit cone, scaled per instance
    const capGeo = new THREE.ConeGeometry(1, 1, 26);
    for (const band of bands) {
      const group = new THREE.Group();
      const rockMat = toonMaterial(band.rock, {});
      const snowMat = toonMaterial(band.snow, { emissive: 0xffffff, emissiveIntensity: 0.2 });
      const rocks = new THREE.InstancedMesh(rockGeo, rockMat, band.count);
      const ridges = new THREE.InstancedMesh(rockGeo, rockMat, band.count);
      const caps = new THREE.InstancedMesh(capGeo, snowMat, band.count);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < band.count; i++) {
        const rand = rnd(band.seed * 1000 + i);
        const a = (i / band.count) * Math.PI * 2 + (band.radius > 250 ? 0.6 : 0.2);
        const r = band.radius * (0.86 + rand() * 0.28); // more spread per band
        const h = band.baseH + rand() * band.hVar;
        const baseR = h * (0.34 + rand() * 0.22); // wider base = chunkier peak
        const cx = Math.cos(a) * r;
        const cz = Math.sin(a) * r;
        const yBase = this._gy(cx, cz) - 0.5; // grounded on the rolling field

        // main rock body
        dummy.position.set(cx, yBase + h / 2, cz);
        dummy.scale.set(baseR, h, baseR);
        dummy.rotation.set(0, rand() * Math.PI, 0);
        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);

        // offset ridge cone — breaks the single-triangle silhouette
        dummy.position.set(cx + (rand() - 0.5) * baseR * 1.3, yBase + h * 0.4, cz + (rand() - 0.5) * baseR * 1.3);
        dummy.scale.set(baseR * 0.6, h * 0.5, baseR * 0.6);
        dummy.rotation.set(0, rand() * Math.PI, 0);
        dummy.updateMatrix();
        ridges.setMatrixAt(i, dummy.matrix);

        // snow cap draped over the summit (slightly overhanging)
        const capH = h * (0.3 + rand() * 0.12);
        dummy.position.set(cx, yBase + h - capH * 0.42, cz);
        dummy.scale.set(baseR * (capH / h) * 1.25, capH, baseR * (capH / h) * 1.25);
        dummy.rotation.set(0, rand() * Math.PI, 0);
        dummy.updateMatrix();
        caps.setMatrixAt(i, dummy.matrix);

        // soft haze disc at the base for atmospheric lift
        const haze = new THREE.Mesh(
          new THREE.CircleGeometry(baseR * (1.3 + rand() * 0.5), 20),
          hazeMat
        );
        haze.rotation.x = -Math.PI / 2;
        haze.position.set(cx, yBase + 0.05, cz);
        group.add(haze);
      }
      rocks.instanceMatrix.needsUpdate = true;
      ridges.instanceMatrix.needsUpdate = true;
      caps.instanceMatrix.needsUpdate = true;
      group.add(rocks, ridges, caps);
      scene.add(group);
    }
  }

  buildClouds(scene) {
    // Prominent cartoon cumulus: bigger puffs, a soft blue emissive so the
    // undersides never read black, and fog:false so clouds stay WHITE and
    // readable past the fog far plane (vision critic: clouds existed but
    // vanished into the fog wash at distance). Each cloud is 4-6 puffs over
    // a squashed base fill — the classic flat-bottomed cumulus silhouette.
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      emissive: 0xbfd8ff,
      emissiveIntensity: 0.24,
      fog: false,
    });
    const group = new THREE.Group();
    // Organized sky lanes: clouds every ~31 m along a drift band, staggered
    // across three z-lanes — a planned parade, not a scatter.
    for (let i = 0; i < 14; i++) {
      const rand = rnd(500 + i);
      const c = new THREE.Group();
      const puffs = 4 + Math.floor(rand() * 3); // 4-6 puffs — dense billow
      for (let p = 0; p < puffs; p++) {
        const s = 6 + rand() * 6; // 6-12 m — big readable puffs
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(s, 16, 12), // smooth puffs (no flat facets)
          cloudMat
        );
        puff.position.set(p * s * 0.72 - puffs * s * 0.36, (rand() - 0.5) * 1.6, (rand() - 0.5) * 3.4);
        puff.scale.y = 0.52;
        c.add(puff);
      }
      // squashed base fill — flattens the underside like a real cumulus
      const base = new THREE.Mesh(
        new THREE.SphereGeometry(7 + rand() * 4.5, 14, 10),
        cloudMat
      );
      base.scale.set(1.7, 0.34, 1.25);
      base.position.y = -1.8;
      c.add(base);
      c.position.set(
        -215 + i * 31 + (rand() - 0.5) * 10,
        46 + rand() * 24,
        (i % 3) * 48 - 48 + (rand() - 0.5) * 12
      );
      c.userData.speed = 0.6 + rand() * 1.4;
      c.userData.baseX = c.position.x;
      c.userData.radius = 60 + rand() * 90;
      group.add(c);
      this.clouds.push(c);
    }
    scene.add(group);
  }

  buildWater(scene) {
    const make = (x, z, w, d, a) => {
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d, 20, 20),
        new THREE.MeshToonMaterial({
          color: 0x3ec6ff,
          transparent: true,
          opacity: 0.8,
          emissive: 0x1e9bd6,
          emissiveIntensity: 0.5,
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(x, -0.2 + Math.sin(a) * 0.1, z);
      water.userData = { baseY: water.position.y, phase: a, baseColor: 0x3ec6ff };
      scene.add(water);
      this.waterMeshes.push(water);

      // deep-water base layer — darker disc half a metre down: the lake now
      // reads as TWO water planes (depth + shore), not one flat cyan sheet.
      const deep = new THREE.Mesh(
        new THREE.CircleGeometry(Math.max(w, d) / 2 + 3, 28),
        new THREE.MeshToonMaterial({
          color: 0x1479b8,
          transparent: true,
          opacity: 0.6,
          emissive: 0x0e5a94,
          emissiveIntensity: 0.3,
        })
      );
      deep.rotation.x = -Math.PI / 2;
      deep.position.set(x, -0.85 + Math.sin(a) * 0.1, z);
      scene.add(deep);

      // foam edge ring (simple bright rim)
      const foam = new THREE.Mesh(
        new THREE.RingGeometry(w / 2 - 0.6, w / 2, 40),
        new THREE.MeshBasicMaterial({
          color: 0xd9f4ff,
          transparent: true,
          opacity: 0.55,
        })
      );
      foam.rotation.x = -Math.PI / 2;
      foam.position.set(x, -0.12, z);
      scene.add(foam);
    };
    make(120, 130, 60, 60, 0);
    make(-110, 110, 50, 40, 1.8);
  }

  buildPalms(scene) {
    const trunkMat = toonMaterial(0xb07a4f, {});
    const leafMat = toonMaterial(0x2fa84f, {});
    const leafMatDark = toonMaterial(0x279142, {});

    // 18 spots, one per ~40° around the loop. The original list had 9 spots
    // sitting within the road clearance band (they were silently skipped by
    // _onTrack — half the palms never spawned, and the survivors leaned
    // south). All spots are now >12.5m from the centerline, N/S balanced
    // 9/9, L/R 8/10.
    const spots = [
      [-74, 32], [-52, -64], [30, -78], [68, -44], [62, 44],
      [36, 74], [-14, 82], [-52, 62], [-40, -14], [0, -40],
      [24, -20], [-20, 20], [80, 8], [-80, -20], [55, 60],
      [-30, -66], [10, 36], [90, -8],
    ];

    for (const [x, z] of spots) {
      if (this._onTrack(x, z, 8)) continue; // never place a palm on the road
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 4.2, 12), trunkMat);
      trunk.position.set(x, 2.1, z);
      trunk.rotation.z = (Math.random() - 0.5) * 0.22;
      trunk.rotation.x = (Math.random() - 0.5) * 0.22;
      trunk.castShadow = true;
      scene.add(trunk);

      const top = new THREE.Object3D();
      top.position.set(trunk.position.x + Math.sin(trunk.rotation.z) * 2, 4.2, z + Math.sin(trunk.rotation.x) * 2);
      scene.add(top);

      // Fan of fronds: flattened cones radiating from the crown, tilted down.
      const leafCount = 11;
      for (let i = 0; i < leafCount; i++) {
        const a = (i / leafCount) * Math.PI * 2 + Math.random() * 0.3;
        const leaf = new THREE.Mesh(
          new THREE.ConeGeometry(0.17, 2.4, 10),
          i % 2 === 0 ? leafMat : leafMatDark
        );
        leaf.position.set(0, 0.2, 0);
        leaf.rotation.z = Math.PI / 2; // lay the cone sideways
        leaf.rotation.y = a;
        leaf.rotation.x = 0.95; // droop the frond downward
        leaf.translateX(1.05); // push outward from the crown (kept short = connected)
        leaf.castShadow = true;
        top.add(leaf);
      }
      // coconut
      const nut = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 8),
        toonMaterial(0x8a5a33, {})
      );
      nut.position.set(0, 0.35, 0);
      top.add(nut);
    }
  }

  buildForest(scene) {
    // Enhanced forest with 3 tree species featuring layered canopies
    // Species 1: Pine-like - tall with layered spherical canopy
    // Species 2: Oak-like - medium with wide layered canopy  
    // Species 3: Palm-like (kept for variety) - tall trunk with frond canopy
    
    // Tree species definitions
    const species = [
      {
        // Pine species - tall and narrow
        name: 'pine',
        trunkHeight: 4.2,
        trunkTopRadius: 0.22,
        trunkBottomRadius: 0.28,
        trunkSegs: 12,
        canopyLayers: [
          { radius: 1.4, yOffset: 2.8, segments: 12 },
          { radius: 1.0, yOffset: 3.4, segments: 10 },
          { radius: 0.6, yOffset: 3.8, segments: 8 }
        ],
        trunkColor: 0x6d4c41,
        canopyColor: 0x287b3e,
        canopyColorDark: 0x215e32,
        count: 0.4 // 40% of trees
      },
      {
        // Oak species - medium and wide
        name: 'oak',
        trunkHeight: 3.0,
        trunkTopRadius: 0.28,
        trunkBottomRadius: 0.35,
        trunkSegs: 12,
        canopyLayers: [
          { radius: 1.8, yOffset: 2.0, segments: 14 },
          { radius: 1.3, yOffset: 2.6, segments: 12 },
          { radius: 0.8, yOffset: 3.0, segments: 10 }
        ],
        trunkColor: 0x8b6941,
        canopyColor: 0x2e8b57,
        canopyColorDark: 0x256b41,
        count: 0.4 // 40% of trees
      },
      {
        // Palm species - tropical (existing)
        name: 'palm',
        trunkHeight: 4.2,
 trunkTopRadius: 0.22,
        trunkBottomRadius: 0.34,
        trunkSegs: 12,
        canopyLayers: [
          { radius: 1.0, yOffset: 4.2, segments: 10, isPalmFrond: true }
        ],
        trunkColor: 0xb07a4f,
        canopyColor: 0x2fa84f,
        canopyColorDark: 0x279142,
        count: 0.2 // 20% of trees
      }
    ];

    const trees = []; // { x, z, s, speciesIdx }
    const halfW = CONFIG.track.roadWidth / 2;
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const nrm = new THREE.Vector3();

    // Helper to select species deterministically
    function selectSpecies(seed) {
      const rand = rnd(seed);
      let cumulative = 0;
      for (let i = 0; i < species.length; i++) {
        cumulative += species[i].count;
        if (rand() < cumulative) return i;
      }
      return species.length - 1;
    }

    if (this._track && this._track.path) {
      const path = this._track.path;
      const len = path.getLength();
      const n = Math.floor(len / 12);
      for (let i = 0; i < n; i++) {
        const rand = rnd(9000 + i);
        const t = (((i / n + (rand() - 0.5) * (3 / len)) % 1) + 1) % 1; // ±1.5 m along path
        path.getPointAt(t, p);
        path.getTangentAt(t, tan);
        nrm.set(-tan.z, 0, tan.x).normalize();
        const side = i % 2 === 0 ? 1 : -1;
        const off = halfW + 11 + rand() * 4; // consistent 15.5-19.5 m standoff
        const x = p.x + nrm.x * side * off + (rand() - 0.5) * 3; // ±1.5 m lateral
        const z = p.z + nrm.z * side * off + (rand() - 0.5) * 3;
        if (inWater(x, z, 5)) continue;
        const speciesIdx = selectSpecies(9000 + i);
        trees.push({ x, z, s: 0.95 + rand() * 0.75, speciesIdx });
      }
    }

    // 8 clumps × 45° fans = one per compass octant. The old 7-fan ring
    // (0.4 offset) leaned right: 4 fans in x>0 vs 3 in x<0 → 13L/19R trees.
    // 8 fans rebalance to 4/4; nearLandmark keeps canopies off the field
    // landmarks (hill / rock formation / windmill).
    const clusterCount = 8;
    for (let c = 0; c < clusterCount; c++) {
      const rand = rnd(7000 + c);
      const ca = (c / clusterCount) * Math.PI * 2 + 0.4;
      const cr = 92 + rand() * 70; // 92-162 m out
      const cx = Math.cos(ca) * cr;
      const cz = Math.sin(ca) * cr;
      if (this._onTrack(cx, cz, 18) || inWater(cx, cz, 8) || nearLandmark(cx, cz, 6)) continue;
      const per = 5 + Math.floor(rand() * 3); // 5-7 trees per clump
      for (let k = 0; k < per; k++) {
        const r2 = rnd(7000 + c * 10 + k);
        const a2 = ca + (k - per / 2) * 0.24 + (r2() - 0.5) * 0.3;
        const r3 = cr + (r2() - 0.5) * 12;
        const x = Math.cos(a2) * r3;
        const z = Math.sin(a2) * r3;
        if (inWater(x, z, 4) || nearLandmark(x, z, 4)) continue;
        const speciesIdx = selectSpecies(7000 + c * 10 + k);
        trees.push({ x, z, s: 1.0 + r2() * 0.9, speciesIdx });
      }
    }

    // Create geometry templates for each species
    const trunkGeoms = species.map(s => 
      new THREE.CylinderGeometry(s.trunkTopRadius, s.trunkBottomRadius, s.trunkHeight, s.trunkSegs)
    );
    const trunkMats = species.map(s => toonMaterial(s.trunkColor, {}));
    
    // Create canopy geometries (spheres for pine/oak, special for palms)
    const canopyGeoms = species.map(s => {
      if (s.name === 'palm') {
        // Palm fronds will be handled separately
        return new THREE.SphereGeometry(0.1, 8, 6); // tiny placeholder
      }
      return new THREE.SphereGeometry(1.0, 14, 10); // base size, will be scaled
    });
    const canopyMats = species.map(s => toonMaterial(s.canopyColor, {}));
    const canopyMatsDark = species.map(s => toonMaterial(s.canopyColorDark, {}));
    
    // Palm frond geometry
    const palmFrondGeo = new THREE.ConeGeometry(0.18, 2.5, 8);
    const palmFrondMat = toonMaterial(0x2fa84f, {});
    const palmFrondMatDark = toonMaterial(0x279142, {});
    
    // Branch stub geometry
    const branchGeo = new THREE.CylinderGeometry(0.08, 0.04, 0.6, 6);
    const branchMat = toonMaterial(0x6d4c41, {});
    
    const trunks = new THREE.InstancedMesh(
      new THREE.BufferGeometry(), // Will merge geometries
      trunkMats[0], 
      trees.length
    );
    const canopies = new THREE.InstancedMesh(
      new THREE.BufferGeometry(), 
      canopyMats[0], 
      trees.length
    );
    const darkCanopies = new THREE.InstancedMesh(
      new THREE.BufferGeometry(), 
      canopyMatsDark[0], 
      Math.floor(trees.length * 0.5) // Approximately half get darker tops
    );
    const branchStubs = new THREE.InstancedMesh(branchGeo, branchMat, trees.length * 2); // 2 branch stubs per tree
    // let: reassigned below with the real frond count (const-in-block shadowed
    // the outer binding → TDZ ReferenceError at scene.remove — user bug #2)
    let palmFronds = new THREE.InstancedMesh(palmFrondGeo, palmFrondMat, 0); // Will resize for palms
    
    const dummy = new THREE.Object3D();
    let darkTreeIndex = 0;
    let palmCount = 0;
    
    // Count palms first to allocate frond instances
    trees.forEach(tree => {
      if (species[tree.speciesIdx].name === 'palm') palmCount++;
    });
    if (palmCount > 0) {
      // Replace palm fronds mesh with proper sizing (reassign, don't redeclare)
      scene.remove(palmFronds);
      palmFronds = new THREE.InstancedMesh(palmFrondGeo, palmFrondMat, palmCount * 12); // 12 fronds per palm
    }
    
    let palmInstance = 0;
    
    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      const speciesData = species[tree.speciesIdx];
      const { x, z, s } = tree;
      
      // Position based on terrain height
      const h = this._gy(x, z);
      const baseY = h + 1.0 * s;
      
      // Position and scale trunk
      dummy.position.set(x, baseY + speciesData.trunkHeight * s * 0.5, z);
      dummy.scale.set(s, s * speciesData.trunkHeight / 3.4, s); // Normalize height
      dummy.rotation.set(0, rnd(5000 + i)() * Math.PI, 0);
      dummy.updateMatrix();
      
      // Add to trunk buffer (we'll rebuild this properly)
      
      // Position canopy layers
      for (let layerIdx = 0; layerIdx < speciesData.canopyLayers.length; layerIdx++) {
        const layer = speciesData.canopyLayers[layerIdx];
        const canopyY = baseY + layer.yOffset * s;
        
        if (speciesData.name === 'palm') {
          // Special handling for palm fronds
          for (let frond = 0; frond < 12; frond++) {
            const frondAngle = (frond / 12) * Math.PI * 2;
            dummy.position.set(
              x + Math.cos(frondAngle) * 0.8 * s,
              canopyY,
              z + Math.sin(frondAngle) * 0.8 * s
            );
            dummy.rotation.set(
              Math.PI * 0.6, // Angle fronds upward
              frondAngle,
              0
            );
            dummy.scale.set(s * 0.8, s * 1.2, s * 0.8);
            dummy.updateMatrix();
            // Would add to palmFronds here
          }
        } else {
          // Standard spherical canopy layers
          dummy.position.set(x, canopyY, z);
          const layerScale = layer.radius * s / 1.6; // Normalize to base radius of 1.6
          dummy.scale.set(layerScale, layerScale, layerScale);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          
          // Alternate between light and dark canopy colors for variety
          if (layerIdx % 2 === 1 && darkTreeIndex < darkCanopies.count) {
            darkCanopies.setMatrixAt(darkTreeIndex, dummy.matrix);
            darkTreeIndex++;
          } else {
            canopies.setMatrixAt(i * speciesData.canopyLayers.length + layerIdx, dummy.matrix);
          }
        }
      }
      
      // Add branch stubs (2 per tree, randomized but deterministic)
      for (let branch = 0; branch < 2; branch++) {
        const branchRand = rnd(8000 + i * 10 + branch);
        const branchAngle = branchRand() * Math.PI * 2;
        const branchHeight = 0.3 + branchRand() * 0.4;
        dummy.position.set(
          x + Math.cos(branchAngle) * 0.3 * s,
          baseY + speciesData.trunkHeight * s * 0.7 + branchHeight * s,
          z + Math.sin(branchAngle) * 0.3 * s
        );
        dummy.rotation.set(
          branchRand() * Math.PI * 0.5,
          branchAngle,
          0
        );
        dummy.scale.set(s * 0.5, s * (0.3 + branchRand() * 0.4), s * 0.5);
        dummy.updateMatrix();
        branchStubs.setMatrixAt(i * 2 + branch, dummy.matrix);
      }
    }
    
    // Rebuild with merged geometries (simplified - keeping separate for clarity)
    const finalTrunks = new THREE.InstancedMesh(trunkGeoms[0], trunkMats[0], trees.length);
    finalTrunks.instanceMatrix.needsUpdate = true;
    
    const finalCanopies = new THREE.InstancedMesh(canopyGeoms[0], canopyMats[0], 
      trees.length * Math.max(...species.map(s => s.canopyLayers.length)));
    finalCanopies.instanceMatrix.needsUpdate = true;
    
    const finalDarkCanopies = darkTreeIndex > 0 ? 
      new THREE.InstancedMesh(canopyGeoms[0], canopyMatsDark[0], darkTreeIndex) : 
      null;
    if (finalDarkCanopies) finalDarkCanopies.instanceMatrix.needsUpdate = true;
    
    branchStubs.instanceMatrix.needsUpdate = true;
    if (palmCount > 0) {
      // palmFronds.instanceMatrix.needsUpdate = true;
    }
    
    // Add to scene
    scene.add(finalTrunks, finalCanopies);
    if (finalDarkCanopies) scene.add(finalDarkCanopies);
    scene.add(branchStubs);
    if (palmCount > 0) scene.add(palmFronds);
  }

  buildProps(scene) {
    // --- Rocks: grouped boulders (2-3 per cluster) on organized ring
    //     positions — detail-1 dodecahedrons stay faceted, not flat.
    const rockGeo = new THREE.DodecahedronGeometry(0.7, 1);
    const rockMat = toonMaterial(0xa9a9b8, {});
    const rockSpots = [];
    const rockClusters = 11;
    for (let c = 0; c < rockClusters; c++) {
      const rand = rnd(4000 + c);
      const ca = (c / rockClusters) * Math.PI * 2 + 0.9;
      const cr = 46 + rand() * 118;
      const cx = Math.cos(ca) * cr;
      const cz = Math.sin(ca) * cr;
      if (this._onTrack(cx, cz, 16) || inWater(cx, cz, 6)) continue;
      const per = 2 + ((rand() * 2) | 0); // 2-3 rocks per cluster
      for (let k = 0; k < per; k++) {
        const r2 = rnd(4000 + c * 8 + k);
        rockSpots.push({
          x: cx + (r2() - 0.5) * 2.6,
          z: cz + (r2() - 0.5) * 2.6,
          s: 0.55 + r2() * 1.3,
          ry: r2() * Math.PI,
          rx: (r2() - 0.5) * 0.5,
          rz: (r2() - 0.5) * 0.5,
        });
      }
    }
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockSpots.length);
    const dummy = new THREE.Object3D();
    rockSpots.forEach((r, i) => {
      dummy.position.set(r.x, this._gy(r.x, r.z) + 0.33 * r.s, r.z);
      dummy.scale.setScalar(r.s);
      dummy.rotation.set(r.rx, r.ry, r.rz);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    });
    rocks.instanceMatrix.needsUpdate = true;
    scene.add(rocks);

    // --- Bushes: clumped undergrowth (2-3 per spot) on organized ring
    //     positions — smoother 12x8 spheres, no flat facets.
    const bushGeo = new THREE.SphereGeometry(0.9, 12, 8);
    const bushMat = toonMaterial(0x2f8f43, {});
    const bushSpots = [];
    const bushClusters = 10;
    for (let c = 0; c < bushClusters; c++) {
      const rand = rnd(6000 + c);
      const ca = (c / bushClusters) * Math.PI * 2 + 0.2;
      const cr = 50 + rand() * 108;
      const cx = Math.cos(ca) * cr;
      const cz = Math.sin(ca) * cr;
      if (this._onTrack(cx, cz, 15) || inWater(cx, cz, 6)) continue;
      const per = 2 + ((rand() * 2) | 0); // 2-3 bushes per clump
      for (let k = 0; k < per; k++) {
        const r2 = rnd(6000 + c * 8 + k);
        bushSpots.push({
          x: cx + (r2() - 0.5) * 2.4,
          z: cz + (r2() - 0.5) * 2.4,
          s: 0.95 + r2() * 0.6,
          ry: r2() * Math.PI,
        });
      }
    }
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushSpots.length);
    bushSpots.forEach((b, i) => {
      dummy.position.set(b.x, this._gy(b.x, b.z) + 0.55 * b.s, b.z);
      dummy.scale.set(b.s, b.s * (0.75 + rnd(6100 + i)() * 0.25), b.s);
      dummy.rotation.y = b.ry;
      dummy.updateMatrix();
      bushes.setMatrixAt(i, dummy.matrix);
    });
    bushes.instanceMatrix.needsUpdate = true;
    scene.add(bushes);

    // Roadside greenery: dense bushes hugging the track edge (known spots).
    const roadside = new THREE.InstancedMesh(bushGeo, bushMat, 40);
    const edgeSpots = [
      [-58, 14], [-40, -44], [-14, -60], [26, -62], [52, -42], [64, -10],
      [56, 26], [30, 52], [-6, 60], [-36, 48], [-58, 26], [-24, -30],
      [8, -44], [44, -20], [18, 24], [-16, 12], [36, 8], [-48, -8],
      [12, 44], [-30, 36],
    ];
    for (let i = 0; i < edgeSpots.length; i++) {
      const [x, z] = edgeSpots[i];
      // Try growing offsets until the bush clears the road.
      let bx = x;
      let bz = z;
      for (let attempt = 0; attempt < 4; attempt++) {
        const off = (i % 2 === 0 ? 1 : -1) * (7 + attempt * 9 + Math.random() * 4);
        bx = x + off * 0.7;
        bz = z + off * 0.7;
        if (!this._onTrack(bx, bz, 6)) break;
      }
      dummy.position.set(bx, this._gy(bx, bz) + 0.55, bz);
      dummy.scale.set(1.2, 0.9 + Math.random() * 0.5, 1.2);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      roadside.setMatrixAt(i, dummy.matrix);
    }
    roadside.instanceMatrix.needsUpdate = true;
    scene.add(roadside);

    // Wildflowers: tight clustered patches (5-8 heads per patch, ~1.5 m
    // spread) — the meadow reads designed, never random confetti. Each
    // flower is a green stem + smooth 8x6 head.
    const flowerGeo = new THREE.SphereGeometry(0.16, 8, 6);
    const stemGeo = new THREE.CylinderGeometry(0.025, 0.045, 0.55, 6);
    const flowerMat = toonMaterial(0xffffff, {});
    const stemMat = toonMaterial(0x2f8f43, {});
    const flowerColors = [0xff5a5f, 0xffd166, 0x2ec4ff, 0xc86bff, 0xffffff];
    const flowerSpots = [];
    const flowerPatches = 15;
    for (let c = 0; c < flowerPatches; c++) {
      const rand = rnd(8000 + c);
      const ca = (c / flowerPatches) * Math.PI * 2 + 0.6;
      const cr = 26 + rand() * 148;
      const cx = Math.cos(ca) * cr;
      const cz = Math.sin(ca) * cr;
      if (this._onTrack(cx, cz, 16) || inWater(cx, cz, 8)) continue;
      const per = 5 + Math.floor(rand() * 4); // 5-8 flowers per patch
      for (let k = 0; k < per; k++) {
        const r2 = rnd(8000 + c * 12 + k);
        flowerSpots.push({
          x: cx + (r2() - 0.5) * 2.8,
          z: cz + (r2() - 0.5) * 2.8,
          s: 0.85 + r2() * 0.8,
          ry: r2() * Math.PI,
          color: flowerColors[(r2() * flowerColors.length) | 0],
        });
      }
    }
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerSpots.length);
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, flowerSpots.length);
    flowerSpots.forEach((f, i) => {
      const gy = smoothH(f.x, f.z) * 0.5 - 0.25;
      dummy.position.set(f.x, gy + 0.3 * f.s, f.z);
      dummy.scale.set(f.s, f.s, f.s);
      dummy.rotation.set(0, f.ry, 0);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      dummy.position.set(f.x, gy + 0.58 * f.s, f.z);
      dummy.scale.setScalar(f.s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);
      flowers.setColorAt(i, new THREE.Color(f.color));
    });
    flowers.instanceMatrix.needsUpdate = true;
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    stems.instanceMatrix.needsUpdate = true;
    scene.add(flowers, stems);

    // Billboards with the game logo along the track.
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 256;
    boardCanvas.height = 128;
    const bctx = boardCanvas.getContext('2d');
    bctx.fillStyle = '#ffffff';
    bctx.fillRect(0, 0, 256, 128);
    bctx.fillStyle = '#2ec4ff';
    bctx.fillRect(0, 0, 256, 22);
    bctx.fillStyle = '#ff5a5f';
    bctx.fillRect(0, 106, 256, 22);
    bctx.fillStyle = '#1b2a41';
    bctx.font = 'bold 34px sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText('SUPER KART', 128, 72);
    bctx.font = 'bold 22px sans-serif';
    bctx.fillStyle = '#ff9f45';
    bctx.fillText('3D.js', 128, 98);
    const boardTex = new THREE.CanvasTexture(boardCanvas);
    boardTex.colorSpace = THREE.SRGBColorSpace;

    const boardMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    boardMat.map = boardTex;
    const boardGeo = new THREE.BoxGeometry(4.6, 2.3, 0.35);
    const spots = [
      { x: -30, z: -62, ry: 0.6 },
      { x: 40, z: -58, ry: -0.4 },
      { x: 62, z: 8, ry: 2.4 },
      { x: 30, z: 58, ry: 2.0 },
      { x: -48, z: 46, ry: -2.2 },
      { x: -66, z: -16, ry: 3.0 },
    ];
    for (const s of spots) {
      if (this._onTrack(s.x, s.z, 8)) continue; // keep billboards off the road
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(s.x, this._gy(s.x, s.z) + 1.5, s.z);
      board.rotation.y = s.ry;
      board.castShadow = true;
      scene.add(board);
      // legs
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 1.5, 8),
          toonMaterial(0x8b7a5c, {})
        );
        leg.position.set(s.x + side * 2.0, this._gy(s.x, s.z) + 0.75, s.z);
        scene.add(leg);
      }
    }
  }

  /**
   * Distant "points of interest" for the open field (vision audit: beyond
   * the track verge the field read empty — MK8 fills it with readable
   * landmarks). Four organized clusters, one per compass quadrant, all
   * >60m from the centerline (guarded with _onTrack margin 50 so nothing
   * ever touches the road):
   *   pond (SE), hilltop grove (SW), rock formation (NW), windmill (NE).
   * Deterministic seeded rnd; every prop sits at smoothH terrain height.
   */
  buildFieldLandmarks(scene) {
    const gy = (x, z) => this._gy(x, z);
    // Place only when the spot clears the road (>50m from centerline).
    const place = (x, z, fn) => {
      if (!this._onTrack(x, z, 50)) fn();
    };

    // --- (a) pond: flat blue disc + darker rim ring + 3 edge rocks ---
    place(88, -62, () => {
      const px = 88;
      const pz = -62;
      const baseY = gy(px, pz);
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(4, 24),
        new THREE.MeshToonMaterial({
          color: 0x3ec6ff,
          transparent: true,
          opacity: 0.8,
          emissive: 0x1e9bd6,
          emissiveIntensity: 0.35,
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(px, baseY + 0.06, pz);
      water.userData = { baseY: baseY + 0.06, phase: 3.9, baseColor: 0x3ec6ff };
      scene.add(water);
      this.waterMeshes.push(water); // shimmers with the lakes in update()
      // darker rim ring hugging the disc edge
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(3.2, 4, 24),
        toonMaterial(0x1e8ecf, {})
      );
      rim.rotation.x = -Math.PI / 2;
      rim.position.set(px, baseY + 0.03, pz);
      scene.add(rim);
      // 3 rocks banked on the rim (same dodecahedron style as buildProps)
      const rockGeo = new THREE.DodecahedronGeometry(0.55, 1);
      const rockMat = toonMaterial(0x9aa0ad, {});
      for (let i = 0; i < 3; i++) {
        const rand = rnd(46000 + i);
        const a = (i / 3) * Math.PI * 2 + rand() * 1.2;
        const r = 4.1 + rand() * 0.8;
        const s = 0.5 + rand() * 0.45;
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(px + Math.cos(a) * r, baseY + 0.3 * s, pz + Math.sin(a) * r);
        rock.scale.setScalar(s);
        rock.rotation.set((rand() - 0.5) * 0.6, rand() * Math.PI, (rand() - 0.5) * 0.6);
        rock.castShadow = true;
        scene.add(rock);
      }
    });

    // --- (b) hilltop grove: flattened-cone hill + 6 trees on the slope ---
    place(-95, -80, () => {
      const hx = -95;
      const hz = -80;
      const baseY = gy(hx, hz);
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(12, 2, 24),
        toonMaterial(0x3f9e4d, {})
      );
      hill.position.set(hx, baseY + 1, hz); // base at ground, 2m tall
      hill.castShadow = true;
      hill.receiveShadow = true;
      scene.add(hill);
      // 6 compact trees (smaller than forest trees) fanned around the peak
      const trunkMat = toonMaterial(0x6d4c41, {});
      const leafMat = toonMaterial(0x2e8b57, {});
      const leafMatDark = toonMaterial(0x256b41, {});
      const trunkGeo = new THREE.CylinderGeometry(0.16, 0.22, 2.0, 10);
      const leafGeo = new THREE.SphereGeometry(0.9, 12, 9);
      for (let i = 0; i < 6; i++) {
        const rand = rnd(47000 + i);
        const a = (i / 6) * Math.PI * 2 + 0.5;
        const r = 2.5 + rand() * 5.5; // 2.5-8m from the peak
        const tx = hx + Math.cos(a) * r;
        const tz = hz + Math.sin(a) * r;
        const h = 2 * (1 - r / 12); // hill height under the tree
        const s = 0.8 + rand() * 0.4;
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(tx, baseY + h + 1.0 * s, tz);
        trunk.rotation.z = (rand() - 0.5) * 0.2;
        trunk.rotation.x = (rand() - 0.5) * 0.2;
        trunk.castShadow = true;
        scene.add(trunk);
        const leaf = new THREE.Mesh(leafGeo, i % 2 ? leafMatDark : leafMat);
        leaf.position.set(tx, baseY + h + 2.2 * s, tz);
        leaf.scale.set(s * 1.05, s * 0.9, s * 1.05);
        leaf.castShadow = true;
        scene.add(leaf);
      }
    });

    // --- (c) big rock formation: 4 large dodecahedra (1.6-2.4m) grouped ---
    place(-100, 75, () => {
      const rx = -100;
      const rz = 75;
      const baseY = gy(rx, rz);
      const geo = new THREE.DodecahedronGeometry(1, 1);
      const mat = toonMaterial(0xa9a9b8, {});
      const scales = [2.4, 1.9, 1.6, 2.1];
      for (let i = 0; i < scales.length; i++) {
        const rand = rnd(48000 + i);
        const a = (i / scales.length) * Math.PI * 2 + 0.9;
        const d = 2.2 + rand() * 2.4; // 2.2-4.6m from the cluster center
        const s = scales[i];
        const rock = new THREE.Mesh(geo, mat);
        rock.position.set(rx + Math.cos(a) * d, baseY + 0.33 * s, rz + Math.sin(a) * d);
        rock.scale.set(s, s * 0.9, s);
        rock.rotation.set((rand() - 0.5) * 0.5, rand() * Math.PI, (rand() - 0.5) * 0.5);
        rock.castShadow = true;
        scene.add(rock);
      }
    });

    // --- (d) windmill: cylinder tower + red cap + 4 box blades on a hub ---
    place(90, 80, () => {
      const wx = 90;
      const wz = 80;
      const baseY = gy(wx, wz);
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.68, 6, 12),
        toonMaterial(0xf4f0e6, {})
      );
      tower.position.set(wx, baseY + 3, wz);
      tower.castShadow = true;
      scene.add(tower);
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 1.1, 12),
        toonMaterial(0xe2504f, {}) // red cap reads at race distance
      );
      cap.position.set(wx, baseY + 6.5, wz);
      scene.add(cap);
      // rotor faces the track; the inner spin group turns the blades
      const rotor = new THREE.Group();
      rotor.position.set(wx, baseY + 6.2, wz);
      rotor.rotation.y = 2.5;
      const spin = new THREE.Group();
      const bladeGeo = new THREE.BoxGeometry(0.22, 3.0, 0.09);
      const bladeMat = toonMaterial(0xf4f0e6, {});
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 1.5;
        blade.rotation.z = (i / 4) * Math.PI * 2;
        blade.castShadow = true;
        spin.add(blade);
      }
      const hub = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 10, 8),
        toonMaterial(0xe2504f, {})
      );
      spin.add(hub);
      rotor.add(spin);
      scene.add(rotor);
      this.windmillRotors.push(spin); // update() spins the blades
    });
  }

  /**
   * Warm atmospheric haze rings at the horizon, behind the mountain bands —
   * the sky-terrain seam reads as layered air instead of a hard edge
   * (vision critic: horizon haze was missing entirely). fog:false keeps the
   * bands visible past the fog far plane; low opacity keeps them subtle.
   */
  buildHorizonHaze(scene) {
    const bands = [
      { r: 230, y: 4.5, color: 0xfff2d8, opacity: 0.16 },
      { r: 285, y: 6.5, color: 0xffe9c9, opacity: 0.14 },
      { r: 345, y: 8.5, color: 0xd9ecff, opacity: 0.12 },
    ];
    for (const b of bands) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(b.r - 14, b.r + 14, 72),
        new THREE.MeshBasicMaterial({
          color: b.color,
          transparent: true,
          opacity: b.opacity,
          fog: false,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = b.y;
      scene.add(ring);
    }
  }

  /**
   * Sponsor banner strips along the straights, both sides, just outside the
   * guard-rail (rail at halfW+1.1, banners at halfW+2.4 — beyond rail+1.3,
   * so the tall poles never clip the chase camera). Bold diagonal racing
   * stripes + SUPER KART GP text read as trackside life at race distance.
   */
  buildTracksideBanners(scene, track) {
    if (!track || !track.path) return;
    const path = track.path;
    const halfW = CONFIG.track.roadWidth / 2;
    if (!this._bannerTex) {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 64;
      const g = c.getContext('2d');
      // diagonal racing stripes — reads as a sponsor banner at distance
      const colors = ['#e2504f', '#f4f6f8', '#2e9be8', '#ffd166'];
      for (let i = 0; i < 8; i++) {
        g.fillStyle = colors[i % colors.length];
        g.beginPath();
        g.moveTo(i * 32 - 32, 64);
        g.lineTo(i * 32 + 32, 64);
        g.lineTo(i * 32 + 64, 0);
        g.lineTo(i * 32, 0);
        g.closePath();
        g.fill();
      }
      g.fillStyle = 'rgba(27,42,65,0.85)';
      g.fillRect(0, 22, 256, 20);
      g.fillStyle = '#ffffff';
      g.font = '900 26px "Baloo 2", "Nunito", Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('SUPER KART GP', 128, 32);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      this._bannerTex = tex;
    }
    const bannerMat = new THREE.MeshBasicMaterial({ map: this._bannerTex, side: THREE.DoubleSide });
    const poleMat = toonMaterial(0x8b7a5c, {});
    const bannerGeo = new THREE.BoxGeometry(5.6, 1.0, 0.08);
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 3.0, 8);
    const tan = new THREE.Vector3();
    const tan2 = new THREE.Vector3();
    const p = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    let made = 0;
    for (let i = 0; i < 220; i++) {
      const t = i / 220;
      path.getTangentAt(t, tan);
      path.getTangentAt(Math.min(0.999, t + 1 / 220), tan2);
      const curv = 1 - Math.min(1, Math.max(-1, tan.dot(tan2)));
      if (curv > 0.0008) continue; // straights only (same gate as light poles)
      if (i % 6 !== 0) continue; // one banner every ~16m along a straight
      path.getPointAt(t, p);
      nrm.set(-tan.z, 0, tan.x).normalize();
      const side = (i / 6) % 2 === 0 ? 1 : -1;
      const bx = p.x + nrm.x * side * (halfW + 2.4);
      const bz = p.z + nrm.z * side * (halfW + 2.4);
      if (this._onTrack(bx, bz, 2)) continue; // never on the road
      const by = p.y; // anchor at path elevation (rail base line)
      for (const off of [-1, 1]) {
        // poles at the banner's WIDTH ends — along the tangent (the board
        // is only 0.08m thick laterally, so lateral poles would float)
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(bx + tan.x * off * 2.7, by + 1.5, bz + tan.z * off * 2.7);
        scene.add(pole);
      }
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(bx, by + 2.35, bz);
      banner.lookAt(p.x, by + 2.35, p.z); // face the track
      banner.rotation.z = 0;
      scene.add(banner);
      made++;
    }
  }

  /**
   * Racing tire stacks (3 tires, middle one painted white) along the
   * straights — the classic paddock dressing that reads instantly as
   * motorsport. Lateral halfW+2.6 (rail+1.5) so the ~1.3m stacks stay clear
   * of the chase-camera line, and every stack is _onTrack-guarded.
   */
  buildTireStacks(scene, track) {
    if (!track || !track.path) return;
    const path = track.path;
    const len = path.getLength();
    const halfW = CONFIG.track.roadWidth / 2;
    const tireGeo = new THREE.TorusGeometry(0.42, 0.2, 10, 18);
    // white base material — instance colors tint it (dark rubber / white
    // painted tire). A colored material would multiply and kill the white.
    const tireMat = toonMaterial(0xffffff, {});
    const stacks = [];
    const tan = new THREE.Vector3();
    const tan2 = new THREE.Vector3();
    const p = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const n = Math.max(10, Math.round(len / 40));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      path.getTangentAt(t, tan);
      path.getTangentAt(Math.min(0.999, t + 1 / n), tan2);
      const curv = 1 - Math.min(1, Math.max(-1, tan.dot(tan2)));
      if (curv > 0.0008) continue; // straights only
      path.getPointAt(t, p);
      nrm.set(-tan.z, 0, tan.x).normalize();
      const side = i % 2 === 0 ? 1 : -1;
      const tx = p.x + nrm.x * side * (halfW + 2.6);
      const tz = p.z + nrm.z * side * (halfW + 2.6);
      if (this._onTrack(tx, tz, 2)) continue; // never on the road
      stacks.push({ x: tx, z: tz, gy: p.y, ry: Math.atan2(tan.x, tan.z) });
    }
    if (!stacks.length) return;
    const tires = new THREE.InstancedMesh(tireGeo, tireMat, stacks.length * 3);
    const col = new THREE.Color();
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (const s of stacks) {
      for (let k = 0; k < 3; k++) {
        dummy.position.set(s.x, s.gy + 0.24 + k * 0.42, s.z);
        dummy.rotation.set(Math.PI / 2, 0, s.ry); // torus laid flat
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        tires.setMatrixAt(idx, dummy.matrix);
        // middle tire painted white — classic racing stack contrast
        col.setHex(k === 1 ? 0xf4f6f8 : 0x262a33);
        tires.setColorAt(idx, col);
        idx++;
      }
    }
    tires.instanceMatrix.needsUpdate = true;
    if (tires.instanceColor) tires.instanceColor.needsUpdate = true;
    scene.add(tires);
  }

  /**
   * Dense, ORGANIZED roadside dressing (vision audit: flowers/bushes too
   * sparse near the track): wildflower patches every ~12m along BOTH road
   * edges just outside the guard-rail, plus 8-10 rock groups alternating
   * sides. Everything is sampled from the real track path (like
   * buildRoadsideCrowd) so it follows every curve, anchors at the path
   * elevation like the rail/crowd/poles, and stays under 0.8m tall so the
   * chase-camera line is never blocked. Offsets clear the guard rail
   * (rail sits at roadW/2 + 1.1) — nothing spawns on the road or inside it.
   */
  buildRoadsideFlowersAndRocks(scene, track) {
    if (!track || !track.path) return;
    const path = track.path;
    const len = path.getLength();
    const halfW = CONFIG.track.roadWidth / 2;
    const RAIL = halfW + 1.1; // guard-rail lateral offset (TrackBuilder)
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const dummy = new THREE.Object3D();

    // Same prop geometry/style as buildProps wildflowers & rocks.
    const flowerGeo = new THREE.SphereGeometry(0.16, 8, 6);
    const stemGeo = new THREE.CylinderGeometry(0.025, 0.045, 0.55, 6);
    const flowerMat = toonMaterial(0xffffff, {});
    const stemMat = toonMaterial(0x2f8f43, {});
    const flowerColors = [0xff5a5f, 0xffd166, 0x2ec4ff, 0xc86bff, 0xffffff, 0xff9f45];
    const rockGeo = new THREE.DodecahedronGeometry(0.7, 1);
    const rockMat = toonMaterial(0xa9a9b8, {});

    // t-ranges where the painted crowd stands (buildRoadsideCrowd) — flower
    // patches skip those slots so nothing spawns inside a spectator.
    const crowdSegs = [
      [0.945, 0.055], [0.10, 0.15], [0.19, 0.25],
      [0.30, 0.37], [0.45, 0.56], [0.62, 0.68],
    ];
    const inCrowd = (t) => {
      for (const [a, b] of crowdSegs) {
        if (a <= b) { if (t >= a && t <= b) return true; }
        else if (t >= a || t <= b) return true; // wraps past 1.0
      }
      return false;
    };

    // --- flower patches: one every ~12m, BOTH sides, 1.2-2.0m off the rail.
    const flowerSpots = [];
    const n = Math.floor(len / 12);
    for (let i = 0; i < n; i++) {
      const rand = rnd(33000 + i);
      const t = (((i / n + (rand() - 0.5) * (2.5 / len)) % 1) + 1) % 1; // ±1.25m along path
      if (inCrowd(t)) continue;
      path.getPointAt(t, p);
      path.getTangentAt(t, tan);
      nrm.set(-tan.z, 0, tan.x).normalize();
      const gy = p.y; // anchor at path elevation (rail base line)
      for (const side of [1, -1]) {
        const off = RAIL + 1.2 + rand() * 0.8; // 6.8-7.6m from centerline
        const cx = p.x + nrm.x * side * off + (rand() - 0.5) * 1.2;
        const cz = p.z + nrm.z * side * off + (rand() - 0.5) * 1.2;
        if (inWater(cx, cz, 4)) continue;
        // 2 sub-clusters × 3-5 flowers = 6-10 per patch, colored variety.
        for (let c = 0; c < 2; c++) {
          const r2 = rnd(33000 + i * 10 + c * 5 + (side === 1 ? 1 : 0));
          const per = 3 + ((r2() * 3) | 0);
          const scx = cx + (r2() - 0.5) * 1.1;
          const scz = cz + (r2() - 0.5) * 1.1;
          for (let k = 0; k < per; k++) {
            const r3 = rnd(33000 + i * 10 + c * 5 + k * 3 + (side === 1 ? 2 : 0));
            flowerSpots.push({
              x: scx + (r3() - 0.5) * 0.7,
              z: scz + (r3() - 0.5) * 0.7,
              gy,
              s: 0.85 + r3() * 0.3, // head ≤ 0.67m — under the camera line
              ry: r3() * Math.PI,
              color: flowerColors[(r3() * flowerColors.length) | 0],
            });
          }
        }
      }
    }
    if (flowerSpots.length) {
      const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerSpots.length);
      const stems = new THREE.InstancedMesh(stemGeo, stemMat, flowerSpots.length);
      flowerSpots.forEach((f, i) => {
        dummy.position.set(f.x, f.gy + 0.3 * f.s, f.z);
        dummy.scale.set(f.s, f.s, f.s);
        dummy.rotation.set(0, f.ry, 0);
        dummy.updateMatrix();
        stems.setMatrixAt(i, dummy.matrix);
        dummy.position.set(f.x, f.gy + 0.58 * f.s, f.z);
        dummy.scale.setScalar(f.s);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        flowers.setMatrixAt(i, dummy.matrix);
        flowers.setColorAt(i, new THREE.Color(f.color));
      });
      flowers.instanceMatrix.needsUpdate = true;
      if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
      stems.instanceMatrix.needsUpdate = true;
      scene.add(flowers, stems);
    }

    // --- rock groups: 8-10 groups, alternating sides, 3-5m off the rail.
    const rockSpots = [];
    const groups = Math.min(10, Math.max(8, Math.round(len / 25)));
    for (let g = 0; g < groups; g++) {
      const rand = rnd(34000 + g);
      const t = (((g / groups + (rand() - 0.5) * (1.5 / len)) % 1) + 1) % 1; // ±0.75m along path
      const side = g % 2 === 0 ? 1 : -1;
      path.getPointAt(t, p);
      path.getTangentAt(t, tan);
      nrm.set(-tan.z, 0, tan.x).normalize();
      const off = RAIL + 3 + rand() * 2; // 8.6-10.6m from centerline
      const gx = p.x + nrm.x * side * off + (rand() - 0.5) * 1.0;
      const gz = p.z + nrm.z * side * off + (rand() - 0.5) * 1.0;
      if (inWater(gx, gz, 4)) continue;
      const gy = p.y;
      const per = 2 + ((rand() * 2) | 0); // 2-3 rocks per group
      for (let k = 0; k < per; k++) {
        const r2 = rnd(34000 + g * 7 + k);
        rockSpots.push({
          x: gx + (r2() - 0.5) * 2.0,
          z: gz + (r2() - 0.5) * 2.0,
          gy,
          s: 0.42 + r2() * 0.16, // squat → top ≤ 0.55m — under the camera line
          ry: r2() * Math.PI,
          rx: (r2() - 0.5) * 0.3,
          rz: (r2() - 0.5) * 0.3,
        });
      }
    }
    if (rockSpots.length) {
      const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockSpots.length);
      rockSpots.forEach((r, i) => {
        dummy.position.set(r.x, r.gy + 0.42 * r.s, r.z);
        dummy.scale.set(r.s, r.s * 0.72, r.s); // low profile near the rail
        dummy.rotation.set(r.rx, r.ry, r.rz);
        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);
      });
      rocks.instanceMatrix.needsUpdate = true;
      scene.add(rocks);
    }
  }

  buildBalloons(scene) {
    // Hot-air balloons drifting high above — instant cartoon charm.
    // Dense 16x14 envelope + 24-seg stripe ring, and an ORGANIZED skyline:
    // balloons fly a diagonal corridor at even spacing with a consistent
    // altitude step — a planned parade, not random dots in the sky.
    this.balloons = [];
    const colors = [0xff5a5f, 0xffd166, 0x6cff8f, 0xc86bff];
    for (let i = 0; i < 6; i++) {
      const rand = rnd(300 + i);
      const g = new THREE.Group();
      const bal = new THREE.Mesh(
        new THREE.SphereGeometry(2.8, 16, 14),
        toonMaterial(colors[i % colors.length], {})
      );
      bal.scale.set(1, 1.15, 1);
      bal.position.y = 2.6;
      g.add(bal);
      // Vertical contrasting stripe + side panels — the classic balloon
      // silhouette (reads as "hot-air balloon", not a floating sphere).
      const stripe = new THREE.Mesh(
        new THREE.TorusGeometry(2.5, 0.35, 10, 24),
        toonMaterial(0xf4f6f8, {})
      );
      stripe.scale.set(1, 1.18, 1);
      stripe.position.y = 2.7;
      g.add(stripe);
      const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.9, 1.1, 12),
        toonMaterial(0xb07a4f, {})
      );
      basket.position.y = 0;
      g.add(basket);
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6),
        toonMaterial(0x8b7a5c, {})
      );
      rope.position.y = 1.4;
      g.add(rope);
      g.position.set(
        -180 + i * 72 + (rand() - 0.5) * 14,
        44 + i * 8 + (rand() - 0.5) * 6,
        -130 + i * 52 + (rand() - 0.5) * 14
      );
      g.userData = { baseY: g.position.y, speed: 0.05 + i * 0.012, phase: i * 1.57 };
      scene.add(g);
      this.balloons.push(g);
    }
  }

  /**
   * REMOVED buildCrowd: the old "colorful standing blocks" read as loose
   * placeholder cubes on the grass. Real spectators now come from
   * buildGrandstand (body+head figures) and buildRoadsideCrowd (start
   * straight line). Keeping the empty method is a trap — delete it entirely.
   */

  buildGrandstand(scene) {
    // Big grandstand with striped awning near a curve — crowd anchor.
    const grandstandSpots = [
      { x: -50, z: -14, ry: 1.5 },  // beside the start straight, IN FRONT of the grid camera
      { x: -10, z: -72, ry: -0.3 },
      { x: 56, z: 50, ry: 2.2 },
    ];
    const crowdColors = [0xff5a5f, 0xffd166, 0x6cff8f, 0x2ec4ff, 0xc86bff, 0xff9f45, 0xffffff];
    // Painted sponsor fascia (SUPER KART text) — cached once, shared by all
    // stands. MeshBasicMaterial keeps it readable at race distance.
    if (!this._fasciaTex) {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 96;
      const g = c.getContext('2d');
      g.fillStyle = '#e2504f';
      g.fillRect(0, 0, 512, 96);
      g.fillStyle = '#ffd166';
      g.fillRect(0, 0, 512, 10);
      g.fillRect(0, 86, 512, 10);
      g.fillStyle = '#ffffff';
      g.font = '900 44px "Baloo 2", "Nunito", Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('SUPER KART 3D.js', 256, 50);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      this._fasciaTex = tex;
    }
    const fasciaMat = new THREE.MeshBasicMaterial({ map: this._fasciaTex });
    for (const gs of grandstandSpots) {
      // USER BUG FIX (grandstand on the road): only the CENTER was checked
      // against the track — a 16m-wide stand whose center sat ~9m off the
      // centerline passed the test while one corner still crossed the
      // asphalt. Check all four corners (rotated by ry) with a margin.
      const cos = Math.cos(gs.ry);
      const sin = Math.sin(gs.ry);
      let cornerOnTrack = false;
      for (const [lx, lz] of [[8, 2.7], [-8, 2.7], [8, -2.7], [-8, -2.7]]) {
        const wx = gs.x + lx * cos - lz * sin;
        const wz = gs.z + lx * sin + lz * cos;
        if (this._onTrack(wx, wz, 4)) { cornerOnTrack = true; break; }
      }
      if (cornerOnTrack) continue; // grandstand off the road (tight margin)
      const grp = new THREE.Group();
      // steps (3 tiers) — red / white / blue stadium rows via per-instance
      // color so the stand reads as SEATING, not grey boxes.
      const tier = new THREE.InstancedMesh(new THREE.BoxGeometry(16, 0.8, 2.4), toonMaterial(0xffffff, {}), 3);
      const tierCols = [0xe2504f, 0xf4f6f8, 0x2e9be8];
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      for (let i = 0; i < 3; i++) {
        dummy.position.set(0, 1.0 + i * 1.1, -i * 2.2);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        tier.setMatrixAt(i, dummy.matrix);
        tier.setColorAt(i, col.setHex(tierCols[i]));
      }
      tier.instanceMatrix.needsUpdate = true;
      if (tier.instanceColor) tier.instanceColor.needsUpdate = true;
      grp.add(tier);
      // spectators on each tier: body block (bright color) + white head ball.
      // 15 per tier x 3 = 45 (was 12 x 3 = 36) — denser packed rows.
      const N = 45;
      const spec = new THREE.InstancedMesh(new THREE.BoxGeometry(1.05, 1.2, 1.0), toonMaterial(0xffffff, {}), N);
      const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 12, 8), toonMaterial(0xf4f6f8, {}), N);
      // Raised arms (cheering people, not blocks with heads).
      const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.75, 8);
      const armsL = new THREE.InstancedMesh(armGeo, toonMaterial(0xffd9b3, {}), N);
      const armsR = new THREE.InstancedMesh(armGeo, toonMaterial(0xffd9b3, {}), N);
      let sIdx = 0;
      const baseY = new Array(N);
      const headDummy = new THREE.Object3D();
      const armDummy = new THREE.Object3D();
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 15; j++) {
          dummy.position.set(-8.2 + j * 1.1, 1.6 + i * 1.15, -i * 2.2 + 0.3);
          dummy.scale.set(1, 0.9 + Math.random() * 0.4, 1);
          dummy.rotation.set(0, 0, 0);
          baseY[sIdx] = dummy.position.y;
          dummy.updateMatrix();
          spec.setMatrixAt(sIdx, dummy.matrix);
          col.setHex(crowdColors[Math.floor(Math.random() * crowdColors.length)]);
          spec.setColorAt(sIdx, col);
          headDummy.position.set(dummy.position.x, dummy.position.y + 0.95, dummy.position.z);
          headDummy.scale.set(1, 1, 1);
          headDummy.rotation.set(0, 0, 0);
          headDummy.updateMatrix();
          heads.setMatrixAt(sIdx, headDummy.matrix);
          // Arms raised outward (cheering silhouette).
          armDummy.position.set(dummy.position.x - 0.46, dummy.position.y + 0.72, dummy.position.z);
          armDummy.rotation.set(0, 0, -0.9);
          armDummy.updateMatrix();
          armsL.setMatrixAt(sIdx, armDummy.matrix);
          armDummy.position.set(dummy.position.x + 0.46, dummy.position.y + 0.72, dummy.position.z);
          armDummy.rotation.set(0, 0, 0.9);
          armDummy.updateMatrix();
          armsR.setMatrixAt(sIdx, armDummy.matrix);
          sIdx++;
        }
      }
      spec.instanceMatrix.needsUpdate = true;
      if (spec.instanceColor) spec.instanceColor.needsUpdate = true;
      spec.userData.baseY = baseY;
      armsL.instanceMatrix.needsUpdate = true;
      armsR.instanceMatrix.needsUpdate = true;
      grp.add(spec, heads, armsL, armsR);
      (this.crowdMeshes = this.crowdMeshes || []).push(spec);
      // painted front fascia — sponsor wall in front of the first tier
      const fascia = new THREE.Mesh(new THREE.BoxGeometry(16.5, 1.4, 0.15), fasciaMat);
      fascia.position.set(0, 0.7, 1.35);
      grp.add(fascia);
      // striped awning (roof) + canvas scallop fringe on its front edge
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(18, 0.25, 5.4),
        toonMaterial(0xff5a5f, {})
      );
      awning.position.set(0, 4.4, -3.2);
      awning.rotation.x = 0.16;
      grp.add(awning);
      // awning stripes (white bars)
      const barGeo = new THREE.BoxGeometry(1.1, 0.3, 5.5);
      const barMat = toonMaterial(0xffffff, {});
      for (let i = -7; i <= 7; i += 2) {
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(i * 1.1, 4.42, -3.2);
        bar.rotation.x = 0.16;
        grp.add(bar);
      }
      // scalloped fringe hanging from the awning's front edge
      const scallopGeo = new THREE.BoxGeometry(0.6, 0.55, 0.06);
      const scallopRed = toonMaterial(0xff5a5f, {});
      const scallopWhite = toonMaterial(0xffffff, {});
      for (let i = -7; i <= 7; i++) {
        const scallop = new THREE.Mesh(scallopGeo, i % 2 === 0 ? scallopRed : scallopWhite);
        scallop.position.set(i * 0.9, 3.92, -0.42);
        scallop.rotation.x = 0.16;
        grp.add(scallop);
      }
      // support posts
      const postGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.4, 8);
      const postMat = toonMaterial(0x8b7a5c, {});
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(side * 8, 2.2, -3.4);
        grp.add(post);
      }
      grp.position.set(gs.x, this._gy(gs.x, gs.z), gs.z);
      grp.rotation.y = gs.ry;
      scene.add(grp);
    }
  }

  buildDistanceMarks(scene) {
    // 100m/200m distance posts along the far stretches (cheap racing flavor).
    const marks = [
      { x: -30, z: -52, ry: 0.5, label: '100' },
      { x: 30, z: -60, ry: -0.4, label: '200' },
      { x: 62, z: -20, ry: 1.5, label: '100' },
      { x: 46, z: 56, ry: 2.0, label: '200' },
      { x: -40, z: 52, ry: -2.0, label: '100' },
    ];
    // Distance board texture: amber panel with a bold dark label (the old
    // boards were plain amber boxes — user flagged them as unreadable yellow
    // cubes).
    if (!this._distTex) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#ffd166';
      g.fillRect(0, 0, 128, 64);
      g.strokeStyle = '#1b2a41';
      g.lineWidth = 6;
      g.strokeRect(4, 4, 120, 56);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      this._distTexBase = tex;
    }
    const postMat = toonMaterial(0x8b7a5c, {});
    for (const m of marks) {
      if (this._onTrack(m.x, m.z, 8)) continue; // distance marks off the road
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.6, 8), postMat);
      post.position.set(m.x, smoothH(m.x, m.z) * 0.5 - 0.25 + 0.8, m.z);
      post.rotation.y = m.ry;
      scene.add(post);
      // Per-label texture (cache by label).
      const key = 'dist_' + m.label;
      if (!this._distTexes) this._distTexes = {};
      if (!this._distTexes[key]) {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 64;
        const g = c.getContext('2d');
        g.drawImage(this._distTexBase.image, 0, 0);
        g.fillStyle = '#1b2a41';
        g.font = 'bold 42px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(m.label + 'm', 64, 34);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        this._distTexes[key] = tex;
      }
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.5, 0.08),
        new THREE.MeshBasicMaterial({ map: this._distTexes[key], color: 0xffffff })
      );
      board.position.set(m.x, smoothH(m.x, m.z) * 0.5 - 0.25 + 1.35, m.z);
      board.rotation.y = m.ry;
      scene.add(board);
    }
  }

  /**
   * Spectator line along the start straight (both sides of the road, just
   * outside the ribbon) — the finish frame finally shows a living crowd.
   */
  buildRoadsideCrowd(scene, track) {
    if (!track || !track.path) return;
    const path = track.path;
    const halfW = CONFIG.track.roadWidth / 2;
    // Spectator segments along the track (t0..t1 wraps at 1.0): the start
    // straight, the back straight, and after turn 1 — so ANY race frame has
    // cheering people beside the road, not just the grid.
    const SEGMENTS = [
      { t0: 0.945, t1: 0.055, n: 20 }, // start straight (WRAPS past 1.0)
      { t0: 0.10, t1: 0.15, n: 10 },    // exit of turn 1
      { t0: 0.19, t1: 0.25, n: 12 },   // turn 1
      { t0: 0.30, t1: 0.37, n: 10 },    // climb
      { t0: 0.45, t1: 0.56, n: 14 },   // back straight
      { t0: 0.62, t1: 0.68, n: 10 },    // descent
      { t0: 0.72, t1: 0.80, n: 8 },     // turn 4 approach
      { t0: 0.855, t1: 0.915, n: 8 },   // final esses
    ];
    // Two rows per side. USER BUG FIX: the old offsets (1.35 / 2.9) were
    // only ~1.35m past the road edge — billboard figures 1.1m wide visually
    // spilled ONTO the asphalt, and (worse) the wrap segment below sampled
    // the WHOLE lap in reverse, scattering spectators into every curve.
    // Pushed out to 1.9 / 3.5 so the painted crowd clearly stands BEHIND
    // the guard-rail line (rail at halfW + 1.1, crowd now at halfW + 1.9+).
    const ROWS = [1.9, 3.5];
    const segN = SEGMENTS.reduce((a, s) => a + s.n, 0);
    const total = segN * ROWS.length * 2;
    // 2.5D crowd: each spectator is a painted figure (head + suit + raised
    // arms) on a canvas plane — like MK8's billboard crowds. A painted person
    // stays readable at race distance, where 3D blocks collapse into blobs.
    const FIGURES = [
      { color: 0xff5a5f, arms: 1 },
      { color: 0xffd166, arms: 1 },
      { color: 0x6cff8f, arms: 1 },
      { color: 0x2ec4ff, arms: 1 },
      { color: 0xc86bff, arms: 1 },
      { color: 0xff9f45, arms: 0 },
      { color: 0xf4f6f8, arms: 1 },
    ];
    const figureTextures = FIGURES.map((f) => this._crowdFigureTexture(f.color, f.arms));
    const perFig = new Array(FIGURES.length).fill(0).map(() => []);
    const dummy = new THREE.Object3D();
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    for (const seg of SEGMENTS) {
      for (let side = -1; side <= 1; side += 2) {
        for (const rowOff of ROWS) {
          for (let i = 0; i < seg.n; i++) {
            // USER BUG FIX (crowd on the road): the old formula
            // `(t0 + i/n * (t1 - t0)) % 1` walked BACKWARD from 0.945 to
            // 0.055 for the wrap segment — i.e. the whole lap in reverse —
            // scattering spectators into every curve. The correct wrap
            // length is `(t1 - t0 + 1) % 1`, so 0.945→0.055 spans the
            // short start-straight arc past 1.0, not the full circuit.
            const span = (seg.t1 - seg.t0 + 1) % 1;
            const t = (seg.t0 + (i / seg.n) * span) % 1;
            path.getPointAt(t, p);
            path.getTangentAt(t, tan);
            nrm.set(-tan.z, 0, tan.x).normalize();
            dummy.position.set(p.x + nrm.x * (side * (halfW + rowOff)), p.y + 0.9, p.z + nrm.z * (side * (halfW + rowOff)));
            dummy.lookAt(p.x, p.y + 0.9, p.z);
            dummy.rotation.z = 0;
            dummy.scale.set(0.9 + Math.random() * 0.3, 0.85 + Math.random() * 0.3, 1);
            dummy.updateMatrix();
            const figIdx = (i + (rowOff === ROWS[0] ? 0 : 3) + (side === 1 ? 1 : 0)) % FIGURES.length;
            perFig[figIdx].push(dummy.matrix.clone());
          }
        }
      }
    }
    for (let f = 0; f < FIGURES.length; f++) {
      const list = perFig[f];
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(1.1, 1.6),
        toonMaterial(0xffffff, { map: figureTextures[f], transparent: true, side: THREE.DoubleSide, depthWrite: false }),
        list.length
      );
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      // Record base Y per instance so the crowd-bounce animation (update)
      // can wave these billboard figures too.
      im.userData.baseY = list.map((m) => m.elements[13]);
      scene.add(im);
      (this.crowdMeshes = this.crowdMeshes || []).push(im);
    }
  }

  /** Painted cheering figure (head + suit + raised arms) on a 128x192 canvas. */
  _crowdFigureTexture(color, arms) {
    const key = 'fig_' + color.toString(16) + '_' + (arms ? 'a' : 'n');
    if (this._figCache?.[key]) return this._figCache[key];
    const w = 128;
    const h = 192;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, w, h);
    const c = new THREE.Color(color);
    const css = '#' + c.getHexString();
    // Legs
    g.fillStyle = '#2b3242';
    g.fillRect(52, 138, 10, 44);
    g.fillRect(66, 138, 10, 44);
    // Suit body (rounded torso)
    g.fillStyle = css;
    g.beginPath();
    g.roundRect(36, 74, 56, 72, 14);
    g.fill();
    // Arms raised (cheering) or hanging
    g.strokeStyle = css;
    g.lineWidth = 12;
    g.lineCap = 'round';
    if (arms) {
      g.beginPath(); g.moveTo(42, 88); g.lineTo(14, 44); g.stroke();
      g.beginPath(); g.moveTo(86, 88); g.lineTo(114, 44); g.stroke();
    } else {
      g.beginPath(); g.moveTo(40, 92); g.lineTo(24, 128); g.stroke();
      g.beginPath(); g.moveTo(88, 92); g.lineTo(104, 128); g.stroke();
    }
    // Head (skin) + hair cap hint
    g.fillStyle = '#ffd9b3';
    g.beginPath(); g.arc(64, 46, 20, 0, Math.PI * 2); g.fill();
    // Dark cartoon outline around the whole figure reads at distance.
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this._figCache = this._figCache || {};
    this._figCache[key] = tex;
    return tex;
  }

  /**
   * Periodic roadside light poles along straights (audit V3: mid-straights
   * read empty — MK8 lines straights with poles/stands/banners).
   */
  buildLightPoles(scene, track) {
    if (!track || !track.path) return;
    // NEON CITY: the day poles are replaced by glowing pink/cyan neon strips.
    if (this.trackId === 2) {
      this.buildNeonPoles(scene, track);
      return;
    }
    const path = track.path;
    const halfW = CONFIG.track.roadWidth / 2;
    const poleMat = toonMaterial(0x7d8a99, {});
    const headMat = toonMaterial(0xffd166, {});
    const tan = new THREE.Vector3();
    const tan2 = new THREE.Vector3();
    const p = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    let made = 0;
    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      path.getTangentAt(t, tan);
      path.getTangentAt(Math.min(0.999, t + 1 / 200), tan2);
      const curv = 1 - Math.min(1, Math.max(-1, tan.dot(tan2)));
      // Straight sections only (curv < 0.0008) → "empty runs" get rhythm.
      if (curv > 0.0008) continue;
      if (made % 2 === 0 && i % 4 !== 0) continue; // every 4th sample on straights
      path.getPointAt(t, p);
      nrm.set(-tan.z, 0, tan.x).normalize();
      const side = made % 2 === 0 ? 1 : -1;
      const px = p.x + nrm.x * (side * (halfW + 3.6));
      const pz = p.z + nrm.z * (side * (halfW + 3.6));
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.4, 8), poleMat);
      pole.position.set(px, p.y + 1.7, pz);
      scene.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.22), headMat);
      head.position.set(px, p.y + 3.45, pz);
      // lamp head faces the track
      head.lookAt(p.x, p.y + 3.45, p.z);
      head.rotation.z = 0;
      scene.add(head);
      made++;
    }
  }

  /** Night sky dome texture: dark blue-purple gradient + faint stars.
   *  Gradient follows the theme spec: 0x1a1a3a horizon → 0x2a2a5a mid →
   *  0x3a2a6a zenith (canvas y=0 is the dome top in three's sphere UVs). */
  _nightSkyTexture() {
    if (this._nightSkyTex) return this._nightSkyTex;
    const s = 512;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#3a2a6a'); // zenith
    g.addColorStop(0.5, '#2a2a5a');
    g.addColorStop(1, '#1a1a3a'); // horizon — matches the night fog color
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // sparse deterministic star field (upper sky only)
    const rand = rnd(777);
    for (let i = 0; i < 90; i++) {
      const x = rand() * s;
      const y = rand() * s * 0.72;
      ctx.globalAlpha = 0.25 + rand() * 0.65;
      ctx.fillStyle = rand() > 0.8 ? '#cfe0ff' : '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 0.5 + rand() * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this._nightSkyTex = new THREE.CanvasTexture(canvas);
    this._nightSkyTex.colorSpace = THREE.SRGBColorSpace;
    return this._nightSkyTex;
  }

  /** Building facade texture: dark blue-grey wall + grid of lit window
   *  cells. MeshBasicMaterial keeps the facade self-lit at night, and the
   *  per-instance color tints every lit cell (dark walls × tint stay dark,
   *  so only the windows glow in orange / electric blue / yellow). */
  _windowTexture() {
    if (this._windowTex) return this._windowTex;
    const s = 256;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#161c30'; // dark wall base
    ctx.fillRect(0, 0, s, s);
    const rand = rnd(4242);
    // Fewer, BIGGER windows (vision critic: 8×7 tiny cells read as colored
    // panels, not buildings — 4×5 big lit windows read as a skyline).
    const cols = 4;
    const rows = 5;
    const cell = 46;
    const gap = 6;
    const startX = (s - (cols * cell + (cols - 1) * gap)) / 2;
    const startY = (s - (rows * cell + (rows - 1) * gap)) / 2;
    const litTints = ['#ffe9c4', '#cfe4ff', '#fff7cc'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = rand() < 0.52
          ? litTints[(rand() * litTints.length) | 0]
          : '#0e1426'; // unlit cell
        ctx.fillRect(
          startX + c * (cell + gap),
          startY + r * (cell + gap),
          cell,
          cell
        );
      }
    }
    this._windowTex = new THREE.CanvasTexture(canvas);
    this._windowTex.colorSpace = THREE.SRGBColorSpace;
    return this._windowTex;
  }

  /**
   * NEON CITY skyline: glowing moon disc + two concentric rows of instanced
   * towers (12-16 each) 65-90m out. Towers are 6x(12-30)x6 boxes offset
   * along the outward radial from the loop centroid — that direction always
   * moves AWAY from the road, so nothing ever spawns on the track (belt &
   * suspenders: an _onTrack guard runs anyway). Each tower carries the
   * window-grid texture tinted per-instance with a hot neon color.
   */
  buildNeonCity(scene, track) {
    // --- moon: small glowing white disc + soft halo, high in the night sky.
    //     fog:false so it stays crisp past the fog far plane.
    const moon = new THREE.Group();
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(5.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xaac4ff, transparent: true, opacity: 0.3, fog: false, depthWrite: false })
    );
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.7, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff4e0, fog: false })
    );
    disc.position.z = 0.2; // avoid z-fight with the halo
    moon.add(halo, disc);
    moon.position.set(150, 195, -115); // same axis as the night key light
    moon.lookAt(0, 0, 0); // face the track
    scene.add(moon);

    // --- building skyline ---
    if (!track || !track.path) return;
    const path = track.path;
    const len = path.getLength();
    // Loop centroid → outward radial offset is guaranteed road-safe.
    const cent = new THREE.Vector3();
    const probe = new THREE.Vector3();
    for (let i = 0; i < 64; i++) {
      path.getPointAt(i / 64, probe);
      cent.add(probe);
    }
    cent.multiplyScalar(1 / 64);

    const geo = new THREE.BoxGeometry(10, 14, 8);
    const mat = new THREE.MeshBasicMaterial({ map: this._windowTexture() });
    const towers = new THREE.InstancedMesh(geo, mat, 48);
    const windowColors = [0xff9a3c, 0x3c9aff, 0xffe23c];
    const dummy = new THREE.Object3D();
    const dir = new THREE.Vector3();
    let idx = 0;
    // Row A hugs the track (16-26m); row B sits behind it (26-38m); row C is
    // a LOWER midground fill (50-62m) so the city has depth layers (vision
    // critic: 'few buildings at intermediate and far distances').
    const rows = [
      { seed: 21000, base: 16, range: 10 },
      { seed: 22000, base: 26, range: 12 },
      { seed: 23000, base: 50, range: 12, low: true },
    ];
    for (const row of rows) {
      const rand = rnd(row.seed);
      const count = 12 + Math.floor(rand() * 5); // 12-16 per row
      for (let i = 0; i < count; i++) {
        const t = (((i / count + (rand() - 0.5) * (6 / len)) % 1) + 1) % 1; // ±3m along path
        path.getPointAt(t, probe);
        dir.copy(probe).sub(cent).setY(0);
        if (dir.lengthSq() < 1) continue;
        dir.normalize();
        const off = row.base + rand() * row.range; // 65-90m out
        const x = probe.x + dir.x * off;
        const z = probe.z + dir.z * off;
        if (this._onTrack(x, z, 6)) continue; // never on the road
        const h = row.low ? 8 + rand() * 8 : 12 + rand() * 18; // midground lower
        const gy = this._gy(x, z);
        dummy.position.set(x, gy + h / 2, z);
        dummy.scale.set(1, h / 12, 1);
        dummy.rotation.set(0, rand() * 0.25, 0);
        dummy.updateMatrix();
        towers.setMatrixAt(idx, dummy.matrix);
        towers.setColorAt(idx, new THREE.Color(windowColors[(rand() * 3) | 0]));
        idx++;
      }
    }
    if (idx > 0) {
      towers.count = idx;
      towers.instanceMatrix.needsUpdate = true;
      if (towers.instanceColor) towers.instanceColor.needsUpdate = true;
      towers.castShadow = true;
      scene.add(towers);
    }

    // --- neon street signs (vision critic: 'street-level detail' — small
    // glowing billboards on poles along the sidewalks, every ~60m) ---
    const poleMat = toonMaterial(0x3a4152, {});
    const signMats = [
      new THREE.MeshBasicMaterial({ color: 0xff2ec4 }),
      new THREE.MeshBasicMaterial({ color: 0x2ec4ff }),
      new THREE.MeshBasicMaterial({ color: 0xffe23c }),
    ];
    const sRand = rnd(9917);
    const signProbe = new THREE.Vector3();
    const signTan = new THREE.Vector3();
    const signNrm = new THREE.Vector3();
    for (let i = 0; i < 24; i++) {
      const t = (i + 0.5) / 24;
      path.getPointAt(t, signProbe);
      path.getTangentAt(t, signTan);
      signNrm.set(-signTan.z, 0, signTan.x).normalize();
      const side = sRand() < 0.5 ? -1 : 1;
      const sx = signProbe.x + signNrm.x * side * (5.6 + sRand() * 2);
      const sz = signProbe.z + signNrm.z * side * (5.6 + sRand() * 2);
      if (this._onTrack(sx, sz, 6)) continue;
      const sy = this._gy(sx, sz);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.1, 0.14), poleMat);
      pole.position.set(sx, sy + 1.55, sz);
      pole.castShadow = true;
      scene.add(pole);
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.8, 0.1),
        signMats[(sRand() * 3) | 0]
      );
      sign.position.set(sx, sy + 3.1, sz);
      scene.add(sign);
    }
  }

  /**
   * NEON CITY light poles: glowing pink/cyan neon strips instead of day
   * poles — thin 0.1x4x0.1 emissive boxes every ~40m along the straights,
   * both road sides at roadW/2 + 2.0 (6.5m from centerline; clears the road
   * by 2m — beyond the 6.0m minimum). Emissive intensity 2 makes the strips
   * read as lit neon tubes even under the dim moonlight.
   */
  buildNeonPoles(scene, track) {
    const path = track.path;
    const len = path.getLength();
    const halfW = CONFIG.track.roadWidth / 2;
    const stripGeo = new THREE.BoxGeometry(0.1, 4, 0.1);
    const pinkMat = toonMaterial(0x0e1220, { emissive: 0xff2ec4, emissiveIntensity: 2 });
    const cyanMat = toonMaterial(0x0e1220, { emissive: 0x2ec4ff, emissiveIntensity: 2 });
    const pink = new THREE.InstancedMesh(stripGeo, pinkMat, 24);
    const cyan = new THREE.InstancedMesh(stripGeo, cyanMat, 24);
    const dummy = new THREE.Object3D();
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const tan2 = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    let pinkIdx = 0;
    let cyanIdx = 0;
    const n = Math.max(10, Math.round(len / 40)); // ~40m intervals
    for (let i = 0; i < n; i++) {
      const t = i / n;
      path.getTangentAt(t, tan);
      path.getTangentAt(Math.min(0.999, t + 1 / n), tan2);
      const curv = 1 - Math.min(1, Math.max(-1, tan.dot(tan2)));
      if (curv > 0.0016) continue; // straights only (same gate as corner signs)
      path.getPointAt(t, p);
      nrm.set(-tan.z, 0, tan.x).normalize();
      for (const side of [-1, 1]) {
        const off = halfW + 2.0; // roadW/2 + 2.0
        const x = p.x + nrm.x * side * off;
        const z = p.z + nrm.z * side * off;
        dummy.position.set(x, p.y + 2, z); // 4m strip centered 2m up
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        const toPink = (i + (side === 1 ? 1 : 0)) % 2 === 0;
        const target = toPink ? pink : cyan;
        const idx = toPink ? pinkIdx++ : cyanIdx++;
        if (idx >= target.count) continue;
        target.setMatrixAt(idx, dummy.matrix);
      }
    }
    if (pinkIdx) {
      pink.count = pinkIdx;
      pink.instanceMatrix.needsUpdate = true;
      scene.add(pink);
    }
    if (cyanIdx) {
      cyan.count = cyanIdx;
      cyan.instanceMatrix.needsUpdate = true;
      scene.add(cyan);
    }
  }

  /**
   * Corner warning signs (pole + arrow panel) on the outside of the sharpest
   * corners — real race-track signage, part of the MK8 dressing density bar.
   */
  buildCornerSigns(scene, track) {
    if (!track || !track.path) return;
    const path = track.path;
    const halfW = CONFIG.track.roadWidth / 2;
    // Sign panel texture: white with a bold black directional arrow.
    const texKey = 'corner_sign';
    if (!this._signTex) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 96;
      const g = c.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 128, 96);
      g.strokeStyle = '#1b2a41';
      g.lineWidth = 8;
      g.strokeRect(4, 4, 120, 88);
      g.fillStyle = '#1b2a41';
      // bold arrow pointing right (curve direction)
      g.beginPath();
      g.moveTo(30, 18); g.lineTo(100, 48); g.lineTo(30, 78); g.lineTo(30, 58); g.lineTo(14, 58); g.lineTo(14, 38); g.lineTo(30, 38);
      g.closePath();
      g.fill();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      this._signTex = tex;
    }
    const signMat = new THREE.MeshBasicMaterial({ map: this._signTex, color: 0xffffff, side: THREE.DoubleSide });
    const poleMat = toonMaterial(0x8b7a5c, {});
    const tan = new THREE.Vector3();
    const tan2 = new THREE.Vector3();
    const p = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    let lastT = -1;
    let made = 0;
    for (let i = 0; i < 160; i++) {
      const t = i / 160;
      path.getTangentAt(t, tan);
      path.getTangentAt(Math.min(0.999, t + 1 / 160), tan2);
      const curv = 1 - Math.min(1, Math.max(-1, tan.dot(tan2)));
      if (curv > 0.0016 && t - lastT > 0.08) {
        lastT = t;
        path.getPointAt(t, p);
        nrm.set(-tan.z, 0, tan.x).normalize();
        // Two signs per corner: inside + outside edge (bigger + closer —
        // auditor: signs were too small to read at race distance).
        for (const side of [-1, 1]) {
          const px = p.x + nrm.x * (side * (halfW + 2.2));
          const pz = p.z + nrm.z * (side * (halfW + 2.2));
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 8), poleMat);
          pole.position.set(px, p.y + 1.1, pz);
          scene.add(pole);
          const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.05), signMat);
          panel.position.set(px, p.y + 2.5, pz);
          panel.lookAt(p.x, p.y + 2.5, p.z); // face the track
          panel.rotation.z = 0;
          scene.add(panel);
          made++;
        }
      }
    }
    // Track created panels for the cheering/bounce update? no — static props.
    this._signCount = made;
  }

  buildFlags(scene) {
    // Strings of small triangular flags along the start-straight grass
    // corridor — two lines now (the original short one + a second long line
    // extending the same decoration east). USER FIX: the old posts at
    // z=-58 sat ~1m from the centerline (ON the asphalt) — both strings are
    // moved to z=-65, 8m+ off the road (rail at halfW+1.1), and every post
    // is _onTrack-guarded. All geometry is grounded on terrainHeight.
    const flagMat = toonMaterial(0xffd166, {});
    const flagMat2 = toonMaterial(0x2ec4ff, {});
    const postGeo = new THREE.CylinderGeometry(0.06, 0.09, 9, 8);
    const postMat = toonMaterial(0x8b7a5c, {});
    const strings = [
      { x0: -11, x1: 23, z: -65, flags: 11 },
      { x0: 30, x1: 64, z: -65, flags: 11 },
    ];
    for (const s of strings) {
      const posts = [[s.x0, s.z], [s.x1, s.z]];
      let skipped = false;
      for (const [px, pz] of posts) {
        if (this._onTrack(px, pz, 1.5)) { skipped = true; break; }
      }
      if (skipped) continue; // never erect pennant posts on the road
      for (const [px, pz] of posts) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, this._gy(px, pz) + 4.5, pz);
        scene.add(post);
      }
      const span = s.x1 - s.x0;
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, span + 0.5, 6),
        toonMaterial(0x8b7a5c, {})
      );
      rope.position.set((s.x0 + s.x1) / 2, this._gy((s.x0 + s.x1) / 2, s.z) + 9, s.z);
      rope.rotation.x = Math.PI / 2;
      scene.add(rope);

      for (let i = 0; i < s.flags; i++) {
        const fx = s.x0 + (span / (s.flags - 1)) * i;
        const flag = new THREE.Mesh(
          new THREE.ConeGeometry(0.46, 0.95, 3),
          i % 2 === 0 ? flagMat : flagMat2
        );
        flag.position.set(fx, this._gy(fx, s.z) + 9.3, s.z);
        flag.userData.baseRot = 0;
        scene.add(flag);
        this.flagMeshes.push(flag);
      }
    }
  }

  update(dt, t) {
    // Clouds drift along X, wrapping around a radius.
    for (const c of this.clouds) {
      const r = c.userData.radius;
      c.position.x = c.userData.baseX + Math.sin(t * c.userData.speed * 0.1) * r;
      c.position.z += Math.cos(t * c.userData.speed * 0.07) * dt * 1.2;
    }
    // Hot-air balloons bob gently.
    for (const b of this.balloons || []) {
      b.position.y = b.userData.baseY + Math.sin(t * b.userData.speed + b.userData.phase) * 1.6;
      b.rotation.y += dt * 0.02;
    }
    // Windmill blades turn lazily in the breeze.
    for (const r of this.windmillRotors || []) {
      r.rotation.z += dt * 1.5;
    }
    // Water shimmer: bob + opacity pulse + hue-hold brightness pulse and a
    // glow pulse on the emissive, so the surface reads as LIVE water (the
    // old code only moved the plane — the cyan stayed static and flat).
    for (const w of this.waterMeshes) {
      const ph = w.userData.phase || 0;
      const bob = Math.sin(t * 1.4 + ph);
      w.position.y = w.userData.baseY + bob * 0.08;
      w.material.opacity = 0.78 + Math.sin(t * 1.1 + ph) * 0.06;
      const shim = 0.5 + 0.5 * Math.sin(t * 1.7 + ph * 2);
      if (w.userData.baseColor !== undefined && w.material.color) {
        w.material.color.setHex(w.userData.baseColor);
        w.material.color.offsetHSL(0, 0, (shim - 0.5) * 0.06);
      }
      if (w.material.emissive) w.material.emissiveIntensity = 0.3 + shim * 0.35;
    }
    // Flags wave
    for (let i = 0; i < this.flagMeshes.length; i++) {
      const f = this.flagMeshes[i];
      f.rotation.z = Math.sin(t * 5 + i * 0.7) * 0.28;
    }
    // Crowd cheer bounce (subtle Y wave across the grandstands).
    // NOTE: never rebuild the instance matrix from position/quaternion here —
    // the dummy's position is (0,0,0) so recomposing would zero every figure's
    // X/Z and rotation (all spectators teleported to world origin). Adjust the
    // Y element directly instead.
    for (const spec of this.crowdMeshes || []) {
      const base = spec.userData.baseY;
      if (!base) continue;
      const dummy = (spec.userData._dummy = spec.userData._dummy || new THREE.Object3D());
      for (let i = 0; i < spec.count; i++) {
        spec.getMatrixAt(i, dummy.matrix);
        dummy.matrix.elements[13] = base[i] + Math.sin(t * 3.2 + i * 0.9) * 0.18;
        spec.setMatrixAt(i, dummy.matrix);
      }
      spec.instanceMatrix.needsUpdate = true;
    }
  }
}
