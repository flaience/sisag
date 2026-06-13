# COLE ISTO EM: docs/domain.md

# Domínio — SISAG

## Conceito Central

O SISAG é uma plataforma de operação assistida por Inteligência Artificial.

O agendamento é a primeira capacidade operacional implementada, mas o objetivo maior é permitir que agentes inteligentes executem processos reais de negócio.

## Hierarquia Principal

```text
Tenant
  └── Company
        ├── Clients
        ├── Professionals
        ├── Appointments
        ├── Conversation Sessions
        └── WhatsApp Accounts
```

## Tenant

Representa o cliente SaaS pagante.

Exemplos:

- rede de clínicas;
- franquia;
- grupo empresarial;
- empresa com várias unidades.

Um tenant pode possuir várias companies.

## Company

Representa uma unidade operacional.

Exemplos:

- clínica matriz;
- filial;
- unidade de atendimento;
- CNPJ operacional.

A maioria dos dados pertence a uma company.

## Client

Representa o cliente, paciente ou usuário final.

Campos importantes:

- nome;
- telefone em E.164;
- e-mail;
- observações;
- data de nascimento.

Formato padrão de telefone:

```text
+5554992056187
```

## Professional

Representa o profissional responsável pelo atendimento.

Exemplos:

- médico;
- psicólogo;
- técnico;
- consultor;
- atendente especializado.

## Appointment

Representa um agendamento real.

Relaciona:

```text
Company
Client
Professional
Horário
Status
```

Status comuns:

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
NO_SHOW
```

## Conversation Session

Representa uma conversa em andamento.

Exemplo:

```text
Cliente: Agendar
SISAG: Qual dia e horário?
Cliente: Amanhã 10:00
```

A sessão guarda o contexto entre mensagens.

## Message Logs

Registra mensagens enviadas e recebidas.

Status possíveis:

```text
received
sent
delivered
read
failed
```

## WhatsApp Account

Representa uma conta/canal WhatsApp vinculado a uma company.

Providers previstos:

```text
meta
zapi
evolution
mock
```

Atualmente o provider homologado é:

```text
meta
```

## Outbox

Registra eventos de domínio para processamento assíncrono.

Exemplos:

```text
whatsapp.send.requested
appointment.created
appointment.cancelled
appointment.rescheduled
```

## Fluxos Homologados

### Agendamento

```text
Agendar
↓
Solicita data e horário
↓
Cria appointment
↓
Confirma ao cliente
```

### Cancelamento

```text
Cancelar
↓
Solicita confirmação
↓
Cancela appointment
↓
Confirma ao cliente
```

### Reagendamento

```text
Reagendar
↓
Solicita novo horário
↓
Atualiza appointment
↓
Confirma ao cliente
```
