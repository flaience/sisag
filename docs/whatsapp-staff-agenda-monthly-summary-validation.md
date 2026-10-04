# Consulta administrativa mensal — validação em produção

Atualizado em 04/10/2026.

## Resultado

O percurso mensal foi exercitado por áudio no número autorizado do gestor após o PR #484.

- `Como está minha agenda no próximo mês?` respondeu corretamente;
- `Quantos atendimentos eu tenho em outubro?` respondeu corretamente;
- `Quantos atendimentos eu tenho em outubro à tarde?` respondeu corretamente;
- a primeira tentativa de `Quantos atendimentos tenho este mês?` foi transcrita como `Quantos atendimentos tenho esse mês?` e respondeu incorretamente sobre hoje;
- o diagnóstico confirmou que `esse mês` não fazia parte das formas reconhecidas. O pronome `eu` não era a causa, pois já era aceito;
- o PR #485 adicionou as variações demonstrativas reais de mês e semana;
- o PR #486 alinhou a regressão semanal anterior ao contrato ampliado;
- após o deploy, `Quantos atendimentos tenho esse mês?` e `Como está minha agenda essa semana?` responderam corretamente para os períodos completos.

## Evidência técnica

As mensagens de áudio tiveram transcrição e despacho concluídos. As transcrições reais observadas incluíram `esse mês`, `essa semana`, mês nomeado e próximo mês. A correção aceita também `neste mês`, `nesse mês`, `nesta semana` e `nessa semana`.

## Garantias preservadas

- autorização persistida antes da consulta administrativa;
- isolamento por empresa e por profissional quando aplicável;
- leitura de bookings oficiais em estados ativos;
- datas e intervalos calculados no fuso da empresa;
- contagem agregada e listagem limitada com indicação de itens adicionais;
- ausência de mutação de agendamentos nessa funcionalidade;
- pedidos comuns de clientes continuam fora do roteamento administrativo.

## Limites

A validação cobre as formulações executadas e os dados presentes no ambiente em 04/10/2026. Não certifica todas as possíveis transcrições, intervalos personalizados, consultas trimestrais ou anuais.
