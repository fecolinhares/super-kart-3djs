# STATE — Bubble Bumper (sessao 2026-09-19)

## Modelo ativo
`the-bubble-bumper.blend` = **W295** (== W289 consolidado) | builder: `build_bb2.py`
Medido por `python3 audit_bb.py w295`.

## METRICAS (auditor ESTRITO)
| metrica | W286 (inicio) | W295 | gate | passa |
|---|---|---|---|---|
| AUD_IOU_MEDIA | 0.806 | 0.807 | >=0.900 | NAO |
| AUD_IOU_PIOR | 0.675 | 0.630@side/TRASEIRA | >=0.850 | NAO |
| AUD_COR_TV | 0.303 | 0.286 | <=0.080 | NAO |
| AUD_EXCESSO | 14.5% | 14.2% | <=5% | NAO |
| AUD_FALTA | 8.1% | 8.2% | <=20% | SIM |
| regioes <0.80 | 12 | 10 | 0 | NAO |
| regioes <0.90 | 21 | 21 | <=3 | NAO |
| QA malha | 0 nm / 98.4% quads | 0 nm / 98.4% quads | 0 | SIM |

Referencia: o auditor LENIENTE antigo (qa_bb.py) reportava IOU_MEDIA=0.823. A diferenca
(0.823 vs 0.806) era inflacao por dois defeitos — ver §INSTRUMENTO.

## INSTRUMENTO — 4 bugs encontrados e corrigidos
1. **qa_bb.py testava o concept ESPELHADO e tomava max()** (linhas 37-45) — inflava tudo.
2. **qa_bb.py esticava as duas mascaras para o mesmo bbox** (linha 34) — destruia a
   informacao de proporcao. Agora: escala unica (media geometrica das razoes de
   largura e altura) + alinhamento por bbox.
3. **profile_z normalizava largura pela ALTURA** em measure_bb.py. Sintoma que denunciou:
   baixei a asa 0.14 m e o numero do FRONTAL nao se moveu.
4. **As mascaras do concept tem pixels ISOLADOS de 1-2 px** (linhas de cota/contorno).
   Medir extensao por (max-min) infla o perfil: em xf 0.52 do side, picos falsos em
   z0.81 davam 0.813 quando a silhueta real e 0.567. Corrigido: so runs >= 1% da altura.
   ISTO e o que me fez perseguir um "gap de +0.24 m" em xf 0.50 que NAO EXISTIA.

Ferramentas novas: `audit_bb.py` (auditor estrito), `audit_counts.py` (contadores p/
gates), `prof_cmp.py` (perfil fracional corrigido), `zones.py` (pranchas concept|modelo),
`grid_concept.py` (concept com grade xf/z), `zone_probe.py`, `mesh_qa.py`.

### Passada PLANA para medir COR
O render beauty tem key/fill/rim + especular e clareia a cor por construcao: medir cor
nele comparava a MINHA luz, nao o modelo. Foi adicionada uma passada sem luzes com
ambiente branco (`flat_env=1.00`), gravada como `<ver>f-<view>.png`. A mascara continua
vindo do beauty. Sem isso o classificado acusava azul-claro 0.090 contra 0.011 do concept;
com o flat, 0.000 contra 0.011.

## COR — paleta DERIVADA do concept (nao chutada)
Classificacao por familia + luminancia (8 classes). Distribuicao nas 4 vistas:
| familia | concept | W286 | W295 |
|---|---|---|---|
| neutro | 0.516 | 0.447 | 0.445 |
| azul | 0.352 | 0.444 | 0.388 |
| amarelo | 0.132 | 0.108 | 0.167 |

Mudancas que funcionaram:
- **Sidepods tinham a COR INVERTIDA**: o concept e 90% amarelo, o modelo era 90% azul
  (a tampa superior do pod era `M_Blue`). Trocada para amarela.
- Materiais re-derivados dos clusters reais do concept:
  `M_Yellow (0.680,0.580,0.028)` antes `(0.584,0.417,0.00073)` — o G estava baixo, dava mostarda
  `M_Blue   (0.030,0.068,0.174)`   antes `(0.0157,0.0380,0.151)` — era navy, concept e azul royal
- Efeito: azul +0.092 -> +0.036 de excesso; COR_TV 0.321 -> 0.286.

## GEOMETRIA — mudancas estruturais que passaram na medicao
1. **ENTRE-EIXOS estava 12% LONGO**. Medido em DUAS vistas (top e side, concordam):
   pneu dianteiro centrado em xf 0.245, traseiro em xf 0.784 -> entre-eixos 1.267 m.
   O modelo tinha 1.42 m. Corrigido: `x_fw 0.700->0.602`, `x_rw -0.720->-0.664`,
   `r_f 0.200->0.185`, `r_r 0.225->0.215`. Efeito: IOU_MEDIA 0.804->0.807,
   regioes <0.80 de 12->10, COR_TV 0.300->0.286.
