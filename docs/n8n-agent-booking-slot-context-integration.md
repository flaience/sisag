# Contexto recente para escolha de horário

Esta etapa permite reconhecer uma escolha explícita de horário após uma consulta recente de disponibilidade concluída com sucesso.

## Segurança operacional

- O recurso é controlado por `N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED` e permanece desativado por padrão.
- O contexto aceita somente consulta read-only bem-sucedida dos últimos quinze minutos, na mesma empresa, conta e destinatário normalizado.
- Os horários não são gravados na tabela de observações sanitizadas.
- A disponibilidade será consultada novamente antes de validar a escolha.
- Esta etapa não envia proposta e não executa reserva.
