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
<<<<<<< Updated upstream
 ├─ Company (SegSerra Bento)
 └─ Company (SegSerra Caxias)
=======
├─ Company (SegSerra Bento)
└─ Company (SegSerra Caxias)
>>>>>>> Stashed changes

3️⃣ clients

São os pacientes daquela clínica.

Eles pertencem a uma company.

Company
<<<<<<< Updated upstream
 └─ Clients (pacientes)

=======
└─ Clients (pacientes)
>>>>>>> Stashed changes

O telefone do client é o WhatsApp que o Z-API vai usar.

Por isso eu troquei:

phone → phone_e164

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
(padrão internacional WhatsApp)

4️⃣ professionals

São médicos, enfermeiros, técnicos.

Eles também pertencem a uma company.

5️⃣ appointments

É o agendamento:

Appointment
<<<<<<< Updated upstream
  → company
  → professional
  → client
  → scheduled_time

=======
→ company
→ professional
→ client
→ scheduled_time
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
 - WhatsApp da recepção
 - WhatsApp dos exames

=======

- WhatsApp da recepção
- WhatsApp dos exames
>>>>>>> Stashed changes

Cada tenant pode ter vários números Z-API.

Tenant
<<<<<<< Updated upstream
 └─ ZAPI Accounts
      └─ ZAPI Numbers
=======
└─ ZAPI Accounts
└─ ZAPI Numbers
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream


=======
>>>>>>> Stashed changes
SISAG — Mapa rápido (1 página)
O que é o SISAG?

Um sistema multi-tenant de agendamento clínico, com eventos desacoplados (Outbox) e automação via n8n, incluindo WhatsApp (Z-API).

🌐 Modelo multi-tenant (regra de ouro)
TENANT (cliente pagante)
<<<<<<< Updated upstream
  └── COMPANY (unidade operacional)
        ├── Professionals
        ├── Clients
        ├── Appointments
        ├── Scheduling Config
        ├── Emergencies

=======
└── COMPANY (unidade operacional)
├── Professionals
├── Clients
├── Appointments
├── Scheduling Config
├── Emergencies
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
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
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream

# ERD textual — SISAG

## Multi-tenant (topo)
=======
# ERD textual — SISAG

## Multi-tenant (topo)

>>>>>>> Stashed changes
- tenants (1) ── (N) companies
- tenants (1) ── (N) profiles
- tenants (1) ── (N) payments
- tenants (1) ── (N) zapi_accounts

## Companies (unidade/filial)
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- companies (1) ── (N) professionals
- companies (1) ── (N) clients
- companies (1) ── (N) appointments
- companies (1) ── (1) scheduling_config
- companies (1) ── (N) visit_types
- companies (1) ── (N) visits

## Core clínico
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- professionals (1) ── (N) professional_schedules
- professionals (1) ── (N) appointments
- clients (1) ── (N) appointments

## Check-in / Totem (se usado)
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- visit_types (1) ── (N) visits
- professionals (1) ── (N) visits (opcional)

## Outbox (eventos do domínio)
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- outbox.aggregate_type + outbox.aggregate_id → apontam para entidades (ex: appointment.id)
- eventos recomendados:
  - appointment.created
  - appointment.cancelled
  - appointment.rescheduled

## Z-API (WhatsApp)
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- zapi_accounts (1) ── (N) zapi_numbers
- zapi_accounts (1) ── (N) zapi_messages
- zapi_accounts (1) ── (N) zapi_events

## Fluxo de dados (pipeline)
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
(vscode) SISAG cria appointment → grava outbox
(contabo) outbox-dispatcher lê outbox e POSTa para (vscode) /api/integration/n8n-proxy
(vscode) proxy valida segredo e encaminha para (n8n) /webhook/... (produção)
(n8n) automação (ex: enviar WhatsApp via Z-API)

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
**Propósito:** cliente pagante do SISAG (isolamento de dados, cobrança, integrações).
=======

**Propósito:** cliente pagante do SISAG (isolamento de dados, cobrança, integrações).

