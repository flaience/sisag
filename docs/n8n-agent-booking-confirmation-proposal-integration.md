# Integração sombra da proposta de confirmação de agendamento

Esta etapa permite que o espelhamento valide e transporte, de forma efêmera, uma proposta estruturada de confirmação criada a partir de um único horário confiável.

## Limites desta etapa

- A proposta exige confirmação explícita por `SIM` ou `NÃO`.
- `dispatchAllowed` permanece `false`.
- `bookingExecutionAllowed` permanece `false`.
- A rota do WhatsApp ainda não envia a proposta.
- Nenhuma reserva é criada, alterada ou cancelada.
- A proposta não é persistida nas observações sanitizadas.

Uma etapa posterior deverá validar a seleção de horário no workflow antes de qualquer ativação de envio. A confirmação e a execução da reserva continuarão separadas.
