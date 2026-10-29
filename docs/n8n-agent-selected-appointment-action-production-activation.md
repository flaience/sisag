# Ativação da ação sobre agendamento selecionado

A v14 ativa somente o envio controlado:

- cancelamento selecionado envia a confirmação SIM/NÃO;
- remarcação selecionada solicita a nova data e horário;
- execução continua bloqueada até confirmação explícita.

Flag: `N8N_AGENT_SELECTED_APPOINTMENT_ACTION_ROUTING_ENABLED=true`.