>>>>>>> Stashed changes
- PK: `tenants.id`
- Campos principais: `name`, `cnpj`, contatos, `ativo`

**Relações:**
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- `tenants (1) -> companies (N)` via `companies.tenant_id`
- `tenants (1) -> profiles (N)` via `profiles.tenant_id`
- `tenants (1) -> payments (N)` via `payments.tenant_id`
- `tenants (1) -> zapi_accounts (N)` via `zapi_accounts.tenant_id`

---

### companies
<<<<<<< Updated upstream
**Propósito:** unidade operacional (filial/cliente interno/centro de atendimento) pertencente a um tenant.
=======

**Propósito:** unidade operacional (filial/cliente interno/centro de atendimento) pertencente a um tenant.

>>>>>>> Stashed changes
- PK: `companies.id`
- FK: `tenant_id -> tenants.id`

**Relações:**
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- `companies (1) -> professionals (N)` via `professionals.company_id`
- `companies (1) -> clients (N)` via `clients.company_id`
- `companies (1) -> visit_types (N)` via `visit_types.company_id`
- `companies (1) -> visits (N)` via `visits.company_id`
- `companies (1) -> appointments (N)` via `appointments.company_id`
- `companies (1) -> scheduling_config (1)` (ideal: unique) via `scheduling_config.company_id`
- `companies (1) -> emergency_* (N)` (classes/policies/rules/events/logs) via `company_id`

---

### profiles
<<<<<<< Updated upstream
**Propósito:** dados do usuário no domínio do SISAG (multi-tenant), complementando `auth.users` do Supabase.
=======

**Propósito:** dados do usuário no domínio do SISAG (multi-tenant), complementando `auth.users` do Supabase.

>>>>>>> Stashed changes
- PK: `profiles.id` (mesmo UUID de `auth.users.id`)
- FK: `tenant_id -> tenants.id`
- FK: `company_id -> companies.id` (opcional dependendo do papel)
- Campos: `role` (ex.: admin, staff), `name`

**Observação importante:**
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- A tabela “usuários” é o **Supabase Auth** (`auth.users`).  
  `profiles` é o “perfil do app”.

---

## Pessoas e operação clínica

### professionals
<<<<<<< Updated upstream
**Propósito:** profissionais atendentes (médicos/psicólogos/etc.).
=======

**Propósito:** profissionais atendentes (médicos/psicólogos/etc.).

>>>>>>> Stashed changes
- PK: `professionals.id`
- FK: `company_id -> companies.id`
- Campos: `name`, `specialty`, `status`, `avg_duration`

**Relações:**
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- `professionals (1) -> professional_schedules (N)` via `professional_schedules.professional_id`
- `professionals (1) -> appointments (N)` via `appointments.professional_id`
- `professionals (1) -> visits (N)` via `visits.professional_id`

---

### clients
<<<<<<< Updated upstream
**Propósito:** pacientes/clientes atendidos.
=======

**Propósito:** pacientes/clientes atendidos.

>>>>>>> Stashed changes
- PK: `clients.id`
- FK: `company_id -> companies.id`
- Campos: `name`, `phone`, `birth_date`, `email`, `notes`

**Relações:**
<<<<<<< Updated upstream
- `clients (1) -> appointments (N)` via `appointments.client_id`

**Observação (WhatsApp):**
=======

- `clients (1) -> appointments (N)` via `appointments.client_id`

**Observação (WhatsApp):**

>>>>>>> Stashed changes
- `clients.phone` deve ser normalizado para o formato esperado pela Z-API (ex.: E.164).

---

## Agendamento

### appointments
<<<<<<< Updated upstream
**Propósito:** marcação real do atendimento.
=======

**Propósito:** marcação real do atendimento.

>>>>>>> Stashed changes
- PK: `appointments.id`
- FK: `company_id -> companies.id`
- FK: `professional_id -> professionals.id`
- FK: `client_id -> clients.id`
- Campos: `scheduled_time`, `status`, `confirmed_at`

