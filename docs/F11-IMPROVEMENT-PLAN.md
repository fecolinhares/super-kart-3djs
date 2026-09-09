# Super Kart 3D.js — Plano de melhorias F12–F17

Data: 2026-09-09  
Base: auditoria F11 com vídeo GPU + vision + Sol/xhigh  
Sessão Sol: `20260909_060136_d785de`  
Status release atual: **GO funcional; F12/F13/F14/F15 aprovados; F16 é o próximo gate**

## Evidência F11

- Meadow desktop: 887 frames, `finished`.
- Meadow mobile: 937 frames, `finished`.
- Neon desktop: 675 frames, `finished`.
- Neon mobile: 850 frames, `finished`.
- Renderer: RADV PHOENIX; `pageErrors=[]` em 4/4.
- Vision: fluxo grid → race → results íntegro; `Turbo (You)` correto nos resultados; sem clipping maior confirmado.
- Build: 44 módulos, passou.
- AI: 20 seeds por pista, zero lost/backwards/crashes.
- Áudio lifecycle GPU: `9/9 PASS`.
- Frame pacing: Meadow20 p95 `12.9 ms`, máximo isolado `30.2 ms`; sem cauda persistente. Nenhum FPS foi inferido.

## F12 — Identidade do player + semântica HUD — P1 — CONCLUÍDA

### Resultado

- Chip de posição passou a exibir `YOU` separado do ordinal.
- Pílula amarela de alto contraste aplicada globalmente; texto mobile reforçado para `0.78rem`.
- `aria-label` passou a anunciar `Your position: ...`.
- Commits: `d63afa3`, `b74ec38`, `fcc7c1d`.
- Vídeos finais GPU: Meadow desktop/mobile `884/931`; Neon desktop/mobile `661/880`; todos `finished`, `pageErrors=0`.
- Vision nativa 4/4: `YOU` + ordinal legíveis e separados; sem overlap, clipping ou regressão.
- Áudio `9/9 PASS`; AI 20 seeds por pista sem lost/backwards/crashes; build verde.
- Sol F12 `20260909_104105_66c01e` (`gpt-5.6-sol`, `xhigh`): **PASS**.

### Risco residual

Cobertura limitada a quatro execuções GPU; não representa todos os dispositivos reais.


### Objetivo

Tornar inequívoco qual kart é do jogador e o que significam gauge, counters e estados de item.

### Escopo candidato

- marcador discreto `YOU`/chevron acima do kart;
- outline/underglow acessível e não dependente apenas de cor;
- labels ou estados explícitos para velocidade, boost, item e contador;
- consistência entre kart, HUD e results.

### Critérios de aceitação

- revisão cega reconhece o player em Meadow/Neon desktop/mobile sem explicação;
- gauge e counters são compreendidos pelo estado visual, sem legenda externa;
- player marker não cobre pista, kart, rivais ou HUD;
- vídeo temporal inclui grid, pack racing, boost/item e results;
- build, AI, pageErrors e áudio permanecem verdes.

## F13 — Stress mobile de input/safe-area — P1/P2 — CONCLUÍDA

### Resultado

- `TouchControls.resetInput()` agora limpa steer esquerdo/direito, drift, item e classes visuais após blur/visibility loss.
- Pause agora cancela corretamente `pointercancel`/`lostpointercapture` sem disparar pausa.
- Commit: `c8a126b`.
- Probes Meadow/Neon mobile DPR2: blur libera controles; pointercancel libera steer; pause não dispara; targets `64×64px`; margens laterais `20px` e inferiores `18–24px`; pageErrors zero.
- Vídeos humanos Meadow/Neon mobile: `599` frames cada, ambos `finished`, errors zero; vision temporal confirmou countdown → race → results, touch/HUD/safe-area sem overlap/clipping.
- Build 44 módulos, AI zero lost/backwards/crashes, áudio `9/9 PASS`.
- Sol F13 `20260909_105618_8f080c` (`gpt-5.6-sol`, `xhigh`): **PASS**.

### Risco residual

O probe sintético não demonstrou dois ponteiros simultâneos mantidos ao mesmo tempo; o fluxo de ponteiro único, cancelamento, blur e vídeos de interação passaram.


### Objetivo

Validar interação real sob multitouch, cancelamento, blur, bordas e safe-area extrema.

### Escopo candidato

- steer + drift simultâneo;
- steer + item/boost simultâneo;
- pointer cancel/up fora do botão;
- troca de foco/aba durante botão pressionado;
- DPR2/DPR3 com canvas efetivo registrado;
- aspect ratios portrait curtos e safe-area simulada.

### Critérios de aceitação

- zero controles presos após `pointerup`, cancel, blur ou mudança de fase;
- zero overlap crítico e targets primários ≥44 px;
- corrida completa nas duas pistas em mobile;
- vídeo demonstra input e resultado, não somente screenshot;
- nenhum ajuste reduz a prioridade visual de pista/kart.

