# Fundação da ação sobre agendamento selecionado

Esta etapa combina uma ação explícita com uma seleção determinística feita sobre até cinco agendamentos confiáveis.

- Reconhece cancelamento ou remarcação, nunca ambos ao mesmo tempo.
- Exige posição, como primeiro ou segundo, ou data e horário inequívocos.
- Retorna somente um agendamento proveniente da lista confiável.
- Falha fechada para ação ausente, escolha ausente, ambiguidade ou ausência de correspondência.
- Ainda não consulta banco, persiste estado, cria proposta, envia mensagem, cancela ou remarca.
