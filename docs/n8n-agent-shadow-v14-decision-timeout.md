# Timeout da decisão no workflow sombra v14

O nó `Call SISAG Shadow Decision` aguarda até 25 segundos. O limite cobre a latência observada em produção sem ultrapassar os 30 segundos reservados ao espelhamento completo.

A alteração evita que uma continuação válida de remarcação seja interrompida aos 15 segundos e tratada como uma nova solicitação incompleta. Ela não amplia permissões, não altera a agenda e não modifica o timeout da ferramenta somente leitura.
