# Catálogo confiável de serviços para a decisão sombra

A decisão do agente recebe uma projeção mínima dos serviços ativos da empresa autenticada: identificador, nome e duração. Assim, uma mensagem como “Há horários disponíveis para consulta amanhã?” pode usar o identificador real do serviço “Consulta”, sem diferenciar maiúsculas, minúsculas ou acentos e sem permitir que o modelo invente UUIDs.

O catálogo é carregado no servidor a partir do companyId confiável do pedido. Serviços inativos e dados de outras empresas não são fornecidos. Esta etapa permanece somente leitura, não cria nem altera serviços ou agendamentos e não muda as regras do gateway.

A continuidade de uma resposta curta enviada em mensagem posterior será tratada separadamente, depois da validação desta resolução na frase completa.
