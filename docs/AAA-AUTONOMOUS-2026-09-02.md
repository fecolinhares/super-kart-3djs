# AAA Autonomous QA — 2026-09-02

## [2026-09-03T19:42Z] Autonomous tick — owner de performance revalidado, sem mudança de produto
- Baseline re-medido em `HEAD 0a4a8ed`; `src/` permaneceu sem diff. O owner mensurável continua `kart-ai` com `1175 meshes/199650 tris` no breakdown anterior.
- Checks locais passaram: `node --check` nos módulos/runtime/QA, `git diff --check`; build externo via `SK3D_OUT_DIR=/tmp/sk3d-dist-current-tick npm run build` → `44 modules transformed`, `903.92 kB`, `2.09s`; AI Track 1/2 ×20 → `0 lost / 0 backwards / 0 crashes`.
- Runner direto voltou: `192.168.0.195` confirmou `/opt/pwtest` e Chromium; auditoria confirmou WebGL2, ANGLE/Vulkan `RADV PHOENIX`, `pageErrors=[]`. Render breakdown atual: Meadow desktop/mobile `1948/977 calls`, `1,089,095/819,717 tris`; o custo segue alto.
- Vídeo ativo `?demo` terminou `phase=finished` em Meadow/Neon desktop/mobile com `849/998/689/1007` frames. Não houve redução isolada de calls/frame-time demonstrada; a tentativa anterior de `castShadow=false` em `kart-ai` já havia piorado calls no mobile e não foi repetida como produto.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Sem candidato seguro comprovado, nenhum arquivo `src/` foi alterado ou commitado. Próximo gap: probe fixo temporalmente pareado de outro owner/pass, priorizando uma redução mensurável sem degradar a leitura visual.

## [2026-09-03T18:54Z] Autonomous tick — `kart-ai` shadow-caster candidate rejected
- Baseline re-measured at `HEAD a321b24`; `kart-ai` owner was `1175 meshes/199650 tris` in the existing GPU breakdown.
- Candidate disabled `castShadow` only for AI kart descendants. Static checks/build passed (`44 modules`, `904.05 kB`, `2.44s`) and AI Track 1/2 ×20 stayed at `0 lost / 0 backwards / 0 crashes`.
- Direct LXC105 probe confirmed Chromium/Playwright/GPU; active runs used ANGLE/Vulkan `RADV PHOENIX`, ended `phase=finished`, with frames pre/post desktop `664/676` and mobile `1006/1007`.
- Structural probe measured `aiCasters 82→0` and total casters `220→138`, but renderer calls remained unreliable (`calls=1` in both fixed boots). Free-running frame diff (`0.928549` desktop, `0.534714` mobile) was not a valid quality proxy because timing/positions differed.
- Decision: **REVERTED / NO PRODUCT CHANGE ACCEPTED**. The source returned clean; next gap remains an isolated owner reduction only with a deterministic fixed-frame/performance probe.

## [2026-09-03T18:38Z] Autonomous tick — runner bloqueado, sem delta de produto
- Baseline real re-medido no `HEAD e281201`; `src/` permaneceu limpo e o gap sustentado continua sendo um owner Neon mensurável/material-AO, sem candidato aceito.
- Checks passaram: `node --check` nos módulos críticos, `git diff --check`; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-rt npm run build` → `44 modules transformed`, `903.92 kB`, `✓ built in 2.13s`.
- AI Track 1/2 ×20 passou com `0 lost / 0 backwards / 0 crashes`; dev server respondeu `HTTP_STATUS=200`.
- Probes seguros: password file Proxmox `MISSING`, `/opt/pwtest` e fallback Playwright `MISSING`, `SSHPASS=MISSING`; geradores somente estados redigidos. Probe remoto terminou `REMOTE_PROBE=NO_PASSWORD_FILE`.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Sem LXC105/RADV PHOENIX não houve vídeo desktop/mobile ou A/B visual; próximo gap é testar uma redução de owner isolado (`kart-ai` ou PostFX) somente quando a rota GPU retornar.

## [2026-09-03T18:24Z] Autonomous tick — runner bloqueado, sem mudança de produto
- Baseline real re-medido no `HEAD e91b118`: `src/` sem diff; auditor de budget mantém `kart-ai` como owner mensurável, mas não há redução segura sem A/B.
- Checks passaram: `node --check`/`git diff --check`; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-rt npm run build` → `44 modules`, `903.92 kB`, `✓ built in 2.15s`.
- AI Track 1/2 ×20 passou com `0 lost / 0 backwards / 0 crashes`; dev server `HTTP 200`.
- Probe seguro: `PWFILE=MISSING`, browser local presente mas `/opt/pwtest` e fallback ausentes; tentativa SSH sem segredo terminou `SSH_RC=139`. Sem LXC105/RADV PHOENIX novo, vídeo/A-B não é defensável.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Próximo gap: testar redução isolada de `kart-ai` ou passe PostFX quando a rota GPU verificável retornar.

## [2026-09-03T18:10Z] Autonomous tick — revalidação após instrumentação, sem mudança de produto
- Baseline re-medido no `HEAD b6aab8a`; `src/` permaneceu sem diff. O auditor de budget anterior continua sendo o único avanço aceito e mantém owners mensuráveis, mas não demonstrou ainda uma redução isolável segura.
- Checks estáticos passaram: `node --check scripts/audit-render-breakdown.cjs src/main.js src/track/Environment.js src/render/MaterialLibrary.js` e `git diff --check`.
- Build compatível com virtiofs passou via `SK3D_OUT_DIR=/tmp/sk3d-dist-rbt npm run build`: `44 modules`, `903.92 kB`, `✓ built in 2.09s`.
- Regressão determinística AI Track 1/2 ×20 passou com `0 lost / 0 backwards / 0 crashes`; dev server respondeu `HTTP 200`.
- Probe seguro do runner: `pwfile=MISSING`, Playwright local/fallback `MISSING`; sem RADV PHOENIX novo não foi possível executar vídeo/A-B visual neste ambiente. Nenhum segredo foi lido ou registrado.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Próximo gap continua a primeira redução de owner isolado — começando por `kart-ai`/passes somente quando o runner GPU voltar a ficar verificável.

## [2026-09-03T17:45Z] Autonomous tick — instrumentação de custo por subsistema/pass
- Baseline re-medido no `HEAD 3981e7e`: build externo `44 módulos/903.92 kB/2.10s`; AI Track 1/2 ×20 com `0 lost / 0 backwards / 0 crashes`.
- Adicionado `scripts/audit-render-breakdown.cjs`, auditor QA-only que lê `window.__sk3d`, separa `namedRoots`/buckets de meshes, triângulos e instancing, e lista passes PostFX. Nenhuma regra, aparência, áudio ou asset foi alterado.
- Runner direto via túnel reverso confirmou WebGL2 + ANGLE/Vulkan `RADV PHOENIX`, `pageErrors=[]`, em Meadow/Neon desktop `1280×720` e mobile `390×844`.
- Medições: Meadow desktop/mobile `1948/963 calls`, `1,089,095/818,585 tris`, `95/89 textures`, `1345/1241 geometries`; Neon desktop/mobile `1586/873 calls`, `307,268/194,118 tris`, `79/76 textures`, `1051/988 geometries`.
- Breakdown acionável: `kart-ai` = `1175 meshes/199650 tris`; Neon = `8` grupos nomeados de roof-caps/pilasters. Gameplay ativo terminou `phase=finished` com `827/991/667/1010` frames (Meadow d/m, Neon d/m).
- Decisão: **QA INSTRUMENTATION ACCEPTED; NO PRODUCT CHANGE**. O budget continua alto, mas agora há owners mensuráveis; nenhuma redução é alegada sem A/B visual isolado.

## [2026-09-03T17:16Z] Autonomous tick — budget audit pós-pilastras, sem delta de produto
- Baseline real: HEAD `cf89f07`; `src/` permaneceu sem diff de produto. Build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-current-tick npm run build` passou com `44 modules`, `903.92 kB`, `2.19s`; AI Track 1/2 ×20 retornou `0 lost / 0 backwards / 0 crashes`.
- Runtime GPU direto no runner `192.168.0.195` confirmou ANGLE/Vulkan `RADV PHOENIX`, WebGL2, `pageErrors=[]` nas capturas fixas Neon desktop/mobile (`1280×720`/`390×844`), palette `13/22/20/17/11`, total `83`.
- Budget medido no frame completo: desktop profile `high` = `1593 calls`, `307480 triangles`, `79 textures`, `1055 geometries`; mobile profile `medium` = `1057 calls`, `228098 triangles`, `76 textures`, `992 geometries`. Auditoria de cena Neon contou `1978` meshes; skyline já usa InstancedMesh/frustum culling e auto-instancing está ativo.
- Gameplay vídeo GPU terminou normalmente: Meadow desktop/mobile `847/1003` frames; Neon desktop/mobile `633/1008`; todos `phase=finished`. Nenhuma regressão funcional foi observada; não há score visual novo alegado.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. O custo está acima do budget histórico, mas não há um único owner atribuível com redução segura e A/B visual disponível nesta rodada; alterar densidade/instancing/PostFX sem alvo seria especulativo. Próximo gap: instrumentar custo por subsistema/pass e então testar uma redução isolada.

## [2026-09-03T16:50Z] Autonomous tick — pilastras de fachada Neon aceitas
- Gap único: o skyline Neon continuava legível como caixas repetidas, apesar dos roof caps aceitos; faltava articulação vertical nas fachadas.
- Candidato único aceito em `src/track/Environment.js`: pilastras estreitas nos quatro cantos de cada torre, via uma `InstancedMesh` por fileira e material navy compartilhado; não cobre a textura emissiva nem toca corrida, input, áudio ou assets.
- Checks: `node --check`, `git diff --check`; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-live-pilasters npm run build` passou com `44 módulos`, `903.92 kB`; AI Track 1/2 ×20 passou com `0 lost / 0 backwards / 0 crashes`.
- A/B fixo pareado no GPU: desktop/mobile `1280×720`/`390×844`, ANGLE Vulkan `RADV PHOENIX`, `pageErrors=[]`, paleta idêntica `13/22/20/17/11` (83 torres). Diff acima de limiar 2: desktop `58093/921600 (0.063035)`, mobile `33246/329160 (0.101003)`; mean absolute channel `0.005384/0.004166`.
- Fresh-eyes: pilastras acrescentaram bordas/ritmo vertical visível; janelas permaneceram legíveis; nenhum artefato ou obstrução foi encontrado. Vídeo ativo: Meadow desktop/mobile `812/1003` frames; Neon desktop/mobile `643/1010`; todos `phase=finished`.
- Renderer pós: `743 calls`, `165556 triangles`, `1053 geometries`, `78 textures`; calls/textures excedem o contrato inicial e ficam registrados como risco de performance, não como aprovação irrestrita.
- Decisão: **ACEITO**. Próximo gap: reduzir repetição/halo do skyline Neon com uma hipótese ainda mais localizada, ou priorizar uma auditoria de budget; não declarar AAA completo.


