# AAA Autonomous QA — 2026-09-02

## Scope
Desktop and mobile web gameplay for Meadow and Neon City. Primary evidence is sequential GPU video capture on gpu-runner LXC 105 with Vulkan/RADV PHOENIX; vision auditors reviewed spaced frames from those sequences.

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

## [2026-09-03] Autonomous tick — palette correction rejected pending deterministic A/B
- Baseline remeasured: HEAD `c9af321`, HTTP 200, production build passed in `/tmp/sk3d-dist-tick`, and AI regression remained `0 lost / 0 backwards / 0 crashes` for 20 seeds on each track; asset probe remained `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`.
- Candidate: change Neon skyline window selection from `(rand() * 3)` to `windowColors.length`; source audit confirmed this would expose all 5 declared colors instead of 3. The candidate was reverted.
- GPU runtime: LXC105 reported ANGLE Vulkan with `RADV PHOENIX`; successful post-candidate sequences completed Meadow desktop `814` frames, Meadow mobile `994`, Neon desktop `679`, and Neon mobile `1008`, with `phase=finished` on the completed mobile runs. The first batch command had a quoting error and produced partial desktop directories; those artifacts remain untracked under `qa-gpu-runner/`.
- Decision: **REVERTED / not accepted**. The only available pre frame was a finish-results modal, while the post frame was active grid gameplay; therefore the identical-prompt visual comparison was not a valid paired A/B. No source commit was created.
- Blockers: repository does not currently contain `scripts/audit-geometry.cjs`; deterministic fixed-camera skyline capture or per-instance palette telemetry is required before the next attempt.

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
- `scripts/playtest-video.cjs` agora tenta `require('playwright')` e cai automaticamente para `/opt/pwtest/node_modules/playwright` no runner GPU.
- Smoke real sem `NODE_PATH`: mobile `390×844`, GPU `RADV PHOENIX`, fase `finished`, `998` frames.
