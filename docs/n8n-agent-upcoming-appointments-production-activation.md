# Ativação dos próximos agendamentos

O deploy passa a habilitar `N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED=true`.

A ativação não amplia ferramentas nem permissões. A resposta somente é enviada quando a decisão solicita `scheduling.list_upcoming_appointments`, a execução somente leitura é bem-sucedida e a resposta contém no máximo cinco itens em até 500 caracteres. A correlação mantém o envio idempotente.