## [2026-09-03T16:35Z] Autonomous tick — revalidação bloqueada, sem delta de produto
- Baseline real: HEAD `7524e99`; `src/` limpo; skyline Neon mantém fachadas `MeshBasicMaterial`/`fog:false`, roof caps já aceitos e nenhum AO/material híbrido executável.
- Checks: `node --check` em `main.js`, `Environment.js` e `MaterialLibrary.js` + `git diff --check` passaram; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-rt npm run build` passou com `44 módulos`, `903.48 kB`, `2.11s`.
- Regressão determinística: Track 1/2 ×20 seeds, `0 lost / 0 backwards / 0 crashes`; assets `TRIPO/GEMINI/ELEVENLABS=MISSING`.
- Runner bloqueado honestamente: `PROXMOX_PASSWORD_FILE=MISSING`, `/opt/pwtest=MISSING`, Playwright local `MISSING`; sem LXC105/RADV PHOENIX não há vídeo/A-B defensável.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Nenhum arquivo `src/` foi alterado. Próximo gap: material/AO Neon seletivo emissive-safe após restaurar a rota GPU.

## [2026-09-03T16:10Z] Autonomous tick — roof caps Neon aceitos
- Baseline real: HEAD `3482238`, `src/` limpo antes do candidato; skyline Neon usava caixas instanciadas com janela emissiva e sem coroamento arquitetural.
- Candidato único: quatro camadas `InstancedMesh` de roof caps rasos (`10.8×0.22×8.8`) em material navy `MeshBasicMaterial`, compartilhando geometria/material e sem alterar corrida, input, áudio ou assets.
- Checks: `node --check`, `git diff --check`, build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-roofcaps npm run build` passou com `44 módulos`, `903.48 kB`, `2.06s`; AI Track 1/2 ×20 retornou `0 lost / 0 backwards / 0 crashes`.
- A/B fixo GPU: desktop/mobile `1280×720`/`390×844`, ANGLE/Vulkan `RADV PHOENIX`, `pageErrors=[]`, paleta `13,22,20,17,11`/83. Diff acima de limiar 2: desktop `119650/921600 (0.129829)`, mobile `72272/329160 (0.219565)`.
- Vision pareada própria e fresh-eyes independente: caps criam coroamento/overhang visível; janelas permanecem legíveis; sem clipping, deformação ou artefato. Vídeo ativo: Meadow desktop/mobile `811/999` frames; Neon desktop/mobile `667/1005`; todos `phase=finished`, GPU `RADV PHOENIX`.
- Decisão: **ACEITO**. Próximo gap: A/B de material/AO Neon seletivo para grounding sem reduzir o contraste emissivo.

## Scope
Desktop and mobile web gameplay for Meadow and Neon City. Primary evidence is sequential GPU video capture on gpu-runner LXC 105 with Vulkan/RADV PHOENIX; vision auditors reviewed spaced frames from those sequences.

## [2026-09-03T14:38Z] Autonomous tick — grounding Neon rejeitado
- Baseline real: `main`, HEAD `4b509c1`, `src/` limpo após a decisão; skyline Neon continua `MeshBasicMaterial`/`fog:false`, sem AO executável.
- Runner direto autenticado: Chromium e `/dev/dri/renderD128` presentes; captura confirmou ANGLE/Vulkan `RADV PHOENIX`.
- Candidato único: `InstancedMesh` de discos de contato roxo-escuros sob as duas fileiras próximas, separado do material emissivo e sem tocar corrida/input/áudio/assets.
- Checks finais após revert: `node --check`, `git diff --check`, build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-1438-reverted npm run build` (`44 modules`, `902.76 kB`), AI Track 1/2 ×20 (`0 lost / 0 backwards / 0 crashes`).
- Captura fixa pré/pós no mesmo harness: desktop/mobile `1280×720`/`390×844`, `pageErrors=[]`, `phase=finished` nos vídeos Meadow/Neon (`815/999/677/1004` frames), GPU `RADV PHOENIX`.
- A/B cego idêntico não mostrou diferença visual discernível em grounding, separação ou legibilidade. Diff bruto: desktop `113513/921600 (0.123169)`, mobile `71853/329160 (0.218292)` pixels acima de limiar 2; pixel delta não foi tratado como ganho.
- Decisão: **REVERTED / NO PRODUCT CHANGE ACCEPTED**. Próximo gap permanece material híbrido/AO Neon com alvo visual mais específico.

## [2026-09-03T14:10Z] Autonomous tick — material híbrido Neon rejeitado
- Baseline real: HEAD `4b509c1`; `src/` limpo no início/fim; `buildNeonCity()` continua `MeshBasicMaterial`/`fog:false`, sem AO executável. Asset probe seguro: geradores sem estado utilizável; nenhum segredo lido.
- Candidato único: fachada base opaca + camada de janelas transparente expandida `0.4%`, para separar volume de emissive sem repetir o PBR que escureceu as fachadas.
- Checks do candidato e final: `node --check`, `git diff --check`, build externo. Final `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-1410-final npm run build` passou com `44 modules`, `902.76 kB`, `2.56s`; AI Track 1/2 ×20: `0 lost / 0 backwards / 0 crashes`.
- GPU LXC105: ANGLE Vulkan `RADV PHOENIX`; captura fixa desktop/mobile `1280×720`/`390×844`, `pageErrors=[]`, paleta `13,22,20,17,11`/83. Gameplay final: Meadow desktop/mobile `823/996` frames; Neon desktop/mobile `674/1003`; todos `phase=finished`.
- A/B cego idêntico não demonstrou ganho direcional inequívoco de grounding/separação. Diff bruto candidato vs pré: desktop `218399/921600 (0.236978)` e mobile `71682/329160 (0.217773)` pixels acima de limiar 2; mudança de pixels não foi aceita como melhoria.
- Decisão: **REVERTED / NO PRODUCT CHANGE ACCEPTED**. Próximo gap: novo material híbrido emissive-safe, mas com alvo visual mais específico e A/B fixo no mesmo protocolo.

## [2026-09-03T13:39Z] Autonomous tick — sshpass local instável, sem delta de produto
- Baseline real: HEAD `a8526a1`; `src/` sem diff; skyline Neon permanece `MeshBasicMaterial`/`fog:false`, sem AO executável.
- Checks: `node --check`/`git diff --check` passaram; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-unlock-1339 npm run build` passou com `44 modules`, bundle `902.76 kB`, em `2.12s`.
- Regressão determinística: Track 1/2 ×20 seeds, `0 lost / 0 backwards / 0 crashes`.
- Probe seguro: `PWFILE=MISSING`, Playwright local/fallback `MISSING`; nesta execução `SSHPASS=MISSING` no subprocesso. `sshpass` está instalado, mas `sshpass -e ssh ... true` terminou `SSH_RC=139` (segmentation fault). Nenhum segredo foi lido ou exibido.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Sem sessão LXC105 não há vídeo RADV PHOENIX, A/B pareado ou evidência visual nova. Próximo gap: restaurar uma rota SSH estável e executar A/B material/AO Neon emissive-safe.

## [2026-09-03T12:24:38Z] Autonomous tick — runner bloqueado, sem delta de produto
- Baseline real: HEAD `573af50`; skyline Neon ainda usa `MeshBasicMaterial`, `fog:false`, sem AO executável (`SKYLINE_BASIC=True`, `SKYLINE_AO=False`); `src/` permaneceu sem diff.
- Checks: `node --check` nos módulos críticos e `git diff --check` passaram; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-1224 npm run build` passou com `44 modules`, bundle `902.76 kB`, em `2.21s`.
- Regressão determinística: Track 1/2 ×20 seeds, `0 lost / 0 backwards / 0 crashes`; dev server `HTTP 200`.
- Probes seguros: `PASSWORD_FILE=MISSING`, `PLAYWRIGHT=SSH_PASS`; geradores `TRIPO/GEMINI/ELEVENLABS=MISSING`. Sem autenticação do LXC105, não há vídeo/A-B ANGLE/Vulkan/RADV PHOENIX novo.
- Decisão: nenhum patch de produto implementado ou aceito. Próximo gap permanece material híbrido/AO Neon emissive-safe condicionado à restauração verificável do runner.

## Evidence
- Desktop gameplay captures: Meadow 653/671 frames; Neon 589/560 frames.
- Mobile gameplay captures after `a1e1599`: Meadow 1002 frames; Neon 1002 frames; viewport 390x844, `hasTouch=true`.
- GPU: ANGLE Vulkan, AMD Radeon 780M, RADV PHOENIX.
- Build: `SK3D_OUT_DIR=/tmp/sk3d-dist-autonomous npm run build` passed.
- `ai-backwards-test.mjs 20` passed in both tracks: 0 lost, 0 backwards, 0 crashes; all sampled onRoad=100%.
- Audio fixes: `56d486e` preserves per-kart engine volume through pre-init mobile unlock; `1bbf3d8` schedules track fade/playlist advance after the last lookahead step instead of cutting the final beat.
- HUD fix `512e4d0`: finish results now hide live telemetry/speedlines/draft behind the result card, eliminating stale LAP/speed/position competition.
- Audio fix `d238f9b`: ducking uses generation + cancellable timer; `stopMusic()` invalidates stale callbacks so finish/victory cannot restore volume in a later race.
- **Última auditoria vision (commit `9cc6afa`, paths exatos):** mobile `frame_1001.jpg` Meadow e `frame_1008.jpg` Neon confirmaram `FINAL LAP` ausente do modal, modal sem clipping e controles utilizáveis; Meadow 7.2, Neon 7.5. Desktop 1280×720: Meadow 7.0 e Neon 7.35, com HUD corretamente substituído no finish. Ressalva: os controles ainda aparentavam ativos em parte da captura mobile; confirmar no próximo pacote.
- **Gap corrigido nesta rodada:** `67cf182` adiciona `Meadow Circuit`/`Neon City` no card de resultado; auditoria havia identificado ausência de identificação da pista.
- **Gaps visuais restantes:** Meadow tem pórtico FINISH dominante na aproximação; ambos ainda têm materiais/AO planos; Neon possui grid distante com shimmer e bloom agrupado nas janelas. `http://localhost:3457/` HTTP 200.

