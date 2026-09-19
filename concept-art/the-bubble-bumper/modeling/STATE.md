# STATE — Bubble Bumper (sessao 2026-09-19)

## Modelo ativo
`the-bubble-bumper.blend` = **W282** | builder: `build_bb2.py`

## Metricas (qa_bb.py W282)
- IOU_MEDIA 0.823 (baseline da sessao: W265 = 0.813)
- IOU_P10_MEDIA 0.768
- IOU_MENOR_REGIAO 0.714 (FRONT/PARACH)
- IOU_TOP_ASA 0.777 (era 0.697 no W265)
- IOU_TOP_BICO_U 0.761 (era 0.706)
- PERFIL_LAT_PCT 6.0 | FRONTAL_PCT 7.1 | TRASEIRA_PCT 8.1 | COR_MAXDELTA 5
- QA: 0 non-manifold, 98.4% quads, 86.124 verts

**5 de 14 gates passam.**

## Achados desta sessao (dois bugs de INSTRUMENTO)

### 1. `profile_z` normalizava largura pela ALTURA
Em `measure_bb.py`, `tc = largura_px / Hc`. A largura e o eixo X e deve ser
normalizada pela largura do bbox. Com aspect ratios diferentes (concept W/H=1.51,
render 1.93) dois objetos identicos davam ~28% de erro. Sintoma: FRONTAL/TRASEIRA
travados em ~9-11% e IMUNES a mudancas grandes de geometria (W262 baixou a asa
0.14 m e o numero nao se moveu). Corrigido -> FRONTAL/TRASEIRA honestos (9.2/10.3).

### 2. A mascara do concept contem LINHAS DE COTA
Runs de 1-2 px isolados nas bordas inflam `ext` (max-min). Em xf 0.10 a extensao
real e 0.728 e a medida bruta era 0.864. **Sempre use o run principal, nao max-min.**
Foi isso que me fez perseguir "estender as bananas ate xf 0" no inicio da sessao.

## O que destravou a metrica (W275 -> W282)
**BARRA TRANSVERSAL FRONTAL** (`FBump_Bar`, params fbar_x/z/c/y).
Medicao: em xf 0.175 o concept tem um run CONTIGUO de 1.31 m (azul+preto atravessando
os dois lados); o modelo tinha 3 runs separados (nose + 2 cantos do U) -> IoU 0.55 ali.
Adicionar a barra: TOP/ASA 0.697->0.777, BICO 0.706->0.761, IoU 0.813->0.823.
Params otimos: fbar_z=0.085, fbar_c=0.190, y=0.585.

## Testes revertidos por medicao (nao repetir sem nova evidencia)
| teste | efeito |
|---|---|
| asa baixa 0.605->0.464 | FRONTAL 7.1->14.8, TRASEIRA 8.1->22.5 |
| asa sobe 0.605->0.686 | IoU 0.773, pior regiao 0.405 |
| escapes afinados/encurtados | neutro (0.812 vs 0.813) |
| bumper U recuado (_bx XRE+0.30) | identico |
| pods mais altos (zt 0.265-0.405) | IoU 0.826 mas COR 10 (quebra G8) |
| rodas +0.235 / bumper estreitado / coroa capacete | todos piores |

## Veredicto do vision (4 vistas, W282)
"Quase fiel, com ressalvas fortes." Desvios que restam:
1. **Side pods largos/bojudos** — concept: estreitos, quase moldura ABERTA
2. **Frente larga cobrindo as rodas** — concept: rodas expostas, vazio na frente
3. **Traseira fechada** — concept: motor/chassi/escapes EXPOSTOS
4. **Escapamento** — concept: 2 canos redondos; modelo: saida central grande
5. **Piloto** — concept: tronco inclinado a frente, rosto humano visivel

## Proxima alavanca (nao e ajuste de parametro)
O concept e um kart ABERTO com mecanica exposta; o modelo e um monobloco carenado.
O salto restante (0.823 -> 0.830+ e regiao 0.714 -> 0.780) exige **reduzir volume
onde o concept e vazio** (pods, frente sobre as rodas, traseira), nao empilhar forma.
O padrao medido: em xf 0.94-0.99 o concept tem 4 pecas finas separadas (149 px) e o
modelo 1 bloco continuo (269 px).
