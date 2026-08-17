/**
 * Super Kart 3D.js — auto-instancing post-pass (performance).
 *
 * AUDIT PERF (2026-08-13, Feco: 'se atente a performance no clientside'):
 * 764 draw calls no Meadow — 2544 meshes regulares onde a vegetação/posts/
 * placas/pneus repetidos deveriam ser instanced. Este passo varre a cena UMA
 * vez após o build e converte grupos de meshes com a MESMA geometria
 * (parâmetros idênticos) + MESMO material em InstancedMesh (1 draw call por
 * grupo em vez de N).
 *
 * Segurança:
 *  - só meshes estáticos sem children (nada animado: itembox/banner/pad têm
 *    animação própria e são filtrados por estarem em grupos com nome/children);
 *  - só materiais opacos (transparentes quebram a ordem de render);
 *  - geometria compartilhada (descarta duplicatas → menos VRAM);
 *  - castShadow/receiveShadow preservados no InstancedMesh.
 *
 * Filtros excludentes (nunca instanciar):
 *  - parent tem name (itens, NPCs, grupo nomeado com lógica);
 *  - mesh tem userData.skipInstancing;
 *  - material transparente / com emissive animado (banner, pad glow);
 *  - grupo < 8 meshes (overhead do InstancedMesh não compensa).
 */
import * as THREE from 'three';

export function autoInstancing(scene, { minGroup = 8 } = {}) {
  const materialKey = (m) => [
    m.type,
    m.color?.getHexString?.() || '?',
    m.map?.uuid || 'nomap',
    m.alphaMap?.uuid || 'noalpha',
    m.normalMap?.uuid || 'nonormal',
    m.roughness ?? '', m.metalness ?? '', m.opacity ?? '',
    m.side ?? '', m.flatShading ? 1 : 0, m.vertexColors ? 1 : 0,
  ].join(':');
  // key includes all render-affecting material identity; grouping only by
  // color/type used to merge differently textured meshes and silently render
  // the first mesh's texture across the whole group.
  const groups = new Map();
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    if (o.children && o.children.length) return;
    if (o.userData && o.userData.skipInstancing) return;
    if (o.parent && o.parent.name) return; // grupo nomeado = lógica própria
    const g = o.geometry;
    if (!g || !g.type || g.attributes == null) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m) return;
    if (m.transparent) return;
    if (m.emissive && m.emissive.getHex && m.emissive.getHex() !== 0) return;
    let params = '';
    try { params = JSON.stringify(g.parameters || {}); } catch { params = '?'; }
    const key = `${g.type}|${params}|${materialKey(m)}|parent:${o.parent ? o.parent.uuid : 'root'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });

  let merged = 0;
  for (const [key, meshes] of groups) {
    if (meshes.length < minGroup) continue;
    const first = meshes[0];
    const geo = first.geometry;
    const mat = Array.isArray(first.material) ? first.material[0] : first.material;
    const parent = first.parent;
    if (!parent) continue;
    const inst = new THREE.InstancedMesh(geo, mat, meshes.length);
    inst.castShadow = first.castShadow;
    inst.receiveShadow = first.receiveShadow;
    inst.name = 'auto-instanced:' + key.slice(0, 40);
    const dummy = new THREE.Object3D();
    meshes.forEach((mesh, i) => {
      dummy.position.copy(mesh.position);
      dummy.quaternion.copy(mesh.quaternion);
      dummy.scale.copy(mesh.scale);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    parent.add(inst);
    for (const mesh of meshes) {
      // remove do PARENT REAL (pode diferir do primeiro em grupos cruzados;
      // o filtro por parent.uuid evita isso, mas segurança nunca é demais)
      if (mesh.parent) mesh.parent.remove(mesh);
      if (mesh.geometry !== geo) mesh.geometry.dispose();
    }
    merged += meshes.length;
  }
  return merged;
}
