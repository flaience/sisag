# Arquitetura da interface operacional do SISAG

Atualizado em: 26 de agosto de 2026.

## 1. Objetivo

Definir a interface operacional do protótipo e do piloto com navegação simples, terminologia compreensível, padrões reutilizáveis e preparação estrutural para agentes, MCP, texto e voz.

Este documento separa o modelo interno do produto da linguagem apresentada ao usuário. A implementação técnica pode conservar nomes como `bookings`, mas a experiência utiliza termos de negócio localizáveis.

## 2. Princípios obrigatórios

- uma tarefa deve possuir um caminho principal;
- o mesmo conceito usa o mesmo nome em todas as telas;
- regras de negócio não ficam presas à interface;
- desktop e celular compartilham a mesma hierarquia;
- ações destrutivas exigem confirmação e consequência explícita;
- filtros, paginação e estado da tela devem ser previsíveis;
- formulários informam o erro junto ao campo;
- interface, agente, MCP e voz usam os mesmos contratos;
- idioma é parâmetro de apresentação, não regra de domínio;
- controles técnicos da Flaience não aparecem para o cliente.

## 3. Diagnóstico da interface atual

Foram identificadas 26 páginas administrativas. Há ativos valiosos, mas também sobreposição e lacunas:

- `/admin/appointments` e `/admin/bookings` representam duas jornadas de agendamento;
- “booking” e “appointments” aparecem para usuários brasileiros;
- usuários possuem caminhos em `/admin/users` e `/admin/settings/users`;
- empresa e unidade ainda não possuem fronteira de experiência bem definida;
- profissionais possuem cadastro e horários, mas a experiência está fragmentada;
- serviços e recursos não possuem um conjunto administrativo completo;
- configurações de agenda, WhatsApp e usuários estão distribuídas;
- “Visitas” não tem posição clara na jornada principal do piloto;
- telas antigas e novas utilizam padrões visuais e mensagens diferentes.

## 4. Vocabulário de apresentação

| Conceito interno | Português do Brasil | Espanhol inicial | Regra |
| --- | --- | --- | --- |
| booking / appointment | Agendamento | Cita | nunca exibir “booking” |
| client / person | Cliente | Cliente | “Pessoa” somente quando o domínio exigir sentido mais amplo |
| company | Empresa | Empresa | tenant proprietário da operação |
| unit | Unidade | Sede | local operacional da empresa |
| professional | Profissional | Profesional | pessoa que presta o atendimento |
| service | Serviço | Servicio | item agendável |
| resource | Recurso | Recurso | sala, equipamento ou capacidade necessária |
| availability | Disponibilidade | Disponibilidad | horários que podem ser oferecidos |
| pending | Pendente | Pendiente | aguarda confirmação |
| confirmed | Confirmado | Confirmada | horário reservado e confirmado |
| completed | Concluído | Completada | atendimento realizado |
| cancelled | Cancelado | Cancelada | agendamento encerrado por cancelamento |
| no show | Não compareceu | No asistió | ausência registrada após o horário |

Os textos serão chaves de tradução. O espanhol definitivo será validado por mercado e país, sem alterar contratos ou banco.

## 5. Arquitetura do menu do cliente

### Visão geral

- **Visão geral** — indicadores, prioridades e próximos atendimentos.

### Operação

- **Agenda** — visão diária e semanal da operação;
- **Agendamentos** — consulta, inclusão e acompanhamento;
- **Clientes** — cadastro e histórico operacional.

### Estrutura

- **Unidades** — locais de atendimento;
- **Profissionais** — cadastro, vínculo e horários;
- **Serviços** — duração, preço e requisitos;
- **Recursos** — salas, equipamentos e capacidades.

### Disponibilidade

- **Horários de atendimento** — regras semanais;
- **Bloqueios e ausências** — férias e indisponibilidades;
- **Feriados** — datas sem atendimento por unidade ou região.

