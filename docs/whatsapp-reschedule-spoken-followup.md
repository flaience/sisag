# Continuação falada do reagendamento

Mensagens de continuação podem conter apenas a informação solicitada, sem repetir o verbo “reagendar”. O interpretador passa a aceitar frases como “segunda-feira, dia cinco de outubro, às onze horas” e entrega os campos de data e horário ao fluxo já aberto.

Também foram incluídos os dias do mês falados por extenso, de um a trinta e um. A conversão exige o marcador **dia**, evitando interpretar números de opções ou quantidades como datas.

O caso real de produção é mantido como teste de regressão com a transcrição exata do áudio.
