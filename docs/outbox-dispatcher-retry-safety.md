## Checkpoint para revisão de PR — sem liberação de produção

Conferência local: 20 arquivos no conjunto, diff --check sem erros de whitespace (avisos LF/CRLF). Registro baseado nas saídas fornecidas pelo usuário; não equivale a CI remoto aprovado. Este checkpoint não autoriza commit, push, merge ou deploy.

Antes de implantação: revisão independente do PR, validação dos workflows pelo GitHub, janela e operador responsáveis, controle de produtores e reconciliação de envios em andamento, baseline recente, observação dos estados retidos e plano de reversão. Frontend/runner continuam automáticos na main. A proteção conservadora evita repetição automática por ID; não garante entrega exatamente uma vez, recuperação automática de processing ou reconciliação de delivery_unknown. Nenhuma mensagem real enviada por estes testes.

## Estado atual da revisão local — publicação de imagem protegida

O job inteiro do dispatcher exige main e push, OU main e execução manual com ambas as confirmações. Assim, uma execução manual sem confirmação ou em outra branch não faz login no registro, build/push ou SSH. Push na main continua publicando imagem; o SSH mantém sua condição adicional de execução manual confirmada. Frontend e runner continuam automáticos: merge ainda altera produção. Versões antigas dos workflows e ações externas não são cobertas.

Evidências anteriores: 38 testes offline, 12 testes de rotas, build, três testes estruturais de deploy e testes locais PostgreSQL já aprovados conforme saídas do usuário. Os 12 testes da trava de publicação passaram conforme saída do usuário (três anteriores e nove novos). Avaliação local NÃO executa o motor GitHub Actions nem simula SSH/Swarm ou drenagem. Aprovados 15 cenários executando o trecho Bash real do preflight com função Docker simulada: duas permissões e 13 recusas. Saída fornecida pelo usuário confirma 27 testes de publicação/preflight aprovados, zero falhas e zero ignorados. Os três testes estruturais iniciais estão incluídos nesses 27; não somar novamente. Não executam Docker real, SSH, deploy ou rede; não certificam o servidor nem o motor GitHub Actions. Nenhum push, deploy ou envio autorizado.

## Trava local de deploy do dispatcher — ainda não publicada

Preparada condição de deploy somente por workflow_dispatch na main e duas confirmações explícitas (default false). Push pode construir/publicar imagem, mas pula a etapa SSH do dispatcher. O frontend e seu runner CONTINUAM com deploy automático em push na main: merge ainda altera produção.

Os dois workflows compartilham grupo de concorrência sem cancelar a execução em andamento. Isso não garante ordem de chegada; execuções pendentes podem ser substituídas. Não lançar várias publicações simultâneas. Workflows de versões antigas ou ações manuais fora desse grupo não estão protegidos.

Antes de alterar o dispatcher, consulta remota confere aplicação no mesmo commit, update completed, duas tarefas running desse commit e ausência de tarefas em transição. Não chama as rotas legadas. Essa fotografia não certifica saúde funcional nem bloqueia ações externas concorrentes.

Fila segura continua sendo atestado do operador: a mudança NÃO pausa produtores, NÃO drena/reconcilia mensagens e NÃO habilita monitoramento. Booleanos não substituem janela autorizada. Grupo não cobre todos os workflows do repositório.

Três testes estruturais aprovados conforme saída do usuário. Não equivalem à validação do motor GitHub Actions ou teste de SSH/Swarm. Nenhuma configuração remota alterada e nenhuma publicação autorizada. Os 12 testes das três rotas e o build após seus bloqueios passaram conforme usuário.

## Atualização local — três consumidores HTTP legados bloqueados

Autorizado apenas localmente: POST /api/v1/integration/outbox/dispatch e /api/v1/integration/webhook passam a responder 410/legacy_outbox_dispatch_disabled, sem ler corpo, credenciais, banco ou executar transporte. O endpoint integration/webhook aqui é o consumidor antigo da outbox, não o webhook de recebimento da Meta; nenhuma rota de callbacks da Meta foi alterada.

Os 12 testes das três rotas e o build após seus bloqueios passaram conforme saída do usuário.

Este bloco atualiza as pendências históricas sobre as duas rotas: o bloqueio foi preparado no código local, NÃO está em produção. Publicar apenas o dispatcher não distribui essas rotas; o plano exige deploy autorizado da aplicação e ausência de réplicas antigas acessíveis antes de considerar consumidores neutralizados. Integrações antigas que usem essas URLs receberão 410 após a publicação. Outros processos externos não são certificados por esta mudança.

Sem commit/push/merge/deploy, sem pausa de serviço e sem alteração de dados. Não testar as URLs de produção, onde ainda podem processar a fila.

## Bloqueio local da rota administrativa legada

Mapeamento encontrou /api/v1/admin/outbox/dispatch como consumidor alternativo sem autenticação no handler. A seleção associada não limita attempts. A inelegibilidade dos failed com oito tentativas era válida somente no dispatcher dedicado.

Correção local autorizada: POST retorna 410/legacy_outbox_dispatch_disabled incondicionalmente, sem ler corpo nem importar processador ou banco. Quatro casos de regressão aprovados conforme saída do usuário. Não chamar a rota de produção para verificar: o código antigo pode processar a fila.

IMPORTANTE: essa rota pertence à aplicação Next.js. Publicar somente a imagem do dispatcher NÃO aplica esse bloqueio. O rollout exige revisar também o deploy da aplicação e evitar versões antigas acessíveis. As duas rotas de integração também foram bloqueadas localmente na etapa seguinte; nenhum desses bloqueios está certificado em produção.

