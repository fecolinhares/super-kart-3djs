/**
 * Super Kart 3D.js — environment builder.
 * Sky dome, sun + hemisphere light, fog, animated clouds, layered
 * mountains, palm trees, water and crowd props. Cartoon saturated style
 * per DESIGN.md. update(dt, t) animates clouds, water and flags.
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

  /** Random point in an annulus that avoids the track (8 tries). */
  _randomOutside(minR, maxR) {
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = minR + Math.random() * (maxR - minR);
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      if (!this._onTrack(x, z, 8)) return { x, z };
    }
    const ang = Math.random() * Math.PI * 2;
    return { x: Math.cos(ang) * 170, z: Math.sin(ang) * 170 };
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

    // --- lights ----------------------------------------------------------
    const hemi = new THREE.HemisphereLight(0xbcdcff, 0x7bca7f, 0.8);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff2cc, 2.4);
    sun.position.set(55, 85, 30);
    sun.castShadow = true;
    if (CONFIG.render.shadows) {
      sun.shadow.mapSize.set(CONFIG.render.shadowMapSize, CONFIG.render.shadowMapSize);
      sun.shadow.camera.left = -70;
      sun.shadow.camera.right = 70;
      sun.shadow.camera.top = 70;
      sun.shadow.camera.bottom = -70;
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
    this.buildCrowd(scene);
    this.buildGrandstand(scene);
    this.buildFlags(scene);
    this.buildBalloons(scene);
  }

  buildMountains(scene) {
    const layers = [
      { radius: 300, count: 14, color: 0x9a8cff, height: [26, 52], y: 8 },
      { radius: 215, count: 12, color: 0x7a6cf0, height: [18, 38], y: 6 },
    ];
    for (const layer of layers) {
      const group = new THREE.Group();
      for (let i = 0; i < layer.count; i++) {
        const a = (i / layer.count) * Math.PI * 2 + (layer.radius === 300 ? 0.6 : 0.2);
        const r = layer.radius * (0.92 + Math.random() * 0.18);
        const h = layer.height[0] + Math.random() * (layer.height[1] - layer.height[0]);
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(h * (0.34 + Math.random() * 0.18), h, 5 + Math.floor(Math.random() * 3)),
          toonMaterial(layer.color, {})
        );
        cone.position.set(Math.cos(a) * r, layer.y + h / 2 - 6, Math.sin(a) * r);
        cone.rotation.y = Math.random() * Math.PI;
        group.add(cone);
      }
      scene.add(group);
    }
  }

  buildClouds(scene) {
    const mat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      gradientMap: null,
    });
    // Use a soft standard material so clouds look puffy, not cel-shaded.
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      flatShading: true,
      fog: true,
    });
    const group = new THREE.Group();
    for (let i = 0; i < 11; i++) {
      const c = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffs; p++) {
        const s = 5 + Math.random() * 7;
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(s, 8, 6),
          cloudMat
        );
        puff.position.set(p * s * 0.7 - puffs * s * 0.35, Math.random() * 1.6, (Math.random() - 0.5) * 4);
        puff.scale.y = 0.55;
        c.add(puff);
      }
      c.position.set(
        (Math.random() - 0.5) * 380,
        46 + Math.random() * 26,
        (Math.random() - 0.5) * 380
      );
      c.userData.speed = 0.6 + Math.random() * 1.4;
      c.userData.baseX = c.position.x;
      c.userData.radius = 60 + Math.random() * 90;
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
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 4.2, 7), trunkMat);
      trunk.position.set(x, 2.1, z);
      trunk.rotation.z = (Math.random() - 0.5) * 0.22;
      trunk.rotation.x = (Math.random() - 0.5) * 0.22;
      trunk.castShadow = true;
      scene.add(trunk);

      const top = new THREE.Object3D();
      top.position.set(trunk.position.x + Math.sin(trunk.rotation.z) * 2, 4.2, z + Math.sin(trunk.rotation.x) * 2);
      scene.add(top);

      // Fan of fronds: flattened cones radiating from the crown, tilted down.
      const leafCount = 9;
      for (let i = 0; i < leafCount; i++) {
        const a = (i / leafCount) * Math.PI * 2 + Math.random() * 0.3;
        const leaf = new THREE.Mesh(
          new THREE.ConeGeometry(0.17, 2.4, 6),
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
        new THREE.SphereGeometry(0.22, 8, 6),
        toonMaterial(0x8a5a33, {})
      );
      nut.position.set(0, 0.35, 0);
      top.add(nut);
    }
  }

  buildForest(scene) {
    // Round cartoon trees (trunk + sphere canopy) in clusters — cheap density.
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.34, 3.0, 7);
    const trunkMat = toonMaterial(0x8a5a33, {});
    const canopyGeo = new THREE.SphereGeometry(1.5, 9, 7);
    const canopyMat = toonMaterial(0x2fa84f, {});
    const canopyMatDark = toonMaterial(0x279142, {});

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, 44);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, 44);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 44; i++) {
      const { x, z } = this._randomOutside(34, 184);
      const h = smoothH(x, z) * 0.5 - 0.25;
      const s = 0.8 + Math.random() * 0.9;
      // trunk sits ON the ground, canopy overlaps the trunk top (connected)
      dummy.position.set(x, h + 1.5 * s, z);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, h + 2.6 * s, z);
      dummy.scale.set(1, 0.9 + Math.random() * 0.2, 1);
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
    }
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    scene.add(trunks);
    scene.add(canopies);

    // Second, smaller darker canopy layer for depth variation.
    const canopies2 = new THREE.InstancedMesh(canopyGeo, canopyMatDark, 30);
    for (let i = 0; i < 30; i++) {
      const { x, z } = this._randomOutside(60, 200);
      const h = smoothH(x, z) * 0.5 - 0.25;
      dummy.position.set(x, h + 2.4, z);
      dummy.scale.set(1.4 + Math.random() * 0.8, 1.2, 1.4 + Math.random() * 0.8);
      dummy.updateMatrix();
      canopies2.setMatrixAt(i, dummy.matrix);
    }
    canopies2.instanceMatrix.needsUpdate = true;
    scene.add(canopies2);
  }

  buildProps(scene) {
    // Rocks: instanced dodecahedrons scattered on the grass.
    const rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
    const rockMat = toonMaterial(0xa9a9b8, {});
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 26);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 26; i++) {
      const { x, z } = this._randomOutside(30, 190);
      dummy.position.set(x, smoothH(x, z) * 0.5 - 0.25 + 0.35, z);
      dummy.scale.setScalar(0.5 + Math.random() * 1.4);
      dummy.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
    scene.add(rocks);

    // Bushes: two overlapping spheres, darker green.
    const bushGeo = new THREE.SphereGeometry(0.9, 8, 6);
    const bushMat = toonMaterial(0x2f8f43, {});
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 34);
    for (let i = 0; i < 34; i++) {
      const { x, z } = this._randomOutside(25, 165);
      dummy.position.set(x, smoothH(x, z) * 0.5 - 0.25 + 0.5, z);
      dummy.scale.set(1, 0.75 + Math.random() * 0.4, 1);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      bushes.setMatrixAt(i, dummy.matrix);
    }
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
          new THREE.CylinderGeometry(0.09, 0.09, 1.5, 6),
          toonMaterial(0x8b7a5c, {})
        );
        leg.position.set(s.x + side * 2.0, smoothH(s.x, s.z) * 0.5 - 0.25 + 0.75, s.z);
        scene.add(leg);
      }
    }
  }

  buildBalloons(scene) {
    // Hot-air balloons drifting high above — instant cartoon charm.
    this.balloons = [];
    const colors = [0xff5a5f, 0xffd166, 0x6cff8f, 0xc86bff];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const bal = new THREE.Mesh(
        new THREE.SphereGeometry(2.6, 14, 10),
        toonMaterial(colors[i % colors.length], {})
      );
      bal.scale.set(1, 1.15, 1);
      bal.position.y = 2.6;
      g.add(bal);
      const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.9, 1.1, 8),
        toonMaterial(0xb07a4f, {})
      );
      basket.position.y = 0;
      g.add(basket);
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4),
        toonMaterial(0x8b7a5c, {})
      );
      rope.position.y = 1.4;
      g.add(rope);
      g.position.set(
        (Math.random() - 0.5) * 340,
        42 + Math.random() * 30,
        (Math.random() - 0.5) * 340
      );
      g.userData = { baseY: g.position.y, speed: 0.05 + Math.random() * 0.06, phase: Math.random() * 6.28 };
      scene.add(g);
      this.balloons.push(g);
    }
  }

  buildCrowd(scene) {
    // Spectator grandstand clusters: instanced colorful blocks.
    const areas = [
      { x: -56, z: 34, n: 26 },
      { x: 40, z: -60, n: 24 },
      { x: 44, z: 52, n: 22 },
    ];
    const colors = [0xff5a5f, 0xffd166, 0x6cff8f, 0x2ec4ff, 0xc86bff, 0xff9f45, 0xffffff];
    const geo = new THREE.BoxGeometry(0.7, 1.1, 0.7);
    const mat = toonMaterial(0xffffff, {});

    for (const area of areas) {
      const im = new THREE.InstancedMesh(geo, mat, area.n);
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      for (let i = 0; i < area.n; i++) {
        // Retry placement until the spectator block is off the track.
        let px = 0;
        let pz = 0;
        for (let attempt = 0; attempt < 5; attempt++) {
          px = area.x + (Math.random() - 0.5) * 14;
          pz = area.z + (Math.random() - 0.5) * 10;
          if (!this._onTrack(px, pz, 5)) break;
        }
        dummy.position.set(px, 0.55 + Math.random() * 0.3, pz);
        dummy.scale.set(1, 0.9 + Math.random() * 0.5, 1);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        col.setHex(colors[Math.floor(Math.random() * colors.length)]);
        im.setColorAt(i, col);
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      scene.add(im);
    }
  }

  buildGrandstand(scene) {
    // Big grandstand with striped awning near a curve — crowd anchor.
    const grandstandSpots = [
      { x: -8, z: -66, ry: -0.3 },
      { x: 50, z: 44, ry: 2.2 },
    ];
    const crowdColors = [0xff5a5f, 0xffd166, 0x6cff8f, 0x2ec4ff, 0xc86bff, 0xff9f45, 0xffffff];
    for (const gs of grandstandSpots) {
      if (this._onTrack(gs.x, gs.z, 10)) continue; // grandstand off the road
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
      // spectators on each tier (instanced colorful boxes)
      const spec = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), toonMaterial(0xffffff, {}), 36);
      const col = new THREE.Color();
      let sIdx = 0;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 12; j++) {
          dummy.position.set(-8.2 + j * 1.4, 1.6 + i * 1.1, -i * 2.2 + 0.3);
          dummy.scale.set(1, 0.9 + Math.random() * 0.4, 1);
          dummy.updateMatrix();
          spec.setMatrixAt(sIdx, dummy.matrix);
          col.setHex(crowdColors[Math.floor(Math.random() * crowdColors.length)]);
          spec.setColorAt(sIdx, col);
          sIdx++;
        }
      }
      spec.instanceMatrix.needsUpdate = true;
      if (spec.instanceColor) spec.instanceColor.needsUpdate = true;
      grp.add(spec);
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
      const postGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.4, 6);
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
      { x: -30, z: -52, ry: 0.5 },
      { x: 30, z: -60, ry: -0.4 },
      { x: 62, z: -20, ry: 1.5 },
      { x: 46, z: 56, ry: 2.0 },
      { x: -40, z: 52, ry: -2.0 },
    ];
    const postMat = toonMaterial(0x8b7a5c, {});
    for (const m of marks) {
      if (this._onTrack(m.x, m.z, 8)) continue; // distance marks off the road
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.6, 6), postMat);
      post.position.set(m.x, smoothH(m.x, m.z) * 0.5 - 0.25 + 0.8, m.z);
      post.rotation.y = m.ry;
      scene.add(post);
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.5, 0.08),
        toonMaterial(0xffd166, {})
      );
      board.position.set(m.x, smoothH(m.x, m.z) * 0.5 - 0.25 + 1.35, m.z);
      board.rotation.y = m.ry;
      scene.add(board);
    }
  }

  buildFlags(scene) {
    // String of small triangular flags over a section of the road.
    const flagMat = toonMaterial(0xffd166, {});
    const flagMat2 = toonMaterial(0x2ec4ff, {});
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 34, 5),
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
  }
}
