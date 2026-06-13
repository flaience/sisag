## Tool Implementada — AvailabilityTools

### Status

✅ Primeira Tool formalizada

### Origem

```text
src/modules/availability/Availability.service.ts
```

### Métodos disponíveis

#### getAvailableSlots()

Responsável por localizar horários disponíveis considerando:

- empresa
- serviço
- duração
- profissional/recurso
- horário de trabalho
- conflitos de agenda
- recursos necessários para execução

Implementação atual:

```text
AvailabilityService.listSlots()
```

---

#### getBusyResources()

Responsável por retornar recursos ocupados em um intervalo.

Implementação atual:

```text
AvailabilityService.listBusyResources()
```

---

### Contrato MCP Futuro

```ts
getAvailableSlots({
  companyId,
  serviceId,
  startTime,
  resourceId?,
  durationMinutes?,
  limit?
})
```

Retorno:

```ts
{
  ok: true,
  slots: [
    {
      startTime,
      endTime,
      resourceIds
    }
  ]
}
```

---

### Observações

A lógica principal de disponibilidade já existe e encontra-se centralizada no AvailabilityService.

A camada AvailabilityTools deve funcionar apenas como adaptador entre agentes, APIs externas e o domínio.

Não deve conter regra de negócio própria.

Fluxo:

```text
Agent
 ↓
AvailabilityTools
 ↓
AvailabilityService
 ↓
Database
```

---

### Próximos Passos

- Criar BookingTools
- Criar ClientTools
- Criar MessagingTools
- Criar SessionTools

Objetivo final:

```text
Agent
 ↓
Tools
 ↓
Services
 ↓
Repositories
 ↓
Database
```

## Auditoria — BookingService

### Conclusão

O `BookingService` é atualmente o núcleo operacional mais completo do SISAG para fluxos de agendamento.

Ele concentra:

- criação automática de booking;
- confirmação;
- cancelamento;
- reagendamento;
- recriação;
- jornada do booking;
- ações administrativas;
- integração com o ConversationEngine.

### Chamadas encontradas

| Origem                                             | Uso                              |
| -------------------------------------------------- | -------------------------------- |
| `src/app/api/v1/bookings/route.ts`                 | Criação/listagem de bookings     |
| `src/app/api/v1/bookings/auto/route.ts`            | Criação automática               |
| `src/app/api/v1/bookings/[id]/confirm/route.ts`    | Confirmação                      |
| `src/app/api/v1/bookings/[id]/cancel/route.ts`     | Cancelamento                     |
| `src/app/api/v1/bookings/[id]/reschedule/route.ts` | Reagendamento                    |
| `src/app/api/v1/bookings/[id]/recreate/route.ts`   | Recriação                        |
| `src/app/api/v1/bookings/[id]/journey/route.ts`    | Jornada                          |
| `src/modules/conversation/ConversationEngine.ts`   | Fluxo conversacional             |
| `src/modules/conversation/commitBooking.ts`        | Commit de booking conversacional |

### Diretriz

O `BookingService` deve ser tratado como o core oficial de agendamento avançado do SISAG.

O `AppointmentService` deve ser considerado legado/simplificado até que seja absorvido, migrado ou claramente separado.

### Tools MCP candidatas

| Tool                    | Método provável                   |
| ----------------------- | --------------------------------- |
| `create_booking`        | `BookingService.createAuto()`     |
| `confirm_booking`       | `BookingService.confirmById()`    |
| `cancel_booking`        | `BookingService.cancelById()`     |
| `cancel_latest_booking` | `BookingService.cancelLatest()`   |
| `reschedule_booking`    | `BookingService.rescheduleById()` |
| `recreate_booking`      | `BookingService.recreateById()`   |
| `get_booking_journey`   | `BookingService.getJourney()`     |