### Administração

- **Configurações** — regras de agendamento, cancelamento e confirmação;
- **Comunicação** — canais e histórico operacional;
- **Usuários e permissões** — acesso da equipe;
- **Idioma e região** — idioma, fuso e formatos.

### Assistência

- **Implantação assistida** — progresso da configuração inicial;
- **Ajuda** — orientação contextual e contato de suporte.

## 6. Padrões funcionais reutilizáveis

### Modelo A — Consulta

- título e explicação curta;
- ação primária “Adicionar”;
- busca e filtros relevantes;
- tabela em telas amplas e cartões em telas pequenas;
- ordenação e paginação no servidor;
- situação claramente identificada;
- ações de visualizar, editar e desativar;
- estados de carregamento, vazio e erro;
- filtros preservados ao retornar do detalhe.

### Modelo B — Inclusão e alteração

- um formulário para inclusão e alteração quando os campos forem equivalentes;
- seções curtas e progressivas;
- campos obrigatórios identificados;
- ajuda contextual em linguagem de negócio;
- validação acessível junto ao campo;
- ações “Salvar” e “Cancelar” consistentes;
- prevenção contra duplo envio e perda de alterações;
- desativação separada da edição comum;
- metadados que permitam ao agente perguntar e preencher cada campo.

### Modelo C — Detalhes e jornada

- resumo principal;
- estado e próximas ações permitidas;
- dados relacionados;
- histórico cronológico;
- comunicação e autoria;
- ações condicionadas a permissão e estado;
- explicação simples para ações indisponíveis.

### Modelo D — Configuração guiada

- etapas com progresso visível;
- dependências explicadas antes do preenchimento;
- salvamento por etapa;
- resumo de prontidão;
- possibilidade futura de condução pelo agente em texto ou voz.

## 7. Mapa de telas do piloto

| Módulo | Consulta | Inclusão/alteração | Detalhe/configuração | Total |
| --- | ---: | ---: | ---: | ---: |
| Visão geral | 1 | 0 | 0 | 1 |
| Agenda | 1 | 0 | 0 | 1 |
| Agendamentos | 1 | 1 | 1 | 3 |
| Clientes | 1 | 1 | 1 | 3 |
| Profissionais | 1 | 1 | 1 | 3 |
| Serviços | 1 | 1 | 1 | 3 |
| Unidades | 1 | 1 | 1 | 3 |
| Recursos | 1 | 1 | 1 | 3 |
| Disponibilidade | 1 | 2 | 0 | 3 |
| Configurações | 1 | 2 | 0 | 3 |
| Comunicação | 1 | 0 | 1 | 2 |
| Implantação assistida | 0 | 0 | 1 | 1 |
| Ajuda | 0 | 0 | 1 | 1 |
| **Total projetado** | **10** | **10** | **9** | **29** |

As 29 telas são combinações de quatro modelos, não 29 experiências independentes. O piloto pode iniciar com 20 telas essenciais e habilitar os detalhes complementares durante validação.

## 8. Tratamento das rotas atuais

### Manter e evoluir

- `/admin` como **Visão geral**;
- `/admin/agenda` como agenda operacional;
- `/admin/bookings` como implementação oficial de **Agendamentos**;
- `/admin/people` como **Clientes**;
- `/admin/professionals` como **Profissionais**;
- `/admin/settings` como entrada da Central de Configuração.

### Consolidar

- inclusão, consulta e jornada de `bookings` formam a experiência oficial de Agendamentos;
- usuários convergem para `/admin/settings/users`;
- horários do profissional passam a fazer parte de disponibilidade, mantendo acesso contextual pelo profissional;
- WhatsApp passa a ser apresentado como parte de Comunicação, não como estrutura principal do menu.

### Compatibilidade temporária

- `/admin/appointments` permanece fora do caminho principal até a migração do agregado;
- links antigos devem redirecionar somente após equivalência funcional;
- “Visitas” será avaliado como tipo de serviço ou módulo opcional e não entra no menu essencial.

