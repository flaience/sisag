# Roteamento da proposta de cancelamento

A proposta explícita de cancelamento pode ser enviada ao WhatsApp somente quando deriva de consulta read-only bem-sucedida, identifica agendamento futuro cancelável e mantém a execução do cancelamento bloqueada.

O envio é opt-in, usa outbox idempotente e pergunta por confirmação explícita **SIM/NÃO**. Esta etapa não altera nem cancela agendamentos.
