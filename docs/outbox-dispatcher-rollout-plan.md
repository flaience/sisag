## Evidência de implantação e envio único em produção — PR #425

Registro baseado nas saídas do servidor/GitHub e confirmações fornecidas pelo operador nesta conversa; não é uma inspeção independente de produção. Os blocos abaixo deste registro preservam o histórico pré-deploy e suas restrições à época.

- O operador integrou o PR antes da etapa de revisão em rascunho planejada. Aplicação (duas réplicas) e scheduling runner foram atualizados automaticamente para 445ce839b82862876645142d7a3fa87ee6b9dd28. A etapa SSH do dispatcher no push foi ignorada; serviço permaneceu na versão 903b184b0c6622bbc2902452085e1a6f2a276fb9 até o deploy manual autorizado.
- Janela autorizada com declaração de ausência de usuários. Runner reduzido de uma para zero réplicas. Os workflows n8n Commercial Onboarding Runtime e Commercial Post-Activation Due Runner foram despublicados; operador confirmou nenhuma execução ativa. Aplicação permaneceu acessível: não houve bloqueio absoluto de todos os produtores.
- Fotografias antes e depois do deploy apresentaram 217 done, 10 failed com oito tentativas e 2 sent; nenhum elegível ou processing nas tabelas fornecidas. Contagens não provam imutabilidade de cada registro ou ausência de tráfego entre consultas. Falhas históricas não foram reativadas pelo procedimento.
- Deploy manual após ambas as confirmações: dispatcher em 445ce839b82862876645142d7a3fa87ee6b9dd28, Update=completed, tarefa Running sem erro indicado. Container observado a61f4bb18e98; este ID é histórico e deve ser redescoberto em operações futuras. Digest da nova imagem do dispatcher não foi fornecido.
- Retomada confirmada: runner com uma réplica Running e ambos os workflows n8n republicados.

### Envio controlado autorizado

Empresa SEG SERRA, UUID 9af03377-1d22-40be-9460-dbe07b2709d5. Um evento inserido diretamente na outbox para validar o dispatcher, não a interface nem o produtor de recuperação. Provider Meta, template hello_world/en_US, remetente de teste e destinatário próprio terminado em 6187.

Evento: bd56df81-9cf7-48ef-8d57-c26b3f714c25.
Chave fixa: manual-validation:pr425:seg-serra:6187:hello-world:v1.
Operador confirmou recebimento. Consulta posterior: status done, attempts=1, bloqueio liberado=true, sem retry agendado=true, logs=1, logs Meta com provider message ID=1 e logs da empresa correta=1.

O caso comprova um envio aceito e recebido com finalização/log associados. Não houve consulta aos recibos delivered/read deste evento, nem validação de conteúdo integral do log. Não certifica exatamente uma entrega, concorrência/falhas reais em produção, todos os tenants/papéis, consumidores externos ou o fluxo ponta a ponta de recuperação. Não repetir este evento nem gerar chave alternativa para contornar deduplicação.

### Continuidade

Nenhuma nova mensagem ou intervenção é autorizada por este registro. Monitoramento permanente e procedimentos de reconciliação seguem necessários. Um novo merge documental ainda pode disparar deploy automático da aplicação/runner; publicar este registro requer planejar esse efeito separadamente.

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

# Outbox WhatsApp — plano operacional proposto

Status: NÃO AUTORIZADO PARA EXECUÇÃO EM PRODUÇÃO.
Branch: audit/outbox-dispatcher-retry-safety; base a8eee3f (PR424).

## Evidências e limites

O usuário confirmou 38 testes offline, cinco cenários PostgreSQL locais, uma disputa entre conexões e 11 cenários integrados com transporte substituído. Build local, sintaxe na imagem, CMD e imports de pg/roteamento/proteção passaram. O processo do dispatcher NÃO foi iniciado na imagem. Testes não envolveram transporte real.

A consulta de produção apresentou transaction_read_only=on, outbox.status text sem CHECK de valores, colunas esperadas, índice único parcial message_logs.outbox_id e ausência de triggers não internos. RLS está desativada nas duas tabelas. Esses metadados não indicam migração necessária para os novos estados, mas não certificam permissões de escrita, outros consumidores ou isolamento entre empresas.

As rotas legadas de integração foram bloqueadas localmente, mas a versão de produção ainda não foi atualizada. Os dois workflows n8n publicados analisados não as chamam diretamente. Isso não demonstra que não existam chamadas externas. O bloqueio de publicação permanece até esse risco ser tratado ou comprovadamente isolado.

## Tratamento dos estados

