# Pós-ativação comercial — implementação e operação

> Registro técnico consolidado em 20 de agosto de 2026. Complementa `commercial-onboarding-implementation.md` e não contém senhas, tokens ou valores de secrets.

## 1. Objetivo e estado atual

O pós-ativação acompanha automaticamente clientes cujo onboarding terminou em `completed` e cujo cadastro comercial está `active`. A implementação cobre planejamento, agendamento, execução periódica, coleta de evidências, escalonamento, monitoramento, alertas, ações operacionais, histórico auditável, ocorrências duráveis e SLA.

O fluxo está ativo em produção. O workflow do n8n executa a cada 15 minutos; o painel protegido exibe clientes em acompanhamento; e a sequência de alerta `Novo -> Reconhecido -> Resolvido` foi validada com persistência, auditoria, replay seguro e cálculo de SLA.

## 2. Plano de acompanhamento

Versão: `2026-08-v1`.

| Marco | Prazo | Responsável |
|---|---|---|
| `welcome` | D0 | agente |
| `adoption_d1` | D+1 | agente |
| `adoption_d3` | D+3 | agente |
| `adoption_d7` | D+7 | humano |
| `assisted_support_close_d14` | D+14 | humano |

O agendamento exige onboarding concluído, cliente ativo e `completedAt`. O plano é persistido em `commercialOnboardings.result.postActivationFollowUpPlan`, com chave determinística `<onboardingId>:post_activation:2026-08-v1`. A repetição retorna `replayed: true` sem novo evento.

Cada marco possui indicadores obrigatórios e gatilhos de escalonamento. Indicadores ausentes mantêm a decisão em `wait`; gatilhos ativos podem gerar `human_escalation`; todos os indicadores presentes permitem `completed`. Após os cinco marcos, o plano fica concluído.

## 3. Serviços principais

- `commercial-post-activation-follow-up.service.ts`: constrói e avalia o plano.
- `commercial-post-activation-scheduling.service.ts`: persiste o plano e emite o agendamento atomicamente.
- `commercial-post-activation-milestone-executor.service.ts`: decide entre aguardar, concluir, escalar ou encerrar.
- `commercial-post-activation-milestone-processing.service.ts`: persiste o resultado do marco e seus eventos.
- `commercial-post-activation-due-runner.service.ts`: processa candidatos vencidos em lote e isola falhas.
- `commercial-post-activation-observations.service.ts`: valida e acumula observações idempotentes.
- `commercial-post-activation-observation-collector.service.ts`: coleta observações do marco atual.
- `commercial-post-activation-operational-signals.service.ts`: transforma dados operacionais em indicadores e gatilhos.
- `commercial-post-activation-operational-signals.adapter.ts`: consulta as fontes operacionais.
- `commercial-post-activation-monitoring.service.ts`: projeta status, prazo, pendências e escalonamentos.
- `commercial-post-activation-monitoring-query.service.ts`: lista clientes e aplica prioridade e filtros.
- `commercial-post-activation-alerts.service.ts`: gera alertas acionáveis.
- `commercial-post-activation-alert-lifecycle.service.ts`: projeta estados novo, reconhecido e resolvido.
- `commercial-post-activation-alert-action.service.ts`: registra ações idempotentes.
- `commercial-post-activation-alert-history.service.ts`: consulta o histórico enriquecido.
- `commercial-post-activation-alert-occurrences.service.ts`: persiste, encerra e reconcilia ocorrências duráveis.
- `commercial-post-activation-alert-occurrence-sync.service.ts`: combina alertas ativos e resoluções históricas.
- `commercial-post-activation-alert-sla.service.ts`: projeta tempos, metas e violações de SLA.
- `commercial-post-activation-alert-sla-query.service.ts`: consulta ocorrências e ações para o SLA durável.
- `commercial-post-activation-alert-sla-signals.service.ts`: projeta violações ainda acionáveis.
- `commercial-post-activation-alert-sla-signal-query.service.ts`: consulta, filtra e resume os sinais.
- `commercial-post-activation-alert-sla-signal-occurrences.service.ts`: persiste o ciclo de vida dos sinais acionáveis.
- `PostActivationAlertSlaPanel.tsx`: apresenta conformidade e detalhes operacionais.
- `PostActivationAlertSlaSignalsPanel.tsx`: apresenta sinais críticos e atrasos acionáveis.

## 4. API interna

Base: `/api/platform/capabilities/commercial`.

