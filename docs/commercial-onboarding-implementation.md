# Onboarding comercial — implementação e operação

> Registro técnico consolidado em 13 de agosto de 2026. Este documento descreve o comportamento versionado no repositório nesta data. Não contém senhas, tokens ou valores de secrets.

## 1. Objetivo e situação atual

O onboarding comercial transforma um cliente comercial elegível em cliente ativo por meio de um fluxo auditável de oito etapas. A implementação cobre criação, consulta, transições, execução automática e humana, treinamento, validação de go-live, conclusão protegida e planejamento do acompanhamento pós-ativação.

O fluxo completo foi validado em produção: as oito etapas chegaram ao estado `completed`, o onboarding terminou com status `completed`, o cliente passou a `active` e a repetição da conclusão retornou `replayed: true` sem novos eventos.

O plano pós-ativação e seu agendamento transacional também estão implementados na camada de serviço. A exposição desse agendamento por API ou consumidor automático é uma evolução posterior; não existe endpoint dedicado para ele neste momento.

## 2. Arquitetura

```text
API interna SISAG
  -> serviços comerciais e máquina de estados
  -> PostgreSQL (onboarding, etapas, cliente e outbox)
  -> outbox-dispatcher
  -> webhook dedicado do n8n
  -> runtime interno SISAG
  -> adapters de execução
  -> submissão do resultado
  -> próxima transição
```

Princípios aplicados:

- transações para manter estado e evento consistentes;
- validação de entrada com Zod;
- bloqueio de registros durante mudanças críticas;
- comandos determinísticos e eventos com `dedupeKey`;
- respostas com `replayed` para repetição segura;
- separação entre planejamento, despacho, execução e registro do resultado;
- erros inesperados registrados no servidor sem exposição de detalhes privados na resposta;
- credenciais fora do código e dos arquivos versionados.

## 3. Modelo do fluxo

| Posição | Código | Título | Executor |
|---:|---|---|---|
| 1 | `validate_registration` | Validação cadastral | `system` |
| 2 | `configure_company` | Configuração da empresa | `agent` |
| 3 | `configure_scheduling` | Configuração da agenda | `agent` |
| 4 | `configure_team` | Cadastro da equipe | `human` |
| 5 | `configure_channels` | Configuração dos canais | `agent` |
| 6 | `training` | Treinamento assistido | `agent` |
| 7 | `go_live_validation` | Validação de entrada em produção | `system` |
| 8 | `complete_onboarding` | Conclusão do onboarding | `system` |

Estados do onboarding: `pending`, `in_progress`, `blocked`, `completed` e `cancelled`.

Estados das etapas: `pending`, `in_progress`, `blocked`, `completed`, `skipped` e `cancelled`.

Ações aceitas pela máquina de estados: `start`, `complete`, `block`, `resume`, `skip` e `cancel`.

Uma etapa não pode ser executada fora de ordem. A conclusão avança `currentStepCode`; ao concluir a última etapa, o onboarding fica `completed`, `currentStepCode` torna-se `null` e o cliente fica `active`.

## 4. Serviços principais

