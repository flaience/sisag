# Encaminhamento humano somente por intenção explícita

## Correção

O roteamento de produção passa a criar e notificar um encaminhamento humano somente quando a decisão estruturada tiver action handoff, toolName nulo e reasonCode handoff_required.

Falhas técnicas como invalid_output ou provider_unavailable não criam pendência, não pausam a conversa e não enviam a mensagem de encaminhamento. Elas continuam pelos caminhos de fallback já existentes.

## Comportamento preservado

- Uma solicitação explícita para falar com uma pessoa continua abrindo a fila.
- Estados pending e claimed continuam suspendendo apenas a conversa correspondente.
- Concluir ou dispensar continua liberando a conversa.
- O fluxo de disponibilidade e agendamento permanece independente.
