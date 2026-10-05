# Fundação do agente n8n com MCP e RAG

## Objetivo

Definir o primeiro contrato seguro para um agente orquestrado pelo n8n, reutilizando o domínio oficial do SISAG sem criar agenda, conhecimento ou identidade paralelos.

## Inventário reutilizável

- o SISAG já possui catálogo de operações MCP de scheduling e adaptador para disponibilidade e bookings;
- rotas internas usam segredo de plataforma e contexto operacional;
- existe governança de documentos aprovados, versões, hashes, auditoria e recuperação vetorial no domínio de recovery;
- existem workflows n8n versionados para onboarding comercial, mas ainda não um agente conversacional do WhatsApp.

A infraestrutura de recovery serve como referência de governança. Seu escopo não deve ser reutilizado como base geral do WhatsApp sem um contrato próprio por empresa e finalidade.

## Contrato inicial

O SISAG entrega ao n8n um envelope estrito com empresa, conta WhatsApp, remetente, correlação, instante, fuso e mensagem. Esses campos vêm do runtime confiável; o modelo não escolhe a empresa nem redefine a identidade.

O RAG aceita no máximo oito evidências aprovadas, versionadas, identificadas por hash e pertencentes à mesma empresa. Conteúdo recuperado é dado de contexto, nunca instrução privilegiada.

## MCP nesta etapa

Somente consultas de disponibilidade e explicação de status entram na lista inicial. Criar, confirmar, cancelar e reagendar permanecem desabilitados até existir gateway autenticado, auditoria persistida, idempotência e confirmação explícita comprovada.

## Limites desta entrega

Nenhum workflow é ativado, nenhum segredo é versionado, nenhum provedor é chamado, nenhuma mensagem é enviada e nenhum booking é alterado. Esta entrega fecha apenas contrato, política e testes de fronteira.

## Próxima etapa

Criar o gateway interno somente leitura que monte o contexto confiável, recupere conhecimento aprovado no escopo correto e exponha ao n8n apenas as ferramentas permitidas. Depois, versionar um workflow inativo para teste manual.
