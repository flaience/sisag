# Prontidão da jornada do cliente para o piloto

Atualizado em: 26 de agosto de 2026.

## 1. Objetivo

Este documento transforma o estado atual do SISAG em um plano verificável para um piloto controlado até novembro/dezembro de 2026. A prioridade é entregar valor operacional com rapidez, segurança, precisão e automação, sem ampliar o escopo antes de concluir a jornada essencial.

## 2. Escopo mínimo do piloto

Uma empresa piloto deve conseguir:

1. entrar com usuário autorizado e visualizar somente sua empresa;
2. configurar profissionais, serviços, horários e canal de comunicação;
3. localizar ou cadastrar uma pessoa;
4. consultar disponibilidade real;
5. criar, confirmar, reagendar, cancelar e concluir um agendamento;
6. acompanhar agenda diária e prioridades;
7. enviar e receber comunicações operacionais;
8. observar falhas e recuperar operações sem intervenção técnica da Flaience;
9. manter histórico auditável das ações humanas e automáticas.

Recursos de agentes, MCP, voz e localização comercial completa não bloqueiam o piloto. A arquitetura deve continuar preparada para eles.

## 3. Evidências existentes

### Interface do cliente

Já existem páginas para:

- dashboard operacional;
- agenda e listas de agendamentos;
- criação e edição;
- jornada do booking;
- pessoas, empresas e profissionais;
- horários dos profissionais;
- configurações de agendamento, usuários e WhatsApp.

O dashboard já apresenta volume, confirmações, pendências, cancelamentos, comunicação, automações e prioridades. Isso é uma base relevante de valor percebido, não apenas infraestrutura.

### Capacidades operacionais

Já existem contratos para:

- localizar horários;
- criar, listar, confirmar, reagendar, cancelar e concluir agendamentos;
- consultar a jornada;
- processar pós-ativação de forma indexada, durável e monitorada;
- recuperar locks, adiar condições de negócio e escalar casos;
- persistir métricas, capacidade e justiça.

### Segurança já presente

- o layout administrativo exige sessão e acesso administrativo;
- parte das rotas resolve a empresa pelo contexto autenticado;
- o Centro de Controle Flaience possui fronteira arquitetural separada;
- APIs internas de plataforma validam credencial própria.

## 4. Bloqueadores comprovados

### P0 — Isolamento multiempresa inconsistente

Progresso: a coleção `/api/v1/bookings` passou a resolver a empresa exclusivamente pela sessão e possui testes contra adulteração. As demais rotas listadas abaixo continuam pendentes até suas entregas específicas.

A listagem e a busca administrativa de profissionais também passaram a exigir sessão e filtrar obrigatoriamente a empresa autenticada. Disponibilidade e demais cadastros continuam pendentes.

As consultas de horários e recursos ocupados passaram a usar a empresa da sessão. O serviço também rejeita `serviceId` de outro tenant e mantém recursos filtrados pela empresa autenticada.

A coleção legada de appointments também passou a exigir sessão. Listagem, profissional e pessoa são vinculados ao tenant autenticado antes da criação.

Algumas rotas centrais aceitam `companyId` de query string ou corpo da requisição, incluindo listagem/criação de bookings, profissionais, disponibilidade e agendamentos. Em determinados caminhos não há evidência de que o identificador seja substituído ou validado contra a empresa da sessão.

Risco: um cliente adulterar o identificador e consultar ou operar dados de outra empresa.

Critério de resolução:

- toda rota autenticada resolve `companyId` no servidor;
- qualquer identificador recebido é ignorado ou comparado com a sessão;
- consultas e mutações filtram a empresa;
- testes negativos comprovam rejeição entre tenants.

### P0 — Dois caminhos de agendamento

O produto possui páginas e APIs de `appointments` e `bookings`. Há sobreposição de criação, listagem e ações, com contratos e estados distintos.

Risco: comportamento divergente, duplicação de manutenção e telas apontando para fontes diferentes.

Critério de resolução:

- definir `bookings` ou `appointments` como agregado oficial;
- mapear consumidores antes de retirar compatibilidade;
- fazer agenda, dashboard e jornada lerem a mesma fonte;
- documentar migração e reversão.

