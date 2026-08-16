# GATES.md — Loop de melhorias/correções Super Kart 3D.js (R13)

> Loop até NÃO encontrar mais nada a corrigir/melhorar. Orçamento ilimitado.
> Cada correção: commit atômico + push + docs (RELEASE-NOTES, vault, memória, wiki).

## Fase 1 — Auditoria com ferramenta melhorada (capturas de INSPEÇÃO)
- [x] G1: Capturar cenas de inspeção dos alvos reportados (wheel_rear, wheel_front,
      board_close, itembox, asphalt_ahead, grandstand, turbo_pad, neon_cars)
      EVIDENCE: 10 capturas em /home/jarvis/.cache/sk3d-r13-inspect*/ (8 alvos + re-capturas)
- [x] G2: Criticar cada captura com prompt específico (mesmo do usuário)
      EVIDENCE: wheel_rear 7/10, wheel_front 6/10, board_close 8/10, itembox 7/10,
      asphalt uniforme, grandstand 7/10, turbo_pad 4→7/10, neon 7/10
- [x] G3: Consolidar lista de problemas reais (bugs que persistem + melhorias)
      EVIDENCE: 1 problema real encontrado — chevrons do pad invisíveis (fix R13c 9f6ce34)

## Fase 2 — Correções (loop até convergir)
- [x] G4: Cada problema → fix com causa raiz → commit atômico + push
      EVIDENCE: 9f6ce34 (chevrons pad) + dae1e75 (docs) pushados
- [x] G5: Re-capturar + re-criticar cada correção (pré/pós direcional)
      EVIDENCE: turbo_pad 4→7/10 (chevrons visíveis, pad segue a pista)

## Fase 3 — Docs por correção
- [x] G6: RELEASE-NOTES.md atualizado (Round 13) — commit dae1e75
- [x] G7: Vault HermesVault/coding/Super-Kart-3Djs.md atualizado (Rodada 13)
- [x] G8: Memória atualizada (R12-R13 compacta)
- [x] G9: Wiki atualizada (log.md + index.md + entities/super-kart-3djs.md)

## Fase 4 — Convergência
- [ ] G10: Rodada extra de auditoria encontra 0 problemas novos (ou lista com
      ABANDON: justificativa técnica de limite)
- [ ] G11: Relatório final com ledger (N correções, N commits, N docs)