| Estado | Interpretação e ação |
| --- | --- |
| delivery_unknown | A proteção foi persistida antes da chamada; pode ter ocorrido envio ou apenas interrupção anterior. Correlacionar outbox ID, horários, logs, provider message ID quando disponível e recibos. Não reenviar pela ausência de log. |
| delivery_rejected | Recusa explícita do provedor OU rejeição local por configuração/payload. Corrigir a causa e registrar decisão humana antes de qualquer nova tentativa; recusa temporária também fica retida nesta proposta. |
| processing | Pode haver processamento em andamento, queda anterior à proteção ou falha ao persistir a proteção. Conferir a instância responsável e atividade real antes de intervir. Idade do registro, sozinha, não autoriza reset. |
| done | A finalização foi persistida; para WhatsApp, aceitação não equivale a delivered/read. Consultar recibos separadamente. |
| failed histórico | Não zerar attempts nem alterar next_retry_at para destravar a fila. Os registros já existentes não foram reconciliados por esta entrega. |

Não apagar registros, mudar estados diretamente ou criar eventos substitutos para contornar retenções. Um novo evento com outro ID escapa da proteção por linha. A proposta não garante exatamente uma entrega.

Toda intervenção deve registrar responsável, evento, evidências consultadas, conclusão, autorização e resultado. Não incluir tokens, texto de mensagens ou telefone completo no registro compartilhado. Quando não houver prova suficiente para determinar entrega, manter retido e escalar para decisão humana.

## Acompanhamento necessário antes de habilitar

- Definir operador responsável e período de cobertura; ainda não definidos.
- Definir consultas/alertas para novos delivery_unknown, delivery_rejected e processing retidos; não há monitoramento automatizado configurado nesta entrega.
- Registrar baseline recente por estado, tentativas, idade e tipo, sem expor payloads. Contagens antigas não substituem uma fotografia imediatamente anterior à mudança.
- O teste deve usar somente destinatário expressamente autorizado, evento identificável e limite de um envio. Nenhuma autorização de envio anterior vale como autorização para este teste futuro.

## Portões de publicação — ações futuras, não executadas

1. Revisar e aprovar código e plano. Resolver/neutralizar consumidores concorrentes legados com mudança específica autorizada.
2. Confirmar configuração atual do serviço, override de command/args, versão fixada da imagem anterior, política de atualização/rollback e ausência de outro sender. Nunca compartilhar env completo ou Docker Secrets.
3. Definir janela, responsável e autorização explícita. O merge na main continua publicando aplicação/runner e imagem do dispatcher; não usar merge apenas para arquivar evidências. O deploy do dispatcher exige execução manual confirmada; não há aprovação independente por GitHub Environment configurada nesta mudança.
4. Planejar controle de entrada e drenagem para evitar coexistência de worker antigo e novo durante rollout. Não pausar produtores ou serviços sem autorização, pois a outbox também atende eventos comerciais.
5. Obter baseline e cópia de segurança segundo o procedimento operacional existente. Não clonar dados reais para homologação.
6. Após autorização de deploy, confirmar imagem efetiva, réplicas, saúde, imports e logs sanitizados. A nova imagem pode processar eventos elegíveis assim que iniciar: deploy não é uma operação somente de leitura.
7. Somente com nova autorização, executar um teste ponta a ponta controlado. A aceitação da Meta, o log, a conclusão da outbox e os recibos são verificações distintas. Não repetir por timeout sem reconciliação.

## Critérios para interromper e reverter

Erro de inicialização, aumento inesperado de retenções, estados incompatíveis, envio duplicado, destinatário indevido ou múltiplos consumidores exigem interromper a expansão do teste e acionar o responsável. A parada do dispatcher pode afetar eventos comerciais e deve seguir autorização/plano de incidente.

Antes de reverter: verificar chamadas em andamento, preservar estado/logs e inventariar eventos afetados. Não executar rollout e rollback concorrentes.

Rollback deve apontar para imagem anterior explicitamente identificada e configuração revisada, nunca apenas latest. O código anterior contém o risco que motivou esta mudança; reativá-lo não é garantia de segurança. Manter produtor/envio afetado contido conforme plano autorizado, se necessário.

Não reclassificar delivery_unknown/delivery_rejected nem restaurar indiscriminadamente o banco para forçar processamento. Não repor credenciais antigas. Verificar saúde e reconciliar manualmente eventos da janela; rollback de imagem não desfaz mensagens já enviadas.

## Próximo passo

Revisar este plano e fechar responsáveis, isolamento dos consumidores legados e configuração real de rollout. Nenhum commit, push, merge, deploy, pausa, reset ou envio está autorizado por este documento.
