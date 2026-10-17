# Antecedência configurável e escolha do último horário

Cada empresa passa a configurar a antecedência mínima para novos agendamentos em Configurações → Agendamento. O padrão inicial é 60 minutos e o intervalo permitido vai de zero a 43200 minutos. A consulta do agente lê essa regra persistida e alinha o início ao próximo intervalo da grade.

A expressão “o último” seleciona o último dos três horários exibidos, mesmo quando a busca interna possui mais resultados. Escolhas ambíguas continuam rejeitadas.
