# IA-01 — decisão local de integração do piloto

22/09/2026. Leitura de código; sem teste de provedores, acesso a produção ou alterações no repositório. Complementa SISAG-plano-execucao-IA.md e a missão original. Decisão proposta para implementação, não aplicada ao ambiente.

## Decisão

Evoluir AssistantWhatsAppService como ponto de entrada do piloto. Não ativar ConversationEngine como atalho e não promover o experimento scheduling-choice a terceiro motor. Separar interpretação, áudio e conhecimento em adaptadores, mantendo uma sessão e uma autoridade de execução por conversa.

A escolha é baseada no código, não em confirmação da variável produtiva WHATSAPP_INBOUND_ENGINE. Antes de mudar comportamento externo, conferir a configuração efetiva e vínculo phone_number_id/empresa em consulta sanitizada autorizada.

## Matriz de reaproveitamento

| Peça | Evidência observada | Decisão |
|---|---|---|
| Webhook Meta | src/app/api/v1/whatsapp/webhook/route.ts seleciona assistant por padrão e ignora tipos não textuais | Evoluir a entrada existente para áudio; proteger autenticidade, identidade e recuperação antes de habilitar |
| Assistant | src/modules/assistant/AssistantWhatsApp.service.ts usa sessão, listServiceLedAvailability, executeBookingCommand e confirmação | Reaproveitar o caminho; substituir limitações do intérprete e adicionar catálogo/opções persistidas |
| Saída assistant | publishReply emite whatsapp.send.requested | Preservar ligação ao dispatcher validado |
| ConversationEngine | enqueueReply emite whatsapp.send_text; depende de serviceId e tem outro caminho de sessão | Não selecionar como solução imediata; inventariar consumidores antes de retirada futura |
| MCP | mcp-tools.ts descreve nomes, riscos e políticas; busca em src/package.json não encontrou McpServer, tools/call ou SDK modelcontextprotocol | Existe preparação de contrato, não comprovação de transporte MCP executável. Implementar ponte real e testes de chamada; não rotular chamadas locais como MCP pronto |
| Adaptador de capabilities | sisag-scheduling-adapter.ts cria via BookingCoreService.createAuto, enquanto assistant usa executeBookingCommand | Unificar caminho de criação/identidade/idempotência antes de permitir que agente escreva via ferramenta |
| Confirmação | agent-operations.ts marca criação como recommended; mcp-tools.ts requiresConfirmation=false | Exigir confirmação de proposta no percurso piloto e alinhar política/validador/testes juntos; não confiar em booleano produzido pelo modelo |
| Conhecimento | RecoverySemanticRetriever filtra empresa, aprovação, validade e versão; há factories/providers de recuperação | Reutilizar princípios e interfaces após avaliação; corpus de recuperação não é automaticamente base de serviços da SEG SERRA |
| IA externa | factories RecoveryAgentProvider e RecoveryEmbeddingProvider dependem de configuração explícita | Não comprova interpretação conversacional ativa; configurar provedor do piloto separadamente, com limites e aprovação de uso |
| Áudio | Não foi encontrado adaptador de transcrição no conjunto src pesquisado; webhook só processa texto | Implementar download autorizado, validação de mídia, limite de tamanho/duração, transcrição e retenção mínima; não buscar URLs arbitrárias fornecidas pelo cliente |

## Caminho-alvo único

Webhook autenticado → recebimento durável/deduplicado → texto ou mídia autorizada/transcrição → sessão por empresa/cliente → interpretação estruturada + conhecimento aprovado → ferramentas controladas de catálogo/disponibilidade → proposta persistida → confirmação humana → comando oficial de reserva → resposta pela outbox → painel de bookings.

MCP é a interface de ferramentas; n8n coordena efeitos posteriores e encaminhamentos. Não duplicar confirmação/reserva em n8n. IA não recebe SQL arbitrário, identidade privilegiada do corpo nem disponibilidade vinda do RAG. Transcrição e documentos são dados não confiáveis, não instruções de sistema.

## Pacote de implementação seguinte

1. Cobrir a entrada e sessão com testes executáveis de duplicação, falha e mensagem simultânea; estabelecer recebimento durável antes de retornar sucesso. Uma linha de log não prova processamento concluído.
2. Alinhar o executor de ferramentas ao comando oficial, com empresa e cliente do contexto confiável; proposta/versionamento e confirmação vinculados aos parâmetros que serão gravados.
3. Adaptadores de interpretação, áudio e conhecimento com limites, resultados validados e substitutos offline. Testar integração completa sem depender de serviço pago para testar regras.
4. Persistir escolha, correção e confirmação no assistant. Reutilizar disponibilidade e catálogo reais do domínio.
5. Executar roteiro integral em homologação; depois autorizar mídia/provedor e um teste externo delimitado.

Limites: desenho de persistência do recebimento e serialização ainda deve ser fechado antes de codificar; nenhum cronograma fechado ou alegação de sistema completo. Não realizar migração em produção nesta etapa.

