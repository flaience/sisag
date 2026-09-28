# Administração de agendamentos pelo WhatsApp

O fluxo oficial já identifica agendamentos futuros por empresa e cliente e permite cancelamento e reagendamento. Esta etapa acrescenta uma barreira de segurança ao reagendamento.

## Regras preservadas

- somente agendamentos pendentes ou confirmados são apresentados;
- a consulta e a alteração são limitadas à empresa e ao cliente da conversa;
- o cancelamento exige confirmação explícita;
- mensagens repetidas continuam protegidas pela identidade da mensagem e pela serialização da conversa.

## Confirmação do reagendamento

Ao receber a nova data e o novo horário, o assistente apenas guarda a proposta e mostra o horário interpretado. O agendamento oficial só é alterado depois de uma resposta **SIM**. Uma resposta **NÃO** encerra a proposta sem modificar o banco.

Esse passo também protege o uso por áudio: uma transcrição incorreta pode ser recusada antes de alterar a agenda.
