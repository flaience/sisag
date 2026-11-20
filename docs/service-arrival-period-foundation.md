# Períodos para atendimento por ordem de chegada

Um período pertence à empresa, unidade e serviço e define dia da semana, início, fim e capacidade opcional.

- Capacidade nula significa que o período não limita intenções de comparecimento.
- Capacidade preenchida limita futuras reservas do período.
- Capacidade não representa a quantidade de pessoas já presentes.
- Nenhuma posição de fila é criada nesta etapa.
- Somente serviços ativos com modalidade `arrival_order` podem receber períodos.

O fluxo de hora marcada e as tabelas de agendamento permanecem inalterados.
