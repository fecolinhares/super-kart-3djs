# GATES.md — Loop de correção Neon R18

## Resultado
- [x] G1 — Superfície Neon dividida/manchada identificada e corrigida
      EVIDENCE: `cityRoadTexture` agora usa base única; removidas 3 faixas escuras, 12 manchas grandes e streaks fortes.
- [x] G2 — Artefato translúcido/bolha identificado e corrigido
      EVIDENCE: reflexos radiais reduzidos de raio 40–90 para 12–30 px e alpha máximo 0.24; racing-line overlay desligado na Neon.
- [x] G3 — Guardrails, edge seam e leitura Neon ajustados
      EVIDENCE: edge shadow Neon 0.10; main rail prateado com emissive sutil.
- [x] G4 — Dashes e colisão corrigidos
      EVIDENCE: dashes usam Euler direto + cor sólida; colisão reamostra após integração e reserva 1.08m para rodas.
- [x] G5 — Build de produção
      CHECK: SK3D_OUT_DIR=/tmp/sk3d-r18-dist npm run build
      EXPECT: ✓ built
      EVIDENCE: `✓ built in 17.57s`.
- [x] G6 — QA browser sem pageerror na Neon
      CHECK: captura local em `http://localhost:3457/?track=2`
      EXPECT: canvas não vazio + menu/race renderizados
      EVIDENCE: captura pós-R18 em `/home/jarvis/.cache/sk3d-r16gh-neon-race.png`; sem pageerror.
- [x] G7 — Commit, push e deploy
      EVIDENCE: commit `c180783` pushado; deploy verificado como `completed/success`.
- [x] G8 — Regressão visual
      EVIDENCE: crítico pós-R18 não observou divisão forte nem bolha translúcida; dashes e guardrail ainda exigem validação no GPU real do Feco.

## Riscos restantes
- P1: skyline ainda usa prédios procedurais em caixas; requer pass separado de world kit.
- P1: câmera em baixa velocidade pode enquadrar kart pequeno ou pista vazia no SwiftShader; validar no celular real.
