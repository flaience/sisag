# Ciclo de agendamento por voz no WhatsApp — marco de produção

Atualizado em 29/09/2026.

## Resultado alcançado

### Gate integral de 29/09/2026

- 489 arquivos de teste aprovados;
- 2.392 testes Vitest aprovados;
- 16 cenários integrados do comando oficial de booking aprovados;
- build de produção aprovado.

O SISAG executa em produção o ciclo operacional do cliente pelo WhatsApp com entrada em áudio:

1. recebe e persiste a identidade da mídia antes de responder ao webhook;
2. baixa a mídia da Meta com credencial isolada;
3. transcreve o áudio fora da requisição do webhook;
4. interpreta intenção, data, horário e confirmações;
5. consulta disponibilidade oficial;
6. cria, reagenda ou cancela o booking oficial;
7. persiste a resposta antes da entrega ao WhatsApp;
8. apresenta o resultado na Agenda administrativa.

## Evidências observadas

### Criação

- A transcrição “Quero agendar amanhã às dez horas” alcançou o assistente.
- O assistente apresentou a confirmação e aceitou resposta por áudio.
- Um booking oficial, item, alocação e evento foram persistidos sem gravação parcial.
- O protocolo foi devolvido ao cliente e o booking apareceu na Agenda.

### Reagendamento

- “Quero remarcar meu agendamento” foi reconhecido como reagendamento, não como nova criação.
- A continuação “Segunda-feira, dia cinco de outubro, às onze horas” foi interpretada como 05/10/2026 às 11:00.
- A resposta NÃO encerrou a proposta sem alterar o banco.
- A resposta SIM alterou booking e item para 14:00 UTC, equivalente a 11:00 em America/Sao_Paulo.
- O card passou a mostrar e ocupar corretamente a faixa de 11:00–11:30.

### Cancelamento

- A primeira resposta NÃO preservou o agendamento.
- Uma repetição do fluxo seguida de SIM encerrou a sessão e cancelou o booking.
- A resposta “Agendamento cancelado com sucesso” foi persistida e entregue.
- O compromisso deixou a agenda ativa; o registro permanece no banco como histórico, sem exclusão física.

### Variações reais de áudio protegidas

- pontuação e acentos em “Não.”, “Sim.” e “Sí.”;
- transcrição “Sín”, normalizada por lista positiva fechada;
- dias por extenso, como “dia cinco”;
- horário posterior a um número de data na mesma frase;
- confirmação explícita antes de criação, reagendamento e cancelamento.

## Garantias técnicas

- isolamento por empresa e cliente na busca do booking;
- estados elegíveis limitados a PENDING e CONFIRMED para alterações;
- serialização da conversa;
- deduplicação pela identidade da mensagem recebida;
- processamento de áudio com lease e tentativas limitadas;
- credenciais por Docker Secrets, sem valores persistidos na configuração da conta;
- armazenamento dos instantes em UTC e apresentação explícita em America/Sao_Paulo;
- resposta transacionalmente persistida antes da entrega externa.

## Arquitetura atual

Este caminho crítico é implementado diretamente nos serviços oficiais do SISAG. n8n e MCP não participam da decisão transacional de criar, reagendar ou cancelar. RAG não é necessário para esse tipo de comando estruturado e determinístico.

Essa separação reduz latência, evita uma dependência externa no caminho crítico e mantém as regras de tenant, disponibilidade e concorrência sob responsabilidade do domínio.

## Limites atuais e evolução planejada

- a entrada aceita áudio, mas a resposta ainda é textual;
- comandos administrativos de gestor/profissional ainda não estão ativos;
- apresentação inicial por áudio e preferência do canal do cliente permanecem futuras;
- respostas de voz devem ser assíncronas e opcionais para não aumentar o tempo da transação;
- nomes de serviços e profissionais ainda dependem dos padrões e vínculos configurados;
- métricas de latência do worker de áudio devem ser acompanhadas separadamente.

## Próximo marco recomendado

Projetar autorização e consultas somente leitura para profissional/gestor — por exemplo, agenda da tarde e quantidade de clientes da semana — antes de liberar comandos administrativos de alteração em massa. Cancelamentos coletivos deverão exigir escopo explícito, resumo do impacto e confirmação reforçada.
