# Navegação da Agenda para bookings oficiais

Os cartões da visualização em lista e da grade horária abrem a jornada oficial em `/admin/bookings/{id}/journey`.

Como a Agenda já utiliza identificadores da tabela `bookings`, a rota legada `/admin/appointments/{id}/edit` não pode ser usada: ela espera um identificador de `appointments` e não representa a fonte oficial da reserva.
