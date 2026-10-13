# Proposta de confirmação de agendamento do agente n8n

Esta fundação reutiliza o rascunho oficial de agendamento do SISAG. Uma proposta só pode ser criada quando o serviço e o horário selecionado correspondem exatamente a um único slot retornado pela disponibilidade confiável.

A proposta contém uma chave idempotente derivada da correlação e do horário, apresenta data e hora ao cliente e exige resposta explícita SIM ou NÃO. Horários inventados, duplicados, inválidos ou pertencentes a outro serviço são rejeitados.

Neste marco, dispatchAllowed e bookingExecutionAllowed permanecem false. O módulo não está conectado ao webhook, não envia mensagens e não executa o comando de criação de reserva.
