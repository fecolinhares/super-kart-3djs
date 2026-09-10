# Gates: Hero Kart V2 — Loop persistente de aprovação dupla

Escopo: R46–R53; somente asset Blender, sem integração de runtime.

- [x] G1: Estado inicial e arquivos-fonte registrados
  CHECK: test -f /mnt/storage2TB/Coding-Projects/super-kart-3djs/assets/hero-kart-v2/hero-kart-v2.blend && test -f /mnt/storage2TB/Coding-Projects/super-kart-3djs/scripts/blender/hero_kart_v2_build.py && test -f /mnt/storage2TB/Coding-Projects/super-kart-3djs/scripts/blender/hero_kart_v2_render.py
  EXPECT: 
  EVIDENCE: arquivos existem; R53 build/render rc=0.

- [x] G2: R53 corrige a leitura do para-brisa
  CHECK: test -s /mnt/storage2TB/Coding-Projects/super-kart-3djs/assets/hero-kart-v2/hero-kart-v2.blend
  EXPECT: 
  EVIDENCE: `.blend` final R53 com 707805 bytes; canopy convexa/translúcida.

- [x] G3: Render e métricas da rodada final existem
  CHECK: test -s /mnt/storage2TB/Coding-Projects/super-kart-3djs/assets/hero-kart-v2/renders/beauty.png && test -s /mnt/storage2TB/Coding-Projects/super-kart-3djs/assets/hero-kart-v2/metrics.json
  EXPECT: 
  EVIDENCE: `beauty.png` e `metrics.json` R53 presentes; métricas 29183 bytes.

- [x] G4: Vision independente aprovou R53
  EVIDENCE: vision própria aprovou beauty/profile/top/clearance R53.

- [x] G5: Sol aprovou a mesma R53
  EVIDENCE: Sol `gpt-5.6-sol` + `xhigh` + vision aprovou R53; sessão `20260910_153744_40deff`.

- [x] G6: Build/render executaram; validação estrutural completa
  ABANDON: `metrics.json` retorna `all_structural_gates_pass=false` e o validator rc=2 por budgets/manifold/normais históricos de LOD0–LOD2. Não declarar prontidão técnica para integração.
  EVIDENCE: build rc=0, render rc=0, Blender 4.0.2; bloqueio estrutural documentado em `docs/HERO-KART-V2-R46-R53.md`.

- [x] G7: Repo, vault, wiki e memória atualizados sem secrets
  EVIDENCE: repo docs/assets, vault `coding/Super-Kart-3Djs.md`, wiki entity/index/log e memória atualizados.

- [x] G8: Commits e pushes verificados
  EVIDENCE: commit de artefato `320abf3f11c49bd849252cca83950f989768dffa` e commit final `5f29bbc6abb1c167f47c0d86ddf396488b64da54`; ambos pushados; `git ls-remote origin/main` confirmou `5f29bbc6abb1c167f47c0d86ddf396488b64da54`.

Regra de continuidade cumprida: R46–R52 foram rejeitadas/registradas e o loop só encerrou após vision e Sol aprovarem a mesma R53. Broken pipe do Sol foi tratado com retries mínimos; nunca contado como aprovação.
