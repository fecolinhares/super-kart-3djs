# The Bubble Bumper — revisão técnica independente de representação e pipeline

**Data:** 2026-09-14
**Papel:** revisor técnico independente
**Veredito atual:** `REJECT — REPRESENTATION RESET REQUIRED`
**Promoção:** bloqueada

## 0. Declaração de estado

Nenhum asset está aprovado. O v067 está rejeitado nas vistas TOP, FRONT, REAR, SIDE e também no isométrico. Passes antigos, manifold, ausência de n-gons, UVs, contagem de triângulos, export bem-sucedido ou beauty render não concedem aprovação visual. Uma malha tecnicamente válida pode continuar geometricamente errada; um render bonito pode esconder exatamente as interseções, cavidades preenchidas e peças sem ancoragem que precisam ser julgadas.

As quatro fontes autoritativas de proporção são, sem edição:

- `assets/reference-orthographic/top.jpg`
- `assets/reference-orthographic/front.jpg`
- `assets/reference-orthographic/rear.jpg`
- `assets/reference-orthographic/side.jpg`

`assets/the-bubble-bumper.jpg` permanece autoritativa para linguagem tridimensional e vista isométrica. Números já registrados em `sol-plan.md` e `RECONSTRUCTION-CONTRACT-V068.md` são apenas hipóteses iniciais. Devem ser recalibrados nas imagens ortográficas antes de virar dimensão, câmera ou tolerância.

### Achado causal no v067

O problema é demonstrável no gerador, não apenas uma impressão do render:

1. `build_bubble_bumper_v067.py:133-163` intersecta quatro máscaras completas em uma grade de apenas `72×72×40` e emite faces de voxel. Isso funde piloto, rodas, tubos, carroceria e vazios projetados numa única massa `VISUAL_HULL_PRIMARY`.
2. `build_bubble_bumper_v067.py:137-153` normaliza cada máscara pelo próprio bounding box. Essa normalização independente elimina a escala comum, o plano de solo, wheelbase, bitolas e offsets que deveriam amarrar uma vista à outra.
3. FRONT e REAR são usados como restrições simultâneas do mesmo plano (`vx, vz`). Diferenças reais de oclusão entre frente e traseira viram erosão ou preenchimento arbitrário, não geometria inferida.
4. `build_bubble_bumper_v067.py:168-180` cobre o hull com perfis extrudados, ellipsoids, spheres, boxes, torus, cylinders e curves. Isso não corrige a base; acrescenta primitive stacking sobre uma ocupação já incoerente.
5. O piloto continua feito de ellipsoids/spheres/tubes (`:172-175`), e os wheel anchors são números fixos não derivados de landmarks calibrados (`:165-167`).

Conclusão: o v067 não deve ser retopologizado nem “limpo” como base. Ele pode ser preservado apenas como evidência negativa e mapa aproximado de ocupação. Reutilizá-lo transfere para a próxima versão a falha de representação.

## 1. Matriz de decisão