2. **CONJUNTO DE DIRECAO reconstruido**. A leitura da mascara em metros mostrou:
   arco lateral com topo em 0.655 m (xf 0.28-0.36); volante+maos com topo em 0.770 m
   (xf 0.42); antebraco em 0.72 m (xf 0.44-0.46). O modelo tinha coluna curta e baixa
   (topo 0.452) e volante com topo em 0.576 m.
   Tentativa 1 (subir tudo para 0.965 m): PIOROU fortemente (+0.250 em xf 0.45).
   Tentativa 2 (alvo correto, topo 0.770): xf 0.45 de +0.250 -> +0.048.
   LICAO: ler o alvo em METROS da mascara antes de mexer; "alto demais porque o vision
   disse que sobe" e chute.
3. **A peca traseira do concept NAO e asa horizontal — e uma cerca vertical**
   (vista de cima: corda de so 0.05-0.06 xf = 0.13 m, envergadura ~65% da largura).
   O modelo tinha uma chapa de 0.25 m de corda. Reduzir a corda para 0.14 m PIOROU o
   IoU (0.807->0.802) e a traseira (0.630->0.569) — os desenhos nao sao consistentes
   entre vistas nesta peca; a medicao mandou manter 0.25.
4. Testes revertidos por medicao: subir a cerca (IoU 0.785), capacete 0.06 m a frente
   (0.805), remover o escapamento central (0.802).

## VEREDICTO VISION (pranchas por regiao, W295) — REPROVADO
Pranchas: `/tmp/el/FINAL-A.png`, `/tmp/el/FINAL-B.png` (geradas por `zones.py`).
Mantem: cores base (amarelo/azul-escuro/cinza/preto) e a posicao geral das massas.
Os 3 defeitos sistematicos:
1. **Cilindros e tubos curvos viraram caixas e placas retas.** O modelo "caixota" tudo:
   banco vira cubo, escapamento vira tubo reto grosso, para-choque vira placa retangular,
   os U do escape somem.
2. **Faltam os detalhes pequenos**: mola helicoidal dourada do amortecedor, anel amarelo
   e cubo detalhado da roda, boca do escapamento, tubos em U do escape, tubo prateado
   curvo do para-choque lateral, debrum prateado do banco, ponta afilada do bico, volante
   tubular inclinado.
3. **Pecas que NAO existem no concept**: placas azuis macicas, caixa quadrada azul com
   moldura amarela em U, discos de suspensao expostos com centro amarelo, endplate azul
   com oval amarelo.
Alem disso a roda e um disco FLAT bicolor sem profundidade (concept: redonda, com aro em
2 tons e anel amarelo).

## PROXIMOS PASSOS (ordem por impacto medido)
1. **side/TRASEIRA 0.630** (excesso 25.4%, falta 20.9%) — reconstruir a traseira:
   escapes em U curvos + mufla, cerca vertical com tampas amarelas EXPOSAS (nao escondidas
   atras de placa), protetor tubular em U. Remover as placas azuis inventadas.
2. **top/ASA 0.714 / front/CAPACETE 0.796 / front/PILOTO 0.728** — excesso >25%.
   Reduzir volume: o modelo e gordo onde o concept e vazio.
3. **Roda**: dar profundidade ao disco, anel amarelo e cubo (hoje e disco flat chapado).
4. **NEUTRO 0.445 vs 0.516** — o concept mostra MAIS mecanica exposta (cinza/preto).
   Converter area azul em neutra expondo motor/chassi/suspensao.
5. Substituir caixas por tubos/cilindros onde o vision apontou (banco, escapamento,
   para-choque) — isso ataca o EXCESSO de 14.2% de uma vez.

## NAO REPETIR (medido e revertido)
| teste | efeito |
|---|---|
| volante/coluna a 0.965 m | xf0.45 +0.250 |
| cerca traseira mais alta (wing_z 0.600/0.635) | IoU 0.801/0.785 |
| capacete 0.06 m a frente | IoU 0.805 pior |
| remover escapamento central | pior 0.569 |
| corda da cerca 0.14 m | pior 0.569 |
| asa baixa 0.464 / asa sobe 0.686 / escapes afinados / pods altos | todos piores |
| rodas +0.235 / bumper estreitado / coroa capacete | todos piores |

