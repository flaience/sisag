# Auditoria do circuito de configuração e agendamento

Atualizado em: 27 de agosto de 2026.

## 1. Objetivo

Definir o circuito manual necessário para criar, confirmar, reagendar, cancelar e concluir um agendamento a partir de cadastros consistentes, isolados por empresa e reutilizáveis pela interface, agentes, MCP, texto e voz.

Esta auditoria não autoriza alterações destrutivas nem expansão de telas sobre contratos inseguros.

## 2. Decisão de produto

O piloto será construído cadastro por cadastro. Cada módulo deve fechar persistência, contrato, autorização, listagem, inclusão, alteração, testes e manual operacional antes de alimentar o circuito de Agendamentos.

O agregado oficial permanece `bookings`. Cadastros e parâmetros devem convergir para ele; nenhuma nova capacidade será adicionada a `appointments`.

## 3. Circuito manual alvo

1. identificar a empresa e o fuso horário;
2. selecionar a unidade de atendimento;
3. cadastrar profissionais e vinculá-los às unidades;
4. cadastrar clientes;
5. cadastrar serviços, duração, preço e requisitos;
6. cadastrar recursos, como salas e equipamentos;
7. definir disponibilidade semanal do profissional;
8. aplicar feriados, ausências e bloqueios;
9. aplicar políticas de antecedência, cancelamento, reagendamento e encaixe;
10. calcular horários realmente disponíveis;
11. criar o agendamento e suas alocações;
12. confirmar, comunicar, reagendar, cancelar ou concluir com histórico auditável.

## 4. Inventário por capacidade

| Capacidade | Persistência | API/serviço | Interface | Integração atual | Situação |
| --- | --- | --- | --- | --- | --- |
| Empresa | `companies` | CRUD existente e `/api/v1/me/company` | consulta, inclusão e edição legadas | resolve a empresa atual e o fuso da configuração | existe, requer experiência operacional focada na própria empresa |
| Unidades | ausente como agregado explícito | ausente | ausente | agendamento não seleciona local | lacuna estrutural |
| Profissionais | `professionals` e vínculo opcional com `resources` | CRUD e busca com testes de tenant | consulta, inclusão, edição e horários | selecionado no formulário e alocado como recurso | existe, precisa vínculo com unidade e serviços |
| Clientes | `clients` | rotas de pessoas e resolução de cliente | consulta, inclusão e edição | obrigatório em `bookings` | existe, precisa padronização visual e revisão de consentimento/dados |
| Serviços | `services` e `service_requirements` | apenas leitura em `/api/v1/services` | CRUD administrativo ausente | obrigatório em `booking_items` | contrato incompleto e fronteira insegura |
| Recursos | `resource_types`, `resources` e alocações | leitura contextual de disponibilidade | CRUD ausente | bloqueiam capacidade por alocação | base forte, administração ausente |
| Horários profissionais | `professional_schedules` | CRUD contextual por profissional | telas existentes, fragmentadas | consumidos pelo cálculo de disponibilidade | existe, precisa modelo visual e regras por unidade |
| Configuração geral | `scheduling_config` | leitura e gravação tipadas | tela existente | fuso, duração, intervalo e antecedências | existe, precisa UX, vocabulário e confirmação sem `alert` |
| Feriados | ausente | ausente | ausente | não afeta disponibilidade | lacuna |
| Ausências e bloqueios | ausente como capacidade de negócio | ausente | ausente | não afeta disponibilidade | lacuna |
| Agendamentos | `bookings`, itens, alocações e eventos | criação e jornada oficiais | lista, criação e jornada | núcleo do circuito | funcional, depende da qualidade dos cadastros |

## 5. Bloqueador P0 — fronteira de Serviços

`GET /api/v1/services` aceita `companyId` vindo da URL. Quando o parâmetro não é informado, a consulta não aplica filtro por empresa. A tela de criação de agendamento chama essa rota sem `companyId`.

Consequências possíveis:

- exposição de serviços entre empresas;
- escolha de serviço incompatível com a empresa atual;
- falha ou alocação incoerente ao criar o agendamento;
- impossibilidade de considerar o circuito seguro para piloto.

Correção obrigatória:

- resolver `companyId` exclusivamente da sessão no servidor;
- rejeitar usuário sem vínculo ativo;
- nunca aceitar a empresa da URL ou do corpo como autoridade;
- testar duas empresas e a ausência de sessão;
- manter a resposta compatível com o formulário atual.

O CRUD visual de Serviços só começa depois dessa correção.

## 6. Lacunas de modelo

### 6.1 Unidades

A tabela `companies` contém um endereço único, mas o produto prevê múltiplas unidades. É necessário um agregado `company_units` com, no mínimo:

- empresa proprietária;
- nome operacional;
- endereço e fuso horário;
- situação ativa/inativa;
- horário de funcionamento;
- vínculo com profissionais e recursos.

O piloto pode iniciar com uma unidade padrão por empresa, mas o contrato deve permitir evolução sem reinterpretar o endereço da empresa como unidade.

### 6.2 Serviços e profissionais

Não foi identificado um vínculo explícito entre serviços e profissionais habilitados. Os requisitos atuais relacionam serviço a tipo de recurso, não diretamente ao profissional. A disponibilidade precisa impedir que qualquer profissional seja oferecido para qualquer serviço.

### 6.3 Exceções de disponibilidade

Feriados, férias, ausências e bloqueios não possuem capacidade persistida identificada. Essas exceções não devem ser simuladas apagando horários semanais. Precisam de registros datados, autoria, motivo, abrangência e possibilidade de reversão.

### 6.4 Políticas

A configuração atual cobre fuso, granularidade, intervalo, sobreposição, horizonte futuro e antecedência de cancelamento. Ainda devem ser avaliados:

- antecedência mínima para criar um agendamento;
- janela e política de reagendamento;
- regras de confirmação;
- limite por cliente ou profissional;
- tratamento de não comparecimento;
- políticas específicas por serviço ou unidade.

## 7. Sequência de entregas

### Trilha 1 — segurança e base

1. corrigir fronteira multiempresa da API de Serviços;
2. definir contrato de unidade e unidade padrão;
3. definir prontidão mínima da empresa para receber agendamentos.

### Trilha 2 — cadastros operacionais

