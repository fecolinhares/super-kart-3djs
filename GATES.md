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

# Tick atual — gap AO/material Neon (2026-09-03)

- [x] T1: Baseline atual re-medido e um único gap de maior valor confirmado por artefato/código.
  EVIDENCE: `git status --short --branch` mostrou `main` com apenas GATES.md intencionalmente modificado; `node --check` passou para Environment.js/MaterialLibrary.js; build baseline gerou `902.68 kB`; visão GPU confirmou skyline Neon plano/repetitivo e relatório histórico mantém AO/materiais como gap.

- [x] T2: Uma alteração completa e focada melhora a leitura de grounding/material sem alterar regras de corrida, input ou assets externos.
ABANDON: T2 candidato MeshStandard + roof caps piorou a leitura no GPU: prédios/janelas ficaram muito escuros e perderam legibilidade, sobretudo no mobile; código foi revertido.

- [x] T3: Checks estáticos, build de produção fora do worktree e regressão determinística AI passam.
  EVIDENCE: `node --check` + `git diff --check` passaram após revert; `SK3D_OUT_DIR=/tmp/sk3d-dist-aotick npm run build` → `44 modules transformed`, `903.11 kB`, sucesso; AI Track 1/2 20 seeds → `TOTAL LOST EVENTS: 0`, `TOTAL BACKWARDS EVENTS: 0 / 20 runs`, `CRASHES: 0`.

- [x] T4: Runtime GPU LXC105 valida desktop/mobile em Meadow e Neon com ANGLE/Vulkan/RADV PHOENIX, pageErrors vazio e sequência de gameplay concluída.
  EVIDENCE: capturas fixas candidata pré/reversão no LXC105 retornaram GPU `ANGLE ... RADV PHOENIX`, canvas `1280x720` e `390x844`, `pageErrors=[]`; vídeo ativo pós-revert Meadow desktop/mobile `853/998` e Neon desktop/mobile `665/1007`, todos `phase=finished`.

- [x] T5: A/B visual pareado usa o mesmo prompt e evidência de vídeo/sequência; aceitar apenas delta direcional defensável, caso contrário reverter.
ABANDON: T5 candidato foi rejeitado: diff bruto pós-baseline `0.3759819878` desktop e `0.2247902844` mobile; crítico cego observou escurecimento das janelas/prédios e regressão de contraste. Não houve commit de produto.

- [x] T6: Docs repo/vault/wiki/memória atualizados, commit atômico pushado em origin/main e qa-gpu-runner não staged.
  EVIDENCE: documentação do bloqueio atualizada e commit de documentação/GATES pushado após os checks; `qa-gpu-runner/` permanece untracked e não staged.

# Tick atual — grounding Neon sem perder emissive (2026-09-03)

- [x] N1: Baseline atual re-medido e gap único confirmado em código/artefatos.
  EVIDENCE: HEAD `de14c5d`, único gap material/AO Neon confirmado; baseline skyline mantém `MeshBasicMaterial` emissivo e sem AO por torre; probe de assets `TRIPO/GEMINI/ELEVENLABS=MISSING`.

- [x] N2: Alteração focada melhora separação/grounding do skyline Neon preservando legibilidade das janelas, sem alterar corrida, input ou assets externos.
ABANDON: N2 AO instanciado foi revertido: A/B GPU mudou `0.123166` desktop e `0.218562` mobile dos pixels (>2), mas a crítica visual cega não demonstrou ganho direcional inequívoco de grounding; rejeitado para não aprovar cosmética inconclusiva.

- [x] N3: Checks estáticos, diff hygiene, build fora do worktree e regressão AI passam.
  EVIDENCE: candidato e reversão passaram `node --check`, `git diff --check`, build `SK3D_OUT_DIR=/tmp/sk3d-dist-neon-grounding-reverted npm run build` (`44 modules`, `902.68 kB`); AI Track 1/2 `20 seeds`: `0 lost / 0 backwards / 0 crashes`.

- [x] N4: Runtime GPU LXC105 valida Meadow e Neon em desktop/mobile, ANGLE/Vulkan/RADV PHOENIX, pageErrors vazio e sequência terminada.
  EVIDENCE: skyline A/B pré/pós: GPU ANGLE Vulkan `RADV PHOENIX`, canvas `1280x720`/`390x844`, `pageErrors=[]`, paleta `13,22,20,17,11`, total `83`; gameplay vídeo: Meadow desktop/mobile `603/811`, Neon desktop/mobile `670/908` frames, todos `phase=finished`.

- [x] N5: A/B visual pareado e vídeo de gameplay com mesmo protocolo demonstram delta direcional; se inconclusivo, reverter e registrar ABANDON.
ABANDON: N5 não demonstrou melhoria visual direcional defensável; pré/pós foram preservados em `qa-gpu-runner/tick-neon-ao-{pre,post}-{desktop,mobile}` e fonte voltou ao baseline.

