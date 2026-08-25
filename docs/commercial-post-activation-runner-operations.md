# Manual operacional do runner pós-ativação comercial

Atualizado em: 25 de agosto de 2026.

Este manual orienta implantação, acompanhamento, diagnóstico e recuperação do processamento pós-ativação comercial. Ele complementa a documentação arquitetural e deve acompanhar toda mudança operacional do runner.

## 1. Responsabilidades do fluxo

O workflow `commercial-post-activation-due-runner` deve executar, nesta ordem lógica:

1. adquirir o lease exclusivo;
2. validar a aquisição ou encerrar de forma saudável por contenção;
3. recuperar trabalhos com lock expirado;
4. projetar e sincronizar os trabalhos devidos;
5. processar um lote indexado com concorrência limitada;
6. compor o resumo da execução;
7. persistir capacidade, justiça, auditoria e demais métricas;
8. sincronizar sinais operacionais;
9. liberar o lease.

O n8n apenas orquestra. Regras de negócio, validação e persistência pertencem aos serviços e às APIs do SISAG.

## 2. Contratos operacionais

Endpoints internos relevantes:

- projeção: `project-post-activation-due-work`;
- processamento: `process-post-activation-due-work-batch`;
- composição do resumo indexado: `compose-post-activation-indexed-runner-summary`;
- persistência de métricas: endpoint de persistência usado pelo workflow;
- consultas de supervisão: auditoria de projeção e adiamentos.

Todos exigem autenticação interna. Segredos não devem ser registrados no workflow, nos logs ou neste manual.

## 3. Verificação após implantação

Após publicar uma nova versão:

1. confirmar que existe apenas uma versão publicada do Due Runner Durable;
2. executar uma vez manualmente ou aguardar o próximo ciclo;
3. verificar que o lease foi adquirido ou que houve encerramento explícito por contenção;
4. confirmar que a execução chegou à liberação do lease;
5. conferir `capacity.status`, `fairness.status` e `processing.status`;
6. conferir `projectionAudit`, quando o modo de comparação estiver ativo;
7. validar que `failed` e `settlementFailed` são zero ou possuem causa conhecida;
8. verificar no banco se o resumo e as métricas da execução foram persistidos;
9. observar pelo menos mais um ciclo automático antes de encerrar a implantação.

Não interpretar `claimed: 0` como falha: pode não existir trabalho disponível naquele instante.

## 4. Resultado saudável esperado

Sinais normais:

- `released: true`;
- estados de capacidade, justiça e processamento como `healthy`;
- `possibleBacklog: false`, enquanto houver folga;
- nenhuma falha de sincronização ou liquidação;
- a soma de `completed`, `deferred`, `escalated` e `failed` compatível com `claimed`;
- adiamentos com `available_at` futuro;
- itens concluídos fora do caminho quente;
- lease liberado ao final.

Um item `deferred` representa espera de negócio persistida, não falha técnica. Um item `escalated` exige ação operacional e não deve ser reivindicado automaticamente.

## 5. Contenção de lease

Quando outra execução possui lease ativo, o workflow deve terminar de forma controlada com resultado explícito de contenção. Isso evita concorrência duplicada.

Procedimento:

1. consultar proprietário e expiração do lease;
2. comparar `expires_at` com o horário do banco;
3. se estiver ativo, aguardar a execução proprietária ou a expiração;
4. se estiver expirado, executar novamente e confirmar a aquisição normal;
5. investigar somente se a contenção persistir além da expiração ou ocorrer em ciclos sucessivos.

Não apagar nem alterar o lease manualmente sem diagnóstico e coordenação explícita.

## 6. Auditoria da projeção e corte do legado

Durante a migração, `projectionAudit` compara a projeção indexada com o caminho anterior.

Critérios mínimos para preparar o corte:

- pelo menos oito observações históricas válidas;
- 100% de compatibilidade na janela considerada;
- zero divergências;
- zero falhas de projeção;
- pelo menos um ciclo completo do cursor;
- trabalho sincronizado e concluído observado.

Evidência registrada em 25 de agosto de 2026:

- 21 observações válidas;
- 21 compatíveis e nenhuma divergente;
- 21 ciclos completos;
- nenhuma falha de projeção;
- 21 sincronizações e 21 conclusões.

Essa evidência autoriza preparar o corte, mas não autoriza editar o workflow produtivo sem uma entrega separada, reversível e monitorada.

## 7. Diagnóstico rápido

### O fluxo para após validar o lease

- verificar se o nó de aquisição devolveu saída;
- consultar se existe lease ativo de outra execução;
- confirmar que a versão publicada contém a saída explícita de contenção;
- aguardar a expiração quando a contenção for legítima.

### Existem itens em `processing` com lock vencido

- confirmar que a etapa de recuperação foi executada;
- verificar os contadores `recovered`, `retryable` e `exhausted`;
- inspecionar tentativas e causa antes de qualquer alteração manual.

### O mesmo item é adiado em todos os ciclos

- comparar `last_deferred_at` e `available_at`;
- confirmar que `available_at` está no futuro pelo intervalo configurado;
- verificar `deferred_count`, prazo máximo e `escalation_required`;
- investigar se a condição de negócio esperada nunca é registrada.

### Há divergência de projeção

- interromper o corte do legado;
- preservar os dois caminhos de comparação;
- registrar campos divergentes e chaves de execução;
- corrigir e formar uma nova janela de evidências.

### Há backlog possível

- confirmar repetição do sinal em vários ciclos;
- medir idade do trabalho aberto mais antigo, utilização do lote e duração;
- identificar se o gargalo está no banco, API, n8n ou serviço externo;
- ampliar frequência, lote ou workers somente com evidência e teste de carga.

## 8. Reversão

Mudanças no workflow devem ser reversíveis:

1. conservar o JSON da última versão estável;
2. evitar migrações destrutivas no mesmo PR do corte;
3. publicar uma única versão do workflow;
4. se houver regressão, restaurar a versão estável, republicar e executar uma validação controlada;
5. confirmar recuperação de locks, ausência de duplicidade e persistência das métricas;
6. registrar incidente, causa, correção e evidências nos documentos operacionais.

## 9. Checklist de manutenção

Toda alteração operacional deve incluir:

- testes direcionados;
- build de produção;
- `git diff --check`;
- atualização deste manual e do roteiro durável quando aplicável;
- orientação explícita sobre reimportação e publicação do n8n;
- validação pós-implantação;
- evidência observada, diferenciada de hipótese ou estimativa.

## 10. Regra de atualização documental

Atualizar este manual no mesmo PR sempre que houver:

- inclusão, remoção ou reordenação de nó do workflow;
- criação, alteração ou retirada de endpoint operacional;
- mudança de lease, lock, lote, concorrência, adiamento ou recuperação;
- novo estado, contador, alerta ou critério de saúde;
- mudança no procedimento de implantação, diagnóstico ou reversão;
- incidente produtivo que gere novo aprendizado operacional.

Uma entrega operacional não está concluída sem documentação suficiente para outra pessoa operar, diagnosticar e reverter o sistema com segurança.
