# Workflow n8n do onboarding comercial

O arquivo `commercial-onboarding-runtime.json` é a definição versionada do
workflow dedicado que recebe solicitações da outbox e chama o runtime interno do
SISAG. Nenhum segredo é armazenado no repositório.

## Credenciais necessárias

Após importar o workflow no n8n, associe duas credenciais do tipo **Header Auth**:

1. `SISAG Commercial Onboarding Webhook`
   - Header: `authorization`
   - Valor: `Bearer <segredo exclusivo compartilhado com o dispatcher>`.
2. `SISAG Internal API`
   - Header: `x-platform-internal-secret`
   - Valor: o segredo interno do SISAG.

Substitua as associações marcadas por `REPLACE_WITH_...` durante a importação.
O valor de nenhuma credencial deve ser inserido no JSON.

## Endpoint interno

O workflow usa a URL de produção literal porque o acesso a `$env` pode estar
desabilitado em instalações self-hosted do n8n.

O classificador também normaliza respostas que o n8n 2.26 entrega como stream.
Somente o corpo JSON é encaminhado ao webhook de resposta; propriedades internas
da conexão HTTP, cabeçalhos e credenciais são descartadas antes da serialização.

## Ativação

Antes de ativar, teste o workflow manualmente. Depois de ativado, o endpoint
será:

`https://n8n.flaience.com/webhook/sisag/commercial-onboarding/runtime`

Somente então configure no dispatcher:

- `N8N_COMMERCIAL_ONBOARDING_WEBHOOK_URL`
- `N8N_COMMERCIAL_ONBOARDING_WEBHOOK_SECRET`

Respostas recuperáveis do SISAG fazem o workflow falhar para que a outbox tente
novamente. Respostas definitivas são reconhecidas sem repetição infinita.

## Runner periódico do pós-ativação

O arquivo `commercial-post-activation-due-runner.json` agenda a verificação dos
marcos pós-ativação vencidos. Ele executa a cada 15 minutos e processa no máximo
25 onboardings concluídos por rodada.

Após importar, associe ao node **Run Due Milestones** uma credencial do tipo
**Header Auth**:

- Nome sugerido: `SISAG Internal API`;
- Header: `x-platform-internal-secret`;
- Valor: o segredo interno vigente do SISAG;
- Allowed HTTP Request Domains: `All` ou a URL completa do endpoint interno,
  conforme o comportamento da versão instalada do n8n.

O JSON contém apenas `REPLACE_WITH_SISAG_INTERNAL_CREDENTIAL_ID`; nenhum valor
de segredo deve ser inserido no arquivo versionado.

Antes de ativar:

1. associe a credencial interna ao node **Run Due Milestones**;
2. execute o workflow manualmente;
3. confirme que **Validate Runner Summary** termina sem erro;
4. confira no output os contadores `scanned`, `due`, `processed`, `waiting`,
   `completed`, `escalated`, `plansCompleted` e `failed`;
5. ative o workflow no n8n.

A execução falha quando a API rejeita a requisição ou quando algum onboarding
do lote termina em falha. Isso preserva visibilidade operacional no histórico do
n8n. Execuções bem-sucedidas não guardam payload completo, reduzindo retenção de
dados e ruído. O workflow é importado inativo e usa o fuso
`America/Sao_Paulo`.
