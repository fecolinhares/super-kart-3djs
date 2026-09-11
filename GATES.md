# Hero Kart V2 — R115 structural rebuild gates

- [ ] R115-1 — Reconstrução estrutural executada sobre R114, sem sobrescrever checkpoints anteriores
  CHECK: test -s assets/hero-kart-v2/R115/hero-kart-v2-R115.blend && test -s assets/hero-kart-v2/R115/rebuild_r115.py
  EXPECT: artefato R115 não vazio e script reprodutível
  EVIDENCE: pending

- [ ] R115-2 — Prova visual multi-view da mesma revisão
  CHECK: test $(find assets/hero-kart-v2/R115/renders -maxdepth 1 -type f -name '*.png' | wc -l) -ge 5
  EXPECT: pelo menos 5 renders R115
  EVIDENCE: pending

- [ ] R115-3 — Critério técnico: budgets, manifold, UV, n-gons e colisão
  CHECK: python3 - <<'PY'
import json
p=json.load(open('assets/hero-kart-v2/R115/technical-audit.json'))
print('R115_TECH_PASS' if p.get('technical_pass') else 'R115_TECH_FAIL')
PY
  EXPECT: R115_TECH_PASS
  EVIDENCE: pending

- [ ] R115-4 — Meu vision aprova beauty/profile/top/rear/clearance da R115
  EVIDENCE: pending

- [ ] R115-5 — Sol gpt-5.6-sol + xhigh aprova exatamente os mesmos renders R115
  EVIDENCE: pending

- [ ] R115-6 — Documentação do repo, vault, wiki/index/log e memória sincronizadas sem secrets
  EVIDENCE: pending

- [ ] R115-7 — Commit(s) atômicos publicados e origin/main coincide com HEAD
  CHECK: test "$(git rev-parse HEAD)" = "$(git ls-remote origin refs/heads/main | cut -f1)"
  EXPECT: HEAD publicado em origin/main
  EVIDENCE: pending
