# Consulta segura do status de agendamento

Esta etapa prepara a ferramenta somente leitura scheduling.explain_appointment_status para perguntas naturais como “qual o status do meu agendamento?”. O cliente não precisa conhecer um UUID.

O gateway resolve o próximo agendamento ativo usando exclusivamente empresa e telefone provenientes do contexto confiável do webhook. Se um identificador estiver presente, ele também precisa pertencer ao mesmo cliente e à mesma empresa. A consulta não envia mensagens, não altera estado e não executa comandos de agendamento.

Esta entrega é a fundação read-only. A geração e o roteamento da resposta ao WhatsApp serão liberados em etapa posterior.
