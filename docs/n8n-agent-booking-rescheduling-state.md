# Estado da confirmação de remarcação

A proposta e a mensagem de confirmação são persistidas atomicamente, com identidade do remetente em hash, escopo por empresa e conta WhatsApp, expiração de 10 minutos, índices e RLS.

SIM registra apenas rescheduling_pending e NÃO registra rejected. Esta etapa não altera o agendamento.
