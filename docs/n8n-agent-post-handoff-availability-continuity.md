# Continuidade de disponibilidade após atendimento humano

## Correção

Depois que um atendimento humano é concluído, uma nova pergunta genérica sobre horários pode reutilizar a última consulta de disponibilidade bem-sucedida da mesma conversa. Isso preserva o serviço e o período informados recentemente sem copiar esses dados para a tabela de handoff.

## Limites

- A consulta anterior precisa ter ocorrido nos últimos 15 minutos.
- Empresa, conta WhatsApp e telefone normalizado precisam coincidir.
- A observação anterior precisa registrar execução read-only bem-sucedida.
- A continuidade depende da flag já ativa de contexto de escolha.
- Pedidos de atendimento humano não são classificados como disponibilidade.

Se o modelo ainda produzir saída estrutural inválida para uma pergunta de disponibilidade, o sistema pergunta qual serviço ou profissional deve ser consultado. Ele não afirma que a agenda está vazia sem executar a ferramenta.
