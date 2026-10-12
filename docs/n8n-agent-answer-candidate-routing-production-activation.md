# Ativação controlada do roteamento da resposta candidata

O deploy ativa explicitamente `N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED=true`. A ativação continua restrita à resposta candidata de esclarecimento produzida quando a consulta read-only de disponibilidade retorna `SCHEDULING_RESOURCE_NOT_FOUND`.

Somente a pergunta curta sobre serviço ou profissional pode seguir pela outbox idempotente do WhatsApp. A chave derivada do correlationId impede duplicação. Qualquer candidata diferente, falha de transporte, falha de publicação ou ausência de metadados mantém o assistente atual como fallback.

Esta ativação não autoriza criação, alteração ou cancelamento de agendamentos. O fluxo n8n permanece em modo sombra para decisões e consultas, e o único efeito liberado é a resposta de esclarecimento estreitamente validada.
