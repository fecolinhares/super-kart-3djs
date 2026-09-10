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

## R25 — para-brisa rejeitado novamente pelo Sol — 2026-09-10
- Implementada superfície de nove seções com arco quadrático forte em planta/topo, centro avançado e laterais retornadas; Blender executou e renderizou beauty/top.
- Vision próprio: ainda não comprova o arco com segurança no beauty; top mostra o volume, mas o cockpit fica comprimido.
- Sol `gpt-5.6-sol`, `xhigh`, sessão `20260910_101452_474d84`: **REJEITAR** — a peça continua parecendo placa plana/opaca, sem curvatura 3D claramente perceptível.
- Outra sessão (`20260910_101347_842b9d`) não executou vision e respondeu apenas “How can I help?”.
- Próximo: abandonar a placa como superfície principal e construir uma lente curva contínua com perfil lateral/topo dedicado; incluir render de perfil/topo em escala de revisão. WIP não aprovado.

## Diagnóstico Sol — R18 — 2026-09-10
- Sessão `20260910_095223_36678c`, `gpt-5.6-sol`, `xhigh`, vision; nenhum arquivo editado.
- Para-brisa: painel frontal transparente integralmente à frente do volante, maior que o aro em largura aparente, topo acima das mãos/aro, base contínua na carenagem; reflexo de borda e transmissão ampla visíveis.
- Personagem: substituir montagem de primitivas por cadeia pelve→torso→ombros→cotovelos→punhos→mãos; mãos envolvem o aro 9h/3h, dedos cobrem >50% da seção, desvio de punho <15°, cintos atrás do cubo.
- Capacete: casco único envolvendo cabeça interna com 8–14 px de folga, abertura facial, visor curvo com espessura/pivôs, queixeira rígida ligada às laterais e colar separado; face dentro da abertura.
- Clearance: recuar 20–30%, mostrar capacete/para-brisa completos e validar thumbnail de 320 px; não aceitar peças tangentes/flutuantes.

## Consulta estratégica Sol — 2026-09-10 — bloqueada
- Foi solicitado ao Sol (`gpt-5.6-sol`, `xhigh`) um plano acionável baseado em vision para reconstruir o personagem/cockpit, sem editar arquivos.
- Sessão `20260910_093911_1bae15` permaneceu sem resposta por ~567 s e foi encerrada.
- Nenhuma estratégia nova foi recebida; não atribuir ao Sol recomendações que ele não entregou. O diagnóstico acionável anterior continua vigente: reconstrução estrutural do piloto, não incrementos de primitivas.

## R17 — vision próprio rejeita personagem — 2026-09-10
- Aplicados P0 derivados do Sol: cadeia anatômica, câmera de clearance recuada, pescoço, face interna, casco menor, mãos/volante e para-brisa frontal.
- Vision próprio continua **REJEITANDO**: piloto lê como manequim procedural, braços/mãos e torso não têm anatomia AAA, capacete ainda desproporcional/sem vestibilidade convincente em contexto e clearance não comprova uma pose natural sem oclusão.
- Após múltiplas correções incrementais, hipótese rejeitada: adicionar esferas/tubos ao blockout não resolve. Próxima etapa precisa reconstruir o personagem como asset coerente (pelvis/torso/ombros/braços/mãos/cabeça/casco) e separar o cockpit em uma composição de revisão dedicada.
- Não pedir nova validação Sol enquanto o meu vision não passar; não integrar nem enviar como aprovado.

## Diagnóstico Sol acionável — cockpit — 2026-09-10
- Sessão `20260910_091420_95e211`, `gpt-5.6-sol`, `xhigh`, vision; nenhum arquivo editado pelo Sol.
- Ordem espacial exigida: carenagem frontal → base/painel do para-brisa → aro/cubo → mãos envolvendo o aro → antebraços → queixeira/viseira → face dentro da abertura → crânio/casco → encosto.
- Para-brisa: geometria integralmente à frente do volante; maior que o volante em largura aparente; topo acima do aro; reflexo contínuo em uma borda e área ampla de transmissão; câmera deve mostrar a peça inteira.
- Personagem: casco como silhueta única contínua envolvendo a face; viseira presa aos dois lados; face dentro da abertura; queixeira integrada; encosto atrás sem interseção; câmera de clearance recuada 20–30%.
- Mãos devem envolver o tubo do aro; antebraços não podem atravessar cubo/raios; cintos partem dos ombros e não passam à frente do cubo.
- Critério P0: confirmar tudo em beauty e clearance, inclusive thumbnail de 320 px, antes de nova aprovação dupla.

