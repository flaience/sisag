# SISAG — plano consolidado de execução com IA

Data: 22/09/2026. Piloto: SEG SERRA. Estado: plano de execução local, sem mudança de produção. Fonte estratégica: C:/sisag/docs/PRODUCT-MISSION.md, especialmente seções 2, 8, 11, 12 e 17. Este plano operacionaliza a missão existente; não a substitui.

## 1. Entrega que define o produto

Uma pessoa solicita atendimento por áudio ou texto no WhatsApp; o assistente usa conhecimento aprovado da empresa, identifica serviço e preferências, consulta horários reais, oferece alternativas, pede confirmação e grava uma reserva visível para a equipe. A empresa recebe orientação contextual para configurar e operar o processo. IA auxilia a engenharia com decisões, testes e histórico verificáveis.

IA e áudio são requisitos de aceite do piloto, não opcionais futuros. Áudio inicial significa mensagem de voz no WhatsApp, não chamada de voz em tempo real. Resposta textual é obrigatória; resposta sintetizada em áudio é evolução separada. Nem teste de template nem transcrição isolada encerram esse marco.

## 2. Decisões e limites

- Um núcleo oficial de agendamento (bookings); agentes, interface, MCP e n8n não mantêm agendas paralelas.
- Reutilizar componentes existentes após verificar seu comportamento. Não escolher o motor de conversa por nome ou alterar variável de produção para experimentar.
- RAG recupera conhecimento aprovado e versionado por empresa. Não decide disponibilidade, não substitui autenticação e não transforma documentos em instruções privilegiadas.
- MCP expõe ferramentas com contexto autenticado, esquemas, permissões, auditoria e confirmação. Catálogo de nomes não equivale a integração MCP executável.
- Modelo interpreta e propõe; domínio valida e persiste. Identidade/empresa vêm do contexto confiável, não da resposta do modelo.
- n8n coordena efeitos posteriores; falha de comunicação não cria novamente a reserva.
- Nenhum agente altera produção, permissões ou banco arbitrariamente. Envio externo, custo de provedor e implantação exigem aprovação delimitada.
- Profissionais são sugeridos por serviço habilitado, preferência e disponibilidade; rodízio só sob regra empresarial aprovada. Informar o profissional antes da confirmação.

## 3. Marcos de produto

| Marco | Resultado demonstrável | Critério para concluir | Dependência |
|---|---|---|---|
| M0 — Recuperação e contrato | Uma matriz requisito → código → teste → evidência e roteiro de demonstração | Caminho de entrada, empresa, motor, ferramentas, reserva e saída identificados; nenhuma premissa crítica escondida | Documentação e inspeção local |
| M1 — Percurso vertical em homologação | Áudio ou texto → entendimento por IA → catálogo/RAG → ferramentas → escolha → confirmação → booking visível | Conversas de aceite passam; sem disponibilidade inventada, escrita antecipada ou duplicação; configuração de teste isolada | M0, permissão de edição, provedores aprovados e dados fictícios |
| M2 — Operação assistida da equipe | Painel coerente, ajuda contextual, pendência humana e suspensão do agente ao assumir | Operador encontra reserva, bloqueia horário e assume conversa com contexto; assistente explica configuração faltante sem falsa promessa de encaminhamento | M1; pode compartilhar desenvolvimento, mas precisa integração |
| M3 — Piloto controlado SEG SERRA | Mesmo percurso por WhatsApp com catálogo aprovado e usuários autorizados | Recepção e agendante validam roteiro real; observação de erros/custos, contenção e reversão disponíveis | M1 e M2; janela e envio autorizados |
| M4 — Ciclo completo e escala | Consultar, remarcar, cancelar e lidar com exceções naturalmente; expandir catálogo/empresas | Regras preservadas, sem mensagens antigas indevidas; isolamento multiempresa testado e qualidade medida | Piloto observado e limites definidos |
| M5 — Aprendizado e suporte ampliados | Orientação contextual e diagnóstico com ferramentas autorizadas; evolução assistida | Respostas fundamentadas, escalonamento real e revisão das melhorias; sem alteração autônoma irrestrita | Evidências do piloto |

Sem prazo fictício. Após M0, dimensionar M1/M2 em tarefas e estimar intervalos com premissas explícitas. Não postergar IA/voz até terminar todas as funções de uma agenda convencional.

## 4. Roteiro mínimo de aceite

