# Executor compartilhado de decisão no webhook

O webhook de texto delega ao executor compartilhado somente três responsabilidades já isoladas:

- continuidade mínima da conversa;
- decisão sombra do n8n;
- observabilidade sanitizada.

Roteamento de propostas, confirmações, entrega de respostas e fallback continuam no webhook e na mesma ordem. A mudança não ativa áudio nem altera comandos de agendamento.