## [2026-09-03T11:52:38Z] Autonomous tick — runner bloqueado, sem delta de produto
- Baseline re-medido no HEAD atual antes da decisão: `src/` sem diff; skyline Neon permanece `MeshBasicMaterial`, `fog:false`, sem AO/contact layer.
- Checks locais: `node --check` nos módulos críticos e `git diff --check` passaram; build externo `SK3D_OUT_DIR=/tmp/sk3d-baseline-current npm run build` → `44 modules`, `902.76 kB`, `2.11s`.
- Regressão determinística: Track 1/2 ×20 seeds, `0 lost / 0 backwards / 0 crashes`; servidor existente respondeu `HTTP 200`.
- Probes seguros: arquivo de senha Proxmox `MISSING`, Playwright local/fallback `MISSING`, SSH probe `255`; assets externos reportados somente como estados redigidos. Nenhum segredo foi lido ou persistido.
- Decisão: nenhum patch de produto foi implementado/aceito. O próximo gap permanece material híbrido/AO Neon emissive-safe, condicionado a vídeo A/B pareado no LXC105 com ANGLE/Vulkan e `RADV PHOENIX`.

## [2026-09-03T10:25:36Z] Autonomous tick — bloqueio operacional, sem delta de produto
- Gap único re-medido no HEAD `62e7805`: skyline Neon continua em `MeshBasicMaterial`, `fog:false`, sem `aoMap`; `src/` ficou sem diff.
- Checks: `node --check` em `main.js`, `Environment.js`, `MaterialLibrary.js`; `git diff --check`; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-aa npm run build` passou com `44 modules`, `902.76 kB`, `2.15s`.
- Regressão determinística AI: Track 1/2 ×20 seeds, `0 lost / 0 backwards / 0 crashes`; dev server `HTTP=200`.
- Probes seguros: Proxmox password file `***`, Playwright local/fallback `MISSING`, geradores externos `***`; SSH `EXIT=255`/`AUTH_OR_NETWORK_BLOCKED`. Nenhum segredo foi exibido.
- Decisão: sem LXC105/RADV PHOENIX, vídeo desktop/mobile e A/B pareado não podem ser provados; nenhum patch de produto foi implementado ou aceito. Próximo gap permanece material híbrido/AO seletivo Neon preservando emissive.

- **Gap corrigido:** `67cf182` adiciona `Meadow Circuit`/`Neon City` ao card de resultado, removendo ambiguidade identificada pela auditoria mobile.
- **Auditoria vision pós-`9cc6afa`:** paths exatos desktop 1280×720: Meadow 7.0 (`frame_0177`, `frame_0806`), Neon 7.35 (`frame_0177`, `frame_0675`); paths mobile 390×844: Meadow 7.2 (`frame_1001`), Neon 7.5 (`frame_1008`). `FINAL LAP` ausente no modal. Nova validação pós-`67cf182` ainda necessária.
- **Gaps restantes:** pórtico FINISH domina Meadow na aproximação; AO/materiais ainda planos; Neon tem shimmer no grid distante e bloom agrupado em janelas; controles mobile precisam margem inferior adicional.

- **Baseline deste ciclo:** HEAD `dfd25c4`; build passou; 40 seeds (20 por pista) passaram com `0 lost`, `0 backwards`, `0 crashes`; `onRoad=100%`.
- **Fixes deste ciclo:** `3f9ad92` respeita mute persistido no primeiro unlock; `f68862f` limpa input keyboard/touch/item-hold em blur/visibility loss; `8af5119` aplica safe-area aos overrides mobile do HUD e controles.
- **Asset sourcing:** probe seguro retornou `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`; sem assets externos falsamente declarados.
- **Captura pós-fixes:** GPU real RADV PHOENIX: Meadow mobile 1004 / desktop 827 frames; Neon mobile 1009 / desktop 654 frames; viewport mobile 390×844, desktop 1280×720. Vision pós-fixes está em execução nos paths exatos.
- **Iteração `ea4d2bc`:** safe-area reaplicada nos breakpoints `≤480px` para touch/ITEM/DRIFT; readout do velocímetro mobile ampliado e com maior contraste. Capturas GPU: Meadow 1002 mobile/865 desktop; Neon 1011 mobile/664 desktop. Regressão AI: 0 lost/backwards/crashes nas duas pistas.
- **Iteração `f04d535`:** velocímetro mobile elevado 18px para separar `DRIFT`/`ITEM`; hint de teclado `or press R` ocultado no finish mobile. Capturas GPU: Meadow 1002 mobile/813 desktop; Neon 1009 mobile/689 desktop; vision pré/pós em execução.
- **Iteração `e41b41d`:** opacidade base do velocímetro mobile elevada de `0.5` para `0.78` para blindar leitura sobre fundos claros; capturas completas Meadow 998 mobile/814 desktop, Neon 1007 mobile/665 desktop. Vision encontrou melhoria parcial e intermitência persistente no Neon.
- **Iteração `01eb765`:** opacidade base elevada `0.78→0.92` e unidade `KM/H` `0.95→1.0`. Capturas GPU completas: Meadow 994 mobile/798 desktop; Neon 1005 mobile/634 desktop; auditoria vision encontrou dois frames Neon ainda em 3/10.
- **Iteração `4c7cbf5`:** causa raiz identificada no auto-hide mobile: `.sk3d-hud-idle .sk3d-speedo { opacity: 0.15 }` apagava telemetria após inatividade. Corrigido para `0.92`. Capturas completas GPU: Meadow 993 mobile/806 desktop; Neon 1007 mobile/639 desktop. Fresh-eyes convergiu: Neon 5.5→8.5 e Meadow 5.5–8→8 no speedometer; desktop sem regressão visual. Limite: frames não provam exatamente 4s sem input nem `0 KM/H`.
- **Iteração `ca54d1d`:** câmera Neon aproximada por `neonFollowExtra 0.55→0.30` para corrigir kart pequeno/cortado em combate. Capturas completas GPU: Meadow 996 mobile/824 desktop; Neon 1006 mobile/694 desktop; fresh-eyes pré/pós pendente.
- **Correção operacional de `ca54d1d`:** auditoria revelou que `?demo` usa ramo cinematográfico que ignorava `neonFollowExtra`; configuração foi restaurada em `dd03f50`.
- **Iteração `c4dd3ba`:** ajuste aplicado no ramo efetivamente capturado: `demoBackDistance` Neon reduzido de `followDistance+4.2` para `followDistance+3.6`, sem alterar Meadow. Capturas completas GPU: Meadow 1001 mobile/834 desktop; Neon 1009 mobile/666 desktop; fresh-eyes pendente.
- **Iteração `a5b9582`:** bifurcação responsiva após vision mostrar piora mobile e ganho desktop em `c4dd3ba`: Neon mobile volta a `+4.2`, Neon desktop mantém `+3.6`, Meadow permanece `+4.2`. Capturas GPU completas: Meadow 997 mobile/821 desktop; Neon 1005 mobile/686 desktop; fresh-eyes convergiu: mobile Meadow/Neon 7.3→7.3 sem regressão; desktop Meadow estável e Neon 8.2 com framing/contexto melhorados. Próximo gap: grounding/AO e destaque do kart.
- **Iteração `5fa172d`:** núcleo da textura de sombra de contato do kart `alpha .08→.12`, raio `1.2m` preservado. Capturas GPU: Meadow 998 mobile/821 desktop; Neon 1010 mobile/675 desktop. Motion regression: 0 lost/backwards/crashes em ambas; auditoria vision pré/pós pendente.
- **Validação `5fa172d`:** grounding aprovado com ressalva: Meadow mobile 6.0→7.25; Neon mobile 6.5→7.0; desktop score geral 8.25/10; nenhum círculo preto antigo inequívoco. A trilha escura Neon foi inspecionada e identificada como skid marks repetidos intencionais, não z-fighting/blob.
- **Recaptura baseline para outline:** o primeiro batch pós `eb297af` não tinha pré disponível. Baseline foi reconstruído diretamente de `5fa172d` em servidor isolado `:3458`, mesmo harness/GPU: Meadow 998 mobile/832 desktop; Neon 1007 mobile/674 desktop; 20 frames em `/tmp/sk3d-vision-pre-5fa172d/`. Comparação pareada cega pré/pós concluída: manter outline; desktop Meadow 3.21→3.29 e Neon 3.43→3.50; mobile empate sem regressão visual relevante.
- **Próximo eixo:** detalhe material/AO, sem reduzir skid marks intencionais.
- **Iteração `9c729b6`:** `cityRoadTexture` recebeu 36 micro wet-streaks curtos (alpha `.045`), sem faixas contínuas. Capturas GPU: Meadow 1000/849 e Neon 1006/661 mobile/desktop; motion 0 lost/backwards/crashes. Vision pré/pós aprovou: variação mobile 4.5→6.5, ganhos desktop de profundidade/direção/naturalidade, sem z-fighting ou banding severo.
- **Próximo eixo:** legibilidade mobile de minimap/ranking, sem aumentar obstrução do gameplay.
- **Tentativa `a953bb6`:** minimap idle `.22→.42` e ranking `.55→.72` foram rejeitados por vision: ganho acionável não demonstrado e baseline desktop indisponível; revertido em `31aff06`, speedo `.92` preservado.
- **QA áudio `2dfbc65`:** render OfflineAudioContext produziu 24 WAVs, 0 erros; `go` pico `.998` após kick `.58→.54`; `crash` pico `.9832` após ruído `.45→.43`. Espectrogramas confirmaram ataque/cauda limpos, sem clipping visual; clank metálico não isolado. Runtime browser no GPU runner: mute pré-init, init, start/stop/restart music, pause/resume e visibility hidden/visible passaram; `pageerrors=0`, destroy limpou ctx. Próximo: captura congelada do HUD ou mix de gameplay.

## Vision scorecard trend
| Pass | Meadow | Neon | Main signal |
|---|---:|---:|---|
| Baseline | 5.5 | 4.9 | Neon bloom 2/10, grid 1/10 |
| Logic/mobile fixes | 4.4 | 4.3 | No expected visual gain |
| Bloom + grid v1 | 6.6 | 5.9 | Bloom 2→6.5, grid 1→6.5 |

Latest vision findings: remaining gaps are flat Meadow mountains/vegetation, repeated/flat Neon buildings, missing contact AO/soft shadows, fake wet reflection, sky/fog contamination, grid moiré at distance, and finish modal hiding gameplay. The latest vignette/grid-AA pass requires another desktop/mobile vision re-audit.

## Changes pushed
- Mobile safe area: `viewport-fit=cover`, `env(safe-area-inset-*)`, `100dvh`.
- Touch: restore controls after restart, coarse-pointer detection, pointer capture for drift/item.
- HUD: DPR-aware speedline canvas and Blue Shell label.
- AI: Lightning decision condition corrected from dead `d > 5` to normal in-race progress range.
- Render: bloom retuned and Neon grid shader added; latest pass reduces vignette and applies adaptive grid width/distance fade.
- QA harness: `scripts/playtest-video.cjs` supports `desktop` and `mobile`; geometry auditor corrected to Vulkan/system Chromium/rAF shim.

## Geometry audit
- Meadow: 868 meshes / 117 instanced groups; 99 on-track candidates, 0 suspicious; 3 LOW decal z-fight warnings.
- Neon: 534 meshes / 26 instanced groups; 495 on-track candidates. Após corrigir o classificador para ignorar pivôs pequenos no origin e decals de estrada legítimos, rerun terminou `RESULT: LIMPO — nenhum problema geométrico`.

## Mobile video
- `a1e1599`: viewport 390×844, hasTouch=true, 1002 frames Meadow + 1002 Neon, GPU RADV PHOENIX. A auditoria visual mobile detalhada ainda deve ser amostrada em vision antes de declarar responsividade AAA.

## Remaining AAA work
1. Re-audit latest vignette/grid-AA pass on desktop and mobile with vision.
2. Fix/triage Neon geometry auditor false positives, then rerun both tracks.
3. Add real contact-shadow/AO strategy without breaking RADV/mobile budget.
4. Improve Meadow mountain/vegetation material variation and Neon building/window variation.
5. Add audio capture/instrumentation and audit the same gameplay sequence: engine, drift, boost, item, hit, finish, pause/restart.
6. Do not claim AAA completion until visual scorecard and audio evidence converge.

## [2026-09-03] Autonomous tick — FINISH gantry v2 aceito
- Gap: o banner FINISH ainda dominava a aproximação e bloqueava área útil da pista.
- Experimento anterior `1.05→0.82m` foi rejeitado por A/B inconclusivo. Nesta iteração, `TrackBuilder.buildGantry()` usa banner `0.68m`, posição `y=4.92` (back face sincronizado).
- Build passou (`902.68 kB`); AI 20 seeds por pista: `0 lost / 0 backwards / 0 crashes`.
- GPU LXC105: ANGLE Vulkan/RADV PHOENIX, capturas diretas desktop `1280×720` e mobile `390×844`, `pageErrors=[]`, `ok=true`.
- Vision pareada confirmou menos parede visual e mais pista visível nos dois viewports, sem artefato novo. Ressalva: o capturador de inspeção mobile corta laterais do texto por FOV; não é evidência de regressão do runtime.
- Decisão: **ACEITO** como melhoria visual do pórtico; AO/materiais planos e bloom Neon continuam próximos gaps.

## [2026-09-03] Autonomous tick — Neon skyline palette experiment reverted
- Gap selected from evidence: `Environment.buildNeonCity()` indexed a 5-color cold-dominant `windowColors` palette with `(rand() * 3)`, excluding 2 pale-blue variants and plausibly contributing to repeated/grouped distant facades.
- Experiment: changed the index to `windowColors.length`; build passed, AI simulation passed, and GPU runner captured Meadow/Neon desktop+mobile with ANGLE Vulkan/RADV PHOENIX.
- Decision: **REVERTED / not accepted**. Identical-prompt vision inspection did not establish a reliable directional improvement because the paired captures were not frame-synchronized; both showed persistent skyline bloom/halo and no defensible score delta. No source commit created.
- Evidence: `qa-gpu-runner/tick-window-palette-pre/neon-desktop/` (650 frames) and `qa-gpu-runner/tick-window-palette/neon-desktop/` (652 frames), plus Meadow desktop/mobile and Neon mobile post captures; all GPU logs reported RADV PHOENIX and finished race state.
- Blocker/next: build a deterministic fixed-camera skyline capture or instrument per-instance palette distribution before retrying; do not use free-running video frames for this isolated material A/B.

## [2026-09-03] Autonomous tick — fixed skyline capture harness
- Baseline: HEAD `bcd60fd`, local HTTP `200`, asset probe `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`; build and AI baseline remained green.
- Added `scripts/capture-skyline-fixed.cjs`: clears localStorage, derives camera from the loaded `track.path`, freezes `raceManager.phase='idle'`, captures through CDP, records palette/camera/canvas/pageerrors, and rejects non-`RADV PHOENIX` runners.
- GPU evidence: LXC105 ANGLE Vulkan/RADV PHOENIX; desktop `1280x720` and mobile `390x844`; palette identical `13,22,20,17,11`, total `83`; `pageErrors=[]`.
- Paired desktop rerun was intentionally measured: `382589/921600` pixels differed (`0.415136`), with `sky=0.1103` and `road=0.7558`; the residual is animated/runtime/UI content, so no visual material change was accepted. The harness improvement is accepted; visual A/B remains blocked until the dynamic render path is masked or time-locked.
- Artifacts: `qa-gpu-runner/tick-skyline-fixed/{a,b,mobile}/`; no source appearance delta.

## [2026-09-03] Autonomous tick — operational revalidation; no product delta
- Baseline remeasured at HEAD `69f1fe3`; current worktree contains only the intentional tick ledger change plus untracked QA artifacts/temp files. The evidence-backed gap remains controlled Neon material/AO grounding while preserving emissive window readability.
- Static checks and production build passed outside virtiofs: `node --check` for `main.js`/`Environment.js`; `SK3D_OUT_DIR=/tmp/sk3d-dist-op-audit npm run build` → `44 modules transformed`, `902.76 kB`, `2.18s`.
- Deterministic AI regression passed on both tracks with 20 seeds each: `0 lost`, `0 backwards`, `0 crashes`; onRoad remained `100` in sampled runs.
- Safe probes: `PROXMOX_PASSWORD_FILE=MISSING`, `PLAYWRIGHT_FALLBACK=MISSING`, `PLAYWRIGHT_LOCAL=MISSING`; project/director asset probe scripts are absent, so no credentials were inspected or exposed. SSH to Proxmox returned `Permission denied (publickey,password)`.
- Decision: **NO PRODUCT CHANGE ACCEPTED**. No `src/` file was modified; GPU LXC105 RADV PHOENIX video/A-B cannot be defensibly executed until runner authentication and Playwright access return. Next highest-value gap remains Neon hybrid material/AO A/B.

## [2026-09-03] Autonomous tick — palette correction rejected pending deterministic A/B
- Baseline remeasured: HEAD `c9af321`, HTTP 200, production build passed in `/tmp/sk3d-dist-tick`, and AI regression remained `0 lost / 0 backwards / 0 crashes` for 20 seeds on each track; asset probe remained `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`.
- Candidate: change Neon skyline window selection from `(rand() * 3)` to `windowColors.length`; source audit confirmed this would expose all 5 declared colors instead of 3. The candidate was reverted.
- GPU runtime: LXC105 reported ANGLE Vulkan with `RADV PHOENIX`; successful post-candidate sequences completed Meadow desktop `814` frames, Meadow mobile `994`, Neon desktop `679`, and Neon mobile `1008`, with `phase=finished` on the completed mobile runs. The first batch command had a quoting error and produced partial desktop directories; those artifacts remain untracked under `qa-gpu-runner/`.
- Decision: **REVERTED / not accepted**. The only available pre frame was a finish-results modal, while the post frame was active grid gameplay; therefore the identical-prompt visual comparison was not a valid paired A/B. No source commit was created.
- Blocker: repository does not currently contain `scripts/audit-geometry.cjs`; deterministic fixed-camera skyline capture or per-instance palette telemetry is required before the next attempt.

## [2026-09-03T11:38Z] Autonomous tick — Neon grounding revalidation blocked; no product delta
- Baseline remeasured at HEAD `d4f923f`; `src/` remained clean. `Environment.buildNeonCity()` still uses `MeshBasicMaterial`, `fog:false`, and no AO/contact layer; this remains the single highest-value visual gap.
- Static checks passed: `node --check src/track/Environment.js` and `git diff --check`.
- Production build passed outside virtiofs: `SK3D_OUT_DIR=/tmp/sk3d-dist-neon-tick npm run build` → `44 modules transformed`, `902.76 kB`, `✓ built in 2.12s`.
- Deterministic AI regression passed: Track 1/2 ×20 seeds, `0 lost / 0 backwards / 0 crashes`; onRoad samples remained `100`.
- Safe probes returned `PROXMOX_PASSWORD_FILE=MISSING`, `PLAYWRIGHT_GPU=MISSING`, and external generator keys `MISSING`; no secret value was read or persisted.
- Decision: **NO PRODUCT CHANGE ACCEPTED**. Required LXC105 ANGLE/Vulkan/RADV PHOENIX video and identical-prompt A/B could not run; no visual claim is made. Next gap remains emissive-safe Neon material/AO grounding.

## [2026-09-03] Autonomous tick — Neon AO/material blocked; no product delta accepted
- Baseline remeasured at HEAD `cc70de1`: `Environment.buildNeonCity()` already selects `windowColors.length` (five slots); the remaining evidence-backed gap is material/AO grounding that preserves emissive window readability.
- Static checks passed: `node --check` for Environment/MaterialLibrary and QA scripts; AI regression Track 1/2 with 20 seeds each returned `0 lost / 0 backwards / 0 crashes`.
- Production build passed outside the worktree: `SK3D_OUT_DIR=/tmp/sk3d-dist-blocked-gpu npm run build` → 44 modules, 902.68 kB, 2.14s.
- Asset probe: `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`; no external asset was added.
- GPU blocker remeasured without exposing secrets: `PROXMOX_ROOT_PASSWORD=MISSING`; LXC105 desktop/mobile RADV PHOENIX video/A-B could not be run. Local Playwright fallback was also unavailable (`Cannot find module 'playwright'` with project and `/opt/pwtest` resolution).
- Decision: **NO PRODUCT CHANGE ACCEPTED**. Existing source remains intact; no visual improvement is claimed. Next highest-value gap remains controlled Neon material/AO A/B after restoring LXC105 access and Playwright availability.

## [2026-09-03] Skyline telemetry tick — accepted
- `Environment.buildNeonCity()` now samples the full declared five-slot `windowColors` palette and publishes `window.__sk3dNeonPalette` with per-row counts and total; no external assets or credentials.
- `scripts/audit-neon-palette.cjs` performs localStorage reset, rAF shim, reload determinism, pageerror and GPU checks.
- LXC105 evidence: ANGLE Vulkan/RADV PHOENIX; counts `13,22,20,17,11`, total `83`, four rows; identical after reload.
- GPU video sequences: Meadow desktop `817`, mobile `994`; Neon desktop `651`, mobile `1004` frames; all ended `phase=finished`.
- `MaterialLibrary.getQualityProfileName()` gained a Node-safe `typeof window` guard, fixing the deterministic AI harness import.
- Accepted as an instrumentation/product-correctness pass. No visual score delta claimed until a fixed-camera A/B uses the telemetry.

## [2026-09-03] Autonomous tick — deterministic skyline capture stabilized
- Gap selected: the previous fixed-camera harness still allowed the update loop, procedural `Math.random()` textures, and CSS animations to mutate pixels between boots/capture (`0.415136` desktop pixel delta).
- Change: `src/main.js` exposes the existing `GameLoop` through the QA-only `window.__sk3d.loop`; `scripts/capture-skyline-fixed.cjs` seeds `Math.random()` in the browser context, stops the loop after setup, disables CSS animation/transition, and renders through the real `PostFX` path before CDP capture.
- Mechanical evidence: `SK3D_OUT_DIR=/tmp/sk3d-dist-deterministic npm run build` passed (`902.68 kB`); AI 20 seeds × both tracks passed with `0 lost / 0 backwards / 0 crashes`; asset probe remained `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`.
- GPU evidence: LXC105 ANGLE Vulkan/RADV PHOENIX; fixed skyline desktop/mobile `1280×720`/`390×844`; palette `13,22,20,17,11`, total `83`, `pageErrors=[]`. Pair deltas: `a_vs_b 8076/921600 (0.008763021), mean_abs_channel 0.023990162`; third run `a_vs_c 23274/921600 (0.025253906), mean_abs_channel 0.016024667`.
- Gameplay evidence: GPU video sequences Meadow desktop/mobile `829/999` frames and Neon desktop/mobile `708/1005` frames; all finished normally. Vision found active nonblank scenes, legible HUD/touch controls, and no gross rendering artifact; FINISH gantry remains visually dominant and is still open.
- Decision: **ACCEPTED as QA instrumentation only; no appearance change claimed.** The harness is stable enough for directional A/B (low mean absolute residual) but not bit-identical; future material changes still require the same fixed harness and explicit threshold.
- Artifacts: `qa-gpu-runner/tick-skyline-deterministic/` and `qa-gpu-runner/tick-gameplay-video/` (intentionally untracked).

## [2026-09-03] Autonomous tick — canvas-only skyline A/B
- Gap: fixed captures still composited live HUD/menu DOM, contaminating material A/B with unrelated compositor timing.
- Change: `scripts/capture-skyline-fixed.cjs` records the canvas bounding rect, clips CDP capture to it, and hides only body-level UI during the QA capture; normal runtime is untouched.
- GPU evidence: LXC105 ANGLE Vulkan/RADV PHOENIX; desktop `1280×720`, mobile `390×844`; 3 JSONs, `pageErrors=[]`, palette total `83`.
- Paired desktop evidence: `mean_abs_channel 0.023990162→0.010919777` (−54.48%); changed-pixel ratio `0.008763021→0.026639540`, so the improvement is accepted as lower residual energy, not pixel identity.
- Vision confirmed the new artifact is nonblank WebGL scene-only with no HTML HUD/menu. Decision: **accepted QA instrumentation only; no product visual score claimed**.
- Artifacts: `qa-gpu-runner/tick-skyline-canvas-only/` (intentionally untracked).

## [2026-09-03] Autonomous tick — FINISH gantry A/B rejected
- Gap selected from repeated GPU/vision findings: the FINISH gantry/banner dominates the approach and competes with the kart/road.
- Experiment: banner height `1.05→0.82m`, y `4.70→4.82m`, with mirrored back face kept aligned. Build and AI regression passed.
- GPU LXC105: ANGLE Vulkan/RADV PHOENIX. Detailed sequences: Meadow desktop `624`, Neon desktop `745`, Meadow mobile `868`, Neon mobile `940` frames; completed normally. The runner did not emit pageErrors, so that field is not claimed.
- Same-protocol fresh-eyes comparison of PRÉ/PÓS contact sheets found no defensible directional improvement: Meadow composition was effectively unchanged and Neon retained the same dominant framing. **Decision: reverted; no product commit.**
- The temporary source experiment was restored to HEAD `82539e6`. Next highest-value gap: build a fixed, element-targeted FINISH capture with explicit page-error telemetry before another visual edit; do not use free-running frames for small geometry deltas.

## [2026-09-03] Autonomous tick — FINISH gantry v2 accepted
- Follow-up targeted capture reduced the banner to `0.68m` and moved it to `y=4.92`, preserving the mirrored face and landmark.
- Fixed GPU capture reports for Meadow desktop/mobile: `1280×720` and `390×844`, `pageErrors=[]`, ANGLE Vulkan `RADV PHOENIX`; artifacts `qa-gpu-runner/finish-v2-{desktop,mobile}/finish.png`.
- Paired pre/post vision confirmed more visible racing line and a thinner, still recognizable FINISH banner in both viewports, without a new artifact. Build and AI regression remained green.
- Decision: **ACCEPTED**. Source is currently uncommitted pending final staging; `qa-gpu-runner/` remains intentionally untracked.

## [2026-09-03] Autonomous tick — Neon material candidate rejected
- Baseline remeasured on HEAD `6f8a79b`: build outside worktree passed at `902.68 kB`; AI Track 1/2 with 20 seeds each returned `0 lost / 0 backwards / 0 crashes`; asset probe remained `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`.
- Gap selected from repeated evidence: Neon skyline buildings were flat/repetitive because the four tower rows used `MeshBasicMaterial`; candidate changed them to `MeshStandardMaterial` and added shared roof caps.
- GPU LXC105 evidence: ANGLE/Vulkan `RADV PHOENIX`, fixed captures `1280×720` and `390×844`, `pageErrors=[]`. Raw paired diff was `0.3759819878` desktop and `0.2247902844` mobile.
- Fresh-eyes visual result: candidate darkened facade/window readability and weakened skyline separation, most visibly on mobile. **Reverted; no product visual improvement accepted.**
- Remaining blocker: need a material/AO treatment that preserves the current emissive window contrast; do not retry flat-to-lit conversion without a controlled emissive-map/material A/B.
- Active video recheck after revert: GPU LXC105 `RADV PHOENIX`, Meadow desktop/mobile `853/998` frames and Neon desktop/mobile `665/1007` frames; all ended `phase=finished`.

## [2026-09-03] QA runner — Playwright fallback corrigido
- `scripts/playtest-video.cjs` agora tenta `require('playwright')` e cai automaticamente para `/opt/pwtest/node_modules/playwright` quando o pacote não está no `node_modules` do projeto.
- Smoke sem `NODE_PATH`: mobile `390×844`, RADV PHOENIX, `phase=finished`, `998` frames.

## [2026-09-03] Autonomous tick — Neon roof caps blocked and reverted
- Gap selected from repeated GPU/vision findings: Neon skyline towers remain flat boxes without a readable roofline.
- Candidate added a shared `BoxGeometry` roof-cap layer as one emissive-safe `MeshBasicMaterial` `InstancedMesh` per skyline row, preserving the existing window material and avoiding the rejected PBR darkening.
- Static checks/build/AI passed during the candidate (`44 modules`, `902.99 kB`, 20 seeds per track: 0 lost/backwards/crashes), then source was reverted because the mandatory LXC105 GPU proof was unavailable.
- Blocker: `~/.hermes/.proxmox_root_pw` is absent and SSH to `root@192.168.0.102` returned `Permission denied (publickey,password)`; no visual delta is accepted. Next attempt requires restoring GPU-runner access before any material/geometry A/B.

## [2026-09-03] Autonomous tick — GPU unlock audit, no product delta
- Baseline remeasured at HEAD `0ec68f6`: production build outside the worktree passed with 44 modules and 902.68 kB; AI regression Track 1/2, 20 seeds each, returned `0 lost / 0 backwards / 0 crashes`.
- Static checks passed for runtime/track/material/QA scripts and `git diff --check`.
- Access probe returned `PROXMOX_ROOT_PASSWORD=MISSING`, `PLAYWRIGHT_FALLBACK=MISSING`, `PLAYWRIGHT_LOCAL=MISSING`; SSH returned `Permission denied (publickey,password)` without exposing credentials.
- Decision: **NO PRODUCT CHANGE ACCEPTED**. The evidence-backed highest-value gap remains controlled Neon material/AO A/B preserving emissive window contrast; GPU RADV PHOENIX video and vision comparison remain blocked until runner access is restored.

## [2026-09-03] Autonomous tick — revalidação de baseline, sem delta de produto
- Gap único mantido: A/B controlado de material/AO no skyline Neon preservando contraste emissivo.
- Probe de assets: `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`; acesso GPU: `PROXMOX_ROOT_PASSWORD=MISSING`, Playwright local/fallback ausente. Nenhuma credencial foi exposta.
- `node --check` passou; AI Track 1/2 com 20 seeds retornou `0 lost / 0 backwards / 0 crashes`.
- Build direto no worktree encontrou falha operacional ENOENT no timestamp temporário do Vite; cópia sanitizada fora do worktree passou com `44 modules`, `902.68 kB`, `2.29s` usando `SK3D_OUT_DIR=/tmp/sk3d-dist-current`.
- Sem LXC105 RADV PHOENIX e vídeo/A-B desktop/mobile, nenhuma mudança de produto foi implementada ou aceita. Próximo gap: material híbrido/AO Neon após restaurar o runner.

## [2026-09-03] Autonomous tick — determinism audit, no product delta
- Baseline remeasured at HEAD `53aec318`: production build outside the worktree passed with 44 modules and `902.68 kB`; AI regression Track 1/2, 20 seeds each, returned `0 lost / 0 backwards / 0 crashes`.
- Audited `scripts/capture-skyline-fixed.cjs` against the previously observed independent-boot variance. The harness already seeds procedural randomness, stops the exposed game loop after setup, freezes the race state, disables CSS animation/transition, hides non-canvas DOM, uses the real PostFX path, and captures via CDP.
- Asset probe remained `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`; no external asset was added.
- Validation blocker remeasured safely: `PROXMOX_ROOT_PASSWORD=MISSING`, `PLAYWRIGHT_LOCAL=MISSING`, `PLAYWRIGHT_FALLBACK=MISSING`. No LXC105 RADV PHOENIX video/A-B was run, and no visual/product change was accepted.
- Decision: **NO PRODUCT CHANGE ACCEPTED**. This tick closes the audit line without speculative edits. Next highest-value gap remains controlled Neon material/AO A/B after restoring GPU-runner access.

## [2026-09-03] Autonomous tick — demo camera candidate blocked and reverted
- Gap selected from current evidence: the demo chase camera may keep too much route behind the kart, weakening player subject framing, especially on mobile.
- Candidate changed only `src/main.js` demo camera extras (Meadow/Neon, touch/non-touch). Static checks passed: `node --check`, production build outside worktree (`44 modules`, `902.69 kB`, `3.59s`), and AI Track 1/2 with 20 seeds each (`0 lost / 0 backwards / 0 crashes`).
- Runtime probe: HTTP `200` on `http://127.0.0.1:3457/`; asset probe `TRIPO/GEMINI/ELEVENLABS=MISSING`; GPU access probe `PROXMOX_ROOT_PASSWORD=MISSING`, `PLAYWRIGHT_LOCAL=MISSING`, `PLAYWRIGHT_FALLBACK=MISSING`.
- Decision: **REVERTED / not accepted**. Mandatory LXC105 ANGLE/Vulkan/RADV PHOENIX desktop/mobile video and identical-protocol A/B were unavailable, so no camera improvement is claimed. Source is back at the prior camera baseline.
- Next highest-value gap: restore GPU-runner access, then run the camera A/B; do not retry the camera delta without synchronized Meadow/Neon desktop/mobile evidence.