4. Empresa: perfil operacional da empresa atual;
5. Unidades: persistência, API e CRUD;
6. Clientes: padronização do CRUD existente;
7. Profissionais: padronização e vínculo com unidade;
8. Serviços: API completa, CRUD e vínculo com profissionais;
9. Recursos: tipos, CRUD e vínculo com unidade.

### Trilha 3 — disponibilidade

10. horários semanais por profissional e unidade;
11. feriados por empresa/unidade;
12. ausências e bloqueios datados;
13. políticas gerais de agendamento;
14. cálculo consolidado de disponibilidade com testes de conflito.

### Trilha 4 — circuito de aceitação

15. criar um agendamento futuro com cadastros reais;
16. confirmar e comunicar;
17. reagendar preservando histórico e recursos;
18. cancelar e liberar capacidade;
19. concluir ou registrar ausência;
20. repetir em duas empresas para comprovar isolamento.

## 8. Critério de conclusão por cadastro

Um cadastro somente está concluído quando possuir:

- propriedade obrigatória da empresa no banco;
- resolução da empresa pela sessão no servidor;
- validação de entrada e mensagens localizáveis;
- consulta, inclusão, alteração e desativação quando aplicável;
- listagem responsiva e formulário acessível;
- estados de carregamento, vazio, erro e sucesso;
- testes positivos e negativos de tenant;
- vínculo comprovado com o cálculo ou criação do agendamento;
- contrato reutilizável por interface, agentes e MCP;
- manual operacional atualizado.

## 9. Próxima entrega autorizada

Corrigir a fronteira multiempresa de `GET /api/v1/services` em PR isolado, mantendo o formato da resposta. Depois, iniciar o cadastro de Empresa como perfil operacional da empresa atual, sem expor uma lista global de empresas ao cliente.


## 10. Diretriz de agendamento por serviço

O produto suporta duas entradas: escolha por profissional e escolha por serviço. No modo por serviço, a atribuição segue precedência configurável: profissional específico do serviço e turno; profissional padrão da unidade e turno; profissional habilitado disponível; ou indisponibilidade quando não houver candidato válido. A política considera empresa, unidade, dia, turno, vigência e prioridade. A decisão deve gerar alocação explícita e evidência auditável, sem atribuição silenciosa em caso de conflito.


## 11. Perfil operacional da empresa atual

O cliente mantém somente a empresa vinculada à sessão por meio de `/api/v1/me/company/profile`. A consulta permite a equipe visualizar; alterações exigem Proprietário ou Administrador. Rotas globais legadas de Empresas não são autoridade para a experiência operacional e serão retiradas do caminho principal após migração. O campo `name` representa o nome operacional exibido; nomes cadastrados não são traduzidos.


## 12. Interface do perfil operacional

O menu Empresa aponta para `/admin/settings/company`, onde Proprietário e Administrador mantêm exclusivamente a empresa da sessão. A tela informa prontidão do cadastro e prepara a continuidade para Unidades. A listagem global legada permanece fora do caminho operacional até sua retirada segura.


## 16. Fundação persistente de unidades

O agregado `company_units` passa a representar os locais operacionais pertencentes à empresa autenticada. O contrato separa identidade, endereço estruturado, fuso horário, situação e unidade principal. A restrição parcial admite no máximo uma unidade principal por empresa. Horários, vínculos com profissionais e recursos serão adicionados sobre essa identidade em entregas próprias; nenhuma API poderá aceitar `companyId` fornecido pelo navegador como fronteira de propriedade.


## 17. API segura de unidades

As rotas `/api/v1/me/company/units` e `/api/v1/me/company/units/[id]` obtêm a empresa exclusivamente da sessão. Equipe pode consultar; Proprietário e Administrador podem incluir e alterar. A primeira unidade é promovida automaticamente a principal e a troca posterior ocorre em transação, preservando no máximo uma principal por empresa.


## 18. Manutenção visual de unidades

A rota `/admin/settings/units` reúne listagem, inclusão e alteração dos locais de atendimento. A interface destaca situação e unidade principal, impede a desmarcação direta da principal e orienta a troca pela seleção de outra unidade. Os textos pertencem à linguagem operacional do cliente; identificadores e fronteiras técnicas permanecem internos.


## 19. Sessão nas configurações administrativas

O layout de `/admin/settings` usa a sessão SSR corrente do Supabase, como o layout administrativo principal. O cookie legado `sb-access-token` não é uma fonte de autenticação válida. A autorização permanece centralizada em `requireRole`, limitada a Proprietário e Administrador, evitando redirecionamentos indevidos ao login em Empresa, Unidades e futuras telas de configuração.


## 20. Sessão nas APIs administrativas

O guardião `apiAuth` resolve credenciais nesta precedência: cabeçalho Bearer para integrações, cookie legado durante a transição e sessão SSR corrente do Supabase para chamadas do navegador. A empresa continua derivada exclusivamente do contexto autenticado. Isso mantém APIs administrativas compatíveis com a sessão usada pelos layouts e elimina respostas 401 indevidas após navegação interna.


## 21. Simplificação dos locais de atendimento

A experiência usa “Locais de atendimento” como linguagem do cliente. A maioria das empresas opera em um único local principal; filiais são adicionadas somente quando necessárias. O código operacional é gerado a partir do nome e não é solicitado ao usuário. O fuso horário permanece persistido e herdado, mas sai dos cartões e do formulário comum. Internamente, `company_id` preserva a fronteira do cliente e `unit_id` identifica o local em todas as relações de agenda.


## 22. Empresa e local principal

O salvamento da empresa cria, na mesma transação e somente quando ausente, seu local principal. Repetir o salvamento é idempotente e não gera outro local. Nome, contato e endereço alimentam a criação inicial; alterações específicas posteriores do local não são sobrescritas silenciosamente. O tipo de negócio usa exclusivamente o vocabulário reconhecido pelo produto e valores técnicos como `generic` são traduzidos na apresentação.


## 23. Fundação da identidade visual

A empresa passa a admitir nome fantasia e caminho interno de logotipo. O nome fantasia prevalece somente na apresentação; o nome atual continua preservado para compatibilidade. `logo_path` nunca aceita URL arbitrária, caminho absoluto ou travessia de diretório. Quando não houver imagem, a apresentação produz iniciais determinísticas e mantém a identidade padrão SISAG como último fallback. Upload, leitura assinada e personalização do menu serão entregas independentes.


