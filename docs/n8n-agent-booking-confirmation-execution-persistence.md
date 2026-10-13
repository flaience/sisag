# Persistência da execução confirmada

- Reivindica atomicamente apenas estados `confirmed_pending_execution`.
- Resolve o cliente dentro da empresa pelo telefone normalizado recebido no webhook.
- Registra sucesso, horário ocupado ou resultado incerto sem permitir uma segunda reserva.
- Persiste o resultado e a resposta definitiva na outbox na mesma transação.
- A chave da resposta é idempotente por estado de confirmação.
- Esta etapa ainda não ativa a execução no webhook.
