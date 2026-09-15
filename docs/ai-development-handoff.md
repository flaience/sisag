# Handoff atual — ajuste e rejeição locais

## Primeiras revisões adjusted/rejected — evidência local de 15/09/2026

- Base 83480c0, merge PR420; branch test/recovery-local-adjusted-rejected. Entrega documental, commit/PR ainda pendentes.
- Usuário confirmou COMMIT do seed local: duas fixtures exclusivas em A, cada uma com unidade, cliente não roteável, agendamento, feedback, caso e recomendação shadow/versão 1. Quatro recomendações aceitas anteriores preservadas. Inserção SQL não comprova fluxo original de atendimento ou geração.
- Fixture adjusted: caso 6e0a28eb-c0e9-4088-926a-8e7d5e0789c1, recomendação a927c2b7-1758-4af1-bd78-42b3f5da716a.
- Fixture rejected: caso b05bf9ba-b001-4860-8fa1-deab51c649e6, recomendação 149786ce-8f1d-43f7-b0f8-8ae8e8a3890e.
- test-local-adjusted-rejected.mjs confirmou identidade owner A, listagem dos próprios casos e estado inicial das duas recomendações. Execução contra SISAG/Supabase locais, snapshot app-5b36632 com AuthProvider sincronizado; arquivos centrais comparados com repositório, sem equivalência ao HEAD puro ou certificação de produção.
- adjusted: HTTP200 / primeira revisão; status adjusted, decided_action=human_contact, decided_priority=high, justificativa persistida, reviewed_version=1, revisor A e data preenchida.
- rejected: HTTP200 / primeira revisão; status rejected, decided_action e decided_priority nulos, justificativa persistida, reviewed_version=1, revisor A e data preenchida.
- Para cada decisão foi confirmado exatamente um novo evento de revisão com empresa, booking/client, caso, recomendação, ator, versão, nota, decisão, ação e prioridade correspondentes.
- Após cada chamada, casos completos, outras recomendações, eventos anteriores e contagens jobs/outbox preservados. Campos não mutáveis da recomendação-alvo também comparados. Alteração da revisão e novo evento são esperados; não afirmar banco inteiro inalterado.
- Estado final: seis casos e seis recomendações locais (quatro accepted, uma adjusted, uma rejected). Conta exclusiva de vínculo inativo não foi alterada pelo teste.
- Nenhuma chamada de contato foi enviada pelo script; contagens não são auditoria completa de tráfego externo. Cobertura pela API com owner A, não UI, admin/staff, RLS ou produção.
- Scripts auxiliares fora do repositório. Nenhuma nova execução de Vitest/build ou cobertura CI nesta entrega documental; sem mudança de código de produção, schema ou permissões pelo registro.

### Próxima ação deste checkpoint

Revisar e versionar os três documentos. Não repetir seed/teste nem reanalisar as duas fixtures terminais.
Scripts históricos que exigem quatro recomendações aceitas não são mais reutilizáveis sem adaptação. Preservar os seis casos e a conta de vínculo inativo.
Após consolidação, revisar as lacunas da matriz, incluindo demais papéis, antes de ampliar a rodada. Não modificar vínculos ou habilitar integrações automaticamente. Próximas ações históricas são superadas por este checkpoint; merge pode acionar deploy sem certificar produção.

## Histórico anterior preservado

# Handoff atual — vínculo inativo local

## Vínculo inativo — evidência local de 15/09/2026

- Base 4ac994d, merge PR419; branch test/recovery-local-inactive-membership. Entrega documental, commit/PR ainda pendentes.
- Preparação: conta Auth local exclusiva, perfil owner na empresa A e único vínculo owner inativo, zero vínculos ativos. Scripts não atualizaram os vínculos dos usuários A/B. Credenciais em arquivo privado fora do repositório; não compartilhar ou versionar.
- Usuário confirmou login no Supabase local durante preparo. Posteriormente test-local-inactive-membership.mjs confirmou login pela rota SISAG HTTP200 e identidade via contexto; perfil e vínculo conferidos no banco.
- Alvo das tentativas: caso original ativo de A com recomendação aceita, usando sessão da conta exclusiva. Corpos válidos: geração com objeto vazio; revisão accepted/versão 1. Não depender de payload inválido ou caso inexistente para obter recusa.
- Geração retornou HTTP401 / Unauthorized; revisão retornou HTTP401 / Unauthorized.
- Após cada tentativa, comparação confirmou perfis, vínculos, recomendações, eventos e casos completos inalterados; contagens jobs/outbox inalteradas. Login válido não concedeu acesso às duas operações sem vínculo ativo.
- Cenário local contra snapshot app-5b36632 com AuthProvider sincronizado e Supabase próprio; arquivos do guard/contexto autenticado, geração e revisão comparados com repositório. Não equivale ao HEAD puro nem comprova isoladamente todo o ambiente do processo.
- Cobertura limitada à conta com vínculo já inativo antes do login, perfil owner preenchido e nenhum vínculo ativo alternativo. Não cobre revogação durante sessão, admin/staff, múltiplos vínculos, recomendação pendente, RLS ou produção.
- Quatro casos e quatro recomendações aceitas preservados. Conta exclusiva permanece com vínculo inativo; não ativá-la ou removê-la automaticamente.
- Scripts auxiliares fora do repositório; nenhuma nova cobertura CI ou execução de Vitest/build nesta rodada. Registro não altera código de produção, schema, permissões ou banco.