## 24. Armazenamento seguro do logotipo

O bucket privado `company-branding` aceita PNG, JPEG e WebP até 2 MB. O navegador nunca escolhe empresa, bucket ou caminho: a API deriva `companyId` da sessão, valida assinatura binária, gera chave exclusiva e persiste somente o caminho do objeto. Leituras usam URL assinada por uma hora. Em substituições, falha no banco remove o novo objeto; após sucesso, o anterior é removido sem invalidar a nova marca.


## 25. Identidade visual no ambiente administrativo

A tela da empresa permite editar o nome fantasia e administrar o logotipo sem expor identificadores técnicos. O menu resolve a marca pela sessão autenticada, usa URL assinada para o arquivo privado e retorna automaticamente à identidade SISAG quando a empresa ainda não configurou sua marca. Alterações são refletidas imediatamente no ambiente aberto.


## 26. Responsabilidades e segurança de profissionais

Proprietários e administradores mantêm empresa, locais, profissionais, serviços e parâmetros; operadores consultam profissionais e movimentam agendamentos e atendimentos. Toda operação de profissional deriva a empresa da sessão. Remoções administrativas desativam o cadastro para preservar históricos. O vínculo com locais e serviços será acrescentado em entregas próprias.


## 27. Fundação de profissionais por local

O vínculo `professional_units` permite que um profissional atue em um ou vários locais, com no máximo um vínculo principal. Chaves estrangeiras compostas exigem que empresa, profissional e local pertençam à mesma fronteira, inclusive em operações diretas no banco. A implantação associa profissionais existentes ao local principal quando possível. Serviços e interfaces somente usarão a tabela após a aplicação e validação do SQL.


## 28. API de profissionais por local

As rotas de locais do profissional derivam a empresa da sessão. Equipe pode consultar; Proprietário e Administrador vinculam, reativam, definem o principal e desativam. O primeiro vínculo ativo torna-se principal automaticamente. Ao desativar o principal, outro ativo é promovido quando existir. Empresa, profissional e local são verificados no serviço e pelas chaves compostas do banco.


## 29. Interface de profissionais e locais

A manutenção de profissionais usa o padrão visual administrativo e a sessão SSR corrente. Inclusão e alteração compartilham um formulário que exige ao menos um local ativo, define uma preferência principal e sincroniza vínculos sem apagar histórico. A listagem consome o contrato `{ ok, items }`, apresenta situação e duração em linguagem de negócio e mantém detalhes técnicos fora da interface.


## 30. Visibilidade de profissionais inativos

A listagem mostra profissionais ativos por padrão. Filtros permitem consultar inativos ou todos, e a reativação reutiliza a atualização segura do cadastro. Inativos permanecem fora da operação cotidiana sem exclusão física, preservando agendamentos, vínculos e rastreabilidade histórica. Estados legados em maiúsculas ou minúsculas são reconhecidos durante a transição.


## 31. Catálogo operacional de serviços

O catálogo seguro reúne nome, descrição, duração, situação e preço padrão. A apresentação distingue preço fixo, gratuito e sob consulta usando o campo numérico existente. Serviços são desativados, não apagados. O agendamento consome o contrato `{ ok, items }` e continuará copiando preço e duração para `booking_items`, preservando as condições históricas mesmo após alterações no catálogo.


## 32. Fundação de profissionais por serviço

O vínculo `professional_services` declara explicitamente quais profissionais executam cada serviço. Duração e preço específicos são exceções opcionais; quando ausentes, prevalecem os valores do catálogo. Chaves compostas impedem relações entre empresas diferentes. Não há backfill automático: habilitações precisam de decisão administrativa para evitar autorizações indevidas inferidas de recursos legados.


## 33. Gestão de serviços por profissional

A API e a interface permitem selecionar serviços por profissional, reativar ou desativar vínculos e definir exceções opcionais de duração e preço. Valores vazios herdam o catálogo. A empresa vem da sessão e as chaves compostas reforçam a fronteira no banco. A listagem de profissionais oferece acesso direto à configuração sem expor identificadores técnicos.


## 34. Fundação segura da disponibilidade profissional

Os horários semanais passam a declarar empresa, profissional e local de atendimento. A migração recupera os registros existentes pela empresa do profissional e por sua unidade principal ativa, interrompendo sem alteração parcial quando não houver proprietário resolvível. Chaves compostas, validações de dia e horário, índices operacionais e RLS formam a fronteira necessária antes da modernização da API e da interface.


## 35. Experiência de disponibilidade semanal

A administração do profissional reúne seus períodos semanais em uma única tela, agrupados por dia e identificados pelo local de atendimento. O operador autorizado pode cadastrar vários turnos no mesmo dia e recebe uma mensagem objetiva quando houver sobreposição. A remoção exige confirmação no próprio contexto, sem caixas de diálogo do navegador. A interface consome exclusivamente a API com fronteira de empresa estabelecida na fundação anterior.


## 36. Central de regras da agenda

A configuração operacional usa exclusivamente `/api/v1/settings/scheduling`, que resolve a empresa pela sessão e permite gravação apenas a proprietário ou administrador. A interface traduz duração, intervalos, horizonte, cancelamento e encaixes em efeitos de negócio, exibe um resumo antes da gravação e não usa alertas do navegador. A rota antiga `/api/v1/scheduling`, que listava configurações sem fronteira, responde como retirada. Dois motores antigos sem consumidores permanecem registrados para limpeza posterior e não integram o circuito oficial.


## 37. Fundação de exceções da disponibilidade

Feriados, fechamentos, ausências e bloqueios passam a ser registros datados e reversíveis, sem apagar a disponibilidade semanal. A abrangência pode ser toda a empresa, um local ou um profissional vinculado ao local. A estrutura preserva autoria e revogação, aplica chaves compostas de empresa, valida período e motivo, mantém índices para interseção temporal e habilita RLS. A API e o motor só serão conectados após a validação desta fundação no banco.


## 38. API de exceções da disponibilidade

O contrato `/api/v1/availability/exceptions` lista e cria exceções sempre pela empresa autenticada, com filtros opcionais de situação, período, local e profissional. Fechamentos não aceitam profissional; ausências e bloqueios exigem profissional. O serviço confirma a propriedade e o vínculo ativo com o local. A revogação ocorre por `POST /api/v1/availability/exceptions/{id}/revoke`, registra usuário e data e não apaga histórico. Leitura inclui operadores; criação e revogação exigem proprietário ou administrador.


