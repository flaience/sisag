# Platform Roadmap

## Operational Context Engineering

> Este documento representa a evolução planejada da Plataforma Operacional da Flaience.
>
> O roadmap deve ser atualizado ao término de cada Sprint Arquitetural.

---

# Fase 1

## Fundação da Plataforma

Status

🟢 Concluída

Objetivos

- Estrutura inicial do Platform Core
- Capability Registry
- Validação de Capabilities
- Security
- Result Pattern
- Self Validation

---

# Fase 2

## Scheduling Capability

Status

🟡 Em andamento

Objetivos

- Capability Contract
- Agent Operations
- Policies
- Validators
- Events
- Errors
- MCP Tools
- Adapter
- Self Check

Concluído

- Registry
- Validator
- Self Check
- Adapter
- findAvailableSlots

Pendente

- createAppointment
- confirmAppointment
- cancelAppointment
- rescheduleAppointment
- completeAppointment
- listAppointments
- getAppointmentJourney

---

# Fase 3

## Produtos Consumindo a Plataforma

Status

⚪ Planejada

Objetivos

- Refatorar rotas públicas do SISAG
- Eliminar regras duplicadas
- Utilizar Scheduling Capability como fonte oficial

---

# Fase 4

## Operational Diagnostics

Status

🟡 Em andamento

Objetivos

- Context Snapshot
- Companies
- Professionals
- Services
- Resources
- Appointments
- Runtime Health
- Capability Status

---

# Fase 5

## Agent Runtime

Status

⚪ Planejada

Objetivos

- Agent Audit
- Agent Memory
- Runtime Policies
- Confirmation Flow
- Safe Operations

---

# Fase 6

## Operational Events

Status

⚪ Planejada

Objetivos

- Event Bus
- Event Store
- Runtime Events
- Replay
- Temporal Reconstruction

---

# Fase 7

## Operational Analytics

Status

⚪ Planejada

Objetivos

- Operational Metrics
- Context KPIs
- Journey Analytics
- Predictive Insights

---

# Fase 8

## Multi-Capability Platform

Status

⚪ Planejada

Objetivos

Scheduling

Real Estate

CRM

Finance

Inventory

Documents

Communication

---

# Fase 9

## Operational Engine

Status

⚪ Visão de Longo Prazo

Objetivos

Capacidade completa de representar qualquer organização através da Operational Context Engineering.

---

# Próxima Sprint

Objetivo principal

Transformar completamente o SISAG em consumidor da Scheduling Capability.

Entregas esperadas

- createAppointment
- confirmAppointment
- cancelAppointment
- rescheduleAppointment
- completeAppointment
- Remoção de lógica duplicada das rotas públicas
- Consolidação do Adapter
- Testes automatizados
