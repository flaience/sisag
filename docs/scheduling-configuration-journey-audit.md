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
