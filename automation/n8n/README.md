# Workflow n8n do onboarding comercial

O arquivo `commercial-onboarding-runtime.json` é a definição versionada do
workflow dedicado que recebe solicitações da outbox e chama o runtime interno do
SISAG. Nenhum segredo é armazenado no repositório.

## Credenciais necessárias

Após importar o workflow no n8n, associe duas credenciais do tipo **Header Auth**:

1. `SISAG Commercial Onboarding Webhook`
   - Header: `x-webhook-secret`
   - Valor: segredo exclusivo compartilhado com o dispatcher.
2. `SISAG Internal API`
   - Header: `x-internal-secret`
   - Valor: o segredo interno do SISAG.

Substitua as associações marcadas por `REPLACE_WITH_...` durante a importação.
O valor de nenhuma credencial deve ser inserido no JSON.

## Variável do serviço n8n

Configure `SISAG_INTERNAL_BASE_URL` no serviço n8n. Em produção, use
`https://sisag.flaience.com` ou o endereço interno estável do frontend.

## Ativação

Antes de ativar, teste o workflow manualmente. Depois de ativado, o endpoint
será:

`https://n8n.flaience.com/webhook/sisag/commercial-onboarding/runtime`

Somente então configure no dispatcher:

- `N8N_COMMERCIAL_ONBOARDING_WEBHOOK_URL`
- `N8N_COMMERCIAL_ONBOARDING_WEBHOOK_SECRET`

Respostas recuperáveis do SISAG fazem o workflow falhar para que a outbox tente
novamente. Respostas definitivas são reconhecidas sem repetição infinita.