| Método | Caminho | Função |
|---|---|---|
| POST | `/schedule-post-activation-follow-up` | criar o plano |
| POST | `/process-post-activation-milestone` | processar um marco com observações explícitas |
| POST | `/run-post-activation-due-milestones` | executar marcos vencidos em lote |
| POST | `/record-post-activation-observation` | registrar observação operacional |
| GET | `/get-post-activation-monitoring` | consultar monitoramento |
| GET | `/get-post-activation-alerts` | consultar alertas ativos |
| GET | `/get-post-activation-alert-history` | consultar histórico de ações |
| POST | `/record-post-activation-alert-action` | reconhecer ou resolver alerta |
| POST | `/persist-post-activation-runner-metrics` | persistir uma execução idempotente do runner |
| GET | `/get-post-activation-runner-metrics` | consultar a execução e as métricas duráveis mais recentes |
| POST | `/synchronize-post-activation-alert-occurrences` | sincronizar ocorrências ativas e resoluções históricas |
| GET | `/get-post-activation-alert-sla` | consultar a projeção durável de SLA |
| GET | `/get-post-activation-alert-sla-signals` | consultar violações de SLA ainda acionáveis |
| POST | `/synchronize-post-activation-alert-sla-signal-occurrences` | sincronizar ocorrências duráveis dos sinais acionáveis |

Todas usam `validateInternalRequest`. O segredo deve vir da credencial interna/Docker Secret e nunca de código ou documentação. Erros inesperados são registrados no servidor; a API devolve mensagens controladas sem detalhes privados.

Filtros do histórico:

- `action=acknowledged|resolved`;
- `actorType=human|agent|system`;
- `limit=1..100`.

Filtros e paginação do SLA:

- `severity=critical|high`;
- `lifecycle=new|acknowledged|resolved`;
- `breach=acknowledgement|resolution|any`;
- `limit=1..1000`;
- `offset=0..100000`.

Filtros dos sinais acionáveis:

- `severity=critical|high`;
- `type=acknowledgement_breached|resolution_breached`;
- `limit=1..100`.

## 5. Eventos e outbox

| Evento | Finalidade |
|---|---|
| `commercial.post_activation.follow_up_scheduled` | plano persistido |
| `commercial.post_activation.milestone_completed` | marco concluído |
| `commercial.post_activation.human_escalation_requested` | intervenção humana solicitada |
| `commercial.post_activation.alert_acknowledged` | reconhecimento auditado |
| `commercial.post_activation.alert_resolved` | resolução auditada |

Esses eventos são auditoria interna. `outbox-routing.mjs` retorna `deliveryRequired: false`, e o dispatcher os marca como `done` sem chamar o webhook genérico. Eventos fora dessa lista continuam seguindo o canal configurado.

Ações e resultados utilizam `dedupeKey`. O dispatcher aceita `pending` ou `failed`, respeita `next_retry_at`, incrementa tentativas somente em falha e limpa `last_error` quando conclui.

## 6. Workflow periódico do n8n

Arquivo versionado: `automation/n8n/workflows/commercial-post-activation-due-runner.json`.

Fluxo:

1. Schedule Trigger dispara a cada 15 minutos.
2. `Run Due Milestones` chama `/run-post-activation-due-milestones`.
3. A resposta é reduzida ao JSON de negócio.
4. `Validate Runner Summary` exige `ok: true` e valida os contadores.
5. `Prepare Runner Metrics` associa o resumo ao ID da execução do n8n.
6. `Persist Runner Metrics` grava a execução e projeta as métricas acumuladas.
7. `Validate Runner Metrics Persistence` exige a confirmação e mantém somente o JSON de negócio.
8. `Synchronize Alert Occurrences` atualiza o registro durável de alertas.
9. `Validate Alert Occurrence Synchronization` exige uma resposta válida e expõe somente o resumo.
10. `Query Alert SLA Signals` consulta violações ainda acionáveis pela API protegida.
11. `Validate Alert SLA Signals` valida a resposta e mantém somente os contadores operacionais.
12. `Synchronize Alert SLA Signal Occurrences` persiste os sinais ativos e encerra os que desapareceram do conjunto validado.
13. `Validate Alert SLA Signal Occurrence Synchronization` confirma os contadores `created`, `observed`, `resolved` e `active`.

O workflow publicado em produção é a versão Durable com sincronização das ocorrências de alertas e de sinais de SLA. As versões anteriores permanecem despublicadas; somente uma versão pode ficar publicada para evitar processamento duplicado.

