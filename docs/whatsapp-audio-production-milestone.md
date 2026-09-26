# Marco de produção — comandos de voz pelo WhatsApp

Atualizado em 25/09/2026. Este documento registra o primeiro percurso real de áudio do WhatsApp validado ponta a ponta no SISAG. Ele é fonte operacional e histórica; não contém credenciais, telefones, IDs de tenant nem IDs completos de mensagens.

## Resultado demonstrado

Um usuário enviou um áudio curto dizendo “Ajuda” ao número oficial. O SISAG recebeu a mensagem, persistiu a identidade, baixou a mídia autorizada da Meta, transcreveu pela OpenAI, encaminhou o texto ao assistente, publicou a resposta na outbox e entregou uma única mensagem de volta ao WhatsApp.

Evidência observada:

- processamento: completed;
- tentativas de transcrição: 1;
- tentativas de despacho: 1;
- política: whatsapp_audio_v1;
- transcrição: “Ajuda”;
- erros de processamento e despacho: nulos;
- outbox: exatamente 1 resposta, status done;
- resposta confirmada pelo operador no WhatsApp;
- suíte do marco: 464 arquivos e 2.269 testes aprovados, além do build de produção.

Isso demonstra o percurso de ajuda por voz. Não certifica ainda todos os sotaques, ruídos, formatos, idiomas, intenções, custos, concorrência em escala ou ações administrativas por voz.

## Arquitetura efetiva

~~~text
WhatsApp/Meta webhook
  → recibo inbound durável e deduplicado
  → fila whatsapp_audio_processing
  → runner privado autenticado
  → lease de processamento
  → metadados e download autorizado Meta Graph v25.0
  → transcrição OpenAI gpt-4o-mini-transcribe
  → transcript persistido
  → lease independente de despacho
  → AssistantWhatsAppService
  → transação de conversa e regras do domínio
  → evento whatsapp.send.requested na outbox
  → dispatcher Meta
  → resposta textual no WhatsApp
~~~

Princípios preservados:

- webhook não baixa mídia nem chama modelo durante a requisição pública;
- mídia é resolvida somente por media_id da Meta, nunca por URL do usuário;
- binário de áudio não é persistido pelo SISAG;
- tenant e conta vêm de contexto confiável;
- transcrição é dado não confiável e passa pelas regras do domínio;
- resposta e comandos usam a identidade original da mensagem;
- repetição após queda consulta evidência transacional e não duplica resposta;
- ações críticas continuam exigindo confirmação explícita;
- disponibilidade e reservas vêm do núcleo oficial, não do modelo ou de RAG.

## Componentes e responsabilidades

| Componente | Responsabilidade |
|---|---|
| MetaWhatsAppInboundMessage | Validar e normalizar identidade mínima do payload |
| webhook Meta | Persistir recibo e enfileirar; responder rapidamente |
| WhatsAppAudioProcessingService | Estados, leases e até três tentativas de transcrição |
| MetaWhatsAppMediaDownloader | Resolver e baixar somente mídia Meta autorizada e limitada |
| OpenAIAudioTranscriber | Enviar multipart ao endpoint fixo de transcrição |
| WhatsAppAudioProcessingWorker | Selecionar trabalho e resolver configuração por tenant |
| WhatsAppAudioTranscriptDispatchService | Despachar transcript concluído com lease e idempotência |
| AssistantWhatsAppService | Interpretar dentro da sessão e aplicar regras operacionais |
| Outbox | Registrar e entregar uma única resposta correlacionada |
| scheduling-automation-runner | Executar um áudio por ciclo com timeout isolado de 55 segundos |

## Segurança e configuração

Credenciais não ficam no banco, Git, payload, logs ou variáveis expostas. A conta Meta guarda apenas referências:

~~~json
{
  "audioProcessing": {
    "metaAccessTokenSecret": "wa_cloud_token_prod",
    "openAIApiKeySecret": "openai_api_key",
    "openAIModel": "gpt-4o-mini-transcribe",
    "metaGraphVersion": "v25.0"
  }
}
~~~

Os valores reais são Docker Secrets montados em /run/secrets somente no frontend. O deploy falha se os dois nomes obrigatórios não existirem. Nunca incluir o conteúdo desses arquivos em diagnóstico, print, documentação ou suporte.

