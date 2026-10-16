# Argumentos seguros do workflow sombra v8

O workflow preserva appointmentId nulo somente na consulta de status, permitindo que o gateway resolva o próximo compromisso pela identidade confiável.

Na consulta de disponibilidade, campos opcionais nulos são removidos antes do gateway estrito. Isso evita invalid_gateway_request causado por stepMinutes nulo sem ampliar o contrato da API.
