# Consulta administrativa da agenda por voz — validação em produção

Atualizado em 30/09/2026.

## Marco

O SISAG passou a reconhecer consultas administrativas enviadas por áudio no WhatsApp, autenticar o remetente por configuração explícita e consultar agendamentos oficiais sem criar clientes nem alterar a agenda.

Foram validados em produção:

- “Como está minha agenda da tarde?” com agenda vazia;
- “Qual é meu próximo atendimento?” com agenda vazia;
- a mesma consulta após a criação de um agendamento futuro;
- retorno correto de data, hora e profissional;
- envio restrito ao telefone gestor autorizado na empresa de demonstração.

## Arquitetura validada

`Meta webhook → processamento durável de áudio → OpenAI transcription → staff query handler → autorização → read model oficial → outbox → Meta → WhatsApp`

O tratamento administrativo ocorre antes da resolução/criação de cliente. Mensagens que não correspondem a uma consulta administrativa ou remetentes não autorizados continuam no fluxo existente sem receber indícios de dados internos.

## Autorização

A primeira versão usa `whatsapp_accounts.provider_config.staffAgenda`:

```json
{
  "enabled": true,
  "authorizedSenders": [
    {
      "phoneE164": "+55••••••••0586",
      "role": "manager"
    }
  ]
}
```

Garantias observadas e protegidas por código:

- a conta WhatsApp precisa estar ativa e ser única para a empresa;
- o telefone precisa corresponder exatamente a uma autorização;
- duplicidade falha fechada;
- gestores consultam somente a empresa da conta receptora;
- profissionais exigem `professionalId` ativo na mesma empresa e consultam apenas a própria agenda;
- nenhuma permissão é herdada por outras empresas.

Cada empresa cliente deverá cadastrar seus próprios gestores e profissionais. O mesmo número poderá atuar em mais de uma empresa somente se for autorizado separadamente em cada conta.

## Modelo de leitura

- fonte: `bookings`, `booking_items` e alocações oficiais;
- estados apresentados: `PENDING` e `CONFIRMED`;
- isolamento obrigatório por `companyId`;
- restrição adicional por `professionalId` para profissional;
- fuso obtido de `scheduling_config`;
- consulta de período limitada e próximo atendimento limitado ao primeiro resultado;
- serviço sem operações de inserção, atualização ou exclusão.

## Evidência operacional

O primeiro áudio de validação foi transcrito como “Como está minha agenda à tarde?”. O processamento terminou com uma tentativa e o despacho ao assistente foi concluído sem erro.

O SISAG criou corretamente a resposta “Não há atendimentos na sua agenda da tarde.”, mas a primeira entrega externa foi recusada pela Meta:

- estado do outbox: `delivery_rejected`;
- erro interno: `whatsapp_rejected`;
- erro Meta: `131030`;
- causa: o novo destinatário ainda não pertencia à lista permitida da conta de teste.

Após adicionar e verificar o telefone em **Meta for Developers → WhatsApp → API Setup → Recipient phone numbers**, a resposta foi recebida. Em seguida:

1. a consulta de período vazio respondeu corretamente;
2. a consulta de próximo atendimento vazio respondeu corretamente;
3. foi criado um agendamento futuro;
4. nova consulta retornou corretamente data, hora e profissional.

O erro `131030` é uma restrição da conta de teste da Meta, não falha de autorização ou leitura do SISAG. Em onboarding de teste, todo novo destinatário precisa ser adicionado e verificado na lista da Meta.

## Gates reportados

- fundação: 3 arquivos / 10 testes;
- read model: 5 arquivos / 18 testes;
- ativação: 7 arquivos / 25 testes;
- builds de produção aprovados nas três entregas;
- PRs #459, #460 e #461 consolidados.

Esses gates são focados. A suíte integral mais recente permanece a do marco anterior: 489 arquivos / 2.392 testes, 16 cenários integrados e build aprovados.

## Limites atuais

- somente “agenda do período” e “próximo atendimento” estão ativos;
- a administração da lista de autorizados ainda ocorre no JSON da conta;
- respostas são textuais, embora o comando possa ser enviado por voz;
- não há consulta por unidade, profissional nomeado, quantidade, horários livres ou atrasos;
- nenhuma alteração administrativa de agenda foi habilitada.

## Próxima evolução recomendada

1. criar tela **Configurações → WhatsApp → Acesso administrativo**;
2. armazenar nome, telefone, papel, profissional, unidades, estado e auditoria;
3. ampliar consultas somente leitura por pequenos incrementos;
4. adicionar resposta opcional em áudio sem bloquear transcrição, leitura ou outbox textual;
5. manter comandos administrativos mutáveis fora do escopo até existir autorização reforçada e confirmação explícita.

## Roteiro reutilizável por empresa

1. confirmar conta WhatsApp ativa e empresa correta;
2. cadastrar telefone E.164 e papel no SISAG;
3. para profissional, validar vínculo ativo e pertencimento à empresa;
4. em conta Meta de teste, adicionar e verificar o destinatário;
5. testar agenda vazia;
6. criar um agendamento futuro controlado;
7. testar o próximo atendimento;
8. conferir outbox e `message_logs` em caso de ausência de resposta;
9. registrar evidência sem expor telefone, token ou conteúdo sensível.
