/**
 * Super Kart 3D.js — track builder.
 * Builds a closed cartoon race loop: CatmullRomCurve3 path with elevation,
 * a road ribbon (BufferGeometry) with asphalt texture, red/white curb
 * strips, continuous guard-rails along both edges, lane dashes, start/finish
 * gantry and an undulating grass terrain.
 *
 * Exports (contract):
 *   buildTrack(scene) → { group, path, waypoints, startLine, length }
 *   getRoadWidthAt(t) → number
 *   TRACK_PATH        → Vector3[] closed loop
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { toonMaterial, cartoonOutline, roadTexture, dirtTexture, grassTexture, checkerTexture, bannerCheckerTexture, turboPadTexture, arrowTexture, finishLineTexture } from '../render/Materials.js';

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
// Returns raw undulation in ~[-0.42, +0.42]. The corridor near the road
// keeps the historical *0.5 scale (±0.25m — bit-identical to the original
// build, so the road/shoulders/kerbs and kart physics are untouched);
// buildTerrain amplifies this with a distance falloff so the open field
// rolls into gentle hills while the racing surface stays flat.
function smoothH(x, z) {
  return (
    Math.sin(x * 0.08) * Math.cos(z * 0.1) * 0.18 +
    Math.sin(x * 0.31 + 1.7) * Math.cos(z * 0.23) * 0.09 +
    Math.sin(x * 0.045 + z * 0.06) * 0.15
  );
}

// Broad low-frequency landforms for the distance: ~80m wavelength, ±2.0m
// amplitude. Combined with smoothH's field amplification these become the
// rolling hills on the horizon. The corridor falloff in buildTerrain keeps
// them out of the racing surface entirely. (Amplitude raised 1.4→3.4 after
// the vision critic called 2.4m hills 'essentially flat' — the eye needs
// real elevation to read 'rolling'.)
function broadHill(x, z) {
  return (
    Math.sin(x * 0.0785) * Math.cos(z * 0.0785) * 3.4 +
    Math.sin(x * 0.0314 + z * 0.0471 + 1.3) * 1.4
  );
}

let _heightCachePath = null;
let _heightSamples = null;
/**
 * Distance-aware terrain height — the EXACT formula buildTerrain uses
 * (smoothH scaled by corridor falloff + broadHill landforms). Exported so
 * Environment.js grounds its far-field props on the same rolling field
 * (agent flag: the Environment's own smoothH copy ignored the new hills →
 * trees/rocks at 46-162m floated/buried 0.5-3m).
 */
