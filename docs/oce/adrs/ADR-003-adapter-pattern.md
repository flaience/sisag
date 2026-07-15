# ADR-003

# Adapter Pattern

Status

Accepted

Data

2026-07-14

---

# Contexto

Produtos existentes já possuíam regras implementadas.

Reescrever tudo colocaria estabilidade e produtividade em risco.

---

# Problema

Como migrar produtos legados para a Plataforma sem interromper sua evolução?

---

# Decisão

Cada produto implementará Adapters.

Adapters conectam o código existente aos contratos definidos pelas Capabilities.

A migração ocorrerá gradualmente.

---

# Consequências

Positivas

- migração incremental;
- redução de riscos;
- reaproveitamento do código existente.

Negativas

- coexistência temporária entre arquitetura antiga e nova.

---

# Impacto

O SisagSchedulingAdapter torna-se o primeiro Adapter oficial da Plataforma.
