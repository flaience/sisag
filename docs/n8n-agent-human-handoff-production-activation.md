# Ativação do encaminhamento humano em produção

## Mudança

O deploy passa a definir N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED=true. Decisões estruturadas de encaminhamento criam uma pendência sanitizada, enviam uma única mensagem neutra ao cliente e pausam apenas aquela conversa.

## Operação segura

- A fila é acessível somente a owner, admin e staff autenticados da empresa.
- O operador precisa assumir a pendência atomicamente antes de abrir o contato e concluir o atendimento.
- Enquanto o estado estiver pending ou claimed, os caminhos automáticos são interrompidos para aquela identidade de empresa, conta WhatsApp e remetente.
- Concluir ou dispensar encerra a suspensão; outro operador não pode concluir uma pendência que não assumiu.
- O texto da conversa não é copiado para a tabela de encaminhamentos nem retornado pela API da fila.
- O fluxo de confirmação e execução idempotente de agendamentos permanece independente.

## Reversão

Em caso de comportamento inesperado, remover ou definir como false a variável N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED no serviço restaura o comportamento anterior sem apagar o histórico da fila.
