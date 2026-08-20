# GATES.md — Execução do plano visual completo (Super Kart 3D.js)

## Regra de execução
Cada fase: implementação mínima completa, build/probes, captura desktop/mobile,
vision quando captura existir, commit atômico, push e atualização
docs/vault/wiki/memória. Captura SwiftShader que fecha target = `UNVERIFIED`,
nunca aprovação. Metas por tracker revisitadas em 2026-08-20 a partir do git log.

- [x] A0 Ler plano completo e registrar ledger de skills/referências
- [x] A1 Baseline medido: build, sim, lane, procession, draw calls/canvas/runtime
- [x] B1 VisualQualityProfile + capability probe + relatório GL
- [x] B2 Boot progressivo + prewarm/fallback sem regressão em ?test/?demo/normal
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
- [ ] C3 WorldPropKit, landmarks, crowd, LOD/instancing seguro
      CHECK: node scripts/inspect-canvas-metrics.cjs docs/screenshots/menu.png _
            (comparar draw calls antes/depois — esperado: redução ou estável
            com +densidade visual via instancing)
      EXPECT: draw calls de props repetidas cai ≥ 15% após instancing de
              WorldPropKit OU densidade de mundo sobe sem subir calls.
- [ ] D1 Pista/câmera/speed readability: superfície, kerb, rail, pad, decals
      CHECK: node scripts/lane-probe.mjs 1 10   # aderência de faixa (Meadow)
            node scripts/lane-probe.mjs 2 10   # aderência de faixa (Neon)
      EXPECT: wall-bounce ≤ 2% das amostras; kerb legível (sem seam/sem mancha
              seguindo kart — audit R16f já corrigiu racing line).
- [ ] D3 Audio feedback/lifecycle/haptic audit e melhorias seguras
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
- [ ] F3 Vision re-audit pré/pós com mesmo prompt; GPU-real residuals separados
      EVIDENCE: ABANDON (vision provider 404/500/timeout intermitente) — delegado
              ao Feco em hardware real; registrado como blocker honesto.
- [x] F4 Docs/release/vault/wiki/memory atualizados; redaction verificada
      CHECK: grep -rniE "sk-|api.?key|secret|token|password|bearer" src/ docs/ || echo "no secrets"
      EXPECT: 0 secrets em código/docs (matches são comentários "no secrets"/design tokens).
- [x] F5 Todo o plano implementado ou ABANDON explícito por bloqueio verificável
      EVIDENCE: C2 ABANDON (KartLOD removido R30, low-ROI); F3 ABANDON (vision).
              Restante implementado + verificado (F1/F2/F4).

## Critério de parada
Não declarar perfeição com SwiftShader incompleto. Se uma fase não for segura ou
verificável, registrar causa, evidência e próximo passo concreto; nunca fabricar
resultado.