| Representação | Forças reais | Riscos dominantes | Uso permitido | Uso proibido neste asset | Decisão |
|---|---|---|---|---|---|
| Visual hull / voxel | Obtém rapidamente uma interseção conservadora de silhuetas; revela contradições grosseiras entre máscaras; útil como heatmap espacial | Preenche cockpit e concavidades, funde peças ocluídas, engrossa tubos, inventa regiões ocultas, destrói ancoragens; voxelização cria degraus; bbox independente quebra datums | Diagnóstico descartável; occupancy prior; visualização de conflito; comparação externa sem entrar no arquivo final | Primary shell, pods, piloto, bumper, rodas, suspensão, rear housing; base para retopo; qualquer superfície promovida | **Somente diagnóstico. Descartar como geometria.** |
| Lofts procedurais por seções | Parametrização rápida; simetria; controle de seções; bons para envelopes e estudos de volume | Seções elípticas impõem cápsula genérica; falham em concavidades, bordas de cockpit, shoulders, inset dos pods e mudanças locais não separáveis; podem parecer suaves e ainda erradas | Cage provisória, envelopes, pneus, dutos simples; eventualmente uma peça secundária regular após prova | Shell/nose/pods finais; cockpit; piloto; substituir transições autorais por anéis interpolados | **Guia provisório, nunca autoridade de forma.** |
| Hard-surface manual retopologizada / SubD autoral | Controle direto de landmarks, continuidade, concavidades, separação de painéis e highlights; permite corresponder simultaneamente às vistas | Exige artista e revisão multivista; overfitting a uma vista; loops excessivos; pinching; “hard-surface” mal interpretado pode deixar a forma quadrada | Primary shell, nose/cowl, cockpit well/rim, pod shells e inset, rear housing, sockets, helmet; retopo sobre cage/sculpt | Box modeling sem landmarks; boolean soup como superfície final; subdivisão usada para arredondar proporção errada | **Representação principal recomendada.** |
| Curvas Bézier/NURBS para tubos | Centro de linha auditável; seção constante; edição fácil de tangência, raio e retorno; excelente para bumper, barras e pipes | Extremidades flutuantes; auto handles mudam a trajetória; seção/roll inconsistentes; conversão prematura; NURBS patches complexos são frágeis no downstream | Bumper U, rear bar, chassis tubes, exhaust centerlines, steering column, molas/helix; converter e retopologizar após aprovação da trajetória | Shell principal; pods; piloto; tubo sem socket, collar e endpoint; usar curva para “desenhar” mecânica sem montagem | **Recomendada para elementos tubulares, com endpoints contratuais.** |
| Sculpt + base humana | Resolve anatomia, gesto e continuidade orgânica; mantém piloto reconhecível em 3/4 e perfil | Sculpt sem landmarks pode inflar proporções; scan/base genérica pode não combinar com o estilo; retopo, rig e contato ainda são obrigatórios | Base humana estilizada licenciada ou sculpt manual; pose sentada via rig; retopo; roupa e luvas sobre anatomia; helmet autoral separado | Esfera-cabeça, torso-ellipsoid, limbs-cylinders; personagem headless procedural; roupa escondendo ausência de anatomia | **Obrigatória para o piloto; primitivas estão vetadas.** |
| Pipeline híbrido | Usa cada técnica onde ela é forte; mantém automação para medição sem delegar forma à automação | Pode virar colcha de retalhos sem datums, nomes, ownership e gates; procedural pode voltar a dominar silenciosamente | Imagens/landmarks → rig de datums → SubD manual → curves tubulares → sculpt/base humana → retopo → validators procedurais | Misturar métodos sem contrato; aceitar qualquer componente só porque o pipeline terminou | **Melhor solução global.** |

### Síntese por componente

- **Primary shell, nariz, cockpit, side pods e rear housing:** malha autoral SubD/retopo manual.
- **Bumper U, rear bar, tubos de chassi, escape e molas:** curves/NURBS para centro de linha, depois conversão controlada e acabamento manual dos sockets.
- **Pilot:** base humana estilizada ou sculpt, rig/pose, retopo; helmet hard-surface manual.
- **Rodas:** gerador paramétrico aceitável, desde que centros, raios, larguras, pivots e clearances venham do contrato recalibrado.
- **Automação:** câmeras, landmarks, medições, ID masks, diff/IoU, relatórios e regressões. Não deve “inventar” o shell.

## 2. P0 por componente

