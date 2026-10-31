# Manual operacional do agente n8n em produção

## Estado validado

Este runbook descreve o **SISAG Agent Shadow v14**, consolidado até a PR #639 em 31/10/2026. O fluxo foi comprovado de ponta a ponta para disponibilidade, criação, consulta de status, listagem e seleção dos próximos agendamentos, cancelamento, remarcação e encaminhamento humano.

Apesar do nome histórico “shadow”, capacidades liberadas por flags podem responder pelo WhatsApp. Criação, cancelamento e remarcação exigem confirmação explícita e usam comandos oficiais e idempotentes do SISAG.

## Fluxo de produção

1. O webhook valida empresa, conta, remetente e mensagem.
2. O espelhamento envia somente contexto confiável ao workflow v14.
3. A decisão estruturada pode solicitar uma ferramenta somente leitura.
4. O gateway resolve dados dentro da empresa autenticada.
5. Uma proposta válida é persistida atomicamente com a mensagem no outbox.
6. **NÃO** rejeita a proposta sem criar agendamento, cancelar ou remarcar.
7. **SIM** consome o estado uma única vez e libera a operação correspondente.
8. O resultado definitivo é persistido e enviado pelo outbox.
9. Falhas incertas preservam a identidade da operação para recuperação, sem repetição cega.

## Workflow n8n

- Produção: `automation/n8n/workflows/sisag-agent-shadow-v14.json`.
- A v11 permanece apenas como referência histórica da introdução da listagem; não deve ocupar o webhook de produção.
- Mantenha somente uma versão publicada no webhook de produção.
- `/webhook-test/...` exige **Execute workflow** aguardando uma chamada.
- `/webhook/...` exige workflow publicado/ativo.
- Depois de alterar o JSON do workflow, despublique a versão anterior, importe o arquivo versionado, confira os nós e publique a nova versão.
- Mudanças exclusivamente no backend não exigem nova importação do workflow.

## Configuração de produção

Flags principais:

- `N8N_AGENT_SHADOW_MIRROR_ENABLED=true`
- `N8N_AGENT_SHADOW_MIRROR_TIMEOUT_MS=30000`
- `N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED=true`
- `N8N_AGENT_APPOINTMENT_STATUS_ROUTING_ENABLED=true`
- `N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED=true`
- `N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED=true`
- `N8N_AGENT_SELECTED_APPOINTMENT_ACTION_ROUTING_ENABLED=true`
- `N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED=true`
- `N8N_AGENT_BOOKING_PROPOSAL_ROUTING_ENABLED=true`
- `N8N_AGENT_BOOKING_CONFIRMATION_DECISION_ROUTING_ENABLED=true`
- `N8N_AGENT_BOOKING_CONFIRMATION_EXECUTION_ENABLED=true`
- `N8N_AGENT_BOOKING_CANCELLATION_PROPOSAL_ROUTING_ENABLED=true`
- `N8N_AGENT_BOOKING_CANCELLATION_DECISION_ROUTING_ENABLED=true`
- `N8N_AGENT_BOOKING_CANCELLATION_EXECUTION_ENABLED=true`
- `N8N_AGENT_BOOKING_RESCHEDULING_PROPOSAL_ROUTING_ENABLED=true`
- `N8N_AGENT_BOOKING_RESCHEDULING_DECISION_ROUTING_ENABLED=true`
- `N8N_AGENT_BOOKING_RESCHEDULING_EXECUTION_ENABLED=true`
- `N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED=true`
- `N8N_AGENT_SHADOW_PROVIDER=openai`
- `N8N_AGENT_SHADOW_MODEL=gpt-6-luna`

Segredos permanecem fora do Git. O webhook usa o arquivo indicado por `N8N_AGENT_SHADOW_WEBHOOK_SECRET_FILE`.

