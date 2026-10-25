# Workflow sombra v11 — próximos agendamentos

A v11 acrescenta a consulta somente leitura `scheduling.list_upcoming_appointments` ao workflow sombra.

O resultado contém no máximo cinco agendamentos futuros pendentes ou confirmados, formatados no fuso confiável da empresa. Nomes de serviço são normalizados, o texto é limitado e dados de identidade, observações internas e identificadores não são exibidos.

Esta etapa permanece observacional: a resposta candidata é devolvida apenas pelo webhook de teste. A v11 não envia mensagens ao WhatsApp e não cria, cancela ou remarca agendamentos.