| Componente | P0 obrigatório | Prova mínima | Rejeitar se |
|---|---|---|---|
| Datums e envelope | Um único sistema de eixos, plano de solo, centerline, dois planos de eixo e quatro wheel centers compartilhados por todas as vistas | Overlay TOP/SIDE/FRONT/REAR com landmarks e tabela de erro | Qualquer câmera ou peça usa normalização/autofit independente; wheelbase/track muda entre vistas |
| Rodas, hubs e uprights | Quatro pneus legíveis nos cantos; traseiros maiores/largos somente na proporção recalibrada; hubs, uprights e conexão ao chassi explícitos | ID + clay + close-up de mount/clearance | Roda flutua, penetra pod/shell, não tem suporte, pivots não coincidem ou contato com solo diverge |
| Primary shell/nose | Forma baixa/larga, uma continuidade autoral nose → shoulders → cockpit waist → rear termination, com cockpit realmente escavado | Clay com luz rasante + wireframe + TOP/SIDE/ISO | Visual hull/voxel visível, cápsula genérica, patch flutuante, buraco pintado ou transição feita por peças sobrepostas |
| Side pods/insets | Cada pod é um volume de proteção espesso entre eixos, mais cheio junto ao quadril; inset azul tem recess depth e borda amarela física | TOP/SIDE/FRONT + seção/close-up | Ellipsoid/cápsula solta, painel azul coplanar, borda só por material, pod sem mount ou invadindo roda/cockpit |
| Bumper U | Um único caminho U em planta, seção constante, arco frontal e retornos traseiros; collars, dois sockets e chassis mounts nomeados | TOP, FRONT, SIDE, ISO e close-ups dos dois endpoints | Barra/hoop/blade, curva interrompida, raio variável acidental, ponta no vazio, socket fictício/interseção |
| Cockpit/controls | Well profundo, rim/cowl, seat, steering wheel, column e espaço real para pelvis/thighs/feet | SIDE/ISO + cockpit-clear sem piloto e com piloto | Piloto sentado “em cima”, fundo fechado/raso, coluna desconectada, limbs atravessando shell |
| Piloto | Anatomia contínua e estilizada: pelvis, torso, neck, shoulders, elbows, gloves, thighs, knees, boots; mãos no volante; peso apoiado no seat | SIDE/FRONT/ISO, ID anatômico e close-up mãos/volante | Mannequin/LEGO, sphere head, limbs desconectados, mãos sem contato, pés sem destino, helmet sem face/visor legível |
| Rear assembly | Housing central compacto entre pneus, abertura circular, grille inferior separada, rear bar com pontas amarelas, duas molas laterais, exatamente dois escapes inclinados para cima/fora | REAR/TOP/SIDE/ISO + close-up | Blob genérico, terceira “saída” confundida com escape, exhaust sem pipe/mount, grille apenas pintada, barra sem suportes |
| Material boundaries | Azul/amarelo coincidem com limites de peças, recessos ou seams; rubber/metal/cockpit têm função | Material-ID + close-ups | Cor mascara topologia, boundary atravessa superfície sem justificativa, uniforme plástico |

P0 visual vem antes de P1 técnico. Panel gaps finos, fasteners, UV, LOD e otimização não são licença para adiar um P0 estrutural.

## 3. P0 por vista

### TOP

1. Frente apontando para a esquerda, centerline estável e quatro wheel centers alinhados ao mesmo wheelbase.
2. Envelope baixo/compacto; largura externa dominada por rodas e bumper, não por massa voxel.
3. Bumper lê como U profundo: arco à frente, abertura para trás, retornos e dois sockets visíveis.
4. Pods têm plano orgânico próprio, maior massa junto ao quadril e separação clara de pneus/cockpit.
5. Cockpit/piloto são centrais; volante está à frente do capacete; traseira permanece compacta e confinada entre os pneus.

### FRONT

1. Pneus dianteiros são os extremos laterais; contato com solo é bilateral e o corpo central não os engole.
2. Hierarquia: bumper espesso e baixo → abertura/grade → nariz curto → cockpit/piloto central; não uma pilha vertical.
3. Side pods e shoulders são simétricos dentro da incerteza da fonte e não substituem o bumper.
4. Capacete/face/visor, mãos e volante permanecem legíveis; piloto não vira volume central abstrato.
5. Bumper tem duas pernas/returns coerentes com TOP e mounts coerentes com ISO.

### REAR

1. Pneus traseiros, wheel centers e ground contacts correspondem a TOP/SIDE; pneus não são absorvidos pelo housing.
2. Barra transversal é mais estreita que o envelope externo dos pneus, com dois mounts e duas pontas amarelas.
3. Housing central, abertura circular e grille inferior são três leituras separadas, não um único blob.
4. Existem exatamente dois exhaust outlets laterais/inclinados, ligados por tubos ao módulo; a abertura circular central não é contada como terceiro escape.
5. Molas/arms/hubs exibem frame-to-upright chain; piloto/cockpit permanecem centralizados atrás da barra sem colisão.

