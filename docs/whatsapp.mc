# WhatsApp — Integração Oficial Meta

## Objetivo

Documentar toda a integração WhatsApp do SISAG.

---

# Provider Atual

```text
Meta Cloud API
```

Status:

```text
Homologado
```

---

# Fluxo Inbound

```text
Cliente
 ↓
WhatsApp
 ↓
Meta
 ↓
Webhook
 ↓
SISAG
 ↓
Assistant
```

---

# Fluxo Outbound

```text
Assistant
 ↓
Outbox
 ↓
Dispatcher
 ↓
Meta API
 ↓
Cliente
```

---

# Fluxo de Status

```text
sent
 ↓
delivered
 ↓
read
```

Eventos recebidos:

```text
message_status_events
```

Tabela:

```text
whatsapp_message_status_events
```

---

# Tabelas Envolvidas

## whatsapp_accounts

Configuração do canal.

---

## whatsapp_webhook_events

Payload bruto recebido.

---

## whatsapp_message_status_events

Status enviados pela Meta.

---

## message_logs

Histórico consolidado.

---

# Formato de Telefone

Padrão obrigatório:

```text
+5554992056187
```

Formato E.164.

---

# Problema Conhecido Resolvido

A Meta pode enviar:

```text
555492056187
```

sem o nono dígito.

O SISAG realiza normalização automática.

Exemplo:

```text
555492056187
 ↓
+5554992056187
```

---

# Fluxos Homologados

## Agendar

```text
Agendar
 ↓
Data/Hora
 ↓
Appointment criado
```

---

## Cancelar

```text
Cancelar
 ↓
Confirmação
 ↓
Appointment cancelado
```

---

## Reagendar

```text
Reagendar
 ↓
Novo horário
 ↓
Appointment atualizado
```

---

# Status Homologados

✅ received

✅ sent

✅ delivered

✅ read

---

# Templates

Status atual:

```text
Pendente
```

Planejamento:

- confirmação
- lembrete
- cancelamento
- pós-atendimento

---

# Roadmap WhatsApp

1. Templates oficiais
2. Lembretes automáticos
3. Pós-atendimento
4. Pesquisas de satisfação
5. Múltiplos canais