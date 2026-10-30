# Janela da remarcação a partir do horário solicitado

Quando o cliente informa uma data e hora explícitas, a consulta de disponibilidade começa naquele instante local, em vez de começar à meia-noite.

Isso evita que o limite de vinte slots seja consumido apenas pelos horários da manhã antes de alcançar, por exemplo, `15:00`. Se o horário solicitado não estiver disponível, as alternativas somente leitura podem ser encaminhadas ao cliente sem devolver a conversa ao fluxo legado.

Nenhuma mutação ocorre nesta etapa; a remarcação ainda depende de proposta e confirmação explícita.
