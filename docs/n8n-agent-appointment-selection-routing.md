# Roteamento controlado da seleção de agendamento

A resposta candidata da seleção pode usar o outbox idempotente existente somente quando dois gates estiverem ativos.

- N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED
- N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED

O roteamento exige a decisão scheduling.select_appointment, o motivo appointment_selection_required, a execução somente leitura bem-sucedida e um candidato coerente. Seleção única, pedido de escolha e ambiguidade podem ser respondidos; falhas não são enviadas.

O gate dedicado permanece desativado no deploy nesta etapa. Nenhum cancelamento ou remarcação é executado.