## Solicitação de diagnóstico Sol — 2026-09-10 — bloqueada
- Foi solicitado ao Sol (`gpt-5.6-sol`, `xhigh`) que usasse vision para indicar exatamente as correções do para-brisa, personagem e capacete, sem editar arquivos.
- Sessão `20260910_084641_5b1bce` permaneceu ativa por ~559 s sem produzir resposta ou recomendação; foi encerrada para evitar processo zumbi.
- Nenhuma orientação adicional do Sol foi recebida. Não alterar o asset com base em uma resposta inexistente; próxima tentativa deve usar uma sessão Sol curta e focada somente no render/arquivo.

## R14 — aprovação visual dupla dos ajustes — 2026-09-10
- Ajustes finais: aro D ciano ampliado e separado das mãos, hub metálico central, coluna coral contínua até bracket/dash; para-brisa menor e deslocado para frente, com lente translúcida/moldura/reflexos; helmet shell/visor/queixeira/colar separados.
- Vision próprio: **APROVAR** os três itens.
- Sol `gpt-5.6-sol`, `xhigh`, sessão `20260910_082702_0748c5`: **APROVAR** direção, para-brisa e capacete; veredito geral **APROVAR**.
- Validação estrutural R14: `RC=2`, `all_structural_gates_pass=false`; LOD0 `41.474 tri/6 mats/1.696 não-manifold`, LOD1 `23.100/5/1.098`, LOD2 `11.148/5/666`, COLLISION `36 tri/manifold`, `.blend` `678.925 bytes`.
- Escopo aprovado: somente os três ajustes visuais solicitados. Integração final continua bloqueada pelos gates estruturais já conhecidos; não mascarar como asset de produção.

## Auditoria R9 — vision próprio + Sol — 2026-09-10
- Vision próprio: para-brisa lê como defletor translúcido pequeno; capacete melhorou com visor compacto; volante ainda parece controle estreito e a estrutura compete com a moldura.
- Sol (`gpt-5.6-sol`, `xhigh`, sessão `20260910_073812_8af2ee`): **0/3 aprovados**. Para-brisa: rejeitado por não comprovar lente/ancoragem AAA; capacete: rejeitado por visor/queixeira/colar sugeridos, sem integração construtiva suficiente; volante: rejeitado por aro D e cadeia volante→hub→coluna→dash não distinguíveis.
- Próxima reconstrução deve separar visualmente as funções com cores/planos distintos, remover sobreposição entre moldura e direção, usar aro D completo visível e refazer casco/visor/queixeira/colar como volumes contínuos.

## Auditoria Sol — para-brisa e capacete — 2026-09-10
- Sessão `20260910_071201_45d493`, `gpt-5.6-sol`, `xhigh`; auditoria sem edição nas capturas `beauty.png` e `driver-clearance.png`.
- **Para-brisa: REJEITAR.** O Sol confirmou leitura de placa/tela escura, sem transparência, espessura ou ancoragem construtiva convincentes; moldura e suporte competem com o volante e bloqueiam a leitura do cockpit.
- **Capacete: REJEITAR.** Silhueta esférica genérica; visor como placa escura rasa; queixeira tubular desconectada; faixa superior parece colada; falta pescoço/colar e recorte inferior integrados.
- Correções P0: refazer casco com testa/coroa/laterais/nuca/colar, trocar tubo por queixeira volumétrica integrada, criar lente curva com espessura/vedação/pivôs e revisar folgas com ombros/encosto. Para-brisa deve ser lente curva realmente transparente, menor e claramente presa ao dash.
- Estado: WIP rejeitado; não integrar nem declarar aprovação antes de nova modelagem e dupla validação visual.

## Iteração cockpit — 2026-09-10 — WIP rejeitado por vision próprio e Sol
- Pedido aplicado: coluna/yoke do volante estendidos até o dash, mini para-brisa à frente do volante e capacete com visor/moldura/queixeira redesenhados.
- Vision próprio: capacete melhorou e está integrado; coluna ficou mais legível, mas o para-brisa continua parecendo painel escuro e a conexão volante–dash ainda não é inequívoca.
- Sol (`gpt-5.6-sol`, `xhigh`) confirmou: **REJEITAR** para volante/coluna e para-brisa; **APROVAR** para capacete/visor/queixeira.
- Correções posteriores reduziram a opacidade do shader e trocaram a lâmina por um painel fino, porém a captura Eevee ainda não demonstra transparência. Após três tentativas, a hipótese duvidosa é a configuração de transparência do material no Eevee 4.0.2 do runner.
- O `.blend`, renders, métricas e script permanecem salvos como WIP; não integrar até nova solução de vidro/coluna e aprovação dupla.

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
