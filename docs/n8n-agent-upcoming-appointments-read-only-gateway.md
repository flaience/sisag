# Gateway somente leitura dos próximos agendamentos

O gateway interno aceita a ferramenta `scheduling.list_upcoming_appointments` com limite opcional máximo de cinco. Empresa e telefone são obtidos exclusivamente do contexto confiável validado; argumentos não podem substituir a identidade.

A ferramenta integra apenas o read model criado na etapa anterior. Não envia mensagem, não publica no outbox e não cria, confirma, cancela ou remarca agendamentos.