## F14 — Antecipação de rota e landmarks — P1/P2 — CONCLUÍDA

### Resultado

- Cue dinâmico `TURN LEFT/RIGHT` baseado em tangentes da curva, limiar de `12°`, distância aproximada e `pointer-events:none`.
- Commit: `70dccb8`.
- Runtime: Meadow `TURN LEFT` em `14 m`; Neon `TURN RIGHT` em `21 m`; sem errors.
- GPU final: Meadow d/m `896/919`; Neon d/m `1117/846`; todos `finished`, `pageErrors=0`, RADV PHOENIX.
- Vision temporal 4/4: cue/road arrows legíveis, não obstruem HUD/touch/rota; sem regressão de kart/câmera/results.
- Build/AI/áudio verdes; Sol F14 `20260909_111817_fd3883` (`gpt-5.6-sol`, `xhigh`): **PASS**.

### Risco residual

Heurística de tangente pode oscilar em curvas compostas/S ou avisar tarde perto do limiar; `top:116px` deve ser revalidado se o HUD crescer. Frames não são FPS.


### Objetivo

Comunicar curvas, splits, rampas e landmarks antes da entrada, sem esconder gameplay.

### Escopo candidato

- minimap/track ribbon, se necessário;
- chevrons/placas de curva;
- sector/checkpoint landmarks;
- distinção visual entre pista, shoulder, item box e cenário;
- sinais específicos para boost, hazard e shortcut.

### Critérios de aceitação

- curva complexa é legível antes da entrada em ambas as pistas;
- direção não depende apenas de skyline/decoração;
- guidance não encobre kart, pista, HUD ou rivais;
- A/B GPU pareado comprova melhoria direcional em desktop/mobile;
- nenhum aumento especulativo de glow global.

## F15 — Landmarks por setor + ownership temporal de feedback — P2 — CONCLUÍDA / NO-CHANGE

### Resultado

- Auditoria confirmou landmarks funcionais: `START/FINISH`, placas direcionais, turbo pad, item box e Mushroom equipado.
- Drift meter já existe, mas não foi capturado ativo nesta rodada; F16 terá prova temporal dedicada.
- Skyline Neon é repetitivo, porém billboard/estrutura sem ownership de setor aumentaria risco de clutter e oclusão.
- Sol F15 `20260909_112349_f5e3b4` (`gpt-5.6-sol`, `xhigh`): **NO-CHANGE**, risco baixo.
- Nenhum patch de produto nesta fase; build/AI/áudio e ausência de regressão mantidos.

### Critério de aceite

Os quatro vídeos demonstraram landmarks legíveis sem clipping/regressão. FPS não foi medido nem inferido.

### Próximo passo

F16: capturar drift meter ativo e validar ownership temporal de feedback; reabrir landmarks apenas se auditoria por setor encontrar trecho sem referência dominante.


### Critérios de aceitação

- vídeo identifica quem ativou o evento;
- evento tem começo e término discerníveis;
- item held, item usado, impacto e efeito recebido não se confundem;
- efeitos não escondem pista, HUD ou kart;
- lifecycle de áudio permanece válido.

## F16 — Results, foco e microtexto — P2

### Objetivo
Melhorar ação primária, foco de teclado/controller e legibilidade real do results.

### Critérios de aceitação

- focus inicial, foco visível e retorno de foco demonstrados por DOM/teclado;
- `Race Again`/`Menu` têm hierarquia explícita;
- leaderboard, `Turbo (You)`, time e botões legíveis em native mobile/desktop;
- modal respeita safe-area e não depende de crop de contact sheet;
- fluxo de keyboard/controller não depende somente da tecla `R`.

## F17 — Grounding e composição — P2

### Objetivo
Aumentar separação pista/cenário e grounding somente se A/B confirmar ganho real.

### Critérios de aceitação

- A/B isolado de sombra, skyline ou separação material;
- ganho direcional nas quatro combinações;
- sem círculo preto, haze, bloom excessivo ou custo injustificado;
- vídeo e vision confirmam pista/kart como prioridade;
- nenhuma alteração global sem owner e métrica.

## Regras comuns de execução

1. Uma fase por vez; não misturar F12–F17 no mesmo patch.
2. Antes de editar: probe que pode refutar o achado.
3. Correção aceita somente com vídeo GPU desktop/mobile e vision temporal.
4. Fases de diagnóstico podem terminar sem patch quando a hipótese for refutada.
5. Cada correção aceita recebe commit atômico e push imediato.
6. Após cada fase: build, AI, pageErrors, áudio quando aplicável, documentação, vault, wiki e memória.
7. Rivais cortados, curb/grid occlusion, contact shadows genéricas e foco não são bugs até reprodução isolada.
