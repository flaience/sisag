# Recuperador RAG geral do agente n8n

## Resultado

Esta entrega cria uma fonte de conhecimento geral separada do domínio de recovery e um recuperador lexical determinístico para o futuro agente n8n.

## Governança

Cada documento pertence a uma empresa e a um escopo, possui origem, versão, hash, estado, validade e trilha de auditoria. RLS é habilitada e nenhum documento entra diretamente como aprovado por padrão.

O recuperador consulta somente documentos `approved`, do escopo `whatsapp`, válidos no instante da consulta e pertencentes à empresa confiável do envelope.

## Limites

A busca considera no máximo 50 candidatos, retorna até cinco evidências e limita cada trecho a 1.200 caracteres. O conteúdo recuperado é referência não privilegiada; não pode redefinir identidade, autorização ou política de ferramentas.

## Fora desta etapa

Não há embeddings, chamada a modelo, ingestão automática, workflow ativo, envio de mensagem ou mutação operacional. O SQL precisa ser aplicado explicitamente antes da integração do recuperador ao gateway.

## Próxima etapa

Criar a administração autenticada de documentos e o fluxo explícito rascunho → aprovação → retirada. Depois integrar a recuperação ao gateway somente leitura e versionar o primeiro workflow n8n inativo.
