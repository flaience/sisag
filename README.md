# SISAG

> Sistema Inteligente de Atendimento e Gestão
> Plataforma de automação operacional baseada em Inteligência Artificial desenvolvida pela Flaience.

## Visão Geral

O SISAG é uma plataforma de atendimento, agendamento e automação operacional criada para permitir que empresas operem através de agentes inteligentes treinados no contexto do seu negócio.

O objetivo do SISAG não é apenas registrar agendamentos, mas atuar como uma camada inteligente entre clientes, equipe, processos internos e sistemas empresariais.

## Capacidades Atuais

- Atendimento automatizado via WhatsApp Oficial Meta Cloud API
- Criação de agendamentos por conversa
- Cancelamento de agendamentos com confirmação
- Reagendamento de horários
- Sessões conversacionais com contexto
- Histórico de mensagens
- Status de mensagens: sent, delivered, read e failed
- Arquitetura multi-tenant
- Outbox Pattern para eventos e automações
- Integração preparada com n8n

## Arquitetura Resumida

```text
Cliente
  ↓
WhatsApp
  ↓
Meta Cloud API
  ↓
Webhook SISAG
  ↓
Assistant Layer
  ↓
Domain Services
  ↓
PostgreSQL
  ↓
Outbox
  ↓
Dispatcher
  ↓
n8n / Workers
```

## Fluxos Homologados

### Agendamento

```text
Cliente: Agendar
SISAG: Qual dia e horário?
Cliente: Amanhã 10:00
SISAG: Agendamento criado
```

### Cancelamento

```text
Cliente: Cancelar
SISAG: Você quer cancelar?
Cliente: Sim
SISAG: Agendamento cancelado
```

### Reagendamento

```text
Cliente: Reagendar
SISAG: Qual novo horário?
Cliente: Amanhã 14:00
SISAG: Agendamento atualizado
```

## Documentação

- [Arquitetura](docs/architecture.md)
- [Domínio do sistema](docs/domain.md)
- [ERD e modelo de dados](docs/erd.md)
- [WhatsApp e mensageria](docs/whatsapp.md)
- [Roadmap](docs/roadmap.md)

## Princípio Central

O SISAG não é apenas um sistema de agendamento.

O SISAG é uma plataforma de agentes inteligentes treinados no contexto operacional de cada negócio.

O agendamento é a primeira capacidade operacional implementada.
