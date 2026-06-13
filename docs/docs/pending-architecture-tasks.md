# Tarefas Arquiteturais Pendentes — SISAG

## Objetivo

Este documento registra pontos arquiteturais que foram identificados durante a homologação do WhatsApp, do fluxo conversacional e do motor de agendamento.

O objetivo é evitar decisões esquecidas e orientar as próximas fases do projeto.

---

## 1. Unificar os motores conversacionais

### Situação atual

Existem dois motores capazes de processar mensagens recebidas:

```text
AssistantWhatsAppService
ConversationEngine
```

Atualmente o webhook oficial da Meta usa:

```text
AssistantWhatsAppService
```

O `ConversationEngine` já existe e é usado em rotas de desenvolvimento/simulação.

### Problema

Manter dois motores pode gerar:

- regras duplicadas;
- comportamentos diferentes;
- bugs difíceis de rastrear;
- dois caminhos diferentes para agendamento;
- dificuldade futura para MCP.

### Direção recomendada

O `ConversationEngine` deve se tornar o motor conversacional oficial.

Fluxo desejado:

```text
WhatsApp Webhook
  ↓
ConversationEngine
  ↓
AvailabilityService
  ↓
BookingService
  ↓
Outbox
```

### Momento recomendado

Após estabilizar totalmente o fluxo atual em produção.

Prioridade: alta, mas não emergencial.

---

## 2. Unificar os eventos de envio WhatsApp

### Situação atual

Existem dois eventos de envio:

```text
whatsapp.send.requested
whatsapp.send_text
```

O `AssistantWhatsAppService` usa:

```text
whatsapp.send.requested
```

O `ConversationEngine` usa:

```text
whatsapp.send_text
```

### Problema

Dois tipos de evento para a mesma finalidade dificultam:

- rastreamento;
- workers;
- logs;
- métricas;
- retry;
- documentação;
- futura camada MCP.

### Direção recomendada

Padronizar tudo para:

```text
whatsapp.send.requested
```

ou criar uma abstração única:

```text
MessagingTools.sendMessage()
```

e ela decide o evento internamente.

### Momento recomendado

Antes de colocar o `ConversationEngine` como motor oficial em produção.

Prioridade: alta.

---

## 3. Unificar AppointmentService e BookingService

### Situação atual

Existem dois serviços relacionados a agendamento:

```text
AppointmentService
BookingService
```

O fluxo atual do `AssistantWhatsAppService` usa o `AppointmentService`.

O `ConversationEngine` usa o `BookingService`.

### Problema

Isso cria dois motores de agendamento.

Riscos:

- regras diferentes;
- conflitos;
- disponibilidade ignorada em um fluxo;
- dados em tabelas/processos diferentes;
- dificuldade para escalar o produto.

### Direção recomendada

Definir `BookingService` como core oficial do motor de agendamento.

O `AppointmentService` deve ser:

- migrado;
- absorvido;
- ou mantido apenas como compatibilidade temporária.

### Momento recomendado

Durante a Sprint de consolidação do motor de agendamento.

Prioridade: crítica para evolução do produto.

---

## 4. Consolidar AvailabilityService como fonte única de disponibilidade

### Situação atual

O `AvailabilityService.listSlots()` já é utilizado por:

```text
/api/v1/availability/slots
/api/v1/scheduling/available
/api/v1/scheduling/book
ConversationEngine
```

### Direção recomendada

Toda consulta de disponibilidade deve passar por:

```text
AvailabilityService.listSlots()
```

Nenhum canal deve calcular disponibilidade diretamente.

### Momento recomendado

Antes de criar seleção inteligente de profissional/serviço.

Prioridade: alta.

---

## 5. Criar camada formal de Tools

### Situação atual

Já existem serviços de domínio, mas ainda não existe uma camada formal de ferramentas.

### Direção recomendada

Criar camada:

```text
src/modules/tools
```

Ferramentas candidatas:

```text
BookingTools
AvailabilityTools
ClientTools
MessagingTools
SessionTools
```

Exemplo:

```text
Agent
  ↓
Tool
  ↓
Service
  ↓
Repository
  ↓
Database
```

### Momento recomendado

Depois de unificar `BookingService`, `AvailabilityService` e envio de mensagens.

Prioridade: média-alta.

---

## 6. Preparar MCP

### Situação atual

O projeto ainda não deve iniciar MCP diretamente.

Primeiro é necessário estabilizar as Tools internas.

### Ferramentas MCP futuras

```text
get_available_slots
create_booking
cancel_booking
reschedule_booking
find_client
find_professional
send_message
get_booking_journey
```

### Momento recomendado

Após a camada `src/modules/tools` estar estável.

Prioridade: futura.

---

## 7. Normalização de telefone

### Situação atual

A Meta pode enviar números brasileiros sem o nono dígito.

Exemplo:

```text
555492056187
```

O SISAG precisa normalizar para:

```text
+5554992056187
```

### Direção recomendada

Manter a normalização centralizada em:

```text
normalizePhoneE164()
```

Criar testes unitários para essa função.

### Momento recomendado

Imediato.

Prioridade: alta.

---

## 8. Limpeza de dados históricos

### Situação atual

Durante testes foram criados clientes duplicados com telefone sem nono dígito.

### Direção recomendada

Criar script controlado para:

- identificar duplicados;
- preservar histórico;
- migrar sessões;
- migrar bookings;
- evitar perda de dados.

### Momento recomendado

Antes de ambiente piloto com cliente real.

Prioridade: média.

---

## 9. Limpeza de logs temporários

### Situação atual

O webhook ainda possui logs de debug.

Exemplos:

```text
[meta status debug]
[meta status event]
```

### Direção recomendada

Remover ou trocar por logger controlado por nível.

### Momento recomendado

Antes de release estável.

Prioridade: baixa-média.

---

## 10. Templates WhatsApp

### Situação atual

Mensagens dentro da janela de 24h funcionam.

Fora da janela, a Meta exige templates aprovados.

### Direção recomendada

Criar templates para:

```text
confirmação
lembrete
cancelamento
reagendamento
pós-atendimento
```

### Momento recomendado

Antes de automações proativas.

Prioridade: alta para produção real.

---

## Ordem recomendada de execução

### Sprint 01 — Consolidação

1. Criar testes para `normalizePhoneE164`.
2. Limpar logs temporários.
3. Documentar eventos WhatsApp.
4. Validar dois clientes simultâneos.
5. Auditar duplicidades de clients.

### Sprint 02 — Unificação do Motor

1. Padronizar eventos de envio WhatsApp.
2. Migrar `ConversationEngine` para usar o evento único.
3. Migrar webhook para `ConversationEngine`.
4. Manter flag de rollback.
5. Aposentar gradualmente `AssistantWhatsAppService`.

### Sprint 03 — Core de Agendamento

1. Definir `BookingService` como core oficial.
2. Migrar fluxos que ainda usam `AppointmentService`.
3. Garantir que toda criação passe por disponibilidade.
4. Consolidar regras de serviço, recurso e profissional.

### Sprint 04 — Tools Internas

1. Criar `AvailabilityTools`.
2. Criar `BookingTools`.
3. Criar `ClientTools`.
4. Criar `MessagingTools`.
5. Criar contratos padronizados.

### Sprint 05 — MCP

1. Expor Tools como MCP.
2. Criar agente operacional.
3. Testar fluxo completo com agente.
4. Evoluir para memória operacional.

---

## Decisão Estratégica

O objetivo final é sair de:

```text
Canal → Código específico → Banco
```

para:

```text
Canal → Agente → Tool → Serviço de Domínio → Evento → Banco
```

Essa mudança é essencial para transformar o SISAG em uma plataforma escalável de agentes inteligentes, e não apenas em um sistema de agendamento via WhatsApp.
