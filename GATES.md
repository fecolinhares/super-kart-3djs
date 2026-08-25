# GATES — Loop de Auditoria Visual AAA Autônoma (2026-08-25)

Ledger do loop: auditoria → problemas → fix → docs → commit atômico + push → repete.

## Infra
- [ ] X1: gpu-runner LXC 105 responde e Playwright/Chromium ok — CHECK: ssh pct exec 105 node -v, EXPECT: v20
- [ ] X2: dev server :3457 no ar — CHECK: curl localhost:3457, EXPECT: HTTP 200

## Auditoria por pista (GPU real 780M, RADV PHOENIX)
- [ ] T1: Track 1 Meadow — screenshots gameplay ativo (chase, múltiplos momentos) capturados no LXC 105 com RADV PHOENIX confirmado; auditados via vision
- [ ] T2: Track 2 Neon — idem T1
- [ ] T3: audit-geometry roda em ambas as pistas sem problema novo crítico (ou issues registradas p/ fix)
- [ ] T4: playtest ativo (?demo autopilot) capturado em vídeo/frames sequenciais nas 2 pistas; jogabilidade auditada (física, IA, itens, drift)

## Loop de correção
- [ ] F1: cada problema visual/jogabilidade encontrado → fix implementado + validação pré/pós com mesmo harness
- [ ] F2: scorecard visual 10 categorias re-medido após fixes; média alvo ≥9.5/10 ou gaps documentados com blocker real

## Processo
- [ ] P1: commits atômicos + push após cada fix
- [ ] P2: docs atualizados (GATES.md, docs/PREMIUM-PASS-*.md / relatório da sessão)

## Auditoria 2026-08-25 (loop autônomo — GPU real LXC105)
- [x] A1: playtest vídeo 60s por pista (?demo, RADV PHOENIX) — T1 692 frames, T2 788 frames — EVIDENCE: qa-gpu-runner/audit0825/t1_meadow.mp4, t2_neon.mp4
- [x] A2: 12 frames auditados via vision (largada→chegada, 2 pistas) — EVIDENCE: problemas registrados em docs/AUDIT-2026-08-25.md
- [x] A3: Fix banner espelhado (rotateY 180 + FrontSide) — EVIDENCE: commit ac58eb5
- [x] A4: Fix skid marks (opacity 0.28, life 3.0) — EVIDENCE: commit ac58eb5
- [x] A5: Fix banda oliva Neon (parede #0d1322) — EVIDENCE: commit ac58eb5
- [ ] A6: re-captura pós-fix + comparação visual pré/pós
- [ ] A7: scorecard 10 categorias re-medido