Na Meta, o aplicativo deve estar ativo, com `https://sisag.flaience.com/politica-de-privacidade` configurada, callback `https://sisag.flaience.com/api/v1/whatsapp/webhook` no objeto **WhatsApp Business Account** e campo `messages` inscrito. Sem esses itens, testes diretos do n8n podem funcionar enquanto mensagens reais do WhatsApp não chegam ao SISAG.

## Pré-requisitos de agenda

Confirme serviço, profissional, unidade e recurso ativos; associação do serviço; grade semanal do profissional na unidade; duração; antecedência mínima; bloqueios, exceções e conflitos. Quando existe agenda profissional válida, ela tem precedência sobre a agenda genérica do recurso.

A disponibilidade exige a sobreposição de duas configurações: **Profissionais → Horários** define quando a pessoa trabalha, enquanto **Configurações → Profissionais por turno** define quem pode atender o serviço naquele local, dia e período. Para atender manhã e tarde, cadastre períodos separados nas duas telas, por exemplo `08:00–12:00` e `13:00–18:00`.

Horários exibidos devem incluir dia/data uma vez por grupo e jamais oferecer horários vencidos ou anteriores à antecedência mínima configurada.

## Operações validadas

### Criar

Consulte disponibilidade, escolha um horário oferecido e responda `SIM`. `NÃO` rejeita a proposta sem criar agendamento. A criação usa o comando oficial e idempotente de agendamento.

### Consultar status

“Qual é o status do meu próximo agendamento?” resolve o próximo compromisso futuro pela empresa e identidade normalizada do WhatsApp, sem alterar dados.

### Listar próximos agendamentos

“Quais são meus próximos agendamentos?” usa `scheduling.list_upcoming_appointments` e responde com até cinco compromissos futuros pendentes ou confirmados. A lista contém somente data, horário, serviço e status sanitizados. O envio é idempotente pela correlação e não altera a agenda.

### Selecionar e agir sobre um agendamento

Após listar até cinco compromissos, frases como `o primeiro`, `cancele o segundo` e `remarque o último` resolvem somente uma opção confiável. A seleção isolada não altera a agenda.

### Cancelar

“Cancele o primeiro” apresenta o compromisso e solicita **SIM** ou **NÃO**. A execução só ocorre depois do **SIM**; reenvios não cancelam duas vezes.

### Remarcar

“Remarque o primeiro” preserva a ação selecionada e solicita a nova data e hora. Uma resposta como `09/11 15:00` consulta a disponibilidade a partir do horário pedido e gera a proposta com horário atual e novo. **NÃO** rejeita a proposta sem alterar o compromisso. A pergunta pode ser enviada com `dispatchAllowed: true`, enquanto `reschedulingExecutionAllowed: false` impede alteração antes do **SIM**.

### Encaminhar para humano

Somente intenção explícita abre o atendimento humano. Enquanto estiver pendente, o agente automático fica suspenso. Depois de concluir a pendência, a conversa pode voltar ao agente.

## Estados e recuperação

Estados comuns: `awaiting_confirmation`, `confirmed_pending_execution`, `execution_in_progress`, `completed`, `rejected`, `expired`, `superseded` e `execution_uncertain`.

Cancelamento e remarcação possuem estados equivalentes e resultados definitivos próprios, incluindo horário indisponível ou operação não permitida. Em `execution_uncertain`, investigue com a mesma identidade de execução; nunca crie outra chave para “tentar novamente”.

## Observabilidade sanitizada

Últimas decisões:

~~~sql
select correlation_id, status, decision_action, tool_name,
       tool_execution_status, tool_error_code, context_continued, observed_at
from n8n_agent_shadow_mirror_observations
order by observed_at desc
limit 20;
~~~

Estados de criação, cancelamento e remarcação:

~~~sql
select 'confirmation' as flow, status, execution_error_code, created_at
from n8n_agent_booking_confirmation_states
union all
select 'cancellation', status, execution_error_code, created_at
from n8n_agent_booking_cancellation_states
union all
select 'rescheduling', status, execution_error_code, created_at
from n8n_agent_booking_rescheduling_states
order by created_at desc
limit 30;
~~~