## [2026-09-03] Autonomous tick — pending gantry beam change, GPU blocked
- Baseline remeasured at HEAD `f3038e6` with pre-existing worktree edits: `src/track/TrackBuilder.js` changes the gantry beam from `0.50m` cyan to `0.28m` dark navy; `AUDIT_FINDINGS.md`, `GATES.md`, `qa-gpu-runner/`, and `scripts/capture-finish-static.cjs` also contain pre-existing local changes/artifacts and were not overwritten.
- Static checks passed: `node --check src/track/TrackBuilder.js`, `git diff --check`; production build outside the worktree passed with `44 modules transformed`, `902.68 kB`, `2.91s` using `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-current`.
- Deterministic AI regression passed on both tracks with 20 seeds each: `0 lost`, `0 backwards`, `0 crashes`; all reported onRoad `100%` in the sampled runs.
- Runtime probe: dev server returned HTTP `200`; `PROXMOX_ROOT_PASSWORD=MISSING`; SSH to `root@192.168.0.102` returned `Permission denied (publickey,password)`. No secret was exposed and no GPU capture was claimed.
- Decision: **NO PRODUCT CHANGE ACCEPTED IN THIS TICK**. The pending beam edit remains untouched for its owner; no visual A/B/video evidence exists, so it must not be committed as an AAA improvement. Next gap: restore LXC105 access and run identical desktop/mobile Meadow+Neon video A/B for the beam/housing.