- `commercial-onboarding.service.ts`: cria ou reconcilia o onboarding e suas oito etapas; atualiza o cliente para onboarding; emite `commercial.onboarding.created`.
- `commercial-onboarding-query.service.ts`: consulta por `onboardingId` ou `commercialClientId` e retorna cliente, onboarding e etapas.
- `commercial-onboarding-workflow.service.ts`: aplica a máquina de estados, ordem, replay e emissão de eventos.
- `commercial-onboarding-executor.service.ts`: decide se deve aguardar, executar por sistema/agente ou encaminhar ao n8n.
- `commercial-onboarding-dispatch.service.ts`: inicia a etapa executável e cria o comando determinístico de execução.
- `commercial-onboarding-runtime.handler.ts`: valida o envelope recebido da outbox e coordena o runtime.
- `commercial-onboarding-runtime-executor.service.ts`: seleciona adapter, executa o comando e submete o resultado.
- `commercial-onboarding-execution-result.service.ts`: valida o resultado, aplica a transição e garante replay por comando e desfecho.
- `commercial-onboarding-human-handoff.service.ts`: registra a participação humana da etapa `configure_team` e avança o fluxo.
- `commercial-onboarding-agent.adapter.ts`: roteia agentes por etapa.
- `commercial-onboarding-scheduling.adapter.ts`: configura a agenda de forma idempotente.
- `commercial-onboarding-channels.adapter.ts`: encontra e valida canais ativos da empresa.
- `commercial-onboarding-training.service.ts`: define plano, notas mínimas e avaliação do treinamento.
- `commercial-onboarding-training-progress.service.ts`: acumula evidências de treinamento com idempotência.
- `commercial-onboarding-go-live-validation.service.ts`: define e avalia o checklist de produção.
- `commercial-onboarding-go-live-progress.service.ts`: acumula as evidências do checklist.
- `commercial-onboarding-completion-guard.service.ts`: impede ativação sem sequência, treinamento e go-live completos.
- `commercial-onboarding-completion.service.ts`: inicia e conclui a etapa final com replay seguro.
- `commercial-post-activation-follow-up.service.ts`: constrói e avalia o plano de acompanhamento.
- `commercial-post-activation-scheduling.service.ts`: persiste o plano e emite seu evento na mesma transação.

## 5. API interna

Base: `/api/platform/capabilities/commercial`.

| Método | Caminho | Função |
|---|---|---|
| POST | `/provision-account` | provisionar conta comercial |
| POST | `/initialize-onboarding` | criar/reconciliar onboarding |
| GET | `/get-onboarding` | consultar estado e etapas |
| POST | `/transition-onboarding-step` | aplicar transição explícita |
| GET | `/plan-onboarding-execution` | obter decisão de execução |
| POST | `/dispatch-onboarding-execution` | iniciar e emitir solicitação de execução |
| POST | `/execute-onboarding-runtime` | executar envelope recebido pelo n8n |
| POST | `/submit-onboarding-execution-result` | registrar resultado do executor |
| POST | `/submit-onboarding-human-handoff` | registrar entrega humana |
| POST | `/record-onboarding-training-progress` | registrar evidência de treinamento |
| POST | `/record-onboarding-go-live-progress` | registrar evidência de go-live |
| POST | `/complete-onboarding` | concluir onboarding explicitamente |
| POST | `/change-subscription-status` | alterar ciclo da assinatura |

Essas rotas usam `validateInternalRequest`. O chamador autorizado envia o segredo interno no cabeçalho configurado pela plataforma; operacionalmente foi usado `x-platform-internal-secret`. O valor deve vir de Docker Secret/credencial n8n e nunca de documentação ou código.

## 6. Comandos, idempotência e replay

O comando de execução segue o formato:

```text
<onboardingId>:<stepCode>:start
```

Exemplo conceitual: `uuid:configure_scheduling:start`.

Regras relevantes:

- o mesmo comando não deve iniciar novamente uma etapa já iniciada;
- a repetição do resultado usa comando + desfecho para reconhecer replay;
- evidências de treinamento repetidas não aumentam a contagem;
- a conclusão repetida retorna o estado concluído sem emitir evento;
- o plano pós-ativação possui chave `<onboardingId>:post_activation:2026-08-v1`;
- inserts de outbox usam conflito ignorado para impedir duplicidade.

## 7. Eventos

| Evento | Finalidade |
|---|---|
| `commercial.onboarding.created` | onboarding inicializado |
| `commercial.onboarding.step_changed` | auditoria de transição |
| `commercial.onboarding.execution_requested` | solicitar execução externa |
| `commercial.onboarding.execution_result_received` | auditar resultado recebido |
| `commercial.onboarding.completed` | onboarding e ativação concluídos |
| `commercial.post_activation.follow_up_scheduled` | plano pós-ativação persistido |

