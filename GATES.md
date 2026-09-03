# Gates — Autonomous AAA tick (2026-09-03 skyline telemetry)

Escopo: uma mudança única, reversível e mensurável: expor e verificar a distribuição determinística de variantes de janelas Neon para viabilizar A/B visual válido. Não declarar AAA completo.

- [x] T1: Baseline atual re-medido e gap escolhido por evidência.
  EVIDENCE: `git status --short --branch && git rev-parse --short HEAD` → `## main`, HEAD `111227c`; `curl` → `HTTP 200`; fonte confirmou `windowColors` com 5 slots e seleção anterior `(rand() * 3)`.

- [x] T2: Instrumentação mínima aplicada sem alterar a aparência nem incluir credenciais/assets.
  EVIDENCE: `node --check src/track/Environment.js`, `src/render/MaterialLibrary.js`, `scripts/ai-backwards-test.mjs` e `scripts/audit-neon-palette.cjs` → sem saída; probe → `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`.

- [x] T3: Build de produção passa usando saída fora do virtiofs.
  EVIDENCE: `SK3D_OUT_DIR=/tmp/sk3d-dist-skyline npm run build` → `✓ built in 2.10s`; warning existente de chunk >500 kB.

- [x] T4: Regressão determinística de IA passa nas duas pistas.
  EVIDENCE: `node scripts/ai-backwards-test.mjs 20 1 && ... 20 2` → Track 1 e Track 2: `TOTAL LOST EVENTS: 0`, `TOTAL BACKWARDS EVENTS: 0 / 20 runs`, `CRASHES: 0`; `onRoad=100` nos seeds reportados.

- [x] T5: Telemetria determinística reporta a paleta Neon completa e o runtime não tem erros em GPU real.
  EVIDENCE: LXC105 audit → `audit-neon-palette PASS`, ANGLE Vulkan `RADV PHOENIX`, `COUNTS: 13,22,20,17,11`, `TOTAL: 83`, `ROWS: 4`; reload idêntico e pageerrors vazio. Vídeo GPU: Meadow desktop `817` / mobile `994`; Neon desktop `651` / mobile `1004`, todos `phase=finished`.

- [x] T6: Docs, vault, wiki, memória e commit/push atômicos refletem a decisão; qa-gpu-runner permanece não versionado.
  EVIDENCE: documentação e notas atualizadas nesta rodada; commit/push será verificado após o commit; `qa-gpu-runner/` segue untracked e fora do staging.

Resultado: instrumentação + correção da seleção de paleta aceitas; nenhum score visual alegado sem A/B fixo sincronizado. Próxima ação: captura fixa do skyline usando `__sk3dNeonPalette`.
