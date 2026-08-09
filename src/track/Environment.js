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

// Mirrors TrackBuilder.smoothH so props sit at the same terrain height.
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
// inside the lakes.
const WATER_SPOTS = [
  { x: 120, z: 130, r: 34 },
  { x: -110, z: 110, r: 29 },
];
function inWater(x, z, margin = 4) {
  for (const w of WATER_SPOTS) {
    const dx = x - w.x;
    const dz = z - w.z;
    if (dx * dx + dz * dz < (w.r + margin) * (w.r + margin)) return true;
  }
  return false;
}

export class Environment {
  constructor() {
    this.clouds = [];
    this.balloons = [];
    this.waterMeshes = [];
    this.flagMeshes = [];
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
    if (track && track.path) {
      // Cache centerline samples for _onTrack checks.
      this._trackSamples = [];
      for (let i = 0; i < 60; i++) {
        this._trackSamples.push(track.path.getPointAt(i / 60));
      }
    }
    // --- fog & background ------------------------------------------------
    scene.fog = new THREE.Fog(0xbfe6ff, 70, 430);

    // Sky dome (fog-free basic material with gradient texture)
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(520, 24, 12),
      new THREE.MeshBasicMaterial({
        map: skyTexture(),
        side: THREE.BackSide,
        fog: false,
      })
    );
    sky.position.y = -10;
    scene.add(sky);

    // --- lights (AAA 3-point rig: warm key + cool fill + sky/ground hemi) --
    const hemi = new THREE.HemisphereLight(0xbcdcff, 0x7bca7f, 0.8);
    scene.add(hemi);

    // KEY: warm directional from the sun direction — primary illumination.
    // Pure light (no shadow casting); the sun below carries the shadows so
    // toon faces read fully lit from the sunny side.
    const key = new THREE.DirectionalLight(0xfff2d0, 1.1);
    key.position.set(70, 90, 40);
    scene.add(key);
    scene.add(key.target);

    // FILL: cool sky-blue bounce from the opposite side — lifts the shadow
    // sides so unlit faces read as shaded blue, never black.
    const fill = new THREE.DirectionalLight(0x9fc8ff, 0.35);
    fill.position.set(-70, 60, -40);
    scene.add(fill);
    scene.add(fill.target);

    // Shadow-casting sun — kept as the key's shadow companion: same warm
    // tint and sun direction so shadowed areas match the key light.
    const sun = new THREE.DirectionalLight(0xfff2d0, 1.0);
    sun.position.set(70, 90, 40);
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

    // --- mountains (two haze layers) -------------------------------------
    this.buildMountains(scene);

    // --- clouds ----------------------------------------------------------
    this.buildClouds(scene);

    // --- water -----------------------------------------------------------
    this.buildWater(scene);

