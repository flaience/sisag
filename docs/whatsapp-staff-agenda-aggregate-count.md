# Contagem agregada da agenda da equipe pelo WhatsApp

Atualizado em 02/10/2026.

## Mudança

Perguntas de quantidade deixam de carregar a lista limitada a 20 itens. O read model executa uma contagem agregada no banco para todo o período solicitado.

## Garantias

- conta itens oficiais distintos de booking;
- considera somente bookings PENDING ou CONFIRMED;
- respeita empresa, profissional autorizado, data, turno e fuso horário;
- não carrega nomes de clientes ou detalhes quando a resposta precisa apenas da quantidade;
- mantém a listagem detalhada limitada e independente;
- preserva respostas de zero, singular e plural.

## Escopo

A mudança não altera criação, reagendamento, cancelamento, disponibilidade nem autorização. Ela remove somente o teto artificial da contagem administrativa.
