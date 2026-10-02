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

## Validação em produção

Em 02/10/2026, após o PR #475, o gestor autorizado recebeu respostas corretas para agenda completa de amanhã, quantidade total, quantidade da manhã e quantidade da tarde. Um novo pedido de agendamento para amanhã também seguiu corretamente o fluxo do cliente, demonstrando que os dois intentos permanecem separados.

Evidências consolidadas em `docs/whatsapp-staff-agenda-daily-summary-validation.md`.

## Evolução da contagem

A limitação inicial de 20 itens foi removida na entrega seguinte. Perguntas de quantidade usam agora uma agregação no banco; a listagem detalhada continua limitada para manter mensagens legíveis no WhatsApp.
