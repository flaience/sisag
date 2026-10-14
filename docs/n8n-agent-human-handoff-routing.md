# Roteamento controlado do encaminhamento humano

Esta etapa conecta decisões estruturadas `handoff` da v7 ao estado persistido e a uma única resposta neutra pelo outbox. A conversa fica suspensa antes das rotas de confirmação, do espelhamento e dos assistentes legados enquanto o estado for `pending` ou `claimed`.

## Controles

- flag `N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED`, desativada por padrão;
- somente decisão `handoff` sem ferramenta é elegível;
- estado e resposta são persistidos na mesma transação;
- correlação e dedupe tornam reprocessamentos inofensivos;
- falha de consulta da suspensão não bloqueia silenciosamente toda a entrada;
- nenhum texto da conversa ou telefone é gravado na tabela de estado;
- não existe atribuição, painel, resolução ou retomada automática nesta etapa.

## Próximo passo

Validar localmente, consolidar sem ativar a flag e então construir a API autenticada para listar, assumir e resolver pendências. A ativação em produção só deve ocorrer depois que o operador tiver como concluir o atendimento e liberar a conversa.