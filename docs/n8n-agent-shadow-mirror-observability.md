# Observabilidade sanitizada do espelhamento sombra

O SISAG passa a registrar a conclusão da chamada ao webhook sombra sem reter o conteúdo processado. Cada observação contém somente empresa, correlationId, estado sanitizado, duração limitada, versão da política e horário.

Não são persistidos texto da mensagem, telefone, headers, segredo, resposta do modelo, evidências RAG ou dados de agenda. Falhas da própria gravação permanecem isoladas e não alteram o atendimento no WhatsApp.

A consulta GET /api/v1/settings/agent-shadow/observations exige owner ou admin e sempre deriva a empresa da sessão autenticada. O filtro opcional correlationId permite confirmar um teste específico sem acesso entre empresas.

Estados permitidos: accepted, rejected, transport_failed e configuration_error. O registro confirma o aceite técnico do workflow; ele não concede autoridade operacional ao agente e não comprova envio de resposta ao usuário.
