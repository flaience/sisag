# Ativação da execução de cancelamento confirmado

A execução é liberada somente quando as flags de decisão e execução estão ativas e uma resposta **SIM** foi registrada contra uma proposta válida. **NÃO** nunca chama a execução.

Repetições retomam o mesmo estado `cancellation_pending` ou `execution_in_progress`, preservando a identidade estável, o adaptador oficial e a resposta idempotente ao cliente.