## Persistência e recuperação

A tabela whatsapp_audio_processing registra identidade, estado, tentativas, transcript, política, erros sanitizados, conclusão e despacho. Há dois leases independentes:

1. processamento protege download/transcrição;
2. despacho protege a chamada ao assistente.

Falha transitória retorna o item ao ciclo até o limite. Falha terminal preserva evidência. Se o assistente confirmar a resposta e o worker cair antes de marcar dispatched_at, a repetição usa provider_message_id como correlationId; a outbox já comprometida prova que a conversa foi processada e impede novo comando ou nova resposta.

## Incidente encontrado durante a ativação

O primeiro áudio falhou após três tentativas. Meta metadata e download retornaram HTTP 200. A sonda da OpenAI revelou que o Docker Secret continha texto de um comando shell, não uma API key. Causa operacional: conteúdo incorreto colado em um prompt invisível.

Recuperação aplicada:

1. runner escalado temporariamente para zero;
2. secret inválido desconectado do frontend e removido;
3. nova chave criada e validada pelo prefixo sem ser exibida;
4. secret recriado e montado após convergência 2/2;
5. autenticação OpenAI validada com HTTP 200 e modelo visível;
6. runner restaurado para 1/1;
7. novo áudio executado com sucesso na primeira tentativa.

Aprendizado: nunca colar um bloco inteiro em read -s. Executar primeiro o comando de leitura, colar somente o valor no prompt e validar apenas prefixo/tamanho. Em dúvida, revogar e rotacionar a chave.

## Runbook de diagnóstico

Ordem segura:

1. verificar frontend 2/2 e runner 1/1;
2. conferir somente os nomes dos secrets montados;
3. procurar whatsapp-audio com ok:true no ciclo do runner;
4. consultar status, attempts, error_code e timestamps do item;
5. testar metadata/download Meta sem mostrar token;
6. testar autenticação e visibilidade do modelo OpenAI sem transcrever;
7. nunca redefinir manualmente tentativas nem apagar a evidência original;
8. após correção, usar uma nova mensagem simples e não destrutiva;
9. confirmar completed, dispatched_at e uma única outbox done.

Interpretação rápida:

| Estado | Leitura |
|---|---|
| pending / attempts 0 | aguardando worker ou configuração não resolvida |
| processing | lease ativo; observar expiração antes de intervir |
| failed / attempts 3 | falha terminal preservada; diagnosticar providers |
| completed / dispatched_at nulo | transcrito; despacho ainda pendente |
| completed / dispatched_at preenchido | entregue ao fluxo do assistente |

## Histórico de entrega

| PR | Marco |
|---|---|
| #426 | escolha transacional de horário pelo WhatsApp |
| #427 | contratos de áudio e interpretação estruturada |
| #428 | download autenticado de mídia Meta |
| #429 | ingestão durável de áudio no webhook |
| #430 | orquestração de download |
| #431 | adaptador isolado de transcrição OpenAI |
| #432 | ciclo durável de processamento |
| #433 | runner isolado com tentativas controladas |
| #434 | enqueue durável pelo webhook |
| #435 | resolução tenant-scoped de Docker Secrets |
| #436 | worker interno limitado |
| #437 | deploy, secrets, modelo e Meta Graph v25.0 |
| #438 | despacho idempotente da transcrição ao assistente |
| #439 | auditoria de prontidão e correção de lote/timeout |

## Limites atuais e próximos marcos

Demonstrado agora: comando de voz curto, transcrição real, intenção de ajuda, resposta textual única e recuperação operacional.

Ainda não demonstrado:

- resposta sintetizada em áudio;
- interpretação por modelo conversacional ativa no caminho de negócio;
- RAG de conhecimento institucional no percurso de áudio;
- transporte MCP executável para ferramentas do assistente;
- orquestração n8n desse percurso;
- comandos de gestor/profissional, métricas e cancelamento em lote por voz;
- carga, custos, observabilidade e qualidade em volume de produção.

Próxima evolução segura: ampliar gradualmente os cenários não destrutivos, medir qualidade/custo/latência e só então validar propostas de agendamento. Operações administrativas por voz devem usar autenticação de papel, escopo explícito, prévia do impacto, confirmação humana, auditoria e limites de lote.
