O que é cada coisa (em português claro)
1️⃣ tenants

É o dono do sistema.

Exemplos:

SegSerra

Uma rede de clínicas

Uma franquia

Ele paga o sistema e pode ter várias empresas dentro.

Tenant = cliente SaaS

2️⃣ companies

É uma clínica física / CNPJ operacional.

Exemplos:

SegSerra Bento Gonçalves

SegSerra Caxias do Sul

Um tenant pode ter várias companies.

Tenant (SegSerra)
 ├─ Company (SegSerra Bento)
 └─ Company (SegSerra Caxias)

3️⃣ clients

São os pacientes daquela clínica.

Eles pertencem a uma company.

Company
 └─ Clients (pacientes)


O telefone do client é o WhatsApp que o Z-API vai usar.

Por isso eu troquei:

phone → phone_e164


(padrão internacional WhatsApp)

4️⃣ professionals

São médicos, enfermeiros, técnicos.

Eles também pertencem a uma company.

5️⃣ appointments

É o agendamento:

Appointment
  → company
  → professional
  → client
  → scheduled_time


Quando um appointment é criado:
👉 vai para a tabela outbox
👉 o dispatcher envia pro N8N
👉 o N8N dispara WhatsApp

6️⃣ outbox

É o coração da integração

Ela guarda:

"appointment.created"
"appointment.cancelled"
"appointment.rescheduled"


Nada fala direto com N8N.
Tudo passa pelo Outbox → Dispatcher → Proxy → N8N.

Isso dá:

Resiliência

Retry

Logs

Zero perda de evento

Você fez isso certo.

7️⃣ zapi_accounts

São as contas de WhatsApp da empresa

Exemplo:

SegSerra tem:
 - WhatsApp da recepção
 - WhatsApp dos exames


Cada tenant pode ter vários números Z-API.

Tenant
 └─ ZAPI Accounts
      └─ ZAPI Numbers

8️⃣ zapi_messages

É o log do que foi enviado

Quando o N8N envia um WhatsApp:

grava aqui

status = sent / error

guarda a resposta da Z-API

Isso vira:

auditoria

histórico

reenvio



SISAG — Mapa rápido (1 página)
O que é o SISAG?

Um sistema multi-tenant de agendamento clínico, com eventos desacoplados (Outbox) e automação via n8n, incluindo WhatsApp (Z-API).

🌐 Modelo multi-tenant (regra de ouro)
TENANT (cliente pagante)
  └── COMPANY (unidade operacional)
        ├── Professionals
        ├── Clients
        ├── Appointments
        ├── Scheduling Config
        ├── Emergencies


tenant = quem paga o sistema (ex.: SegSerra)

company = clínica / unidade / filial

NUNCA misturar dados entre tenants

👤 Usuários (Auth)

auth.users (Supabase)
→ autenticação pura (login, senha, OAuth)

profiles
→ papel do usuário dentro do SISAG

liga auth.users.id → tenant → company

define role (admin, staff, etc.)

❗ Não existe tabela “users” própria — isso é intencional

🏥 Operação clínica
Professionals

pertencem a uma company

têm disponibilidade fixa semanal

atendem appointments

Clients

pertencem a uma company

têm phone (base para WhatsApp)

podem ter vários appointments

📅 Agendamento (núcleo do sistema)
appointments

marcação real do atendimento

sempre pertence a uma company

relaciona professional + client

status: pending | confirmed | cancelled | no_show

professional_schedules

agenda fixa semanal do profissional

weekday + start/end (HH:MM)

scheduling_config

regras da company:

duração do slot

buffer

overbooking

antecedência máxima

👉 Toda criação/alteração passa pelo scheduling-engine

⚡ Eventos & automação (ponto crítico)
outbox

Tabela de eventos de domínio, ex.:

appointment.created
appointment.cancelled
appointment.rescheduled


Fluxo:

vscode → cria appointment

grava evento na outbox (pending)

contabo → outbox-dispatcher envia

n8n → automações (WhatsApp, e-mail, etc.)

✔ garante retry, idempotência e rastreabilidade

📲 WhatsApp (Z-API)
zapi_accounts

credenciais por tenant

instanceId + token

status da conexão

zapi_numbers

múltiplos números por conta

define número padrão

zapi_messages

log de mensagens enviadas

status + resposta da Z-API

zapi_events

webhooks recebidos (mensagens/status)

🚨 Emergência (módulo avançado)

emergency_classes → tipo e severidade

emergency_policies → o que fazer

emergency_rules → regras dinâmicas

emergency_events/logs → execução e auditoria

👉 Sempre vinculados à company

🔁 Pipeline real (end-to-end)
Cliente / Sistema
   ↓
API (vscode)
   ↓
AppointmentService
   ↓
Outbox (Postgres)
   ↓
Outbox Dispatcher (contabo)
   ↓
Webhook interno (/api/integration/n8n-proxy)
   ↓
n8n
   ↓
WhatsApp / Email / Ações

🧩 Decisões já tomadas (importantes)

Multi-tenant no banco, não no código

Eventos sempre via outbox

n8n não escreve no banco principal

Tokens externos não hardcoded no código

company_id sempre explícito nos registros críticos

📌 Regra de manutenção

Sempre que:

criar tabela

alterar relacionamento

adicionar evento

➡️ atualizar migration
➡️ atualizar docs/ERD-TABELAS.md


# ERD textual — SISAG

## Multi-tenant (topo)
- tenants (1) ── (N) companies
- tenants (1) ── (N) profiles
- tenants (1) ── (N) payments
- tenants (1) ── (N) zapi_accounts

## Companies (unidade/filial)
- companies (1) ── (N) professionals
- companies (1) ── (N) clients
- companies (1) ── (N) appointments
- companies (1) ── (1) scheduling_config
- companies (1) ── (N) visit_types
- companies (1) ── (N) visits

## Core clínico
- professionals (1) ── (N) professional_schedules
- professionals (1) ── (N) appointments
- clients (1) ── (N) appointments

## Check-in / Totem (se usado)
- visit_types (1) ── (N) visits
- professionals (1) ── (N) visits (opcional)

## Outbox (eventos do domínio)
- outbox.aggregate_type + outbox.aggregate_id → apontam para entidades (ex: appointment.id)
- eventos recomendados:
  - appointment.created
  - appointment.cancelled
  - appointment.rescheduled

## Z-API (WhatsApp)
- zapi_accounts (1) ── (N) zapi_numbers
- zapi_accounts (1) ── (N) zapi_messages
- zapi_accounts (1) ── (N) zapi_events

## Fluxo de dados (pipeline)
(vscode) SISAG cria appointment → grava outbox
(contabo) outbox-dispatcher lê outbox e POSTa para (vscode) /api/integration/n8n-proxy
(vscode) proxy valida segredo e encaminha para (n8n) /webhook/... (produção)
(n8n) automação (ex: enviar WhatsApp via Z-API)


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
  
4) 
