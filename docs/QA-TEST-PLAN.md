# QA Test Plan — Super Kart 3D.js v0.1.0

> Follows the `game-dev-qa-test` workflow: test plans, smoke, regression, bug triage.
> Headless QA scripts live in the agent's cache (`/home/jarvis/.cache/sk3d-*.cjs`)
> and drive the game via Playwright against `?test` (PostFX off, fast countdown).

## 1. Scope
Release-critical checks for v0.1.0: boot, race loop, input, restart, items,
audio lifecycle, HUD, mobile basics, performance budget.

## 2. Test matrix

| ID | Area | Test | Method | Status |
|----|------|------|--------|--------|
| T01 | Boot | Game boots with 6 karts, track, no console errors | `sk3d-smoke.cjs` | ✅ PASS |
| T02 | Input | +steer turns the kart RIGHT (Three.js convention) | `sk3d-steer-test.cjs` | ✅ PASS |
| T03 | Items | Teleport onto item box → kart holds item, box deactivates | `sk3d-pickup-test.cjs` | ✅ PASS |
| T04 | Restart | Teleport far + R → kart returns to grid, lap 0, speed 0 | `sk3d-restart4.cjs` | ✅ PASS |
| T05 | Toast | Item toast shows icon+name above item slot (not screen-center) | `sk3d-toast-test.cjs` | ✅ PASS |
| T06 | Finish | Player finish → FINISHED state, cruise AI drives at 60%, music swells, no engine screech | manual + code audit | ✅ PASS |
| T07 | Audio | UI sounds on menu; off-road rumble; mini-boost SFX on drift release | code audit + manual | ✅ PASS |
| T08 | Mobile | Touch buttons (LEFT/RIGHT/ITEM) via pointer capture; AudioContext resumes on first gesture; menu has solid fallback (no backdrop-filter dependency) | code audit | ✅ PASS |
| T09 | Performance | Build < 200 draw calls (instanced), 60fps desktop, ≤33ms mobile | code audit + profiler | ⚠️ TBD manual |
| T10 | Restart control | Finish-cruise AIController REMOVED on restart (player regains input — the "game drives the car" bug) | `sk3d-restart-sig-test.cjs` (playerAIControlled false→true→false) | ✅ PASS |
| T11 | Trick ramp | Kart CLIMBS the wedge and launches airborne (vY>1, airTime>0.15) | `sk3d-ramp-unit-test.cjs` (physics unit test) | ✅ PASS |
| T12 | Smoke | Boot → race state, 6 karts, no errors (robust, waits for race) | `sk3d-smoke-robust.cjs` | ✅ PASS |

## 3. Regression notes (this release)
- `Kart.restart()` now uses the SAVED startPosition — restart actually resets (bug fixed).
- Item toast keys are lowercase (PowerUpType VALUES) — slot + toast icons finally match.
- Finish cruise mode replaces the engine screech (AI drives player, music swells).
- `?test` / `__freezeCam` QA hooks are stable; vision critic re-scores HUD 7.5/10, banner 8/10.
- v0.2.0: `raceManager.aiControllers` is the single source of truth (no duplicate
  array in main.js); `restart()` drops the player's cruise controller itself.
- v0.2.0: ramp launch anchors past the airborne threshold — the trick was silently
  dead before (unit test caught it); karts now climb + launch.

## 4. Known issues (accepted for v0.1.0)
- Software-GL headless is ~1-5 fps — QA requires `?test` (documented, by design).
- Minimap reads "radar-like" at a glance; route legibility is a v0.2 item.
- Speedometer shows 0 km/h in static captures (correct — kart parked in QA frames).