### Próxima ação deste checkpoint

Revisar e versionar os três documentos. Não repetir seed/teste para concluir documentação e não modificar as identidades existentes.
Após consolidação, avaliar pendências da matriz: outros papéis e decisões positivas adjusted/rejected ainda exigem preparação específica. Revogação em sessão é cenário distinto do vínculo previamente inativo aqui demonstrado.
Instruções históricas de próxima ação são superadas por este checkpoint. Merge pode acionar deploy sem certificar produção; manter providers/envios fora do escopo.

## Histórico anterior preservado

# Handoff atual — identidade autenticada e URL

## Identidade no corpo de geração e revisão — evidência local de 14/09/2026

- Base 89c118c, merge PR418; branch test/recovery-local-body-identity-validation. Entrega documental, commit/PR ainda pendentes.
- Suíte existente BookingRecoveryRecommendation.http-boundaries.test.ts executada pelo usuário: 1 arquivo / 15 testes aprovados. Já cobre identidade de sessão/URL com autenticação e serviços simulados; não foram adicionados testes duplicados. Nenhum novo build reportado nesta rodada.
- Fixture SQL local exclusiva criada na empresa A: unidade, cliente não roteável, agendamento, feedback e caso 29e01dcd-8bf8-4378-920d-2a6d903efbd2, open e inicialmente sem recomendação. COMMIT confirmado. Três casos anteriores, recomendações e eventos preservados; jobs/outbox zero. Não certifica o fluxo original de atendimento/feedback.
- Testes contra SISAG/Supabase locais, snapshot app-5b36632 com AuthProvider sincronizado. Arquivos centrais comparados com repositório e ausência de .env na raiz conferida; não equivale ao HEAD puro nem certifica todas as variáveis do processo ativo.
- Identidades A/B confirmadas por login e contexto local; sessão A também conferida pela listagem dos próprios casos. Nenhuma credencial/cookie exibido ou versionado.
- Geração: sessão A, caso exclusivo A na URL e companyId/actorId/caseId de B no corpo. HTTP200; exatamente uma nova recomendação shadow/versão 1 e um evento de criação, vinculados à empresa A, ator A e caso da URL, com booking/client correspondentes. Registros anteriores e contagens jobs/outbox preservados.
- Revisão: mesma sessão A e caso exclusivo A na URL; comando accepted/versão 1 com campos extras companyId/actorId/caseId de B. HTTP200 / primeira revisão; accepted com reviewed_version=1 e reviewed_by=A. Um único evento de revisão ligado à empresa A, ator A e caso/recomendação corretos.
- Comparação da revisão preservou campos não mutáveis da recomendação-alvo, outras recomendações, casos completos, eventos anteriores e contagens jobs/outbox. A aceitação e o novo evento são alterações esperadas; não afirmar banco inteiro inalterado.
- Estado final: quatro casos locais e quatro recomendações aceitas. A fixture de identidade não deve ser reanalisada nem os testes repetidos sem novos pré-requisitos.
- Cobertura específica de campos extras enviados juntos por owner A nessas duas rotas. Não certifica outros papéis, todas as combinações de campos, RLS, produção ou ausência de todo tráfego externo.
- Scripts auxiliares fora do repositório. Registro não adiciona cobertura à CI nem altera código de produção, schema, permissões ou banco.

### Próxima ação deste checkpoint

