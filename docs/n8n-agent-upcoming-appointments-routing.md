# Roteamento dos próximos agendamentos

A resposta candidata da consulta `scheduling.list_upcoming_appointments` pode ser encaminhada ao WhatsApp somente quando as duas chaves de roteamento estiverem habilitadas.

A elegibilidade exige decisão e observação coerentes, resultado somente leitura bem-sucedido, no máximo cinco agendamentos e texto sanitizado de até 500 caracteres. O envio usa a correlação como chave de idempotência.

A chave `N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED` está habilitada no deploy de produção. O caminho continua condicionado também à chave geral, à decisão coerente, ao sucesso da ferramenta somente leitura e ao limite de cinco itens.