## 39. Exceções no motor de disponibilidade

O motor oficial carrega somente exceções ativas e temporalmente sobrepostas da empresa atual. Feriados da empresa bloqueiam toda a capacidade; fechamentos de local usam a unidade informada ou, durante a transição, a unidade principal ativa do profissional; ausências e bloqueios atingem apenas o profissional correspondente. Exceções revogadas não entram na consulta. O contrato interno aceita `unitId` opcional para a futura seleção explícita de local, preservando os consumidores atuais.


## 40. Interface de exceções da disponibilidade

A área de Configurações oferece uma manutenção única para feriados, fechamentos, ausências e bloqueios. Novos registros usam apenas locais e profissionais ativos da empresa autenticada. Dias inteiros tratam a data final como inclusiva e são persistidos até o início do dia seguinte. A consulta filtra situação, local e profissional. Revogar exige confirmação contextual, preserva o registro e remove seu efeito do cálculo de horários.


## 41. Local obrigatório no agendamento

Todo agendamento oficial passa a registrar explicitamente a empresa e o local de atendimento. A migração preserva os registros existentes: prioriza o local principal ativo do profissional já alocado e usa o local padrão ativo da empresa quando não há profissional. Novas gravações aceitam seleção explícita e, durante a transição da interface, aplicam a mesma resolução segura. A chave composta impede associação entre empresas e o índice por empresa, local e horário prepara consultas operacionais.


## 42. Seleção do local no agendamento manual

O formulário inicia pelo local de atendimento, seleciona automaticamente o local padrão quando possível e limita os profissionais aos vínculos ativos daquele local. A mesma identificação acompanha a consulta de disponibilidade e a criação do agendamento. Trocar o local limpa profissional e horário para impedir combinações obsoletas. A empresa continua sendo obtida exclusivamente da sessão autenticada.


## 43. Fundação do agendamento orientado por serviço

Regras de atribuição permitem escolher um profissional padrão por empresa, local, dia da semana e faixa de horário. A regra pode ser específica para um serviço ou funcionar como padrão para todos os serviços do turno. Regras específicas terão precedência sobre o padrão geral e a prioridade permitirá desempate determinístico. Chaves compostas garantem que local, profissional e serviço pertençam à mesma empresa e que o profissional esteja habilitado tanto no local quanto no serviço. Esta etapa cria somente a fundação persistente; API, manutenção e motor serão entregues separadamente.


## 44. API das regras de atribuição por serviço

A API de regras de atribuição usa exclusivamente a empresa autenticada. Operadores podem consultar; proprietário e administrador podem criar, alterar e desativar. A validação confirma local ativo, vínculo ativo do profissional com o local e, nas regras específicas, vínculo ativo do profissional com o serviço. Regras gerais de turno mantêm o serviço vazio e serão aplicadas somente quando o motor confirmar que o profissional executa o serviço solicitado.


## 45. Interface de profissionais preferenciais por turno

A área de Configurações apresenta regras em linguagem operacional. O administrador escolhe local, serviço opcional, profissional habilitado, dia, turno e prioridade. Serviço vazio significa todos os serviços do turno. Alterações reutilizam a mesma regra e a desativação exige confirmação, preservando histórico. A tela explica que regras específicas prevalecem sobre o padrão geral e filtra profissionais pelo local e, quando aplicável, pelo serviço.


## 46. Motor de atribuição por serviço

Quando a criação recebe local e serviço sem profissional, o motor converte o instante para o fuso da empresa e procura uma regra ativa que cubra dia e horário. Regras específicas do serviço prevalecem sobre a regra geral do turno; prioridade e antiguidade produzem desempate determinístico. A escolha só é aceita quando empresa, local, serviço, profissional, vínculo e agenda semanal continuam ativos. Um profissional informado manualmente nunca é substituído. A disponibilidade combinada de vários profissionais será tratada em uma etapa própria, pois uma consulta diária pode atravessar turnos com regras diferentes.


## 47. Disponibilidade orientada por serviço

A consulta por serviço recebe local, serviço e data e identifica profissionais ativos, vinculados ao local e habilitados para o serviço. Cada agenda é calculada pelo motor oficial, preservando horários, ocupações e exceções. Horários iguais são consolidados em uma opção: regra específica prevalece, seguida pela regra geral do turno; se o profissional preferencial estiver indisponível, outro profissional disponível é escolhido de modo determinístico. O retorno mantém o profissional e os recursos associados a cada horário, permitindo criação segura sem escolha prévia obrigatória.


## 48. Agendamento manual orientado por serviço

O formulário oferece dois caminhos explícitos. Em Escolher pelo serviço, local, serviço e data produzem horários consolidados; cada opção mostra o profissional associado e a criação envia essa mesma identidade. Em Escolher o profissional, permanece o fluxo manual anterior. Trocar modo, local, serviço ou data limpa horário e atribuição para impedir dados obsoletos. O resumo informa o profissional escolhido pelo motor antes da confirmação.


## Padrões operacionais de agendamento

A configuração da agenda pode guardar local, serviço e profissional preferidos. Esses valores apenas aceleram o preenchimento, permanecem editáveis e são validados dentro da empresa autenticada. Combinações incompatíveis entre profissional, local e serviço são rejeitadas tanto pela aplicação quanto pelo banco.


## Fluxo único com padrões editáveis

A equipe não escolhe mais entre modos concorrentes. Local, serviço e profissional padrão antecipam o cenário mais frequente, permanecem editáveis e a disponibilidade é recalculada após cada mudança. O roteamento avançado por serviço e turno continua disponível como capacidade interna.


## Identificação rápida do cliente

O agendamento permite localizar por nome, WhatsApp ou e-mail e criar uma identidade mínima sem abandonar o fluxo. A operação normaliza o WhatsApp, reutiliza identidades existentes e deriva a empresa exclusivamente da autenticação. Informações complementares permanecem disponíveis no cadastro completo e podem ser coletadas progressivamente.


## Contrato único de criação

Painel, API, WhatsApp e agentes convergem para o mesmo comando de agendamento. A empresa e o responsável são derivados da autenticação, a origem é persistida e tentativas com identificador repetido recebem a mesma resposta sem criar um segundo atendimento. O núcleo transacional continua sendo a autoridade sobre disponibilidade e conflitos.


