# SISAG — ERD textual (Tabelas, relações e fluxo de dados)

> Objetivo: documentar o modelo multi-tenant, agendamentos, outbox e integração WhatsApp (Z-API).
> Convenções: status em minúsculo; company é unidade operacional; tenant é cliente pagante.

---

## Visão de alto nível (multi-tenant)

- **tenant** = cliente pagante do SISAG (ex.: SegSerra)
- **company** = unidade/filial/ambiente operacional dentro do tenant
- **profile** = vínculo do usuário (Supabase Auth) com tenant/company e role

### Cadeia de propriedade de dados

`tenant -> companies -> (professionals, clients, appointments, scheduling_config, visits, visit_types, emergencies...)`

---

## Tabelas principais e relações

### tenants
**Propósito:** cliente pagante do SISAG (isolamento de dados, cobrança, integrações).
- PK: `tenants.id`
- Campos principais: `name`, `cnpj`, contatos, `ativo`

**Relações:**
- `tenants (1) -> companies (N)` via `companies.tenant_id`
- `tenants (1) -> profiles (N)` via `profiles.tenant_id`
- `tenants (1) -> payments (N)` via `payments.tenant_id`
- `tenants (1) -> zapi_accounts (N)` via `zapi_accounts.tenant_id`

---

### companies
**Propósito:** unidade operacional (filial/cliente interno/centro de atendimento) pertencente a um tenant.
- PK: `companies.id`
- FK: `tenant_id -> tenants.id`

**Relações:**
- `companies (1) -> professionals (N)` via `professionals.company_id`
- `companies (1) -> clients (N)` via `clients.company_id`
- `companies (1) -> visit_types (N)` via `visit_types.company_id`
- `companies (1) -> visits (N)` via `visits.company_id`
- `companies (1) -> appointments (N)` via `appointments.company_id`
- `companies (1) -> scheduling_config (1)` (ideal: unique) via `scheduling_config.company_id`
- `companies (1) -> emergency_* (N)` (classes/policies/rules/events/logs) via `company_id`

---

### profiles
**Propósito:** dados do usuário no domínio do SISAG (multi-tenant), complementando `auth.users` do Supabase.
- PK: `profiles.id` (mesmo UUID de `auth.users.id`)
- FK: `tenant_id -> tenants.id`
- FK: `company_id -> companies.id` (opcional dependendo do papel)
- Campos: `role` (ex.: admin, staff), `name`

**Observação importante:**
- A tabela “usuários” é o **Supabase Auth** (`auth.users`).  
  `profiles` é o “perfil do app”.

---

## Pessoas e operação clínica

### professionals
**Propósito:** profissionais atendentes (médicos/psicólogos/etc.).
- PK: `professionals.id`
- FK: `company_id -> companies.id`
- Campos: `name`, `specialty`, `status`, `avg_duration`

**Relações:**
- `professionals (1) -> professional_schedules (N)` via `professional_schedules.professional_id`
- `professionals (1) -> appointments (N)` via `appointments.professional_id`
- `professionals (1) -> visits (N)` via `visits.professional_id`

---

### clients
**Propósito:** pacientes/clientes atendidos.
- PK: `clients.id`
- FK: `company_id -> companies.id`
- Campos: `name`, `phone`, `birth_date`, `email`, `notes`

**Relações:**
- `clients (1) -> appointments (N)` via `appointments.client_id`

**Observação (WhatsApp):**
- `clients.phone` deve ser normalizado para o formato esperado pela Z-API (ex.: E.164).

---

## Agendamento

### appointments
**Propósito:** marcação real do atendimento.
- PK: `appointments.id`
- FK: `company_id -> companies.id`
- FK: `professional_id -> professionals.id`
- FK: `client_id -> clients.id`
- Campos: `scheduled_time`, `status`, `confirmed_at`

**Regra de ouro:**
- **appointments.company_id é obrigatório**
- company pode ser derivado do professional/client, mas deve ficar gravado.

---

### professional_schedules
**Propósito:** disponibilidade fixa semanal do profissional.
- PK: `professional_schedules.id`
- FK: `professional_id -> professionals.id`
- Campos: `weekday (0-6)`, `start_time (HH:MM)`, `end_time (HH:MM)`

**Boas práticas:**
- unique recomendado: `(professional_id, weekday, start_time, end_time)`

---

### scheduling_config
**Propósito:** governança do agendamento por company.
- PK: `scheduling_config.id`
- FK: `company_id -> companies.id`
- Campos: `slot_duration_minutes`, `buffer_minutes`, `allow_overbooking`, `max_advance_days`

