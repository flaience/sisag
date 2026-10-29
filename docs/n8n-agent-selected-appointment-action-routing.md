# Roteamento da ação sobre agendamento selecionado

O roteamento é opt-in por `N8N_AGENT_SELECTED_APPOINTMENT_ACTION_ROUTING_ENABLED=true`.

- cancelamento reutiliza a persistência e a confirmação existentes;
- remarcação envia apenas a solicitação da nova data e horário;
- nenhuma execução de cancelamento ou remarcação é adicionada.
