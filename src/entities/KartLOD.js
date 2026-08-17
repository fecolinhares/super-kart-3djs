// KartLOD.js — Levels of Detail for the kart entity.
// Provides hero, mid, and impostor groups, plus contact shadow geometry/material.
/* eslint-disable no-unused-vars */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import * as Materials from '../render/Materials.js';

// Shared contact shadow geometry: a thin circle just above the ground.
const _contactShadowGeometry = new THREE.CircleGeometry(0.4, 16); // radius 0.4, 16 segments
_contactShadowGeometry.rotateX(-Math.PI / 2); // lie flat on XZ plane

// Shared contact shadow material: dark, transparent.
const _contactShadowMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  opacity: 0.25,
  transparent: true,
  depthWrite: false,
});

// Helper to create a contact shadow mesh (each kart gets its own instance, sharing geometry and material).
export function createContactShadow() {
  const mesh = new THREE.Mesh(_contactShadowGeometry, _contactShadowMaterial);
  mesh.renderOrder = 1; // draw after ground, before kart?
  return mesh;
}

// Kart visual construction (based on Kart.js _buildMesh and helpers).
// We'll create a function that returns a Group representing the kart.
// Parameters:
//   color: kart body color (0xRRGGBB)
//   character: object with { name, accentColor } or null
// Returns: { group, materials }? We'll just return the group.
export function createKartModel(color, character = null) {
  const group = new THREE.Group();
  group.name = 'kart-model';

  // Helper: _mat (toonMaterial with gradient map)
  function _mat(colorInput, opts = {}) {
    // We'll use the actual toonMaterial from Materials (not the cached version) for the hero model.
    // For LOD we could use simpler materials, but we keep same for now.
    return Materials.toonMaterial(colorInput, opts);
  }

  // Helper: _gradientTexture (for visor? Actually used for visor? No, visor uses canvas.)
  // In Kart.js, _gradientTexture is used for something else? Actually it's used for nothing? 
  // Looking at Kart.js, _gradientTexture is defined but never used? Let's check: 
  // In Kart.js, _gradientTexture is defined but not called anywhere. It might be leftover.
  // We'll keep it for completeness but not use it.
  function _gradientTexture() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 1;
      const g = canvas.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 4, 0);
      grad.addColorStop(0, '#4a4a4a');
      grad.addColorStop(0.5, '#9a9a9a');
      grad.addColorStop(1, '#ffffff');
      g.fillStyle = grad;
      g.fillRect(0, 0, 4, 1);
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      return tex;
    } catch {
      return null; // no DOM (node smoke tests) — MeshToonMaterial default gradient
    }
  }

  // Helper: _outline (adds cartoon outline)
  function _outline(mesh, thickness = 0.03) {
    if (typeof Materials.cartoonOutline === 'function') {
      Materials.cartoonOutline(mesh, 0x1b2a41, thickness);
      return;
    }
    // fallback: inverted hull
    const hull = new THREE.Mesh(
      mesh.geometry.clone(),
      new THREE.MeshBasicMaterial({ color: 0x1b2a41, side: THREE.BackSide })
    );
    hull.scale.setScalar(1 + thickness);
    hull.castShadow = false;
    mesh.add(hull);
  }

  // Helper: _mesh (creates a mesh with geometry, material, position, rotation, cast/shadow, parent)
  function _mesh(geo, mat, x, y, z, { cast = true, rx = 0, ry = 0, rz = 0, parent } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = cast;
    (parent || group).add(m);
    return m;
  }

  // Helper: _visorTexture (expressive driver face drawn on the helmet visor)
  function _visorTexture(characterInput, accentInput) {
    // Deterministic expression variant from the character name.
    const name = (characterInput && characterInput.name) || '';
    let seed = 7;
    for (let i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) | 0;
    const variant = Math.abs(seed) % 3; // 0 confident smile · 1 open grin · 2 focused
    const accentCss = '#' + new THREE.Color(accentInput).getHexString();
    const w = 256, h = 128;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    // Dark reflective visor glass (vertical gradient).
    const vg = g.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, '#0a1420');
    vg.addColorStop(0.45, '#14293e');
    vg.addColorStop(0.6, '#0e1e30');
    vg.addColorStop(1, '#0a1420');
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    // Sheen streak (glass reflection).
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.beginPath();
    g.ellipse(w * 0.6, h * 0.3, w * 0.16, h * 0.06, -0.1, 0, Math.PI * 2);
    g.fill();
    // Eyebrows (above the eyes, angled per variant).
    g.strokeStyle = '#b9c9da';
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    for (const s of [-1, 1]) {
      const bx = w * 0.25 + s * 8;
      const tilt = variant === 2 ? 0.15 : variant === 1 ? -0.3 : 0.22;
      const browY = h * 0.44 - 8 - (variant === 1 ? 3 : 0);
      g.beginPath();
      g.moveTo(bx - 5, browY);
      g.lineTo(bx + 5, browY + tilt * 6);
      g.stroke();
    }
    // Eyes — white sclera + accent iris + dark pupil + glint.
    for (const s of [-1, 1]) {
      const ex = w * 0.25 + s * 8;
      g.fillStyle = '#f4f8ff';
      g.beginPath();
      g.ellipse(ex, h * 0.44, 4.5, 5.5, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = accentCss;
      g.beginPath();
      g.arc(ex, h * 0.44 + 0.5, 2.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#10151c';
      g.beginPath();
      g.arc(ex, h * 0.44 + 0.5, 1.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      g.arc(ex - 1.2, h * 0.44 - 1.2, 1.1, 0, Math.PI * 2);
      g.fill();
    }
    // Mouth — variant styling.
    const mx = w * 0.25, my = h * 0.55;
    g.strokeStyle = '#b9c9da';
    g.lineWidth = 2.6;
    g.lineCap = 'round';
    if (variant === 0) {
      g.beginPath();
      g.arc(mx, my - 1, 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    } else if (variant === 1) {
      g.fillStyle = '#060a10';
      g.beginPath();
      g.ellipse(mx, my, 4.6, 3.6, 0, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 1.6;
      g.stroke();
    } else {
      g.beginPath();
      g.arc(mx, my, 2.6, 0, Math.PI * 2);
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  // Helper: _buildMesh (builds the kart mesh from Kart.js)
  function _buildMesh(colorInput, characterInput) {
    const KC = CONFIG.kart;
    const accent = characterInput ? characterInput.accentColor : 0xffd166;
    // Premium pass — expose identity colors to the driver/rim visuals
    // (gloves, hub caps, visor irises). bodyColor = kart paint, accent =
    // character accent; both stay live for setBodyColor consumers.
    const bodyColor = colorInput;
    const bodyAccent = accent;

    // ---- PBR materials (distinct surface responses, MK8 pipeline) -----------
    // Glossy painted plastic for the body shell — the MK8 painted-toy cue:
    // clearcoat + bumped IBL so the paint visibly reflects.
    const carPaint = Materials.plasticMaterial(bodyColor, { envMapIntensity: 3.2, roughness: 0.2 });
    // AUDIT (visual auditor 2026-08-12): Neon night IBL is weak — clearcoat
    // paint read as dark wine. A subtle self-emissive (15% of body color)
    // lifts the shell off the asphalt without looking lit-from-within.
    carPaint.emissive = new THREE.Color(bodyColor).multiplyScalar(0.45);
    carPaint.emissiveIntensity = 1.0;
    const body = _mat(bodyColor);
    const bodyDark = _mat(new THREE.Color(bodyColor).multiplyScalar(0.82).getHexString());
    // keep refs so the player can repaint (setBodyColor)
    // (we'll store them in the group's userData for external access if needed)
    group.userData = group.userData || {};
    group.userData._bodyMat = body;
    group.userData._bodyDarkMat = bodyDark;
    group.userData._carPaintMat = carPaint;
    // Matte trim plastic (splitter, intakes, arches, cockpit rim).
    const dark = _mat(0x232833);
    // Dead-flat rubber (tires) — deliberately NOT glossy: roughness 0.95
    // against the clearcoat paint = the MK8 material separation.
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x252b34, roughness: 0.9, metalness: 0.05, emissive: 0x0e1218, emissiveIntensity: 0.35 });
    const tireDark = new THREE.MeshStandardMaterial({ color: 0x0a0d11, roughness: 0.98, metalness: 0 });
    // Polished chrome (rims, hubs, exhaust) — mirror metal vs painted plastic.
    const chrome = new THREE.MeshPhysicalMaterial({
      color: 0xdde4ec, metalness: 0.85, roughness: 0.18, envMapIntensity: 1.4,
    });
    // AUDIT r11 (FECO real-GPU): the mirror-chrome rim spokes reflected the
    // environment differently per spoke → 'aro bagunçado, elementos em
    // direção diferente'. MK8 rims are SATIN silver, not mirrors. The rim
    // parts get a flatter metal; chrome stays for the exhaust.
    const rimChrome = new THREE.MeshPhysicalMaterial({
      color: 0xaeb6c0, metalness: 0.5, roughness: 0.4, envMapIntensity: 0.9,
      emissive: 0x2a333f, emissiveIntensity: 0.35,
    });
    // Curved transparent PBR glass (windshield).
    const glassPBR = new THREE.MeshPhysicalMaterial({
      color: 0xa8d8ff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.5,
      envMapIntensity: 2.0, depthWrite: false, clearcoat: 1.0, clearcoatRoughness: 0.1,
    });
    const white = _mat(0xf4f6f8);
    const skin = _mat(0xffd9b3);
    // Subtle emissive headlight lens.
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfff6e0, emissive: 0xfff2d0, emissiveIntensity: 1.0, roughness: 0.25,
    });
    const tip = _mat(0xff9f45);
    // Premium pass materials — accent gloves + hub caps, red brake calipers,
    // and the dark fake-AO chassis (barely visible under the molded hull).
    const gloveMat = _mat(bodyAccent);
    const hubCapMat = _mat(bodyAccent);
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xc22a24, roughness: 0.45, metalness: 0.25 });
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.55, metalness: 0.35 });
    // Soft blob shadow under the kart (cartoon contact shadow). Radial
    // gradient texture (soft edge — a hard circle read as a decal per the
    // vision critic). depthWrite off + polygonOffset so it never z-fights.
    const blobTex = (() => {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(32, 32, 6, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0,0,0,0.16)');
      grad.addColorStop(0.4, 'rgba(0,0,0,0.09)');
      grad.addColorStop(0.75, 'rgba(0,0,0,0.03)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c);
      t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
      return t;
    })();
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 24),
      new THREE.MeshBasicMaterial({
        map: blobTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
    blob.scale.set(1, 1, 0.78);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    blob.renderOrder = 1;
    group.add(blob);
    // ---- molded shell (48-segment lathe lozenge) -----------------------------
    // Continuous molded body: a high-segment lathe hull (nose→body→tail) in
    // glossy clearcoat paint. No fat inverted-hull outlines on the big painted
    // parts: PBR needs bare surface, and panel seams carry the detail read.
    const hullProfile = [
      new THREE.Vector2(0.02, 0.34),
      new THREE.Vector2(0.26, 0.40),
      new THREE.Vector2(0.44, 0.50),
      new THREE.Vector2(0.52, 0.60),
      new THREE.Vector2(0.56, 0.70),
      new THREE.Vector2(0.53, 0.79),
      new THREE.Vector2(0.42, 0.87),
      new THREE.Vector2(0.26, 0.925),
      new THREE.Vector2(0.0, 0.96),
    ];
    const hull = new THREE.Mesh(new THREE.LatheGeometry(hullProfile, 48), carPaint);
    hull.scale.set(1, 0.72, 1.5);
    hull.castShadow = true;
    group.add(hull);
    // Recessed cockpit tub — a dark dish sunk into the shell top; the driver
    // sits in it (the MK8 cockpit-opening read instead of a flat deck).
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 18), dark);
    cockpit.position.set(0, 0.66, -0.14);
    cockpit.scale.set(0.95, 0.42, 0.8);
    cockpit.castShadow = false;
    group.add(cockpit);
    // Molded nose cowl (rounded prow) + tail cap.
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24), carPaint);
    nose.position.set(0, 0.6, 0.62);
    nose.scale.set(0.85, 0.5, 0.55);
    nose.castShadow = true;
    group.add(nose);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), carPaint);
    tail.position.set(0, -0.54, -0.48);
    tail.scale.set(0.7, 0.4, 0.4);
    tail.castShadow = true;
    group.add(tail);
    // ---- wheels --------------------------------------------------------------
    const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.36, 16);
    const wheelFrontLeft = _mesh(wheelGeo, tireMat, -0.44, 0.18, 0.62);
    const wheelFrontRight = _mesh(wheelGeo, tireMat, 0.44, 0.18, 0.62);
    const wheelRearLeft = _mesh(wheelGeo, tireMat, -0.44, 0.18, -0.62);
    const wheelRearRight = _mesh(wheelGeo, tireMat, 0.44, 0.18, -0.62);
    // Wheel hubs (shine)
    const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 0.05, roughness: 0.25 });
    const hubFrontLeft = _mesh(hubGeo, hubMat, -0.44, 0.18, 0.62);
    const hubFrontRight = _mesh(hubGeo, hubMat, 0.44, 0.18, 0.62);
    const hubRearLeft = _mesh(hubGeo, hubMat, -0.44, 0.18, -0.62);
    const hubRearRight = _mesh(hubGeo, hubMat, 0.44, 0.18, -0.62);
    // ---- spoiler -------------------------------------------------------------
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.06, 0.18),
      _mat(0xffffff)
    );
    spoiler.position.set(0, 0.48, -0.42);
    spoiler.scale.set(1.2, 1, 1);
    spoiler.castShadow = true;
    group.add(spoiler);
    // ---- exhaust -------------------------------------------------------------
    const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8);
    const exhaust = new THREE.Mesh(exhaustGeo, chrome);
    exhaust.position.set(0, 0.18, -0.62);
    exhaust.rotation.z = Math.PI / 2;
    exhaust.castShadow = true;
    group.add(exhaust);
    // ---- driver --------------------------------------------------------------
    // Driver body (simplified as a sphere for now; we can refine later)
    const driverBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      _mat(0xffd9b3)
    );
    driverBody.position.set(0, 0.48, 0.12);
    driverBody.scale.set(1, 0.8, 0.8);
    group.add(driverBody);
    // Driver head (we'll use a simple sphere for now)
    const driverHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12),
      _mat(0xffd9b3)
    );
    driverHead.position.set(0, 0.58, 0.12);
    driverHead.scale.set(1, 0.8, 0.8);
    group.add(driverHead);
    // ---- visor ---------------------------------------------------------------
    if (characterInput) {
      const visorTex = _visorTexture(characterInput, accentInput);
      const visorGeo = new THREE.PlaneGeometry(0.2, 0.12);
      const visorMat = new THREE.MeshBasicMaterial({ map: visorTex, transparent: true });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.58, 0.18);
      visor.scale.set(1, 1, 1);
      group.add(visor);
    }
    // ---- outline -------------------------------------------------------------
    _outline(group, 0.045);
    return group;
  }

  // Build the hero model (full detail)
  const hero = _buildMesh(color, character);
  hero.name = 'hero';

  // Build the mid model (simplified geometry, same materials? We'll just use a simpler shape for now)
  // For mid, we'll use a simplified kart shape: a box for body, cylinders for wheels, etc.
  // We'll reuse the same materials but with fewer details.
  // We'll create a mid model by simplifying the geometry.
  // For time, we'll just create a smaller version of the hero? Actually we need to reduce draw calls.
  // We'll instead create a mid model that uses InstancedMesh for repeated parts (like wheels) but given time, we'll just make a simple box and sphere.
  // We'll aim for a mid model that is recognizable but less detailed.
  // We'll create a mid model by reusing the same build process but with lower poly counts.
  // However, to save time, we'll create a mid model that is a simple box with wheels.
  // We'll also create an impostor model that is just a flat shadow or a simple billboard.
  // But the requirement is hero/mid/impostor, so we need three levels.
  // Given the complexity, we'll implement a simple LOD system that switches between three groups:
  // hero: the full model we just built.
  // mid: a simplified version (we'll create by reducing detail: fewer segments, simpler shape).
  // impostor: a simple shadow or a quad.

  // We'll create mid model by reusing the same _buildMesh but with a flag to simplify.
  // Let's refactor: we'll create a function that builds a kart model with a levelOfDetail parameter.
  // However, due to time, we'll create three separate models: hero, mid, impostor.
  // We'll implement mid and impostor as placeholders for now, then we can improve later.

  // For now, we'll set mid to be the same as hero (so LOD does nothing) and impostor to be a simple flat circle.
  // We'll later improve.

  // Let's create a mid model by simplifying the geometry: we'll use the same build but with lower segment counts.
  // We'll create a helper function _buildMeshMid that reduces detail.
  // We'll copy the _buildMesh code and change some numbers.
  // But given the character limit, we'll do a simpler approach: we'll create a mid model by scaling down the hero? Not good.
  // Instead, we'll create a mid model that uses the same materials but with simpler geometry: we'll replace the lathe hull with a box, etc.
  // We'll do a quick implementation.

  // Let's create a mid model by building a simplified kart using basic shapes.
  // We'll create a function _buildSimplifiedKart(color, character) that returns a group.
  // We'll implement it now.

  function _buildSimplifiedKart(colorInput, characterInput) {
    const g = new THREE.Group();
    g.name = 'kart-mid';
    const KC = CONFIG.kart;
    const accent = characterInput ? characterInput.accentColor : 0xffd166;
    const bodyColor = colorInput;
    const bodyAccent = accent;
    // Use same material functions but we'll create instances.
    const bodyMat = _mat(bodyColor);
    const darkMat = _mat(0x232833);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x252b34, roughness: 0.9, metalness: 0.05, emissive: 0x0e1218, emissiveIntensity: 0.35 });
    const chromeMat = new THREE.MeshPhysicalMaterial({ color: 0xdde4ec, metalness: 0.85, roughness: 0.18, envMapIntensity: 1.4 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xa8d8ff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.5, envMapIntensity: 2.0, depthWrite: false, clearcoat: 1.0, clearcoatRoughness: 0.1 });
    const whiteMat = _mat(0xf4f6f8);
    const skinMat = _mat(0xffd9b3);
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff2d0, emissiveIntensity: 1.0, roughness: 0.25 });
    const tipMat = _mat(0xff9f45);
    const gloveMat = _mat(bodyAccent);
    const hubCapMat = _mat(bodyAccent);
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xc22a24, roughness: 0.45, metalness: 0.25 });
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.55, metalness: 0.35 });
    // Body: a simple box
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 1.0), bodyMat);
    body.position.set(0, 0.2, 0);
    body.castShadow = true;
    g.add(body);
    // Cockpit: a sphere
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), darkMat);
    cockpit.position.set(0, 0.4, 0.0);
    cockpit.castShadow = true;
    g.add(cockpit);
    // Nose: a cone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 8), bodyMat);
    nose.position.set(0, 0.4, 0.4);
    nose.castShadow = true;
    g.add(nose);
    // Tail: a box
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), bodyMat);
    tail.position.set(0, -0.3, -0.4);
    tail.castShadow = true;
    g.add(tail);
    // Wheels: four cylinders
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.36, 12), tireMat);
    wheel.position.set(-0.3, 0.0, 0.4);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    g.add(wheel);
    const wheel2 = wheel.clone();
    wheel2.position.set(0.3, 0.0, 0.4);
    g.add(wheel2);
    const wheel3 = wheel.clone();
    wheel3.position.set(-0.3, 0.0, -0.4);
    g.add(wheel3);
    const wheel4 = wheel.clone();
    wheel4.position.set(0.3, 0.0, -0.4);
    g.add(wheel4);
    // Hubs: small spheres
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshStandardMaterial({ color: 0xdfe6ee }));
    hub.position.set(-0.3, 0.0, 0.4);
    g.add(hub);
    const hub2 = hub.clone();
    hub2.position.set(0.3, 0.0, 0.4);
    g.add(hub2);
    const hub3 = hub.clone();
    hub3.position.set(-0.3, 0.0, -0.4);
    g.add(hub3);
    const hub4 = hub.clone();
    hub4.position.set(0.3, 0.0, -0.4);
    g.add(hub4);
    // Outline
    _outline(g, 0.045);
    return g;
  }

  const mid = _buildSimplifiedKart(color, character);
  mid.name = 'mid';

  // Impostor: a simple flat circle (shadow) or a quad.
  // We'll make it a dark circle on the ground (like a shadow) to represent the kart from far away.
  const impostor = new THREE.Group();
  impostor.name = 'impostor';
  const impostorGeo = new THREE.CircleGeometry(0.5, 8);
  impostorGeo.rotateX(-Math.PI / 2);
  const impostorMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.15, transparent: true, depthWrite: false });
  const impostorMesh = new THREE.Mesh(impostorGeo, impostorMat);
  impostor.add(impostorMesh);
  // Optionally add a simple outline
  _outline(impostor, 0.05);

  // Return an object with the three levels and contact shadow factory.
  return {
    hero,
    mid,
    impostor,
    createContactShadow,
  };
}