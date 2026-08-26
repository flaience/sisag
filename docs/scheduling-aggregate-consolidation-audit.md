# Consolidação do agregado de agendamento

Atualizado em: 26 de agosto de 2026.

## 1. Decisão

O agregado `bookings` é a fonte oficial para a evolução da jornada de agendamento do SISAG.

O agregado `appointments` passa a ser tratado como compatibilidade temporária. Ele não deve receber novas capacidades. Seus consumidores serão migrados de forma incremental e verificável antes da interrupção de escrita ou remoção das tabelas, serviços, APIs e telas antigas.

Esta decisão não autoriza exclusão imediata nem migração destrutiva de dados.

## 2. Evidências

| Área | Bookings | Appointments | Consequência |
| --- | --- | --- | --- |
| Jornada operacional | confirmação, cancelamento, reagendamento, recriação, mensagens e histórico | criação, edição, cancelamento e reagendamento básicos | bookings cobre a jornada-alvo |
| Disponibilidade | integra itens, alocações, serviços e recursos | vínculo simples com profissional | bookings representa capacidade real |
| Automação e agentes | usado pelo Conversation Engine e pelo adaptador oficial de capacidades | usado pelo AssistantWhatsApp legado | novas automações devem convergir para bookings |
| Interface | lista, criação e jornada detalhada | lista, criação e edição legadas | a experiência do cliente ainda está dividida |
| Indicadores | estrutura adequada para estados e alocações | dashboard atual ainda consulta appointments | dashboard precisa migrar antes do corte |
| Multiempresa | fronteira da coleção já endurecida | fronteira da coleção também endurecida | ambos estão mais seguros, mas duplicados |

## 3. Consumidores que impedem retirada imediata

Antes de desativar `appointments`, devem ser migrados ou explicitamente aposentados:

- dashboard operacional, que ainda agrega a tabela `appointments`;
- páginas administrativas em `/admin/appointments`;
- APIs em `/api/v1/appointments` e suas ações;
- `AssistantWhatsAppService`, incluindo consulta, criação, reagendamento e cancelamento;
- qualquer relatório, integração ou dado histórico que dependa dos identificadores antigos.

A agenda e os indicadores devem terminar lendo a mesma fonte oficial usada pela jornada, disponibilidade e agentes.

## 4. Contrato oficial

O domínio deve expor o conceito de agendamento em linguagem de negócio, mesmo que a implementação interna use `bookings`. APIs de capacidades, MCP, n8n, voz e interfaces não devem depender diretamente de nomes de tabela.

O contrato oficial deve preservar:

- `companyId` resolvido no servidor;
- pessoa, serviço, recursos e alocações;
- início, duração e fuso horário;
- estados e transições validados;
- idempotência e proteção contra conflito;
- autoria, origem, correlação e histórico;
- mensagens localizáveis, sem textos de idioma embutidos na regra de negócio.

## 5. Plano incremental

### Fase A — Congelar a divergência

- não adicionar funcionalidades a `appointments`;
- registrar novos requisitos somente no contrato oficial;
- inventariar estados e campos que precisam ser preservados;
- medir volume e idade dos dados nos dois agregados.

### Fase B — Migrar leituras do cliente

- adaptar dashboard e agenda para `bookings`;
- consolidar criação, lista e jornada sob a experiência oficial;
- manter links antigos com redirecionamento ou aviso controlado;
- testar duas empresas e todos os filtros operacionais.

### Fase C — Migrar automações

- substituir o uso de `AppointmentService` no WhatsApp legado por capacidades oficiais;
- usar o mesmo contrato para interface, n8n, MCP e futuros comandos de voz;
- verificar idempotência e correlação de mensagens.

### Fase D — Comparação controlada

- comparar contagens, estados, horários e vínculos durante uma janela definida;
- registrar divergências sem bloquear a operação;
- exigir zero divergência crítica antes de interromper escrita antiga.

### Fase E — Corte reversível

- impedir novas escritas em `appointments`;
- observar o piloto com alertas e procedimento de reversão;
- arquivar ou migrar histórico somente após retenção e reconciliação aprovadas;
- remover código legado em PR separado.

## 6. Critérios para o corte

- dashboard, agenda, jornada e automações usam `bookings`;
- nenhuma escrita produtiva nova alcança `appointments`;
- isolamento entre tenants possui testes negativos;
- estados oficiais e suas transições estão documentados;
- comparação controlada não apresenta divergência crítica;
- dados históricos têm estratégia de retenção e consulta;
- rollback e manual operacional foram exercitados;
- testes de aceitação cobrem criação, confirmação, reagendamento, cancelamento, conclusão e ausência.

## 7. Reversão

Cada fase deve poder ser revertida sem alteração destrutiva de dados. Durante a transição, a seleção da leitura oficial deve ficar isolada em serviço ou adaptador. Se houver divergência, retorna-se temporariamente ao consumidor anterior, preservando logs e evidências para correção.

Não haverá escrita dupla sem contrato explícito de idempotência, reconciliação e responsabilidade pela fonte de verdade.

## 8. Impacto no n8n e na internacionalização

Esta auditoria não exige alteração nem republicação de workflow n8n. A migração futura deve chamar capacidades estáveis e não tabelas ou rotas legadas.

Idioma continuará sendo parâmetro de apresentação e interação. Estados, decisões e eventos permanecem neutros; telas, mensagens, treinamento de agentes e voz serão localizados nas bordas.

## 9. Próxima entrega recomendada

Definir e testar o vocabulário oficial de estados de `bookings`, incluindo confirmado, pendente, cancelado, reagendado, concluído e ausência. Em seguida, migrar o dashboard e a agenda para a fonte oficial antes de tocar no histórico legado.