## Retomada autonoma posterior
- W302: correção de braços alinhados ao concept; side/PILOTO 0.737->0.780; IoU 0.807->0.809.
- W312: longarinas extras foram REPROVADAS por vision como ruído em 3/4 vistas e revertidas.
- W313/W314: berço traseiro U baixo/fino foi testado e piorou (side/TRASEIRA 0.631->0.627/0.624); revertido.
- W316/W317: HANS reduzido/recolorido piorou IoU 0.809->0.808; revertido.
- W315 é o consolidado atual. Próxima reconstrução de alto impacto: traseira com 3 escapes protagonistas e cage fino, mantendo a envelope que o auditor aprovou.

## Retomada 2 (W330 -> W357) — ganhos medidos

| metrica | W315 | **W357** | alvo |
|---|---|---|---|
| AUD_IOU_MEDIA | 0.809 | **0.813** | 0.900 |
| AUD_IOU_PIOR | 0.630 | **0.661** | 0.850 |
| AUD_COR_TV | 0.285 | **0.274** | 0.080 |
| AUD_EXCESSO | 14.1 | **13.8** | 5.0 |
| AUD_FALTA | 8.1 | **7.9** | 20 |
| regioes <0.80 | 10 | **8** | 0 |
| REGIOES_FALTA_ALTA | 1 | **0** | 0 |
| GATES met | 3 | **4** | 12 |

### Mudancas aceitas (todas com medicao antes/depois)
1. **CAPACETE 0.226 -> 0.210** (`helm_r`): front/CAPACETE 0.796 -> 0.831;
   IoU 0.809->0.811; excesso 14.1->13.7; <0.80 de 10->8. Varredura 0.200/0.192 piora depois.
2. **RAMPA DO ASSOALHO TRASEIRO** (`Rear_Ramp`, rx0/rx1/rzb/rzt/rth/ryw):
   descoberta por medicao coluna-a-coluna — em xf 0.90 o concept tem o fundo a 0.15 m e em
   xf 0.99 a 0.54 m (rampa); o modelo tinha fundo PLANO em ~0.19 m ate o fim.
   Efeito: side/TRASEIRA 0.626 -> 0.661, IoU 0.811 -> 0.813, falta 21.0% -> 17.4%.
   Ate entao essa era a pior regiao ha varias rodadas.
3. **MECANICA EXPOSTA EM CINZA**: `Airbox`(mufla) era M_Yellow, `Airbox_Top`/`airbox0-2`/
   `Engine_Top` eram M_Blue. O concept classifica isso como CINZA (top cinza 0.258 vs
   modelo 0.090). Apos: top cinza 0.198, TOP corTV 0.220 -> 0.142.
4. **TAMPA DO SIDEPOD VOLTOU A AZUL** (era amarela): medicao por faixa mostrou que em
   xf 0.40-0.62 o concept e 0.34 azul_esq + 0.34 azul_med + 0.21 amarelo; o modelo estava
   0.59-0.69 AMARELO. Apos: top amarelo 0.272 -> 0.096 (concept 0.127).
5. **PARA-CHOQUE TUBULAR PRATEADO** (`Bumper_Ring` azul -> M_Plate): o concept tem
   0.21-0.22 de cinza em xf 0.00-0.10; o modelo tinha 0.000.
6. **`Rear_Bumper_Bot`/`Rear_Clamps` e difusor recuados** (rbz 0.078 -> 0.300; dfx 0.118 -> 0.200).

### Consolidado
- AUD_COR_TV 0.285 -> 0.274 (FRONT corTV 0.247->0.186; TOP 0.220->0.142)
- FAM_NEUTRO 0.474 -> **0.518** vs concept 0.516 (praticamente exato)
- FAM_AMARELO 0.156 -> 0.102 vs concept 0.132

### Rejeitados por medicao nesta rodada
| teste | efeito |
|---|---|
| helm_r 0.200 / 0.192 | IoU 0.810/0.808; CAPACETE 0.826/0.817 (piora) |
| wing cord exata (x -1.078..-0.937) | top/ASA excesso 28.1->23.9 mas FALTA 8.5->13.6; IoU 0.811->0.807 |
| wing span 0.474 | neutro em IoU, piora front/PILOTO 0.705->0.678 |
| pernas do U traseiro curtas (rz0 0.24) | side/TRASEIRA 0.626->0.622 |
| pneu mais claro (M_Dark 0.11) | COR_TV 0.285->0.377 (o cinza do concept no topo e a MECANICA, nao o pneu) |
| pods mais curtos/altos | IoU 0.804-0.806 |

