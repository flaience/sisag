# Roteamento dos próximos agendamentos

A resposta candidata da consulta `scheduling.list_upcoming_appointments` pode ser encaminhada ao WhatsApp somente quando as duas chaves de roteamento estiverem habilitadas.

A elegibilidade exige decisão e observação coerentes, resultado somente leitura bem-sucedido, no máximo cinco agendamentos e texto sanitizado de até 500 caracteres. O envio usa a correlação como chave de idempotência.

Nesta etapa a chave `N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED` permanece ausente do deploy de produção; portanto, o novo caminho fica desligado até a ativação específica posterior.
