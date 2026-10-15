# Limites de decisão e transporte do agente n8n

## Correção

O limite de produção da decisão do modelo passa de 8 para 15 segundos. A alteração cobre latências observadas acima de 8 segundos que antes produziam provider_error antes da consulta read-only.

O transporte completo entre SISAG e n8n passa de 15 para 30 segundos. Assim, a janela externa comporta a decisão de até 15 segundos, a chamada read-only e a montagem da resposta sem expirar prematuramente.

## Limites preservados

- A decisão continua limitada pelo teto de 20 segundos do serviço.
- O transporte continua limitado pelo teto de 30 segundos.
- provider_error continua sendo fallback técnico e não abre encaminhamento humano.
- Nenhuma política de escrita ou execução de agendamento foi alterada.
