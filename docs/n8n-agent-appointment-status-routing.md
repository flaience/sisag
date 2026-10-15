# Roteamento controlado do status de agendamento

O roteamento reutiliza a outbox idempotente já ativa e aceita somente uma decisão read-only de status coerente com a observação e a resposta candidata sanitizada.

São elegíveis o status encontrado, com situação conhecida e data válida, e a ausência confirmada pelo código SCHEDULING_APPOINTMENT_NOT_FOUND. Falhas genéricas, situações desconhecidas, datas inválidas e combinações inconsistentes permanecem inelegíveis.

Esta etapa envia somente texto ao WhatsApp. Não cria, confirma, cancela nem reagenda compromissos.
