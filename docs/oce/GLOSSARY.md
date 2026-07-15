# Operational Context Engineering

## Official Glossary

> Este documento define oficialmente a terminologia utilizada pela Operational Context Engineering (OCE).
>
> Todos os documentos, códigos, ADRs e produtos da Flaience devem utilizar estas definições.
>
> O objetivo é estabelecer uma linguagem única para arquitetos, desenvolvedores, agentes inteligentes e futuros produtos.

---

# Operational Reality

A realidade objetiva de uma organização.

Existe independentemente de qualquer software.

A OCE não cria a realidade.

Ela a representa.

---

# Operational Context

Representação digital estruturada da Operational Reality.

É a fonte única da verdade operacional.

Todas as decisões da plataforma devem nascer do Contexto Operacional.

---

# Operational Core

Conjunto de regras invariantes que representam o funcionamento da organização.

É independente de:

- banco de dados;
- framework;
- interface;
- linguagem;
- tecnologia.

---

# Operational Object

Qualquer entidade da realidade operacional que possua:

- identidade;
- estado;
- relacionamentos;
- regras;
- histórico.

Exemplos

- Pessoa
- Cliente
- Profissional
- Agenda
- Serviço
- Contrato
- Imóvel
- Pagamento

---

# Operational State

Representa a fotografia operacional atual de um Operational Object.

Todo estado deve poder ser explicado por eventos anteriores.

---

# Operational Event

Acontecimento que modifica o Contexto Operacional.

Eventos representam mudanças da realidade.

CRUD apenas materializa essas mudanças.

---

# Operational Journey

Sequência coerente de estados e eventos percorridos por um Operational Object.

Não representa workflow.

Representa evolução operacional.

---

# Operational Capability

Capacidade operacional oferecida pela Plataforma.

Toda Capability define:

- contrato;
- operações;
- políticas;
- eventos;
- validações;
- adapters.

---

# Operational Agent

Entidade responsável por interpretar o Contexto Operacional e produzir novos eventos.

Não é um chatbot.

Não é um modelo de IA.

É uma capacidade operacional.

---

# Operational Experience

Forma como humanos interagem com o Contexto Operacional.

Interfaces representam experiências.

Nunca a realidade.

---

# Operational Projection

Representação específica do Contexto Operacional para um determinado objetivo.

Exemplos

- Dashboard
- Portal
- Aplicativo
- CRM
- Agenda

Todos representam projeções do mesmo contexto.

---

# Operational Platform

Infraestrutura construída para representar o Contexto Operacional.

É composta por:

- Platform Core
- Capability Registry
- Capabilities
- Adapters
- Produtos

---

# Platform Core

Núcleo da Plataforma.

Responsável por capacidades compartilhadas entre todos os produtos.

---

# Capability

Implementação concreta de uma Operational Capability.

Toda regra operacional pertence a uma Capability.

---

# Adapter

Camada responsável por conectar implementações existentes aos contratos definidos pelas Capabilities.

Permite evolução incremental da Plataforma.

---

# Capability Registry

Catálogo oficial de todas as Capabilities disponíveis na Plataforma.

---

# Context Snapshot

Fotografia instantânea do Contexto Operacional.

Utilizada para diagnósticos, observabilidade e agentes.

---

# Operational Diagnostics

Capacidade da Plataforma de descrever seu próprio estado operacional.

Não representa dados de negócio.

Representa o estado da Plataforma.

---

# Operational Engine

Implementação tecnológica da Operational Context Engineering.

Responsável por executar as regras definidas pela disciplina.

---

# Produto

Implementação específica construída sobre o Operational Engine.

Exemplos

- SISAG
- SISMOB
- futuros produtos

Produtos não representam a disciplina.

São consumidores da Plataforma.

---

# Regra Fundamental da Linguagem

Toda documentação da Flaience deverá utilizar os termos definidos neste Glossário.

Novos conceitos somente poderão ser adicionados após definição formal e aprovação arquitetural.
