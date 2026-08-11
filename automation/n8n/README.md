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

## Ativação

Antes de ativar, teste o workflow manualmente. Depois de ativado, o endpoint
será:

`https://n8n.flaience.com/webhook/sisag/commercial-onboarding/runtime`

Somente então configure no dispatcher:

- `N8N_COMMERCIAL_ONBOARDING_WEBHOOK_URL`
- `N8N_COMMERCIAL_ONBOARDING_WEBHOOK_SECRET`

Respostas recuperáveis do SISAG fazem o workflow falhar para que a outbox tente
novamente. Respostas definitivas são reconhecidas sem repetição infinita.
