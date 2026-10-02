# Consulta da agenda da equipe por data específica

Atualizado em 02/10/2026.

## Objetivo

Permitir consultas administrativas para um dia da semana ou dia do mês, além de hoje e amanhã, reutilizando a interpretação de datas em português já consolidada no agendamento.

## Exemplos

- “Como está minha agenda segunda-feira?”;
- “Quantos atendimentos tenho dia cinco?”;
- “Quantos atendimentos tenho dia cinco à tarde?”;
- “Quais são meus atendimentos na próxima terça?”.

## Garantias

- exige uma expressão administrativa como “minha agenda” ou “atendimentos tenho”;
- não captura pedidos comuns de criação de agendamento;
- resolve a data no fuso configurado da empresa;
- usa a mesma regra de datas faladas do fluxo do cliente;
- exibe a data resolvida em formato brasileiro;
- preserva autorização persistida, empresa, profissional, turno, contagem agregada e limite da listagem detalhada;
- falha sem consultar a data errada quando uma expressão marcada não pode ser resolvida.

## Limites

Esta etapa cobre dias da semana e expressões “dia N”, inclusive números falados. Intervalos como “esta semana” e datas com mês explícito permanecem fora do escopo.
