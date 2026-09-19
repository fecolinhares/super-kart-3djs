# Estado do modelo — Bubble Bumper (W233)

## Numeros (medidos por measure_bb.py)

| Metrica | Baseline (W138) | W202 | **W233 (atual)** |
|---|---|---|---|
| Erro perfil lateral | 16.7% | 5.9% | **7.4%** |
| Erro vista frontal | 38.1% | 8.9% | 11.5% |
| Erro vista traseira | 37.3% | 6.7% | 10.7% |
| IoU de silhueta (media) | 0.738 | 0.821 | **0.809** |
| Delta maximo de cor/canal | - | 10 | **7** |
| QA tecnico | - | 0 non-manifold, 98.6% quads | **0 non-manifold, 98.4% quads** |
| Verts | - | 97k | 86k |

## IoU por PARTE (W233) — onde esta bom e onde esta ruim

BOM (>=0.90): FRONT NARIZ 0.951 · FRONT ASA 0.955 · TOP SIDEPODS 0.920 · REAR ESCAPES 0.929
MEDIO (0.80-0.90): SIDE COWL 0.888 · TOP MOTOR 0.789 · SIDE PILOTO 0.797 · REAR PILOTO 0.791
RUIM (<0.80): **FRONT CAPACETE 0.680** · **TOP ASA 0.684** · **TOP BICO 0.693** · **SIDE TRASEIRA 0.708**
            SIDE BICO 0.743 · TOP RODAS 0.755 · FRONT PARACH 0.789

## O que foi corrigido com MEDICAO (nao com opiniao)

1. Bico: largura 0.84m -> 0.34m (era 2.4x o concept)
2. Cowl: topo em prof_top*1.07 (7% ACIMA do perfil) -> *0.97; largura 1.49x -> 1.0x
3. Asa traseira: era ASSIMETRICA (um unico ponto em -0.522) -> simetrica
4. Rosto: trocado de per-face/geometria para TEXTURA + UV com material Emission (funciona)
5. Farol: `headlight()` existia mas NUNCA era chamado -> ativado
6. Para-choque: 4 colares/pinos -> 2 blocos amarelos integrados
7. Sidepod: -30% comprimento, -15% altura, cap azul no topo
8. Escapes: hierarquia (central dominante 0.128, laterais 0.080)
9. Anel amarelo do aro: da borda do pneu para dentro (0.795-0.858R)
10. Molas traseiras: M_Yellow -> M_Gold

## Experimentos REVERTIDOS pela metrica (reverter e resultado)

- pneus -30%: perfil 5.9 -> 9.2 (PIOR)
- rodas 0.24m a frente: IoU 0.779 -> 0.731 (PIOR)
- asa span 0.300: FRONTAL 15.3 / TRASEIRA 14.6 (PIOR)
- asa span 0.572: FRONTAL 12.8 (PIOR)
- Melhor span medido: 0.505

## O que NAO esta resolvido

- CAPACETE (0.680): forma esfera vs gota do concept; viseira ainda sem translucidez real
- TOP ASA / BICO (0.684 / 0.693): o plano do concept e fino e tubular, o modelo e gordo
- SIDE TRASEIRA (0.708): difusor e para-choque traseiro
- Pneus: concept tem desenho de banda (gradiente medido 8.35 vs 3.03); decidi slick por
  close-up, mas criticos insistem no contrario — pendente de uma medicao nao-contaminada
- Objetos separados: hoje tudo e `join()` num mesh so (causa a leitura de "monobloco")

## Suposicao duvidosa (nomeada)

Que fidelidade a um concept cartoon organico se atinge com `loft()` + SUBSURF + `join()` final.
Os criticos convergem em "monobloco / boneco derretido". A skill indica `skeleton()` + SKIN
(93,4% valencia-4 medido) para organico, e manter piloto/chassi/carenagens/rodas separados.
