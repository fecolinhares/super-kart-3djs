# Release Notes — Super Kart 3D.js v0.1.0

**Date:** 2026-08-08 · **Status:** 🚀 Release candidate
**Live:** https://fecolinhares.github.io/super-kart-3djs/ · **License:** MIT

## What's new
A complete cartoon arcade kart racer, 100% procedural (zero external assets):

- **6 named characters** with distinct suits/helmets/stats: Turbo, Comet, Bolt,
  Daisy, King, Pip.
- **Full item arsenal** with position-aware rubber-band: Mushroom, Green Shell,
  Red Shell (homing), Banana, Star (invincible + rainbow trail), Lightning
  (shrink + electric burst on victims).
- **Drift mini-boost** with charge-colored sparks and a satisfying release SFX
  (`driftReleaseMiniBoost`, player + AI with stereo pan).
- **Turbo pads** (2 clusters × 4 chevrons) for speed bursts.
- **Track dressing**: painted checkered finish line on the asphalt, white
  direction chevrons at the sharpest corners, tire-stack barriers (3 high),
  yellow lane dashes.
- **AA-grade models**: MK8-style item boxes (white panel, bold red '?',
  spinning + bobbing, golden ring + beam + sparkles), molded karts (rounded
  hood/tail + nose cone + headlights, oversized chibi driver), 2.5D painted
  spectator crowd (7 color variants, raised arms, cheering bounce) on 3 track
  segments + grandstands, hot-air balloons with classic stripes, wildflowers.
- **Gameplay feedback**: drift charge meter in the HUD (white → yellow →
  orange, with a tick at the mini-boost release point), speed-based camera FOV
  (+5° at top speed, +6° on boost), tire skid marks while drifting, confetti
  burst when crossing the line.
- **Quality of life**: Pause (P/Esc or ⏸ button on mobile) with overlay +
  audio suspend, "Race Again" button on the finish screen (or R).
- **Race-event atmosphere**: 3 grandstands (108 spectators) + a 56-figure
  roadside crowd lining the start straight, all cheering (bounce animation).
- **Live minimap**, lap progress bar, medal rank, polished speedometer + item slot.
- **5 AI rivals** with rubber-band throttle and item usage (never brake — brake = reverse).
- **Finish cruise mode**: after the line, AI drives the player at 60% while music swells.
- **Audio 100% procedural WebAudio**: engine loops (pitch = speed), 26+ SFX
  (UI clicks, off-road rumble, mini-boost, lightning), 3 music tracks, auto-pause
  on tab hidden.
- **Mobile**: touch controls (multi-touch), AudioContext resume on first gesture.

## QA
- Smoke, steering, item pickup, restart, toast — all automated ✅
- Vision critic: overall frame 7/10, finish banner 10/10, checkered finish line
  9/10 (close-up), grandstand event feel 9/10, HUD 7.5/10.
- See `docs/QA-TEST-PLAN.md`.

## Known issues
- Minimap legibility (v0.2).
- Software-GL is slow — `?test` mode exists for QA.

## Roadmap
- v0.2.0 — 2nd track, item roulette spin, time trial + best-lap ghosts.
- v0.3.0 — local 2P hot-seat, track editor, leaderboards.
