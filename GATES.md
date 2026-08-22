# Gates: Rodada AAA-2 SK3D — silhuetas IA + micro-detalhe pista + landmarks

Brief: fechar as 3 categorias mais fracas do scorecard (~2.15): obstáculos
(karts IA = recolor 1-2), materiais (asfalto liso sem micro-sombreamento),
mundo (setores repetidos sem landmark). Loop implementação → auditoria por
subagente até teto do engine headless ou blocker real. NÃO tocar física/IA.

## Gates

- R0: Baseline re-medido antes das mudanças (screenshot desktop + renderer.info)
  - [x] EVIDENCE: /home/jarvis/.cache/sk3d-aaa2/baseline/t{1,2}_f{0-3}.png — corrida ativa (prog avança 0→0.21), visão nativa: karts IA recoloridos (mesma silhueta), asfalto liso à distância de corrida, mundo c/ props repetidos; renderer.info via composer retorna lixo (calls=1/tris=1) → diagnóstico pós será via __sk3d.renderReport(); scripts/capture-active.cjs criado p/ captura determinística.
- R1: Karts IA com silhueta DISTINTA por personagem (chassis/asa/rodapé variam em FORMA, não só cor); ≥3 famílias legíveis a distância de corrida
  - [x] EVIDENCE: commit 670e932 pushed. grid_high.png (?test+__freezeCam, vista alta): Comet azul c/ rodas traseiras gordas + casco rebaixo, King roxo alto/largo c/ piloto maior, Pip/Bolt compactos — 3+ FORMAS distintas no mesmo frame, zero deformação, zero pageerror.
- R2: Micro-detalhe procedural em asfalto/concreto (normal map ou textura canvas com noise/panel lines) sem custo além do orçamento
  - [ ] EVIDENCE: pending
- R3: Landmark autoral por setor (≥3 setores com peça única legível no horizonte)
  - [ ] EVIDENCE: pending
- R4: Auditoria fresh-eyes por subagente com screenshots downscaleados (<100KB cada) — scores independentes reconciliados; loop repete se média < alvo ou categoria < 2
  - [ ] EVIDENCE: pending
- R5: Zero pageerror ?test/?demo desktop+mobile pós-mudanças; renderReport dentro do orçamento (desktop calls<=300*1.5 tris<=800k)
  - [x] EVIDENCE: probes R1 com page.on('pageerror') = 0 erros (?test grid + ?demo corrida ativa, tracks 1 e 2). renderReport via composer retorna lixo headless (calls=1/tris=1) — diagnóstico de orçamento fica p/ GPU real (Feco), como nas rodadas anteriores.
- R6: Scorecard final 10 categorias com evidência medida (antes/depois) + audit_reference_report.py --premium passa
  - [ ] EVIDENCE: pending
- R7: Commits atômicos + push após cada um
  - [x] EVIDENCE: 670e932 premium(karts) pushed.

## ABANDON (handover — servidor será desligado pelo Feco)

ABANDON: R2 sessão interrompida a pedido do Feco (shutdown do servidor) antes da implementação. Próxima sessão: normal map procedural p/ roadTexture()/concreteTexture() em Materials.js (padrão onBeforeCompile do cookbook, customProgramCacheKey obrigatório).
ABANDON: R3 sessão interrompida a pedido do Feco (shutdown) antes da implementação. Próxima sessão: landmark por setor — buildFieldLandmarks já tem pond/hill/rocks/windmill >60m; faltam peças PRÓXIMAS à pista legíveis por setor (Fase D do PLANO-EVOLUCAO-VISUAL-BENCHMARK.md).
ABANDON: R4/R6 auditoria fresh-eyes + scorecard final ficam p/ próxima sessão, DEPOIS de R2+R3. Baseline capturado em /home/jarvis/.cache/sk3d-aaa2/baseline/ (t1/t2 × f0-f3 PNG+JPG). Runner pronto: scripts/capture-active.cjs + scripts/probe-karts.cjs (PROBE_VIEW=high).

## Estado do scorecard (estimativa honesta, não medida)

Obstáculos/karts IA: ~1 → ~2 (silhuetas implementadas e validadas visualmente no grid; validação em corrida ativa + fresh-eyes pendentes). Média geral estimada ~2.15 → ~2.25. Threshold premium (≥2.3) ainda NÃO atingido — requer R2+R3.
