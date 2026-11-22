# Gateway somente leitura para ordem de chegada

O gateway aceita a ferramenta `scheduling.list_arrival_periods` com data, período do dia e serviço opcional. A empresa é sempre obtida do contexto confiável.

- O contrato rejeita campos adicionais.
- A política permite apenas execução somente leitura.
- A rota chama exclusivamente o read model de períodos.
- Nenhuma intenção é registrada ou cancelada.
