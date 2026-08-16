# Pós-ativação comercial — implementação e operação

> Registro técnico consolidado em 16 de agosto de 2026. Complementa `commercial-onboarding-implementation.md` e não contém senhas, tokens ou valores de secrets.

## 1. Objetivo e estado atual

O pós-ativação acompanha automaticamente clientes cujo onboarding terminou em `completed` e cujo cadastro comercial está `active`. A implementação cobre planejamento, agendamento, execução periódica, coleta de evidências, escalonamento, monitoramento, alertas, ações operacionais e histórico auditável.

O fluxo está ativo em produção. O workflow do n8n executa a cada 15 minutos; o painel protegido exibe clientes em acompanhamento; e a sequência de alerta `Novo -> Reconhecido -> Resolvido` foi validada com persistência, auditoria e replay seguro.

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

Todas usam `validateInternalRequest`. O segredo deve vir da credencial interna/Docker Secret e nunca de código ou documentação. Erros inesperados são registrados no servidor; a API devolve mensagens controladas sem detalhes privados.

Filtros do histórico:

- `action=acknowledged|resolved`;
- `actorType=human|agent|system`;
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
5. Falhas ficam visíveis nas execuções; sucessos permanecem auditáveis.

Resumo retornado: `scanned`, `due`, `processed`, `waiting`, `completed`, `escalated`, `plansCompleted`, `failed` e `failures`.

Uma execução validada em produção retornou `scanned: 1`, `due: 1`, `processed: 1`, `waiting: 1` e `failed: 0`. O workflow permaneceu ativo com execuções sucessivas sem erro.

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

## 8. Painel operacional

Rota protegida: `/platform/commercial/post-activation`.

Somente operadores autorizados da plataforma podem acessar. A página apresenta:

- totais agendados, aguardando, atrasados, escalonados e concluídos;
- clientes priorizados por criticidade e vencimento;
- marco atual, responsável, prazo, pendências e janela de suporte;
- alertas ativos novos ou reconhecidos;
- controles protegidos para reconhecer e resolver;
- histórico com cliente, ação, responsável, horário e observação;
- filtros independentes para monitoramento e histórico.

Parâmetros da interface do histórico: `historyAction`, `historyActorType` e `historyLimit`. Cada formulário preserva os parâmetros do outro.

Um alerta resolvido sai da lista ativa, mas permanece no histórico. Em produção, a resolução deixou o quadro ativo vazio e criou um registro histórico `Resolvido`, com operador e horário corretos.

## 9. Validações de produção

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
- eventos de auditoria reprocessados até `done` e `last_error = null`.

## 10. Incidentes e aprendizados

- O n8n tentou serializar objetos HTTP/streams circulares. O nó passou a retornar somente o corpo JSON antes da validação.
- Eventos de auditoria foram enviados inicialmente ao webhook genérico inativo `/sisag/outbox` e retornaram 404. O roteamento local corrigiu o problema.
- Após o deploy do roteamento, os eventos `alert_acknowledged` e `alert_resolved` foram retomados automaticamente na quinta tentativa.
- O webhook de produção precisa estar ativo; `/webhook-test` serve apenas à execução manual de teste.
- Credenciais de entrada do webhook e saída para a API SISAG devem permanecer separadas.
- Valores sensíveis nunca devem aparecer em logs, documentação, patches ou comandos compartilhados.

## 11. Diagnóstico operacional

```bash
docker service ls --filter name=sisag_app-frontend
docker service ls --filter name=sisag_outbox-dispatcher
docker service inspect sisag_outbox-dispatcher --format 'UPDATED={{.UpdatedAt}} IMAGE={{.Spec.TaskTemplate.ContainerSpec.Image}} STATE={{if .UpdateStatus}}{{.UpdateStatus.State}}{{else}}unknown{{end}}'
curl --silent --show-error --output /dev/null --write-out 'HTTP %{http_code}\n' https://sisag.flaience.com/api/health
docker service logs sisag_outbox-dispatcher --timestamps --since 10m --tail 150
```

Saúde básica: `HTTP 200`, serviços convergidos, réplicas esperadas e ausência de erros novos.

Para auditar outbox, consultar somente identificadores/eventos necessários e nunca selecionar payloads que possam conter dados sensíveis. Eventos `done` não são reivindicados novamente, mesmo se `next_retry_at` ainda contiver um valor residual.

## 12. Manutenção e próximos passos

- manter testes direcionados, suíte completa e build antes de cada merge;
- preservar idempotência de observações, ações e resultados;
- adicionar paginação por cursor quando o histórico exceder o limite atual;
- definir política de retenção para históricos extensos;
- criar métricas para falhas consecutivas do workflow periódico;
- ampliar sinais conforme novos módulos do produto forem ativados;
- criar visão consolidada de SLA e tempo de resolução;
- atualizar este documento quando contratos, eventos ou operação mudarem.