## Primeiro agente assistido

O fluxo conversacional que consulta a agenda não cria mais um atendimento imediatamente após a escolha do horário. Ele persiste uma proposta, apresenta data e hora ao cliente e exige confirmação explícita. Somente então executa o contrato único com origem WhatsApp e identificador idempotente. Respostas ambíguas não produzem escrita e recusas descartam a proposta.


## WhatsApp operacional sobre bookings

O mecanismo padrão do webhook deixou de criar novos registros em appointments. Novos pedidos usam os padrões da empresa, consultam disponibilidade por serviço e persistem uma proposta na sessão. Somente SIM executa o comando idempotente de bookings. Cancelamento e reagendamento legados permanecem isolados até sua migração específica; ausência de configuração produz encaminhamento em vez de escolha inventada.


## PR 293 — ciclo de agendamento do agente

- O WhatsApp lista, cancela e remarca diretamente em bookings, sempre limitado à empresa e ao cliente.
- Cancelamentos respeitam a antecedência mínima e exigem confirmação explícita.
- Reagendamentos validam a posse antes de reutilizar o motor transacional e registram o ator WhatsApp.
- O fluxo principal deixa de depender do módulo legado de appointments.


## PR 294 — ciclo operacional do atendimento

- Estados explícitos para chegada, atendimento em andamento, conclusão e ausência.
- Transições sequenciais impedem conclusão ou início fora de ordem.
- API operacional autenticada e limitada à empresa do usuário.
- Horários, operador, motivo, estado anterior e origem ficam auditáveis.


## PR 295 — operação rápida na agenda

- Cada card destaca somente a próxima ação natural do atendimento.
- Chegada, início e conclusão usam o mesmo endpoint autenticado do ciclo operacional.
- Ausência e cancelamento ficam separados e exigem confirmação em dois passos.
- Novos estados possuem rótulos, cores e filtros em português.


## PR 296 — prontidão operacional ponta a ponta

- Estados de chegada e atendimento em andamento continuam bloqueando capacidade e impedem dupla reserva.
- Disponibilidade, criação e reagendamento compartilham uma única lista de estados ocupantes.
- Conflitos de criação passam a considerar empresa e situação ativa do agendamento.
- A listagem administrativa encaminha a sessão autenticada ao consumir a API no servidor.
- O circuito manual, a API e o agente permanecem apoiados no mesmo contrato de booking.


## PR 297 — fundação de lembretes de agendamento

- A fila existente recebe jobs de lembrete com processamento, trava, conclusão, carga e vínculo ao outbox.
- O planejamento deriva empresa, cliente, telefone e horário exclusivamente do booking persistido.
- Empresa desabilitada, cliente sem telefone, booking inativo e janela vencida não geram trabalho.
- A chave inclui booking e horário; repetir o planejamento reutiliza o job, enquanto reagendar cancela a versão anterior.
- Esta etapa não envia mensagens: prepara a fundação segura para o trabalhador transacional seguinte.


## PR 298 — trabalhador confiável de lembretes

- Jobs vencidos são reivindicados em lote com SKIP LOCKED e travas abandonadas podem ser recuperadas.
- Antes do envio, booking, empresa, situação, telefone e horário são revalidados.
- Publicação no outbox e conclusão do job ocorrem na mesma transação, com chave única estável.
- Falhas recebem repetição exponencial limitada e encerramento após o máximo de tentativas.
- O acionamento interno exige segredo e limita o tamanho do lote.


## PR 299 — lembretes conectados ao ciclo de booking

- O comando único planeja o lembrete após a criação, sem invalidar o booking caso a fila esteja temporariamente indisponível.
- Reagendamento substitui o planejamento e cancelamento ou avanço operacional desativa trabalhos pendentes.
- Reconciliação por empresa recria jobs ausentes e encerra jobs de bookings inativos.
- Rotas internas continuam protegidas pelo segredo operacional.


## PR 300 — configuração administrativa de lembretes

- Administradores ativam o lembrete, definem antecedência e personalizam a mensagem por empresa.
- A mensagem oferece prévia e variáveis seguras para nome e data/hora.
- O worker usa o modelo registrado no job, preservando consistência mesmo após futuras alterações.
- API ignora identificadores externos de empresa e deriva o tenant da autenticação.


## PR 301 — resposta ao lembrete no ciclo do booking

- Respostas explícitas são associadas ao último lembrete entregue para o mesmo cliente e empresa.
- SIM confirma e CANCELAR cancela o booking exato, respeitando antecedência mínima.
- Estados já aplicados respondem de forma idempotente sem repetir transições.
- Mensagens ambíguas continuam no assistente geral e ações aplicadas geram evento correlacionado.


## PR 303 — monitoramento administrativo de lembretes

- A tela de lembretes apresenta programados, processando, enviados e falhas.
- Histórico recente identifica cliente e horário sem expor telefone ou erros internos sensíveis.
- A consulta de resumo e itens deriva a empresa exclusivamente da autenticação.
- Atualização manual permite acompanhar a operação sem recarregar a página.


## PR 303 — monitoramento administrativo de lembretes

- A tela de lembretes apresenta programados, processando, enviados e falhas.
- Histórico recente identifica cliente e horário sem expor telefone ou erros internos sensíveis.
- A consulta de resumo e itens deriva a empresa exclusivamente da autenticação.
- Atualização manual permite acompanhar a operação sem recarregar a página.


## PR 304 — resultados da automação de lembretes

- Indicadores relacionam lembretes enviados, respostas, confirmações e cancelamentos antecipados.
- Comparecimentos e faltas consideram apenas bookings que receberam lembrete no período.
- Taxas usam denominadores explícitos e permanecem estáveis quando ainda não há dados.
- Períodos de 7, 30 e 90 dias preservam isolamento integral por empresa.


## PR 305 — base de follow-up pós-atendimento

- A conclusão bem-sucedida do booking agenda follow-up sem bloquear o ciclo operacional em caso de indisponibilidade da automação.
- Regra, atraso, destinatário e modelo são derivados dos dados persistidos da empresa.
- Jobs anteriores pendentes são cancelados e a identidade inclui booking e momento de conclusão.
- A base reutiliza automation_jobs e outbox, sem infraestrutura paralela.