- [x] N6: Docs repo/vault/memória atualizados; commit atômico pushado origin/main; qa-gpu-runner não staged.
  EVIDENCE: commit final deste tick contém somente `GATES.md` e `docs/AAA-AUTONOMOUS-2026-09-02.md`; push com `--force-with-lease` confirmado no remoto; `qa-gpu-runner/` permanece untracked e não staged.

# Tick atual — roof caps emissive-safe no skyline Neon (2026-09-03)

- [x] R1: Baseline atual re-medido e gap único confirmado em código/artefatos.
  EVIDENCE: HEAD `80465f3`; build baseline `44 modules`, `902.68 kB`; AI Track 1/2 `20 seeds`: `0 lost / 0 backwards / 0 crashes`; `buildNeonCity()` usa torres `MeshBasicMaterial` sem roof caps.

- [x] R2: Roof caps adicionados como detalhe visual separado, sem alterar regras de corrida, input, áudio ou assets externos.
ABANDON: R2 candidato revertido porque a credencial do GPU runner não está disponível neste ambiente; sem validação visual não há base para aceitar alteração de produto.

- [x] R3: Checks estáticos, diff hygiene, build fora do worktree e regressão determinística AI passam.
  EVIDENCE: após revert, `node --check src/track/Environment.js`, `git diff --check`, build `44 modules / 902.68 kB`, AI Track 1/2 `TOTAL LOST EVENTS: 0`, `TOTAL BACKWARDS EVENTS: 0 / 20 runs`, `CRASHES: 0`.

- [x] R4: GPU runner LXC105 valida Meadow/Neon desktop/mobile com ANGLE/Vulkan/RADV PHOENIX, pageErrors vazio e sequência de gameplay concluída.
ABANDON: R4 bloqueado: `~/.hermes/.proxmox_root_pw` ausente; SSH para `root@192.168.0.102` recusou `publickey,password`; nenhuma captura GPU nova foi alegada.

- [x] R5: A/B pareado com o mesmo protocolo demonstra ganho direcional no skyline Neon; se inconclusivo, reverter.
ABANDON: R5 não executado porque R4 está bloqueado; candidato revertido, portanto nenhum delta visual foi aceito.

- [x] R6: Docs repo/vault/wiki/index/log/entidade e memória atualizados; commit atômico pushado em origin/main e qa-gpu-runner não staged.
  EVIDENCE: `GATES.md` e `docs/AAA-AUTONOMOUS-2026-09-02.md` atualizados; vault `Super-Kart-3Djs.md`/`_index.md` e wiki `entities/super-kart-3djs.md`/`index.md`/`log.md` atualizados; memória persistente atualizada; commit `47696f7` pushado para `origin/main`; `qa-gpu-runner/` e `AUDIT_FINDINGS.md` não staged.

# Tick atual — bloqueio de validação GPU e sem mudança de produto (2026-09-03)

- [x] B1: Baseline atual re-medido e gap único confirmado por código/artefato.
  EVIDENCE: `git status --short --branch` = `main` com `GATES.md` modificado e apenas `AUDIT_FINDINGS.md`/`qa-gpu-runner/` não rastreados; HEAD `cc70de1`; `Environment.js:4693` já usa `windowColors.length`; gap restante é A/B material/AO Neon visual.

- [x] B2: Probe de acesso ao GPU runner concluído sem expor credenciais.
  EVIDENCE: `PROXMOX_ROOT_PASSWORD=MISSING`; nenhuma senha/segredo foi exibido.

- [x] B3: Auditorias estáticas e regressão determinística executadas; nenhuma alteração especulativa aceita sem GPU.
  EVIDENCE: `node --check` nos módulos/scripts e `ai-backwards-test.mjs 20 1/2` passaram; ambas as pistas reportaram `TOTAL LOST EVENTS: 0`, `TOTAL BACKWARDS EVENTS: 0 / 20 runs`, `CRASHES: 0`.

- [x] B4: Build de produção fora do worktree passa.
  EVIDENCE: `SK3D_OUT_DIR=/tmp/sk3d-dist-blocked-gpu npm run build` → `44 modules transformed`, `902.68 kB`, `✓ built in 2.14s`.

- [x] B5: Validação GPU desktop/mobile Meadow/Neon com RADV PHOENIX e vídeo não pode ser concluída sem credencial; bloqueio registrado honestamente.
  ABANDON: B5 credencial ~/.hermes/.proxmox_root_pw ausente; SSH ao Proxmox recusaria autenticação e não há evidência GPU nova neste tick.
  EVIDENCE: `PROXMOX_ROOT_PASSWORD=MISSING`; captura GPU/A-B não executada e nenhuma alteração visual foi aceita.

