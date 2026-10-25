# Decisão de consulta dos próximos agendamentos

Perguntas explícitas no plural, como “Quais são meus próximos agendamentos?”, geram a decisão read-only `scheduling.list_upcoming_appointments` com limite fixo de cinco. O reparo determinístico também é aplicado quando o provedor produz saída inválida.

Pedidos de criação, cancelamento, remarcação e consulta do status singular não são capturados por essa intenção. Esta etapa ainda não altera o workflow nem envia a resposta ao WhatsApp.
