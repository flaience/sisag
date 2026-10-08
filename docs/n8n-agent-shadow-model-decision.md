# Decisão estruturada do modelo para o agente sombra

## Objetivo

Introduzir uma fronteira interna para o modelo classificar solicitações do WhatsApp sem executar ações. A resposta segue JSON Schema estrito e pode apenas propor resposta baseada em conhecimento aprovado, ferramenta somente leitura, esclarecimento ou encaminhamento humano.

## Segurança

- autenticação interna obrigatória;
- empresa e mensagem vêm do envelope confiável;
- RAG é recuperado dentro do SISAG e tratado como dado não confiável;
- somente duas ferramentas de leitura podem ser mencionadas;
- saída inválida, erro ou provider ausente resultam em handoff fechado;
- chave OpenAI vem do Docker Secret openai_api_key;
- provider e modelo exigem configuração explícita;
- resposta declara dispatchAllowed=false e toolExecutionAllowed=false.

## Estado da implantação

Esta fundação não está ligada ao workflow importado. Ela não envia WhatsApp, não executa ferramentas e não altera agenda. A etapa seguinte deve configurar provider/modelo no deploy, validar a rota isoladamente e somente depois incluir um nó de decisão no workflow sombra.

## Contrato OpenAI

A integração reutiliza o provider de Responses já existente no SISAG e envia text.format com json_schema e strict=true. O resultado ainda passa pela validação Zod do domínio antes de ser aceito.

## Estado da implantação

O componente não está ligado ao workflow importado. Ela não envia WhatsApp, não executa ferramentas e não altera agenda. A etapa seguinte deve configurar o provedor e o modelo no deploy, validar a rota isoladamente e somente depois incluir um nó de decisão no workflow sombra.
