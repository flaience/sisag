# Intenção de comparecimento

A intenção registra que um cliente pretende comparecer em uma data concreta e em um período configurado para ordem de chegada. Ela não é um agendamento com hora marcada.

- O período é bloqueado durante a verificação de capacidade.
- O `requestId` torna a operação idempotente por empresa.
- Uma intenção ativa por cliente, período e data evita duplicidade.
- O cancelamento preserva o histórico.
- Nenhum check-in ou posição de fila é criado nesta etapa.
