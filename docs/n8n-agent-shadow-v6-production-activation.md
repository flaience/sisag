# Ativação controlada do workflow sombra v6

Esta etapa habilita a recuperação de uma escolha explícita de horário após disponibilidade recente e prepara a troca operacional da v5 para a v6.

## Comportamento

- O contexto recente de escolha passa a ser habilitado no deploy.
- A v6 reconsulta a disponibilidade antes de aceitar a escolha.
- Quando existe proposta de confirmação, a lista de horários não é enviada novamente.
- A proposta ainda não é enviada ao WhatsApp.
- Nenhum agendamento é criado, confirmado, alterado ou cancelado.
- A troca do workflow publicado deve ocorrer somente após o deploy desta alteração.