export function terrainHeight(x, z, path) {
  if (path !== _heightCachePath) {
    _heightCachePath = path || null;
    _heightSamples = null;
    if (path) {
      _heightSamples = new Float32Array(400 * 2);
      const sp = new THREE.Vector3();
      for (let i = 0; i < 400; i++) {
        path.getPointAt(i / 400, sp);
        _heightSamples[i * 2] = sp.x;
        _heightSamples[i * 2 + 1] = sp.z;
      }
    }
  }
  let d2 = Infinity;
  if (_heightSamples) {
    for (let i = 0; i < 400; i++) {
      const dx = x - _heightSamples[i * 2];
      const dz = z - _heightSamples[i * 2 + 1];
      const dd = dx * dx + dz * dz;
      if (dd < d2) d2 = dd;
    }
  }
  const d = Math.sqrt(d2);
  const raw = Math.min(1, Math.max(0, (d - 10) / 15));
  const falloff = raw * raw * (3 - 2 * raw); // C1 smoothstep
  return -0.25 + smoothH(x, z) * 0.5 * (1 + falloff * 2.5) + broadHill(x, z) * 1.2 * falloff;
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

function buildTerrain(path) {
  const size = 460;
  const seg = 72;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;

  // Pre-sample the track loop so every terrain vertex can measure its
  // distance to the road corridor. 400 samples ≈ 1.1m spacing — far finer
  // than the 10m flat zone we need to resolve.
  const SAMPLE_COUNT = 400;
  const trackSamples = new Float32Array(SAMPLE_COUNT * 2);
  const sp = new THREE.Vector3();
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    path.getPointAt(i / SAMPLE_COUNT, sp);
    trackSamples[i * 2] = sp.x;
    trackSamples[i * 2 + 1] = sp.z;
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // Distance to the nearest track sample.
    let d2 = Infinity;
    for (let s = 0; s < trackSamples.length; s += 2) {
      const dx = x - trackSamples[s];
      const dz = z - trackSamples[s + 1];
      const dd = dx * dx + dz * dz;
      if (dd < d2) d2 = dd;
    }
    const d = Math.sqrt(d2);

    // Corridor falloff: 0 inside 10m of the track (flat racing surface),
    // 1 beyond 25m (full rolling field). Smoothstep keeps the join C1
    // continuous — the vertex mesh stays smooth, no cliffs.
    const t = Math.min(1, Math.max(0, (d - 10) / 15));
    const falloff = t * t * (3 - 2 * t);

    // Near the track this reduces to the historical smoothH*0.5 - 0.25
    // (bit-identical heights → road, shoulders, kerbs, rails, ramps and the
    // kart's ground sampling are exactly as before). Beyond the corridor the
    // same noise scales up to ±0.9m and broadHill adds ±2.4m of ~80m
    // wavelength landforms → ±2.5-3.5m gentle rolling hills on the horizon.
    const y = -0.25 + smoothH(x, z) * 0.5 * (1 + falloff * 2.5) + broadHill(x, z) * 1.2 * falloff;
    pos.setY(i, y);
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
  // Continuous kerbs (no gaps): block length ≈ spacing → solid red/white edge.
  const seg = 1.7;
  const count = Math.floor(length / seg);
  // Narrow across the road (X=0.42), LONG along the track (Z=1.7): after
  // lookAt aligns Z with the path, the kerb runs along the edge, not across it.
  const geo = new THREE.BoxGeometry(0.42, 0.14, seg);
  const mat = toonMaterial(0xffffff, {});
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = true;

  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count; // center each block on its segment → no overlap
    path.getPointAt(t, p);
    path.getTangentAt(t, tan);
    nrm.set(-tan.z, 0, tan.x).normalize();
    dummy.position.set(
      p.x + nrm.x * side * (roadW / 2 + 0.15),
      p.y + 0.22, // ribbon sits at y+0.18; curb top flush just above it
      p.z + nrm.z * side * (roadW / 2 + 0.15)
    );
    dummy.lookAt(
      p.x + tan.x + nrm.x * side * (roadW / 2 + 0.15),
      p.y,
      p.z + tan.z + nrm.z * side * (roadW / 2 + 0.15)
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    col.setHex(i % 2 === 0 ? 0xff5a5f : 0xffffff);
    mesh.setColorAt(i, col);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/**
 * Solid rectangular-section ribbon (closed box) following the path at a
 * fixed lateral offset and height band — the guard-rail's continuous darker
 * top rail. Top/bottom/side faces make it read from any camera angle.
 */
function buildEdgeRibbon(path, lateralOffset, yBase, w, h, mat) {
  const N = 200;
  const nrm = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const p = new THREE.Vector3();
  const pos = [];
  const idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    path.getPointAt(t, p);
    path.getTangentAt(t, tan);
    nrm.set(-tan.z, 0, tan.x).normalize();
    const cx = p.x + nrm.x * lateralOffset;
    const cz = p.z + nrm.z * lateralOffset;
    const ox = nrm.x * (w / 2);
    const oz = nrm.z * (w / 2);
    const y0 = p.y + yBase;
    const y1 = p.y + yBase + h;
    pos.push(cx - ox, y0, cz - oz); // 0 outer-bottom
    pos.push(cx + ox, y0, cz + oz); // 1 inner-bottom
    pos.push(cx + ox, y1, cz + oz); // 2 inner-top
    pos.push(cx - ox, y1, cz - oz); // 3 outer-top
  }
  for (let i = 0; i < N; i++) {
    const a = i * 4;
    const b = a + 4;
    // bottom face
    idx.push(a, b, a + 1, a + 1, b, b + 1);
    // top face
    idx.push(a + 3, a + 2, b + 2, a + 3, b + 2, b + 3);
    // outer side
    idx.push(a, a + 3, b + 3, a, b + 3, b);
    // inner side
    idx.push(a + 1, b + 1, b + 2, a + 1, b + 2, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Continuous guard-rail along ONE road edge: short barrier segments
 * (alternating white/red) instanced every ~4m following the path normal,
 * with a continuous darker top rail on top. Placed at roadWidth/2 + 0.6 so
 * it never intrudes on the racing line (the kart wall bounce lives further
 * out, at +roadEdge). The whole edge reads as ONE organized structure —
 * asphalt → curbs → guard rail → grass — instead of scattered props.
 */
function buildGuardRail(path, length, side) {
  const roadW = getRoadWidthAt();
  // LOW + FAR from the racing line so the chase camera never clips/obscures:
  // 0.5m tall rail at road edge +1.1m (vision critic: 0.7m at +0.6 dominated
  // the frame and the camera sat inside it).
  const lateral = side * (roadW / 2 + 1.1);
  const segLen = 3.9; // short segments, 0.1m joint gap reads as intentional
  // Tile the whole loop with ~4m spacing (count = round → spacing = length /
  // count ≈ 3.99m) so there's no seam gap where the loop closes at start.
  const count = Math.max(1, Math.round(length / 4.0));

  const geo = new THREE.BoxGeometry(0.3, 0.5, segLen);
  const mat = toonMaterial(0xffffff, {});
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count; // center each segment on its slot → even spacing
    path.getPointAt(t, p);
    path.getTangentAt(t, tan);
    nrm.set(-tan.z, 0, tan.x).normalize();
    dummy.position.set(
      p.x + nrm.x * lateral,
      p.y + 0.05 + 0.25, // base at path elevation +0.05; box half-height 0.25
      p.z + nrm.z * lateral
    );
    dummy.lookAt(
      p.x + tan.x + nrm.x * lateral,
      p.y,
      p.z + tan.z + nrm.z * lateral
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    col.setHex(i % 2 === 0 ? 0xff5a5f : 0xf4f6f8);
    mesh.setColorAt(i, col);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  // Continuous darker top rail sitting on the segments (no seams between
  // them). DoubleSide so winding never culls it.
  const railMat = toonMaterial(0x232b38, { side: THREE.DoubleSide });
  const rail = buildEdgeRibbon(path, lateral, 0.05 + 0.7, 0.5, 0.22, railMat);

  const g = new THREE.Group();
  g.add(mesh, rail);
  return g;
}

function buildLaneDashes(path, length) {
  const count = Math.floor(length / 3.0);
  const geo = new THREE.BoxGeometry(0.3, 0.04, 2.4);
  const mat = toonMaterial(0xffd166, {});
  const mesh = new THREE.InstancedMesh(geo, mat, count);

  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const t = i / count;
    path.getPointAt(t, p);
    path.getTangentAt(t, tan);
    // Road ribbon sits at y+0.18 — the dashes must sit ABOVE it (y+0.21) or
    // they're buried inside the asphalt (the classic decal-height pitfall).
    dummy.position.set(p.x, p.y + 0.21, p.z);
    dummy.lookAt(p.x + tan.x, p.y, p.z + tan.z);
    // NOTE: no rotateX here! lookAt already aligns the long axis (Z) with
    // the path; rotateX(-PI/2) was standing the dashes UP as yellow poles.
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/**
 * Turbo pads: bright zebra-striped boost pads laid on the road centerline,
 * clustered around the t positions in CONFIG.track.turboPadTs (4 pads per
 * cluster, ~2.8m apart along the path). Wider than lane dashes so they read
 * as a distinct "drive over me" strip. Returns the instanced mesh plus the
 * normalized ts and world points KartPhysics uses for boost detection.
 */
function buildTurboPads(path, length) {
  const clusters = CONFIG.track.turboPadTs || [];
  const perCluster = 4;
  const spacing = 2.8; // m between pads in a cluster (along the path)
  const dt = spacing / length;
  const count = clusters.length * perCluster;

  const geo = new THREE.BoxGeometry(1.2, 0.04, 1.4);
  // MeshBasicMaterial: unlit so the pad stays bright yellow/white in shadow.
  const mat = new THREE.MeshBasicMaterial({ map: turboPadTexture(), color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geo, mat, count);

  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const ts = [];
  const points = [];

  let i = 0;
  for (const c of clusters) {
    for (let k = 0; k < perCluster; k++) {
      // center the cluster on c: offsets -1.5dt..+1.5dt
      const t = Math.min(0.999, Math.max(0.001, c + (k - (perCluster - 1) / 2) * dt));
      path.getPointAt(t, p);
      path.getTangentAt(t, tan);
      // Road ribbon sits at y+0.18 — pads must sit ABOVE it (y+0.21).
      dummy.position.set(p.x, p.y + 0.21, p.z);
      // NOTE: no rotateX here! lookAt aligns the long axis (Z) with the
      // path — same convention as buildLaneDashes.
      dummy.lookAt(p.x + tan.x, p.y, p.z + tan.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      ts.push(t);
      points.push(p.clone());
      i++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, ts, points };
}

function buildGantry(startLine) {
  const group = new THREE.Group();
  const roadW = getRoadWidthAt();
  const nrm = new THREE.Vector3(-startLine.direction.z, 0, startLine.direction.x).normalize();

  const pillarGeo = new THREE.CylinderGeometry(0.28, 0.36, 5.8, 10);
  const pillarMat = toonMaterial(0xff5a5f, {});
  const beamGeo = new THREE.BoxGeometry(roadW + 5, 0.5, 0.7);
  const beamMat = toonMaterial(0x2ec4ff, {});

  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position
      .copy(startLine.position)
      .addScaledVector(nrm, side * (roadW / 2 + 1.6));
    pillar.position.y = 2.6;
    pillar.castShadow = true;
    group.add(pillar);
    cartoonOutline(pillar, 0x1b2a41, 0.03);
  }

  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.copy(startLine.position);
  beam.position.y = 5.4; // lowered so the banner sits in the driver's view
  beam.lookAt(startLine.position.clone().add(startLine.direction));
  group.add(beam);
  cartoonOutline(beam, 0x1b2a41, 0.02);

  // Checkered banner hanging from the beam, with a bold FINISH word.
  // Segmented width so main.js can wave it like fabric (not a rigid board).
  // MeshBasicMaterial: the toon gradient was washing the checker pattern out.
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(roadW + 2, 2.1, 14, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  banner.material.map = bannerCheckerTexture();
  banner.position.copy(startLine.position);
  banner.position.y = 4.3; // top touches beam underside (5.4 - 0.25); IN VIEW
  // Explicit yaw: normal +Z faces the START CAMERA (-direction), so the
  // DoubleSide material shows the text un-mirrored from the player's view.
  banner.rotation.y = Math.atan2(-startLine.direction.x, -startLine.direction.z);
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
    lamp.position.y = 5.68; // mounted ON the beam (top face 5.4+0.25) — was 7.7 (floating 2.3m above!)
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

  return { group, startLights, banner };
}

/**
 * Checkered finish line PAINTED on the asphalt under the gantry.
 * A flat plane with explicit yaw (like the banner): lookAt faces the
 * direction, rotateX(-PI/2) lays it flat — this time it reads as painted,
 * not as a loose floating slab (the old decal had the wrong orientation).
 */
function buildFinishLine(startLine) {
  const w = getRoadWidthAt() + 1;
  const geo = new THREE.PlaneGeometry(w, 1.6);
  const mat = new THREE.MeshBasicMaterial({ map: finishLineTexture(), side: THREE.DoubleSide });
  // polygonOffset wins the depth test against the road ribbon at grazing
  // angles (classic decal technique — plain y-offset z-fights).
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.polygonOffsetUnits = -2;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(startLine.position);
  mesh.position.y += 0.21; // road ribbon sits at y+0.18; sit just above it
  mesh.lookAt(
    startLine.position.x + startLine.direction.x,
    startLine.position.y,
    startLine.position.z + startLine.direction.z
  );
  mesh.rotateX(-Math.PI / 2);
  return mesh;
}

/**
 * Painted direction chevrons at the sharpest corners (curvature > threshold),
 *  so the road reads "race track" and not a plain strip. */
function buildDirectionArrows(path) {
  const SAMPLES = 160;
  const tan = new THREE.Vector3();
  const tan2 = new THREE.Vector3();
  const p = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const spots = [];
  let lastT = -1;
  const dt = 1 / SAMPLES;
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES;
    path.getTangentAt(t, tan);
    path.getTangentAt(Math.min(1, t + dt), tan2);
    const curv = 1 - Math.min(1, Math.max(-1, tan.dot(tan2))); // 0 = straight
    if (curv > 0.0022 && t - lastT > 0.045) {
      // Skip the very first straight segment (start grid) — keep it clean.
      if (t > 0.05 && t < 0.95) {
        path.getPointAt(t, p);
        spots.push({ x: p.x, y: p.y, z: p.z, tx: tan.x, tz: tan.z });
        lastT = t;
      }
    }
  }
  if (spots.length === 0) return null;
  const geo = new THREE.PlaneGeometry(3.4, 3.4); // big chevrons (MK8-style corner signage)
  const mat = new THREE.MeshBasicMaterial({ map: arrowTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    dummy.position.set(s.x, s.y + 0.21, s.z); // road ribbon sits at y+0.18
    dummy.lookAt(s.x + s.tx, s.y, s.z + s.tz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/**
 * Tire-stack barriers on the outside of the sharpest corners (classic kart
 * track dressing). Reuses the same curvature scan as the direction arrows.
 */
function buildTireBarriers(path, roadW) {
  const SAMPLES = 160;
  const tan = new THREE.Vector3();
  const tan2 = new THREE.Vector3();
  const p = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const spots = [];
  let lastT = -1;
  const dt = 1 / SAMPLES;
  const halfW = roadW / 2;
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES;
    path.getTangentAt(t, tan);
    path.getTangentAt(Math.min(1, t + dt), tan2);
    const curv = 1 - Math.min(1, Math.max(-1, tan.dot(tan2)));
    if (curv > 0.0022 && t - lastT > 0.06 && t > 0.05 && t < 0.95) {
      path.getPointAt(t, p);
      nrm.set(-tan.z, 0, tan.x).normalize();
      // A tire STACK (3 tires high) on each side, just off the road — and
      // outside the guard-rail (rail sits at halfW+0.6, so +1.5 clears it).
      for (let side = -1; side <= 1; side += 2) {
        spots.push({ x: p.x + nrm.x * (side * (halfW + 1.5)), y: p.y, z: p.z + nrm.z * (side * (halfW + 1.5)), ry: Math.atan2(tan.x, tan.z) });
      }
      lastT = t;
    }
  }
  if (spots.length === 0) return null;
  const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const tireMat = toonMaterial(0x23272e, {});
  // Hub caps (audit v4 F3: tire stacks read as dark stumps — a bright disc
  // per side makes them read AS TIRES instantly).
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 10);
  const hubMat = toonMaterial(0xdfe6ee, {});
  const mesh = new THREE.InstancedMesh(tireGeo, tireMat, spots.length * 3);
  const hubMesh = new THREE.InstancedMesh(hubGeo, hubMat, spots.length * 6);
  let idx = 0;
  let hidx = 0;
  for (const s of spots) {
    for (let h = 0; h < 3; h++) {
      dummy.position.set(s.x, s.y + 0.15 + h * 0.3, s.z);
      dummy.rotation.set(0, s.ry, 0); // standing tire ring facing along the road
      dummy.updateMatrix();
      mesh.setMatrixAt(idx++, dummy.matrix);
      // hub caps on both faces (local X ±0.19 → world via ry rotation)
      const cx = Math.cos(s.ry);
      const cz = Math.sin(s.ry);
      for (const sgn of [-1, 1]) {
        dummy.position.set(s.x + cx * 0.19 * sgn, s.y + 0.15 + h * 0.3, s.z - cz * 0.19 * sgn);
        dummy.rotation.set(0, s.ry, 0);
        dummy.updateMatrix();
        hubMesh.setMatrixAt(hidx++, dummy.matrix);
      }
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  hubMesh.instanceMatrix.needsUpdate = true;
  const g = new THREE.Group();
  g.add(mesh);
  g.add(hubMesh);
  return g;
}

// ---------------------------------------------------------------------------
// Track-side density ("dense world, not sparse"): organized, LOW, non-blocking
// props layered OUTSIDE the guard-rail hierarchy:
//   asphalt → curbs (+0.15) → guard rail (+1.1) → grass tufts (+1.8) →
//   tire stacks (corners, +1.5) → sponsor boards (+2.6).
// ---------------------------------------------------------------------------

/** Deterministic 0..1 hash for per-instance jitter (no RNG → stable layout). */
function hash01(...args) {
  let h = 2166136261;
  for (const a of args) {
    h ^= (a | 0);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Procedural billboard face: toon base color + 3 diagonal stripes + dark frame. */
function billboardTexture(baseHex, stripeHex) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#' + baseHex.toString(16).padStart(6, '0');
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#' + stripeHex.toString(16).padStart(6, '0');
  g.beginPath();
  for (let i = 0; i < 3; i++) {
    const x = 14 + i * 34;
    g.moveTo(x, 0);
    g.lineTo(x + 12, 0);
    g.lineTo(x - 20, 64);
    g.lineTo(x - 32, 64);
    g.closePath();
  }
  g.fill();
  g.strokeStyle = 'rgba(18,28,44,0.9)';
  g.lineWidth = 4;
  g.strokeRect(2, 2, 124, 60);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sponsor boards: 4 small roadside billboards (2.2x1.1x0.15 board on a 2.2m
 * pole) on the low-curvature straights (t = 0.05 / 0.28 / 0.55 / 0.82, all
 * curv < 0.0012), alternating sides so both edges read. Placed OUTSIDE the
 * guard-rail at roadW/2 + 2.6, boards face the road. Alternate 3 stripe
 * color schemes for organized variation.
 */
function buildSponsorBoards(path) {
  const halfW = getRoadWidthAt() / 2;
  const lateral = halfW + 2.6;
  const SPOTS = [
    { t: 0.05, side: 1, scheme: 0 },
    { t: 0.28, side: -1, scheme: 1 },
    { t: 0.55, side: 1, scheme: 2 },
    { t: 0.82, side: -1, scheme: 0 },
  ];
  const SCHEMES = [
    { base: 0x2ec4ff, stripe: 0xffffff }, // cyan / white
    { base: 0xff5a5f, stripe: 0xffffff }, // red / white
    { base: 0xffd166, stripe: 0x1b2a41 }, // yellow / navy
  ];
  const boardGeo = new THREE.BoxGeometry(2.2, 1.1, 0.15);
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 2.2, 8);
  const poleMat = toonMaterial(0x2b3340, {});
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const group = new THREE.Group();
  for (const s of SPOTS) {
    path.getPointAt(s.t, p);
    path.getTangentAt(s.t, tan);
    nrm.set(-tan.z, 0, tan.x).normalize();
    const bx = p.x + nrm.x * lateral * s.side;
    const bz = p.z + nrm.z * lateral * s.side;
    const scheme = SCHEMES[s.scheme];
    const mat = toonMaterial(0xffffff, { map: billboardTexture(scheme.base, scheme.stripe) });
    const board = new THREE.Mesh(boardGeo, mat);
    const by = p.y + 2.25 + 0.55; // pole top (2.2) + board half-height (0.55)
    board.position.set(bx, by, bz);
    // Face the road center at the SAME elevation → yaw only, board stays
    // vertical (no pitch from the track slope).
    board.lookAt(p.x, by, p.z);
    board.castShadow = true;
    group.add(board);
    cartoonOutline(board, 0x1b2a41, 0.035);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(bx, p.y + 0.05 + 1.1, bz); // base in the grass, top meets board
    pole.castShadow = true;
    group.add(pole);
  }
  return group;
}

/**
 * Roadside grass tufts: instanced clusters of 4 thin green cones (~0.08r x
 * 0.48h) every ~6m along BOTH edges, just outside the guard-rail at
 * roadW/2 + 1.8. Deliberately low (max ~0.58m, under the 0.6m camera
 * clearance) so they dress the ground without ever entering the view.
 * One InstancedMesh, per-instance green shade / yaw / scale jitter.
 */
function buildGrassTufts(path, length) {
  const halfW = getRoadWidthAt() / 2;
  const lateral = halfW + 1.8;
  const clusterCount = Math.max(1, Math.round(length / 6.0)); // ~6m spacing
  const perCluster = 4;
  const total = clusterCount * 2 * perCluster; // both sides
  const geo = new THREE.ConeGeometry(0.08, 0.48, 6);
  const mat = toonMaterial(0xffffff, {});
  const mesh = new THREE.InstancedMesh(geo, mat, total);
  const GREENS = [0x3fae4f, 0x57c05e, 0x2f8f3e, 0x6ccf6a];
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let idx = 0;
  for (let i = 0; i < clusterCount; i++) {
    const t = (i + 0.5) / clusterCount;
    // Keep the start/finish straight clear (gantry pillars sit at t≈0).
    if (t < 0.025 || t > 0.975) continue;
    path.getPointAt(t, p);
    path.getTangentAt(t, tan);
    nrm.set(-tan.z, 0, tan.x).normalize();
    for (const side of [-1, 1]) {
      const baseX = p.x + nrm.x * lateral * side;
      const baseZ = p.z + nrm.z * lateral * side;
      for (let k = 0; k < perCluster; k++) {
        const jLat = (hash01(i, side, k, 0) - 0.5) * 0.9; // ±0.45m lateral
        const jFwd = (hash01(i, side, k, 1) - 0.5) * 1.1; // ±0.55m along track
        const hScale = 0.7 + hash01(i, side, k, 2) * 0.5; // 0.34..0.58m < 0.6m
        dummy.position.set(
          baseX + nrm.x * jLat + tan.x * jFwd,
          p.y + (0.48 * hScale) / 2 + (hash01(i, side, k, 3) - 0.5) * 0.06,
          baseZ + nrm.z * jLat + tan.z * jFwd
        );
        dummy.rotation.set(0, hash01(i, side, k, 4) * Math.PI * 2, 0);
        dummy.scale.set(hScale, hScale, hScale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        col.setHex(GREENS[(i + side + k) % GREENS.length]);
        mesh.setColorAt(idx, col);
        idx++;
      }
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.count = idx; // skip unused slots (start-straight clearance)
  return mesh;
}

/**
 * Apex cone markers: small orange cones + white base rings along the kerb
 * (roadW/2 + 0.2) on the INSIDE edge of the 3 sharpest corners (curvature
 * scan → top local maxima), 5 cones per corner spaced 3m. Visual-only
 * (no collider) so they never block the kart.
 */
function buildApexCones(path, length, roadW) {
  const SAMPLES = 160;
  const dt = 1 / SAMPLES;
  const tan = new THREE.Vector3();
  const tan2 = new THREE.Vector3();
  const rows = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES;
    path.getTangentAt(t, tan);
    path.getTangentAt(Math.min(1, t + dt), tan2);
    const curv = 1 - Math.min(1, Math.max(-1, tan.dot(tan2)));
    rows.push({ t, curv });
  }
  const peaks = [];
  for (let i = 1; i < SAMPLES - 1; i++) {
    const r = rows[i];
    if (r.curv > 0.0022 && r.curv >= rows[i - 1].curv && r.curv >= rows[i + 1].curv) {
      peaks.push(r);
    }
  }
  peaks.sort((a, b) => b.curv - a.curv);
  const apexes = [];
  for (const pk of peaks) {
    if (apexes.every((o) => Math.min(Math.abs(o.t - pk.t), 1 - Math.abs(o.t - pk.t)) > 0.1)) {
      apexes.push(pk);
      if (apexes.length === 3) break;
    }
  }
  if (apexes.length === 0) return null;

  const halfW = roadW / 2;
  const perCorner = 5;
  const dtSpacing = 3 / length; // 3m along the path
  const coneGeo = new THREE.ConeGeometry(0.16, 0.4, 8);
  const ringGeo = new THREE.CylinderGeometry(0.185, 0.185, 0.06, 12);
  const coneMat = toonMaterial(0xff7b2e, {});
  const ringMat = toonMaterial(0xffffff, {});
  const total = apexes.length * perCorner;
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, total);
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, total);
  const p = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (const apex of apexes) {
    // Inside edge = side the curvature center lies on. Signed 2D cross of
    // tangents: cross<0 → path bends toward -nrm → inside is the -nrm side
    // (verified: dot(centerDir, nrm*inside) ≈ 1 at every apex).
    path.getTangentAt(apex.t, tan);
    path.getTangentAt(Math.min(1, apex.t + dt), tan2);
    const inside = tan.x * tan2.z - tan.z * tan2.x < 0 ? -1 : 1;
    for (let k = 0; k < perCorner; k++) {
      const t = Math.min(0.999, Math.max(0.001, apex.t + (k - (perCorner - 1) / 2) * dtSpacing));
      path.getPointAt(t, p);
      path.getTangentAt(t, tan);
      nrm.set(-tan.z, 0, tan.x).normalize();
      const cx = p.x + nrm.x * inside * (halfW + 0.2);
      const cz = p.z + nrm.z * inside * (halfW + 0.2);
      const baseY = p.y + 0.29; // kerb top (curb box center 0.22 + half-height 0.07)
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.position.set(cx, baseY + 0.2, cz); // cone center = base + half 0.4
      dummy.updateMatrix();
      cones.setMatrixAt(idx, dummy.matrix);
      dummy.position.set(cx, baseY + 0.03, cz); // white ring collar around the base
      dummy.updateMatrix();
      rings.setMatrixAt(idx, dummy.matrix);
      idx++;
    }
  }
  cones.instanceMatrix.needsUpdate = true;
  rings.instanceMatrix.needsUpdate = true;
  const g = new THREE.Group();
  g.add(cones, rings);
  return g;
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

  const terrain = buildTerrain(path);
  group.add(terrain);

  // Dirt shoulders either side of the asphalt (softens the road→grass edge).
  // Textured now — was a flat tan ribbon (audit V3).
  const shoulder = buildRoadRibbon(path, length, {
    width: getRoadWidthAt() + 3.4,
    yOffset: 0.14,
    texture: dirtTexture,
    repeatU: length * 0.04,
    repeatV: 1,
  });
  shoulder.receiveShadow = true;
  group.add(shoulder);

  const ribbon = buildRoadRibbon(path, length, { texture: roadTexture });
  ribbon.receiveShadow = true;
  group.add(ribbon);

  // Red/white kerbs along both edges (kart-circuit look — was disabled due to
  // the y+0.11-buried + rotateX bugs; now fixed).
  const curbL = buildCurbs(path, length, -1);
  const curbR = buildCurbs(path, length, 1);
  group.add(curbL, curbR);

  // Continuous guard-rails along both edges. Edge hierarchy is now organized:
  // asphalt → curbs → guard rail (roadW/2 + 0.6) → grass. Placed outside the
  // curb so the racing line is never blocked.
  group.add(buildGuardRail(path, length, -1), buildGuardRail(path, length, 1));

  // Track-side density: sponsor boards on the straights, low grass tufts
  // along both edges, and orange apex cones on the inside of the sharpest
  // corners — all OUTSIDE the racing line (visual-only, no colliders).
  group.add(buildSponsorBoards(path));
  group.add(buildGrassTufts(path, length));
  const apexCones = buildApexCones(path, length, getRoadWidthAt());
  if (apexCones) group.add(apexCones);

  const dashes = buildLaneDashes(path, length);
  group.add(dashes);

  const arrows = buildDirectionArrows(path);
  if (arrows) group.add(arrows);

  const tires = buildTireBarriers(path, getRoadWidthAt());
  if (tires) group.add(tires);

  const turbo = buildTurboPads(path, length);
  group.add(turbo.mesh);

  const ramps = buildRamps(path, length);
  for (const r of ramps) {
    group.add(r.mesh);
    // chev is parented to r.mesh now (stays flush on the slope) — it must
    // NOT be re-added here or it would detach from the ramp.
  }

  const startLine = { position: startPos.clone(), direction: startDir.clone(), width: getRoadWidthAt() };
  const gantry = buildGantry(startLine);
  group.add(gantry.group);
  startLine.banner = gantry.banner; // main.js waves it like fabric

  // Checkered finish line painted on the asphalt (proper yaw this time —
  // reads as paint, not a floating slab).
  group.add(buildFinishLine(startLine));

  // Finish checkered strip on the road itself at startT.
  // REMOVED — the painted decal read as a floating board in the middle of
  // the track. The hanging gantry banner is the finish marker now.
  // const checker = new THREE.Mesh(...)

  scene.add(group);

  const waypoints = [];
  const WAY_COUNT = 90;
  for (let i = 0; i < WAY_COUNT; i++) {
    waypoints.push(path.getPointAt(i / WAY_COUNT).clone());
  }

  return { group, path, waypoints, startLine, length, startLights: gantry.startLights, turboPads: { ts: turbo.ts, points: turbo.points }, ramps };
}

/**
 * Trick ramps on two straights — the air system (vY/gravity/_airTime) was
 * dead code with nothing ever setting vY > 0. A ramp launches the kart;
 * pressing throttle mid-air arms a trick → landing mini-boost (MK8 pillar).
 */
function buildRamps(path, length) {
  const ramps = [];
  // Toon ramp body (audit v4 F1: was the only non-toon surface — read as a
  // flat orange crate) + painted chevrons on the top face.
  const mat = toonMaterial(0xc96f2c, {});
  const chevMat = new THREE.MeshBasicMaterial({ map: turboPadTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const tan = new THREE.Vector3();
  const p = new THREE.Vector3();
  // Two ramps on the two long straights, evenly split around the lap (0.30
  // and 0.86 — curvature < 0.001) and clear of the turbo-pad clusters
  // (0.18 / 0.72) and the corner dressing — no more cluster at t=0.16/0.56
  // (the old 0.56 ramp sat on the corner entry, c≈0.0015).
  for (const t of [0.30, 0.86]) {
    path.getPointAt(t, p);
    path.getTangentAt(t, tan);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.45, CONFIG.track.roadWidth * 0.78),
      mat
    );
    // Base sits exactly on the asphalt top (ribbon y+0.18) — the old
    // y+0.22 center left the bottom third buried under the ribbon.
    mesh.position.set(p.x, p.y + 0.18 + 0.225, p.z);
    mesh.rotation.y = Math.atan2(tan.x, tan.z);
    mesh.rotation.x = 0.3; // slope up along travel direction
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Chevron decal PARENTED to the ramp: local +Y 0.23 = 5mm above the top
    // face, inherits the slope so it stays flush end-to-end. The old
    // free-floating plane at world y+0.26 was buried inside the ramp's top
    // face (y+0.445) — invisible at the center, ghosting at the low end.
    const chev = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), chevMat);
    chev.rotation.x = -Math.PI / 2;
    chev.position.set(0, 0.23, 0);
    chev.renderOrder = 1;
    mesh.add(chev);
    ramps.push({ t, point: p.clone(), dir: tan.clone(), mesh, chev });
  }
  return ramps;
}
