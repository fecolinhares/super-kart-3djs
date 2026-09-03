# Gates — Autonomous AAA tick (2026-09-03 fixed skyline A/B)

Escopo: uma mudança única, reversível e mensurável: executar a captura fixa do skyline Neon já instrumentada, decidir pela evidência se existe ganho visual aceitável; se houver, aplicar somente o menor ajuste demonstrável.

- [x] T1: Baseline atual e gap de maior valor re-medidos antes de editar código.
  EVIDENCE: `git status --short --branch && git rev-parse --short HEAD` → `## main`, HEAD `bcd60fd`, único estado não versionado permitido `qa-gpu-runner/`; `curl http://localhost:3457/` → `HTTP 200`; gap confirmado no relatório: A/B fixa do skyline.

- [x] T2: A/B fixa do skyline Neon usa o mesmo harness, a mesma câmera e a mesma resolução, com GPU real confirmada.
  EVIDENCE: novo `scripts/capture-skyline-fixed.cjs`; duas execuções desktop e uma mobile no LXC105 com viewport `1280x720`/`390x844`, câmera derivada de `track.path` (`fov=48`), `phase=idle`; todas reportaram `ANGLE Vulkan ... RADV PHOENIX`, paleta `13,22,20,17,11`, total `83`, `pageErrors=[]`.

- [x] T3: Decisão de implementação é baseada em evidência: melhoria aceita com delta visual ou nenhuma alteração/reversão documentada.
  EVIDENCE: comparação de duas capturas desktop do mesmo harness: `pixels_different=382589/921600 (0.415136)`, `mean_abs=1.5608`; diferença concentrada em gameplay/UI animados (`sky=0.1103`, `road=0.7558`). Não há pré/pós de código visual nem delta direcional defensável; nenhuma alteração de aparência foi aceita. O harness de captura fixa foi aceito como melhoria de QA.

- [x] T4: Build de produção passa usando saída fora do virtiofs e regressão determinística de IA passa nas duas pistas.
  EVIDENCE: `SK3D_OUT_DIR=/tmp/sk3d-dist-skyline-fixed npm run build` → `✓ built in 2.14s`, bundle `902.67 kB`; `node --check` passou; `ai-backwards-test.mjs 20 1/2` → `TOTAL LOST EVENTS: 0`, `TOTAL BACKWARDS EVENTS: 0 / 20 runs`, `CRASHES: 0` em ambas.

- [x] T5: Runtime GPU real pós-decisão não tem page errors e confirma RADV PHOENIX; capturas desktop/mobile Meadow/Neon são artefatos válidos.
  EVIDENCE: fixed skyline JSONs registram `pageErrors=[]`, canvas `1280x720` e `390x844`; vídeos GPU do ciclo corrente permanecem válidos: Meadow `817` desktop/`994` mobile, Neon `651` desktop/`1004` mobile, todos `phase=finished`; captura fixa Neon desktop/mobile em `qa-gpu-runner/tick-skyline-fixed/`.

- [x] T6: Docs, vault, wiki, memória e commit/push atômicos refletem o resultado; qa-gpu-runner permanece não versionado.
  EVIDENCE: `docs/AAA-AUTONOMOUS-2026-09-02.md`, vault `Super-Kart-3Djs.md`, wiki entity/index/log atualizados; commit/push registrados no relatório final; `qa-gpu-runner/` continua fora do staging.
