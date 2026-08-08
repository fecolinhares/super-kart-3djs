/**
 * Super Kart 3D.js — environment builder.
 * Sky dome, sun + hemisphere light, fog, animated clouds, layered
 * mountains, palm trees, water and crowd props. Cartoon saturated style
 * per DESIGN.md. update(dt, t) animates clouds, water and flags.
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { toonMaterial, cartoonOutline, skyTexture } from '../render/Materials.js';

export class Environment {
  constructor() {
    this.clouds = [];
    this.waterMeshes = [];
    this.flagMeshes = [];
    this.sun = null;
  }

  buildEnvironment(scene) {
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
    this.buildCrowd(scene);
    this.buildFlags(scene);
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
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 4.2, 7), trunkMat);
      trunk.position.set(x, 2.1, z);
      trunk.rotation.z = (Math.random() - 0.5) * 0.22;
      trunk.rotation.x = (Math.random() - 0.5) * 0.22;
      trunk.castShadow = true;
      scene.add(trunk);

      const top = new THREE.Object3D();
      top.position.set(trunk.position.x + Math.sin(trunk.rotation.z) * 2, 4.2, z + Math.sin(trunk.rotation.x) * 2);
      scene.add(top);

      const leafCount = 7;
      for (let i = 0; i < leafCount; i++) {
        const a = (i / leafCount) * Math.PI * 2;
        const leaf = new THREE.Mesh(
          new THREE.PlaneGeometry(3.4, 0.55),
          i % 2 === 0 ? leafMat : leafMatDark
        );
        leaf.position.set(Math.cos(a) * 1.4, 0.5, Math.sin(a) * 1.4);
        leaf.rotation.y = -a;
        leaf.rotation.z = -0.55;
        leaf.rotation.x = 0.2;
        leaf.translateX(1.2);
        leaf.castShadow = true;
        top.add(leaf);
      }
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
        dummy.position.set(
          area.x + (Math.random() - 0.5) * 14,
          0.55 + Math.random() * 0.3,
          area.z + (Math.random() - 0.5) * 10
        );
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
