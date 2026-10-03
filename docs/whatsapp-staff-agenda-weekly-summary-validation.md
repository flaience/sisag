# Consulta administrativa semanal — validação em produção

Atualizado em 03/10/2026.

## Resultado

O percurso semanal do PR #482 foi validado em produção pelo número autorizado do gestor, com perguntas enviadas por áudio.

As quatro consultas responderam corretamente:

1. `Quantos atendimentos tenho esta semana?`;
2. `Como está minha agenda esta semana?`;
3. `Quantos atendimentos tenho na próxima semana?`;
4. `Como está minha agenda na próxima semana à tarde?`.

## O que a evidência confirma

- reconhecimento das expressões `esta semana` e `próxima semana`;
- funcionamento tanto da contagem agregada quanto da listagem;
- aplicação do recorte da tarde à próxima semana;
- resposta pelo caminho administrativo do remetente autorizado;
- preservação da consulta somente leitura sobre bookings oficiais;
- uso do fuso configurado da empresa e da semana de segunda-feira a domingo pelo contrato implementado.

## Garantias preservadas

A autorização continua baseada no acesso persistido do gestor ou profissional. O escopo permanece isolado por empresa e, para profissionais, pelo vínculo profissional. A listagem mantém o limite de itens e a indicação de atendimentos adicionais, enquanto a contagem usa o total agregado.

## Limites

A validação confirma as quatro formulações executadas e os dados existentes no momento do teste. Não certifica todas as possíveis transcrições de áudio, outros idiomas, intervalos personalizados ou consultas mensais. Nenhuma mutação de agendamento foi incluída nesta etapa.
