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
