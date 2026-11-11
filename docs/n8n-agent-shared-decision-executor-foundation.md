# Executor compartilhado de decisão do agente n8n

Este incremento extrai o núcleo comum que:

1. resolve o contexto mínimo da conversa;
2. executa a decisão sombra no n8n;
3. registra duração, resultado e continuidade;
4. preserva a origem da mensagem: texto, áudio ou homologação.

Ainda não há alteração no webhook de produção. Roteamento, envio, propostas e mutações permanecem fora deste executor até que o comportamento isolado esteja aprovado.

Essa separação permite testar as regras uma única vez e reservar aos canais apenas captura e apresentação.
