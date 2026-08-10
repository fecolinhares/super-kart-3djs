# Release Notes — Super Kart 3D.js

**Date:** 2026-08-09 · **Status:** 🚀 v0.2.0-draft (AAA visual/audio pass)
**Live:** https://fecolinhares.github.io/super-kart-3djs/ · **License:** MIT

### Round 3 — AAA polish loop (auditor-driven, 2026-08-09)
- **Round 16 — FECO critical pass (vs MK8D/Sonic Team Racing)**:
  - Crowd: paper billboards REPLACED by dense 3D spectators (instanced
    body + head + raised arms, 3 rows, grounded, bounce preserved).
  - Foliage: canopy segments up (pine 14), per-tree tone jitter ±8%,
    bushes as 2-3 sphere clusters, fake-AO base discs under trees.
  - Banners: gantry FINISH rebuilt as crisp 512px canvas, finish checker
    1024px, banner/flag textures 512px — no stretched look.
  - Audio: 8-bit beeps replaced by fat modern arcade SFX (noise sweeps,
    layered hits, filter sweeps, reverb + master compressor).
  - Rims: satin silver (no per-spoke mirror reflections).
- **Round 17-18 — Feco structural pass (3 critical vision agents)**:
  - Camera: MK8D chase (5.2m/2.6m/FOV 68) — the kart fills the frame;
    the gantry no longer dominates.
  - Color grade: saturation 1.45 / contrast 1.25 — ACES tone mapping was
    eating the grade (measured washed 87/255 + 21% dead-grey on the real
    GPU); the grade now fights ACES for the MK8 punch.
  - Gantry: banner 1.55m raised to y5.15, pillars 6.1m — reads as a
    finish structure, not a wall in the driver's face.
  - Terrain: broad hills ±5.0m — rolling field, not a carpet.
  - HUD: rank + item slots BOTTOM-LEFT (MK8D), unified card language.
  - Mountains: irregular ridgelines, broken snowlines, 3 value-contrast
    layers, distance haze.
  - Grid: wider spacing (row 4.6m / col 3.4m) — no more wheel-merge.
  - **Round 19 — fix-check regressions**: terrain scaled to ~±5m (was
    ±8.4m — ridge walls), off-road karts ride the rolling terrain
    (terrainHeight beyond the corridor), camera pullback 0.35→0.15
    (kart keeps the MK8D frame share at top speed).
  - **Round 20-21 — auditor MEDs**: terrain mesh matches physics (×0.7,
    no sink/float), camera 5.7m (no bottom crop), minimap darker bg,
    mountain mid-band haze reduced, gantry pillar flush (y3.05),
    5-lamp start countdown (MK8D), night skyline per-row haze.
  - **Round 22 — results screen**: the finish card now shows the FULL
    final standings (position + driver + time) from getStandings —
    MK8D's results screen. (Audit r21: 2 of 3 MEDs were false
    positives — the rocket start exists and no glider code is dead.)
- **Round 15 — audit r9 fixes**: third drift spark tier (purple @ 0.9),
  blue-shell splash (knocks karts near the leader), color-grade restored
  on real GPUs (software GL stays safe), high-speed wind streaks.
- **Round 14 — audit r8 fixes**: coin drop on hit (up to 3, respawned),
  blue-shell dodge counterplay (trick/item-box invincibility window),
  item roulette anticipation (0.45s shuffle), floating rank arrows
  (1-8) above every kart.
- **Round 13 — audit r7 fixes**: AI defensive rear-item play (chased AI
  drops/throws backward), shell motion trails, start-grid pole numbers,
  cloud shadows, sun lens flare, finished-kart wheelie + checkered flag,
  Lakitu toast wired, blue shell leader-only collision.
- **Round 12 — audit r6 fixes**: crowd figures get volume (2 crossed
  planes, terrain-grounded), 3D grass tufts in the infield, banner
  texture 512px, Lakitu clears the held item, AI rocket start at GO,
  blue shell re-targets the current leader each frame, AI uses its
  reserve item slot.
