# Ubiquitous Language

## Objetivo

Este documento define a linguagem oficial utilizada na Plataforma Flaience.

A linguagem da plataforma deve ser horizontal, operacional e reutilizável em múltiplos segmentos de serviços.

O Core não deve carregar termos específicos de clínicas, saúde, beleza, jurídico ou qualquer vertical.

---

## Princípio

A Flaience constrói uma Plataforma Inteligente de Agendamento e Operação de Serviços.

Portanto, a linguagem oficial deve representar operação, não um segmento específico.

---

## Termos Oficiais

| Evitar           | Usar                     |
| ---------------- | ------------------------ |
| Clinic           | Company                  |
| Patient          | Client                   |
| Doctor           | Professional             |
| Consultation     | Appointment              |
| Treatment        | Service                  |
| Medical Schedule | Schedule                 |
| Specialty        | Category                 |
| Health           | Operational Status       |
| Health Panel     | Operational Status Panel |
| Health Score     | Operational Score        |
| Medical Record   | Service History          |
| Bot              | Operational Agent        |

---

## Regra

Termos específicos de uma vertical só podem existir dentro de módulos verticais.

Exemplo:

- Saúde pode ter prontuário, CID, convênio e receita.
- Beleza pode ter procedimento, comissão e pacote.
- Jurídico pode ter processo, audiência e prazo.

Mas o Core deve permanecer neutro.

---

## Decisão

A palavra `Health` não deve ser usada para componentes de negócio da plataforma.

Ela pode existir apenas para contexto técnico de infraestrutura, como:

- `/api/health`
- health check
- service health check

---

## Exemplos aprovados

- Operational Status
- Operational Score
- Operational Priority
- Operational Timeline
- Operational Context
- Operational Agent
- Operational Journey

---

## Exemplos não aprovados no Core

- Patient Journey
- Doctor Schedule
- Clinic Dashboard
- Health Indicator
- Medical Appointment
