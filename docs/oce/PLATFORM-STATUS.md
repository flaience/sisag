# Platform Status

## Flaience Operational Context Engineering (OCE)

> Este documento representa o estado atual da Plataforma Operacional da Flaience.
>
> Seu objetivo é permitir que qualquer novo contexto (novo chat, novo desenvolvedor ou novo arquiteto) compreenda rapidamente a evolução da plataforma, as decisões arquiteturais já tomadas e os próximos passos planejados.
>
> Este documento deve ser atualizado ao final de cada Sprint Arquitetural.

---

# Informações Gerais

**Empresa**

Flaience

**Disciplina**

Operational Context Engineering (OCE)

**Versão da Plataforma**

Platform Core v0.1

**Última atualização**

2026-07-14

---

# Visão

A Flaience não desenvolve sistemas.

A Flaience representa realidades operacionais.

Todos os produtos (SISAG, SISMOB e futuros produtos) são implementações da disciplina denominada Operational Context Engineering.

---

# Estado Atual da Plataforma

## Operational Context Engineering

Status:

✅ Definido

Implementado:

- Filosofia OCE
- Operational Reality
- Operational Context
- Operational Core
- Operational Object
- Operational State
- Operational Event
- Operational Journey
- Operational Agent
- Operational Experience

---

## Platform Core

Status:

🟡 Em desenvolvimento

Implementado:

- Core Config
- Core Security
- Platform Result
- Platform Diagnostics (estrutura inicial)

Pendências:

- Logging
- Observability
- Platform Events
- Platform Registry
- Platform Configuration
- Platform Metrics

---

## Capability Registry

Status:

✅ Implementado

Implementado:

- Registry
- Registry Validator
- Capability Validation Endpoint
- Self Validation

Produção:

✅ Validado

---

## Scheduling Capability (OPS-001)

Status:

🟡 Parcialmente Implementada

Implementado:

- Capability Contract
- Public Operations
- Agent Operations
- Policies
- MCP Tools
- Validators
- State Transitions
- Events
- Errors
- Self Check
- Adapter (estrutura)
- Primeira operação conectada ao AvailabilityService
- Endpoint protegido
- Testado em produção

Pendências:

- createAppointment
- confirmAppointment
- cancelAppointment
- rescheduleAppointment
- completeAppointment
- listAppointments
- getAppointmentJourney

---

## Platform Diagnostics

Status:

🟡 Em evolução

Implementado:

- Context Snapshot
- Companies
- Professionals
- Professional Schedules

Pendências:

- Services
- Resources
- Appointments
- Capabilities
- Agents
- Policies
- Runtime Status
- Platform Health

---

# Estado do SISAG

O SISAG deixou de evoluir como um produto isolado.

Toda nova funcionalidade deve ser construída através das Capabilities da Plataforma.

O produto passa gradualmente a consumir a Plataforma.

---

# Estado do SISMOB

Desenvolvimento realizado em contexto separado.

O SISMOB seguirá exatamente os mesmos princípios arquiteturais definidos pela OCE.

---

# Decisões Arquiteturais

## Decisão 001

Interfaces dependem das Capabilities.

Nunca diretamente da implementação.

---

## Decisão 002

Agentes nunca acessam banco diretamente.

Toda operação ocorre através das Capabilities.

---

## Decisão 003

CRUD não representa a realidade operacional.

Eventos representam a realidade operacional.

---

## Decisão 004

Operational Context é a única fonte de verdade.

Todos os módulos representam projeções do mesmo contexto.

---

## Decisão 005

Rotas HTTP não implementam regras de negócio.

As regras pertencem às Capabilities.

---

## Decisão 006

Adapters são responsáveis por conectar produtos existentes às Capabilities.

Nunca o contrário.

---

# Sprint Atual

Sprint

Platform Core + Scheduling Capability

Objetivo

Transformar o SISAG em consumidor da Scheduling Capability.

Concluído

✅ Security

✅ Capability Registry

✅ Validator

✅ Self Check

✅ Adapter

✅ findAvailableSlots

✅ Diagnostics

Em andamento

- Refatoração das rotas públicas
- Integração completa do Adapter

---

# Próximos Passos

Prioridade Alta

- Conectar createAppointment
- Conectar confirmAppointment
- Conectar cancelAppointment
- Conectar rescheduleAppointment
- Conectar completeAppointment

Prioridade Média

- Agent Audit Persistence
- Runtime Events
- Platform Metrics
- Diagnostics avançado

Prioridade Baixa

- Dashboard operacional da Plataforma
- Observabilidade completa
- Runtime Explorer

---

# Arquitetura Atual

Operational Context Engineering

↓

Operational Platform

↓

Platform Core

↓

Capability Registry

↓

Scheduling Capability

↓

SisagSchedulingAdapter

↓

AvailabilityService

↓

Banco de Dados

---

# Como retomar o projeto em um novo contexto

Ao iniciar um novo chat, forneça este documento.

Ele representa a fotografia arquitetural da Plataforma.

A partir dele é possível continuar o desenvolvimento sem reconstruir todo o histórico das conversas.

---

# Lema da Flaience

> Nós não desenvolvemos sistemas.

> Nós representamos realidades operacionais.

Modelos evoluem.

Tecnologias mudam.

Interfaces são substituídas.

A realidade operacional permanece.

Nosso trabalho é representá-la para que pessoas e agentes possam compreendê-la, operá-la e evoluí-la juntos.