### Veredicto de VISION (W357, prancha V3-A/V3-B)
- Cor do sidepod **corrigida** (azul com borda amarela, nao amarelo puro) — confirmado.
- Rampa traseira: medida como ganho (+0.035 em side/TRASEIRA) mas **ainda nao legivel** como
  rampa no render — le como massa horizontal.
- Ainda errado: asa traseira e laje (concept: tubo fino + tampas amarelas), escapamentos
  nao aparecem em S no topo, pneus quadrados sem anel amarelo, volante toro duplo grosso,
  ombreiras amarelas grandes demais, falta a mola helicoidal visivel.

## Retomada 3 (W358 -> W366) — asa tubular + rampa profunda

| metrica | W357 | **W366** | alvo | vencedor |
|---|---|---|---|---|
| AUD_IOU_MEDIA | 0.813 | 0.811 | 0.900 | W357 |
| AUD_IOU_PIOR | 0.661 | 0.617 | 0.850 | W357 |
| AUD_COR_TV | 0.274 | **0.268** | 0.080 | W366 |
| AUD_EXCESSO | 13.8 | **11.3** | 5.0 | W366 |
| AUD_FALTA | 7.9 | 10.0 | 20 | W357 |
| regioes <0.80 | 8 | 8 | 0 | empate |
| TOP corTV | 0.142 | **0.094** | - | W366 |
| TOP cinza | 0.198 | **0.235** (concept 0.258) | - | W366 |
| TOP azul_med | 0.268 | **0.219** (concept 0.200) | - | W366 |

**Decisao**: consolidar W366. Justificativa medida, nao estetica:
- W366 e melhor em EXCESSO (-2.5 pontos, o maior sinal de erro sistematico) e em COR_TV.
- Na vista TOP — onde o vision apontou a asa como "laje" — W366 e MUITO melhor:
  TOP corTV 0.142 -> 0.094, cinza 0.235 vs 0.258 do concept, azul 0.219 vs 0.200.
- W357 ganha apenas +0.002 de IoU e +0.044 na pior regiao; o ganho de IoU e dentro do ruido,
  e o ganho de pior-regiao vem justamente da LAJE que o vision reprova.

**Trade-off documentado (nao silencioso)**: `side/TRASEIRA` cai 0.661 -> 0.617 porque a laje
projetava area na vista SIDE que o tubo nao projeta. Duas tentativas de restaurar essa area
por outros meios FALHARAM e estao registradas baixo. Fica pendente: a massa traseira em
xf 0.89-0.92, z 0.15-0.54 m existe no concept e falta no modelo.

### Tentativas de restaurar side/TRASEIRA (todas refutadas por medicao)
| teste | side/TRASEIRA |
|---|---|
| mufla mais baixa/larga (mufz 0.36-0.42) | 0.585-0.593 (piora) |
| rampa mais funda (rzb 0.08/0.10/0.12) | 0.611-0.617 (neutro) |
| massa central traseira Rear_Mass (rmy 0.26-0.32) | 0.616 (neutro — adicionada DENTRO da silhueta) |
| asa mais alta/grossa (wz 0.76/0.70) | 0.597/0.613 (piora) + IoU 0.758/0.761 |

## Retomada 4 (W366 -> W373) — tampas da asa no diametro do concept

**W373 e o melhor medido de toda a serie.** Comparacao com o baseline W357 desta sessao:

| metrica | W357 | **W373** | melhor |
|---|---|---|---|
| AUD_IOU_MEDIA | 0.813 | **0.820** | W373 |
| AUD_COR_TV | 0.274 | **0.262** | W373 |
| AUD_EXCESSO | 13.8 | **11.5** | W373 |
| AUD_ABAIXO_080 | 8 | **7** | W373 |
| AUD_ABAIXO_090 | 20 | **19** | W373 |
| REGIOES_EXCESSO_ALTO | 5 | **3** | W373 |
| AUD_IOU_PIOR | 0.661 | 0.636 | W357 |
| AUD_FALTA | 7.9 | 8.9 | W357 |
| REGIOES_FALTA_ALTA | 0 | 2 | W357 |

Mudanca: tampas amarelas da asa de (0.090,0.040,0.036) para (0.085,0.042,0.085) — o concept tem
disco vertical de diametro MAIOR que o tubo. Verificado por vision antes/depois.

### Veredicto de VISION (W366, prancha V4)
- **CONFIRMADO**: "a asa traseira do MODELO e TUBO fino com tampas nas pontas. NAO e mais
  laje/placa retangular." Era a queixa repetida em 3 ciclos anteriores.
- Pendente: tampa amarela precisava ser maior que o tubo (feito em W373); pneus ainda sao
  blocos pretos sem banda/curvatura; motor/escapes ainda blocos retos.
