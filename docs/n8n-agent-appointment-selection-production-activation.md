# Ativação da seleção de agendamento

O deploy passa a habilitar N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED=true junto ao gate global das respostas candidatas.

Uma resposta somente pode seguir para o outbox quando decisão, ferramenta, motivo, observação e candidato representam a mesma seleção confiável. A chave de deduplicação continua baseada na correlação da mensagem recebida.

A ativação envia apenas a resposta textual da seleção. Ela não cria, cancela nem remarca agendamentos.
