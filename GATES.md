# Gates — Autonomous AAA tick (2026-09-03)

Escopo: uma melhoria única, reversível e mensurável no Super Kart 3D.js. Não declarar AAA completo.

- [x] T1: Baseline atual re-medido e gap escolhido por evidência.
  EVIDENCE: `git status --short --branch` mostrou `main`; HEAD baseline `c9af321`; HTTP 200; source audit confirmou `windowColors` com 5 slots mas seleção `(rand() * 3)`.

- [x] T2: Correção única de alto valor aplicada sem credenciais ou assets externos falsos.
  EVIDENCE: candidato ficou restrito a uma linha de `src/track/Environment.js`, sem assets; probe reportou `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`; candidato revertido por A/B inválido.
ABANDON: T2 delta visual não demonstrado com par sincronizado; mudança revertida.

- [x] T3: Build de produção passa usando saída fora do virtiofs.
  EVIDENCE: `SK3D_OUT_DIR=/tmp/sk3d-dist-tick npm run build` → `✓ built in 2.17s`; warning existente de chunk >500 kB.

- [x] T4: Regressão determinística de IA passa nas duas pistas.
  EVIDENCE: `ai-backwards-test.mjs 20 1` e `20 2` → `TOTAL LOST EVENTS: 0`, `TOTAL BACKWARDS EVENTS: 0 / 20 runs`, `CRASHES: 0` em cada pista.

- [x] T5: Auditoria geométrica e runtime GPU real validam a mudança em Meadow e Neon, desktop e mobile, com RADV PHOENIX; capturas em vídeo/sequência e comparação visual idêntica sustentam aceitar ou rejeitar.
  EVIDENCE: LXC105 reportou ANGLE Vulkan/RADV PHOENIX; sequências post-candidate: Meadow desktop 814, Meadow mobile 994, Neon desktop 679, Neon mobile 1008 frames; comparação foi rejeitada porque o único pre disponível era modal de finish e o post era gameplay ativo. `scripts/audit-geometry.cjs` não existe no repo.
ABANDON: T5 A/B pareado inválido e auditor geométrico ausente; blocker documentado.

- [x] T6: Docs, vault, wiki, memória e commit/push atômicos refletem a decisão; qa-gpu-runner permanece não versionado.
  EVIDENCE: decisão e evidências registradas em `docs/AAA-AUTONOMOUS-2026-09-02.md`, vault/wiki atualizados nesta rodada; `qa-gpu-runner/` permanece untracked e não será staged; sem source commit porque a mudança foi revertida.

Resultado: nenhuma melhoria de produto aceita nesta rodada; próxima ação é criar captura fixa/telemetria de distribuição de cores e restaurar auditoria geométrica antes de repetir o A/B.
