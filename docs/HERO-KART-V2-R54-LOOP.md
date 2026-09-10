# Hero Kart V2 — Loop R54+

## Estado inicial

R53 foi rejeitada pelo Sol (`gpt-5.6-sol` + `xhigh`) por três bloqueadores P0: para-brisa voando/sem fixação clara; cabeça/capacete artificial; volante estranho. O loop foi reiniciado sem integrar runtime.

## P0 executado

- Para-brisa reconstruído com quatro hardpoints simétricos, suportes seguindo as bordas da lente, largura nominal `0,47 m / 0,62 m = 0,758 Wc`, borda traseira `0,85 m` à frente da borda de referência do cockpit e folga alvo de `0,05 m` por antebraço.
- Capacete reconstruído com volume de cabeça interna, volumes separados de têmpora, mandíbula e nuca, visor com pivôs laterais, queixeira integrada e colar separado.
- Volante reconstruído com hub coaxial/coluna, hub de `0,112 m = 0,20D` do aro de referência, sem a placa rosa; mãos recebem metadados e posições polares `150°/30°`, punho nominal de `8°`.

## Execução reproduzível

1. Copiar `scripts/blender/hero_kart_v2_build.py` para o job do runner `.195`.
2. Executar via `/opt/blender-runner/run_blender.sh` com Blender `4.0.2`.
3. Executar `hero_kart_v2_render.py` para gerar `beauty`, `windshield-profile`, `windshield-top` e `driver-clearance` na mesma revisão.
4. Executar `hero_kart_v2_p0_audit.py`; ele abre o `.blend` real e mede nomes/contagens/metadados no LOD0.
5. Só chamar Sol se meu vision passar nas quatro imagens; Broken pipe nunca conta como aprovação.

## Evidência R54 atual

- Build: Blender `4.0.2`, `1127` objetos, `1111` meshes, `6` materiais; `.blend` e `build-report.json` salvos.
- Auditoria P0 após ajuste do hub: `all_pass=true`; largura `0,7580645`, avanço da borda `0,85 m`, hub `0,20D`, mounts `4`, mãos `[30°,150°]`.
- O primeiro vision R54 encontrou suportes altos/desconectados visualmente; a geometria foi corrigida para que os pickups coincidam com a borda real da lente. A rodada visual pós-correção ainda está pendente.
- Nenhum runtime, segredo ou integração de jogo foi alterado.