## [2026-09-03] Autonomous tick — Neon material/AO revalidation blocked
- Baseline remeasured at HEAD `156cc7d`: only `GATES.md` is modified; `.hermes-tmp.*` and `qa-gpu-runner/` remain untracked. The evidence-backed gap remains controlled Neon material/AO that preserves emissive window contrast.
- Static validation passed: `node --check` on runtime/track/material/QA modules and `git diff --check`; external build `SK3D_OUT_DIR=/tmp/sk3d-dist-vtick npm run build` passed with 44 modules, 902.76 kB, 2.12s.
- Deterministic AI regression passed on Track 1 and Track 2 with 20 seeds each: `0 lost`, `0 backwards`, `0 crashes`.
- Safe probes: `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`; `PROXMOX_ROOT_PASSWORD=MISSING`, `PLAYWRIGHT_LOCAL=MISSING`, `PLAYWRIGHT_FALLBACK=MISSING`; SSH returned `Permission denied` without exposing credentials. No GPU RADV PHOENIX video/A-B was run.
- Decision: **NO PRODUCT CHANGE ACCEPTED**. No source appearance delta was implemented. Next highest-value gap remains the same material/AO Neon A/B after restoring LXC105 access.

## [2026-09-03T10:11Z] Autonomous tick — revalidação operacional bloqueada
- Baseline refeito em HEAD `cd68507`; `node --check` e `git diff --check` passaram.
- Build fora do virtiofs: `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-1011 npm run build` → 44 módulos, 902.76 kB, 2.18s.
- AI Track 1/2 ×20: `0 lost / 0 backwards / 0 crashes`; dev server HTTP 200.
- Probes seguros: `PROXMOX_ROOT_PASSWORD=MISSING`, Playwright local/fallback `MISSING`, assets TRIPO/GEMINI/ELEVENLABS `MISSING`; SSH `EXIT=255` bloqueado.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Nenhum `src/` foi alterado; A/B vídeo RADV PHOENIX desktop/mobile continua bloqueado. Próximo gap: material/AO Neon preservando emissive após restaurar o runner.

