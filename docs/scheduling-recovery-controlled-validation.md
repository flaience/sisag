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
