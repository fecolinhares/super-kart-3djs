# Sol visual QA — Blockout 007–009

**Veredito atual:** `SOL_BLOCKOUT_REJECT`
**Passes Sol:** 4 rejeições consecutivas após o primeiro plano: v005, v006, v007, v009.

## O que passa

- Classe geral Bubble Bumper reconhecível.
- Organização superior macro correta.
- Quatro pneus grandes, pretos e lisos.
- Traseira com housing, círculo, grade, barra e exatamente dois escapes.
- Proporção baixa/larga consistente entre as vistas.

## P0 persistentes

1. **Bumper:** mesmo sendo uma curva no código, os pixels ainda leem barra/peças concorrentes; não há U único com retornos e hardpoints inequívocos no top/profile/front/isometric.
2. **Cockpit/piloto:** assento/pelve/coxas não produzem leitura convincente de ocupante sentado; a cadeia wheel→hub→column→dash/hands continua ambígua entre vistas.
3. **Side pods:** ainda parecem componentes colocados ao lado do shell, com gaps/terminações abruptas em vez de nascerem da célula central.
4. **Suspensão:** braços/molas têm terminações escondidas atrás de pneus/pods; as duas ancoragens funcionais não são comprovadas em todas as vistas.

## Decisão de processo

Após quatro rejeições Sol na mesma classe de blockout, bloquear novos patches de tubes/lofts/anchors. O próximo experimento precisa trocar a representação:

- primary shell autoral contínua com cockpit escavado;
- side pods esculpidos como transições da shell, não lofts laterais independentes;
- bumper modelado como uma única peça authored mesh com sockets no shell;
- driver/steering como asset base separado e posicionado por rig/socket;
- suspensão como assembly com mounts explícitos em frame e upright.

Nenhuma aprovação Sol ou do usuário foi concedida. O render não deve ser enviado como final.