## [2026-09-03] Correction — concurrent commit observed after tick measurement
- Final re-measurement found HEAD `89f7c8c`, with concurrent commit `6c6a4cf` aligning the FINISH housing/sockets to the banner rotation; the beam remains `0.28m` navy.
- This concurrent source change was not visually validated in this tick. Keep the product gain **unclaimed** until identical GPU RADV PHOENIX video/A-B covers Meadow and Neon at desktop/mobile sizes.

## [2026-09-03T09:42Z] Autonomous tick — Neon/audio operational revalidation; no product delta
- Baseline remeasured at HEAD `8d701f0`: production build outside virtiofs passed with `44 modules transformed`, `902.76 kB`, `2.16s`; static checks and `git diff --check` passed.
- Deterministic AI regression passed on both tracks with 20 seeds each: `0 lost`, `0 backwards`, `0 crashes`.
- Highest-value gap remains controlled Neon hybrid material/AO grounding preserving emissive windows. Audio audit also found non-deterministic `Math.random()` in the runtime reverb/noise paths, but no audio patch was accepted without exact OfflineAudioContext render and lifecycle browser evidence.
- Safe access probes: `PROXMOX_PASSWORD_FILE=MISSING`, `PLAYWRIGHT_LOCAL=MISSING`, `PLAYWRIGHT_FALLBACK=MISSING`; no secret was exposed. LXC105 RADV PHOENIX video/A-B and audio browser validation were blocked.
- Decision: **NO PRODUCT CHANGE ACCEPTED**. No `src/` file changed. Next highest-value action is restoring runner/browser access, then run deterministic Neon material/AO A/B and exact audio lifecycle/render QA before touching product code.

## Evidence ledgers — current autonomous tick

### Skill-loading ledger
- `threejs-game-director`: loaded; orchestration and premium completion rules applied.
- `threejs-gameplay-systems`: loaded; gameplay systems and deterministic AI regression checked.
- `threejs-aaa-graphics-builder`: loaded; art direction, scorecard, external asset gate, and technical art constraints applied.
- `threejs-game-ui-designer`: loaded; HUD/mobile risks remain covered by prior QA evidence.
- `threejs-debug-profiler`: loaded; static/runtime/performance checks routed through the documented runner constraints.
- `threejs-qa-release` + `game-visual-qa-kit`: loaded; release checks, fixed A/B, GPU video, and page-error requirements applied.
- `obsidian`, `llm-wiki`, `unlazy`, `game-architect`, `webaudio-sfx-design`, `webaudio-sfx-synthesis`, and `game-dev-qa-test`: loaded for required documentation, gates, architecture, audio, and QA policy.

### Reference ledger
- Gameplay: `game-feel.md` loaded; no gameplay/product change made in this blocked tick.
- AAA graphics: visual scorecard, implementation blueprint, model/render recipes, shader cookbook, and technical-art guidance are the governing references from the loaded skill set; no shader/material candidate accepted.
- QA/release: GPU runner policy, visual verification, playtest, release, visual harness, and bot-playtest requirements applied; GPU execution blocked.

### Phase ledger
| Phase | State | Evidence |
|---|---|---|
| gameplay systems | verified/no change | AI regression Track 1/2, 20 seeds each: 0 lost/backwards/crashes |
| aaa graphics | blocked/no change | material/AO Neon remains the single gap; no A/B GPU available |
| debug/profile | verified | node checks, diff check, HTTP 200; no runtime source change |
| qa/release | blocked for visual acceptance | LXC105 credential and Playwright unavailable |

### Game design brief / core loop / level-encounter plan
- **Game design brief:** arcade kart racing; drift/boost, items, shortcuts and readable racing line; no rule change in this tick.
- **Core loop:** choose track → accelerate/drift → avoid hazards/use items → complete laps → finish/results → retry.
- **Level/encounter plan:** Meadow uses open readable bends and roadside props; Neon uses long straights, hairpins, dashes, skyline and urban landmarks; pressure escalates through speed, AI traffic and item timing.

### Premium visual scorecard (latest defensible evidence; current tick does not claim improvement)
| Category | Evidence / status |
|---|---|
| art direction | Meadow/Neon authored themes; Neon material/AO gap open |
| hero/player | prior GPU evidence exists; no current recapture |
| obstacles/enemies | AI/runtime regression green; no visual delta |
| rewards/interactables | prior item/HUD evidence; no current delta |
| world/environment | Neon skyline repetitive/flat remains open |
| materials/textures | current gap is selective AO/hybrid emissive material |
| lighting/render | prior bloom pass accepted; current A/B blocked |
| vfx/motion | prior gameplay video evidence; no current delta |
| ui/hud | prior desktop/mobile evidence; no current delta |
| performance evidence | build 44 modules, 902.76 kB; AI regression green |
- **Measured evidence:** external build 44 modules / 902.76 kB / 2.12s; HTTP 200; AI 0 lost, 0 backwards, 0 crashes.
- **Fresh-eyes review:** not run in this tick because no candidate capture exists; prior rejected material candidates remain explicitly rejected.
- **Average:** not recomputed; no current visual score claim.
- **Automatic failures remaining:** fresh-eyes review unavailable; current GPU A/B unavailable; Neon material/AO gap remains.

