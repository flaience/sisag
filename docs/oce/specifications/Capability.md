# SPEC-001

# Operational Capability Specification

Status

Stable

Versão

1.0

---

# Objetivo

Definir formalmente o que caracteriza uma Operational Capability.

Toda Capability da Plataforma deve obedecer a esta especificação.

---

# Definição

Uma Capability representa uma capacidade operacional reutilizável da Plataforma.

Ela encapsula regras de negócio, operações, políticas e eventos relacionados a um determinado contexto operacional.

---

# Estrutura Obrigatória

Toda Capability deve possuir:

- Contract
- Operations
- Events
- Policies
- Validators
- Errors
- Adapter(s)
- Self Check

---

# Contract

O Contract representa a interface pública da Capability.

Nenhuma implementação concreta deve ser exposta.

---

# Operations

As operações representam capacidades disponíveis para humanos, APIs e agentes.

Devem ser independentes de interface.

---

# Events

Toda mudança operacional relevante deve produzir eventos padronizados.

---

# Policies

Toda operação deve possuir políticas explícitas.

Exemplos:

- confirmação obrigatória
- nível de risco
- permissões

---

# Validators

Toda entrada deve ser validada antes da execução da operação.

---

# Errors

Toda Capability deve possuir catálogo próprio de erros.

Não são permitidos erros genéricos.

---

# Adapter

Toda Capability deve poder ser conectada a produtos existentes através de Adapters.

---

# Self Check

Toda Capability deve ser capaz de validar sua própria integridade.

---

# Restrições

Uma Capability nunca pode:

- depender de interface gráfica;
- depender de rotas HTTP;
- depender de framework específico;
- depender diretamente de banco de dados.

Essas responsabilidades pertencem às implementações concretas.

---

# Compatibilidade

Uma Capability somente é considerada compatível com a OCE quando atende integralmente esta especificação.
