# ERD — Modelo de Dados SISAG

## Objetivo

Este documento descreve as principais entidades do banco de dados e seus relacionamentos.

O foco é explicar a estrutura lógica do domínio.

---

# Visão Geral

```text
Tenant
  └── Companies
        ├── Profiles
        ├── Clients
        ├── Professionals
        ├── Appointments
        ├── Conversation Sessions
        ├── WhatsApp Accounts
        ├── Message Logs
        └── Outbox Events
```

---

# Tenant

Representa o cliente SaaS.

Relacionamentos:

```text
tenants
 └── companies
 └── profiles
```

---

# Company

Representa uma unidade operacional.

Exemplos:

- Clínica
- Consultório
- Loja
- Escritório

Relacionamentos:

```text
companies
 ├── clients
 ├── professionals
 ├── appointments
 ├── scheduling_config
 ├── whatsapp_accounts
 ├── conversation_sessions
 ├── message_logs
 └── outbox
```

---

# Profiles

Complementa o Supabase Auth.

Relacionamentos:

```text
auth.users
     │
     ▼
 profiles
```

Campos principais:

```text
id
tenant_id
company_id
role
name
```

---

# Clients

Representa clientes ou pacientes.

Campos principais:

```text
id
company_id
name
phone_e164
email
created_at
```

Restrição importante:

```text
unique(company_id, phone_e164)
```

---

# Professionals

Representa profissionais atendentes.

Campos principais:

```text
id
company_id
name
status
```

Relacionamentos:

```text
professionals
 └── professional_schedules
 └── appointments
```

---

# Appointments

Representa agendamentos.

Campos principais:

```text
id
company_id
client_id
professional_id
status
scheduled_time
end_time
```

Status:

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
NO_SHOW
```

---

# Conversation Sessions

Representa conversas em andamento.

Campos principais:

```text
id
company_id
client_id
status
context
```

Status:

```text
open
closed
```

Restrição:

```text
uma sessão aberta por cliente
```

---

# WhatsApp Accounts

Representa canais WhatsApp.

Campos principais:

```text
id
company_id
provider
status
provider_config
```

Providers:

```text
meta
zapi
evolution
mock
```

---

# Message Logs

Histórico de mensagens.

Campos principais:

```text
id
company_id
whatsapp_account_id
provider
status
body
provider_message_id
```

Status:

```text
received
sent
delivered
read
failed
```

---

# WhatsApp Webhook Events

Armazena eventos brutos recebidos.

Objetivos:

- auditoria
- replay
- troubleshooting

---

# WhatsApp Message Status Events

Armazena:

```text
sent
delivered
read
failed
```

Recebidos pela Meta.

---

# Outbox

Eventos assíncronos.

Status:

```text
pending
processing
done
retrying
failed
dead
```

Eventos atuais:

```text
whatsapp.send.requested
appointment.created
appointment.cancelled
appointment.rescheduled
```

---

# Regras Gerais

1. company_id obrigatório em entidades operacionais.
2. phone_e164 sempre normalizado.
3. provider_message_id deve ser preservado.
4. Nenhuma integração crítica sem log.
5. Nenhuma integração crítica sem evento.