### External asset sourcing ledger
| Surface | Chosen source | Result |
|---|---|---|
| hero/player | procedural/hybrid existing | no new asset; generator probe blocked (`TRIPO_API_KEY=MISSING`) |
| world/sky/background | procedural existing | no new asset; `GEMINI_API_KEY=MISSING` |
| materials/textures/decals | procedural existing | no new asset; controlled GPU A/B required |
| audio | WebAudio procedural existing | no audio change; `ELEVENLABS_API_KEY=MISSING` |
- **Credential probe output:** `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`.
- **3D generator / image generator:** loaded but not executed; no external output was fabricated.
- **Chosen sources:** existing procedural Three.js and WebAudio synthesis; external generation not accepted without a successful output.

### Technical art and render budget
- Technical art: preserve emissive window contrast, avoid unverified PBR darkening, and keep AO selective/cheap; candidate not implemented.
- Render budget: production bundle 902.76 kB; Vite emitted the known >500 kB chunk warning; no new draw-call or texture cost introduced.
- VFX readability: no VFX change; prior bloom remains the latest accepted rendering change.

### Visual test harness / runtime evidence
- Visual test harness decision: required and retained (`capture-skyline-fixed.cjs` plus GPU gameplay video); not executed this tick because LXC105 access is blocked.
- Console/page error: no new browser session; therefore no current page-error claim. Historical fixed captures recorded `pageErrors=[]`.
- Screenshot/video: no new screenshot or video accepted this tick; historical GPU artifacts remain untracked under `qa-gpu-runner/`.

## [2026-09-03] Autonomous tick — Neon grounding audit blocked, no product delta
- Baseline remeasured at HEAD `b617089`: worktree had only the intentional `GATES.md` edit; `.hermes-tmp.*` and `qa-gpu-runner/` remained untracked. The single highest-value gap remains Neon skyline grounding/material separation.
- Source audit confirmed `Environment.buildNeonCity()` uses one `MeshBasicMaterial` per skyline row with `fog:false`, a shared window texture, per-row haze tint, and no contact/AO layer under the tower instances. This is a concrete hypothesis, not proof that a specific AO recipe will improve the image.
- Static checks passed; AI Track 1/2 with 20 seeds each returned `0 lost / 0 backwards / 0 crashes`; production build outside the worktree passed with `44 modules`, `902.76 kB`, `2.10s` using `SK3D_OUT_DIR=/tmp/sk3d-dist-z-audit`.
- Safe access probes found the Proxmox credential path unavailable to this run, Playwright local/fallback unavailable, and SSH authentication refused. Values are intentionally redacted. No LXC105 `RADV PHOENIX` video or fixed-camera A/B was claimed.
- Decision: **NO PRODUCT CHANGE ACCEPTED**. No source appearance delta was implemented. Next highest-value gap remains a selective AO/emissive-safe material A/B after restoring GPU-runner access; do not convert the skyline wholesale to lit PBR without preserving window contrast.

## [2026-09-03T09:56Z] Autonomous tick — runner revalidation, no product delta
- Baseline remeasured at HEAD `3bedd96`; critical `node --check` and `git diff --check` passed.
- External production build via `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-1000 npm run build` passed: `44 modules transformed`, `902.76 kB`, `2.14s`.
- Deterministic AI regression: Track 1 and Track 2, 20 seeds each, `0 lost`, `0 backwards`, `0 crashes`; sampled runs reported `onRoad=100`.
- Safe probes: Proxmox password path `[REDACTED]`, Playwright local/fallback `MISSING`; SSH authentication refused. No external asset was added.
- Decision: **NO PRODUCT CHANGE ACCEPTED**. Required paired A/B with gameplay video on Meadow/Neon, desktop `1280×720`, mobile `390×844`, ANGLE/Vulkan/RADV PHOENIX and `pageErrors=[]` is blocked in this environment.
- Next highest-value gap: selective emissive-safe AO/material A/B for Neon after runner restoration; `qa-gpu-runner/` and temporary files remain untracked.

## [2026-09-03T10:39Z] Autonomous tick — runner revalidation, no product delta
- Baseline remeasured at HEAD `8875827`; `src/` remained clean and `Environment.buildNeonCity()` still uses `MeshBasicMaterial`, `fog:false`, and no contact/AO layer under tower instances.
- Static checks passed: `node --check src/main.js src/track/Environment.js src/render/MaterialLibrary.js` and `git diff --check`.
- External production build passed via `SK3D_OUT_DIR=/tmp/sk3d-dist-ab npm run build`: `44 modules transformed`, `902.76 kB`, `✓ built in 2.22s`.
- Deterministic AI regression passed on Track 1 and Track 2 with 20 seeds each: `0 lost`, `0 backwards`, `0 crashes`.
- Safe probes: password file state redacted as `***`; Playwright local/fallback `MISSING`; asset credential probe returned only redacted states. SSH/runner route was unavailable in this environment (`SSH_PROBE=UNAVAILABLE`); no RADV PHOENIX capture or video was claimed.
- Decision: **NO PRODUCT CHANGE ACCEPTED**. The mandatory identical-protocol GPU A/B and gameplay video remain blocked; next highest-value gap is unchanged: selective emissive-safe AO/material Neon A/B after restoring runner access.

## [2026-09-03T10:54Z] Autonomous tick — runner audit, no product delta
- Baseline remeasured at HEAD `878c753744a0d1fb3588d735d0cc2f48924906b`; source remains clean under `src/`; `buildNeonCity()` still uses `MeshBasicMaterial`, `fog:false`, full five-color palette, and no contact/AO layer.
- Static checks passed: `node --check src/main.js src/track/Environment.js src/render/MaterialLibrary.js` and `git diff --check`.
- External production build passed via `SK3D_OUT_DIR=/tmp/sk3d-dist-autonomous-1054 npm run build`: `44 modules transformed`, `902.76 kB`, `2.14s`.
- Deterministic AI regression passed on Track 1 and Track 2 with 20 seeds each: `0 lost`, `0 backwards`, `0 crashes`; sampled `onRoad=100`.
- Safe probes: password file `MISSING`, Playwright local/fallback `MISSING`, `sshpass=SET`, SSH probe `EXIT_255`; asset probes `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`. No secret values were read or recorded.
- Decision: **NO PRODUCT CHANGE ACCEPTED**. Without LXC105 ANGLE/Vulkan/RADV PHOENIX video and identical-protocol A/B, no visual improvement is defensible. Next highest-value gap remains selective emissive-safe AO/material Neon A/B after runner restoration.

## [2026-09-03T13:10Z] Autonomous tick — runner bloqueado, sem delta de produto
- Baseline real refeito em HEAD `d9d73a5`; `src/` sem diff; `Environment.js` confirma skyline Neon em `MeshBasicMaterial`, `fog:false`, sem `aoMap` executável.
- Checks reais: `node --check src/main.js src/track/Environment.js src/render/MaterialLibrary.js`; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-ct npm run build` → `44 modules transformed`, `902.76 kB`, `2.15s`; AI Track 1/2 ×20 → `0 lost / 0 backwards / 0 crashes`; `git diff --check` passou.
- Probes seguros: password file `MISSING`, `/opt/pwtest` `MISSING`, Playwright local `MISSING`; assets externos somente estados redigidos. Porta SSH está aberta, mas `SSH_RC=NO_PASSWORD_FILE`; nenhum segredo foi lido.
- `scripts/audit-geometry.cjs` ainda não existe; isso permanece dívida de instrumentação, não justificativa para patch visual especulativo.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Sem sessão LXC105/RADV PHOENIX não houve vídeo Meadow/Neon desktop/mobile nem A/B pareado. Próximo gap: restaurar rota autenticável e executar material híbrido/AO Neon emissive-safe.

## [2026-09-03T11:09Z] Autonomous tick — mobile touch controls de-emphasized
- Baseline remeasured at HEAD `d79c186`: dev server `HTTP=200`; mobile `390×844` HUD bottom occupied `y=526..696`, touch controls `y=748..830`, preserving `52px` vertical separation.
- One focused UI change accepted in `src/ui/ui.css`: inactive touch backgrounds reduced `0.55→0.38`, item/drift `0.60→0.45`, pause `0.60→0.42`; active state remains high contrast (`0.95`). Hit areas and input handlers were not changed.
- GPU gameplay video on LXC105/RADV PHOENIX completed: Meadow desktop `796`, Neon desktop `617`, Meadow mobile `1000`, Neon mobile `1008` frames; all ended `phase=finished`. Fixed-camera runtime checks at `1280×720` and `390×844` recorded `pageErrors=[]`.
- Identical-prompt visual review of pre/post frames found the mobile candidate less visually competitive with the road while controls remained legible; desktop Meadow showed no scope regression because the change is touch-only. No absolute AAA score is claimed.
- Static/build/regression: `node --check`, `git diff --check`, external build `44 modules / 902.76 kB / 2.21s`, AI Track 1/2 ×20 `0 lost / 0 backwards / 0 crashes`.
- Asset probe: `TRIPO_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` reported `MISSING`; no external assets added. Remaining highest-value gap: emissive-safe AO/material A/B for Neon.

## [2026-09-03T12:08Z] Autonomous tick — Neon grounding revalidation blocked
- Baseline refeito em HEAD `9830930`: `src/` segue sem diff de produto; `buildNeonCity()` usa `MeshBasicMaterial`/`fog:false` e não possui `aoMap` ou camada AO executável. O `grep` bruto de `contact` foi desconsiderado por atingir comentários, não implementação.
- Checks: `node --check src/track/Environment.js src/render/MaterialLibrary.js src/main.js` passou; `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-1208 npm run build` passou com `44 modules`, `902.76 kB`, `2.12s`; AI Track 1/2 ×20 retornou `0 lost / 0 backwards / 0 crashes`; dev server `HTTP=200`.
- Probes seguros: `PASSWORD_FILE=MISSING`, `PLAYWRIGHT_FALLBACK=MISSING`, `PLAYWRIGHT_LOCAL=MISSING`; geradores reportados apenas como `[REDACTED]`. Nenhum segredo foi lido ou persistido.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Sem LXC105/RADV PHOENIX e vídeo A/B desktop `1280×720`/mobile `390×844` com prompt idêntico, não há delta visual defensável. Próximo gap: material híbrido/AO Neon emissive-safe após restaurar o runner.

## [2026-09-03T12:40:51Z] Autonomous tick — runner inacessível, sem delta de produto
- Baseline re-medido no HEAD `0320c39142527d6d6979a90700409e431f6ae62c`; `src/` sem diff antes da decisão. `Environment.js` continua com `MeshBasicMaterial`, `fog:false` e sem AO executável no skyline Neon (`SKYLINE_BASIC=True`, `SKYLINE_AO=False`).
- Checks reais: `node --check src/main.js src/track/Environment.js src/render/MaterialLibrary.js`; `git diff --check`; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-1240 npm run build` → `44 módulos`, `902.76 kB`, `2.25s`; AI Track 1/2 ×20 → `0 lost / 0 backwards / 0 crashes`.
- Probes seguros: password file ausente; `SSHPASS` não estava exportado para a rota SSH; LXC105 responde na porta 22, mas não houve autenticação; Playwright local e `/opt/pwtest` ausentes; geradores externos permanecem `MISSING`. Nenhum segredo foi lido ou registrado.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Sem vídeo desktop/mobile no LXC105 com ANGLE/Vulkan/RADV PHOENIX e A/B pareado, nenhum patch Neon foi implementado. O próximo gap continua material híbrido/AO emissive-safe; o primeiro passo é restaurar uma rota autenticável ao runner.
- Artefatos QA não foram staged; a alteração desta rodada é somente documentação/gates.