Somente `commercial.onboarding.execution_requested` exige entrega ao webhook dedicado. Os demais eventos de onboarding são reconhecidos pelo dispatcher como auditoria interna sem envio externo. Eventos alheios ao onboarding continuam no webhook genérico.

## 8. Outbox, dispatcher e n8n

O worker `src/workers/outbox-dispatcher.js` lê lotes da outbox, resolve o destino em `outbox-routing.mjs`, entrega eventos e aplica tentativas/retry.

Configuração dedicada esperada:

- `N8N_COMMERCIAL_ONBOARDING_WEBHOOK_URL`;
- `N8N_COMMERCIAL_ONBOARDING_WEBHOOK_SECRET_FILE` (preferencial);
- `N8N_COMMERCIAL_ONBOARDING_WEBHOOK_SECRET` (fallback).

O segredo genérico pode ser reutilizado apenas como fallback. Para o canal dedicado, o dispatcher envia `Authorization: Bearer <valor>`. No canal genérico legado, usa `x-webhook-secret`.

Workflow versionado: `automation/n8n/workflows/commercial-onboarding-runtime.json`.

Fluxo no n8n:

1. `Commercial Onboarding Webhook` recebe POST em `/webhook/sisag/commercial-onboarding/runtime`.
2. O envelope deve possuir o evento `commercial.onboarding.execution_requested`, `outboxId` e `payload.command.key`.
3. `Execute SISAG Runtime` chama `/execute-onboarding-runtime`.
4. A resposta é normalizada para extrair somente o corpo JSON, inclusive quando o n8n a representa como stream.
5. Erros recuperáveis falham a execução para permitir retry da outbox; erros definitivos são respondidos sem repetição infinita.

Credenciais n8n separadas:

- entrada: Header Auth `authorization`, valor `Bearer <segredo exclusivo do webhook>`;
- saída: Header Auth `x-platform-internal-secret`, valor do secret interno do SISAG.

As credenciais não devem ser compartilhadas entre os dois componentes. Em `Allowed HTTP Request Domains`, a credencial de saída precisa autorizar a API SISAG; a credencial de entrada não deve ser usada pelo nó HTTP Request.

## 9. Treinamento

Plano `2026-08-v1`, com quatro módulos obrigatórios:

| Código | Nota mínima | Minutos |
|---|---:|---:|
| `platform_basics` | 70 | 15 |
| `scheduling_operations` | 80 | 25 |
| `team_operations` | 70 | 20 |
| `channels_and_support` | 70 | 15 |

Cada evidência inclui responsável, data, nota, confirmação e descrição. A etapa só pode terminar quando todos os módulos atingem a nota mínima. O progresso validado em produção avançou 25%, 50%, 75% e 100%.

## 10. Checklist de go-live

Checklist `2026-08-v1`, com seis verificações obrigatórias:

- `company_configuration`;
- `scheduling_configuration`;
- `team_configuration`;
- `active_channels`;
- `training_completion`;
- `operational_health`.

Para cada código vale a evidência mais recente. A conclusão exige todos presentes e `passed`, sem itens `failed`. O progresso validado avançou de 17% até 100%.

## 11. Proteção da conclusão

Antes de ativar o cliente, o guard verifica:

1. exatamente as oito etapas, na ordem e posições esperadas;
2. todas as sete etapas anteriores concluídas;
3. contexto e evidências válidas dos quatro módulos de treinamento;
4. as seis verificações de go-live aprovadas.

Falhas retornam motivos específicos: `invalid_step_sequence`, `previous_steps_incomplete`, `training_incomplete` ou `go_live_incomplete`.

## 12. Pós-ativação

O plano `2026-08-v1` cria cinco marcos:

| Marco | Prazo | Responsável |
|---|---|---|
| `welcome` | D0 | agente |
| `adoption_d1` | D+1 | agente |
| `adoption_d3` | D+3 | agente |
| `adoption_d7` | D+7 | humano |
| `assisted_support_close_d14` | D+14 | humano |

