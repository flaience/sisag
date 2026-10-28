# Gateway somente leitura da ação sobre agendamento selecionado

O gateway interno aceita scheduling.resolve_selected_appointment_action com argumentos obrigatoriamente vazios.

- Empresa, WhatsApp, mensagem, fuso e instante de referência vêm do contexto confiável.
- appointmentId e action não podem ser fornecidos pelo chamador.
- A ferramenta relê no máximo cinco agendamentos futuros e resolve uma única ação e um único alvo.
- Resultado ausente ou ambíguo não contém alvo.
- Ainda não há proposta, roteamento, envio, cancelamento ou remarcação.
