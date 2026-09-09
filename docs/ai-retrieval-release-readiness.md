# Prontidão operacional do release de retrieval

Atualizado em: 9 de setembro de 2026.

## Resultado

O ciclo de release do retrieval está estruturalmente pronto para operação governada em modo sombra. A cadeia cobre candidato, revisão, plano gradual, seleção determinística, observabilidade, gate de saúde, progressão e rollback. Nenhuma dessas etapas autoriza envio ao cliente ou ação operacional autônoma.

## Barreiras comprovadas

- candidato precisa de revisão humana antes de participar de um plano;
- plano precisa estar agendado, dentro da janela e pertencer ao tenant;
- seleção do canário é determinística e limitada pelo rollout;
- falha vetorial preserva o retrieval lexical;
- métricas separam seleção, sucesso, fallback, tokens, latência, sobreposição e erros;
- saúde insuficiente ou incompatibilidade de política falha de modo fechado;
- progressão e rollback exigem proposta, revisão e aplicação humanas distintas;
- aplicação revalida saúde, versões, estado e percentual;
- plano e proposta são alterados na mesma transação;
- concorrência ou mudança do plano bloqueia a operação.

## Limite atual

O sistema está pronto para canários governados, mas ainda não para autonomia operacional. A recomendação oficial e qualquer comunicação continuam separadas da governança de retrieval. Aumento de autonomia exige evidência acumulada, critérios explícitos e nova decisão arquitetural.

## Evidência executável

O teste `src/modules/agents/RecoveryRetrievalRelease.readiness.test.ts` protege a composição entre os contratos centrais. Ele complementa os testes unitários e de fronteira de cada etapa e deve acompanhar mudanças futuras no ciclo.

## Próximo marco recomendado

Criar uma visão consolidada de auditoria do release que correlacione plano, candidato, decisões, aplicações e saúde atual em uma linha do tempo tenant-scoped. Essa visão deve permanecer somente leitura antes de qualquer novo nível de autonomia.