## Bloqueio de execução local

C:/sisag permanece fora dos caminhos com escrita autorizada nesta tarefa. A solicitação anterior não concedeu acesso. Não contornar. Para integração, abrir o projeto C:/sisag com acesso de escrita ou aplicar mudanças explicitamente revisadas pelo operador. Enquanto isso, entregas em bem são propostas/experimentos, não recursos instalados.

## Aceite desta investigação

Caminhos de entrada/saída comparados e incompatibilidade de evento documentada; diferenças de comando MCP e política de confirmação identificadas. Etapa de rastreamento local concluída no escopo inspecionado. Configuração em execução, provedor, base da SEG SERRA e transporte MCP continuam sem validação externa.

## Fundação de áudio e interpretação estruturada — após PR #426

- A entrada oficial permanece no AssistantWhatsAppService; nenhum terceiro motor foi criado.
- Mídia será obtida somente por media_id autorizado pelo provedor, nunca por URL arbitrária do payload.
- Política versionada limita MIME, tamanho, duração, idioma e tempo de transcrição.
- Interpretação recebe texto, fuso e data de referência explícitos e valida integralmente a saída de modelo.
- Adaptadores aceitam substitutos offline; esta entrega não configura, chama ou autoriza provedor externo.
- O webhook ainda não encaminha áudio. A ativação depende da escolha do provedor, credenciais aprovadas e testes do download autenticado.

## Download autenticado de mídia Meta — fundação local

- O adaptador resolve metadados apenas no Graph oficial e recebe o token por injeção.
- A URL devolvida pela Meta exige HTTPS, host autorizado, ausência de credenciais embutidas e porta padrão.
- Metadados, Content-Type, tamanho declarado e stream são limitados; redirecionamentos são recusados.
- Erros públicos são classificados sem incluir token, URL assinada, corpo da resposta ou detalhes internos.
- O webhook permanece desconectado do adaptador; não houve download real nem configuração de credencial.

## Fronteira de ingestão de áudio do WhatsApp

O webhook reconhece mensagens de áudio, valida identidade mínima da Meta e tenant, e persiste o recibo com providerMessageId, mediaId e estado pending_transcription. O recebimento não aciona download, transcrição, interpretação, reserva ou resposta. Áudio sem tenant ou metadados válidos é rejeitado antes de qualquer efeito externo.

## Orquestração isolada de download de áudio

A composição entre o downloader autenticado da Meta e o contrato limitado de transcrição recebe credencial e dependências explicitamente. Ela não consulta ambiente, banco ou tenant implicitamente, sanitiza falhas e permanece desconectada do webhook até existir resolução segura de credenciais e provedor.

## Adaptador de transcrição de áudio

O primeiro adaptador de transcrição usa o endpoint oficial de áudio da OpenAI por multipart, com host fixo, credencial e modelo explícitos, timeout limitado e respostas sanitizadas. O adaptador não consulta ambiente, banco ou tenant e permanece desconectado do webhook.

## Ciclo durável de processamento de áudio

Cada mensagem de áudio possui registro tenant-scoped e idempotente por providerMessageId. O processamento usa lease temporário, no máximo três tentativas, conclusão condicionada ao token adquirido e falhas sanitizadas. Áudio binário não é persistido e o ciclo permanece desconectado do webhook.

## Executor isolado de processamento de áudio

O executor valida credenciais antes de adquirir trabalho, reivindica um item por lease, compõe download e transcrição e finaliza usando o mesmo tenant e token. Falhas determinísticas são terminais; falhas transitórias retornam ao ciclo limitado de tentativas. O executor não está ligado ao webhook nem ao assistente.

## Enfileiramento de áudio no webhook

Após persistir o recibo, o webhook cria idempotentemente o item pending usando tenant, conta, providerMessageId e mediaId. Falha de persistência retorna 503 sanitizado para repetição segura. Download, transcrição e interpretação não ocorrem na requisição da Meta.

## Resolução segura de credenciais de áudio

A conta Meta ativa e pertencente ao tenant armazena somente referências em providerConfig.audioProcessing. O resolvedor aceita nomes restritos, lê exclusivamente /run/secrets, rejeita credenciais cruas e não expõe valores em logs, webhook ou respostas de erro.

## Worker em lote de áudio

O worker interno seleciona somente itens pending ou leases expirados abaixo do limite de tentativas, processa sequencialmente lotes de até 20 e resolve credenciais por conta/tenant. A resposta contém apenas métricas agregadas e a rota exige o segredo interno do SISAG.

## Ativação operacional do worker de áudio

O runner privado existente passa a chamar a rota interna de áudio. O deploy exige previamente os secrets wa_cloud_token_prod e openai_api_key e os monta idempotentemente apenas no frontend, sem convertê-los em variáveis de ambiente ou exibi-los em logs.
