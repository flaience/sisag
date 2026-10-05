# Administração do conhecimento RAG do agente

## Objetivo

Disponibilizar uma interface autenticada para proprietários e administradores governarem os documentos gerais usados pelo agente n8n no canal WhatsApp.

## Localização

- Configurações → Conhecimento do agente WhatsApp
- rota autenticada: /admin/settings/agent-knowledge
- API: /api/v1/settings/agent-knowledge

## Fluxo seguro

1. O administrador informa tipo e referência da origem, título, conteúdo e validade opcional.
2. O documento é criado exclusivamente como draft.
3. A interface apresenta origem, versão, validade e hash SHA-256 para revisão.
4. A aprovação exige confirmação explícita e muda draft para approved.
5. A retirada exige confirmação explícita e muda approved para retired.

Criar ou editar conhecimento não o aprova automaticamente. O recuperador continua limitado a documentos aprovados, válidos, do escopo whatsapp e da mesma empresa.

## Limites desta entrega

- não ativa workflow no n8n;
- não escolhe modelo de IA;
- não habilita mutações de agenda;
- não envia mensagens ao WhatsApp;
- não cria embeddings.

Esta tela governa a fonte de conhecimento que será integrada ao gateway em uma etapa posterior.
