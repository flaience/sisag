# Resumo diário da agenda da equipe pelo WhatsApp

Atualizado em 01/10/2026.

## Objetivo

Ampliar a consulta administrativa já validada para aceitar agenda de amanhã e contagens diárias, sem criar outro mecanismo de autorização ou outra fonte de agendamentos.

## Frases cobertas

- “Como está minha agenda de hoje?”;
- “Como está minha agenda amanhã?”;
- “Quantos atendimentos tenho amanhã?”;
- “Quantas consultas tenho amanhã de manhã?”;
- “Quais são meus atendimentos da manhã?”.

## Segurança e domínio

- somente telefone com acesso persistido ativo pode consultar;
- profissional recebe apenas sua agenda vinculada;
- gestor consulta o escopo da empresa;
- datas são calculadas no fuso configurado da empresa;
- apenas bookings oficiais PENDING ou CONFIRMED são considerados;
- pedidos de clientes, como “quero agendar amanhã”, não são classificados como consulta administrativa;
- a operação é somente leitura.

## Limites

A contagem usa a mesma leitura limitada a 20 itens da consulta diária. Portanto, esta entrega é adequada ao piloto controlado, mas não deve ser apresentada como total ilimitado para agendas com mais de 20 atendimentos no período. Uma contagem agregada no banco deve ser criada antes de ampliar esse limite.