A persistência usa:

- `runnerKey`: identifica a automação, atualmente `post_activation_due_runner`;
- `executionKey`: recebe o ID da execução do n8n e garante idempotência;
- `summary`: registra `executedAt`, `scanned`, `due`, `processed` e `failed`;
- `metrics`: acumula execuções, sucessos, falhas, falhas consecutivas e estado de saúde.

Repetir uma `executionKey` retorna `replayed: true` sem incrementar os contadores. Uma chave nova continua a partir das métricas persistidas mais recentes, mesmo depois de reinicializações ou republicações do workflow.

Estados projetados:

- `healthy`: nenhuma falha consecutiva;
- `degraded`: uma ou duas falhas consecutivas;
- `critical`: três ou mais falhas consecutivas.

## 7. Observações e sinais

Observações ficam em `commercialOnboardings.result.postActivationObservations`, possuem chave de idempotência, fonte, horário e valores observados. A coleta considera o marco atual e evita duplicação.

Os sinais operacionais cobrem, entre outros:

- primeiro acesso;
- atividade de agenda;
- configuração/equipe;
- saúde do canal;
- incidentes críticos;
- gatilhos de escalonamento.

Dados inválidos de um cliente são isolados e contabilizados sem interromper o lote inteiro.

## 8. Ocorrências duráveis e SLA

A tabela `commercial_post_activation_alert_occurrences` registra uma linha por `alertKey` e possui:

- cliente e onboarding;
- categoria e severidade;
- primeira e última observação;
- horário de resolução;
- índices para chave única, alertas ativos e onboarding;
- RLS habilitado.

A sincronização é idempotente. Alertas ativos são inseridos ou atualizados; resoluções encerram a ocorrência conhecida. Resoluções anteriores à criação da tabela são reconciliadas como ocorrências já encerradas, usando somente identificadores e horários comprováveis.

O resumo distingue:

- `observed`: alertas ativos observados;
- `resolved`: ocorrências conhecidas encerradas;
- `reconciledResolutions`: ocorrências históricas criadas já encerradas;
- `replayedResolutions`: resoluções já aplicadas;
- `missingOccurrences`: chaves históricas que não puderam ser reconciliadas.

Metas padrão:

| Severidade | Reconhecimento | Resolução |
|---|---:|---:|
| crítica | 30 minutos | 4 horas |
| alta | 2 horas | 24 horas |

Para uma ocorrência histórica reconciliada, a projeção usa o instante mais antigo comprovável entre a abertura persistida e suas ações. O ajuste só ocorre quando `openedAt === resolvedAt`; ocorrências normais continuam rejeitando ações anteriores à abertura.

Os sinais de SLA são derivados das ocorrências duráveis e não criam uma segunda fonte de verdade. Um sinal de reconhecimento existe somente enquanto o alerta está `new`; um sinal de resolução existe enquanto o alerta permanece aberto e fora da meta. Alertas resolvidos não geram sinais ativos.

Cada sinal possui chave determinística, severidade, tipo, tempo transcorrido, meta e minutos de atraso. A consulta prioriza severidade crítica, permite filtros e calcula o resumo sobre todo o recorte filtrado antes de aplicar o limite.

A tabela `commercial_post_activation_alert_sla_signal_occurrences` mantém uma ocorrência por chave determinística de sinal. Ela registra o alerta de origem, tipo de violação, severidade, primeira e última observação e eventual resolução. A tabela possui RLS habilitado e índices para chave única, sinais ativos e histórico por alerta.

A sincronização dos sinais também é idempotente:

- `created`: sinais observados pela primeira vez;
- `observed`: sinais ativos já conhecidos e atualizados;
- `resolved`: ocorrências que deixaram de estar no conjunto ativo;
- `active`: total ativo após a transação.

Antes da persistência, o workflow exige que a quantidade de sinais recebidos corresponda ao total informado pela consulta. Essa verificação impede que um recorte truncado encerre ocorrências ainda ativas.

## 9. Painel operacional

Rota protegida: `/platform/commercial/post-activation`.

Somente operadores autorizados da plataforma podem acessar. A página apresenta:

