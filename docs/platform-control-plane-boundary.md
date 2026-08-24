# Fronteira entre controle Flaience e operação do cliente

Atualizado em: 24 de agosto de 2026.

## 1. Decisão

O SISAG possui duas experiências com finalidades e públicos diferentes:

- **Centro de Controle SISAG:** ambiente interno da Flaience para saúde técnica, automações, capacidade, filas, SLA técnico, incidentes e supervisão multicliente autorizada.
- **Operação da empresa:** produto usado pelo cliente para agenda, equipe, confirmações, atendimentos, ausências, canais e resultados do próprio negócio.

A complexidade técnica permanece sob controle da Flaience. O cliente recebe uma experiência orientada a tarefas e resultados.

## 2. Fronteira de rotas

| Espaço | Público | Proteção | Escopo de dados |
| --- | --- | --- | --- |
| `/platform/*` | Flaience | `platform_role` igual a `operator` ou `admin` | visão de plataforma autorizada |
| `/admin/*` | empresa cliente | sessão, `companyId`, papel do aplicativo e acesso comercial | tenant autenticado |
| `/api/platform/*` | automações internas | segredo interno validado no servidor | contrato específico da capacidade |

Rotas não devem ser compartilhadas apenas por conveniência visual. Serviços de domínio podem ser reutilizados, mas autorização, consulta e apresentação respeitam o público de cada espaço.

## 3. Papéis

### Flaience

- `operator`: acompanha operação e executa ações permitidas;
- `admin`: gestão ampliada do plano de controle.

### Empresa cliente

- `owner`: responsável máximo pelo tenant;
- `admin`: administra a operação da empresa;
- `staff`: executa tarefas operacionais permitidas.

Um papel do cliente nunca implica papel de plataforma. Em particular, `owner`, `admin` ou `staff` do tenant não concedem acesso a `/platform` sem `platform_role` válido nos metadados seguros.

## 4. Conteúdo do Centro de Controle

- saúde do runner e leases;
- capacidade, backlog e justiça;
- filas, locks, falhas e recuperação;
- SLA técnico e sinais acionáveis;
- adiamentos e escalonamentos;
- auditoria e histórico multicliente autorizado;
- diagnóstico de integrações e automações.

Essa linguagem pode ser técnica, mas deve continuar clara para operadores Flaience.

## 5. Conteúdo da operação do cliente

- agenda e disponibilidade;
- agendamentos confirmados e aguardando confirmação;
- cancelamentos, ausências e conclusões;
- profissionais, pessoas e serviços;
- canais e configurações autorizadas;
- indicadores comerciais compreensíveis;
- pendências que exigem ação da própria empresa.

O cliente não deve visualizar runner, locks, filas globais, segredos internos, payloads técnicos, métricas de outros tenants ou diagnósticos da infraestrutura Flaience.

## 6. Regras de implementação

1. Autorizar no servidor; esconder menu não é controle de acesso.
2. Aplicar escopo de tenant em toda consulta do cliente.
3. Não criar links de `/admin` para `/platform`.
4. Não usar papel de tenant como substituto de `platform_role`.
5. Manter ações sensíveis auditadas e idempotentes.
6. Expor somente os campos necessários a cada público.
7. Testar negação de acesso, não apenas o caminho permitido.
8. Manter agentes e ferramentas MCP sob a mesma fronteira de autorização.

## 7. Estado verificado

- o layout `/platform` chama `requirePlatformOperator` no servidor;
- sessão ausente redireciona para login;
- papel sem permissão de plataforma redireciona para acesso não autorizado;
- testes rejeitam explicitamente papéis `owner` e `staff` como papéis de plataforma;
- o layout `/admin` exige usuário autenticado, `companyId`, papel do aplicativo e acesso comercial;
- os shells e menus são separados.

## 8. Próximos controles

- definir permissões distintas entre `operator` e `admin` da Flaience;
- criar uma matriz por ação sensível do Centro de Controle;
- revisar APIs usadas pela interface para confirmar autenticação adequada ao canal;
- testar ausência de navegação cruzada;
- revisar logs e exportações para minimizar dados sensíveis;
- manter esta fronteira na internacionalização e nas futuras interfaces por voz.
