# GATES.md — Auditoria completa 2 pistas × desktop/mobile

## Escopo
Meadow Circuit e Neon City; desktop 960x540 e mobile 390x844; gameplay ativo, superfície, dashes, kerbs, rails, kart/câmera, mundo, iluminação, HUD, colisão e console.

- [x] G1 Capturas baseline: 2 pistas × 2 viewports tentadas
      EVIDENCE: quatro sessões executadas; Meadow capturado sem pageerror; Neon chegou ao estado de corrida, mas screenshot SwiftShader expirou.
- [x] G2 Auditoria visual independente
      EVIDENCE: screenshot do usuário + critic + 2 auditores; superfície Neon, dashes, rails, skyline, câmera, IA e responsive mapeados.
- [x] G3 Auditoria estrutural
      EVIDENCE: `cityRoadTexture`, racing line, edge shadow, dashes, `_onTrack`, AIController, KartPhysics, resize e touch auditados.
- [x] G4 Correções P0/P1 aplicadas
      EVIDENCE: R18 superfície; R17 dashes/rail; R19 init; R20 signage/câmera/IA/colisão; R21 resize/touch/ribbon/HUD; R22 hairpins.
- [x] G5 Build + diff check
      EVIDENCE: `SK3D_OUT_DIR=/tmp/sk3d-r22-dist npm run build` passou; `git diff --check` limpo.
- [x] G6 QA browser sem pageerror
      EVIDENCE: sessões desktop/mobile sem `pageerror`; timeout restante é composição de screenshot Neon no SwiftShader.
- [ ] G7 Regressão visual final sem P0/P1
      EVIDENCE: bloqueada no GPU real; SwiftShader expira na Neon. Não declarar aprovação visual sem as quatro capturas reais.
- [x] G8 Deploy/docs/vault/wiki/memória
      EVIDENCE: deploy `e882a59 completed success`; release notes, vault, wiki e memória atualizados.

## Correções finais desta rodada
- Neon AI: cruise 88% normal e 78% em curva; lane-probe 32→0 bounces no kart0, 31→0 no kart1, demais 1–2 apenas no spawn.
- Meadow: kart0 continua em 0 bounces; demais 0–1.
- R21 compartilhado: resize, multitouch, ribbons, dashes e speedlines corrigidos.

## Bloqueio restante
- P1 de evidência: capturar gameplay Neon desktop/mobile em GPU real; SwiftShader não produz screenshot confiável.
- P2 visual provável: skyline procedural em caixas; exigir captura real antes de remodelar.

## Critério de parada
O código P0/P1 conhecido foi corrigido e os invariantes de movimento foram re-medidos. A auditoria visual não pode ser declarada encerrada enquanto G7 depender de SwiftShader.
