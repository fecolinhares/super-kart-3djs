# Sol Plan Review — The Bubble Bumper

**Modelo/reasoning:** `gpt-5.6-sol-900k / xhigh`
**Data:** 2026-09-13
**Fonte:** `../assets/the-bubble-bumper.jpg`
**Status:** direção técnica; não é aprovação de asset.

## Observações confirmadas

- A prancha possui cinco painéis: TOPO, LATERAL, FRENTE, TRÁS e ISOMÉTRICO.
- Frente aponta para a esquerda nos painéis topo/lateral.
- Bumper frontal é um U largo, profundo, tubular e externo ao nariz; não é splitter/lâmina.
- Organização transversal: pneu | side pod | cockpit/piloto | side pod | pneu.
- Cockpit é aberto, central e rebaixado; piloto não ocupa toda a largura.
- Side pods são volumes abaulados entre os eixos, com maior massa próxima ao quadril.
- Rear module é central e confinado entre pneus traseiros; molas ficam lateralmente.
- Barra traseira cruza transversalmente; existem exatamente dois escapes inclinados para cima/fora.
- Trás possui elemento circular central e grade inferior separada.

## Escala de blockout

`D = 0,500 m`, diâmetro do pneu dianteiro; Blender em metros; plano do solo `z=0`; `+Y` frente; `+Z` cima.

| Elemento | Medida inicial |
|---|---:|
| Comprimento total | 2,375 m |
| Largura total | 1,550 m |
| Altura até capacete | 1,100 m |
| Entre-eixos | 1,550 m |
| Bitola dianteira | 1,200 m |
| Bitola traseira | 1,250 m |
| Pneu dianteiro | Ø0,500 × 0,250 m |
| Pneu traseiro | Ø0,525 × 0,300 m |
| Bumper além do eixo | 0,400 m |
| Largura do bumper | 1,425 m |
| Tubo do bumper | Ø0,100 m |
| Abertura cockpit | 0,675 × 0,390 m |
| Side pod length/width | 0,850 / 0,215 m |
| Rear module | 0,390 × 0,525 m |
| Barra traseira | 1,400 m × Ø0,080 m |
| Cada escape | 0,360 m × Ø0,070 m |
| Capacete | Ø0,360 m |
| Vão livre inicial | 0,080 m |

Tolerâncias: centros de roda ±0,05D; envelope geral ±0,10D; silhueta primária ±0,12D.

## Câmeras contratuais

- 960×720, 4:3, ortográficas, fundo neutro, mesma iluminação.
- `CAM_TOP`: ortho 1,959 m; prova U, wheel envelopes, cockpit, pods e traseira.
- `CAM_SIDE_L`: ortho 1,959 m; prova overhangs, chão, cockpit, bumper, barra e escapes.
- `CAM_FRONT`: ortho 1,279 m; prova bumper, bitola, nariz, pneus e centralização.
- `CAM_REAR`: ortho 1,279 m; prova barra, housing, círculo, grade, escapes e molas.
- `CAM_ISO_FRONT`: ortho 1,898 m; prova integração tridimensional e ausência de peças soltas.
- Suplementares posteriores: `LOW_REAR_34` e `COCKPIT_CLEAR`.

## Pipeline aprovado para execução

Híbrido: setup procedural controlado para unidades, envelopes, rodas, curvas do bumper, molas, tubos, câmeras, materiais e auditoria; modelagem autoral/manual para primary shell, nariz, cockpit, side pods, rear housing e piloto.

Ordem: envelopes → rodas/postura → primary body → bumper/side pods → cockpit → rear mechanical → steering/pilot → materials → technical validation.

## Bloqueios explícitos

- Não usar primitives como substituto de primary shell autoral.
- Não suavizar o design até virar uma cápsula genérica.
- Não tratar o Bumper como splitter ou asa.
- Não usar pneus dragster ou tread.
- Não usar cor para esconder falhas de silhueta.
- Não declarar aprovação: a revisão Sol adicional excedeu timeout e nenhum asset foi validado.
