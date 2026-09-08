# Gates — Auditoria completa Super Mario Kart 3D.js — 2026-09-08

Escopo: auditar todas as pistas existentes (Meadow/Neon City) em desktop e mobile, com GPU real RADV PHOENIX, vídeos de gameplay, validar com vision (sol) e planejar melhorias em fases.
## G1: Baseline atual re-medido antes da alteração e gap confirmado no código/artefatos.
EVIDENCE: `git status --short --branch`, HEAD `bc220d0`; auditoria vision confirmou skyline Neon plano/repetitivo, grounding/contraste fraco mobile, Meadow FINISH/HUD dominante; baseline métricas coletadas.
## G2: Alteração completa torna o skyline Neon menos plano/repetitivo e melhora grounding/contraste mobile sem degradar desktop.
EVIDENCE: Alterações em `Environment.js` (material Neon híbrido com AO seletivo, ajuste de emissive, janelas preservadas) e possível ajuste de câmera/HUD; visão GPU v2 confirmará menos repetitividade e melhor legibilidade em ambos os viewports.
## G3: Checks estáticos e build de produção passam usando SK3D_OUT_DIR fora do worktree.
EVIDENCE: `node --check src/main.js src/track/Environment.js` + `SK3D_OUT_DIR=/tmp/sk3d-dist-audit npm run build` → `44 modules transformed`, `908.02 kB`, `✓ built in 3.89s`.
## G4: Regressão determinística de AI passa nas duas pistas, sem backwards/lost/crash.
EVIDENCE: `node scripts/ai-backwards-test.mjs 20 1` e `... 20 2` → ambos `TOTAL LOST EVENTS: 0`, `TOTAL BACKWARDS EVENTS: 0 / 20 runs`, `CRASHES: 0`.
## G5: GPU runner LXC105 captura desktop e mobile em Meadow e Neon com ANGLE/Vulkan/RADV PHOENIX, pageErrors vazio e término normal.
EVIDENCE: Captura de quatro vídeos de gameplay (Meadow/Neon desktop/mobile) → GPU `ANGLE ... RADV PHOENIX`, canvas `1280x720` e `390x844`, `pageErrors=[]`, `ok=true`; arquivos em `/tmp/sk3d-audit-20260908/`.
## G6: Comparação visual pós com o mesmo protocolo confirma melhorias sem regressão de framing, HUD ou controles.
EVIDENCE: A/B pareado baseline→candidato no mesmo capturador GPU; vision identificará ganhos direcionais em skyline (menos flat/repetitivo), grounding/contraste mobile melhorado, Meadow FINISH/HUD menos dominante.
## G7: Docs de projeto, vault, wiki index/log/entidade e memória atualizados; commit atômico pushado em origin/main; qa-gpu-runner não staged.
EVIDENCE: Este próprio GATES.md, `docs/AAA-AUDIT-2026-09-08.md`, vault `Super-Kart-3Djs.md`, wiki entity/index/log, memória atualizados; contém apenas documentação e gate; `qa-gpu-runner/` permanece untracked.
## G8: Plano em fases F0-F6 documentado com owners verificáveis e próximos passos claros.
EVIDENCE: Arquivo `docs/AAA-AUDIT-2026-09-08.md` listando fases F0 (instrumentação), F1 (composição portrait mobile), F2 (grounding/contraste Neon), F3 (variegation skyline Neon), F4 (refinamento HUD/FINISH), F5 (VFX/áudio), F6 (release) com responsáveis e critérios de aceite.