### P0 — WhatsApp ainda contém caminhos simulados

Existem rotas administrativas com `TODO` para autenticação, resolução de empresa e persistência, além de adaptador mock.

Risco: interface indicar prontidão enquanto comunicação real não está isolada ou persistida corretamente.

Critério de resolução:

- separar claramente produção, sandbox e desenvolvimento;
- impedir rotas mock em produção;
- resolver empresa pela sessão;
- persistir envio, retorno, falha e correlação;
- validar com número e conta de teste controlados.

## 5. Lacunas de alta prioridade

### P1 — Jornada essencial comprovada de ponta a ponta

É necessário um cenário automatizado que execute: autenticação, disponibilidade, criação, confirmação, reagendamento, cancelamento ou conclusão, comunicação e auditoria.

### P1 — Estados operacionais consistentes

Os estados apresentados nas telas precisam derivar de um vocabulário único. Confirmado, pendente, cancelado, reagendado, concluído e ausência devem possuir transições e indicadores explícitos.

### P1 — Experiência de erro e recuperação

As telas devem explicar conflito de horário, perda de disponibilidade, falha de comunicação e ação não autorizada sem expor detalhes técnicos.

### P1 — Preparação de tenant piloto

Provisionamento, usuário administrador, configurações, dados iniciais, canal e procedimento de suporte devem formar um checklist reproduzível.

## 6. Sequência recomendada de entregas

1. endurecer a fronteira multiempresa das rotas de agendamento;
2. auditar e decidir o agregado oficial entre bookings e appointments;
3. consolidar a jornada essencial sobre o agregado escolhido;
4. fechar os caminhos produtivos de WhatsApp e bloquear mocks;
5. criar teste de aceitação completo por tenant;
6. aprimorar telas conforme testes com operação real;
7. testar carga, recuperação, segurança e observabilidade;
8. executar piloto interno;
9. iniciar piloto externo acompanhado.

## 7. Critérios de entrada no piloto externo

- nenhuma rota operacional confia em `companyId` fornecido pelo cliente;
- isolamento entre duas empresas comprovado por testes;
- uma única jornada oficial de agendamento;
- operações essenciais aprovadas de ponta a ponta;
- WhatsApp produtivo ou alternativa operacional explicitamente definida;
- logs e auditoria suficientes para explicar cada transição;
- backup, reversão e resposta a incidentes documentados;
- manual do cliente e manual da Flaience atualizados;
- indicadores de disponibilidade, erro e tempo de resposta observáveis;
- nenhuma falha crítica aberta.

## 8. Cronograma de referência

### Setembro de 2026

- isolamento multiempresa;
- decisão e consolidação do agregado de agendamento;
- jornada essencial funcional.

### Outubro de 2026

- comunicação produtiva;
- teste ponta a ponta;
- segurança, carga e recuperação;
- ajustes de experiência.

### Novembro de 2026

- piloto interno;
- correções orientadas por uso;
- preparação e seleção do primeiro tenant externo.

### Novembro/dezembro de 2026

- piloto externo controlado;
- acompanhamento próximo;
- decisão de expansão baseada em evidências.

## 9. Arquitetura da interface do piloto

O mapa de navegação, os quatro modelos funcionais, a terminologia e as 29 telas projetadas estão registrados em [Arquitetura da interface operacional](./admin-ui-navigation-and-screen-models.md). A implementação seguirá entregas modulares e manterá o plano de controle Flaience separado.

## 10. Regra de governança

Cada PR ligado ao piloto deve indicar:

- valor entregue ao cliente;
- risco reduzido;
- evidência de teste;
- impacto multiempresa;
- impacto operacional e necessidade de manual;
- implantação e reversão.

Uma funcionalidade não está pronta porque existe no código. Ela está pronta quando um tenant autorizado consegue utilizá-la com segurança, a operação consegue explicá-la e a Flaience consegue monitorá-la e recuperá-la.


## Circuito de configuração e agendamento

O inventário de cadastros, lacunas, riscos e sequência de implementação está registrado em [`scheduling-configuration-journey-audit.md`](./scheduling-configuration-journey-audit.md). A fronteira multiempresa de Serviços é bloqueador obrigatório antes do CRUD visual desse cadastro.
