# Roteamento controlado da resposta candidata

Esta fundação permite que uma resposta candidata validada seja publicada na mesma outbox idempotente do WhatsApp. O recurso permanece desativado por padrão por N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED.

Nesta etapa, somente a candidata clarify causada por SCHEDULING_RESOURCE_NOT_FOUND é elegível. Quando a publicação é confirmada, o fluxo antigo não é executado; quando o agente, transporte ou outbox falham, o assistente atual permanece como fallback. O correlationId original forma a chave de deduplicação, impedindo resposta duplicada em reentregas.

Nenhuma mutação de agenda é autorizada. A ativação em produção exige PR separada e validação controlada.
