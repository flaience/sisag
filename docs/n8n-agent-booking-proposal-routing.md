# Roteamento controlado da proposta de agendamento

A v7 autoriza somente o envio da pergunta de confirmação explícita produzida a partir de um horário revalidado.

- `dispatchAllowed` precisa ser `true`.
- `bookingExecutionAllowed` precisa permanecer `false`.
- Decisão, ferramenta, resultado e horário precisam ser coerentes.
- O envio usa outbox idempotente e a origem `n8n_agent_booking_proposal_v1`.
- Responder `SIM` ainda não cria reserva nesta etapa.
- A v7 deve ser importada inativa e somente substituir a v6 após merge e deploy.
