# Estado persistente do encaminhamento humano do agente n8n

## Objetivo

Esta entrega cria a fundação mínima para transformar uma decisão `handoff` em estado auditável e capaz de suspender o agente naquela conversa. Ela não integra o estado ao webhook, não envia mensagem, não cria tarefa para operador e não permite assumir ou resolver o atendimento.

## Garantias

- isolamento por empresa e conta do WhatsApp;
- correlação única e inserção idempotente;
- remetente representado por hash SHA-256 do contexto confiável e telefone normalizado;
- nenhum texto, telefone, transcrição, resumo ou segredo persistido;
- somente `pending` e `claimed` suspendem o agente;
- nova pendência substitui outra ainda não assumida da mesma identidade;
- RLS habilitada e índices para correlação e identidade.

## Estados reservados

- `pending`: aguarda um operador;
- `claimed`: assumido por operador, mantendo o agente suspenso;
- `resolved`: atendimento humano concluído;
- `dismissed`: pendência encerrada sem atendimento;
- `superseded`: substituída antes de ser assumida.

## Próxima integração

O próximo incremento deve ligar exclusivamente decisões `handoff` válidas à persistência, bloquear o espelhamento enquanto houver estado ativo e publicar uma resposta neutra pelo outbox. A atribuição e a resolução por operador devem vir depois, com autenticação, auditoria e autorização próprias.