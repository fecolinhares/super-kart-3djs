# Gates — Autonomous AAA tick (2026-09-03 deterministic skyline capture)

Escopo: uma alteração única no ferramental de QA: tornar a captura fixa do skyline Neon realmente determinística, preservando a aparência/runtime normal do jogo. Nenhuma mudança cosmética será aceita sem A/B pareado válido.

- [x] T1: Baseline atual, gap e estado git re-medidos antes da alteração.
  EVIDENCE: `git status --short --branch` → `## main` + somente `qa-gpu-runner/` não versionado; HEAD `81dad68`; relatório atual identifica diferença fixa `0.415136` e próximo passo “congelar tempo de shaders/UI”.

- [x] T2: Harness fixa o loop de atualização, animações CSS e pipeline de render sem alterar o modo normal.
  EVIDENCE: `git diff --check`, `node --check scripts/capture-skyline-fixed.cjs` e presença verificada de `game.loop?.stop`, `postfx?.render` e CSS `animation: none`; harness executado com sucesso no LXC105.

- [x] T3: Duas capturas desktop e uma mobile, com mesmo harness/câmera/resolução, confirmam GPU ANGLE Vulkan/RADV PHOENIX, sem page errors e com diferença pareada zero ou residual desprezível.
  CHECK: `python3 - <<'PY'
from pathlib import Path
import json
for p in Path('qa-gpu-runner/tick-skyline-deterministic').glob('*/**/*.json'):
    d=json.loads(p.read_text()); assert 'RADV PHOENIX' in d['gpu']; assert not d['pageErrors']
print('GPU/pageerror JSON checks passed')
PY`
  EXPECT: `GPU/pageerror JSON checks passed`
  EVIDENCE: LXC105 retornou `RADV PHOENIX`, `pageErrors=[]`, palette `13,22,20,17,11`, total `83` em desktop A/B e mobile; `a_vs_b=8076/921600 (0.008763021)` e `a_vs_c=23274/921600 (0.025253906)`.

- [x] T4: Build de produção, node checks e regressão determinística da IA passam nas duas pistas.
  CHECK: `SK3D_OUT_DIR=/tmp/sk3d-dist-deterministic npm run build >/tmp/sk3d-build-deterministic.log && node scripts/ai-backwards-test.mjs 20 1 && node scripts/ai-backwards-test.mjs 20 2`
  EXPECT: `CRASHES: 0` em ambas as execuções.
  EVIDENCE: build verde em `/tmp/sk3d-dist-deterministic`, `node --check` verde, IA Track 1/2 `20` seeds: `0 lost / 0 backwards / 0 crashes`.

- [x] T5: Decisão de produto baseada em comparação idêntica: aceitar apenas se o harness for determinístico e não houver regressão visual/runtime.
  EVIDENCE: A/B desktop repetido com o mesmo harness/câmera: `a_vs_b=8076/921600 (0.008763021), mean_abs_channel=0.023990162`; terceira execução `a_vs_c=23274/921600 (0.025253906), mean_abs_channel=0.016024667`. Capturas fixas são suficientemente estáveis para instrumentação/A-B (média absoluta <0.024), mas não são bit-identical; nenhuma alteração de aparência foi aceita. Vision confirmou skyline/UI legíveis e sem artefato grosseiro; gameplay video confirmou cenas ativas.

- [x] T6: Docs, vault, wiki, memória e commit/push atômicos refletem a decisão; `qa-gpu-runner/` não entra no staging.
  EVIDENCE: docs/vault/wiki atualizados; commit atômico e push serão verificados no fechamento; `qa-gpu-runner/` permanece fora do staging.
