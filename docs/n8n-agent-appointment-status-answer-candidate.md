# Resposta candidata do status de agendamento

O workflow sombra v8 transforma o resultado read-only da jornada em uma resposta candidata curta. Somente situação, data, horário e nome do serviço podem aparecer. Identificadores, dados do cliente, observações, eventos e mensagens ficam fora da resposta.

A resposta continua efêmera nesta etapa: não é enviada ao WhatsApp e nenhuma alteração de agendamento é permitida. O workflow preserva appointmentId nulo para que o gateway resolva o próximo compromisso pela identidade confiável.
