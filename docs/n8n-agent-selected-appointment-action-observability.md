# Observabilidade da ação sobre agendamento selecionado

O roteamento da ação selecionada registra somente o evento `n8n_agent_selected_appointment_action_routing`, a correlação, a etapa e um código sanitizado.

As etapas cobertas são elegibilidade e entrega. Sucessos usam o código `published`; falhas usam códigos limitados. Telefone, texto da conversa, identificadores de agendamento e serviço não integram o evento.

Cancelamentos continuam cobertos pela observabilidade específica da proposta de cancelamento. Esta entrega não muda decisões, agenda, idempotência ou permissões.