## PR 306 — worker de follow-up pós-atendimento

- Jobs vencidos são reivindicados com lock concorrente e recuperação de processamento abandonado.
- Booking concluído, empresa e WhatsApp são revalidados antes de qualquer publicação.
- A mensagem usa modelo persistido ou agradecimento padrão com solicitação de nota de 1 a 5.
- Publicação e conclusão são atômicas, deduplicadas e protegidas por retry exponencial limitado.
- Rota interna exige o segredo operacional do ambiente.


## PR 307 — avaliação do follow-up pós-atendimento

- Notas explícitas de 1 a 5 são vinculadas ao último follow-up entregue e ao booking concluído correto.
- Uma avaliação por booking pode ser atualizada de forma idempotente e permanece isolada por empresa.
- Notas baixas sinalizam necessidade de recuperação e todas as alterações geram evento correlacionado.
- Mensagens numéricas fora de um follow-up elegível continuam no assistente comum.


## PR 308 — gestão administrativa do pós-atendimento

- Administradores ativam o follow-up, definem atraso e personalizam a mensagem sem afetar outros modelos.
- Média e distribuição de notas podem ser analisadas em 7, 30 ou 90 dias.
- Avaliações 1 e 2 aparecem como recuperação recomendada, sem exposição de telefone.
- Configuração e indicadores derivam a empresa exclusivamente da autenticação.

### Recuperação de avaliações críticas — PR #309

- Avaliações 1 e 2 abrem ou atualizam um caso operacional único por agendamento.
- Nota 1 recebe prioridade urgente; nota 2 recebe prioridade alta.
- Correção posterior da avaliação encerra automaticamente casos ainda ativos.
- A sincronização ocorre na mesma transação da avaliação e registra eventos de abertura e encerramento.
- Casos são isolados por empresa, protegidos por RLS e preparados para atribuição e acompanhamento administrativo.

### Gestão da recuperação de clientes — PR #310

- Fila operacional separada das configurações, ordenada por prioridade e antiguidade.
- Equipe pode assumir, registrar contato, resolver ou descartar casos com justificativa.
- Atribuição deriva do usuário autenticado; leituras e mutações permanecem isoladas por empresa.
- Transições concorrentes são protegidas e cada ação gera evento auditável.
- Visão resume casos ativos, urgentes, contatados e resolvidos.

### Agente assistido de recuperação — PR #311

- Gera rascunho empático e contextual para casos ativos, sem promessas comerciais automáticas.
- Rascunhos são persistidos, versionados, isolados por empresa e mantidos em revisão.
- Contexto utilizado fica registrado para explicabilidade e cada geração produz evento auditável.
- A interface informa explicitamente que nenhuma mensagem foi enviada.
- Não existe integração com outbox ou WhatsApp nesta etapa; aprovação e envio serão implementados separadamente.

### Aprovação e envio da recuperação — PR #312

- Operador pode revisar e editar o rascunho antes de aprovar.
- Aprovação revalida empresa, caso ativo, versão corrente e WhatsApp do cliente.
- Alterações concorrentes ou versões antigas são recusadas.
- Aprovação e enfileiramento ocorrem atomicamente com deduplicação por rascunho e versão.
- Caso passa a contatado e eventos registram edição, aprovação, responsável e despacho.

### Respostas da recuperação — PR #313

- Respostas são correlacionadas somente a contatos enviados nos últimos 14 dias e pelo identificador do provedor.
- Persistência é idempotente por empresa e mensagem, com RLS e vínculo completo ao caso, rascunho, cliente e agendamento.
- Classificação usa apenas sinais explícitos: positiva, negativa, pedido humano ou outro.
- Casos urgentes e respostas que exigem interpretação geram alerta auditável.
- O assistente apenas confirma o recebimento e encaminha à equipe; não produz resposta livre nem continua autonomamente a conversa.

### Caixa de respostas da recuperação — PR #314

- Respostas pendentes ficam em caixa operacional separada, com histórico e ordenação recente.
- Sinais urgentes, negativos e pedidos humanos recebem destaque e indicadores próprios.
- Reconhecimento é idempotente, atribui o operador autenticado e registra evento auditável.
- Operador pode resolver o caso com justificativa usando o ciclo operacional existente.
- A interface não oferece resposta automática livre; toda continuidade permanece humana.

### Resultados e SLA da recuperação — PR #315

- Mede contatos, primeira resposta, taxa de resposta e tempos médios de resposta e reconhecimento humano.
- Consolida casos abertos, ativos, resolvidos, descartados e taxa de resolução por período.
- Classifica o volume de respostas sem inflar contatos com múltiplas mensagens.
- SLA ajustável destaca respostas pendentes e permite voltar diretamente à caixa operacional.
- Consultas são limitadas, temporalmente delimitadas e isoladas pela empresa autenticada.


### Escalonamento automático do SLA de recuperação — PR #317

- Respostas não reconhecidas são escaladas após um SLA operacional limitado entre 1 e 72 horas.
- A escalada é idempotente, eleva o caso para urgente e registra evento auditável por empresa.
- O processamento interno limita lotes e exige o segredo operacional.
- A caixa humana destaca respostas vencidas; nenhuma mensagem é enviada automaticamente ao cliente.


### Runner contínuo das automações — PR #318

- Uma única réplica no Swarm aciona lembretes, follow-ups e escalada de SLA pela rede privada.
- O segredo interno é lido de Docker Secret e nunca persistido em variável pública ou log.
- Ciclos são sequenciais, possuem timeout e intervalo limitado, evitando sobreposição.
- Falhas de uma rotina são isoladas e registradas sem interromper as demais.
- O runner reutiliza a imagem imutável do frontend e passa a integrar o deploy validado.


### Recomendações assistidas de recuperação — PR #320

- O sistema gera prioridade, próxima ação, confiança e justificativa a partir de sinais persistidos.
- Recomendações ficam em modo sombra e não alteram casos nem enviam mensagens.
- Decisões são versionadas, isoladas por empresa e acompanhadas do snapshot explicável.
- O motor inicial determinístico estabelece uma referência mensurável para futuros modelos de IA.


### Revisão humana das recomendações — PR #321