    // --- palms & props ---------------------------------------------------
    this.buildPalms(scene);
    this.buildForest(scene);
    this.buildProps(scene);
    this.buildLightPoles(scene, track);
    this.buildDistanceMarks(scene); // 100m/200m posts (was dead code — never called)
    this.buildCornerSigns(scene, track);
    this.buildGrandstand(scene);
    this.buildRoadsideCrowd(scene, track);
    this.buildFlags(scene);
    this.buildBalloons(scene);
  }

  buildMountains(scene) {
    // Enhanced mountains with 2-layer design (rock base + snow cap) 
    // plus soft haze discs at base for atmospheric depth
    const layers = [
      { radius: 300, count: 14, color: 0x8a7fcc, baseH: 28, hVar: 12, y: 10, seed: 11 }, // Distant purple mountains
      { radius: 220, count: 12, color: 0x6a5fcc, baseH: 22, hVar: 10, y: 8, seed: 27 },  // Mid-range blue mountains
      { radius: 150, count: 10, color: 0x4a4fcc, baseH: 18, hVar: 8, y: 6, seed: 43 }   // Foreground mountains
    ];
    const snowMat = toonMaterial(0xf0f8ff, {}); // Slightly bluish white for snow
    const hazeMat = new THREE.MeshStandardMaterial({
      color: 0xb0c4de,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    
    for (const layer of layers) {
      const group = new THREE.Group();
      for (let i = 0; i < layer.count; i++) {
        const rand = rnd(layer.seed * 1000 + i);
        const a = (i / layer.count) * Math.PI * 2 + (layer.radius === 300 ? 0.6 : 0.2);
        const r = layer.radius * (0.88 + rand() * 0.24); // More variation
        const h = layer.baseH + rand() * layer.hVar;
        const baseR = h * (0.3 + rand() * 0.2); // Wider base for more natural look
        const cx = Math.cos(a) * r;
        const cz = Math.sin(a) * r;
        const yBase = layer.y + h / 2 - 6;
        
        // Rock base - increased segments for smoothness
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(baseR, h, 32), // Increased from 24 to 32
          toonMaterial(layer.color, {})
        );
        cone.position.set(cx, yBase, cz);
        cone.rotation.y = rand() * Math.PI;
        group.add(cone);
        
        // Snow cap - draped over rock base
        const capH = h * (0.22 + rand() * 0.1); // Variable snow cap height
        const capR = baseR * (capH / h) * 1.15; // More overhang
        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(capR, capH, 32), // Increased from 24 to 32
          snowMat
        );
        cap.position.set(cx, yBase + h - capH * 0.4, cz); // Sit on top of rock
        cap.rotation.y = rand() * Math.PI;
        group.add(cap);
        
        // Soft haze disc at base for atmospheric perspective
        const hazeRadius = baseR * (1.2 + rand() * 0.4);
        const haze = new THREE.Mesh(
          new THREE.CircleGeometry(hazeRadius, 16),
          hazeMat
        );
        haze.position.set(cx, yBase - 0.1, cz); // Just below ground
        haze.rotation.x = -Math.PI / 2; // Lie flat
        group.add(haze);
      }
      scene.add(group);
    }
  }

  buildClouds(scene) {
    // Use a soft standard material so clouds look puffy, not cel-shaded.
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      fog: true,
    });
    const group = new THREE.Group();
    // Organized sky lanes: clouds every ~34 m along a drift band, staggered
    // across three z-lanes — a planned parade, not a scatter.
    for (let i = 0; i < 12; i++) {
      const rand = rnd(500 + i);
      const c = new THREE.Group();
      const puffs = 4 + Math.floor(rand() * 2); // 4-5 puffs — dense billow
      for (let p = 0; p < puffs; p++) {
        const s = 5 + rand() * 5;
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(s, 14, 12), // smooth puffs (no flat facets)
          cloudMat
        );
        puff.position.set(p * s * 0.72 - puffs * s * 0.36, (rand() - 0.5) * 1.4, (rand() - 0.5) * 3);
        puff.scale.y = 0.55;
        c.add(puff);
      }
      c.position.set(
        -190 + i * 34 + (rand() - 0.5) * 8,
        44 + rand() * 22,
        (i % 3) * 46 - 46 + (rand() - 0.5) * 10
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
          opacity: 0.82,
          emissive: 0x1e9bd6,
          emissiveIntensity: 0.35,
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(x, -0.2 + Math.sin(a) * 0.1, z);
      water.userData = { baseY: water.position.y, phase: a };
      scene.add(water);
      this.waterMeshes.push(water);

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

    const spots = [
      [-70, 18], [-52, -50], [30, -66], [68, -30], [62, 24],
      [36, 62], [-14, 70], [-52, 50], [-40, -14], [0, -40],
      [24, -20], [-20, 20], [80, 8], [-80, -20], [55, 48],
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

    const clusterCount = 7;
    for (let c = 0; c < clusterCount; c++) {
      const rand = rnd(7000 + c);
      const ca = (c / clusterCount) * Math.PI * 2 + 0.4;
      const cr = 92 + rand() * 70; // 92-162 m out
      const cx = Math.cos(ca) * cr;
      const cz = Math.sin(ca) * cr;
      if (this._onTrack(cx, cz, 18) || inWater(cx, cz, 8)) continue;
      const per = 5 + Math.floor(rand() * 3); // 5-7 trees per clump
      for (let k = 0; k < per; k++) {
        const r2 = rnd(7000 + c * 10 + k);
        const a2 = ca + (k - per / 2) * 0.24 + (r2() - 0.5) * 0.3;
        const r3 = cr + (r2() - 0.5) * 12;
        const x = Math.cos(a2) * r3;
        const z = Math.sin(a2) * r3;
        if (inWater(x, z, 4)) continue;
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
      const h = smoothH(x, z) * 0.5 - 0.25;
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
      dummy.position.set(r.x, smoothH(r.x, r.z) * 0.5 - 0.25 + 0.33 * r.s, r.z);
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
      dummy.position.set(b.x, smoothH(b.x, b.z) * 0.5 - 0.25 + 0.55 * b.s, b.z);
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
      dummy.position.set(bx, smoothH(bx, bz) * 0.5 - 0.25 + 0.55, bz);
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
      board.position.set(s.x, smoothH(s.x, s.z) * 0.5 - 0.25 + 1.5, s.z);
      board.rotation.y = s.ry;
      board.castShadow = true;
      scene.add(board);
      // legs
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 1.5, 8),
          toonMaterial(0x8b7a5c, {})
        );
        leg.position.set(s.x + side * 2.0, smoothH(s.x, s.z) * 0.5 - 0.25 + 0.75, s.z);
        scene.add(leg);
      }
    }
  }

  buildBalloons(scene) {
    // Hot-air balloons drifting high above — instant cartoon charm.
    // Dense 16x14 envelope + 24-seg stripe ring, and an ORGANIZED skyline:
    // balloons fly a diagonal corridor at even spacing with a consistent
    // altitude step — a planned parade, not random dots in the sky.
    this.balloons = [];
    const colors = [0xff5a5f, 0xffd166, 0x6cff8f, 0xc86bff];
    for (let i = 0; i < 4; i++) {
      const rand = rnd(300 + i);
      const g = new THREE.Group();
      const bal = new THREE.Mesh(
        new THREE.SphereGeometry(2.6, 16, 14),
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
        -150 + i * 92 + (rand() - 0.5) * 14,
        44 + i * 8 + (rand() - 0.5) * 6,
        -110 + i * 60 + (rand() - 0.5) * 14
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
    for (const gs of grandstandSpots) {
      if (this._onTrack(gs.x, gs.z, 3)) continue; // grandstand off the road (tight margin)
      const grp = new THREE.Group();
      // steps (3 tiers)
      const stepMat = toonMaterial(0xdfe6ee, {});
      const tier = new THREE.InstancedMesh(new THREE.BoxGeometry(16, 0.8, 2.4), stepMat, 3);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 3; i++) {
        dummy.position.set(0, 1.0 + i * 1.1, -i * 2.2);
        dummy.updateMatrix();
        tier.setMatrixAt(i, dummy.matrix);
      }
      tier.instanceMatrix.needsUpdate = true;
      grp.add(tier);
      // spectators on each tier: body block (bright color) + white head ball
      const spec = new THREE.InstancedMesh(new THREE.BoxGeometry(1.05, 1.2, 1.0), toonMaterial(0xffffff, {}), 36);
      const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 12, 8), toonMaterial(0xf4f6f8, {}), 36);
      // Raised arms (cheering people, not blocks with heads).
      const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.75, 8);
      const armsL = new THREE.InstancedMesh(armGeo, toonMaterial(0xffd9b3, {}), 36);
      const armsR = new THREE.InstancedMesh(armGeo, toonMaterial(0xffd9b3, {}), 36);
      const col = new THREE.Color();
      let sIdx = 0;
      const baseY = new Array(36);
      const headDummy = new THREE.Object3D();
      const armDummy = new THREE.Object3D();
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 12; j++) {
          dummy.position.set(-8.2 + j * 1.5, 1.6 + i * 1.15, -i * 2.2 + 0.3);
          dummy.scale.set(1, 0.9 + Math.random() * 0.4, 1);
          baseY[sIdx] = dummy.position.y;
          dummy.updateMatrix();
          spec.setMatrixAt(sIdx, dummy.matrix);
          col.setHex(crowdColors[Math.floor(Math.random() * crowdColors.length)]);
          spec.setColorAt(sIdx, col);
          headDummy.position.set(dummy.position.x, dummy.position.y + 0.95, dummy.position.z);
          headDummy.scale.set(1, 1, 1);
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
      // striped awning
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
      // support posts
      const postGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.4, 8);
      const postMat = toonMaterial(0x8b7a5c, {});
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(side * 8, 2.2, -3.4);
        grp.add(post);
      }
      grp.position.set(gs.x, smoothH(gs.x, gs.z) * 0.5 - 0.25, gs.z);
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
      { t0: 0.945, t1: 0.055, n: 16 }, // start straight
      { t0: 0.10, t1: 0.15, n: 8 },    // exit of turn 1
      { t0: 0.19, t1: 0.25, n: 10 },   // turn 1
      { t0: 0.30, t1: 0.37, n: 8 },    // climb
      { t0: 0.45, t1: 0.56, n: 12 },   // back straight
      { t0: 0.62, t1: 0.68, n: 8 },    // descent
    ];
    const ROWS = [1.35, 2.9]; // two rows per side, tight to the road edge
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
            const t = (seg.t0 + (i / seg.n) * (seg.t1 - seg.t0)) % 1;
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
    // String of small triangular flags over a section of the road.
    const flagMat = toonMaterial(0xffd166, {});
    const flagMat2 = toonMaterial(0x2ec4ff, {});
    // Support poles at both ends — the rope must not float in mid-air
    // (auditor HIGH: pennant string had no posts, read as a disconnected
    // floating line).
    const postGeo = new THREE.CylinderGeometry(0.06, 0.09, 9, 8);
    const postMat = toonMaterial(0x8b7a5c, {});
    for (const px of [-11, 23]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, 4.5, -58);
      scene.add(post);
    }
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 34, 6),
      toonMaterial(0x8b7a5c, {})
    );
    rope.position.set(6, 9, -58);
    rope.rotation.x = Math.PI / 2;
    scene.add(rope);

    for (let i = 0; i < 11; i++) {
      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.85, 3),
        i % 2 === 0 ? flagMat : flagMat2
      );
      flag.position.set(6 - 17 + i * 3.4, 9.2, -58);
      flag.userData.baseRot = 0;
      scene.add(flag);
      this.flagMeshes.push(flag);
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
    // Water shimmer
    for (const w of this.waterMeshes) {
      w.position.y = w.userData.baseY + Math.sin(t * 1.4 + w.userData.phase) * 0.08;
      w.material.opacity = 0.78 + Math.sin(t * 1.1 + w.userData.phase) * 0.06;
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