**Regra de ouro:**
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- **appointments.company_id é obrigatório**
- company pode ser derivado do professional/client, mas deve ficar gravado.

---

### professional_schedules
<<<<<<< Updated upstream
**Propósito:** disponibilidade fixa semanal do profissional.
=======

**Propósito:** disponibilidade fixa semanal do profissional.

>>>>>>> Stashed changes
- PK: `professional_schedules.id`
- FK: `professional_id -> professionals.id`
- Campos: `weekday (0-6)`, `start_time (HH:MM)`, `end_time (HH:MM)`

**Boas práticas:**
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- unique recomendado: `(professional_id, weekday, start_time, end_time)`

---

### scheduling_config
<<<<<<< Updated upstream
**Propósito:** governança do agendamento por company.
=======

**Propósito:** governança do agendamento por company.

>>>>>>> Stashed changes
- PK: `scheduling_config.id`
- FK: `company_id -> companies.id`
- Campos: `slot_duration_minutes`, `buffer_minutes`, `allow_overbooking`, `max_advance_days`

**Boas práticas:**
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- **1 config por company** (unique em `company_id`).

---

## Check-in / visitas

### visit_types
<<<<<<< Updated upstream
Tipos de visita (triagem, retorno, exame, etc.).
=======

Tipos de visita (triagem, retorno, exame, etc.).

>>>>>>> Stashed changes
- PK: `visit_types.id`
- FK: `company_id -> companies.id`

### visits
<<<<<<< Updated upstream
Registra check-in/visita em andamento.
=======

Registra check-in/visita em andamento.

>>>>>>> Stashed changes
- PK: `visits.id`
- FK: `company_id -> companies.id`
- FK: `professional_id -> professionals.id`
- FK: `visit_type_id -> visit_types.id`

---

## Cobrança

### payments
<<<<<<< Updated upstream
Cobrança por tenant.
=======

Cobrança por tenant.

>>>>>>> Stashed changes
- PK: `payments.id`
- FK: `tenant_id -> tenants.id`
- Campos: `valor`, `data_vencimento`, `data_pagamento`, `status`, `metodo_pagamento`

---

## Emergência (módulo)

### emergency_classes
<<<<<<< Updated upstream
Classificação (ex.: parada cardiorrespiratória) por company.
=======

Classificação (ex.: parada cardiorrespiratória) por company.

>>>>>>> Stashed changes
- PK: `emergency_classes.id`
- Campo: `level (1 crítico -> 5 baixo)`

### emergency_policies
<<<<<<< Updated upstream
Políticas por classe (auto-reschedule, força inserção etc.).
=======

Políticas por classe (auto-reschedule, força inserção etc.).

>>>>>>> Stashed changes
- PK: `emergency_policies.id`
- FK: `emergency_class_id -> emergency_classes.id`

### emergency_rules
<<<<<<< Updated upstream
Regras dinâmicas (config JSON).
- PK: `emergency_rules.id`

### emergency_events
Eventos disparados.
=======

Regras dinâmicas (config JSON).

- PK: `emergency_rules.id`

### emergency_events

Eventos disparados.

>>>>>>> Stashed changes
- PK: `emergency_events.id`
- FK: `emergency_class_id -> emergency_classes.id`

### emergency_logs
<<<<<<< Updated upstream
Auditoria/execução.
=======

Auditoria/execução.

>>>>>>> Stashed changes
- PK: `emergency_logs.id`
- FK: `emergency_class_id -> emergency_classes.id`
- FK: `policy_id -> emergency_policies.id`

---

## Outbox (integração robusta)

### outbox
<<<<<<< Updated upstream
**Propósito:** registrar eventos de domínio para serem despachados (retries, idempotência, rastreio).
=======

**Propósito:** registrar eventos de domínio para serem despachados (retries, idempotência, rastreio).

