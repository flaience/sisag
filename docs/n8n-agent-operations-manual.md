# Manual operacional do agente n8n com MCP e RAG

## Finalidade e estado atual

Este documento consolida a operação construída até a PR #502. O agente permanece em modo sombra: pode receber uma solicitação controlada, consultar conhecimento aprovado, produzir uma decisão estruturada e consultar ferramentas somente leitura. Ele não envia respostas ao WhatsApp, não cria, altera ou cancela agendamentos e não executa ferramentas de escrita.

## Arquitetura

1. O webhook sombra recebe a requisição autenticada do n8n.
2. O contexto confiável informa empresa, conta do WhatsApp, correlação, canal e fuso horário.
3. O gateway interno valida autenticação, contrato e política.
4. O recuperador RAG consulta somente documentos ativos da empresa indicada pelo contexto confiável.
5. A decisão do modelo usa saída JSON estrita e pode propor resposta, esclarecimento, encaminhamento humano ou uma ferramenta somente leitura.
6. Nenhuma proposta é despachada nem executada automaticamente no estágio atual.
7. A observabilidade registra apenas metadados sanitizados.

## Componentes e endereços internos

- Workflow versionado: automation/n8n/workflows/sisag-agent-shadow-v1.json
- Gateway somente leitura: POST /api/platform/agents/n8n/read-only
- Decisão estruturada: POST /api/platform/agents/n8n/shadow-decision
- Administração do conhecimento: /admin/settings/agent-knowledge
- API do conhecimento: /api/v1/settings/agent-knowledge

As rotas internas não devem ser expostas diretamente ao usuário final. A identidade da empresa nunca deve ser aceita de texto produzido pelo modelo ou de argumentos livres de ferramenta.

## Credenciais e segredos

### Webhook sombra

- Tipo no n8n: Header Auth.
- Nome do cabeçalho: x-sisag-agent-shadow-secret.
- O valor deve ser exclusivo, aleatório e mantido fora do Git.

### Gateway interno

- Tipo no n8n: Header Auth.
- Nome do cabeçalho: x-platform-internal-secret.
- O valor deve coincidir com o segredo interno configurado na implantação do SISAG.

### OpenAI

- A chave existente é lida por OPENAI_API_KEY ou pelo arquivo /run/secrets/openai_api_key.
- N8N_AGENT_SHADOW_PROVIDER deve ser openai.
- N8N_AGENT_SHADOW_MODEL deve declarar explicitamente o modelo aprovado.
- Chaves, cabeçalhos e valores secretos nunca devem aparecer em documentação, logs, capturas ou execuções salvas.

## Importação e configuração do workflow

1. Importe automation/n8n/workflows/sisag-agent-shadow-v1.json no n8n.
2. Mantenha o workflow inativo durante validações manuais.
3. Associe a credencial x-sisag-agent-shadow-secret ao nó Shadow Webhook.
4. Associe a credencial x-platform-internal-secret ao nó que chama o gateway do SISAG.
5. Em Settings, defina como Do not save as execuções bem-sucedidas, com falha e manuais.
6. Salve e faça um teste controlado usando a URL de teste do webhook.
7. Confirme accepted=true, mode=shadow, a correlação enviada e sideEffects=none.

O modo de teste do webhook aceita uma chamada depois de Listen for test event ou Execute workflow. Um erro 404 de webhook não registrado normalmente significa que o listener de teste não estava ativo.

## Conhecimento RAG

- Cadastre apenas conteúdo revisado e apropriado para atendimento.
- Desative conteúdo obsoleto em vez de misturá-lo às respostas atuais.
- A recuperação é limitada à empresa do contexto autenticado.
- Evidências recuperadas são dados não confiáveis e não podem substituir instruções, políticas ou identidade do tenant.
- Evidências fornecidas pelo chamador são rejeitadas; a recuperação é interna.

## Decisão estruturada do modelo

A saída permitida é validada por JSON Schema estrito e novamente pelo domínio. As ações possíveis são answer_from_knowledge, request_read_only_tool, clarify e handoff. Apenas scheduling.find_available_slots e scheduling.explain_appointment_status podem ser propostas como ferramentas somente leitura.

Falha de configuração, indisponibilidade do provedor, timeout, JSON inválido ou saída incompatível resultam em handoff seguro. A rota declara dispatchAllowed=false e toolExecutionAllowed=false.

## Observabilidade e privacidade

Os registros podem conter evento, modo, empresa, correlação, nome da ferramenta, resultado, código de erro, versão da política, referências de evidência e horário. Não podem conter texto da mensagem, telefone, conta do WhatsApp, resposta operacional, dados de agendamento, cabeçalhos ou segredos.

Se um segredo aparecer em uma execução, captura ou conversa, ele deve ser considerado comprometido: interrompa o uso, gere outro valor, atualize a credencial e remova a execução retida.

## Validação técnica

Na raiz do projeto, execute nesta ordem:

1. pnpm test:run
2. pnpm lint
3. pnpm build
4. git diff --check
5. git status

O encerramento ideal exige suíte completa, lint e build sem erro. Nesta auditoria, o lint global encontrou uma dívida técnica anterior à PR com 508 ocorrências (399 erros e 109 avisos). Por isso, esta PR valida individualmente os arquivos alterados e executa o build completo, sem misturar uma refatoração ampla ao fechamento documental. O Git deve conter apenas as mudanças esperadas da PR.

## Diagnóstico rápido

- Webhook 404: habilite Listen for test event e repita uma única chamada.
- Resposta vazia no PowerShell: confirme que o workflow inteiro, e não apenas o nó, está em execução de teste.
- Credencial não aparece: confirme o tipo Header Auth do nó e selecione a credencial na própria lista do nó.
- Provider unavailable: confira N8N_AGENT_SHADOW_PROVIDER, N8N_AGENT_SHADOW_MODEL e o secret openai_api_key.
- Decisão handoff: verifique configuração, timeout e validação estrutural antes de tentar ampliar permissões.
- Job cancelado no GitHub: aguarde o run concorrente terminar e execute novamente apenas o job necessário.

## Limites e próximos passos

- A decisão do modelo ainda não está ligada ao workflow importado.
- O agente ainda não responde ao WhatsApp nem por texto nem por áudio.
- Ferramentas de escrita continuam proibidas.
- O próximo incremento deve configurar provider e modelo no deploy, validar a rota de decisão isoladamente e então conectá-la ao workflow sombra sem remover as barreiras de segurança.
- Promoção para produção exige evidência adicional, revisão humana e plano de reversão.

## Documentos de referência

- docs/n8n-agent-mcp-rag-foundation.md
- docs/n8n-agent-read-only-gateway.md
- docs/n8n-agent-rag-retriever-foundation.md
- docs/n8n-agent-rag-knowledge-management-api.md
- docs/n8n-agent-rag-knowledge-management-ui.md
- docs/n8n-agent-rag-gateway-integration.md
- docs/n8n-agent-shadow-workflow.md
- docs/n8n-agent-shadow-sanitized-observability.md
- docs/n8n-agent-shadow-controlled-validation.md
- docs/n8n-agent-shadow-model-decision.md