As observações não devem guardar texto da conversa, telefone, segredo, serviço, horário ou identificador do agendamento. Eventos técnicos usam somente correlação, etapa e código limitado.

O roteamento da lista de próximos agendamentos registra apenas `n8n_agent_upcoming_appointments_routing`, correlação, etapa e código sanitizado. Para confirmar uma entrega, consulte o outbox pelo campo `payload.meta.source = n8n_agent_upcoming_appointments_v1`.

A ação selecionada registra `n8n_agent_selected_appointment_action_routing` nas etapas `eligibility` e `delivery`. O código `published` confirma a publicação; falhas usam somente códigos sanitizados.

## Diagnóstico rápido

| Sintoma | Ação |
|---|---|
| resposta antiga | confira a versão publicada do workflow e o resultado final do nó `Respond Shadow Only` |
| proposta existe no nó de construção, mas não chega ao backend | confira sua propagação no resultado final e `dispatchAllowed` |
| `invalid_gateway_request` | confira argumentos específicos da ferramenta e campos opcionais nulos |
| `SCHEDULING_APPOINTMENT_NOT_FOUND` | confira empresa, identidade normalizada, estado e data futura |
| nenhum horário | confira grade profissional, regra de profissional por turno, unidade, serviço, bloqueios e antecedência mínima |
| manhã disponível, tarde indisponível | confirme períodos da tarde tanto em **Profissionais → Horários** quanto em **Profissionais por turno** |
| `só falta data e horário` após informar data | abra a execução e confirme `context_continued = true` e o texto composto em `gatewayInput.request.message.text` |
| `ECONNABORTED` no nó `Call SISAG Shadow Decision` | confirme timeout de `25000` ms; o espelhamento externo permanece em `30000` ms |
| `execution_uncertain` | preserve o estado e verifique o resultado antes de qualquer retomada |
| respostas duplicadas | desative workflows concorrentes e confira as chaves do outbox |
| webhook de teste 404 | arme **Execute workflow** antes da chamada |
| webhook de produção 404 | publique somente a v14 |
| mensagem real não dispara o n8n | confirme se a Meta recebeu a política pública, se o app está ativo, se o callback está configurado em `WhatsApp Business Account` e se `messages` está inscrito |
| teste direto funciona, mas não há observação `wamid.` | consulte `whatsapp_webhook_events`; ausência de evento recente indica interrupção antes do SISAG |

## Interrupção segura e rollback

Desative primeiro as flags `*_EXECUTION_ENABLED`, depois `*_DECISION_ROUTING_ENABLED`, depois `*_PROPOSAL_ROUTING_ENABLED`. Para uma interrupção ampla, desative `N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED` e por último `N8N_AGENT_SHADOW_MIRROR_ENABLED`.

Para rollback do n8n, despublique a v14 antes de ativar a versão anterior. Em caso de segredo exposto, desative o acesso, rotacione o valor e remova capturas retidas.

## Banco de dados

Além das migrações de observabilidade e confirmação, produção deve conter:

- `infra/n8n-agent-human-handoff-state.sql`
- `infra/n8n-agent-booking-cancellation-state.sql`
- `infra/n8n-agent-booking-cancellation-execution-persistence.sql`
- `infra/n8n-agent-booking-rescheduling-state.sql`
- `infra/n8n-agent-booking-rescheduling-execution-persistence.sql`

Confirme tabelas, RLS, constraints e índices antes de ativar as flags.

## Validação de release

Na raiz do projeto:

1. `pnpm test:run`
2. `pnpm build`
3. `git diff --check`
4. `git status --short`

O lint global possui dívida histórica independente, principalmente `no-explicit-any` e regras de efeitos React. Não misture sua correção massiva com mudanças do agente.

## Limites atuais

- Operações mutáveis exigem confirmação explícita.
- A remarcação aceita data e hora explícitas ou um horário resultante da consulta confiável.
- Áudio depende de transcrição autorizada e não substitui os testes textuais.
- Ausência de evidência nunca autoriza invenção.
