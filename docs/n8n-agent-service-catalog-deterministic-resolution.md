# Resolução determinística do serviço no agente sombra

Quando a mensagem menciona exatamente um nome do catálogo ativo da empresa, o SISAG associa o identificador e a duração confiáveis depois da decisão estruturada do modelo e antes da consulta read-only.

- A comparação ignora maiúsculas, minúsculas e acentos.
- Apenas nomes completos delimitados por palavras são aceitos.
- Zero ou múltiplas correspondências preservam o pedido de esclarecimento.
- Um identificador já selecionado pelo provedor não é substituído.
- O fluxo permanece read-only e não cria nem altera serviços ou agendamentos.

Assim, uma mensagem como “Há horários disponíveis para consulta amanhã?” pode usar o serviço ativo “Consulta” sem depender de o modelo copiar seu UUID.