### SIDE

1. Frente para a esquerda; wheelbase, raios, overhang dianteiro/traseiro e ground clearance são os mesmos datums do TOP.
2. Linha inferior é contínua e baixa; só pneus tocam o solo.
3. Bumper está à frente do nariz, próximo ao solo e retorna para um socket real; não é peça solta.
4. Pod é volume contínuo entre eixos; cockpit é profundo; piloto tem postura sentada, braços e pernas dobrados.
5. Rear module é compacto; rear bar e dois exhausts têm altura/ângulo coerentes com REAR/ISO.

### ISOMETRIC

A isométrica é uma prova de reconciliação 3D, não uma quinta ortográfica independente.

1. Shell, nose, pods e cockpit formam uma composição coerente sem superfícies duplicadas, voxel steps ou primitive stacking.
2. Todos os tubos terminam em socket/flange/housing; nenhuma peça “entra” em outra por simples interpenetração.
3. As quatro rodas têm hubs/uprights/arms legíveis e clearances radiais/laterais.
4. Piloto ocupa um volume habitável e toca seat/volante/pedais; não flutua nem é soterrado.
5. Rear assembly tem profundidade, mounts e cadeia de peças inequívoca; a câmera não pode esconder o lado crítico.

O v067 não possui isométrica aceitável: ela revela camadas concorrentes, shell/estrutura misturados, wheels sem mounts, cockpit ilegível e endpoints do bumper ocultos.

## 4. Ordem de passes e critérios de saída

| Pass | Trabalho | Critério de saída obrigatório |
|---|---|---|
| 0. Freeze | Hash/dimensões das cinco fontes; nenhuma edição; registrar autoridade e conflitos | Paths e hashes fixos; orientação de cada vista confirmada |
| 1. Calibração 2D | Marcar centerline, ground, wheel centers, tire extents, body/pod/cockpit/bumper/rear landmarks com confidence | Landmarks revisados nas quatro imagens; hipóteses separadas de observações; nenhuma bbox normalizada isoladamente |
| 2. Rig de datums/câmeras | Eixos, escala provisória D, wheelbase/track, ground e câmeras solucionadas | Mesmo rig projeta todos os datums dentro das tolerâncias; câmeras congeladas e versionadas |
| 3. Wheels + proxies | Pneus/hubs como envelopes; proxies simples de seat/piloto/rear | Contato, raios, larguras e centers passam nas quatro ortográficas; sem detalhe cosmético |
| 4. Primary shell manual | Cage SubD autoral, nose, shoulders, cockpit opening e rear termination | Clay e silhouette passam TOP/FRONT/REAR/SIDE; wireframe mostra loops intencionais; zero voxel/primitive silhouette |
| 5. Cockpit + pods | Well/rim/seat/cowl; pod shells, recess e mounts | TOP/SIDE/FRONT/ISO passam; recess é geométrico; cockpit contém proxy sem colisão |
| 6. Bumper U | Centro de linha por curve, seção, retornos, collars, sockets e mounts | TOP/FRONT/SIDE/ISO provam caminho contínuo e endpoints; nenhum tube-in-box |
| 7. Wheel anchoring | Uprights, arms, hubs, dampers/springs e chassis hardpoints | Quatro cadeias chassis→arm/upright→hub→wheel existem; clearance estático aprovado |
| 8. Pilot + controls | Base/sculpt, rig/pose, retopo, suit, gloves, helmet, steering/column/pedals | Mãos gripam aro, pés alcançam controles, pelvis/seat e back/seat contact; identidade passa FRONT/SIDE/ISO |
| 9. Rear module | Housing, circle, grille, bar, braces e dois exhaust systems | REAR/TOP/SIDE/ISO passam simultaneamente; exatamente dois outlets e mounts legíveis |
| 10. Gate P0 integrado | Clay, silhouette/ID, overlays, wireframe e close-ups | 5/5 vistas sem P0; qualquer regressão volta ao componente causador |
| 11. P1/appearance | Seams, fasteners, lips, coils, materials e roughness | Detalhe físico não altera silhouette/landmarks; material-ID coincide com geometry boundaries |
| 12. Técnico/export | Retopo final, normals, UV, LOD, budgets, collision, export/read-back | Só iniciar após coder PASS + Sol PASS + user PASS; export reaberto e visualmente comparado |

