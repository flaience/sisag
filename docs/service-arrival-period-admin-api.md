# API administrativa dos períodos por ordem de chegada

- `GET /api/v1/scheduling/arrival-periods`: lista períodos da empresa autenticada.
- `POST /api/v1/scheduling/arrival-periods`: cria um período para proprietário ou administrador.
- `PUT /api/v1/scheduling/arrival-periods/:id`: atualiza dentro da empresa autenticada.
- `DELETE /api/v1/scheduling/arrival-periods/:id`: desativa sem apagar histórico.

A API não cria reservas, agendamentos, check-ins ou posições de fila.
