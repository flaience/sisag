# Contrato da decisão de encaminhamento humano

## Correção

O esquema estruturado e o JSON Schema enviado ao modelo passam a permitir handoff_required, exatamente o código exigido pelo roteamento de produção.

A ação handoff produzida pelo modelo só é válida com esse motivo, sem ferramenta, argumentos, resposta ou pergunta de esclarecimento. Motivos técnicos continuam reservados ao fallback interno e não abrem a fila humana.

## Intenção explícita

O prompt orienta o modelo a usar o encaminhamento somente quando a pessoa pedir para falar com atendente, humano ou pessoa. Variações de caixa, acentuação e erros simples de digitação, como humado, devem preservar essa intenção.

O workflow v7 não precisa ser substituído: ele consome o contrato da API interna do SISAG.
