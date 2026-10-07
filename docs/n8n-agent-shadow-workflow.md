# Workflow sombra do agente n8n

## Resultado

O repositório passa a versionar o workflow importável SISAG Agent Shadow v1 em automation/n8n/workflows/sisag-agent-shadow-v1.json. Ele nasce com active=false e não persiste payloads de execução; a observabilidade sanitizada é emitida pelo gateway do SISAG.

## Fluxo controlado

1. Um webhook técnico recebe request e toolCall.
2. A entrada rejeita evidências fornecidas pelo chamador.
3. O workflow chama exclusivamente /api/platform/agents/n8n/read-only.
4. O resultado é processado de forma efêmera; o SISAG registra somente correlação, ferramenta, resultado e referências imutáveis das evidências.
5. O webhook devolve apenas uma confirmação técnica de modo sombra e ausência de efeitos colaterais.

## Credenciais após a importação

Configure duas credenciais distintas no n8n:

- entrada: Header Auth exclusiva para proteger o webhook sombra;
- saída: Header Auth com o cabeçalho x-platform-internal-secret e o segredo interno do SISAG.

Nenhum valor secreto existe no arquivo versionado. Antes de configurar URL, credenciais e origem controlada de eventos, não ativar o workflow.

## Limites

Esta versão não chama modelo, não envia WhatsApp, não altera agenda e não substitui o processamento atual. Ela existe para validar conexão, RAG, ferramentas somente leitura, correlação e observabilidade sanitizada antes de qualquer ativação assistida.

## Validação em produção de 07/10/2026

Importação, credenciais separadas, UTF-8, execução dos cinco nós e ausência de retenção foram comprovadas. O workflow permanece inativo. Consulte docs/n8n-agent-shadow-controlled-validation.md.
