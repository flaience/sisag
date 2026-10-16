# Workflow sombra v9 com proposta de cancelamento

A v9 deriva da v8 e preserva disponibilidade, proposta de criação e consulta de status. Pedidos explícitos de cancelamento são aterrados deterministicamente na consulta read-only do próximo agendamento pela identidade confiável.

Quando a consulta retorna um agendamento futuro PENDING ou CONFIRMED, a v9 gera uma proposta sanitizada que exige SIM ou NÃO. A proposta permanece sem envio e sem execução: dispatchAllowed e cancellationExecutionAllowed são falsos. Nenhum endpoint ou comando de cancelamento integra este workflow.
