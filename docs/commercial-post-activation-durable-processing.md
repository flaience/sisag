# Processamento durável pós-ativação comercial

Atualizado em: 24 de agosto de 2026.

Este documento registra o estado comprovado, as decisões arquiteturais e a direção de evolução do processamento pós-ativação comercial do SISAG. Ele complementa o guia de implementação e deve ser atualizado sempre que contratos, operação ou prioridades mudarem.

## 1. Objetivo

O processamento pós-ativação deve acompanhar clientes e marcos comerciais sem depender de execuções longas, memória temporária ou intervenção manual constante. A solução precisa manter:

- rapidez no caminho operacional;
- precisão e idempotência;
- isolamento entre clientes e falhas;
- segurança e rastreabilidade;
- capacidade de expansão horizontal;
- automação com supervisão humana nos pontos sensíveis;
- estrutura internacionalizável sem antecipar localização comercial completa.

## 2. Estado atual comprovado

Em produção existe um pipeline durável executado pelo n8n a cada 15 minutos. O pipeline:

1. adquire um lease exclusivo do runner;
2. recupera trabalhos cujo lock expirou;
3. reivindica um lote limitado de trabalhos vencidos;
4. processa itens com concorrência limitada;
5. conclui, adia, escalona ou registra falha por item;
6. executa as rotinas de compatibilidade ainda existentes;
7. persiste métricas de execução, capacidade e justiça;
8. sincroniza ocorrências operacionais e sinais de SLA;
9. libera o lease mesmo quando há falhas isoladas.

Há dois workflows publicados com responsabilidades distintas:

- `SISAG - Commercial Onboarding Runtime`;
- uma única versão publicada do Due Runner Durable.

Versões anteriores do Due Runner devem permanecer despublicadas para impedir processamento duplicado.

## 3. Componentes principais

### 3.1 Fila durável

A tabela `commercial_post_activation_due_work_items` mantém o trabalho agendado e o histórico técnico necessário para reivindicação, execução e recuperação.

Estados técnicos atuais:

- `scheduled`: aguardando disponibilidade;
- `processing`: reivindicado por um worker com lock temporário;
- `completed`: concluído e fora do caminho quente;
- `failed`: falha técnica registrada, com retentativa limitada quando aplicável.

Escalonamento de negócio é representado separadamente por `escalation_required`. Um item escalado não volta à reivindicação automática.

### 3.2 Índices operacionais

Os índices parciais separam:

- itens reivindicáveis;
- locks de processamento expirados;
- trabalho ainda não concluído;
- histórico concluído;
- itens escalados que exigem ação operacional.

Essa separação evita varreduras desnecessárias quando o volume crescer. Em tabelas pequenas o PostgreSQL pode preferir varredura sequencial; isso não invalida os índices destinados ao volume futuro.

### 3.3 Lease do runner

O lease impede duas execuções do mesmo runner de processarem simultaneamente o mesmo ciclo lógico. Ele possui proprietário, aquisição, expiração e liberação explícita.

### 3.4 Processamento em lotes

O lote possui limites configuráveis e validados:

- quantidade máxima reivindicada;
- concorrência máxima;
- duração do lock;
- intervalo de adiamento.

Falhas são isoladas por item. Uma falha não interrompe os demais trabalhos do lote.

### 3.5 Cursor e justiça

O cursor durável e as métricas de justiça evitam que os primeiros clientes da ordenação monopolizem o processamento. São observados avanço do cursor, ciclos completos e execuções saturadas sem avanço.

### 3.6 Capacidade

Cada execução registra duração, itens examinados, vencidos, processados, falhas, utilização do lote, vazão estimada e possível backlog. A saúde técnica não deve ser confundida com sucesso funcional dos itens.

## 4. Espera de negócio e escalonamento

Esperas de negócio nunca permanecem abertas dentro do n8n. O item é devolvido à fila com `available_at` futuro, liberando worker, conexão e lease.

A política atual estabelece:

- intervalo padrão de adiamento: 900 segundos;
- máximo padrão: 96 adiamentos;
- janela máxima padrão: 86.400 segundos;
- escalonamento quando o limite de quantidade ou tempo é atingido;
- preservação de `first_deferred_at` como origem durável da espera;
- registro do último adiamento e de seu motivo estruturado.

Campos persistidos:

- `deferred_count`;
- `first_deferred_at`;
- `last_deferred_at`;
- `last_deferral_reason`;
- `escalation_required`.

Motivos estruturados atuais:

- `business_wait`;
- `deferral_limit_reached`;
- `wait_deadline_reached`.

## 5. Garantias implementadas

- chave única por onboarding e marco;
- locks temporários com recuperação de expiração;
- idempotência nas projeções e sincronizações;
- tentativas técnicas limitadas e backoff;
- adiamento de negócio sem consumo de tentativa técnica;
- espera persistida em vez de execução longa;
- itens escalados excluídos da reivindicação automática;
- itens concluídos isolados do caminho quente;
- RLS habilitado nas tabelas operacionais aplicáveis;
- validação de entrada nas fronteiras de API;
- mensagens externas sem exposição de detalhes privados;
- métricas de capacidade e justiça persistidas;
- testes direcionados, suíte completa e build nas entregas.

## 6. Evidências de produção

Foram observados em produção:

- capacidade e justiça com estado `healthy`;
- `possibleBacklog: false` no conjunto atual;
- sincronização sem falhas;
- recuperação sem itens expirados no ciclo observado;
- lote classificando separadamente concluídos, adiados, escalados, falhos e falhas de settlement;
- adiamento persistido com diferença exata de 900 segundos entre `last_deferred_at` e `available_at`;
- `wait_preserved: true` após a correção de sincronização;
- item `adoption_d1` com histórico de adiamentos preservado;
- sincronização posterior com `updated: 0` e itens preservados, sem desfazer a espera.

## 7. Incidente detectado e correção

Após a primeira integração da política, a sincronização da projeção redefinia `available_at` para a data histórica do marco. O item ficava imediatamente reivindicável em todos os ciclos, embora o settlement registrasse o adiamento.

A detecção ocorreu pela comparação entre:

- `last_deferred_at` recente;
- `available_at` anterior ao adiamento;
- `wait_preserved: false`;
- avanço recorrente de `dueWork.updated`.

A correção passou a preservar a disponibilidade durável quando há histórico de adiamento ou escalonamento. Alterações legítimas em prazo e prioridade continuam possíveis sem antecipar `available_at`.

Critério de regressão:

```text
available_at > last_deferred_at
available_at - last_deferred_at = intervalo configurado
```

## 8. Operação e diagnóstico

Para cada execução, verificar:

- lease adquirido e liberado;
- `capacity.status` e `fairness.status`;
- `possibleBacklog`;
- sincronização e recuperação;
- `claimed`, `completed`, `deferred`, `escalated`, `failed` e `settlementFailed`;
- correspondência entre a soma dos resultados e `claimed`;
- ausência de itens `processing` com lock expirado sem recuperação;
- idade do item aberto mais antigo.

`status: healthy` no processamento significa que o mecanismo terminou de forma consistente. Não significa que todos os itens foram concluídos. Adiamentos, escalonamentos e falhas funcionais devem aparecer separadamente no painel.

## 9. Princípios que orientam as próximas entregas

- consolidar o produto básico antes de ampliar frentes experimentais;
- entregar mudanças pequenas, testáveis e reversíveis;
- medir antes de aumentar limites;
- evitar esperas, loops ou payloads extensos no n8n;
- manter regras de domínio fora do workflow;
- usar o n8n para orquestração, não como banco ou motor de estado;
- autorizar agentes e ferramentas MCP por escopo mínimo;
- exigir confirmação humana para ações sensíveis;
- manter auditoria estruturada;
- preparar internacionalização estrutural agora;
- realizar localização comercial completa somente após validação de mercado.

## 10. Próximos marcos

### Marco A — Visibilidade operacional de espera

