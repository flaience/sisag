# Workflow sombra v12: seleção de agendamento

O workflow SISAG Agent Shadow v12 deriva da v11 e preserva o mesmo webhook.

- Executa scheduling.select_appointment exclusivamente pelo gateway somente leitura.
- Produz resposta candidata sanitizada para seleção única, ausente, ambígua ou falha.
- Não expõe o identificador do agendamento na resposta.
- Mantém sideEffects como none.
- Não envia automaticamente a resposta de seleção nesta etapa.
- Não cria, cancela ou remarca agendamentos.

Durante a validação, a v11 deve permanecer disponível para reversão. Depois de importar a v12, somente um workflow deve ficar publicado no webhook compartilhado.