- Recomendações podem ser aceitas, ajustadas ou rejeitadas sem alterar a sugestão original.
- Ajustes e rejeições exigem justificativa; ajustes exigem ação e prioridade explícitas.
- Versão, estado e atualização condicional protegem contra decisões concorrentes.
- Operador, horário e diferenças da decisão ficam auditáveis.
- A revisão não executa ações no caso nem envia mensagens.


### Interface de revisão das recomendações — PR #322

- A fila permite gerar análise e exibe ação, prioridade, confiança e justificativa.
- Operadores podem aceitar, ajustar, rejeitar ou reanalisar com feedback claro.
- A tela informa que a revisão não executa ações automaticamente.
- Recomendações persistidas reaparecem após recarregar a página.


### Resultados das recomendações assistidas — PR #323

- Mede aceitação, ajuste, rejeição, concordância, confiança e tempo até revisão.
- Compara motores por período sem expor mensagens ou dados pessoais.
- Consultas são somente leitura, limitadas e isoladas por empresa.


### Runtime do agente de IA — PR #324

- Contrato estrito limita ações, prioridade, confiança, justificativa e sinais.
- Runtime independente de provedor registra modelo, prompt, tokens e modo de execução.
- Timeout limitado e saída inválida acionam fallback determinístico seguro.
- O agente não acessa banco, WhatsApp, outbox ou serviços de mutação.
- Toda decisão permanece destinada à revisão humana.

### Execução sombra do agente de IA — PR #325

- O fluxo real de recomendação executa o runtime em paralelo e mantém o motor determinístico como única autoridade dos campos oficiais.
- A decisão sombra e os metadados técnicos (modo, provedor, modelo, versão do prompt, tokens, duração e erro normalizado) são registrados separadamente.
- Ausência ou falha de provedor usa fallback determinístico e nunca impede a recomendação oficial.
- A execução sombra não acessa WhatsApp, outbox, serviços de mutação, RAG ou MCP e não realiza ações autônomas.

### Primeiro provider real do agente — PR #326

- O adapter OpenAI implementa o contrato neutro do runtime pela Responses API com saída JSON estrita.
- Provider, modelo e timeout são habilitados explicitamente no servidor; a chave aceita Docker Secret por `OPENAI_API_KEY_FILE`.
- Configuração ausente, erro HTTP, resposta inválida ou timeout permanecem cobertos pelo fallback determinístico.
- O provider participa somente da recomendação em modo sombra e não recebe acesso a banco, WhatsApp, outbox, RAG, MCP ou mutações.

### Observabilidade do agente em sombra — PR #327

- A visão de qualidade compara agente, motor determinístico e decisão humana sem alterar nenhuma recomendação.
- Execuções por IA e fallback, erros normalizados, duração média e p95 são agregados por empresa e período.
- Tokens de entrada e saída formam a base auditável de consumo, sem acoplar o domínio a preços voláteis de modelos.
- Provedor e modelo são comparados separadamente; toda consulta permanece limitada, somente leitura e isolada por tenant.

### Contexto recuperado do agente — PR #328

- Um contrato independente de tecnologia produz snapshot versionado a partir do caso, última resposta e booking do mesmo tenant.
- O primeiro snapshot contém somente fatos operacionais estruturados; nome, telefone, e-mail e notas livres não são enviados ao modelo.
- Fontes, versão e tamanho do contexto são auditados junto à execução sombra, sem nova persistência ou migration.
- Divergência de tenant ou contexto indisponível bloqueia o provider e preserva o fallback determinístico.
- Banco vetorial, embeddings, RAG externo, MCP e autonomia permanecem fora deste incremento.

### Recuperação semântica auditável — PR #329

- Documentos de conhecimento são versionados, aprovados, temporalmente válidos e isolados por empresa.
- A primeira seleção é lexical e determinística, com no máximo três trechos de 400 caracteres entre 50 candidatos tenant-scoped.
- Cada trecho preserva documento, origem, referência, hash e versão para auditoria e futura avaliação.
- Conteúdo recuperado é tratado como referência não confiável e nunca como instrução ao agente.
- Embeddings e banco vetorial continuam desacoplados; MCP e autonomia permanecem fora deste incremento.

### Governança do conhecimento — PR #330

- APIs administrativas permitem criar novas versões em rascunho, aprovar e retirar documentos, sempre no tenant autenticado.
- Conteúdo aprovado nunca é sobrescrito; alterações criam nova versão e exigem nova aprovação.
- Hash SHA-256, autoria, transições e metadados são calculados e auditados no servidor.
- Somente owner e admin governam conhecimento; ingestão externa, embeddings, MCP e autonomia permanecem fora do ciclo.

### Interface de governança do conhecimento — PR #331

- Owner e admin acessam a governança pelo hub de configurações, criam rascunhos e visualizam versões, origem, hash e validade.
- A interface oferece somente as transições válidas: aprovar rascunho e retirar documento aprovado.
- Erros concorrentes ou transições obsoletas recebem feedback e não alteram o conteúdo localmente.
- A tela consome exclusivamente as APIs do PR #330; não há SQL, embeddings, MCP ou autonomia.

### Busca vetorial em comparação sombra — PR #332

- Um adapter neutro de embeddings compara ranking vetorial com o baseline lexical sem alterar os documentos enviados ao agente.
- OpenAI é o primeiro provider, habilitado apenas por configuração explícita e Docker Secret já existente.
- Candidatos, tamanho das entradas, timeout e resultados são limitados; falhas são normalizadas e não interrompem a recomendação.
- Modelo, tokens, duração, documentos classificados e sobreposição com o lexical são auditados no JSON da execução e agregados na observabilidade.
- Vetores não são persistidos e não há banco vetorial, migration, MCP ou autonomia neste incremento.

### Gates de qualidade da recuperação vetorial — PR #333

- Uma política explícita e versionada avalia amostra mínima, disponibilidade, fallback, p95, consumo médio, sobreposição lexical e concordância com resultados humanos.
- O resultado auditável distingue `insufficient_data`, `keep_shadow` e `eligible`, com valores observados, limites e motivos reproduzíveis.
- `eligible` significa somente elegível para revisão humana; nenhuma configuração, provider ou comportamento operacional é promovido automaticamente.
- Concordância humana é identificada como sinal correlacional do fluxo, não como rótulo de relevância do ranking vetorial.
- O cálculo é tenant-scoped, somente leitura e usa metadados já persistidos; não há SQL, migration, MCP ou autonomia neste incremento.

### Avaliação humana do retrieval — PR #334

