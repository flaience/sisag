# OPS-001 — Operational Scheduling

## 1. Purpose

Operational Scheduling represents the capability of reserving time, people, services and resources inside an operational context.

It is not limited to clinics or medical appointments.

It applies to any organization whose operation depends on scheduled commitments.

Examples:

- Clinics
- Salons
- Barbershops
- Consultancies
- Coworkings
- Schools
- Technical services
- Professional services
- Real estate services
- Internal corporate resources

---

## 2. Operational Reality

Organizations that operate through scheduled commitments need to coordinate:

- who is requesting the service;
- who or what will provide the service;
- what service will be performed;
- when it will happen;
- which resources are required;
- which communications must occur;
- which state the commitment is currently in.

Scheduling is not a calendar entry.

Scheduling is an operational commitment.

---

## 3. Operational Objects

### Company

The organization that owns the operational context.

### Client

The person or organization requesting or receiving a service.

### Professional

The person responsible for executing or supporting the service.

### Service

The operational capability being delivered.

### Resource

A physical, digital or organizational asset required to execute the service.

Examples:

- room;
- chair;
- vehicle;
- equipment;
- property;
- online meeting link;
- internal resource.

### Appointment

The operational commitment that reserves time, people, service and resources.

### Availability

The representation of when a professional, resource or company can receive appointments.

### Communication

The messages exchanged before, during or after the appointment.

### Operational Journey

The sequence of states and events that explain how the appointment evolved.

---

## 4. Operational States

An Appointment can evolve through states such as:

- requested;
- pending;
- confirmed;
- rescheduled;
- cancelled;
- completed;
- expired;
- no_show.

States represent the current operational condition of the appointment.

A state must always be explainable by events.

---

## 5. Operational Events

Operational Scheduling evolves through events.

Examples:

- appointment.requested;
- appointment.created;
- appointment.confirmed;
- appointment.rescheduled;
- appointment.cancelled;
- appointment.completed;
- appointment.expired;
- appointment.no_show;
- availability.generated;
- availability.blocked;
- reminder.scheduled;
- reminder.sent;
- communication.sent;
- communication.failed.

Events are the historical truth of the operation.

---

## 6. Operational Rules

Initial rules:

1. An appointment must belong to one company.
2. An appointment must reference one client.
3. An appointment may reference one professional.
4. An appointment may reserve one or more resources.
5. Two confirmed appointments must not reserve the same resource at the same time.
6. Two confirmed appointments must not reserve the same professional at the same time.
7. Cancelling an appointment releases its reserved time/resources.
8. Rescheduling an appointment must preserve historical traceability.
9. Completion must represent that the service was executed.
10. Communication failures must not silently disappear.

---

## 7. Operational Agents

Operational Scheduling can be supported by agents.

### Scheduling Agent

Finds available slots and creates appointments.

### Communication Agent

Sends reminders, confirmations and follow-ups.

### Support Agent

Explains scheduling rules and assists platform users.

### Optimization Agent

Suggests better usage of schedule, professionals and resources.

### Recovery Agent

Identifies cancellations, no-shows and opportunities for rebooking.

Agents must consume Operational Context.

Agents must not invent operational truth.

---

## 8. Operational Experience

Interfaces are views over the same Operational Context.

Possible views:

- calendar view;
- agenda view;
- timeline view;
- priority center;
- client journey;
- professional schedule;
- resource schedule;
- agent conversation;
- voice command;
- WhatsApp flow.

No interface is the source of truth.

The Operational Context is the source of truth.

---

## 9. Implementation Consequences

Operational Scheduling should produce reusable capabilities for all Flaience products.

Required capabilities:

- availability calculation;
- appointment creation;
- appointment status transition;
- conflict detection;
- event generation;
- outbox integration;
- communication triggering;
- audit trail;
- agent-safe tools.

---

## 10. Platform Principle

Operational Scheduling is not a SISAG-specific feature.

It is a reusable capability of the Flaience Operational Platform.

SISAG is the first product to implement it.
