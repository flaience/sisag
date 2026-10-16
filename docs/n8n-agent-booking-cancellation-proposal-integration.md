# Integração efêmera da proposta de cancelamento

O contrato da resposta sombra passa a aceitar uma proposta sanitizada de cancelamento vinculada a um agendamento futuro em estado PENDING ou CONFIRMED. A proposta contém somente o identificador do agendamento, estado, data, nome limitado do serviço e chave idempotente.

O espelhamento devolve essa proposta apenas em memória. O envio e a execução continuam bloqueados por literais falsos, e o webhook de produção não reconhece nem roteia a proposta nesta etapa.
