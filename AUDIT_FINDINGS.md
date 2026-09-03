# Super Kart 3D.js — auditoria visual POV do jogador

Data: 2026-09-03
Escopo: gameplay real no GPU runner LXC 105, ANGLE/Vulkan, RADV PHOENIX; Meadow e Neon; desktop 1280x720 e mobile 390x844.

## Evidência executada

Capturas de vídeo reais via `scripts/playtest-video.cjs`, sem `NODE_PATH`:

- Meadow desktop: `qa-gpu-runner/audit-player-meadow-desktop/` — `phase=finished`, 824 frames.
- Meadow mobile: `qa-gpu-runner/audit-player-meadow-mobile/` — `phase=finished`, 997 frames.
- Neon desktop: `qa-gpu-runner/audit-player-neon-desktop/` — `phase=finished`, 677 frames.
- Neon mobile: `qa-gpu-runner/audit-player-neon-mobile/` — `phase=finished`, 1006 frames.
- GPU reportado em todas: `RADV PHOENIX`.

As capturas tardias de resultado foram separadas das capturas de gameplay; não são usadas como prova de render durante corrida.

## Achados priorizados

### P1 — Mobile: framing do jogador e artefato do screencast

A captura PNG direta em `qa-gpu-runner/mobile-render-probe/page.png` provou que o mundo 3D é contínuo: `inner=390×844`, canvas client/backing `390×844`, drawing buffer `390×844`, câmera aspect `0.462085`, sem page errors. Portanto, a fragmentação vertical vista em alguns frames de `Page.startScreencast` é artefato do capturador portrait e não defeito do renderer.

O problema de produto que permanece é composição: o kart fica parcialmente coberto pelo pelotão em mobile e o velocímetro/controles ocupam a faixa inferior. Isso reduz a leitura da trajetória e deve ser auditado com gameplay temporal e câmera chase, não com o screencast isolado.

Probe executado: PNG direto fora do screencast; resultado refuta o P0 de pipeline quebrado.

### P1 — Bloom: halo global e perda de separação — CORRIGIDO

Neon desktop/mobile pós-candidato mostra janelas, rails e pista separados, com halo localizado e sem lavar o frame. Configuração aceita: `strength=0.20`, `radius=0.18`, `threshold=1.35`. Runtime GPU: desktop `622` frames e mobile `985`, `phase=finished`, `RADV PHOENIX`, sem regressão observada.

### P1 — Linha de chegada e sinais: massa visual sem hierarquia

O pórtico continua com leitura ruim quando visto em aproximação: banner, housing claro e cinco lâmpadas competem no mesmo plano; o housing parece um bloco branco e os sinais pequenos perdem contraste contra o beam. O banner v2 reduziu a parede, mas não resolveu a hierarquia de leitura. O próximo passe deve simplificar a faixa: beam estrutural escuro, housing recuado, lâmpadas maiores e separadas, banner mais alto contraste e sem excesso de emissive.

### P1 — Neon: cidade procedural parece repetitiva e sem escala

A visão chase mostra prédios altos com janelas retangulares repetidas, pouca variação de silhueta e pouca ancoragem no chão. A cidade lê como paredes instanciadas, não como ambiente urbano. O problema é visual e de composição: janelas competem com a pista, mas os edifícios não fornecem profundidade graduada.

### P1 — Câmera chase: kart perde protagonismo em alta velocidade

Neon usa extra de distância (`neonFollowExtra=0.55`) e o modo demo acrescenta distância adicional. O resultado é mais rota no enquadramento, porém kart e adversários ficam pequenos quando a pista abre; o jogador recebe excesso de skyline e pouca leitura de trajetória imediata.

### P2 — Meadow: props e vegetação sem variedade de silhueta

A variedade percebida depende demais de copas/escala. Troncos e bases de árvores aparentam compartilhar geometria/material, reduzindo a leitura de espécies e fazendo o acostamento parecer procedural repetido.

### P2 — Itens e feedback

Caixas de item são legíveis, mas os sinais de pickup/roulette não dominam claramente a pista em movimento. O efeito de brilho deve permanecer localizado; não pode contaminar kerbs, HUD ou linha de visão. Shell/banana/star e confetti não foram considerados comprovados nesta amostra quando não estavam simultaneamente visíveis; precisam de passes temporais dedicados.

### P2 — HUD/mobile

HUD possui boa persistência de lap, posição, moedas e velocidade. No mobile, os botões têm leitura e área de toque adequadas, porém ocupam a borda inferior em conjunto com velocímetro; depois de corrigir o canvas, deve-se revalidar se o kart não fica escondido por essa faixa.

## Ordem do próximo loop

1. Provar o pipeline mobile com métricas e screenshot não-screencast.
2. Fazer A/B de bloom isolado: `0.42/0.32/1.1` versus configuração conservadora.
3. Corrigir a faixa FINISH/sinais com hierarquia estrutural, não apenas reduzir altura.
4. Revalidar câmera Neon e cidade com POV temporal.
5. Rodar itens, drift, turbo pads e confetti em sequências dedicadas.

Nenhuma conclusão de screenshot tardio foi usada para declarar qualidade de gameplay.
