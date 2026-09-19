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
