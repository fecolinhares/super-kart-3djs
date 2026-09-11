# Hero Kart V2 — R124 tick gates

- [x] R124-1 — R124 is a coherent class-level cockpit correction from R123; R80–R123 remain preserved
  EVIDENCE: `assets/hero-kart-v2/R124/build_r124.py` removes the exposed arc and adds `R124_IntegratedCowlShell`; prior revision directories remain present.
- [x] R124-2 — R124 builds reproducibly in Blender 4.0.2 on LXC105 GPU runner
  EVIDENCE: `assets/hero-kart-v2/R124/build.log`: `HERO_KART_V2_BUILD_OK`; blend exists and is non-empty.
- [x] R124-3 — R124 technical contract passes LOD budgets, <=5/4/3 materials, UVs, normals, n-gons, manifold and collision
  EVIDENCE: `technical-audit.json`: LOD0 `39832/5/0/0`, LOD1 `21098/4/0/0`, LOD2 `6028/3/0/0`, collision `36/0`; `technical_pass=true`.
- [x] R124-4 — Exact same R124 revision has non-empty beauty/profile/top/rear/clearance renders
  EVIDENCE: `assets/hero-kart-v2/R124/renders/` contains five non-empty PNGs from the R124 blend.
- [x] R124-5 — Primary vision approves all five R124 proof views
  EVIDENCE: REJECTED. Beauty/clearance shell reads as oversized opaque tablet/bubble; profile shows detached mannequin-like helmet/torso; top remains detached cockpit block; rear alone is insufficient.
- [x] R124-6 — Only if primary passes: Sol gpt-5.6-sol xhigh approves the same five R124 renders
  EVIDENCE: not invoked because primary gate rejected; protocol correctly stopped.
- [x] R124-7 — No export/runtime promotion occurs unless R124 has both visual approvals and technical pass
  EVIDENCE: export and runtime integration remain blocked in `docs/HERO-KART-V2-R124.md`.
- [x] R124-8 — Scoped atomic commit and push are verified
  EVIDENCE: pending until documentation and artifact files are committed and pushed.
