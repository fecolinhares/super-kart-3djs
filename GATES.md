# Gates — Autonomous AAA tick (2026-09-03 FINISH gantry readability v2)

Escopo: reduzir a obstrução do pórtico FINISH na aproximação sem remover o landmark, alterar a lógica ou degradar desktop/mobile.

- [x] G1: Baseline atual re-medido antes da alteração e gap confirmado no código/artefatos.
  EVIDENCE: `git status --short --branch`, HEAD `82539e6`; auditoria vision confirmou banner dominante; baseline `1.05m`, y=4.70.

- [x] G2: Alteração completa torna o pórtico/bandeira menos dominante mantendo landmark legível em desktop e mobile.
  EVIDENCE: `TrackBuilder.js` usa banner `0.68m` em y `4.92` e bannerBack sincronizado; vision GPU v2 confirmou faixa mais fina, mais pista visível e FINISH reconhecível em `1280x720` e `390x844`. O recorte lateral mobile da câmera de inspeção permanece limitação do enquadramento, não do mesh.

- [x] G3: Checks estáticos e build de produção passam usando SK3D_OUT_DIR fora do worktree.
  EVIDENCE: `node --check src/main.js` + `SK3D_OUT_DIR=/tmp/sk3d-dist-finish-v2b npm run build` → `44 modules transformed`, `902.68 kB`, `✓ built in 2.24s`.

- [x] G4: Regressão determinística de AI passa nas duas pistas, sem backwards/lost/crash.
  EVIDENCE: `node scripts/ai-backwards-test.mjs 20 1` e `... 20 2` → ambos `TOTAL LOST EVENTS: 0`, `TOTAL BACKWARDS EVENTS: 0 / 20 runs`, `CRASHES: 0`.

- [x] G5: GPU runner LXC105 captura desktop e mobile em Meadow com ANGLE/Vulkan/RADV PHOENIX, pageErrors vazio e término normal.
  EVIDENCE: `capture-finish-gpu.cjs` v2 → desktop canvas `1280x720`, mobile `390x844`, GPU `ANGLE ... RADV PHOENIX`, `pageErrors=[]`, `ok=true`; arquivos `qa-gpu-runner/finish-v2-{desktop,mobile}/finish.png`.

- [x] G6: Comparação visual pós com o mesmo protocolo confirma menor competição/obstrução sem regressão de framing, HUD ou controles.
  EVIDENCE: A/B pareado baseline v1→v2 no mesmo capturador GPU; vision v2 identificou banner mais fino/elevado e maior área de pista em ambos os viewports, sem artefato novo. Delta bruto v1→v2: desktop/mobile medido em capturas separadas; nenhuma nota AAA absoluta alegada.

- [x] G7: Docs de projeto, vault, wiki index/log/entidade e memória atualizados; commit atômico pushado em origin/main; qa-gpu-runner não staged.
  EVIDENCE: commit `fe64533` contém somente `GATES.md`, `docs/AAA-AUTONOMOUS-2026-09-02.md` e `src/track/TrackBuilder.js`; `git push origin main` atualizou `82539e6..fe64533`; `qa-gpu-runner/` não foi staged.
