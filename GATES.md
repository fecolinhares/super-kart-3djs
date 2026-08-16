# GATES.md — Loop Director AAA (R16) Super Kart 3D.js

> Meta: aproximar do AAA MK8. Scorecard 10 categorias (threejs-aaa-graphics-builder).
> Cada melhoria: commit atômico + push + docs (RELEASE-NOTES, vault, memória, wiki).

## Fase 1 — Baseline (scorecard ANTES)
- [ ] G1: Capturar gameplay ativo (desktop + mobile) + cenas de inspeção
      CHECK: ls /home/jarvis/.cache/sk3d-r16-*/ | wc -l
      EXPECT: >= 6 imagens
- [ ] G2: Scorecard 10 categorias (antes) com crítico cego fresh-eyes
      EXPECT: média + categorias fracas identificadas

## Fase 2 — Melhorias (loop até convergir)
- [ ] G3: Implementar melhorias nas categorias fracas (cada uma: commit+push)
- [ ] G4: Re-capturar + re-score direcional (pós >= pré por categoria)

## Fase 3 — Docs
- [ ] G5: RELEASE-NOTES Round 16, vault, memória, wiki atualizados

## Fase 4 — Convergência
- [ ] G6: Scorecard final >= 2.0 média (ou ABANDON com justificativa técnica)
- [ ] G7: Relatório final com ledger (score antes/depois, N commits)
