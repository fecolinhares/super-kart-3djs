# Gates — Autonomous AAA tick (2026-09-03 canvas-only skyline A/B)

Escopo: corrigir o bloqueador de evidência do skyline Neon. O harness fixo ainda captura DOM/UI junto do canvas e o A/B reporta delta alto; esta rodada isola o framebuffer do jogo sem alterar o runtime normal. Nenhuma mudança cosmética será aceita sem comparação pareada no mesmo runner.

- [x] T1: Baseline re-medido antes da alteração e gap confirmado no estado git/artefatos atuais.
  EVIDENCE: `git status --short --branch` → `## main` + `qa-gpu-runner/` não versionado; HEAD `13906af`; build baseline verde; JSON anterior reporta RADV PHOENIX e delta histórico `0.415136`.

- [x] T2: Harness captura exclusivamente o canvas WebGL por clip CDP derivado do bounding rect, mantendo viewport/câmera/GPU e metadados existentes.
  EVIDENCE: `node --check scripts/capture-skyline-fixed.cjs` verde; fonte contém `canvas.getBoundingClientRect()` e `Page.captureScreenshot({ clip: probe.canvasClip })`.

- [x] T3: Build de produção e regressão determinística de AI passam após a alteração.
  EVIDENCE: `SK3D_OUT_DIR=/tmp/sk3d-dist-canvas-a-b npm run build` verde; Track 1/2, 20 seeds: `0 lost / 0 backwards / 0 crashes`.

- [x] T4: Capturas desktop e mobile no GPU runner LXC105 confirmam ANGLE Vulkan/RADV PHOENIX, canvas não vazio, pageErrors vazio e artefatos completos.
  EVIDENCE: 3 JSONs em `qa-gpu-runner/tick-skyline-canvas-only/{a,b,mobile}` passaram o probe: GPU `ANGLE ... RADV PHOENIX`, `pageErrors=[]`, canvas `1280×720` desktop e `390×844` mobile; arquivos PNG presentes.

- [x] T5: A/B canvas-only é direcionalmente mais estável que o baseline documentado, ou a mudança é revertida honestamente; nenhuma aparência do jogo é alegada sem evidência visual temporal.
  EVIDENCE: comparação idêntica desktop reduziu `mean_abs_channel` de `0.023990162` para `0.010919777` (−54.48% calculado), embora changed-pixel ratio tenha subido `0.008763021→0.026639540`; decisão aceita somente como melhoria do ferramental de A/B, sem alegação de ganho visual do jogo. Vision confirmou framebuffer não vazio e ausência de HUD/menu HTML na captura canvas-only.

- [x] T6: Docs, vault, wiki, memória e commit/push refletem decisão final; qa-gpu-runner permanece fora do staging.
  EVIDENCE: docs/vault/wiki atualizados; commit/push atômico verificado em `origin/main`; `git diff --cached --name-only` não contém `qa-gpu-runner/`.
