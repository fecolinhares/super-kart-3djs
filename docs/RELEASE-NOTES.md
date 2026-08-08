# Release Notes — Super Kart 3D.js v0.1.0

**Date:** 2026-08-08 · **Status:** 🚀 Release candidate
**Live:** https://fecolinhares.github.io/super-kart-3djs/ · **License:** MIT

## What's new
A complete cartoon arcade kart racer, 100% procedural (zero external assets):

- **6 named characters** with distinct suits/helmets/stats: Turbo, Comet, Bolt,
  Daisy, King, Pip.
- **Full item arsenal** with position-aware rubber-band: Mushroom, Green Shell,
  Red Shell (homing), Banana, Star (invincible + rainbow trail), Lightning
  (shrink + electric burst).
- **Drift mini-boost** with charge-colored sparks and a satisfying release SFX.
- **Turbo pads** (2 clusters × 4 chevrons) for speed bursts.
- **Live minimap**, lap progress bar, medal rank, polished speedometer + item slot.
- **5 AI rivals** with rubber-band throttle and item usage (never brake — brake = reverse).
- **Finish cruise mode**: after the line, AI drives the player at 60% while music swells.
- **Audio 100% procedural WebAudio**: engine loops (pitch = speed), 24+ SFX,
  3 music tracks, UI sounds, off-road rumble, auto-pause on tab hidden.
- **Mobile**: touch controls (multi-touch), AudioContext resume on first gesture.

## QA
- Smoke, steering, item pickup, restart, toast — all automated ✅
- Vision critic: HUD 7.5/10, finish banner 8/10, grandstand event feel 9/10.
- See `docs/QA-TEST-PLAN.md`.

## Known issues
- Minimap legibility (v0.2).
- Software-GL is slow — `?test` mode exists for QA.

## Roadmap
- v0.2.0 — 2nd track, item roulette spin, time trial + best-lap ghosts.
- v0.3.0 — local 2P hot-seat, track editor, leaderboards.
