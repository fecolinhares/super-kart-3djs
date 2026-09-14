# Independent Sol Representation Review — Bubble Bumper

**Modelo:** `gpt-5.6-sol-900k`
**Reasoning:** `xhigh`
**Status:** `NOT VALIDATED` para aprovação de asset; o job não produziu aprovação visual de uma revisão.

## Decisão

Pipeline híbrido orientado por componente:

- SubD/manual retopologizada para nariz, cowl, cockpit, side pods, insets, rear housing e capacete.
- Curvas Bézier/NURBS apenas para bumper U, frame rails, crossbar, escapes, molas e mangueiras; todos exigem collars, sockets e mounts manuais.
- Base humana rigada, pose dentro do cockpit, sculpt corretivo e retopo para o piloto.
- Procedural somente para landmarks, simetria, repetição, câmeras e auditoria.
- Visual hull/voxel somente como proxy descartável de ocupação e inconsistência entre vistas.

## P0 confirmado

Um único conjunto de wheel centers, centerline, chão e envelopes deve sustentar as cinco vistas. O cockpit precisa ser profundo; o piloto deve ter pelve, costas, coxas, pés, braços e mãos em contato com o volante. O bumper deve ser um U contínuo com retornos e sockets. A traseira deve conter housing compacto, crossbar, módulo circular distinto, grade inferior, molas e exatamente dois escapes.

## Ordem de aprovação

`Coder vision PASS → Sol/xhigh PASS da mesma revisão → usuário PASS explícito → validação técnica/export`

Mesh manifold, UVs, contagem de triângulos, render bonito ou intenção do script não substituem aprovação perceptual. Nenhum asset Bubble Bumper está aprovado.
