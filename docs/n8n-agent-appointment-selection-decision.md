# Decisão da seleção de agendamento

O agente pode solicitar a ferramenta somente leitura scheduling.select_appointment quando a mensagem contém uma escolha explícita por ordinal ou por data e hora.

- Os argumentos da ferramenta são obrigatoriamente vazios.
- A identidade e a lista de agendamentos continuam sendo resolvidas pelo gateway confiável.
- Pedidos de cancelamento, remarcação ou novo agendamento mantêm prioridade e não são capturados como seleção isolada.
- Saídas inválidas do provedor são reparadas deterministicamente.
- Esta etapa não envia mensagens e não cria, cancela ou remarca agendamentos.