- Avaliadores classificam documentos dos rankings lexical e vetorial como relevantes, parcialmente relevantes ou irrelevantes.
- O servidor confirma tenant, versão e participação real do documento no ranking antes de persistir o rótulo.
- Estratégia, posição, documento, avaliador, data e alterações ficam auditáveis sem reescrever a execução original.
- A migration é aditiva e habilita RLS; nenhuma avaliação altera recomendação ou comportamento operacional.
- Os rótulos formam evidência semântica futura, sem promoção automática, MCP ou autonomia.

### Interface de avaliação humana do retrieval — PR #335

- A revisão da recomendação expõe, sob demanda, os rankings lexical e vetorial lado a lado.
- Cada documento exibe posição, título, versão e hash curto, com rótulos relevantes, parciais ou irrelevantes.
- O estado salvo retorna pelo endpoint do PR #334 e permite correção idempotente da avaliação.
- A interface reafirma que os rótulos geram evidência e não alteram a recomendação.
- Não há SQL, novo provider, MCP, promoção automática ou autonomia neste incremento.

### Métricas semânticas do retrieval — PR #336

- Rótulos humanos produzem score ponderado de relevância e precisão no primeiro resultado para lexical e vetorial.
- Comparações pareadas registram vitórias, derrotas, empates e delta vetorial versus lexical sem inferir causalidade.
- O gate `recovery_retrieval_quality_v2` exige amostra vetorial direta, relevância mínima e não inferioridade ao lexical.
- Concordância com decisões humanas permanece apenas como sinal correlacional separado dos rótulos de retrieval.
- O cálculo é tenant-scoped e somente leitura; não há SQL, promoção automática, MCP ou autonomia.

### Fila de avaliação do retrieval — PR #337

- Uma fila tenant-scoped prioriza recomendações com rótulos faltantes, dando maior peso às lacunas vetoriais.
- Casos completos e execuções sem ranking são excluídos; limites de período, candidatos e resultados protegem a leitura.
- A tela mostra cobertura lexical e vetorial e reutiliza a avaliação governada do PR #335.
- A ordenação é reproduzível por prioridade, idade e recomendação, sem modificar os rankings.
- Não há SQL, promoção automática, MCP ou autonomia neste incremento.

### Dossiê de evidências do retrieval — PR #339

- Um relatório JSON reúne período, métricas, quality gate, guardrails e versões das políticas.
- A serialização canônica produz hashes SHA-256 reproduzíveis do dataset e do relatório.
- IDs internos viram fingerprints curtas; dados pessoais e conteúdo documental não são exportados.
- Somente owner e admin exportam o relatório tenant-scoped, limitado e sem cache.
- Não há persistência, SQL, promoção automática, MCP ou autonomia.

### Detector de regressão do retrieval — PR #340

- Dossiês íntegros e compatíveis são comparados por relevância, precisão, fallback, p95, tokens e concentração.
- A política versionada classifica `improved`, `stable`, `regressed` ou `incomparable` com deltas e motivos.
- Hash inválido, JSON excessivo ou versões incompatíveis bloqueiam a comparação.
- O comparador é puro, offline e nunca promove configurações automaticamente.
- Não há persistência, SQL, MCP ou autonomia.

### Interface de comparação de regressões — PR #341

- Owner e admin selecionam baseline e relatório atual em JSON e visualizam estado, motivos e deltas.
- Cada arquivo é validado e limitado a 100 KB antes do envio; os dados permanecem somente em memória.
- A tela permite exportar o relatório atual e traduz as métricas críticas para leitura operacional.
- Regressões recebem destaque sem executar promoção, rollback ou alteração de configuração.
- Não há persistência, SQL, provider novo, MCP ou autonomia.

### Baseline governado do retrieval — PR #342

- Owner aprova somente dossiês com integridade criptográfica válida e justificativa explícita.
- Persistem apenas hashes, versões, escopo, autoria e datas; conteúdo documental e dados pessoais ficam fora.
- Um índice parcial garante apenas um baseline ativo por tenant e escopo; substituições são transacionais.
- A retirada preserva o histórico auditável de aprovação.
- O baseline é referência de avaliação e nunca promove provider, ranking, MCP ou autonomia.

### Comparação com baseline governada — PR #343

- A comparação resolve a baseline ativa exclusivamente pelo tenant autenticado e pelo escopo solicitado.
- O dossiê apresentado precisa corresponder aos hashes de relatório e dataset previamente aprovados.
- O relatório atual é produzido no servidor a partir da observabilidade tenant-scoped, evitando seleção manual de um segundo arquivo.
- Baseline ausente, divergente ou inválida bloqueia a análise com erro normalizado.
- O resultado continua informativo: não altera ranking, provider, configuração ou estado operacional.

### Administração de baselines — PR #345

- Owner seleciona um dossiê íntegro, informa justificativa e aprova a referência pelo contrato governado existente.
- A tela lista baselines ativas e retiradas com hashes, datas e motivos, sem armazenar conteúdo documental.
- A retirada exige justificativa e preserva integralmente o histórico auditável.
- Aprovar ou retirar uma baseline não promove configurações e não executa ações operacionais.
- Não há novo SQL, provider, MCP ou autonomia neste incremento.

### Propostas governadas de evolução — PR #346

- Owner registra uma configuração candidata estritamente validada contra a baseline ativa e a evidência atual.
- A proposta preserva hashes, resultado da regressão, versão do candidato, justificativa, autoria e data.
- O candidato limita estratégia, provider, modelo, top K, universo de candidatos e similaridade mínima.
- A tabela é tenant-scoped, auditável e não contém conteúdo documental ou dados pessoais.
- A proposta não possui aprovação, ativação, outbox, WhatsApp, MCP ou promoção automática.

### Guardrails da amostra de retrieval — PR #338

- Uma política versionada mede diversidade de recomendações e documentos, equilíbrio entre estratégias, cobertura das posições e concentração documental.
- O diagnóstico distingue `insufficient_data`, `sample_biased` e `representative`, com limites e motivos reproduzíveis.
- Amostras concentradas em poucos documentos ou estratégias não podem sustentar decisões de evolução do retrieval.
- A observabilidade usa leituras tenant-scoped já existentes e permanece sem efeitos operacionais.
- Não há SQL, promoção automática, MCP ou autonomia neste incremento.
