# Homologação controlada de recuperação

Data: 12/09/2026. Base inspecionada: ad161b2 (PR #407).
Estado atualizado: validação local PARCIAL executada; ver evidência de 13/09/2026 abaixo. A matriz completa não foi aprovada.

## Planejamento original de 12/09/2026 (registro histórico)

Usuário reportou 4 arquivos, 37 testes e build aprovado antes do merge #407.
Os testes anteriores usam banco, autenticação e/ou provedores simulados.
Nesta auditoria houve somente leitura do código. Não houve consulta ao banco remoto,
criação de contas, alteração de configuração, sessão real ou teste de envio.

## Achados que condicionam a execução

| Condição | Evidência no repositório | Consequência |
| --- | --- | --- |
| Desativar configuração não basta para bloquear jobs existentes | BookingFollowupPlanner.service.ts retorna automation_disabled antes de cancelar jobs; BookingFollowupWorker.service.ts processa jobs elegíveis sem consultar enableFollowup | Não usar a checkbox como barreira única de segurança |
| Autenticação verifica o token no Supabase | getAuthenticatedUserContext.ts usa auth.getUser e companyUsers ativo | Precisamos de sessões reais e contas de teste isoladas |
| Seleção de vínculo usa limit(1), sem empresa selecionada na consulta | getAuthenticatedUserContext.ts | Usar exatamente um vínculo ativo por conta de teste; multiempresa fica como lacuna separada |
| Ambas as rotas aceitam owner, admin e staff | recommendation/route.ts e recommendation/review/route.ts | Staff válido não é caso de 403; não alterar a política nesta auditoria |
| Middleware exclui /api no matcher | src/middleware.ts | Validar os guards das APIs, não somente redirecionamento da página |
| Pool PostgreSQL compartilhado | src/lib/db.ts | Neste arquivo não há configuração de identidade por requisição; inspecionar role e políticas reais antes de alegar RLS por empresa |
| Migração habilita RLS mas não declara políticas nessa migração | infra/recovery-agent-recommendations.sql | relrowsecurity=true sozinho é evidência insuficiente; políticas/role podem existir fora deste arquivo |
| Geração pode chamar agente e embeddings configurados | RecoveryAgentProvider.factory.ts e RecoveryEmbeddingProvider.factory.ts | Modo shadow não implica ausência de chamadas externas |

As constatações acima não demonstram vazamento em produção. Indicam o que precisa ser
medido. Não foram inspecionados os privilégios da conexão real nem todas as políticas instaladas.

## Ambiente obrigatório antes de escrever

Preferir instância de homologação com banco e projeto de autenticação separados, somente
dados sintéticos. Não apontar aplicação local para DATABASE_URL_FILE ou projeto Supabase de produção.

Antes de liberar o teste, registrar evidência, sem revelar segredos:
- host/identificador não secreto da aplicação, banco e projeto Auth, diferentes dos de produção;
- revisão do código implantado e migrações efetivamente disponíveis;
- runner, dispatcher, workers de WhatsApp e agendamentos n8n sem acesso ao banco de teste e não executando nesse ambiente;
- sem webhooks de produção apontando para homologação e sem credenciais de envio ou modelos;
- providers de agente/embedding desabilitados na configuração efetivamente resolvida, inclusive arquivos de secrets;
- bloqueio de saída para destinos de mensagem/IA; liberar apenas banco e Auth necessários ao teste;
- observabilidade que permita identificar qualquer criação de automation_jobs/outbox e tentativa externa.

Não parar serviços compartilhados de produção para preparar este ambiente.
Não basta usar número falso: integrações podem tentar enviá-lo.
Não executar a etapa de criação enquanto essas condições estiverem pendentes.

## Preparação dos dados (etapa futura, não executável nesta entrega)

1. Definir identificador único da rodada.
2. Criar empresas sintéticas A e B e contas independentes, cada uma com um único vínculo ativo.
3. Registrar IDs exatos das contas, empresas, clientes, agendamentos, feedbacks, casos e recomendações.
4. Preparar casos ativos vinculados corretamente a cada empresa. Usar mecanismo de fixture revisado
   que não acione conclusão de agendamento, callbacks ou planejamento de mensagens.
5. Fazer fotografia inicial de jobs, outbox, recomendações e eventos da rodada.
6. Validar previamente o plano de descarte e relacionamentos/FKs. Não há SQL de seed ou delete neste PR.

## Matriz de validação real

Executar somente após o ambiente isolado estar comprovado, com sessões separadas.
Não copiar cookies/tokens para Git, conversa ou screenshots. Guardar evidências sanitizadas.

| Caso | Resultado esperado | Verificação persistente |
| --- | --- | --- |
| POST sem sessão ou Bearer inválido, sem cookie válido de fallback | 401 | Sem recomendação/evento novo |
| Sessão sem vínculo ativo válido | 401 pelo guard atual | Sem escrita |
| Owner/admin/staff com um vínculo ativo | Permitido pelo contrato atual | Empresa/ator da sessão |
| Sessão A, ID de caso B na geração | 404 | Nenhuma mudança em B |
| Sessão A, ID de caso B na revisão, corpo válido | 404 | Nenhuma mudança em B |
| Repetir os testes cruzados com sessão B e caso A | 404 | Nenhuma mudança em A |
| Sessão A com companyId/actorId/caseId de B no corpo e ID de A na URL | Corpo não substitui identidade autenticada ou ID da rota | Alterações somente em A, ator A |
| Revisão com JSON malformado, versão zero ou ajuste incompleto | 400 | Sem revisão/evento |
| Geração em A com providers desabilitados | 200, shadow e fallback | Recomendação e auditoria de A, sem outbox/jobs |
| Revisão accepted/adjusted/rejected em fixtures independentes | 200 | Uma revisão e evento correspondente, sem execução de ação |
| Revisão com versão anterior após nova geração | 409 stale_recommendation | Sem revisão/evento adicional |
| Repetição da mesma revisão/version | 200 alreadyReviewed | Sem duplicar evento |
| Duas revisões simultâneas diferentes da mesma versão | Apenas uma alteração efetiva; outra 409 concurrent_review ou 200 alreadyReviewed conforme interleaving | Exatamente um evento de revisão e estado consistente |

Um usuário válido staff não exercita o caminho 403 nessas duas rotas, pois os três
papéis existentes são permitidos. Os 403 dos testes simulados validam propagação do guard,
não a existência de um papel real proibido. Caso o produto exija revisão só por owner/admin,
isso requer decisão e mudança de autorização em entrega separada.

## Inspeção de RLS (somente leitura, preparação posterior)

Usar a MESMA role efetiva do pool da aplicação para avaliar o comportamento.
Uma consulta no SQL Editor como administrador não representa essa role.

Levantar: current_user/session_user, atributos de superuser e BYPASSRLS, proprietário
das tabelas, FORCE ROW LEVEL SECURITY, políticas e grants de:
booking_recovery_cases, booking_recovery_recommendations e booking_events.
Inspecionar qualquer mecanismo de contexto por conexão/por transação antes de executar
testes diretos entre empresas. Não alterar roles ou políticas nesta rodada.

Separar resultados:
- isolamento nas APIs por filtros da aplicação;
- isolamento adicional fornecido pelo banco.
Se a conexão ignorar RLS ou não houver contexto por empresa, não declarar RLS validado.
Uma API negar acesso cruzado não demonstra que consultas SQL sem filtro seriam negadas.

## Critérios de parada

Parar diante de destino de produção, credencial externa ativa, vínculo ambíguo,
escrita na empresa errada, job/outbox inesperado, resposta 500 ou impossibilidade de observar efeitos.
Preservar evidências sanitizadas e diagnosticar antes de repetir; não repetir POST às cegas.

## Encerramento e limpeza

Guardar status, horário, revisão implantada, IDs sintéticos, contagens antes/depois e
resultados por caso. Registrar ausência de jobs/outbox e chamadas externas observadas.
Não confundir ausência de logs com prova de bloqueio de rede.

Preferir descartar o ambiente de teste dedicado após exportar as evidências.
Se reutilizado, preparar limpeza transacional só com IDs do manifesto, ordem de FKs
e conferência de alvos/contagens antes de confirmar. Auditar cascatas antes de remover pais.
Não usar TRUNCATE, filtros amplos, nomes ou datas como único alvo de exclusão.
Contas Auth devem ser removidas separadamente por seus IDs do ambiente de teste.
Esta entrega NÃO autoriza nem executa exclusão.

## Próxima ação

Confirmar se existe ambiente separado de homologação, com banco e Auth próprios.
Sem essa informação, manter a validação real pendente; não improvisar dados em produção.


## Evidência executada em 13/09/2026

- Homologação local separada: Supabase/PostgreSQL 17.6, 73 tabelas; exportação sem políticas, funções ou triggers. Não certifica paridade com produção.
- Dois tenants/empresas e usuários owner fictícios, cada um com um vínculo ativo. Sem copiar dados ou credenciais de produção.
- Usuário confirmou sessões reais: A lista apenas A, B apenas B.
- Claim cruzado A→B e B→A retornou 404 recovery_case_not_found; casos completos e contagens de eventos/jobs/outbox inalterados naquele teste.
- Controle positivo: B assumiu B; consulta confirmou um evento automation.booking_recovery.updated, ação claim, ator B.
- Estado posterior: A atribuída a A e B a B, ambos open. Não foi conferida a auditoria específica da atribuição posterior de A.
- Quatro leituras reais retornaram HTTP200 em 105–501ms; uma porção anterior da investigação teve timeouts. Causa-raiz da intermitência não demonstrada.
- UI agora exibe responsável, com fallback para ID; serviço consulta perfil com filtro de empresa. Captura textual de A conferida com banco; B persistido, mas sua nova apresentação visual não reconfirmada.
- Leitura e alteração com limite de 15s; erro de leitura permite nova tentativa sem repetir POST. Timeout do cliente não cancela necessariamente transação no servidor.
- Usuário confirmou 3 testes de RecoveryCaseAssignment e build aprovado. Esses testes não cobrem timeout, concorrência, nem a nova consulta real por si só.
- anon/authenticated sem permissões verificadas nas tabelas públicas locais. Pool local usa postgres; isolamento SQL por RLS NÃO certificado.
- WhatsApp, geração/revisão de recomendações, providers, concorrência real e outros papéis continuam fora da evidência desta rodada.
- Não houve alteração de produção nesta rodada nem limpeza de dados. Nenhuma chamada externa alegada como impossível: guarda Node é barreira adicional, não firewall.

## Pendências para a próxima rodada
- Exercitar falha controlada/timeout e recuperação da interface; adicionar testes de carregamento e consulta.
- Conferir a apresentação de B e auditoria posterior de A sem repetir claim.
- Continuar a matriz de geração/revisão apenas após revisar as barreiras de integração.
- Não reaplicar seeds. O teste cruzado original exige casos sem responsável e precisa adaptação antes de ser reutilizado.


## Validação manual Offline — registro de 14/09/2026

- Base confirmada: 5b36632, merge PR409; testes e build do PR409 já reportados aprovados pelo usuário (2 arquivos / 7 testes).
- Homologação iniciada pelo start-sisag-homolog-pr409.mjs em C:/sisag-homolog-local/app-5b36632, HTTP local 127.0.0.1:3100, mantendo banco e fixtures existentes.
- Sessão A carregou fila com CLIENTE FICTICIO A - HOMOLOG e Responsável: SISAG TESTE A.
- No navegador, modo Offline e seleção do filtro Todos causaram ERR_INTERNET_DISCONNECTED no GET recovery?status=all.
- Usuário confirmou alerta de leitura desatualizada e botão Tentar carregar novamente.
- Após orientação de restaurar a rede e repetir somente a leitura, usuário apresentou novamente o cartão A e seu responsável. A remoção do alerta não foi confirmada separadamente; não houve captura de rede/contagens de banco após a retomada.
- Evidência manual de erro de leitura e retomada da exibição; não mede timeout de 15s. O cartão também pode ser preservado durante falha; não usar sua presença isolada como prova de resposta HTTP200.
- Nenhum novo clique de mutação foi solicitado nesta rodada. Ausência de mutações extras não foi auditada no banco nesta etapa.
- Sem mudança de runtime, schema, permissões, workers ou integração nesta entrega documental; sem nova execução de testes/build alegada.

### Próxima verificação objetiva
Confirmar no navegador que o alerta desapareceu e que o GET da nova tentativa retornou 200; não repetir Assumir.
Só então encerrar o cenário de recuperação visual. Manter timeout real como pendente ou testar separadamente com atraso controlado, sem desligar serviços de produção.
Preservar pendências de RLS real, auditoria posterior de A, concorrência e geração/revisão de recomendações; consultar a matriz do roteiro.


## AuthProvider administrativo — validação de 14/09/2026

- Branch: fix/admin-auth-provider. Base: 783a0c1, após PR410; commit/merge desta correção ainda pendente.
- Causa identificada: PeoplePage (/admin/people) usa useCompany → useAuthContext sem AuthProvider na árvore administrativa.
- Correção: AuthProvider envolve AdminShell e filhos, após await requireAdminAccess. Guard do servidor preservado; APIs e permissões não alteradas.
- Usuário confirmou 3 testes de composição do layout e build aprovado. Testes usam dependências simuladas; não certificam autorização ponta a ponta.
- Homologação: usuário confirmou acesso à tela de clientes sem erro de contexto. Não houve teste de criação/edição de clientes nesta validação.
- Recuperação: com perfil de latência 20000ms foi observado alerta; após No throttling e nova tentativa, usuário confirmou que o alerta desaparece e a fila retorna. Tempo exato até o alerta não medido; não declarar timeout de 15s cronometrado.
- Snapshot local PR409 em app-5b36632 contém a correção de layout sincronizada; banco e fixtures preservados. Não equivale ao commit PR409 puro.
- Sem alteração de banco, credenciais, RLS, providers ou WhatsApp nesta correção.
- Próxima ação: revisar diff, commit e PR. Merge/deploy não confirmados. Permanecem pendentes concorrência, demais rotas e isolamento SQL por RLS.
- Manter No throttling fora dos testes. Não duplicar servidor na porta3100; usar start-sisag-homolog-pr409.mjs apenas com a porta livre.


## Recomendação e revisão local — evidência de 14/09/2026

- Base: 2ad4135, merge PR411; branch test/recovery-recommendation-local-validation. Entrega atual apenas documental; commit/PR pendentes.
- Servidor iniciado pelo launcher local PR409; snapshot app-5b36632 com AuthProvider sincronizado. Arquivos centrais da recomendação comparados com o repositório sem divergência; sem .env na raiz do snapshot.
- Launcher usa lista explícita de variáveis locais e não repassa configuração dos providers. Guarda Node loopback é proteção adicional, não firewall. Não foi realizada captura independente de tráfego externo.
- Baseline observado: A e B com casos abertos e atribuídos; zero recomendações, eventos de criação, jobs e outbox.
- A clicou uma vez em Analisar caso: POST de geração HTTP200, 188ms de processamento da aplicação (tempo total 7,6s incluiu compilação).
- UI apresentou prepare_contact / urgente, pontuação de confiança 90%, justificativa de responsável já atribuído e abordagem humana pendente. Pontuação das regras não é probabilidade calibrada nem avaliação de modelo externo.
- Após geração: uma recomendação e um evento de criação em A; B com zero; jobs/outbox zero.
- A aceitou a recomendação: UI accepted; banco confirmou status accepted, version=1, reviewed_version=1, revisor SISAG TESTE A, reviewed_at=2026-09-14 17:42:16.56+00.
- Consulta de auditoria retornou um evento recommendation_reviewed em A, decision=accepted, version=1, decidedAction=prepare_contact, decidedPriority=urgent e vínculos ao caso/recomendação esperados.
- Após revisão, B permaneceu sem recomendação/evento de criação, jobs/outbox zero. Caso A continuou open: aceitar não executa o contato.
- Cenário positivo local com sessão real, persistência e auditoria validado segundo saídas fornecidas pelo usuário. Fixtures foram inseridas diretamente; não comprova fluxo original de atendimento/feedback.
- JSON agent_execution não foi consultado nesta rodada. Sem validação de provedor externo, embeddings/RAG real, WhatsApp, concorrência, idempotência de revisão ou versões obsoletas.
- Claim cruzado foi validado em rodada anterior; não extrapolar para autorização cruzada das rotas de geração/revisão.
- Não houve nova execução de testes/build nesta entrega documental; 3 testes/build da correção de AuthProvider pertencem ao PR411.

### Próxima ação
Versionar este registro sem repetir Analisar/Reanalisar/Aceitar na fixture A.
Próxima rodada técnica: testar negação de revisão cruzada com sessão B e ID de A, comparando recomendação e auditoria antes/depois; revisar contrato antes de executar.
Não reaplicar seeds ou limpar fixtures. Manter banco/Auth locais e providers/envios fora do escopo.


## Revisão entre empresas — evidência local de 14/09/2026

- Base: 6ad4458, merge PR412; branch docs/recovery-review-tenant-validation. Esta entrega é documental, ainda sem commit/merge confirmado.
- Evidências abaixo fornecidas pelo usuário em saídas de scripts, SQL e interface, no Supabase local e snapshot app-5b36632 com AuthProvider sincronizado. Não equivalem a validação em produção nem a snapshot puro do HEAD atual.
- Teste B→A: sessão B confirmada pela listagem do próprio caso; revisão da recomendação já aceita de A retornou HTTP404 / recommendation_not_found. Comparação antes/depois confirmou recomendações, eventos e casos completos inalterados; contagens jobs/outbox inalteradas.
- Após geração de B: cada empresa tinha uma recomendação e um evento de criação; casos open e atribuídos, jobs=0 e outbox=0.
- Teste A→B: script exigiu recomendação B em shadow, versão 1, sem revisor/data de revisão; sessão A confirmada pela listagem do próprio caso. Tentativa de accepted retornou HTTP404 / recommendation_not_found. Recomendações, eventos e casos completos, além das contagens jobs/outbox, permaneceram inalterados.
- Controle positivo posterior: B aceitou a própria recomendação pela interface. SQL confirmou A e B accepted, version=1, reviewed_version=1, com revisores SISAG TESTE A e SISAG TESTE B respectivamente.
- Consulta de eventos retornou exatamente duas linhas de automation.booking_recovery.recommendation_reviewed: A accepted/1/ator A em 2026-09-14 17:42:16.563313+00; B accepted/1/ator B em 2026-09-14 18:10:15.308734+00.
- Estado final observado: casos A e B continuam open e atribuídos; uma recomendação e um evento de criação por empresa; jobs=0 e outbox=0. Aceitar a recomendação não marcou contato ou resolução nesses cenários.
- Cobertura limitada a esses dois cenários cruzados com owners e aos controles positivos. Não certifica revisão cruzada pendente B→A, todos os papéis, concorrência, repetição/idempotência, versão obsoleta, geração cruzada, isolamento SQL por RLS ou todas as rotas.
- Fixtures inseridas diretamente; sem comprovação do fluxo original de atendimento/feedback, qualidade de IA, RAG, WhatsApp ou ausência de todo tráfego externo. Contagens zeradas de jobs/outbox não substituem auditoria de rede.
- Nenhum novo teste automatizado/build executado nesta entrega documental. Sem mudança de código, schema, permissões, providers ou banco por este registro.

### Próxima ação deste checkpoint

Revisar e versionar estes três documentos. Não repetir os scripts cruzados sem adaptar seus pré-requisitos: B agora está accepted e há duas recomendações.
Preservar fixtures, banco e sessões locais; não reanalisar para recriar um estado pendente. Antes da próxima rodada, inspecionar o contrato de revisão e preparar teste específico de repetição/idempotência com comparação de estado e auditoria, sem habilitar integrações.
Instruções de próxima ação dos registros anteriores são históricas e superadas por este checkpoint. Merge documental pode acionar o workflow de deploy; não representa certificação de produção.


## Revisão sequencial e versão divergente — evidência local de 14/09/2026

- Base: 6060573, merge PR413; branch test/recovery-review-local-idempotency. Entrega documental, commit/PR ainda pendentes.
- Evidência: saídas dos três scripts locais fornecidas pelo usuário. Homologação no snapshot app-5b36632 com AuthProvider sincronizado e Supabase local; não equivale ao HEAD puro nem certifica produção.
- Pré-condições dos scripts: duas recomendações accepted, A na versão 1 com reviewed_version=1 e revisor/data preenchidos; um evento de revisão vinculado à recomendação A; jobs/outbox zero. Sessão A confirmada pela listagem do próprio caso. Serviço e rota comparados com o snapshot; schema também comparado no teste de decisão diferente.
- test-local-review-idempotency.mjs: repetição sequencial accepted/versão 1 de A retornou HTTP200, ok=true, alreadyReviewed=true e status=accepted.
- test-local-review-terminal-decision.mjs: tentativa rejected/versão 1, com justificativa válida, retornou HTTP200, ok=true, alreadyReviewed=true e status=accepted. A rejeição não foi aplicada; decisão original preservada.
- test-local-review-version-mismatch.mjs: envio de accepted/versão 2 diante da versão atual 1 retornou HTTP409, ok=false e stale_recommendation. Trata-se de versão futura divergente, não de versão antiga após reanálise.
- Em cada tentativa, comparação antes/depois confirmou recomendações, eventos e casos completos inalterados; contagens jobs/outbox inalteradas. Nenhuma duplicação da auditoria nos cenários executados.
- Scripts auxiliares residem fora do repositório, no diretório local de trabalho; esta entrega não adiciona cobertura à suíte versionada de CI. Não houve nova execução de Vitest/build nesta rodada.
- Cobertura limitada à sessão owner A e à recomendação já aceita, em chamadas sequenciais. Não cobre concorrência, adjusted, recomendação pendente, versão antiga após reanálise, todos os papéis ou isolamento SQL por RLS.
- Estado preservado: casos A/B open e atribuídos; recomendações accepted; fixtures não recriadas. Sem comprovação adicional de qualidade de IA, RAG, WhatsApp ou ausência de todo tráfego externo.
- Registro documental não altera código, schema, permissões, providers ou banco.

### Próxima ação deste checkpoint

Revisar e versionar os três documentos. Próxima rodada proposta: inspecionar a cobertura existente de revisão e adicionar regressões automatizadas versionadas para os contratos sequenciais comprovados, evitando duplicação de testes já existentes.
Concorrência e revisão pendente permanecem pendentes e precisam de desenho próprio antes de qualquer execução. Não reanalisar, limpar fixtures ou habilitar envios para concluir este registro.
As próximas ações históricas abaixo são superadas por este checkpoint. Merge documental pode acionar deploy e não representa certificação de produção.


## Regressões automatizadas da revisão — 14/09/2026

- Base 0006d6c, merge PR414; branch test/recovery-review-regression-coverage. Commit/PR desta entrega pendentes.
- Arquivo alterado: src/modules/automation/BookingRecoveryRecommendationReview.isolated-flow.test.ts. Três casos acrescentados à suíte existente, sem duplicar a repetição accepted já coberta.
- Nova cobertura: rejected com justificativa válida sobre accepted preserva a decisão; versões 2 e 4 sobre versão atual 3 retornam stale_recommendation antes de alreadyReviewed, mesmo com revisão encerrada.
- Nos três casos são verificadas ausência de chamadas update/insert e preservação do objeto recebido do banco simulado.
- Usuário forneceu resultado de 1 arquivo / 11 testes aprovados e confirmou build aprovado. diff --check mostrou somente aviso LF/CRLF no teste, sem erro de whitespace. CI/merge ainda não confirmados.
- Serviço real exercitado com fronteira de banco simulada e schema real. Não comprova atomicidade SQL, concorrência real, RLS ou execução HTTP com sessão real. Evidências locais anteriores continuam separadas nos registros históricos.
- Sem mudança de código de produção, schema, providers, permissões ou fixtures. Não foi necessário repetir ações no banco local nesta rodada.

### Próxima ação deste checkpoint

Revisar diff dos quatro arquivos (teste e três documentos), fazer commit e abrir PR. Não apresentar a cobertura como teste de concorrência real.
Após consolidação, avaliar as lacunas restantes antes de ampliar o escopo: concorrência requer desenho próprio e dados isolados; não reanalisar nem limpar as fixtures atuais automaticamente.
Próximas ações antigas abaixo são históricas; este checkpoint prevalece. Merge pode acionar deploy, sem constituir certificação de produção.


## Concorrência controlada da revisão — evidência local de 14/09/2026

- Base fcb8489, merge PR415; branch test/recovery-review-local-concurrency. Esta entrega é documental; commit/PR ainda pendentes.
- Evidência fornecida pelo usuário em saídas dos scripts locais. Supabase/PostgreSQL 17.6; conexão de preflight read committed, papel postgres não superusuário. Essa consulta não comprova isoladamente o isolamento das conexões da aplicação.
- Snapshot app-5b36632 com AuthProvider sincronizado; arquivos DB, serviço, schema de comando e rota de revisão comparados com repositório. Não equivale ao HEAD puro, nem certifica ambiente de produção.
- Seed SQL local criou unidade, cliente não roteável, agendamento, feedback, caso e recomendação exclusivos na empresa A. COMMIT confirmado, shadow/versão 1. Casos/recomendações anteriores e eventos preservados, jobs/outbox zero. Inserção direta não valida o fluxo de geração/atendimento.
- Caso exclusivo: 5ea19fd0-c004-495d-83a8-32d46ad8ce7c; recomendação: 6f501974-81ea-4aba-9ac4-8190950ce62c. Identificadores de fixtures locais, sem credenciais.
- test-local-review-concurrency.mjs confirmou sessão A pela listagem e pré-condições da fixture. Uma conexão separada manteve bloqueio FOR UPDATE exclusivamente sobre a recomendação-alvo.
- Duas requisições reais de revisão, accepted e rejected com nota válida, foram enviadas pela mesma sessão owner A. Observação de pg_stat_activity/pg_blocking_pids confirmou duas atualizações aguardando na cadeia do bloqueio antes da liberação. Portanto não se trata apenas de disparo simultâneo sem evidência de sobreposição.
- Resultado observado: accepted HTTP200 / primeira revisão; rejected HTTP409 / concurrent_review. A decisão vencedora não é garantida para outra execução.
- Comparação confirmou um único novo evento de revisão, com empresa, recomendação, caso, decisão e ator correspondentes ao estado final; recomendação accepted, version=1 e reviewed_version=1.
- Casos completos, recomendações anteriores, eventos anteriores e contagens jobs/outbox preservados. A recomendação-alvo e seu novo evento são alterações esperadas. Não afirmar banco inteiro inalterado ou ausência de todo tráfego externo.
- Cobertura: disputa controlada local, dois pedidos da mesma sessão owner. Não cobre revisores distintos, todos os papéis, outras decisões/várias cargas, RLS real, falha durante commit ou produção.
- Scripts auxiliares fora do repositório; esta entrega não adiciona teste à CI nem altera código de produção, schema ou permissões. Nenhum novo Vitest/build nesta rodada; 11 testes/build pertencem ao PR415.

### Próxima ação deste checkpoint

Revisar e versionar os três documentos. Preservar a fixture terminal accepted; não repetir seed/teste nem reanalisar para recuperar shadow.
Os scripts anteriores que exigem duas recomendações/casos não são mais reutilizáveis sem adaptação: agora existem três casos e três recomendações. Não interpretar falha desses pré-requisitos como regressão.
Após consolidação, revisar a matriz de pendências antes de escolher outra rodada; não ampliar automaticamente para produção ou integrações. Instruções históricas abaixo são superadas por este checkpoint. Merge pode acionar deploy, sem certificar produção.


## Recusas HTTP da revisão — evidência local de 14/09/2026

- Base a4c5629, merge PR416; branch test/recovery-review-local-http-validation. Entrega documental, commit/PR ainda pendentes.
- Evidência fornecida pelo usuário: test-local-review-http-validation.mjs executado contra SISAG/Supabase locais, snapshot app-5b36632 com AuthProvider sincronizado. Não equivale ao HEAD puro nem certifica produção.
- Script comparou guard apiAuth, schema, serviço e rota de revisão com o snapshot, conferiu container local e ausência de .env na raiz. Isso não certifica sozinho todas as variáveis do processo em execução.
- Baseline: três casos e três recomendações aceitas; jobs/outbox zero. Sessão owner A confirmada pela listagem dos dois casos da empresa. Alvo: recomendação já aceita do caso original A.
- Sem sessão e com corpo válido: HTTP401 / Unauthorized.
- Bearer inválido, sem cookie: HTTP401 / Unauthorized. Não houve cookie válido de fallback nessa tentativa.
- JSON malformado com sessão A: HTTP400 / invalid_payload.
- Versão zero com sessão A: HTTP400 / invalid_payload.
- Ajuste incompleto com sessão A e nota válida, sem ação/prioridade: HTTP400 / invalid_payload.
- Rejeição sem justificativa com sessão A: HTTP400 / invalid_payload.
- Após cada uma das seis tentativas, comparação confirmou recomendações, eventos e casos completos inalterados; contagens jobs/outbox inalteradas. Não afirmar ausência de toda atividade externa a partir dessas contagens.
- Cobertura restrita à rota de revisão e a esses corpos/credenciais sobre recomendação terminal. Não cobre vínculo inativo, admin/staff, recomendação pendente, geração, todos os formatos inválidos, RLS real ou produção.
- Script auxiliar fora do repositório; não adiciona cobertura à CI. Nenhuma nova execução de Vitest/build nesta rodada documental. Sem alteração de código de produção, schema, permissões ou fixtures.

### Próxima ação deste checkpoint

Revisar e versionar os três documentos. Preservar as três recomendações aceitas; não repetir seeds nem reanalisar casos para fechar documentação.
Após consolidação, avaliar as lacunas restantes da matriz antes de iniciar outra rodada. Testes de vínculo inativo ou novos papéis exigem preparação específica; não alterar os vínculos atuais automaticamente.
As próximas ações dos registros históricos são superadas por este checkpoint. Merge pode acionar deploy; evidência local não certifica produção.


## Geração cruzada entre empresas — evidência local de 14/09/2026

- Base 04d0e6e, merge PR417; branch test/recovery-generation-local-tenant-validation. Entrega documental, commit/PR ainda pendentes.
- Evidência fornecida pelo usuário: test-local-generation-cross-company.mjs contra SISAG/Supabase locais e snapshot app-5b36632 com AuthProvider sincronizado. Não equivale ao HEAD puro nem certifica produção.
- Script comparou arquivos de env, guard API, factories de agente/embedding, resolvers de experimento/release, serviço e rota de geração com o snapshot; conferiu container local e ausência de .env na raiz. Não comprova sozinho todas as variáveis do processo ativo.
- Baseline: três casos, três recomendações accepted e jobs/outbox zero. Casos originais A e B ativos (open), vinculados às respectivas empresas; fixture exclusiva de concorrência preservada.
- Sessão owner A confirmada pela listagem dos próprios casos. POST de geração para o caso original B: HTTP404, ok=false, active_recovery_case_not_found.
- Sessão owner B confirmada pela listagem dos próprios casos. POST de geração para o caso original A: HTTP404, ok=false, active_recovery_case_not_found.
- Após cada tentativa, recomendações, eventos e casos completos permaneceram iguais à fotografia inicial; contagens jobs/outbox inalteradas. Não houve reanálise legítima solicitada nesta rodada.
- Evidência cobre esses dois acessos cruzados na rota de geração sobre casos ativos com owners. Não certifica todos os papéis, RLS, todas as rotas, produção ou ausência de tráfego externo.
- Scripts auxiliares fora do repositório; esta entrega não acrescenta teste à CI. Nenhuma nova execução de Vitest/build nesta rodada. Sem alteração de código, schema, permissões ou fixtures pelo registro documental.

### Próxima ação deste checkpoint

Revisar e versionar os três documentos. Preservar os três casos e recomendações; não repetir seeds ou reanalisar para concluir documentação.
Após consolidação, atualizar a avaliação das lacunas restantes antes de escolher outra rodada: vínculo inativo, demais papéis, corpos tentando substituir identidade e decisões positivas adjusted/rejected continuam sem certificação local completa.
Não alterar contas existentes nem ampliar para produção/integrações automaticamente. Próximas ações históricas abaixo são superadas por este checkpoint. Merge pode acionar deploy sem constituir certificação de produção.
