# GATES.md — Auditoria autônoma completa Super Kart 3D.js

## Escopo obrigatório
Todas as pistas (Meadow/Neon), desktop/mobile, gameplay ativo e estados: menu, largada, corrida, curva, drift/boost, item box, coins, pads, guardrail, finish, pause/restart e HUD.

- [x] G1 Skills gaming/design/Three.js carregadas e ledger registrado
- [ ] G2 Capturas vision: todas as pistas × desktop/mobile × estados relevantes — SwiftShader ainda encerra target em sessões longas; harness CDP/adaptador corrigido, evidência GPU pendente
- [x] G3 Auditoria gameplay: core loop, controls, countdown, AI, collision, progression, feedback, restart
      EVIDENCE: ai-backwards-test 8/8 clean; lane-probe Meadow 0–1 bounces, Neon 0–2 pós-R22; procession 749 standings changes/60s
- [x] G4 Auditoria visual: scorecard Three.js + inspeção de código e comentários vision critic
      EVIDENCE: achado confirmado de chave de auto-instancing incompleta; corrigido nesta rodada
- [x] G5 Auditoria mobile/performance: resize, DPR, touch, WebGL, initialization, postfx
      EVIDENCE: build em outDir local; EPERM é filesystem virtiofs ao copiar public/favicon.svg
- [x] G6 Implementar correções P0/P1 e melhorias seguras P2
      EVIDENCE: corrigido TDZ de startRacePending no boot ?test/?demo; chave de instancing agora inclui identidade render-affecting do material
- [x] G7 Rebuild + probes + captures pós-correção
      EVIDENCE: build /tmp/sk3d-audit-r24; ai-backwards 0/8; lane probes; procession
- [ ] G8 Reauditar com vision nos artefatos pós — bloqueado por crash/fechamento do target SwiftShader, não marcado como resolvido
- [ ] G9 Repetir G6-G8 até não haver correção segura verificável
      EVIDENCE: continuar após GPU/SwiftShader estável
- [x] G10 Commit atômico/push por rodada, docs/vault/wiki/memória atualizados
      EVIDENCE: commit `2c406ce`, deploy CI verde

## Critério de parada
Só parar após reauditoria pós-correção. Problemas não verificáveis por SwiftShader devem ser separados como risco GPU real, nunca marcados como resolvidos.
