# Estado temporário da confirmação de agendamento

A proposta enviada e o estado mínimo são gravados atomicamente. O estado expira em dez minutos e identifica o remetente apenas por hash derivado e escopo da empresa/conta.

- Não armazena texto da conversa nem texto da proposta.
- Uma proposta nova invalida outra confirmação pendente da mesma identidade.
- `SIM` muda o estado para `confirmed_pending_execution`.
- `NÃO` muda o estado para `rejected`.
- Nenhuma das decisões executa ou cria reserva nesta etapa.