- totais agendados, aguardando, atrasados, escalonados e concluídos;
- clientes priorizados por criticidade e vencimento;
- marco atual, responsável, prazo, pendências e janela de suporte;
- alertas ativos novos ou reconhecidos;
- controles protegidos para reconhecer e resolver;
- histórico com cliente, ação, responsável, horário e observação;
- filtros independentes para monitoramento e histórico;
- saúde do runner com última execução, identificador e taxa de sucesso;
- totais duráveis de execuções, sucessos, falhas e falhas consecutivas.
- conformidade de SLA e quantidade dentro da meta;
- violações de reconhecimento e resolução;
- tempos e metas por ocorrência.
- filtros de severidade, situação, violação e limite para o SLA;
- paginação do SLA com intervalo, total, página anterior e próxima;
- exportação CSV do recorte filtrado, protegida pela autenticação do operador.
- sinais acionáveis de SLA priorizados por criticidade;
- contadores de sinais críticos, reconhecimento e resolução;
- filtros independentes de severidade, tipo de violação e limite.

Parâmetros da interface do histórico: `historyAction`, `historyActorType` e `historyLimit`. Cada formulário preserva os parâmetros do outro.
Parâmetros da interface de SLA: `slaSeverity`, `slaLifecycle`, `slaBreach`, `slaLimit` e `slaOffset`. Aplicar novos filtros reinicia `slaOffset` em zero; navegar preserva os filtros dos demais painéis.
Parâmetros dos sinais: `slaSignalSeverity`, `slaSignalType` e `slaSignalLimit`. O formulário preserva os parâmetros dos demais quadros.

A exportação usa a rota protegida `/platform/commercial/post-activation/sla-export`. O arquivo é UTF-8 com BOM, possui cabeçalho estável, neutraliza valores iniciados por operadores de fórmula e é entregue com `Cache-Control: private, no-store`.

A paginação mantém o resumo calculado sobre todo o recorte filtrado. Somente `items` é limitado pela página atual; `summary.total`, conformidade e violações não são distorcidos pelo `limit` ou pelo `offset`.

Um alerta resolvido sai da lista ativa, mas permanece no histórico. Em produção, a resolução deixou o quadro ativo vazio e criou um registro histórico `Resolvido`, com operador e horário corretos.

## 10. Validações de produção

Foram confirmados:

- plano criado com HTTP 201 e replay com HTTP 200;
- decisão `wait` quando faltavam indicadores;
- conclusão do marco `welcome` com evento único;
- processamento periódico sem falha;
- painel acessível por operador da plataforma;
- reconhecimento com feedback e mudança para `Reconhecido`;
- resolução com remoção do alerta ativo;
- histórico preservado após resolução;
- filtros `resolved`, `human` e limite `9` aplicados simultaneamente;
- eventos de auditoria reprocessados até `done` e `last_error = null`;
- primeira gravação durável com `replayed: false`;
- repetição da mesma execução com `replayed: true` e contadores inalterados;
- troca controlada: workflow anterior despublicado e Durable publicado;
- execução automática Durable com chave distinta da execução manual;
- painel em produção com 16 execuções, 16 sucessos, zero falhas e estado `healthy`.
- tabela de ocorrências com índices esperados e RLS habilitado;
- sincronização inicial identificando uma resolução anterior ao registro;
- reconciliação reduzindo `missingOccurrences` de `1` para `0`;
- execução seguinte retornando `replayedResolutions: 1` e nenhuma duplicação;
- painel de SLA com dados consistentes, uma ocorrência resolvida e conformidade de `100%`;
- zero violações de reconhecimento e resolução no conjunto atual.
- filtros de SLA disponíveis e preservados na navegação;
- intervalo paginado `1–1 de 1` consistente com o conjunto atual;
- ausência esperada dos controles anterior/próxima quando há apenas uma página;
- CSV de SLA com 12 colunas, uma ocorrência, UTF-8 com BOM e valores coerentes com a conformidade de `100%`.
- painel de sinais exibindo operação estável, dados consistentes e todos os contadores em zero;
- filtros `critical`, `resolution_breached` e limite `10` aplicados simultaneamente;
- execução manual do workflow terminando com zero sinais e zero registros inválidos;
- troca controlada de publicação, mantendo somente a versão mais recente ativa;
- primeira execução automática após a publicação concluída em `Validate Alert SLA Signals` sem erro.
- tabela de ocorrências dos sinais de SLA criada com RLS e quatro índices esperados;
- workflow atualizado concluindo em `Validate Alert SLA Signal Occurrence Synchronization`;
- três execuções automáticas consecutivas retornando `created: 0`, `observed: 0`, `resolved: 0` e `active: 0` no cenário sem violações.

## 11. Incidentes e aprendizados

