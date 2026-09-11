# Hero Kart V2 — autonomous convergence gates

- [x] R117-1 — Authored generator and machine-readable contract corrected before build; R116 preserved
  EVIDENCE: `assets/hero-kart-v2/R117/build_r117.py` and `agentic-contract.json`; R116 untouched.

- [x] R117-2 — R117 built reproducibly in Blender 4.0.2 on GPU runner without overwriting prior checkpoints
  EVIDENCE: `/mnt/storage2TB/Coding-Projects/super-kart-3djs/assets/hero-kart-v2/R117/hero-kart-v2-R117.blend` non-empty; runner output `HERO_KART_V2_BUILD_OK`.

- [x] R117-3 — Five canonical renders exist for R118
  EVIDENCE: `assets/hero-kart-v2/R118/renders/` contains beauty.png, profile.png, top.png, rear.png, clearance.png.

- [x] R117-4 — R117 technical contract passes budgets, manifold, normals, UVs, n-gons, scale, materials and collision
  EVIDENCE: `assets/hero-kart-v2/R117/technical-audit.json`: `technical_pass=true`; LOD0 40588/5/0/0, LOD1 21098/4/0/0, LOD2 6028/3/0/0, collision 36.

- [ ] R118-5 — Primary vision approves all five R118 proof views on actual pixels
  EVIDENCE: REJECTED. Beauty, profile, top, rear and clearance all failed the cockpit/driver/windshield P0 gate; see `docs/HERO-KART-V2-R117-R118.md`.

- [ ] R118-6 — Sol gpt-5.6-sol with xhigh approves the exact same five R118 renders after primary pass
  EVIDENCE: not invoked because primary gate failed; no approval inferred.

- [ ] R118-7 — Final artifacts and documentation are read back; no runtime/export integration before dual approval
  EVIDENCE: checkpoints and docs read back; final delivery remains blocked by visual gate.

- [ ] R118-8 — Atomic accepted changes are committed and pushed; unrelated pre-existing worktree files are not staged
  EVIDENCE: pending because revision is rejected and no accepted production change is being published.
