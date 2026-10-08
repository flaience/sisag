# Configuração do modelo da decisão sombra no deploy

## Objetivo

Configurar explicitamente o provedor e o modelo usados pela rota interna de decisão estruturada, mantendo o workflow n8n desconectado e sem efeitos colaterais.

## Configuração

- N8N_AGENT_SHADOW_PROVIDER=openai
- N8N_AGENT_SHADOW_MODEL=gpt-6-luna
- N8N_AGENT_SHADOW_TIMEOUT_MS=8000
- chave da API: Docker Secret existente openai_api_key, montado em /run/secrets/openai_api_key

O modelo Luna foi selecionado para esta classificação estruturada e frequente por priorizar eficiência em tarefas delimitadas. A saída continua usando JSON Schema estrito na Responses API e passa novamente pela validação Zod do domínio.

## Segurança

- nenhuma chave é escrita no workflow, no código ou nas variáveis do serviço;
- o deploy falha se o Docker Secret obrigatório estiver ausente;
- a rota continua declarando dispatchAllowed=false e toolExecutionAllowed=false;
- falha de configuração, timeout ou erro do provedor produz handoff seguro;
- o workflow importado ainda não chama a rota de decisão.

## Implantação e reversão

O GitHub Actions aplica as três variáveis durante docker service update. A reversão ocorre pelo rollback normal da imagem e pela remoção ou troca explícita das variáveis do serviço. Nenhuma ativação do workflow n8n faz parte desta PR.

## Próxima validação

Depois da consolidação e do deploy, chamar a rota shadow-decision com autenticação interna e uma carga controlada. Confirmar resposta estruturada, mode=ai, provider=openai, modelo retornado, dispatchAllowed=false e toolExecutionAllowed=false. Não registrar mensagem, telefone, evidência integral ou segredo.