### Criar

- telas completas de Serviços;
- telas completas de Unidades;
- telas completas de Recursos;
- bloqueios, ausências e feriados;
- implantação assistida;
- idioma e região.

## 9. Preparação para agentes, MCP e voz

Cada campo configurável deve possuir:

- identificador estável;
- pergunta compreensível;
- descrição e exemplo;
- tipo e validação;
- opções permitidas;
- dependências;
- permissão necessária;
- confirmação exigida;
- chave de tradução;
- operação de leitura e escrita auditável.

Na primeira fase, o usuário preenche os formulários manualmente. O agente poderá explicar e acompanhar. Em fases posteriores, o agente utilizará os mesmos metadados e capacidades para conduzir o preenchimento por texto ou voz, sempre confirmando alterações relevantes.

## 10. Sequência modular de implementação

1. reorganizar o menu e retirar termos técnicos visíveis;
2. criar cabeçalho, consulta, formulário e estados de feedback padronizados;
3. consolidar Agendamentos sobre `bookings`;
4. padronizar Clientes;
5. padronizar Profissionais e horários;
6. construir Serviços;
7. construir Unidades e Recursos;
8. construir Disponibilidade, bloqueios e feriados;
9. construir Central de Configuração;
10. organizar Comunicação e usuários;
11. construir Implantação Assistida;
12. revisar responsividade, acessibilidade, tradução e jornada de ponta a ponta.

Cada etapa deve ser pequena, testada, documentada e reversível.

## 11. Critérios de aceite por tela

- linguagem de negócio e chaves de tradução;
- acesso e tenant validados no servidor;
- estados de carregamento, vazio, sucesso e erro;
- comportamento responsivo;
- navegação por teclado e rótulos acessíveis;
- validação de campo e retorno controlado da API;
- teste do fluxo principal e das permissões;
- operação correspondente reutilizável por agentes;
- manual operacional atualizado;
- nenhuma informação técnica do plano de controle exposta ao cliente.

## 12. Próxima entrega

Implementar a primeira versão do novo menu, ainda apontando para rotas existentes. O PR deve remover “Appointments” da navegação principal, apresentar “Agendamentos” sem o termo booking, agrupar administração e manter permissões atuais. Nenhuma rota será removida nessa etapa.

## 13. Primeira navegação operacional implementada

O menu passa a apresentar Visão geral, Agenda, Agendamentos, Clientes, Profissionais, Empresa e Configurações, agrupados conforme a tarefa. Appointments e Visitas deixam a navegação principal sem remoção de rota. A estrutura possui rótulos iniciais em português do Brasil e espanhol; a seleção dinâmica do idioma será conectada posteriormente.

## Padrões reutilizáveis de página

As telas administrativas devem compor a família `SisagPage`, sem recriar estruturas locais:

- `SisagPageHeader`: contexto, título, descrição orientada à tarefa e ações principais;
- `SisagListFrame`: título da coleção, filtros, conteúdo e paginação no mesmo contêiner;
- `SisagDataState`: estados acessíveis e consistentes de carregamento, erro e ausência de registros;
- `SisagEmptyState`: mensagem contextual e ação recomendada.

Cada migração deve ocorrer de forma modular por funcionalidade. A padronização não altera contratos, rotas, permissões nem regras de domínio.


## Fronteira obrigatória de linguagem

Valores técnicos como `owner`, `staff`, `booking` e `appointment` permanecem nos contratos internos, mas nunca devem ser exibidos diretamente. Perfis de acesso usam `getAdminRoleLabel`; conceitos de agenda usam o catálogo de vocabulário. Nomes cadastrados por clientes, como razão social ou nome de unidade, são dados e não devem ser traduzidos automaticamente. Novos componentes devem receber valores internos e convertê-los somente na camada de apresentação.
