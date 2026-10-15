# Interface da fila de encaminhamento humano

A página `/admin/settings/agent-handoffs` torna a API administrativa acessível à equipe sem ativar o roteamento em produção. Ela lista apenas pendências ativas, permite atualizar a fila e exige confirmação para assumir, concluir ou dispensar.

## Privacidade e concorrência

- telefone, mensagem, transcrição, hash do remetente e UUIDs de outros operadores não chegam ao navegador;
- a API retorna somente indicadores de pertencimento ao usuário atual;
- somente quem assumiu vê as ações de conclusão da pendência;
- conflitos retornados pela API não são sobrescritos pela interface;
- concluir ou dispensar libera a conversa para futuras mensagens; não dispara uma mensagem automaticamente.

## Limite

A tela não mostra o conteúdo da conversa nesta etapa. O operador deve usar os canais operacionais existentes para atender o cliente. A flag `N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED` continua ausente do deploy até a interface ser validada e o procedimento operacional aprovado.