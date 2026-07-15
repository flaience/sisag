# ADR-002

# Capability Architecture

Status

Accepted

Data

2026-07-14

---

# Contexto

As regras de negócio encontravam-se distribuídas entre rotas HTTP, serviços, interfaces e módulos.

Isso dificultava reutilização e aumentava o acoplamento.

---

# Problema

Como tornar funcionalidades reutilizáveis por humanos, APIs e agentes inteligentes?

---

# Decisão

Toda capacidade operacional passa a ser representada por uma Capability.

Cada Capability define:

- contrato;
- operações públicas;
- operações de agentes;
- políticas;
- eventos;
- validações;
- adapters.

Produtos consomem Capabilities.

Nunca implementações concretas.

---

# Consequências

Positivas

- reutilização;
- isolamento;
- menor acoplamento;
- suporte nativo para agentes.

Negativas

- maior investimento inicial;
- necessidade de contratos bem definidos.

---

# Impacto

SISAG e SISMOB passam a consumir Scheduling Capability, Real Estate Capability e futuras Capabilities.
