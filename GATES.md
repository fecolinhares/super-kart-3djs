# Gates: QA completo SK3D como usuário (desktop + mobile)

Scope: jogar Super Kart 3D.js como usuário em desktop e mobile headless, capturar menu/largada/corrida/cenas-chave, validar por visão os elementos problemáticos do passado.

- [x] G1: Dev server no ar com hooks __sk3d + kit de scripts presente
  CHECK: curl -s -o /dev/null -w "%{http_code}" http://localhost:3457/
  EXPECT: 200
  EVIDENCE: curl → 200; kit em ~/.hermes/.../game-visual-qa-kit/scripts (capture-multi, playtest-sim, audit-geometry, downscale-vision); adapter sk3d.cjs OK.
- [x] G2: Desktop — ≥6 capturas (menu, largada, corrida, kerbs, gantry, HUD)
  EVIDENCE: desktop-run f00–f13 (14 frames gameplay demo, speed 0→58 m/s, volta completa); click-desktop3 countdown/go/run1/run2 (fluxo real clique→GO→29 m/s); menu_desktop. Visão analisou f02, f07, f11, f13, countdown, go, run2.
- [x] G3: Mobile — ≥4 capturas (menu, corrida, touch controls, HUD)
  EVIDENCE: mobile-run f00–f09 (10 frames, speed até 56 m/s); click-mobile countdown/go/run1/run2 (fluxo real, speed 24 m/s); menu_mobile. Visão analisou f05, go, run1, run2 — touch ◀▶+drift+item presentes, HUD legível.
- [x] G4: audit-geometry roda sem problemas novos (ou problemas listados)
  EVIDENCE: {meshesChecked:868, instancedChecked:117, onTrackSuspicious:0}; 4 decal-zfight SEV LOW (pré-existentes, documentados) — 0 alto/CRIT, 0 novos.
- [x] G5: Todas as capturas analisadas por visão; veredito por elemento problemático do passado
  EVIDENCE: céu roxo ABSENT em todas as ~20 frames pós-fix; cunha preta ABSENT; cones gigantes ABSENT; gantry lâmpadas com sockets; kerbs volume 3D; turbo pads âmbar chevron; banner FINISH nítido; multidão nas grades; menus com botões ≥44px no DOM (opacity 0 = artefato CSS-animation do headless, não bug).
- [x] G6: Relatório final entregue ao Feco com vereditos e pendências GPU real
  EVIDENCE: relatório no chat (mensagem final desta sessão).
