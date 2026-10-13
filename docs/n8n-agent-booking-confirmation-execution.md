# Fundação da execução da confirmação

- Executa somente estados `confirmed_pending_execution` previamente produzidos por uma confirmação explícita.
- Exige reivindicação única antes de qualquer escrita operacional.
- Reutiliza exclusivamente o comando oficial `executeBookingCommand`.
- Usa uma chave idempotente estável derivada do identificador do estado.
- Preserva empresa, cliente, serviço, profissional, unidade e instante previamente confirmados.
- Ainda não está conectada ao webhook: a ativação depende do adaptador persistente de recuperação e resposta definitiva.
