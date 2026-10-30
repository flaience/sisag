# Horário do turno atual e recusa da remarcação

O workflow v14 separa o trecho atual do contexto antes de escolher um horário. Em uma conversa que contém o agendamento atual às 09:00, uma posição anterior e a nova escolha `09/11 15:00`, somente `15:00` participa da seleção do novo slot.

A intenção de remarcação continua sendo lida do contexto completo. Uma resposta negativa registra `rejected` e publica, na mesma transação e com chave idempotente, a confirmação de que o horário atual foi mantido.

Nenhuma remarcação é executada após `NÃO`. O workflow v14 deve ser importado e publicado novamente depois da implantação.
