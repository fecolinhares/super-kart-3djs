# Hero Kart AAA — plano de reconstrução r01

## Direção
Reconstruir de fora para dentro. A carroceria contínua define o kart; rodas, suspensão, aero e piloto complementam a forma.

## Referências de linguagem
- Mario Kart 8 Deluxe: relação carroceria/cockpit/piloto e rodas expostas.
- Sonic & All-Stars Racing: fluxo longitudinal, nariz agressivo e aero funcional.
- Crash Nitro Kart: proporções exageradas e traseira robusta.

## Ordem executável
1. Congelar anchors: quatro centros de roda, solo, banco, volante e `FRONT=-Z`.
2. Criar meia carroceria quad com Mirror, seções nariz/eixo dianteiro/dash/cockpit/cintura/eixo traseiro/cauda.
3. Abrir cockpit na casca, com banco, coluna e pedais.
4. Derivar para-lamas e ombros da casca; proibir cápsulas decorativas.
5. Modelar hubs, uprights, wishbones e amortecedores com endpoints reais.
6. Modelar traseira, difusor, escapes ocos e asa com perfil/endplates.
7. Criar piloto separado e articulado, em pose sentada com mãos/pés em contato.
8. Gerar LODs orientados à silhueta; validar/reimportar GLB.

## Budgets
LOD0 38–52k tris; LOD1 16–22k; LOD2 5–7.5k; até 5 materiais; até 8 draw calls.

## Rejeição imediata
- placa com caixas/cápsulas anexadas;
- cockpit pousado ou fenders colados;
- suspensão/asa/escape sem conexão funcional;
- piloto mannequin/LEGO ou sem contatos;
- falha em ortográficas, budget ou reimportação.

## Estado atual do asset — WIP verificável — 2026-09-10
- O Sol criou o script autoral `scripts/blender/hero_kart_v2_build.py`; o runner Blender 4.0.2 executou esse script após um fix mínimo de compatibilidade para inicializar `scene.world`.
- Artefatos copiados para `assets/hero-kart-v2/`: `.blend`, `metrics.json`, `renders/` com beauty, black-fill, clay, wireframe, vistas ortográficas/3⁄4, driver-clearance, underside e comparação LOD.
- Vision próprio: beauty lê como kart arcade AAA estilizado e está muito acima do cubo anterior; falhas: black-fill não está realmente preto, encaixe do piloto ainda precisa refinamento, asa domina a traseira e a identidade traseira é genérica sem aero.
- Validação estrutural real: LOD0 `39.268` triângulos/5 materiais, mas `1.692` arestas não-manifold e normais negativas; LOD1 `21.952` triângulos/5 materiais (limite 4), não-manifold; LOD2 `10.364` triângulos/5 materiais (limite 7.500/3), não-manifold; COLLISION `36` triângulos/manifold.
- Veredito: **WIP REJEITADO PARA INTEGRAÇÃO FINAL**. O arquivo está salvo para continuação, mas exige limpeza de topologia/normais, redução real de LOD1/LOD2, black-fill correto e nova validação visual independente.

## Evidência Sol
Sessão de planejamento: `20260910_040509_cc8ad5`, `gpt-5.6-sol`, `xhigh`.

## Execução Sol direta — 2026-09-10 — bloqueada
- Tentativa corrigida via CLI direta com `gpt-5.6-sol`, `xhigh`, `--safe-mode` e `terminal,file,vision`.
- Houve escrita transitória de `assets/hero-kart-v2/renders/`, mas após ~13m40s não havia Blender ativo nem `.blend`, script, render final, métricas ou commit; o processo foi encerrado para evitar processo zumbi.
- O runner Blender/SSH permanece saudável; o bloqueio está na execução do agente Sol, que não conclui a primeira cadeia de ferramentas.

## Execução Default → Sol — 2026-09-10 — bloqueio confirmado
- O `default` verificou runner Blender/SSH saudável; o bloqueio não é GPU, RAM ou Blender.
- Mesmo com `--safe-mode`, `--yolo`, `terminal/file/vision`, `gpt-5.6-sol` e `xhigh`, o Sol não executou a primeira ferramenta dentro do orçamento.
- Nenhum `.blend`, script ou render foi criado; gate-check `assets/hero-kart-v2/GATES.md`: `UNMET: 8 (met: 0)`.
- `origin/main` verificado em `2290ff8`; nenhum commit/push de asset existe.

## Execução 2026-09-10 — bloqueada
- O modelo procedural anterior foi visualmente rejeitado: não atingia a distância AAA das referências.
- Foi solicitado ao Sol (`gpt-5.6-sol`, `xhigh`) que executasse a modelagem real no runner Blender, salvasse `assets/hero-kart-v2/hero-kart-v2.blend`, renders, LODs e collider, e fizesse commits/push atômicos.
- A primeira sessão esgotou aproximadamente 563 s no preflight sem criar projeto, script, LOD, render, commit ou push.
- A segunda sessão começou e criou somente `assets/hero-kart-v2/GATES.md`; após aproximadamente 750 s não havia `.blend`, script ou render e o processo foi encerrado por timeout operacional.
- Nenhuma aprovação visual foi emitida. Nenhum asset foi exportado ou integrado ao runtime.
- Estado de retomada: executar a modelagem customizada no runner Blender com sessão Sol funcional; somente depois validar com vision, salvar o `.blend` no repo e fazer commits/push.