>>>>>>> Stashed changes
- PK: `outbox.id`
- Campos:
  - `aggregate_type` (ex.: appointment)
  - `aggregate_id` (UUID do appointment)
  - `event_type` (ex.: appointment.created)
  - `payload` (jsonb)
  - `status` (pending|processing|retrying|sent|dead)
  - `attempts`, `last_error`, `next_retry_at`

**Fluxo:**
<<<<<<< Updated upstream
1) vscode: cria appointment
2) vscode: grava `outbox` com status `pending`
3) contabo: `sisag_outbox-dispatcher` faz claim e POST para endpoint
4) n8n: workflow dispara automações (WhatsApp, e-mail etc.)
=======

1. vscode: cria appointment
2. vscode: grava `outbox` com status `pending`
3. contabo: `sisag_outbox-dispatcher` faz claim e POST para endpoint
4. n8n: workflow dispara automações (WhatsApp, e-mail etc.)
>>>>>>> Stashed changes

---

## Z-API (WhatsApp)

### zapi_accounts
<<<<<<< Updated upstream
**Propósito:** credenciais de integração WhatsApp por tenant.
=======

**Propósito:** credenciais de integração WhatsApp por tenant.

>>>>>>> Stashed changes
- PK: `zapi_accounts.id`
- FK: `tenant_id -> tenants.id`
- Campos: `instance_id`, `token`, `phone_number`, `status`

### zapi_numbers
<<<<<<< Updated upstream
**Propósito:** múltiplos números/labels por conta.
=======

**Propósito:** múltiplos números/labels por conta.

>>>>>>> Stashed changes
- PK: `zapi_numbers.id`
- FK: `account_id -> zapi_accounts.id`
- Campos: `label`, `phone_number`, `is_default`, `status`

### zapi_messages
<<<<<<< Updated upstream
**Propósito:** log de mensagens enviadas.
=======

**Propósito:** log de mensagens enviadas.

>>>>>>> Stashed changes
- PK: `zapi_messages.id`
- FK: `account_id -> zapi_accounts.id`
- Campos: `to`, `body`, `response`, `status`

### zapi_events
<<<<<<< Updated upstream
**Propósito:** log de eventos recebidos (webhooks).
=======

**Propósito:** log de eventos recebidos (webhooks).

>>>>>>> Stashed changes
- PK: `zapi_events.id`
- FK: `account_id -> zapi_accounts.id`
- Campos: `event_type`, `payload`

---

## Fluxo de dados do agendamento (pipeline)

### 1) Criar agendamento
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- Entrada: API `/api/v1/appointments` (vscode)
- Validações:
  - profissional existe
  - cliente existe
  - regras de horário (scheduling-engine)
- Persistência:
  - cria `appointments`
  - grava `outbox` (`event_type=appointment.created`, status `pending`)

### 2) Despachar evento
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- contabo: `sisag_outbox-dispatcher`
  - claim com `FOR UPDATE SKIP LOCKED`
  - POST para endpoint (ex.: `https://app.../api/integration/n8n-proxy`)
  - atualiza status `sent` ou agenda retry (`retrying/next_retry_at`)

### 3) Automações
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
- n8n: recebe webhook e executa
  - WhatsApp via Z-API
  - e-mail / tarefas / integrações
  - responde 200 para sucesso / 4xx/5xx para falhas controladas

---

## Pontos a decidir (próximas melhorias)
<<<<<<< Updated upstream
1) Número de WhatsApp por company?
   - se sim, criar vínculo `company_id -> zapi_number_id` (tabela ponte)
2) Evitar token puro em tabela:
   - mover token para secrets (contabo) ou usar vault
3) Idempotência no n8n:
   - usar `outbox.id`/`aggregate_id` como chave para não duplicar mensagens
  
4) 
=======

1. Número de WhatsApp por company?
   - se sim, criar vínculo `company_id -> zapi_number_id` (tabela ponte)
2. Evitar token puro em tabela:
   - mover token para secrets (contabo) ou usar vault
3. Idempotência no n8n:
   - usar `outbox.id`/`aggregate_id` como chave para não duplicar mensagens

4.
>>>>>>> Stashed changes
