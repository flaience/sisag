# Consulta administrativa mensal pelo WhatsApp

## Objetivo

Permitir contagem e listagem da agenda deste mês, do próximo mês ou de um mês nomeado em português.

## Exemplos

- `Quantos atendimentos tenho este mês?`;
- `Como está minha agenda no próximo mês?`;
- `Quantos atendimentos tenho em outubro?`.

## Regras

- o mês é calculado no fuso configurado da empresa;
- um mês nomeado já encerrado é interpretado no próximo ano;
- mês completo usa um único intervalo agregado;
- turnos são aplicados separadamente em cada dia do mês;
- autorização persistida, isolamento por empresa/profissional, bookings oficiais e operação somente leitura são preservados;
- pedidos de agendamento do cliente não são capturados pelo caminho administrativo.

## Validação em produção — 04/10/2026

Próximo mês, mês nomeado e mês nomeado com turno responderam corretamente por áudio. A variação real `esse mês` exigiu os PRs #485 e #486 e foi aprovada no reteste. Evidência completa em [whatsapp-staff-agenda-monthly-summary-validation.md](./whatsapp-staff-agenda-monthly-summary-validation.md).
