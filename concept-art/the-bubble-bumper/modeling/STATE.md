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
