# Release Notes — Super Kart 3D.js

**Date:** 2026-08-09 · **Status:** 🚀 v0.2.0-draft (AAA visual/audio pass)
**Live:** https://fecolinhares.github.io/super-kart-3djs/ · **License:** MIT

## v0.2.0-draft — the AAA pass (2026-08-09)

### Gameplay round-2 (auditor-driven)
- **Trick ramps now actually launch the kart** — unit test proved the launch
  never fired (the airborne threshold ate the vY the same frame). Karts now
  CLIMB the wedge (ground height interpolates the ramp slope) and launch off
  the top into a real ~0.4s arc — the mid-air trick + landing boost works.
- **Kart collisions are speed-aware**: rear-ender shoves the front kart less
  and pays a small speed penalty; finished karts are separated but never
  accelerated (were rammed like targets).
- **AI controllers unified** on `raceManager.aiControllers` (single source of
  truth) — kills the duplicate per-frame AI update and the cruise-controller
  leak at its root.
- **Restart hygiene**: `lastHeldItem`/`offroadT` reset so no stale item toast
  or gravel rumble bleeds into the new race.
- **Mobile UX**: touch buttons hide on pause (they blocked tap-to-resume) and
  when returning to the menu (they floated over the card).
- **Sky dome** 64×32 segments (24 faceted the horizon).

### Bug fixes (user-reported)
- **Restart regains player control**: the finish-cruise AIController attached
  to the player kart is now removed on restart (`Race Again` / `R`) — the AI
  no longer fights your steering after a reset ("the game was driving the car").
  Regression-tested by signature (`playerAIControlled` false→true→false).
- **Trick ramps flush with the road**: ramps are now wedges (bottom face flat
  on the asphalt, slope baked into the geometry) instead of boxes rotated
  around their center — the low end no longer sinks into the tarmac or floats.
- **Crowd off the racing line**: fixed the wrap-segment sampling bug that
  scattered the "start straight" spectators across the whole circuit (and into
  curves); rows pushed outside the guard-rail line; grandstands check all four
  corners against the track.

### Visual — MK8D bar
- **Karts rebuilt**: LatheGeometry molded shell (nose→body→tail lozenge)
  replaces the box chassis; cockpit tub + seat/headrest; shaped spoiler blade
  with struts + endplates; wheels with tread ribs, chrome disc rims + hub caps
  that roll with the tire; chrome metal for rims/exhaust; fine outlines on
  painted panels so clearcoat shows (envMapIntensity 2.0).
- **Track**: beveled/chamfered curb profile (rounded kerb stones, not flat
  tiles); guard rails with support posts every ~4m; trick ramp presence
  increased; asphalt reworked to 512px with dashed broken tire-wear ribbons
  (kills the horizontal banding) + racing-line rubber buildup.
- **Environment**: FOUR depth-banded mountain ranges with distinct hues,
  warm horizon haze rings, clouds in organized sky lanes (fog:false), two-layer
  water with shimmer, denser grandstand/crowd.
- **Post-processing**: composer now renders into a HalfFloat MSAA target
  (samples:4) — clean edges through bloom; bloom tamed (0.38/0.95) so whites
  don't blow out; brighter sunny-sky IBL with a hard sun core for defined
  clearcoat/chrome reflections.

### Audio — no more "8-bit"
- **Master chain**: EQ (hp28 + presence + high shelf) → soft tanh waveshaper →
  compressor, plus a procedural convolution reverb send (generated IR) so SFX
  and music share a believable space.
- **Engine loops**: sine sub-oscillator + per-voice saturation — real
  combustion body instead of a thin 2-osc synth buzz.
- **SFX**: raw squares replaced (hover/click/use-item/pos-change/countdown/
  mini-boost) with triangle/sine + chime bodies.
- **Music**: sidechain-style kick duck (~12% pump), kick click transient,
  snare body tone — the mix breathes.

---

## 🏁 Track 2: NEON CITY (menu track switch or `?track=2`)
- Tight urban circuit (649m — long straights + hairpins, same physics).
- Night theme: dark purple-blue sky + glowing moon, building skyline with
  lit windows, neon pink/cyan poles, dark asphalt, neon kerbs, metallic
  guard-rails with emissive top strip.

## 🏁 Track 1: SUNNY MEADOW (default)
- Rolling-hill field with re-grounded landmarks (pond, hilltop grove, rock
  formation, windmill), sponsor boards, corner cones, flower/rock groups,
  guard-rails, 3-point lighting, layered mountains + 3 tree species.

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
  wake streak particles + a pulsing DRAFT indicator; **leaving a wake grants
  a 600ms slingshot boost** (3s cooldown) — the core non-item comeback tool.
- **Rocket start**: hold throttle at GO for a 900ms launch boost — the
  MK8/CTR signature opening skill.
- **Trick ramps**: 2 launch ramps on straights (toon orange + painted chevrons);
  press throttle mid-air to arm a trick → landing mini-boost. Ramp launch and
  the arm window are tuned so the trick reliably fires.
- **Blue Shell** bypasses held-item blocking (only star/invincibility protects
  — MK8 spiny behavior), so the leader can't passively shield it.
- **Held-item bubbles** on every kart (colored orb + ring, spinning) — rivals'
  shields are readable; **brake lights** flare on braking/spin-out; lightning
  knocks held items away + a shock hop.
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
- **AAA world (redesign v1+v2)**: continuous low guard-rails along both road
  edges (below the chase camera, never obstructing), 3-point lighting rig
  (warm key + cool fill + shadow sun with PCF+radius soft shadows),
  2-layer mountains (rock base + snow caps) at 3 depth bands, forest with
  3 species of LAYERED canopy trees (pine/oak/palm), organized prop clusters
  (seeded deterministic placement — same world every load), grass with
  fine stipple patches (no flat green, no banding), kart contact shadows as
  soft radial-gradient ovals (no decal look), corner signs + distance boards
  + light poles on straights, **dense organized roadside** (sponsor boards on
  straights, flower patches + grass tufts along both rails, corner cone
  markers at apexes — all below the camera line).
- **MK8-style item boxes** (white panel, bold red '?', spinning + bobbing,
  golden ring + beam + sparkles), molded karts + oversized chibi driver,
  2.5D painted spectator crowd on 6 track segments + grandstands,
  hot-air balloons, wildflowers.
- **Gameplay feedback**: drift charge meter, speed-based camera FOV, skid
  marks, confetti at the line, **position-change chip pop + posUp/posDown
  SFX** (overtakes are audible), lap fanfare, item pickup fanfare, landing
  thump, drift tire screech, mini-boost sparkle bursts, **MK8 item roulette**
  (the slot cycles icons ~0.7s before revealing the pickup), **PLAYER HIT
  feedback** (red screen flash + "BANANA!/SHELL HIT!" label + camera shake),
  **item-use toast** (🍄 MUSHROOM! / 🐢 SHELL! etc) + spark bursts on use,
  **tire speed-dust + subtle exhaust puffs** (karts feel alive at speed).
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
