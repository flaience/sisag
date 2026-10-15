# Manual operacional do agente n8n em produção

## Estado validado

Este runbook descreve o estado de produção consolidado até a PR #542 e validado em 14/10/2026. O fluxo ativo usa o **SISAG Agent Shadow v7** e já foi comprovado de ponta a ponta: consulta de disponibilidade, escolha de horário, pedido explícito de confirmação, resposta **SIM**, criação idempotente do agendamento e confirmação ao cliente.

Apesar do nome histórico “shadow”, o fluxo não é apenas observacional: as etapas liberadas por flags podem responder ao WhatsApp e, após confirmação explícita, executar o agendamento pelo comando oficial do SISAG.

## Fluxo de produção

1. O webhook do WhatsApp valida a empresa, a conta e a mensagem recebida.
2. O espelhamento chama o webhook publicado do n8n com correlação e contexto confiável.
3. A v7 produz uma decisão estruturada e, quando necessário, usa apenas o gateway read-only para consultar horários.
4. O catálogo ativo da própria empresa resolve serviço, profissional e unidade; texto produzido pelo modelo nunca define a identidade da empresa.
5. Uma resposta candidata pode ser enviada pelo outbox.
6. Quando o cliente escolhe um horário oferecido, o sistema cria uma proposta temporária e pergunta se pode confirmar.
7. **NÃO** rejeita a proposta sem criar agendamento.
8. **SIM** consome atomicamente a proposta, executa o comando oficial e idempotente de agendamento e publica a resposta definitiva pelo outbox.
9. Observações sanitizadas e o estado mínimo da confirmação permitem diagnóstico e recuperação.

## Workflow n8n e política de versões

- Produção: `automation/n8n/workflows/sisag-agent-shadow-v7.json`.
- Mantenha apenas a v7 publicada no caminho de webhook de produção.
- Preserve a v6 desativada por um ciclo de estabilização, para rollback controlado.
- As versões v1 a v5 podem ser arquivadas depois de confirmar que nenhuma delas publica o mesmo webhook.
- Nunca mantenha duas versões ativas no mesmo caminho: isso torna a execução e o diagnóstico ambíguos.
- A URL `/webhook-test/...` só atende enquanto **Execute workflow** ou **Listen for test event** está aguardando.
- A URL `/webhook/...` só atende quando o workflow está publicado/ativo.

Ao substituir uma versão, importe o JSON versionado, associe as credenciais já existentes, confira todos os nós, desative a versão anterior, publique a nova e faça o smoke test de produção. Não registre execuções com mensagens ou segredos além do estritamente necessário.

## Configuração de produção

As flags abaixo são injetadas pelo deploy e devem permanecer explicitamente controladas:

- `N8N_AGENT_SHADOW_MIRROR_ENABLED=true`
- `N8N_AGENT_SHADOW_MIRROR_TIMEOUT_MS=30000`
- `N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED=true`
- `N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED=true`
- `N8N_AGENT_BOOKING_PROPOSAL_ROUTING_ENABLED=true`
- `N8N_AGENT_BOOKING_CONFIRMATION_DECISION_ROUTING_ENABLED=true`
- `N8N_AGENT_BOOKING_CONFIRMATION_EXECUTION_ENABLED=true`
- `N8N_AGENT_SHADOW_PROVIDER=openai`
- `N8N_AGENT_SHADOW_MODEL=gpt-6-luna`

O segredo do webhook é lido pelo arquivo indicado em `N8N_AGENT_SHADOW_WEBHOOK_SECRET_FILE`. A chave OpenAI e o segredo interno do gateway também devem permanecer fora do Git. Este documento deliberadamente não registra valores secretos.

## Pré-requisitos para encontrar horários

Antes de investigar o agente, confirme no cadastro da mesma empresa:

- serviço ativo;
- profissional ativo e associado ao serviço;
- unidade ativa e vinculada corretamente;
- grade semanal do profissional na unidade;
- duração do serviço e antecedência máxima compatíveis com o período solicitado;
- ausência de exceção, bloqueio ou agendamento conflitante.

