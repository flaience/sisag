# Fundação da execução de cancelamento confirmado

A fundação recebe somente um estado persistido `cancellation_pending`, exige uma reivindicação atômica e utiliza a identidade confiável da empresa e do agendamento. O identificador estável `n8n-cancellation:<stateId>` permite recuperação sem duplicar a execução.

Horários vencidos são rejeitados. A fundação depende da porta oficial de cancelamento e não altera diretamente o banco. Nesta etapa ela permanece desconectada do webhook e desativada em produção.