Mudança apenas local, sem commit/push/deploy. Nenhum outro endpoint, workflow ou serviço foi desativado.

# Dispatcher WhatsApp — validação local, publicação bloqueada

Branch: audit/outbox-dispatcher-retry-safety. Base: a8eee3f (PR424).

## Diagnóstico e decisão

No código anterior, a recusa do provedor podia terminar como done; uma exceção posterior ao envio podia entrar no retry genérico. Não foi observada duplicação real em produção.

A proposta grava delivery_unknown antes da chamada externa. Exige ID de mensagem para reconhecer aceitação, limita a chamada a 15 segundos e grava log/conclusão em uma transação. Recusas explícitas terminam em delivery_rejected. Resultados ambíguos permanecem retidos, sem reenvio automático. Falha antes da gravação de proteção pode deixar processing sem envio. Eventos genéricos mantêm seu fluxo testado.

Essa política privilegia evitar duplicação, podendo reter mensagens não enviadas. Não garante entrega exatamente uma vez. O INSERT de message_logs existente não persiste clientId; essa associação não foi validada nem adicionada.

## Evidências locais fornecidas pelo usuário

- 38 testes Node passaram no repositório: 19 de roteamento e 19 da proteção/transporte simulado.
- Cinco cenários com PostgreSQL local passaram: accepted, rejected, unknown, missing_id e falha de log. Tabelas temporárias; transporte substituído.
- Concorrência com duas conexões comprovadamente bloqueadas antes da liberação: uma accepted, outra not_owned; um envio simulado, um log e attempts=1. Estrutura descartável removida. Testa a mesma posse, não seleção concorrente de lotes.
- Onze cenários integrados passaram também pelos arquivos do repositório: exhausted, future, invalid_payload, generic_ok, generic_failure, fence_failure, accepted, rejected, unknown, missing_id e log_failure. SQL e handlers da proposta em duas iterações, dependências substituídas e nenhuma chamada HTTP. Nenhuma tabela pública utilizada; limpeza confirmada.
- Build Docker local concluído, tag sisag-outbox-dispatcher:retry-safety-local. Inclui módulo de proteção; CMD confirmado como node /app/outbox-dispatcher.js.
- node --check executado dentro da imagem com --network none sem erro. Isso verifica sintaxe, NÃO inicialização, resolução de todos os imports ou funcionamento do worker na imagem.
- diff --check sem erros de whitespace; avisos LF/CRLF não são aprovação funcional.

## Estado do pacote

Dez arquivos foram aplicados localmente com backup. Dockerfile copia o módulo e corrige CMD para .js; workflow inclui testes offline e rastreia o módulo. Nenhum commit, push ou deploy foi confirmado nesta etapa. Não houve migração nem alteração da fila de produção por estes testes.

O envio único diretamente à Meta, anteriormente autorizado, foi recebido e teve sent/delivered/read registrados; NÃO foi um teste via outbox. Dez failed históricos tinham oito tentativas na fotografia apresentada; não foram reativados. Os workflows publicados informados pelo usuário são comerciais e seus arquivos não chamam diretamente as duas rotas legadas investigadas. Isso não exclui outros chamadores. Acesso n8n recuperado conforme usuário após reset de contas no servidor.

## Bloqueios antes de publicar

1. Confirmar somente por leitura as constraints, defaults, índices e triggers reais de outbox/message_logs. Schema sintético não certifica produção.
2. Tratar consumidores legados: /api/v1/integration/outbox/dispatch e /api/v1/integration/webhook não usam a nova proteção. Chamadas concorrentes podem escapar dela. Não certificar isolamento global só pela ausência de referências no n8n.
3. Definir acompanhamento de delivery_unknown, delivery_rejected e processing retido, responsáveis e procedimento de reconciliação. Não redefinir status, zerar tentativas ou criar evento substituto sem apurar entrega.
4. Validar inicialização/imports da imagem isolada, configuração/override do serviço, estratégia de rollout e rollback. Retomar código antigo não autoriza reenviar estados retidos.
5. Obter autorização explícita: merge na main dispara build/publicação/deploy automático. NÃO consolidar enquanto bloqueios estiverem abertos.

Não foram validados quedas reais, todos os consumidores, configuração real do banco ou entrega ponta a ponta pela fila.

## Continuidade

Próximo passo: consulta somente de leitura dos metadados de produção, sem payloads ou credenciais, e plano de reconciliação. Não iniciar worker novo conectado à fila real.

O ciclo UI anterior terminou resolved com nota de simulação, um evento de resolução, rascunho pending_review e jobs/outbox zero nas consultas apresentadas. Não houve aprovação do rascunho; seu registro documental definitivo permanece separado e pendente.

## Atualização — metadados e imports confirmados

Usuário apresentou consulta de produção em READ ONLY: colunas compatíveis, status text sem CHECK de estados, índice único parcial por outbox_id, sem triggers não internos e RLS desativada. Não identificada necessidade de migração para os estados; permissões de escrita e demais consumidores não certificados.

Imports de pg, outbox-routing.mjs e outbox-whatsapp-safety.mjs confirmados na imagem local com --network none e --read-only. O dispatcher não foi iniciado.

Plano proposto em docs/outbox-dispatcher-rollout-plan.md; NÃO autoriza deploy. Antes de publicar: resolver consumidores legados, definir operador/monitoramento, conferir command/args e rollout reais e obter autorização explícita. As verificações de metadados e imports antes pendentes foram concluídas no escopo acima; demais bloqueios permanecem.