1. Texto com serviço e preferência: aproveita dados, não repete perguntas respondidas.
2. Áudio com data/período: transcreve, esclarece ambiguidades e consulta slots reais.
3. Vários profissionais: respeita preferência ou oferece primeiro disponível com explicação factual.
4. Cliente escolhe “o segundo”: opção corresponde ao horário apresentado, não a 02:00.
5. Cliente muda dia ou profissional: preserva o restante do contexto e invalida proposta antiga.
6. Horário ocupado após oferta: não afirma sucesso; oferece alternativas sem reserva duplicada.
7. Mesmo callback recebido duas vezes e mensagens próximas: processamento seguro e sessão consistente.
8. Modelo/transcrição indisponível ou resposta inválida: nenhuma ação inventada; pendência/retentativa controlada.
9. Consulta à base: usa conteúdo da empresa correta, recusa instruções maliciosas nos documentos e não expõe histórico alheio.
10. Confirmação: ID persistido, reserva na lista/painel e comunicação correlacionada. Resultado incerto não provoca repetição cega.
11. Equipe pergunta por que não há horários: diagnóstico das configurações consultadas, sem expor segredos.
12. Encaminhamento humano: pendência real com resumo; agente deixa de atuar até devolução autorizada.

São cenários a implementar/verificar, não resultados já obtidos. Sucesso exige teste de execução e demonstração; procurar texto em arquivos não basta.

## 5. Backlog imediato e ordem de trabalho

| ID | Trabalho | Saída verificável |
|---|---|---|
| IA-01 | Rastrear os dois motores, entrada Meta, sessão, capacidades MCP e provedores existentes | Matriz com fontes, pendências e decisão de um único caminho; confirmar configuração efetiva sem expor credenciais |
| IA-02 | Proteger e tornar recuperável o recebimento | Assinatura, empresa, idempotência, ordenação e falhas exercitados em homologação; não apenas ignorar logs recebidos |
| IA-03 | Adaptador de áudio e interpretação estruturada | Transcrição limitada por tamanho/tempo; intenções e campos validados, fuso e data de referência explícitos |
| IA-04 | Base da empresa e ferramentas operacionais | Conhecimento aprovado e separado por tenant; consulta de catálogo/slots e comando de reserva via contrato controlado |
| IA-05 | Sessão de escolha e confirmação persistente | Correções, opções numeradas, confirmação e reconciliação ligadas ao backend existente |
| IA-06 | Experiência profissional/recepção mínima | Reserva visível na mesma fonte oficial; pendências e ajuda contextual |
| IA-07 | Demonstração integral e evidências | Roteiro executado com dados fictícios e depois teste externo especificamente autorizado |

O componente scheduling-choice.mjs é um experimento local com 14 testes, não uma funcionalidade integrada. Só será incorporado se servir ao contrato escolhido; não criar um terceiro motor concorrente.

## 6. Base factual conhecida e lacunas

- Missão original contempla agentes de operação, treinamento, suporte e evolução. Plano antigo de prontidão dizia que voz/MCP/agentes não bloqueavam piloto; essa prioridade precisa ser reconciliada formalmente com este escopo, sem apagar história.
- Webhook inspecionado processa texto; ramo padrão usa AssistantWhatsAppService e parâmetro pode selecionar ConversationEngine. Valor efetivo em produção não verificado neste levantamento.
- Há código para sessão, disponibilidade, confirmação, bookings e resposta via outbox; isso não comprova uma conversa ponta a ponta funcionando.
- Agenda visual e dashboard inspecionados ainda consultam appointments. A demonstração deve mostrar booking na fonte oficial; transição da agenda exige decisão explícita, não dupla escrita.
- Um envio hello_world em produção foi recebido e ficou done/1 tentativa/1 log na empresa correta. Não comprova áudio, agente, RAG ou criação de reserva pelo WhatsApp.
- Repositório local observado em docs/outbox-production-validation, commit 6da1fcc, limpo. Evidências documentais ainda separadas da main.
- Escrita em C:/sisag não concedida na sessão anterior. Não contornar: solicitar acesso apropriado ou usar aplicação local revisada pelo usuário. Provedores pagos não serão ativados sem aprovação.

## 7. Gestão e continuidade

Responsabilidade de engenharia: recuperar contexto, propor desenho, implementar, testar e apresentar evidência/limites. Luis decide escopo de negócio, uso de orçamento/dados e autoriza produção; operador da SEG SERRA valida a experiência, não precisa conduzir cada comando técnico.

Uma entrega em andamento por objetivo. Ao fim: demonstrado / não demonstrado / bloqueio / próxima ação, com versão e evidência. Toda nova tarefa começa lendo missão, este plano e último checkpoint antes de redefinir prioridades. Não depender da memória do chat. Consolidar PRs por resultado funcional, não por cada registro de teste.

