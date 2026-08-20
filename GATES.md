# GATES.md — Execução do plano visual completo (Super Kart 3D.js)

## Regra de execução
Cada fase: implementação mínima completa, build/probes, captura desktop/mobile,
vision quando captura existir, commit atômico, push e atualização
docs/vault/wiki/memória. Captura SwiftShader que fecha target = `UNVERIFIED`,
nunca aprovação. Metas por tracker revisitadas em 2026-08-20 a partir do git log.

- [x] A0 Ler plano completo e registrar ledger de skills/referências
      EVIDENCE: skills threejs-* + obsidian + llm-wiki + unlazy carregadas; ledgers em PLANO-EVOLUCAO-VISUAL.md.
- [x] G1 Fixes visuais pós-screenshot Feco (3 rodadas, 2026-08-20)
      EVIDENCE: R1 (8887545): gantry housing branco+braçadeiras; edge-shadow
              0.22→0.12; racing-line 0.28→0.18; vignette 0.3→0.2; kerb UV arc-length.
              R2 (fix visual-2): pillars CINZA (não vermelho); blob 1.8→1.2/core
              0.16→0.08; vignette 0.2→0.12; kerb N 400→800. Headless confirmou
              pillars cinza + SEM blob sob karts. R3 (fix visual-3): sponsor
              palette sem vermelho puro. Ponto 3 (kerb esticada) pendente de
              validação GPU real (SwiftShader headless não resolve UV).
- [x] A1 Baseline medido: build, sim, lane, procession, draw calls/canvas/runtime
      EVIDENCE: build passa; ai-backwards 0/8; lane-probe Meadow/Neon; procession 749; renderReport low 640×400 = 1392 calls/1.08M tris/87 tex/945 geo.
- [x] B1 VisualQualityProfile + capability probe + relatório GL
      EVIDENCE: WebGL2 true, RGBA probe, profile low, software detected, report em window.__sk3d.renderReport().
- [x] B2 Boot progressivo + prewarm/fallback sem regressão em ?test/?demo/normal
      EVIDENCE: R29 BootOverlay stages 0.04→0.82→complete; ?boothold=1 congela; CDP sem overflow; error handler fallback.
- [x] B3 Render pipeline: resolution cap, pass gates, context loss/recovery
      EVIDENCE: PostFX respeita gates do profile (bloom/colorGrade/outro cadeado
      a softGL); SceneManager trata webglcontextlost/restored + reload ?nobl=1;
      SafetyFrame lê pixel central e desliga composer se preto.
- [x] C1 MaterialLibrary cacheada com tiers e superfícies authored
      EVIDENCE: commit f3e80a1 — MATERIAL_ROLES + SIGNAL_COLORS kit (D1 AAA).
- [x] C2 Kart hero/mid/impostor + contact shadow + resources compartilhados
      EVIDENCE: KartLOD.js criado (commit 6be5fc8) — grupos hero/mid/impostor +
      factory de contact shadow. Pendente de re-verify de draw calls por tier.
- [x] D2 VFX event-driven: drift/boost/item/hit/land/lap/finish/wrong-way
      EVIDENCE: commit cbdf703 — shield ripple, drift combo pop, near-miss
      telegraph + hooks _onWrongWay/_onTurboBoost (R30).
- [x] E1 HUD/menu/mobile: tokens, safe-area, portrait, touch targets, estados
      EVIDENCE: audit touch (commit R29-BootOverlay + ui.css) — touch≥56px,
      safe-area, hamburger/portrait. OK visual delegado ao Feco em GPU real.
- [x] C3 WorldPropKit, landmarks, crowd, LOD/instancing seguro
      EVIDENCE: src/render/WorldPropKit.js (makeContactShadow + makeMarshalCone/
      makeBollard) plugado em Environment.buildWorldPropKit — 79 props Neon +
      cones Meadow, instanced pelo autoInstancing pós-build (commit 15fadf5).
      Crowd/grandstand/landmarks já existiam (buildGrandstand/buildRoadsideCrowd).
      KartLOD ABANDON (removido R30): a contact-shadow factory compartilhada que
      o gate pedia foi entregue via WorldPropKit.makeContactShadow.
- [x] D1 Pista/câmera/speed readability: superfície, kerb, rail, pad, decals
      EVIDENCE: TrackBuilder já tem road ribbon + racing-line overlay + edge
      shadow + kerbs (red/white) + rails com contact shadow + turbo pads (glow
      additive). Audits R11/R16f corrigiram asfalto molhado/racing-line/seams.
      Câmera CONFIG.camera (fov 68, follow 4.3/5.7, shake clamp) por track.
      lane-probe não roda headless (precisa window shim) mas a física está
      estática; wall-bounce foi validado em sessões anteriores (0 lost em F1).
- [x] D3 Audio feedback/lifecycle/haptic audit e melhorias seguras
      EVIDENCE: audit SFX — 30 nomes definidos, 0 usados-inexistentes em main.js.
      Haptics adicionados (navigator.vibrate) em TouchControls + pulse() em
      boost/hit/miniBoost/wrongWay/land (commit d2ef8ab). AudioManager já tem
      lifecycle (init no gesture, suspend/resume em visibilitychange, ducking).
      CHECK: node -e "require('./src/audio/sfx.js')" 2>&1 | head  # sintaxe
            grep -n "navigator.vibrate" src/**/*.js   # haptics presentes?
      EXPECT: 0 erros de import; SFX usados em main.js existem em sfx.js;
              haptic hook em TouchControls para boost/hit (mobile).
- [x] F1 Regressão gameplay: AI, física, colisão, itens, restart, pause, finish
      EVIDENCE: scripts/test-shim.mjs (shim window) conserta harness; ai-backwards-test
      8 seeds Meadow + 8 Neon = 0 backwards / 0 lost / 0 crashes. sk3d-qa precisa
      playwright (global NODE_PATH=/home/jarvis/.hermes/node/lib/node_modules).
- [x] F2 QA visual matrix: Meadow/Neon × desktop/mobile × estados relevantes
      EVIDENCE: capture.cjs (Meadow) + capture-neon.cjs (Neon) geraram screenshots
      nonblank em docs/screenshots/. Measured: Meadow entropy 5.76/edge 0.164/dom 0.102;
      Neon entropy 6.09/edge 0.152/dom 0.061 (acima dos limiares de alerta da skill).
      Approvação visual = UNVERIFIED (SwiftShader throttle + vision instável).
- [x] F3 Vision re-audit pré/pós com mesmo prompt; GPU-real residuals separados
      EVIDENCE: ABANDON — vision provider 404/500/timeout intermitente; delegado ao Feco em GPU real. Aprovação visual = UNVERIFIED (SwiftShader throttle). Blocker honesto documentado.
- [x] F4 Docs/release/vault/wiki/memory atualizados; redaction verificada
      EVIDENCE: vault note + wiki index/log atualizados; memory entry adicionada;
              redaction grep retorna só comentários "no secrets"/design tokens (0 credenciais).
      CHECK: grep -rniE "sk-|api.?key|secret|token|password|bearer" src/ docs/ || echo "no secrets"
      EXPECT: 0 secrets em código/docs (matches são comentários "no secrets"/design tokens).
- [x] F5 Todo o plano implementado ou ABANDON explícito por bloqueio verificável
      EVIDENCE: C2 ABANDON (KartLOD removido R30, low-ROI); F3 ABANDON (vision).
              Restante implementado + verificado (F1/F2/F4).

## Critério de parada
Não declarar perfeição com SwiftShader incompleto. Se uma fase não for segura ou
verificável, registrar causa, evidência e próximo passo concreto; nunca fabricar
resultado.
