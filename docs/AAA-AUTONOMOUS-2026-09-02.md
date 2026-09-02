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
- **Recaptura baseline para outline:** o primeiro batch pós `eb297af` não tinha pré disponível. Baseline foi reconstruído diretamente de `5fa172d` em servidor isolado `:3458`, mesmo harness/GPU: Meadow 998 mobile/832 desktop; Neon 1007 mobile/674 desktop; 20 frames em `/tmp/sk3d-vision-pre-5fa172d/`. Comparação pareada cega pré/pós está em andamento contra `/tmp/sk3d-vision-eb297af/`.

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
