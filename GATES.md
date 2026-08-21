# Gates: céu roxo / cunha preta na largada (super-kart-3djs)

Scope: identificar e corrigir o campo roxo sólido no céu + cunha preta na grama perto da largada.

- [x] G1: Culpado identificado com mecanismo explicado (não só correlação)
  EVIDENCE: bisect por occlusão c/ câmera congelada → Group#0.children[10]; solo render purple 31104/31104; probe: {isInstancedMesh:true, count:840, instCap:264}; TrackBuilder.js:1703 aplicava foliageDensity(0.3) só no alloc do buffer enquanto o loop escrevia todos os clusters → GPU lia matrizes de lixo. Teoria das nuvens da sessão anterior REFUTADA (patches em worldY≈0, corretos).
- [x] G2: Fix aplicado nos 4 sites do padrão, sem mudar posicionamento de elementos sãos
  EVIDENCE: commit 8b20b3c (2 files, +41/-7): tufts buffer total+count=min(idx,floor(total*d)); apex cones/rings count sincronizado; brake boards frames.count=fIdx; crowd guard idx>=total + count nas 12 partes + slot stripes sempre escrito.
- [x] G3: Pós-fix: 0 InstancedMeshes inconsistentes na cena
  CHECK: grep -c "bad:\[\]" /tmp/sk3d-probe/verify.log
  EXPECT: 1
  EVIDENCE: auditoria runtime pós-fix: {totalIM:117, bad:[]} (antes: 4 inconsistentes).
- [x] G4: Pixels roxos no céu ~zero
  EVIDENCE: PURPLE_RIGHT 31.104 → 20 pixels (verify.log); screenshot fixed-race.png analisada por visão: céu azul limpo com nuvens, sem campo roxo, sem cunha preta na grama.
- [x] G5: Commit atômico + push
  CHECK: cd /mnt/storage2TB/Coding-Projects/super-kart-3djs && git log --oneline -1
  EXPECT: fix(instancing)
  EVIDENCE: git push OK — 5da35ce..8b20b3c main -> main
