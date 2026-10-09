# Integração controlada do workflow sombra

## Escopo

Esta etapa conecta mensagens de texto recebidas pelo webhook oficial da Meta ao workflow **SISAG Agent Shadow v2**, sem substituir o atendimento atual. A chamada ocorre no ciclo posterior à resposta HTTP, é limitada a cinco segundos e qualquer falha do n8n é absorvida sem alterar a resposta ao cliente.

O espelhamento é opt-in por N8N_AGENT_SHADOW_MIRROR_ENABLED=true. A URL e o segredo são configuração de produção; o segredo é lido exclusivamente de arquivo e enviado no header x-sisag-agent-shadow-secret. Nenhum valor de segredo, header, texto ou telefone é registrado em log por este adaptador.

## Limites preservados

- O fluxo corrente do AssistantWhatsAppService continua sendo a autoridade operacional.
- O agente sombra não envia WhatsApp, não cria nem altera agendamentos e não executa ferramentas.
- Evidências RAG não são aceitas do chamador; permanecem sob recuperação interna.
- O áudio permanece fora desta etapa e somente poderá ser espelhado depois da transcrição autorizada e persistida.
- A integração permanece desativada até o segredo dedicado estar provisionado no Docker Swarm.

## Ativação posterior

Provisionar o segredo dedicado no Swarm, anexá-lo ao frontend e configurar a URL de produção do webhook v2. Só então habilitar N8N_AGENT_SHADOW_MIRROR_ENABLED=true em uma PR específica de ativação e validar que o atendimento atual e a resposta sombra permanecem independentes.
