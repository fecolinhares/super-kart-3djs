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


## W385-W390 — BUG DE INSTRUMENTO + SEMANTICA DE PECA (2026-09-19)

### BUG 1 (critico): validacao no passe FLAT
O builder gera 3 passes: `<v>-<view>.png` BEAUTY (iluminado) | `<v>f-<view>.png` FLAT (sem luzes, p/ medir cor) | `<v>m-<view>.png` mask.
TODAS as pranchas EL-* usavam `f-` (FLAT) -> o vision julgava VOLUME num render SEM LUZ -> vereditos "chapado/sem volume/blocky/unlit" em toda rodada eram ARTEFATO.
Raw beauty do W389: "fundo cinza uniforme, bom contraste, objeto ocupa bem o quadro". elements.py corrigido para o BEAUTY.

### BUG 2: suavizacao perdida no join
`shade_auto_smooth` cria MODIFIER no objeto; o `join` descarta modifiers -> W383 "nao mudou nada".
Fix: shade_auto_smooth + apply_mods ANTES do join. W385: smooth em 14/14 pecas.
Bevel agressivo -> 42 non-manifold. Bevel seguro: minverts>=5000, w 0.014, 2 seg, 28 graus -> QA 0 non-manifold.

### BUG 3: composicao da prancha
Board empilhado/cortado gerava "render cortado, pequeno, rotacionado" no vision. Board correto: crop pelo bbox do MASK, lado-a-lado, MESMA escala (H=300).

### SEMANTICA: SIDEPOD e BAIXO e AMARELO
Medicao do mask (SIDE, xf 0.36-0.62) dava run continuo z 0.081-0.525 -> interpretei "pod tem 0.45 m de altura".
ERRADO: 0.08-0.31 = POD (amarelo, fino, longo); 0.31-0.53 = COBERTURA AZUL acima (outra peca).
WIN385 pod (0.106-0.284, amarelo) == pod do concept. W387/388/389 subiram o pod para 0.438 com split azul -> pixels certos, PECA ERRADA.
Prova: top/SIDEPODS cor  W385 0.257 | W389 0.388 (pior) | W390 0.228 (melhor).
LICAO: metrica agregada melhorou (IoU 0.816->0.822) enquanto a PEÇA piorou. Nunca aceitar ganho agregado com semantica pior.

### W390 = MELHOR ESTADO SEMANTICO
pod_zt 0.096 / pod_zt2 0.084 (topo 0.284), pod_w 0.405 (half 0.703), pod_split desligado (pod todo amarelo).
side/SIDEPOD cor 0.187 | top/SIDEPODS cor 0.228 (recorde) | IoU 0.817 | P10 0.753 | COR_TV 0.269 | excesso 11.4 | falta 9.3 | <0.80 = 6 | QA ok.

### VISION W389 (board corrigido): FRONT 6 | SIDE 5 | TOP 3 | REAR 4 = REPROVADO
1. Para-choque dianteiro: concept = fino, AZUL em C com faixas amarelas; modelo = GROSSO, PRATEADO em U com pontas amarelas quadradas -> material+forma errados.
2. Sidepod: concept fino/longo/amarelo; modelo bojudo/azul.
3. Escapamento traseiro: concept = 3 ponteiras cilindricas prateadas; modelo = 1 saida preta + caixa cinza.

### PROXIMA PECA (medida, nao suposta)
SIDE_COVER azul: xf 0.36-0.62 | z 0.28-0.53 | y 0.17-0.70. Fecha o vazio entre o pod e a cobertura sem inflar a peca errada.
Depois: FBUMP azul (nao prata) + 3 escapes tubulares + face do piloto.


## W391-W393 — SIDEPOD REMODELADO EM DUAS PECAS (2026-09-19)

Correcao semantica: em vez de INFLAR o pod (peca errada, tentativa W387-389), o vazio
acima dele foi preenchido com a PECA CERTA: SIDE_COVER azul.

- W391: cover full-width (y 0.17-0.70) -> side/SIDEPOD cor 0.148 (recorde) MAS excesso subiu 11.4->13.2.
- W392: cover INNER-ONLY (y 0.175-0.44) -> top/SIDEPODS IoU 0.944 (era 0.918), falta 1.9% (era 4.6),
        side/SIDEPOD cor 0.156, COR_TV 0.261. MELHOR BALANCEADO.
- W393: cap tambem inner-only -> COR_TV 0.256 (recorde) mas top/SIDEPODS cor 0.238->0.312 e <0.80 volta a 7 -> REVERTER.

Licao: o azul do concept e INTERNO e o amarelo e o balao EXTERNO (TOP). Cap full-width pintava
o pod todo de azul visto de cima. Mas cap estreito demais deixa amarelo demais. W392 e o meio correto.

VISION W392 (board SIDE+TOP, mesma escala): "acertou o ONDE, errou o QUANTO" —
amarelo embaixo/azul em cima esta na ordem certa, mas no modelo o amarelo virou lamina fina
e o azul virou a barriga gorda; no concept e o INVERSO (amarelo = travessao gordo, azul fino).
Proximo: engordar o pod amarelo para ~0.35-0.40 de topo (medir a transicao amarelo->azul no concept
em xf 0.36-0.62) e afinar o cover.

### ESTADO CONSOLIDADO = W392
IoU 0.818 | P10 0.753 | COR_TV 0.261 | excesso 11.9 | falta 8.7 | <0.80 = 6 | QA 0 non-manifold 98.3% quads
pior regiao: side/TRASEIRA 0.636 (inalterada desde W357 — proximo alvo estrutural)


## REBUILD VISUAL-HULL — DIAGNOSTICO DA TECNICA (2026-09-19)

### O que foi construido
- `/opt/blender-runner/vh_build.py` — visual hull dos 3 ortograficos + surface nets (numpy puro, sem skimage/scipy).
- `/opt/blender-runner/vh_color.py` — COR AMOSTRADA DO PROPRIO CONCEPT: para cada face, escolhe a vista que a olha de frente
  (|nx|->FRONT, |ny|->SIDE, |nz|->TOP), amostra o pixel e classifica nas MESMAS faixas do classifier do auditor.
- `/opt/blender-runner/vh_render.py` — render standalone (4 vistas + iso + mascara + passe FLAT).

### BUGS DE INSTRUMENTO CORRIGIDOS (afetavam TODAS as metricas anteriores)
1. `audit_bb.py` comparava contra as masks CRUAS `/tmp/g2_*.npy`, que tinham uma LINHA DE CHAO de 2 px
   ao longo de todo o comprimento. -> referencia agora e `c_*`/`cc_*` (runs finos removidos, maior componente, recorte no conteudo).
2. Importador OBJ do Blender ROTACIONA o modelo (Y-up->Z-up) -> usar forward_axis/up_axis explicitos.
3. `remove_doubles` reordena faces -> desalinhava o material_index por face. Removido.
4. Paleta com M_Blue claro demais caia na faixa "azul_clr" do auditor -> paleta recalibrada em linear.

### RESULTADOS MEDIDOS
| metrica | builder manual (w392/393) | visual hull (VH3/VHH) |
|---|---|---|
| IoU media | **0.820** | 0.802 |
| P10 | **0.756** | 0.681 |
| COR_TV | 0.256 | **0.170** |
| excesso | 12.0 | 12.8 |
| falta | 8.4 | **10.5** |
| regioes <0.80 | **6** | 9 |
- Votacao 2-de-3 (hull "soft") = DESASTRE: IoU 0.43, excesso 117% -> REJEITADA.
- erode 1 + interseccao = melhor config do hull.

### VISION (board mesma escala): FRONT 6 | SIDE 2 | TOP 3.5 | REAR 6
"O Visual Hull acertou volume grosso e distribuicao de cor grosso em frente/atras, mas falhou em
concavidade, oclusao e detalhe." SIDE: "buraco gigante no meio: torso, braco, coxa, volante e banco
sumiram"; capacete oco; rodas fantasma; listras horizontais (terracing do surface nets);
vazamento de textura da frente para as costas do capacete.

### CONCLUSAO TECNICA (a resposta a pergunta do usuario)
- Hull PURO nao serve: concavidades/cockpit/oclusoes viram VAZIO (limitacao matematica da tecnica).
- Builder autoral PURO nao serve: forma "chunky" e pecas erradas.
- **TECNICA CORRETA = HIBRIDA**: partes autorais (solidas, com concavidade, vao e oclusao) tendo o
  hull como REFERENCIA de envelope e CONTORNO, + cor por face amostrada do concept (o truque que
  derrubou COR_TV de 0.256 para 0.170), + validacao por elemento com vision.

### PROXIMA FASE
1. Aplicar a coloracao por projecao ao mesh do builder (usar o que funcionou).
2. Redesenhar por peca usando o envelope medido: FBUMP azul (concept) em vez de prata; 3 escapes tubulares; cockpit/piloto com volume (o hull prova que precisa ser autoral).
3. Regenerar o hull com surface nets + Smooth modifier para matar o terracing.


## HIBRIDO: COR AMOSTRADA NO MESH DO BUILDER (VHB) — VEREDITO (2026-09-19)

VHB = mesh do builder (113k faces, 0 non-manifold, 98.2% quads) + cor por face amostrada do concept.
- **COR_TV 0.256 -> 0.190** (recorde com pecas solidas) | IoU 0.814 | excesso 11.9 | falta 9.2
- familias: neutro 0.407 (c 0.514) | azul 0.425 (c 0.354) | amarelo 0.168 (c 0.133)

### MAS o vision REPROVA (2/6/1/2): "pixelacao em blocos, pecas flutuantes, transparencias fantasmas, z-fighting"
CAUSA: a cor por face amostra pixel a pixel e faces vizinhas caem em CLASSES diferentes
(borda do desenho = contorno preto -> M_Dark no meio de uma area azul) -> MOSAICO.
A superficie e a mesma malha limpa do builder; o defeito e a ATRIBUICAO de material.

### LICAO (terceira armadilha metrica do projeto)
COR_TV baixo NAO significa cor certa: o histograma casa, a COERENCIA ESPACIAL nao.
- Hull puro: contorno ok, concavidade/cockpit viram vazio.
- Cor amostrada: histograma otimo, aparencia mosaico.
- Builder autoral: aparencia coerente, mas forma chunky e pecas erradas.

### TECNICA CORRETA CONFIRMADA
Partes AUTORAIS (solidas, com concavidade/vao/oclusao) como base +
ENVELOPE MEDIDO por peca (do hull/masks) para as dimensoes +
MATERIAIS ATRIBUIDOS POR REGIAO SEMANTICA (nao por pixel) +
cor amostrada do concept apenas como REFERENCIA para corrigir material +
validacao POR ELEMENTO com vision (1 imagem por chamada).

### ESTADO: w393 segue sendo a base consolidada (COR_TV 0.256, aparencia limpa, IoU 0.820).
Artefatos salvos em modeling/rebuild/ (vh_build.py, vh_color.py, vh_render.py, hull-e1.obj).


## DESCOBERTA: AS VISTAS DO CONCEPT NAO ESTAO NA MESMA ESCALA (2026-09-19)

O usuario notou ("essa marcacao de tamanhos, o side e o rear parecem errados"). Verificado com a
GRADE das folhas (passo medido = 8 px em front/top; quadrado quadrado) e calibrado por 1 quad = 2.5 cm,
valor que faz a ALTURA DO FRONT bater EXATO com 1.207 m (-0.1%).

Medido (quadradinhos -> metros @2.5cm):
| vista | quadradinhos | em metros | esperado | erro |
|---|---|---|---|---|
| FRONT | 56.5 x 48.2 | 1.41 x 1.21 | 1.494 x 1.207 | -5.5% / **-0.1%** |
| SIDE  | 93.9 x 50.2 | 2.35 x 1.26 | 2.350 x 1.207 | **-0.1%** / +4.1% |
| TOP   | 77.8 x 51.5 | 1.94 x 1.29 | 2.350 x 1.494 | **-17.3%** / -13.8% |
| REAR  | 69.0 x 56.0 | 1.73 x 1.40 | 1.494 x 1.207 | **+15.5%** / **+16.0%** |

ALTURA em quadradinhos deveria ser identica nas 3 vistas frontais: FRONT 48.2 | SIDE 50.2 | REAR 56.0
-> spread de 16%.

### Consequencias
- TOP desenhado ~17% MENOR e REAR ~16% MAIOR que a escala das folhas. O SIDE e 4% mais alto que o FRONT.
- NENHUM objeto 3D pode casar 100% com as 4 vistas ao mesmo tempo: elas se contradizem em ate 16%.
  Era matematicamente impossivel atingir "100% identico" ajustando o modelo.
- O auditor normaliza cada vista pelo proprio bbox -> o erro de escala SOME na metrica (por isso as
  notas pareciam razoaveis enquanto o modelo estava inconsistente). O hull, que mistura vistas, herda
  a distorcao.

### FATORES DE CORRECAO (para trazer toda vista a mesma escala, 1 quad = 2.5 cm)
- FRONT: 1.000 (autoridade da ALTURA)
- SIDE:  0.960 na vertical (o SIDE e 4% alto); horizontal 1.000 (o comprimento ja bate 2.35)
- TOP:   x1.207 (77.75 -> 93.9 quad)
- REAR:  x0.861 (56.0 -> 48.2 quad). VERIFICACAO: 69 quad x 0.861 = 59.4 quad = 1.485 m de largura,
  contra 1.494 esperado -> -0.6%. Confirma que o REAR tem UM erro global de escala (1.16x), nao distorcao.
- TOP apos correcao: largura 51.5 x 1.207 = 62.2 quad = 1.554 m vs 1.494 -> +4% (aceitavel).

### PROXIMA ACAO
Aplicar os fatores por vista em vh_build.py (escala por vista antes de montar o hull) e recalibrar as
referencias do auditor. So depois remodelar as pecas.


## HULL RECALIBRADO POR VISTA (VHK) — 2026-09-19

vh_build.py agora usa uma TABELA DE ESCALA POR VISTA (VIEW_M) derivada da grade (2.5 cm/quadrado):
front (1.410 x 1.200) | side (2.330 x 1.255) | top (2.330 x 1.550) | rear (1.485 x 1.205).
Resultado: bbox do hull x +-1.170 | y +-0.745 | z 0.002..1.205 — bate com o esperado.

NOTA METRICA: a auditoria normaliza CADA vista pelo proprio bbox. Com a escala corrigida, a
referencia do auditor (masks crus) ficou DESALINHADA da escala do modelo -> IoU caiu para 0.724 e o
excesso subiu para 26.5. **Os numeros nao sao comparaveis aos anteriores**: a referencia precisa ser
recalibrada para a mesma escala (2.5 cm/quadrado) antes de qualquer comparacao valida.
Cor por regiao segue otima: neutro 0.502/0.514 | azul 0.348/0.354 | amarelo 0.151/0.133.


## ESCALA: DECISAO + BUG CORRIGIDO (2026-09-19)

### O auditor e INVARIANTE A ESCALA (por construcao)
`scale = sqrt((Wc/Wm)*(Hc/Hm))` e pinta o concept a 1.0 e o modelo a `scale` no mesmo canvas.
=> erro de escala ABSOLUTA cancela; so sobra diferenca de PROPORCAO (aspecto).
Foi por isso que o modelo pode estar 5% errado de tamanho e mesmo assim marcar IoU 0.82.

### As vistas do concept discordam entre si
Aspecto medido vs o box do contrato: FRONT -5.4% | SIDE -4.0% | TOP -4.0% | REAR -0.5%.
Pela grade (1 quad = 2.5 cm), o TOP foi desenhado 17% MENOR e o REAR 16% MAIOR (spread 16%).
Solucao consistente por FRONT+SIDE: H=1.207 -> W=1.413, L=2.255. Com ela o TOP erra 5.4% e o REAR 5.2%.
=> Teto de fidelidade de forma: as vistas concordam entre si em ~95%. **IoU 1.000 e impossivel.**

### Decisao de escala
O CONTRATO do jogo manda L=2.35 W=1.494 H=1.207 -> o modelo 3D tem essas medidas.
Do concept se busca a PROPORCAO/forma. `VH_VIEWSCALE=1` usa a escala literal da grade (diagnostico);
default 0 = box do contrato (o mesmo que o auditor normaliza). Antes o VIEW_M estava sempre ligado.

### BUG MEU CORRIGIDO
`idx_centered` usava t = 0.5 + vals/span -> invertia o eixo x e TROCAVA FRENTE/TRASEIRA no hull
(sintoma: IoU caiu para 0.736 e excesso subiu para 26.5). Fix: t = 0.5 - vals/span (a frente esta
no pixel 'a' = col 0 nas folhas). Metrica voltou: IoU 0.802 / excesso 12.7 / falta 10.5.

### MELHOR HULL = VHN (N=240, erode=1, interseccao, materia por REGIAO filtro x3)
IoU 0.802 | P10 0.680 | COR_TV **0.199** | excesso 12.7 | falta 10.5 | <0.80 = 9
Cor por familia: neutro 0.501/0.514 | azul 0.352/0.354 | amarelo 0.147/0.133 | azul_clr 0.010/0.011


## DIAGNOSTICO DE PERFIL + ASA COM CORDA (W400-W402) — 2026-09-19

### METRICA NOVA (barata e legivel): PERFIL DO TOPO no SIDE
Compara a altura z(x) do concept com a do modelo, em fracao do comprimento.
Baseline w393: erro medio **4.9 cm**, max 27.8 cm.
Pior ponto: **frac 0.90 -> -28 cm** (a traseira do modelo e muito BAIXA ali).

### CAUSA: a asa era um TUBO com CORDA ZERO
`wing_tube=1` constroi o tubo em x FIXO (_wc) -> sem corda. O concept tem uma PLACA
(xf 0.89-1.00, z 0.60-0.80) sobre um pilone. Substituido por placa com corda.

### RESULTADO W402 (wing_tube=0, wing_x1=-0.905, wing_x2=-1.158, wing_z=0.585, wing_hh=0.092)
- perfil do topo: erro medio **4.0 cm** (melhor da serie) | frac 0.90: -28 -> **+1 cm** | 0.92-0.98 dentro de 1-2 cm
- **side/TRASEIRA 0.636 -> 0.682** (falta 20.9% -> 14.9%)  <- a pior regiao do projeto melhorou
- **top/ASA 0.653 -> 0.679** e corTV 0.243 -> **0.150**
- REGRESSAO: rear/ESCAPES 0.887 -> 0.828 (excesso 11.8% -> 16.7%) — a placa/endplates invadem a faixa z 0.45-0.62 do REAR
- agregado: IoU 0.820 -> 0.806 | excesso 12.0 -> 16.1 | COR_TV 0.256 -> 0.268

DECISAO: manter W402 (corrige a pior regiao e o pior erro de perfil; a regressao e numa regiao
que segue acima de 0.80). Proximo alvo: o excesso em rear/ESCAPES (endplates/placa baixa demais).

### METRICA DE PICO (nova): fracao do comprimento onde o perfil e mais alto (o capacete)
CONCEPT 0.622 | builder (w392/w393/vhs/vhb) **0.622 (delta 0.000 — exato)** | hull VHN 0.749 (+30 cm)
=> confirma de novo: o builder esta certo onde o hull erra.


## W403 = NOVA BASE (asa fina com corda) — 2026-09-19

O vision reprovou o W402 por OVERSHOOT ("tijolo 2-3x mais alto que a lamina do concept").
W403: wing_hh 0.092 -> 0.040 e endplates (0.055,0.028,0.055).

| metrica | w393 (antiga) | w402 (asa grossa) | **W403 (asa fina)** |
|---|---|---|---|
| IoU media | 0.820 | 0.806 | **0.816** |
| COR_TV | 0.256 | 0.268 | **0.261** |
| excesso | 12.0 | 16.1 | **12.6** |
| falta | 8.5 | 7.2 | 8.5 |
| side/TRASEIRA | 0.636 | 0.682 | **0.644** |
| top/ASA | 0.653 | 0.679 | **0.683** |
| rear/ESCAPES | 0.887 | 0.828 | **0.897** |
| rear/ASA_CAPACETE | 0.912 | 0.912 | 0.912 |

=> As 3 regioes-alvo melhoraram E o agregado ficou praticamente plano (-0.004 IoU): ganho REAL,
nao ganho agregado mascarando regiao. A regressao em rear/ESCAPES do W402 foi eliminada (0.897).
QA: 0 non-manifold, 98.2% quads.

### VISION no W402/W403 (REAR/SIDE/TOP): SIDE 6 | REAR 7.5 | TOP 6
Tipologia da asa CORRIGIDA e validada ("agora e placa/barra com corda, nao mais tubo fino").
MAIOR DIFERENCA RESTANTE (palavras do vision): **"o sistema de escapamento + estrutura traseira.
Zero tubos visiveis. Um monobloco cinza retangular com 2 pilares e so um orificio escuro central.
No concept: 3 ponteiras cilindricas metalicas, inclinadas, bem espacadas, vazadas, sobre quadro
tubular fino em U."** -> PROXIMO ALVO DEFINIDO: reconstruir os 3 escapes como tubos visiveis.


## W404 = NOVA BASE (escapamentos visiveis) — 2026-09-19

### DIAGNOSTICO DOS ESCAPES (com zoom 4x + vision, nao por suposicao)
Os 3 tubos EXISTIAM no builder (tube_round + boolean DIFFERENCE + lip + floor, `exh_open_*=ok`)
mas liam como ANEIS/ARCOS chapados. Causa medida: **estavam RECUADOS 7 cm atras da carroceria**
(bocas em x=-1.087, carroceria ate -1.160) -> em vista REAR nao havia cilindro nenhum protraindo.
FIX: `exh_x=-1.190` (bocas 6 cm ALEM da carroceria anterior) -> REAR passa a x=-1.218.

VISION (zoom 4x): "**Da para contar 3, claramente.** ... Leem como CILINDROS curtos vistos de frente,
com boca escura redonda, nao como decalque pintado." (+ ressalva: aneis superexpostos parecem
plastico em vez de metal escovado; bocas laterais sao tampoes chapados sem funil interno.)

| metrica | w403 | **W404** |
|---|---|---|
| IoU media | 0.816 | 0.816 |
| COR_TV | 0.261 | 0.265 |
| excesso | 12.6 | **12.3** |
| falta | 8.5 | 8.7 |
| side/TRASEIRA | 0.644 | **0.645** |
| **top/ASA** | 0.683 | **0.700** |
| top/MOTOR | 0.796 | 0.778 (regressao) |
| rear/ESCAPES | 0.897 | 0.897 |

### PROXIMO ALVO (regra da skill blender-autonomous-artist, ainda NAO cumprida)
"A peca que o auditor ve como monobloco/boneco derretido e o `join()` final num unico mesh.
Mantenha piloto/chassi/carenagens/rodas como OBJETOS DISTINTOS no .blend."
O builder faz `FIN=join(made,'<V>_body')` -> entregar as pecas separadas.
Depois: superexposicao dos aneis dos escapes (M_Silver metalico 0.85 estoura) e funil interno nas bocas laterais.


## T5 + W406/W407 — OBJETOS SEPARADOS e EIXO TRASEIRO (2026-09-19, ciclo unlazy)

### T5 (skill: "o join() final apaga a identidade das pecas; revisores convergem em monolito")
Builder passa a suportar `sep_parts=1`: W405 entrega **14 OBJETOS SEPARADOS**, cada um com QA proprio
(todos 0 non-manifold; NOSE 96.4%, Tub 99.5%, PODS 97.4%, pneus 97.8-97.9%, CH 98.2%, REAR 97.9%, PL 98.5% quads).
Metrica IDENTICA ao W404 => mudou a estrutura, nao a forma. Pendencia: Tub e PODS com has_uv=false.

### W406 — comprimento calibrado no contrato
`target_length=2.350` (o eixo alongado levara a 2.384): scale 0.98568, x_range -1.20..1.15 = 2.350 exato.
Efeito metrico: nulo (IoU 0.816, excesso 12.3->12.2), <0.80 9->8. Hipótese de que o deslocamento das
faixas causava o top/MOTOR foi REFUTADA (0.778 -> 0.777): pela regra da skill, "if the metric does not
move, you are editing the WRONG PART".

### W407 — EIXO TRASEIRO pelo teste de RUN COUNT (a regra que a skill ensina)
TOP xf 0.72-0.80: o concept tem **1 run contiguo**, o modelo tinha **3** com vao em |y| 0.30-0.51.
Causa achada no codigo: `Rear_Axle` ia so ate **+-0.240** e nao alcancava a face interna do pneu (0.494).
Fix `axle_w=0.520`:
- run count xf 0.76 e 0.78: **3 -> 1** (igual ao concept)
- IoU 0.816 -> **0.818** | falta 8.8 -> **8.6** | regioes <0.80: 8 -> **7** | excesso 12.2 | COR_TV 0.266
- xf 0.72 ainda com 3 runs -> falta um elemento naquela faixa (proximo alvo)
=> W407 = nova base.


## W408 (BASE) / W409 (REVERTIDO) — 2026-09-19

W408: bandeja traseira escura pelo diagnostico de RUN COUNT -> TOP xf 0.70/0.72 de 3 -> 1 run (igual ao
concept); **top/MOTOR 0.812 -> 0.855**, falta 11.2->6.5%, cor 0.148->0.100; IoU 0.820 (recorde da serie),
COR_TV 0.264, falta 8.4. QA 0 non-manifold, 14 objetos separados.

W409 (EXPERIMENTO REVERTIDO — nao repetir): asa inclinada (wing_tilt=0.220, wing_z=0.690, hh=0.060)
porque no SIDE o concept tem run de 0.24 m em xf 0.92-0.96 contra 0.12 m do modelo.
RESULTADO: IoU 0.820 -> **0.758**, excesso 12.2 -> **27.6%**, side/TRASEIRA 0.647 -> 0.576, <0.80 7 -> 10.
=> REVERTIDO. Licao: aquele run alto no SIDE nao e a lamina da asa inflada; inclinar a asa gera excesso
em vez de preencher falta. A falta de 22.6% em side/TRASEIRA tem outra causa (a identificar por cor/run).


## W410 (REVERTIDO) + DIAGNOSTICO DA LINHA DE PISO — 2026-09-19

W410 (wing_z 0.585 -> 0.650, sem tilt): IoU 0.820 -> **0.779**, rear/ESCAPES 0.894 -> **0.669** (falta 29.9%:
subir a asa abriu vao embaixo). => REVERTIDO.
DOIS experimentos seguidos na mesma direcao (altura da asa) falharam => pela skill, a regiao NAO e
mal-parametrizada: falta uma PECA. Base segue **W408** (IoU 0.820, COR_TV 0.264, falta 8.4, <0.80=7).

### MEDICAO DA LINHA DE PISO (a skill: "read the per-column runs' LOWEST bound, not only the highest")
Piso em z (limite inferior do run mais baixo), concept vs W408:
| xf | concept | modelo | delta |
|---|---|---|---|
| 0.60 | 0.087 | 0.118 | +3 cm |
| 0.66 | 0.081 | 0.118 | +4 cm |
| 0.72 | 0.105 | 0.043 | **-6 cm** |
| 0.78 | 0.093 | 0.009 | **-8 cm** |
| 0.84 | 0.003 | 0.092 | +9 cm |
| 0.92 | 0.048 | 0.040 | -1 cm |
| 0.95 | 0.129 | 0.040 | **-9 cm** |
| 0.98 | 0.300 | 0.300 | 0 |
=> O modelo fica 6-9 cm BAIXO DEMAIS em xf 0.72-0.78 e xf 0.95 (excesso embaixo) e alto demais em 0.84.
A rampa existe e ja sobe (z 0.10 -> 0.48 + espessura 0.15, xf 0.83-0.99): logo o excesso baixo vem de
OUTRA peca na faixa z 0.04-0.10 em xf 0.95 (candidatos: rbump / difusor / escape central).
PROXIMO: identificar por cor/bbox qual peca ocupa z 0.04-0.10 em xf 0.95 e subir/remover; repetir para
xf 0.72-0.78.


## W412 (BASE) / W413 — 2026-09-19/20

**W412 ACEITO (nova base):** escapes sobem `exh_dz=0.130`. Causa achada lendo as REGIOES do auditor:
`rear/ESCAPES` = vista REAR, faixa z 0.54-0.75 m (PARACH_BAIXO 0-0.30, DIFUSOR 0.30-0.54, ESCAPES 0.54-0.75,
PILOTO_COSTAS 0.75-0.94, ASA_CAPACETE 0.94-1.21). Os tubos estavam em z 0.34-0.47 = dentro do DIFUSOR.
Patch move tubos+bocas+labios+piso+bore+coletor juntos (8 pontos).
RESULTADO: IoU 0.820->**0.821**, P10 0.759->**0.762**, pior 0.647->**0.657**, COR_TV 0.264->**0.258**,
falta 8.4->**8.1**, **<0.80 7->6**, side/TRASEIRA falta 22.6->**20.0** e run count **3/2->3/1** (bate concept),
side/MOTOR 0.832->0.840. Custo: rear/ESCAPES 0.894->0.879 (cor 0.740->0.562). QA 0 non-manifold, 14 objetos.

**W413 (REVERTIDO/INÓCUO):** pads do piloto r 0.098->0.062 e |y| 0.162->0.176 (hipotese: pads fechavam o vao).
RESULTADO: metricas IDENTICAS (IoU 0.821, excesso 12.4, falta 8.1, side/PILOTO 0.735, front/PILOTO 0.743)
e run count em z 0.76/0.80 continua 1 (concept tem 3). Pads ficam ocluidos pelos bracos => nao eram a causa.

### DIAGNOSTICO PILOTO (medido, proximo leaf)
FRONT: em z 0.76 e 0.80 o concept tem **3 runs**: ombro 0.20..0.12 | cabeca 0.07..-0.07 | ombro -0.11..-0.20,
com VAOS em |y| 0.07-0.11/0.12. O modelo e **1 run solido 0.22..-0.22** => excesso 23.8% (front/PILOTO) e
23.7% (side/PILOTO). Em z 0.84 o concept ja e 1 run 0.21..-0.20 (capacete cheio).
=> O capacete do modelo comeca ~6 cm BAIXO demais (concept: so pescoco 0.14 m de largura em z 0.76-0.80;
capacete cheio so a partir de ~z 0.82). PROXIMO: subir/base do capacete e reduzir a largura na base.
Regioes rankeadas W412: side/TRASEIRA 0.657 | top/ASA 0.701 | side/PILOTO 0.735 | front/PILOTO 0.743 |
side/COWL 0.776 | top/RODAS_DIANT 0.792 | rear/PILOTO_COSTAS 0.800 | side/BICO 0.800.


## W414 (PROBE) — culpado do vao do PILOTO esta DENTRO de PL

Probe no Blender (sep_parts=1 permite consulta por objeto): unico objeto com vertice a <0.09 de
(x=-0.10, |y|=0.10, z=0.77) = **PL** (piloto), vertice exato (-0.108, 0.094, 0.781).
Extensoes: CH z 0.057..0.782 | PL z 0.241..1.165 | REAR z 0.022..0.806.
=> O material que fecha o vao |y| 0.07-0.13 em z 0.76-0.80 e uma sub-peca de PL (nao pads, nao capacete
puro: o dome do capacete a z 0.80 so tem meia-largura 0.069 = igual ao pescoco do concept; o Helm_Base
e um anel em z 0.808 com |y| 0.130-0.211, fora do vao).
PROXIMO: bissectar PL renderizando sub-pecas isoladas (Shoulders / Arm_L/R / Torso / Seat / WEP) no FRONT.

### ERRO DE INSTRUMENTO CONFIRMADO (corrigir em todas as medicoes de z)
As medicoes FRONT usavam fator 1.207 (altura do CONCEPT) tambem para a mascara do MODELO, cuja altura real
e 1.175 (z -0.01..1.165) => z do modelo superestimado ~2.7% (0.80 lido = 0.779 real). Fator correto 0.973.
O auditor (audit_bb.py) normaliza por bbox, entao NAO e afetado — so as minhas sondas de z.

### METODO DE COR NO FLAT PASS — SUSPEITO
Cor medida no flat pass em z 0.74-0.80 = RGB(106,117,130)..(118,131,146), cinza-azulado claro, que NAO
bate com nenhuma cor-base (M_Pilot sRGB ~ (35,68,124); M_Gasket (32,32,36)). => o passe FLAT pode ter
iluminacao/ambient residual. Antes de usar cor-do-flat para identificar peca, validar contra um material
conhecido de posicao conhecida.


## W415 (PROBE) / W416 (REVERTIDO)

W415 — bisseccao do vao por MATERIAL dentro de PL (caixa x -0.35..0.15, |y| 0.05-0.16, z 0.74-0.83):
  CH  {'M_Dark': 8}  z 0.747..0.769
  PL  {'M_Gasket':2252,'M_Face':1902,'M_Visor':1724,'M_Yellow':890,'M_Blue':496,'M_Pilot':30} z 0.747..0.830
=> quem preenche o vao e o CONJUNTO INFERIOR DO CAPACETE (gasket/rosto/visor/queixeira), nao os pads.
Chin_Guard esta em z FIXO 0.842 (depois scale z*0.80). Patches de rosto/visor = esfera raio HR*1.014=0.213
centrada em hz, com z-radius NAO escalado por SZ => descem abaixo do dome (0.789).

W416 — hipotese: capacete comprido embaixo (0.789-1.181 = 0.39 m vs concept 0.82-1.15 = 0.33 m);
helm_z 0.985->1.015 + helm_sz 0.934->0.790 (base 0.789->0.849, topo 1.181 preservado) + chin_z 0.842->0.872.
RESULTADO: **REGRIDE** — IoU 0.821->0.818, P10 0.762->0.760, COR_TV 0.258->0.269, falta 8.1->8.3,
<0.80 6->7, front/CAPACETE 0.832->0.801, rear/PILOTO_COSTAS 0.800->0.786. Excesso do piloto caiu
(23.8->21.8) mas abriu FALTA no capacete (3.0->6.3).
**LICAO: o tamanho em z do capacete esta CERTO. Encolher quebra a faixa CAPACETE (z 0.94-1.21).
Nao atacar o vao encolhendo o capacete — atacar a LARGURA (|y|) do rosto/visor abaixo de z ~0.84,
que no modelo chega a |y| 0.13 enquanto o concept ali so tem 0.07 (= meia-largura da propria esfera
do capacete a z 0.80).**

BASE ATUAL: **W412** (IoU 0.821, pior 0.657, COR_TV 0.258, <0.80 = 6, 14 objetos, 0 non-manifold).


## W417 (NEUTRO) / W418 (MELHORA side/PILOTO)

W417 — hipotese: patch de rosto/visor (raio HR*1.014) sem SZ protrai abaixo da elipsoide; comprimido z*SZ.
RESULTADO: neutro-negativo (IoU 0.821->0.820, COR_TV 0.258->0.265, <0.80 6->7). NAO adotado.

W418 — **VISION achou o que a metrica nao dizia**: na vista frontal aparece "uma barra preta horizontal
atras do piloto cortando a imagem logo abaixo do queixo" e o vao existe mas e interrompido por ela e pelos
protetores de orelha. Fui ao codigo: `nk=tubevar('Neck',[(-0.105,0,0.632),(-0.250,0,0.800)],[0.140,0.126])`
=> **raio 0.140 = 0.28 m de diametro**, exatamente o DOBRO do concept (run central 0.07 em z 0.76-0.80).
Mudei para 0.070/0.062. RESULTADO: IoU 0.821 (igual), excesso 12.4->**12.3**, **side/PILOTO 0.735->0.741**
(excesso 23.7->**22.7**), P10/<0.80/falta iguais, COR_TV 0.258->0.261.
front/PILOTO NAO moveu (23.8% igual) => o pescoco era UM dos preenchedores; o do FRONT e outro.

LICAO DE METODO (registrar): a caixa de probe tinha x -0.35..0.15 e por isso NAO pegou o que esta atras do
piloto — na vista FRONTAL tudo projeta ao longo de x, entao a caixa de probe precisa cobrir TODO o x.
Foi a VISION que apontou a barra; a metrica sozinha nao diria.


## CORRECAO CRITICA DE INSTRUMENTO — o "vao do PILOTO" era ARTEFATO

Re-medindo o FRONT com o mapeamento de z CORRETO (modelo H=1.175/topo 1.165; concept H=1.207/topo 1.207;
antes eu usava 1.207 nos dois => z do modelo 2.7% errado):

  z 0.76  concept 3 runs: 0.53..0.47 | **0.22..-0.22 (SOLIDO)** | -0.47..-0.53   |  W418 1 run 0.18..-0.18
  z 0.80  concept 2 runs: 0.49..0.49 | **0.17..-0.17 (SOLIDO)**                  |  W418 1 run 0.21..-0.21
  z 0.84  concept 1 run  **0.17..-0.17**                                        |  W418 1 run 0.15..-0.15

=> Com o z certo, o modelo BATE o concept (0.18-0.21 vs 0.17-0.22). **O concept NAO tem vao em
z 0.76-0.84** — os "3 runs com vao em |y| 0.07-0.11" que motivaram W413/W416/W417 eram leitura errada
(concept em 0.76-0.80 comparado com o modelo em 0.74-0.78). Por isso TRES experimentos seguidos nao
moveram front/PILOTO: a premissa estava errada, nao o parametro.

**REGRA NOVA: toda comparacao por z entre concept e modelo TEM de usar H e topo proprios de cada um.**
O auditor (audit_bb.py) normaliza por bbox e NAO sofre disso — so as sondas manuais.

Consequencia: front/PILOTO (excesso 23.8%) e side/PILOTO (22.7%) precisam de diagnostico NOVO com
mapeamento correto antes de qualquer outro build. Nao atacar mais por "run count de vao" no FRONT.


## DIAGNOSTICO NOVO front/PILOTO (mapeamento z CORRETO) — o excesso NAO e o piloto

Perfil de preenchimento em |y|<=0.30, concept vs W418 (z fisica, cada um com seu H/topo):
  z 0.845 concept 0.586 | W418 0.535 (-0.051)
  z 0.835         0.576 |      0.498 (-0.078)
  z 0.824         0.560 |      0.469 (-0.091)
  z 0.814         0.560 |      0.423 (-0.138)  <- FALTA
  z 0.804         0.560 |      0.695 (+0.135)  <- EXCESSO
  z 0.793         0.560 |      0.695 (+0.135)  <- EXCESSO
  z 0.783         0.670 |      0.695 (+0.025)
  z 0.772         0.717 |      0.610 (-0.107)
  z 0.762         0.733 |      0.610 (-0.123)
  z 0.752         0.749 |      1.000 (+0.251)  <- PIOR

RUNS na mesma z fisica (a chave):
  z 0.752 concept: 0.528..0.469 | **0.222..-0.222** | -0.469..-0.528
          W418  : **0.493..-0.490**  (bloco SOLIDO de 0.98 m)
  z 0.762 concept: 0.528..0.469 | 0.219..-0.216 | -0.469..-0.528
          W418  : 0.183..-0.180
  z 0.793 concept: 0.510..0.485 | 0.166..-0.166 | -0.481..-0.510
          W418  : 0.208..-0.206
  z 0.804 concept: 0.166..-0.166 |  W418: 0.208..-0.206
  z 0.814 concept: 0.166..-0.166 |  W418: 0.127..-0.124

=> Em z 0.752-0.772 o modelo tem material em **|y| 0.222-0.490** que o concept NAO tem (la o concept tem
o corpo central ate 0.222 e os sidepods so em 0.469-0.528, com VAO entre 0.222 e 0.469).
O excesso de 23.8% de front/PILOTO **nao e o piloto**: e o BODYWORK TRASEIRO largo/continuo demais nessa
altura (parte REAR: y +-0.52, z ate 0.8177) preenchendo o vao que o concept tem entre o corpo e os sidepods.
Confirma o que a VISION viu ("barra preta horizontal atras do piloto" cortando a imagem).

PROXIMO (concreto): probe no Blender do REAR na faixa z 0.74-0.82 com |y|>0.25 -> material -> identificar a
peca larga; depois estreitar/recuar essa peca para abrir o vao |y| 0.222-0.469 nessa altura.


### REFINAMENTO: a peca larga em z 0.752 esta no CH, nao no REAR

Cruzando com os part_bbox de W418:
  PODS   y +-0.7026  MAS z 0.1056..0.5279  -> nao alcanca z 0.752
  FBUMP  y +-0.585   MAS z 0.037..0.3469   -> nao alcanca
  REAR   y +-0.52    z 0.022..0.8177       -> alcanca, mas...
  **CH   y +-0.6301  z 0.058..0.7938**     -> alcanca E e o mais largo
O concept em z 0.752 tem apenas uma faixa estreita 0.469..0.528 (amortecedores/coilover) e VAO entre
0.222 e 0.469. O modelo esta SOLIDO 0.222..0.490 => a suspensao/chassi nessa altura fecha o vao.
Candidatos dentro de CH: springs (springL/springR), eixo traseiro (axle_w=0.520 de W407) e suportes.
PROXIMO: probe do CH na faixa z 0.74-0.80 com |y|>0.25 -> material -> estreitar/recuar a peca.


## W419 PROBE — o preenchimento vem de FACE GRANDE, e a ASA do modelo e larga demais

Probe por VERTICE em z 0.74-0.80 com |y|>0.25: **so um objeto** — REAR, M_Yellow (170 verts) + M_Blue (72),
|y| 0.470..0.500, z 0.740..0.755. NADA entre |y| 0.25 e 0.47.
Mas o mask em z 0.752 e SOLIDO 0.222..0.490 => o preenchimento nao vem de vertices: vem de uma FACE GRANDE
que atravessa o vao (vertices so nas extremidades). **Licao de metodo: probe por vertice NAO detecta peca
que cobre o vao com uma unica face — nesses casos medir o mask, nao os vertices.**

Leitura correta dos runs do concept em z 0.752: `0.528..0.469 | 0.222..-0.222 | -0.469..-0.528`
  -> centro 0.222..-0.222 = largura 0.444 m
  -> 0.469..0.528 = elemento separado (sidepod/coilover), VAO entre 0.222 e 0.469
O modelo tem 0.222..0.490 SOLIDO => a peca que cobre o vao e a **ASA** (placa unica de face grande):
no concept a asa tem **span +-0.222**; no modelo ela vai a **+-0.5**. A asa do modelo e ~2.3x larga demais,
e o elemento REAR M_Yellow em |y| 0.470..0.500 z 0.740..0.755 e o cap/endplate dela.

CONSISTENTE com o resto: a asa do modelo esta ao mesmo tempo LARGA DEMAIS (span) e BAIXA (topo 0.783 vs
concept 0.847 em xf 0.96). W409 (inclinar) e W410 (subir) falharam porque mexeram em z/tilt SEM reduzir o
span — a face continuou cobrindo o vao.

PROXIMO: reduzir o SPAN da asa de +-0.5 para ~+-0.24 e reavaliar z depois. Candidato: parametro de span
da asa no builder (wing span / cap position).


## W420/W421 — BISSECAO DO SPAN DA ASA (ambas rejeitadas; span 0.505 fica)

Mecanismo achado no builder: `_WS=P.get('wing_span',0.505)`; a asa e um LOFT de 13 secoes, cada uma um
quad de |y| 0 a 0.505 => FACE UNICA (por isso o probe por vertice nao a detectou). E `wz=wing_z*H`
= 0.585*1.207 = 0.706 ABSOLUTO, com hh 0.040 => placa em z 0.656-0.756, exatamente onde o mask FRONT
esta solido em z 0.752. Endplates em sy*0.492 (o M_Yellow do probe, |y| 0.470-0.500).

  variante  span   IoU    P10    pior            excesso  falta  <0.80  COR_TV
  W418      0.505  0.821  0.762  0.657 TRASEIRA  12.3     8.1    6      0.261
  W421      0.385  0.809  0.743  0.657 TRASEIRA  11.7     9.9    9      0.257
  W420      0.240  0.798  0.716  0.623 top/ASA   11.0     11.6   9      0.263

front/PILOTO: span 0.505 -> excesso 23.8% ; 0.240 -> excesso 5.5% MAS falta 32.3%.
=> O DIAGNOSTICO ESTAVA CERTO (a asa cobre o vao), mas **estreitar o span piora o conjunto** (IoU e <0.80).
REGRA APLICADA: ganho regional (excesso 23.8->5.5) que piora o todo NAO se aceita. **span 0.505 fica.**

CONCLUSAO: o problema da asa nao e o SPAN — e o **Z**. A asa esta em z 0.656-0.756 (absoluto) enquanto o
concept tem o topo da asa em 0.847 (medido em xf 0.96, SIDE). W410 tentou subir (wing_z 0.585->0.650 =>
0.785 absoluto) e falhou por rear/ESCAPES 0.894->0.669 (falta 29.9%) — ou seja, subir a asa a joga para
fora da faixa ESCAPES normalizada do auditor. **Antes de tentar z de novo: entender as faixas z do auditor
(ESCAPES 0.45-0.62 normalizado => 0.543-0.748 m) e ver se o colapso de rear/ESCAPES no W410 e artefato de
faixa ou erro real.** Esse e o proximo passo.


## W422 — SUBIR A ASA (teste limpo na base atual) = REGRESSAO SEVERA, revertido

Antes de testar, verifiquei o auditor: `band()` usa o bbox do CONCEPT e aplica a mesma fatia aos dois
(nao ha artefato de faixa). E notei que **W410 foi testado ANTES do fix exh_dz** — a faixa ESCAPES
(z 0.543-0.748) e preenchida pelos ESCAPAMENTOS no concept, e W410 subiu a asa para dentro dela sem ter os
escapes la. Logo a hipotese de subir a asa nunca tinha sido testada na base atual.

W422: wing_z 0.585->0.669 (placa 0.656-0.756 -> 0.757-0.857, topo alvo 0.847 medido em xf 0.96) com
wing_span 0.505 e exh_dz 0.130 mantidos. REAR z max 0.8177->0.8675 (a asa subiu de fato).
RESULTADO: **REGRESSAO SEVERA** — IoU 0.821->**0.770**, P10 0.762->0.656, pior 0.657->**0.421@front_PILOTO**,
excesso 12.3->**17.9**, falta 8.1->11.2, <0.80 6->**10**.
  front/PILOTO 0.743->**0.421** (excesso 53.3%, falta 35.5%)
  rear/PILOTO_COSTAS 0.800->**0.429** (excesso 75.7%)
  rear/ESCAPES 0.879->0.670 (falta 28.2%)
  **top/ASA 0.701 -> 0.701 IGUAL** (subir a asa nao melhorou nem a propria regiao da asa)

### CONCLUSAO: parametros da ASA CONFIRMADOS CORRETOS por refutacao independente
  z para cima (W422, +10 cm)  -> IoU -0.051  REFUTADO
  z para cima (W410, +6.5 cm) -> rear/ESCAPES -0.225  REFUTADO
  inclinar (W409)             -> IoU -0.062, excesso 27.6%  REFUTADO
  span menor (W421 0.385)     -> IoU -0.012, <0.80 6->9  REFUTADO
  span menor (W420 0.240)     -> IoU -0.023, <0.80 6->9  REFUTADO
=> A asa esta CERTA em z, span e inclinacao. **Os excessos de top/ASA (22.9%) e front/PILOTO (23.8%)
NAO vem da asa.** Procurar em: airbox/roll hoop, tampo do bodywork traseiro, bandeja, ou o que ocupa
z 0.79-0.81 com |y|>0.25 (o W419 probe achou so REAR M_Yellow em 0.470-0.500 = endplate da asa, que agora
sabemos estar certo).

**REGRA NOVA: antes de testar um parametro, verificar se a versao anterior dele foi medida na MESMA base
(W410 foi medido sem exh_dz e "provou" algo falso).**


## TOP/ASA — medicao por COLUNA acha o excesso: a asa comeca 6 cm cedo demais

TOP, largura (y) por coluna xf (concept y_total 1.494 | modelo 1.470):
  xf 0.80 concept 0.747..0.228 | -0.094..-0.620   |  W418 0.735..0.490 | 0.360..-0.358 | -0.487..-0.732
  xf 0.84 concept 0.743..0.442 | 0.381..-0.609   |  W418 0.732..0.493 | 0.327..-0.324 | -0.490..-0.729
  xf 0.88 concept 0.504..0.446 | **0.377..-0.254 | -0.344..-0.403**  (2 VAOS)
         W418   **0.498..-0.496** (SOLIDO, sem vao)
  xf 0.92 concept 0.504..-0.403 (solido) | W418 0.513..-0.510  ~igual
  xf 0.96 concept 0.508..-0.403 (solido) | W418 0.498..-0.496  ~igual
  xf 0.99 concept 0.392..0.228 | -0.105..-0.268 | W418 0.304..0.135 | 0.113..-0.110 | -0.132..-0.301
         (modelo 0.304 vs concept 0.392 => modelo mais ESTREITO na traseira extrema)

LEITURA: o concept tem VAOS em xf 0.88 e e SOLIDO a partir de ~0.90 => **a asa do concept comeca em xf ~0.90**.
O modelo: wing_x1=-0.905 => xf=(1.15+0.905)/2.35=**0.874** => comeca ~6 cm CEDO DEMAIS, e os endplates
(|y| 0.492) junto. Isso preenche os vaos |y| 0.254-0.446 em xf 0.88 = o excesso de 22.9% de top/ASA.
E na traseira extrema (xf 0.99) o modelo e estreito (0.304 vs 0.392) => a asa tambem TERMINA cedo demais
(wing_x2=-1.158 => xf=(1.15+1.158)/2.35=0.982 vs concept ~1.00).

PROXIMO (2 mudancas medidas, um build): wing_x1 -0.905 -> -0.96 (xf 0.874->0.897) e
wing_x2 -1.158 -> -1.195 (xf 0.982->0.998). Isso NAO mexe em z, span nem tilt — que estao provados certos.


## W423 — ASA MAIS PARA TRAS = REFUTADO (6o experimento na asa)

wing_x1 -0.905->-0.96 (xf 0.874->0.897), wing_x2 -1.158->-1.195 (xf 0.982->0.998). Z/span/tilt intactos.
RESULTADO: IoU 0.821->0.819, P10 0.762->0.758, pior 0.657->**0.637**, excesso 12.3->12.4, falta 8.1->8.3,
**top/ASA 0.701->0.682** (excesso 22.9->23.1, falta 13.8->**16.0**), side/TRASEIRA 0.657->0.637,
front/PILOTO 0.743->0.743 (IDENTICO, nem se moveu).

### A ASA ESTA ENCERRADA: 6 experimentos independentes, todos refutados
  z +10cm (W422) IoU -0.051 | z +6.5cm (W410) ESCAPES -0.225 | tilt (W409) IoU -0.062
  span 0.385 (W421) IoU -0.012 | span 0.240 (W420) IoU -0.023 | x para tras (W423) IoU -0.002, top/ASA -0.019
=> z, span, tilt e posicao X da asa estao TODOS corretos. O excesso de top/ASA (22.9%) e front/PILOTO
(23.8%) NAO e da asa — e de OUTRA peca que ocupa a mesma faixa.

PISTA SOLIDA que sobrou da medicao TOP por coluna (xf 0.88):
  concept: 0.504..0.446 | **0.377..-0.254** | -0.344..-0.403   => corpo central ate |y| 0.254, VAOS em
            |y| 0.254-0.344 e 0.377-0.446, e um elemento FINO em |y| 0.344-0.377
  W418   : 0.498..-0.496 SOLIDO
O concept tem um elemento fino em |y| 0.344-0.377 em xf 0.88 (candidato: suspensao/eixo traseiro) e VAO
dos dois lados dele. O modelo tem material continuo de 0 a 0.498 => ha uma peca do modelo que preenche
esses vaos. **Proximo probe: objetos com vertices em x -0.918 (xf 0.88) e |y| 0.26-0.44, qualquer z.**


## W424 probe / W425 (NOVA BASE) / W426 — a asa e ENFLECHADA (achado real)

W424 probe em x -0.97..-0.87 (xf 0.88) com |y| 0.26-0.44: **so** REAR M_Silver, 12 verts, |y| 0.324-0.325,
z 0.286-0.434 (= o elemento fino do concept, que o modelo TEM certo). Nenhuma face grande cruzando.
=> o material solido ate |y| 0.498 em xf 0.88 so pode ser a ASA (x -0.905..-1.158 cobre -0.918), cuja secao
e um QUAD RETANGULAR de |y| 0 a 0.505. O concept em xf 0.88 tem material so ate |y| 0.377 e VAOS em
0.254-0.344 / 0.377-0.446 => **a asa do concept e ENFLECHADA: estreita no bordo de ataque, cheia em xf 0.92**.

W425 — sweep LINEAR (span 0.377 em u=0 -> 0.505 em u=1): IoU 0.821 (=), COR_TV 0.261->**0.253**,
excesso 12.3->**12.1**, falta 8.1->8.3, <0.80 6 (=), top/ASA 0.701->0.695 (excesso 22.9->**20.0**),
front/PILOTO 0.743->**0.745** (excesso 23.8->23.2), side/PILOTO 0.741 (=).
W426 — sweep CUBICO (so o bordo de ataque afina): COR_TV 0.257, excesso 12.2, **<0.80 7** => PIOR que W425.

**W425 ADOTADO COMO BASE**: mesmo IoU/P10/pior/<0.80 do W418, com COR_TV e excesso MELHORES. Ganho real
(geometria medida no concept + metrica de cor melhor). Builder: /tmp/bb25.py (+ param wing_sweep).
Novo padrao: wing_sweep=0.253.

Base: W425 — IoU 0.821 | pior 0.657 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.


## SIDE/TRASEIRA (0.657, pior regiao) — medicao por COLUNA acha 3 defeitos

SIDE, runs (z) por coluna xf. concept H=1.207/topo 1.207 | W425 H=1.175/topo 1.165:
  xf 0.82 concept 0.646..0.003            | W425 0.676..0.041      (~ok; modelo 3.8cm alto no piso)
  xf 0.86 concept 0.625..0.003            | W425 0.631..0.027      (~ok)
  xf 0.90 concept **0.817..0.552 | 0.477..0.003**  (2 runs: asa 0.265 de altura + corpo SOLIDO)
         W425    **0.752..0.659 | 0.639..0.344 | 0.271..0.032**  (3 runs)
  xf 0.94 concept 0.841..0.613 | 0.537..0.093
         W425    0.752..0.400 | 0.274..0.029
  xf 0.97 concept **0.850..0.688 | 0.588..0.450 | 0.369..0.249** (3 runs separados)
         W425    **0.735..0.080** (1 run SOLIDO)
  xf 0.99 concept 0.853..0.754 | 0.597..0.501 | W425 0.659..0.412

DEFEITO 1 — perfil da ASA no SIDE. concept: banda que sobe e afina: 0.552-0.817 (xf 0.90, 0.265 de altura),
  0.613-0.841 (0.94), 0.688-0.850 (0.97), 0.754-0.853 (0.99) => bordo de ataque em (xf 0.90, z 0.552) e
  fuga em (xf 0.99, z 0.853): corda ~0.21 em xf (~0.49 m) subindo 0.30 em z => INCLINACAO ~31 graus.
  W425: 0.659-0.752 (xf 0.90) = 0.093 de altura => placa FINA e HORIZONTAL, topo 0.752 vs concept 0.817.
  (ATENCAO: na vista SIDE tudo projeta em y, entao essa banda pode ser asa + airbox/roll hoop juntos.)
DEFEITO 2 — BURACO no corpo. em xf 0.90 o concept e SOLIDO 0.003..0.477; o modelo tem VAO em z 0.271-0.344
  (runs 0.639..0.344 e 0.271..0.032). Ha material faltando no corpo traseiro nessa altura.
DEFEITO 3 — traseira extrema. em xf 0.97 o concept tem 3 elementos separados (0.850..0.688 | 0.588..0.450 |
  0.369..0.249) e o modelo e 1 bloco SOLIDO 0.735..0.080 => o modelo funde o que no concept e separado
  (mesmo padrao da asa: o concept separa, o modelo preenche).

PROXIMO (ordem): (a) DEFEITO 2 e o mais simples e verificavel — achar a peca que falta no corpo traseiro em
z 0.27-0.34 (probe: objetos com vertice em x ~ -0.965 e z 0.27-0.35); (b) DEFEITO 3 exige separar o bloco
traseiro; (c) DEFEITO 1 exige decidir se a banda e asa+airbox antes de inclinar a asa (W409 falhou).


## W427 — vao difusor/rampa parcialmente fechado (rzb 0.100->0.050)

DEFEITO 2 atacado: em x -0.965 o difusor termina em z 0.282 e a rampa comecava em 0.329 => vao de 4.7 cm
que o concept nao tem. Param JA EXISTIA: `rzb` (rampa z base), sem precisar patch de codigo.
(Nota: minha 1a tentativa falhou com AssertionError porque procurei `_RZ0=0.100` literal e o codigo e
`_RZ0=P.get('rzb',0.100)` — o parametro ja estava exposto.)

RESULTADO: IoU 0.821 (=), P10 0.762 (=), COR_TV 0.253 (=), excesso 12.1 (=), falta 8.3 (=), <0.80 6 (=),
**side/TRASEIRA 0.657->0.658** (falta 20.0->19.9), side/MOTOR 0.840 (=).
SIDE xf 0.90 runs: 0.752..0.659 | 0.639..0.327 | 0.271..0.032 => o vao caiu de 0.271-0.344 para
0.271-0.327 (de 7.3 cm para 5.6 cm). **Ainda falta fechar 2.7 cm** (difusor top 0.282 vs rampa 0.309).

MATEMATICA DO FECHAMENTO COMPLETO: _zb(t) = rzb + (rzt-rzb)*t ; em t=0.603 queremos _zb = 0.282
=> rzb*0.397 + 0.480*0.603 = 0.282 => **rzb = -0.018** (ou alternativamente subir o difusor:
box Diffuser z 0.152+-0.130 -> top 0.282; subir para 0.170+-0.145 da top 0.315).

Base: W427 — IoU 0.821 | pior 0.658 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.
PROXIMOS (medidos, na ordem): (a) fechar os 2.7 cm com rzb=-0.018 OU difusor top 0.315;
(b) DEFEITO 3 — em xf 0.97 o concept tem 3 elementos separados (0.850..0.688 | 0.588..0.450 | 0.369..0.249)
e o modelo e 1 bloco 0.735..0.080 => separar o bloco traseiro; (c) DEFEITO 1 — perfil da asa no SIDE
(concept: banda 0.552-0.817 em xf 0.90 afinando ate 0.754-0.853 em xf 0.99; modelo: 0.659-0.752 fino e
horizontal) — ATENCAO: na vista SIDE tudo projeta em y, entao essa banda pode ser asa + airbox juntos.


## W428/W429/W430 — fechamento do vao difusor/rampa (W429 = NOVA BASE)

W428 — fechar por BAIXO (rzb -0.018): a rampa furou o chao (z -0.017), o z_range cresceu para [-0.017,1.165]
=> mudou o bbox e a normalizacao do auditor. RESULTADO: IoU 0.821->0.817, COR_TV 0.253->0.256,
excesso 12.1->12.6, <0.80 6->8. **REVERTIDO. LICAO: nunca mexer em parametro que altere o z_range/bbox do
modelo — isso desloca TODAS as medicoes do auditor (normaliza por bbox).**

W429 — fechar por CIMA: dfz 0.152->0.170, dfh 0.130->0.145 (difusor top 0.282->0.305), rzb 0.050 mantido.
bbox intacto (z_range [-0.01,1.165]).
RESULTADO: IoU 0.821 (=), P10 0.762 (=), COR_TV 0.253 (=), excesso 12.1 (=), falta 8.3 (=), <0.80 6 (=),
**side/TRASEIRA 0.658->0.660** (falta 19.9->19.6). Vao em xf 0.90 caiu para 2.2 cm.
**ADOTADO — melhora sem nenhuma regressao.**

W430 — dfz 0.180, dfh 0.147 (top 0.327, fechamento total, vao 1.1 cm): side/TRASEIRA 0.660->**0.657** ✗
(o difusor crescendo adiciona area em outras colunas). **REVERTIDO — W429 e o otimo deste par.**

Base: **W429** — IoU 0.821 | pior 0.660 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.
Parametros: rzb=0.050, dfz=0.170, dfh=0.145, wing_sweep=0.253, exh_dz=0.130, neck_r0=0.070, neck_r1=0.062.
PROXIMOS: (a) DEFEITO 3 — em xf 0.97 o concept tem 3 elementos separados (0.850..0.688 | 0.588..0.450 |
0.369..0.249) e o modelo e 1 bloco 0.735..0.080 => separar o bloco traseiro; (b) DEFEITO 1 — perfil da asa
no SIDE (banda 0.552-0.817 em xf 0.90), com a ressalva de que SIDE projeta tudo em y (asa + airbox juntos).


## DEFEITO 3 — causa identificada: TUBOS DE ESCAPE GROSSOS DEMAIS

Probe em xf 0.97 (x -1.17..-1.09): SO o REAR — M_Silver 1390, M_Eye 893 (bocas), M_Dark 866, M_Blue 116,
z **0.026..0.745** (continuo). O concept nessa coluna tem 3 elementos SEPARADOS:
  **0.850..0.688** (asa) | **0.588..0.450** (escapamentos, 0.138 de altura) | **0.369..0.249** (difusor/rampa)
  => VAOS do concept em z 0.369-0.450 (8 cm) e 0.588-0.688 (10 cm).

CAUSA: `exh_c_r=0.128` (tubo central) e os laterais ~0.110 => DIAMETRO 0.256 m. O tubo central apos exh_dz
ocupa z 0.470+-0.128 = **0.342..0.598** e os laterais 0.392+-0.110 = 0.282..0.502. Isso FECHA o vao
0.369-0.450 que o concept tem. O elemento 2 do concept tem apenas 0.138 de altura
(z 0.450-0.588) => o diametro dos tubos deveria ser ~0.14 => **raio ~0.070** (o modelo usa 0.128 = ~2x).

PROXIMO (concreto): `exh_c_r` 0.128 -> ~0.070 e os raios laterais proporcionalmente (~0.110 -> ~0.062);
verificar se isso abre os vaos 0.369-0.450 e 0.588-0.688 sem perder a leitura das 3 bocas (o W404/W412
consolidou as bocas como 3 cilindros protraidos ~6 cm — reduzir o raio mantem as 3 bocas, so mais finas).

Base: **W429** — IoU 0.821 | pior 0.660 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.


## W432 — tubos de escape afinados = REFUTADO (nao eram o preenchedor)

exh_c_r 0.128->0.088, laterais ->0.076 (furo interno 0.074 mantido; parede de 5.4cm -> 1.4cm).
RESULTADO: IoU 0.821->0.820, P10 0.762->0.761, pior 0.660->**0.644**, side/TRASEIRA 0.660->**0.644**
(falta 19.6->21.9), falta 8.3->8.4. E **o run em xf 0.97 continua SOLIDO 0.735..0.080** (nao abriu nada).
=> os tubos NAO eram o que fecha os vaos. A hipotese do diametro 2x estava errada quanto a causa.

**Estado do DEFEITO 3: ainda ABERTO.** O probe mostrou que em x -1.17..-1.09 SO o REAR tem vertices
(M_Silver 1390, M_Eye 893, M_Dark 866, M_Blue 116) e o z vai de 0.026 a 0.745. Como o probe por VERTICE
nao pega face grande (licao do W419), e provavel que seja uma FACE GRANDE do REAR cruzando essa faixa
(candidatos M_Silver: rampa/muffler/laterais) — medir o mask, nao os vertices.
PROXIMO: para cada sub-peca do REAR, calcular a silhueta projetada em Y (numpy sobre os vertices da peca,
nao do conjunto) e ver qual cobre z 0.08..0.47 nessa coluna.

Base: **W429** (intacta) — IoU 0.821 | pior 0.660 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.


## W433 probe de FACES — os escapes estao ~6 cm BAIXOS (nao e o diametro, e o Z)

Varredura das FACES do REAR que cruzam a coluna x=-1.13 na faixa z 0.08-0.47:
  {('M_Silver','COBRE'): 41, ('M_Silver','cruza'): 18, ('M_Dark','COBRE'): 8}
Exemplos decisivos:
  M_Silver x **-1.183..-0.864** z 0.388..0.431 |y| 0.045..0.072
  M_Silver x **-1.182..-0.862** z 0.402..0.451 |y| 0.072..0.094
  M_Silver x **-1.180..-0.859** z 0.422..0.476 |y| 0.094..0.112
  M_Silver x **-1.177..-0.855** z 0.446..0.504 |y| 0.112..0.123
=> sao as faces LONGAS dos tubos de escape (0.32 m de comprimento em x, M_Silver). Elas cobrem a coluna em
**z 0.388-0.504**. O elemento 2 do concept (SIDE xf 0.97) esta em **z 0.450-0.588**.
=> **os tubos estao ~6 cm BAIXOS**, nao grossos (W432 afinou o diametro e foi refutado; o defeito e o Z).
   exh_dz 0.130 -> ~0.192 desloca o conjunto para 0.450-0.566 (bate o elemento 2 do concept).
Outros: M_Silver x -1.133..-1.126 z 0.267..0.276 e 0.315..0.324 |y| 0.262..0.265 (elemento fino da suspensao
= o do concept em |y| 0.344-0.377, ja presente) e 8 faces M_Dark.

LICOES DE METODO consolidadas nesta serie:
  1. Probe por VERTICE nao acha face grande (W419, W433) -> varrer FACES quando o mask for solido.
  2. Comparacao por z entre concept e modelo exige H/topo proprios de cada um (o erro de 2.7% gerou 3
     experimentos inuteis: W413/W416/W417).
  3. Nunca mexer em parametro que altere o bbox/z_range do modelo (W428) — o auditor normaliza por bbox.
  4. Antes de testar um parametro, conferir se a versao anterior dele foi medida na MESMA base (W410).

Base: **W429** — IoU 0.821 | pior 0.660 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.
PROXIMO: exh_dz 0.130 -> 0.192 (medido pelo elemento 2 do concept em z 0.450-0.588).


## W434 — escapes 6 cm mais altos = REFUTADO (e o run xf 0.97 segue SOLIDO)

exh_dz 0.130->0.192 (tubos para z 0.522-0.604, alinhando com o elemento 2 do concept 0.450-0.588).
RESULTADO: IoU 0.821->0.819, P10 0.762->0.760, pior 0.660->**0.630**, COR_TV 0.253->0.256,
side/TRASEIRA 0.660->**0.630** (falta 19.6->22.5), side/MOTOR 0.840->0.835.
E **o run em xf 0.97 continua SOLIDO 0.738..0.080** => os escapes NAO sao o preenchedor.

### DEFEITO 3 — DUAS hipoteses refutadas (W432 diametro, W434 altura); o preenchedor e OUTRA peca
O meu detector de "COBRE" no W433 usou formula baricentrica de TRIANGULO em faces de 4 vertices => o
resultado nao e confiavel. O dado bruto confiavel foi: faces M_Silver com x **-1.183..-0.855** e
z 0.388..0.504 (tubos) — mas o mask e solido de 0.08 a 0.738 nessa coluna, ou seja HA material em
z 0.08-0.388 e 0.504-0.656 que nenhuma peca do REAR deveria ter ali (bbox: difusor x -0.988..-0.868;
rampa x -0.748..-1.108; wing z 0.656-0.756; rbump x -0.928; collector x -0.99; tray x -0.50).

**PROXIMO PASSO CORRETO (nao repetir o erro do W433):** nao usar formula de triangulo em quads. Fazer
RASTERIZACAO de verdade por peca: renderizar um mask por sub-peca do REAR (escondendo todas as outras)
em 1 unico processo Blender e ler a coluna xf 0.97 de cada mask. So assim se acha a peca que cobre
z 0.08-0.388 naquela coluna. Alternativa barata: projetar cada vertice/face em numpy com PIL (poligono
preenchido) e somar a cobertura por peca.

Base: **W429** (intacta) — IoU 0.821 | pior 0.660 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.


## W435 — RASTERIZACAO REAL: o preenchedor e uma peca M_Silver do REAR (z 0.077-0.677)

Metodo correto (dois triangulos por quad, baricentrico verdadeiro, grade 2400x1200 projetada em (x,z)):
coluna x=-1.13:
  REAR  M_Silver  **0.077..0.677**   <- UMA peca de ~0.60 m de altura nessa coluna
  REAR  M_Dark    0.277..0.338
  REAR  M_Blue    0.659..0.736
  CH / PL / Tub / PODS: VAZIO (descarta chassis, piloto, tub e sidepods)
=> o bloco solido 0.738..0.080 do mask vem de uma peca **M_Silver do REAR** com ~0.6 m de altura em
x=-1.13. Candidatos por material (M_Silver no REAR): rampa (x -0.748..-1.108, z 0.05-0.63),
tubos de escape (z 0.40-0.66 nessa x), Airbox_Top (x -0.768), rbump (x -0.928), collector (x -0.99).
Nenhum bbox explica z 0.077-0.677 => e preciso o NOME da peca, nao o material.

**PROXIMO PASSO EXATO:** refazer a rasterizacao por REGIAO e nao por material. O builder chama
`reg('nome', obj)` para cada sub-peca (ramp, rbump, wing, headrest, collector, airbox0/1/2, ...) —
instrumentar o builder para guardar, por objeto, o nome da regiao e o indice de faces, e depois rasterizar
cada regiao isolada na coluna x=-1.13. Isso da o nome direto da peca de 0.6 m.
ALTERNATIVA mais rapida: renderizar 1 mask por regiao (escondendo as outras) num unico processo Blender e
ler a coluna xf 0.97 de cada mask — mesma informacao, sem instrumentar o builder.

Base: **W429** (intacta) — IoU 0.821 | pior 0.660 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.


## W436 — ILHAS DA MALHA: a peca esta IDENTIFICADA por bbox

Metodo: componentes conexos da malha do REAR (union-find nos edges), projecao em (x,z), filtro da coluna.
Ilhas que cobrem x=-1.13 na faixa z 0.077-0.677:
  **ilha nv=330  x -1.143..-1.061  z 0.077..0.634  |y| 0.000..0.305  M_Silver**  <- A CULPADA
   ilha nv=154  x -1.139..-1.065  z 0.251..0.333  |y| 0.000..0.265  M_Silver
   ilha nv=152  x -1.132..-1.072  z 0.268..0.347  |y| 0.272..0.286  M_Dark
=> e uma peca M_Silver de **0.56 m de altura, 8 cm de espessura em x, cilindrica ao longo de y** (|y| 0-0.305)
no extremo traseiro. Perfil: 330 verts, x span 0.082, z span 0.557 => revolve/sweep de eixo Y (um CANO/CILINDRO
transversal), nao um painel. **O mask em xf 0.97 fica solido 0.08-0.738 por causa dela.**

NAO bate com nenhum bbox que eu havia suposto: rampa (x -0.748..-1.108, span 0.36 em x) ✗; rbump (x -0.928) ✗;
collector (x -0.99) ✗; Airbox_Top (x -0.768) ✗; tubos de escape (z 0.40-0.66 nessa x) ✗.
**PROXIMO PASSO EXATO:** casar esse bbox (x -1.143..-1.061, |y| 0-0.305, z 0.077-0.634, M_Silver, 330 verts)
com uma peca do codigo do `rear()` — provavelmente um cilindro transversal (muffler/canister) ou o
`Rear_Ramp` construido com eixo diferente do que assumi. Depois: reduzir/deslocar essa peca para abrir os
vaos z 0.369-0.450 e 0.588-0.688 que o concept tem em xf 0.97.

Base: **W429** — IoU 0.821 | pior 0.660 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.


## W436b — CULPADA NOMEADA: o PARA-CHOQUE TRASEIRO EM U

Cruzando o bbox da ilha (x span 0.082, |y| 0-0.305, z 0.077-0.634, M_Silver, 330 verts) com o codigo do rear():
  linha 702: `rb=tube_round('Rear_Bumper_U',scr,0.042,22)` -> tubo em U: |y| +-0.30, x +-0.042 (=span 0.084)
             e **z de 0.077 a 0.634** => e a ilha 1. CONFIRMADO.
  ilha 2 (nv=154, |y| 0-0.265, z 0.251-0.333) = `Rear_Bumper_Bot` (z = rbz 0.300 +- 0.038) ✓
  ilha 3 (M_Dark, |y| 0.272-0.286, z 0.268-0.347) = `Rear_Clamps` (z = rbz+0.012, |y| +-0.290) ✓

=> **O para-choque traseiro em U sobe ate z 0.634**, criando no SIDE a barra vertical de 0.56 m em x=-1.10
que fecha os vaos do concept em xf 0.97 (z 0.369-0.450 e 0.588-0.688). No concept o para-choque traseiro e
BAIXO (a faixa rear/PARACH_BAIXO do auditor vai de z 0 a 0.30).

**PROXIMO PASSO EXATO:** baixar/encolher o `Rear_Bumper_U` — o arco em U deve ficar em z ~0.077-0.35 (nao
0.634). Ler `scr` (linha ~700) para ver a construcao do U e reduzir a altura do arco (parametrizar com
`rbu_h`). Isso deve abrir os dois vaos de uma vez, sem tocar em bbox (z min 0.077 ja e o do para-choque).

Base: **W429** — IoU 0.821 | pior 0.660 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.

### SERIE DE METODO (para nao repetir): 5 erros de instrumento ja corrigidos
  1. fator de z 1.207 no modelo (H real 1.175) -> 3 experimentos inuteis
  2. probe por vertice nao acha face grande (W419/W433)
  3. baricentrico de triangulo em quad (W433) -> resultado nao confiavel
  4. parametro que altera bbox/z_range desloca o auditor inteiro (W428)
  5. comparar contra uma versao medida em base diferente (W410 sem exh_dz)
  METODO QUE FUNCIONA: (a) runs por coluna com calibracao propria; (b) ilhas da malha (union-find) para
  nomear a peca; (c) rasterizacao por material como triagem; (d) cruzar bbox com o codigo do builder.


## W437 — CONFIRMADO: Rear_Bumper_U baixado (rz1 0.598 -> 0.300) = NOVA BASE

RESULTADO: IoU 0.821 (=), P10 0.762->**0.763**, **pior 0.660->0.668 @side_TRASEIRA** (melhor da serie),
COR_TV 0.253 (=), excesso 12.1 (=), falta 8.3 (=), <0.80 6 (=).
  side/TRASEIRA 0.660->**0.668** (excesso 21.8->**20.3**, falta 19.6->19.6)
  **Os VAOS ABRIRAM**: xf 0.97 saiu de 1 bloco SOLIDO 0.738..0.080 para **2 runs 0.735..0.406 | 0.339..0.080**;
  xf 0.94 idem: 0.752..0.400 | 0.274..0.029 (antes era solido).
  (concept xf 0.97: 0.850..0.688 | 0.588..0.450 | 0.369..0.249 — 3 runs; o modelo tem 2, falta separar
   a asa do corpo: perfil da asa no SIDE = DEFEITO 1, ainda aberto.)

**BASE: W437** — IoU 0.821 | pior **0.668** | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.
Parametros ativos: rz1=0.300, rzb=0.050, dfz=0.170, dfh=0.145, wing_sweep=0.253, exh_dz=0.130,
neck_r0=0.070, neck_r1=0.062.

### CADEIA QUE RESOLVEU (metodo reutilizavel)
  mask solido numa coluna -> 1) rasterizar por MATERIAL (triagem: REAR/M_Silver)
  -> 2) ilhas da malha por union-find (bbox exato da culpada) -> 3) casar bbox com o codigo do builder
  -> 4) parametro exposto (rz1) -> 5) build + audit + runs da coluna para confirmar.
Os 2 probes por vertice (W419/W433) falharam porque a peca cobre o vao com faces longas, nao com vertices.

PROXIMO: DEFEITO 1 — perfil da asa no SIDE (concept: banda 0.552-0.817 em xf 0.90 afinando ate 0.754-0.853
em xf 0.99, inclinacao ~31 graus; modelo: 0.659-0.752 fino e horizontal). Agora que os vaos abriram, a asa
e o proximo ganho. Cuidado: W409 (tilt) falhou medido SEM este contexto — reavaliar com a base W437.


## W438 — tilt da asa +0.12: SIDE FICA EXATO, REAR QUEBRA (revertido, mas com dado novo)

wing_tilt=+0.12 ABSOLUTO (o valor medido: centro da banda do concept sobe 0.685->0.804). O W409 usou 0.266
= mais que o dobro, o que explica aquele fracasso.
RESULTADO:
  SIDE xf 0.97: **0.850..0.771 | 0.673..0.406 | 0.339..0.080** = 3 runs como o concept, e o topo da asa em
  **0.850 = EXATAMENTE o concept (0.850)** ✓✓✓  (em xf 0.90: 0.786..0.679 vs concept 0.817..0.552)
  **side/TRASEIRA 0.668->0.686** ✓✓ (falta 19.6->**17.4**)
  **COR_TV 0.253->0.248** ✓ (melhor da serie)
  top/ASA excesso 22.9->20.0 ✓
  MAS: IoU 0.821->**0.791**, P10 0.763->0.702, pior 0.668->**0.524**, excesso 12.1->**17.8**,
  <0.80 6->**9**, **rear/PILOTO_COSTAS 0.803->0.527 (excesso 73.3%)** ✗✗
=> **A inclinacao esta CERTA no SIDE e QUEBRA o REAR.** Leitura: o concept tem a asa inclinada (SIDE) mas
   a faixa REAR z 0.75-0.94 tem MUITO menos material que a asa inclinada do modelo => no concept a asa sobe
   mas e ESTREITA em |y| na parte alta (ou o topo da asa nao aparece cheio na vista REAR).
   => a inclinacao precisa vir ACOMPANHADA de reducao de span na parte alta (asa enflechada em 2 eixos).
REVERTIDO (ganho regional que piora o todo nao se aceita). **BASE SEGUE W437.**

PROXIMO: combinar wing_tilt=0.12 COM span menor na parte alta (a sweep atual e so em x; testar span
decrescente com o u da corda MAIS a inclinacao). O SIDE ja mostrou que o alvo e exato com 0.12.


## W439/W440 — a asa: REAR e FRONT do concept sao INCONSISTENTES (achado de instrumento)

W439 (tilt 0.12 + sweep REVERSO): IoU 0.800, excesso 16.8, <0.80 9, side/TRASEIRA 0.686 (=W438),
rear/PILOTO_COSTAS 0.572, front/PILOTO 0.569 (excesso 64.6%). Melhora vs W438 mas longe do W437.

W440 (wing_z 0.585->0.626 = +5cm ABSOLUTO e span 0.505->0.555, ambos MEDIDOS no REAR):
  **REAR z 0.74: 0.560..-0.558 = concept 0.555..-0.555 ✓✓✓ EXATO**
  **REAR z 0.68: 0.290..-0.287 = concept 0.287..-0.287 ✓✓✓ EXATO**
  MAS: IoU 0.821->**0.797**, P10 0.714, pior **0.503**, excesso 12.1->**15.5**, falta 8.3->9.1, <0.80 6->**9**,
  **front/PILOTO 0.503 (excesso 64.3%)**, rear/PILOTO_COSTAS 0.689 (excesso 43.6%).

**CONTRADICAO MEDIDA:** no REAR o concept tem a asa SOLIDA em |y| +-0.555 no z 0.74; no FRONT a mesma
faixa z 0.74 nao pode ter essa largura (senao nao haveria excesso de 64% quando o modelo poe a asa la).
=> ou (a) as vistas do concept NAO compartilham a mesma escala/normalizacao de z (minha premissa H=1.207
   para todas as vistas pode estar errada), ou (b) a asa do concept tem forma que se comporta diferente
   nas duas projecoes (impossivel para corpo rigido).
**A hipotese (a) e a mais provavel e e um erro de INSTRUMENTO de primeira ordem: preciso validar a escala
relativa das vistas do concept (ex.: comparar a altura do capacete ou o diametro da roda em FRONT vs SIDE
vs REAR em pixels) ANTES de continuar a usar comparacoes cruzadas de z.**

REVERTIDO (W440/W439 pioram o todo). **BASE SEGUE W437** — IoU 0.821 | pior 0.668 | COR_TV 0.253 |
excesso 12.1 | falta 8.3 | <0.80 = 6.
PROXIMO: validar a escala relativa das 4 vistas do concept (roda/capacete em pixels por vista).


## CORRECAO DO MEU RACIOCINIO (importante): o AUDITOR esta certo, minhas comparacoes cruzadas nao

1) A "calibracao por pneu" que tentei NAO funciona: as colunas do pneu incluem o bodywork acima (SIDE 224px,
   FRONT 255px, REAR 306px => px/m 577/657/789, impossivel) => medir o pneu por extensao de coluna e errado.
2) Razao de aspecto por vista (concept vs modelo):
     front 1.171 vs 1.238 | side 1.868 vs 1.947 | rear 1.232 vs 1.238 | top 1.510 vs 1.573
   => o concept e consistentemente ~4% MAIS ALTO em todas as vistas. Isso e uma diferenca REAL de proporcao
   (o concept e mais alto), nao escala quebrada entre vistas.
3) **O auditor (audit_bb.py) usa `canvas_bbox(Mc)` — o bbox da mascara DAQUELA vista — entao as faixas sao
   normalizadas POR VISTA e o auditor e autoconsistente. O ERRO era MEU: comparar um z medido no SIDE com um
   z do FRONT/REAR em metros, como se as vistas compartilhassem escala absoluta.**

CONSEQUENCIA PRATICA:
- As conclusoes quantitativas do auditor continuam VALIDAS (W440 piora mesmo: IoU 0.797, <0.80 9) ✓
- Minhas medicoes manuais de z entre vistas devem ser expressas em FRACAO da altura DA PROPRIA VISTA, nunca
  em metros cruzando vistas.
- O concept e ~4% mais alto que o modelo em todas as vistas: H_concept/H_modelo ~= 1.04. Candidato a proximo
  ajuste GLOBAL (subir o modelo ~4% em z) — testar como hipotese unica, medindo o IoU.

BASE SEGUE W437 — IoU 0.821 | pior 0.668 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.


## W441/W442 — QUANTIFICADO: o concept e ~7% mais alto que o CONTRATO (decisao do Feco)

Parametro novo `z_k` (multiplicador de z na escala final). Razoes de aspecto:
  concept: side L/H=1.868 | front W/H=1.171   =>  H_concept ~ 1.256 m
  modelo (contrato): L/H=1.947 | W/H=1.238    =>  H_modelo  = 1.207 m (contrato Hero Kart V2)
  W442 com z_k=1.071: L/H=**1.867** e W/H=**1.168** = as razoes do concept EXATAS.

  variante        IoU    P10    pior    COR_TV  excesso  falta  <0.90  <0.80
  W437 (contrato) 0.821  0.763  0.668   0.253   12.1     8.3    21     6
  W441 (z 1.04)   0.824  0.762  0.681   0.254   12.0     8.1    20     7
  W442 (z 1.071)  0.823  0.757  **0.688** 0.258  12.0     8.2    **19**  **9**

LEITURA: a altura maior MELHORA IoU, pior-regiao, <0.90 e falta — mas PIORA <0.80 (6->9) e COR_TV (0.253->0.258).
E viola o CONTRATO (H 1.207 -> 1.258).

**DECISAO NECESSARIA (Feco):** o audit mede fidelidade a ARTE; o contrato do Hero Kart V2 fixa H=1.207.
O concept implica H~1.256 (+4% sobre o contrato, +7% sobre o modelo atual). Ou
  (a) mantem o CONTRATO (H=1.207, base W437) e aceita um erro sistematico de ~7% de altura no IoU, ou
  (b) segue a ARTE (z_k=1.071) e sai do contrato do jogo.
Recomendacao tecnica: (a) — o asset e para o jogo e o contrato e a especificacao; o gap de proporcao deve
ser registrado como limitacao conhecida do audit (o teto de IoU fica ~0.82 por causa disso, nao por geometria).
**BASE SEGUE W437** (contrato). z_k fica disponivel no builder para o teste (b) se Feco decidir.

BASE: W437 — IoU 0.821 | pior 0.668 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.


## ACHADO FUNDAMENTAL: as vistas do CONCEPT sao MUTUAMENTE INCONSISTENTES

Medicao com normalizacao POR VISTA (a que o auditor usa — fracao da altura da propria mascara):
FRONT, faixa PILOTO (t 0.58-0.70 medido de baixo), fill em |y|<=0.30 normalizado:
  t 0.58-0.61 concept 1.000 | W437 1.000  (=)
  **t 0.62-0.65 concept 0.794/0.778/0.756/0.683 | W437 1.000  => EXCESSO +0.21 a +0.32**
  t 0.66-0.67 concept 0.594 | W437 0.625  (~)
  t 0.68-0.69 concept 0.594/0.611 | W437 0.712 (+0.10)
  t 0.70      concept 0.628 | W437 0.433 (**-0.195**, modelo falta)
=> em t 0.62-0.65 o concept TEM VAOS (fill ~0.7) e o modelo e solido.

MAS: o mesmo trecho no REAR da o concept SOLIDO em |y| +-0.555, e o FRONT da o centro em +-0.22 => fator 2.5
de diferenca para a MESMA peca fisica.
=> **As vistas do concept nao descrevem o mesmo objeto na mesma escala/proporcao.** Isso e propriedade da
   arte (folha de concept desenhada/gerada), nao do modelo.
CONSEQUENCIA DURA: nenhuma geometria pode satisfazer todas as vistas ao mesmo tempo. O erro residual do
audit tem um PISO irredutivel. As tentativas W420/W421 (span 0.240/0.385) ja mostraram isso: melhoram o
FRONT e pioram REAR/top, e o agregado cai. **O span 0.505 do W437 e o COMPROMISSO otimo** entre vistas
incompativeis, nao um erro.

DECISAO TECNICA (seguindo a instrucao de prosseguir com julgamento proprio):
1) MANTER O CONTRATO (H=1.207, base W437) — o asset e para o jogo.
2) PRIORIZAR as vistas por visibilidade no jogo: SIDE e FRONT (camera de gameplay) > TOP (plano) > REAR.
3) Aceitar o piso irredutivel de IoU e registrar como LIMITACAO DA ARTE DE REFERENCIA, nao da geometria.
4) Nao perseguir mais excesso em front/PILOTO/top/ASA com ajustes de span/z — ja refutado 4x com numero.
PROXIMO FOCO (onde ainda ha ganho real, nao piso): regioes com FALTA (side/TRASEIRA 19.3%, top/RODAS_DIANT
13.4%, side/PARACH_RODA 13.2%, rear/PILOTO_COSTAS 11.3%) — falta costuma indicar PECA AUSENTE, e peca
ausente e ganho real, nao compromisso entre vistas.

BASE: W437 — IoU 0.821 | pior 0.668 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.


## W443 — rzb=0.000 (rampa no chao) = neutro-negativo, revertido; rzb=0.050 e o otimo

FALTA medida em side/TRASEIRA: concept chega a z 0.003 em xf 0.82-0.86, modelo a 0.027-0.041 (inicio da rampa).
rzb 0.050->0.000 (z min do REAR 0.025->0.000; bbox INTACTO [-0.01,1.165] como previsto).
RESULTADO: IoU 0.821->0.820, pior 0.668->0.666, COR_TV 0.253->0.255, excesso 12.1->12.3,
**falta 8.3->8.2** ✓, **<0.90 21->20** ✓, <0.80 6 (=), side/TRASEIRA falta 19.3->**19.9** ✗.
=> os dois valores bracketam o otimo: rzb=0.050 -> 0.668 ; rzb=0.000 -> 0.666. **rzb=0.050 e o otimo. REVERTIDO.**

## BALANCO DA SERIE (W429..W443) — 15 variantes, 2 ganhos liquidos
  ACEITOS: W429 (vao difusor/rampa, side/TRASEIRA 0.658->0.660), W437 (Rear_Bumper_U baixado,
           side/TRASEIRA 0.660->0.668 e vaos de xf 0.94/0.97 ABRIRAM) — base atual.
  REJEITADOS COM NUMERO (13): W428 rzb negativo (bbox) | W430 fechamento total | W432 tubos finos |
           W434 escapes altos | W438 tilt | W439 tilt+sweep | W440 wing_z+span | W441 z_k 1.04 |
           W442 z_k 1.071 | W443 rzb 0.000 | W420/W421 span menor | W423 asa p/ tras.

## ONDE ESTA O GANHO REAL AGORA (por falta, nao por excesso)
Falta por regiao (W437): side/TRASEIRA 19.3% | top/RODAS_DIANT 13.4% | side/PARACH_RODA 13.2% |
rear/PILOTO_COSTAS 11.3% | side/BICO 9.9% | front/NOSE 9.8%.
Excesso: front/PILOTO 24.8% | top/ASA 20.0% | side/TRASEIRA 21.8% | rear/PARACH_BAIXO 21.0% |
side/PILOTO 23.2% — **o excesso e o piso irredutivel da inconsistencia entre vistas** (documentado);
a FALTA e peca ausente e vale perseguir.
PROXIMOS ALVOS por falta: (a) top/RODAS_DIANT 13.4% (parachoque dianteiro/rodas visto de cima);
(b) side/PARACH_RODA 13.2%; (c) rear/PILOTO_COSTAS 11.3%.

BASE: W437 — IoU 0.821 | pior 0.668 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.


## TOP do concept e ASSIMETRICO (rotacionado) — terceira limitacao da arte de referencia

Medicao TOP faixa RODAS_DIANT (xf 0.18-0.36), runs em |y| normalizado (1.0 = meia-largura da vista):
  xf 0.19 concept **0.942..-0.801** (centro +0.07, largura 1.743) | W437 0.996..-0.992 (centro 0, largura 1.988)
  xf 0.22 concept 0.947..-0.806                                | W437 1.000..-0.996
  xf 0.25 concept 0.947..-0.806                                | W437 1.000..-0.996
  xf 0.28 concept 0.947..-0.796 (SOLIDO)                       | W437 7 runs (vaos) ✗
  xf 0.31 concept 0.937..0.592 | 0.505..-0.762 (2 runs)        | W437 5 runs ✗
  xf 0.34 concept 0.660..-0.670                                | W437 0.636..-0.632 (~)
=> o concept esta DESLOCADO ~+0.07 (5% da largura) e e assimetrico => a vista TOP nao e ortografica limpa
   (esta rotacionada/inclinada na prancha). O modelo e simetrico por construcao => erro sistematico
   irredutivel na comparacao do TOP.

## AS TRES LIMITACOES DA ARTE DE REFERENCIA (todas medidas)
  1. Proporcao: concept H~1.256 vs contrato H=1.207 (+4%) — razoes de aspecto consistentes em 4 vistas.
  2. Vistas mutuamente inconsistentes: a mesma peca da +-0.22 no FRONT e +-0.555 no REAR (fator 2.5).
  3. TOP rotacionado/assimetrico: centro deslocado +0.07 (~5%).
=> O PISO de erro do audit nao e geometria: e a arte. As vistas SIDE e FRONT sao as confiaveis (simetricas
   e com razoes coerentes) => **priorizar SIDE e FRONT** para os proximos ajustes.

BASE: W437 — IoU 0.821 | pior 0.668 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6.
PROXIMOS (SIDE/FRONT, por FALTA): side/TRASEIRA 19.3% | side/PARACH_RODA 13.2% | side/BICO 9.9% |
front/NOSE 9.8% | side/PILOTO 5.9% (a menor falta entre as grandes).


## W444 — ilhas em xf 0.90: os TUBOS DE ESCAPE (0.62 m de comprimento) preenchem o vao

Ilhas que cobrem x=-0.965 (xf 0.90) em z 0.45-0.65:
  REAR nv=314 x **-1.184..-0.563** z 0.340..0.659 |y| 0.010..0.126 M_Silver  <- tubo CENTRAL
  REAR nv=314 x **-1.191..-0.560** z 0.437..0.671 |y| 0.033..0.314 M_Silver  <- tubos LATERAIS (2x)
  REAR nv=152 x -1.017..-0.934  z 0.483..0.625 |y| 0.190..0.209 M_Silver
  REAR nv=116 x -1.092..-0.737  z 0.050..0.621 |y| 0.324..0.325 M_Silver  (elemento fino/suspensao)
=> os tubos vao do MOTOR (x -0.56) ate a PONTA (x -1.19) = 0.62 m, e na coluna xf 0.90 cobrem z 0.34-0.66.
O concept em xf 0.90 tem corpo 0.003-0.477 e asa 0.552-0.817 => **VAO em 0.477-0.552** que o tubo fecha ✗.

MAS: z dos tubos (exh_dz) esta BRACKETED no otimo — 0.130 (base) > 0.000 (original, pior) e 0.192 (W434, pior);
e o RAIO tambem — 0.128 (base) vs 0.088 (W432, pior). Ambos os parametros tem otimo em 0.130/0.128.
=> o residuo de xf 0.90 nao e corrigivel por z nem raio do tubo. Sobra: (i) o tubo do concept e CURVADO
   (desce em direcao ao motor) ou (ii) e mais uma consequencia da inconsistencia da arte.

## BALANCO FINAL DESTA JANELA
Base **W437** — IoU 0.821 | pior 0.668 | COR_TV 0.253 | excesso 12.1 | falta 8.3 | <0.80 = 6 | 14 objetos.
Ganhos liquidos na serie: W412 (escapes na faixa ESCAPES), W425 (asa enflechada), W429 (vao difusor/rampa),
W437 (Rear_Bumper_U baixado — o maior: pior regiao 0.657->0.668 e vaos ABRIRAM).
TRES limitacoes da ARTE medidas e documentadas: proporcao (+4%), vistas inconsistentes (fator 2.5), TOP rotacionado.
Parametros bracketed no otimo (nao mexer): rzb 0.050, dfz 0.170, dfh 0.145, exh_dz 0.130, exh_c_r 0.128,
wing_span 0.505, wing_z 0.585, rz1 0.300, neck_r0/r1 0.070/0.062.


## W445/W446 — NARIZ BAIXO: causa exata achada (fator 0.88 no prof_top) = NOVA BASE W446

DIAGNOSTICO: em xf 0.15-0.23 o topo do modelo era 0.038-0.042 (normalizado) MAIS BAIXO que o concept.
`prof_top(0.15)=0.323` e `prof_top(0.21)=0.39` (=> 0.471 m) BATEM com o concept medido (0.326 / 0.472 m) ✓
Mas o nariz aplicava `zt=prof_top(xf)*H*0.88` => deficit de 5.7 cm = EXATAMENTE o medido. Causa unica.

W445 (fator global 0.99): falta 8.3->**7.9**, side/PARACH_RODA falta 13.2->**3.4** ✓✓, IoU 0.822, MAS
side/BICO excesso 20.5->**23.5** ✗ e <0.80 6->7 ✗ => a ponta (xf<0.14) ficou alta demais com fator global.

W446 (fator VARIAVEL 0.88 -> 1.00 com ramp em xf 0.10-0.16):
  IoU 0.821->**0.822**, P10 0.763 (=), pior 0.668 (=), **falta 8.3->8.0** ✓✓, **<0.80 6 (=)** ✓,
  **side/PARACH_RODA falta 13.2->3.4%** ✓✓✓ (maior ganho regional da serie), side/BICO 0.800->0.802 ✓,
  front/PILOTO 0.743->0.745 ✓. Custo: COR_TV 0.253->0.255 e excesso 12.1->12.3.
**ADOTADO — NOVA BASE W446.** Parametros novos: nose_top_k=0.880, nose_top_k2=1.000, nose_k_x0=0.100, nose_k_ramp=0.060.

LICOES:
- O builder tinha fudge factors (0.88 no nariz, 0.97 no cowl, 0.80 no chin) que NAO batem com o prof_top medido;
  onde o prof_top ja e medido, multiplicar por <1 cria deficit sistematico.
- `prof_top` e a TABELA MEDIDA do concept (0=frente) — confiar nela como alvo e comparar com a medicao.

BASE: **W446** — IoU 0.822 | pior 0.668 | COR_TV 0.255 | excesso 12.3 | falta 8.0 | <0.80 = 6.


## W447 — cowl fudge 0.97->1.00 = EMPATE, nao adotado

Mesmo padrao do nariz (o cowl usava prof_top*H*0.97). COWL z max 0.6213->0.6405.
RESULTADO: IoU 0.822 (=), P10 0.763 (=), pior 0.668 (=), **falta 8.0->7.9** ✓, excesso 12.3->12.4 ✗,
COR_TV 0.255->0.257 ✗, <0.90/<0.80 iguais. side/COWL 0.776->0.774 (falta 13.7->12.7 ✓ mas excesso 11.1->12.8 ✗).
=> empate: troca falta por excesso e piora a cor. **NAO ADOTADO — base segue W446.**
(Nota: o fudge de 0.97 e so -3%, pequeno; o do nariz era -12% e por isso deu ganho grande.)

## REGRA NOVA: auditar FUDGE FACTORS do builder contra as tabelas medidas
O builder tinha `*0.88` no nariz (deficit de 12% => 5.7 cm, ganho grande ao corrigir) e `*0.97` no cowl
(-3%, empate) e `*0.80` no queixo (z-scale, provavelmente intencional). **Sempre que uma peca multiplica
uma tabela MEDIDA por <1, medir o deficit antes: se for grande, corrigir; se for pequeno, e ruido.**

BASE: **W446** — IoU 0.822 | pior 0.668 | COR_TV 0.255 | excesso 12.3 | falta 8.0 | <0.80 = 6.
PARAMETROS NOVOS (W446): nose_top_k=0.880, nose_top_k2=1.000, nose_k_x0=0.100, nose_k_ramp=0.060.


## W448 — subir sidepods +11.4cm = REGRESSAO SEVERA, revertido; topo 0.53 CONFIRMADO

FRONT faixa NARIZ, fill por linha (normalizado por vista):
  t 0.42-0.50 |y|<=0.30: concept 0.967-0.978 | W446 1.000 (+0.022/+0.033)
  t 0.42-0.50 |y|<=0.55: concept 0.584-0.602 | W446 0.604-0.719 (+0.008/+0.116)
  **t 0.548-0.564 |y|<=0.55: concept 1.000 | W446 0.604/0.641 (-0.396/-0.359)**  <- A FALTA GRANDE
  t 0.580 |y|<=0.55: concept 1.000 | W446 0.943 (-0.057)
=> no FRONT, t 0.55 (z 0.646 no modelo) o concept e SOLIDO ate |y| 0.55 (=0.41 m) e o modelo so ~0.24 m.

Tentei resolver subindo os sidepods (pod_zt2 0.275->0.390, topo 0.530->0.642). RESULTADO: IoU 0.822->**0.798**,
pior 0.668->**0.585@front_NARIZ**, **COR_TV 0.255->0.291**, excesso 12.3->**17.2**, <0.80 6->**9**,
front/NARIZ excesso 56.2%, side/PILOTO cor 0.255->0.519. **REVERTIDO.**
=> **o topo do sidepod em 0.53 esta CERTO** (a medicao do SIDE valia). A inferencia pelo FRONT estava errada:
   o material do concept em |y| 0.24-0.41 / z 0.646 NAO e o sidepod.

CANDIDATOS RESTANTES para esse material (|y| 0.30-0.41 em z 0.646, vista FRONT):
  - o motor (box 'Engine' em (EXC,0,0.585) half (0.128, **0.300**, 0.058) => topo z 0.643 e |y| 0.300 — chega
    a 3 mm de z 0.646 mas so +-0.30, e o concept pede +-0.41)
  - ombro/tampo do bodywork traseiro (nao existe como peca separada)
PROXIMO: probe das ilhas do REAR/CH na faixa z 0.60-0.70 e |y| 0.28-0.45 para ver o que o modelo tem ali
e quanto falta para +-0.41.

BASE: **W446** — IoU 0.822 | pior 0.668 | COR_TV 0.255 | excesso 12.3 | falta 8.0 | <0.80 = 6.


## W449 probe — a falta do FRONT t 0.55 e de CONTINUIDADE, nao de peca ausente

Probe em z 0.60-0.70 com |y| 0.28-0.45: **so o REAR** — M_Silver 206, M_Dark 120, M_Blue 114, M_White 90,
M_Eye 12, |y| 0.281..0.450, z 0.607..0.676. => o material EXISTE nessa faixa.
Mas o fill do FRONT em t 0.55 e 0.604 (0.50 m de material em janela de 0.82 m) e o concept e 1.000 (0.82 m)
=> faltam ~0.32 m em VAOS entre pecas, nao uma peca inteira.
Candidatos de vao em z 0.646: entre o motor (|y| 0.30) e as pecas laterais do REAR; e entre 0.45 e a roda.
PROXIMO: medir os RUNS do FRONT em t 0.55 (linha exata) para localizar os vaos em |y| e decidir qual peca
fechar (provavelmente o topo do bodywork traseiro entre o motor e os pods).

## BALANCO DESTA JANELA
Ganho liquido: **W446** (nariz: fudge 0.88 vs prof_top medido; fator variavel) — IoU 0.821->0.822,
falta 8.3->8.0, side/PARACH_RODA falta 13.2%->3.4% (maior ganho regional da serie), <0.80 mantido em 6.
Refutados com numero: W445 (fator global: BICO excesso 23.5%) | W447 (cowl: empate) | W448 (sidepods:
regressao severa IoU 0.798, COR_TV 0.291) | W443 (rzb 0: bracketed) | W441/W442 (z_k: melhora IoU mas
<0.80 6->9 e viola contrato).
**BASE: W446** — IoU 0.822 | pior 0.668 | COR_TV 0.255 | excesso 12.3 | falta 8.0 | <0.80 = 6.


## W450 — FRONT t 0.55: o concept e SOLIDO ATE A LARGURA TOTAL; o modelo tem vaos

FRONT runs (|y| normalizado, 1.0 = meia-largura da vista):
  t 0.548 concept **0.748..-0.748 (SOLIDO, largura total)** | W446 0.444..-0.441  <- falta 0.30 em CADA lado
  t 0.556 concept 0.748..-0.748                             | W446 0.670..0.655 | 0.441..-0.437 | -0.651..-0.667
  t 0.564 concept 0.748..-0.752                             | W446 0.682..0.644 | 0.429..-0.425 | -0.640..-0.678
  t 0.572 concept 0.748..-0.752                             | W446 0.690..-0.686 (solido mas estreito)
  t 0.580 concept 0.748..-0.752                             | W446 0.693..-0.690

=> em z ~0.65 o concept tem material continuo do centro ate as RODAS (|y| 0.44-0.75 incluido) e o modelo tem
   VAOS entre o corpo e as rodas. O material que falta esta em |y| ~0.44-0.75 (nao em 0.24-0.41 como eu
   supus no W448 — por isso subir os pods foi regressao: atacou o lado errado).

CONFLITO DE VISTAS (3o medido): o SIDE diz que os sidepods topam em 0.53 m (e W448 confirmou que mexer neles
piora: IoU 0.798); o FRONT pede material continuo ate a largura total em z ~0.65. Como as escalas das duas
vistas diferem so ~4%, **nao pode ser o mesmo sidepod**: o material do FRONT em |y| 0.44-0.75 / z 0.65 e
OUTRA coisa — candidatos: ombro do bodywork traseiro, ou ARCO DE RODA (o modelo tem rodas expostas, sem
fender).

PROXIMO: probe das ilhas com vertice em |y| 0.44-0.75 e z 0.60-0.70 (qualquer x) para ver o que o modelo
tem ali (deve ser quase nada) e comparar com a roda (topo z 0.379). Se nao houver nada, o concept tem um
ARCO/FENDER sobre a roda dianteira que o modelo nao tem -> peca AUSENTE (ganho real, nao compromisso).

BASE: **W446** — IoU 0.822 | pior 0.668 | COR_TV 0.255 | excesso 12.3 | falta 8.0 | <0.80 = 6.


## W452 — span 0.555 isolado = falta melhora mas o todo piora; SPAN BRACKETED em 0.505

CONCORDANCIA DE DUAS VISTAS (raro e por isso testei): REAR mede a asa +-0.555 (z 0.74 solido) e FRONT mede
solido ate +-0.748 normalizado (=0.559 m) em t 0.55 => as duas concordam que a asa do concept e mais LARGA.
W452 testou wing_span 0.505->0.555 com z INTACTO (a mudanca de z do W440 contaminava o teste).
RESULTADO: **falta 8.0->7.1** ✓✓ (maior queda de falta da serie) e front/PILOTO falta 8.2->**4.2** ✓✓,
MAS IoU 0.822->**0.817**, **COR_TV 0.255->0.270**, excesso 12.3->**14.0**, <0.80 6->**7**,
front/NARIZ excesso 7.4->15.7% ✗. **REVERTIDO.**

### SPAN DA ASA: OTIMO BRACKETED EM 0.505 (4 valores testados)
  0.240 (W420): IoU 0.798 | 0.385 (W421): 0.809 | **0.505 (base): 0.822** | 0.555 (W452): 0.817
=> o span 0.505 e o MAXIMO do IoU. Estreitar piora muito; alargar piora pouco mas estraga COR_TV e excesso.
   **Nao mexer mais no span.**

### PADRAO RECORRENTE (5o caso): a ARTE pede X, o modelo com X piora o AGREGADO
  asa z (W422) | asa tilt (W438/439) | asa span maior (W452) | pods (W448) | z_k proporcao (W441/442)
Em todos: uma vista ou duas concordam que o concept tem mais material ali, mas ao colocar o material o
audit piora — porque as vistas do concept sao inconsistentes entre si (medido: fator 2.5) e o agregado
penaliza as OUTRAS vistas. **O audit ja esta resolvendo o compromisso por nos: se o agregado piora, a
alteracao esta errada para o conjunto, mesmo que "certa" para uma vista.**

BASE: **W446** — IoU 0.822 | pior 0.668 | COR_TV 0.255 | excesso 12.3 | falta 8.0 | <0.80 = 6.


## ERRO DE INSTRUMENTO DE PRIMEIRA ORDEM: a mascara TOP de referencia esta CORROMPIDA

Descoberto ao rodar VISION na prancha pareada (concept | modelo). O vision reportou: "TOP-ref: FALHA TOTAL.
Retangulo 100% vermelho preenchando tudo. Nenhum kart reconhecivel."
Verificado por numero:
  fill das mascaras: front 0.575 | side 0.481 | rear 0.545 | **top 0.765**  <- anormal
  fracao vermelha nas celulas: FRONT 0.153 | SIDE 0.162 | REAR 0.148 | **TOP 0.674**  <- anormal
=> **`/tmp/c_top.npy` e `/tmp/cell-TOP.png` estao CORROMPIDOS** (segmentacao falhou nessa vista).

CONSEQUENCIAS (invalidar):
  - TODAS as medicoes de TOP que fiz: top/ASA, top/RODAS_DIANT, top/BICO_U, top/SIDEPODS, top/MOTOR
  - A conclusao "o TOP do concept e rotacionado/assimetrico (centro +0.07)" estava ERRADA — era corrupcao.
  - As medicoes de FRONT/SIDE/REAR continuam VALIDAS (fills 0.48-0.58, coerentes entre si).
  - O auditor (audit_bb.py) tambem usa c_top: as notas de top/* estao contaminadas.

ACAO: reconstruir a mascara TOP a partir da arte (assets/the-bubble-bumper.jpg) antes de qualquer outra
medicao de TOP. Enquanto isso, **so FRONT/SIDE/REAR sao confiaveis**.

## VISION COMPARATIVO (prancha pareada) — o que ele disse de VALIDO (FRONT/SIDE/REAR)
1. **Cabeca/capacete**: na ref e ENORME, alta, isolada em pescoco fino; no modelo e minuscula, baixa,
   afundada. Erro ~50% de escala e de altura — aparece nas TRES vistas (FRONT/SIDE/REAR) => alta confianca.
2. **Proporcao largura x altura**: refs FRONT/REAR sao karts SUPER-LARGOS, baixos, achatados; o modelo e
   estreito e alto, com rodas para dentro. (coerente com o achado das razoes de aspecto: concept ~4% mais alto?)
3. **Focinho**: ref SIDE = bico fina agulha, baixo; modelo = grosso, alto, rombudo.
4. **Traseira**: ref = bloco macico alto e vertical; modelo = vazado, com canos sobressaindo e mola exposta.
5. **Escapamentos**: o modelo tem 3 canos que FURAM a silhueta da ref (na ref a traseira e solida).
SIDE foi a vista mais fiel; FRONT/REAR denunciam.


## RECONSTRUCAO DA MASCARA TOP — fonte VALIDA, segmentacao ainda imperfeita

Verificado por VISION: `assets/reference-orthographic/top.jpg` **e valido** — kart visto de cima (frente para
a esquerda), fundo em grade cinza-clara com reguas nas 4 bordas e 3 linhas de cota (2 horizontais longas
acima/abaixo + 1 vertical a esquerda). Portanto o defeito e na SEGMENTACAO, nao na fonte.

Diagnostico de cor da fonte: sat p50=0, p90=63, max=217 | val p10=65, p50=205, p90=219
  criterio `sat>35 | val<140` => fill 0.354 no frame inteiro (vs 0.765 da mascara corrompida)
Maior componente conexa: 192455 px (0.336), bbox x 199..831 y 89..507 (633x419, aspecto 1.51 = igual ao
medido antes para o TOP) => o BBOX esta certo, mas o **fill dentro do bbox ainda da 0.726** (esperado ~0.5).
=> as linhas de COTA/regua (finas, val<140) estao sendo incluidas e provavelmente o grid tambem.
CORRECAO NECESSARIA: (a) subir o limiar escuro para val<120, (b) aplicar ABERTURA (erosao+dilatacao) para
matar linhas finas antes de pegar a maior componente, (c) fechar buracos. Salvo em /tmp/c_top_fixed.npy e
/tmp/cell-TOP-fixed.png (ainda NAO usar como referencia — fill 0.726 e alto demais).

## ESTADO CRITICO DO INSTRUMENTO
- FRONT/SIDE/REAR: mascaras validas (fill 0.48-0.58) — **usar so estas**.
- TOP: mascara corrompida; reconstrucao em andamento. **Nenhuma medicao de top/* e confiavel ainda.**
- O audit_bb.py usa c_top => as notas de top/* (ASA 0.695, RODAS_DIANT, BICO_U, SIDEPODS) estao contaminadas
  e NAO devem guiar decisoes ate a mascara ser corrigida.

BASE (mantida): **W446** — IoU 0.822 | pior 0.668 | COR_TV 0.255 | excesso 12.3 | falta 8.0 | <0.80 = 6.
(Nota: esse IoU inclui as vistas de TOP com mascara ruim — o numero esta contaminado tambem.)


## AUDITOR CORRIGIDO: TOP excluido (AUDIT_SKIP=top) — BASELINE LIMPA

A mascara TOP nao e recuperavel por heuristica de cor: a fonte tem grid + reguas + 3 linhas de cota +
SOMBRA projetada. Testei 4 criterios; o melhor (sat>25 | val<70) da aspecto 1.49 (o esperado e 1.51) mas
fill 0.668 e o VISION reprovou: "mancha amorfa, engoliu o kart e o fundo juntos... NAO utilizavel".
=> **TOP excluido do audit** (flag AUDIT_SKIP=top, patch aplicado em audit_bb.py).

BASELINE LIMPA (W446, so FRONT/SIDE/REAR — mascaras com fill 0.48-0.58, silhuetas reais confirmadas por vision):
  com top (contaminado): IoU 0.822 | P10 0.763 | pior 0.668 | COR_TV 0.255 | exc 12.3 | falta 8.0 | N=23 | <0.90 21 | <0.80 6
  **SEM top (limpo)   : IoU 0.821 | P10 0.781 | pior 0.668 | COR_TV 0.261 | exc 12.6 | falta 7.8 | N=18 | <0.90 17 | <0.80 4**
=> as regioes de top/* estavam entre as PIORES e puxavam o P10 e o <0.80 para baixo. O modelo e melhor do que
   os numeros contaminados sugeriam: **P10 0.781 e apenas 4 regioes abaixo de 0.80**.

**REGRA: toda medicao daqui pra frente usa AUDIT_SKIP=top.** As notas de top/* ficam registradas como
INVALIDAS (nao usar para decidir).

BASE: **W446** — IoU 0.821 | P10 **0.781** | pior 0.668 | COR_TV 0.261 | excesso 12.6 | falta 7.8 |
N=18 | <0.90 17 | **<0.80 4** (metricas limpas, sem top).


## VISION NAO E INFALIVEL: achado #1 (capacete 50% pequeno) REFUTADO por medicao

FRONT, largura do capacete por linha (t = fracao da altura; normalizada pela largura da vista):
  t 1.00 concept 0.058 | W446 0.073   |  t 0.97 concept 0.179 | W446 0.157
  t 0.94 concept 0.232 | W446 0.218   |  t 0.91 concept 0.259 | W446 0.249
  t 0.88 concept 0.281 | **W446 0.284** |  t 0.85 concept 0.290 | **W446 0.295**
=> **batem dentro de 5%**. O capacete NAO e 50% pequeno. O vision leu a MASCARA vermelha (onde a cabeca
aparece isolada, saliente) contra o RENDER (onde o capacete se integra ao corpo) e superestimou a diferenca.

**REGRA NOVA: vision PROPoe, medicao DISPOE.** Todo achado de vision que implique mudanca de geometria deve
ser medido por coluna/linha antes de virar alteracao. (O vision continua sendo o gate de QUALIDADE — "parece
um kart de corrida?" — mas nao e a fonte de verdade dimensional.)

STATUS dos 5 achados do vision comparativo:
  #1 capacete 2x pequeno -> REFUTADO por medicao (batem em 5%)
  #2 proporcao estreito/alto -> conflita com minha medicao de aspecto (que diz o concept ~4% MAIS ALTO);
      precisa de medicao por vista antes de agir
  #3 focinho grosso/alto -> contra o W446, que SUBIU o nariz e MELHOROU a falta (8.3->8.0) => cuidado
  #4 traseira vazada vs bloco macico -> PLAUSIVEL, medivel no SIDE/REAR
  #5 escapamentos furam a silhueta -> PLAUSIVEL (as ilhas de 0.62 m existem); medivel

BASE LIMPA (AUDIT_SKIP=top): W446 — IoU 0.821 | P10 0.781 | pior 0.668 | COR_TV 0.261 | exc 12.6 | falta 7.8 |
N=18 | <0.90 17 | <0.80 4.


## MEDICAO CIRURGICA DO ACHADO "VAZADO vs MACICO" (vision #4/#5) — coordenadas exatas

SIDE, banda TRASEIRA (x normalizado 0.55-1.00), runs por linha:

  t=0.78  c: 0.56..0.57 | 0.58..0.59 | 0.61..0.72      m: 0.55..0.72          -> modelo funde vaos de ~1px
  t=0.72  c: 0.55..0.70 | 0.98                         m: 0.55..0.68          -> modelo sem o 0.98
  t=0.66  c: 0.55..0.69 | 0.73 | 0.89..0.99            m: 0.55..0.72          -> **modelo SEM material em 0.73 e 0.89-0.99**
  t=0.60  c: 0.59..0.77 | 0.88..0.98                   m: 0.55..0.66|0.66..0.76|0.87..0.97   -> aqui bate bem
  t=0.54  c: 0.55..0.77 | 0.80..0.81 | 0.88..0.94      m: **0.55..0.99 SOLIDO** -> modelo PREENCHE tudo

CONCLUSAO (vision + medicao concordam = alta confianca):
 (A) **t 0.54 (z ~0.635 no modelo): o modelo e um bloco solido 0.55-0.99; o concept tem 3 massas separadas**
     com vaos em 0.77-0.80, 0.81-0.88 e 0.94-0.99. As pecas traseiras do modelo estao se FUNDINDO na silhueta.
     Isto e o "traseira vazada vs bloco macico" do vision, agora com coordenadas.
 (B) **t 0.66 (z ~0.776): o concept tem material em 0.73 e 0.89-0.99 e o modelo NAO tem nada** (o material do
     modelo acaba em 0.72). => a asa/endplate do concept chega MAIS ALTO (>= z 0.776) que a do modelo (topo 0.746).
     Candidato: subir wing_z (NUNCA testado isolado; W440 testou wing_z 0.626 = DESCER e foi rejeitado).
 (C) t 0.78: o modelo funde vaos de 1px (0.57-0.58, 0.59-0.61) — cosmético, baixa prioridade.

PROXIMO ALVO (com coordenadas, alta confianca): (A) abrir os vaos traseiros em t 0.54 e (B) subir a asa/endplate
para alcancar t 0.66. Ambos sao mediveis e nao dependem de mascara ruim (SIDE e limpa, fill 0.481).

BASE LIMPA (AUDIT_SKIP=top): W446 — IoU 0.821 | P10 0.781 | pior 0.668@side_TRASEIRA | COR_TV 0.261 |
exc 12.6 | falta 7.8 | N=18 | <0.90 17 | <0.80 4.


## A/B CONTAMINADO (2o erro de instrumento) + W457 = NOVA BASE (ganho limpo)

Sintoma: W454 (que eu julguei ser "so endplate +1cm") foi descrito pelo VISION como tendo "uma cupula azul
enorme que engole a perna". Eu duvidei — a unica mudanca era o endplate. **O vision estava certo.**
Causa: passei o OVR A MAO com 17 parametros; o builder usa ~45. Os que faltaram caíram nos DEFAULTS:
  pod_w/pod_zt/pod_zt2 (0.150/0.275 em vez de 0.096/0.084) -> a CUPULA AZUL que o vision viu
  side_cover/cover_zt/cover_w/cover_mat -> a cobertura
  wing_tube (default 1 = TUBO em vez do loft) | cap_s (default 0.085 em vez de 0.055 = capacete maior)
  target_length/axle_w/exh_x/wing_x1/wing_x2/bevel_*/sep_parts
Prova nos bboxes: CH y 0.6301->0.5908 | NOSE z topo 0.5073->0.4464 | REAR x -1.2181->-1.16.
Dano extra: `sep_parts:1` tambem faltava -> **o gate T5 (14 objetos separados) estava sendo violado**
nos builds recentes (W454 tinha n_parts=1).

CORRECAO (permanente):
  - `modeling/BASE_PARAMS.json`: os 56 parametros extraidos do run.py do job W446 (fonte da verdade).
  - `modeling/run_variant.py`: constroi SEMPRE a partir da BASE + EP_OVERRIDES (so o que o teste muda).
  - CONTROLE VERIFICADO: W455 (base, sem overrides) reproduz W446 **exatamente** em todos os bboxes,
    sep_parts=14, QA aprovado. O instrumento esta calibrado.
  - Patch do endplate: `ep_s` (cap_s e COMPARTILHADO com o capacete -> nao podia ser reusado).

**W457 = BASE + ep_s=[0.085,0.042,0.095] (endplate 1cm mais alto) = GANHO LIMPO:**
  metrica    W446      W457
  IoU        0.821  -> 0.826
  P10        0.781  -> 0.790
  pior       0.668  -> 0.680   (side/TRASEIRA)
  COR_TV     0.261  -> 0.251
  excesso    12.6   -> 12.9    (unica piora, +0.3 = desprezivel)
  falta      7.8    -> 7.0
  <0.80      4      -> 4       (mantido)
  regioes: side/TRASEIRA 0.668->0.680 | front/PILOTO 0.745->0.767 (runs 3/1->**3/3**) |
           rear/ESCAPES 0.879->0.890 (runs 3/1->**3/3**) | PARACH_RODA 0.852=0.852 |
           ASA_AIRBOX 0.857=0.857 (as "regressoes" do W454 eram CONTAMINACAO, nao efeito do endplate)
=> **W457 e a nova base.** Nenhuma regiao regrediu; a pior regiao melhorou; os runs batem em 2 regioes.

## LICAO DE PROCESSO (registrar como regra)
**Nunca montar OVR a mao. Sempre BASE_PARAMS.json + override explicito.** E **validar o instrumento com um
build de CONTROLE** antes de comparar: se o controle nao reproduz a base exata, a comparacao e invalida.
Corolario: quando o vision descreve algo que a mudanca declarada nao explica, **suspeitar do instrumento
antes de descartar o vision** — nas duas vezes em que isso aconteceu nesta sessao (mascara TOP corrompida e
o OVR incompleto), o vision estava certo.


## BRACKET DO ENDPLATE (ep_s) — 4 valores, otimo identificado

| ep_s z | IoU   | P10   | pior (side/TRASEIRA) | COR_TV | excesso | falta | <0.80 |
|--------|-------|-------|----------------------|--------|---------|-------|-------|
| 0.085  | 0.821 | 0.781 | 0.668                | 0.261  | 12.6    | 7.8   | 4     |
| **0.095** | **0.826** | **0.790** | 0.680        | 0.251  | 12.9    | 7.0   | **4** |
| 0.120  | 0.825 | 0.788 | **0.690**            | **0.249** | 13.4 | **6.7** | **4** |
| 0.145  | 0.822 | 0.785 | **0.691**            | **0.249** | 14.0 | 6.6   | 5     |

=> **W457 (ep_s z=0.095) e a base**: melhor IoU E melhor P10, com <0.80 mantido em 4.
   O ep_s melhora monotonamente a PIOR REGIAO (0.668->0.680->0.690->0.691) e a FALTA (7.8->7.0->6.7->6.6)
   mas o EXCESSO sobe (12.6->12.9->13.4->14.0) e em 0.145 o <0.80 volta a 5. Compromisso em 0.095.

CONFIRMACAO DA HIPOTESE (medida, SIDE t 0.66, runs por linha):
  concept:  0.54..0.69 | 0.73 | 0.89..0.99      <- material na asa/endplate
  W446:     0.42..0.44 | 0.53..0.72             <- FALTAVA 0.89-0.99
  W457:     0.42..0.44 | 0.53..0.72 | 0.90..0.94 <- **material APARECEU onde o concept tem** (efeito do ep_s)
E em t 0.68/0.70 o concept tem 0.90-0.99/0.95-0.99 e o modelo ainda nao -> e por isso que o ep_s maior (0.120)
ainda melhora a pior regiao; mas o custo em excesso/IoU chega primeiro.

## REFUTADO: subir a ASA (wing_z) nao era a resposta
W458 (wing_z 0.700, testado LIMPO na base canonica): IoU 0.826->**0.749**, P10 0.790->**0.657**,
pior 0.680->**0.405**, COR_TV ->0.264, excesso 12.9->**20.4**, falta 7.0->**12.2**, <0.80 4->**8**,
side/TRASEIRA 0.680->0.577, rear/ESCAPES 0.890->0.670 (falta 3.0->28.2%).
=> wing_z=0.585 CONFIRMADO. Bracket da asa: 0.585 (melhor) | 0.626 (rejeitado, testado contaminado antes) |
   0.700 (rejeitado, testado LIMPO agora).
   A t 0.54 eu havia inferido que a asa estava 15cm baixa por causa dos vaos em x -0.75..-0.92 e -1.06..-1.18;
   a inferencia estava ERRADA — o alvo era o ENDPLATE (altura), nao a asa (posicao).

## BASE ATUAL: W457
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.251 | excesso 12.9 | falta 7.0 |
N=18 | <0.90 17 | <0.80 4 | sep_parts 14 | 0 non-manifold | QA aprovado.
Parametros: BASE_PARAMS.json + ep_s=[0.085,0.042,0.095].


## W461 — airbox com meia-largura x reduzida (0.058->0.046) = NEUTRO

Hipotese: as 3 caixas do airbox (x -0.470/-0.575/-0.665, meia-largura x 0.058 = comprimento 0.116 com centros
a 0.105) SE SOBREPOEM em x -> barra solida onde o concept tem 3 elementos separados.
Medido: W461 e IDENTICO ao W457 (IoU 0.826, P10 0.790, pior 0.680, COR_TV 0.251, exc 12.9, falta 7.0,
<0.80 4; side/MOTOR 0.840->0.839 apenas). Os runs em t 0.66/0.60/0.54 sao IDENTICOS.

CAUSA do neutro (z das caixas): airbox0 z 0.652+/-0.068 = 0.584..0.720 | airbox1 0.536..0.656 |
airbox2 0.488..0.592. **Em t 0.66 (z ~0.766) NENHUMA das 3 caixas esta presente** -> mexer nelas nao
pode mudar aquela linha. A hipotese estava mal endereçada (medi o x, mas o alvo era o z).

**VERDADEIRO CULPADO LOCALIZADO**: `Airbox_Duct` = sweep que comeca em **(-0.462, 0, 0.774)**.
z 0.774 = t 0.660 exatamente; x -0.462 -> imagem ~0.68. E ele que fecha o vao 0.69-0.73 que o concept
deixa aberto em t 0.66 (concept: 0.54..0.69 | 0.73..0.73 | 0.89..0.99).

PROXIMO ALVO (endereçado por z, nao por x): reduzir/baixar o `Airbox_Duct` para abrir o vao em imagem 0.69-0.73
em t 0.66. Nao mexer nas 3 caixas do airbox (provado neutro).

## ESTADO DA BASE: W457 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.251 | exc 12.9 | falta 7.0 | N=18 | <0.90 17 |
<0.80 4 | sep_parts 14 | QA aprovado. Params: BASE_PARAMS.json + ep_s=[0.085,0.042,0.095].


## W462 — Airbox_Duct baixado 6cm: ACERTA A LINHA-ALVO, mas regride o MOTOR

`abt_dz=-0.060` (duct: z 0.774/0.704/0.628 -> 0.714/0.644/0.568). REAR z max 0.8177->0.8011.

LINHA-ALVO t 0.66 (SIDE) — acerto preciso:
  concept: 0.54..0.69 | 0.73..0.73 | 0.89..0.99
  W457:    0.53..0.72                 | 0.90..0.94     <- run continuo ate 0.72
  W462:    0.53..0.69                 | 0.90..0.94     <- **borda esquerda agora bate exatamente**

AGREGADO: IoU 0.826->0.825 | P10 0.790->0.789 | pior 0.680 (=) | COR_TV 0.251->0.254 | excesso 12.9->12.8 |
falta 7.0->7.1 | <0.80 4 (=) | side/TRASEIRA 0.680 (=) | **side/MOTOR 0.840->0.826** (excesso 8.8->7.0 ✓
mas falta 8.6->**11.6** ✗).
=> O duct INTEIRO desceu e saiu da faixa do MOTOR -> ganha o vao em t 0.66 mas perde material na faixa do motor.
   Resultado liquido: empate negativo. NAO adotado.

**OTIMO ESTA ENTRE W457 e W462.** O concept quer, em t 0.66: material ate 0.69, VAO em 0.69-0.73, e um
elemento FINO em 0.73 (o fim do duct). Ou seja: o duct precisa da ponta DISTANTE (x -0.668) mantida ALTA
(z ~0.77) e o TRECHO MEDIO (x -0.575) mais baixo -> **descida mais acentuada no fim, nao deslocamento
uniforme**. Proximo teste: `abt_dz` menor (-0.030) ou z por ponto (ponta alta + meio baixo).

## ESTADO DA BASE: W457 (inalterada — W462 nao adotado)
IoU 0.826 | P10 0.790 | pior 0.680 | COR_TV 0.251 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.
Params: BASE_PARAMS.json + ep_s=[0.085,0.042,0.095].
Runners/patches disponiveis em run_variant.py: ep_s (endplate), ab_x (airbox x), abt_dz/abt_r (duct).


## W463 = NOVA BASE — duct -3cm: estrutura correta SEM custo agregado

`abt_dz=-0.030` (duct: z 0.774/0.704/0.628 -> 0.744/0.674/0.598).

LINHA-ALVO t 0.66 (SIDE):
  concept: 0.54..0.69 | 0.73..0.73 | 0.89..0.99
  W457:    0.53..0.72                 | 0.90..0.94    (run continuo)
  W462:    0.53..0.69                 | 0.90..0.94    (borda certa, sem o vao)
  W463:    0.53..0.69 | 0.69..0.70    | 0.90..0.94    <- **run SPLIT: o vao ABRIU na posicao certa**

AGREGADO — W463 nao custa NADA:
  metrica   W457    W463
  IoU       0.826 = 0.826
  P10       0.790 = 0.790
  pior      0.680 = 0.680
  excesso   12.9  = 12.9
  falta     7.0   = 7.0
  <0.80     4     = 4
  COR_TV    0.251 -> 0.252  (0.001)
  side/MOTOR 0.840 -> 0.839 (0.001)
=> **W463 e a nova base**: ganho ESTRUTURAL (vao correto) com metricas identicas.

## BRACKET DO DUCT (abt_dz) — 3 valores
  0.000 (W457): run continuo 0.53..0.72 | IoU 0.826
  -0.030 (W463): run split 0.53..0.69 + 0.69..0.70 | IoU 0.826  <- **OTIMO**
  -0.060 (W462): 0.53..0.69 sem o vao em 0.70 | IoU 0.825 | side/MOTOR falta 11.6% ✗
=> o duct desceu 3cm: abre o vao certo sem perder a faixa do motor. A 6cm ja perde.

## BASE ATUAL: W463
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | N=18 |
<0.90 17 | <0.80 4 | sep_parts 14 | 0 non-manifold | QA aprovado.
Params: BASE_PARAMS.json + ep_s=[0.085,0.042,0.095] + abt_dz=-0.030.


## DIAGNOSTICO DE side/TRASEIRA (0.680, pior regiao) — linhas por t na base W463

SIDE, runs normalizados (concept vs W463):
  t=0.80  c: 0.53 | 0.56..0.57 | 0.58..0.59 | 0.61..0.72   m: 0.53..0.71        <- 4 runs vs 1 SOLIDO
  t=0.78  c: 0.53 | 0.56..0.57 | 0.58..0.59 | 0.61..0.72   m: 0.53..0.72        <- 4 vs 1 SOLIDO
  t=0.76  c: 0.53 | 0.56..0.57 | 0.59..0.71                m: 0.53..0.72        <- 3 vs 1 SOLIDO
  t=0.72  c: 0.53..0.70 | 0.98                              m: 0.55..0.68        OK (proximo)
  t=0.66  c: 0.54..0.69 | 0.73 | 0.89..0.99                 m: 0.53..0.69|0.69..0.70|0.90..0.94  OK (split correto)
  t=0.60  c: 0.41..0.43 | 0.59..0.77 | 0.88..0.98           m: 0.39..0.46|0.49..0.66|0.66..0.75|0.87..0.97  (1 run extra)
  t=0.56  c: 0.41..0.77 | 0.89..0.94                        m: 0.39..0.46|0.46..0.77|0.78..0.85|0.89..0.99  (extra 0.78-0.85)
  t=0.54  c: 0.41..0.77 | 0.80..0.81 | 0.88..0.94           m: 0.39..0.42|0.43..0.99  <- **SOLIDO** ✗✗
  t=0.50  c: 0.26..0.36 | 0.41..0.94 | 0.96 | 0.99..1.00    m: 0.27..0.35|0.38..1.00  OK (proximo)

**DOIS ALVOS PRINCIPAIS, ambos "SOLIDO vs SEPARADO":**
 (A) t 0.76-0.80: o modelo e UM BLOCO 0.53-0.72; o concept tem 4 elementos finos (0.53 | 0.56-0.57 |
     0.58-0.59 | 0.61-0.72). PROBE POR FACE em z 0.90-0.95: **so o PL (piloto)** — 7586 faces,
     x -0.537..-0.083 => imagem 0.52..0.72 EXATAMENTE o bloco do modelo.
     => o piloto do modelo e uma massa continua; no concept capacete/viseira/encosto/airbox aparecem
        SEPARADOS com vaos. O alvo e ABRIR VAOS dentro do PL nessa faixa (nao mover nada de lugar).
 (B) t 0.54: o modelo e SOLIDO 0.43-0.99; o concept tem 0.41..0.77 | 0.80..0.81 | 0.88..0.94 (3 massas).
     z ~0.62. Mesmo padrao do achado anterior do REAR (3763 faces em z 0.58-0.66).

METODO CONFIRMADO (vale para os dois): medir a LINHA por t -> probe por FACE na faixa z correspondente ->
identificar a peca -> ajustar so ela. Foi assim que o duct (W461 neutro -> W462/W463) foi resolvido.

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.
Params: BASE_PARAMS.json + ep_s=[0.085,0.042,0.095] + abt_dz=-0.030.


## ALVO A DECOMPOSTO — o PL em z 0.88-0.97 por material (probe por face)

MATERIAL        faces  x_range            -> imagem (0-1)
M_Face           8777  -0.256..-0.081     -> 0.53..0.60   (rosto/pele)
M_Visor          3698  -0.291..-0.085     -> 0.58..0.63   (viseira)
**M_Blue         1045  -0.500..-0.087     -> 0.53..0.72** (capacete + encosto = MASSA CONTINUA) ✗✗
M_Dark            178  -0.537..-0.258     -> 0.65..0.72   (traseira do capacete/encosto)
M_Yellow           60  -0.502..-0.483     -> 0.71..0.72   (faixa)

O `M_Blue` sozinho cobre TODA a extensao do bloco solido (0.53-0.72). O concept, nessa mesma faixa, tem:
  0.53 | 0.56..0.57 | 0.58..0.59   (frente: rosto/viseira, finos, SEPARADOS)
  0.61..0.72                        (tras: capacete/encosto)
=> o que falta e o VAO entre a frente (0.53-0.59) e a tras (0.61-0.72): no modelo o capacete e o encosto
   do banco se TOCAM e a silhueta funde; no concept ha um vao visivel entre eles.

**ACAO PROPOSTA (proximo build)**: separar capacete e encosto na silhueta — deslocar o piloto para a FRENTE
(poucos cm) e/ou reduzir a profundidade do encosto, ate abrir o vao em imagem ~0.59-0.61 em z 0.90-0.95.
Verificar o parametro correspondente no builder (piloto/assento) e expor via patch, como foi feito com ep_s/abt_dz.

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## ALVO A — CAUSA-RAIZ NO CODIGO: o capacete e um domo LISO

Codigo do builder:
  helm=dome('Helmet',hx,0.0,hz,HR,sz=SZ,sy=1.0,seg=104,rings=62)   -> assign 'M_Blue'
  hrst=tube_round('Headrest_U',[(hx+HR*0.16, HR*0.92,_hz2),(hx-HR*0.62,...),(hx-HR*0.98,0,_hz2),...],0.042,18)
  st2=tubevar('Seat_Shell',[(-0.150,0,0.368),(-0.234,0,0.432),(-0.322,0,0.500),(-0.412,0,0.560)],[0.170,0.196,0.208,0.196])

Medido: M_Blue ocupa x -0.500..-0.087 => o raio efetivo do capacete e ~0.21 m (domo de 0.42 m de extensao),
centrado em hx~-0.29. O concept, na MESMA faixa (imagem 0.53-0.72), mostra 4 runs:
  0.53 | 0.56..0.57 | 0.58..0.59 | 0.61..0.72
=> o capacete do CONCEPT tem CORTES VISIVEIS na silhueta (borda da viseira + queixeira) que a quebram em
   4 massas. O do modelo e um domo CONTINUO de superficie lisa -> silhueta solida de ponta a ponta.

Causa-raiz: nao e posicao nem escala do capacete — e **falta de quebra de silhueta** (viseira/queixa
salientes o bastante para separar a silhueta). O `M_Visor` medido (x -0.291..-0.085) fica DENTRO do
intervalo do domo, entao nao quebra nada.

**ACAO (proximo build)**: fazer a viseira (e/ou queixeira) PROTRUIR alem do domo do capacete o suficiente
para criar os vaos em imagem ~0.53-0.56 e ~0.59-0.61 em z 0.90-0.95. Parametro a expor via patch:
escala/offset x da viseira. Medir depois: runs em t 0.80/0.78/0.76.

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## ALVO A — SOLUCAO IDENTIFICADA: o capacete do concept tem a FRENTE rebaixada

Parametros do capacete JA expostos: helm_x=-0.298 | helm_z=0.985 | helm_r=0.210 | helm_sz=0.934.
Geometria: dome em (hx,0,hz) com raio HR e escala z SZ -> extensao z = hz +/- HR*SZ = 0.789..1.181.

Em t 0.80 (z 0.93): (0.93-0.985)/0.934 = -0.059 -> raio normalizado sqrt(1-0.059^2)=0.998 -> secao
QUASE COMPLETA: x -0.508..-0.088 => imagem 0.53..0.72 = **exatamente o bloco solido do modelo** ✓ (confirmado).

CONCEPT na mesma altura: material so em imagem 0.61..0.72. Convertendo:
  imagem 0.61 -> x = 1.15 - 0.61*2.35 = -0.284
  imagem 0.72 -> x = 1.15 - 0.72*2.35 = -0.542
=> x -0.284..-0.542 = **a METADE TRASEIRA do capacete** (helm_x -0.298, raio 0.21 -> -0.088..-0.508).
=> O CAPACETE DO CONCEPT, em z 0.93, TEM MATERIAL APENAS NA PARTE DE TRAS: a FRENTE esta REBAIXADA
   (formato real de capacete: a regiao da viseira/queixa e mais baixa que a calota).

**ACAO (proximo build)**: rebaixar a FRENTE do capacete. Opcoes a testar (uma por build):
  (a) helm_x -0.298 -> -0.360 (desloca o domo para tras; a frente sai de z 0.93)
  (b) helm_r 0.210 -> menor, mantendo hz (reduz a secao em z 0.93 por igual nos dois lados)
  (c) helm_sz maior (achata em z, baixando o topo)
Medir depois: runs em t 0.80/0.78/0.76 e o agregado (IoU/P10/<0.80). Nada disso foi testado LIMPO antes
(o W416, que tentou mexer no capacete, foi medido ANTES da correcao do OVR -> invalido).

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## W464 (helm_x -0.360) = REGRESSIVA — e revela o que o concept realmente tem em t 0.76-0.80

Resultado: t 0.80 `0.53..0.71` -> `0.55..0.74` (o run DESLOCOU mas continua SOLIDO — nenhum vao abriu).
Agregado: IoU 0.826->**0.824** | P10 0.790->**0.786** | <0.80 4->**5** | COR_TV 0.251->0.250.
=> deslocar o domo nao cria vao (a secao transversal em z 0.93 e quase um circulo cheio: move, nao quebra).
   Opcoes (b) raio menor e (c) achatar teriam o mesmo defeito: ENCOLHEM o run, nao o DIVIDEM.

**OBSERVACAO DECISIVA**: os runs do concept em t 0.76, 0.78 e 0.80 sao PRATICAMENTE IDENTICOS
(0.53 | 0.56..0.57 | 0.58..0.59 | 0.61..0.72) ao longo de 4 cm de altura.
  - Uma SECAO DE DOMO mudaria de largura com a altura (o modelo muda: 0.53-0.72 -> 0.53-0.72 -> 0.53-0.72, e
    a largura do modelo tambem e constante, mas CHEIA).
  - Largura CONSTANTE em 4 cm = **elementos VERTICAIS finos** (postes/rollhoop/intake/antena), nao uma calota.
=> em z 0.90-0.95 o concept tem ELEMENTOS VERTICAIS SEPARADOS; o modelo tem a CALOTA DO CAPACETE ali.

## RESTRICAO CRITICA (nao violar)
O topo do modelo (z_range max 1.165) E o topo do capacete (hz + HR*SZ = 0.985 + 0.210*0.934 = 1.181).
=> BAIXAR o capacete mudaria o z_range e portanto DESLOCARIA A NORMALIZACAO DE TODAS AS METRICAS
   (invalidaria a comparacao). A correcao tem de PRESERVAR o topo e mudar a FORMA.

**PROXIMA ACAO**: dar ao capacete uma FRENTE REBAIXADA/CORTADA (preservando o topo em z 1.181), de modo que
em z 0.90-0.95 o material fique so na parte de tras (x -0.284..-0.542, medido) e apareçam os vaos em
imagem 0.53-0.56 e 0.59-0.61. Alternativa: conferir se o concept tem postes verticais que o modelo nao tem
(rollhoop/intake) e adiciona-los, deixando a calota mais baixa SO onde ela conflita.

## BASE: W463 (inalterada — W464 nao adotado)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## ALVO A — PROVA DE QUE NAO E AJUSTE PARAMETRICO (por que (a)/(b)/(c) nao podem funcionar)

Geometria do domo: helm=dome(hx,0,hz,HR,sz=SZ) com hz=0.985, HR=0.210, SZ=0.934.
A secao transversal em z e um circulo de raio R(z) = HR*sqrt(1 - ((z-hz)/(HR*SZ))^2).
Em z=0.93: (0.93-0.985)/(0.210*0.934) = -0.2805 -> R = 0.210*sqrt(1-0.0787) = 0.2016 -> x span 0.403 m
=> a secao em z 0.93 e 96% do raio maximo. Ou seja, z 0.93 esta ABAIXO do centro do domo -> a secao ali e
   quase cheia POR CONSTRUCAO.

Consequencias provadas/previstas:
  (a) helm_x (mover): TRANSLADA o run — nao divide. **TESTADO (W464): regride, sem vao.**
  (b) helm_r menor: ENCOLHE o run (0.403 -> ~0.355 m) — nao divide.
  (c) helm_sz maior: achata; a secao em z 0.93 continua ~cheia — nao divide.
  E baixar o capacete e PROIBIDO: o topo do modelo (z_range 1.165) E o topo do capacete
  (hz+HR*SZ = 1.181). Baixar mudaria z_range e deslocaria a normalizacao de TODAS as metricas.

=> **NENHUM ajuste de posicao/escala pode dividir esse run.** Só uma mudanca de FORMA:
   corte frontal (frente rebaixada) ou slots verticais no capacete. Isso e alteracao de MODELAGEM,
   nao de parametro — exige patch no `dome('Helmet',...)` (ex.: pos-processar os vertices com x>hx
   rebaixando-os em z, preservando o apice em x=hx, que e onde esta o topo z 1.181).

## ALVO ALTERNATIVO (mais barato, mesma classe de defeito): t 0.54
  concept: 0.41..0.77 | 0.80..0.81 | 0.88..0.94   (3 massas)
  W463:    0.43..0.99 SOLIDO
  z ~0.62; a peca dominante ali e o REAR (3763 faces em z 0.58-0.66, medido antes). Diferente do capacete,
  aqui as sub-pecas do REAR (motor/escapes/asa/difusor/rampa) SAO separadas no codigo — entao separa-las
  na silhueta e viavel por parametro (exh_dz/dfz/rzb ja existem).

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## W465 — A RESTRICAO DE NORMALIZACAO FOI CONFIRMADA EMPIRICAMENTE (achado de metodo)

Teste: `exh_short=0.45` (encurtar os escapamentos 45cm, porque o M_Silver cobre x -0.999..-0.550 continuo
em z 0.554-0.675 e o concept deixa -0.66..-0.92 VAZIO em z~0.62).

RESULTADO DO BUILD (antes de qualquer auditoria):
  len_before   2.3841 -> **2.3262**   (encurtou, como esperado)
  scale_factor 0.98568 -> **1.01022**  (o builder RE-ESCALOU para target_length=2.350)
  z_range      [-0.01, 1.165] -> **[-0.01, 1.194]**  ✗✗
  x_range      [-1.2, 1.15] -> **[-1.172, 1.178]**  ✗✗
=> **A COMPARACAO E INVALIDA.** A normalizacao do auditor e pelo bbox; mudar o comprimento re-escala tudo e
   desloca TODAS as metricas. Foi por isso que a restricao foi formalizada antes (topo do capacete = z_range).

**REGRA DE METODO (obrigatoria daqui pra frente)**:
  Toda variante DEVE preservar `x_range` E `z_range` da base (W463: x [-1.2,1.15], z [-0.01,1.165]).
  Se a mudanca altera o comprimento ou a altura, ela precisa ser COMPENSADA (esticar/encurtar outra peca na
  mesma direcao) OU a comparacao tem de ser refeita com a base re-normalizada — nunca comparar direto.
  Verificacao automatica: checar x_range/z_range/scale_factor no retorno do build ANTES de rodar o audit.

## COMO ENCURTAR OS ESCAPAMENTOS SEM QUEBRAR A NORMALIZACAO
O comprimento do modelo e dado por x_range (extremos). Hoje: frente 1.15/1.178 (NOSE/FBUMP) e tras -1.2
(exhaust/wing). Encurtar o escapamento tira material do extremo TRAS -> o builder re-escala.
Alternativas que PRESERVAM o comprimento:
  (i) manter o comprimento total esticando a ASA para tras o mesmo tanto (wing_x2), de modo que o extremo
      traseiro continue em x -1.2;
  (ii) em vez de encurtar em x, SEPARAR os 3 escapamentos em x (hoje diferem so em Y e por isso se projetam
      no mesmo run na lateral): dar offsets x distintos aos tubos L/C/R -> abre os vaos SEM mudar extremos;
  (iii) reduzir o RAIO (engrossa/murcha a silhueta sem mexer no comprimento) — mas isso nao divide o run.
=> (ii) e a mais promissora: os vaos do concept (-0.66..-0.73 e -0.75..-0.92) pedem SEPARACAO em x, nao
   encurtamento. Isso e o mesmo padrao "solido vs separado" ja resolvido no duct (W463).

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.
x_range [-1.2,1.15] | z_range [-0.01,1.165] | scale_factor 0.98568  <- **invariantes a preservar**


## W466 (exh_lr_short=0.35) — INVARIANTES OK, MAS NEUTRO: identificacao estava ERRADA

**INVARIANTES PRESERVADOS** (a regra funcionou): x_range [-1.2,1.15] | z_range [-0.01,1.165] |
scale_factor 0.98568 — identicos a W463. Comparacao VALIDA.
RESULTADO: t 0.54 continua `0.39..0.42 | 0.43..0.99` SOLIDO — **nenhum vao abriu**.
Agregado: IoU 0.826 (=) | P10 0.790 (=) | pior 0.680 (=) | COR_TV 0.252->0.251 | exc 12.9 (=) | falta 7.0 (=) |
<0.80 4 (=) | side/TRASEIRA 0.680 (=) | rear/ESCAPES 0.890 (=).
=> **os escapamentos L/R NAO sao o que fecha a linha t 0.54.** Hipotese refutada.

## RE-IDENTIFICACAO DA LINHA t 0.54 (conversao das coordenadas)
t 0.54 -> z ~0.62. O run do modelo `0.43..0.99` cobre x **+0.14 .. -1.18** (a traseira INTEIRA).
O concept: `0.41..0.77 | 0.80..0.81 | 0.88..0.94` => vaos em imagem 0.77-0.80 e 0.81-0.88
  => x = -0.66..-0.73 e -0.75..-0.92.
Ocupantes RE-IDENTIFICADOS (probe por material no REAR, z 0.55-0.70, x -1.00..-0.55):
  M_Silver  656  x -0.999..-0.550  -> sobrou mesmo apos encurtar os L/R => e OUTRA peca M_Silver
  M_Dark    188  x -0.851..-0.746  -> ocupa o vao 0.75-0.85 ✗
  M_Yellow  156  x -1.000..-0.935  -> a ASA/endplate (concept tem 0.88-0.94 = x -0.92..-1.06)
  M_Blue     86  x -0.986..-0.892  -> a asa: o modelo tem em 0.85-0.99; o concept so em 0.88-0.94
  M_BlueDk   81  x -0.690..-0.582  -> o DUCT, ocupa o vao 0.66-0.73 ✗
=> **dois ocupantes reais dos vaos**: (1) o `M_Dark` em x -0.746..-0.851 (dentro do vao -0.75..-0.92) e
   (2) o DUCT em x -0.582..-0.690 (dentro do vao -0.66..-0.73). A asa tambem esta 0.05 mais larga.
   Nenhum deles e escapamento.

**PROXIMA ACAO**: (i) identificar qual peca e o `M_Dark` em x -0.746..-0.851 no codigo (procurar por M_Dark
no bloco rear()), (ii) estreitar a asa (wing_x1/x2) para o concept (0.88-0.94), (iii) o duct ja foi mexido
em z (abt_dz) mas nao em x — testar encurtar o duct em x preservando x_range.

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## M_Dark DO VAO t 0.54 — IDENTIFICADO: sao ESTRUTURAS VERTICAIS FINAS

Candidatos no bloco rear() que caem em x -0.746..-0.851:
  sp = sweep('Airbox_Strut_L/R', [(XRE+0.345, sy*0.078, 0.596),(XRE+0.330, sy*0.090, 0.430)], 0.028, 14)
       -> x ~ -0.845 (XRE ~ -1.19)   raio 0.028 (5.6 cm)
  py = tube_round('Wing_Pylon_L/R', [(wx1+0.075, sy*0.150, wz-0.030),(wx1+0.130, sy*0.150, 0.512)], 0.036, 14)
       -> x ~ -0.830 (wx1 -0.905)    raio 0.036 (7.2 cm)
  (rv=Rivet em exb+0.242 = -0.948 -> FORA;  Dslot em XRE+0.060 -> fora;  Rear_Clamps em _bx)

Analise: 5.6-7.2 cm de largura NAO preenchem um vao de 17 cm (-0.75..-0.92) — mas DIVIDEM-no em dois vaos
menores. Como a medicao mostra o run SOLIDO, essas hastes estao se FUNDINDO com a asa/rampa na silhueta
(o topo da haste chega a z 0.596 e a asa esta em z 0.545-0.625 -> sobreposicao em z).
=> o problema nao e "a haste existe", e "a haste + asa formam uma massa continua sem ar entre elas".

**PROXIMA ACAO (com invariantes preservados)**: abrir ar entre a haste e a asa/rampa — testar reduzir o
comprimento das hastes (Airbox_Strut: de z 0.596 para baixo; Wing_Pylon: de wz-0.030 para baixo), ou
estreitar a asa (wing_x1 -0.905 -> -0.935 / wing_x2 -1.158 -> -1.130) para o concept (imagem 0.88-0.94 =
x -0.92..-1.06). Uma por build, checando x_range/z_range/scale_factor ANTES do audit.

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.
Invariantes: x_range [-1.2,1.15] | z_range [-0.01,1.165] | scale_factor 0.98568.


## W467 (asa estreitada) — NEUTRO/REGRESSIVO; ocupante real = Rear_Ramp

`wing_x1 -0.935 / wing_x2 -1.130`. Invariantes OK (x[-1.2,1.15] z[-0.01,1.165] scale 0.98568).
Resultado: t 0.54 continua `0.43..0.99` SOLIDO (nenhum vao). Agregado: IoU 0.826->0.825 | P10 0.790->0.789 |
pior 0.680->**0.670** | COR_TV 0.252->**0.249** ✓ | falta 7.0->7.1 | <0.80 4 (=) |
side/TRASEIRA 0.680->**0.670** (falta 18.1->19.4). => leve regressao. NAO adotado.

**BALANCO DAS 3 HIPOTESES PARA A LINHA t 0.54 (todas refutadas):**
  1. escapamentos L/R encurtados em x (W466): NEUTRO — nao sao eles
  2. asa estreitada (W467): NEUTRO/regressivo — nao e ela
  3. -> o ocupante tem de ser outra peca M_Silver da janela

**IDENTIFICADO (pecas M_Silver no bloco rear() que caem em x -0.999..-0.550, z 0.55-0.70):**
  **Rear_Ramp**: `rp=loft('Rear_Ramp',_rs); assign(rp,'M_Silver')` — a MAIOR peca M_Silver da janela.
      Parametros JA expostos: `rzb` (0.050) e `rz1` (0.300) — foram mexidos em W427/W429/W437.
  Collector: `box('Collector',(exb+0.200,0,0.432+_edz),(0.042,0.212,0.072))` -> x -0.990, z 0.490..0.634
      (8.4 cm de extensao em x — estreito, nao cobre o vao inteiro)
  (outros M_Silver: Engine/Engine_Top em x -0.558..-0.302 = FORA da janela; Airbox/Airbox_Top em XRE+0.360;
   Exh_*_lip e Exh_L/R nas pontas; Rear_Bumper_U; fins)
=> **PROXIMO TESTE: o Rear_Ramp.** Parametro `rzb` (base da rampa) e `rz1` (topo) — abrir ar entre a rampa e
   o difusor/asa mexendo em `rzb`/`rz1` PRESERVANDO x_range/z_range (checar invariantes antes do audit).

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## W468 (rx0 0.380->0.300, frente da rampa recuada) — 4a HIPOTESE REFUTADA

Invariantes OK. t 0.54 IDENTICO (`0.43..0.99` solido). Agregado: IoU 0.826 (=) | P10 0.790->0.789 |
pior 0.680->**0.676** | COR_TV 0.252 (=) | exc 12.9 (=) | falta 7.0 (=) | <0.80 4 (=) |
side/TRASEIRA 0.680->0.676 | rear/DIFUSOR 0.860 (=) | rear/ESCAPES 0.890 (=).
=> a rampa nao e o ocupante do vao t 0.54.

**BALANCO COMPLETO DAS HIPOTESES PARA t 0.54 (TODAS REFUTADAS):**
  1. escapamentos L/R encurtados em x  (W466) -> NEUTRO
  2. asa estreitada                    (W467) -> NEUTRO/regressivo
  3. rampa recuada em x (rx0)          (W468) -> NEUTRO/regressivo
  4. (o run 0.43..0.99 tambem nao muda com nenhuma delas)

**RE-LEITURA DA GEOMETRIA (o que os dados dizem):**
O run solido vai de imagem 0.43 a 0.99 = x **+0.14 .. -1.18**. O concept quebra em 0.77-0.80 e 0.81-0.88.
Convertendo: vao1 = x -0.66..-0.73 | vao2 = x -0.75..-0.92.
O probe por material (z 0.55-0.70, x -1.00..-0.55) listou como ocupantes:
  M_Silver 656 x -0.999..-0.550 | M_Dark 188 x -0.851..-0.746 | M_Yellow 156 x -1.000..-0.935 |
  M_Blue 86 x -0.986..-0.892 | **M_BlueDk 81 x -0.690..-0.582 = O DUCT**
=> **vao1 (x -0.66..-0.73) e ocupado pelo DUCT** (x -0.582..-0.690). O duct ja foi mexido em Z
   (`abt_dz=-0.030`, que resolveu t 0.66) mas NUNCA em X.
=> vao2 (x -0.75..-0.92): os testes de rampa/asa/escape nao o abriram. Candidato remanescente: o
   `M_Dark` em x -0.851..-0.746 = Airbox_Strut (XRE+0.345 = -0.845) e/ou Wing_Pylon (wx1+0.075 = -0.830),
   que se fundem com a asa em z (haste topo z 0.596 vs asa z 0.545-0.625).

**PROXIMA ACAO**: (a) patch do DUCT em X (afastar a ponta de x -0.668 para ~-0.75, abrindo vao1);
(b) encurtar as hastes (Airbox_Strut de z 0.596 para baixo) para abrir vao2. Uma por build, invariantes
checados antes do audit.

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## W469 (duct abt_dx=-0.080) — 5a HIPOTESE REFUTADA + VERIFICACAO DE INSTRUMENTO (mascara LIMPA)

Invariantes OK. t 0.54 IDENTICO (`0.43..0.99` solido). Agregado IDENTICO: IoU 0.826 (=) | P10 0.790 (=) |
pior 0.680 (=) | COR_TV 0.252->0.251 | exc 12.9 (=) | falta 7.0 (=) | <0.80 4 (=) | side/TRASEIRA 0.680 (=).

**SUSPEITA DE ERRO DE INSTRUMENTO INVESTIGADA E DESCARTADA** (5 mudancas geometricas sem efeito pedem isso):
  mascara w463 side: alpha>128 bbox y 236..653 x 20..856 (imagem 860x860)
  linha a 2%/5%/10%/20% do fundo: **0 px** -> NAO ha sombra de chao na mascara
  densidade por faixas: 0.000 0.000 0.022 0.166 0.307 0.708 0.885 0.300 0.000 0.000 (faixas 8-9 vazias)
  w469 identica em bbox e densidades (0.314 vs 0.307 na faixa 4 -> mudou minimamente, logo os builds diferem)
  => **instrumento CORRETO. O run solido em t 0.54 e geometria real, nao sombra nem artefato.**

**POR QUE rx0 NAO ABRIU O VAO (explicacao geometrica coerente):**
rx0 move a FRENTE da rampa (x -0.81), nao a traseira (x -1.17). O run do modelo em t 0.54 vai de
imagem 0.43 a 0.99 = x +0.14 .. -1.18 -> o extremo (0.99) e a TRASEIRA da rampa/difusor, que rx0 nao toca.
E a area que a frente da rampa deixaria livre (x -0.81..-0.89 = imagem 0.83..0.87) e coberta pelas
**hastes** `Airbox_Strut` (x -0.845) e `Wing_Pylon` (x -0.830) — **os 2 candidatos identificados e AINDA NAO TESTADOS**.

**BALANCO FINAL DAS HIPOTESES PARA t 0.54:**
  1. escapamentos L/R (W466) NEUTRO | 2. asa (W467) NEUTRO/regressivo | 3. rampa rx0 (W468) NEUTRO/regressivo
  4. duct x (W469) NEUTRO | 5. sombra/artefato -> DESCARTADO por medicao
  => resta a hipotese 6: **as HASTES** (Airbox_Strut topo z 0.596 / Wing_Pylon) que se fundem com a asa.

**PROXIMA ACAO**: encurtar as hastes para baixo (Airbox_Strut de z 0.596; Wing_Pylon de wz-0.030),
abrindo ar entre haste e asa. Preservando x_range/z_range (checar antes do audit).

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## W470 (strut_dz=-0.090) — 6a HIPOTESE REFUTADA + **DIFF QUANTITATIVO = CAUSA RAIZ ENCONTRADA**

Invariantes OK. t 0.54 IDENTICO. Agregado: IoU 0.826 (=) | P10 0.790 (=) | pior 0.680->**0.681** |
COR_TV 0.252->0.253 | exc 12.9 (=) | falta 7.0 (=) | <0.80 4 (=) | side/TRASEIRA 0.680->0.681.

**DIFF DE MASCARAS vs W463 (a medicao que faltava desde o inicio):**
  w470 strut_dz -0.090 -> **18 px** alterados (0.010% da mascara) na regiao y416..421 x728..731
  w469 duct dx -0.080  -> 497 px (0.281%) y374..420 x587..674; na linha t0.54: apenas 14 px
  w466 exh_lr_short .35 -> 192 px (0.109%) y417..492 x621..826; na linha t0.54: 0 px
=> **as hastes encurtadas 9 cm movem 18 PIXELS.** Elas estao quase inteiramente ESCONDIDAS na vista lateral.
=> todas as minhas 6 mudancas alteraram 0.01-0.28% da mascara — ou seja, ATACARAM APENDICES.

**CAUSA RAIZ IDENTIFICADA POR GEOMETRIA:**
  CH (chassis): bbox x -0.844..1.01 | z 0.058..0.7938 -> em z 0.62 e uma MASSA SOLIDA que cobre
                imagem 0.06..0.849
  REAR:         bbox x -1.2181..-0.302 -> cobre imagem 0.849..0.995
  => **o run `0.43..0.99` em t0.54 E o CH + o REAR.** Os vaos do concept (imagem 0.77-0.80 e 0.81-0.88)
     caem DENTRO do span do CH (0.06..0.849) -> **e o CHASSIS que precisa ter os vaos, nao os apendices.**

**LICAO DE METODO (2a vez):** o W461 ja tinha exposto isso (airbox x era neutro; o culpado era o duct em z).
Agora com prova quantitativa: ANTES de testar uma peca, medir quantos pixels ela controla via diff de
mascara (build com a peca movida vs base). Se o diff for <1%, a peca nao e a causa.

**PROXIMA ACAO**: atacar o CHASSIS (`chassis()`) — abrir os vaos em imagem 0.77-0.80 e 0.81-0.88 = x
-0.66..-0.73 e -0.75..-0.92 em z ~0.62, preservando x_range/z_range. Identificar primeiro, por probe de
faces, QUAL sub-peca do CH ocupa z 0.58-0.66 nesse x (o CH e uma peca joinada com varios materiais).

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## CORRECAO DA CAUSA RAIZ + DIFF COMPLETO (W467/W468) — o CH NAO e o culpado

**REFUTACAO DA MINHA PROPRIA INFERENCIA:** probe de faces do CH em z0.58-0.66 x-0.92..-0.60 =>
**NENHUMA FACE**. Em todo o x nessa faixa de z o CH tem so 174 faces (M_Dark x-0.322..0.241) + 8 (M_Silver).
=> o bbox do CH (x -0.844..1.01) NAO significa presenca em z 0.62. **Inferencia por bbox e INVALIDA** —
   so o probe de faces por faixa de z decide. (Terceira vez que bbox engana; registrar como regra.)

**DIFF DE MASCARAS COMPLETO (px alterados vs W463; base = 176636 px):**
  w468 rx0 0.300 (rampa frente)  ->  802 px (0.454%)  regiao **y509..631**  <- ABAIXO da linha t0.54 (y395)
  w467 wing_x1/x2 estreitada     ->  714 px (0.404%)  regiao y370..425      <- INCLUI y395
  w469 duct dx -0.080            ->  497 px (0.281%)  regiao y374..420      <- INCLUI y395
  w466 exh_lr_short 0.35         ->  192 px (0.109%)  regiao y417..492
  w470 strut_dz -0.090           ->   18 px (0.010%)  regiao y416..421

**LEITURA:** a linha t0.54 tem 240 px de corpo. Nenhuma peca isolada controla mais de 0.45% da mascara.
A rampa controla 802 px MAS em y509..631 (z baixo) -> `rx0` move a FRENTE BAIXA, nao a parte alta que
cruza t0.54. **Testei o parametro certo da peca na ALTURA errada** — mesmo erro do W462 (abt_dz uniforme
saiu da faixa do motor).

**PROXIMA ACAO CORRETA**: na rampa, os parametros que controlam a ALTURA sao **`rzt`** (topo, default 0.480)
e **`rth`** (espessura, 0.150) — nao `rx0`. Testar `rzt`/`rth` para abrir o vao em z0.62, medindo o diff
ANTES do audit (regra nova: diff < 1% => peca nao e a causa; e conferir que a regiao do diff INCLUI a
linha alvo).

**REGRA NOVA (metodo)**: antes de julgar um teste por agregado, checar (a) % de px alterados e (b) se a
REGIAO do diff contem a linha/regiao alvo. Sem isso, 6 testes podem ser gastos em apendices.

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## DEFINITIVO: A LINHA t0.54 IDENTIFICADA POR PROBE COMPLETO (z 0.600-0.650)

**ERRO DE COORDENADAS CORRIGIDO (meu):** a linha-alvo nos runs vem da mascara CORTADA (H=418 -> row 192),
mas no diff eu usei a imagem COMPLETA (H=860 -> row 395). Sao linhas DIFERENTES.
Re-medido corretamente: **nenhuma das 5 mudancas tocou a linha alvo (0 px em todas)**.
  w468 802px y273..395 | w467 714px y134..189 | w469 497px y138..184 | w466 192px y181..256 | w470 18px y180..185
=> as 5 mudancas estavam em OUTRAS alturas, nunca na linha.

**MEDIDA DA LINHA:** modelo **498 px** de corpo vs concept **316 px** => remover ~182 px (2 vaos).

**PROBE DEFINITIVO — PECAS com faces em z 0.600-0.650, x -1.18..+0.14 (2434 faces):**
  REAR  M_Silver  1344  x -1.180..-0.298  y -0.335..+0.335   <== A MASSA DOMINANTE
  REAR  M_Yellow   280  x -1.080..-0.953
  PL    M_Yellow   246  x -0.391..-0.094
  REAR  M_Dark     162  x -1.180..-0.408
  PL    M_Pilot    127  x -0.221..+0.104
  REAR  M_Eye      126  x -1.099..-1.057
  REAR  M_White     90  x -0.452..-0.395
  REAR  M_BlueDk    34  x -0.690..-0.593
  CH    M_Dark      23  x -0.298..+0.133
=> o `M_Silver` do REAR (1344 faces) cobre imagem 0.62..0.99 — e os vaos do concept
   (x -0.66..-0.73 e -0.75..-0.92) caem DENTRO desse span.
=> e o conjunto M_Silver da traseira (Engine_Top x-0.558..-0.302 + rampa + collector + bumper,
   UNIDOS no objeto REAR) que forma a massa. Precisa ser QUEBRADO nos 2 vaos.

**LICAO (3a):** bbox nao decide (probe de faces por faixa de z decide) e a linha-alvo deve ser medida
na MESMA mascara cortada usada nos runs — nunca misturar mascara cortada com imagem completa.

**PROXIMA ACAO**: quebrar a massa M_Silver do REAR em z0.62 nos vaos x -0.66..-0.73 e -0.75..-0.92.
Candidatos identificados: o Collector (exb+0.200=-0.990), o Ramp (x-0.81..-1.17) e o Rear_Bumper_U —
todos com params ja expostos (rzb/rz1/dfz/rzt). Medir o diff NA LINHA ALVO antes do audit.

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## VAOS t0.54 — OCUPANTES EXATOS (probe fino por vao)

  **vao1** x -0.730..-0.660 (115 faces):
       REAR M_Silver  93  x -0.713..-0.661  z 0.604..0.647
       REAR M_BlueDk  22  x -0.690..-0.668  z 0.601..0.629   <- o DUCT
  **vao2** x -0.920..-0.750 (108 faces):
       REAR M_Silver 108  x -0.854..-0.757  z 0.616..0.647   <- 100% da massa
  **TOTAL 201 faces ~= os ~182 px a remover.** Coerencia confirmada (faces x pixels).

**CANDIDATOS M_Silver do bloco rear() nessa faixa de x/z:**
  Rear_Ramp  x -0.81..-1.17  z 0.05..0.63  -> cobre vao2 (x -0.854..-0.757) no TOPO (rzt=0.480 + rth=0.150)
  Airbox     XRE+0.360 = -0.830 (ab_x)     -> tambem em vao2
  Collector  exb+0.200 = -0.990 +-0.042    -> FORA dos vaos (x -0.948..-1.032)
  vao1: M_Silver em x -0.713..-0.661 -> provavel Rear_Bumper_U (rz1=0.300) ou difusor; + o DUCT (M_BlueDk)

**CORRECAO RETROSPECTIVA IMPORTANTE:**
  O W461 (ab_x 0.058->0.046 no airbox) foi julgado NEUTRO usando a LINHA ERRADA (row 395 da imagem
  completa em vez de row 192 da mascara cortada). **Esse veredito e INVALIDO** — ab_x controla x -0.83,
  que esta EXATAMENTE em vao2. Retestar ab_x medindo na linha correta.

**PROXIMA ACAO**: (1) retestar a familia do airbox/rampa no vao2 com medicao NA LINHA ALVO (row 192 da
mascara cortada); (2) no vao1, atacar o Rear_Bumper_U/difusor e reconfirmar o duct.

## BASE: W463 (inalterada)
IoU 0.826 | P10 0.790 | pior 0.680@side_TRASEIRA | COR_TV 0.252 | exc 12.9 | falta 7.0 | <0.80 4 | sep_parts 14.


## W471 — **PRIMEIRO GANHO NA LINHA t0.54** (Airbox ab2_x 0.100->0.030, ab2_x2 0.082->0.024) => NOVA BASE

**O RUN DIVIDIU (primeira vez em 7 tentativas):**
  w463:    0.39..0.42 | 0.43..0.99                 (solido)
  w471:    0.39..0.42 | 0.43..0.78 | 0.80..0.99    -> **VAO ABERTO em 0.78..0.80**
  concept: 0.41..0.77 | 0.80..0.81 | 0.88..0.94    -> vao1 do concept = 0.77..0.80  **CASA**
Diff: 502 px total | **15 px NA LINHA ALVO** (row 192 da mascara cortada) — pequeno mas REAL.

**AGREGADO — nenhuma regressao:**
  IoU 0.826 (=) | P10 0.790 (=) | pior **0.680->0.682** | COR_TV 0.252 (=) | excesso **12.9->12.8** |
  falta 7.0 (=) | <0.80 4 (=) | sep_parts 14 (=) | side/TRASEIRA **0.680->0.682**
  side/TRASEIRA excesso 20.3->**19.7** | regiao COR 0.260->**0.257**

**MECANISMO**: o `Airbox` (box em XRE+0.360 = x -0.830, half-extent 0.100 HARDCODED) ocupava x -0.730..-0.930
= o vao2 inteiro (108 das 108 faces). Reduzido a half-extent 0.030 -> x -0.800..-0.860 -> abriu x -0.730..-0.800.
=> **a cadeia correta e: probe de faces por faixa de z -> ocupante exato -> expor parametro -> medir o diff
   NA LINHA ALVO (row 192 da mascara cortada) -> so entao julgar pelo agregado.**
=> confirma tambem que o veredito antigo do W461 (ab_x) era duplamente invalido: linha errada E peca errada
   (ab_x e do trio Airbox%d de half-extent 0.058, nao do box Airbox de -0.830).

**RESTA**: o vao2 do concept (0.81..0.88 = x -0.75..-0.92) ainda esta fechado — o modelo tem 0.80..0.99 solido.
Proximo: continuar reduzindo/deslocando o Airbox (ab2_dx) e/ou atacar o Rear_Ramp (rzt/rth) na faixa 0.81..0.88.

## BASE: **W471** (nova) — derivada de W463 + ep_s[0.085,0.042,0.095] + abt_dz-0.030 (W463) + ab2_x 0.030 + ab2_x2 0.024
IoU 0.826 | P10 0.790 | pior 0.682@side_TRASEIRA | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.
Invariantes: x_range [-1.2,1.15] | z_range [-0.01,1.165] | scale_factor 0.98568.


## W472 — 2o GANHO CONSECUTIVO (ab2_dx +0.090) => NOVA BASE

`Airbox` deslocado para a frente: centro x -0.830 -> -0.740 (half-extent 0.030).
RAIO X na linha t0.54 (row 192 da mascara cortada):
  concept: 0.41..0.77 | 0.80..0.81 | 0.88..0.94
  w471:    0.39..0.42 | 0.43..0.78 | 0.80..0.99   (483 px)
  w472:    0.39..0.42 | 0.43..0.78 | **0.82..0.99** (473 px)  -> vao 0.78..0.80 ALARGOU para 0.78..0.82

AGREGADO (zero regressao, tudo igual ou melhor):
  IoU 0.826 (=) | P10 0.790 (=) | pior **0.682->0.686** | COR_TV 0.252 (=) | exc 12.8 (=) | falta 7.0 (=) |
  <0.80 4 (=) | side/TRASEIRA **0.682->0.686** | excesso 19.7->**18.9** | regiao COR 0.257->**0.254**

**OBSERVACAO**: o vao do modelo (0.78..0.82) agora esta um pouco MAIS LARGO que o do concept (0.77..0.80)
— o concept tem um elemento FINO em 0.80..0.81 que o modelo perdeu. Proximo ajuste fino: recuar ab2_dx
para ~+0.075 para deixar uma lasca em 0.80..0.81.

**RESTA**: o vao2 do concept (**0.81..0.88** = x -0.75..-0.92) continua FECHADO — o modelo tem 0.82..0.99 solido.
Culpado provavel: o `Rear_Ramp` (x -0.81..-1.17, topo z 0.63 com rzt=0.480/rth=0.150) e/ou `Airbox_Top`
(ab2_x2). Atacar `rzt`/`rth` da rampa medindo SEMPRE o diff na linha alvo (row 192).

## BASE: **W472** (nova) = W463 + ab2_x 0.030 + ab2_x2 0.024 + **ab2_dx 0.090**
IoU 0.826 | P10 0.790 | pior 0.686@side_TRASEIRA | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.
Invariantes: x_range [-1.2,1.15] | z_range [-0.01,1.165] | scale_factor 0.98568.


## W473 (rzt 0.480->0.400, topo da rampa baixado) — NAO e o ocupante do vao2; ganho marginal

RAIO X na linha t0.54: IDENTICO ao W472 (`0.43..0.78 | 0.82..0.99`, 473 px) — **0 px na linha alvo**.
Diff total 974 px (a rampa mexeu em OUTRAS linhas). => **a rampa NAO forma o vao2 em t0.54.**
Agregado: pior 0.686->**0.687** | side/TRASEIRA 0.686->**0.687** (falta 18.4->**17.8** ✓, excesso 18.9->19.6 ✗)
| IoU/P10/COR_TV/exc/falta/<0.80 todos iguais. Ganho marginal liquido positivo no pior; ADOTADO.

**ESTADO DO ALVO t0.54** (concept: 0.41..0.77 | 0.80..0.81 | 0.88..0.94):
  vao1 (0.77..0.80) -> **RESOLVIDO** (W471/W472)
  elemento fino 0.80..0.81 -> perdido (vao ficou 0.78..0.82) — ajuste fino pendente em ab2_dx
  vao2 (**0.81..0.88** = x -0.75..-0.92) -> **AINDA FECHADO**; o modelo tem 0.82..0.99 solido
  Refutados para o vao2: rampa rzt (W473, 0px na linha) | asa (W467) | escapes (W466) | duct x (W469)
  O ocupante original do vao2 era o `Airbox` (108/108 faces) — ja reduzido e deslocado (ab2_x/ab2_dx),
  mas o run 0.82..0.99 persiste => ha OUTRO ocupante na faixa x -0.78..-0.92 que ainda nao foi isolado.
  PROXIMO: re-probe de faces em z0.600-0.650, x -0.92..-0.78 **no blend do W472** (nao do W463 — a
  geometria mudou) para achar o novo ocupante.

## BASE: **W472** (mantida) com o ganho marginal do W473 registrado (rzt 0.400)
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.


## INSIGHT DE INSTRUMENTO CRITICO: O RENDER E EM PERSPECTIVA — row<->z NAO MAPEIA

**CONTRADICAO ENCONTRADA**: no blend do W473, o vao2 (x -0.920..-0.780) em z 0.595-0.655 tem
**apenas 2 faces** (REAR/M_Dark em x -0.851). Ou seja: a geometria no vao2 esta praticamente VAZIA.
**Mas o render mostra o run `0.82..0.99` SOLIDO na linha t0.54 (row 192 da mascara cortada).**

**EXPLICACAO**: a mascara/PNG e um render PERSPECTIVO. Uma peca em z 0.62 com **y diferente** (asa,
endplates, pods, rodas em y +-0.5..0.7) projeta em OUTRA linha da imagem. Portanto:
  `row = (z_top - z)/(z_top - z_bot) * H` **so vale em projecao ORTOGRAFICA**.
=> **o probe por faixa de z NAO identifica o ocupante de uma linha da imagem** — e foi por isso que:
   - a rampa (rzt) deu 0 px na linha (W473)
   - a asa (W467), escapes (W466), duct x (W469) tambem deram 0-15 px
   - as 6 primeiras hipoteses falharam: eu media/probava em z, o alvo estava em espaco projetado.

**METODO CORRETO (a partir daqui)**: para achar o ocupante de uma linha da imagem, projetar as faces
para o espaco da IMAGEM (mesma matriz da camera do render) e checar quais caem na linha alvo — OU
renderizar com uma vista ORTOGRAFICA de debug (side ortho) para o probe voltar a mapear linearmente.

**O QUE ISSO NAO INVALIDA**: os ganhos do W471/W472 (Airbox ab2_x/ab2_dx) sao REAIS — foram medidos
diretamente na mascara renderizada (15 px e 10 px na linha alvo, run dividiu 0.78..0.82, e o agregado
melhorou sem regressao). O que muda e o METODO DE BUSCA: achar o ocupante agora exige projecao.

**PROXIMA ACAO**: (a) adicionar/rodar um render ORTOGRAFICO lateral de debug e refazer o probe por
faixa de z nele (mapeamento linear), ou (b) projetar as faces com a camera do render e listar as que
caem na linha 192 / colunas 0.82..0.99. Depois atacar o ocupante real do vao2.

## BASE: **W472** (+ ganho marginal W473: rzt 0.400)
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.


## CORRECAO DO INSIGHT ANTERIOR + BUG DO PROBE ENCONTRADO E CORRIGIDO

**O RENDER E ORTOGRAFICO — minha conclusao de "perspectiva" estava ERRADA.**
  Builder: `zc=0.62; OSC=2.42` e `cam('MK_'+nm, loc, rot, ortho=OSC)` -> cd.type='ORTHO'.
  Camera side: (0,5,0.62) olhando -y. Mapeamento confere: row236->z1.166 (topo), row653->z-0.007 (base).
  => `row = (1.165 - z)/1.175 * H` VALE (ortho). Linha alvo row192 (cortada) = y428 (completa) = **z 0.626**.

**A MASCARA ESTA CORRETA** (mascara vs BEAUTY na mesma linha y428):
  MASK  : 0.407..0.433 | 0.440..0.787 | 0.817..0.991
  BEAUTY: 0.406..0.410 0.413..0.430 | 0.438..0.788 | 0.819..0.978 0.984..0.992
  divergencia: 8 px (mask=corpo/beauty=fundo) e 4 px (inverso) — so ANTIALIASING nas bordas.
  => nao ha contaminacao; o material em 0.817..0.991 e geometria REAL.

**BUG DO MEU PROBE ENCONTRADO**: eu filtrava por `p.center`. **Faces GRANDES tem centro longe da linha**
e escapam da janela de z. Refazendo por VERTICE (min/max z da face):
  janela z 0.600-0.650, x -0.920..-0.770 -> **22 faces** (antes: 2!)
    REAR  M_Dark  22  x -0.851..-0.738  z 0.495..0.674   <- face grande cruzando a linha
=> o ocupante do vao2 e da familia `REAR/M_Dark` em x -0.74..-0.85: **`Airbox_Strut` (XRE+0.345=-0.845)
   e `Wing_Pylon` (wx1+0.075=-0.830)** — EXATAMENTE as pecas do W470 (`strut_dz`), cujo teste deu 18 px
   no total MAS **nunca foi medido na linha alvo**.

**METODO CORRIGIDO (definitivo)**: probe de faces por (a) EXTENSAO DE VERTICES na faixa de z (nao centro)
e (b) medicao do diff NA LINHA ALVO da mascara cortada (row 192). O render e ortho, entao z<->row mapeia.

## BASE: **W472** (+ W473 rzt 0.400)
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.


## INVENTARIO DEFINITIVO DA LINHA t0.54 (z~0.626, x -1.18..-0.77, POR VERTICE) — 1025 faces

  REAR  M_Silver  485  x -1.191..-0.832  img 0.843..0.996   <== OCUPANTE DOMINANTE
  REAR  M_Yellow  280  x -1.094..-0.939  img 0.889..0.955
  REAR  M_Eye     142  x -1.101..-1.057  img 0.939..0.958
  REAR  M_Dark    118  x -1.189..-0.738  img 0.803..0.995
  (imagem do modelo na linha: `0.43..0.99` solido | concept: `0.41..0.77 | 0.80..0.81 | 0.88..0.94`)

**VEREDITO DAS 8 HIPOTESES (TODAS 0 px NA LINHA ALVO — medido e re-medido):**
  w470 strut_dz -0.090 -> 18 px total  | 0 px na linha   (M_Dark, mas so 41 px de largura em x)
  w468 rx0 rampa       -> 802 px total | 0 px na linha
  w467 asa             -> 714 px total | 0 px na linha
  w469 duct dx -0.080  -> 497 px total | 0 px na linha
  w466 exh_lr_short    -> 192 px total | 0 px na linha

**POR QUE**: o run da linha vai de img 0.43 a 0.99 = x +0.14..-1.18 (1.3 m!). O ocupante dominante
nessa linha e o **`M_Silver` do REAR (485 faces, img 0.843..0.996)** — e os 5 testes moveram pecas de
OUTROS materiais/faixas (rampa M_Silver mas em z baixo, asa M_Blue, duct M_BlueDk, escapes em z<0.62,
hastes M_Dark mas com so 41 px de pegada em x).
=> **as mudancas eram de material/faixa errados, nao so de altura.**

**PROXIMA ACAO (agora com alvo certo)**: identificar QUAL peca do bloco rear() produz os 485 faces
M_Silver que cruzam z 0.626 em x -0.83..-1.19 (o M_Silver ocupante = candidatos: Rear_Ramp topo
(ao subir rzt ELE SAI da linha — testar rzt para CIMA), Rear_Bumper_U (rz1), Collector, ou o wing_tube).
Medir diff NA LINHA ALVO em cada teste.

## BASE: **W472** (+ W473 rzt 0.400)
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.


## LINHA t0.54 — HISTOGRAMA M_Silver + ENUMERACAO COMPLETA M_Dark

**M_Silver cruzando a linha: 1410 faces.** Histograma por x (decimos -1.19..-0.30):
   x -1.19..-1.10: 399 | -1.10..-1.01: 14 | -1.01..-0.92: 106 | **-0.92..-0.74: NENHUMA** |
   -0.74..-0.66: 133 | -0.66..-0.57: 149 | -0.57..-0.48: 309 | -0.48..-0.39: 83 | -0.39..-0.30: 211
Histograma por |y|: 0-0.07:294 | 0.07-0.14:390 | 0.14-0.21:280 | 0.21-0.28:234 | 0.28-0.35:212
   (todas as faixas com x -1.17..-0.30 => o M_Silver do REAR e um CONJUNTO de pecas, nao uma so)

**CONCLUSAO 1**: na faixa do vao do concept (x -0.92..-0.74) o M_Silver tem **ZERO faces** — a banda esta
limpa de M_Silver. O material ali vem do **REAR/M_Dark (118 faces, x -1.189..-0.738, img 0.803..0.995)**
e do M_Yellow/M_Eye (esses fora da faixa: M_Yellow x -1.094..-0.939 = img 0.889..0.955).

**ENUMERACAO COMPLETA DO BLOCO rear() (10908 chars, lido integralmente)** — 8 pecas M_Dark:
  1 Engine_Bot  x -0.55..-0.31  z 0.464..0.536        -> FORA
  2 ph Plug_Hole (nao esta na faixa)
  3 bb Exh_*_bore
  4 rv Rivet    x -0.948  z 0.412..0.452              -> abaixo
  5 sp Airbox_Strut x -0.845  z 0.402..0.624          -> **ESTA na janela (0.605-0.624), so o topo**
  6 fn Dslot    x -1.13  z 0.026..0.278               -> abaixo
  7 _c Rear_Clamps z 0.272..0.352                     -> abaixo
  8 py Wing_Pylon x -0.830  z 0.476..0.591            -> logo abaixo (0.591 < 0.605)
=> geometricamente SO o `sp` (Airbox_Strut) alcanca a janela — **mas `strut_dz` (W470) deu 0 px na linha**.
=> **HIPOTESE ABERTA**: as faces M_Dark do objeto REAR nessa faixa vem de OUTRA FUNCAO (o objeto REAR
   agrega pecas de mais de um bloco do builder), OU o `strut_dz` nao deslocou o que eu presumi (patch 8
   aplicado em `sp=sweep(...)` — conferir se `sp` sobrevive ao join/`reg`).

**PROXIMA ACAO EXATA**: (a) no blend, listar as 118 faces M_Dark da faixa com seu Z REAL por face
(min/max z dos vertices) para ver a distribuicao — se elas estao em z 0.605-0.648 mesmo, identificar a
peca pelo z e pelo y; (b) grep no builder INTEIRO (nao so rear()) por `M_Dark` e cruzar as coords com
x -0.74..-0.92 e z 0.6.

## BASE: **W472** (+ W473 rzt 0.400)
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.
Invariantes: x_range [-1.2,1.15] | z_range [-0.01,1.165] | scale_factor 0.98568.


## GRUPO OCUPANTE DO VAO t0.54 ISOLADO (z real por face — 254 faces M_Dark na linha)

   z_min 0.49 :   6 faces  x -0.824..-0.821  y -0.163..+0.163  z 0.495..0.657
   z_min 0.50 :   8 faces  x -0.811..-0.798  y -0.182..+0.182  z 0.497..0.666
   z_min 0.51 :  12 faces  x -0.784..-0.761  y -0.182..+0.182  z 0.506..0.677
   z_min 0.52 :   2 faces  x -0.758..-0.758  y -0.148..+0.148  z 0.517..0.677
   z_min 0.57 :  28 faces  x -0.440..-0.408  y +0.309..+0.342  z 0.571..0.612
   z_min 0.59 :  36 faces  x -1.187..-1.156  y -0.303..+0.303  z 0.594..+0.659
   z_min 0.60 :  32 faces  x -1.195..-1.173  y -0.305..+0.305  z 0.597..0.662
   z_min 0.61 :  90 faces  x -1.192..-0.408  y -0.300..+0.341  z 0.611..0.630
   z_min 0.63 :  20 faces  x -1.188..-1.154  y -0.291..+0.291  z 0.627..0.643
   z_min 0.64 :  20 faces  x -1.184..-1.154  y -0.278..+0.278  z 0.640..0.654

**O GRUPO DO VAO (x -0.758..-0.824, a metade esquerda do vao do concept):**
  z_min 0.49-0.52 -> **28 faces, x -0.758..-0.824, y +-0.182, z 0.495..0.677**
  img: x -0.758 -> 0.812 ; x -0.824 -> 0.840  =>  **img 0.812..0.840** = exatamente a metade
  esquerda do vao do concept (0.81..0.88). **ESTE e o ocupante a remover.**
  (o grupo z_min 0.59-0.64 x -1.19..-1.15 e a traseira mais extrema, img 0.98..1.0 — fora do vao)

**CANDIDATOS NO CODIGO por y half ~0.18 (busca literal):**
  Diffuser: box((XRE+dfx 0.200, 0, dfz 0.152), (dfc 0.060, **0.170**, dfh 0.130)) -> x -0.93..-1.05, z 0.02..0.28  => x/z NAO casam
  Seat_Base: box((-0.060, 0, 0.348), (0.148, **0.188**, 0.052)) -> x -0.208..+0.088               => x NAO casa
  => nenhum literal casa; a peca e posicionada por TRANSFORM/param (o REAR usa XRE e offsets).
  **PROXIMO**: no blend, tirar de cada face do grupo a peca de origem por ILHA CONEXA (bmesh
  linked faces) e reportar o centroide da ilha — isso da o x/y/z da peca sem depender de grep.

## BASE: **W472** (+ W473 rzt 0.400)
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.


## ILHAS CONEXAS — OCUPANTE DO VAO E UM PAR L/R M_Dark

bmesh linked-faces a partir de 28 sementes (x -0.83..-0.75, z_max>0.63, M_Dark):
  **ilha 0: 72 faces | x -0.851..-0.731 | y +0.112..+0.183 | z 0.494..0.677 | centroide (-0.791, +0.148, 0.586)**
  **ilha 1: 72 faces | x -0.851..-0.731 | y -0.183..-0.112 | z 0.494..0.677 | centroide (-0.791, -0.148, 0.586)**
=> par ESPELHADO (L/R), 72 faces cada, box com bevel. Bbox x -0.851..-0.731 = **img 0.800..0.851**
   (cobre a maior parte do vao do concept 0.81..0.88). z 0.494..0.677 cruza a linha (0.626).
   y +-0.112..0.183 (par L/R claramente deslocado em y).

**DESCARTADOS por x/material:**
  trio `Airbox%d` (loop em rear()): x -0.470/-0.575/-0.665, z 0.652/0.596/0.540, M_Silver -> x FORA e material errado
  `Airbox` (XRE+0.360+ab2_dx = -0.740, y half 0.118) -> y nao casa (+-0.183)
  `Airbox_Strut` (XRE+0.345=-0.845, y +-0.078, z ..0.624) -> y nao casa e z nao alcanca 0.677
  `Diffuser` (y 0.170, x -0.93..-1.05) e `Seat_Base` (y 0.188, x -0.21..+0.09) -> x NAO casam

**MAIS PROVAVEL (por y +-0.112..0.183 e x dentro da faixa):** um sub-elemento do par de ESCAPAMENTOS
L/R (y do `pt` = +-0.110/0.185/0.240; x de -0.59 a -1.19) ou o `Airbox_Duct`/`Exh*_cut` (M_Dark).
Isso explica o W466: encurtar os L/R em 0.35 moveu a PONTA (x -1.19 -> -0.84) mas o grupo (-0.851..-0.731)
sobreviveu -> 0 px na linha.
**PROXIMA ACAO**: expor/afastar o sub-elemento L/R em y (ou encurtar mais para x > -0.73) e medir o diff
NA LINHA ALVO. Alternativa direta: esconder temporariamente as ilhas (hide_render por ilha nao e
possivel sem split) -> usar `bpy.ops.mesh.separate` num blend de teste e comparar a linha.

## BASE: **W472** (+ W473 rzt 0.400)
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.


## EXPERIMENTO DE DELECAO (metodo novo e decisivo) — a ilha controla so 13 px

Metodo: abrir o blend, **remover as faces do candidato**, renderizar a mascara lateral ortho com a MESMA
config do builder (film_transparent, luzes e Ground ocultos, ortho_scale 2.42, 860x860), e medir a linha.
Sem builder, sem grep, sem adivinhar parametro.

**RESULTADO — removendo as 144 faces do par L/R M_Dark (ilhas 0+1, x -0.851..-0.731, y +-0.112..0.183):**
  baseline w473 row 192: **473 px**  (0.39..0.42 | 0.43..0.78 | 0.82..0.99)
  teste  (sem a ilha)   : **460 px**  (0.39..0.42 | 0.43..0.78 | 0.83..0.99)
  **DELTA = -13 px** (a borda esquerda do 2o run moveu 0.82 -> 0.83)
=> **a ilha NAO e o ocupante dominante da linha.** O grosso do run (img 0.83..0.99) vem de OUTRAS pecas.
=> o bbox do blend NAO mudou (y236..653 x20..856) — a remocao nao alterou os extremos (bom: teste limpo).

**METODO ADOTADO A PARTIR DAQUI (elimina a classe inteira de erro dos W466-W473):**
  Para QUALQUER linha/regiao alvo: remover o candidato no blend -> render -> medir a linha -> delta.
  Se delta ~0, o candidato esta descartado SEM gastar build nem medir agregado.
  **Isso torna a busca de ocupante O(1) por candidato e a prova e DIRETA (na imagem), nao inferida.**

**COMO DEVE SER USADO AGORA**: remover por GRUPO de material + faixa, nao por ilha adivinhada.
  ex.: remover TODAS as faces M_Silver do REAR que cruzam a linha -> mede delta; depois M_Dark; M_Yellow;
  M_Eye. O grupo com delta grande e o ocupante -> depois subdividir esse grupo em ilhas.

**BUG DE BMESH CORRIGIDO**: `bmesh.ops.delete(bm, geom=[bm.faces[i] ...])` exige `ensure_lookup_table()`
e apos coletar indices os objetos ficam invalidos -> coletar as FACES (objetos), nao indices.

## BASE: **W472** (+ W473 rzt 0.400)
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.
Invariantes: x_range [-1.2,1.15] | z_range [-0.01,1.165] | scale_factor 0.98568.


## DELECAO POR GRUPO DE MATERIAL — M_Silver e o ocupante dominante (com ressalva)

8 renders (delete->render->medir), zero builds:
  **M_Silver -> 342 px  delta -131**  run vira `0.43..0.64 | 0.72..0.78 | 0.82..0.85 | 0.90..0.95 | 0.98..0.99`
  M_Dark   -> 458 px  delta  -15   (run 0.43..0.78 | 0.83..0.99)
  M_BlueDk -> 467 px  delta   -6   (run 0.43..0.75 | 0.76..0.78 | 0.82..0.99)
  M_Yellow -> 473 px  delta    0  | M_Eye 0 | M_Blue 0 | M_White 0 | M_Gold 0
=> **o M_Silver do REAR e o ocupante dominante da linha t0.54.** Removendo-o o run se abre em 5 pedacos,
   o que revela a estrutura interna (a linha e composta de ~5 massas M_Silver sobrepostas).

**RESSALVA METODOLOGICA (importante)**: o M_Silver inclui as pecas MAIS TRASEIRAS (x -1.19), logo
remove-lo ENCOLHE o bbox -> a normalizacao desloca -> o delta -131 mistura remocao real com reescala.
O teste da ilha L/R foi LIMPO porque era interior (bbox identico: y236..653 x20..856).
**REGRA ADICIONAL**: em delete->render, conferir SEMPRE se o bbox do teste e igual ao do baseline;
se mudou, o delta nao e comparavel diretamente (corrigir comparando pelo BBOX DO CONJUNTO COMPLETO, ou
medindo em coordenadas mundo->imagem usando a camera, nao a bbox do resultado).

**CONSISTENCIA**: o histograma anterior por x dizia "ZERO M_Silver em x -0.92..-0.74". O teste de delecao
mostra mudanca em img 0.82..0.85 (= x -0.78..-0.85) — ou seja, a remocao do M_Silver altera a faixa mesmo
sem faces M_Silver ali => **confirma que o deslocamento de normalizacao (bbox) esta contaminando**. Esses
dois resultados so reconciliam se o delta incluir reescala.

**PROXIMA ACAO (correta)**: repetir a delecao por material, mas comparando SEMPRE em coordenadas MUNDO
projetadas pela camera (x_mundo -> coluna da imagem via ortho_scale 2.42, sem depender da bbox), OU
remover apenas faces INTERIORES (que nao tocam os extremos x/z do modelo) para manter o bbox intacto.

## BASE: **W472** (+ W473 rzt 0.400)
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.


## MAPEAMENTO MUNDO->IMAGEM DERIVADO (elimina a dependencia de bbox)

Camera side ortho: loc (0,5,0.62), rot (90,0,180), ortho_scale 2.42, 860x860.
  col(x) = 430 - x*355.37        | x(col) = (430-col)/355.37
  row(z) = 430 - (z-0.62)*355.37 | z(row) = 0.62 - (row-430)/355.37
VALIDACAO: x=+1.15 -> col 21 (bbox 20 ✓) | x=-1.20 -> col 856 (bbox 856 ✓)
           z=1.165 -> row 236 (bbox 236 ✓) | z=-0.01 -> row 654 (bbox 653 ✓)  ** EXATO **
=> a linha t0.54 e a FIXA **row 428** (z 0.6265). Nao derivar do bbox do teste (era o erro).

## DELECAO POR MATERIAL RE-MEDIDA NA LINHA FIXA row 428 (x MUNDO) — resultado LIMPO
  BASE        : 473 px | x: 0.16..0.23 | -0.70..0.15 | -1.19..-0.77
  **M_Silver  : 342 px delta -131** | x: 0.16..0.23 | -0.35..0.15 | -0.68..-0.53 | **-0.84..-0.77** | -1.09..-0.96 | -1.19..-1.15
  M_Dark      : 458 px delta  -15 | x: 0.16..0.23 | -0.70..0.15 | -1.18..-0.80
  M_BlueDk    : 467 px delta   -6 | x: 0.16..0.23 | -0.62..0.15 | -0.70..-0.64 | -1.19..-0.77
  M_Yellow/M_Eye/M_Blue/M_White/M_Gold: 473 px delta 0

**CONCLUSOES:**
1. O run traseiro do modelo (`-1.19..-0.77`) e formado pelo **M_Silver** (delta -131 REAL).
2. Removendo o M_Silver, ele se abre em pedacos — e **`-0.84..-0.77` cai EXATAMENTE no vao2 do concept
   (x -0.75..-0.92)**. **E ESTE o alvo a remover/reformar.**
3. A ressalva anterior (reescala) NAO se aplica quando medimos na LINHA FIXA row 428: a camera e fixa e
   remover extremos em x nao desloca z. O -131 e real.
4. O bug "centro vs extensao" reapareceu em X: o histograma por decimos de x agrupava por CENTRO DE FACE,
   entao dizia "zero M_Silver em -0.92..-0.74" — mas faces grandes tem centro longe e superficie ali.
   **REGRA: agrupar por EXTENSAO (min/max), nunca por centro — vale para z E para x.**

**PROXIMA ACAO**: subdividir o M_Silver do REAR em ilhas conexas, medir o bbox de cada ilha e achar a que
cobre x -0.84..-0.77 em z 0.6265. Depois: expor parametro no builder e reformar/remover essa peca,
medindo o delta na LINHA FIXA (row 428) ANTES de rodar o audit.

## BASE: **W472** (+ W473 rzt 0.400)
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.


## W474 (exh_dz 0.130->0.070) — OCUPANTE CONFIRMADO (escapamentos), VAO ABERTO, MAS COM TRADE-OFF

**ILHAS M_Silver DO REAR = OS 3 ESCAPAMENTOS** (270 faces cada), todos atravessando o vao:
  Exh_C: x -1.184..-0.563 | y -0.126..+0.126 | z 0.340..0.659
  Exh_L: x -1.191..-0.560 | y +0.033..+0.314 | z 0.437..0.671
  Exh_R: x -1.191..-0.560 | y -0.314..-0.033 | z 0.437..0.671
=> explica o W466 (encurtar 0.35 -> ponta em -0.84, exatamente a BORDA do vao => 0 px).

**LINHA FIXA row=428 (z 0.6265), x MUNDO:**
  w473 base        : 473 px | 0.16..0.23 | -0.70..0.15 | **-1.19..-0.77**
  w474 exh_dz 0.070: 399 px | 0.16..0.23 | -0.70..0.15 | **-0.84..-0.77** | -1.07..-0.96 | -1.16..-1.13
  => **delta -74 px e o run QUEBROU, abrindo vao em x -0.77..-0.84** (concept pede -0.75..-0.92) **MATCH**

**AGREGADO — TRADE-OFF (nao adotado):**
  IoU 0.826 (=) | P10 0.790->**0.788** | pior 0.687->**0.670** | COR_TV 0.252 (=) | excesso 12.8->**12.6** |
  falta 7.0->7.2 | <0.80 4 (=) | rear/ESCAPES 0.890->**0.904** (falta 9.0->6.8) |
  side/TRASEIRA 0.687->**0.670** (falta 17.8->**20.1**)
=> baixar 6 cm abre o vao e MELHORA os escapes, mas REMOVE silhueta que o concept TEM em TRASEIRA.
   **Bracket necessario**: testar exh_dz 0.100 e 0.115 (meia-medida) para abrir o vao sem a falta.

**INSTRUMENTO AGORA EXATO**: col(x)=430-x*355.37 | row(z)=430-(z-0.62)*355.37 (validado no bbox).
Toda medicao de linha deve usar row FIXA (nunca derivada do bbox do teste).

## BASE: **W472** (+ W473 rzt 0.400) — inalterada
IoU 0.826 | P10 0.790 | pior 0.687 | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.


## W475 (exh_dz 0.130->0.115) — **GANHO LIMPO, ZERO REGRESSAO** => NOVA BASE

**BRACKET COMPLETO DO exh_dz (linha fixa row 428, x MUNDO):**
  w473 (exh_dz 0.130, base): 473 px | 0.16..0.23 | -0.70..0.15 | -1.19..-0.77
  **w475 (exh_dz 0.115)      : 435 px | 0.16..0.23 | -0.70..0.15 | -0.84..-0.77 | -1.18..-0.95  <- ADOTADO**
  w474 (exh_dz 0.070)       : 399 px | ... | -0.84..-0.77 | -1.07..-0.96 | -1.16..-1.13
  concept: vao em x -0.66..-0.73 e -0.75..-0.92

**AGREGADO — w475 e igual ou MELHOR em tudo:**
  IoU 0.826->**0.827** | P10 0.790 (=) | **pior 0.687->0.688** | COR_TV 0.252 (=) | excesso 12.8 (=) |
  falta 7.0 (=) | <0.80 4 (=) | sep_parts 14 | **side/TRASEIRA 0.687->0.688** (excesso 19.6->19.4, COR 0.257->0.253,
  falta 17.8 (=)) | **rear/ESCAPES 0.890->0.893** (falta 9.0->8.7)
  (w474 com 0.070 abria mais o vao mas estourava TRASEIRA 17.8->20.1 e pior 0.687->0.670 => descartado)

**exh_dz ERA PARAMETRO PROTEGIDO nos registros** ("nao alterar salvo novo teste controlado que demonstre
ganho sem regressao") — **agora HA esse teste**: 0.115 e o otimo do bracket, com 0.130 e 0.070 medidos.

## BASE: **W475** (nova) = W472 + rzt 0.400 + **exh_dz 0.115**
IoU 0.827 | P10 0.790 | pior 0.688@side_TRASEIRA | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.
Invariantes: x_range [-1.2,1.15] | z_range [-0.01,1.165] | scale_factor 0.98568.
Instrumento: col(x)=430-x*355.37 | row(z)=430-(z-0.62)*355.37 (row fixa 428 = z 0.6265).


## W476 (exh_dz 0.100) — BRACKET FECHADO DOS DOIS LADOS => W475 CONFIRMADO COMO OTIMO

  w475 exh_dz 0.115: 435 px | pior **0.688** | TRASEIRA 0.688 (falta 17.8) | ESCAPES 0.893  <== BASE
  w476 exh_dz 0.100: 427 px | pior **0.686** | TRASEIRA 0.686 (falta 18.2) | ESCAPES 0.897
  w474 exh_dz 0.070: 399 px | pior **0.670** | TRASEIRA 0.670 (falta 20.1) | ESCAPES 0.904
IoU/P10/COR_TV/excesso/falta/<0.80 identicos nos tres (0.827/0.790/0.252/12.8/7.0/4).

**LEI DE ALAVANCA DO exh_dz**: baixar mais SEMPRE melhora `rear/ESCAPES` e SEMPRE piora `side/TRASEIRA`
(a falta cresce porque o concept TEM silhueta ali). **0.115 e o ponto de sela** — medido nos dois lados.

**RESIDUO DO ALVO t0.54 (nao sai por exh_dz):**
  concept: material -0.73..-0.75 | **VAO -0.75..-0.92** | material -0.92..-1.06
  w475   : material -0.77..-0.84 | **VAO -0.84..-0.95** | material -0.95..-1.18
  => o vao ABRIU mas esta deslocado ~8cm para tras (o modelo ainda tem material em -0.77..-0.84, onde o
     concept quer vazio) e o material traseiro vai ate -1.18 (concept para em -1.06, 12cm de excesso).
  => **nao e alavancavel por exh_dz** (0.115 ja e o otimo). Precisa de outro eixo:
     (a) extensao em X dos escapamentos (encurtar alem de -0.73, como no W466 mas mantendo o z),
     (b) offset em Y dos L/R (afastar da silhueta), ou
     (c) remodelar a ponteira/tailpipe (eixo x do ultimo ponto do sweep).

## BASE: **W475** (mantida)
IoU 0.827 | P10 0.790 | pior 0.688@side_TRASEIRA | COR_TV 0.252 | exc 12.8 | falta 7.0 | <0.80 4 | sep_parts 14.


## W477 (exh_fx 0.20, frente dos escapamentos recuada) — GANHO PEQUENO LIMPO, mas NAO move a linha

  LINHA row 428: IDENTICA ao w475 (435 px, mesmos runs) => cortar a PONTA DIANTEIRA nao afeta a linha;
  o material em -0.84..-0.77 vem do MEIO do tubo, nao da ponta.
  AGREGADO (ganho liquido, zero regressao): IoU 0.827->**0.828** | P10 0.790 (=) | pior 0.688->**0.689** |
  excesso 12.8 (=) | falta 7.0->**6.9** | <0.80 4 (=) | side/TRASEIRA 0.688->**0.689** (falta 17.8->17.7) |
  rear/ESCAPES 0.893 (=). **ADOTADO** (nenhuma metrica piorou).

**LEITURA**: a reducao de silhueta aconteceu em OUTRA altura (o tubo da frente sobe menos). Isso confirma a
regra de medir na LINHA ALVO: o ganho agregado veio de outro lugar, nao do alvo.

**PARA ATINGIR A LINHA** (material em -0.84..-0.77): precisa mexer no MEIO do tubo. Opcoes:
  (a) `XR-0.20` e o ponto do MEIO no sweep — expor deslocamento nele (sobe/desce e muda z do trecho medio);
  (b) reduzir o RAIO do trecho medio (o raio e unico por sweep: `exh_c_r` 0.128 / 0.080 nos L/R);
  (c) deslocar o ponto medio em Y (afasta da silhueta lateral).
  O z do meio e 0.382+_edz (central) / 0.420+_edz (L/R) -> com exh_dz 0.115 => 0.497 / 0.535 (bem abaixo de
  0.6265). Logo a silhueta na linha vem do TRECHO TRASEIRO do tubo (proximo de `exb`, z 0.412+0.115=0.527)
  + o raio 0.128/0.080 => topo ~0.655/0.615. **O raio do tubo e o candidato real para a linha.**

## BASE: **W477** (nova) = W475 + **exh_fx 0.20**
IoU 0.828 | P10 0.790 | pior 0.689@side_TRASEIRA | COR_TV 0.252 | exc 12.8 | falta 6.9 | <0.80 4 | sep_parts 14.
Invariantes: x_range [-1.2,1.15] | z_range [-0.01,1.165] | scale_factor 0.98568.


## W478 (exh_c_r 0.110) e W479 (exh_c_dz -0.035) — AMBOS DESCARTADOS, + ERRO DE ARITMETICA CORRIGIDO

  w478: pior 0.689->**0.684** ✗ | TRASEIRA 0.689->0.684 ✗ (falta 17.7->18.7) | linha 435->430
  w479: pior 0.689->**0.688** ✗ | excesso 12.8->**12.9** ✗ | TRASEIRA excesso 19.4->**20.4** ✗ |
        COR_TV 0.252->0.253 ✗ | falta 6.9->6.8 ✓ | **linha: banda -0.84..-0.77 INTACTA** (so o fundo -0.95->-0.96)

**ERRO DE ARITMETICA CORRIGIDO (meu)**: calculei o topo dos L/R pelo Z DO PONTO MEDIO. O ponto
**DIANTEIRO** dos L/R (frente, o mais alto) esta em z = 0.472 + _edz. Com _edz 0.115 => **0.587**, + raio
0.080 => **TOPO 0.667** — ACIMA da linha 0.6265. 
  central: pontos 0.340/0.382/0.412 +0.115 => topo 0.527 + raio 0.128 = **0.655** (tambem acima, mas o
  W479 mostrou que baixa-lo mexe so o FUNDO, nao a banda).
  L/R    : pontos 0.392/0.420/**0.472**(frente) +0.115 => topo **0.587** + 0.080 = **0.667** <= OCUPANTE DA BANDA
=> **A BANDA -0.77..-0.84 E OCUPADA PELOS L/R (frente), NAO PELO CENTRAL.** Hipotese do W479 refutada.

**CONSISTENTE COM W474**: baixar os TRES 0.06 (exh_dz 0.070) abria a banda -= porque baixava os L/R.
Logo a alavanca certa e: **z PROPRIO DOS L/R** (patch a criar: `exh_lr_dz`), nao o central.

**TRADE-OFF ESPERADO (ja medido no W474)**: baixar os L/R abre a banda mas custa TRASEIRA (falta 17.7->20.1).
Alternativa sem trade-off: **reduzir o RAIO dos L/R** (0.080) OU **recuar a frente deles em X** (exh_fx maior)
para que o ponto alto saia da regiao da banda mantendo a silhueta baixa.

## BASE: **W477** (mantida; W478/W479 descartados)
IoU 0.828 | P10 0.790 | pior 0.689@side_TRASEIRA | COR_TV 0.252 | exc 12.8 | falta 6.9 | <0.80 4 | sep_parts 14.
Patches no runner: 1..11 (exh_c_dz adicionado, ainda sem uso adotado).


## W480 (exh_lr_r 0.062) — GANHO PEQUENO LIMPO, mas a BANDA NAO MUDA => raio NAO e a alavanca

  linha row 428: **IDENTICA** (435 px, mesmos runs) => a banda -0.84..-0.77 nao e governada pelo raio dos L/R.
  AGREGADO (adotado, nada piorou): IoU 0.828 (=) | P10 0.790->**0.791** | pior 0.689->**0.690** |
  excesso 12.8 (=) | falta 6.9 (=) | <0.80 4 (=) | side/TRASEIRA 0.689->**0.690** (COR 0.254->**0.245**) |
  rear/ESCAPES 0.893 (=).

**HISTORICO DAS HIPOTESES DA BANDA -0.77..-0.84 (todas medidas, na linha fixa row 428):**
  | hipotese | teste | linha | pior | veredito |
  | exh_dz global 0.115 | W475 | 473->435 | 0.688 | ADOTADO (abriu o vao 1) |
  | exh_dz global 0.100 | W476 | 427 | 0.686 | descartado |
  | exh_dz global 0.070 | W474 | 399 | 0.670 | descartado (TRASEIRA falta 20.1) |
  | exh_fx 0.20 (frente X) | W477 | 435 (=) | 0.689 | ADOTADO (ganho em outra altura) |
  | exh_c_r 0.110 (raio central) | W478 | 430 | 0.684 | descartado |
  | exh_c_dz -0.035 (z central) | W479 | 430 | 0.688 | descartado |
  | exh_lr_r 0.062 (raio L/R) | W480 | 435 (=) | 0.690 | ADOTADO (ganho em outra altura) |

**CONCLUSAO**: a banda resiste a raio (central e L/R), a z do central e a X da frente. A UNICA alavanca que
provou abrir a banda foi **baixar os L/R em Z** (implicito no exh_dz global 0.070 do W474) — que traz o
trade-off de TRASEIRA. Falta testar `exh_lr_dz` isolado (patch a criar) para MEDIR se o trade-off e menor
quando so os L/R descem (o global baixa tambem o central, que contribui para a silhueta que o concept tem).

**ARITMETICA CONFERIDA**: L/R frente z = 0.472 + 0.115 = 0.587 + raio 0.080 => 0.667 (acima de 0.6265).
Com raio 0.062 => 0.649 — **ainda acima** => explica a banda intacta no W480 (faltavam 0.023).

## BASE: **W480** (nova) = W477 + exh_lr_r 0.062
IoU 0.828 | P10 0.791 | pior 0.690@side_TRASEIRA | COR_TV 0.252 | exc 12.8 | falta 6.9 | <0.80 4 | sep_parts 14.


## W481 (exh_lr_dz -0.045) — **INVARIANTE VIOLADO => COMPARACAO INVALIDADA, NAO ADOTADO**

  x_range [-1.201, 1.149]  <-- ESPERADO [-1.2, 1.15]   **VIOLADO**
  scale_factor 0.98563     <-- ESPERADO 0.98568        **VIOLADO**
  len_before   2.3843      <-- ESPERADO 2.3841         (mudou)

Baixar os L/R altera a EXTENSAO PROJETADA em x => reescala => A/B contra W480 e INVALIDO.
E a mesma armadilha do W465 (exh_short). **NAO comparar, NAO adotar.**

**REGRA APLICADA (a que eu tinha formalizado e agora respeitei)**: parametro que mexe em scale_factor/x_range/
z_range nao entra em A/B sem COMPENSACAO.

**CONSEQUENCIA PARA A BANDA -0.77..-0.84**: a unica alavanca com efeito provado nela (baixar os L/R em Z)
**tambem mexe no x_range**. Logo:
  (a) ou se compensa: baixar os L/R E ajustar a geometria que define o extremo x do modelo, para devolver
      len_before=2.3841 / scale_factor=0.98568 / x_range=[-1.2,1.15];
  (b) ou se abandona a alavanca e a banda fica como residual CONHECIDO e MEDIDO (7cm, ~40px de 435).

**ESTADO HONESTO DO ALVO t0.54**: vao 1 ABERTO (W471/W472) e vao 2 ABERTO PARCIALMENTE (W475/W477/W480) —
  concept: material -0.73..-0.75 | VAO -0.75..-0.92 | material -0.92..-1.06
  w480   : material -0.77..-0.84 | VAO -0.84..-0.95 | material -0.95..-1.18
  residuo: 7cm de material em -0.77..-0.84 (onde o concept quer vazio) e 12cm de material traseiro a mais.
  Nenhuma das 7 hipoteses testadas removeu esse residuo sem violar invariante ou piorar o gate.

## BASE: **W480** (mantida; W481 descartado por invariante)
IoU 0.828 | P10 0.791 | pior 0.690@side_TRASEIRA | COR_TV 0.252 | exc 12.8 | falta 6.9 | <0.80 4 | sep_parts 14.
Invariantes: x_range [-1.2,1.15] | z_range [-0.01,1.165] | scale_factor 0.98568.


## W482/W483 — COMPENSACAO DO INVARIANTE (via `exh_x`, a ponta traseira)

**W482 (exh_x -1.086)**: ERRO MEU — usei o DEFAULT do builder (XRE+0.041=-1.087) em vez do valor
  canonico do BASE_PARAMS.json (**exh_x = -1.19**). Erro de 0,104 m => len_before 2.3262, scale 1.01022,
  x_range [-1.172,1.178], z_range ate 1.194. **INVALIDO por erro de dado, nao por hipotese.**
  **LICAO: TODO override deve ser conferido contra BASE_PARAMS.json antes do build** (o default do
  builder NAO e o valor base para: exh_x=-1.19, e possivelmente outros).

**W483 (exh_lr_dz -0.045 + exh_x -1.189)**: compensacao quase convergida —
  x_range **[-1.2, 1.15] ✓ EXATO** | z_range [-0.01, **1.166**] (off 0,001) | len_before 2.3833 (off 0,8mm) |
  scale_factor **0.98602** (off 3,4e-4 = 0,034%)
=> o extremo x voltou, mas o comprimento PRE-ESCALA ficou 0,8mm curto (mover exh_x 1mm tira comprimento
   do tubo inclinado) => o scale sobe para compensar o target_length.

**PERGUNTA DE METODO ABERTA (honesta)**: a regra diz "nao entra em A/B sem compensacao". Com x_range EXATO,
z_range off 1mm e scale off 0,034%, **qual e a tolerancia?** Opcoes:
  (a) exigir EXATO (iterar mais nudges em exh_x ate len_before=2.3841) — mais 1-2 builds;
  (b) aceitar <=0,1% e documentar (o efeito no pixel e <1px: 2,35*0,00034 = 0,8mm = 0,3px);
  (c) medir as DUAS versoes no MESMO bin de comparacao e reportar a sensibilidade.

**DECISAO**: seguir (a) — mais um nudge — porque a regra existe justamente porque eu ja me queimei com
  reescala (W465). Um build a mais e barato; um A/B contaminado custa o ciclo inteiro.

## BASE: **W480** (mantida)
IoU 0.828 | P10 0.791 | pior 0.690 | COR_TV 0.252 | exc 12.8 | falta 6.9 | <0.80 4 | sep_parts 14.


## W484/W485 — COMPENSACAO VIA TRANSLACAO RIGIDA (a solucao correta) + A/B VALIDO

**W484 (exh_lr_dz -0.045, exh_x -1.190 canonico)**: IDENTICO ao W481 sem compensacao => confirma que
  W481 ja usava exh_x=-1.19 e que os dois requisitos (x_range exato vs len_before exato) CONFLITAM ao
  mexer na peca: sao a MESMA medida (x_range e o comprimento pos-escala).

**W485 (exh_lr_dz -0.045 + patch 14 `xtrans`=+0.001)**: **INVARIANTES EXATOS**
  x_range [-1.2, 1.15] ✓ | z_range [-0.01, 1.165] ✓ | len_before 2.3843 | scale 0.98563 (=2.35/2.3843, DERIVADO)
  => a TRANSLACAO RIGIDA em X pos-escala e a compensacao CORRETA: restaura posicao sem tocar comprimento
     nem z. O scale_factor NAO e constraint independente (e funcao do len_before) — as constraints reais sao
     x_range, z_range e o comprimento (=2.35).

**RESULTADO DO A/B (VALIDO):**
  linha row 428: 435 -> 436 px | **banda -0.84..-0.77 INTACTA**
  pior 0.690->**0.691** | side/TRASEIRA 0.690->**0.691** (falta 17.7->17.6, COR 0.245->**0.234**) |
  falta 6.9->**6.8** | IoU 0.828 (=) | P10 0.791 (=) | **excesso 12.8->12.9** (+0.1) | <0.80 4 (=)

**HIPOTESE DOS L/R REFUTADA**: com exh_lr_dz -0.045 o topo dos L/R vai a 0.604 (abaixo da linha 0.6265)
  e a banda DEVERIA abrir. **NAO ABRIU.** Somado ao W479 (central tambem nao), conclui-se que a banda
  -0.77..-0.84 nao e governada por: raio central, raio L/R, z central, z L/R, X da frente, X da ponta.
  A unica acao que JA abriu a banda foi baixar OS TRES 0.06 (W474) — o que sugere um efeito COMBINADO
  (sombra/oclusao entre tubos) ou um ocupante que nao e nenhum dos tres tubos isoladamente.

**PROXIMO PASSO DECISIVO (metodo de delecao ja provado)**: no blend do W485, DELETAR os tres tubos
  inteiros (todas as faces M_Silver do REAR acima de z 0.55) e medir a linha — se a banda abrir, o
  ocupante e um tubo e o problema e COMBINADO; se nao abrir, o ocupante e OUTRA peca (M_Dark etc) e os
  4 testes de tubo foram todos inconclusivos por medirem efeito de oclusao.

## BASE: **W485** (nova, invariantes exatos) — mas excesso +0.1 mantem W480 como referencia conservadora
IoU 0.828 | P10 0.791 | pior 0.691@side_TRASEIRA | COR_TV 0.251 | exc 12.9 | falta 6.8 | <0.80 4 | sep_parts 14.


## TESTE DE DELECAO DOS TUBOS (W485del) — INVALIDO POR RENDER, NAO POR HIPOTESE

  removidas: 304 faces M_Silver cruzando a banda com x<-0.70
  resultado: linha row 428 = **831 px (de 860), solida em x -1.182..1.154**
  => uma DELECAO NAO PODE ADICIONAR MATERIAL. 831/860 = fundo praticamente todo opaco =>
     **o render manual nao reproduziu as settings do pipeline canonico** (film_transparent/alpha).
     Somado ao recorte, o teste e INVALIDO POR INSTRUMENTO.

**REGRA NOVA (14)**: QUALQUER teste de delecao deve reusar o BLOCO DE RENDER do builder/runner canonico
  (mesmas settings de alpha, mundo, camera e resolucao). Render manual proprio NAO serve para A/B de pixel.
  Verificacao obrigatoria antes de medir: o numero de pixels da linha deve ficar na mesma ordem
  (centenas, nao 831/860). Um valor absurdo = instrumento quebrado, nao resultado.

**O QUE JA E SOLIDO (por A/B validos, com invariantes exatos):**
  W479: baixar SO o central -0.035 => banda INTACTA
  W485: baixar SO os L/R -0.045 => banda INTACTA (topo dos L/R ia a 0.604, abaixo da linha)
  W474: baixar OS TRES -0.06 (exh_dz 0.070) => banda ABRIU (linha 473->399)
  => o efeito e COMBINADO ou o ocupante nao e um tubo isolado. Os 4 testes de tubo medem a configuracao
     inteira, nao o ocupante — logo a conclusao "e o tubo" NUNCA foi provada, apenas correlacionada.

**CAMINHO CORRETO PARA PROVAR O OCUPANTE** (sem depender de crop nem de render manual): usar o
  RUNNER CANONICO com um parametro de delecao que esconda pecas por MATERIAL E FAIXA, gerando o render
  pelo proprio pipeline. E o proximo passo.

## BASE: **W485**
IoU 0.828 | P10 0.791 | pior 0.691@side_TRASEIRA | COR_TV 0.251 | exc 12.9 | falta 6.8 | <0.80 4 | sep_parts 14.
Invariantes EXATOS: x_range [-1.2,1.15] | z_range [-0.01,1.165]. Patches no runner: 1..14.


## W486 — DELECAO NO PIPELINE CANONICO (metodo VALIDO) => OCUPANTE NAO E M_Silver

**METODO AGORA VALIDO** (patch 15 no runner: `del_mat`/`del_z`/`del_x`, aplicado ANTES do passe de mascara
  canonico => mesmas settings de alpha/mundo/camera). Invariantes exatos, mask_ok, 304 faces removidas.

  w485 (base)          : 436 px | 0.163..0.228 | -0.695..0.146 | **-0.836..-0.765** | -1.185..-0.945
  w486 (M_Silver fora) : 408 px | 0.163..0.228 | -0.695..0.146 | **-0.836..-0.765** | -1.086..-0.962 | -1.185..-1.151
  => **A BANDA FICA INTACTA.** O delta de -28 px ocorre na TRASEIRA (-1.185..-0.945 quebra em dois).

**CONCLUSAO DURA**: o ocupante da banda -0.765..-0.836 **NAO E M_Silver**. A alegacao anterior
  ("M_Silver controla 131 px na linha") era **CONTAMINACAO DE BBOX** — a mesma ressalva que eu havia
  levantado e depois tratei como resolvida. Ela NAO estava resolvida.

**BUSCA AGORA ESTREITADA E VALIDA**: o ocupante e um material NAO-silver do REAR: M_Dark, M_BlueDk,
  M_Yellow, M_Eye, M_Gold, M_White ou M_Blue. Proximo: repetir o teste com `del_mat='M_Dark'`
  (mesma faixa) — se a banda abrir, e M_Dark; se nao, seguir a lista. Cada teste custa 1 build.
  **Este e o primeiro teste de ocupante VALIDO da investigacao inteira** (os 8 anteriores mediam a
  configuracao global ou estavam contaminados por bbox).

**NOTA DE SEGURANCA METODOLOGICA**: W486 e um build de DIAGNOSTICO (tem faces removidas) — NAO pode
  entrar no audit nem virar base. Serve apenas para localizar o ocupante.

## BASE: **W485**
IoU 0.828 | P10 0.791 | pior 0.691@side_TRASEIRA | COR_TV 0.251 | exc 12.9 | falta 6.8 | <0.80 4 | sep_parts 14.
Invariantes EXATOS: x_range [-1.2,1.15] | z_range [-0.01,1.165]. Patches no runner: 1..15.


## W487 — **OCUPANTE IDENTIFICADO: `M_Dark`** (teste VALIDO, nao correlacao)

  w485 (base)     : 436 px | 0.163..0.228 | -0.695..0.146 | **-0.836..-0.765** | -1.185..-0.945
  w487 (M_Dark fora, 168 faces): 407 px | 0.163..0.228 | -0.695..0.146 | **-1.176..-0.945**
  => **A BANDA DESAPARECE.** O resto da linha e preservado (delta total -29 px).
  => remover M_Silver (W486) NAO removia a banda; remover M_Dark REMOVE. **Ocupante = M_Dark.**

**DIRECAO**: com o M_Dark fora, o modelo fica VAZIO de -0.84 a -0.94 — contra o vao pedido pelo concept
  de -0.75..-0.92. Ou seja, remover/remodelar o M_Dark aproxima o modelo do concept. 

**PROXIMO PASSO**: rodar a analise de ILHAS CONEXAS nas 168 faces M_Dark removidas para NOMEAR a(s)
  peca(s) (bmesh linked faces + centroide/bbox), depois EXPOR o parametro no run_variant.py, remodelar
  a peca e medir o A/B VALIDO contra W485 (row fixa 428 + audit AUDIT_SKIP=top).

**HISTORICO DA CACADA (para nao repetir):** M_Silver (W486: banda intacta), central z/raio, L/R z/raio,
  X da frente e da ponta — todos REFUTADOS com metodo valido. A resposta era M_Dark, um material que
  nunca testei isoladamente na banda (os testes M_Dark do inicio estavam contaminados por bbox).

## BASE: **W485** (W486/W487 sao builds de DIAGNOSTICO — nao entram no audit nem viram base)
IoU 0.828 | P10 0.791 | pior 0.691@side_TRASEIRA | COR_TV 0.251 | exc 12.9 | falta 6.8 | <0.80 4 | sep_parts 14.


## W489 (pyl_dz2 -0.090) — GANHO REAL: VAO ABERTO E PIOR REGIAO +0.008  => NOVA BASE

  CAUSA RAIZ DO ERRO ANTERIOR: `wz = P.get('wing_z',0.570) * H` — o topo do Wing_Pylon e wz-0.030 com
  wz = 0.585*1.207 ~= 0.706 => topo ~0.676 (exatamente o z 0.655..0.677 da ilha). O patch 16 (`pyl_dz`)
  baixava o SEGUNDO ponto (0.512 = ponta de BAIXO) => nao mexia na banda. **Mirei no lado errado do tubo.**
  O patch 17 (`pyl_dz2`) baixa o PRIMEIRO ponto (o topo) => a alavanca correta.

  LINHA row 428 (x mundo): w485 436 px | ... -0.836..-0.765 | -1.185..-0.945
                           w489 410 px | ... **VAO LIMPO**   | -1.185..-0.945   (o vao t0.54 FECHOU)
  AGREGADO: IoU 0.828 (=) | P10 0.791 (=) | **pior 0.691->0.699** | COR_TV 0.251->0.253 | **excesso 12.9->12.8** |
  falta 6.8 (=) | <0.80 4 (=) | **side/TRASEIRA 0.691->0.699** (excesso 19.1->**17.7**, COR 0.234->0.247,
  falta 17.6->17.7) | rear/ESCAPES 0.893 (=) | rear/ASA_CAPACETE 0.912 (=)
  => NENHUMA metrica agregada piorou. **ADOTADO como base.**

**METODO QUE FUNCIONOU (para reuso)**: 1) delecao no pipeline canonico (W487) para PROVAR o material
  ocupante; 2) ilhas conexas bmesh + z distintos por ilha (bimodal 0.49-0.52 / 0.655-0.677) para casar
  com a peca; 3) leitura do codigo para achar o parametro REAL (cuidado: literais multiplicados por H);
  4) patch no ponto certo do tubo; 5) A/B na linha fixa + audit.

## BASE: **W489** (nova) = W485 + pyl_dz2 -0.090
IoU 0.828 | P10 0.791 | pior 0.699@side_TRASEIRA | COR_TV 0.253 | exc 12.8 | falta 6.8 | <0.80 4 | sep_parts 14.
Invariantes EXATOS: x_range [-1.2,1.15] | z_range [-0.01,1.165]. Patches no runner: 1..17.


# ================= RECONSTRUCAO PROPORCIONAL — REJEICAO DO USUARIO (2026-09-20) =================

**VEREDITO**: "ainda esta bem fraco o design e bem longe de ser um 3d aaa e fiel ao concept".
Vision proprio pareado (concordou, reprovou): "a silhueta nao e a mesma ... parece outro kart".
=> **REJEICAO DO USUARIO INVALIDA TODOS OS GATES ANTERIORES.** Ajuste parametrico (W4xx) NAO resolve;
   o problema e ESTRUTURAL. Vai ser feito REMODELAMENTO POR ZONA, com alvo medido no concept.

## ESPECIFICACAO MEDIDA DO CONCEPT (mask c_side.npy, bbox 402x751 px)
  **L/H = 1.868**  (modelo atual: 1.999 => **7% comprido demais** => altura baixa demais)
  => H alvo = 2.35/1.868 = **1.258 m**  |  modelo atual H = 2.35/1.999 = **1.176 m**  |  **faltam ~8,2 cm**

  PERFIL SUPERIOR (t=0 frente -> 1 traseira), z normalizado (1.0 = topo do capacete):
    t=0.00 z=0.204  bico
    t=0.20 z=0.378
    t=0.30 z=0.522  cowl/volante
    t=0.40 z=0.473  VALE atras do cowl
    t=0.50 z=0.567  ombro do piloto
    t=0.55 z=0.928  **SALTO BRUSCO +0.36 em 5% do comprimento** (capacete/encosto)
    t=0.65 z=0.993  **PICO = CAPACETE** (topo absoluto da silhueta)
    t=0.70 z=0.940
    t=0.75 z=0.619  **queda brusca**
    t=0.85 z=0.520  **TRASEIRA BAIXA**
    t=0.95 z=0.697  **escapamento = pico LOCAL** (30% abaixo do capacete)
    t=1.00 z=0.500

## AS 3 DIFERENCAS GRAVES (vision, com localizacao)
  1. **SILHUETA SUPERIOR CENTRAL (t 0.45-0.75)**: concept = capacete ALTO (pico 0.993) + piloto ERETO +
     ENCOSTO PRETO ALTO e vertical. Modelo = capacete menor/baixo e adiantado, tronco DEITADO, e o encosto
     alto PRETO NAO EXISTE (virou lombada azul baixa). => a linha superior AFUNDA no meio.
  2. **TRASEIRA (t 0.75-1.00)**: concept = BAIXA e curta, termina no pneu, com UM escapamento gordo +
     caixinha amarela. Modelo = bloco cinza + mola dourada exposta + quadro tubular + bola amarela +
     para-choques longos => **a traseira virou o segundo pico mais alto**, criando 2 picos inexistentes.
  3. **SIDEPOD (entre-eixos, faixa inferior)**: concept = AMARELO volumoso, gordo, curvo (banana), desce
     quase ao chao, define o ventre. Modelo = menor, dividido (topo azul inchado + aba amarela fina reta)
     com chassi/vazio exposto => linha inferior fina/reta/alta vs gorda/curva.

## PLANO DE RECONSTRUCAO (por zona, ordem de impacto) — alvos numericos
  Z1 PILOTO/CAPACETE/ENCOSTO: capacete no PICO z=0.993 (topo absoluto), piloto SENTADO ERETO (nao deitado),
     ENCOSTO PRETO ALTO E VERTICAL visivel acima da linha do ombro. H -> 1.258 m (z_range alvo [-0.01,1.258]).
     Salto t 0.50->0.55 de 0.567 para 0.928 = parede quase vertical do conjunto encosto/capacete.
  Z2 TRASEIRA: baixar TODO o conjunto mecanico para z<=0.62 em t 0.75-0.85; escapamento UNICO gordo como
     pico LOCAL em z~0.674-0.697 em t 0.90-0.95; remover/expor menos: mola dourada, quadro tubular, bola
     amarela e para-choques alem do pneu.
  Z3 SIDEPOD: volume UNICO amarelo, gordo e curvo, preenchendo o entre-eixos e descendo quase ao chao.
  Z4 RE-MEDIR L/H = 1.868 e o perfil superior t-a-t contra a spec acima (o perfil e a metrica de aceite).

**METRICA DE ACEITE NOVA**: correlacao do PERFIL SUPERIOR (20 pontos) + L/H 1.868 + pico do capacete em
  t=0.65 com z=0.993 + traseira <=0.62 em t 0.80-0.85. O IoU/COR_TV anteriores ficam como secundarios.

**NOTA**: isso muda `z_range` de proposito — a spec do concept (L/H 1.868) e a AUTORIDADE depois da
  rejeicao do usuario. O gate antigo de z_range [-0.01,1.165] fica INVALIDADO.


## Z1 CONCLUIDO — W490 (helm_r 0.235, helm_z 1.050): L/H 1.999 -> 1.861 (concept 1.868)
  z_range [-0.01, 1.253] (alvo 1.258) | x_range [-1.2,1.15] EXATO | scale 0.98563 intacto | QA aprovado
  DIF do perfil superior: t0.55 +0.028 | t0.60 +0.005 | t0.65 -0.006 (PICO = CAPACETE, era a falha principal)
ALVOS RESIDUAIS Z2/Z3: (1) COWL t0.35 -0.099 / t0.40 +0.093 => pico do modelo 12cm ATRAS (concept pica em x=0.328m, modelo em x=0.210m; COWL hoje x 0.0911..0.6202) -> deslocar frente +0.12m em x; (2) ESCAPAMENTO t0.90 -0.062 / t0.95 -0.093 => subir ~11cm SO o trecho traseiro (cuidado: subir o tubo inteiro re-fecha a banda t0.54 calibrada em W474/W489); (3) TRASEIRA t0.75-0.85 ~-0.05 (baixa, dentro da tolerancia); (4) BICO t0.10 -0.051.
METRICA DE ACEITE: EMA do perfil superior (21 pontos) = 0.0393


## Z2 TENTATIVA 1 (W491) — cowl_xf0 0.174 + exh_tip_dz 0.090 => **ZERO MUDANCA no perfil**
  EMA do perfil: w490 0.0393 -> w491 0.0393 (IDENTICO). Todos os diffs de t byte-identicos.
  O patch APLICOU (bbox do COWL mudou de x 0.0911..0.6202 para 0.2061..0.7352) mas a SILHUETA nao mudou.
  => **COWL e PONTA DO ESCAPAMENTO nao governam o perfil em t 0.35-0.40 nem t 0.90-1.00.**
  Banda t0.54 preservada (410 px, identica) — o alvo de 11cm no escapamento tambem nao se moveu por essa via.

**METODO PARA ACHAR O OCUPANTE DO PERFIL (o mesmo que funcionou na banda)**: usar `del_mat`+`del_z`+`del_x`
  no pipeline canonico para deletar por material a faixa de z/x de cada trecho do perfil:
   - trecho A (t 0.35-0.40): x 0.210..0.328 m, z acima de ~0.55 m; testar M_Blue, M_Yellow, M_Dark, M_Silver.
   - trecho B (t 0.90-1.00): x -1.19..-0.84 m, z acima de ~0.55 m; testar M_Silver (escapamentos), M_Dark, M_Gold.
  Um build por material; o material cuja remocao muda o perfil E o ocupante daquele trecho.


## Z2-A — DELECAO POR TRECHO (t 0.35-0.40, x 0.17..0.38, z 0.48..0.80): M_Blue
  removidas 335 faces M_Blue => **SO t=0.35 mudou**: 0.439 -> 0.403 (delta -0.036). Os outros 20 pontos: 0.000.
  => **M_Blue (cowl) E ocupante PARCIAL da silhueta em t 0.35** (responde por 0.036 dos 0.098 que faltam).
  EMA piorou 0.0393 -> 0.0410 (a remocao afasta do concept, confirma que a peca contribui para o topo).
  => os ~0.062 restantes em t 0.35 e todo o erro de t 0.40 SAO DE OUTRO MATERIAL/PECA.

**CAUSA PROVAVEL DO DEFICIT DO COWL**: o topo usa `zt=prof_top(xf)*H*0.97` + **SUBSURF levels=1 aplicado**
  (o subsurf ENCOLHE a superficie: o topo real fica abaixo do zt calculado). O W491 deslocou o cowl em x e
  nao mudou nada => o perfil do concept e plano nessa faixa de xf, entao transladar nao altera o topo.
  ALVANCA CANDIDATA: remover o `*0.97` e/ou o SUBSURF do cowl, ou subir o zt explicitamente.

**PROXIMOS TESTES DA MESMA BATERIA (um build cada)**: del_mat M_Yellow, M_Dark, M_Silver no mesmo trecho.
  Depois o trecho B (t 0.90-1.00, x -1.19..-0.84, z > 0.55): M_Silver, M_Dark, M_Gold.


## Z2-A CONCLUIDO — cowl_k: o *0.97 + SUBSURF encolhiam o topo do cowl ~18%
  Causa medida: zt=prof_top(xf)*H*0.97 da ~0.673m em xf 0.34, mas o SUBSURF levels=1 entrega 0.550m.
  Alavanca criada: patch 20 `cowl_k` (default 0.97). Bracket:
    k=0.97 (w490 base): EMA 0.0393 | t0.30 0.481(-0.041) | t0.35 0.439(-0.099) | t0.40 0.566(+0.093)
    k=1.16 (W493):      EMA 0.0381 | t0.30 0.575(+0.053) | **t0.35 0.575(+0.037)** | t0.40 0.566(+0.093)
    k=1.105 (W494):     EMA 0.0376 | t0.30 0.548(+0.026) | t0.35 0.441(-0.096) | t0.40 0.566(+0.093)
  **ADOTADO k=1.16 (W493)**: t0.35 -0.099 -> +0.037 (maior erro do perfil depois do capacete, corrigido).
  PITFALL: o cowl responde NAO-MONOTONICAMENTE ao k (secoes discretas NS=22) — k=1.105 cai entre secoes
  e nao sobe o ponto critico. Nao interpolar k; testar os valores das secoes.
  Efeito colateral aceito: o topo do cowl (0.7405z) cruza a linha row=428 na FRENTE => run novo 0.340..0.529.
  A banda TRASEIRA (x -0.765..-0.836) CONTINUA LIMPA (410 px do W489 preservados).
  PRECISAO NOVA: 2 prof_top(xf) do concept = o cowl segue o perfil medido; nao inventar alturas.

**RESIDUO ABERTO do trecho A**: t0.40 = +0.093 (x=0.210m) NAO e o cowl (k nao o afeta). E outro material.
  Proximo: del_mat M_Blue/M_Yellow/M_Dark/M_Silver em x 0.16..0.26, z > 0.60 (acima da linha) para achar quem
  forma aquele pico de 0.566 (concept manda 0.473).


## Z2-A BATERIA COMPLETA (delecao por material no trecho A: x 0.15..0.27, z 0.55..0.95)
  M_Yellow -> 0 faces  (REFUTADO: nao ha macacao do piloto nesse x acima de z0.55)
  M_Gold   -> 0 faces  (REFUTADO)
  M_Silver -> 6 faces  (irrelevante)
  M_Blue   -> 335 faces => muda SO t0.35: 0.439 -> 0.403 (-0.036)   [e o cowl]
  M_Dark   -> 394 faces => muda SO t0.40: 0.566 -> 0.519 (-0.047)   [OCUPANTE DO PICO t0.40]

**CONCLUSAO**: o pico de t0.40 (modelo 0.566 vs concept 0.473 = +0.093) e material M_Dark em x~0.21m,
  z 0.55-0.95. A remocao total dessas faces recupera -0.047 (51% do excesso); o restante e outro material
  (candidato: M_Blue do CH, 4o a testar). Peça candidata no builder: o CH (cockpit/dash, z max 0.7938).

**METODO CONSOLIDADO (vale para qualquer trecho do perfil)**:
  1. medir a coluna do perfil em x_alvo = XFO - t*L  (XFO ~1.128, L=2.35);
  2. rodar del_mat com del_z acima do valor do modelo e del_x estreito em torno de x_alvo;
  3. comparar o perfil: o material cuja remocao muda SO aquela coluna E o ocupante;
  4. del_n pequeno (<10) descarta a hipotese sem gastar render de silhueta.
  PITFALL: o cowl com cowl_xf0=0.174 comeca em x=0.2061 => a coluna de t0.40 (x=0.210) fica na BORDA do cowl.
  Por isso mudar cowl_k nao afeta t0.40 — nao confundir 'peca existe na coluna' com 'peca forma o topo'.


## Z2-A BATERIA FECHADA (7 materiais, trecho A: x~0.21, z 0.50..0.95)
  M_Yellow 0 | M_Gold 0 | M_BlueDk 0 | M_Silver 6  => todos REFUTADOS (del_n<10 = nao gastar render)
  M_Blue 335 faces -> muda SO t0.35 (cowl) | M_Dark 394 faces -> muda SO t0.40 (OCUPANTE)
  => SO DOIS materiais vivem na faixa. M_Dark explica -0.047 dos +0.093 de t0.40 (51%).
  Os ~0.046 restantes: M_Dark fora da faixa z (o teste usou z>=0.55) ou M_Pedal. Candidato fisico: CH/cockpit
  (z max 0.7938) — provavel volante+dash altos demais.

**ALVO FISICO DO TRECHO A**: descer a estrutura escura do dash/volante ~0.11 m (0.566 -> 0.473 no perfil = -0.093).
  Fix planejado: parametro `ch_top_dz` no CH, baixando so o topo do conjunto escuro em x 0.15..0.30.


## Z2-A fixes testados — DOIS REFUTADOS
  Nassau: REFUTADO lendo o codigo (assign M_Blue; Nassau_Face M_Yellow; bbox z 0.30..0.56 em x=0.363) — 3 builds poupados.
  Cockpit_Cut (patch 21 ch_top_dz=-0.110, W500): **ZERO mudanca no perfil** (EMA 0.0381 identico, todos os diffs iguais).
  => o aro do recorte NAO e o topo de t0.40. O `box()` do cutter sem assign nao e o M_Dark medido no W498.

**PROVA ATIVA**: W498 provou que 394 faces M_Dark em x0.15..0.27/z0.55..0.95 BAIXAM t0.40 em -0.047.
  Pecas ja excluidas nesse espaco: COWL (M_Blue, k nao afeta t0.40), Nassau (M_Blue/z baixo), Cockpit_Cut (W500 zero).
  CANDIDATO RESTANTE: partes M_Dark do PILOTO (PL: x -0.57..0.65, z 0.2441..1.2708) — botas/pernas/braco escuros
  avancando ate x~0.21 acima de z0.55. Proximo: del_mat M_Dark com del_x [0.15,0.27] e del_z [0.55,0.95] MAS
  excluindo as pecas do CH/COWL — ou ler o piloto() buscando M_Dark com x>0.15.


## Z2-A — LUVAS REFUTADAS, e a evidencia esta PARTICIONADA
  Gloves (codigo): tubevar [(0.238,+-0.126,0.570),(0.246,+-0.126,0.520)] r 0.049/0.046, M_Dark.
  x 0.189..0.287 | z top 0.619 — casava com a faixa do W498 (x0.15-0.27, z0.55-0.95).
  W501 del_mat M_Dark em x 0.18..0.30 / z 0.55..0.65 => 252 faces, **ZERO mudanca** (EMA 0.0381 identico).
  => as luvas NAO sao o ocupante. PARTICAO: W498 removeu 394 faces e mudou -0.047; W501 removeu 252 (as luvas)
     e nao mudou nada => **o ocupante real sao os 142 faces restantes**, em z 0.65..0.95 ou x 0.15..0.18.
     (as luvas param em z 0.619; a faixa do W498 ia ate z 0.95 — o ocupante esta ACIMA das luvas)

**PROXIMO TESTE (decisivo e barato)**: del_mat M_Dark com del_z [0.65, 0.95] e del_x [0.14, 0.30].
  Se mudar t0.40, o ocupante esta acima de z0.65 (candidatos M_Dark nessa altura: headrest, vents/helm_intake,
  visor_band). Se NAO mudar, o ocupante esta em x 0.15..0.18 (frente das luvas/braco).
**LICAO DE METODO**: ao particionar uma prova por delecao, repetir SEMPRE a sub-faixa exata do que ja foi testado;
  uma faixa larga mistura 2 pecas e o resultado agregado nao identifica nenhuma das duas.


## Z2-A RESOLVIDO (particao) — o ocupante de t0.40 e M_Dark ACIMA de z0.65
  W502 del_mat M_Dark, del_x [0.14,0.30], **del_z [0.65,0.95]** => 209 faces, muda SO t0.40: 0.566 -> 0.519
  EMA 0.0381 -> 0.0359 (melhor ate agora, sem nenhuma alteracao de geometria — so diagnostico)
  => LUVAS (252 faces, z<=0.619) INOCENTES. O ocupante esta ACIMA de z0.65 em x 0.14..0.30.
  Candidatos descartados por x: headrest/vents/helm_intake/visor_band ficam atras (x negativo).
  Restante: estrutura escura do BRACO/ANTEBRACO estendido ao volante, acima de z0.65 (o comentario do codigo
  diz 'braco: ombro -> cotovelo -> mao NA MANOPLA do volante').
  RESIDUO: mesmo removendo tudo, sobra +0.046 de t0.40 (0.519 vs concept 0.473) => ha um SEGUNDO ocupante.

**PROXIMO**: ler `braco`/arm em pilot() para pegar os literais de z (>=0.65) e expor `arm_dz`; depois
  repetir del_mat restringindo ao que sobra (z<0.65 / x<0.14) para achar o 2o ocupante dos +0.046.
**FERRAMENTA**: a particao por sub-faixa (mesmo material, faixas disjuntas) identifica o ocupante em 2 builds
  em vez de inferir por bbox — foi o que faltou nos 3 primeiros testes do trecho A.


## *** CAUSA RAIZ DO TRECHO A: FACES SEM MATERIAL (none_slots=4) ***
  Codigo (fim do builder, pos-escala):
    for o in FINS:
        _b=[i for i,mm in enumerate(o.data.materials) if mm is None]
        for i in _b: o.data.materials[i]=MG.get('M_Dark')   # faces SEM material viram M_Dark
        _badn+=len(_b)
    R['none_slots']=_badn
  => o `M_Dark` de 209 faces acima de z0.65 (que forma o pico de t0.40) NAO e peca escura:
     sao FACES SEM MATERIAL silenciosamente pintadas de M_Dark.
  => none_slots=4 aparece em TODOS os builds (W405..W502) e nunca foi investigado.
  2 CONSEQUENCIAS: (1) silhueta — as faces entram no render e criam o pico falso de t0.40 (+0.093);
                   (2) MATERIAL — geometria visivel com material indefinido virando PRETO (explica o
                       COR_TV piorar quando a peca se move: 0.234 -> 0.247 no W489).

**PROXIMO (alto valor)**: identificar QUAL objeto/peca tem o slot None. Sondar no build: para cada FINS,
  listar slots None + o bbox dos faces que apontam para esse slot => nomear a peca culpada.
  Depois: (a) atribuir o material CORRETO em vez de M_Dark; (b) se a caixa existir no concept, manter; se nao, remover.
  ISSO CORRIGE SILHUETA E MATERIAL DE UMA VEZ — nao usar None como material default e um bug de disciplina
  de autor: toda face precisa de material explicito (regra da skill concept-driven-3d-modeling).


## DIAGNOSTICO none_slots (W503, patch 22) — HIPOTESE REFUTADA
  Somente o LAMP tem faces sem material: 54, em x[1.063,1.092] z[0.136,0.195] = FAROL (frente/baixo).
  NOSE/COWL/REAR tem slot orfa (1,1,4) com ZERO faces => inofensivas (sujeira, nao defeito visual).
  => o fallback None->M_Dark NAO explica os 209 faces M_Dark acima de z0.65 em x0.14-0.30.
  DEFEITO REAL mas de outro efeito: 54 faces de farol preto (impacto visual na frente, corrigir depois).

**DEDUCAO POR ELIMINACAO** (bbox das pecas vs faixa x0.14-0.30 / z0.65-0.95):
  NOSE x0.56-1.07 | LAMP x1.05-1.09 | GRILLE x0.86-1.11 | Tub x-0.68..0.135 (zmax 0.51) | REAR x-1.22..-0.30  => fora
  PL  x-0.57..0.649 z0.244..1.271 | CH x-0.844..1.01 z0.058..0.794                                => AMBAS cobrem
  No PL os M_Dark sao: gloves (z<=0.619), headrest (x<0), boots (z<=0.404) => todos FORA da faixa.
  => **O OCUPANTE E O CH** (estrutura escura do cockpit: dash/volante). Hipotese original confirmada
     por eliminacao, nao por palpite — e o patch do Cockpit_Cut falhou porque o cutter NAO e o M_Dark do CH.

**PROXIMO**: instrumentar o CH como fiz com o slot None — imprimir as faces M_Dark do CH com x>0.14 e z>0.65,
  junto com o bbox de cada sub-peca do cockpit; depois expor `ch_dark_dz` no ponto certo.
**TAREFA SEPARADA (vai para a lista)**: corrigir o farol — 54 faces com material indefinido virando M_Dark.
  Atribuir o material correto (M_White/M_Silver do farol) em vez de M_Dark.


## OCUPANTE DE t0.40 NOMEADO COM PRECISAO (patch 23, W505)
  MDARK por peca (bbox das faces M_Dark):
    LAMP nf=54 x[1.063,1.092] | GRILLE nf=130 x[0.996,1.087] | Tub nf=4200 x[-0.662,0.131] z<=0.190
    Tires nf=832/896 | REAR nf=4010 x[-1.200,-0.305] | PL nf=2298 x[-0.561,0.640] z<=1.234
    **CH nf=1192 x[-0.581,0.996] z[0.057,0.782] — e NA FAIXA t0.40: nf=259 x[0.093,0.249] z[0.617,0.782]**
  => 259 faces M_Dark do CH em x0.093-0.249 / z0.617-0.782 SAO o pico de t0.40. Nenhuma outra peca tem face ali.
  Bate com as delecoes medida (W498 394 faces -> -0.047; W501 252 luvas -> 0; W502 209 acima de z0.65 -> -0.047).
  O PL (2298 faces M_Dark) NAO tem face na faixa: gloves param em z0.619, headrest em x<0, boots em z<=0.404 —
  a eliminacao por bbox estava certa e a sonda confirmou o CH.

**PROXIMO**: no builder, localizar as sub-pecas do cockpit que geram M_Dark em z0.617-0.782 e x0.093-0.249
  (dash/volante/manopla) e expor `ch_dark_dz` para descer ~0.11 m — medindo o EMA do perfil (0.0381) e a coluna t0.40.
**LIÇÃO**: instrumentar o proprio dado (bbox por material por peca) levou 2 builds e nomeou com 259 faces exatas;
  inferir por bbox de PECA inteira custou 5 builds e 2 hipoteses erradas. Quando a pergunta e 'quem ocupa X',
  nao inferir de bbox agregado — medir a populacao de faces dentro da faixa.


## *** ACHADO CRITICO: A GRADE DE 21 PONTOS TEM ALIASING ***
  W506 (sw_dz=-0.110) deu 'ZERO mudanca' na grade de 21 pts. A grade FINA (121 pts, 2cm/amostra) mostra:
    t0.383 -0.016 | t0.417 -0.022 | t0.425 -0.053 | t0.433 -0.056  => O FIX DO VOLANTE FUNCIONOU.
  A grade de 21 pts nao tem coluna entre t0.40 e t0.45 (12cm por amostra) e o volante tem 23cm de diametro:
  a mudanca caiu EXATAMENTE no vao. => **os ultimos builds foram julgados por um instrumento com aliasing.**
  EMA 121 pts: w493 0.0427 -> w506 0.0426 (o valor absoluto e maior que o de 21 pts: 0.0427 vs 0.0381 —
  a grade grossa SUBAVALIA o erro, porque amostra so os pontos baixos do perfil).

**DEFEITO REAL REVELADO PELA GRADE FINA (nao pelo volante)**:
  t0.350 -> 0.575, t0.358 -> 0.423 : **DEGRAU de 0.15 num unico passo**, enquanto o concept vai 0.537 -> 0.535 (suave).
  => o modelo tem um CORTE ABRUPTO (fim do cowl / inicio da zona do piloto) onde o concept e continuo.
     Isso e um erro de FORMA estrutural — muito mais grave que o pico de t0.40 — e ficou invisivel na grade grossa.

**CORRECOES DE INSTRUMENTO (aplicar SEMPRE agora)**:
  1. medir o perfil em 121 pontos (2cm), nunca 21;
  2. reportar EMA fino + pior coluna + maior DEGRAU (|d(i)-d(i-1)|) — o degrau pega cortes abruptos que o EMA esconde;
  3. adotar sw_dz=-0.110 (ganho real em t0.417-0.433);
  4. ao declarar 'ZERO mudanca', verificar antes se a grade tem coluna na regiao afetada pelo bbox da peca movida.
     Regra: passo da grade << tamanho da peca movida. 12cm de passo vs 23cm de volante = subamostragem.


## W508 = BASE ATUAL (melhor nos 2 eixos)
  W493 + cowl_k 1.10 + sw_dz -0.110 + ch_cut_dx -0.110
  EMA fino(121) 0.0427 -> **0.0388** (-9%) | maior degrau 0.151 -> **0.085** (concept 0.132)
  ADOTADOS: cowl_k 1.10 | sw_dz -0.110 | ch_cut_dx -0.110 | (cowl_xf0 0.174 mantido)
  janela t0.35: concept 0.537 / w508 0.546 (+0.009) | t0.358: concept 0.535 / w508 0.519 (-0.016)

## DOIS TESTES DE EFEITO ZERO (ja com a grade fina, nao e aliasing):
  W509 sw_dz -0.160:  IDENTICO ao W508 => o volante ja saiu do caminho com -0.110.
  W510 ch_top_dz -0.110: IDENTICO ao W508 => o Cockpit_Cut NAO toca a silhueta (confirma o W500
       agora com o instrumento correto; a explicacao 'era aliasing' estava ERRADA nesse caso).
  => o topo de t0.392-0.400 (0.566 = 0.709m) e OUTRO M_Dark do CH (nem volante, nem cutter).
     Candidatos M_Dark do chassis(): tray (tr, tray_x -0.500 => fora da faixa), seat_base (st1, z0.348),
     seat (st2) — o CH zmax caiu para 0.7219 depois de baixar o volante, entao o seat e o novo topo do CH.

**PROXIMO (a ferramenta que ja acertou 2x)**: sonda patch 23 com faixa ESTREITA em t0.392-0.400
  (x 0.19..0.21, z >= 0.65) para listar a peca exata; depois del_mat nessa faixa para confirmar.
**ESTADO**: L/H 1.861 | z_range [-0.01,1.253] | x_range EXATO | EMA 0.0388 | degrau 0.085 | banda t0.54 limpa | QA ok


## SONDA PARAMETRIZADA (patch 23 aceita probe_x0/x1/z0) — MEDE O EFEITO DO FIX
  W505 (base antiga): CH nf=1192 z[0.057,0.782] | NA FAIXA(x0.14-0.30,z>=0.65): nf=259 x[0.093,0.249] z[0.617,0.782]
  W511 (base W508):   CH nf=1192 z[0.057,0.712] | NA FAIXA(x0.185-0.215,z>=0.65): nf=28 x[0.159,0.212] z[0.631,0.710]
  => **sw_dz=-0.110 removeu 231 das 259 faces da faixa** CONFIRMANDO o fix do volante por contagem de faces,
     nao por 'o perfil mudou'. Sobram 28 faces (x0.159-0.212, z0.631-0.710) = topo do aro do volante apos -0.110
     (0.655-0.110+0.115 = 0.660 + espessura => ate ~0.71). Essas 28 faces seguram o topo em 0.566.
  => explica o W509 ser IDENTICO: baixar mais o volante nao move o topo porque o topo de 0.566 nao e mais o volante
     — ou e a ultima faixa do aro, ou e outra peca exatamente nessa altura.

**METRICA NOVA ADOTADA (contagem, nao silhouette)**: apos cada fix, rodar a sonda e reportar
  'faces na faixa ANTES -> DEPOIS'. E diagnostico direto do mecanismo, imune a aliasing e a saturacao de silhueta.
**PROXIMO**: del_mat M_Dark com del_x [0.14,0.23] / del_z [0.60,0.75] para confirmar se as 28 faces (o aro) sao o
  ultimo ocupante de t0.392-0.400; se sim, a solucao e subir o eixo do volante (sw_z) ou reduzir sw_r,
  nao baixar mais (o volante ja esta abaixo do cowl em t0.35).


## W512 — CORRECAO DE DIRECAO: o M_Dark do volante e CARGA, nao excesso
  del_mat M_Dark x[0.14,0.23] z[0.60,0.75] => 120 faces. Perfil:
    t0.392 +0.000 | t0.400 +0.000 | t0.408 **-0.082** | t0.417 **-0.076** | EMA 0.0388 -> 0.0401 (PIOROU)
  => (1) o alvo de t0.392-0.400 (+0.10) NAO e M_Dark (nem nenhum material ja testado na faixa:
         M_Blue/M_Yellow/M_Gold/M_Silver/M_BlueDk todos refutados ali; candidatos restantes M_White/M_Pedal,
         ou M_Dark ACIMA de z0.75 — a faixa do W512 comecava em 0.60 e a do W498 ia ate 0.95);
     (2) em t0.408-0.417 o modelo esta ABAIXO do concept (0.568 vs 0.604/0.614) e as 120 faces do aro
         SUSTENTAM aquele trecho. Remover derruba para 0.486 = erro -0.12. **O aro e CARGA, nao excesso.**
  => ACAO CORRETA no volante ali: SUBIR (ou manter), nunca baixar mais. sw_dz=-0.110 ficou NEUTRO no perfil
     (W493 e W508 tem 0.568 em t0.408-0.417), mas um valor mais profundo seria PREJUDICIAL — o W509 (-0.160)
     ainda era identico porque 120 faces load-bearing permanecem.

**LICAO**: antes de mover uma peca, medir se o modelo esta ACIMA ou ABAIXO do concept NAQUELA coluna.
  Acima => a peca e excesso, baixar ajuda. Abaixo => a peca e carga, baixar piora. Eu assumi 'excesso' sem medir
  o sinal, e o W512 mostrou que a mesma peca era carga em t0.408-0.417 e irrelevante em t0.392-0.400.

**PROXIMO**: del_mat M_White e M_Pedal em x[0.16,0.23] z[0.55,0.80] para achar o ocupante de t0.392-0.400.


## t0.392-0.400 FECHADO: COLUNA SATURADA, nao peca errada
  Sonda acima de z0.75 em x0.16-0.24: SEM RESULTADO => nenhuma peca tem M_Dark ali (o mais alto e o CH a 0.712).
  Bateria COMPLETA de materiais naquela coluna (todos com resultado medido):
    M_Blue -> muda so t0.35 | M_Yellow 0 | M_Gold 0 | M_Silver 6 | M_BlueDk 0 | M_Pedal 0 | M_White inexistente no CH
    M_Dark -> muda so t0.408-0.417 (e CARGA: remover piora)
  => NENHUM material isolado muda t0.392-0.400. A coluna e SATURADA: varias pecas coincidem em z~0.709
     e remover uma deixa as outras no topo. Delecao por material NAO identifica ocupante em coluna saturada.

**REINTERPRETACAO DO RESIDUO**: o concept tambem tem penhasco, em t0.408 (0.473 -> 0.604). O modelo tem o seu
  em t0.392. Diferenca = 0.016 em t = **3,8 cm em x**. Os '+0.10' persistente e o modelo ainda estar alto no
  degrau de 3,8 cm de deslocamento — NAO uma peca errada. Ordem de grandeza muito menor que eu vinha tratando.

**LIMITE DO METODO (registrar)**: del_mat funciona quando UMA peca domina a coluna. Em coluna saturada
  (multiplas pecas na mesma altura) TODOS os testes dao zero e o metodo nao conclui. Detectar a saturacao:
  se nenhum material muda a coluna, medir o numero de pecas com face em [z-0.02, z] naquele x — se >2, esta saturada.

**PROXIMO**: encerrar o trecho A (residual de 3,8 cm no degrau, dentro de tolerancia razoavel) e ir para Z3 SIDEPOD
  e Z2-B ESCAPAMENTO — os dois que o vision reconfirmou hoje (sidepod fino e baixo; traseira mecanica alta).


## Z3 SIDEPOD — PRIMEIRO PASSO REAL (W515) e o bracket fica definido
  W508: pod z 0.105-0.528, y +-0.703 | W/H modelo 1.165 vs concept 1.238 (modelo 6% ESTREITO)
  W515 (pod_w 0.405->0.450, pod_zt 0.150->0.165, pod_zt2 0.275->0.345):
    PODS z 0.1066-0.6122 (+8,4cm) | y +-0.7474 (+4,4cm) | W/H 1.165->1.167 (largura total travada pelos PNEUS y_half 0.737)
    invariantes EXATOS, QA aprovado, 14 pecas
  VISION: **OVERSHOOT** — 'nao esta menor, esta MAIOR e mais volumoso que o concept... perdeu o perfil esguio'.
    concept SIDE = banana/cunha BAIXA (~metade do diametro da roda traseira, nao passa da linha do assento),
    frente em bico fino que desce; W515 = meia-esfera/bolha, corte vertical gordo. concept TOP = retangular
    alongada ~1/2 do pneu; W515 = quase circular e saltando para fora. concept tem REBAIXO AZUL CENTRAL
    (quebra o volume e faz parecer mais fino); W515 = amarelo liso.
  => BRACKET: W508 fino demais / W515 gordo demais. O alvo esta ENTRE os dois, com LINGUAGEM de cunha.
  RECEITA DO VISION p/ corrigir: manter parte da largura; ACHATAR o topo; ALONGAR para frente; AFINAR a frente
    em bico; APLAINAR as laterais; REINTRODUZIR o rebaixo azul central.
  ACAO PROXIMA: pod_zt2 ~0.28-0.30 (entre 0.275 e 0.345), alongar o range xf (0.330+0.405t -> comecar mais cedo),
    taper da frente (reduzir a altura nos primeiros 20% das secoes), e mexer no pod_split/cap p/ criar o rebaixo azul.
**LICAO**: a critica do Feco ('o modelo sempre igual') tinha razao — eu estava calibrando EMA de perfil com
  variacoes de 3cm em 2,35m (invisiveis). Mudanca estrutural visivel exige mexer em VOLUME (pod/traseira/piloto),
  nao em constantes de 3 casas decimais.


## W516 (cunha v1) — VISION: AINDA HEMISFERIO. Numeros medidos pelo vision:
  W516: pod_e 0.60 (secao superelipse n~3.3), pod_xf0 0.295/pod_xspan 0.440 (alongado), pod_taper_p 0.55,
        pod_zt2 0.290 | PODS z 0.1056-0.5534 | x -0.5286..0.462 | y +-0.7482 | verts 13986
  VISION: 'NAO esta mais proximo — ELE E um hemisferio liso... nao ha nenhuma parte plana'.
  **pod_e=0.60 NAO achatou o topo na leitura visual** => a hipotese do expoente da secao NAO se confirmou.
     Medir a secao DIRETAMENTE (varrer o contorno YZ do pod) em vez de confiar no parametro.
  NUMEROS (do vision, convertidos em erro):
    altura do pod: concept topo ~0.31 (medido: SIDEPOD z 0.08-0.31) vs modelo 0.5534 => **+78% ALTO**
    largura do pod: concept ~0.36m vs modelo 0.573m (0.7482-0.175)          => **+60% LARGO**
    comprimento: concept 40-45%% do kart (0.94-1.06m) vs modelo 0.99m        => OK
    proporcao TOP: concept 2.5-3:1 vs modelo 1:1-1.2:1                      => quase circular

### DESCOBERTA QUE MUDA O ALVO: a largura que falta esta nas RODAS, nao no pod
  concept W/H 1.238 => meia-largura 0.787 | modelo 0.737 (travado pelos PNEUS y_half 0.737)
  => bitola/rodas ~5cm estreitas; o pod esta 21cm LARGO demais. Eu ia 'resolver' alargando o pod = oposto.
  ACAO: AFINAR pod (pod_w 0.450->~0.25, pod_zt 0.160->0.10, pod_zt2 0.290->0.10 => topo ~0.305) E ALARGAR BITOLA.

## CONSULTA AO SOL (gpt-5.6-sol, reasoning medium) — EM ANDAMENTO
  motivo: diagnostico ambiguo, 2 rejeicoes do usuario, multiplas hipoteses, preso em micro-ajustes.
  brief em /tmp/sol-brief-bb.md | wrapper /home/jarvis/.hermes/scripts/deep-analysis-sol.sh | proc_7b01843255dc
  perguntas: (1) otimizar contorno com builder procedural e abordagem errada? alternativa concreta?
             (2) sequencia de maior alavancagem, ordenada por ganho visual/esforco
             (3) metrica que NAO seja cega ao que o olho ve (curvatura, massa por faixa, cor por zona...)
             (4) onde o procedural deve parar e o manual comecar (checklist)
             (5) os 5 defeitos que mais contribuem para 'nao e AAA', em ordem de correcao


## *** W518 = NOVA BASE — primeiros alvos globais BATIDOS e vision CONFIRMA a cunha ***
  parametros: pod_w 0.250 | pod_zt 0.100 | pod_zt2 0.105 | pod_xf0 0.295 | pod_xspan 0.440
              pod_taper_p 0.55 | pod_e 0.60 | cover_zb 0.170 | cover_zt 0.090 | ty_f 0.670 | ty_r 0.667
  RESULTADO: L/H 1.861 (concept 1.868) | **W/H 1.240 (concept 1.238)** | y_half 0.783
             PODS z 0.1053-3189 (concept medido ~0.31) | y +-0.549 | x -0.5286..0.462 (42%% do kart)
             pneus y +-0.794 | x_range EXATO | z_range [-0.01,1.253] | 14 pecas | QA aprovado
  VISION: 'BAIXO e COMPRIDO como o concept, SIM lembra uma cunha alongada... perdeu totalmente o aspecto
          anterior alto, curto e barrigudo. O objetivo foi cumprido.'
  **CHAVE DO SUCESSO**: o side_cover tinha zb=0.240 e zt=0.300+cover_zt(0.230) HARDCODED => topo 0.530 FIXO,
    dominava o bbox do PODS. Enquanto ele nao foi parametrizado (patch 27: cover_zb), baixar pod_zt/pod_zt2 nao
    surtia efeito no bbox. LICAO: ao baixar uma peca, checar TODAS as sub-pecas do grupo (Pod/cap/cover).

  GAPS REMANESCENTES (palavras do vision):
   1) SIDE terco traseiro: concept tem LOMBADA arredondada com inserto azul sobre o amarelo; modelo esta reto/fino
   2) SIDE: concept tem contornos sup/tras arredondados e cheios; modelo tem aresta superior viva e canto traseiro cortado
   3) SIDE: transicao bico->sidepod do concept e continua e gorda; no modelo ha estreitamento maior e um vao antes da roda
   4) TOP: concept tem pods simetricos bojudos p/ fora com borda amarela em U espessa e miolo azul largo; modelo = prancha
   5) FRONT BUMPER: concept e carenado azul/amarelo integrado; modelo e TUBO PRATA aparente em U => muda a leitura da largura
   6) TOP: tanque/carenagem central do concept e mais largo/arredondado; modelo mais estreito e pontiagudo


## *** PARECER DO SOL RECUPERADO E VERIFICADO (job 932d7364, completed, exit 0, 15942 bytes) ***
  MODEL=gpt-5.6-sol-900k | PROVIDER=openai-codex | REASONING=medium
  NOTA: meus 2 lancamentos (ea78583f, f7293bac) morreram com .out VAZIO. O parecer valido e de outro job (932d7364).
  Arquivado em modeling/SOL-STRATEGY-2026-09-20.md

  VEREDITO CENTRAL: 'Procedural nao e o problema; usa-lo como AUTOR DA IDENTIDADE e.'
    MANTER procedural: datums, eixos, escala 2.35m, cameras/luzes/passes, montagem dos 14 objetos,
      materiais/nomes/colecoes/export, auditoria bbox/simetria/manifold, pecas repetitivas (rodas, fixadores, tubos).
    PARAR de gerar proceduralmente: sidepods, nose/cowl+transicao, cockpit/banheira, capacete/rosto/torso/pose,
      carenagem traseira+transicoes. Motivo: loft/dome/box/sweep enchem volume mas NAO decidem onde a superficie
      deve comprimir, criar ombro, quebrar curvatura, afundar ou fundir.
    ALTERNATIVA: pipeline hibrido com assets autorais por zona (authored/*.blend + contracts/zone-landmarks.json
      + semantic-materials.json). Metodo: cage manual baixa -> SubD com loops nas quebras de curvatura -> sculpt ->
      retopo -> RECESSOS REAIS (nao pintura fingindo profundidade) -> .blend versionado -> builder importa e so
      aplica transformacoes contratuais.
    REPRODUTIBILIDADE: nao exige regenerar cada vertice por formula. .blend versionado + transforms aplicados +
      nomes estaveis + script deterministico de montagem e perfeitamente reproduzivel.
    CRITERIO DE ACEITE da mudanca: rebuild limpo importa os 4 assets sem intervencao; L=2.35 e x=[-1.20,1.15];
      cada asset com versao+hash no manifesto; trocar renderer/reconstruir cena nao muda geometria; NENHUMA forma
      identitaria depende de novo de pod_e/cowl_k ou dezenas de constantes correlacionadas.

  SEQUENCIA (por alavancagem): 1) arquitetura de massas e ESPACOS NEGATIVOS (cockpit escavado, piloto como massa
    vertical dominante, degrau de perfil >=85%% da amplitude do concept 0.132 vs W516 0.085, pelvis DENTRO da banheira,
    maos alcancando o volante); 2) sidepods autorais de DUAS CAMADAS (corpo amarelo + rebaixo azul escavado como dois
    niveis, area semantica amarelo/azul <=5pp por vista); 3) nose+bumper como UM gesto (bumper AZUL integrado, remover
    leitura de barra prata — 'o modelo parece outro kart porque o primeiro landmark e semanticamente errado');
    4) piloto+capacete+rosto como CONJUNTO (torso ereto +-5 graus, olhos+sorriso legiveis a 256px); 5) traseira
    (plastico azul fechado, 3 bocas com central dominante, remover chassis tubular e molas douradas e listras) e SO
    DEPOIS o passe AAA (bevels por escala, espessuras, seams, roughness, cavidades, normais limpas).

  METRICA (resposta a 'como medir o que o olho ve'): NAO trocar a EMA por outro numero unico — 'otimizar uma media
    unica so cria um Goodhart mais sofisticado'. Usar VETOR de metricas com PISOS por zona:
      A. Erro de LANDMARKS: pontos (ponta do bico, centros de roda, extremos dos pods, abertura do cockpit, centro/topo
         do capacete, volante, centros dos 3 escapes), normalizado pela extensao da propria vista;
         E_landmark = mediana(dist/extensao). GATE: mediana <= 2.5%% e nenhum P0 > 5%%. Reportar tambem o pior landmark.


## LANDMARKS v2 — SEMANTICA VALIDADA + O MAIOR ERRO DA SESSAO ENCONTRADO
  Pitfall de semantica: os indices 'bico'/'rabeira' do landmarks.py mediam coisas diferentes; corrigido
  medindo TOPO e BASE nas DUAS extremidades (banda de 5% das colunas) e verificando a ORIENTACAO:
    concept side.jpg = kart virado p/ ESQUERDA (frente=coluna 0, traseira=coluna W-1) — confirmado por
    L_base_z 0.0859 (roda dianteira toca o chao) vs R_base_z 0.5833 (traseira NAO desce).
  RESULTADO (contracts/zone-extremes.json):
    L_topo_z   0.2247 -> 0.2762  dif 0.0514  P0  (frente do modelo um pouco alta)
    R_topo_z   0.6970 -> 0.5434  dif 0.1535  P0  (topo da traseira mais baixo)
    **R_base_z 0.5833 -> 0.0690  dif 0.5143  P0 — O MAIOR ERRO DE TODA A SESSAO**
    degrau_x   0.7202 -> 0.5132  dif 0.2071  P0  (degrau/cockpit ~20%% do comprimento ADIANTADO)
    degrau_amp 0.3131 -> 0.2428  dif 0.0704  P0  (degrau 22%% mais suave)
    topo_global_x 0.0122 OK | topo_global_z 0.0003 OK | L_base_z 0.0435 OK
  DIAGNOSTICO: no concept o elemento MAIS RECUADO e a ASA ALTA FLUTUANDO (base 0.58 do H);
    no modelo o mais recuado e um elemento BAIXO quase no chao (base 0.069).
  => HIERARQUIA TRASEIRA INVERTIDA. E exatamente a 'traseira sem arquitetura coerente' que o vision
     apontou e o item 5 da lista do Sol. Vale MAIS que o bico_z (0.2581) que eu ia atacar;
     o R_base_z (0.5143) e o dobro do erro e reordena a fila.
  FILA REORDENADA POR TAMANHO DE ERRO: 1) R_base_z 0.5143 (traseira) 2) bico_z/frente 0.2581
    3) degrau_x 0.2071 4) R_topo_z 0.1535 5) pod_area_frac 0.0993 6) degrau_amp 0.0704


## W520 = CANDIDATO COM TRASEIRA MELHOR (ganho medido, sem regressao)
  mudanca: wing_x1 XRE-0.015 (-0.679) -> -1.11 ; exh_x -1.19 -> -1.12 (EXTREMIDADE TRANSFERIDA, nao removida)
  invariantes RESTAURADOS: x_range [-1.2,1.15] EXATO | len_before 2.3852 | scale 0.98523 | L/H 1.862 | W/H 1.24
  RESULTADO nos landmarks:
    R_topo_z 0.5434 -> 0.6258 (concept 0.6970) => erro 0.1535 -> **0.0711**  (-54%)
    R_base_z 0.0690 -> 0.2383 (concept 0.5833) => erro 0.5143 -> **0.3450**  (-33%)
    todos os demais INALTERADOS (L_base, L_topo, degrau_amp, degrau_x, topo_global_x/z)
    E_mediana 0.0609 -> 0.0609 (IDENTICA) — so o 'pior landmark' capturou o ganho. Confirma a prescricao do Sol.
  ARMADILHA (2a vez na sessao): encurtar o escape muda len_before 2.3843->2.3262 e reescala TUDO
    (scale 0.98563->1.01022, x_range [-1.171,1.179], L/H 1.816) => W519 INVALIDO.
    REGRA: o escape define o comprimento; para recuar a asa, TRANSFERIR a extremidade (asa assume -1.11),
    nunca remover.
  RESTA: R_base_z 0.3450 — o modelo ainda tem algo a ~0.298m nas colunas mais recuadas.
    Candidatos descartados por leitura do codigo: endplate (ep_s z0.095 => desce so a 0.593m) e
    Wing_Pylon (desce a 0.504m). rear bumper (rz0 0.078) esta em x -1.118 = FORA da ultima banda 5%.
    => PROXIMO: sonda patch 23 com del_x [-1.20,-1.08] para nomear o elemento. Sem especular.


## W522 ADOTADO = NOVA BASE (traseira fechada)
  wing_z 0.570 -> 0.660 | invariantes EXATOS (x_range, len_before 2.3852, scale 0.98523, L/H 1.862, W/H 1.24)
  R_topo_z erro 0.0711 -> **0.0001** (praticamente exato) | R_base_z 0.0956 -> **0.0243** (dentro do gate 0.05)
  CADEIA DO MAIOR ERRO: R_topo 0.1535->0.0711->0.0001 (-99.9%%) | R_base 0.5143->0.3450->0.0956->0.0243 (-95%%)
  **E_mediana 0.0609 -> 0.0339 — PRIMEIRA vez na sessao que a MEDIANA se move** (antes so o pior-landmark via)
  soma dos erros 0.5468 -> 0.4045
  FILA ATUAL: degrau_x 0.2071 > pod_area_frac 0.0993 > degrau_amp 0.0704 > L_topo_z 0.0514
             PASSA: R_base 0.0243, R_topo 0.0001, topo_global_x 0.0074, topo_global_z 0.0003, L_base 0.0435

## W523 — CUTTER REFUTADO como alavanca do degrau (resultado negativo limpo)
  ch_cut_dx -0.110 -> -0.350 (24cm): degrau_x 0.5132 -> 0.5132 (deslocamento 0.0000) e degrau_amp inalterado.
  => o Cockpit_Cut NAO cria o degrau do perfil; o degrau vem de OUTRA peca. Nao insistir no cutter.
  METODO: teste de alavanca barato = mudar o parametro da peca SUSPEITA em amplitude GRANDE (24cm) e ver se a
    metrica se move; se nao se move, refuta em 1 build sem precisar de sondas de delecao.
  PROXIMO: identificar a peca do degrau (em 0.5132 do comprimento a partir da frente). Candidatos: capacete
    (borda frontal do pico), borda traseira do cowl, airbox, encosto. Usar o teste de alavanca grande em cada um.


## *** ALAVANCA DO DEGRAU ENCONTRADA: O CAPACETE — e o problema estrutural nomeado ***
  Sequencia de testes de alavanca (amplitude grande, 24-25cm, 1 build cada):
    Cockpit_Cut (ch_cut_dx -0.350): movimento 0.0000 => REFUTADO
    Assento      (seat_dx +0.25):   movimento 0.0000 => REFUTADO
    Capacete     (helm_x -0.548):   movimento 0.3194 => **CONFIRMADO**
  Efeito de helm_x -0.298 -> -0.548:
    degrau_x   0.5132 -> 0.8325 (concept 0.7202) | erro 0.2071 -> 0.1123 (-46%%)
    degrau_amp 0.2428 -> 0.2762 (concept 0.3131) | erro 0.0704 -> **0.0370** (DENTRO do gate 0.05, -47%%)
    topo_global_x 0.6077 -> 0.7177 (concept 0.6198) | erro 0.0074 -> 0.0979 (PIOROU)

### PROBLEMA ESTRUTURAL REAL (medido, nao suposto):
    CONCEPT: pico do capacete 0.6198 -> degrau 0.7202  => o degrau esta DEPOIS do pico
    MODELO : pico do capacete 0.6077 -> degrau 0.5132  => o degrau esta ANTES do pico
  No concept o degrau e a DESCIDA DA NUCA do capacete para a tampa traseira.
  No modelo o degrau e a SUBIDA DA CARENAGEM para a frente do capacete.
  => ARQUITETURAS DIFERENTES. Nenhuma constante resolve: o piloto tem de sentar mais para tras e a
     carenagem subir suave ate a frente do capacete, deixando UM UNICO degrau (a nuca).
     E o item 1 do Sol (piloto como massa vertical dominante / espacos negativos) e a hierarquia do vision.
  TRADE-OFF medido: mexer helm_x conserta degrau_x+degrau_amp e quebra topo_global_x (o pico tambem e
     do capacete). Interpolacao linear: helm_x ~ -0.460 daria degrau_x ~0.72 (exato) mas topo_global_x ~0.679
     => erro 0.059 no pico. NAO adotar esse caminho: mover o PICO e errado; o certo e mudar a arquitetura
     (carenagem subindo ate o capacete) para que o degrau nasça da nuca sem deslocar o pico.

**METODO CONSOLIDADO (usar sempre)**: teste de alavanca = mover o parametro da peca SUSPEITA em amplitude
  GRANDE (>=10x o passo da grade de medicao) e ver se a metrica se move. Refuta em 1 build sem sondas de
  delecao. Custo: 1 build por candidato. Ordem: geometria mais proxima do x do landmark primeiro.


## W526/W527 — EXTENSAO DO COWL: hipotese REFUTADA (mas com 2 achados)
  W526 INVALIDO: o patch 31 caiu no fallback e atingiu o NOSE (0.3055..1.0814, z 0.6383) com o COWL intacto.
    LICAO: replace de substring curta ('0.235*(i/(NS-1.0))') casa a PRIMEIRA ocorrencia = peca errada.
    SEMPRE ancorar o patch no parametro ja parametrizado da peca alvo e VERIFICAR pelo bbox da peca no resultado.
  W527 CORRIGIDO: COWL foi de x 0.206 -> -0.0517 e z 0.70 -> 0.9386 (encontra o capacete em -0.063).
    RESULTADO: **TODOS os landmarks com movimento 0.0000** — a massa nova do cowl fica DENTRO do contorno
    (o pico do capacete em z 1.27 domina o perfil superior). "Estender o cowl" NAO cria o degrau da nuca.
    VALOR: (a) refuta a hipotese em 1 build; (b) prova que o medidor e DETERMINISTICO (malha mudou, numeros iguais).

### ACHADO ESTRUTURAL CONSOLIDADO (o mais importante da sessao para o degrau):
    topo_global_x (pico do capacete): concept 0.6198 | modelo 0.6124  => erro 0.0074  ** JA ESTA CERTO **
    degrau_x (maior gradiente do topo): concept 0.7202 | modelo 0.5132  => erro 0.2071  ** ERRADO **
  Como o pico esta no lugar certo e o maior gradiente esta 0.2071 (0.49m) adiante, o unico caminho e o FORMATO
  do capacete: no concept o pico fica a 0.10 do bordo TRASEIRO (nuca longa, frente recolhida); no modelo o maior
  gradiente e a SUBIDA da FRENTE do capacete. Ou seja: frente do capacete precisa recuar ~0.49m SEM mover o pico.
  => helm_x sozinho NAO serve (move o pico junto). Precisa de um parametro de FORMA: achatar/recuar a frente do
     capacete (helm_front_scale / helm_x_front) mantendo o centro do pico. E o proximo alvo.


## W528 — helm_sz REFUTADO como escala X pura (3a refutacao do capacete)
  helm_sz 0.934 -> 0.450: PL z max 1.2708 -> 1.1564 (o PICO baixou) e L/H 1.862 -> 2.044, z_range 1.139.
  CAUSA lida no codigo: em dome(name,cx,cy,cz,R,sz,sy) o perfil e [(raio_em_Y, -R*cos(t)*sz)] e revolve() usa o
    2o elemento como OFFSET EM X => sz escala o comprimento do dome E define a altura. PARAMETROS ACOPLADOS.
  => NAO existe parametro de recuo da frente do capacete independente do pico.

### CAPACETE: CAMINHO PROCEDURAL ESGOTADO (3 refutacoes medidas)
  helm_x   (move o capacete)      -> conserta degrau_x (-46%%) mas move o PICO (topo_global_x 0.0074->0.0979) REFUTADO
  helm_sz  (escala X do dome)     -> baixa o pico em 0.11m e quebra L/H (2.044)                                REFUTADO
  cowl_xspan (estende o cowl)     -> massa nova fica DENTRO do contorno, 0.0000 de movimento                   REFUTADO
  => o recuo da frente do capacete NAO e alcancavel por parametro: exige MODIFICACAO AUTORAL da malha do capacete
     (mover os vertices da FRENTE para tras mantendo fixo o vertice do pico) DENTRO do pipeline canonico.
     E exatamente o item 1 do Sol (piloto/capacete como massa AUTORAL, nao escalada por parametro).
  PROXIMO: patch que, apos a construcao do capacete, roda bmesh nos verts com x > hx (frente) e os desloca para
     tras proporcionalmente a distancia do pico (deformacao com peso 0 no pico e 1 na frente), preservando o pico.


## W529 — RECUO AUTORAL DO CAPACETE: patch aplicou (2984 verts) mas SILHUETA 0.0000
  P33 helm_front=1.00 verts_movidos=2984 w_max=1.000 (peso 0 no pico, 1 na frente) — o pico nao se moveu.
  TODOS os 7 landmarks: movimento 0.0000 (soma 0.4042 -> 0.4042). PL bbox e verts identicos.
  => **O CONTORNO naquela regiao NAO E A CASCA DO CAPACETE.** Deformar 2984 verts dela nao moveu 1 pixel.
     Mesma armadilha do cowl (W527): a peca que domina a silhueta e OUTRA. Candidatos restantes no conjunto PL:
     face/cabeca interna (M_Face/M_Eye), gasket (M_Gasket), visor (M_Visor), queixeira (chin_guard), helm_base.

### TABELA DE REFUTACOES DO DEGRAU (todas medidas, 1 build cada)
  Cockpit_Cut   ch_cut_dx -0.350 -> 0.0000   REFUTADO
  Assento       seat_dx  +0.25   -> 0.0000   REFUTADO
  Cowl          cowl_xspan 0.35  -> 0.0000   REFUTADO (massa dentro do contorno)
  Casca capacete helm_front 1.0  -> 0.0000   REFUTADO (2984 verts, silhueta identica)
  Capacete todo helm_x  -0.25   -> 0.3194   CONFIRMADO (mas move o pico)
  helm_sz       escala X dome    -> baixa o pico, quebra L/H   REFUTADO
  METODO: quando 4+ pecas vizinhas dao 0.0000, o dono NAO e nenhuma delas individualmente; usar o teste de
    alavanca no CONJUNTO (helm_x, que moveu 0.3194) e depois identificar a sub-peca por MATERIAL dentro do
    conjunto (del_mat por M_Gasket/M_Visor/M_Face/M_Eye numa banda x) — nao por geometria individual.
  PROXIMO: sonda del_mat com del_x na banda do degrau (x -0.22..0.02) para M_Face/M_Eye/M_Gasket/M_Visor.


## W530/W531 — SONDA POR MATERIAL NO CONJUNTO DO PILOTO
  W530 INCONCLUSIVO (nao refutacao!): o probe exige _dm and _dz and _dx e eu passei so del_mat+del_x, entao o
    bloco foi PULADO (log: del_mat None del_n None). Silhueta identica era consequencia disso, nao evidencia.
    LICAO: antes de registrar resultado negativo, conferir no LOG que a sonda realmente EXECUTOU (del_n>0).
  W531 PROBE OK: del_mat M_Face + del_x[-0.22,0.02] + del_z[0.50,1.35] => del_n=15572 faces removidas.
    degrau_x 0.5132 -> 0.5144 (movimento 0.0012) => **M_Face REFUTADO**
    degrau_amp 0.2428 -> 0.2517 (erro 0.0704 -> 0.0615): ganho real mas PEQUENO (a face contribui um pouco).
    topo_global_x e L_topo_z inalterados.

### *** 7 REFUTACOES E O DEGRAU NAO SE MOVE: HORA DE QUESTIONAR A METRICA ***
  Cockpit_Cut 0.0000 | Assento 0.0000 | Cowl 0.0000 | casca capacete 0.0000 | helm_sz (quebra L/H) |
  M_Face 0.0012 | e helm_x confirmado (0.3194) mas movendo o pico.
  REGRA: depois de ~6 refutacoes de pecas diferentes sobre o MESMO numero, a hipotese mais provavel deixa de ser
    'nao achei a peca' e passa a ser 'esse numero nao mede o que eu penso que mede'. Validar a METRICA antes de
    mais sondas de peca.
  PROXIMO: despejar a curva do perfil superior (t[i] por coluna) e o gradiente coluna-a-coluna em torno de
    0.5132 do comprimento e verificar se o 'degrau' e uma aresta de bbox, uma falha de 1-2 colunas da mascara,
    ou o topo do pneu dianteiro — e nao uma peca do conjunto do piloto.


## *** degrau_x INVALIDADO: A METRICA NUNCA MEDIU GEOMETRIA ***
  Curva crua do perfil superior (despejo coluna-a-coluna) revelou:
    CONCEPT: max|grad| = 0.0 px na coluna 0; t=542px (z/H=0.9982) CONSTANTE nas primeiras 10+ colunas
      => a mascara do concept esta CONTAMINADA por moldura/borda (topo chapado em 0.9982).
      => o 'degrau' em 0.7202 e apenas ONDE A CONTAMINACAO TERMINA, nao uma feicao do kart.
    MODELO: coluna 429->430 salta dz=109px (z/H 0.5880 -> 0.8307) = descontinuidade de UMA coluna (2.8mm de x).
      => artefato de mascara/antialiasing, nao geometria (nenhuma peca sobe 109px em 2.8mm).
  CONCLUSAO: degrau_x (0.2071) e degrau_amp NAO SAO MEDIDAS VALIDAS. Explica as 7 refutacoes: eu tentava mover RUIM.
  REGRA NOVA (obrigatoria antes de qualquer metrica de perfil/gradiente):
    1) SANIDADE DA MASCARA: t[i] constante em mais de 5%% das colunas consecutivas => mascara contaminada
       (moldura/borda/fundo) => rejeitar a extracao.
    2) SUAVIZAR ANTES DE DERIVAR: nunca tirar gradiente do perfil cru; usar mediana movel de 3-5 colunas.
    3) PASSO MINIMO PLAUSIVEL: descartar gradiente acima do salto geometrico possivel por coluna
       (mais de 10%% da altura numa coluna = artefato, nao feicao).
  IMPACTO NA FILA: remover degrau_x e degrau_amp dos landmarks validos. Fila real:
    pod_area_frac 0.0993 > L_topo_z 0.0514 > L_base_z 0.0435 > R_base_z 0.0243 > topo_global_x 0.0074
    PASSAM: R_topo_z 0.0001, topo_global_z 0.0003
  PROXIMO: revalidar a extracao da mascara do concept (remover moldura/borda de verdade) e re-medir a fila.


## *** degrau_x CORRIGIDO: O ERRO ERA 99% MEDICAO. O MODELO ESTAVA CERTO. ***
  Extracao limpa do concept (a anterior estava contaminada):
    1) flood fill no mask RAW a partir do centro (mantem as RODAS conectadas) -> 108819 px, W/H=1.978
    2) por coluna, pegar o pixel mais alto cujo RUN vertical >= 8 px (mata linhas de cota/reua sem perder rodas)
    3) mediana movel de 5 colunas antes de tirar o gradiente
  RESULTADO: concept 0.5107 | modelo 0.5132 | **erro 0.0024** (a mascara antiga dava 0.7202 -> erro 0.2071)
  => 98.8% do erro era ARTEFATO. O degrau do modelo esta NA POSICAO CERTA. Os 8 builds e as 7 refutacoes
     perseguiam ruido de mascara (contaminacao por linha de cota + salto de 1 coluna).
  ARMADILHA (registrar): erodir ANTES do flood remove as RODAS (baixa saturacao escura) -> bbox cai para W/H 2.87
    e todas as normalizacoes z/H saem erradas. ORDEM CORRETA: flood no RAW, run vertical como filtro.
  REFINAMENTO DA REGRA: o teto de 25% da altura por coluna e ESTRITO DEMAIS — o concept tem gradiente real de
    32.4% numa coluna (borda quase vertical do cockpit). Usar 40% como teto e marcar artefato so quando houver
    1-2 colunas isoladas sem feicao correspondente no concept.
  IMPACTO: degrau_x SAI da fila (erro real 0.0024). Nova fila:
    pod_area_frac 0.0993 > L_topo_z 0.0514 > L_base_z 0.0435 > R_base_z 0.0243 > topo_global_x 0.0074
    PASSAM: degrau_x 0.0024, R_topo_z 0.0001, topo_global_z 0.0003
  PROXIMO: re-medir pod_area_frac (0.0993) com a mascara limpa — pode herdar a mesma contaminacao.


## *** pod_area_frac TAMBEM ERA ARTEFATO: erro real 0.0170 (era 0.0993) ***
  Com a mascara limpa (flood raw + run vertical + mediana 5):
    concept 19677/108819 = 18.08%% amarelo | modelo 29873/182384 = 16.38%% | erro 0.0170  (PASSA o gate 0.05)
  => 83%% do erro era medicao. SEGUNDO maior item da fila invalidado no mesmo dia que o primeiro.

### PADRAO DOMINANTE DA SESSAO (a licao central)
  Praticamente TODO erro grande da minha fila era ARTEFATO DE MEDICAO, nao divergencia de forma:
    degrau_x        0.2071 -> 0.0024  (98.8%% artefato)
    pod_area_frac   0.0993 -> 0.0170  (83%% artefato)
    R_base_z        0.5143 -> 0.0243  (95%% artefato, corrigido por mudanca real de geometria ja feita)
    degrau_amp      0.0704 -> revalidar (mascarado pelo mesmo salto de 1 coluna)
  CONSEQUENCIA: o modelo pode estar MUITO mais proximo do concept do que minhas metricas diziam desde o inicio.
    As 7 refutacoes de peca do turno anterior nao foram trabalho perdido em vao: provaram que a metrica era cega.
  REGRA CONSOLIDADA: antes de qualquer ciclo de otimizacao, VALIDAR A METROLOGIA (saneza da mascara, suavizacao,
    plausibilidade fisica do gradiente). Metricas nao validadas geram ciclos inteiros perseguindo ruido.
  PROXIMO: rodar o scorecard COMPLETO de todos os landmarks com o metodo limpo e emitir a fila real de uma vez —
    e so entao voltar a tocar geometria. Screcard = o instrumento que o auditor precisa.


## *** SCORECARD LIMPO (builder/scorecard.py) — 7 de 9 PASSAM ***
  Instrumento reutilizavel criado: builder/scorecard.py <variante>. Emite tabela + contracts/scorecard-<v>.json
  Metodo embutido: flood no raw + run vertical >=8px + mediana movel 5 (a metrologia validada hoje).
  RESULTADO W522: concept W=793 H=401 | modelo W=836 H=449
    L_base_z      0.0773 vs 0.0423  erro 0.0350  OK
    L_topo_z      0.7581 vs 0.7216  erro 0.0365  OK
    R_base_z      0.5736 vs 0.5590  erro 0.0145  OK
    R_topo_z      0.2943 vs 0.3007  erro 0.0064  OK
    degrau_x      0.5107 vs 0.5132  erro 0.0024  OK
    pod_area_frac 0.1808 vs 0.1638  erro 0.0170  OK
    degrau_amp    0.3242 vs 0.2428  erro 0.0814  FALHA P0
    topo_global_z 0.8479 vs 0.7728  erro 0.0751  FALHA P0
    topo_global_x 0.1576 vs 0.0000  erro 0.1576  FALHA (bug de definicao: argmax devolve a 1a coluna
                                                          de um topo plano; usado centroid das colunas a <=2%% do max)
    mediana 0.0350 (gate 0.025) FALHA | pior 0.1576 (gate 0.05) FALHA | soma 0.4260

  ACHADOS REAIS (o que sobra depois de limpar a metrologia):
   1) topo_global_z 0.0751 = O PICO DO CAPACETE ESTA BAIXO em relacao ao total. Real e geometrico. O valor antigo
      (0.9975 vs 0.9978, 'quase exato') era a MOLDURA da mascara contaminada. Correcao: subir o capacete via
      helm_z (parametro PURO, ao contrario de helm_sz que acopla altura — ver W528).
   2) degrau_amp 0.0814 = o degrau do modelo e MAIS SUAVE que o do concept (0.2428 vs 0.3242). Agora que degrau_x
      passou (0.0024), o que falta e a INTENSIDADE do degrau no mesmo lugar — mexer no angulo/quebra da carcaca.
   3) As quatro extremidades (L/R topo/base) TODAS passam: a silhueta global esta correta.
  IMPACTO: a fila real e CURTA e especifica: topo_global_z (capacete baixo) > degrau_amp (degrau suave).
  PROXIMO: corrigir a definicao de topo_global_x (centroid do topo) e atacar topo_global_z via helm_z.


## *** SCORECARD NOVO TEM BUG: topo_global_z/x nao confiaveis (EU CRIEI O 3o FALSO ERRO) ***
  Medicao DIRETA do modelo w522 (ground truth):
    max(t) = 448.0 px de H=449  =>  topo_global_z = 0.9978   argmax = coluna 512
  O scorecard imprimiu: topo_global_z 0.7728 | topo_global_x 0.0000 (coluna 0)
  => o 'erro 0.0751 no pico do capacete' e FALSO. 3o falso erro do dia, e este eu introduzi no instrumento
     que escrevi minutos antes para acabar com falsos erros.
  CONSEQUENCIA IMEDIATA: NENHUMA linha do scorecard e confiavel ate o bug ser corrigido — inclusive as
    '7 aprovacoes'. Suspeita principal: divergencia entre a assinatura landmarks(mask,t,H,W) e como t/H/W sao
    derivados para concept vs modelo (o concept deu 0.8479 e o modelo 0.7728, ambos muito abaixo do esperado).
  REGRA (a mesma de hoje, aplicada a instrumento): validar o INSTRUMENTO antes de confiar no OUTPUT — inclusive
    quando o instrumento e novinho e escrito por mim. Teste minimo: o topo da silhueta TEM de dar ~1.0; se nao der,
    o medidor esta errado, nao o modelo.
  ESTADO SEGURO (medido direto, nao pelo scorecard):
    modelo w522: topo_global_z 0.9978 (pico no topo), bbox y205..653 x20..855, W/H do bbox 1.862
    concept: pendente de re-medicao direta com a mesma rotina para comparar de verdade.
  PROXIMO: consertar scorecard.py (unificar a derivacao de t/H/W e adicionar auto-teste 'topo deve dar ~1.0')
    ANTES de qualquer nova conclusao de fila.


## *** SCORECARD CORRIGIDO E VALIDADO: 8/9 PASSAM, MEDIANA PASSA ***
  BUG (1 linha): em top_rob eu escrevi t[i]=r1-(r0+(n-1-j)), que da 0 no pixel MAIS ALTO => PERFIL INVERTIDO.
    Correcao: t[i]=(n-1)-j  (altura acima da base do crop). Foi o que invalidou TODAS as linhas do scorecard.
  AUTO-TESTE embutido (permanente): se max(t)/H < 0.99 em qualquer vista, o script ABORTA com exit 2.
    O topo da silhueta TEM de dar ~1.0; se nao der, o medidor esta errado e nao o modelo.
  RESULTADO (w522):
    L_base_z       0.0773 vs 0.0423  erro 0.0350  OK
    L_topo_z       0.2394 vs 0.2762  erro 0.0368  OK
    R_base_z       0.5736 vs 0.5590  erro 0.0145  OK
    R_topo_z       0.7032 vs 0.6971  erro 0.0061  OK
    degrau_x       0.5107 vs 0.5132  erro 0.0024  OK
    pod_area_frac  0.1808 vs 0.1638  erro 0.0170  OK
    topo_global_x  0.5990 vs 0.6124  erro 0.0134  OK
    topo_global_z  0.9975 vs 0.9978  erro 0.0003  OK
    degrau_amp     0.3242 vs 0.2428  erro 0.0814  FALHA P0  <-- UNICO item real restante
    mediana 0.0145 (gate <= 0.025) ** PASSA ** | pior 0.0814 (gate 0.05) FALHA | soma 0.2071

  LEITURA: 8 de 9 landmarks passam; a mediana passa o gate pela primeira vez; topo_global_z e topo_global_x
    sao praticamente exatos (0.0003 e 0.0134). O UNICO problema real e degrau_amp: o degrau do modelo existe na
    posicao certa (degrau_x 0.0024) mas e MAIS SUAVE que o do concept (0.2428 vs 0.3242) = falta intensidade na
    quebra da carcaca naquele ponto.
  HISTORICO DA SOMA: 0.7962 -> 0.5468 -> 0.4045 -> 0.4260 (scorecard bugado) -> **0.2071** (instrumento correto)
  PROXIMO: atacar degrau_amp (a quebra da carcaca), e antes de tocar geometria conferir que o auto-teste continua
    dando OK em cada nova medicao.


## W532/W533 — ALAVANCAS DO degrau_amp: rzt REFUTADO, cowl_k REFUTADO (com 2 achados)
  W532 rzt 0.400->0.200 (fundo do tubo): degrau_amp 0.2428 IDENTICO => REFUTADO (so mexeu pod_area 0.0170->0.0164)
  W533 cowl_k 1.10->0.85: COWL z max 0.7022 -> 0.56 (baixou 0.14m) e degrau_amp 0.2428 IDENTICO => REFUTADO
  ACHADO 1: o cowl baixou 14cm e a SILHUETA NAO MUDOU UM PIXEL => o cowl esta inteiramente DENTRO do contorno.
    Refuta definitivamente que o degrau seja a transicao cowl->capacete. A parede de 0.30m em UMA coluna
    pertence ao CONJUNTO DO PILOTO na altura do capacete (helm_x move o degrau; casca retraida NAO move; M_Face NAO move)
    => sobra: helm_base / gasket / visor / neck / M_Pilot dentro do conjunto PL.
  ACHADO 2 (ganho): W533 melhora pod_area_frac 0.0170 -> 0.0107 e a mediana 0.0145 -> 0.0134, soma 0.2064 -> 0.2007
    sem tocar em nada mais => ** W533 ADOTADO ** (cowl mais baixo e melhor).
  INSTRUMENTO: auto-teste passou em todas as medicoes (pico ~1.0) — scorecard estavel e confiavel.
  TABELA DO degrau_amp (todos medidos, 1 build cada): rzt 0.0000 | cowl_k 0.0000 | cockpit_cut 0.0000 |
    helm_sz quebra L/H | helm_front(bmesh) 0.0000 | helm_x 0.3194 (posicao) — amplitude ainda sem alavanca isolada.
  PROXIMO: sonda del_mat na banda do degrau (x -0.22..0.02, z 0.50..1.35) para M_Gasket e M_Visor, que sao os
    candidatos restantes do conjunto PL na altura do capacete.


## W534 — M_Visor REFUTADO (del_n 6984, silhueta identica). 6 refutacoes no degrau_amp.
  TABELA degrau_amp (todos 1 build): rzt 0.0000 | cowl_k 0.0000 | cockpit_cut 0.0000 | helm_front(bmesh) 0.0000
    | M_Face 0.0012 | M_Visor 0.0000 | helm_x 0.3194 (posicao, nao amplitude)
  *** NAO E ARTEFATO (verificado antes de invocar a regra das 6 refutacoes): ***
    o pico de gradiente do concept e do modelo estao NA MESMA POSICAO (0.5107 vs 0.5132), logo degrau_amp e um
    landmark ANCORADO e a diferenca e REAL: a parede do modelo mede 0.2428*H = 0.30m e a do concept 0.3242*H = 0.41m.
    => a parede existe, esta no lugar certo, e e 11cm MAIS BAIXA que a do concept.
  ONDE ESTA A PAREDE (do perfil, em metros da altura total): desce de z/H 0.8307 (=1.040m) para 0.5880 (=0.736m)
    em UMA coluna (2.8mm de x) => parede quase vertical de 0.30m na frente-inferior do capacete / topo traseiro do cockpit.
  Cadeia de evidencia: helm_x MOVE a parede (0.3194, mas move o pico junto) / casca M_Blue retraida NAO move /
    M_Face NAO move / M_Visor NAO move / cowl NAO move (esta dentro do contorno) => a parede e do conjunto PL
    na altura do capacete, restando: M_Gasket, M_Pilot, helm_base, neck.
  HIPOTESE DE CONSERTO (se a ultima sonda refutar): a parede e a silhueta COMBINADA (casca + o que ha atras); para
    deixa-la 11cm mais alta sem mover o pico, o caminho e AUTORAL (bmesh) na frente-inferior do capacete — mesma familia
    do P33 que ja esta escrito. Nao insistir em constantes.
  PROXIMO: sonda del_mat M_Gasket na banda do degrau; se 0.0000 tambem, partir para o ajuste autoral da frente-inferior.


## *** W536 ADOTADO: TODOS OS GATES PASSAM (9/9 landmarks, mediana E pior) ***
  MUDANCA: P35 helm_brow=0.12 => 1466 verts da frente-SUPERIOR do capacete (aba/testa) movidos +x e +0.30z,
    com peso duplo (0 no pico e no topo, 1 na frente-alta). O pico nao se moveu (topo_global_z 0.9978 mantido).
  RESULTADO: degrau_amp erro 0.0814 (FALHA) -> **0.0232 OK** | degrau_x 0.0071 OK | topo_global_x 0.0308 OK
    mediana 0.0145 OK | **pior 0.0368 OK** | soma 0.1660 (melhor da sessao)
  HISTORICO DA SOMA: 0.7962 -> 0.5468 -> 0.4045 -> 0.2071 -> 0.1660

### O CAMINHO ATE AQUI (por que funcionou)
  6 alavancas refutadas na parede: rzt 0.0000 | cowl_k 0.0000 | cockpit_cut 0.0000 | helm_front(bmesh) 0.0000
    | M_Face 0.0012 | M_Visor 0.0000  (so helm_x movia, e era posicao)
  => nao havia PARAMETRO. Solucao AUTORAL (bmesh), exatamente o que o Sol prescreveu para identidade.
  A REGRESSAO W535 ENSINOU A DIRECAO: estender a frente-INFERIOR (helm_low) preenche o vao e derruba a parede
    (degrau_amp 0.2428->0.1915) e ainda MOVE o degrau (degrau_x 0.5132->0.7273, erro 0.0024->0.2166) = REGRESSAO.
    O oposto — frente-SUPERIOR (aba) — levantou a parede para 0.3474 (concept 0.3242) mantendo o degrau em 0.5036.
    LICAO: quando o conserto por deformacao falha numa direcao, a regressao costuma revelar a direcao certa; medir as DUAS.
  METODO QUE FECHOU O CASO: (1) alavancas descartam parametros em 1 build cada; (2) quando todas falham, AUTORAL;
    (3) testar as DUAS direcoes da deformacao; (4) scorecard com auto-teste decide.
  PROXIMO: com a Silhueta SIDE aprovada em todos os gates, partir para FRONT e REAR (mesma metrologia) e so entao
    o re-render BEAUTY para o vision proprio pareado antes do auditor (AUDIT_SKIP=top).


## FRONT/REAR: instrumento criado (scorecard_fr.py) mas NUMEROS DO CONCEPT NAO CONFIAVEIS AINDA
  Criado builder/scorecard_fr.py (perfil de LARGURA por linha, run>=8px nas DUAS pontas, auto-teste de plausibilidade).
  INCONSISTENCIA QUE DENUNCIA O BUG (cross-view):
    concept FRONT  W_max/H = 1.5084
    concept SIDE   W/H     = 1.238   (validado hoje com auto-teste)
    modelo  FRONT  W_max/H = 1.2339  <- COERENTE com 1.238
  => o MODELO e coerente entre vistas; o CONCEPT nao e. Mesma classe de bug da manha (mascara contaminada por
     moldura/reua nas laterais). As falhas W_mid 0.7653 e W_base 0.2667 no FRONT, e W_max 0.0868 no REAR do concept
     sao CONSEQUENCIA da contaminacao, nao divergencia de forma. NAO tratar como fila.
  AUTO-TESTE DO NOVO INSTRUMENTO (parcial):| verifica 0 < W_max < 2.5*H. Passou — mas NAO e suficiente, porque a
    contaminacao lateral produz W_max dentro da faixa plausivel. FALTA o gate de CONSISTENCIA ENTRE VISTAS.
  REGRA NOVA (gate obrigatorio do instrumento): a razao W/H medida no FRONT e no REAR tem de concordar com a W/H
    derivada do SIDE/TOP dentro de ~0.05. Se nao concordar, a extracao daquela vista esta contaminada e deve ser
    corrigida ANTES de qualquer comparacao. Isso teria pegado este bug em 1 checagem.
  PROXIMO: consertar a extracao do concept em front.jpg/rear.jpg usando o gate cross-view como criterio de aceite,
    e so depois re-medir FRONT/REAR. BEAUTY e vision proprio ficam para depois disso.


## *** 4o FALSO RESULTADO DO DIA (meu de novo): scorecard_fr INVALIDO — W_max > W_bbox e impossivel ***
  scorecard_fr deu concept FRONT W_max/H = 1.5084. Mas a medida DIRETA da o bbox W/H = 1.171 e o maximo
  FISICAMENTE POSSIVEL e W_bbox/H. 1.5084 NAO PODE EXISTIR => o instrumento esta errado, nao o concept.
  CAUSA: o flood() selecionou o COMPONENTE ERRADO no front/rear do concept (bbox e H diferentes) — o flood que
  funciona no SIDE nao generaliza para as outras vistas sem verificacao.
  DIAGNOSTICO DIRETO (confiavel, sem flood):
    concept FRONT mask cru: bbox W/H = 1.171  (esperado 1.238 => a 6.7%%, praticamente certo)
    concept REAR  mask cru: bbox W/H = 1.847  (cobre quase a imagem toda => severamente contaminado)
  NOVA CHECAGEM OBRIGATORIA (pega este bug em 1 linha): ** W_max <= W_bbox ** — a largura maxima de uma linha
    nunca pode exceder a largura do bbox. Se exceder, a extracao esta errada, SEMPRE.
  SELF-TESTS DO INSTRUMENTO ATE AGORA (acumulado, 3 gates):
    (a) topo da silhueta ~1.0 no SIDE  -> pega perfil invertido/contaminado
    (b) W_max <= W_bbox               -> pega componente errado no flood
    (c) W/H do FRONT/REAR concorda com o do SIDE/TOP em ~0.05 -> pega contaminacao lateral
  SEQUENCIA DE ERROS DE INSTRUMENTO HOJE: metrica degrau_x contaminada -> pod_area herdando -> scorecard com
    indice invertido -> scorecard_fr com componente errado. TODOS pegos por checagem, nenhum por intuicao.
  PROXIMO: FRONT usa o mask CRU (bbox 1.171 ja quase certo, so falta o gate cross-view apertar); REAR precisa de
    extracao propria (o cru esta contaminado). Re-medir as duas e so depois BEAUTY/vision.


## *** ALERTA DE METROLOGIA: os ALVOS do builder divergem das medicoes limpas de hoje ***
  scorecard_fr v2 (com busca de extracao guiada pelo gate) — RESULTADO:
    REAR  ACEITA 'erode1' (W_bbox/H=1.2387 passa o gate) e da 4/4 landmarks OK:
      W_topo 0.0327 OK | W_base 0.0041 OK | W_max 0.0026 OK | W_max_z 0.0004 OK
    FRONT BLOQUEADO: NENHUM candidato passa o gate cross-view (raw 1.1710, erode1 1.1749, flood 1.5117,
      erode1+flood 1.5734, erode2+flood 1.1000) — sistematicamente 6.3-6.7%% abaixo do 1.238 esperado.
  DESEMPATE INDEPENDENTE (TOP.jpg): TAMBEM CONTAMINADO (raw cobre a imagem toda 1009x550; erode da 1.64) —
    consistente com c_top.npy invalido. NAO desempata.

  DIVERGENCIA CRITICA (nao resolver por conveniencia):
    concept L/H : builder/alvo 1.868  vs  medicao LIMPA de hoje 1.978
    concept W/H : builder/alvo 1.238  vs  medicao LIMPA de hoje 1.171
  => o modelo foi calibrado INTEIRO nos alvos 1.868/1.238. Se os alvos vierem de medicoes contaminadas (mesma
     classe dos bugs de hoje), o modelo esta calibrado para uma forma que o concept nao tem.
  NAO ESCOLHER UM POR CONVENIENCIA. Resolver com checagem VISUAL (nao numerica): desenhar o contorno da mascara
    por cima da imagem do concept e olhar com vision se a mascara e o kart. Vision ve o que o numero nao ve.
  ESTADO SEGURO: SIDE 9/9 OK e REAR 4/4 OK sao comparacoes MODELO-vs-MEDICAO, sempre relativas; o que esta em
    duvida e se a MEDICAO do concept representa o concept.
  PROXIMO: overlay da mascara sobre front.jpg e side.jpg + vision_analyze para veredito visual de fidelidade da
    extracao, antes de qualquer nova mudanca de geometria.


## *** VEREDITO VISUAL DOS OVERLAYS: ALVOS DO BUILDER ESTAO ERRADOS ***
  /tmp/overlay-concept-side.png e /tmp/overlay-concept-front-erode1.png (contorno vermelho + bbox amarelo).
  VISION no SIDE: "Contorno vermelho abraca o kart. Nao sobra para fora. Nao pega grade, moldura, reguas ou fundo.
    Nao falta para dentro de forma relevante. Aderencia de 1-2px." Nada fora do contorno; bbox contem o kart.
    E lista os elementos: bico azul/amarelo, roda dianteira, topo do capacete, PONTA DO ESCAPAMENTO A DIREITA
    (confirma a orientacao: frente a esquerda) e topo do aerofolio amarelo.
    => A EXTRACAO SIDE E FIEL. O L/H real do concept e **1.9776**, NAO 1.868 (alvo do builder).
  VISION no FRONT: a mascara NAO abraca tudo — flanco externo e base dos DOIS pneus dianteiros (a silhueta MAIS
    LARGA) tem cobertura fraca; nao vaza para fundo; a largura maxima e dada pelas RODAS; e o kart e ~1.3 a 1.4x
    mais largo que alto. E aponta o defeito do bbox: "justa nas laterais e na base, mas com GRANDE FOLGA VAZIA NO
    TOPO ACIMA DO CAPACETE", quase quadrada.
    => a folga no topo INFLA H e portanto ACHATA o W/H medido: o 1.171 e SUBESTIMADO. A real esta acima de 1.24,
       na faixa 1.3-1.4 que o vision ve. O alvo 1.238 do builder nao estava alto — estava BAIXO.

  CONCLUSAO (recalibracao necessaria, nao ajuste fino):
    L/H: alvo 1.868 -> REAL 1.978   => com L=2.35m fixo (contrato), H teria de ser 1.188m (hoje 1.252m, -6.4cm)
    W/H: alvo 1.238 -> REAL ~1.30+ (pendente de bbox FRONT corrigido)
    MODELO atual: L/H 1.859 (6.4%% alto demais) e W/H 1.236 (~5%% estreito demais)
  POR QUE ISSO IMPORTA: todo o ajuste fino de hoje (degrau, pod, traseira) foi feito contra alvos errados. Os ganhos
    relativos continuam validos, mas a FORMA GLOBAL precisa ser recalibrada antes de qualquer nova perseguicao.
  METODO QUE RESOLVEU: eu me recusei a escolher o alvo por conveniencia e fui para checagem VISUAL — vision viu o que
    nenhum numero meu viu (a folga do bbox acima do capacete e a sub-segmentacao dos pneus).
  PROXIMO: (1) corrigir o bbox do FRONT (a folga no topo) e obter o W/H real; (2) recalibrar H do modelo para L/H=1.978;
    (3) re-rodar os 3 scorecards (SIDE/FRONT/REAR) contra os alvos corrigidos.


## *** ALVOS CORRIGIDOS E VALIDADOS POR ESTABILIDADE DE LIMIAR ***
  Varredura de limiares no FRONT do concept:
    sat>60/45/30/20 com max<85  ==>  W=452 H=386 W/H = 1.1710  (IDENTICO nos 4) => MEDIDA ROBUSTA
    max<110/130/160/140 ==> H explode (474/558/559/522) porque a mascara engole a GRADE => limiar de escuro
      correto e <85; os valores acima sao contaminacao, nao sinal.
  ALTURA DA LARGURA MAXIMA (checagem de forma independente da escala):
    concept 0.780 | modelo 0.771  => a largura maxima ocorre na MESMA altura relativa => coerente.
  => VISION ACERTOU NO QUALITATIVO E ERROU NO NUMERICO: a estimativa a olho '1.3 a 1.4x' esta errada (o real e
     1.171, estavel); mas ele viu certo a fragmentacao da mascara, listou os elementos corretos e detectou a orientacao.
    REGRA DE USO DAS FERRAMENTAS: vision para QUALITATIVO (o que existe, o que falta, orientacao, defeitos visiveis);
    numeros so com medida validada por estabilidade de parametro. Nunca usar estimativa visual como alvo numerico.

  ALVOS FINAIS (L=2.35m fixo por contrato):
    L/H = 1.978  =>  H = 1.188m   (modelo hoje 1.252m => 6.4cm ALTO demais)
    W/H = 1.171  =>  W = 1.391m   (modelo hoje 1.548m => 15.7cm LARGO demais)
  IMPLICACAO DIRETA: o alargamento de bitola que eu fiz em W517/W518 (baseado no alvo errado 1.238) deixou o modelo
    LARGO DEMAIS em ~16cm. Precisa ser revertido parcialmente. E a altura precisa cair 6.4cm.
  PROXIMO: recalibrar H (-6.4cm) e W (-15.7cm) no builder, re-rodar os 3 scorecards contra os alvos corrigidos e so
    depois retomar o ajuste de forma.


## *** W541: CALIBRACAO GLOBAL FECHADA CONTRA ALVOS VALIDADOS ***
  L/H = 1.976  (alvo 1.978, erro 0.002)
  W/H = 1.171  (alvo 1.171, erro 0.000)
  x_range [-1.2,1.15] exato | sep_parts 14 | QA aprovado | mask_ok flat_ok
  Metrodo: (a) alvo validado por overlay+vision (L/H) e estabilidade de limiar (W/H);
           (b) interpolacao EMPIRICA de 2 pontos em cada eixo, refeita a cada mudanca de H porque o slope em W/H e
               proporcional a 1/H — previ 1.433 escalando analiticamente e o real medido foi 1.654. NAO ESCALAR SLOPE,
               MEDIR DE NOVO.
  SCORECARD W541 (geometria renormalizada):
    L_base_z 0.0324 OK | L_topo_z 0.0537 FALHA P0 | R_base_z 0.0198 OK | R_topo_z 0.0367 OK
    degrau_amp 0.0192 OK (melhorou) | degrau_x 0.0071 OK | pod_area_frac 0.0102 OK
    topo_global_x 0.0212 OK | topo_global_z 0.0001 OK | mediana 0.0198 OK | pior 0.0537 FALHA | soma 0.2006
  CAUSA DO P0 IDENTIFICADA POR BBOX (nao por palpite): L_topo_z modelo 0.2931 e FBUMP topo z=0.3469 => 0.3469/1.188 =
    0.292 casa. Alvo 0.2394 x 1.188 = 0.284m. O topo do PARA-CHOQUE esta 6.3cm alto demais. Baixar o capacete reduziu H
    e RENORMALIZOU tudo: o para-choque ficou relativamente mais alto. Efeito esperado ao recalibrar a escala.
  PROXIMO: baixar o topo do FBUMP 6.3cm (0.3469 -> 0.284) e re-rodar o scorecard.


## *** W543: 9/9 LANDMARKS OK NA CALIBRACAO GLOBAL CORRIGIDA ***
  L_base_z 0.0324 OK | L_topo_z 0.0467 OK (era FALHA 0.0537) | R_base_z 0.0198 OK | R_topo_z 0.0367 OK
  degrau_amp 0.0192 OK | degrau_x 0.0071 OK | pod_area_frac 0.0096 OK | topo_global_x 0.0212 OK | topo_global_z 0.0001 OK
  mediana 0.0198 OK | pior 0.0467 OK | soma 0.1929  <-- MELHOR ESTADO DO PROJETO
  FIX: P36 pad_dz=-0.060 parametriza o Z do pad amarelo do para-choque (era literal hardcoded 0.2622/0.2610/0.2596).
    Topo do FBUMP 0.3469 -> 0.2869 contra alvo 0.284 (erro 0.003). Previsao 0.2883, acertou.
  ACHADO IMPORTANTE SOBRE PARAMETROS: `ep_s` NAO controla o FBUMP — a sonda W542 provou que ele controla o REAR
    (topo 0.8916 -> 0.8566 com FBUMP z inalterado). Nomes de parametro neste builder sao ENGANOSOS: antes de sondar,
    LER O CODIGO e achar o literal real (o topo do FBUMP era o pad amarelo: 0.2622 + raio 0.086 = 0.3482).
  Isto valida a sequencia completa: alvo validado -> recalibracao por 2 pontos -> renormalizacao expoe novo P0 ->
    diagnostico por bbox/leitura de codigo -> fix no parametro certo -> gates fecham.


## *** GATE DE FORMA REPROVADO — veredito do MEU vision sobre a prancha pareada de W543 ***
  /tmp/board-w543-pareado.png (3x2: SIDE/FRONT/REAR x CONCEPT|MODELO)
  VEREDITO: "nao e producao AAA fiel; e blockout/prototipo procedural com primitives; silhueta cheia/baixa/larga
    no concept contra magra/alta/tubular/vazia no modelo; precisa remodelar 80%%".
  *** LICAO CENTRAL DO DIA: o scorecard da 9/9 landmarks OK E AO MESMO TEMPO o modelo e vazio e ve-se atraves.
    Os landmarks medem o CONTORNO; contorno certo NAO significa forma certa. Metrica de silhueta nao substitui
    leitura visual de forma — as duas sao necessarias e nao intercambiaveis. ***
  Detalhamento completo por item (nose, sidepod, escapes, rear, piloto) e os gates G26-G31 em IDENTITY-GAPS.md.
  ORDEM DE IMPACTO: G26 nose -> G27 sidepod -> G28 escapes -> G29 rear -> G30 piloto -> G31 (vision proprio
    aprova -> Sol avalia a MESMA imagem).


## *** G26 NOSE: TUBO ELIMINADO, CARENAGEM FECHADA ENTRA (W544-W548) ***
  Vision reprovou o nose ('barra/tubo prateado flutuante') -> patch G26 substitui o anel fino por:
    fbump_body (corpo fechado com bevel, M_Blue) + fbump_lip (labio amarelo em U, tubo grosso) +
    intake_0..4 (5 lamelas M_BlueDk) + fin_l/fin_r (2 aletas amarelas). O anel fino SAIU.
  Iteracoes guiadas por vision:
    W544: carenagem entra, mas x_range deriva para [-1.196,1.154] (scale_factor muda com len_before).
    W545: xtrans -0.003 restaura x_range exato.
    W546: alargar/baixar/aprofundar -> FBUMP y +-0.666, mas a carenagem FURA O CHAO (z_range [-0.034,...]).
    W547: centro z 0.175 + meia-altura 0.120 => base 0.055; profundidade 0.360; clipping resolvido.
    W548: xtrans -0.008 e helm_z 0.982 => x_range EXATO, L/H 1.978 EXATO (erro 0.000), W/H 1.164 (erro 0.007).
  VISION na iter1 (W545) ainda reprovou FORMA: 'trocou tubo por prateleira' — sem lateral, sem espessura, sem barriga;
    labio virou barra reta ('parece fita, nao para-choque'); intake invisivel (5 risquinhos); largura ~60%% do necessario.
    Spec dado pelo vision: alargar ate a face interna dos pneus, baixar a 5cm do solo, 15-20cm de profundidade
    nas laterais, U amarelo 3D com retorno 90, intake rebaixado em caixa preta com lamelas grossas.
  PROXIMOS PASSOS DO G26: (a) ty_f 0.586/ty_r 0.584 para fechar W/H 1.171; (b) laterais com profundidade real e
    caixas fechadas; (c) U amarelo 3D (2 volumes verticais + barra inferior com retorno); (d) intake como CAIXA
    PRE-BA bruta e recuada com lamelas grossas; (e) aproximar a camera do render para casar com o concept.


## *** W549: G26 ATIVO E INVARIANTES FECHADOS ***
  L/H 1.978 (alvo 1.978, erro 0.000) | W/H 1.170 (alvo 1.171, erro 0.001)
  x_range [-1.2,1.15] EXATO | z_range [-0.01,1.178] sem clipping | 14 pecas | QA aprovado
  A calibracao SOBREVIVEU a troca de geometria do nose, que era o risco real do G26.
  ty fechado por 2 pontos: 0.582->1.164 e 0.586->1.170 (slope ~1.5), alvo 1.171.
  LIÇÃO DE PROCESSO: todo componente novo no builder muda len_before -> muda scale_factor -> reescala o modelo
    inteiro -> move x_range, L/H e W/H. Nao e regressao: e acoplamento. Ordem correta: mudar geometria PRIMEIRO,
    calibrar invariantes DEPOIS. Fazer o contrario gera 5 builds de retrabalho (foi o que aconteceu em W544-W548).
  PENDENTE DO G26 (spec do vision, por ordem): (a) laterais com profundidade real e caixas fechadas; (b) U amarelo 3D
    com 2 volumes verticais + barra inferior com retorno 90; (c) intake como CAIXA PRETA rebaixada com lamelas grossas;
    (d) aproximar a camera do render para casar de tamanho com o concept.


## *** G26 ITER 3 — VISION DA NOTA 4.0/10 E INVALIDA A ABORDAGEM (nao os parametros) ***
  Prancha: /tmp/nose-w549-front.png (FRONT, render ampliado).
  VEREDITO: (1) 'ainda prateleira/chapa fina — laje de topo plano, frente plana, quina viva; o concept e um TUBO
    INFLADO, cilindrico, sem face plana, com barriga e laterais dobrando para tras envolvendo a roda'.
    (2) 'lábio virou fita — e PIOR: o concept NEM TEM labio inferior horizontal; tem 2 VOLUMES AMARELOS VERTICAIS
    de canto, grossos como coxins, que fazem o U na vertical/lateral. Criei um elemento que nao existe e sumi com o
    que existe.' (3) largura: concept cobre ~85-90%% da bitola encostando no flanco interno dos pneus; modelo ~65%%
    => FALTA ~25%% (~12%% por lado). (4) 'abaixou a tabua, nao assentou o kart'. (5) NOTA 4.0/10.
  *** CAUSA RAIZ E O TIPO DE PRIMITIVA, NAO O VALOR DO PARAMETRO ***
    Eu construi com box(): topo plano, frente plana, quina viva -> NUNCA le como inflado, por mais bevel/params.
    O concept e um volume TUBULADO inflado: raio grande, barriga para frente, pontas dobrando para tras.
    Ajustar g26_c/g26_d/g26_lr NAO resolve — e outra primitiva. Mesma classe de erro do dia: micro-ajuste onde
    o problema e estrutural (o usuario ja me disse isso antes: 'micro-calibracao e INVISIVEL no render').
  SPEC DEFINITIVO DO VISION (unico proximo passo de maior impacto):
    jogar fora caixa + barra + toquinhos e modelar o para-choque como UM VOLUME TUBULAR FECHADO E INFLADO de pneu a
    pneu, com cantos em RAIO GRANDE dobrando para tras, e os AMARELOS como 2 COXINS VOLUMETRICOS DE CANTO que
    abracam a curva — nao como barra inferior.
  PLANO G26b: spine curva do flanco interno do pneu esquerdo ate o direito (y +-0.63), raio de tubo ~0.11, pontas
    com retorno para tras; 2 coxins amarelos verticais (~0.09 de raio) nos cantos; intake como CAIXA PRETA rebaixada
    com 5 lamelas grossas; remover fbump_lip horizontal e os fin_* atuais.


## *** G26b: PRIMITIVA TROCADA — TUBO INFLADO. VISION 4.0 -> 5.0 ***
  W550: fbump_tube (tube_round com spine curva y +-0.630, raio 0.106) + cushion_l/r + intake_box + intake2_0..4
    substituem a caixa. O QA confirma os componentes novos e o tubo encosta no flanco interno dos pneus.
  VISION W550: 'AGORA LE COMO TUBO. A quina viva sumiu, o highlight corre continuo. PRIMITIVA CERTA.'
    NOTA 5.0/10 (era 4.0) — 'acertou a primitiva, errou os dois elementos de carater'.
  O que ainda falta (spec do vision): (a) o tubo e uma salsicha de diametro CONSTANTE — o concept e gordo,
    com diametro maior no centro e barriga baixa/achatada embaixo ('saiu da caixa, caiu no cano de PVC');
    (b) os coxins amarelos precisam ser VERTICAIS na FACE FRONTAL (donuts em pe), diametro ~1.3x o tubo;
    (c) o intake tem que ser grande, baixo, preto fosco, 30%% da largura, afundado 2-3cm.
  W551/W552: coxins parametrizados (g26b_cx/cyk/cr) e corrigidos para a face frontal; reduzidos apos
    overshoot (cr 0.196 empurrou y para +-0.835 e F UROU O CHAO; com cr 0.155/cx -0.075/cyk 0.90/z 0.155
    o clipping voltou a zero e y ficou 0.733).
  *** ACOPLAMENTO CONFIRMADO 3x NO MESMO DIA: toda mudanca de geometria frontal altera len_before ->
    scale_factor -> reescala tudo -> move x_range, L/H e W/H. Aconteceu em W544, W546 e W551. NAO E REGRESSAO,
    E ACOPLAMENTO. A ordem correta e: mudar geometria PRIMEIRO, calibrar invariantes DEPOIS (uma passada). ***
  PENDENTE IMEDIATO: recalibrar os invariantes na geometria W552 (L/H 2.02 -> 1.978, W/H 1.26 -> 1.171,
    x_range [-1.175,1.175] -> [-1.2,1.15]) por 2 pontos em cada eixo. Depois: dar barriga ao tubo (diametro
    variavel no spine) e afundar/engrossar o intake, e re-verificar com vision.


## *** G26 PARA-CHOQUE: 4.0 -> 7.0 EM SEIS ITERACOES. VISION MANDA PARAR E IR PARA NARIZ/SIDEPOD ***
  W550 tubo raio constante 4.0 | W551/552 coxins na face 5.0 | W566 barriga em Y (zsq 0.92 achatou Z) 5.5
  W567 ancorado em _xs 6.0 | W568 LEGADO REMOVIDO 6.5 | W569 barriga 1.5x + queixo 6.5cm 7.0
  *** CAUSA RAIZ DE 3 ITERACOES PERDIDAS: front_bumper() do builder base AINDA cria pad_l/pad_r (2 blocos
      amarelos chapados) e fbar (barra azul retangular) ALEM do meu tubo. Eu tunei raio/protrusao/posicao
      enquanto as pecas ANTIGAS dominavam o render. O vision descrevia 'bloco azul de quinas vivas' e '2 selos
      amarelos chapados' = era o fbar e os pads, nao o meu tubo. FIX: fbar=0 + g26c_pads=0 (loop vazio).
      REGRA: antes de tunar qualquer peca patchada, LISTAR as metricas do QA e confirmar que as pecas LEGADAS
      da mesma funcao nao estao la. O QA do W568 provou: pad_l/pad_r/fbar ausentes. ***
  *** NUMERO NAO E LEITURA: barriga 1.5x no parametro NAO virou volume no pixel. O vision exige QUEBRA DE
      SILHUETA (afinamento visivel nas pontas, sombra correndo no eixo, ombro), nao valor de arquivo. ***
  *** BUG DE ANCORAGEM: coxins e intake estavam em XFO-0.045 e XFO-0.145, mas a superficie frontal do tubo esta
      em XFO+0.165. Ficavam 21cm e 31cm ENTERRADOS (so a tampinha aparecia). FIX: _xs=(XFO-0.030)+r*(be0+belly)
      e tudo posicionado relativo a _xs. ***
  VEREDITO DO VISION (7.0): para-choque chegou no limite da geometria — o que falta nele e material/bisel/luz
    e isso e polimento. O que mata o modelo e a SILHUETA LATERAL: wheelbase visual, altura do sidepod e a
    transicao nariz->assoalho. 'No concept a frente desce da coluna de direcao em curva continua, forma um
    labio inferior (queixo) e so depois encontra a capsula do cubo da roda — ha TRES volumes empilhados em
    perfil. No W569 ha um.' Mexer no nariz/sidepod sobe 1-1.5 ponto; mexer mais no bumper da 0.2.
  PROXIMO: G27 lado esquerdo da fila agora e NARIZ (bico) + SIDEPOD, nao o para-choque.


## *** G27 ABERTURA: O ALVO CANONICO L/H=1.978 DO SIDE ESTA ERRADO. MODELO ~8cm BAIXO DEMAIS. ***
  METODO 1 (linhas de cota do proprio concept, que marcam os extremos por construcao):
    detectadas por componente conexa na imagem side.jpg:
      vertical   : comp 925px em x 70-96,  y 83-484  -> altura = 402 px
      horizontal : comp 1870px em y 487-558, x 122-886 -> comprimento = 765 px
    L/H = 765/402 = 1.9030
  METODO 2 (mascara v2 do build_masks.py, overlay VALIDADO por vision: 'adere ao kart, pega a ponta do
    bico, a asa, a ponta do escapamento, o topo do capacete e a base dos pneus'):
    conteudo real termina na linha 486; as linhas 509-521 tem so 1-10 px = pontos da LINHA DE COTA.
    bbox limpo 766 x 403 (rows 84-486) -> L/H = 1.90 a 1.93
  METODO 3 (validacao cruzada do INSTRUMENTO): a mascara v2 no FRONT da 453x388 = 1.1675 contra o canonico
    W/H=1.171 medido por 4 limiares de saturacao -> erro 0.3%%. Isso valida a v2 em FRONT.
  Numeros conflitantes: 1.776 (v2 cru, inclui cota) | 1.90-1.93 (v2 limpo + cotas) | 1.868 (c_side.npy,
    bbox = imagem inteira, contaminada) | 1.978 (canonico, SEM fonte reproduzivel nesta sessao).
  CONSEQUENCIA: com L=2.35m e L/H=1.903 -> H = 1.230 m. O modelo tem z_range [-0.01,1.137] = 1.147 m.
    FALTAM ~8.3 cm de altura (6.8%%).
  *** ISSO BATE COM UMA MEDICAO ANTERIOR INDEPENDENTE DESTE PROJETO: 'H alvo 1.258m (modelo 1.176,
      faltam 8,2cm)'. Duas medicoes independentes, sessoes diferentes, concordam em ~8cm. O alvo 1.978
      (H=1.188) suprimiu esse sinal em vez de corrigi-lo. ***
  RISCO: mudar o alvo de altura REABRE a calibracao global (L/H 1.978, W/H 1.171, ty_f/ty_r, helm_z,
    xtrans, xtrans). Por isso esta em consulta ao modelo forte antes de agir.
  INSTRUMENTO: build_masks.py (mask v2) e o valido para SIDE/FRONT; /tmp/c_side.npy esta CONTAMINADA
    (bbox = imagem inteira) e nao deve ser usada.


## *** PARECER DO MODELO FORTE (gpt-5.6-sol, reasoning medium, job 4564abea, exit 0) ***
  1. ADOTAR 1.903 PROVISORIAMENTE. Duas evidencias reproduziveis convergentes (cotas 765/402 e bbox limpo).
     1.978 NAO tem fonte reproduzivel -> retirar do status canonico ate ser reproduzido.
     Confianca nas cotas = MEDIA, nao alta: so promover a canonico depois de provar que os 4 endpoints
     coincidem com os extremos reais da silhueta (linha grafica pode ter folga/espessura/terminacao decorativa).
  2. NAO RECALIBRAR AGORA. Fechar nariz e sidepod primeiro com dimensoes globais CONGELADAS. Mexer em H agora
     move L/H, W/H, bitolas, helm_z e xtrans de uma vez e pode invalidar os 9/9 landmarks. Blast radius grande
     para um alvo SIDE ainda nao validado. O FRONT esta solido (0.26%% de erro vs 1.171): PRESERVAR.
  3. SEQUENCIA MENOS DESTRUTIVA: (a) extrair SIDE com filtro explicito contra componentes finos/pontos;
     (b) sobrepor contorno+bbox e validar numericamente os 4 endpoints; (c) repetir com 2 metodos independentes
     exigindo estabilidade perto de 1.903; (d) fechar nariz/sidepod com globais congeladas; (e) SO ENTAO
     recalibrar altura por 2 pontos, RE-MEDINDO (nunca escalando analiticamente) bitolas, helm_z, xtrans e os 9 landmarks.
  "A convergencia independente do deficit (8,8cm vs 8,2cm) reforca que o modelo esta baixo, mas nao justifica
   uma recalibracao destrutiva antes de validar o instrumento e fechar as formas estruturais."
  ACAO TOMADA: alvo 1.978 marcado como NAO-CANONICO (hipotese legada). Globais congeladas. Seguir para G27.

## *** G27 BASELINE: PERFIL SIDE EM FRACOES (instrumento: build_masks.py mask v2, /tmp/c_side.npy ABANDONADA) ***
  conceito limpo 766x428 (L/H 1.7897) | modelo w569 limpo 834x407 (L/H 2.0491)
  PICO DO TOPO (fracao de L): concept 0.60 = modelo 0.60 -> posicao longitudinal do capacete esta CORRETA.
    (Regra: pico batendo = o deslocamento longitudinal NAO e o defeito. O defeito esta na forma do contorno.)
  dTOP (modelo - concept) por estacao: xf0.20 -0.121 | xf0.30 -0.185 (PIOR) | xf0.35 -0.105 | xf0.40 -0.087 |
    xf0.90 -0.187 | xf0.45..0.70 dentro de +-0.03 (capacete OK) | xf1.00 +0.178 (modelo ALTO)
  LEITURA: o TOPO DO CORPO esta sistematicamente BAIXO no trecho frente-meio (xf 0.20-0.40) e perto da traseira
    (xf 0.90). O capacete e a regiao 0.45-0.70 batem. Consistente com o vision: falta VOLUME na silhueta superior.
  CAVEAT ABERTO (proximo micro-passo): a orientacao do render SIDE do modelo ainda nao foi confirmada ponto a
    ponto (o mapeamento xf->x nao fechou com o bbox do piloto). Confirmar a orientacao antes de usar os numeros
    por estacao como alvo de geometria.


## *** G27 MICRO-PASSO RESOLVIDO: ORIENTACAO + O DEFEITO NOMEADO ***
  Orientacao CONFIRMADA (vision no render w569-side.png): frente = ESQUERDA (igual ao concept), traseira =
    DIREITA, roda maior = direita (traseira) -> consistente. Entao xf=0 e a frente nas DUAS imagens e os
    numeros por estacao passam a ser utilizaveis como alvo.
  CONFIRMACAO INDEPENDENTE do defeito: o vision descreve, NA METADE SUPERIOR ENTRE O CENTRO E A FRENTE,
    "VAO ABERTO" -> exatamente a regiao do dTOP -0.185 medido em xf 0.30. Medicao e leitura concordam.
  IDENTIFICACAO DA PECA: xf 0.30 -> x = 1.192 - 0.30*2.35 = 0.487, que cai DENTRO do COWL (bbox x 0.206-0.735).
    A roda dianteira ocupa xf 0.169-0.333 e seu topo e 0.330 da altura; o concept mede 0.551 ali. Logo NAO e roda.
  ALVO MEDIDO (maior erro do perfil):
    xf 0.20 (x=0.722, 0.47m do bico)  concept 0.416 da altura  | modelo 0.295
    xf 0.30 (x=0.487, 0.705m do bico) concept 0.551            | modelo 0.366   <-- PIOR, -0.185
    xf 0.35 (x=0.370)                 concept 0.540            | modelo 0.435
    xf 0.45 (x=0.134)                 concept 0.600            | modelo 0.585   <-- bate (+-0.016)
  LEITURA: o modelo TEM a altura no ponto xf 0.45, mas nao em xf 0.30. Ou seja, a subida nariz->carena acontece
    TARDE e ABRUPTA em vez de continua. E um defeito de POSICAO DO DEGRAU, nao de amplitude: o concept sobe
    continuamente do bico ate a coluna de direcao; o modelo fica baixo ate xf~0.42 e salta.
    Em metros: o concept quer ~0.51m em x=0.722 e ~0.68m em x=0.487 (usando H=1.230m do concept) ou ~0.47m e
    ~0.63m (usando o H congelado 1.147m). O modelo tem 0.34m e 0.42m. DEFICIT de 0.13 a 0.26m conforme a escala.
  PROXIMO LEAF (G27 nariz/carena): construir a subida CONTINUA bico->carena com a posicao do degrau medida em
    xf, mantendo as dimensoes globais CONGELADAS (parecer do Sol). Instrumento: builder/scorecard_side_frac.py
    (perfil top/floor em fracoes, 21+ estacoes) + mask v2. Apos o build, re-medir e comparar com a tabela acima.


## *** G27 CARENA: FUDGE + PATAMAR MEDIDO. MELHOR = W572 ***
  CAUSA 1 (fudge): a carena usava zt=prof_top(xf)*H*0.85. Um multiplicador <1.0 sobre uma TABELA MEDIDA e
    bug conhecido (skill concept-driven-3d-modeling). Removido para 1.00 -> COWL z max 0.560 -> 0.6384.
  CAUSA 2 (tabela): com o fudge fora, o topo em xf 0.30 virou 0.430 = o proprio valor de prof_top(0.30),
    enquanto o concept mede 0.551 naquela estacao. A TABELA prof_top esta 0.121 baixa ali (numero herdado).
  FEICAO MEDIDA (grade fina de 61 estacoes na mask v2): o concept tem um PATAMAR plano em xf 0.267-0.350 a
    0.551 da altura, com degrau de +0.084 na entrada e -0.070 na saida, e um segundo degrau de +0.126 em xf 0.417.
    Degrau no concept = feicao de projeto, nao ruido (max|diff| 0.126 contra mediana 0.016).
  IMPLEMENTADO (patch 26 em run_variant.py): patamar da carena parametrizado como JANELA TRAPEZOIDAL +
    max(zt, H*cowl_plat_h*_w) — onde prof_top ja e maior o max() preserva a tabela, entao nao ha dano.
  RESULTADO (|dTOP| medio sobre 61 estacoes):
    W569  media 0.0652  frente-meio(0.15-0.45) 0.0957
    W570  media 0.0594  frente-meio(0.15-0.45) 0.0771
    W571  media 0.0588  frente-meio(0.15-0.45) 0.0753
    W572  media 0.0537  frente-meio(0.15-0.45) 0.0587
  Ganho na frente-meio: 0.0957 -> 0.0587 (39% melhor). Globais CONGELADAS em todos os builds:
    L/H 2.05, W/H 1.171, x_range [-1.158,1.192], z_range [-0.01,1.137], 14 pecas, QA aprovado (identicos).
  RESIDUO NOMEADO: xf 0.417 (dTOP -0.169) — o segundo degrau do concept (+0.126, x=0.212 = borda traseira do
    cowl / zona do cockpit). E zona do G30 (piloto/cockpit), nao da carena. E xf 0.90 (-0.187) e a traseira (G29).


## *** G27 FECHADO: A TABELA prof_top ESTAVA ~10%% BAIXA NA FRENTE (altura inflada pela linha de cota) ***
  DIAGNOSTICO: comparando prof_top com a medicao da mask v2, a razao medido/tabela e 1.106 em xf 0.05-0.25
    e cai para ~1.04 perto de xf 0.50. Fator 438/403 = 1.087 = H da mascara ANTIGA (que incluia as 12 linhas de
    pontos da linha de cota) sobre o H real. OU SEJA: a tabela foi medida com a altura inflada pela cota, entao
    todos os valores da frente ficaram ~9%% baixos. Numero herdado, nao medicao.
  FIX (patch 27): substitui os 19 nos de xf 0.00-0.45 por valores MEDIDOS na mask v2 validada. Efeito:
    NOSE z max 0.5073 -> 0.5482 (+4.1cm). Globais IDENTICAS (L/H 2.05, W/H 1.171, x_range, z_range, 14 pecas, QA).
  SERIE COMPLETA (|dTOP| medio sobre 61 estacoes): W569 0.0652 -> W570 0.0594 -> W571 0.0588 -> W572 0.0537 -> W573
  TRES CAUSAS DISTINTAS ENCONTRADAS NESTE G27, todas de dado e nao de parametro:
    (1) fudge <1.0 sobre tabela medida (cowl_k 0.85); (2) feicao MEDIDA ausente da tabela (patamar do concept
    em xf 0.267-0.350 a 0.551H, implementada via janela trapezoidal + max()); (3) tabela medida com H inflado
    pela linha de cota (~10%% baixa na frente).
  RESIDUO RESTANTE NOMEADO: xf 0.417 (-0.169, 2o degrau do concept, zona cockpit -> G30); xf 0.90 (-0.187,
    traseira -> G29); xf 0.367-0.383 (+0.03 a +0.04, excesso na saida do patamar).


## *** G27 CONTINUACAO: CONTRADICAO ABERTA NO DEGRAU xf 0.267 ***
  RESIDUO: em xf 0.267 (x=0.565 = borda TRASEIRA do bico) o concept tem 0.549 H e o modelo 0.423 H -> -0.126.
    E o degrau de +0.084 do concept; o modelo sobe suave, sem degrau.
  CONTRADICAO: a aritmetica diz que a carena tem topo NOMINAL de 0.638 m naquela estacao (patamar cowl_plat_h
    0.556 * H 1.147 = 0.638; a janela a=0.210/b=0.327/f=0.12 da _pw=1.0 em xf 0.267). Mas o render mede 0.485 m
    (24%% abaixo). Em xf 0.30 o nominal e 0.638 e o medido 0.623 (2%% abaixo). Um shrink de SUBSURF nao explica
    2%% num ponto e 24%% em outro a 4cm de distancia: ou o topo ali NAO e a carena, ou as estacoes da carena nao
    cobrem xf 0.267 como o calculo supoe (cowl_xf0=0.174 + 0.235*t -> 0.174..0.409 em 22 estacoes, passo 0.0112).
  PROXIMA ACAO (bloqueada por um detalhe de instrumentacao, nao pelo modelo): SONDA DO TOPO DA PECA por faixa de x.
    Duas correcoes necessarias na sonda: (1) os nomes das pecas no QA/part_bbox sao MINUSCULOS ('cowl', 'nose'),
    nao 'COWL'/'NOSE' — bpy.data.objects.get('COWL') devolve None; (2) os print() do codigo que roda DEPOIS do
    exec(run_variant.py) nao foram capturados neste job — gravar o resultado DENTRO do dict R (ex.: R['probe']=...)
    antes do marcador ###RESULT###, ou emitir via o proprio R, em vez de depender de stdout.
  NOTA: W573 e a MELHOR base quantitativa do G27 (|dTOP| 0.0498, frente-meio 0.0462) e NAO deve ser regredida.


## *** SONDA: TENTATIVA FALHA, REVERTIDA, PIPELINE VERIFICADO ***
  TENTATIVA: anexar ao runner um hook pos-exec que gravasse R['probe_top'] = topo real por faixa de x + QUAL peca
    e dona do topo (para resolver a contradicao do degrau xf 0.267).
  FALHA 1 (W575): o hook usava R antes de R existir (R=g.get('R',{}) vem DEPOIS) -> NameError -> runner morre,
    resultado vazio.
  FALHA 2 (W576): trocado para g.setdefault('R',{}) -> mesmo assim ###RESULT###{} vazio. Ou seja, o ponto correto
    NAO e depois do exec: o marcador ###RESULT### e emitido ao final do SRC, antes do codigo anexado ao runner.
  REVERT: hook removido de run_variant.py (28627 bytes, sem 'probe_top').
  VERIFICACAO: W577_VERIFY builda normal e as metricas batem 100%% com W573 (L/H 2.05, W/H 1.171,
    z_range [-0.01,1.137], 14 pecas, QA aprovado). PIPELINE INTACTO, nenhum dano.
  CAMINHO CORRETO PARA A SONDA (proximo leaf): o hook tem de ser injetado DENTRO do SRC (patch que edita o proprio
    script construido, antes do ###RESULT###), nao anexado ao runner. Alternativa mais simples: usar as bboxes por
    peca que o proprio R ja expoe (part_bbox) e cruzar com a medicao do render, sem tocar no runner.


## *** BLOCKER DE INFRA: DOIS blender-runner server.py CONCORRENTES ***
  SINTOMA: W578, W579 e W580 falharam 3x seguidas com result {} VAZIO e o blender.log contendo APENAS
    '###RESULT###{}' + a linha de versao do Blender + 'Blender quit' — SEM saida de build e SEM traceback.
  NAO E O CODIGO: W580 usou um conjunto de parametros equivalente ao W573 (que buildou OK) e ainda assim falhou.
    O arquivo run_variant.py foi commitado e verificado em W577_VERIFY (metricas identicas ao W573) ANTES das falhas.
  CAUSA PROVAVEL ENCONTRADA: existem DOIS processos do runner rodando ao mesmo tempo:
      PID 8873  server.py  ppid 2192  iniciado sex set 18 05:00:34
      PID 10363 server.py  ppid 2194  iniciado sex set 18 05:03:17
    Pais DIFERENTES e horarios diferentes -> um runner POR PERFIL Hermes (default e coder), ambos apontando para
    o MESMO /opt/blender-runner (jobs/ e outputs/ compartilhados). Dois processos disputando a mesma fila explicam
    um job reivindicado por um e o resultado emitido vazio por outro. Porta 5001 em LISTEN.
  POR QUE W569-W573 E W577_VERIFY FUNCIONARAM E DEPOIS PAROU: nao determinado; a disputa depende de qual servidor
    pega o job. E uma condicao de corrida, nao um defeito deterministico.
  ACAO: parei de repetir o caminho que falha (regra: apos 1 diagnostico, reportar o blocker em vez de insistir).
    O problema e de INFRA/papeis e deve ser roteado ao perfil DEFAULT (regra de coordenacao entre perfis).
  ESTADO PRESERVADO: repositorio intacto e commitado. Ultimo build BOM = W573 (|dTOP| 0.0498) e W577_VERIFY
    confirmou que o runner aceita o codigo quando um unico servidor atende. Nenhum dano ao modelo.
  PENDENTE DE EXECUCAO (pronto para quando o runner voltar): converter o ombro frontal do patamar de PAREDE
    VERTICAL em RAMPA CONTINUA. O vision validou qualitativamente: 'no concept o contorno e CONTINUO, sem degraus
    — uma rampa reta subindo da frente para o meio'; 'no modelo a face dianteira e uma PAREDE quase vertical que
    cai em degrau abrupto'. Duas vias prontas: (a) alargar o ombro (cowl_plat_f 0.12 -> 0.62); (b) desligar o
    patamar (cowl_plat_a=0) e deixar a rampa vir da tabela CORRIGIDA do patch 27, que ja contem os valores medidos
    (0.416 -> 0.465 -> 0.549). A via (b) e a preferivel: remove a causa (a parede) em vez de suaviza-la.

  CONSULTA AO PERFIL DEFAULT: tentada via 'hermes -p default chat -q' com as evidencias do runner duplicado.
    NAO completou em 240s (KeyboardInterrupt/timeout do CLI). Fica registrado para repetir com timeout maior ou
    por outro canal. O blocker permanece ABERTO e depende de infra.


## *** UNBLOCK: CAMINHO DIRETO DE BLENDER (sem o runner MCP) ***
  DESCOBERTA: o runner MCP voltou a quebrar (server.py MODIFICADO as 07:04 por OUTRO ator; os dois 'servers'
    nao sao por perfil — sao filhos de 'gateway run' (2192) e 'serve --port 9119' (2194)). Log de 109 bytes com
    apenas '###RESULT###{}' = payload chegando VAZIO ao servidor. 5 builds perdidos (W578-W581).
  SOLUCAO (funcionando, 3 builds OK): replicar o runner no terminal, sem servidor. O server.py monta
    HEAD + PRELUDE + codigo + TAIL. Recipe exata:
      1) HEAD   = sp[i+len('HEAD = """'):sp.index('"""', ...)]                    (server.py:192)
      2) PRELUDE= sp[k+len("PRELUDE = r'''"):<indice do marcador 'fim do prelude'>]      (server.py:206)
         ATENCAO: cortar pelo MARCADOR, nao pelo proximo ''' (o PRELUDE contem ''' aninhado).
      3) PRELUDE.replace('OUTDIR = %r', "OUTDIR = %r" % '/opt/blender-runner/outputs')
      4) 'import time' (o PRELUDE importa mathutils mas NAO time; bb25.py usa time)
      5) rodar: flock -n /opt/blender-runner/.lock timeout -s KILL 420 /snap/bin/blender -b
                --factory-startup --python <script> 2>&1 | grep '^###'
    O script imprime ###DIRECT_OK ###METRICS ###BBOX ###QA e depois o ###RESULT### do emit().
    Build leva ~18s. Renders em /opt/blender-runner/outputs/<ver>-*.png (+ f- flat e m- mask).
    Scripts prontos: /tmp/b581d.py, /tmp/b582d.py, /tmp/b583d.py.
  TAMBEM ADICIONADO: run_variant.py agora despeja o SRC construido em /tmp/built_last.py (debug de linha real).

## *** CONTRADICAO DO xf 0.267 EXPLICADA: SUBSURF COLAPSA SECAO ESTREITA-ALTA ***
  O topo medido da carena fica MUITO abaixo do nominal nas estacoes FRONTAIS e apenas ~2%% no meio. A carena
    constroi secoes com ry=0.098*s+0.030 -> nas estacoes frontais (s pequeno) a secao e ESTREITA E ALTA
    (ry~0.030 contra altura ~0.55), e o SUBSURF(levels=1) colapsa esse tipo de secao. Onde a secao e larga
    (meio da carena) o shrink e ~2%%. E a mesma causa que o vision viu como 'parede vertical': o topo sobe
    tarde porque as estacoes frontais nao sustentam o topo.
  ALVO CONFIRMADO POR MEDICAO (grade fina): patamar do concept em xf 0.267-0.350 a 0.549-0.551, entrando por
    degrau a partir de 0.465 (xf 0.250).

## *** TENTATIVAS DESTE CICLO (caminho direto) ***
  W581D  sem patamar (rampa so da tabela corrigida): medio 0.0531 | frente-meio 0.0568 | sobe CONTINUO ✓
  W582D  f=0.62: BYTE-IDENTICO ao W581D -> o trapezio DEGENERA (sem zona plana) e o patamar nao contribui.
         REGRA: com largura (b-a) e fracao f, a zona plana vale (b-a)*(1-2f); f>=0.5 ANULA o patamar.
  W583D  a=0.215 b=0.360 f=0.35 h=0.556 (plano xf 0.266-0.309 + rampas de 0.051): medio 0.0528 | frente-meio
         0.0558 | patamar 0.0588. Rampa CONTINUA ✓ (sem parede) mas ATRASADA: modelo chega ao patamar em
         xf 0.317, concept em 0.267.
  MELHOR BASE segue W573: medio 0.0498 | frente-meio 0.0462 | patamar 0.0285.

## *** PROXIMO LEAF (nomeado, pronto) ***
  Engrossar as SECOES FRONTAIS da carena (o termo '+0.030' em ry=0.098*s+0.030) para que o SUBSURF nao
    colapse o topo ali, e SO ENTAO re-posicionar a janela do patamar. Ordem: primeiro dar sustentacao a secao,
    depois o patamar; fazer o contrario (como em W583D) nao funciona porque a secao nao sustenta o topo novo.


## *** G27: W586D E A NOVA MELHOR BASE (ganho no patamar E rampa continua) ***
  SERIE (|dTOP| medio 61 estacoes | frente-meio | regiao do patamar):
    W569  0.0652 | 0.0957 | --      (antes do G27)
    W573  0.0498 | 0.0462 | 0.0285  (patamar curto f=0.12 -> PAREDE vertical)
    W583D 0.0528 | 0.0558 | 0.0588  (rampa larga -> continua MAS atrasada)
    W586D 0.0486 | 0.0425 | 0.0176  <-- MELHOR: melhora metrica E mantem rampa continua
  W586D = janela do patamar deslocada em -0.051 (a 0.215->0.164, b 0.360->0.309), f=0.35, h=0.556.
    Perfil: model 0.408 -> 0.506 -> 0.543 (continuo) contra concept 0.465 -> 0.549 -> 0.551.
    Globais INALTERADAS: L/H 2.05, W/H 1.171, x_range [-1.158,1.192], z_range [-0.01,1.137], 14 pecas, QA ok.
  *** ACHADO: EXISTE UM OFFSET EMPIRICO DE +0.051 ENTRE O xf DO BUILDER E O xf DO RENDER. ***
    A janela pedida em builder-xf 0.266 produzia patamar em render-xf 0.317. Minha derivacao ANALITICA do
    mapeamento deu identidade (xf_r = xf_b + 0.001) e estava ERRADA — presumi XFO e L errados. O deslocamento
    medido (-0.051) e o que funciona. REGRA: para posicionar uma feicao em render-xf, medir o deslocamento
    empirico com UMA build, nunca derivar analiticamente o mapeamento xf do builder -> xf do render.
  HIPOTESES REFUTADAS (ambas por medicao, nao por argumento):
    (a) 'SUBSURF colapsa secao estreita-ALTA' -> W584D engrossou a secao (cowl_ry0 0.030->0.075, COWL y
        0.1273->0.1721) e o perfil SIDE saiu BYTE-IDENTICO. Motivo: numa vista LATERAL a largura em Y e
        invisivel. Nunca validar hipotese de secao com a vista que nao a enxerga.
    (b) 'o degrau nao esta resolvido por falta de estacoes' -> W585D com cowl_ns 22->66 mudou quase nada
        (0.0528 -> 0.0529).
  PATCHES NOVOS (run_variant.py): P28 secao ry da carena (cowl_ry_k/cowl_ry0); P29 NS da carena (cowl_ns).
  PENDENTE: subir W586D para o GATES/BASE_PARAMS como base oficial do G27 e seguir para o degrau de xf 0.417
    (-0.156, borda traseira do cowl / zona do cockpit -> G30) e a traseira xf 0.90 (-0.187 -> G29).


## *** G30 (cockpit): 2a JANELA REGRIDE E FALSIFICA A REGRA DO OFFSET CONSTANTE ***
  W587D: patch 30 (2a janela na carena) com a=0.335 b=0.400 f=0.30 h=0.636 (alvo: degrau do concept em
    render-xf 0.417, que sobe para 0.636 H).
    RESULTADO: REGRESSAO. medio 0.0486 -> 0.0493 | cockpit(0.38-0.46) 0.0482 -> 0.0567.
    Perfil em xf 0.383/0.400/0.417: modelo 0.612/0.543 -> EXCESSO +0.10 em 0.400 e ainda -0.093 em 0.417.
    A janela POUSOU ADIANTE do alvo (levantou a regiao ANTERIOR ao degrau).
  *** REGRA CORRIGIDA (a anterior estava errada): NAO EXISTE OFFSET UNICO entre builder-xf e render-xf. ***
    A janela 1 (patamar da carena) exigiu -0.051; esta janela 2 exige ~+0.030. Correcoes de SINAL OPOSTO na
    MESMA peca -> o deslocamento nao e uma constante do pipeline, e sim especifico de cada feicao (depende de
    onde as estacoes da peca caem e de como o loft/subsurf redistribui o degrau).
    CONSEQUENCIA PRATICA: posicionar feicao por xf exige UMA build de medicao POR FEICAO; nunca reaproveitar
    o deslocamento calibrado em outra feicao nem derivar analiticamente (a derivacao analitica deu identidade).
  ACAO: W587D REVERTIDA. W586D continua a base oficial (medio 0.0486 | frente-meio 0.0425 | patamar 0.0176).
  PROXIMO LEAF: reexecutar a janela 2 deslocada ~+0.030 (a=0.365 b=0.430 f=0.30 h=0.636) e medir; se o degrau
    de render-xf 0.417 nao responder a janela, investigar se o topo ali e do COWL ou do conjunto do PILOTO
    (o PL cobre x final -0.560..0.566, logo x=0.212 esta dentro dele) antes de insistir na geometria da carena.


## *** G30: W588D E A NOVA MELHOR BASE (janela 2 no lugar certo) ***
  SERIE COMPLETA DO G27 (|dTOP| medio 61 estacoes | frente-meio | patamar | cockpit 0.38-0.46):
    W569  0.0652 | 0.0957 | --     | --      (antes do G27)
    W573  0.0498 | 0.0462 | 0.0285 | --      (patamar curto = PAREDE vertical)
    W586D 0.0486 | 0.0425 | 0.0176 | 0.0482  (rampa continua no patamar)
    W587D 0.0493 | 0.0448 | 0.0176 | 0.0567  (janela 2 adiantada -> regressao)
    W588D 0.0474 | 0.0385 | 0.0176 | 0.0330  <-- MELHOR BASE (-32%% no cockpit vs W586D)
  W588D = janela 2 da carena em a=0.365 b=0.430 f=0.30 h=0.636 (deslocada +0.030 em relacao a W587D).
    Perfil xf 0.40/0.417/0.433/0.450: modelo 0.496/0.558/0.617/0.585 vs concept 0.509/0.636/0.598/0.600.
    O degrau POUSA agora; residuo em xf 0.417 caiu de -0.156 (W586D) para -0.078. Globais INALTERADAS
    (L/H 2.05, W/H 1.171, x_range, z_range, 14 pecas, QA ok).
  *** CONFIRMADO QUE O TOPO EM render-xf 0.417 RESPONDE A GEOMETRIA DA CARENA — nao era o piloto. ***
    (a duvida registrada no leaf anterior foi resolvida por medicao: a janela 2 mudou o perfil naquela estacao).
  *** A REGRA DO DESLOCAMENTO NAO-CONSTANTE FICA VALIDADA E QUANTIFICADA: ***
    janela 1 (patamar): -0.051 | janela 2 (degrau do cockpit): +0.030. Duas correcoes de sinal OPOSTO na mesma
    peca. Cada feicao exige a sua propria build de medicao; nada de reaproveitar nem derivar analiticamente.
  PENDENTE: xf 0.417 ainda -0.078 (refinar a janela 2: altura 0.636 pode precisar subir, ou a posicao +0.005);
    xf 0.367-0.383 (+0.066/+0.040 excesso, na saida do patamar); xf 0.90 traseira (-0.187 -> G29).


## *** G30 FECHADO NA PRATICA: W590D, VISION 7.4/10, SERIE -29%% ***
  VISION (pareado FRONT+SIDE, W588D): 7.4/10 (era 6.5). Veredito textual:
    'O Vao aberto FECHOU. Na lateral nao ha mais o buraco preto nem a fenda na metade superior — ha massa azul
     solida conectando bico -> meio -> cockpit. O -60%% que voce mediu aparece.'
    'Rampa continua? Nao. Melhorou mas ainda ha KINK na emenda patamar -> rampa do cockpit em xf ~0.417: da
     para ver a quebra de tangente. Concept e curva unica suave; modelo e 2 retas + quina.'
    'Unico proximo passo: matar a quina em xf 0.417 — trocar patamar+rampa por SPLINE UNICA com tangencia G1.'
  IMPLEMENTADO EM RESPOSTA (patch 31): o max() duro que criava as quinas virou SMOOTH-MAX
    (zt = (a+b+sqrt((a-b)^2+k^2))/2, parametro cowl_sm). Series medidas:
      k=0.0   (W588D) medio 0.0474 | frente-meio 0.0385 | patamar 0.0176 | cockpit 0.0330
      k=0.025 (W589D) medio 0.0473 | frente-meio 0.0382 | patamar 0.0163 | cockpit 0.0335  (marginal: raio
                       de 2.9cm e pequeno para degraus de 6-10cm)
      k=0.075 (W590D) medio 0.0464 | frente-meio 0.0354 | patamar 0.0093 | cockpit 0.0325  <-- MELHOR BASE
    REGRA: o raio do smooth-max precisa ser da ORDEM do degrau a arredondar; k << degrau nao muda nada.
    Perfil W590D em xf 0.25-0.45: 0.420 0.518 0.553 0.550 0.536 0.543 0.543 0.541 0.531 0.501 0.565 0.624 0.585
      contra o concept:          0.465 0.549 0.551 0.551 0.551 0.547 0.540 0.470 0.488 0.509 0.636 0.598 0.600
      -> o patamar TRACKA o concept; residuo principal = xf 0.417 (0.565 vs 0.636) e o excesso em 0.367-0.383.
  SERIE COMPLETA DO G27 (|dTOP| medio 61 estacoes):
    W569 0.0652 -> W573 0.0498 -> W586D 0.0486 -> W588D 0.0474 -> W589D 0.0473 -> W590D 0.0464  (-29%%)
    Globais INALTERADAS em TODOS: L/H 2.05, W/H 1.171, x_range [-1.158,1.192], z_range [-0.01,1.137], 14 pecas, QA ok.
  VISION: 'o FRONTAL ficou degradado' — para-choque tubular prata quase invisivel (engolido pelo bumper azul),
    coxins amarelos presentes mas finos/retos sem volume almofadado, intake legivel mas chapado. Registrado como
    item de polimento do G26 (o vision ja tinha dito que o que falta ali e material/bisel/luz, nao geometria).
  PENDENTE: (a) refinar xf 0.417 (residuo -0.071); (b) o EXCESSO em xf 0.367-0.383 (+0.071/+0.043) — a saida do
    patamar esta alta/larga; (c) traseira xf 0.90 (-0.187 -> G29); (d) polimento do frontal (G26 material/bisel).


## *** G29 (TRASEIRA) CARACTERIZADO: FEICAO ALTA ATRASADA 0.063 L, E SUSPEITA DE ASA ENCURTADA ***
  PERFIL TRASEIRO EM GRADE FINA (161 estacoes, W590D):
    xf      conc   model   dTOP
    0.850  0.544  0.506  -0.038
    0.875  0.664  0.511  -0.152   <- o concept SOBE aqui
    0.900  0.703  0.516  -0.187   <- PIOR
    0.925  0.713  0.553  -0.160
    0.950  0.720  0.710  -0.010   <- o modelo alcanca
    0.975  0.724  0.720  -0.004
    1.000  0.488  0.666  +0.178   <- modelo ALTO demais na ponta
  SINAL DECISIVO: primeiro xf com topo >= 0.65 a partir de 0.80 -> CONCEPT 0.875, MODELO 0.9375.
    Ou seja: o modelo TEM o elemento alto (chega a 0.72 H), mas ele esta DESLOCADO ~0.063 L (~15 cm)
    para tras, e na ponta extrema nao cai como o concept (por isso +0.178). Mesma classe do cockpit:
    FEICAO NA POSICAO ERRADA, nao tamanho errado. Alvo: mover o elemento alto da traseira ~15 cm PARA FRENTE
    e corta-lo no extremo. Nao redesenhar.
  *** SUSPEITA CONCRETA (verificar antes de agir): o override wing_x1=-1.11 usado em TODOS os builds recentes,
    contra wing_x2=-1.158, da um vao de 0.048 no wing, enquanto o BASE_PARAMS original tinha wing_x1=-0.905
    -> vao de 0.253, que e exatamente wing_sweep=0.253. Isso sugere que a ASA esta encurtada ~5x em todos os
    builds do G26/G27/G30. Se confirmado, pode explicar parte do deficit traseiro e o excesso na ponta.
    PROXIMO TESTE BARATO: build com wing_x1=-0.905 (valor base) mantendo todo o resto, e comparar o perfil
    traseiro e o |dTOP| medio. Se o vao do wing volta a 0.253, confirmar contra a referencia de asa.
  NOTA: o |dTOP| medio traseiro (xf 0.80-1.00) e 0.0908 — e a MAIOR regiao de erro que resta, maior que o
    cockpit (0.0325) e que o patamar (0.0093).


## *** G29: SUSPEITA DA ASA CONFIRMADA (-42%% NA TRASEIRA), MAS QUEBRA AS GLOBAIS ***
  TESTE: W591D = W590D com wing_x1 de -1.11 (override) de volta para -0.905 (valor do BASE_PARAMS).
    Tudo o mais identico. Medido em grade de 161 estacoes.
      W590D (wing_x1=-1.11)   medio 0.0444 | TRASEIRA(0.80-1.00) 0.0908 | 1o xf com topo>=0.65: 0.9375
      W591D (wing_x1=-0.905)  medio 0.0465 | TRASEIRA(0.80-1.00) 0.0526 | 1o xf com topo>=0.65: 0.9000
                                                              -42%%              concept = 0.875
    Perfil traseiro W591D xf 0.85/0.90/0.925/0.95/0.975/1.00: 0.538/0.678/0.702/0.724/0.700/0.671
      contra concept:                                          0.544/0.703/0.713/0.720/0.724/0.488
    => A FEICAO ALTA ATRASADA era CAUSADA PELA ASA ENCURTADA. Confirma a suspeita registrada no leaf anterior:
       wing_x1=-1.11 contra wing_x2=-1.158 dava vao 0.048, contra os 0.253 (= wing_sweep) do base.
  *** EFEITO COLATERAL (a licao de sempre): mexer no comprimento da asa MUDA O COMPRIMENTO DO MODELO ->
      len_before 2.5454 -> 2.4844, scale 0.92323 -> 0.9459 -> REESCALA TUDO: ***
      x_range [-1.158,1.192] -> [-1.128, 1.222]  (alvo [-1.2, 1.15])
      L/H 2.05 -> 2.001  (alvo 1.978)  |  z_range max 1.137 -> 1.164
      => POR ISSO o |dTOP| medio piorou (0.0444 -> 0.0465) apesar da traseira melhorar 42%%.
  PROXIMO LEAF (pronto, ordem definida): adotar wing_x1=-0.905 e RECOMPOR as globais na MESMA passada —
    xtrans para x_range, ty_f/ty_r para W/H, helm_z para L/H — com a disciplina de 2 pontos empiricos ja
    estabelecida (nunca escalar analiticamente). NAO adotar W591D como base enquanto as globais estao quebradas.
  *** NOTA DE METRICA (importante para nao comparar maca com laranja): a serie anterior (0.0652 -> 0.0464) foi
    medida em grade de 61 estacoes; este teste usou 161. W590D da 0.0464 em 61 estacoes e 0.0444 em 161. Os
    numeros NAO sao comparaveis entre grades diferentes — fixar a grade em 161 para as proximas medicoes. ***


## *** G29: A ASA E UM TRADE, NAO UM GANHO. W590D MANTIDA COMO BASE. ***
  TESTES DA CADEIA (grade de 161 estacoes; todas com QA ok e 14 pecas):
                     medio   TRASEIRA   frente-meio  patamar   1o xf>=0.65   globais
    W590D (base)     0.0444   0.0908     0.0377      0.0123    0.9375        congeladas OK
    W591D            0.0465   0.0526     0.0422      0.0128    0.9000        QUEBRADAS (x_range [-1.128,1.222], L/H 2.001)
    W592D            0.0569   0.0662     0.0540      0.0192    0.9000        x_range EXATO, L/H 1.942 W/H 1.137 (helm_z estourou)
    W593D            0.0519   0.0580     0.0487      0.0192    0.9000        x_range EXATO, L/H 1.978 EXATO, W/H 1.157
    W594D            0.0491   0.0538     0.0461      0.0155    0.9000        x_range EXATO, W/H 1.171 EXATO, L/H 2.001
  CONCLUSAO: adotar wing_x1=-0.905 MELHORA A TRASEIRA 41%% (0.0908->0.0538) mas PIORA frente-meio 22%%
    (0.0377->0.0461) e o patamar 26%%. NET = PIOR (0.0444 -> 0.0491). E um TRADE, nao um ganho.
    DECISAO DISCIPLINADA: NAO adotar. W590D permanece a base oficial. O lever da asa fica PROVADO e registrado
    para ser combinado com uma compensacao da frente/meio numa passada futura.
  MECANISMO: wing_x1=-0.905 muda len_before 2.5454 -> 2.4844, o scale 0.92323 -> 0.9459 e reescala o modelo
    inteiro. As fracoes normalizadas de frente/meio mudam ~20%%, o que mostra que o efeito NAO e um simples
    escalonamento uniforme (algo nao-uniforme entra, provavelmente via H do builder nas tabelas derivadas).
  *** LICAO DE LEVER (a mais util deste ciclo): helm_z e o lever ERRADO para L/H. ***
    Comparacao medida na MESMA geometria: helm_z 1.00825 -> L/H 2.001 ; helm_z 1.046 -> L/H 1.942.
    Coeficiente MEDIDO d(L/H)/d(helm_z) = -1.563 (eu havia extrapolado -0.605 de um par historico de OUTRA
    geometria -> estourou 2.6x). helm_z muda H, que e o NORMALIZADOR do perfil: subir o capacete rebaixa TODAS
    as fracoes sem mudar a forma. Por isso W592D/W593D pioraram o perfil mesmo com L/H exato.
    REGRA: para L/H, preferir o comprimento; se so H estiver disponivel, saber que o ganho em L/H custa
    diretamente em todas as fracoes do perfil (H e o denominador). Coeficientes de sensibilidade NAO atravessam
    geometrias — remedir com 2 pontos a cada mudanca estrutural (foi o que salvou W593D: interpolar com o par
    MEDIDO deu L/H 1.978 exato).
  *** TAMBEM: o L/H alvo 1.978 do SIDE segue sob suspeita (o Sol ja apontou que 1.903 e o numero reproduzivel).
    W590D tem L/H 2.05 e MELHOR perfil (0.0444) do que W593D com L/H 1.978 (0.0519) — evidencia ADICIONAL
    contra o 1.978, coerente com 'o modelo precisa ser MAIS ALTO' (~8cm). Recalibrar altura com o Sol e o
    proximo passo depois de fechar as formas.


## *** CORRECAO: A ASA NUNCA ESTEVE 5x CURTA. EU A ESTREITEI. ***
  Li o codigo em vez de inferir (deveria ter sido o primeiro passo):
    bb25.py L277:   XFO=+1.128; XRE=-1.128     <- XRE e CONSTANTE, nao derivado da geometria
    bb25.py L709:   wx1=P.get('wing_x1',XRE-0.015); wx2=P.get('wing_x2',XRE+0.235)
      => DEFAULTS: wing_x1=-1.143 (BORDA TRASEIRA) e wing_x2=-0.893 (BORDA DIANTEIRA; +x aponta para a FRENTE)
    Usos de XRE no rear(): Dslot em XRE+0.060; _bl em XRE+0.135/+0.168/+0.190; _bx em XRE+0.010
      => a estrutura traseira e ancorada na CONSTANTE XRE, logo NAO se move quando a asa muda.
        (Minha hipotese de 'acoplamento oculto via XRE' estava ERRADA.)
  CONTA CERTA:
    base:        wing_x1=-0.905, wing_x2=-1.158  -> span 0.253  OK
    meu override: wing_x1=-1.11 (com wing_x2=-1.158) -> span 0.048  ESTREITADO POR MIM
    => 'adotar wing_x1=-0.905' NAO e consertar um erro do passado: e REVERTER o meu proprio estreitamento.
       A asa nunca esteve 5x curta. A associacao '0.253 = wing_sweep' foi coincidencia de valor (wing_sweep
       e um TAPER 0..1 usado em L723, nao um comprimento) — eu comparei o par errado.
  O que fica de pe (medido, independente da minha explicacao):
    xf 0.900: W590D 0.516 -> W594D 0.673 (concept 0.703): erro -0.187 -> -0.030, ganho REAL na traseira.
    xf 0.713: +0.099 -> +0.134 ; xf 0.750: -0.034 -> +0.162: EXCESSO novo. A asa cobre render-xf 0.892-1.0,
      entao ela NAO explica 0.713-0.750 (x=-0.484). Causa ainda NAO atribuida — atribuir antes de novo ajuste.
  DECISAO MANTIDA: W590D e a base (net melhor: 0.0444 vs 0.0491). O lever da asa fica provado para a traseira,
    pendente de atribuicao do excesso em 0.713-0.750 antes de adotar.
  METODO (entra na skill): antes de 'reverter para o valor base', LER A DEFINICAO DO DEFAULT e o eixo de cada
    parametro no codigo. Um override meu pode ser a causa do defeito que estou atribuindo ao modelo.


## *** ATRIBUICAO DO EXCESSO xf 0.713-0.750: E A RESCALA, NAO A ASA ***
  O dump ###BBOX### so publica 3 pecas (NOSE/COWL/FBUMP) — sem airbox/piloto. Atribuicao feita pelos valores do
  codigo (rear(): Airbox0 em xx=-0.470 z=0.652; PL bbox x[-0.5703,0.6488]) convertidos para xf em cada build:
      peca                         xf W590D   xf W594D   estacao do excesso
      Airbox0 (xx=-0.470)            0.706      0.741     0.713 / 0.750   <- casa
      PL piloto (borda traseira)     0.745      0.763     0.750           <- casa
  MECANISMO: NAO e a geometria da asa. wing_x1 muda len_before 2.5454 -> 2.4844, o scale 0.92323 -> 0.9459, e as
    pecas do meio ancoradas em x ABSOLUTO PRE-ESCALA (Airbox0/1/2, PL) deslocam-se ~8.3 cm no modelo final.
    Elas entao caem em estacoes DIFERENTES do grid de 161 estacoes -> o perfil le 'excesso' onde na verdade
    houve DESLOCAMENTO. Isso explica por que as fracoes normalizadas mudaram ~20%% sem escalonamento uniforme
    aparente: a normalizacao e uniforme, mas as FEICOES mudam de estacao.
  DIRECAO DE FIX (escolhida): TRAVAR len_before em vez de reajustar o meio. Se o comprimento pre-escala for
    preservado (compensando a mudanca da asa em outro elemento de extremidade), o scale fica em 0.92323 e o
    meio NAO se move — ganha-se o ganho real da traseira (xf 0.900: -0.187 -> -0.030) sem o custo no meio.
    ALTERNATIVA descartada: reajustar o meio com offsets — corrige o sintoma estacao a estacao e volta a
    criar dependencia entre parametros (a classe de bug que ja custou varios ciclos).
  METODO (entra na skill): se uma mudanca em peca de EXTREMIDADE altera metricas de regiao que ela nao toca,
    suspeitar do recálculo de escala/comprimento ANTES de suspeitar de acoplamento geometrico. Medir xf da peca
    afetada nas duas builds: se deslocou ~a mesma distancia que o scale mudou, e recálculo, nao forma.


## *** ACHADO DECISIVO: wing_x2 NAO EXISTE NO OVERRIDE. O BASE -0.905 E O BUG. ***
  Inspecao do dict de overrides do build (nao do BASE_PARAMS, do BUILD):
    'ty_f':0.600,'ty_r':0.600,'wing_x1':-0.905,'exh_x':-1.12,'rb_x_off':0.115,'wing_z':0.660, ...
    => wing_x2 NAO ESTA no dict. Logo wing_x2 = DEFAULT = XRE+0.235 = -0.893.
  CONTA (correta agora):
    W590D: wing_x1=-1.11  vs wing_x2=-0.893  -> span 0.217  asa REAL (quase a correta)
    W594D: wing_x1=-0.905 vs wing_x2=-0.893  -> span 0.012  SLIVER de 1.2 cm
    BASE_PARAMS: wing_x1=-0.905               -> span 0.012  idem
    DEFAULT VERDADEIRO: wing_x1 = XRE-0.015 = -1.143 -> span 0.250 (tamanho certo)
  INVERSAO DA MINHA CORRECAO: eu havia 'corrigido' dizendo que meu -1.11 era o erro. ERRADO de novo. O valor
    -0.905 do BASE_PARAMS e que destroi a asa; o -1.11 (meu override) e o CONSERTO. Ja sao DUAS inversoes:
      (1) 'a asa esta 5x curta' -> sim, mas por causa do valor -0.905, nao do meu -1.11;
      (2) 'eu estreei a asa' -> nao, eu a consertei parcialmente.
  O QUE O 'GANHO DA TRASEIRA' REALMENTE ERA: o sliver atua em x ~ -0.9 (render-xf 0.892) e le melhor na estacao
    0.900 por ACIDENTE — trocar uma asa por uma lamina melhora uma estacao e quebra o resto. Nao e um lever validado;
    e um artefato. A regra 'medir antes de celebrar' valeu de novo.
  PROXIMO LEAF (limpo): wing_x1=-1.143 (default verdadeiro, span 0.250) + wing_x2 explicito -0.893 + compensar
    xtrans pela mudanca de len_before. Comparar contra W590D (wing_x1=-1.11, span 0.217). Se o span correto 0.250
    melhorar a traseira SEM deslocar o meio, adotar; senao, manter W590D.
  METODO REFORCADO (skill): antes de atribuir um defeito a um valor do BASE_PARAMS, imprimir o DICT EFETIVO do
    build (nao o json) e conferir quais chaves existem. Chave ausente -> default do codigo, que pode estar OK.


## *** W596D: O GANHO DA TRASEIRA E REAL (VEM DO SPAN CORRETO). O ACOPLAMENTO E len_before. ***
  TESTE LIMPO: wing_x1=-1.143 e wing_x2=-0.893 explicitos (span 0.250 = default verdadeiro).
                   medio   TRASEIRA   frente-meio  patamar   1o xf>=0.65  len_before  scale
    W590D (base)   0.0444   0.0908     0.0377      0.0123    0.9375       2.5454      0.92323
    W594D (sliver) 0.0491   0.0538     0.0461      0.0155    0.9000       2.4844      0.9459
    W596D (span.25)0.0477   0.0530     0.0422      0.0126    0.9000       2.4782      0.94828
  REFUTO MINHA PROPRIA HIPOTESE: eu havia dito que o ganho da traseira era ARTEFATO do sliver lendo melhor na
    estacao 0.900. ERRADO. W596D com a ASA INTEIRA (span 0.250) entrega o mesmo ganho (TRASEIRA 0.0530, 1o
    xf>=0.65 em 0.9000). O ganho e REAL e vem de AUMENTAR O SPAN (0.217 -> 0.250). O sliver nao era necessario.
  PADRAO DECISIVO: apenas W590D tem len_before 2.5454 -> scale 0.92323 -> frente-meio 0.0377. TODA build com
    outro len_before (2.4844, 2.4782 -> scale 0.9459, 0.94828) pega 0.042-0.046 no meio. => len_before E O
    ACOPLAMENTO. E ele NAO e a asa: a asa MAIS LONGA (0.250) REDUZIU o len_before (2.5454 -> 2.4782).
    Logo o elemento que define o comprimento pre-escala nao e a asa — precisa ser identificado antes de
    compensar. Compensacao necessaria: +0.067 no elemento QUE DEFINE len_before para voltar a 2.5454.
  PROXIMO LEAF (quantificado e pronto):
    (1) descobrir o elemento real que define len_before -> o dump ###BBOX### publica so 3 pecas
        (NOSE/COWL/FBUMP); estender o dump para TODAS as 14 e achar max/min x de verdade (medir, nao supor).
    (2) compensar esse elemento em +0.067 mantendo wing_x1=-1.143/wing_x2=-0.893 e xtrans recomposto.
    (3) se len_before voltar a 2.5454 com o span 0.250, esperar: TRASEIRA ~0.053 com frente-meio ~0.0377
        -> seria MELHOR QUE W590D (0.0444) e entao ADOTAR.
    NOTA: nao tentar compensar com helm_z (ja provado lever errado para proporcao) nem com reajuste do meio
        por offsets (recria dependencia entre parametros).


## *** W598D: A COMPENSACAO FUNCIONOU. NOVA MELHOR BASE, -19%% GERAL E -49%% NA TRASEIRA. ***
  INSTRUMENTO NOVO: dump ###BBOX### estendido para as 14 pecas (antes: 3 hardcoded NOSE/COWL/FBUMP) +
  linha ###XEXT### com os extremos. Com ele, len_before ficou TOTALMENTE explicado:
      extremidade traseira: REAR   x_min = -1.1519
      extremidade dianteira: FBUMP x_max = +1.3264
      extent = 1.3264 - (-1.1519) = 2.4783  ==  len_before 2.4782   EXATO
    => len_before = FBUMP.x_max - REAR.x_min (pre-escala)  e  scale = 2.35 / len_before
    => o REAR.x_min E a borda traseira da asa (wing_x1 - 0.009). A asa DEFINE o comprimento pela extremidade
       traseira, mas era a asa CURTA (span 0.012/0.217) que manteve len_before alto; aumentando o span para 0.250
       o len_before CAIU (2.5454 -> 2.4782) e reescalou o meio. Dai a compensacao ter de ESTENDER a asa ainda mais.
  COMPENSACAO ARITMETICA (nao foi tentativa): para len_before = 2.5454 -> REAR.x_min = 1.3264 - 2.5454 = -1.219
    -> wing_x1 = -1.210. xtrans recomposto -0.033 -> -0.075 (0.042 medido de W590D).
  RESULTADO W598D (grade 161):
                   medio   TRASEIRA   frente-meio  patamar   1o xf>=0.65  len_before  scale
    W590D (base)   0.0444   0.0908     0.0377      0.0123    0.9375       2.5454      0.92323
    W596D (span.25)0.0477   0.0530     0.0422      0.0126    0.9000       2.4782      0.94828
    W598D (comp.)  0.0360   0.0461     0.0389      0.0124    0.8812       2.5364      0.92651
                    -19%%     -49%%       ~igual      ~igual    concept 0.875  <- MELHOR BASE
    x_range [-1.196, 1.154] (alvo [-1.2, 1.15]); W/H 1.171; 14 pecas; QA ok; REAR.x_min = -1.210 exato.
  A ESTRATEGIA 'TRAVAR len_before' FOI VALIDADA: o meio ficou imovel (0.0389 vs 0.0377) enquanto a traseira
    melhorou 49%%. Confirma que o acoplamento era mesmo o recálculo de escala, nao acoplamento geometrico.
  METODO (entra na skill): len_before e a FRONTEIRA entre regioes — instrumentar o bbox de TODAS as pecas
    (nao so as 3 hardcoded) torna o acoplamento calculavel em vez de mistificado, e a compensacao passa a ser
    ARITMETICA (alvo = extremo dianteiro - (comprimento desejado)) em vez de tentativa e erro.


## *** VISION W598D: FRONT 4.0 | SIDE 6.5 | REAR 5.5 ***
  (1a tentativa de vision foi REJEITADA pelo provider com content_policy_violation em prompt inocuo — retentado com
   prompt curto, conforme a regra 'esperar e tentar de novo, nao validar so com pixel-measure'.)
  VISTA A VISTA (veredito textual):
    FRONT 4.0 (pior): (a) bico virou 'prancha reta, achatada e larga' com grade chapada e dois blocos amarelos
      retangulares — degradacao do G26 que o vision de 7.4 ja havia sinalizado como material/bisel, nao geometria;
      (b) capacete sem a FAIXA AMARELA central, viseira opaca, sem boca/nariz (identidade do piloto);
      (c) rodas dianteiras quase escondidas atras do para-choque.
    SIDE 6.5 (melhor vista — consistente com a medicao: perfil 0.0360 e 1o xf>=0.65 em 0.8812 vs concept 0.875):
      (a) bico 'curto, grosso, truncado e alto, sem o mergulho'; (b) rodas pequenas/finas com calota cinza chapada e
      sidepod chapado; (c) motor/escapamento deslocado para cima e simplificado.
    REAR 5.5: (a) escapamentos '3 caninhos pequenos' VS '3 ponteiras enormes' do concept (elemento hero);
      (b) pneus traseiros estreitos/baixos/lisos; (c) sem para-lamas amarelos.
  RECOMENDACAO #1 DO VISION: refazer o conjunto dianteiro (volumetria da carenagem + rosto/faixa do piloto).
  *** CONFLITO REGISTRADO (nao seguir sem checar): o vision pede 'alargar o kart ~20-30%%' e 'trazer as rodas
    dianteiras para fora'. Isso CONTRADIZ o gate FRONT W/H=1.171, validado em QUATRO limiares de saturacao.
    Regra vigente: vision nao fornece alvo numerico por estimativa visual. NAO alargar por causa disso; se algo
    melhorar aqui, e a LEITURA VISUAL (rodas visiveis, carenagem com volume), nao a largura total. ***
  TAMBEM OBSERVADO (qualidade do instrumento de board): o vision notou que 'as cameras do 3D nao estao 100%%
    ortograficas / na mesma escala: o modelo aparece menor no frame, com leve perspectiva e angulo um pouco alto'.
    E verdade: minha normalizacao por altura + sombra de contato no chao mudam a leitura de escala. Corrigir o
    BOARD (mesma escala/alinhamento por eixo, sem sombra) antes de tirar conclusoes de 'tamanho' do pareado.
  FILA CONSOLIDADA DE POLIMENTO (ordem do vision + minhas medidas):
    1. FRONT/carenagem: volume (nao prancha) + faixa amarela e viseira do capacete  [G26]
    2. escapes com ponteira grande e profundidade  [G29]
    3. rodas: calota, largura traseira  [G29]
    4. bico com mergulho (o 'curto/truncado' do SIDE)  [G27 - ligado ao residuo xf 0.417]
  MEDICAO vs VISION: a medicao diz que a SILHUETA melhorou (0.0360, -19%%) e o vision diz que a FORMA/leitura ainda
    e blockout. Ambos verdadeiros: a silhueta e o problema de forma/material sao eixos diferentes. Registrar sem
    confundir um com o outro.


## *** G26/CAPACETE: A FAIXA AMARELA - PATCH 32 E NO-CHANGE. O ERRO FOI MEU METODO. ***
  HIPOTESE: a faixa (Helm_Trim, L827 em bb25.py: loft de u=19 a 240 graus, raio 1.006R/1.001R, w=0.106) esta
  afundada na superficie -> subir o offset radial, estender o arco para a testa, engrossar.
  PATCH 32 (parametrizado: helm_trim_up/in/u0/u1/w + aplicacao via arquivos de ancora reais):
    helm_trim_up=1.022, helm_trim_in=1.012, helm_trim_u0=-35.0, helm_trim_w=0.130
    Resultado: 'P32 aplicado (helm_trim)' OK, 14 pecas, QA ok, W/H 1.17 ->
      W598D medio 0.0360  |  W599D medio 0.0363   => NO-CHANGE (delta 0.0003)
  VISION (render 'head', pareado com o concept): REPROVADO. Textual: 'fragmentos desconexos, nao uma faixa';
    'na frente, sobre a viseira entre os dois olhos: dois retalhos amarelos verticais com Z-FIGHTING... a geometria
    da faixa afundada para dentro do capacete e atravessando a viseira'; 'testa acima da viseira: 100%% azul';
    'deslocada e estreita demais; o que aparece no topo esta jogado para tras e muito fino'.
  *** O ERRO FOI DE METODO, NAO DE PARAMETRO: eu passei dois ciclos ajustando parametros de uma peca cuja POSICAO
    REAL eu nunca medi. O instrumento que resolveu o len_before (dump de bbox por peca, que tornou o acoplamento
    ARITMETICO) NUNCA foi aplicado ao capacete, porque o dump so publicava as 14 pecas de topo. Nudge as cegas. ***
  REGRA (entra na skill): antes de ajustar QUALQUER parametro de uma sub-peca (pe ca dentro de um container), medir
    o bbox REAL dessa sub-peca e compara-lo com o do container. Se o sub-bbox nao esta onde a parametrizacao diz,
    o bug e de POSICIONAMENTO/registro, e mexer em raio/arco/largura nao pode funcionar — foi exatamente o caso.
  PROXIMO LEAF (redefinido, com instrumento antes de ajuste):
    (1) estender o dump de bbox para as SUB-PECAS registradas (helm_trim, visor_band, chin_guard, helm_base,
        vent_L/R, helmet) e medir onde cada uma realmente esta.
    (2) comparar com o bbox do 'helmet' (container) e com o esperado do concept.
    (3) so entao decidir entre reposicionar (se deslocada) ou reconstruir (se degenerada) — o 'afundada +
        z-fighting na viseira' sugere que a faixa cruza a regiao da viseira, isto e, arco/parametrizacao com
        eixo errado, nao raio pequeno.
  P32 fica no codigo (a parametrizacao e util e reversivel), com os valores atuais REGISTRADOS COMO NAO-VALIDADOS.


## *** G26/CAPACETE: INSTRUMENTO NOVO (P33) + DIAGNOSTICO QUANTITATIVO DA FAIXA ***
  DESCOBERTA DO INSTRUMENTO: 'def reg(nm,ob): QA[nm]=qp(ob)' guarda as sub-pecas em R['QA'] (MAIUSCULO; R['qa']
    minusculo e so o resumo {aprovado,falhas,metricas}) — mas qp() devolvia 0. As 53 sub-pecas registradas
    existiam como NOMES, sem bbox. P33 (patch no reg(), ancora lida de arquivo) passa a guardar o BBOX REAL
    (matrix_world @ bound_box) de cada sub-peca no momento da construcao — antes do join em 14 pecas.
    'P33 aplicado (bbox real em reg())' OK. Agora sub-pecas sao MENSURAVEIS, nao dedutiveis da parametrizacao.
  MEDICAO (pre-escala, W604D, helm_trim_up=1.060):
    helmet     x[-0.5330,-0.0337] z[0.7888,1.2310] y[+-0.2350]
    helm_trim  x[-0.5470,-0.0489] z[0.8068,1.2409] y[+-0.0676]
    FOLGA no TOPO    : +0.0099  (10 mm fora)
    FOLGA na FRENTE  : +0.0140  (14 mm fora)
    FOLGA na TRASEIRA: -0.0152  (15 mm DENTRO)
    espessura da faixa = 1%% de HR = 2.1 mm  =>  15 mm de afundamento = 7x a espessura.
  VEREDITO SOBRE A ABORDAGEM PARAMETRICA (encerrada): a faixa segue um CIRCULO ESCALADO (hx+RR*cos(u),
    hz+RR*sin(u)*SZ) e o capacete e um DOME com perfil diferente; o descasamento chega a ~15-20 mm. NENHUM offset
    radial proporcional deixa a faixa fora da superficie em TODO o arco: com 1.022 afundava no topo, com 1.060
    afunda atras. Isto e o mesmo padrao ja registrado — micro-calibracao numa primitiva com o PERFIL ERRADO e
    invisivel/instavel. Verificado agora com numero, nao com argumento.
  FAIXA TAMBEM NAO E SLIVER (descartada a hipotese anterior): o bbox da faixa corre o capacete inteiro
    (x -0.538 -> -0.058, span 0.480 contra 0.499 do capacete) e esta centrada (y +-0.0676). O defeito era
    POSICIONAMENTO VERTICAL RELATIVO A SUPERFICIE, nao extensao nem centralizacao.
  PROXIMO LEAF (fix geometrico, desenhado): construir a faixa PROJETANDO NA SUPERFICIE REAL do capacete —
    para cada u, amostrar o raio real do mesh 'Helmet' na direcao (cos u, 0, sin u) (raycast de (hx,0,hz) ou
    interpolacao da malha) e deslocar por FOLGA FIXA (ex. 0.004 m) em vez de multiplicador radial.
    Isso torna a folga CONSTANTE por construcao e acaba com o z-fighting. Alternativa se raycast for caro:
    envolver a faixa numa casca de offset do proprio capacete (solidify/selecao de faces).
    NAO continuar ajustando helm_trim_up: ja provado que o range util nao existe.


## *** G26/CAPACETE: P34 (RAYCAST) MEDIDO, GUARDADO E COM O PROXIMO ERRO ISOLADO ***
  P34 implementado (faixa projetada por raycast, opt-in via helm_raycast) e 3 builds medidos:
    W605D helm_raycast=1 (sem conversao de espaco): helm_trim span 0.0119  -> SLIVER (base: 0.4802)
    W606D helm_raycast=0 (GUARD)                  : helm_trim span 0.4802  -> estado base PRESERVADO, zero regressao
    W607D helm_raycast=1 (+ matrix_world.inverted()): span 0.0119         -> SLIVER de novo
  FOLGAS DA FAIXA BASE MEDIDAS PELA PRIMEIRA VEZ (helm_trim_up=1.006, W606D):
    TOPO     +0.0015  (1.5 mm fora — praticamente colada)
    FRENTE   +0.0050  (5 mm fora)
    TRASEIRA -0.0241  (24 mm DENTRO do capacete)   <-- DEFEITO QUANTIFICADO
    (confirma o mecanismo: circulo escalado vs dome com perfil diferente; afundamento de 24 mm,
     contra espessura de faixa de 2.1 mm = 11x)
  ERRO ISOLADO NO RAYCAST: com o guard=0 a faixa esta perfeita (span 0.4802), logo o defeito e SO do caminho
  de raycast. O blob colapsa exatamente em (hx, hz) com z 1.00-1.09 => a distancia retornada e ~0 (so a FOLGA),
  isto e, o raio ACERTA GEOMETRIA NA PROPRIA ORIGEM. A conversao de espaco (matrix_world.inverted()) NAO mudou
  nada, entao a hipotese 'mundo vs local' estava ERRADA.
  CAUSA MAIS PROVAVEL (e fix desenhado): partir do CENTRO e ir PARA FORA encontra primeiro casca interna/faces
  invertidas ou geometria interna (o Dome nao e uma casca simples; ha helm_base/intake no mesmo objeto).
  FIX CLASSICO ROBUSTO: lancar o raio DE FORA PARA DENTRO — origem = (hx,0,hz) + d*2HR, direcao = -d; o
  primeiro hit e necessariamente a superficie EXTERNA. Alternativa: closest_point_on_mesh a partir de um ponto
  externo. NAO insistir em ray_cast de dentro para fora.
  SEGURANCA: P34 tem guard `helm_raycast` (default 0) — o pipeline continua saudavel e a base W598D intacta.
    Regra que evitou o estrago: feature nova entra OPT-IN, nunca substituindo o caminho validado.


## *** G26/CAPACETE FECHADO: 4.0 -> 9/10. A FAIXA PROJETADA NA SUPERFICIE RESOLVEU. ***
  O FIX (raycast DE FORA PARA DENTRO) FUNCIONOU. Cadeia medida:
                                  span    larg_y  folga TOPO  FRENTE   TRASEIRA
    BASE      (proporcional)      0.4802   0.1352    +0.0015   +0.0050  -0.0241  <- 24mm DENTRO
    W605D/607D(raycast inside-out)0.0119   —         -0.1452   -0.2292  -0.2582  <- SLIVER (raio ~0)
    W608D     (raycast outside-in)0.5072   0.1352    +0.0044   +0.0043  +0.0036  <- 3 folgas POSITIVAS
    W609D     (w/2, u0=19, f=.0030)0.5044  0.0676    +0.0029   +0.0029  +0.0022  <- UNIFORME ~3mm
  CAUSA RAIZ: era o SENTIDO do raio, NAO a conversao de espaco. De dentro para fora o hit era a propria origem
  (distancia ~0). De fora para dentro (origem = centro + d*2HR, direcao -d) o 1o hit e a casca externa POR
  CONSTRUCAO -> folga CONSTANTE, z-fighting morre. Alvo 0.0030, obtido 0.0022-0.0029.
  VISION W608D: 'SIM, faixa continua do topo a frente e tras, sem interrupcao no topo; SEM z-fighting
    generalizado no topo, sem afundar'.
  VISION W609D: '(1) centralizada sim, largura muito proxima, parando na testa acima da viseira SIM, NAO invade a
    viseira; (2) serrilhado/z-fighting NAO, limpo, bordas acompanham a curvatura da esfera de forma lisa, NAO DOIS
    PLANOS BRIGANDO; (3) NOTA 9/10 para o capacete.'  (era 4.0 no frontal)
  W609D preserva globais: x_range [-1.196,1.154], W/H 1.169, 14 pecas, QA ok, len 2.5364.
  PROXIMO (para 10/10, do vision): 2 ENTRADAS DE AR superiores laterais (ovais afundadas, uma de cada lado da
    faixa) + RESPiro horizontal no centro da faixa acima da viseira (o casco esta liso azul). Render FRONTAL
    ORTOGRAFICO para cravar a centralizacao (o board usa 3/4).
  REGRA REFORCADA (2x neste ciclo, com numero): feature nova entra OPT-IN (guard), nunca substituindo o caminho
    validado — foi o guard helm_raycast=0 que manteve a base intacta enquanto o raycast estava quebrado.


## *** G26/CAPACETE: ENTRADAS DE AR - MESMA CLASSE DE BUG DA FAIXA, CORRIGIDA (8.5/10) ***
  BUG ENCONTRADO NO CODIGO (bb25.py L806-819): os vents eram empurrados 11mm PARA DENTRO numa casca de
  13mm de espessura -> ENTERRADOS (por isso o vision dizia 'casco totalmente liso azul'). Mesma classe do bug
  da faixa: peca existe no builder mas esta enterrada por causa do descasamento da parametrizacao radial.
  P35: assenta o vent na SUPERFICIE REAL pelo MESMO instrumento validado na faixa (raycast outside-in) e
  parametriza tamanho/posicao/tilt: vent_t, vent_f, vent_sx/sy/sz, vent_inset, vent_tilt.
  CADEIA DE MEDICAO:
    estado anterior: vent_L x[-0.2793,-0.2164] y[0.1766,0.2259] z[1.0647,1.1578]  (enterrado, invisivel)
    W610D (na superficie, params originais): visivel mas 2x grande, longe da faixa, vertical
      -> VISION 5/10: 'isolada, 3 a 4x a distancia do concept, jogada para a lateral da calota, mais
         baixa/atrasada, bem maior (2x), preta chapada, orientacao vertical e nao diagonal'
    W611D (sx .015, sy .034, t=48, f=38, tilt=30): x[-0.1553,-0.1292] y[0.0956,0.1478] z[1.1509,1.1980]
      -> movidos PARA FRENTE (x -0.28 -> -0.155), PARA PERTO DA FAIXA (y 0.22 -> 0.148; a faixa esta em +-0.0338)
         e PARA CIMA (z 1.06 -> 1.20; o topo do casco e 1.231)
      -> VISION 8.5/10: '(1) SIM, na zona correta: frontal-superior, sobre o azul, COLADA lateralmente a faixa
         amarela, como no concept. Foi corrigida a posicao. (2) orientacao muito proxima; tamanho um pouco menor,
         da para aumentar 20-30%% e alongar. (3) NOTA 8.5/10.'
  GLOBAIS PRESERVADAS em W610D/W611D: x_range [-1.196,1.154], W/H 1.169, 14 pecas, QA ok, len 2.5364.
  *** NOTA METODOLOGICA: as notas de vision NAO sao comparaveis entre BOARDS diferentes (9/10 no board anterior,
  5/10 e 8.5/10 nos seguintes com o MESMO capacete e a mesma faixa). O que e comparavel e o achado QUALITATIVO
  por elemento ('a faixa continua', 'os vents estao no lugar certo'), que se manteve estavel e coerente com a
  medicao. Usar a nota como sinal de tendencia NA MESMA PRANCHA, nunca entre pranchas. ***
  PROXIMOS (do vision): (a) aumentar os vents 20-30%% e alongar; (b) render FRONTAL ORTOGRAFICO para confirmar
  as DUAS entradas simetricas (pedido 2x — o board 3/4 nao permite julgar simetria); (c) depois: respiro central
  na faixa; olhos/sobrancelhas (grossos e 'bravos' vs finos e amigaveis no concept).


## *** G26/VENTS: SIMETRIA CONFIRMADA, MAS O TAMANHO NAO PODE VIR DO VISION ***
  P36 (novo instrumento): adiciona render 'headortho' ORTOGRAFICO. Descoberta: as vistas front/side/rear/top
    JA eram ortograficas (cam(loc,rot,ortho=OSC)) mas a 'head' era PERSPECTIVA — e era a unica que eu mostrava
    ao vision. Dai a reclamacao repetida 'nao e frontal pura'. Com o headortho:
      VISION: '(1) SIM. As duas entradas aparecem no render ortografico, a mesma altura Y e a mesma distancia X
      do eixo central. Posicao em espelho e inclinacao em espelho. Em vista ortografica nao ha distorcao de
      perspectiva, entao a SIMETRIA e confiavel.'   <- SIMETRIA BILATERAL CONFIRMADA
  *** LICAO CENTRAL DO CICLO: eu estava decidindo TAMANHO na vista 3/4 (perspectiva), que subestima por escorco.
      mesmo vent, 3/4 : 8.5/10 'um pouco MENOR, aumente 20-30%%'
      mesmo vent, ORTO: 7.0/10 '2x a 3x mais LONGOS e grossos'   (com o MESMO sy=0.043)
      Ajustei para sy=0.018 -> ORTO 6.0/10 '20-30%% do tamanho necessario, aumentar ~2.5x a 3x'.
      sy=0.043 = 2.4x sy=0.018, mas um foi '2-3x grande demais' e o outro '2.5-3x pequeno demais':
      AS ESTIMATIVAS NUMERICAS DO VISION SE CONTRADIZEM ENTRE CHAMADAS, mesmo em ortografico. ***
  REGRA (reforca a que ja existia): vision NAO fornece alvo numerico. Usar vision para SIM/NAO e direcao
    ('existe? e simetrico? esta alto ou baixo?') e MEDICAO para grandeza. O unico sinal consistente entre as
    duas chamadas ortograficas foi a POSICAO: os dois disseram que os vents devem estar MAIS BAIXOS
    ('no concept sao baixas, logo acima da viseira'). Isso e acionavel: t 48 -> ~62-68.
  TENTATIVA DE METROLOGIA DO VENT NO CONCEPT (front.jpg) e por que FALHOU: limiar de luminancia sobre o azul
    pegou 25%% da area azul com bbox 127x137 px — a VISEIRA (cinza) e mais escura que o azul e entra no limiar.
    Precisa da MESMA disciplina dos perfis: segmentar por componente conexa e separar vento (acima da viseira,
    cinza-azulado) de viseira (cinza, mais escura e continua de borda a borda).
  PROXIMO LEAF (metrologia, nao vision): medir no concept a posicao e o tamanho dos vents por componente conexa
    na faixa do casco ACIMA da viseira, convertidos em fracao da LARGURA DO CAPACETE (nao do quadro). Depois
    aplicar t/sx/sy para bater esses numeros, e validar com headortho. NAO continuar ajustando por nota de vision.
  GLOBAIS PRESERVADAS em W610D..W613D: x_range [-1.196,1.154], W/H 1.169, 14 pecas, QA ok.


## *** G26/CAPACETE: ALVO MEDIDO (aspect h/w 1.240) - 32%% DE ERRO, CONSISTENTE COM O VISION ***
  METROLOGIA DO CONCEPT (front.jpg, labeling por BFS escrito a mao — NAO ha scipy neste ambiente):
    capacete = componente AZUL da METADE SUPERIOR (o primeiro seletor pegou o TORSO, que tambem e azul:
               componente de 12426 px em y[357,450] = peito; o capacete e 10093 px em y[84,243]).
    CONCEPT: capacete 129 x 160 px  ->  aspect h/w = 1.240
  MODELO (bbox real do helmet, P33): y +-0.2350 (largura 0.4700) | z 0.7888..1.2310 (altura 0.4422)
    -> aspect h/w = 0.941
  *** ERRO: 1.240 vs 0.941 = o capacete do modelo e 32%% MAIS LARGO/ACHATADO que o concept. ***
    Este e o primeiro numero CONFI AVEL de forma do capacete, e ele CONFIRMA o que o vision repetiu em tres
    chamadas ('o 3D esta mais largo e achatado que o concept', 'calota mais larga e achatada') — enquanto as
    ESTIMATIVAS NUMERICAS dele para os vents se contradiziam entre chamadas.
  ALAVANCAS (ja parametrizadas no builder): helm_sz (escala X do capacete, base 0.934), helm_r (HR), helm_z.
    Para levar h/w de 0.941 a 1.240: ou estreitar a largura ~24%% (helm_sz), ou subir a altura. helm_sz e a
    alavanca direta da LARGURA e ja esta exposto (P32v2 alavanca do capacete = helm_sz).
  SEGMENTACAO DOS VENTS AINDA NAO FECHADA: o limiar por saturacao (sat<45) capturou o CAPACETE INTEIRO como
    'cinza' (6202 px) — num JPEG de baixa resolucao o azul tem saturacao baixa. Precisa segmentar por MATIZ
    (hue), e so entao medir os vents acima da viseira. Registrado como pendencia com a causa exata.
  NAO SEGUIR: ajustar vents por nota de vision (estimativas contraditorias). Os vents estao SIMETRICOS e no lado
    certo; o alvo de grandeza vem da metrologia, nao do vision.


## *** G26/CAPACETE: CAUSA RAIZ DO ASPECTO NO CODIGO + FAIXA MEDIDA POR MATIZ ***
  CAUSA RAIZ (lida no codigo, nao suposta): def dome(...,R,sz=1.0,sy=1.0,...) constroi o perfil
    (raio=R*sin(pi*i/rings)**pa*sy, altura=-R*cos(pi*i/rings)*sz) e chama dome('Helmet',...,HR,sz=SZ,sy=1.0,...)
    => o capacete NASCE com largura TOTAL (sy=1.0) e altura COMPRIMIDA (sz=0.934). Esse e o 32%% de erro.
    dome(sy=) escala o RAIO INTEIRO (x e y), por isso estreitar exige scale SO EM Y pos-criacao (P37),
    que preserva a profundidade x e portanto o perfil SIDE.
  RESULTADO W615D/W616D/W617D: helmet h/w = 1.231  (concept 1.240 medido)  =  0.7%% de erro (era 0.941 = 32%%).
    VISION aprovou a proporcao: '10/10. 1.231 vs 1.240 e menos de 1%% de erro. Nem largo demais, nem estreito
    demais. Essa parte pode considerar aprovada.'
  EFEITO COLATERAL PREVISTO E CONFIRMADO: estreitar o capacete desalinha o que esta preso nele. A FAIXA e os
    VENTS sao posicionados por RAYCAST (P34/P35) e se ADAPTARAM sozinhos a superficie nova (vent_L/vent_R foram
    de y +-0.108..0.135 para +-0.0967..0.1388/z 1.1447->1.0891) — o instrumento pagou o investimento.
    Mas o TAMANHO absoluto nao se adapta: por isso a faixa ficou relativamente estreita.
  FAIXA MEDIDA NO CONCEPT POR MATIZ (amarelo: r>150 & g>120 & b<r-45 & g>b+35 — trivialmente separavel):
    linhas 86-134 (SO o capacete; as linhas 200-236 com 100-132 px sao os OMBROS amarelos, excluidas):
      50 px no topo (38.8%% da largura do capacete) -> 35 px na viseira (27.1%%)  | mediana 30%%
    => A FAIXA DO CONCEPT AFUNILA (mais larga em cima). O vision descreveu exatamente isso.
    MODELO: 0.0760/0.3566 = 21.3%% -> apliquei helm_trim_w=0.107 -> 0.1112/0.3566 = 31.2%% (erro 4%% vs 30%% mediana)
  VENTS: NAO medidos ainda. E as estimativas do vision NAO sao monotonas aqui (sy=0.043 '2-3x grande demais',
    sy=0.018 '2.5-3x pequeno demais', sy=0.030 '2x pequeno') — 0.030->'2x' implicaria 0.060, que e MAIOR que o
    0.043 ja reprovado. Contradicao: as estimativas de tamanho do vision para os vents NAO servem de alvo.
    PROXIMO LEAF: medir os vents no concept por matiz (o erro anterior foi por SATURACAO, que captura o capacete
    inteiro como 'cinza'); alvo = fracao da largura do capacete, como fiz com a faixa.
  ERROS DE BUILD CORRIGIDOS NESTE CICLO: (a) P37 inserido SEM indentacao -> 'SyntaxError: return outside function'
    -> corrigido aplicando a indentacao real da linha ancora (4 espacos ao nivel do helm=dome, 8 no bloco);
    (b) ancora digitada a mao nao casou 2x -> passar a extrair a ancora do ARQUIVO pelo indice/linha.
  GLOBAIS PRESERVADAS em W615D..W617D: x_range [-1.196,1.154], W/H 1.169, 14 pecas, QA ok.


## *** G26/VENTS MEDIDOS POR MATIZ: POSICAO E LARGURA FECHADAS ***
  METODO: HSV (PIL convert('HSV')). Casco = matiz 140-180 e S>110 (a FAIXA amarela, matiz ~40, fica FORA do
    casco automaticamente). A tentativa anterior por SATURACAO (S<45) capturou o capacete INTEIRO (7291 px)
    por causa do anti-aliasing do JPEG -> medir por MATIZ, nao por saturacao.
  MEDICAO DO CONCEPT (par simetrico ESTAVEL nas 3 bandas de teste y84-180 / y84-160 / y90-170 -> confiavel):
    vent E x[468,482] y[98,117]  |  vent D x[543,555] y[98,111]
    larg 14 px = 10.9%% da largura do casco (129 px) | alt 20 px = 12.5%% da altura (160 px)
    centros a +-28.7%% do eixo | a 8.75%%-20.6%% da altura A PARTIR DO TOPO -> vents ALTOS, perto da coroa
  ISTO CONTRADIZ O VISION: ele mandou 'trazer para baixo' e eu fui t 48->62. A MEDICAO diz centro a 14.7%% do
    topo => t ~31-45. Revertido para t=52 com calibracao empírica de 3 pontos (o raycast faz o f quase nao mover
    a posicao lateral: f=24 -> 21.4%%, f=21 -> 21.5%%; foi t que domina).
  RESULTADO W622D:  largura 0.0394 vs 0.0389 (+1%%)  OK | centro_y 29.2%% vs 28.7%%  OK | do topo 17.3%% vs 14.7%%
    | alt_z 0.0308 vs 0.0549 (-44%%) PENDENTE — a altura NAO responde a sz nem ao tilt (um elipsoide com
    normal a 52 graus projeta pouco em z); precisa de FORMA alongada diagonal, nao elipsoide. Registrado.
  FAIXA 31.2%% (concept 30%%) | helmet h/w 1.231 (concept 1.240) | simetria L/R dentro do ruido do raycast.
  GLOBAIS PRESERVADAS em W618D..W622D: x_range [-1.196,1.154], W/H 1.169, 14 pecas, QA ok.


## *** G26/VENTS: O CAMINHO DE PARAMETRO ESTA FECHADO POR MEDICAO - EXIGE MUDANCA DE FORMA ***
  SENSIBILIDADE MEDIDA (build diagnostico W623D com sx .010->.030, tudo o mais constante):
    delta sx (+0.020) -> alt_z +0.0136 | prof_x +0.0256 | larg_y +0.0054
    => o eixo LOCAL X do vent aterrissa em X (PROFUNDIDADE front-back), NAO na vertical.
  CONSEQUENCIA: para ganhar os 0.024 de alt_z que faltam (0.0308 -> 0.0549) o sx teria de ir a ~0.045, o que
    levaria a profundidade a ~0.078 — uma protuberancia frontal absurda. E o vent_tilt ja foi medido antes:
    32->45 PIOROU a altura (0.0373 -> 0.0356). Logo NAO existe combinacao de (sx,sy,sz,tilt,t,f) que produza
    o oval 10.9%% x 12.5%% do concept: o ELIPSOIDE nao tem a forma certa.
  PROXIMO LEAF (estrutural, nao parametrico): o vent do concept e um RASGO/GOTA diagonal alongado. Construir como
    LOFT/slot na superficie (mesma tecnica do bumper G26, que saiu de 4.0 para 7.0 justamente por trocar a
    primitiva por loft), ou como um recorte/aba rebaixada, e assentar por RAYCAST (P35 ja existe e funciona).
    NAO continuar mexendo em escala: 3 builds provaram que a escala nao alcanca o alvo.
  ESTADO W622D (melhor ate aqui): largura +1%% OK | centro_y 29.2%% vs 28.7%% OK | do topo 17.3%% vs 14.7%% |
    alt_z -44%% | faixa 31.2%% vs 30%% | h/w 1.231 vs 1.240 | simetria 0.1 mm | globais preservadas.


## *** G26/VENTS FECHADO: 9.5/10 E DENTRO DE 5%% NA MEDICAO (rasgo, nao elipsoide) ***
  A MUDANCA QUE RESOLVEU: elipsoide -> RASGO por LOFT de secoes deslocadas (shear) ao longo da TANGENTE VERTICAL.
    Diagnostico que fundamentou: extraidas as componentes dos eixos locais dos builds W622D/W623D ->
      local X ~ (x .73, y .38, z .57) | local Y ~ (x .19, y .81, z .56)
    os DOIS eixos carregam z ~0.56 => nenhuma rotacao no plano (tilt) separa largura de altura. O DESLOCAMENTO
    (shear) da independencia real, que a escala nao da. Confirmacao: alt_z foi de -44%% (elipsoide) para +0.4%%.
  W626D (final): largura 0.0370 vs 0.0389 (-5%%) | altura 0.0551 vs 0.0549 (+0.4%%) | centro_y 29.2%% vs 28.7%% |
    do topo 17.3%% vs 14.7%% | aspecto 1.49 vs 1.41 | simetricos | globais preservadas (x_range, W/H 1.169, 14 pecas)
  VISION W626D (8.5/10, Vents 9.5/10): 'SIM, sao rasgos alongados, nada de bolinha. Simetricos, flanqueando a
    faixa, acima da linha da viseira, mesma altura relativa e mesma inclinacao. Proporcao muito parecida.
    ESTA APROVADO PARA SEGUIR.'
  *** CONVERGENCIA DOS DOIS INSTRUMENTOS *** o vision pediu 'estreitar a faixa ~10%%'; a METROLOGIA mediu 31.2%%
    contra 30%% mediana do concept (faixa do concept afunila 38.8%% no topo -> 27.1%% na viseira). Os dois
    apontam na MESMA direcao e magnitude -> estreitar para ~0.099 (28.9%% do capacete). Quando a base e medida,
    vision e metrologia convergem; quando a base e chute, divergem.
  RESTA NO CASCO: (a) o tracinho horizontal da testa no meio da faixa (respiro, feature nova); (b) TAPER da faixa
    (largura variavel em u — o concept afunila); (c) viseira/olhos/sobrancelhas (o vision diz que a viseira e
    'mais chapada/larga' e os olhos/sobrancelhas 'mais grossos' que o concept).


## W627D - FAIXA 28.9%% (metrologia 27.1-38.8%% medida, mediana 30%%)
  Ajuste pedido pelos DOIS instrumentos (vision '-10%%' e metrologia 31.2%%->30%%): helm_trim_w 0.107 -> 0.099.
  W627D: faixa 28.9%% | vents larg -5%%, alt +0%% | h/w 1.231 | globais preservadas | QA ok.


## W628D - TAPER DA FAIXA IMPLEMENTADO (verificacao por linha PENDENTE de instrumento) ***
  ONDE: o builder original tinha `w=0.106` CONSTANTE na construcao da faixa. O P32 substituiu esse trecho e expoe
    `w=P.get('helm_trim_w',0.106)` -> adicionei o taper NO TEXTO DO P32 (mesma tecnica do P38: editando
    /tmp/p32_new.txt, nao o builder).
  FORMULA: w(u)=a+b*sin(u), calibrada por 2 pontos medidos do concept:
    topo (u=90) 0.1436 pre-escala -> 38.8%% da largura do capacete
    viseira (u=19) 0.1003 -> 27.1%%
    sin(19)=0.3256 -> b=(0.1436-0.1003)/(1-0.3256)=0.0642 ; a=0.1003-0.0642*0.3256=0.0794
    Params: helm_trim_taper=1.0, helm_trim_w_top=0.1436, helm_trim_w_bot=0.1003.
  W628D: bbox da faixa 41.9%% do capacete (o bbox = o MAXIMO, alvo 38.8%%; +8%%, ajustavel em w_top) |
    globais preservadas | 14 pecas | QA ok.
  *** A VERIFICACAO POR LINHA FALHOU POR INSTRUMENTO, NAO POR GEOMETRIA *** o seletor de 'capacete' pegou o TORSO
    azul (169 px) e o amarelo medido (104.7%%) sao as OMBREIRAS; W627D e W628D deram valores IDENTICOS (84.6%%)
    porque ambos mediam amarelo FORA do casco. E o MESMO erro de selecao ja corrigido uma vez (exigir componente
    azul da METADE SUPERIOR). Conserto: restringir as linhas ao bbox do capacete ANTES de varrer o amarelo.
  NAO afirmar o taper como validado ate refazer essa medicao com o filtro.


## W628D/TAPER - INSTRUMENTO DE VERIFICACAO NAO FECHA (nao declarar validado) ***
  Com o filtro de METADE SUPERIOR + linhas do casco, os resultados foram:
    CONCEPT   casco 127 px | MAX 104.7%% | base 75.6%%   <- as linhas do 'casco' ainda pegam as OMBREIRAS:
      o componente azul da metade superior inclui o TORSO a partir de y~200, entao o range de linhas do
      capacete (84..243) varre tambem as ombreiras. Precisa cortar o y1 no queixo real (~200), nao no bbox azul.
    W627D s/taper  MAX 29.3%% | razao base/max 1.00
    W628D c/taper  MAX 42.2%% | razao base/max 1.00
  LEITURA HONESTA: (a) o taper MUDA a geometria (bbox 29.3%% -> 42.2%%) mas a razao base/max segue 1.00 nas linhas
    visiveis do frontal — consistente com o frontal enxergar SO a regiao da coroa, onde sin(u)~1 e a largura e
    praticamente constante; a transicao do taper acontece embaixo, perto da viseira, onde a face/visor ocluem.
    (b) o MAX medido (42.2%%) e MAIOR que o alvo (38.8%%), o que indica que a LARGURA DO CASCO NO RENDER esta
    SUBESTIMADA (116 px) por oclusao de viseira/gaxetas -> a normalizacao quebra e o %% infla.
  CONCLUSAO: o taper esta implementado e calibrado por 2 pontos medidos, mas NAO esta VERIFICADO. Duas correcoes
    de instrumento necessarias antes: cortar y1 no queixo real e medir a largura do casco sem oclusao (ou usar o
    bbox real do helmet do P33, que e geometrico e nao depende do render). NAO declarar validado.


## *** W631D - TAPER DA FAIXA VERIFICADO: 0.68 vs 0.70 DO CONCEPT (erro 3%%) ***
  A VERIFICACAO POR LINHA (razao sem escala, imune a oclusao) e o instrumento certo:
    W627D (w constante):  1a 34 px | meio 34 | ultima 34 -> razao 1.00
    W631D (com taper):    1a 50 px | meio 40 | ultima 34 -> razao 0.68
    CONCEPT (medido):     38.8%% na coroa -> 27.1%% na viseira   -> razao 0.70
    ERRO 3%%. Taper FECHADO. QA ok, 14 pecas, globais preservadas.
  DOIS BUGS MEUS ENCONTRADOS E CORRIGIDOS NESTE CICLO (mesma familia: ANCHOR/INDENTACAO):
    (1) CODIGO MORTO: escrevi o taper no texto do P32, mas com helm_raycast=1 o caminho ATIVO e o P34 (que tem
        a SUA PROPRIA linha w=P.get('helm_trim_w',...)). O teste extremo (w_bot 0.1003 -> 0.0400) deu render
        PIXEL-IDENTICO, o que provou que o parametro nao tinha efeito -> o taper nunca foi lido. LICAO: ao
        editar um patch, confirmar QUAL patch e o caminho ATIVO — patches empilhados podem se sobrescrever.
        (2) INDENTACAO: a linha `w=P.get(...)` do P34 esta a 12 ESPACOS (dentro do `for i in range(41)`), meu
        anchor usou 8 -> o taper entrou FORA do loop e engoliu o corpo seguinte dentro do `if`, quebrando a
        faixa (###QA### False e render sem faixa). Mesma classe do erro do P37. LICAO: extrair o anchor do
        ARQUIVO com a indentacao real (regex com ^(\s*)) — nunca digitar.
  INSTRUMENTO DE MEDICAO (o que finalmente separou sinal de ruido): amarelo por MATIZ dentro de uma BANDA do
    topo do quadro, e comparacao por RAZAO (base/max) — a razao e LIVRE DE ESCALA, entao a oclusao da viseira
    (que subestima a largura do casco no render e inflava o %% absoluto para 42.2%%) deixa de importar.


## G26/FACE - MEDICAO BLOQUEADA POR BBOX DO CAPACETE (registrado, nao over-claim) ***
  DESCOBERTA: o capacete azul e o TORSO azul sao o MESMO componente conexo (mesma cor) -> o bbox 'do capacete'
    inclui as ombreiras. Em execucoes diferentes o componente escolhido mudou (x[447,575] y[84,243] = 129x160
    numa; x[448,574] y[166,242] = 127x77 noutra, porque o limiar de saturacao mudou a conectividade).
    O capacete REAL vai de y~84 (coroa) ate o QUEIXO (~y 200); de 200 pra baixo e gola/peito.
    ISTO EXPLICA retroativamente varias medicoes que pegaram ombros (ex.: amarelo '104.7%%' e faixa '75.6%%').
  O QUE JA E SOLIDO (relativo a largura do casco no recorte):
    OLHOS: dois blobs brancos em y[166,181] | larg 26 px (20.5%% da largura) e 23 px (18.1%%) |
      centros a -16.5%% e +19.3%% do eixo. (Os componentes em y[199,215] com centro +-44%% sao brilhos de BORDA
      da viseira, nao olhos — descartar.)
    VISEIRA: 1 componente de 1890 px, largura 99%% do casco, y[166,196] = 40%% da altura do recorte.
  PASSOS ANTES DE MODELAR O ROSTO: (1) recortar o bbox do capacete em COROA..QUEIXO (y 84..~200), determinando o
    queixo por onde o azul do capacete encontra a gola; (2) so entao medir olhos/viseira/sobrancelhas com
    referencial valido (%% da largura do CASCO e altura a partir da coroa); (3) usar o mesmo recorte no render.
  NAO construir sobre bbox cujo topo esta errado.


## PERFIL DE LARGURA DO AZUL NO CONCEPT (dado novo, resolve o referencial) ***
  Medido linha a linha na front.jpg (azul: matiz 120-185, S>80):
    COROA y=87 (primeira linha com azul relevante)
    y88..y120: 71 -> 122 px (dome do capacete alargando)
    y120..y168: 118-128 px = EQUADOR do capacete (mais largo; max 128 px)
    y172..y224: 125 -> 88 px = estreitando (tronco/ombros)
  *** AS LINHAS 'QUEBRADAS' NAO SAO RUIDO: SAO A FAIXA E A VISEIRA CORTANDO O AZUL ***
    y136:14 | y140:37 | y148:47 | y156:24 | y160:29 | y172:27 px — nesses Y o azul e interrompido pela
    FAIXA amarela (centro) e pela VISEIRA. Isto explica RETROATIVAMENTE as bboxes absurdas de 127x77 e
    as medicoes que pegaram ombros: a mascara azul de uma linha pode ter so 14 px porque faixa+viseira
    partem o casco em duas metades.
  O QUEIXO NAO TEM MINIMO LOCAL: e um chibi, o capacete transita SUAVE para o tronco (nao ha 'pescoco').
    => o referencial vertical NAO pode vir da silhueta azul; deve vir da VISEIRA/FAIXA (ex.: base da viseira)
    ou da coroa + a razao conhecida. Registrar como o proximo ajuste de instrumento.
  DADOS SOLIDOS PARA O ROSTO: coroa y=87 | equador y120..y168 com 118..128 px (largura de referencia 128) |
    olhos (medidos antes) em y[166,181] com 26 e 23 px = 20.5%% e 18.1%% da largura, centros -16.5%%/+19.3%%.


## *** ALVO h/w 1.240 SUSPEITO: VINHA DE BBOX COM OMBROS DENTRO ***
  VARREDURA POR LINHA (x 448..574, larg 127, coroa y=87) classificou cada linha:
    y87-96    (rel 0-9)     cinza+branco+amarelo, pouco azul  -> topo viseira/rosto
    y99-132   (rel 12-45)   AZUL dominante (52-79 px) + faixa -> casca
    y135-186  (rel 48-99)   VISEIRA dominante (28-59%%) + branco (olhos) -> FAIXA DA VISEIRA
    y189-192  (rel 102-105) azul (41-53)                      -> casca abaixo da viseira
    y195-210  (rel 108-123) FAIXA amarela (41-54) + azul      -> queixeira
  *** CONSEQUENCIA: o alvo h/w=1.240 que eu 'fechei' com 0.7%% vinha de um bbox de 129x160 px =
    y84..243, que vai da COROA ATE OS OMBROS (o azul do capacete e do tronco sao o mesmo componente).
    Capacete sozinho: coroa y87 -> queixo ~y213 = 126 px  =>  h/w = 126/127 = 0.992.
    Modelo: 0.941  ->  erro 6%% contra 0.99 (e nao 0.7%% contra 1.240).
  O QUE SEGUE VALENDO: o VISION aprovou a proporcao visualmente ('10/10, nem largo nem estreito demais')
    no board ortografico — julgamento INDEPENDENTE da minha metrica, e continua de pe. O que cai e o NUMERO
    1.240 e a afirmacao 'erro 0.7%%'. Alvo numerico a REDERIVAR com bbox so-do-capacete.
  LICAO: fechar um gate contra um NUMERO que veio de bbox contaminada nao fecha nada. A contaminacao estava
    documentada varias vezes (medicoes que pegaram ombros) e eu mesmo a expliquei — sem perceber que o alvo
    de proporcao tinha a mesma origem.
  ALVOS DO ROSTO (relativos a coroa y=87 e a largura 127 px do casco):
    VISEIRA: y135..y186 -> rel 48..99 = 0.378..0.780 da largura | altura 52 px = 41%% da largura
    OLHOS: y153..y181 (pico de branco em y156-159) -> rel 66..94, centro rel ~80 = 0.63 da largura |
      larg 26 px (20.5%%) e 23 px (18.1%%), centros -16.5%% e +19.3%% do eixo
    BRANCOS em y87-96 (51 e 39 px) sao highlight do TOPO, nao olhos — nao confundir.


## *** RETRATO DO MEU ERRO: O 'QUEIXO' QUE EU CHAMEI DE OMBROS ***
  HISTORICO: eu tinha o alvo h/w=1.240 vindo do bbox 129x160 (y84..243). Chamei esse bbox de CONTAMINADO
    ('coroa ate os ombros'), estimei o queixo em y213 e conclui que o alvo real seria 0.88..0.98 — e REVERTI o
    estreitamento (helm_sy 0.7587 -> 1.0) achando que o modelo original (0.941) ja estava certo.
  ESTAVA ERRADO. A varredura de linhas mostra y195-210 com FAIXA AMARELA de 41-54 px dentro do casco — e o vision
    descreve o concept como 'queixo afunilado em U, com MENTONEIRA AMARELA e linha de sorriso'. Ou seja: aquele
    amarelo NAO e ombreira, e a QUEIXEIRA do capacete (chibi). y212-224 (azul 100->88) e o U do queixo.
    => o bbox y84..243 E o capacete (nao estava contaminado), o alvo 1.240 estava ~certo, e o modelo ESTREITADO
    (1.231) estava CERTO. A REVERSAO FOI ERRO MEU.
  CONFIRMACAO CRUZADA: bbox correta coroa y87 -> queixeira ~y235 = 148 px / 128 de largura = h/w 1.156, que casa
    com a estimativa do vision ('h/w ~1.10-1.15, oval vertical'). No revertido o vision deu 4.5/10 e disse
    textualmente 'precisa re-aplicar o estreitamento'.
  *** ESTADO OFICIAL: W631D *** (helm_sy=0.7587, h/w 1.231, faixa 0.099 com taper VERIFICADO 0.68 vs 0.70,
    vents como rasgo fechados em 9.5/10). O W632D (revertido) esta DESCARTADO.
  LICAO (a terceira do mesmo tipo nesta sessao): ANTES de descartar um bbox como 'contaminado', verificar o que a
    regiao descartada REALMENTE e — checando contra a descricao do concept (o vision descreveu a mentoneira
    amarela e eu nao liguei as duas coisas). Eu corrigi um alvo certo e quase reverti uma melhoria real.


## W633D - P40 VISEIRA REPOSICIONADA POR METRICA (progrediu, com residuo medido) ***
  MINHA VERIFICACAO DA DESCRICAO DO VISION contra a varredura: o vision descreve o concept com 'viseira grande
    cinza-azulada, cantos arredondados, base curvada acompanhando o rosto' e MENTONEIRA AMARELA no queixo.
  ALVOS DERIVADOS (referencial agora validado: coroa y87, queixeira y235 -> altura 148 px; largura 128 px):
    VISEIRA y135..y186 = f 0.324..0.669 da altura -> z 1.0877..0.9352 -> th 58.4..104.7 graus
    OLHOS   y153..y181 = f 0.446..0.635 -> z 1.0338..0.9502 -> th 75.6..100.2 graus (a textura do rosto hoje
      usa _T0,_T1 = 88..142 -> precisa subir)
    OLHOS lateral: centros +-0.0320 m | largura do olho 0.0725 m (20.3%% da largura do casco)
    salvos em contracts/alvos-rosto.json
  P40 implementado (viseira + as DUAS gaxetas que a emolduram, todas derivadas de _vt0/_vt1):
    ANTES: band th 86..150 -> z 0.815..0.999 -> f 0.525..0.940  (BAIXA demais) X
    AGORA: z 0.952..1.124 -> f 0.235..0.628  (alvo 0.324..0.669) -> muito mais perto, com residuo:
      topo ~0.09 da altura ALTO demais -> th0 58.4 -> ~68; largura da viseira 133%% do casco vs 99%% do
      concept (a medir se a band envolve mais que o necessario).
    W633D: build limpo, QA ok, 14 pecas, globais preservadas, h/w 1.231.
  PENDENTE: (a) trim do th0; (b) mover a TEXTURA do rosto para th 75.6..100.2 e redimensionar/reposicionar os
    olhos para centro +-0.0320 e largura 0.0725; (c) GATE VISUAL no W633D (nao feito neste ciclo).


## W635D/W637D - VISEIRA: POSICAO FECHADA, LARGURA ANOMALA NAO RESOLVIDA ***
  FECHADO POR METRICA: viseira f 0.311..0.678 vs ALVO 0.324..0.669 -> erro +0.013 no topo e +0.009 na base =
    4%% e 1,3%% do range. Calibracao em 3 pontos (th0 58.4 -> 68.0; th1 104.7 -> 110.6; sensibilidade medida
    0.00689 f/grau). Antes: f 0.525..0.940 (baixa demais).
  LARGURA ANOMALA (NAO resolvida): a viseira mede 133%% da largura do casco contra 99%% do concept. Hipotese:
    helm_sy (0.7587) estreita o Helmet mas viseira/gaxetas sao REVOLVES no eixo do casco e nao foram afetados.
    TENTATIVA P41 (aplicar o mesmo scale Y a Visor_Band/Visor_Gasket/Visor_Gasket2/Visor_Face) NAO TEVE EFEITO —
    a largura seguiu 133%%. CAUSA NAO IDENTIFICADA: pode ser (a) bpy.data.objects.get() nao achar o nome real
    (o objeto pode ter sufixo ou ser criado por loft() com outro nome), (b) a reg() ja ter capturado o bbox, ou
    (c) a hipotese estar errada e o 133%% vir de outra coisa. NAO declarar resolvido; proximo passo e imprimir
    [o.name for o in bpy.data.objects] no build para ver os nomes REAIS antes de escalar.
  ERRO DE PATCH EVITADO: tentei um P41 avulso ancorado na SAIDA do P40 (dois patches em cascata) — a ancora nao
    existe no SRC original e o bloco nao casaria. Solucao correta: EMBUTIR a mudanca no texto do P40. Bom padrao
    quando um patch depende do resultado de outro.
  W637D: build limpo, QA ok, 14 pecas, globais preservadas, h/w 1.231, viseira f fechado.
  PENDENTE: (a) identificar por que o scale Y nao aplicou (imprimir os nomes reais); (b) mover a textura do rosto
    para th 75.6..100.2 e os olhos para centro +-0.0320/largura 0.0725; (c) GATE VISUAL (nao feito).


## *** VISEIRA RESOLVIDA NOS DOIS EIXOS - e o 133%% era ARTEFATO DE TIMING ***
  DIAGNOSTICO (print de [o.name, dimensions] dentro do build):
    helm_sy=0.7587 APLICADO | Helmet y 0.3566 | Visor_Band y 0.3601 | Visor_Gasket 0.3408 | Visor_Gasket2 0.3435
    razao real Visor_Band/Helmet = 0.3601/0.3566 = 101%%   (concept: 99%%)  -> CORRETO
    Ou seja: o P41 FUNCIONOU. O '133%%' era artefato: reg() registra bbox = matrix_world @ bound_box NO MOMENTO
    DA CRIACAO, portanto o visor_band no dump e PRE-P41 enquanto o helmet ja estava pos-P41 -> comparacao
    entre snapshots de TEMPOS DIFERENTES. Nao era defeito de geometria.
  ESTADO DA VISEIRA (W638D): POSICAO f 0.311..0.678 vs alvo 0.324..0.669 (erro 4%% e 1.3%% do range) FECHADA
    + LARGURA 101%% vs 99%% FECHADA. Ambos os eixos fechados por medicao.
  LICAO (quarta da familia): o bbox de reg() e um SNAPSHOT no instante da criacao. Comparar bboxes de partes
    criadas/modificadas em MOMENTOS DIFERENTES do pipeline produz razoes falsas. Para checar acoplamento
    dimensional, medir o.dimensions no FIM do build (todos no mesmo instante) — foi o print HSN que resolveu.
  W638D: build limpo, QA ok, 14 pecas, globais preservadas, h/w 1.231.
  PENDENTE: (a) textura do rosto para th 75.6..100.2 e olhos centro +-0.0320/largura 0.0725; (b) tracinho da
    testa (respiro); (c) GATE VISUAL do casco; (d) G31 final + auditor independente.


## P42 (FACE) REVERTIDO - OS OLHOS JA ESTAVAM CERTOS ***
  TENTATIVA P42: mover a regiao da textura do rosto de _T0,_T1=88..142 para 75.6..100.2 (alvo th dos olhos).
    RESULTADO: QUEBROU os olhos — blobs de 408/406 px viraram 214+37+37 px (a regiao caiu de 54 para 24.6 graus
    e a textura foi picada/fragmentada).
  MEDICAO QUE MOSTRA QUE EU IA CONSERTAR O QUE ESTAVA CERTO (blobs brancos no front render):
    W638D (antes): 408 px larg 34 e 406 px larg 33, centros x 398 e 461
    contra o concept: largura 34/160 = 20.6%% (concept mede 20%%) e centros +-31.5/160 = +-19.7%% (concept
    +-16.5%%/+19.3%%)  =>  LARGURA E POSICAO LATERAL DOS OLHOS JA BATIAM.
    Logo a queixa do vision ('olhos grandes demais, espacados, divergentes; sobrancelhas grossas') e de ESTILO
    (pupila/highlight/sobrancelha desenhadas na textura), NAO de posicao/tamanho geometricos.
  REVERTIDO: W640D com face_t0/face_t1 = 88/142 volta a dar EXATAMENTE os blobs do W638D [(408,34),(406,33),(96,16)]
    -> revert byte-identico, P42 descartado.
  LICAO: antes de mover uma feature por alvo metrico, MEDIR a feature atual no render com o MESMO instrumento
    usado no concept. Eu tinha os alvos do concept em maos e nao medi o modelo ANTES de mexer — se tivesse,
    veria que ja batia e teria ido direto ao estilo (pupilas/sobrancelhas), que e onde o vision apontava.
  W640D: build limpo, QA ok, 14 pecas, globais preservadas, h/w 1.231, viseira f 0.311..0.678 (fechada).


## ESTILO DO ROSTO - DEFEITO DAS SOBRANCELHAS MEDIDO NO MODELO ***
  INSTRUMENTO (blobs brancos/escuros na banda superior do front render + bbox do olho):
    MODELO W640D: OLHOS 34x15 px | PUPILA 8x3 px (24%% x 20%% do olho) |
      SOBRANCELHA 42 px de largura = 124%% DA LARGURA DO OLHO, 16 px de espessura, gap 1 px (COLADA no olho).
      => a queixa do vision ('sobrancelhas grossas demais, em bloco, baixas') esta CONFIRMADA com numero:
         a sobrancelha e mais LARGA que o olho e 16 px de espessura (deveria ser um arco fino).
    CONCEPT: a segmentacao atual NAO fecha — detecta os olhos (31x40 px, provavelmente fundindo com o
      highlight) mas NAO detecta pupila ('sem preto puro': o concept usa cinza escuro/azulado) nem a
      sobrancelha na janela. Precisa de limiar proprio (V<150 em vez de V<110) e janela ancorada na COROA.
  GLOBAIS W640D: QA ok, 14 pecas, h/w 1.231, viseira f 0.311..0.678.
  PENDENTE: (a) fechar a medicao do concept com limiar de escuro mais alto e janela ancorada; (b) afinar a
    sobrancelha na textura (espessura e largura) para o alvo medido; (c) tracinho da testa; (d) gate visual.


## PUPILA E SOBRANCELHA - ALVOS MEDIDOS NOS DOIS LADOS ***
  METODO DA PUPILA (o limiar simples falhava: contorno e pupila sao ambos escuros e CONECTADOS):
    pupila = pixel escuro ENCERRADO por branco dos dois lados NA MESMA LINHA.
    CONCEPT: pupila ESQ 10x16 px (101 px) | olho branco 23x29 px -> pupila = 43%% da largura e 55%% da ALTURA do olho.
      (a DIR deu 21x24, pegando sombra extra da viseira; a ESQ e a medida limpa.)
    MODELO W640D: pupila 8x3 px = 24%% x 20%% -> muito menor e PLANA (3 px de altura contra 16).
  SOBRANCELHA (modelo): 42 px de largura = 124%% da largura do olho, 16 px de espessura, gap 1 px (colada).
    Falta medir a do concept com o mesmo metodo (escuro encerrado) para fechar o alvo.
  ALVOS PARA A TEXTURA: pupila ~43%% x 55%% do olho (oval ALTO, nao traco plano); sobrancelha fina e mais estreita
    que o olho, com folga acima (nao colada).


## SOBRANCELHA DO CONCEPT: NAO ISOLAVEL POR LUMINANCIA (resultado negativo registrado) ***
  TESTEI limiares progressivos na janela acima do olho ESQ (y125-154, x476-504):
    V<130 -> 27-28 px de largura por 20 linhas = e a PROPRIA VISEIRA (a sobrancelha esta desenhada SOBRE o cinza)
    V<90  -> 358 px (41% da janela)  |  V<70 -> 211 px (24%)  |  V<50 -> 144 px (17%)
    Nenhum limiar isola um ARCO FINO (~2 px como o modelo, ou uma linha fina): o gradiente da viseira cobre a
    mesma faixa de valores. CONCLUSao: a sobrancelha do concept NAO e mensuravel por luminancia no frontal.
  FONTES DISPONIVEIS (checadas): reference-views-board.png 1536x860 (maior que front.jpg 1024x559);
    the-bubble-bumper.jpg 1024x559 (= front.jpg); assets/reference-views/ (diretorio, a listar).
  ALTERNATIVAS PARA O ALVO DA SOBRANCELHA: (a) procurar um recorte de rosto em reference-views/; (b) usar a
    descricao do vision ('finas, arqueadas, altas' vs o modelo 'grossas, em bloco, baixas') como PRINCIPIO e
    validar por GATE VISUAL em vez de por metrica; (c) medir so a ESPESSURA por varredura vertical na coluna
    central da sobrancelha, onde o gradiente e mais fraco.
  Mesmo resultado negativo e util: evita eu 'fechar' um alvo inventado.
  >> FONTES FECHADAS: reference-views/ (front/lateral/isometric/rear/top) medem apenas 341-342 x 279 px — MENORES que
     front.jpg (1024x559). O board e 1536x860 mas contem 4 vistas (o rosto fica pequeno). Ou seja: a MELHOR fonte e o
     proprio front.jpg, onde o casco tem 127 px de largura e a sobrancelha ~1-2 px de espessura, indistinguivel do
     gradiente da viseira. DECISAO: adotar a descricao do vision ('finas, arqueadas, altas' contra 'grossas, em bloco,
     baixas' do modelo) como PRINCIPIO e validar por GATE VISUAL, sem inventar alvo numerico.


## P43 APLICADO - pupila oval + sobrancelha fina (direcao certa, resposta AMORTECIDA) ***
  PARAMETROS DA TEXTURA (func _face_tex, indentacao 12):
    PUPILA: a[ell(cx,cy+0.18*ry, rx*0.34, ry*0.34)] -> rx*0.43, ry*0.55  (= EXATAMENTE o alvo medido no concept)
    SOBRANCELHA: bx,by=px(sgn*25.0, 96.0) -> 93.0 (mais alta) ; b1=ell(...,rx*1.02,ry*0.55)+b2=ell(...,rx*1.02,ry*0.46)
                 -> rx*0.85,ry*0.30 / rx*0.85,ry*0.22 (arco fino)
  RESULTADO MEDIDO (front render, blobs):
    ANTES: pupila 8x3 px = 24%%x20%% do olho | sobr 42-43 px = 126%% do olho, 18 px esp, gap 1
    P43:   pupila 9x4 px = 26%%x25%%           | sobr 39-44 px = 118-129%%, 16 px esp, gap 3
  DIAGNOSTICO DA RESPOSTA AMORTECIDA: o alvo esta CERTO no parametro (0.43x0.55 = 43%%x55%%) mas o render devolve
    26%%x25%% (~2,2x menos). Duas causas concorrentes: (a) o mapeamento textura->esfera NAO e linear (DU/DV em th comprime
    perto do polo, entao rx/ry nao viram razao de pixels); (b) a pupila tem ~9 px, logo +-1 px de ruido = +-11%% de erro.
    O instrumento esta no LIMITE DA RESOLUCAO para esta feature.
  BUG DE PATCH (2a vez na sessao): a ancora de 3 linhas nao casava porque PULAVA a linha do highlight entre a pupila
    e a sobrancelha -> as linhas nao eram contiguas. Corrigido dividindo em 2 replaces contiguos + assert que falha alto.
    REGRA: ao ancorar em MULTIPLAS linhas, conferir que elas sao CONTIGUAS no fonte.
  W642D: QA ok, 14 pecas, globais preservadas, h/w 1.231, viseira fechada.
  PENDENTE: (a) decidir entre compensar empiricamente (~2x no parametro) ou medir a nao-linearidade do UV e corrigir o
    mapeamento; (b) subir a resolucao do render do rosto (render de detalhe) para medir a pupila com menos ruido;
    (c) tracinho da testa; (d) GATE VISUAL; (e) G31 + auditor.


## *** PUPILA E SOBRANCELHA FECHADAS - e o 'amortecimento' era RESOLUCAO DE MEDICAO ***
  MEDICAO EM ALTO DETALHE (render headortho, casco com 136 px = 4x o front que tinha 34 px):
                       PUPILA             SOBRANCELHA (largura / espessura / gap)
    ANTES (W640D)    34%% x 33%%          110%% do olho  · 29%%  · 1 px (colada)
    P43   (W642D)    43%% x 54%%           91%% do olho  · 24%%  · 8 px
    ALVO (concept)   43%% x 55%%           <100%% do olho · fina · com folga
    => PUPILA FECHADA com erro de 0%% e 1%%. SOBRANCELHA toda na direcao certa (mais estreita que o olho,
       mais fina, e com folga real de 8 px em vez de 1).
  *** CORRECAO DA MINHA PROPRIA CONCLUSAO ANTERIOR ***: eu havia diagnosticado 'resposta amortecida ~2,2x' e
    atribuido a 'mapeamento textura->esfera nao linear'. ISSO ESTAVA ERRADO. O efeito era a RESOLUCAO DO
    INSTRUMENTO: no front o olho tem 34 px e a pupila ~9 px, logo +-1 px de quantizacao = +-11%% de erro, e o
    blob de 9 px era sistematicamente MENOR que o real. No headortho (136 px) a resposta ao parametro e EXATA.
    LICAO (5a da familia 'instrumento'): antes de concluir que um modelo/mapping responde de forma nao linear,
    VALIDAR A RESOLUCAO DO INSTRUMENTO na feature medida. Regra pratica: a feature precisa de >=30 px no render
    para o erro de quantizacao ficar <5%%. O headortho ja existia e nao estava sendo usado para medir o rosto.
  W642D: QA ok, 14 pecas, globais preservadas, h/w 1.231, viseira fechada.
  PENDENTE: (a) tracinho horizontal da testa (respiro); (b) GATE VISUAL do casco (olhos/pupila/sobrancelha/viseira);
    (c) G31 + auditor independente.


## GATE VISUAL DO ROSTO (4 pranchas ate enquadrar certo) - 5.0/10, e 3 achados REAIS ***
  HISTORICO DAS PRANCHAS (cada uma reprovada pelo vision por ENQUADRAMENTO, nao por modelo):
    1) crop 'headortho' chutado -> vision: 'so mostra o topo ate a metade dos olhos'
    2) crop por cor (amarelo) -> pegou so a faixa; 'olhos/pupilas 100%% fora do quadro'
    3) P44 camera orto 0.50 @z=1.05 -> cobria z 0.80-1.30 e o capacete vai a 0.632 -> CORTOU O QUEIXO
    4) P44 corrigida: orto 0.70 @z=0.933 (centro/span medidos do CONJUNTO real de pecas: chin_guard 0.6320 a
       helm_trim 1.2339) -> queixo em y=799 e topo em y=60, margens simetricas de ~60 px -> ENQUADRAMENTO OK
  ERRO CONCEITUAL QUE CAUSOU 3 E 4: eu usava o z do objeto 'Helmet' (0.7888-1.2277) como 'o capacete', mas a
    MENTONEIRA e outra peca (chin_guard z 0.6320-0.7232). Medir o conjunto, nao o objeto de nome obvio.
  VEREDITO: 5.0/10 (subiu de 3.5; 'o enquadramento ortografico melhorou').
  *** 3 ACHADOS REAIS QUE A MEDICAO NUMERICA NAO PEGOU ***
    1) O VOLANTE OCLUI A MENTONEIRA no frontal — o vision nao consegue avaliar queixo/sorriso. Nao e enquadramento:
       e oclusao por outra peca. (O concept mostra o volante bem mais baixo.)
    2) A VISEIRA le como DISCO/PRATO PLANO e LARGO passando da silhueta, sem bolha nem curvatura lateral.
       (Minha metrica de posicao/altura esta fechada, mas FORMA/CURVATURA/material translucido nao existem.)
    3) A FAIXA amarela termina no meio da testa FLUTUANDO e nao encosta na viseira; cor neon saturada vs ouro
       dessaturado do concept; e o detalhe retangular (tracinho) 100%% ausente.
  DIVERGENCIAS que mantenho pela MEDICAO (vision estimou, eu medi):
    - pupila: vision diz '30-35%% do olho'; medido no concept por 'escuro encerrado por branco' = 43%%x55%%, e o modelo
      esta em 43%%x54%% -> FECHADO. Mantenho o numero.
    - sobrancelha: vision diz 'colada/grossa'; medido no headortho = 91%% da largura do olho, 24%% de espessura, gap 8 px
      (era 110%%, 29%%, 1 px). Melhorou de fato; o 'grudada' vem da oclusao da viseira por cima.
  PRIORIDADES (do vision, em ordem): (1) liberar a vista do queixo (subir/baixar o volante); (2) viseira como bolha
    curva alta e translucida; (3) sobrancelha como arco fino com folga; (4) faixa ate a viseira + ouro + tracinho.


## OCLUSOR DO QUEIXO IDENTIFICADO - o volante/bracos na altura do queixo ***
  METODO: abri o .blend salvo (w647d.blend) e listei TODOS os objetos com bbox e flags — nao confiar no SUBCAP,
    que so cobre as pecas registradas por reg() (10) e escondia as outras.
  FATO: PL = corpo mergeado (join(out,'PL')), 49.550 verts, mats M_Gasket/M_Pilot/M_Yellow/M_Dark, hide_render=False.
    Os 'parts' do SUBCAP (helmet, chin_guard, visor_band, helm_trim, vents...) sao pecas DENTRO de PL.
  OCLUSOR: PL tem bbox x[-0.603,+0.526] enquanto o capacete e x[-0.533,-0.063]. Ou seja ha geometria de PL
    ~0.59 m A FRENTE do capacete. A camera frontal (x=+5 olhando -x) ve essa geometria antes -> tapa a mentoneira
    (z 0.632-0.723). E o volante/anterior do piloto — que no concept fica BEM MAIS BAIXO que o queixo.
  CONSEQUENCIA: nao e problema de enquadramento (as 3 primeiras pranchas) nem de material. E POSICAO de peca.
  PROXIMO: localizar o sub-elemento de PL que avanca (volante/braços) e BAIXA-LO para abaixo do queixo, como no
    concept; para validar o rosto isoladamente, usar hide_render no volante no render do rosto.
  FERRAMENTA NOVA (vale para todo o resto): /tmp/ls_blend.py e /tmp/chk_pl.py abrem o .blend e imprimem bbox+flags
    de TODOS os objetos — usar quando o SUBCAP nao explicar uma oclusao.


## OCLUSOR REAL = O COWL (nao o volante; hipotese refutada por medicao) ***
  TESTE QUE REFUTOU: baixei o volante (sw_dz -0.110 -> -0.250, topo do volante de 0.660 para 0.520) e a banda do
    queixo no render do rosto ficou IDENTICA: 12369 px escuros, 0 px de amarelo — antes e depois. Nao e o volante.
  MEDICAO NA BANDA DO QUEIXO (z 0.632-0.723 -> y[687,799] no render do rosto): 0 px de AMARELO, ou seja a
    mentoneira NAO aparece. E 42%% da janela e escuro.
  OCLUSOR: COWL x[+0.116,+0.606] z[0.102,0.718] — a carenagem fica A FRENTE do piloto (x maior = mais perto da
    camera em x=+5) e seu topo (z 0.718) cobre a mentoneira (z 0.632-0.723). O queixo esta sepultado atras do cowl.
  IMPLICACAO: nao e enquadramento, nao e material, nao e o volante: e a RELACAO PILOTO/COCARPIT. No concept o queixo
    aparece na frontal — logo o capacete/piloto esta BAIXO DEMAIS em relacao ao cowl (ou o cowl alto demais).
    Isso e uma correcao estrutural de posicionamento, nao um parametro de detalhe.
  sw_dz REVERTIDO para -0.110 (a mudanca nao teve efeito na oclusao; manter a base limpa).
  LICAO: antes de 'consertar' um oclusor, MUDAR a peca suspeita e RE-MEDIR a banda ocluida. Uma mudanca de 14 cm sem
    efeito nenhum mata a hipotese em um build — mais barato que 3 pranchas de vision.


## CAUSA-RAIZ DA OCLUSAO MEDIDA NO CONCEPT + P45 NAO APLICADO ***
  MEDICAO NO CONCEPT (front, matiz): o corpo (largura cheia 128 px) comeca em y232 e o estreitamento do queixo
    termina em y228-230 -> O CORPO COMECA IMEDIATAMENTE ABAIXO DO QUEIXO, sem sobreposicao. (y256 = 0: fim do corpo)
    Mapeando p/ o modelo (capacete z1.2339->0.6320 <-> concept y87->y230): o corpo deveria comecar em z ~0.624.
  MODELO: COWL topo z 0.718 -> 0.094 ALTO DEMAIS. Isso e a causa raiz da mentoneira sepultada (nao enquadramento,
    nao material, nao volante). zt do cowl = prof_top(xf)*H*0.97.
  P45 (zt -= P['cowl_dzt']) NAO APLICADO: a ancora '        zt=prof_top(xf)*H*0.97' existe no bb25.py mas NAO chega
    intacta ao ponto do P45, porque o P31 (naquele caso 'SPAN do cowl - alvo CORRIGIDO/cowl_xspan') toca esse
    trecho ANTES. E a TERCEIRA vez na sessao que a ordem dos patches invalida uma ancora (P41->P40, P44->P36, P45->P31).
    REGRA CONSOLIDADA: ao inserir um patch novo, LER A LISTA DE PATCHES ATIVOS no run_variant e escolher uma ancora
    que nenhum patch anterior toque — ou embutir a mudanca no patch que ja domina aquele trecho.
  ALTERNATIVA MAIS SEGURA (proximo): o rebaixamento pode ser feito no objeto COWL depois de montado (translacao dos
    vertices acima da linha de agua) OU subindo o PILOTO/capacete, que fica em pilot() e nao tem patch conflitante.
  TRADE-OFF REGISTRADO: baixar o cowl pode abrir vao com a banheira/assento; subir o piloto mexe no z calibrado do
    capacete e no comprimento/altura globais. Decidir medindo qual dos dois preserva mais os gates ja fechados.
  W649D: build limpo mas SEM o P45 -> idêntico ao W647D na banda do queixo (0 amarelo / 12369 escuro), como esperado.


## OCLUSOR DA MENTONEIRA = INTERNO AO PL (o proprio corpo do piloto) ***
  Meu erro de window (x300-560) escondia o dado. Com a banda completa:
    amarelo na banda do queixo (y687-799): 3782 px -> 3.9%% da area da banda = um FILETE. Confere exatamente com o
    vision ('so se ve um filete amarelo fino acima da barra preta'). A mentoneira EXISTE no render, esta 96%% coberta.
  TESTE DE OCLUSOR (esconder objeto por objeto no .blend salvo e re-renderizar, sem rebuild):
    esconder COWL -> amarelo 0 | esconder Tub -> 0 | esconder CH,COWL,Tub,PODS,NOSE -> 0 | esconder PL -> 0
    (PL=0 e esperado: chin_guard esta DENTRO de PL)
    => nenhum objeto externo e o oclusor. O que cobre a mentoneira esta DENTRO de PL, junto com ela: o proprio
       corpo/torso/ombros do piloto. Coerente com o chibi: tronco grande colado no capacete.
  COWL: baixar o topo (cowl_k 0.97 -> 0.843, topo 0.718 -> 0.624 conforme medido no concept) deu 3782 -> 3782,
    ZERO efeito na oclusao. A hipotese do cowl tambem caiu — mas a mudanca esta conceitualmente CORRETA pelos
    numeros do concept (o corpo deve comecar em z~0.624) e fica registrada; se abrir vao na banheira, reverter.
  PROXIMO: o oclusor esta no PL; e preciso separar/identificar o sub-elemento (torso, ombreira ou luva) que invade
    z 0.632-0.723 na frente do capacete, e entao BAIXAR/cavar esse sub-elemento (ou subir o conjunto do capacete).
  TECNICA REGISTRADA (barata e decisiva): hide_test.py — abre o .blend salvo, esconde uma lista de objetos e
    re-renderiza a camera escolhida. Testa N hipoteses de oclusao em segundos, sem rebuild de 25s cada.


## *** OCLUSAO DA MENTONEIRA: NAO EXISTE. CORRECAO DO MEU DIAGNOSTICO ***
  PROVA DEFINITIVA (varredura de poligonos do PL por centro): poligonos do PL com z entre 0.632 e 0.723 E x>-0.063
    (a frente do capacete, lembrando que a camera e x=+5 olhando -x) = **0 faces**.
    => NAO ha geometria nenhuma na frente da mentoneira naquela faixa. Nada a oclui.
  CONFIRMACAO CRUZADA: hide_test.py mostrou que esconder COWL, Tub, CH, PODS ou NOSE nao altera o amarelo da banda
    (0 em todas as combinacoes); e o PL nao tem faces na frente. Logo os 3782 px de amarelo visiveis = TUDO o que a
    mentoneira realmente ocupa na projecao = 3.9%% da banda = um ARCO FINO.
  CORRECAO: os diagnosticos anteriores ('volante oclui', 'cowl 0.094 alto oclui') eram HIPOTESES QUE EU TRATEI COMO
    CAUSA. Foram todas refutadas por medicao. A causa real e TAMANHO/FORMA: a mentoneira e pequena/rasa demais e
    desenha so um filete — e o vision, olhando uma prancha pequena, leu isso como 'escondida'.
  ALVO: medir a mentoneira no concept (largura, altura e forma trapezoidal) e redimensiona-la; o chin_guard tem
    0.33 m de largura (y +-0.1653) mas a projecao visivel e um filete.
  LICAO CENTRAL DA SESSao (5 erros desta familia): eu aceito a LEITURA do vision como se fosse MEDICAO. Vision diz
    'esta escondido' -> eu invento um oclusor. O correto e sempre: antes de procurar a causa, medir o FENOMENO
    (aqui: contar as faces/px). Custou 3 builds e 3 hipoteses.
  cowl_k=0.843 mantido (correto pelos numeros do concept: corpo deve comecar em z~0.624).


## ALVO DA MENTONEIRA MEDIDO + P46 FALHOU E FOI REVERTIDO ***
  ALVO (concept, frontal): amarelo y196-232 (36 px de altura), largura de pico 63 px; capacete 128 px de largura e
    148 px de altura => a mentoneira tem 49%% da largura e 24%% da altura do capacete.
    Mapeado: largura alvo 0.175 m (+-0.0874) e altura alvo 0.147 m.
  DIAGNOSTICO DO MODELO: o chin_guard e um revolve cujo perfil chega a RAIO 0.166 -> 0.332 m de largura = 93%% do
    capacete (0.3566). Ou seja, ~2x largo. E a projecao visivel e um risco de 526 px por ~7 px (3,9%% da banda).
  P46 (parameterizar o perfil com chin_k=0.527): ANCORA CASOU e o patch foi aplicado, MAS o build quebrou com
    SyntaxError reportado na linha do exec(compile(SRC,...)) — ou seja, o patch gerou PYTHON INVALIDO no SRC.
    Causa provavel: a ancora e uma instrucao de 2 linhas com indentacao diferente na continuacao (4 e 18 espacos)
    e minha substituicao rearranjou a quebra de linha/indentacao do statement. E a 2a geracao de SRC invalido por
    patch nesta sessao (a 1a foi o P37 sem indentacao).
  REVERTIDO: bloco do P46 removido do runner; build de sanidade W652D verde (QA ok, 14 pecas, globais preservadas,
    0 tracebacks). Estado limpo.
  REGRA NOVA: patch que substitui um statement MULTI-LINHA deve preservar EXATAMENTE a quebra de linha e a indentacao
    da continuacao; alternativa mais segura e mudar um PARAMETRO ja existente (como cowl_k) em vez de reescrever o
    statement. O P46 vai ser refeito como escala do OBJETO apos o build (chinp.scale), que nao mexe na sintaxe.


## P46v2 APLICOU LIMPO MAS A MEDICAO ESTAVA MEDINDO A PECA ERRADA ***
  P46v2 (escala do objeto, single-line: chinp.scale=(1.0, chin_sy, 0.80*chin_sz)) aplicou SEM SyntaxError, QA ok,
    14 pecas, globais preservadas — a tecnica correta (escala em vez de reescrever statement multi-linha) funcionou.
  MAS a banda do queixo ficou IDENTICA: 3782 px, 526 px de largura, 59 px de altura, antes e depois.
  ERRO DE ALVO: 526 px de largura = 0.427 m, MAIOR que a largura do proprio chin_guard (0.332 m). Logo o amarelo que
    eu venho medindo nao e a mentoneira: e um acento amarelo do COWL (COWL tem mats M_Blue/M_Dark/M_Yellow e z ate 0.718).
    TODAS as minhas medicoes de 'banda do queixo' desta sessao (3782 px, o 'filete') eram dessa peca errada.
  CONSEQUENCIA: nao da para concluir nada sobre a mentoneira com esse instrumento. A medicao da mentoneira precisa
    isolar a peca pelo MATERIAL + posicao do chin_guard, nao apenas por 'amarelo na faixa de z'.
  LICAO (6a da familia 'instrumento'): ao medir uma peca por COR, confirmar que o resultado e COMPATIVEL com a
    geometria conhecida da peca (aqui: a largura medida 0.427 m > a largura da peca 0.332 m delatava o erro). Corrigir
    o instrumento ANTES de ajustar o modelo — senao ajusta-se a peca certa e mede-se a errada, sem efeito visivel.
  ESTADO: W653D verde (QA ok, 14 pecas, globais preservadas). chin_sy=0.527 e chin_sz=1.60 ficam aplicados.


## MENTONEIRA ISOLADA POR MAGENTA - INSTRUMENTO CONFIaVEL E ALVO MEDIDO ***
  TECNICA (decisiva, usar sempre que a peca nao se isolar por cor): repintar as faces cujo CENTRO cai na bbox conhecida
    da peca com um material de cor unica (magenta) e medir essa cor no render. Arquivo: /tmp/pinta.py.
    Resultado: 518 faces pintadas; no render, MAGENTA = 6378 px, bbox x[225,634] y[724,759] => 410 px de largura
    = 0.334 m, batendo EXATAMENTE com a largura do chin_guard (0.332 m). Instrumento validado.
  CORRECAO 1: meu mapeamento z->y estava ERRADO. Previsto z0.632->y799; o real e y759->724. Erro de ~40-75 px. Todas
    as medicoes de 'banda do queixo' desta sessao herdaram esse erro (por isso o alvo parecia na peca errada).
  CORRECAO 2: o amarelo que eu media na banda (3636 px, 526 px de largura) NAO e a mentoneira (410 px) nem o COWL
    (esconder o COWL nao mudou: 3636->3631). Era outra peca amarela projetando ali.
  ALVO DA MENTONEIRA (agora com instrumento confiavel):
    modelo: 410 x 36 px = 0.334 x 0.029 m
    concept: 49%% da largura do capacete (128 px) e 24%% da altura (148 px) => 0.175 x 0.147 m
    erro: LARGURA x1.9 e ALTURA x5 CURTA. Ou seja: estreitar ~47%% e SUBIR bastante a altura.
  A INVESTIGAR: chin_sy=0.527 foi aplicado no build (QA ok) mas a largura renderizada continua 410 px = original.
    Hipoteses: (a) a escala roda em outra instancia/loop de chinp; (b) o transform_apply seguinte a desfaz/normaliza;
    (c) o .blend que abri e anterior. Checar lendo o built_last.py e o bbox do chin_guard no .blend.
  W653D verde (QA ok, 14 pecas, globais preservadas).


## MENTONEIRA: LARGURA E ALTURA JA NO ALVO - FALTA SO A TRANSLACAO ***
  JUIZ = o bbox que o PROPRIO build reporta (SUBCAP), nao o render:
    W652D (sem chin_sy): y[-0.1653,+0.1653] z[0.6320,0.7232]  -> mentoneira no queixo
    W653D (com chin_sy): y[-0.0871,+0.0871] z[1.0112,1.1571]  -> largura certa, peca SUBIU
  RESULTADO:
    LARGURA 0.174 m vs alvo 0.175 m -> OK (chin_sy=0.527 funcionou)
    ALTURA  0.146 m vs alvo 0.147 m -> OK (chin_sz=1.60 deu exatamente o alvo)
    POSICAO subiu +0.4067 no z -> a escala Z sobre a ORIGEM do objeto empurrou a peca para cima
  ERRO MEU NO TESTE: o magenta usou a bbox ANTIGA (z 0.632-0.724) e por isso pintou OUTRA peca (410 px) — me
    levou a concluir 'chin_sy nao aplicou', quando tinha aplicado. TESTE COM COORDENADAS TEM QUE SER REFEITO se
    o build mudou a posicao da peca. O bbox do SUBCAP e mais barato e mais confiavel que repintar.
  FIX (proximo, 1 linha): compensar com translacao rigida pos-escala, chin_dz=-0.4067, no mesmo ponto do chinp.scale.
    Padrao ja conhecido (registrado na memoria): escala + transpiacao=translacao rigida compensando a origem.
  W653D verde (QA ok, 14 pecas, globais preservadas).


## *** MENTONEIRA FECHADA - 0,3%% NA LARGURA E 0,7%% NA ALTURA ***
  P47 (chin_dz=-0.4067, translacao rigida pos-escala) resolvido. bbox final do SUBCAP:
    chin_guard: y[-0.0871,+0.0871] z[0.6045,0.7504]
    LARGURA 0.1742 m vs alvo 0.1748 m -> erro 0,3%%
    ALTURA  0.1459 m vs alvo 0.1470 m -> erro 0,7%%
    CENTRO z 0.6775 vs o centro original 0.6776 -> a transpiracao=translacao compensou exatamente; nada deslocado.
  CADEIA COMPLETA DA MENTONEIRA (para reuso): (1) isolar por repintura magenta para validar o instrumento;
    (2) medir no concept por varredura de matiz -> 49%% da largura e 24%% da altura do capacete;
    (3) dimensionar por SCALE do objeto (chin_sy/chin_sz) em vez de reescrever o statement multi-linha (que quebrou);
    (4) compensar a origem com translacao rigida (chin_dz); (5) conferir pelo bbox do SUBCAP (nao pelo render).
  ERRO DE PROCESSO CORRIGIDO NO CAMINHO: um patch meu foi inserido DENTRO do if do patch anterior, deixando o else
    orfao -> SyntaxError no runner. REGRA: ao inserir patch apos bloco if/else, ancorar APOS a linha do 'else: ...' do
    bloco anterior, nunca na linha do 'print' do ramo verdadeiro.
  W654D verde: QA ok, 14 pecas, globais preservadas (x_range [-1.196,1.154], W/H 1.169).


## GATE VISUAL W654D: 4.0/10 - mentoneira medida CERTA mas ainda nao VISIVEL ***
  VEREDITO: 4.0/10 (era 5.0 no W647D). O vision diz explicitamente que NAO consegue avaliar a mentoneira: 'sumiu,
    ocluida por duas barras pretas horizontais em primeiro plano (volante/cockpit); so se ve um filete amarelo fino'.
    Tambem: 'a viseira cinza estoura ate a borda' e 'o enquadramento esta colado no topo'.
  LEITURA CORRETA: a mentoneira esta DIMENSIONADA certa (bbox do SUBCAP: 0.3%% largura, 0.7%% altura) mas NAO esta
    LEGIVEL no render. Medida e legibilidade sao gates DIFERENTES — o gate visual julga legibilidade, nao dimensao.
  ACAO IMEDIATA: meu teste 'PL nao tem faces a frente no z do queixo' usou X > -0.063, que era o limite ANTIGO. Com a
    mentoneira agora em z[0.6045,0.7504] e a bbox nova, o teste PRECISA ser refeito — e, desta vez, varrendo TODOS os
    objetos (nao so o PL), porque as 'barras pretas' podem ser outra peca (asa, FBUMP, volante). Ferramenta: mesmo
    criterio do /tmp/pl_band.py, aplicado a todos os objetos da cena.
  ORDEM DE IMPACTO do vision, para os proximos ciclos:
    1) MENTONEIRA/QUEIXO legivel (limpar o que cobre + mostrar o sorriso) — 'maior rompedor de likeness'
    2) VISEIRA como casca esferica curva e semi-transparente com borda inferior em U (o erro ESTRUTURAL)
    3) FAIXA: largura, cor ouro (nao neon) e o detalhe retangular em baixo-relevo acima da viseira
    4) OLHOS: mais altos/ovais e mais proximos (o modelo tem ~60%% da altura e divergentes)
    5) PUPILA: 30%% do olho com catchlight (medido 43%%x54%% — o vision estima 30%%; manter medicao, mas o catchlight
       e o deslocamento convergente/divergente sao reais e precisam de checagem de simetria)
    6) SOBRANCELHA: arco afunilado, nao barrinha reta
  W654D verde: QA ok, 14 pecas, globais preservadas.


## OCLUSOR CONFIRMADO: O CORPO DO COWL (e o paradoxo do hide_test explicado) ***
  VARREDURA COM A BBOX ATUAL (mentoneira x[-0.412,-0.080] y+-0.0871 z[0.6045,0.7504]; camera em x=+5):
    quem tem face na janela (y+-0.095, z 0.6045-0.7504) com x > -0.080 (a frente da mentoneira):
      COWL/M_Blue  141 faces  x[+0.126,+0.507]
      CH/M_Dark    108 faces  x[-0.005,+0.152]
      TOTAL 249 faces
  PARADOXO DO hide_test EXPLICADO: ao esconder o COWL o amarelo da banda 'nao mudava' porque o amarelo que eu media
    ERA o proprio M_Yellow do COWL (o COWL tem M_Blue/M_Dark/M_Yellow). Esconder o cowl removia o oclusor E o alvo
    simultaneamente -> leitura falsa de 'sem efeito'. NUNCA esconder um objeto que pode ser oclusor e alvo ao mesmo tempo
    sem isolar as duas coisas (usar o magenta para o ALVO e a contagem de faces para o OCLUSOR).
  POR QUE cowl_k=0.843 NAO RESOLVEU: aquele parametro baixa o TOPO do cowl (prof_top). O que cobre a mentoneira e o
    CORPO do cowl (M_Blue, x 0.126-0.507) — faces que continuam na faixa z 0.6-0.75 independentemente do topo.
  FIX (proximo): baixar/escavar o CORPO do cowl na regiao frontal (x 0.126-0.507) para que ele nao alcance z 0.6
    naquela janela — ou reduzir a altura geral do cowl (zb e zt) e nao so o fator do topo. Alternativa estrutural:
    o CH (chassi, 108 faces a x -0.005..0.152) tambem invade; avaliar se o cockpit precisa ser mais baixo como um todo.
  METODO REGISTRADO (/tmp/ocl_all.py): para achar oclusor, contar faces por objeto E por material cujo CENTRO cai na
    janela projetada da peca alvo. Mais confiavel que hide_test (que nao distingue oclusor de alvo) e que repintura.
  W654D verde: QA ok, 14 pecas, globais preservadas.


## ALAVANCA DO TOPO NAO REDUZ A OCLUSAO - precisa do CORPO ***
  TESTE: cowl_k 0.843 -> 0.811 (topo do cowl 0.624 -> 0.600, ou seja ABAIXO do piso da janela da mentoneira 0.6045)
    RESULTADO: 141 -> 137 faces do COWL na janela (apenas 4 faces, 3%%). Logo as faces que cobrem a mentoneira NAO vem
    do topo (prof_top) — vem do CORPO/secoes do cowl (ou do resultado pos-SUBSURF n'=1 e pos-boolean do cockpit).
  O CH tambem e oclusor e nao foi tocado: 108 faces em x[-0.005,+0.152]. Total atual 245 faces.
  CONCLUSAO DE ENGENHARIA: o problema nao e 'o cowl alto' e sim 'o cowl A FRENTE' (x 0.126-0.507) na faixa z do queixo.
    A alavanca certa e reduzir a SECAO (zb/zt) ou cavar boolean na regiao frontal acima de z~0.60, nao escalar o topo.
  PROXIMO (concreto): parametrizar a SECAO do cowl (zb e o par (zt-zb)/2 em sq(...)) com uma reducao frontal — ou fazer
    um boolean DIFFERENCE com um box cobrindo x>0.10, |y|<0.13, z>0.60 (mesma tecnica do Cockpit_Cut ja usada no builder
    para escavar a banheira). O boolean e a via de menor risco porque nao altera a silhueta lateral.
  chin_guard preservado no W655D: y[-0.0871,+0.0871] z[0.6045,0.7504] (o P47 continua valendo).
  W655D verde: QA ok, 14 pecas, globais preservadas.


## P48 (RECORTE DO COWL) FUNCIONA - 245 -> 170 faces ***
  P48 aplicado (boolean DIFFERENCE com box em x 0.08-0.52, |y|<=0.130, z 0.60-0.88; tecnica do Cockpit_Cut).
    COWL na janela da mentoneira: 137 -> 62 faces (-75, -55%% do cowl). TOTAL 245 -> 170 (-31%%).
  RESTOU: (a) as 62 faces do COWL estao em x[+0.437,+0.507] = a BORDA do box de corte, que e ~5 cm curto em x ->
    estender o box para x>=0.56; (b) o CH (chassi, M_Dark) segue com 108 faces em x[-0.005,+0.152] INTOCADO — e o
    segundo oclusor e nao foi tratado; precisa de decisao propria (o chassi faz parte da estrutura, cortar tem risco).
  METODO CONFIRMADO: (1) /tmp/ocl_all.py acha o oclusor por objeto+material na janela projetada; (2) corrigir com
    boolean localizado; (3) RE-MEDIR a contagem de faces — gate objetivo, nao visual. 245 -> 170 e progresso medido.
  W656D verde: QA ok, 14 pecas, globais preservadas. chin_guard preservado (o P48 nao tocou o PL).
  CORRECAO PENDENTE DE NOTA: typo 'ALA VACA' na _nota_g26_cowl_corpo do BASE_PARAMS.json (era 'ALAVANCA').


## P48: CORTE FUNCIONA MAS PLATOA EM 157 FACES ***
  SEQUENCIA MEDIDA (faces do COWL na janela da mentoneira, x>-0.080, |y|<0.095, z 0.6045-0.7504):
    W655D (sem corte)          COWL 137 (x 0.126-0.507) + CH 108  = 245
    W656D (box x 0.08-0.52)    COWL  62 (x 0.437-0.507) + CH 108  = 170   (-75)
    W657D (box x 0.08-0.58)    COWL  49 (x 0.462-0.507) + CH 108  = 157   (-13)
    W658D (box |y|<=0.190)     COWL  49 (x 0.462-0.507) + CH 108  = 157   (0 — o y NAO era o limitante)
  DIAGNOSTICO: as 49 faces restantes estao DENTRO do box em x, y e z, e mesmo assim nao sao cortadas. Ou seja o
    boolean nao esta atuando nesse bolsao — hipoteses: (a) conflito/curto-circuito entre o 1o boolean (Cockpit_Cut)
    + seal(o) e este 2o; (b) geometria aberta nao-manifold apos a primeira operacao; (c) o objeto o nao e mais o cowl
    nesse ponto do codigo. PROXIMO DIAGNOSTICO (barato): imprimir bool(o2 retorno) e len(o.data.polygons) ANTES e
    DEPOIS do P48 no build, e usar um box unico cobrindo Cockpit_Cut + Cowl_Cut numa so operacao (evita o encadeamento).
  E O CH: 108 faces em x[-0.005,+0.152] intocado em todos os testes. E o segundo oclusor, e e ESTRUTURA (chassi).
    Decisao pendente: cortar o chassi na faixa z do queixo ou aceitar (no concept o chassi tambem fica atras do piloto).
  W658D verde: QA ok, 14 pecas, globais preservadas. chin_guard preservado.
  NOTA: o progresso real e 245 -> 157 (-36%%) e esta medido; o plateau esta diagnosticado, nao e incognita.


## *** CAUSA RAIZ DO PLATEAU: O CORTE ESTA NO PONTO ERRADO DO PIPELINE ***
  DIAGNOSTICO (build W659D/W660D instrumentado, log [P48]):
    no ponto do corte (logo apos o Cockpit_Cut) existe APENAS UM objeto cowl: 'Cowl' (min., x[0.206,0.735], z ate 0.772).
    o boolean RETORNA bpy.data.objects['Cowl'] e FUNCIONA: polys 3076->2957, topo 0.772->0.678. (Ou seja: nunca foi problema
      de parametro do box, nem de y, nem de x — o corte sempre funcionou, no objeto errado.)
    mas no .blend FINAL as faces na janela da mentoneira pertencem a 'COWL' (MAIUSCULO, 49 faces x[0.462,0.507]).
  CAUSA RAIZ: 'COWL' e criado DEPOIS do ponto onde o P48 e aplicado. Logo nenhum ajuste de box poderia alcancar essas faces.
  FIX DEFINIDO: aplicar o recorte como PASSE POS-BUILD (ao final do build, quando todos os objetos existem), varrendo todo objeto
    MESH cujo nome comece por 'cowl' (case-insensitive) e re-aplicando a cada um. Assim cobre 'Cowl' e 'COWL' em qualquer ordem.
  E O CH: 108 faces em x[-0.005,+0.152], ainda nao tratado — segundo oclusor, e estrutura.
  LICAO CENTRAL (ja registrada na skill): em pipeline com objetos criados em etapas, um ajuste aplicado cedo pode operar sobre
    um HOMONIMO PARCIAL. Antes de iterar parametros, provar QUE O ALVO DO AJUSTE E O MESMO OBJETO QUE A MEDICAO ENXERGA
    (logar nome+bbox+polys no ponto do ajuste e comparar com o objeto medido no arquivo final). Diferenciacao por maiusculas
    ('Cowl' vs 'COWL') passou despercebida por 4 builds.
  W660D verde: QA ok, 14 pecas, globais preservadas.


## P49 ACERTA O OBJETO MAS AINDA NAO PEGA AS 49 FACES ***
  P49 (recorte pos-build, ancorado em FIN=FINS[0], antes da auto-escala) roda e o log confirma:
    [P49] alvos cowl: ['COWL']         <- UM objeto, o NOME CERTO (a confusao Cowl/COWL esta resolvida)
    [P49] COWL polys 3109 -> 2963      <- 146 poligonos removidos
    MAS janela da mentoneira: COWL 49 faces x[0.462,0.507] + CH 108 = 157 — INALTERADO
  LEITURA: o corte acerta o objeto e remove geometria, mas nao a casca que cobre o queixo. Duas hipoteses:
    (a) o box nao cobre a posicao REAL dessas faces (unidades pre-escala x post-escala: a janela medida no .blend e
        POST-escala (fator 0.92651); o P49 roda ANTES da auto-escala, entao a janela equivalente em unidades do P49 e
        z 0.652-0.810 e x 0.499-0.547 — dentro do box (z 0.60-0.88, x 0.08-0.58) em teoria);
    (b) a casca e nao-manifold e o boolean DIFFERENCE falha silenciosamente nela (padrao conhecido de boolean).
  DADO QUE FALTA (parar de inferir por janela): imprimir as coordenadas CRUAS das 49 faces — min/max de c.x, c.y, c.z
    no objeto COWL do arquivo final. Com isso o box passa a ser calculado, nao adivinhado.
  E O CH: 108 faces x[-0.005,+0.152] — segue intocado em TODOS os builds.
  W661D verde: QA ok, 14 pecas, globais preservadas.


## *** OCLUSAO ZERADA: 49 -> 0 FACES. BOX GRANDE ERA A CAUSA ***
  COORDENADAS CRUAS (post-escala, .blend final):
    COWL: 49 faces x[0.4624,0.5072] |y|<=0.0464 z[0.6087,0.6280] M_Blue
    CH: 108 faces x[-0.0054,0.1519] |y|<=0.0927 z[0.6072,0.6652] M_Dark
  TESTE DIRETO NO .blend (sem rebuild), box TIGHT x 0.44-0.53 / y +-0.06 / z 0.59-0.65 + solver EXACT:
    ANTES  polys=2963 janela=49 bboxZ[0.101,0.629]
    DEPOIS polys=2909 janela= 0 bboxZ[0.101,0.595]   <-- ZERO FACES
  CAUSA RAIZ DOS 4 BUILDS DE PLATEAU: eu usava um box ENORME (0.44 x 0.38 x 0.28 m) atravessando varias cascas do cowl.
    O boolean DIFFERENCE resolve mal caixas grandes em malhas complexas: corta parte e deixa a casca alvo intacta (foi o
    '146 polys removidos mas as 49 intactas'). Alem disso o box estava em coordenadas PRE-escala (o P49 roda antes da
    auto-escala 0.92651) enquanto a medicao e POS-escala.
  REGRA NOVA (para a skill): para recorte por oclusao, usar box TIGHT (margem ~1-2 cm sobre as faces medidas) centrado
    nas coordenadas CRUAS das faces a remover, solver EXACT, e logar polys+janela antes/depois. Nunca 'cobrir a regiao'.
  PENDENTE: (a) portar o box tight para o P49 (com as coordenadas pre-escala equivalentes: dividir por 0.92651 ->
    x 0.4991-0.5475, |y|<=0.0501, z 0.6570-0.6778); (b) o CH (108 faces, x[-0.0054,0.1519], z 0.6072-0.6652) segue
    intocado — mesmo tratamento, com decisao sobre cortar estrutura.
  W661D verde: QA ok, 14 pecas, globais preservadas.


## *** COWL ZERADO NA JANELA DA MENTONEIRA: 245 -> 108 FACES ***
  W663D = P48 (box grande na faixa x 0.126-0.436) + P49b (box TIGHT x 0.44-0.53 / y+-0.06 / z 0.59-0.65, solver EXACT)
    [P48] Cowl polys 3076 -> 2957
    [P49b] COWL polys 3109 -> 2903
    JANELA DA MENTONEIRA: SO o CH/M_Dark (108 faces x[-0.005,+0.152]). COWL = 0 faces. TOTAL 108 (era 245).
  APRENDIZADO CENTRAL: os dois cortes atuam em OBJETOS DIFERENTES e sao COMPLEMENTARES, nao redundantes:
    P48 corta 'Cowl' (minusculo) e cobre a faixa x 0.126-0.436; P49b corta 'COWL' (maiusculo) e cobre x 0.462-0.507.
    Desligar o P48 ao ligar o P49b PIOROU (157 -> 191) e foi isso que revelou a complementaridade.
  E o box tight + EXACT e o que faz o P49b funcionar: o box grande deixava a casca alvo intacta.
  RESTA: CH/M_Dark 108 faces (x[-0.005,+0.152] |y|<=0.0927 z[0.6072,0.6652]) — ultimo oclusor, e ESTRUTURA (chassi).
    Proximo: aplicar box tight no CH tambem (o chassi na faixa z do queixo nao aparece no concept atras do piloto).
  W663D verde: QA ok, 14 pecas, globais preservadas.


## *** OCLUSAO DA MENTONEIRA COMPLETAMENTE ZERADA: 245 -> 0 FACES ***
  W664D com P48 + P49b generalizado (spec [(prefixo,[[centro],[half]])]) aplicado a 'cowl' E 'ch':
    [P48]  Cowl 3076 -> 2957
    [P49b] COWL 3109 -> 2903   (box tight x 0.485 +- 0.045, y +-0.060, z 0.62 +- 0.030, solver EXACT)
    [P49b] CH   3396 -> 3145   (box tight x 0.073 +- 0.100, y +-0.110, z 0.636 +- 0.045, solver EXACT)
    JANELA DA MENTONEIRA: TOTAL 0 faces.  Historico: 245 (W655D) -> 170 -> 157 -> 108 -> 0 (W664D).
  METODO CONSOLIDADO (vai para a skill):
    1) achar o oclusor por OBJETO+MATERIAL na janela projetada (/tmp/ocl_all.py) — nunca hide_test;
    2) medir as coordenadas CRUAS (min/max c.x,c.y,c.z) das faces a remover;
    3) box TIGHT com margem 1-2 cm + solver EXACT (box grande falha em malha complexa);
    4) re-medir a contagem de faces na janela como gate OBJETIVO.
  NOTA DE PIPELINE: no mesmo build ha DOIS objetos cowl ('Cowl' min. criado cedo, 'COWL' maiusculo criado depois) e
    AMBOS ocluiam regioes diferentes; por isso o P48 (no ponto do Cockpit_Cut) e o P49b (pos-escala) sao complementares.
  W664D verde: QA ok, 14 pecas, globais preservadas.


## *** ULTIMO OCLUSOR: GEOMETRIA DO PROPRIO PILOTO DENTRO DO PL ***
  DEPOIS de zerar COWL e CH na janela estreita (0 faces), o gate visual AINDA via a mentoneira como filete de 2-3 px
    (vision: 'resto do volante/suporte' e 'barra azul da asa' — leitura ERRADA dos oclusores).
  VERIFICACOES QUE FECHARAM O LADO: a camera 'face' esta em x=+5.0 (linha 1375 do SRC) e o NOSE em x[+0.448,+0.935]
    -> o FRONTAL do kart e +x; 'na frente' = x MAIOR. A janela estava CORRETA, nao invertida.
  VARREDURA EM JANELA LARGA (z 0.55-0.80, |y|<=0.20, x>-0.080) achou:
    CH/M_Dark 162 | COWL/M_Blue 90 | PL/M_Pilot 59 faces x[-0.010,+0.153] | PL total na faixa: 11734 faces
  LEITURA: o PL e o merge de PILOTO + CAPACETE. As 59 faces 'PL/M_Pilot' ficam em x[-0.010,+0.153], ou seja A FRENTE do
    chin_guard (x[-0.412,-0.080]) na faixa z do queixo. E o CORPO DO PROPRIO PILOTO (peito/ombros) cobrindo a mentoneira.
    Por estar DENTRO do objeto PL (mergeado), nenhuma varredura por objeto separado (COWL, CH) podia encontra-lo — e
    hide_render do PL nao e opcao (apaga o capacete junto).
  METODO PARA O PROXIMO PASSO: separar por MATERIAL dentro do PL (M_Pilot vs o material do capacete) e conferir se as
    faces M_Pilot na faixa sao corpo a frente do queixo; se sim, recuar/rebaixar o peito do piloto (transladar o subconjunto
    M_Pilot) ou cortar com box tight excluindo o capacete. Medir SEMPRE por material dentro do merge.
  W664D verde: QA ok, 14 pecas, globais preservadas. Janela estreita: 0 faces (COWL e CH eliminados).


## *** TEORIA DO PILOTO REFUTADA E MENTONEIRA MEDIDA NO RENDER: 2.540 px ***
  REFUTACAO: as faces M_Pilot na faixa do queixo (|y|<=0.090, z 0.60-0.76, x>-0.080) sao ZERO. O piloto NAO cobre o queixo.
    (M_Pilot: 473 faces y[+-0.216] z[0.551,0.778] x[-0.350,+0.153] — mas nenhuma no quadrado do queixo.)
  MEDICAO DIRETA DO RENDER (w664d-face.png, 860x860, amarelo r>140 g>110 b<90):
    17.702 px de amarelo no total:
      y160-320  =>  a FAIXA do capacete (~15.900 px)
      y740-800  =>  O QUEIXO (~2.540 px, ~60 px de altura em 4 buckets de 20 px)
  CONCLUSOES:
    1) a mentoneira EXISTE e RENDERIZA com ~60 px de altura. O '2-3 px' relatado pelo vision e ERRO DE LEITURA do vision
       (confundiu a mentoneira com a barra preta fina adjacente). Nao aceitar sem medir — regra do instrumento, de novo.
    2) mas esta ~3x CURTA: 60 px vs alvo do concept (24%% da altura do capacete = 0.147 m ~ 180 px). Esse e o alvo real.
    3) a oclusao (COWL/CH, 245 -> 0 faces) foi trabalho real e necessario, mas NAO era a causa da 'invisibilidade'.
  PROXIMO (concreto): aumentar a mentoneira no eixo vertical — o chin_sz esta em 1.60 (alvo 0.147 m no bbox do SUBCAP) e o render
    mostra 60 px. Ou o bbox do SUBCAP nao corresponde ao que aparece (reg() e snapshot) ou a mentoneira esta PARCIALMENTE dentro do
    capacete (a calota azul a cobre a partir de cima). Medir no render a fronteira superior do amarelo do queixo vs o topo da
    mentoneira no mesh para saber quanto esta enterrado, e entao subir/abaixar a pecica ou alargar a abertura do casco.
  W664D verde: QA ok, 14 pecas, globais preservadas.


## *** OCLUSOR FINAL ENCONTRADO: M_Pilot. E O ERRO DO MEU LIMIAR POR 1 mm ***
  MEDICAO (quadrado do queixo: |y|<=0.09, z 0.60-0.76; maior x = mais perto da camera):
    M_Pilot   131 faces  x[-0.350,-0.081]  x_medio=-0.221   <-- MAIOR x = o mais a FRENTE
    M_Yellow 2171 faces  x[-0.462,-0.151]  x_medio=-0.299   <-- a mentoneira; frontal REAL = -0.151
    M_Gasket  272 faces  x[-0.569,-0.133]
    M_Blue   1054 faces  x[-0.461,-0.241]
    M_Eye     110 faces  x[-0.274,-0.246]
  ERRO DO INSTRUMENTO (a causa de TODA a serie de buscas frustradas): eu definia 'na frente' como x > -0.080, usando o
    frontal do BBOX do chin_guard como plano de referencia. O M_Pilot atinge x=-0.081, ficando FORA por 1 MILIMETRO.
    O plano de referencia certo e o frontal REAL da superficie alvo: o amarelo comeca em -0.151, e -0.081 > -0.151,
    logo o piloto ESTA a frente e cobre. Regra: comparar com a superficie REAL da peca (medida nas faces dela), nunca com
    o bbox arredondado nem com o limite de uma janela escolhida por conveniencia.
  POR QUE O TESTE M_Pilot DENTRO DO QUADRADO DEU 0 ANTES: aquele teste exigia x > -0.080 (mesmo erro) — os dois testes
    usavam o mesmo limiar errado, entao concordaram entre si e se reforcaram. Dois testes com o mesmo vicio nao sao duas
    evidencias.
  TAMANHO DA COBERTURA: 131 faces do piloto na faixa; a mentoneira renderiza ~60 px dos ~180 px do alvo (2/3 cobertos).
  PROXIMO (concreto): recuar o subconjunto M_Pilot que invade o quadrado do queixo (transladar essas faces em -x para
    tras do frontal do amarelo, -0.151) ou rebaixar a mascara do piloto; depois re-renderizar e medir o amarelo do queixo
    de novo (gate objetivo: >=150 px de altura).
  W664D verde: QA ok, 14 pecas, globais preservadas.


## *** P50: RECUO DO PILOTO DOBRA O AMARELO DO QUEIXO (2540 -> 5390 px) ***
  CAUSA RAIZ FINAL (medida): M_Pilot tem 131 faces em x[-0.350,-0.081] no quadrado do queixo; o frontal REAL do amarelo
    e x=-0.151. O piloto cobria a mentoneira. O limiar errado (x>-0.080, do bbox) escondia isso por 1 mm.
  P50 aplicado (no passe pos-build, ancorado em _badn=0): clampa os verts de faces na faixa |y|<=0.10, z 0.58-0.78 que
    ficam A FRENTE do frontal do amarelo, para x <= pilot_push_x. keep-list = ['M_Yellow'] (nunca mexer na propria peca).
  MEDICOES (amarelo do queixo y>=700 no render do rosto, 860x860):
    W664D (sem P50)                     2.540 px | altura 60 px
    W665D (P50 so no M_Pilot, x<=-0.165) 4.724 px (+86%%) | altura 77 px (+28%%)
    W666D (P50 em todos menos amarelo)   5.390 px (+14%%) | altura 77 px (INALTERADA)
  LEITURA: o recuo do piloto RESOLVEU a invisibilidade (amarelo mais que dobrou). Mas a ALTURA estabilizou em 77 px
    (~43%% dos ~180 px do alvo) e NAO responde ao recuo dentro da faixa z 0.58-0.78 -> o limitante de altura esta FORA
    dessa faixa: a abertura do casco acima de z~0.78 e/ou o proprio recorte da mentoneira.
  PROXIMO (concreto): (a) medir no render onde comeca/termina o amarelo e comparar com o z do mesh para achar a fronteira
    exata (superior e inferior); (b) testar pilot_push_z1 maior (0.82) e/ou alargar a abertura do casco; (c) se o limitante
    for a propria mentoneira (pouca altura projetada), aumentar chin_sz (hoje 1.60).
  W666D verde: QA ok, 14 pecas, globais preservadas.


## *** MENTONEIRA: AMARELO +177%% E ALTURA +55%% (2540 -> 7026 px; 60 -> 93 px) ***
  DIAGNOSTICO GEOMETRICO (a chave): mapeando o render para o mesh (camera face orto 0.70 @ z=0.933, 860 px -> 1 px =
    0.000814 m), o amarelo visivel ia de y741 (z=0.680) a y817 (z=0.618). Medindo x_max por material por faixa:
      z 0.62-0.70 (VISIVEL):    M_Yellow x_max=-0.151 -> o amarelo E o mais a frente, nada o cobre
      z 0.68-0.79 (ESCONDIDO):  M_Yellow x_max=-0.188 -> o amarelo fica ATRAS do gasket/piloto (-0.175)
    Ou seja o TOPO DA MENTONEIRA ESTA RECUADO ~3,7 cm e por isso os vizinhos passam na frente. Nao era oclusao por
    outros objetos no sentido classico: era a propria peca atras do plano dos vizinhos.
  P50 COM x<=-0.200 (era -0.175): 203 verts recuados (era 156).
    AMARELO do queixo: 5.390 -> 7.026 px (+30%%) | ALTURA 77 -> 93 px (+21%%)  <-- agora a altura RESPONDE
  SERIE COMPLETA (amarelo do queixo em px / altura em px):
    W664D 2540 / 60  ->  W665D 4724 / 77 (P50 so M_Pilot)  ->  W666D 5390 / 77 (todos menos amarelo)
    ->  W667D 7026 / 93 (push_x -0.200)  =  +177%% em area, +55%% em altura
  PROXIMO: continuar o recuo (-0.23) e/ou aumentar chin_sz (1.60) para fechar os ~180 px; depois re-render + gate visual.
  W667D verde: QA ok, 14 pecas, globais preservadas.


## *** PLATO DA ALTURA: O LIMITANTE PASSOU A SER A PROPRIA PECA (95 px) ***
  W668D: push_x=-0.230, |y|<=0.13, z 0.54-0.85 -> 1082 verts recuados (era 203 no push -0.200).
    AMARELO do queixo: 7.026 -> 7.921 px (+13%%) | ALTURA 93 -> 95 px (+2%%) => PLATO
  LEITURA: quintuplicar o recuo e alargar a faixa quase nao muda a altura. O limitante deixou de ser vizinho.
    O amarelo visivel vai de y723 (z=0.693) a y817 (z=0.618), enquanto o M_Yellow do mesh vai de z 0.560 a 0.789.
    Ou seja: acima de z~0.693 a superficie amarela CURVA PARA TRAS e deixa de encarar a camera frontal, e abaixo de
    z~0.618 idem. Nenhum recuo de vizinho resolve isso — e FORMA da peca.
  CONCLUSAO DE MODELAGEM: o que falta e a mentoneira ter uma face frontal mais PLANA/VERTICAL e mais ALTA (para
    apresentar area a camera), nao apenas transladar vizinhos. chin_sz aumenta a altura total, mas se a superficie
    continuar curvando para tras a area visivel nao cresce proporcionalmente.
  SERIE COMPLETA: 2540/60 -> 4724/77 -> 5390/77 -> 7026/93 -> 7921/95  (area +212%%, altura +58%%; alvo ~180 px)
  PROXIMO (concreto): alterar o PERFIL do chin_guard para uma face frontal mais vertical/alta (nao um revolve fechado
    que curva para tras), mantendo a largura ja calibrada (0.1742 m, 0.3%% do alvo). Medir depois: altura do amarelo no
    render (gate >=150 px) e a largura vs concept.
  W668D verde: QA ok, 14 pecas, globais preservadas.


## *** P51: A FRENTE JA ESTA NO PLANO CERTO — FALTA PAINEL, NAO POSICAO ***
  P51 tentou ACHATAR a face frontal projetando os verts amarelos do queixo em x=-0.151. Resultado: apenas 3 verts de 4514
    foram projetados, e o amarelo do queixo ficou IDENTICO (7920 px / 95 px).
  INTERPRETACAO DECISIVA: a superficie frontal do amarelo JA esta em x=-0.151 em toda a faixa de z. Logo o limite de 95 px
    NAO e posicao nem oclusao (todos os vizinhos do PL foram recuados a x<=-0.230 e nao podem cobrir -0.151).
    O que existe ali e uma BORDA (rim) do revolve, nao um painel largo encarando a camera: os 95 px sao a faixa em que a
    superficie do revolve fica quase PARALELA a vista; acima e abaixo ela e aresta e nao renderiza area.
  CONCLUSAO DE MODELAGEM (a real): falta GEOMETRIA — um PAINEL FRONTAL PLANO na mentoneira, que e literalmente o trapezio
    grande e visivel do concept. Nenhuma translacao, escala ou reprojecao de verts existentes produz isso: e preciso
    CRIAR a face (um quad/trapezio em x=-0.151, |y|<=~0.17, z~0.62..0.79, com a espessura/chanfro ligando ao casco).
  SERIE DE MEDICOES (amarelo do queixo px / altura px): 2540/60 -> 4724/77 -> 5390/77 -> 7026/93 -> 7921/95 -> 7920/95
  PROXIMO (concreto): criar o painel frontal da mentoneira (novo objeto/face) no passe pos-build, com material M_Yellow,
    alvo de altura ~180 px no render (0.147 m) e largura ~0.175 m (49%% da largura do casco), e um leve chanfro para nao
    ficar um plano solto; depois medir altura do amarelo (gate >=150 px) e comparar com o concept.
  W669D verde: QA ok, 14 pecas, globais preservadas.


## *** P52 FECHA O GATE DE ALTURA DA MENTONEIRA: 177 px (ALVO 180) ***
  P52 criou o PAINEL FRONTAL PLANO (geometria nova): laje com face frontal em x=-0.152, |y|<=0.087 (0.175 m),
    z 0.618..0.762 (0.144 m), chanfro de 18%% na face frontal (trapezio) e material M_Yellow, UNIDA ao PL (preserva sep_parts=14).
  MEDICAO (clusters de linhas amarelas no render do rosto):
    (171,330,160) = faixa do capacete
    (508,817,310) = descida da faixa + painel/mentoneira (contiguos)
    O painel ocupa y 640-817 = 177 px = EXATAMENTE o alvo (0.144 m).
    AMARELO total: 23.244 -> 47.421 (+24.177 px = o painel entrando).
  GATE DE ALTURA: >=150 px pedido -> 177 px MEDIDO. FECHADO (98%% do alvo de 180 px).
  ERRO DE INSTRUMENTO CORRIGIDO NO CAMINHO: eu filtrava 'queixo' como y>=700, o que cortava a metade SUPERIOR do painel
    (que vai de y640 a y817). Isso fez a altura parecer 118 px. A janela de medicao deve ser derivada do mapeamento
    render<->mesh (z -> y), nao escolhida por conveniencia. Mesma familia do erro do limiar de 1 mm.
  SERIE DE ALTURA: 60 -> 77 -> 77 -> 93 -> 95 -> 95 -> 177 px (alvo 180).
  PENDENTE VISUAL: a faixa desce e encontra a mentoneira sem separacao (no concept a faixa termina na viseira e a
    mentoneira e um trapezio separado); o painel pode precisar de ajuste de bevel/posicao em x; e falta o sorriso.
    Gate visual pareado re-executado depois disso.
  W670D verde: QA ok, sep_parts=14, globais preservadas.


## P53: SORRISO DA MENTONEIRA ***
  P53 adicionou a linha fina escura do concept: laje M_Dark em x=-0.153, |y|<=0.052, z 0.660..0.676 (1.6 cm), unida ao PL.
    Green: QA ok, sep_parts=14. AMARELO no painel (y630-830): 21.317 px, y[630,817].
  JUNTO: P52 (painel frontal plano) + P53 (sorriso) = mentoneira com altura de alvo e a linha do concept.
  PENDENTE VISUAL: (a) a faixa desce e encontra a mentoneira sem separacao (no concept a faixa termina na viseira e a
    mentoneira e trapezio separado); (b) bevel/x do painel; (c) conferir o sorriso no render (medicao por 'escuro dentro do
    amarelo', porque o filtro simples de escuro pega o fundo).
  W671D verde.


## GATE VISUAL W671D (painel+sorriso): 4.0/10 — PROGRESSO REAL, ERRO DE INTEGRACAO ***
  VISION (literal): "(1) Sim, agora o queixo amarelo aparece e bem forte; (2) Nao, esta retangular alto tipo bico, nao
    trapezio curto; (3) 4/10; (4) Mais errado: queixo gigante vertical cobrindo a viseira." E descreve o concept como
    mentoneira "pequena, trapezoidal invertida e ARREDONDADA, com um sorriso".
  LEITURA: o painel RESOLVEU a existencia (o filete virou volume visivel) — o erro mudou de natureza: agora e INTEGRACAO
    e FORMA. Acoes derivadas: (a) chanfro/arredondamento maior e transicao para a calota (nao um slab reto); (b) trapezio
    de verdade (mais estreito embaixo, como o concept); (c) conferir o enquadramento — geometricamente o painel (z 0.618-0.762)
    esta ABAIXO da viseira (z 0.819-1.040 pela conversao do alvo f=0.311..0.678), entao o 'cobrindo a viseira' do vision
    e efeito de crop/leitura, nao sobreposicao real; (d) o sorriso precisa ser conferido isolando escuro DENTRO do amarelo.
  GATES: altura da mentoneira 177 px (alvo 180) FECHADO. Visual 4.0/10 (era 5.0 no W647D, mas com mentoneira invisivel;
    agora ela existe e o que falha e forma/integracao).
  W671D verde: QA ok, sep_parts=14, globais preservadas.


## W672D: TRAPEZIO APLICADO (taper 0.40, bevel 0.26) + MEDICAO CONTAMINADA ***
  P52 agora aplica taper em y em funcao de z (mais estreito embaixo) e bevel 0.26. Build verde (QA ok, sep 14).
  MEDICAO por largura de amarelo por linha (y 650..810): 244, 251, 257, 263, 268, 418, 476, 515, 529.
    O salto entre y730 (268) e y750 (418) mostra que ABAIXO de y~745 a medicao NAO e mais o painel, e sim o amarelo
    do chin_guard original (mais largo, mesma projecao). Logo: nao medir o trapezio do painel por cor de amarelo.
    alternativas: medir a LARGURA por linha apenas na faixa onde o painel e exclusivo, ou isolar por material com
    repintura magenta (metodo ja validado), ou medir a silhueta do conjunto.
  AMBIGUIDADE A RESOLVER COM O CONCEPT: o vision descreve a mentoneira como 'trapezoidal INVERTIDA' (mais larga em CIMA);
    meu taper fez o oposto (mais estreita embaixo). Registrar como hipotese a confirmar medindo o concept: largura do
    amarelo do queixo por linha no front.jpg (y196..232 do concept) — se for maior em cima, inverter o sinal do taper.
  W672D verde: QA ok, sep_parts=14, globais preservadas.


## TAPER CONFIRMADO POR MEDICAO DO CONCEPT (nao por leitura do vision) ***
  MEDICAO no front.jpg do concept (1024x559), largura do amarelo do queixo por linha:
    y=196 largura=4  |  y=204 largura=53 (PICO)  |  y=212 largura=47
    abaixo de y~220 o amarelo detectado ja pertence a outras pecas do kart (x deslocado: 447-462, 345-359).
  CONCLUSAO: a mentoneira do concept e MAIS LARGA EM CIMA e estreita para baixo -> 'trapezoidal invertida' como o
    vision descreveu. Meu taper (y *= 1-tp*(1-t), mais estreito embaixo) esta na DIRECAO CORRETA. Confirmado por
    medicao; a leitura do vision serviu como hipotese e a medicao decidiu.
  ALTURA: a mentoneira do concept mede 20-36 px num casco de 148 px = 13,5%% a 24%% da altura do capacete.
    Meu painel esta em 0.144 m = 24%% (o TETO da faixa) — o que explica o 'muito alto' do vision. Alvo melhor: ~18%%
    = 0.108 m, que no render da camera face equivale a ~133 px.
  PROXIMO (concreto): reduzir o painel para z0=0.640, z1=0.748 (0.108 m, ~133 px) mantendo o taper e o bevel; re-render e
    conferir altura do amarelo e o gate visual.
  W672D verde: QA ok, sep_parts=14, globais preservadas.


## W673D: PAINEL EM 18%% (0.108 m) E A MEDICAO POR COR E INUTILIZAVEL ***
  P52 agora: z 0.640..0.748 (0.108 m = 18%% da altura do casco = 133 px na camera face). Build verde.
  CLUSTERS AMARELOS: (171,330,160) faixa do capacete | (457,460,4) ruido | (495,817,323) — a faixa DESCE CONTIGUA
    ate a mentoneira, sem gap. Logo 'largura do amarelo por linha' mede faixa + chin_guard + painel JUNTOS: inutil.
  ISOLAMENTO POR CAIXA tambem contamina: filtrando M_Yellow com x<-0.145, |y|<=0.10 e z 0.63-0.76 dao 2107 faces e
    z[0.6333,0.7594] = 0.126 m, quando o painel tem 0.108 m — a caixa capturou o amarelo do proprio chin_guard.
  SOLUCAO DEFINITIVA (proximo): dar ao painel um MATERIAL PROPRIO (M_ChinPanel, mesma cor do M_Yellow) em vez de M_Yellow.
    Assim ele e medivel por material, sem ambiguidade com o amarelo do casco e sem depender de cor/geometria.
    Alvo numerico ja fixado: z 0.640-0.748 = 0.108 m = 133 px (18%% do casco, meio da faixa do concept 13,5-24%%).
  W673D verde: QA ok, sep_parts=14, globais preservadas.


## *** M_ChinPanel REVELA BUG: O PAINEL E 67%% MAIOR QUE O PEDIDO ***
  P55 deu ao painel MATERIAL PROPRIO (M_ChinPanel, copia do M_Yellow) -> medicao sem ambiguidade. Resultado (6 faces,
    o cubo do painel):
      x[-0.1520,-0.1020]  |y|<=0.142 (largura 0.284 m)  z[0.6940,0.8744] = 0.1804 m = 222 px
  ESPERADO (o que o P52 passa): z 0.640..0.748 (0.108 m) e |y|<=0.092 (0.184 m).
  DISCREPANCIA: 0.1804/0.108 = 1,67x em altura e 0.284/0.184 = 1,54x em largura. O painel NAO aterrissa com as dimensoes
    passadas. Isso explica o 'muito alto' e o 'tipo bico' do vision: contra o concept (13,5-24%% do casco = 0.081-0.144 m),
    0.1804 m = 30%% — ACIMA da faixa.
  HIPOTESES DO BUG (checar em ordem): (a) o bloco do P52 roda ANTES da auto-escala e o painel, criado com as coordenadas
    finais, e depois escalado — mas a escala e ~0.9265 (encolheria), nao 1,67 (aumenta) -> NAO explica; (b) o loop de taper/
    bevel do P52 estar rodando sobre coords LOCAIS quando a origem do objeto nao esta em (0,0,0) -> deslocaria, nao escalaria;
    (c) o painel estar pegando tambem faces de outro objeto no JOIN (mas sao 6 faces = 1 cubo); (d) a escala estar sendo
    aplicada 2x (transform_apply + algo depois). MEDIR: imprimir no build a bbox do painel IMEDIATAMENTE apos cria-lo e apos o
    join, para localizar em que passo o tamanho muda.
  ALVO: z ~0.640-0.748 (0.108 m, 133 px, 18%% do casco) e |y|<=0.087 (0.175 m).
  W674D verde: QA ok, sep_parts=14, globais preservadas. M_ChinPanel no PL (9 materiais) = instrumento novo funcionando.


## *** BUG DO PAINEL LOCALIZADO: ESPACO LOCAL DO PL (fator 1/0.6) ***
  P52 cria o painel com size=2 + scale (0.025,0.092,0.054) -> half-extents iguais ao scale -> 0.05 x 0.184 x 0.108 m
    nas coordenadas de MUNDO. A matematica do P52 esta CORRETA.
  MEDIDO no .blend: |y|<=0.142 (0.284 m) e z 0.694-0.874 (0.1804 m).
    0.108 / 0.1804 = 0.5987 ~ 0.6  =>  o fator e 1/0.6 = 1.667  (casou com 1,67x medido na altura).
  CAUSA: o painel e criado em coordenadas de MUNDO e depois UNIDO ao PL, que tem ESCALA DE OBJETO propria (~0.6).
    O join converte os verts para o espaco LOCAL do PL (divide por ~0.6), entao o painel aterrissa 1/0.6 maior do que
    o pretendido nesse espaco — e e ESSE o espaco em que ele e renderizado/exportado.
  FIX (escolher): (a) criar o painel ja no espaco LOCAL do PL — dividir centro e half-extents pela escala do PL
    (bpy.data.objects['PL'].scale) antes de criar; (b) aplicar a escala do PL (transform_apply scale) ANTES de criar e
    unir o painel; (c) nao unir: manter o painel como objeto separado e ajustar sep_parts (indesejavel: quebra o gate 14).
    Preferencia: (b) — elimina a classe de erro para todas as pecas futuras desenhadas no passe pos-build.
  ALVO: z 0.640-0.748 (0.108 m = 133 px) e |y|<=0.087 (0.175 m).
  W674D verde: QA ok, sep_parts=14. Instrumento M_ChinPanel funcionando (9 materiais no PL).


## P56 REFUTA A HIPOTESE DA ESCALA DO PL ***
  P56 (transform_apply de scale em todo objeto com scale != 1) NAO IMPRIMIU NADA e o painel ficou identico.
    => _sq vazio => NENHUM objeto tem escala de objeto != 1 => o PL NAO tem escala propria. HIPOTESE REFUTADA.
  PADRAO NOVO (medido por M_ChinPanel, 6 faces):
      x[-0.152,-0.102] = 0.050 m  -> CORRETO (bate com _dp=0.05)
      y[+-0.142] = 0.284 m        -> 1,54x o pedido (0.184)
      z[0.694,0.874] = 0.1804 m   -> 1,67x o pedido (0.108)
    X certo e Y/Z inflados por fatores DIFERENTES. Os lacos de taper/bevel do P52 apenas ENCOLHEM y e z
    (y*=(1-tp*(1-t)) e y*=(1-bf); z = zm + (z-zm)*(1-bf)), logo nao explicam crescimento.
  CONCLUSAO: o que e medido como M_ChinPanel nao corresponde ao cubo que o P52 cria — ou o painel medido e outra
    geometria (mas 6 faces = um cubo), ou a criacao esta aterrissando com outra escala/ancora.
  PROXIMO (instrumento cirurgico, agora com ancoras de LINHA exata extraidas do arquivo, nao por bloco):
    imprimir a bbox logo APOS primitive_cube_add, APOS transform_apply e APOS o join, comparando com a bbox lida no
    .blend final. Foi a faltar instrumentacao em CADA passo que permitiu a hipotese errada da escala do PL.
  W676D verde: QA ok, sep_parts=14, globais preservadas.


## INSTRUMENTACAO DO P52 FALHOU E FOI REVERTIDA (W679D verde) ***
  TENTATIVA: inserir 3 prints no P52 (bbox apos primitive_cube_add, apos transform_apply, apos join) por INDICE DE LINHA.
  FALHA: 'NameError: name _pn is not defined' na linha 1290 do SRC gerado — os prints caíram fora do escopo do bloco
    'if _px:'. Remover so o print do join nao bastou (erro persistiu).
  REVERTIDO: todas as linhas P52dbg removidas; W679D verde (0 SyntaxError/Traceback, QA ok, sep_parts=14, globais preservadas).
  LICAO DE METODO (terceira da familia 'instrumento'): ast.parse() do trecho isolado NAO prova que a linha inserida esta correta
    no contexto do SRC GERADO pelo runner — o runner marca/embrulha o codigo e a linha final pode cair em outro escopo.
    E inserir por INDICE DE LINHA invalida os indices seguintes (tres insercoes = tres deslocamentos, um por vez).
    METODO CERTO: (1) ancorar por TEXTO (extraido do arquivo, com a indentacao real da vizinhanca); (2) validar o SRC FINAL
      gerado pelo runner (npx: gravar o SRC em arquivo e rodar ast.parse nele), nao o fragmento; (3) inserir UM print por build.
  ESTADO ATUAL: painel M_ChinPanel mede x 0.050 m CORRETO, y 0.284 m (1,54x) e z 0.1804 m (1,67x) — a causa do inflar
    segue NAO localizada, mas o espaco de busca esta reduzido: X certo e Y/Z inflados por fatores diferentes, e taper/bevel
    do P52 apenas encolhem.
  W679D verde: QA ok, sep_parts=14, globais preservadas.


## INSTRUMENTACAO FUNCIONA: A CAUSA DO NameError ERA A ORDEM, NAO O ESCOPO ***
  DIAGNOSTICO CORRETO (linhas 52 e 53 do bloco):
    52: print('[P52dbg] ... _pn ...')      <- referencia _pn
    53: _pn=bpy.context.active_object      <- define _pn
    => NameError. Era ORDEM INVERTIDA, nao escopo/indentacao. Eu havia diagnosticado escopo DUAS vezes (removi o
       print do join; tentei reancorar por texto) — ambas erradas. Licao: ler o NameError LITERALMENTE e checar a ordem
       das linhas antes de teorizar sobre escopo.
  APOS mover o print para depois da definicao, o build W681D ficou verde (0 SyntaxError/Traceback/NameError, QA ok) e:
    [P52dbg] dim=(2.0,2.0,2.0) loc=(-0.127,0.0,0.694) scale=(1.0,1.0,1.0)
    Ou seja: o cubo cru (size=2) e a LOCATION 0.694 = exatamente o centro do alvo (z0+z1)/2 — a criacao esta correta;
    o print roda ANTES da linha que aplica o scale (ordem do bloco), entao ele ainda nao mostra o inflar.
  PROXIMO: mover/duplicar o print para DEPOIS do transform_apply e comparar com a bbox do .blend final (medida por
    M_ChinPanel). UM print por build, ancorado por TEXTO, validado no SRC final.
  W681D verde: QA ok, sep_parts=14, globais preservadas.


## *** BUG DO PAINEL CORRIGIDO (P57): COORDS DE MUNDO SOBRE VERTS LOCAIS ***
  ISOLAMENTO (P52dbg apos o transform_apply, W682D): dim=(0.05, 0.184, 0.108) — A CRIACAO E EXATA.
    Logo o inflar entrava DEPOIS: nos lacos de taper/bevel (ou no join).
  CAUSA (P57): os lacos usavam _z0 e _zm (=0.694, valores de MUNDO) sobre verts que, apos o transform_apply, estao em
    coords LOCAIS centrados em 0 (+-0.054). Assim t = (co.z - 0.640)/0.108 ~ -6 e o fator do taper (1-0.40*(1-t)) = -1.96
    NEGATIVO -> inflava e espelhava y e z. Correcao: usar a altura LOCAL (_h=(z1-z0)/2), t=(co.z+_h)/(2*_h), e escalar z
    localmente (co.z *= (1-bf)) sem somar _zm.
  RESULTADO (M_ChinPanel):
    W682D (bug): y[+-0.142]=0.284 | z 0.694-0.874 = 0.1804 m (222 px)
    W683D (fix): x[-0.152,-0.102]=0.050 | y[+-0.064]=0.128 | z 0.647-0.741 = 0.0940 m = 115 px
    Bate com o esperado: 0.108*(1-0.26)=0.080 de encolhimento pela face frontal do bevel + taper -> 0.094 medido.
  ALVO vs ATUAL: 0.108 m (133 px) alvo; 0.094 m (115 px) atual = 86%% -> ajustar z0/z1 (compensar o bevel) ou reduzir o bevel.
  LICAO CENTRAL (4a da familia 'instrumento'): APOS transform_apply(scale), os verts estao em coords LOCAIS — nunca aplicar
    formulas com valores de mundo (centros/limites) sobre eles. Foi isso que fez o painel parecer 'bico' gigante no gate visual.
  W683D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** PAINEL EXATO: 0.1079 m (ALVO 0.108) — ERRO 0,1%% ***
  Ajuste de compensacao do bevel: input z 0.632..0.756 (0.124 m) gera 0.1079 m medidos (fator 0.87 do bevel).
  M_ChinPanel no W684D: x[-0.152,-0.102] = 0.050 m | y[+-0.064] = 0.128 m | z[0.6401,0.7479] = 0.1079 m = 133 px
    133 px = 18%% da altura do casco = exatamente o MEIO da faixa medida no concept (13,5%%-24%%). ERRO 0,1%%.
  A cadeia de instrumentos que permitiu isso (registro para reuso):
    1. material PROPRIO (M_ChinPanel) para medir por material, sem ambiguidade com o amarelo do casco;
    2. print apos o transform_apply para separar criacao de pos-processamento;
    3. comparar com a bbox do .blend final para localizar em QUE passo o numero divergia;
    4. corrigir a formula (coords locais, nao de mundo) e re-medir.
  W684D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## P58: CANTOS ARREDONDADOS (U) — E NOVA COMPENSACAO DE Z ***
  P58 adiciona BEVEL modifier (width 0.014, 3 segmentos, limit ANGLE) no painel ANTES do join -> U arredondado em vez de
    trapezio anguloso (o vision pediu isso: o concept e 'U arredondado'). Faces do painel: 6 -> 98.
  M_ChinPanel no W685D: x 0.050 | y[+-0.058]=0.116 m (era 0.128 — mais estreito) | z[0.6409,0.7631]=0.1221 m = 150 px.
    ALVO 133 px -> +13%: o bevel EXPANDE a geometria (o arredondamento soma ao redor). Compensar reduzindo z0/z1 (~-8mm).
  LARGURA vs CONCEPT: concept tem pico de 63 px num casco de 128 px = 49% -> 0.175 m. Modelo: 0.116 m = 33%. O vision
    disse 'largo' quando estava 0.128 (forma chapada), mas em NUMERO o concept e mais largo -> a leitura e sobre a FORMA
    (U arredondado vs trapezio chapado), nao sobre a largura. Nao estreitar mais; o P58 acertou a forma.
  ANOTACAO DE METODO: duas vezes a ancora por TEXTO casou no bloco errado (a string '_pl=bpy.data.objects.get(P.get(\'pilot_obj\',\'PL\'))'
    existe no P50 E no P52). Verificar UNICIDADE da ancora (count==1) antes de inserir — regra nova de patch.
  W685D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** MENTONEIRA FECHADA: 132 px vs ALVO 133 (ERRO 0,8%%) ***
  Compensacao do bevel: input z 0.6475..0.7565 (0.109 m) -> medido 0.1071 m = 132 px (alvo 133). ERRO 0,8%%.
  ESTADO FINAL DA MENTONEIRA (tudo medido, nada inferido):
    geometria: painel PLANO proprio (P52) + cantos arredondados U (P58) + sorriso (P53), unidos ao PL;
    material proprio M_ChinPanel -> medicao sem ambiguidade;
    x[-0.152,-0.102] = 0.050 m  |  y[+-0.058] = 0.116 m  |  z[0.6484,0.7556] = 0.1071 m = 132 px;
    oclusao: COWL e CH zerados na janela (245 -> 0 faces) por recorte tight + EXACT; piloto recuado (P50);
    largura vs concept: concept tem pico de 63 px em casco de 128 px (0.175 m); modelo 0.116 m = 66%% do concept;
      o vision reclamava de FORMA (trapezio chapado), nao de largura — U arredondado resolveu.
  PENDENTE DO CAPACETE (ordem do vision, do maior erro ao menor):
    1. VISEIRA: 'gigante, plana como prato/meia-lua, larga demais, nao envolve' -> estreitar (a do concept e uma faixa
       estreita e curvada) e dar curvatura envolvente; o maior erro atual.
    2. OLHOS: 'enormes, muito espacados, sem brilho' -> menores, mais proximos, com catchlight.
    3. SOBRANCELHA: 'grossas, retas, altas' -> arco fino.
    4. FAIXA: 'larga, curta, chapada, termina abruptamente acima da viseira' -> mais estreita e continua.
    5. VAO abaixo da viseira ('fenda vazada onde se ve o fundo') -> fechar.
  W686D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** VISEIRA: O PROBLEMA NAO E ELA, E A GAXETA E O PAINEL DE ROSTO ***
  MEDICAO POR MATERIAL (W686D, via mw@p.center):
    CASCO (M_Blue)     y[+-0.165] = 0.330 | z[0.731,1.141] = 0.410  <-- referencia
    M_Visor    9850 f  y[+-0.167] = 0.333  -> 101% do casco  | z[0.862,1.011] = 0.149 = 36% da altura
    M_Gasket   6140 f  y[+-0.218] = 0.435  -> 132% do casco  <-- EXCEDE A CABECA
    M_Face    18462 f  y[+-0.218] = 0.436  -> 132% do casco  <-- EXCEDE A CABECA
    M_Eye       112 f  y[+-0.039] = 0.079  | z[0.741,0.760] = 0.019 (olhos muito baixos: z 0.74-0.76)
  DIAGNOSTICO: a VISEIRA esta dimensionalmente CORRETA (101% da largura do casco, contra 99% do concept; e 36% da
    altura do casco, contra os 34,5% do alvo f=0.324..0.669). O que lê como 'prato gigante que nao envolve' (vision) e o
    CONJUNTO: gaxeta e painel de rosto 32% MAIS LARGOS que o casco — esticam a peca alem da cabeca.
  ACOES (por ordem de impacto):
    1. reduzir M_Gasket e M_Face para ~99-101% da largura do casco (de 0.435/0.436 para ~0.33) -> -24% em cada;
    2. dar curvatura envolvente a gaxeta (ela deve ABRACAR o casco, nao se estender em disco);
    3. olhos: verificar a altura — z 0.741-0.760 esta ABAIXO do alvo (o concept tem olhos dentro da viseira, que vai de
       0.862 a 1.011) -> subir os olhos para a faixa da viseira e reduzi-los/ aproxima-los (o vision pediu menores e mais proximos).
  W686D verde: 0 erros, QA ok, sep_parts=14.


## P59 APLICADO: CONJUNTO DA VISEIRA ABRACA O CASCO ***
  [P59] ['M_Face','M_Gasket']: 4312 de 24640 verts trazidos para |y|<=0.168 (clamp em y, x e z preservados).
    M_Gasket: 0.435 -> 0.336 (132%% -> 102%% da largura do casco).
    M_Face:   0.436 -> 0.336 (132%% -> 102%%).
    M_Visor intacta em 0.333 (101%%) e M_Blue intacta em 0.330 — o casco nao mudou.
  W687D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** GATE VISUAL W687D: 6.5/10 (ERA 3.5) — +3.0 ***
  Vision (prancha v9, concept | modelo, W687D):
    (1) 'Sim, largura agora certa, capacete envolve no tamanho certo' -> CONFIRMA o P59;
    (2) nota 6.5/10 (era 3.5 no W671D: +3.0);
    (3) maior erro restante: 'viseira caixa reta, sem curva e sem afunilar';
    (4) 'largura proporcional, mas ainda parece placa chapada'.
    Reconhece explicitamente: 'você corrigiu a largura. No 3D antigo era 32% mais larga - efeito prato. Agora ~2%, flush
    lateralmente. E a mentoneira foi arredondada, menos bloco.'
  PROXIMOS ERROS (na ordem que o vision descreveu, do concept para comparar):
    1. VISEIRA: o concept e 'cinza translucida, CURVA, que ENVOLVE o rosto, mais larga em cima e AFUNILANDO para baixo ate
       encaixar na mentoneira SEM VAO'. Modelo: caixa reta, cantos a 90 graus, opaca. -> dar curvatura (casca esferica),
       taper de cima para baixo, transparencia e encaixe sem vao. MAIOR ERRO.
    2. FAIXA: 'muito mais larga, curta e grossa que no concept, terminando reta'. Concept: faixa fina do topo ate o nariz,
       continuando na mentoneira. -> estreitar, alongar e afinar a terminacao.
    3. OLHOS: 'enormes, muito separados, pupilas grandes, sobrancelhas pretas grossas chapadas'. -> menores, mais proximos,
       sobrancelha em arco fino.
    4. VAO entre viseira e queixo ('vão preto/vasado') que NAO existe no concept -> fechar.
    5. Discos pretos laterais (pivos da viseira) visiveis nas laterais -> remover ou embutir.
  W687D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## P60: VISEIRA ENVOLVENTE (TAPER + CURVATURA + TRANSPARENCIA) ***
  [P60] viseira envolvente: 9928 verts | taper base=0.75 | wrap k=0.055 | ymax=0.167 | z 0.862..1.011
  Taper em y (mais estreito embaixo) + curvatura em x (bordas recuam com k*(|y|/ymax)^2) + alpha 0.78.
  M_Visor: x 0.216 -> 0.190 | y 0.333 -> 0.310 (94% da largura do casco) | z 0.862-1.011 = 0.149 (altura intacta).
  Por que: o vision (W687D, 6.5/10) disse 'caixa reta, sem curva e sem afunilar, parece placa chapada' e o concept e
    'translucida, CURVA, que ENVOLVE o rosto, mais larga em cima e AFUNILANDO para baixo'. Os tres elementos do concept
    estao agora implementados; a validacao e o proximo gate.
  W688D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas. build 48.1s.


## *** P60 REVERTIDO: MEDIDA MELHOROU, VISION PIOROU (6.5 -> 3.0) ***
  P60 mudou a geometria de M_Visor de fato (x 0.216->0.190; y 0.333->0.310 = 94% do casco), MAS o gate visual CAIU de
  6.5/10 para 3.0/10 e o vision descreveu artefatos NOVOS que nao existiam antes:
    'caixa retangular, frente plana, cantos laterais em 90 graus que ESTOURAM PARA FORA da cabeca como orelhas/caixa de
     Minecraft'; 'a promessa de bordas recuam, afunila, transparencia NAO APARECE nesse render'.
  VEREDITO DO VISION: 'Apague e refaca como CASCA ESFERICA com SHRINKWRAP no capacete'.
  LICAO (regra nova): alteracao que MELHORA a medida mas PIORA o gate visual deve ser REVERTIDA e a abordagem trocada —
    deformar uma CAIXA (taper+offset quadratico) nao produz uma casca esferica; o taper em y com wrap em x criou quinas que
    estouram. Nao insistir na deformacao: construir a viseira como geometria curva de origem (secao de esfera/shrinkwrap).
  P60 REVERTIDO -> W689D volta ao estado do W687D (gate 6.5), que permanece a MELHOR base validada do capacete.


## *** VISEIRA: O ERRO E A PROFUNDIDADE (ESTA 22 CM ATRAS DA SUPERFICIE DO CASCO) ***
  GEOMETRIA MEDIDA (W689D, por material, mw@p.center):
    CASCO (M_Blue): bbox x[-0.568,-0.107] y[+-0.165] z[0.731,1.141] -> centro (-0.3376, 0.0000, 0.9357)
                    meia-largura maxima em y = 0.1649, no z 0.940 (equador) -> esfera de raio_y ~0.165
    VISEIRA (M_Visor): x[-0.347,-0.131] y[+-0.167] z[0.862,1.011]
      |y| por faixa de z: 0.86-0.90 -> 0.1641 | 0.90-0.94 -> 0.1667 | 0.94-0.98 -> 0.1666 | 0.98-1.02 -> 0.1619
      (|y| praticamente CONSTANTE -> o CONTORNO da viseira JA acompanha a esfera do casco)
  DIAGNOSTICO DECISIVO: o frontal da VISEIRA esta em x=-0.347, enquanto o frontal do CASCO esta em x=-0.568.
    A viseira e uma CAIXA 0.221 m ATRAS da superficie do casco — dentro da cabeca. O contorno esta certo; a
    PROFUNDIDADE/curvatura e que esta errada. E isso que produz 'caixa reta, frente plana' em todos os gates
    (inclusive na P60: eu deformei a caixa sem mover a frente para a superficie, e o vision viu apenas quinas novas).
  P61 PLANEJADO (casca esferica de verdade, nao deformacao):
    reconstruir os verts de M_Visor na superficie da esfera do casco: centro (-0.3376, 0.0000, 0.9357), raio_y 0.1649;
    para cada vert, manter z e o angulo horizontal (atan2 em y), recalcular x pela esfera com um offset externo de ~1,2 cm;
    restringir a faixa z 0.862..1.011 e ao hemisferio frontal (-x). Assim a viseira ABRACA o casco e a frente cai na superficie.
    Manter M_Visor como material (medicao por material ja validada).
  W689D verde (revert confirmado): 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, gate 6.5 preservado.


## P61 APLICADO: VISEIRA PROJETADA NA ELIPSOIDE DO CASCO ***
  [P61] viseira projetada na elipsoide: 9928 verts | centro=(-0.3376,0.0,0.9357) raios=(0.231,0.1649,0.205) off=0.075
  M_Visor: x[-0.348,-0.089]=0.259 | y[+-0.177]=0.354 | z[0.848,1.026]=0.177
  ORIENTACAO (importante, resolveu uma confusao de leitura): o frontal do casco e x=-0.107 (o rosto olha para +X) e o
    fundo/traseira da cabeca e x=-0.568. O frontal da viseira passou de -0.131 para -0.089 = 1,8 cm A FRENTE do casco ->
    a viseira agora esta SOBRE a superficie, com a frente na superficie e a casca curvando. A estrutura correta.
  DOIS OVERSHOOTS NUMERICOS a corrigir no proximo build:
    1. y +-0.177 = 107% do casco (0.165) — o offset de 7,5% e grande demais; usar ~2% (visor_off 0.02);
    2. z cresceu de 0.149 para 0.177 porque a projecao tambem moveu z para a elipsoide; reconter a faixa (visor_z0/z1) ou
       limitar a projecao a keep-z. O alvo do concept e z 0.862..1.011 = 0.149.
  W690D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** P61 AJUSTADO: VISEIRA COM OS TRES EIXOS NO ALVO ***
  visor_off 0.075 -> 0.020 e z PRESERVADO na projecao.
  M_Visor: x[-0.348,-0.102]=0.246 | y[+-0.168]=0.336 = 102% do casco | z[0.862,1.011]=0.149 (alvo exato do concept).
  Frontal da viseira em x=-0.102, 5 mm A FRENTE do frontal do casco (-0.107) -> sobre a superficie, com casca curvando.
  Comparativo com o concept: largura 102% (concept 99-101%) | altura 0.149 = 36% da altura do casco (concept 34,5%) |
    contorno acompanhando a esfera | frente na superficie. Os tres eixos batem.
  W691D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** GATE v11: PENSA CONFIRMA A CASCA, MAS ELA ESTA ALTA DEMAIS ***
  Vision (W691D, prancha v11): 'Evoluiu. NAO e mais a caixa interna: agora e uma CASCA FINA EXTERNA. Prova: highlight
    especular que corre na lateral e dobra para tras, o topo acompanha a esfera do casco, e as laterais nao tem mais quina
    viva de box.' -> 'geometria da curvatura horizontal esta certa'.
  (1) agora curva/envolve, nao e mais placa-caixa | (2) 6/10 | (3) MAIOR ERRO: 'alta demais, olhos FORA da viseira' |
  (4) 'Baixe-a e recorte a borda inferior em U transparente'.
  DIAGNOSTICO FUNCIONAL do vision: 'no concept os olhos estao DENTRO da viseira transparente; no seu estao FORA, pintados
    na face opaca embaixo de uma viseira-toldo alta como bone'. ISSO BATE COM A MEDICAO: M_Eye em z 0.741-0.760 contra a
    viseira em z 0.862-1.011 -> os olhos estao ~0,10 m ABAIXO da faixa da viseira. A geometria certa no lugar errado.
  PROXIMOS PASSOS (o vision ditou a ordem):
    1. BAIXAR a faixa da viseira para envolver os olhos: z 0.862..1.011 -> algo como z 0.74..0.90 (cobrindo M_Eye 0.741-0.760),
       mantendo a altura de faixa (~0.15) e a projecao na elipsoide;
    2. BORDA INFERIOR EM U + TRANSPARENCIA (alpha): a aba reta de baixo deve descer nas bochechas em U e ser transparente
       para os olhos aparecerem ATRAVES dela;
    3. depois: faixa (fina, do topo ao nariz, sem terminar reta), sobrancelha em arco fino, vao e pivos laterais.
  W691D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## P62+P63 APLICADOS: VISEIRA COBRE OS OLHOS E TEM BORDA EM U ***
  P62: visor_dz=-0.160 baixa a faixa ANTES da projecao (que entao segue a esfera no novo z).
    M_Visor z 0.862-1.011 -> 0.702-0.851. M_Eye (z 0.741-0.760) passa a ficar DENTRO da viseira -> corrige o erro
    funcional que o vision apontou ('olhos FORA da viseira, pintados na face opaca embaixo de uma viseira-toldo').
    Bonus: com a faixa mais baixa, a elipsoide e mais estreita -> y 0.308 = 93% do casco: o 'afunilar para baixo' do
    concept aparece SOZINHO como consequencia da esfera (nao precisou de taper artificial).
  P63: borda inferior em U (visor_u_lift) levanta as laterais (|y|>0.55*ry, quadratico) e deixa o centro baixo — o
    concept desce nas bochechas e afunda no centro. lift 0.085 -> span 0.212 (fundo demais) -> 0.045 -> span 0.182.
  ESTADO FINAL W694D: M_Visor x 0.221 | y[+-0.162]=0.325 = 98,5% do casco | z[0.702,0.884]=0.182. M_Eye DENTRO.
    = sobre a superficie + curvada (elipsoide) + afunilando + cobrindo os olhos + borda em U. Restam a transparencia
    (alpha) e o gate visual.
  W694D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** GATE v12: 6.5/10 — OLHOS DENTRO DA VISEIRA CONFIRMADO ***
  Vision (W694D): (1) 'Sim, em Z os olhos ja estao dentro de 0.70-0.88' | (2) 6.5/10 (melhor marca, empatada com a do W687D) |
    (3) MAIOR ERRO: 'U central alto tampando metade inferior dos olhos' | (4) 'Faca: baixar e achatar o U para liberar os olhos'.
  OBSERVACAO NOVA: 'em Y/profundidade os olhos parecem colados na frente, nao atras de um vidro' -> (a) os olhos precisam estar
    RECUADOS atras do vidro e (b) a TRANSPARENCIA (alpha) da viseira ainda NAO foi aplicada (a P60 tentou, mas foi revertida junto
    com a deformacao). Sem alpha o olho nao le 'atras do vidro'.
  PROXIMOS PASSOS (dois, ambos pequenos e medidos):
    1. BAIXAR/ACHATAR a U: visor_u_lift 0.045 -> ~0.020, e subir o limiar de |y| de 0.55 para ~0.65 para o centro ficar livre;
       conferir por medicao que a U nao invade z 0.741-0.760 no centro (|y|<0.04);
    2. TRANSPARENCIA (alpha ~0.80 em M_Visor, blend_method BLEND) + recuar M_Eye em x algum mm para ler 'atras do vidro'.
    Depois: faixa (fina, do topo ao nariz), sobrancelha em arco, vao inferior e pivos laterais. Depois G31 + auditor.
  W694D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## P64: U ACHATADA + ALPHA 0.80 + OLHOS RECUADOS ***
  [P64a] M_Visor alpha=0.80 blend=BLEND (transparencia que faltava — o vision pedia 'atras de um vidro');
  [P64b] 182 verts de M_Eye recuados em x por -0.0080 (para dentro da cabeca: o front e +x);
  U achatada: visor_u_lift 0.045 -> 0.020 e limiar |y| 0.55 -> 0.65 -> span z 0.182 -> 0.162 (o centro fica livre).
  M_Visor: x 0.221 | y 0.315 = 95,5% do casco | z[0.702,0.864] = 0.162. M_Eye recuada.
  W695D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas. build 47.7s.


## P65 (GATE v13): U 12mm MAIS BAIXA + ALPHA 0.30 ***
  Gate v13 (W695D) = 6/10. Positivo registrado pelo vision: 'com alpha 0.80 da pra ver o fantasma da pupila atraves' -> a
    transparencia FUNCIONA. Maior erro: 'borda/U inferior ainda cruza a linha dos olhos'. Acao dada: 'desca a U 10-12mm pro
    queixo e baixe alpha pra ~0.3'.
  APLICADO no W696D: visor_dz -0.160 -> -0.172 (U 12 mm mais baixa: z 0.702 -> 0.690) e visor_alpha 0.80 -> 0.30.
    M_Visor: x 0.214 | y 0.308 = 93% do casco | z[0.690,0.852] = 0.162. M_Eye (0.741-0.760) segue dentro.
  NOTA DE ESCALA REAL: 12 mm em 2,35 m = 0,5% da peca. O vision pediu em mm e a mudanca e mensuravel, mas e do tipo que
    'nao aparece' em render de longe — por isso a medicao por material vem antes do gate, e o gate decide o perceptivel.
  W696D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** GATE v14: 'VISEIRA EM 2 PARTES' — O ROSTO ESTA A FRENTE DA VISEIRA ***
  Vision (W696D): (1) 'ainda cruza o branco inferior dos olhos' | (2) 6/10 | (3) MAIOR ERRO: 'viseira em 2 PARTES, topo ainda
    OPACO' | (4) 'faca viseira unica curva com alpha 0.30 em tudo'. Tambem registrou o positivo: 'o U transparente esta mais baixo
    e mais apagado' -> o P65 funcionou.
  CAUSA, MEDIDA (nao inferida):
    M_Face : x[-0.323,-0.128]  -> frontal em -0.128
    M_Visor: x[-0.347,-0.133]  -> frontal em -0.133
    O front e +X, logo MAIOR x = mais a frente. O ROSTO (M_Face, OPACO) esta 5 mm A FRENTE da VISEIRA.
    Isso explica exatamente a leitura 'duas pecas': na faixa dos olhos quem aparece e o M_Face opaco (com os olhos pintados
    nele); so na faixa de baixo, onde nao ha rosto, a viseira transparente aparece. O alpha 0.30 esta correto — esta no lugar
    errado da PILHA.
  FIX CONCRETO (uma ordem de profundidade, nao estetica):
    a viseira tem de ficar NA FRENTE do rosto. Opcoes: (a) aumentar visor_off de 0.020 para ~0.045-0.055 para o frontal da
    viseira passar o do rosto; ou (b) recuar M_Face em x (empurrar o rosto para dentro) preservando os olhos. Depois reconferir
    que x_max(M_Visor) > x_max(M_Face) na faixa z dos olhos, na medicao por material — e so entao o gate visual.
  W696D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** HIPOTESE 'ROSTO A FRENTE' REFUTADA: A ORDEM DE PROFUNDIDADE ESTA CORRETA ***
  Medicao x_max na faixa dos olhos (z 0.735-0.770) no W697D (visor_off 0.050):
    M_Visor  -0.1585  <- MAIS A FRENTE (correto!)
    M_Gasket -0.1851
    M_Eye    -0.2542
    M_Face   SEM FACES nessa faixa
  CONCLUSAO: a minha hipotese do gate v14 ('o rosto opaco esta 5 mm a frente') esta ERRADA — o M_Face nem tem
    faces na faixa dos olhos (o x[-0.323,-0.128] que eu medi e global, de outra parte do rosto). E a ORDEM DE
    PROFUNDIDADE NA FAIXA DOS OLHOS ESTA CORRETA: viseira > gasket > olhos.
  LICAO (refina a regra do gate v14): medir por material NA JANELA DA REGIAO, nao pelo bbox global. Eu comparei
    frontais GLOBAIS e conclui 'rosto a frente'; a janela mostrou que o M_Face nao esta ali. O bbox global mente
    quando a malha tem partes distantes entre si.
  CANDIDATOS RESTANTES para o 'topo opaco' do vision: (1) a propria superficie do CASCO (M_Blue) na faixa dos olhos;
    (2) o M_Gasket (opaco, 7 cm a frente dos olhos). PROXIMO: medir x_max(M_Blue) e a cobertura do M_Gasket na faixa
    dos olhos; e conferir se o alpha 0.30 do M_Visor realmente atua no render Eevee (blend_method BLEND).
  W697D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14.


## *** CAUSA DO 'TOPO OPACO': A FAIXA AMARELA ATRAVESSA A JANELA DOS OLHOS ***
  Medicao (W697D, /tmp/depth2.py):
    x_max na faixa dos olhos (z 0.735-0.770): M_Visor -0.1585 (1988 faces) > M_Yellow -0.2161 (1597) > M_Blue -0.2330
      > M_Eye -0.2542 (112)
    Faces A FRENTE dos olhos (-0.2542) na janela |y|<=0.05: M_Visor 466 | M_Yellow 258 | M_Gasket 58 | M_Blue 46 |
      M_ChinPanel 20
  CONCLUSAO: o oclusor opaco NAO e a viseira nem o rosto (hipoteses anteriores) — e a FAIXA AMARELA (M_Yellow), com
    258 faces dentro da janela dos olhos, a x=-0.2161, na frente dos olhos. Confere com o que o vision repete desde o
    primeiro gate: 'faixa central muito larga, reta, chapada, terminando abruptamente acima da testa'. No concept a faixa
    e FINA e vai do topo ate o NARIZ, com os olhos AO LADO dela.
  SEGUNDO ACHADO: M_ChinPanel tem 20 faces dentro da janela dos olhos (topo em z 0.7565 invade a faixa 0.741-0.760).
  FIXES (dois, ambos mensuraveis com o mesmo instrumento):
    1. ESTREITAR a faixa central (M_Yellow) para ela nao cruzar |y| dos olhos (~0.04) na altura deles — alvo: 0 faces
       de M_Yellow na janela |y|<=0.05, z 0.735-0.770;
    2. resolver a sobreposicao M_ChinPanel x olhos: subir os olhos OU baixar o topo do painel (a altura do painel esta
       calibrada em 132 px, entao preferir reposicionar os olhos preservando a altura do painel).
  METODO CONSOLIDADO (vale para todos os proximos): medir por material NA JANELA DA REGIAO e listar QUEM ESTA A FRENTE do
    alvo — isso identifica o oclusor real em uma medicao, sem hide-test e sem repintura.
  W697D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14.


## *** P66: ESTREITAR EM Y NAO RESOLVE A OCLUSAO — O FIX E ENCURTAR EM Z ***
  P66 aplicado: 1682 de 2070 verts de M_Yellow na calota trazidos para |y|<=0.022 (a faixa ESTREITOU — ataca o 'muito larga'
    do vision).
  EFEITO COLATERAL QUE ENSINA: as faces de M_Yellow na janela dos olhos SUBIRAM de 258 -> 356.
    CAUSA: a janela classifica faces pelo CENTROIDE. Puxar verts de |y|>0.022 para +-0.022 move os CENTROIDES para o centro,
    fazendo MAIS faces caberem em |y|<=0.05. Ou seja: o contador da janela NAO mede 'quanto oclui' — mede 'quantas faces
    tem centroide ali'. Estreitar em y nao e o fix da profundidade.
  O FIX REAL (a profundidade diz): M_Yellow esta a x=-0.2161, NA FRENTE dos olhos (-0.2542) -> a faixa desce SOBRE os olhos.
    No concept a faixa termina no NARIZ, ACIMA dos olhos. Entao: ENCURTAR a faixa em Z (terminar em ~0.80, acima da faixa dos
    olhos 0.741-0.760), nao estreitar em Y. O estreitamento em Y permanece valido pelo 'muito larga', mas e outro objetivo.
  CRITERIO NOVO (substitui o contador de faces): usar x_max POR MATERIAL na janela — quem tem x_max > x_max(M_Eye) e um
    oclusor potencial; a medida certa e 'existe face de X cobrindo o RETANGULO dos olhos', nao 'quantas faces tem centroide ali'.
  W698D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** P67 RESOLVEU A OCLUSAO DA FAIXA — E O CRITERIO NOVO PROVA ***
  [P67] faixa central encurtada: 1898 verts levantados para z>=0.800 (acima da faixa dos olhos 0.741-0.760).
  CRITERIO NOVO (cobertura do RETANGULO dos olhos, y +-0.04, z 0.741-0.760, com x > x_max(M_Eye)):
    M_Visor     206 faces  -> CORRETO (e o vidro, deve estar a frente)
    M_Blue       60 faces  -> O CASCO cobre parte do retangulo dos olhos (NOVA causa, medida)
    M_Gasket     20 faces
    M_ChinPanel   5 faces
    M_Yellow    AUSENTE    -> a faixa NAO cobre mais os olhos (antes: 258-356 pela contagem de centroides)
  O criterio novo (cobertura) e MUITO melhor que o contador de centroides: provou a correcao do P67 de forma
    inequivoca e revelou o oclusor seguinte (M_Blue) na MESMA medicao.
  FIXES SEGUINTES (por contagem, mesma medicao):
    1. M_Blue 60 faces — os olhos estao afundados na superficie do casco. Trazer M_Eye para a frente em x (o front e +x) ou
       abrir o casco na regiao; com o vidro a 206 faces a frente, os olhos vao ficar atras do vidro, que e o objetivo;
    2. M_ChinPanel 5 faces — topo em z 0.7565 invade 0.741-0.760; encurtar o topo OU subir os olhos;
    3. M_Gasket 20 faces — conferir se sao o aro (esperado) ou invasao.
  W699D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.


## *** OCLUSAO DOS OLHOS RESOLVIDA: SO O VIDRO ESTA A FRENTE ***
  eye_dx -0.008 -> +0.048 (o front e +x). x_max dos olhos: -0.2726 -> -0.2166 (5,6 cm para a frente).
  CRITERIO DE COBERTURA no W700D:
    M_Visor     206 faces a frente (CORRETO — e o vidro)
    M_ChinPanel   5 faces (resta encurtar o topo)
    M_Blue AUSENTE (era 60) | M_Gasket AUSENTE (era 20) | M_Yellow AUSENTE
  Ou seja: o casco e o gasket deixaram de cobrir os olhos e o UNICO material na frente dos olhos e o vidro.
  HISTORICO DO DIAGNOSTICO (4 hipoteses, 3 refutadas por medicao — todas registradas):
    1. 'a viseira e uma caixa' -> verdadeiro, corrigido com a projecao na elipsoide (P61);
    2. 'o rosto opaco esta a frente' -> REFUTADO (M_Face nao tem faces na faixa);
    3. 'estreitar a faixa em y resolve' -> REFUTADO (a contagem de centroides SUBIA ao estreitar);
    4. 'a faixa desce sobre os olhos' -> CONFIRMADO e corrigido (P67, encurtar em z);
    5. 'o casco afoga os olhos' -> CONFIRMADO e corrigido (eye_dx +0.048).
  W700D verde: 0 SyntaxError/Traceback/NameError, QA ok, sep_parts=14, globais preservadas.
