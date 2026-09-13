# Bubble Bumper — Gates

- [x] G1 — v015 Blender artifact builds successfully.
  EVIDENCE: `BUBBLE_BUMPER_BLOCKOUT_OK /tmp/bubble-bumper-v015/modeling/bubble-bumper-v015.blend OBJECTS 69`
- [x] G2 — Five fixed proof renders exist and are non-empty.
  EVIDENCE: `renders-v015/{top,profile,front,rear,isometric}.png`; sizes measured between 750956 and 861473 bytes.
- [x] G3 — Coder visual gate passes v015.
  EVIDENCE: `reviews/coder-visual-qa.md` records `CODER_BLOCKOUT_PASS` with no P0.
- [ ] G4 — Sol visual gate passes v015.
  BLOCKER: Sol runner returned `HTTP 429: free-models-per-day`; no approval claim is allowed until a real Sol result exists.
- [ ] G5 — User receives a candidate only after G4.
  EVIDENCE: pending on G4.
- [ ] G6 — Final technical inspection/export after visual approval.
  EVIDENCE: pending on G4.