Revisar e versionar os três documentos. Preservar as quatro fixtures; scripts antigos que exigem dois ou três casos/recomendações precisam adaptação antes de reutilização.
Após consolidação, avaliar lacunas restantes: vínculo inativo, demais papéis e decisões positivas adjusted/rejected ainda exigem desenho específico. Não alterar vínculos atuais, criar contas adicionais ou habilitar integrações automaticamente.
Próximas ações históricas abaixo são superadas por este checkpoint. Merge pode acionar deploy sem constituir certificação de produção.

## Histórico anterior preservado

# Handoff atual — geração cruzada local

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

## Histórico anterior preservado

# Handoff atual — recusas HTTP locais

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

## Histórico anterior preservado

# Handoff atual — concorrência local da revisão

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

## Histórico anterior preservado

# Handoff atual — regressões da revisão

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

## Histórico anterior preservado

# Handoff atual — revisão sequencial local

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

## Histórico anterior preservado

# Handoff atual — revisão local entre empresas

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

## Histórico anterior preservado

# Handoff atual — recomendação local

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

## Histórico anterior preservado

Instruções antigas de próxima ação são superadas pelo checkpoint acima.

# Handoff atual — correção da tela de clientes

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

## Histórico anterior preservado

As próximas ações antigas abaixo foram superadas pelo checkpoint acima.

# Handoff atual — 14/09/2026

PR409 consolidado, main em 5b36632. Entrega atual: docs/recovery-browser-validation, somente registro sanitizado da validação manual.
Não criar nova instância se a porta3100 já estiver ocupada. Supabase e fixtures não devem ser recriados. Chaves locais não pertencem ao Git.

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

## Registro anterior (histórico)
As próximas ações e caminhos de snapshot abaixo são históricos; o checkpoint acima prevalece.

# Handoff do desenvolvimento com IA

Atualizado em 13/09/2026.

## Resiliência da fila — após PR #408

- Base confirmada pelo usuário: f363f88, merge do PR408; branch test/recovery-queue-loading-resilience.
- Novo arquivo: src/app/admin/settings/booking-followups/recovery/page.loading.test.tsx.
- Quatro testes com harness controlado de hooks e HTTP simulado executam handlers da página: limite de 15s, recuperação após erro de leitura, ausência de repetição de claim após erro na releitura e aviso de alteração incerta.
- Usuário confirmou 2 arquivos / 7 testes aprovados (inclui 3 testes de responsável), build aprovado e diff --check sem erros em 13/09/2026.
- Sem mudança de código de produção, banco, fixtures ou permissões nesta entrega.
- Não comprova navegador/DOM real, comportamento de rede real, concorrência ou cancelamento da transação no servidor.
- Próxima ação: commit e PR desta cobertura; merge/deploy desta entrega ainda não confirmados.
- Homologação permanece no snapshot PR407 com melhoria do PR408 sincronizada. Inicializador antigo exige HEAD ad161b2 e precisa ajuste antes de nova inicialização; não recriar dados nem parar uma instância saudável.

## Histórico preservado da rodada anterior

O registro abaixo descreve o estado antes do merge PR408; instruções de commit e próxima ação antigas foram superadas pelo checkpoint acima.

# Handoff do desenvolvimento com IA

Atualizado em 13/09/2026.

## Base e entrega
- Base ad161b2, PR407; branch audit/scheduling-recovery-controlled-validation.
- Entrega expandida de roteiro documental para evidência local e melhoria de usabilidade da recuperação.
- Arquivos de código: page.tsx de recuperação, BookingRecoveryManagement.service.ts, RecoveryCaseAssignment.tsx e teste.
- Alterações ainda aguardam commit/PR; nenhum merge ou deploy desta entrega confirmado.
- Homologação em C:/sisag-homolog-local/app-ad161b2: snapshot PR407 com três arquivos da melhoria sincronizados; não equivale ao commit puro.
- Servidor local em 127.0.0.1:3100; não iniciar uma segunda instância. Supabase em 54321/54322; últimas escutas verificadas em loopback.
- Scripts auxiliares em C:/Users/Luis/Documents/Codex/2026-08-03/bem; credenciais locais fora do Git, não compartilhar.
- Checkbox de envio não basta para bloquear jobs existentes. Shadow pode chamar providers configurados. Guard de API aceita owner/admin/staff; vínculo usa limit(1).

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

## Próxima ação imediata
Revisar diff completo, incluindo arquivos novos; commit dos sete arquivos desta entrega e PR para main.
Merge em main aciona workflow de deploy: criação de PR não é autorização para confundir homologação aprovada com todos os cenários validados.
Não limpar banco local nem alterar produção para fechar documentação.
