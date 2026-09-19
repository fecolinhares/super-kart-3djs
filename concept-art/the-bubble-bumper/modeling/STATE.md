# Estado — Bubble Bumper (melhor versao: W253)

## METRICA (medida por qa_bb.py — executavel, nao opiniao)

| Metrica | W184 baseline | W202 | W233 | **W253 (atual)** | gate alvo |
|---|---|---|---|---|---|
| IoU silhueta media | 0.786 | 0.821 | 0.809 | **0.808** | >=0.830 |
| Media das 10 piores regioes | - | - | 0.740 | **0.748** | >=0.800 |
| Pior regiao | - | - | 0.684 | **0.705** | >=0.780 |
| Erro perfil lateral | 16.7% | 5.9% | 7.4% | **6.9%** | <=6.5% |
| Erro vista frontal | 38.1% | 8.9% | 11.5% | **11.1%** | <=9.5% |
| Erro vista traseira | 37.3% | 6.7% | 10.7% | **10.5%** | <=9.5% |
| Desvio de cor/canal | - | 10 | 7 | **6** | <=5 |
| QA tecnico | - | - | 0 non-manifold 98.4% quads | **idem** | 0 non-manifold |

## IOU POR PARTE (W253) — o mapa real

PIORES (atacar): TOP/ASA 0.705 · TOP/BICO_U 0.716 · FRONT/PARACH 0.706 · SIDE/TRASEIRA 0.708
MEDIOS: SIDE/BICO 0.743 · TOP/RODAS_DIANT 0.757 · TOP/MOTOR 0.789 · SIDE/PILOTO 0.797
BONS (>=0.90): FRONT/CAPACETE 0.984 · FRONT/RODAS_BAIXO 0.927 · TOP/SIDEPODS 0.920
             REAR/ESCAPES 0.907 · REAR/PILOTO_COSTAS 0.901

## CORRECOES QUE A METRICA APROVOU (mantidas)

1. W250 — asa recuada 0.06 + para-choque traseiro como elemento mais traseiro:
   TOP/ASA 0.684->0.705, TOP/BICO_U 0.693->0.716, MENOR 0.684->0.705
2. W253 — eixo dianteiro 0.115m a frente: perfil 7.3->6.9, P10 0.745->0.748
3. (anteriores, W184->W233): bico 0.84->0.34m · cowl fator 1.07->0.97 e largura 1.49x->1.0x
   · asa assimetrica corrigida · rosto por TEXTURA+UV (Emission) · farol (funcao nunca chamada)
   · bumper com blocos integrados · sidepod -30% comprimento -15% altura · escapes hierarquizados

## TESTES LIMPOS REVERTIDOS PELA METRICA (reverter e resultado)

| Teste | IoU | P10 | menor | veredito |
|---|---|---|---|---|
| rodas +0.235m (ambos eixos) | 0.787 | 0.725 | 0.585 | revertido |
| bumper traseiro estreitado | 0.810 | 0.743 | 0.700 | revertido |
| coroa do capacete (pa 0.85/0.72/0.60) | 0.808 | 0.741 | 0.684 | revertido |
| asa sobe 0.098m | 0.773 | 0.677 | 0.405 | revertido |
| pneus -30% | 0.812 | - | - | revertido |
| asa span 0.300 / 0.572 | - | - | 0.585 | revertido (otimo medido 0.505) |

## BUG DE INSTRUMENTO CORRIGIDO (crítico)

Ate W233 o `qa_bb.py` media as regioes de FRONT/REAR no eixo ERRADO (colunas = largura,
nao altura). Sintoma: FRONT_CAPACETE marcava 0.680 CONSTANTE em 4 geometrias diferentes.
**Metrica que nao responde a uma mudanca real de geometria esta quebrada, nao e um achado.**
Com o eixo correto: FRONT_CAPACETE = 0.984 (o MELHOR, nao o pior) e o pior real e TOP_ASA.
Toda a priorizacao anterior (optimizar o capacete) estava apontada para a regiao errada.

## O QUE NAO ESTA RESOLVIDO (caminho)

- TOP/ASA 0.705 e TOP/BICO_U 0.716: o plano do concept e fino/tubular; o modelo e gordo
- FRONT/PARACH 0.706: para-choque visto de frente
- SIDE/TRASEIRA 0.708: silhueta traseira de perfil
- Tudo e `join()` num mesh so -> os criticos leem "monobloco". A skill mede
  `skeleton()` + SKIN (93,4% valencia-4) como tecnica de organico, com pecas separadas.
- Capacete: o concept mede L/A 1.195 no perfil; o modelo 1.487 (largo demais em X)

## SUPOSICAO DUVIDOSA (nomeada)

Que fidelidade a um concept cartoon organico se atinge com `loft()` + SUBSURF + `join()`
final. Os ajustes de parametro saturaram: cada teste limpo ou empata ou piora.