Desde a PR #541, pesquisas de vários dias calculam o dia da semana para cada data candidata. Assim, uma consulta iniciada numa quarta-feira encontra corretamente uma disponibilidade cadastrada para a segunda-feira seguinte.

## Smoke test de produção

Use uma conversa controlada e acompanhe cada etapa:

1. Envie: `Há horários disponíveis para consulta nos próximos 7 dias?`
2. Confirme que a resposta oferece horários reais.
3. Responda: `o primeiro` ou informe exatamente um horário oferecido.
4. Confirme que chega a pergunta “Posso confirmar este agendamento?”.
5. Responda `NÃO` em um primeiro ensaio e confira que nenhum agendamento foi criado.
6. Repita o fluxo, responda `SIM` e confira a confirmação recebida.
7. Abra a agenda do SISAG e confirme que existe exatamente um agendamento no horário escolhido.
8. Reenvios não podem criar uma segunda reserva nem uma segunda resposta definitiva.

A proposta expira em 10 minutos. Escolhas inventadas, ambíguas ou fora dos horários oferecidos não podem gerar uma proposta executável.

## Estados da confirmação

| Estado | Significado | Conduta |
|---|---|---|
| `awaiting_confirmation` | pergunta enviada, aguardando SIM/NÃO | aguardar até a expiração |
| `confirmed_pending_execution` | SIM registrado atomicamente | executor pode iniciar |
| `execution_in_progress` | execução reclamada por um processo | não criar nova chave |
| `completed` | agendamento criado e resposta persistida | conferir agenda e outbox |
| `failed_slot_taken` | horário ficou indisponível | oferecer nova consulta |
| `execution_uncertain` | resultado não pôde ser determinado | investigar e retomar com a mesma identidade |
| `rejected` | cliente respondeu NÃO | não executar |
| `superseded` | proposta substituída por outra | ignorar a antiga |
| `expired` | prazo de confirmação terminou | iniciar nova consulta |

O identificador de execução deriva do estado persistido e deve ser reutilizado em qualquer retomada. Nunca “corrija” um estado incerto criando uma nova chave de agendamento.

## Observabilidade sanitizada

Últimas decisões e consultas:

~~~sql
select correlation_id, status, decision_action, tool_name,
       tool_execution_status, tool_error_code, context_continued,
       observed_at
from n8n_agent_shadow_mirror_observations
order by observed_at desc
limit 20;
~~~

Últimos estados de confirmação:

~~~sql
select status, booking_id, execution_error_code,
       execution_started_at, execution_completed_at, decided_at,
       expires_at, created_at
from n8n_agent_booking_confirmation_states
order by created_at desc
limit 10;
~~~

Entregas do agente pelo outbox:

~~~sql
select id, status, attempts, last_error, event_type,
       payload->'meta'->>'source' as reply_source,
       created_at, updated_at
from outbox
where payload->'meta'->>'source' in (
  'n8n_agent_candidate_v1',
  'n8n_agent_booking_proposal_v1',
  'n8n_agent_booking_execution_v1'
)
order by created_at desc
limit 20;
~~~

As observações não devem guardar texto da conversa, telefone, segredo, conteúdo dos horários ou resposta candidata. A identidade do remetente usada no estado de confirmação é derivada por hash.

## Diagnóstico rápido

