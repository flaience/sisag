# OPS-001 — Implementation Map

## Purpose

This document maps the current SISAG implementation to the Operational Scheduling Capability defined in:

- `OPS-001-OPERATIONAL-SCHEDULING.md`
- `src/platform/capabilities/scheduling/contract.ts`

The goal is to identify what is already implemented, what is partially implemented and what must evolve to fully align SISAG with the Flaience Operational Context Engineering model.

---

## Current Product Implementation

SISAG currently implements Operational Scheduling through a combination of:

- bookings;
- appointments;
- availability;
- professional schedules;
- clients;
- services;
- WhatsApp communication;
- message logs;
- journey pages;
- outbox events.

This implementation is functional, but still partially product-oriented.

The next architectural goal is to gradually move scheduling concepts toward the Platform Capability model.

---

## Operational Objects Mapping

| OPS Object          | Current SISAG Representation             | Status      | Notes                                                         |
| ------------------- | ---------------------------------------- | ----------- | ------------------------------------------------------------- |
| Company             | `companies`                              | Implemented | Multi-tenant base already exists.                             |
| Client              | `clients` / `people`                     | Partial     | Needs unified operational language.                           |
| Professional        | `professionals`                          | Implemented | Used in agenda and scheduling.                                |
| Service             | `services` / service-like fields         | Partial     | Needs clearer platform-level service model.                   |
| Resource            | Partial / legacy `resourceId` references | Partial     | Needs formal resource model.                                  |
| Availability        | availability routes and schedule logic   | Partial     | Needs platform capability abstraction.                        |
| Appointment         | `appointments` / `bookings`              | Partial     | Needs consolidation between appointment and booking concepts. |
| Communication       | `message_logs`, WhatsApp routes          | Implemented | Needs stronger event linkage.                                 |
| Operational Journey | journey page/builders                    | Partial     | Strong product feature, needs platform abstraction.           |

---

## Operational States Mapping

| OPS State   | Current Representation         | Status      | Notes                                         |
| ----------- | ------------------------------ | ----------- | --------------------------------------------- |
| requested   | conversational/session flow    | Partial     | Not yet formalized as platform state.         |
| pending     | booking/appointment status     | Implemented | Needs normalized state map.                   |
| confirmed   | booking/appointment status     | Implemented | Used by confirmation flows.                   |
| rescheduled | booking action / related links | Partial     | Needs event-first traceability.               |
| cancelled   | booking/appointment status     | Implemented | Exists, but should be event-driven.           |
| completed   | booking/appointment status     | Partial     | Needs stronger operational lifecycle.         |
| expired     | not fully formalized           | Missing     | Required for pending/unconfirmed commitments. |
| no_show     | not fully formalized           | Missing     | Required for recovery and analytics agents.   |

---

## Operational Events Mapping

| OPS Event               | Current SISAG Representation  | Status          | Notes                                        |
| ----------------------- | ----------------------------- | --------------- | -------------------------------------------- |
| appointment.requested   | conversational intent/session | Partial         | Should become explicit event.                |
| appointment.created     | booking/appointment creation  | Implemented     | Should emit standardized platform event.     |
| appointment.confirmed   | confirm route/action          | Implemented     | Should align to capability event map.        |
| appointment.rescheduled | reschedule route/action       | Partial         | Needs traceability and event linkage.        |
| appointment.cancelled   | cancel route/action           | Implemented     | Should preserve reason and actor.            |
| appointment.completed   | status transition             | Partial         | Needs standardized operation.                |
| appointment.expired     | not implemented               | Missing         | Needed for automation.                       |
| appointment.no_show     | not implemented               | Missing         | Needed for recovery agent.                   |
| availability.generated  | availability route            | Partial         | Should become platform event.                |
| availability.blocked    | schedule blocking             | Missing/Partial | Needs formal resource/professional blocking. |
| reminder.scheduled      | outbox/n8n automation         | Partial         | Needs explicit event.                        |
| reminder.sent           | message logs                  | Partial         | Needs event linkage.                         |
| communication.sent      | message logs                  | Implemented     | Should align with platform event.            |
| communication.failed    | message logs                  | Implemented     | Already used in operational dashboard.       |

---

## Public Operations Mapping

| Platform Operation      | Current SISAG Area                         | Status              |
| ----------------------- | ------------------------------------------ | ------------------- |
| find_available_slots    | `/api/v1/availability/slots`               | Partial             |
| create_appointment      | `/api/v1/bookings`, `/api/v1/appointments` | Partial             |
| confirm_appointment     | `/api/v1/bookings/[id]/confirm`            | Implemented         |
| cancel_appointment      | `/api/v1/bookings/[id]/cancel`             | Implemented         |
| reschedule_appointment  | `/api/v1/bookings/[id]/reschedule`         | Implemented/Partial |
| complete_appointment    | status update flow                         | Partial             |
| list_appointments       | bookings/appointments pages                | Implemented         |
| get_appointment_journey | `/api/v1/bookings/[id]/journey`            | Implemented/Partial |

---

## Agent Operations Readiness

| Agent Operation                      | Readiness  | Notes                                                             |
| ------------------------------------ | ---------- | ----------------------------------------------------------------- |
| agent_find_available_slots           | Medium     | Availability exists, but needs tool-safe abstraction.             |
| agent_create_appointment             | Medium     | Conversational creation exists, but needs policy/audit.           |
| agent_confirm_appointment            | Medium     | Confirmation exists; needs agent operation wrapper.               |
| agent_cancel_appointment             | Low/Medium | Requires explicit user confirmation policy.                       |
| agent_reschedule_appointment         | Low/Medium | Requires explicit confirmation and traceability.                  |
| agent_explain_appointment_status     | Medium     | Journey data exists and can power explanations.                   |
| agent_suggest_recovery_opportunities | Low        | Needs no-show, cancellation and unused availability intelligence. |

---

## Architecture Gaps

1. Scheduling currently lives mostly inside SISAG product routes.
2. Appointment and booking concepts need consolidation.
3. Operational events are not yet the primary source of state explanation.
4. Agent-safe operations exist as contracts, but not yet as executable tools.
5. Resource allocation is not yet formally modeled.
6. Expiration and no-show states are not fully implemented.
7. Audit trail for agent actions is specified but not persisted.
8. Capability validation exists, but runtime operations are not yet connected to the capability contract.

---

## Next Refactoring Steps

### Step 1 — Create Scheduling Adapter

Create a platform adapter that maps existing SISAG booking/appointment logic to the `SchedulingOperationsPort`.

Target:

```txt
WEB

src/platform/capabilities/scheduling/adapters/sisag-scheduling-adapter.ts
```