- **Round 10-11 — FECO review fixes**:
  - AI reverse bug: nearest-sample fallback could land on the opposite side
    of the loop (AI drove backwards) — now snaps to the progress point.
  - Crowd orientation: billboard figures now face the track with explicit
    roll-free yaw (no more upside-down/paper figures).
  - Finish line: 512px 8x2 crisp checker (was 256px 6x2 stretched).
  - Trackside banners: print only on the ±Z faces (side strips were
    distorted); chrome rims toned down.
  - Full-screen RACERS screen (character cards + stats + kart silhouette)
    and TRACKS screen (canvas-drawn track layout + START marker).
  - Premium karts: expressive driver face, gloves, wing endplates,
    exhausts, canards, brake calipers, accent hub caps, fake AO.
  - 3D instanced grass blades, gravel verge strip, bush tone variation.
- **Round 9 — convergence fixes**: blue-shell ARC TDZ crash (froze the race
  on every blue shell — fixed + live-tested), AI throttle clamp, turbo pads
  fire mid-boost, draft exit-kick player-only, boost ignores off-road
  slowdown, duplicate key light zeroed.
- **Blue shell ARC (r8)**: flies high with a ground-shadow warning, then
  dives on the leader — the MK8 doom cue, no more blue-painted red shell.
- **Off-track rescue (r8)**: 2s stuck off-road + slow → Lakitu respawn on
  the racing line with a hop.
- **Lap splits (r8)**: per-lap + best-lap chip under the timer, green
  flash on a new best.
- **Mow stripes (r8)**: deterministic terrain vertex-color bands — the
  field no longer reads as one flat green.
- **Backward item throw (r7)**: hold ITEM ~0.35s arms rear, release fires
  shells/bananas backward — the MK8D core skill; touch long-press.
- **Driver selection (r7)**: character cards with stat bars in the menu —
  roster speed/accel/handling now apply to the player, persisted.
- **Post-hit i-frames (r7)**: 2s invincibility after any hit + 2s spawn
  protection at GO — no chain-stun pinning.
- **Lighting contrast (r7)**: shadow sun is the sole key, hemi/fill cut —
  lit/shadow ratio >2:1; soft penumbra shadows (radius 4.5).
- **Mountain variety (r7)**: per-peak stretch → ridge walls, flat buttes,
  varied snow lines.
- **Castle texture (r7)**: stone-block + moss, red tile roofs, emissive
  windows, logo banner — the landmark reads at race distance.
- **Item depth (r6)**: second held-item slot + swap key; coin pickups
  (+1% maxSpeed each, cap +10%); triple item boxes (~1/6) with queued
  uses — the MK8 hold/swap + collect economy.
- **Castle landmark** in the Meadow infield (keep + 4 turrets + cone
  roofs + pennant) — the course's identity piece.
- **CC selector (50/100/150)** + auto-accelerate + steer-assist + player
  stats applied — difficulty/accessibility layer; speedo gauge rescales
  with the engine class.
- **Off-road exit kick** — held grass dives pay a recovery boost.
- **AI avoids hazards**, targets the rival ahead (standings), rocket
  start is a timing skill, menu music + music intensity arc, sponsor
  boards read clean (no more fake "checker corruption"), grass mow
  variation, prop contact shadows, deterministic world.
- **Black artifacts eliminated**: snow-cap faces with inverted windings got
  averaged normals pointing INWARD → weak-emissive faces rasterized black
  ('jagged black triangular patches on peaks' — every critic round). Ridged
  cones now use RADIAL normals (outward in XZ) + snow emissive lifted
  (0.35-0.42). Gantry diagonal cross-braces removed (the X across the
  racing line read as broken geometry).
- **Forest instancing fixed**: trees were piled at world origin (matrices
  written into dead meshes) — the visible blob is gone.
- **AI no longer trains**: lane offsets seeded from roster index (golden-ratio
  spread) instead of a zeroed position; leaders cap their speed at 1.0×.
- **Shadow camera follows the player** (±28m tight frustum, ~2.7cm texels)
  instead of one ±90m frustum over the loop (blurry blob shadows).
- **Asphalt specular**: racing-line overlay is now MeshPhysicalMaterial
  (clearcoat 0.35, envMapIntensity 1.1) — polished-rubber sheen, not flat
  matte; leftover MeshToonMaterial (water/pond/billboard) → PBR Standard.
- **Drift tiers + auto mini-turbo** (MK8D cadence): spark/beep at 0.33/0.66,
  full-charge auto-release after a grace window.
