# API administrativa do diagnóstico específico

A rota somente leitura `GET /api/v1/scheduling/readiness/specific-time` recebe local, serviço, profissional, data e horário. A empresa é derivada exclusivamente da sessão de proprietário ou administrador.

O contrato rejeita campos extras e entradas inválidas antes do read model, desabilita cache e retorna apenas o diagnóstico sanitizado. Não há métodos de escrita.
