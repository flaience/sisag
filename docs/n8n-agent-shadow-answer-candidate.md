# Resposta candidata do agente sombra

O SISAG Agent Shadow v5 transforma o resultado efêmero da consulta de disponibilidade em uma resposta candidata curta e determinística. Quando existem horários, lista no máximo os três primeiros no fuso confiável da empresa; quando não existem, informa explicitamente a ausência; quando faltam serviço ou profissional, pede somente esse contexto sem repetir a pergunta sobre a data; em falha, não inventa disponibilidade.

A decisão e o resultado da ferramenta permanecem separados durante o fluxo. A resposta candidata não é enviada ao WhatsApp, não substitui o assistente atual e não é persistida na tabela de observações. O registro mantém somente metadados sanitizados da decisão e da execução read-only. O workflow permanece inativo até validação controlada.
