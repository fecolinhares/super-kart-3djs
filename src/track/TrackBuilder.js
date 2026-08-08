/**
 * Super Kart 3D.js — track builder.
 * Builds a closed cartoon race loop: CatmullRomCurve3 path with elevation,
 * a road ribbon (BufferGeometry) with asphalt texture, red/white curb
 * strips, lane dashes, start/finish gantry and an undulating grass terrain.
 *
 * Exports (contract):
 *   buildTrack(scene) → { group, path, waypoints, startLine, length }
 *   getRoadWidthAt(t) → number
 *   TRACK_PATH        → Vector3[] closed loop
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { toonMaterial, cartoonOutline, roadTexture, grassTexture, checkerTexture, bannerCheckerTexture } from '../render/Materials.js';

// Control points forming the closed loop (X, Y=elevation, Z).
const CONTROL_POINTS = [
  [-62, 0.0, 0],
  [-48, 0.6, -38],
  [-18, 1.6, -56],
  [22, 2.2, -58],
  [56, 1.0, -38],
  [66, 0.4, -6],
  [58, 1.4, 28],
  [30, 3.0, 52],
  [-8, 2.6, 60],
  [-42, 1.2, 44],
  [-64, 0.3, 20],
];

export const TRACK_PATH = CONTROL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));

export function getRoadWidthAt() {
  return CONFIG.track.roadWidth;
}

// Deterministic smooth pseudo-noise for terrain (no external libs).
function smoothH(x, z) {
  return (
    Math.sin(x * 0.08) * Math.cos(z * 0.1) * 0.18 +
    Math.sin(x * 0.31 + 1.7) * Math.cos(z * 0.23) * 0.09 +
    Math.sin(x * 0.045 + z * 0.06) * 0.15
  );
}

function buildRoadRibbon(path, length, opts = {}) {
  const roadW = opts.width || getRoadWidthAt();
  const segments = opts.segments || 520;
  const yOff = opts.yOffset ?? 0.18;
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = [];

  const tan = new THREE.Vector3();
  const p = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const repeatU = opts.repeatU ?? Math.max(20, length * 0.06);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    path.getPointAt(t, p);
    path.getTangentAt(t, tan);
    nrm.set(-tan.z, 0, tan.x).normalize();
    const half = roadW / 2;
    const base = i * 2;
    positions[base * 3 + 0] = p.x + nrm.x * half;
    positions[base * 3 + 1] = p.y + yOff;
    positions[base * 3 + 2] = p.z + nrm.z * half;
    positions[(base + 1) * 3 + 0] = p.x - nrm.x * half;
    positions[(base + 1) * 3 + 1] = p.y + yOff;
    positions[(base + 1) * 3 + 2] = p.z - nrm.z * half;
    uvs[base * 2 + 0] = t * repeatU;
    uvs[base * 2 + 1] = 1;
    uvs[(base + 1) * 2 + 0] = t * repeatU;
    uvs[(base + 1) * 2 + 1] = 0;
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = i * 2 + 2;
    const d = i * 2 + 3;
    // Winding with normal pointing UP (a,c,b / b,c,d) so the road faces
    // the camera — the naive (a,b,c) order produced down-facing normals
    // and the whole ribbon was back-face culled (invisible road!).
    indices.push(a, c, b, b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = toonMaterial(0xffffff, {});
  if (opts.color) mat.color.setHex(opts.color);
  if (opts.texture) {
    const tex = opts.texture().clone();
    tex.needsUpdate = true;
    tex.repeat.set(opts.repeatU ?? repeatU, opts.repeatV ?? 2);
    mat.map = tex;
    mat.color.set(0xffffff);
  }

  return new THREE.Mesh(geo, mat);
}

function buildTerrain() {
  const size = 460;
  const seg = 72;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, smoothH(x, z) * 0.5 - 0.25);
  }
  geo.computeVertexNormals();
  const mat = toonMaterial(0xffffff, {});
  mat.map = grassTexture();
  mat.color.set(0xffffff);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function buildCurbs(path, length, side) {
  const roadW = getRoadWidthAt();
  const count = Math.floor(length / 3.1);
  // Low, long curb blocks (kerb look) — not chunky cubes.
  const geo = new THREE.BoxGeometry(1.5, 0.14, 0.42);
  const mat = toonMaterial(0xffffff, {});
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = true;

  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const t = i / count;
    path.getPointAt(t, p);
    path.getTangentAt(t, tan);
    nrm.set(-tan.z, 0, tan.x).normalize();
    dummy.position.set(
      p.x + nrm.x * side * (roadW / 2 + 0.3),
      p.y + 0.18 - 0.07, // top flush with the road surface
      p.z + nrm.z * side * (roadW / 2 + 0.3)
    );
    dummy.lookAt(
      p.x + tan.x + nrm.x * side * (roadW / 2 + 0.3),
      p.y,
      p.z + tan.z + nrm.z * side * (roadW / 2 + 0.3)
    );
    dummy.rotateX(-Math.PI / 2);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    col.setHex(i % 2 === 0 ? 0xff5a5f : 0xffffff);
    mesh.setColorAt(i, col);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function buildLaneDashes(path, length) {
  const count = Math.floor(length / 3.6);
  const geo = new THREE.BoxGeometry(0.16, 0.04, 1.6);
  const mat = toonMaterial(0xffd166, {});
  const mesh = new THREE.InstancedMesh(geo, mat, count);

  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const t = i / count;
    path.getPointAt(t, p);
    path.getTangentAt(t, tan);
    dummy.position.set(p.x, p.y + 0.06, p.z);
    dummy.lookAt(p.x + tan.x, p.y, p.z + tan.z);
    // NOTE: no rotateX here! lookAt already aligns the long axis (Z) with
    // the path; rotateX(-PI/2) was standing the dashes UP as yellow poles.
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function buildGantry(startLine) {
  const group = new THREE.Group();
  const roadW = getRoadWidthAt();
  const nrm = new THREE.Vector3(-startLine.direction.z, 0, startLine.direction.x).normalize();

  const pillarGeo = new THREE.CylinderGeometry(0.28, 0.36, 7.2, 10);
  const pillarMat = toonMaterial(0xff5a5f, {});
  const beamGeo = new THREE.BoxGeometry(roadW + 5, 0.5, 0.7);
  const beamMat = toonMaterial(0x2ec4ff, {});

  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position
      .copy(startLine.position)
      .addScaledVector(nrm, side * (roadW / 2 + 1.6));
    pillar.position.y = 3.3;
    pillar.castShadow = true;
    group.add(pillar);
    cartoonOutline(pillar, 0x1b2a41, 0.03);
  }

  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.copy(startLine.position);
  beam.position.y = 6.8;
  beam.lookAt(startLine.position.clone().add(startLine.direction));
  group.add(beam);
  cartoonOutline(beam, 0x1b2a41, 0.02);

  // Checkered banner hanging from the beam, with a bold FINISH word.
  // lookAt aligns +Z with the travel direction (plane faces the racers).
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(roadW + 2, 2.1),
    new THREE.MeshToonMaterial({ color: 0xffffff })
  );
  banner.material.map = bannerCheckerTexture();
  banner.position.copy(startLine.position);
  banner.position.y = 6.2; // hangs just under the beam — no floating gap
  banner.lookAt(startLine.position.clone().add(startLine.direction));
  group.add(banner);

  // Start lights (3 lamps on the beam) — raceManager/main animate them:
  // red lamps light up during countdown, all green on GO.
  const startLights = [];
  const lampGeo = new THREE.SphereGeometry(0.22, 12, 10);
  const lampOff = toonMaterial(0x3a4252, { emissive: 0x000000, emissiveIntensity: 0 });
  const lampMat = lampOff;
  for (let i = -1; i <= 1; i++) {
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.copy(startLine.position).addScaledVector(nrm, i * 1.1);
    lamp.position.y = 7.7;
    group.add(lamp);
    startLights.push(lamp);
  }

  // Banner flags
  for (const side of [-1, 1]) {
    const flag = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.0, 4),
      toonMaterial(0xffd166, {})
    );
    flag.position
      .copy(startLine.position)
      .addScaledVector(nrm, side * (roadW / 2 + 2.3));
    flag.position.y = 7.2;
    group.add(flag);
  }

  return { group, startLights };
}

export function buildTrack(scene) {
  const group = new THREE.Group();

  // Closed curve with elevation.
  const pts = TRACK_PATH.map((v) => v.clone());
  const path = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  const length = path.getLength();

  const startT = 0;
  const startPos = path.getPointAt(startT);
  const startDir = path.getTangentAt(startT).normalize();

  const terrain = buildTerrain();
  group.add(terrain);

  // Dirt shoulders either side of the asphalt (softens the road→grass edge).
  const shoulder = buildRoadRibbon(path, length, {
    width: getRoadWidthAt() + 3.4,
    yOffset: 0.14,
    color: 0xd9b98c,
    repeatU: length * 0.04,
    repeatV: 1,
  });
  shoulder.receiveShadow = true;
  group.add(shoulder);

  const ribbon = buildRoadRibbon(path, length, { texture: roadTexture });
  ribbon.receiveShadow = true;
  group.add(ribbon);

  const curbL = buildCurbs(path, length, -1);
  const curbR = buildCurbs(path, length, 1);
  group.add(curbL, curbR);

  const dashes = buildLaneDashes(path, length);
  group.add(dashes);

  const startLine = { position: startPos.clone(), direction: startDir.clone(), width: getRoadWidthAt() };
  const gantry = buildGantry(startLine);
  group.add(gantry.group);

  // Finish checkered strip on the road itself at startT.
  // Flat box: +Z axis (roadW) spans across the road via lookAt(nrm).
  // Basic material = unlit decal, always readable on the asphalt.
  const checker = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.06, getRoadWidthAt() - 1.2),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  checker.material.map = checkerTexture();
  const nrm = new THREE.Vector3(-startDir.z, 0, startDir.x).normalize();
  checker.position.copy(startPos).addScaledVector(nrm, 1.2);
  checker.position.y = startPos.y + 0.21; // above asphalt (p.y + 0.18) — RELATIVE to track elevation!
  checker.lookAt(startPos.clone().add(nrm));
  group.add(checker);

  scene.add(group);

  const waypoints = [];
  const WAY_COUNT = 90;
  for (let i = 0; i < WAY_COUNT; i++) {
    waypoints.push(path.getPointAt(i / WAY_COUNT).clone());
  }

  return { group, path, waypoints, startLine, length, startLights: gantry.startLights };
}
