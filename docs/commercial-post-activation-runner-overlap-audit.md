# Auditoria de sobreposição do runner pós-ativação

## Objetivo

Registrar a fronteira atual entre o pipeline legado e o processamento indexado antes de qualquer retirada de comportamento produtivo.

Esta auditoria não autoriza a remoção imediata de `Run Due Milestones`. O nó ainda concentra responsabilidades que não foram totalmente substituídas.

## Componentes avaliados

### Process Due Work Batch

O processador indexado é responsável por:

- selecionar somente itens disponíveis na fila durável;
- reivindicar itens com bloqueio e identidade do worker;
- executar unidades com concorrência limitada;
- concluir, adiar, escalar ou registrar falha;
- persistir a próxima disponibilidade sem bloquear o n8n;
- produzir contadores próprios de processamento e liquidação.

Ele é a direção arquitetural para a execução dos trabalhos pós-ativação.

### Run Due Milestones

O runner anterior ainda é responsável por:

- percorrer onboardings concluídos com cursor persistente e justiça entre empresas;
- projetar e sincronizar marcos na fila indexada;
- preservar o histórico usado pelas métricas de capacidade e fairness;
- identificar o próximo marco vencido;
- coletar observações e sinais operacionais;
- executar diretamente o marco encontrado.

## Sobreposição identificada

Existe sobreposição apenas na última responsabilidade do runner anterior: a execução direta do marco.

As responsabilidades de projeção, sincronização, cursor e fairness ainda não possuem substituição independente no workflow. Portanto, remover o endpoint ou o nó completo agora interromperia a alimentação da fila e degradaria a observabilidade.

O risco de manter indefinidamente os dois caminhos é uma mesma decisão de negócio ser avaliada pelo item indexado e novamente pelo runner anterior. Mesmo quando a persistência evita duplicação terminal, a repetição pode gerar consultas, eventos, adiamentos ou integrações externas desnecessárias.

## Decisão arquitetural

O estado desejado é:

1. o runner de projeção percorre onboardings e sincroniza a fila;
2. a fila indexada é a única fonte de trabalhos executáveis;
3. o processador em lote reivindica e executa os itens;
4. a liquidação durável registra o resultado;
5. métricas de capacidade, fairness e operação são calculadas sem depender de execução direta legada.

O corte deve separar a projeção da execução. Não deve apenas apagar `Run Due Milestones`.

## Plano de retirada segura

### Fase 1 — Contrato de projeção

- extrair ou expor uma operação que apenas percorra, projete e sincronize;
- manter cursor, `wrapped`, contadores de sincronização e falhas;
- garantir idempotência ao projetar novamente o mesmo onboarding;
- impedir que essa operação execute marcos diretamente.

### Fase 2 — Comparação controlada

- executar a projeção sem efeito direto em paralelo ao comportamento vigente;
- comparar quantidade projetada, preservada, concluída e com falha;
- confirmar que todos os itens devidos aparecem na fila indexada;
- observar pelo menos um ciclo completo de cursor com dados representativos;
- interromper a migração se houver divergência ou falha de sincronização.

### Fase 3 — Corte da execução legada

- conectar o workflow à operação exclusiva de projeção;
- manter `Process Due Work Batch` como único executor;
- retirar os contadores de execução direta do resumo do runner;
- preservar compatibilidade temporária do endpoint legado, sem chamá-lo pelo workflow;
- validar recuperação, adiamento, escalonamento e encerramento.

### Fase 4 — Limpeza

- remover código legado somente após período estável;
- simplificar o workflow e seus testes;
- atualizar documentação, painéis e alertas;
- registrar a data e a evidência do encerramento.

## Critérios para autorizar o corte

Todos os critérios abaixo são obrigatórios:

- nenhuma falha de projeção ou sincronização na janela controlada;
- fila indexada contém todos os marcos devidos esperados;
- nenhum trabalho é executado por mais de uma fonte;
- adiamentos preservam `available_at` e seus contadores;
- escalonamentos continuam visíveis no centro de controle;
- locks expirados são recuperados;
- cursor avança e conclui ciclos sem fome entre empresas;
- métricas de capacidade e fairness permanecem consistentes;
- testes e build de produção aprovados.

## Resultado desta auditoria

| Responsabilidade | Legado | Indexado | Situação |
| --- | --- | --- | --- |
| Percorrer onboardings | Sim | Não | Manter até extrair projeção |
| Cursor e fairness | Sim | Não | Manter |
| Projetar e sincronizar fila | Sim | Não | Separar da execução |
| Reivindicar com lock | Não | Sim | Consolidado |
| Executar unidade | Sim | Sim | Sobreposição a eliminar |
| Adiar sem bloquear | Parcial | Sim | Consolidado no indexado |
| Escalonar por política | Parcial | Sim | Consolidado no indexado |
| Liquidar resultado durável | Não | Sim | Consolidado |
| Recuperar lock expirado | Não | Sim | Consolidado |

Conclusão: a base indexada já é adequada para ser o executor único, mas o próximo PR deve primeiro criar o contrato exclusivo de projeção. A retirada do caminho legado será uma consequência posterior, orientada por evidências.