## [2026-09-03T12:55:11Z] Autonomous tick — runner bloqueado, sem delta de produto
- Baseline real: HEAD `b91216f`; `src/` permaneceu sem diff; `buildNeonCity()` continua com `MeshBasicMaterial`, `fog:false` e sem AO executável por torre (`SKYLINE_BASIC=True`, `SKYLINE_AO=False`).
- Checks: `node --check src/main.js src/track/Environment.js src/render/MaterialLibrary.js`; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-1255 npm run build` passou com `44 módulos`, bundle `902.76 kB`, em `2.18s`; `git diff --check` passou.
- Regressão determinística: Track 1/2 ×20 seeds, `0 lost / 0 backwards / 0 crashes`; servidor existente respondeu `HTTP 200`.
- Probes seguros: password file `MISSING`, `SSHPASS=SET` sem valor lido, `/opt/pwtest=MISSING`, Playwright local apenas diretório detectado, módulo/binary local indisponíveis; SSH `EXIT=255`/`AUTH_OR_NETWORK_BLOCKED`. Geradores externos permanecem `MISSING`; nenhum segredo foi exposto.
- Browser/CDP deste ambiente não pôde ser usado (`127.0.0.1:9222` recusado); portanto não há runtime visual, vídeo ou A/B RADV PHOENIX novo.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Sem A/B pareado em vídeo Meadow/Neon, desktop `1280×720` e mobile `390×844`, com ANGLE/Vulkan/RADV PHOENIX, nenhum patch visual foi implementado. Próximo gap: material híbrido/AO Neon emissive-safe após restaurar a rota autenticável do runner.

## [2026-09-03T13:25:01Z] Autonomous tick — runner bloqueado, sem delta de produto
- Baseline real: HEAD `e143724`; `src/` sem diff; `Environment.buildNeonCity()` mantém `MeshBasicMaterial`/`fog:false` e não possui `aoMap` no bloco Neon. `node --check` nos módulos críticos e `git diff --check` passaram.
- Build externo: `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-1324 npm run build` passou com `44 modules transformed`, bundle `902.76 kB`, em `2.26s`.
- Regressão determinística: Track 1/2 ×20 seeds, `0 lost / 0 backwards / 0 crashes`; dev server `HTTP 200`.
- Probes seguros: password file `MISSING`, Playwright GPU/local `MISSING`, `SSHPASS=SET` sem leitura do valor, SSH batch `255`; geradores apenas estados redigidos (`TRIPO/GEMINI/ELEVENLABS=***`).
- GPU/A-B/vídeo: bloqueados por autenticação do runner; nenhuma captura RADV PHOENIX nova foi alegada. Nenhum patch de produto foi implementado ou aceito.
- Scorecard: sem recaptura/fresh-eyes neste tick; média não recalculada; falhas automáticas permanecem A/B GPU e evidência visual atualizada do gap Neon.
- Próximo gap de maior valor: restaurar a rota autenticável do LXC105 e executar A/B fixo emissive-safe de material/AO Neon em Meadow/Neon, desktop/mobile.

## [2026-09-03T13:55:15Z] Autonomous tick — runner inacessível, sem delta de produto
- Baseline real: HEAD `86a923f`; `src/` permaneceu sem diff; skyline Neon segue `MeshBasicMaterial`/`fog:false`, sem AO executável.
- Checks reais: `node --check src/main.js src/track/Environment.js src/render/MaterialLibrary.js`; `git diff --check`; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-tick-1355 npm run build` → `44 modules transformed`, `902.76 kB`, `2.28s`; AI Track 1/2 ×20 → `0 lost / 0 backwards / 0 crashes`.
- Probes seguros: `PROXMOX_ROOT_PASSWORD=MISSING`, `SSHPASS=MISSING`, `PLAYWRIGHT_BROWSERS_PATH=MISSING`, geradores `TRIPO/GEMINI/ELEVENLABS=MISSING`; `sshpass` presente, mas password file ausente; cache local de browser existe, `/opt/pwtest` ausente. SSH batch ao Proxmox retornou `255` (`Permission denied`). Nenhum segredo foi lido.
- Runtime: dev server respondeu `HTTP 200`; sem sessão LXC105 autenticada não foi possível provar ANGLE/Vulkan/RADV PHOENIX, vídeo ou A/B visual pareado.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Nenhum arquivo `src/` foi alterado; não há score visual novo. Próximo gap: restaurar rota autenticável e executar A/B material/AO Neon emissive-safe com vídeo Meadow/Neon em desktop `1280×720` e mobile `390×844`.

## [2026-09-03T15:48:38Z] Autonomous tick — áudio lifecycle validado
- Baseline real: HEAD `542a778`; o fix anterior removeu nondeterminismo dos buffers procedurais e o gap pendente era provar o ciclo WebAudio no browser.
- Adicionado `scripts/probe-audio-lifecycle.mjs`, probe QA sem credenciais, com fallback explícito para `playwright-core` no runner direto.
- GPU runner `192.168.0.195`: Chromium `/usr/bin/chromium`, ANGLE/Vulkan `RADV PHOENIX`; `AUDIO_LIFECYCLE=PASS checks=9 failed=0 pageErrors=0`.
- Cobertura: lazy-before-init, init/unlock (`running`), mute master `0`, unmute `0.7910929322242737`, music start/stop, suspend/resume (`suspended→running`) e destroy (`isReady=false`).
- Checks: `node --check`/`git diff --check`; build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-audio-lifecycle npm run build` passou com `44 modules`, `903.12 kB`, `2.10s`; áudio determinístico `30/30`, `maxPeak=0.853281`, `nondeterministic=none`; AI Track 1/2 ×20 `0 lost / 0 backwards / 0 crashes`.
- Decisão: **QA LIFECYCLE ACCEPTED; NO PRODUCT CHANGE**. O probe é instrumentação versionada; nenhum arquivo `src/` foi alterado. Próximo gap de produto permanece A/B material/AO Neon emissive-safe.

## [2026-09-03T15:23Z] Autonomous tick — determinismo de áudio aceito
- Gap único escolhido por evidência estática: `Math.random()` ainda gerava ruído não reproduzível em `sfx.js` (SFX) e `AudioManager.js` (reverb/crowd), impedindo auditoria offline estável.
- Alteração aceita: `mulberry32` local determinístico nos três buffers; nenhuma regra de corrida, input, mixagem, visual ou asset externo foi alterada. Novo smoke `scripts/audio-determinism-smoke.mjs` usa `web-audio-api` somente em `/tmp`.
- QA offline completo: `30/30` receitas renderizadas, `maxPeak=0.853281`, `nondeterministic=none`; `AUDIO_RANDOM=PASS`; hashes repetidos do boost coincidiram.
- Checks: `node --check`, `git diff --check`, build externo `SK3D_OUT_DIR=/tmp/sk3d-dist-audio-determinism-final npm run build` (`44 modules`, `903.12 kB`, `2.26s`), AI Track 1/2 ×20 (`0 lost / 0 backwards / 0 crashes`).
- Runtime browser lifecycle não foi alegado: `PLAYWRIGHT_LOCAL=MISSING`, `/opt/pwtest=MISSING`; tentativa Snap `--dump-dom` falhou por execução ES não observável. Nenhum segredo foi exposto.
- Decisão: **PRODUCT CHANGE ACCEPTED** para determinismo de áudio; score visual não recalculado. Próximo gap: validar lifecycle de áudio com Playwright disponível e então retomar A/B material/AO Neon no GPU.

## [2026-09-03T19:20Z] Autonomous tick — owner `kart-ai` rejeitado após probe fixo
- Baseline GPU LXC105 re-medido com ANGLE/Vulkan `RADV PHOENIX`, WebGL2 e `pageErrors=[]`: Meadow `1948 calls/1,089,095 tris` desktop e `957 calls/818,183 tris` mobile; Neon `1586/307,268` desktop e `869/192,542` mobile; `kart-ai` = `1175 meshes/199650 tris`.
- Candidato único desligou `castShadow` nos descendentes AI. Build externo passou (`44 modules`, `903.92 kB`, `2.31s`) e AI Track 1/2 ×20 permaneceu `0 lost / 0 backwards / 0 crashes`.
- Probe candidato não mostrou redução: Meadow mobile `957→968` calls e Neon mobile `869→873`; sem frame-time pareado e sem delta confiável, candidato foi revertido. Nenhuma mudança em `src/` foi aceita.
- Vídeo pós-revert no GPU: Meadow desktop/mobile `743/939` frames; Neon desktop/mobile `616/992`; todos `phase=finished`, renderer `RADV PHOENIX`.
- Decisão: **NO PRODUCT CHANGE ACCEPTED**. Próximo gap: probe fixo de outro owner/pass ou material/AO Neon somente com métrica e A/B temporalmente pareados; não declarar AAA completo.
