# Decisão sombra para ordem de chegada

Pedidos explícitos de ordem de chegada com data concreta são aterrados deterministicamente em `scheduling.list_arrival_periods`.

- O contrato aceita apenas data, período do dia e texto opcional do serviço.
- Cancelamento, remarcação e agendamento com hora continuam usando os fluxos existentes.
- Saídas inválidas do modelo também passam pelo aterramento seguro.
- A decisão apenas consulta; não registra intenção.
