# Auditoria da saúde do retrieval estável

Data: 10/09/2026. Base: bf92b40 (PR #400).
Branch: audit/scheduling-ai-retrieval-stable-health-readiness.

## Veredito

Auditoria de código encerrada para os achados A1–A4, corrigidos no PR #402 e cobertos pela validação direcionada. O usuário confirmou 8 arquivos/54 testes aprovados, build concluído e consolidação; o Git confirma o merge b1eac76. O estado dos jobs de CI não foi consultado independentemente. Este veredito não atesta saúde de produção nem autoriza ações automáticas.

## Método e alcance

Leitura dos serviços de métricas, observabilidade, gate, composição, rota, runtime e interface.
Reprodução local com as funções TypeScript reais, transpiladas em memória, usando dados sintéticos.
Nenhum acesso ao banco de produção ou disparo de integração.
Tenant e autorização foram inspecionados no código; não houve ensaio integrado com duas empresas ou duas sessões autenticadas.
Testes anteriores reportados pelo usuário: PR #400 com 3 arquivos/19 testes aprovados e build concluído. Isso não substitui os cenários desta auditoria.

## Achados históricos na base bf92b40 (corrigidos no PR #402)

### A1 — P1: métricas ausentes viram zero e permitem saudável

Fonte: src/modules/agents/RecoveryRetrievalStableMetrics.ts, função num; RecoveryRetrievalStableHealthGate.ts.
Reprodução: 50 registros estáveis do mesmo plano/candidato, mode=ai, sem durationMs e totalTokens.
Resultado: successRate=100, p95DurationMs=0, averageTokens=0, status=healthy.
Impacto: ausência de telemetria é apresentada como eficiência dentro dos limites.
Correção exigida: contabilizar cobertura e valores inválidos; preservar desconhecido; impedir conclusão saudável sem evidência suficiente para os indicadores exigidos.
Aceite: valores ausentes, NaN, infinitos e negativos não são convertidos em evidência de bom desempenho.

### A2 — P1: limite de consulta sem sinalização de incompletude

Fonte: src/modules/agents/RecoveryRetrievalStableObservability.service.ts.
Inspeção: consulta os dois períodos juntos com limit(10000), sem ordenação, paginação, contagem ou flag de truncamento. O limite é aplicado antes do filtro de execuções estáveis.
Impacto condicionado: acima do limite, os períodos podem conter subconjuntos incompletos e distribuição desigual, sem aviso ao gate ou ao usuário.
Não foi feita reprodução com banco nesta auditoria.
Correção exigida: agregar toda a janela ou detectar truncamento de forma explícita, com seleção determinística e avaliação inconclusiva quando incompleta.
Aceite: cenário acima do limite com registros de ambos os períodos e registros não estáveis não produz saudável como se a janela estivesse completa.

### A3 — P2: baseline sem amostra mínima

Fonte: src/modules/agents/RecoveryRetrievalStableHealthGate.ts.
Reprodução: atual com 100 execuções, 97% de sucesso e 3% de fallback; anterior com uma execução, 100% de sucesso e 0% de fallback, mesmo plano/candidato.
Resultado: baseline.available=true e status=critical por regressão de 3 p.p.; limites absolutos atendidos.
Impacto: comparação pode dar peso decisivo a uma amostra anterior mínima.
Correção exigida: definir mínimo versionado para baseline; abaixo dele, regressões não avaliadas, com motivo e amostra visíveis.
Aceite: baseline de uma execução não determina regressão crítica; limites absolutos continuam avaliados.

### A4 — P2: agrupamento ignora candidato

Fonte: src/modules/agents/RecoveryRetrievalStableMetrics.ts.
Reprodução: dois registros do mesmo plano, candidatos diferentes, um ai e outro fallback.
Resultado: um grupo com duas execuções atribuído ao candidato do primeiro registro.
Impacto condicionado: registros inconsistentes/históricos podem misturar candidatos e contaminar o baseline. O runtime atual deriva o candidato do plano; não foi demonstrada ocorrência real dessa inconsistência.
Correção exigida: agrupar pela chave plano+candidato ou rejeitar explicitamente inconsistências.
Aceite: candidatos distintos não compartilham métricas ou comparação por acidente.

## Controles observados

- Rota GET exige owner e deriva companyId da autenticação.
- Consulta de observabilidade filtra companyId e limita a janela entre 1 e 90 dias.
- Gate devolve automaticAction=false e requiresHumanReview=true.
- Amostra atual abaixo de 50 retorna insufficient_data na reprodução.
- Baseline inexistente retorna available=false.
- UI usa classificação do servidor, informa baseline ausente e cancela requisições anteriores.
- Não foram encontrados comandos de mutação ou integração externa nesse caminho de saúde.

## Critérios definidos na abertura da auditoria

Corrigir A1/A2 antes de confiar em saudável como evidência completa.
Resolver A3/A4 com testes comportamentais das condições descritas.
Adicionar testes com consultas simuladas/integradas para tenant, limites e divisão temporal.
Executar testes direcionados e build após as correções, atualizar este veredito e o handoff.
Sem SQL ou alteração de produção nesta entrega documental.

## Correções e evidências — PR #402

Base da correção: db5099f (PR #401). Data: 11/09/2026.

- A1: medições desconhecidas são null; médias usam somente valores válidos; cobertura explícita de modos, duração e tokens bloqueia saudável quando incompleta. Zero medido permanece zero.
- A2: seleção ordenada por createdAt/id decrescentes, busca de 10001 para amostra limitada a 10000. Linha extra sinaliza incompletude antes do filtro de estáveis. Ambos os períodos são tratados conservadoramente como incompletos e deltas ficam null.
- A3: política recovery_retrieval_stable_health_v2 exige 50 registros prévios e cobertura de modos válida. Baseline menor não avalia regressões; critérios absolutos permanecem avaliados.
- A4: agrupamento pela chave composta plano+candidato.
- UI: mostra medições válidas, ausência de medição, janela incompleta e baseline insuficiente; nenhum indicador desconhecido aparece como aprovado.

Verificação local em cópia de trabalho: reproduções A1/A2/A3/A4, parâmetros SQL de tenant/janela, 10000/10001 registros, composição do serviço e renderização inconclusiva passaram. Checagem semântica TypeScript: zero erros.
Vitest não iniciou no ambiente do assistente por restrição de acesso ao diretório de configuração. Esses checks não equivalem à execução da suíte Vitest.
Validação posterior reportada pelo usuário em 11/09/2026: 8 arquivos e 54 testes aprovados, duração 13,16 s, build concluído. PR #402 consolidado no merge b1eac76; commit de implementação d9eb6a8. A restrição local do assistente não impediu essa validação no terminal do usuário.
Não foi validado o banco de produção. A solução de A2 sinaliza truncamento; não faz agregação ilimitada. Em alto volume, reduzir o período ou planejar agregação completa.

## Encerramento — PR #403

Data: 11/09/2026. Base documental: b1eac76.

A1–A4 encerrados no escopo de código e testes direcionados. A evidência inclui consulta simulada, limites de 10000/10001 registros, isolamento por candidato, baseline mínimo e apresentação inconclusiva.
Nenhuma consulta a dados reais, teste integrado de autorização entre empresas ou verificação do deploy foi realizada nesta etapa.
Próxima verificação operacional: confirmar a versão implantada e observar o painel e o endpoint com uma sessão autorizada, registrando período, completude e cobertura sem copiar dados pessoais para este documento.