Não há “percentual médio” que compense falha. A saída de cada pass exige todos os critérios daquela linha.

## 5. Contrato de câmeras e provas

### 5.1 Sistema de coordenadas

- Blender em metros; `+Y = frente`, `-Y = traseira`, `+Z = cima`, `X = transversal`.
- `z=0` é o plano de contato dos pneus.
- `D` é o diâmetro dianteiro recalibrado na SIDE; `B` é o wheelbase recalibrado; `T_f/T_r` são bitolas por eixo.
- Os valores atuais (`D=0,500 m`, envelopes e offsets) ficam marcados `PROVISIONAL` até a calibração 2D fechar.

### 5.2 Câmeras

- `CAM_TOP_ORTHO`: +Z olhando para o ground; roll congelado para `+Y` aparecer à esquerda, como a fonte TOP.
- `CAM_FRONT_ORTHO`: posicionada em +Y olhando -Y; horizontal/vertical e handedness verificados contra a fonte.
- `CAM_REAR_ORTHO`: posicionada em -Y olhando +Y; não espelhar silenciosamente a imagem.
- `CAM_SIDE_ORTHO`: lado observado na fonte, com +Y/frente aparecendo à esquerda.
- `CAM_ISO_MATCH`: calibrar duas hipóteses contra landmarks da vista isométrica do composite — ortográfica/isométrica e perspectiva — e congelar a de menor erro de reprojeção. **Não presumir ORTHO nem perspectiva sem esse teste.** `CAM_ISO_FRONT` ortográfica em `RECONSTRUCTION-CONTRACT-V068.md` continua hipótese, não contrato validado.

A resolução nativa das referências é `1024×559`. Provas comparativas devem preservar esse aspect ratio. `960×720`/4:3 pode ser usado para close-up técnico, mas não como overlay principal das fontes 1024×559. Cada câmera pode ter uma `ortho_scale` própria, calibrada uma vez pela imagem correspondente; é proibido auto-fit ou normalização por bounding box a cada candidato.

### 5.3 Pacote de evidência por revisão

1. **Paired board REF × MODEL:** TOP, FRONT, REAR, SIDE; mesma orientação, aspect ratio, landmarks e framing calibrado.
2. **Clay:** diffuse neutro, roughness alta, luz simples e sombra de contato; sem bloom, DOF, stylized outline ou reflexo que esconda continuidade.
3. **Silhouette/ID:** black-fill do conjunto e material IDs flat por componente (`shell`, `pods`, `bumper`, `wheels`, `pilot`, `rear`, `structure`), sem iluminação; gerar métricas e overlay de contorno.
4. **Wireframe:** SubD cage e final, sem X-ray enganoso; close-ups em junctions e densidade suficiente para detectar boolean soup, pinching e loops sem função.
5. **Close-ups obrigatórios:** cockpit/driver/controls; pod/inset/mount; ponta esquerda e direita do bumper/socket; cada wheel mount/clearance; rear housing/circle/grille/exhaust/bar.

Toda prancha deve exibir revision ID, hash do `.blend`, camera ID, source ID, render mode e estado `PASS/REJECT/NOT VALIDATED`. A mesma evidência segue para coder, Sol e usuário; rerender após qualquer mudança invalida o verdict anterior.

## 6. Critérios objetivos de rejeição e tolerâncias

### 6.1 Antes de fixar números

As tolerâncias abaixo são metas iniciais de reconstrução 2D e devem ser recalibradas após duas marcações independentes dos landmarks. Para cada landmark, registrar `observed`, `ambiguous/occluded` ou `hypothesized`. A discrepância entre anotadores define o noise floor; tolerância nunca pode ser menor que esse ruído nem inflada para fazer o candidato passar.

### 6.2 Metas iniciais normalizadas