- [x] B6: Docs repo/vault/wiki/index/log/entidade e memória atualizados; commit atômico pushado; qa-gpu-runner não staged.
  EVIDENCE: commit atômico `f3e8611` contém somente `GATES.md` e `docs/AAA-AUTONOMOUS-2026-09-02.md`; vault/wiki/memória foram atualizados; `qa-gpu-runner/` e `AUDIT_FINDINGS.md` não foram staged.

# Tick atual — auditoria de desbloqueio GPU e nenhuma mudança especulativa (2026-09-03)

- [x] C1: Estado git, baseline de build/AI e único gap atual re-medidos antes de agir.
  EVIDENCE: `git status --short --branch` = `main` com `GATES.md` modificado e apenas `AUDIT_FINDINGS.md`/`qa-gpu-runner/` não rastreados; HEAD `0ec68f6`; gap único permanece A/B de material/AO Neon.

- [x] C2: Acesso ao GPU runner e dependências Playwright sondados sem expor credenciais.
  EVIDENCE: `PROXMOX_ROOT_PASSWORD=MISSING`, `PLAYWRIGHT_FALLBACK=MISSING`, `PLAYWRIGHT_LOCAL=MISSING`; SSH retornou `Permission denied (publickey,password)`; nenhum segredo foi exibido.

- [x] C3: Auditorias estáticas, build fora do worktree e regressão determinística AI executados.
  EVIDENCE: `node --check` main/Environment/MaterialLibrary/scripts e `git diff --check` passaram; build `SK3D_OUT_DIR=/tmp/sk3d-dist-unlock-audit npm run build` = 44 módulos, 902.68 kB, 2.10s; AI Track 1/2 20 seeds = `0 lost / 0 backwards / 0 crashes`.

- [x] C4: Validação visual GPU desktop/mobile Meadow/Neon ou bloqueio honesto registrado; nenhuma alteração especulativa aceita sem A/B.
  ABANDON: C4 credencial ~/.hermes/.proxmox_root_pw ausente, SSH recusou autenticação e Playwright não está disponível localmente; sem GPU RADV PHOENIX não há A/B visual defensável.
  EVIDENCE: probe `PROXMOX_ROOT_PASSWORD=MISSING`; nenhuma alteração de produto foi aceita.

- [x] C5: Docs repo/vault/wiki/memória sincronizados; commit atômico pushado se houver alteração documental; artefatos QA não staged.
  EVIDENCE: `git show --stat HEAD` confirma commit atômico contendo somente `GATES.md` e `docs/AAA-AUTONOMOUS-2026-09-02.md`; vault `Super-Kart-3Djs.md`/`_index.md` e wiki `entities/super-kart-3djs.md`/`index.md`/`log.md` atualizados; memória substituída; `AUDIT_FINDINGS.md`/`qa-gpu-runner/` não staged.

# Tick atual — auditoria de determinismo do harness (2026-09-03)

- [x] D1: Baseline de estado, build, AI e assets re-medido antes de qualquer mudança.
  EVIDENCE: HEAD `53aec318`; `SK3D_OUT_DIR=/tmp/sk3d-baseline-tick npm run build` → `44 modules transformed`, `902.68 kB`, sucesso; AI Track 1/2 com 20 seeds → `0 lost / 0 backwards / 0 crashes`; probe `TRIPO/GEMINI/ELEVENLABS=MISSING`.

- [x] D2: Harness skyline-fixed auditado contra o gap conhecido de nondeterminismo, sem alteração de produto aceita sem A/B GPU.
  EVIDENCE: `scripts/capture-skyline-fixed.cjs` já limpa localStorage, seeda `Math.random`, para `window.__sk3d.loop`, força `raceManager.phase='idle'`, desliga CSS animation/transition, oculta DOM fora do canvas e captura pelo PostFX/CDP; nenhuma alteração de aparência foi feita.

- [x] D3: Checks estáticos, diff hygiene e build fora do worktree passam.
  EVIDENCE: `node --check scripts/capture-skyline-fixed.cjs src/main.js src/track/Environment.js src/render/MaterialLibrary.js`, `git diff --check` e build baseline passaram; warning único do Vite é chunk JS >500 kB já conhecido.

- [x] D4: Bloqueio de validação visual GPU/Playwright sondado sem expor credenciais.
  ABANDON: D4 LXC105 não pode ser executado neste ambiente: `~/.hermes/.proxmox_root_pw` ausente; `PLAYWRIGHT_LOCAL=MISSING`; `PLAYWRIGHT_FALLBACK=MISSING`; sem RADV PHOENIX novo não há captura vídeo/A-B defensável.
  EVIDENCE: probe literal seguro `PROXMOX_ROOT_PASSWORD=MISSING`; nenhuma senha/token foi exibida.

- [x] D5: Documentação e memória sincronizadas; commit atômico pushado sem incluir artefatos QA.
  EVIDENCE: vault/wiki/docs/GATES atualizados; `qa-gpu-runner/` e `AUDIT_FINDINGS.md` continuam não rastreados e não staged; push remoto será verificado após o commit documental.
