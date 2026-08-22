# Gates: Rodada AAA-2 SK3D — silhuetas IA + micro-detalhe pista + landmarks

Brief: fechar as 3 categorias mais fracas do scorecard (~2.15): obstáculos
(karts IA = recolor 1-2), materiais (asfalto liso sem micro-sombreamento),
mundo (setores repetidos sem landmark). Loop implementação → auditoria por
subagente até teto do engine headless ou blocker real. NÃO tocar física/IA.

## Gates

- R0: Baseline re-medido antes das mudanças (screenshot desktop + renderer.info)
  - [x] EVIDENCE: /home/jarvis/.cache/sk3d-aaa2/baseline/t{1,2}_f{0-3}.png — corrida ativa (prog avança 0→0.21), visão nativa: karts IA recoloridos (mesma silhueta), asfalto liso à distância de corrida, mundo c/ props repetidos; renderer.info via composer retorna lixo (calls=1/tris=1) → diagnóstico pós será via __sk3d.renderReport(); scripts/capture-active.cjs criado p/ captura determinística.
- R1: Karts IA com silhueta DISTINTA por personagem (chassis/asa/rodapé variam em FORMA, não só cor); ≥3 famílias legíveis a distância de corrida
  - [ ] EVIDENCE: pending
- R2: Micro-detalhe procedural em asfalto/concreto (normal map ou textura canvas com noise/panel lines) sem custo além do orçamento
  - [ ] EVIDENCE: pending
- R3: Landmark autoral por setor (≥3 setores com peça única legível no horizonte)
  - [ ] EVIDENCE: pending
- R4: Auditoria fresh-eyes por subagente com screenshots downscaleados (<100KB cada) — scores independentes reconciliados; loop repete se média < alvo ou categoria < 2
  - [ ] EVIDENCE: pending
- R5: Zero pageerror ?test/?demo desktop+mobile pós-mudanças; renderReport dentro do orçamento (desktop calls<=300*1.5 tris<=800k)
  - [ ] EVIDENCE: pending
- R6: Scorecard final 10 categorias com evidência medida (antes/depois) + audit_reference_report.py --premium passa
  - [ ] EVIDENCE: pending
- R7: Commits atômicos + push após cada um
  - [ ] EVIDENCE: pending
