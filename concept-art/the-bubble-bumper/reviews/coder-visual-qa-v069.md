# Coder Visual QA — Bubble Bumper V069

**Data:** 2026-09-14
**Fonte:** `../assets/the-bubble-bumper.jpg` + `../assets/reference-orthographic/{top,front,rear,side}.jpg`
**Evidência:** `../modeling/v069-contact-sheet.png` e renders em `../modeling/renders-v069/`
**Veredito:** `CODER_REJECT — candidato de reconstrução, não asset final`

## O que melhorou

- V069 recupera a silhueta manual de v045, que é visualmente mais próxima do concept que o visual-hull v067.
- Profile tem melhor relação entre roda dianteira/traseira, pod com inset azul, cockpit e rear module.
- Front/rear preservam bumper segmentado, barra transversal, central circular, molas e exatamente dois escapes.
- O arquivo real foi construído no Blender 4.0.2 do GPU runner e renderizado nas cinco câmeras.

## P0 ainda bloqueando

- O shell/nose ainda lê como uma composição de volumes suaves, não como a construção específica do concept.
- O bumper é reconhecível, mas a integração dos retornos/sockets com o nariz não é suficientemente convincente no isométrico.
- O piloto ainda é uma base estilizada genérica; a continuidade anatômica e o contato com cockpit/volante não atingem fidelidade extrema.
- O conjunto frontal e a traseira têm peças adicionais/overhangs que alteram a leitura da prancha.
- A câmera do TOP não é uma reprodução calibrada 1:1 da ortográfica; portanto, o board atual é prova visual, não medição definitiva.

## P1 após novo passe de forma

- Melhorar transições SubD do shell e cowl, seams e recessos físicos.
- Refinar capacete/face/visor e pose humana com base rigada.
- Recalibrar câmeras com landmarks das ortográficas e gerar clay, silhouette/ID, depth e wireframe.
- Só depois aplicar UV/LOD/export.

## Gate seguinte

Sol não foi chamado para V069: o gate coder ainda está REJECT. O job independente `gpt-5.6-sol/xhigh` analisou a representação/pipeline e confirmou o reset híbrido, mas não aprovou nenhum asset. Integração e export permanecem bloqueados.
