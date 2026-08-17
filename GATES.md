# GATES.md — Auditoria completa 2 pistas × desktop/mobile

## Escopo
Meadow Circuit e Neon City; desktop 960x540 e mobile 390x844; gameplay ativo, superfície, dashes, kerbs, rails, kart/câmera, mundo, iluminação, HUD, colisão e console.

- [x] G1 Capturas baseline: 2 pistas × 2 viewports tentadas
      EVIDENCE: quatro sessões executadas; Meadow capturado sem pageerror; Neon chegou ao estado de corrida mas screenshot SwiftShader expirou.
- [x] G2 Auditoria visual independente
      EVIDENCE: screenshot do usuário + critic; problemas P0/P1 mapeados: superfície Neon dividida, bolha, dashes, rail, câmera, signage.
- [x] G3 Auditoria estrutural
      EVIDENCE: `cityRoadTexture`, `buildRacingLineOverlay`, `buildEdgeShadowLine`, dashes, `_onTrack`, `AIController`, `KartPhysics` auditados.
- [x] G4 Correções P0/P1 aplicadas
      EVIDENCE: R18 superfície; R17 dashes/rail; R19 init; R20 signage/câmera/IA/colisão.
- [x] G5 Build + diff check
      EVIDENCE: `SK3D_OUT_DIR=/tmp/sk3d-r20b-dist npm run build` passou; `git diff --check` limpo.
- [x] G6 QA browser sem pageerror
      EVIDENCE: quatro sessões sem `pageerror`; Neon screenshot tem timeout de composição no SwiftShader, sem erro JS.
- [ ] G7 Regressão visual final sem P0/P1
      EVIDENCE: pendente no GPU real; SwiftShader não entrega captura confiável da Neon em desktop/mobile.
- [x] G8 Deploy/docs/vault/wiki/memória
      EVIDENCE: deploy `6be805d completed success`; release notes, vault, wiki e memória atualizados.

## Achados técnicos restantes
- P1 de validação: capturar gameplay Neon em GPU real; o harness SwiftShader expira durante `page.screenshot`.
- P2 visual provável: skyline procedural em caixas e riqueza de props; não há evidência GPU real suficiente para alterar sem risco.
- P2 de simulação: Neon ainda registra bounces em hairpins no `lane-probe`, embora o centro do kart permaneça na pista; validar se são contatos reais ou falso positivo do harness antes de mexer novamente na barreira.

## Critério de parada
O código P0/P1 conhecido foi corrigido. A auditoria não pode ser declarada visualmente encerrada enquanto G7 depender de SwiftShader; isso é um bloqueio de evidência, não um resultado inventado.
