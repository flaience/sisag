# SPEC-003

# Operational Agent Specification

Status

Stable

Versão

1.0

---

# Definição

Um Operational Agent representa uma capacidade operacional especializada.

Não representa um modelo de IA.

---

# Um agente deve

- interpretar contexto;
- executar Capabilities;
- produzir eventos;
- respeitar políticas.

---

# Um agente nunca pode

- acessar banco diretamente;
- modificar contexto sem eventos;
- ignorar políticas;
- executar operações não autorizadas.

---

# Fluxo

Operational Context

↓

Capability

↓

Evento

↓

Novo Contexto
