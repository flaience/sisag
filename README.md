# SISAG

> **Operational Intelligence Platform**
>
> Plataforma Inteligente de Agendamento e Operação de Serviços desenvolvida pela **Flaience**.
>
> Transformamos processos em inteligência operacional através de agentes inteligentes treinados no contexto de cada negócio.

---

# Visão

O SISAG não é apenas um sistema de agendamento.

É uma plataforma operacional construída para empresas cuja operação depende de agenda, comunicação, pessoas, recursos e processos.

Seu objetivo é permitir que usuários e agentes inteligentes trabalhem juntos utilizando o mesmo contexto operacional, tornando processos mais rápidos, seguros e inteligentes.

O agendamento é apenas a primeira capacidade operacional da plataforma.

---

# Nossa Filosofia

O SISAG foi concebido sobre cinco princípios fundamentais.

## Operational First

Toda funcionalidade deve resolver um problema operacional real.

---

## Context Engineering

Agentes inteligentes produzem melhores decisões quando possuem contexto operacional consistente.

O contexto vale mais do que o modelo.

---

## Agent First

Todo processo deve poder ser executado por pessoas ou por agentes inteligentes.

---

## Platform Core

O núcleo da plataforma é independente do segmento de negócio.

Clínicas, escritórios, consultorias, coworkings, academias ou qualquer empresa baseada em agenda compartilham exatamente o mesmo Core.

---

## Experience First

Quanto mais sofisticada for a arquitetura interna, mais simples deverá ser a experiência do usuário.

---

# Arquitetura da Plataforma

```text
Experience Layer
        │
Agent Layer
        │
Operational Context Layer
        │
Operational Core
        │
Infrastructure
```

---

## Operational Core

O Core representa as capacidades comuns da plataforma.

- Companies
- Clients
- Professionals
- Services
- Appointments
- Resources
- Availability
- Communication
- Automation
- Notifications
- Journey
- Analytics
- AI

Este núcleo é reutilizado por qualquer segmento de negócio.

---

## Inteligência Operacional

Os agentes inteligentes utilizam o contexto operacional da empresa para executar tarefas como:

- Agendamentos
- Cancelamentos
- Reagendamentos
- Atendimento conversacional
- Confirmações automáticas
- Comunicação omnichannel
- Suporte ao usuário
- Recomendações operacionais
- Execução de processos

---

# Arquitetura Técnica

```text
Cliente

↓

Web
WhatsApp
Voice
API

↓

Agent Layer

↓

Operational Context Layer

↓

Operational Core

↓

Event Bus

↓

Outbox Pattern

↓

Workers

↓

Integrations
```

---

# Tecnologias Fundamentais

- Next.js
- TypeScript
- PostgreSQL
- Drizzle ORM
- Supabase Authentication
- Docker
- Docker Swarm
- Traefik
- Outbox Pattern
- Event Driven Architecture
- MCP (Model Context Protocol)
- AI Agents
- n8n

---

# Diferenciais da Plataforma

- Multi-tenant nativo
- Arquitetura orientada a eventos
- Operational Context Layer
- Agentes inteligentes especializados
- MCP Ready
- Arquitetura modular
- Escalabilidade horizontal
- Design System proprietário
- Segurança e auditoria
- Plataforma preparada para IA

---

# Documentação

```
docs/

00-flaience-manifesto.md
01-platform-vision.md
02-core-domain.md
03-architecture.md
04-design-system.md
05-navigation.md
06-security.md
07-ai-strategy.md
08-roadmap.md
```

---

# Roadmap

A evolução da plataforma está organizada em quatro fases.

## Foundation

Core

Design System

Operational Context

---

## Operational Platform

Agenda

Comunicação

Automações

Dashboard

---

## Intelligent Platform

Operational Agents

Voice Commands

Decision Support

Predictive Insights

---

## Autonomous Platform

Agent Orchestration

Multi-Agent Collaboration

Continuous Learning

Operational Intelligence

---

# Missão

> Transformamos processos em inteligência operacional.

Desenvolvemos agentes inteligentes treinados no contexto de cada negócio para automatizar operações, apoiar decisões e gerar resultados reais.

---

# Visão de Longo Prazo

Construir a principal plataforma operacional baseada em agentes inteligentes para empresas de serviços.

Não desenvolvemos apenas software.

Construímos plataformas capazes de compreender o contexto operacional de uma organização e transformá-lo em inteligência acionável.