**Boas práticas:**
- **1 config por company** (unique em `company_id`).

---

## Check-in / visitas

### visit_types
Tipos de visita (triagem, retorno, exame, etc.).
- PK: `visit_types.id`
- FK: `company_id -> companies.id`

### visits
Registra check-in/visita em andamento.
- PK: `visits.id`
- FK: `company_id -> companies.id`
- FK: `professional_id -> professionals.id`
- FK: `visit_type_id -> visit_types.id`

---

## Cobrança

### payments
Cobrança por tenant.
- PK: `payments.id`
- FK: `tenant_id -> tenants.id`
- Campos: `valor`, `data_vencimento`, `data_pagamento`, `status`, `metodo_pagamento`

---

## Emergência (módulo)

### emergency_classes
Classificação (ex.: parada cardiorrespiratória) por company.
- PK: `emergency_classes.id`
- Campo: `level (1 crítico -> 5 baixo)`

### emergency_policies
Políticas por classe (auto-reschedule, força inserção etc.).
- PK: `emergency_policies.id`
- FK: `emergency_class_id -> emergency_classes.id`

### emergency_rules
Regras dinâmicas (config JSON).
- PK: `emergency_rules.id`

### emergency_events
Eventos disparados.
- PK: `emergency_events.id`
- FK: `emergency_class_id -> emergency_classes.id`

### emergency_logs
Auditoria/execução.
- PK: `emergency_logs.id`
- FK: `emergency_class_id -> emergency_classes.id`
- FK: `policy_id -> emergency_policies.id`

---

## Outbox (integração robusta)

### outbox
**Propósito:** registrar eventos de domínio para serem despachados (retries, idempotência, rastreio).
- PK: `outbox.id`
- Campos:
  - `aggregate_type` (ex.: appointment)
  - `aggregate_id` (UUID do appointment)
  - `event_type` (ex.: appointment.created)
  - `payload` (jsonb)
  - `status` (pending|processing|retrying|sent|dead)
  - `attempts`, `last_error`, `next_retry_at`

**Fluxo:**
1) vscode: cria appointment
2) vscode: grava `outbox` com status `pending`
3) contabo: `sisag_outbox-dispatcher` faz claim e POST para endpoint
4) n8n: workflow dispara automações (WhatsApp, e-mail etc.)

---

## Z-API (WhatsApp)

### zapi_accounts
**Propósito:** credenciais de integração WhatsApp por tenant.
- PK: `zapi_accounts.id`
- FK: `tenant_id -> tenants.id`
- Campos: `instance_id`, `token`, `phone_number`, `status`

### zapi_numbers
**Propósito:** múltiplos números/labels por conta.
- PK: `zapi_numbers.id`
- FK: `account_id -> zapi_accounts.id`
- Campos: `label`, `phone_number`, `is_default`, `status`

### zapi_messages
**Propósito:** log de mensagens enviadas.
- PK: `zapi_messages.id`
- FK: `account_id -> zapi_accounts.id`
- Campos: `to`, `body`, `response`, `status`

### zapi_events
**Propósito:** log de eventos recebidos (webhooks).
- PK: `zapi_events.id`
- FK: `account_id -> zapi_accounts.id`
- Campos: `event_type`, `payload`

---

## Fluxo de dados do agendamento (pipeline)

### 1) Criar agendamento
- Entrada: API `/api/v1/appointments` (vscode)
- Validações:
  - profissional existe
  - cliente existe
  - regras de horário (scheduling-engine)
- Persistência:
  - cria `appointments`
  - grava `outbox` (`event_type=appointment.created`, status `pending`)

### 2) Despachar evento
- contabo: `sisag_outbox-dispatcher`
  - claim com `FOR UPDATE SKIP LOCKED`
  - POST para endpoint (ex.: `https://app.../api/integration/n8n-proxy`)
  - atualiza status `sent` ou agenda retry (`retrying/next_retry_at`)

### 3) Automações
- n8n: recebe webhook e executa
  - WhatsApp via Z-API
  - e-mail / tarefas / integrações
  - responde 200 para sucesso / 4xx/5xx para falhas controladas

---

## Pontos a decidir (próximas melhorias)
1) Número de WhatsApp por company?
   - se sim, criar vínculo `company_id -> zapi_number_id` (tabela ponte)
2) Evitar token puro em tabela:
   - mover token para secrets (contabo) ou usar vault
3) Idempotência no n8n:
   - usar `outbox.id`/`aggregate_id` como chave para não duplicar mensagens
