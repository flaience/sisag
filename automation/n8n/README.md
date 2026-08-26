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

O arquivo `commercial-post-activation-due-runner.json` agenda o processamento
indexado dos marcos pós-ativação a cada 15 minutos. A projeção alimenta a fila
durável, o lote reivindica apenas itens disponíveis e o resumo indexado abastece
as métricas e os sinais operacionais.

Após importar, associe a credencial **SISAG Internal API** a todos os nós HTTP:

- tipo: **Header Auth**;
- header: `x-platform-internal-secret`;
- valor: segredo interno vigente do SISAG;
- domínios permitidos: a URL interna do SISAG ou `All`, conforme a versão do n8n.

O JSON contém apenas `REPLACE_WITH_SISAG_INTERNAL_CREDENTIAL_ID`; nenhum segredo
deve ser versionado.

Antes de publicar:

1. confirme que existe apenas uma versão publicada do Due Runner;
2. associe a credencial interna a todos os nós HTTP;
3. confirme a presença de **Project Due Work**, **Process Due Work Batch** e
   **Compose Indexed Runner Summary**;
4. confirme a ausência de **Run Due Milestones**;
5. execute manualmente e valide a liberação do lease e os estados de saúde;
6. publique e observe pelo menos dois ciclos automáticos.

O workflow é importado inativo e usa o fuso `America/Sao_Paulo`. Consulte
`docs/commercial-post-activation-runner-operations.md` para diagnóstico,
reversão e manutenção.
