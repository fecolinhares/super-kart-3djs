# GATES.md — Loop de melhorias/correções Super Kart 3D.js (R13)

> Loop até NÃO encontrar mais nada a corrigir/melhorar. Orçamento ilimitado.
> Cada correção: commit atômico + push + docs (RELEASE-NOTES, vault, memória, wiki).

## Fase 1 — Auditoria com ferramenta melhorada (capturas de INSPEÇÃO)
- [ ] G1: Capturar cenas de inspeção dos alvos reportados (wheel_rear, wheel_front,
      board_close, itembox, asphalt_ahead, grandstand, turbo_pad, neon_cars)
      CHECK: ls /home/jarvis/.cache/sk3d-r13-inspect/*.png | wc -l
      EXPECT: >= 6
- [ ] G2: Criticar cada captura com prompt específico (mesmo do usuário)
      CHECK: grep -c "analysis" /dev/null (manual — registrar notas 0-10)
      EXPECT: todas as cenas criticadas
- [ ] G3: Consolidar lista de problemas reais (bugs que persistem + melhorias)

## Fase 2 — Correções (loop até convergir)
- [ ] G4: Cada problema → fix com causa raiz → commit atômico + push
      CHECK: git log --oneline -3 | grep -c "fix\|feat"
      EXPECT: >= 1 novo commit por correção
- [ ] G5: Re-capturar + re-criticar cada correção (pré/pós direcional)
      EXPECT: pós >= pré ou justificativa técnica

## Fase 3 — Docs por correção
- [ ] G6: RELEASE-NOTES.md atualizado (Round 13+)
- [ ] G7: Vault HermesVault/coding/Super-Kart-3Djs.md atualizado
- [ ] G8: Memória atualizada (memória compacta)
- [ ] G9: Wiki atualizada (log.md + index.md + entities/super-kart-3djs.md)

## Fase 4 — Convergência
- [ ] G10: Rodada extra de auditoria encontra 0 problemas novos (ou lista com
      ABANDON: justificativa técnica de limite)
- [ ] G11: Relatório final com ledger (N correções, N commits, N docs)
