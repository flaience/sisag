# Ativação controlada do roteamento da resposta candidata

O deploy ativa explicitamente `N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED=true`. A ativação aceita somente resultados coerentes da consulta read-only de disponibilidade: horários encontrados (`ready`), nenhum horário encontrado (`empty`) ou pedido de serviço/profissional quando o recurso não foi identificado (`clarify`).

Somente resultados read-only estreitamente validados podem seguir pela outbox idempotente do WhatsApp. A chave derivada do correlationId impede duplicação. Falha genérica, combinação inconsistente, falha de transporte, falha de publicação ou ausência de metadados mantém o assistente atual como fallback.

Esta ativação não autoriza criação, alteração ou cancelamento de agendamentos. O fluxo n8n permanece em modo sombra para decisões e consultas, e o único efeito liberado é o envio da resposta candidata validada.
