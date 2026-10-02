# Resumo diário da agenda da equipe — validação em produção

Atualizado em 02/10/2026.

## Marco

O resumo diário da agenda pelo WhatsApp foi validado em produção após o PR #475, usando um telefone de gestor autorizado e agendamentos oficiais do SISAG.

## Cenários confirmados

As seguintes solicitações retornaram corretamente:

1. “Como está minha agenda amanhã?” — listou a agenda oficial do dia seguinte;
2. “Quantos atendimentos tenho amanhã?” — informou o total do dia;
3. “Quantas consultas tenho amanhã de manhã?” — informou somente o total da manhã;
4. “Quantos atendimentos tenho amanhã à tarde?” — informou somente o total da tarde.

Também foi enviado “Quero agendar amanhã às dez horas”. O novo agendamento funcionou, confirmando que um pedido de cliente não é confundido com consulta administrativa da equipe.

## Garantias demonstradas

- acesso administrativo depende de registro persistido ativo;
- empresa vem da conta WhatsApp receptora;
- datas relativas são calculadas no fuso configurado da empresa;
- manhã e tarde usam intervalos separados;
- listagem e contagem consultam bookings oficiais;
- consultas são somente leitura;
- o fluxo comum de criação de agendamento permanece independente.

## Gates reportados

- 5 arquivos de teste;
- 20 testes aprovados;
- build de produção aprovado;
- Build & Deploy do PR #475 consolidado.

## Limite conhecido

A implementação atual carrega no máximo 20 atendimentos por período. Assim, a resposta de contagem é adequada ao piloto controlado, mas pode ser truncada em agendas com mais de 20 itens. Antes de ampliar o volume operacional, a contagem deve ser agregada diretamente no banco e a listagem deve indicar explicitamente quando houver paginação ou truncamento.

## Continuidade

O próximo incremento recomendado é separar no read model a contagem agregada da listagem detalhada, preservando a mesma autorização, o mesmo escopo por empresa/profissional e o mesmo cálculo de fuso horário.
