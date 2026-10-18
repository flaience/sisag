# Estado da confirmação de cancelamento

A pergunta de cancelamento passa a ser persistida atomicamente com a mensagem de saída. O estado é isolado por empresa, conta WhatsApp e identidade sanitizada do remetente, expira em dez minutos e substitui propostas anteriores ainda abertas.

As respostas **SIM** e **NÃO** podem ser registradas de modo atômico. **SIM** produz apenas o estado `cancellation_pending`; esta etapa não executa o cancelamento do agendamento.
