# ADR-004

# Agents Consume Capabilities

Status

Accepted

Data

2026-07-14

---

# Contexto

Agentes inteligentes tendem a acessar diretamente bancos de dados ou serviços internos.

Isso cria múltiplos caminhos de execução e dificulta auditoria.

---

# Problema

Como garantir que agentes operem exatamente como humanos e APIs?

---

# Decisão

Agentes nunca acessam banco diretamente.

Toda operação deve ocorrer através das Capabilities.

---

# Consequências

Positivas

- comportamento consistente;
- auditoria;
- segurança;
- reutilização.

Negativas

- pequenas camadas adicionais de abstração.

---

# Impacto

Qualquer MCP Tool futura deverá utilizar exclusivamente as Capabilities.
