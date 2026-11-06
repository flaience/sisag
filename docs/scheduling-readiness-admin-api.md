# API administrativa da prontidão da agenda

A rota somente leitura `GET /api/v1/scheduling/readiness` recebe unidade, serviço e profissional como UUIDs e deriva a empresa exclusivamente da sessão autenticada de proprietário ou administrador.

Consultas inválidas são rejeitadas antes do read model. A resposta não usa cache e contém somente o checklist sanitizado, alertas e o indicador somente leitura. A rota não oferece métodos de escrita.