Commit não é critério de produto concluído. Uma etapa termina quando o roteiro de aceite funciona no ambiente declarado e seus limites são registrados. Merge, deploy e autorização de envio são decisões distintas. Documentação também pode acionar deploy nos workflows atuais; não consolidar PR documental sem considerar esse efeito.

## 8. Medidas do piloto

Acompanhar conclusão correta da reserva, perguntas redundantes, necessidade de intervenção, compreensão de áudio, fidelidade da base, latência e custo por conversa. Metas quantitativas só após baseline. Falhas de isolamento, reserva indevida e confirmação falsa bloqueiam liberação. Comparação comercial e afirmações de pioneirismo exigem pesquisa própria; não são pressupostos deste plano.

Próxima ação: concluir IA-01 em leitura e fechar contrato do percurso antes de novas mudanças. Nada neste plano autoriza deploy, envio, migração ou autonomia irrestrita.

## Checkpoint IA-03 — fundação local

- PR #426 consolidou escolha persistida e confirmação transacional do horário.
- Esta etapa cria contratos testáveis de áudio e interpretação estruturada, sem ativação externa.
- Aceite local: limites falham fechados, saída de modelo é validada, data/fuso são determinísticos e nenhum caminho grava reserva.
- Pendente: adaptador autenticado da Meta, provedor de transcrição aprovado, configuração por ambiente e demonstração com áudio fictício.

## Checkpoint IA-03 — download Meta isolado

- Adaptador de download autenticado implementado com HTTP substituível e testes sem rede.
- Token continua responsabilidade da composição autorizada; o adaptador não lê ambiente ou secret file.
- Nenhuma transcrição, reserva, resposta externa ou mudança no webhook é executada nesta etapa.
- Pendente: definir a composição de credenciais por serviço, integrar mídia ao recebimento recuperável e autorizar um provedor de transcrição.

## IA-04 — ingestão durável de áudio

- [x] Reconhecer texto e áudio por contrato explícito no webhook da Meta.
- [x] Preservar tenant, conta, providerMessageId e mediaId.
- [x] Persistir áudio como recebido e pendente de transcrição.
- [x] Impedir que áudio não transcrito alcance os motores textuais.
- [x] Manter download, transcrição, interpretação e execução desativados nesta etapa.

## IA-05 — orquestração isolada de download

- [x] Compor downloader autenticado e transcrição limitada.
- [x] Exigir credencial e dependências injetadas explicitamente.
- [x] Rejeitar metadados incompletos antes de rede.
- [x] Sanitizar falhas de configuração, transporte e provedor.
- [x] Manter webhook, reservas e respostas externas desconectados.

## IA-06 — adaptador de transcrição

- [x] Implementar contrato multipart para transcrição de áudio.
- [x] Fixar origem HTTPS e bloquear redirecionamentos.
- [x] Exigir chave, modelo e transporte controlados.
- [x] Normalizar pt-BR para o código de idioma do provedor.
- [x] Sanitizar falhas HTTP, transporte e respostas inválidas.
- [x] Manter o adaptador desconectado do webhook e das ações de negócio.

## IA-07 — ciclo durável de processamento

- [x] Persistir estados pending, processing, completed e failed.
- [x] Deduplicar por tenant e providerMessageId.
- [x] Serializar workers por lease temporário.
- [x] Limitar tentativas e tamanho da transcrição.
- [x] Condicionar conclusão e falha ao lease adquirido.
- [x] Aplicar RLS e manter o webhook desconectado.

## IA-08 — executor isolado de áudio

- [x] Validar configuração antes do claim.
- [x] Compor lifecycle, downloader e transcriber.
- [x] Concluir com o mesmo tenant e lease.
- [x] Separar falhas determinísticas de transitórias.
- [x] Rejeitar perda de lease sem efeitos posteriores.
- [x] Manter webhook, assistant, booking e outbox desconectados.

## IA-09 — enqueue no webhook

- [x] Persistir recibo antes do enqueue.
- [x] Enfileirar com tenant, conta e identidades originais.
- [x] Repetir com segurança após falha parcial.
- [x] Retornar 503 sanitizado quando a fila não for durável.
- [x] Manter download, transcrição e execução fora do webhook.

## IA-10 — resolução de Docker Secrets

- [x] Resolver conta por tenant, identidade, provedor e estado ativo.
- [x] Aceitar somente referências sintaticamente restritas.
- [x] Ler exclusivamente o diretório /run/secrets.
- [x] Rejeitar tokens e chaves armazenados diretamente no JSON.
- [x] Falhar fechado quando conta ou segredo estiver indisponível.
- [x] Manter credenciais fora do webhook e dos logs.
