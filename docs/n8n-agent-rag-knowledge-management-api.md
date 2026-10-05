# Administração autenticada do conhecimento RAG

## Resultado

Owners e administradores podem listar documentos da própria empresa, criar novas versões em rascunho e executar as transições explícitas de aprovação e retirada.

## Garantias

- empresa e ator são derivados da sessão autenticada;
- documentos novos sempre começam como `draft`;
- cada versão recebe hash SHA-256 e registro de auditoria;
- somente `draft → approved` e `approved → retired` são aceitos;
- toda consulta e mutação inclui empresa e escopo `whatsapp`;
- o cliente da API não pode escolher diretamente estado, empresa, versão ou hash.

## Endpoints

- `GET /api/v1/settings/agent-knowledge`;
- `POST /api/v1/settings/agent-knowledge`;
- `POST /api/v1/settings/agent-knowledge/{id}/status`.

## Limites

Esta entrega não inclui interface visual, ingestão automática, embeddings, workflow n8n, chamada a modelo ou envio de mensagens. Aprovação continua sendo uma ação humana autenticada.

## Próxima etapa

Criar a interface administrativa sobre esta API e então integrar o recuperador ao gateway somente leitura.