1. consulta agregada de adiados e escalados;
2. API protegida para consulta;
3. painel com quantidade, idade, motivo e prazo;
4. detalhe operacional sem expor dados sensíveis;
5. ação humana auditada para resolver ou reprogramar escalonamento.

Critério de aceite: nenhum item pode permanecer escalado sem aparecer claramente para a operação.

### Marco B — Encerramento do pipeline legado

1. identificar sobreposição entre o processador indexado e `Run Due Milestones` — concluído na [auditoria de sobreposição](./commercial-post-activation-runner-overlap-audit.md);
2. extrair um contrato exclusivo de projeção e sincronização, sem execução direta;
3. comparar resultados durante período controlado;
4. remover processamento duplicado mantendo compatibilidade necessária;
5. simplificar métricas e sequência do workflow.

Decisão registrada: o processador indexado será o executor único, mas o runner legado permanece até que projeção, cursor e fairness sejam separados da execução direta.

Critério de aceite: uma única fonte executa cada trabalho, sem perder sincronização, alertas ou SLA.

### Marco C — Testes de escala e limites

1. gerar carga representativa com múltiplas empresas;
2. medir banco, API, n8n e serviços externos;
3. testar saturação, recuperação e justiça;
4. definir SLOs e alertas de capacidade;
5. documentar gatilhos para ampliar workers, lotes ou frequência.

Critério de aceite: limites de operação conhecidos por evidência, não por estimativa informal.

### Marco D — Experiência visual

1. consolidar painel de agendamentos e trabalho pós-ativação;
2. diferenciar estados de negócio e estados técnicos;
3. exibir concluídos fora do caminho operacional, mantendo auditoria;
4. incluir estados como confirmado, não respondido, ausente, concluído e escalado quando os respectivos domínios forem implementados;
5. manter interface simples apesar da sofisticação interna.

### Marco E — Agentes, MCP e voz

1. definir comandos estruturados independentes de idioma;
2. autorizar ferramentas por tenant, papel e ação;
3. registrar intenção, parâmetros, execução e resultado;
4. introduzir voz como camada de entrada, não como regra de domínio;
5. reutilizar os mesmos fundamentos no controle da marca Flaience.

Esse marco somente avança após o produto básico e os controles operacionais estarem consolidados.

## 11. Internacionalização estrutural

Idioma, localidade, fuso horário, moeda e canal devem ser parâmetros explícitos. Identificadores, eventos e comandos internos não devem depender de texto traduzido.

Diretriz vigente:

> Internacionalização estrutural agora; localização comercial completa quando houver mercado validado.

A primeira expansão considerada é o mercado latino-americano, com espanhol como próxima localização comercial provável. A arquitetura deve permitir essa evolução sem duplicar workflows ou regras de negócio por país.

## 12. Riscos ainda abertos

- política operacional para tratar escalonamentos humanos;
- retenção e arquivamento de históricos extensos;
- eliminação segura da sobreposição com o runner legado;
- limites de capacidade ainda não comprovados por teste de carga amplo;
- dependência de serviços externos e seus limites;
- proteção contra crescimento de payloads e logs;
- definição de SLOs, alertas e resposta a incidentes;
- separação completa entre estados de agendamento e estados técnicos da fila.

## 13. Regra de atualização

Atualizar este documento quando ocorrer qualquer um dos eventos:

- novo estado persistido;
- mudança de política ou limite;
- alteração na ordem do workflow;
- criação ou remoção de endpoint;
- novo indicador operacional;
- incidente relevante ou correção de produção;
- resultado de teste de carga;
- início de nova etapa visual, internacional ou baseada em agentes.

Toda afirmação de capacidade ou prontidão comercial deve indicar se é hipótese, resultado de teste ou evidência de produção.

## 14. Fronteira de produto e controle

A separação entre o Centro de Controle Flaience e a operação da empresa cliente
está registrada em [`platform-control-plane-boundary.md`](./platform-control-plane-boundary.md).
Nenhum painel técnico de plataforma deve ser exposto ao tenant apenas por reutilização de interface.
