# Roadmap — SISAG

## Visão

Construir uma plataforma operacional baseada em agentes inteligentes treinados no contexto de cada negócio.

---

# Fase 1 — Consolidação

Status: Em andamento

Objetivos:

- estabilização
- documentação
- testes
- observabilidade
- auditoria

Entregas:

- WhatsApp homologado
- Outbox homologado
- Sessions homologadas
- Agendamento homologado
- Cancelamento homologado
- Reagendamento homologado

---

# Fase 2 — Motor de Agendamento

Objetivo:

Eliminar regras hardcoded.

Entregas:

- serviços
- duração variável
- disponibilidade real
- recursos
- conflitos
- múltiplos profissionais

Resultado esperado:

```text
Agendamento operacional real
```

---

# Fase 3 — MCP

Objetivo:

Transformar operações em ferramentas.

Ferramentas previstas:

```text
create_booking
cancel_booking
reschedule_booking
find_client
find_professional
get_available_slots
send_message
```

Resultado esperado:

```text
Agente executando operações reais
```

---

# Fase 4 — Memória Operacional

Objetivo:

Permitir contexto permanente.

Exemplos:

```text
Cliente recorrente
Cliente prefere manhã
Cliente cancelou várias vezes
Cliente VIP
```

Resultado:

```text
Decisões melhores
```

---

# Fase 5 — Jornada Completa

Objetivo:

Automatizar toda a experiência.

Fluxo:

```text
Pré-atendimento
 ↓
Atendimento
 ↓
Pós-atendimento
 ↓
Relacionamento
 ↓
Retenção
```

---

# Fase 6 — Multicanal

Objetivo:

Uma única inteligência.

Canais:

```text
WhatsApp
Web Chat
Instagram
Facebook
E-mail
```

---

# Fase 7 — Agente Operacional Flaience

Objetivo final.

Capacidades:

```text
Consultar agenda
Executar agendamentos
Cancelar
Reagendar
Consultar histórico
Tomar decisões operacionais
Executar processos
```

Resultado esperado:

```text
Empresa operando através de agentes inteligentes
```

---

# Regra de Ouro

Toda funcionalidade nova deve:

- funcionar em ambiente multi-tenant;
- gerar eventos rastreáveis;
- ser auditável;
- ser utilizável por agentes MCP;
- não depender de um canal específico;
- preservar histórico operacional.

---

# Norte Estratégico

O SISAG não é um sistema de agendamento.

O SISAG é uma plataforma de agentes inteligentes treinados no contexto operacional de cada negócio.

O agendamento é apenas a primeira capacidade operacional implementada.
