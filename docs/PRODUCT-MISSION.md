# Missão do Produto — SISAG Autogerenciável

**Status:** fundamento estratégico

**Responsável:** Flaience

**Produto:** SISAG

**Horizonte:** permanente, com revisão somente quando houver mudança material da estratégia

---

## 1. Propósito

O SISAG existe para representar e operar com segurança a realidade de organizações cuja rotina depende de agenda, pessoas, serviços, recursos, comunicação e processos.

Nosso objetivo não é entregar apenas um sistema de agendamento. Construímos uma plataforma operacional que combina pessoas, automações e agentes inteligentes sobre o mesmo contexto confiável.

---

## 2. Missão

> Permitir que uma organização contrate, implante, configure, aprenda, opere e evolua o SISAG com a menor dependência possível de intervenção humana, preservando segurança, rastreabilidade e qualidade operacional.

O SISAG deverá tornar progressivamente autogerenciáveis:

- contratação e habilitação;
- provisionamento e implantação;
- configuração inicial;
- treinamento contextual;
- diagnóstico e suporte;
- monitoramento operacional;
- identificação de oportunidades de melhoria;
- desenvolvimento assistido de novas necessidades;
- validação, publicação e observação de versões.

Autogerenciável não significa irrestrito. Toda autonomia deve respeitar políticas, permissões, risco, auditoria e possibilidade de intervenção humana.

---

## 3. Foco empresarial

A Flaience será uma empresa enxuta e focada exclusivamente no SISAG enquanto o produto não possuir operação comercial madura, onboarding repetível e receita recorrente previsível.

Esse foco implica:

- um produto principal;
- uma arquitetura multi-tenant para atender muitos clientes;
- automação como requisito operacional, não como complemento;
- baixa dependência de processos manuais;
- crescimento de receita sem crescimento proporcional da estrutura humana;
- documentação e recuperação operacional independentes da memória do fundador.

Um único produto não significa um único cliente. O SISAG deve isolar corretamente clientes comerciais, tenants, empresas, unidades, usuários e permissões.

---

## 4. Resultado comercial desejado

Uma organização deverá conseguir:

1. contratar o SISAG;
2. criar sua conta e identidade;
3. provisionar tenant, empresas e usuários;
4. configurar serviços, profissionais, recursos e horários;
5. validar a operação;
6. aprender dentro do próprio produto;
7. receber diagnóstico e suporte inicial;
8. operar continuamente;
9. receber melhorias com segurança;

com mínima dependência da presença do fundador.

---

## 5. Princípios permanentes

### 5.1 Contexto antes da automação

Agentes não devem deduzir a operação a partir de dados soltos. Toda decisão deve partir de contexto operacional consistente, atual e autorizado.

### 5.2 Regras no núcleo

Regras críticas pertencem ao domínio e às capabilities do SISAG. Rotas HTTP, interfaces, n8n e agentes não devem duplicar regras de negócio.

### 5.3 Uma fonte oficial por capacidade

Cada operação deve possuir uma fonte oficial. Não serão criados motores concorrentes para agendamento, disponibilidade, autorização ou provisionamento.

### 5.4 Segurança aplicada no servidor

Ocultar uma ação na interface não constitui autorização. Toda operação deve validar identidade, tenant, empresa, vínculo e permissão no servidor.

### 5.5 Multi-tenant por definição

Todo dado operacional ou comercial relevante deve possuir escopo inequívoco. Nenhuma consulta pode depender de filtros implícitos ou contexto presumido.

### 5.6 Eventos representam acontecimentos

Mudanças relevantes devem produzir eventos estruturados e rastreáveis. Estado sem histórico reduz a capacidade de diagnóstico, auditoria e automação.

### 5.7 Idempotência antes da autonomia

Operações automatizadas devem suportar repetição segura, controle de concorrência, limites de tentativa e confirmação do resultado.

### 5.8 Observabilidade é parte do produto

Logs estruturados, métricas, traces, correlation IDs, eventos e auditoria devem permitir compreender o que aconteceu sem investigação artesanal.

### 5.9 Experiência simples sobre arquitetura robusta

A complexidade interna deve reduzir a complexidade percebida pelo cliente, não transferi-la para ele.

### 5.10 Evolução baseada em evidência

