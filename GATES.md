- [x] R125-1: Inspeção do estado atual e contrato técnico identifica a causa estrutural e preserva R124.
  EVIDENCE: `assets/hero-kart-v2/R124/hero-kart-v2-R124.blend` preservado; gerador canônico contém UV por mesh, remapeamento de material por LOD, caps triangulados e correção final de normais.
- [x] R125-2: Correção estrutural única aplicada no gerador autoral, sem empilhar primitivas cosméticas.
  EVIDENCE: build real gerou `assets/hero-kart-v2/R125/hero-kart-v2-R125.blend` (808469 bytes); mudança promoveu pipeline autoral R124 ao gerador canônico.
- [x] R125-3: Blender 4.0.2 no GPU runner LXC105 produz beauty/profile/top/rear/clearance do mesmo R125.
  EVIDENCE: cinco PNGs não vazios em `assets/hero-kart-v2/R125/renders/`; runner output confirmou `Blender 4.0.2`, `R125_RENDER_SET_OK`.
- [x] R125-4: Auditoria técnica do R125 executada e resultado registrado.
  EVIDENCE: `technical-audit.json`: LOD0 39832/5/0, LOD1 21098/4/0, LOD2 6028/3/0, COLLISION 36/0; `technical_pass=true`.
- [x] R125-5: Primary vision analisou exatamente os cinco renders do R125.
  EVIDENCE: `visual-qa.md` registra análise individual de beauty/profile/top/rear/clearance; resultado REJECT por shell tablet/bubble e piloto detached/mannequin.
- [x] R125-6: Sol gpt-5.6-sol xhigh somente se primary vision passar; caso contrário status explicitamente não chamado.
  EVIDENCE: primary vision REJECT; Sol NÃO INVOCADO por protocolo; export/runtime bloqueados.
- [x] R125-7: Documentação, vault, wiki e memória atualizados; commit atômico e push apenas dos arquivos escopados.
  EVIDENCE: docs/vault/wiki atualizados; commit `dc67628` publicado em `origin/main` com somente GATES, gerador canônico, documentação e artefatos R125 escopados.
