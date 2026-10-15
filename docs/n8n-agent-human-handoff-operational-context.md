# Contexto operacional do encaminhamento humano

## Objetivo

A fila administrativa passa a identificar o cliente e oferece um atalho de contato depois que o próprio operador assume o atendimento.

## Privacidade e isolamento

- A tabela de encaminhamentos continua contendo somente metadados sanitizados.
- O telefone é resolvido no momento da leitura pelo registro oficial de entrada, com empresa, conta WhatsApp e correlação verificadas em conjunto.
- O nome é obtido do cadastro de clientes da mesma empresa.
- O conteúdo da mensagem não é consultado nem retornado pela API.
- A tela mostra somente os quatro últimos dígitos; o contato completo é usado apenas no link autenticado.
- O botão de contato aparece somente para o operador que assumiu o encaminhamento.

## Ativação

Esta entrega não adiciona a flag de encaminhamento ao deploy e não ativa o roteamento em produção. Ela prepara a operação para uma ativação posterior e controlada.