Uma entrega não está concluída somente porque compilou. Ela deve ser testada, implantada, observada e validada no ambiente proporcional ao seu risco.

---

## 6. Modelo progressivo de autonomia

Toda automação deve evoluir por níveis:

| Nível | Comportamento | Exemplo |
| --- | --- | --- |
| 0 — Observar | Coleta sinais sem executar ações | Detectar falhas recorrentes |
| 1 — Diagnosticar | Explica causa, impacto e opções | Identificar profissional sem agenda |
| 2 — Recomendar | Propõe uma ação verificável | Sugerir correção de configuração |
| 3 — Executar com aprovação | Aguarda confirmação de usuário autorizado | Reconfigurar uma integração |
| 4 — Executar e informar | Age dentro de política previamente aprovada | Reprocessar tarefa idempotente |
| 5 — Operar autonomamente | Resolve, valida e escala exceções | Recuperar processo técnico conhecido |

Nenhuma capacidade começa no nível máximo. A elevação de autonomia depende de histórico, métricas, testes e risco residual aceitável.

---

## 7. Classificação de risco

| Risco | Tratamento obrigatório |
| --- | --- |
| Baixo | Pode executar e informar |
| Moderado | Recomenda ou solicita confirmação |
| Alto | Prepara a ação para aprovação explícita |
| Crítico | Bloqueia execução autônoma e escala |

São consideradas sensíveis, entre outras:

- autenticação e sessão;
- papéis e permissões;
- cobrança e assinatura;
- migrações de banco;
- exclusão ou alteração em massa;
- publicação em produção;
- acesso a dados entre tenants;
- envio externo com impacto financeiro ou reputacional.

---

## 8. Papéis das tecnologias

### SISAG

É a fonte oficial de regras, estado, segurança, capabilities e histórico operacional.

### PostgreSQL e Supabase

Fornecem persistência, identidade, integridade, isolamento e políticas de acesso. Agentes não recebem SQL arbitrário em produção.

### n8n

Orquestra processos externos, integrações, notificações, rotinas comerciais e fluxos de baixa criticidade. Não substitui regras do núcleo.

### MCP

Expõe capabilities autorizadas como ferramentas estruturadas para agentes. Cada ferramenta deve possuir contrato, autenticação, autorização, auditoria e limites.

### Agentes inteligentes

Interpretam solicitações, reúnem contexto, escolhem ferramentas, explicam decisões, executam ações permitidas e confirmam resultados.

### Outbox, filas e workers

Garantem execução assíncrona confiável, tentativas controladas, desacoplamento e recuperação de integrações.

### GitHub Actions, containers e orquestração

Fornecem validação, build reproduzível, publicação, deploy, health checks, observação e rollback.

---

## 9. Requisitos para uma capability ser utilizada por agentes

Antes de uma capability ser exposta a agentes, ela deve possuir:

- objetivo e responsabilidade explícitos;
- contrato de entrada e saída;
- validação de dados;
- autenticação e autorização;
- isolamento por tenant e empresa;
- idempotência quando aplicável;
- controle de concorrência;
- eventos e auditoria;
- códigos de erro estáveis;
- classificação de risco;
- limites de execução e tentativas;
- confirmação do resultado;
- estratégia de compensação ou rollback;
- testes unitários, de integração e de produção proporcionais ao risco.

---

## 10. Ciclo de automação operacional

O padrão preferencial é:

```text
Prevenir
→ detectar
→ correlacionar
→ diagnosticar
→ orientar
→ executar ação autorizada
→ confirmar o resultado
→ registrar evidências
→ escalar exceções
```

O melhor chamado de suporte é aquele que o produto evita. O segundo melhor é aquele que o produto diagnostica e resolve com evidência.

---

## 11. Ciclo de evolução do produto

```text
Necessidade
→ contexto e impacto
→ especificação
→ branch isolada
→ implementação assistida
→ testes
→ build
→ Pull Request
→ validação
→ aprovação
→ deploy
→ smoke test
→ observação
→ rollback ou consolidação
```

Desenvolvimento assistido não autoriza publicação irrestrita. O nível de aprovação é determinado pelo risco da mudança.

---

## 12. Frentes de agentes

### Agente de implantação

