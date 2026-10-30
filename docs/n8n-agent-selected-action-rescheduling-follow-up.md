# Continuação da remarcação após ação selecionada

O resultado somente leitura de `scheduling.resolve_selected_appointment_action` passa a ser uma fonte confiável e limitada para o turno seguinte.

Quando o cliente envia a nova data e o horário após `Remarque o primeiro`, o contexto preserva a intenção de remarcação e direciona a decisão para `scheduling.prepare_rescheduling`, sem cair novamente em `scheduling.select_appointment`.

A consulta continua limitada por empresa, conta do WhatsApp, remetente e janela de quinze minutos. Nenhuma mutação é executada nesta etapa.
