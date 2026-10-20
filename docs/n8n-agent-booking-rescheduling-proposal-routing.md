# Roteamento da proposta de remarcação

A proposta explícita de remarcação pode ser enviada ao WhatsApp somente quando a decisão e a consulta confiável concordam, o agendamento atual e o novo horário são futuros e todos os identificadores coincidem.

O envio é opt-in por meio de N8N_AGENT_BOOKING_RESCHEDULING_PROPOSAL_ROUTING_ENABLED=true, usa Outbox com chave idempotente e contém apenas a pergunta de confirmação. Esta etapa não altera nem remarca agendamentos: reschedulingExecutionAllowed permanece falso.