Cada marco possui indicadores obrigatórios e gatilhos de escalonamento. O suporte assistido encerra em D+14 somente quando os indicadores estão completos e não existe gatilho ativo.

O agendador exige onboarding `completed`, cliente `active` e `completedAt`; grava o plano em `commercialOnboardings.result.postActivationFollowUpPlan` e emite `commercial.post_activation.follow_up_scheduled` atomicamente.

## 13. Deploy e verificação operacional

Sequência mínima após merge:

```powershell
pnpm test:run
pnpm build
git diff --check
git status
```

Verificações no servidor, sem revelar configurações:

```bash
docker service ls --filter name=sisag_app-frontend
docker service ls --filter name=sisag_outbox-dispatcher
docker service inspect sisag_app-frontend --format 'STATE={{if .UpdateStatus}}{{.UpdateStatus.State}}{{else}}unknown{{end}}'
docker service inspect sisag_outbox-dispatcher --format 'STATE={{if .UpdateStatus}}{{.UpdateStatus.State}}{{else}}unknown{{end}}'
curl --silent --show-error --output /dev/null --write-out 'HTTP %{http_code}\n' https://sisag.flaience.com/api/health
docker service logs sisag_app-frontend --timestamps --since 10m --tail 150
docker service logs sisag_outbox-dispatcher --timestamps --since 10m --tail 150
```

`HTTP 200`, réplicas convergidas e ausência de erros novos confirmam a saúde básica. Durante rolling update, código 143 nos containers antigos representa encerramento por sinal e pode ser normal quando as novas tarefas ficam estáveis.

## 14. Incidentes e aprendizados registrados

- Falhas SSH da action (`connection reset by peer`) foram de transporte; confirmar digest, horário, convergência e health antes de refazer deploy.
- A imagem inicial do dispatcher perdeu o arquivo de entrada; Dockerfile e comando do stack foram corrigidos e o runtime passou a validar a presença dos arquivos.
- Testes nativos `.mjs` foram excluídos do Vitest e continuam executados por `node --test`.
- O webhook n8n em modo teste usa `/webhook-test` e aceita uma chamada após `Execute workflow`; em produção usa `/webhook` e exige workflow ativo.
- O webhook importado estava em GET; o contrato correto é POST.
- A credencial Header Auth de entrada e a credencial da chamada interna precisam ser objetos distintos no n8n.
- Restrições de domínio da credencial de saída bloquearam a URL completa; a configuração foi ajustada para permitir o domínio de destino.
- O n8n 2.26 devolveu objeto/stream circular; o workflow passou a normalizar e responder somente com JSON de negócio.
- Secrets foram rotacionados usando Docker Secrets versionados e montados com o nome de arquivo esperado pela aplicação.
- Variáveis sensíveis antes presentes diretamente no stack foram removidas; backups temporários contendo valores também foram eliminados após validação.
- Mensagens em `stderr` nos testes de erro inesperado são intencionais quando a suíte termina aprovada: comprovam logging interno e ocultação do detalhe privado ao cliente.

## 15. Segurança e manutenção

- Nunca registrar valores de headers, secrets, tokens, cookies ou credenciais.
- Preferir variáveis `*_FILE` e Docker Secrets a valores em environment.
- Manter credenciais de entrada e saída isoladas.
- Preservar idempotência ao adicionar consumidores ou novos executores.
- Atualizar este documento quando mudar uma etapa, evento, endpoint, versão de plano/checklist ou procedimento operacional.
- Validar primeiro testes direcionados, depois suíte completa e build.

## 16. Próximos passos conhecidos

- expor ou consumir automaticamente o agendamento pós-ativação;
- criar executor dos marcos D0, D+1, D+3, D+7 e D+14;
- persistir resultados e escalonamentos de cada marco;
- adicionar painel operacional de onboarding e pós-ativação;
- criar alertas para retries esgotados, bloqueios, falhas de canais e clientes em risco;
- evoluir este documento junto com cada entrega.
