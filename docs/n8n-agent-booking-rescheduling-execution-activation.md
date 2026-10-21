# Ativação controlada da remarcação confirmada

Produção habilita em conjunto o envio da proposta, o consumo de SIM ou NÃO e a execução recuperável. Somente SIM em um estado válido inicia a remarcação oficial.

Repetições retomam o mesmo estado idempotente; NÃO apenas rejeita e mensagens não relacionadas seguem para os demais fluxos.
