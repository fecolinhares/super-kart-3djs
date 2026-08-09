# Release Notes — Super Kart 3D.js v0.1.0

**Date:** 2026-08-08 · **Status:** 🚀 Release candidate
**Live:** https://fecolinhares.github.io/super-kart-3djs/ · **License:** MIT

## What's new
A complete cartoon arcade kart racer, 100% procedural (zero external assets):

- **6 named characters** with distinct suits/helmets/stats: Turbo, Comet, Bolt,
  Daisy, King, Pip. Driver stats are APPLIED: speed/accel/handling shape each
  AI rival's cruise speed, throttle eagerness and steering authority.
- **Full item arsenal** with position-aware rubber-band: Mushroom, Green Shell
  (follows the racing line — MK8 behavior), Red Shell (homing), Banana,
  Star (invincible + rainbow trail), Lightning (shrink + slow + electric burst),
  **Blue Shell** (Spiny-style: homes in on the race leader — the tail-ender's
  anti-leader pressure valve). Holding a shell/banana behind **blocks an
  incoming hit** (MK8 item-hold pillar).
- **Slipstream drafting**: ride in a rival's wake (~2.5m, +8% top speed) with
  wake streak particles + a pulsing DRAFT indicator — the core non-item
  comeback tool.
- **Trick ramps**: 2 launch ramps on straights (toon orange + painted chevrons);
  press throttle mid-air to arm a trick → landing mini-boost. Ramp launch and
  the arm window are tuned so the trick reliably fires.
- **Blue Shell** bypasses held-item blocking (only star/invincibility protects
  — MK8 spiny behavior), so the leader can't passively shield it.
- **Drift mini-boost** charge-scaled (300–750ms by charge) with charge-colored
  sparks and a satisfying release SFX (`driftReleaseMiniBoost`, player + AI
  with stereo pan). Charge-scaled drama: bigger charge = louder pop + more
  sparks.
- **Turbo pads** (2 clusters × 4 chevrons) for speed bursts.
- **Track dressing**: painted checkered finish line on the asphalt, big
  direction chevrons at the sharpest corners, tire-stack barriers (3 high),
  yellow lane dashes, **corner warning signs** (pole + arrow panel),
  **100m/200m distance boards**, **roadside light poles on straights**,
  textured dirt shoulders.
- **AAA material pipeline**: karts use MeshPhysicalMaterial clearcoat (real
  painted-plastic reflections from a procedural sunny-sky IBL environment),
  chrome metalness exhausts, denser geometry (28-segment hood/tail, 24-seg
  tires, rear spoiler wing + struts, hood/rear specular highlights). 256px
  asphalt with cracks/grime, 256px grass with blade strokes, sky dome with
  painted sun + haze.
- **MK8-style item boxes** (white panel, bold red '?', spinning + bobbing,
  golden ring + beam + sparkles), molded karts + oversized chibi driver,
  2.5D painted spectator crowd on 6 track segments + grandstands,
  hot-air balloons, wildflowers.
- **Gameplay feedback**: drift charge meter, speed-based camera FOV, skid
  marks, confetti at the line, **position-change chip pop + posUp/posDown
  SFX** (overtakes are audible), lap fanfare, item pickup fanfare, landing
  thump, drift tire screech, mini-boost sparkle bursts, **MK8 item roulette**
  (the slot cycles icons ~0.7s before revealing the pickup).
- **Quality of life**: Pause (P/Esc or ⏸ button on mobile, tap-to-resume),
  "Race Again" + **"Menu"** buttons on the finish screen, touch **DRIFT
  button** (hold-to-drift on mobile), **kart color + mute state persisted**
  (localStorage, menu picker stays in sync), **audio mute toggle** on the
  menu, **rising countdown pitch** 3-2-1, UI hover sounds, one-time drift
  onboarding tip, drift meter flashes + beeps at the release point, AI drift
  sounds, mobile perf tier (pixelRatio cap on coarse pointers).
- **Live minimap**, lap progress bar, medal rank, polished speedometer + item slot.
- **5 AI rivals** with real rubber-band (cruiseSpeed override capped +12%,
  true top-speed comeback), per-driver stats (speed/accel/handling),
  per-driver lateral lane offsets (no train formation), corner-lift throttle,
  item usage, quiet panned drift screech.
- **Difficulty honesty**: overtakes never feel like cheats — rubber-band is
  capped and drivers hold personal racing lines.
- **Finish cruise mode**: after the line, AI drives the player at 60% while music swells.
- **Audio 100% procedural WebAudio**: engine loops (pitch = speed), 32+ SFX,
  3 music tracks, auto-pause on tab hidden.
- **Mobile**: touch controls (multi-touch, drift button), AudioContext resume
  on first gesture.

## QA
- Smoke, steering, item pickup, restart, pause, shell-hit — all automated ✅
- Vision critic (strict, vs MK8 bar): overall 7/10 polished arcade racer,
  gloss/clearcoat visible up close, kerbs/dashes/boxes/spectators 9/10.
- See `docs/QA-TEST-PLAN.md`.

## Known issues
- Minimap legibility (v0.2).
- Software-GL is slow — `?test` mode exists for QA.

## Roadmap
- v0.2.0 — 2nd track, item roulette spin, time trial + best-lap ghosts.
- v0.3.0 — local 2P hot-seat, track editor, leaderboards.
