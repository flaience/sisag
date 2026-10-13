# Ativação da execução confirmada

- A reserva é executada somente após SIM explícito associado a uma proposta pendente válida.
- Uma chave independente permite desligar imediatamente apenas a execução.
- Interrupções retomam o mesmo estado e a mesma chave idempotente.
- NÃO apenas rejeita a proposta e nunca chama o comando de reserva.
- O resultado definitivo é registrado e enviado pela outbox persistente.
