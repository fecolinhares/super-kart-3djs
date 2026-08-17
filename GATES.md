# GATES.md — Execução do plano visual completo

## Regra de execução
Cada fase deve ter: implementação mínima completa, build/probes, captura desktop/mobile, vision quando captura existir, commit atômico, push e atualização docs/vault/wiki/memória. Captura SwiftShader que fecha target = `UNVERIFIED`, nunca aprovação.

- [ ] A0 Ler plano completo e registrar ledger de skills/referências
- [x] A1 Baseline medido: build, sim, lane, procession, draw calls/canvas/runtime
      EVIDENCE: build passou; AI 0/8; Meadow/Neon lane probe; procession 749; `renderReport` low 640×400 = 1392 calls/1,079,775 tris/87 textures/945 geometries
- [x] B1 VisualQualityProfile + capability probe + relatório GL
      EVIDENCE: WebGL2 true, RGBA capability probe, profile low, software renderer detected, report exposto em `window.__sk3d.renderReport()`
- [ ] B2 Boot progressivo + prewarm/fallback sem regressão em ?test/?demo/normal
- [ ] B3 Render pipeline: resolution cap, pass gates, context loss/recovery
- [ ] C1 MaterialLibrary cacheada com tiers e superfícies authored
- [ ] C2 Kart hero/mid/impostor + contact shadow + resources compartilhados
- [ ] C3 WorldPropKit, landmarks, crowd, LOD/instancing seguro
- [ ] D1 Pista/câmera/speed readability: superfície, kerb, rail, pad, decals
- [ ] D2 VFX event-driven: drift/boost/item/hit/land/lap/finish/wrong-way
- [ ] D3 Audio feedback/lifecycle/haptic audit e melhorias seguras
- [ ] E1 HUD/menu/mobile: tokens, safe-area, portrait, touch targets, estados
- [ ] F1 Regressão gameplay: AI, física, colisão, itens, restart, pause, finish
- [ ] F2 QA visual matrix: Meadow/Neon × desktop/mobile × estados relevantes
- [ ] F3 Vision re-audit pré/pós com mesmo prompt; GPU-real residuals separados
- [ ] F4 Docs/release/vault/wiki/memory atualizados; redaction verificada
- [ ] F5 Todo o plano implementado ou ABANDON explícito por bloqueio verificável

## Critério de parada
Não declarar perfeição com SwiftShader incompleto. Se uma fase não for segura ou verificável, registrar causa, evidência e próximo passo concreto; nunca fabricar resultado.