Provisiona e acompanha cliente, assinatura, tenant, empresa, usuários e configuração inicial.

### Agente de treinamento

Orienta no contexto da tela e da configuração real, acompanha progresso e reduz dependência de manuais extensos.

### Agente de suporte

Coleta diagnóstico, explica causas, executa correções permitidas e escala com contexto completo.

### Agente operacional

Consulta agenda, disponibilidade, jornada, comunicação e automações para apoiar ou executar processos autorizados.

### Agente de confiabilidade

Monitora saúde, falhas, filas, integrações e regressões, propondo ou executando recuperação segura.

### Agente de evolução

Agrupa necessidades, prepara especificações, implementação, testes, documentação e evidências para revisão.

---

## 13. Roadmap orientador

1. autenticação e autorização confiáveis;
2. clientes comerciais, assinaturas, tenants e usuários;
3. Access Context unificado;
4. onboarding e provisionamento idempotente;
5. catálogo de eventos, erros e diagnósticos;
6. observabilidade e auditoria;
7. base de conhecimento versionada;
8. automações externas com n8n;
9. capabilities selecionadas via MCP;
10. agentes de implantação, treinamento e suporte;
11. evolução assistida do produto;
12. publicação progressivamente autônoma e verificável.

O roadmap pode mudar. Os princípios de segurança, contexto, rastreabilidade e validação permanecem.

---

## 14. Métricas estratégicas

Devem ser acompanhadas, no mínimo:

- percentual de clientes provisionados sem intervenção;
- tempo até o primeiro agendamento válido;
- percentual de configuração concluída autonomamente;
- percentual de dúvidas resolvidas dentro do produto;
- chamados por cliente ativo;
- tempo médio de diagnóstico e resolução;
- falhas detectadas antes do cliente;
- taxa de sucesso das automações;
- ações revertidas ou escaladas;
- horas humanas consumidas por cliente;
- custo operacional por assinatura;
- frequência e taxa de sucesso de deploys;
- incidentes e regressões por versão.

---

## 15. Regras inegociáveis

- Nenhum agente possui acesso irrestrito ao banco ou à infraestrutura.
- Nenhuma credencial é gravada no código, imagem, log ou documentação.
- Nenhuma regra crítica existe apenas em interface, rota ou automação externa.
- Nenhuma operação sensível ocorre sem autorização e auditoria.
- Nenhuma migração destrutiva ocorre sem inspeção e recuperação planejada.
- Nenhum deploy crítico é considerado concluído sem validação pós-publicação.
- Nenhuma generalização é criada sem necessidade operacional ou comercial.
- Nenhuma automação é promovida sem medir seu comportamento real.
- Nenhuma decisão de agente é tratada como infalível.
- Nenhum crescimento deve comprometer isolamento, integridade ou confiança.

---

## 16. Critério para novas funcionalidades

Toda proposta relevante deve responder:

1. Qual problema operacional ou comercial real resolve?
2. Qual contexto é necessário para executá-la corretamente?
3. Qual é sua fonte oficial de regras e dados?
4. Como respeita tenant, empresa, papéis e permissões?
5. Quais eventos e evidências produz?
6. Pode ser repetida com segurança?
7. Como falha, recupera e escala?
8. Qual nível de autonomia é aceitável?
9. Como será testada e observada?
10. Reduz ou aumenta a dependência operacional da Flaience?

Se essas respostas não estiverem claras, a funcionalidade ainda não está pronta para implementação autônoma.

---

## 17. Norte

> O SISAG não será diferenciado apenas pela quantidade de funcionalidades, mas pela capacidade de compreender a operação, orientar pessoas, executar processos e evoluir de forma segura, auditável e progressivamente autônoma.

Tecnologias mudarão. Modelos de IA serão substituídos. Ferramentas de automação evoluirão. A missão permanece: transformar contexto operacional confiável em autonomia responsável.

---

## 18. Documentos relacionados

- `docs/oce/FOUNDATION.md` — fundamentos da Operational Context Engineering;
- `docs/architecture.md` — arquitetura técnica do SISAG;
- `docs/roadmap.md` — roadmap funcional e operacional;
- `docs/oce/ROADMAP.md` — evolução da plataforma OCE;
- `docs/tools-catalog.md` — catálogo de ferramentas e integrações.
