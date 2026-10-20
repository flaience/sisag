# Read model confiável para remarcação

O read model combina um único agendamento futuro ativo, resolvido pela empresa e identidade normalizada do remetente, com novos horários do mesmo serviço.

A janela de pesquisa é limitada a 31 dias e a resposta contém no máximo 20 horários futuros válidos. O horário atual, horários vencidos e horários de outro serviço são descartados.

Esta etapa não está exposta no gateway de produção e não executa qualquer escrita ou remarcação.
