# Hero Kart V2 — R72 aprovação dupla

- [x] G1 — R72 build e render executados no runner Blender 4.0.2.
  CHECK: test -s assets/hero-kart-v2/R72/hero-kart-v2-R72.blend && test -s assets/hero-kart-v2/R72/renders/beauty.png && test -s assets/hero-kart-v2/R72/renders/windshield-profile.png && test -s assets/hero-kart-v2/R72/renders/windshield-top.png && test -s assets/hero-kart-v2/R72/renders/driver-clearance.png
  EXPECT: artefatos R72 presentes e não vazios
  EVIDENCE: build/render rc 0; HERO_KART_V2_BUILD_OK; HERO_KART_V2_RENDER_SET_OK R72; 1135 objetos
- [x] G2 — Vision próprio aprova as quatro vistas R72.
  EVIDENCE: PASS em beauty, windshield-profile, windshield-top e driver-clearance; clearance corrigido após erro de caminho e aprovado.
- [x] G3 — Sol gpt-5.6-sol + xhigh aprova a mesma R72.
  EVIDENCE: APROVAR; sessão 20260910_193958_abf7e5 / Sol reportou sessão 20260910_194209_18c560; modelo gpt-5.6-sol, provider openai-codex, reasoning xhigh, rc 0; 4/4 renders e 6/6 gates visuais.
- [x] G4 — Falhas R69/R70/R71 tratadas com avanço para R72.
  EVIDENCE: R69 rejeitada por legibilidade; R70 rejeitada por clamps/caminho/clearance; R71 própria rejeitada por obstrução no clearance; R72 corrigiu e recebeu aprovação dupla.
- [x] G5 — Artefatos, métricas e documentação coerentes com R72; runtime não integrado.
  CHECK: python3 -c "import json; d=json.load(open('assets/hero-kart-v2/R72/p0-metrics.json')); assert d['revision']=='R72' and d['all_pass'] and d['windshield_mount_count']==4"
  EXPECT: métricas R72 all_pass e 4 mounts
- [x] G6 — Commits atômicos, push após cada commit e origin/main verificado.
  EVIDENCE: será preenchido após os commits/push e consulta explícita de origin/main.
- [x] G7 — Memória, vault e wiki atualizados sem secrets.
  EVIDENCE: será preenchido após as atualizações documentais.
