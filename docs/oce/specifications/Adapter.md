# SPEC-002

# Adapter Specification

Status

Stable

Versão

1.0

---

# Objetivo

Definir o comportamento esperado de um Adapter.

---

# Definição

Um Adapter conecta implementações concretas aos contratos definidos por uma Capability.

Ele representa uma camada de tradução.

---

# Responsabilidades

Um Adapter pode:

- converter modelos;
- traduzir erros;
- adaptar contratos;
- integrar implementações existentes.

---

# Um Adapter nunca pode:

- criar regras operacionais;
- modificar políticas;
- alterar eventos;
- implementar lógica de negócio própria.

---

# Fluxo

Produto

↓

Adapter

↓

Capability Contract

↓

Implementação existente

---

# Benefícios

- migração incremental;
- desacoplamento;
- reutilização;
- estabilidade arquitetural.
