# WhatsApp com áudio — prontidão de produção

## Gate automatizado

- recebimento persistido antes da confirmação do webhook;
- áudio nunca tratado como texto antes da transcrição;
- download Meta autenticado e versão Graph explícita por conta;
- chave OpenAI e token Meta somente via Docker Secrets;
- limites de tamanho, duração, timeout, tentativas e lease;
- transcrição persistida antes do despacho ao assistente;
- despacho tenant-scoped com identidade original e resposta idempotente;
- um áudio por ciclo do runner, com timeout isolado de 55 segundos;
- saída por outbox, sem envio direto no caminho crítico.

## Validação operacional após deploy

1. Confirmar frontend e runner convergidos.
2. Confirmar os dois secrets montados no frontend sem exibir conteúdo.
3. Enviar um áudio simples e não destrutivo, como “ajuda”.
4. Confirmar uma linha completed com dispatched_at preenchido.
5. Confirmar uma única resposta na outbox para o provider_message_id.
6. Reexecutar o worker e comprovar ausência de duplicação.
7. Só depois testar consulta e proposta de agendamento; confirmação continua explícita.
