# Ativação controlada do workflow sombra v8

O deploy habilita N8N_AGENT_APPOINTMENT_STATUS_ROUTING_ENABLED separadamente do roteamento de disponibilidade. A chave permite interromper respostas de status sem afetar os fluxos consolidados de consulta de horários, confirmação, execução de agendamento ou encaminhamento humano.

O status continua estritamente read-only. A resposta enviada pela outbox contém somente situação, data, horário e nome do serviço. Nenhuma criação, confirmação, alteração ou exclusão de compromisso é autorizada por esta ativação.

Após o deploy, o operador deve substituir o workflow v7 pelo v8 no n8n e validar a pergunta “Qual é o status do meu próximo agendamento?” pelo WhatsApp.
