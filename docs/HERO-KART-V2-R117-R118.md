# Hero Kart V2 — R117/R118 convergence record

## R117 — technical gate passed

Build reproducible in Blender 4.0.2 on GPU runner LXC 105. Generator fixes: closed triangulated cylinder caps, UVMap on every authored mesh, canonical material remap per LOD, deterministic LOD reduction, and translation-invariant signed-volume audit.

Measured audit: LOD0 40,588 triangles / 5 materials / 0 n-gons / 0 non-manifold; LOD1 21,098 / 4 / 0 / 0; LOD2 6,028 / 3 / 0 / 0; collision 36 triangles / 0 non-manifold. Technical pass is real. Runtime and export remain blocked.

## R118 — primary visual gate failed

R118 replaced the prior flat windshield attempt with a single closed curved visor volume and four cowl mounts. The same five renders were produced: `assets/hero-kart-v2/R118/renders/{beauty,profile,top,rear,clearance}.png`.

Primary pixel review rejected the revision. Beauty and clearance still read the visor as an oversized tablet/block in front of the steering wheel; profile makes the visor disproportionate and detached in silhouette; the driver remains mannequin/procedural rather than a convincing seated authored character. Rear identity is readable, but that does not compensate for cockpit P0 failures.

Sol was not invoked: the dual-vision protocol requires primary approval first. R117/R118 checkpoints are preserved. Next experiment is a class-level cockpit/driver/windshield rebuild, not incremental boxes, cylinders, or panel tuning.
