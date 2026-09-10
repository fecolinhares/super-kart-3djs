# Hero Kart V2 — R73 reconstrução radical e aprovação dupla
Escopo: substituir integralmente o conjunto visual R72 rejeitado; sem integração de runtime.

- [ ] G1 — R73 elimina a geometria R72 proibida e cria windshield pequeno integrado ao cowl
  CHECK: python3 - <<'PY'
from pathlib import Path
s=Path('scripts/blender/hero_kart_v2_build.py').read_text()
forbidden=['WindshieldLowerCrossbar','WindshieldLowerHeader','WindshieldUpperHeader','WindshieldNosePlinth','WindshieldClampBlock','WindshieldUpperClampBlock','WindshieldBaseLink','SteeringLowerGrip','SteeringDashBracket','SteeringDashFlange']
required=['R73','KartWindshieldLens','KartWindshieldFrame','FlushWindshieldFastener','DSteeringRing','SteeringHub','SteeringColumn']
print('R73_SOURCE_OK' if all(x in s for x in required) and not any(x in s for x in forbidden) else 'R73_SOURCE_FAIL')
PY
  EXPECT: R73_SOURCE_OK
  EVIDENCE: pending

- [ ] G2 — Blender 4.0.2 executa R73 sem traceback e salva blend/report
  CHECK: test -s assets/hero-kart-v2/R73/hero-kart-v2-R73.blend && test -s assets/hero-kart-v2/R73/build-report.json
  EXPECT: artefatos R73 presentes e não vazios
  EVIDENCE: pending

- [ ] G3 — Beauty/profile/top/clearance da mesma R73 existem
  CHECK: test -s assets/hero-kart-v2/R73/renders/beauty.png && test -s assets/hero-kart-v2/R73/renders/windshield-profile.png && test -s assets/hero-kart-v2/R73/renders/windshield-top.png && test -s assets/hero-kart-v2/R73/renders/driver-clearance.png
  EXPECT: quatro PNGs R73 não vazios
  EVIDENCE: pending

- [ ] G4 — Auditoria geométrica R73 passa sem blocos/canopy alto/pedestal e com clearance mensurável
  CHECK: python3 - <<'PY'
import json
p=json.load(open('assets/hero-kart-v2/R73/p0-metrics.json'))
print('R73_METRICS_PASS' if p.get('all_pass') and p.get('revision')=='R73' and p.get('windshield_mount_count')==2 and p.get('steering_d_shape') else 'R73_METRICS_FAIL')
PY
  EXPECT: R73_METRICS_PASS
  EVIDENCE: pending

- [ ] G5 — Vision próprio inspeciona os quatro arquivos R73 e aprova sem auto-relato
  EVIDENCE: pending

- [ ] G6 — Sol gpt-5.6-sol + xhigh inspeciona os mesmos quatro arquivos após vision próprio e aprova
  EVIDENCE: pending

- [ ] G7 — Repo, vault, wiki/entity/index/log e memória atualizados sem secrets
  EVIDENCE: pending

- [ ] G8 — Cada commit atômico foi pushado e remote main coincide com HEAD
  CHECK: test "$(git rev-parse HEAD)" = "$(git ls-remote origin refs/heads/main | cut -f1)"
  EXPECT: HEAD publicado em origin/main
  EVIDENCE: pending
