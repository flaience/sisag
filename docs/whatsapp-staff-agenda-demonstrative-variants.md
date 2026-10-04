# Variações demonstrativas nas consultas administrativas

## Evidência

Em produção, o áudio foi transcrito como `Quantos atendimentos tenho esse mês?`. A consulta administrativa foi reconhecida, mas `esse mês` não correspondia às formas aceitas e o período caiu incorretamente em hoje.

O histórico também registrou `Como está minha agenda essa semana?`, exigindo a mesma proteção para o intervalo semanal.

## Correção

- mês atual: aceita `este mês`, `esse mês`, `neste mês`, `nesse mês` e `mês atual`;
- semana atual: aceita `esta semana`, `essa semana`, `nesta semana`, `nessa semana` e `semana atual`;
- o marcador administrativo e a autorização persistida continuam obrigatórios;
- pedidos comuns de criação de agendamento permanecem fora desse caminho.

## Validação em produção — 04/10/2026

Após os PRs #485 e #486, as perguntas `Quantos atendimentos tenho esse mês?` e `Como está minha agenda essa semana?` retornaram corretamente os períodos completos. Evidência em [whatsapp-staff-agenda-monthly-summary-validation.md](./whatsapp-staff-agenda-monthly-summary-validation.md).
