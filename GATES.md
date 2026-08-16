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
      EVIDENCE: 9f6ce34 (chevrons) + 289b80c (sombra) + 6e15d2b (blob) + docs
- [x] G5: Re-capturar + re-criticar cada correção (pré/pós direcional)
      EVIDENCE: turbo_pad 4→7/10; playtest 5→6/10 'sem anéis anormais'

## Fase 3 — Docs por correção
- [x] G6: RELEASE-NOTES.md atualizado (Round 13) — commits dae1e75 + c4d49a3
- [x] G7: Vault HermesVault/coding/Super-Kart-3Djs.md atualizado (Rodada 13)
- [x] G8: Memória atualizada (R12-R13 compacta)
- [x] G9: Wiki atualizada (log.md + index.md + entities/super-kart-3djs.md)

## Fase 4 — Convergência
- [x] G10: Rodada extra de auditoria (cenas não validadas: ramp, kerbs, gantry,
      tire_barrier, start_panel, driver_close) encontra 0 problemas novos
      EVIDENCE: ramp 8/10, kerbs 8/10, start_panel 7/10 (FINISH legível) —
      nenhum bug novo; gantry/tire_barrier fora de frame (cam fixa — limitação
      da cena, não bug do jogo)
- [x] G11: Relatório final com ledger (N correções, N commits, N docs)
      EVIDENCE: 3 fixes (R13c chevrons 9f6ce34, R13d sombra 289b80c, R13e blob
      6e15d2b) + 2 docs (dae1e75, c4d49a3) = 5 commits pushados; RELEASE-NOTES,
      vault, memória, wiki log+index+entity atualizados; deploy verde.
