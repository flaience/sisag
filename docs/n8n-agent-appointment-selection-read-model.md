# Read model da seleção de agendamento

Esta etapa conecta a seleção determinística à consulta confiável dos próximos agendamentos.

- Relê no máximo cinco agendamentos futuros do tenant e do WhatsApp confiáveis.
- Resolve primeiro, segundo, último ou data e hora no fuso da empresa.
- Retorna somente um agendamento quando a escolha é única.
- Falha fechada quando falta escolha, a escolha é ambígua ou não corresponde à lista.
- Nunca aceita um identificador de agendamento vindo do texto do cliente.
- Ainda não persiste, envia, cancela, remarca ou altera o webhook de produção.

A exposição no gateway e a integração com os fluxos de cancelamento e remarcação ficam para etapas posteriores.
