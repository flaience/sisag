# Prontidão operacional da graduação do retrieval

## Veredito

O ciclo está pronto para operação governada: a graduação somente nasce de um plano integral saudável, exige proposta, revisão e aplicação humanas separadas, e chega ao runtime estável por uma transação revalidada.

## Contratos bloqueantes

- toda leitura ou mutação é limitada ao tenant autenticado e às rotas Owner;
- rollout deve estar em 100%, janela ativa e saúde compatível com as versões esperadas;
- proposta congela candidato, período, decisão e políticas;
- revisão e aplicação usam estado e versão esperados;
- plano e proposta são alterados na mesma transação;
- apenas um plano `scheduled` ou `graduated` pode existir por tenant e escopo;
- release graduado é estável e independe da janela do canário;
- nenhuma etapa envia mensagens ou chama integrações externas;
- nenhuma graduação ocorre automaticamente.

## Recuperação

Falhas de saúde, política, versão, plano ou concorrência encerram a operação sem efeito parcial. O release anterior permanece efetivo até uma aplicação humana bem-sucedida.

## Evidência executável

O teste `RecoveryRetrievalReleaseGraduation.readiness.test.ts` verifica os contratos entre gate, proposta, revisão, aplicação, banco, rota, interface e runtime. Ele deve acompanhar qualquer alteração futura desse ciclo.
