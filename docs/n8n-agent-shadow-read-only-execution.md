# Execução read-only do agente sombra

O SISAG Agent Shadow v4 transforma referências temporais em argumentos estruturados e somente executa uma ferramenta quando a decisão validada solicita request_read_only_tool. A execução passa exclusivamente pelo gateway interno allowlisted e não responde ao WhatsApp, não cria agendamentos e não altera dados. Antes da chamada, argumentos opcionais nulos são removidos para respeitar estritamente o contrato do gateway.

O retorno operacional da ferramenta permanece efêmero dentro do workflow. O SISAG recebe apenas requested, status, errorCode e policyVersion; horários, evidências e dados de agenda não são persistidos nesta observação.

O workflow versionado permanece inativo, com Do not save. A troca operacional exige teste controlado, publicação do v4 e despublicação imediata do v3.
