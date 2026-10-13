# Workflow sombra v6: proposta de confirmação

A v6 deriva da v5 e mantém o mesmo webhook, as mesmas credenciais e as mesmas consultas read-only.

Quando a mensagem contém uma escolha inequívoca entre os horários retornados, o workflow gera uma proposta efêmera com `SIM` ou `NÃO`.

## Limites

- O workflow é importado inativo.
- O horário precisa existir na resposta read-only atual.
- O serviço vem dos argumentos confiáveis da decisão.
- `dispatchAllowed` e `bookingExecutionAllowed` permanecem `false`.
- A proposta não é enviada, persistida ou executada.
- A v5 de produção não deve ser substituída antes da validação manual da v6.
