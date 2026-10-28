# Read model da ação sobre agendamento selecionado

O read model relê até cinco agendamentos futuros usando exclusivamente empresa e WhatsApp confiáveis, depois combina essa lista com a ação determinística.

- Retorna um único alvo com ação cancel ou reschedule quando a escolha é inequívoca.
- Não aceita appointmentId, empresa ou telefone vindos da mensagem.
- Retorna not_resolved sem alvo quando falta ação, escolha ou correspondência única.
- Ainda não é exposto no gateway ou webhook.
- Não persiste, cria proposta, envia mensagem, cancela ou remarca.
