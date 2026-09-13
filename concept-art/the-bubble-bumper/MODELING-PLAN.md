# The Bubble Bumper — Sol-assisted modeling plan

## Objective

Create the first modeled kart of the new concept-art lineup, matching the approved The Bubble Bumper reference rather than reusing the abandoned Hero Kart direction.

## Source

`concept-art/the-bubble-bumper/assets/the-bubble-bumper.jpg`

The source contains five labeled panels: TOPO, LATERAL, FRENTE, TRÁS and ISOMÉTRICO. Labels/grid/floor lines are reference-only and must not enter the asset.

## Planned organization

```text
concept-art/the-bubble-bumper/
├── assets/the-bubble-bumper.jpg
├── MODELING-PLAN.md
├── MODELING-GATES.md
├── modeling/
│   ├── build_bubble_bumper.py
│   ├── render_bubble_bumper.py
│   ├── bubble-bumper.blend
│   └── renders/
└── reviews/
    ├── coder-visual-qa.md
    └── sol-visual-qa.md
```

## Required loop

1. Measure source and freeze proportion contract.
2. Build primary forms only.
3. Render the five fixed views.
4. Coder vision reviews the renders; rejection returns to modeling.
5. Sol reviews the same renders plus the original source; rejection returns to modeling.
6. Add secondary forms only after both visual approvals.
7. Repeat coder → Sol for secondary forms.
8. Apply materials and custom color channels.
9. Run technical gates only after visual approval.
10. Send final five-view render to Feco via Telegram and wait for explicit approval.

## Non-negotiable visual hierarchy

1. Rounded blue/yellow bumper.
2. Large smooth tires.
3. Open cockpit with visible pilot and thick steering wheel.
4. Rounded side pods.
5. Exposed gray mechanical rear with transverse bar, springs and dual exhausts.

## Current state

Sol direction recorded in `reviews/sol-plan.md`: hybrid controlled procedural setup + authored primary shell. Initial scale uses `D=0.500m` tire diameter, five orthographic cameras and the proportion table in the Sol review. No asset has visual approval yet.
