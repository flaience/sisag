# Agenda baseada em bookings oficiais

A tela administrativa de Agenda passa a ler o agregado oficial formado por `bookings`, `booking_items` e `booking_item_allocations`. Assim, reservas criadas pelo painel, WhatsApp, agentes ou API aparecem na mesma agenda sem duplicação em `appointments`.

A leitura mantém o contrato visual existente, resolve serviço e profissional pelas relações oficiais, preserva filtros por status e profissional e calcula o intervalo do dia no fuso `America/Sao_Paulo`.

Não existe escrita ou sincronização com a tabela legada. A fonte de verdade permanece única.