| Sintoma | Evidência provável | Ação |
|---|---|---|
| resposta antiga do assistente | `reply_source=api` | verificar elegibilidade, flags e resultado retornado pela v7 |
| nenhuma resposta | outbox `delivery_rejected` | conferir erro do provedor e normalização do destinatário |
| Meta `131030` | destinatário rejeitado | conferir número autorizado/normalizado e configuração da conta Meta |
| `transport_failed` | tempo do workflow excedido ou transporte indisponível | verificar execução n8n; o timeout de espelhamento é 30 s |
| `invalid_gateway_request` | corpo inválido ou argumento opcional nulo | conferir JSON enviado pelo nó read-only |
| `SCHEDULING_RESOURCE_NOT_FOUND` | serviço, profissional ou unidade ausente/ambíguo | revisar catálogo ativo e vínculos da empresa |
| nenhum horário em vários dias | faixa correta, mas grade não encontrada | confirmar deploy posterior à PR #541, grade semanal, bloqueios e política de antecedência |
| `failed_slot_taken` | concorrência real | consultar novamente e oferecer outro horário |
| `execution_uncertain` | execução iniciou sem resultado conclusivo | preservar estado e request id; conferir agenda e idempotência antes de retomar |
| respostas duplicadas | duas versões ou dedupe divergente | desativar workflows concorrentes e conferir chaves do outbox |
| webhook de teste 404 | listener não armado | executar o workflow e repetir uma chamada |
| webhook de produção 404 | workflow não publicado | ativar/publicar somente a v7 |

## Interrupção segura e rollback

Desative capacidades da mais arriscada para a mais ampla, sempre com novo deploy:

1. `N8N_AGENT_BOOKING_CONFIRMATION_EXECUTION_ENABLED=false` interrompe novas escritas; estados persistidos permanecem auditáveis.
2. `N8N_AGENT_BOOKING_CONFIRMATION_DECISION_ROUTING_ENABLED=false` impede consumo de novos SIM/NÃO.
3. `N8N_AGENT_BOOKING_PROPOSAL_ROUTING_ENABLED=false` interrompe novas perguntas de confirmação.
4. `N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED=false` devolve as respostas ao fluxo legado.
5. `N8N_AGENT_SHADOW_MIRROR_ENABLED=false` desliga completamente o espelhamento.

Para rollback do n8n, desative a v7 antes de publicar a v6. Nunca deixe ambas atendendo o mesmo webhook. Depois do rollback, faça um smoke test e registre a correlação usada.

Em caso de segredo exposto, desative o acesso afetado, rotacione o valor, atualize a credencial e remova qualquer execução ou captura retida que o contenha.

## Banco de dados e migrações

Ambientes novos devem receber, na ordem do histórico do repositório, pelo menos:

1. `infra/n8n-agent-shadow-mirror-observability.sql`
2. `infra/n8n-agent-shadow-decision-observability.sql`
3. `infra/n8n-agent-shadow-read-only-execution.sql`
4. `infra/n8n-agent-booking-confirmation-state.sql`
5. `infra/n8n-agent-booking-confirmation-execution-persistence.sql`

Confirme a existência das tabelas, RLS, constraints e índices antes de ativar as flags. As migrações são idempotentes somente conforme definido nos próprios arquivos; não improvise alterações manuais em produção.

## Validação de release

Na raiz do projeto:

1. `pnpm test:run`
2. `pnpm build`
3. `git diff --check`
4. `git status --short`

A suíte completa e o build de produção foram aprovados sobre a base da PR #542. O lint global ainda possui dívida histórica anterior a este trabalho, principalmente `no-explicit-any` e regras de efeitos React. Não declare o lint como verde e não misture uma correção massiva dessa dívida com mudanças do agente; trate-a em PRs pequenas e próprias.

## Limites atuais

- O fluxo de reserva exige confirmação explícita e só aceita um horário previamente oferecido.
- Alteração e cancelamento de agendamento não fazem parte desta ativação.
- Fluxos de áudio dependem da transcrição autorizada e não substituem o smoke test textual deste runbook.
- Respostas de conhecimento continuam limitadas ao conteúdo ativo e isolado da empresa; ausência de evidência não autoriza invenção.

## Documentos relacionados

- `docs/n8n-agent-shadow-v6-booking-proposal.md`
- `docs/n8n-agent-booking-proposal-routing.md`
- `docs/n8n-agent-booking-confirmation-state.md`
- `docs/n8n-agent-booking-confirmation-execution.md`
- `docs/n8n-agent-booking-confirmation-execution-persistence.md`
- `docs/scheduling-multi-day-availability-weekdays.md`