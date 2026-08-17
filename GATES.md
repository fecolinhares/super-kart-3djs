# GATES.md — Auditoria completa 2 pistas × desktop/mobile

## Escopo
Meadow Circuit e Neon City; desktop 960x540 e mobile 390x844; gameplay ativo, superfície, dashes, kerbs, rails, kart/câmera, mundo, iluminação, HUD, colisão e console.

- [x] G1 Capturas baseline: 2 pistas × 2 viewports tentadas
      EVIDENCE: quatro sessões executadas; Meadow capturado sem pageerror; Neon chegou ao estado de corrida, mas screenshot SwiftShader expirou.
- [x] G2 Auditoria visual independente
      EVIDENCE: screenshot do usuário + critic + 2 auditores; superfície Neon, dashes, rails, skyline, câmera, IA e responsive mapeados.
- [x] G3 Auditoria estrutural
      EVIDENCE: `cityRoadTexture`, `buildRacingLineOverlay`, `buildEdgeShadowLine`, dashes, `_onTrack`, `AIController`, `KartPhysics`, resize e touch auditados.
- [x] G4 Correções P0/P1 aplicadas
      EVIDENCE: R18 superfície; R17 dashes/rail; R19 init; R20 signage/câmera/IA/colisão; R21 resize/touch/ribbon/HUD.
- [x] G5 Build + diff check
      EVIDENCE: `SK3D_OUT_DIR=/tmp/sk3d-r21-dist npm run build` passou; `git diff --check` limpo.
- [x] G6 QA browser sem pageerror
      EVIDENCE: sessões desktop/mobile sem `pageerror`; timeout restante é composição de screenshot Neon no SwiftShader.
- [ ] G7 Regressão visual final sem P0/P1
      EVIDENCE: bloqueada no GPU real; SwiftShader expira na Neon. Não declarar aprovação visual sem as quatro capturas reais.
- [x] G8 Deploy/docs/vault/wiki/memória
      EVIDENCE: deploy `9899ca7 completed success`; release notes, vault, wiki e memória atualizados.

## Correções R21
- Resize atualiza renderer, câmera e projection matrix.
- LEFT/RIGHT touch suporta dois dedos simultâneos.
- `buildRoadRibbon` aplica lateral nos dois eixos.
- Dashes ficam 5mm acima do road ribbon.
- Speedlines limpam ao desacelerar.

## Riscos restantes
- P1 de evidência: capturar gameplay Neon desktop/mobile em GPU real; SwiftShader não produz screenshot confiável.
- P2 visual provável: skyline procedural em caixas; exigir nova captura antes de remodelar.
- P2 de simulação: Neon ainda registra bounces em hairpins no `lane-probe`, embora o centro do kart permaneça na pista; validar se contato é real ou falso positivo antes de alterar a barreira novamente.

## Critério de parada
O código P0/P1 conhecido foi corrigido. A auditoria visual não pode ser declarada encerrada enquanto G7 depender de SwiftShader; isso é uma limitação de evidência, não uma aprovação inventada.
