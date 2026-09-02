# AAA Autonomous QA — 2026-09-02

## Scope
Desktop and mobile web gameplay for Meadow and Neon City. Primary evidence is sequential GPU video capture on gpu-runner LXC 105 with Vulkan/RADV PHOENIX; vision auditors reviewed spaced frames from those sequences.

## Evidence
- Desktop gameplay captures: Meadow 653/671 frames; Neon 589/560 frames.
- Mobile gameplay captures after `a1e1599`: Meadow 1002 frames; Neon 1002 frames; viewport 390x844, `hasTouch=true`.
- GPU: ANGLE Vulkan, AMD Radeon 780M, RADV PHOENIX.
- Build: `SK3D_OUT_DIR=/tmp/sk3d-dist-autonomous npm run build` passed.
- Dev server: `http://localhost:3457/` HTTP 200.

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
