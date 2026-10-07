# Workflow sombra do agente n8n

## Resultado

O repositório passa a versionar o workflow importável SISAG Agent Shadow v1 em automation/n8n/workflows/sisag-agent-shadow-v1.json. Ele nasce com active=false e registra execuções bem-sucedidas e com erro para observabilidade.

## Fluxo controlado

1. Um webhook técnico recebe request e toolCall.
2. A entrada rejeita evidências fornecidas pelo chamador.
3. O workflow chama exclusivamente /api/platform/agents/n8n/read-only.
4. O resultado e as evidências recuperadas pelo SISAG ficam no histórico da execução.
5. O webhook devolve apenas uma confirmação técnica de modo sombra e ausência de efeitos colaterais.

## Credenciais após a importação

Configure duas credenciais distintas no n8n:

- entrada: Header Auth exclusiva para proteger o webhook sombra;
- saída: Header Auth com o cabeçalho x-platform-internal-secret e o segredo interno do SISAG.

Nenhum valor secreto existe no arquivo versionado. Antes de configurar URL, credenciais e origem controlada de eventos, não ativar o workflow.

## Limites

Esta versão não chama modelo, não envia WhatsApp, não altera agenda e não substitui o processamento atual. Ela existe para validar conexão, RAG, ferramentas somente leitura, correlação e histórico operacional antes de qualquer ativação assistida.
