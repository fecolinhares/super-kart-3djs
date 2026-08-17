# GATES.md — Auditoria completa 2 pistas × desktop/mobile

## Escopo
Meadow Circuit e Neon City; desktop 960x540 e mobile 390x844; gameplay ativo, superfície, dashes, kerbs, rails, kart/câmera, mundo, iluminação, HUD, colisão e console.

- [ ] G1 Capturas baseline: 2 pistas × 2 viewports em gameplay ativo
  CHECK: find /home/jarvis/.cache/sk3d-r19-baseline -type f | wc -l
  EXPECT: >= 4 PNG/JPG
  EVIDENCE: pending
- [ ] G2 Auditoria visual independente dos 4 frames
  EXPECT: lista P0/P1/P2 por pista/viewport
  EVIDENCE: pending
- [ ] G3 Auditoria estrutural: dashes, road textures, rails, câmera, HUD
  EXPECT: causas mapeadas em arquivos/linhas
  EVIDENCE: pending
- [ ] G4 Correções P0/P1 aplicadas sem quebrar Meadow/Neon
  EVIDENCE: pending
- [ ] G5 Build + diff check
  CHECK: SK3D_OUT_DIR=/tmp/sk3d-r19-dist npm run build
  EXPECT: ✓ built + diff limpo
  EVIDENCE: pending
- [ ] G6 QA browser 4 combinações sem pageerror
  EXPECT: canvas não vazio e estado de corrida alcançado
  EVIDENCE: pending
- [ ] G7 Regressão visual pós-correções; repetir G2 até zero P0/P1
  EVIDENCE: pending
- [ ] G8 Deploy, docs, vault, wiki e memória atualizados
  EVIDENCE: pending

## Critério de parada
Parar somente quando as quatro combinações não tiverem P0/P1 visível. P2 residual deve ser documentado com evidência, não escondido.
