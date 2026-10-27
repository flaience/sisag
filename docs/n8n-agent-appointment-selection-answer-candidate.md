# Resposta candidata da seleção de agendamento

A seleção somente leitura pode ser transformada em uma resposta curta e sanitizada.

- A resposta selecionada contém somente serviço, data, horário e estado.
- O identificador do agendamento, telefone, cliente e observações não são expostos.
- Escolha ausente ou ambígua gera uma orientação explícita sem inventar dados.
- Dados inválidos ou falha da ferramenta resultam em resposta fechada.
- A resposta ainda não está integrada ao workflow de produção e não é enviada automaticamente.
- Nenhum agendamento é criado, cancelado ou remarcado.
