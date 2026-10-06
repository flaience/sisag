# Integração do RAG ao gateway do agente n8n

## Resultado

O gateway interno somente leitura passa a recuperar diretamente do banco as referências relevantes para o texto recebido. O chamador não envia mais evidências RAG e, portanto, não pode escolher documentos, versões, hashes ou outra empresa.

## Fluxo

1. O gateway valida o envelope confiável e a ferramenta permitida.
2. Usa exclusivamente companyId e texto da mensagem do envelope validado.
3. O recuperador seleciona documentos do escopo WhatsApp, aprovados, válidos e da mesma empresa.
4. O gateway valida novamente o vínculo da evidência com a empresa.
5. A ferramenta somente leitura é executada.
6. A resposta inclui documento, versão, hash, título e trecho utilizados.

Falhas de recuperação são sanitizadas e impedem a execução da ferramenta.

## Limites preservados

O workflow n8n permanece inativo. Esta entrega não chama modelo de IA, não envia mensagens, não cria embeddings e não habilita nenhuma mutação de agenda.