| Medida | Meta inicial | Rejeição |
|---|---:|---|
| Wheel center em TOP/SIDE | erro ≤ `0,015 B` por eixo | qualquer centro > `0,025 B` ou incoerente entre vistas |
| Wheel center em FRONT/REAR | erro ≤ `0,015 T` | qualquer centro > `0,025 T` |
| Diâmetro/largura de pneu | razão vs. referência dentro de ±2,5% | erro >5% ou front/rear invertidos |
| Ground contact | diferença esquerda/direita ≤ `0,01 D`; nenhum hard part abaixo de z=0 | roda flutuante >`0,02 D`, penetração ou outro componente no solo |
| Envelope L/W/H | cada extremo primário dentro de ±2% do span de referência da vista | qualquer extremo >4% sem zona ambígua documentada |
| Contorno primário | IoU ≥0,94 e distância p95 ≤`0,03 D` | IoU <0,90 ou distância p95 >`0,05 D` |
| Contorno por componente | IoU ≥0,90 em masks não ocluídas | ausência, componente fundido ou IoU <0,85 |
| Bilateral symmetry | landmarks espelhados dentro de `0,01 T`, salvo assimetria observada | drift >`0,02 T` |
| Tube section | variação de raio ≤2% fora de collars/transições intencionais | achatamento, kink ou variação >5% |
| Socket/contact | endpoint assentado; gap visual ≤`0,01 D`; sem penetração além da interface | ponta no vazio, tube-in-box, gap >`0,02 D` |
| Pilot contacts | mãos–aro, pelvis–seat, costas–encosto e pés–controles presentes | qualquer contato obrigatório ausente ou limb atravessando shell |

IoU não aprova sozinho: visual hull pode obter silhouette alta e continuar cheio, fundido e impossível em 3D. Por isso a métrica só vale junto do clay, component-ID, isométrico, wireframe e close-ups.

### 6.3 Rejeição automática

Rejeitar a revisão inteira se ocorrer qualquer um destes casos:

1. Uma das cinco vistas/provas obrigatórias está ausente, espelhada, auto-fit, recortada ou usa câmera diferente do contrato.
2. Qualquer P0 por componente ou por vista está `FAIL`, oculto ou `NOT VALIDATED`.
3. Visual hull/voxel, primitive stack, ellipsoid mannequin ou cor/material está substituindo uma forma autoral exigida.
4. Peça termina no vazio, roda não tem chain de ancoragem, shell tem interseção/duplicação, cockpit não contém o piloto ou rear assembly não fecha em 3D.
5. Reviewer recebe evidence diferente, beauty-only ou uma revisão rerenderizada sem invalidar os verdicts anteriores.

### 6.4 Hierarquia de gates

1. **Fidelidade 2D/multivista.**
2. **Coerência 3D e contatos funcionais.**
3. **Qualidade de superfície e secondary forms.**
4. **Materiais/presentation.**
5. **Manifold, normals, UV, LOD, collision e export.**
6. **Coder PASS → Sol PASS → aprovação explícita do usuário.**

Falhar em um nível bloqueia os seguintes. Manifold e render bonito ficam deliberadamente no fim; não têm autoridade para promover geometria que falha no começo.

## 7. Estado da segunda revisão adversarial

O job externo `gpt-5.6-sol-900k / xhigh` `315d9beff2fd9675c4a0dbbfc8a880cf` excedeu o timeout do chamador e permaneceu `STATUS=running` na última consulta. Ele não foi relançado e seu resultado não foi coletado prematuramente. Esta segunda revisão está `NOT VALIDATED` e não concede PASS nem muda a rejeição baseada nas evidências já verificadas.

## 8. Recomendação final

Fazer um reset real para v068: manter apenas fontes, landmarks, câmera rig recalibrada e, se útil, wheel proxies. Não reutilizar `VISUAL_HULL_PRIMARY` nem retopologizá-lo. Construir o shell/pods/cockpit/rear housing como superfícies SubD autorais; bumper e tubos por curves com sockets manuais; piloto por base humana/sculpt retopologizado e posado; usar procedural somente para datums, rodas, tubos regulares, câmera e QA.

**Estado final desta revisão:** v067 rejeitado; v068 ainda é contrato/hipótese, não asset; nenhum asset aprovado; export/runtime continuam bloqueados.