- O n8n tentou serializar objetos HTTP/streams circulares. O nó passou a retornar somente o corpo JSON antes da validação.
- O estado global do workflow não era adequado para métricas operacionais duráveis. A projeção passou a usar registros no banco e o ID da execução como chave idempotente.
- A migração foi feita com dois workflows: o Durable foi testado inativo, depois o anterior foi despublicado e somente então o novo foi publicado.
- Eventos de auditoria foram enviados inicialmente ao webhook genérico inativo `/sisag/outbox` e retornaram 404. O roteamento local corrigiu o problema.
- Após o deploy do roteamento, os eventos `alert_acknowledged` e `alert_resolved` foram retomados automaticamente na quinta tentativa.
- O webhook de produção precisa estar ativo; `/webhook-test` serve apenas à execução manual de teste.
- Credenciais de entrada do webhook e saída para a API SISAG devem permanecer separadas.
- Valores sensíveis nunca devem aparecer em logs, documentação, patches ou comandos compartilhados.
- A ocorrência reconciliada foi inicialmente aberta no horário da resolução, embora houvesse reconhecimento anterior. A consulta de SLA passou a usar o primeiro instante histórico comprovável somente para esse caso.
- Falhas controladas de projeção não geram exceção no log da página; o componente exibe indisponibilidade isolada e mantém os demais quadros acessíveis.

## 12. Diagnóstico operacional

```bash
docker service ls --filter name=sisag_app-frontend
docker service ls --filter name=sisag_outbox-dispatcher
docker service inspect sisag_outbox-dispatcher --format 'UPDATED={{.UpdatedAt}} IMAGE={{.Spec.TaskTemplate.ContainerSpec.Image}} STATE={{if .UpdateStatus}}{{.UpdateStatus.State}}{{else}}unknown{{end}}'
curl --silent --show-error --output /dev/null --write-out 'HTTP %{http_code}\n' https://sisag.flaience.com/api/health
docker service logs sisag_outbox-dispatcher --timestamps --since 10m --tail 150
```

Saúde básica: `HTTP 200`, serviços convergidos, réplicas esperadas e ausência de erros novos.

Para o runner periódico:

1. confirmar que somente o workflow Durable está publicado;
2. verificar a execução mais recente no n8n;
3. conferir no painel o ID, horário, contadores e estado;
4. investigar qualquer avanço de `failedRuns` ou `consecutiveFailedRuns`;
5. não corrigir contadores manualmente: reprocessamentos devem preservar a mesma `executionKey`.

Para auditar outbox, consultar somente identificadores/eventos necessários e nunca selecionar payloads que possam conter dados sensíveis. Eventos `done` não são reivindicados novamente, mesmo se `next_retry_at` ainda contiver um valor residual.

Para diagnosticar o SLA:

1. confirmar que o último nó do workflow retorna `missingOccurrences: 0`;
2. verificar se `invalidRecords` permanece em zero;
3. conferir no painel conformidade, violações e quantidade de ocorrências;
4. tratar indisponibilidade do quadro de SLA sem interromper o workflow ou os demais painéis.
5. confirmar que o intervalo paginado e o total correspondem ao filtro aplicado;
6. validar que anterior/próxima preservam os parâmetros `sla*` e dos demais painéis;
7. abrir uma exportação de teste e comparar seus registros com o recorte filtrado.

Para diagnosticar os sinais acionáveis:

1. confirmar que o workflow termina em `Validate Alert SLA Signal Occurrence Synchronization`;
2. comparar `total`, `critical`, `acknowledgementBreached` e `resolutionBreached` com o painel;
3. investigar `sourceInvalidRecords` diferente de zero antes de automatizar qualquer entrega externa.
4. conferir se `active` corresponde aos sinais acionáveis retornados pela consulta;
5. investigar alterações inesperadas em `created`, `observed` ou `resolved` antes de integrar notificações externas.

## 13. Manutenção e próximos passos

- manter testes direcionados, suíte completa e build antes de cada merge;
- preservar idempotência de observações, ações e resultados;
- definir política de retenção para históricos extensos;
- definir política de retenção para execuções antigas do runner;
- definir política de retenção para ocorrências resolvidas de alertas e sinais de SLA;
- ampliar sinais conforme novos módulos do produto forem ativados;
- integrar notificações externas usando as ocorrências duráveis para evitar entregas duplicadas;
- atualizar este documento quando contratos, eventos ou operação mudarem.
