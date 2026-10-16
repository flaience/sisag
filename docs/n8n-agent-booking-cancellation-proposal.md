# Proposta explícita de cancelamento do agente n8n

Esta etapa cria somente a fundação não executável do cancelamento. Um pedido explícito pode gerar uma proposta quando o agendamento foi resolvido pela identidade confiável, está no futuro e possui estado PENDING ou CONFIRMED.

A proposta apresenta serviço e data, exige resposta SIM ou NÃO e possui identificador determinístico. Nesta etapa ela não é enviada, persistida nem conectada ao comando de cancelamento. Os campos dispatchAllowed e cancellationExecutionAllowed permanecem falsos.
