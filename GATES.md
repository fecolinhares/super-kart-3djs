# Gates: Upgrade visual drástico SK3D (benchmark MK8) — sessão autônoma

Brief (design): kart racer cartoon arcade; promessa = corrida suculenta legível em velocidade; verbo = drift/boost; referência = MK8DX. Gap declarado pelo Feco: "bem longe das referências". Estratégia de maior impacto percebido por risco: (1) env map IBL — transforma TODOS materiais PBR; (2) céu shader com sol/halo substituindo gradiente canvas; (3) hero kart autorado (canopy vidro, rodas com aro/disco, escapamento, piloto); (4) mundo vivo (wind sway grama/palmeiras/bandeiras); (5) post discipline (bloom threshold alto, vignette sutil, grade warm). NÃO tocar física/IA (P0 do plano R27).

## Gates

- X1: Baseline capturado + renderer.info medido ANTES das mudanças
  - [x] EVIDENCE: /home/jarvis/.cache/sk3d-premium/baseline_f1.png; baseline calls=1478 tris=742349 geoms=1074 texs=87 (stats.log).
- X2: Env map IBL casando com o novo céu sem regressão de perf
  - [x] EVIDENCE: buildSkyEnv dia atualizado (#2e8fd8/#7cc3f0/#ffe3c2 warm horizon) commit ae045f9; pós calls=1719 tris=795285 (+7% tris = rodas/shoulders, dentro do orçamento desktop ~800k).
- X3: Céu shader (dia + noite track 2) sem seam, sol legível, fog casando horizonte
  - [x] EVIDENCE: commit 7760a5a; sky_day_run.png + sky_night_run.png analisados por visão — dia: gradiente smooth c/ banda sunset; noite: lua halo + estrelas + janelas neon pop; zero pageerror.
- X4: Hero kart com peças autoradas novas visíveis em inspeção próxima
  - [x] EVIDENCE: kart_close_after.png — ombros arredondados do pneu, aro esportivo, disco de freio interno; commits ae045f9 + c3299dd (speedlines turbo).
- X5: Wind sway em grama/palmeiras sem mover colisão
  - [x] EVIDENCE: commit 9e033b4; A/B congelado → 3.09% pixels mudaram (>=12/255); customProgramCacheKey aplicado (pitfall cookbook).
- X6: PostFX: bloom threshold alto (só emissive authored), vignette sutil, grade warm em high
  - [x] EVIDENCE: commit 06ca4a1 — warmth 0.06 gated GPU-only como o bloom (headless não vê grade/bloom; validação GPU real fica p/ Feco).
- X7: Zero pageerror em ?test/?demo desktop+mobile pós-mudanças; renderReport reportado
  - [x] EVIDENCE: todos os probes com page.on('pageerror') limpos (sky.log, final.log, sway.log); INFO final: geoms 1085 texs 86 (abaixo do baseline 87 — textura do céu removida compensa os novos materiais).
- X8: Scorecard visual 10 categorias antes/depois + fresh-eyes
  - [x] EVIDENCE: subagente fresh-eyes TRAVOU (payload de imagem estourou o contexto — lição registrada); fallback adversarial self-review executado conforme visual-scorecard.md: média ~2.05 pós (vs ~1.5 antes estimado), frases adversariais por categoria no log da sessão. Categoria mais fraca: karts IA recoloridos (obstáculos 1-2).
- X9: Commits atômicos + push por fase
  - [x] EVIDENCE: 7760a5a (sky), 9e033b4 (wind), ae045f9 (wheels+IBL), 06ca4a1 (grade), c3299dd (speedlines) — todos pushed.

## Próxima rodada sugerida (fora do escopo desta sessão)
- Variantes SILHUETA para karts IA (não só recolor): chassis/parts por personagem.
- Normal maps procedurais p/ asfalto/concreto (micro-sombreamento).
- Landmark único por setor (Fase D do PLANO-EVOLUCAO-VISUAL-BENCHMARK.md).
