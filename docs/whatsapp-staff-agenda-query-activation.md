# Ativação controlada da consulta administrativa pelo WhatsApp

## Fluxo

1. A mensagem precisa corresponder a uma consulta administrativa conhecida.
2. O número precisa constar exatamente uma vez em `provider_config.staffAgenda.authorizedSenders`.
3. A conta WhatsApp precisa ser a única conta ativa da empresa.
4. Profissionais precisam estar ativos e vinculados à mesma empresa.
5. Somente então o leitor oficial consulta a agenda e publica a resposta.

O fluxo ocorre antes de resolver ou criar um cliente. Mensagens comuns e números não autorizados continuam no fluxo existente e não recebem pistas sobre dados administrativos.

## Respostas iniciais

- agenda do período, limitada a dez linhas visíveis por mensagem;
- próximo atendimento;
- resposta explícita quando não há atendimento;
- resposta temporária e neutra se a leitura falhar.

## Configuração de produção

A funcionalidade permanece efetivamente fechada até gravarmos `staffAgenda.enabled: true` e o telefone E.164 autorizado no `provider_config` da conta ativa. Essa configuração deve ser feita com preservação das demais chaves JSON existentes.
