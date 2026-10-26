# Observabilidade dos próximos agendamentos

O roteamento registra eventos estruturados de elegibilidade e entrega. Cada evento contém somente nome do evento, correlação, etapa e código sanitizado.

Telefone, texto da mensagem, nomes de serviços, quantidade e conteúdo dos agendamentos não são incluídos. Falhas externas são reduzidas a códigos alfanuméricos limitados, sem persistir mensagens de erro privadas.

A observabilidade não modifica a chave de idempotência nem o comportamento de entrega.