- **Kart contact physics**: lateral closing speed → spin-out + collision SFX +
  camera shake; positional snap clamped (no teleporting).
- **AI items target the nearest rival ahead** (not always the player).
- **Camera swing**: lateral offset ∝ steer while drifting, distance ∝ speed,
  kick on mini-boost.
- **Positional audio**: AI engine loops panned/spaced from the camera bearing;
  crowd ambience wash + cheer bursts; engine gear map with upshift drops;
  final-lap jingle + triangle fallback (no 8-bit leakage).
- **Pause UX**: Restart / Sound / Menu buttons in the pause overlay (touch
  players can leave mid-race); restart hygiene clears trick/draft state.

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
- **Track rebuild (authored MK8D circuit)**: racing-line wear overlay (wet
  polished rubber sheen over the asphalt), worn 4-tone beveled kerbs with
  per-stone jitter, armco guard rails (main rail + lower line + box posts +
  footing plates), painted-on markings with grime, 6 road sponsor decals on
  the straights, asphalt edge shadow lines, structural gantry with cross-
  braces.
- **Environment density**: ridged/vertex-jittered mountains (snow cap drapes
  the ridge — no more plain cones), 3D grass tufts along both verges, hay
  bales, sponsor boards on 3D frames, corner marshal flags, reflective water,
  sun glow billboard.
- **Post pipeline stability fix**: UnrealBloomPass AND SSAO rendered BLACK on
  software GL (SwiftShader/llvmpipe) once the scene moved to PBR — the
  composer now detects the software rasterizer (WEBGL_debug_renderer_info)
  and drops bloom there; hardware GPUs keep it. The custom ColorGradeShader
  was also removed (bloom→colorgrade→vignette chained passes broke software
  GL) — ACES tone mapping in OutputPass carries the grade. Contact grounding
  comes from the kart blob shadow + PCF shadow maps.
- **Kart rebuild (premium MK8D)**: 48-seg molded shell with side intakes,
  front splitter, fender flares + panel-line seams; wheels with tread ribs +
  sidewall stripes + 5-spoke chrome rims + hub caps; curved spoiler blade +
  splitter + endplates + pylon; driver with bent arms gripping a 3-spoke
  wheel (9-and-3), helmet visor, bucket seat + headrest; distinct PBR
  materials (clearcoat paint 2.2 / matte rubber / chrome metal / PBR glass).
- **Material pipeline rebuilt toon→PBR**: `toonMaterial()` now returns
  `MeshStandardMaterial` (continuous PBR shading, responds to the sunny-sky
  IBL) — the 3-band cel gradient that read as "low poly" is gone; hemi/key
  lifted for the PBR response, exposure 1.12, item boxes shrunk 2m→1.4m.
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
  lit windows (3 depth layers, 48+ towers), neon pink/cyan poles, dark asphalt
  with BAKED neon spill (cityRoadTexture), neon kerbs, metallic guard-rails
  with emissive top strip, concrete sidewalks, glowing street signs + shop
  signs on the close towers, night IBL so clearcoat/chrome reflect the city,
  and its own **Neon Nights** soundtrack (dark Dm sawtooth, 142bpm).

## AUDIT round — gameplay + visual + UX fixes (real findings, verified)
- **HIGH gameplay**: landing squash no longer taxes speed (lightning slow moved to a
  dedicated `_slowFactor` — every jump used to cut top speed 6-8% via the shared
  visual squash field).
- **HIGH ux**: pause "Sound" button no longer resumes the race (click bubble stopped).
- **Gameplay MED**: AI hazard dodge weakened (bananas land now), leading AI drops
  bananas in-lap (was lap-ahead only), AI coins+rubber capped at +12% total, off-road
  exit kick now audible (+dust), sub-threshold drift release no fake boost cue.
- **Visual MED**: night IBL reflects a moon (not a day sun), 4 neon lights added to the
  east/north arc (full circuit coverage), skyline footprint variation + roof antennas,
  first tower row pulled to 11m (no dead band).
- **UX MED**: mute unified + persisted, finish fanfare uses a temporary duck (no volume
  leak), touch controls hidden at FINISHED, help table lists Tab swap item.

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
