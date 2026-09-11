# Hero Kart V2 — autonomous convergence gates

- [x] R121-1 — Class-level cockpit generator revision created; R117/R118/R119/R120 preserved
  EVIDENCE: `assets/hero-kart-v2/R121/build_r121.py`; prior checkpoint directories remain present.
- [x] R121-2 — R121 built reproducibly in Blender 4.0.2 on LXC105
  EVIDENCE: `assets/hero-kart-v2/R121/build.log`: `HERO_KART_V2_BUILD_OK`; `hero-kart-v2-R121.blend` exists.
- [x] R121-3 — R121 technical audit passes
  EVIDENCE: `assets/hero-kart-v2/R121/technical-audit.json`: LOD0 38772 tri/5 mats/0 non-manifold; LOD1 21098/4/0; LOD2 6028/3/0; collision 36/0; all structural gates true.
- [x] R121-4 — Five R121 proof renders exist
  EVIDENCE: `assets/hero-kart-v2/R121/renders/` contains beauty/profile/top/rear/clearance PNGs, all non-empty.
- [ ] R121-5 — Primary vision approves all five R121 proof views
  EVIDENCE: REJECTED. Beauty/profile still read as a procedural mannequin and the cockpit module remains insufficiently authored for AAA approval.
- [ ] R121-6 — Sol gpt-5.6-sol with xhigh approves exact same five R121 renders
  EVIDENCE: not invoked because primary visual gate failed.
- [ ] R121-7 — Final artifact/export/runtime promotion
  EVIDENCE: blocked by primary visual rejection; export/runtime intentionally not integrated.
- [ ] R121-8 — Accepted revision committed/pushed and remote HEAD verified
  EVIDENCE: no production revision accepted in this cycle.
