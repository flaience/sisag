# Ativação do modelo sombra no workflow de produção

## Resultado esperado

O frontend passa a espelhar mensagens de texto recebidas da Meta para a URL publicada do SISAG Agent Shadow v2. O espelhamento não substitui o atendimento corrente: o AssistantWhatsAppService continua sendo a autoridade e a execução paralela permanece com sideEffects=none.

## Segurança

- O segredo exclusivo do webhook entra pelo GitHub Actions e é materializado como Docker Secret n8n_agent_shadow_webhook_secret_v1.
- O frontend recebe somente o caminho /run/secrets/n8n_agent_shadow_webhook_secret_v1.
- O valor não é impresso, não é armazenado no repositório e não é reutilizado como segredo interno do SISAG.
- A URL é HTTPS, fixa e aponta apenas para o webhook publicado do workflow v2.
- Falhas, timeout ou indisponibilidade do n8n não interrompem o atendimento atual.

## Reversão

A desativação imediata é feita atualizando N8N_AGENT_SHADOW_MIRROR_ENABLED=false no serviço do frontend. Isso interrompe novas chamadas sem remover o workflow, o Docker Secret ou o processamento atual do WhatsApp.

## Validação

Após o deploy, enviar uma mensagem de texto controlada pelo WhatsApp e confirmar simultaneamente: resposta normal do fluxo atual, execução sombra no n8n sem retenção de payload e ausência de ações externas originadas pelo agente.
