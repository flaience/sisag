    # COLE ISTO EM: docs/architecture.md

# Arquitetura — SISAG

## Visão Geral

O SISAG foi desenhado como uma plataforma multi-tenant, orientada a eventos e preparada para automação com Inteligência Artificial.

A arquitetura prioriza:

- isolamento de dados por empresa;
- rastreabilidade;
- resiliência;
- integração assíncrona;
- múltiplos canais;
- evolução futura com MCP.

## Fluxo Macro

```text
Cliente
  ↓
WhatsApp / Canal Conversacional
  ↓
Webhook
  ↓
API Next.js
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
  ↓
Integrações externas
```

## Componentes

| Componente     | Responsabilidade                             |
| -------------- | -------------------------------------------- |
| Next.js        | API, rotas internas e painel administrativo  |
| PostgreSQL     | Banco principal                              |
| Drizzle ORM    | Modelagem e acesso a dados                   |
| Outbox         | Registro confiável de eventos                |
| Dispatcher     | Processamento assíncrono                     |
| n8n            | Automações externas                          |
| Meta Cloud API | Canal WhatsApp oficial                       |
| Docker Swarm   | Orquestração em produção                     |
| Traefik        | Proxy reverso e TLS                          |
| GitHub Actions | CI/CD                                        |
| GHCR           | Registro de imagens                          |
| MCP            | Camada futura de ferramentas para agentes IA |

## Princípios Arquiteturais

### 1. Multi-Tenant por Design

Todo dado operacional relevante deve estar vinculado a uma `company_id`.

```text
Tenant
  └── Companies
        ├── Clients
        ├── Professionals
        ├── Appointments
        ├── WhatsApp Accounts
        └── Automations
```

### 2. Event Driven First

Operações relevantes devem gerar eventos.

Exemplos:

```text
appointment.created
appointment.cancelled
appointment.rescheduled
whatsapp.send.requested
whatsapp.message.received
```

### 3. Outbox Pattern

Nenhuma integração externa crítica deve ser chamada diretamente dentro do fluxo principal de negócio.

Fluxo correto:

```text
Domain Service
  ↓
PostgreSQL Transaction
  ↓
Outbox pending
  ↓
Dispatcher
  ↓
Integração externa
  ↓
Status / retry / erro
```

## Diretriz de Evolução

Toda nova funcionalidade deve:

1. respeitar multi-tenant;
2. gerar eventos rastreáveis quando alterar estado relevante;
3. ser auditável;
4. poder ser usada futuramente por agente MCP;
5. não depender de um canal específico;
6. preservar histórico operacional.
