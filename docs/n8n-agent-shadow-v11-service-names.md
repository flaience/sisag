# Nomes dos serviços na v11

A resposta dos próximos agendamentos passa a consumir o campo confiável `serviceNames` do read model.

São aceitos no máximo três nomes por agendamento. Cada nome é normalizado e limitado a 120 caracteres. O texto neutro “Atendimento” permanece apenas como fallback quando nenhum nome confiável estiver disponível.
