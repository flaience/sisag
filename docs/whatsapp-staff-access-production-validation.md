# Acesso persistido da equipe pelo WhatsApp — validação em produção

Atualizado em 01/10/2026.

## Marco

O SISAG passou a administrar, pela interface autenticada, os telefones de gestores e profissionais autorizados a consultar a agenda no WhatsApp. A autorização persistida foi comprovada em produção com ativação, desativação e reativação do mesmo gestor.

## Percurso validado

1. O operador acessou **Configurações → WhatsApp → Acessos da equipe**.
2. O telefone foi cadastrado como **Gestor**, estado **Ativo**.
3. Uma consulta textual de próximo atendimento retornou corretamente data, hora, cliente, serviço e profissional.
4. O acesso foi desativado pela interface.
5. A mesma consulta deixou de receber dados administrativos e caiu na resposta neutra do fluxo comum.
6. O acesso foi reativado.
7. A consulta voltou a retornar corretamente o próximo atendimento.

A resposta neutra ao telefone desativado é comportamento de segurança: não confirma a existência de permissão anterior nem revela dados internos.

## Arquitetura demonstrada

`WhatsApp inbound → consulta administrativa reconhecida → telefone normalizado → acesso persistido por empresa/conta → read model oficial → outbox → Meta → gestor`

Garantias observadas:

- a empresa vem da conta receptora autenticada, não da mensagem;
- conta WhatsApp ativa e pertencente à empresa;
- telefone persistido normalizado;
- gestor ativo autorizado;
- desativação prevalece sobre o JSON legado;
- reativação restaura o acesso;
- nenhuma criação de cliente para consulta administrativa;
- consulta somente leitura sobre bookings oficiais;
- alteração registrada na auditoria transacional.

## Interface e autenticação

A rota oficial é `/admin/settings/whatsapp/staff-accesses`. A primeira publicação colocou a página fora da árvore administrativa; a correção moveu a tela para o painel. Em seguida, foi removida a leitura direta do cookie legado `sb-access-token`, substituída pela sessão do cliente Supabase do servidor, igual ao restante das Configurações.

PRs do percurso:

- #463: tabelas, RLS, auditoria e repositório;
- #464: API administrativa;
- #465: interface;
- #466: resolução persistida com fallback seguro;
- #467: rota administrativa correta;
- #468: autenticação pela sessão atual.

## Separação do incidente de áudio

A validação textual do acesso foi concluída. Duas consultas posteriores por áudio não chegaram ao assistente:

- mídia Meta localizada e baixada com HTTP 200;
- áudio OGG válido, 6.485 bytes;
- OpenAI respondeu HTTP 429;
- tipo: `insufficient_quota`;
- código: `credit_balance_exhausted`;
- registros encerrados após três tentativas com `transcription_failed`.

Esse incidente é indisponibilidade de crédito do provedor de transcrição, não falha na autorização persistida, no read model ou na entrega Meta. Áudios antigos em estado terminal não devem ser reativados; após regularizar créditos, validar com uma nova mensagem.

## Dependência Meta em ambiente de teste

O telefone gestor deve permanecer simultaneamente:

- autorizado no SISAG para consultar dados;
- verificado como destinatário na conta Meta de teste para receber respostas.

Remover o destinatário na Meta pode causar erro 131030. Essa lista não substitui a autorização do SISAG.

## Gates reportados

- API: 2 arquivos / 9 testes e build;
- interface: 3 arquivos / 14 testes e build;
- resolução persistida: 5 arquivos / 24 testes e build;
- rota administrativa: 4 arquivos / 15 testes e build;
- sessão administrativa: 2 arquivos / 5 testes e build.

São gates focados fornecidos pelo operador. A última suíte integral registrada continua sendo 489 arquivos / 2.392 testes.

## Estado do fallback legado

O fallback foi aposentado no PR #472. O inventário encontrou um único acesso legado, já representado por registro persistido ativo, e nenhum item pendente de migração. O runtime ignora `provider_config.staffAgenda.authorizedSenders` e consulta exclusivamente `whatsapp_staff_accesses`.

Ausência de registro, acesso inativo, vínculo inválido ou resultado ambíguo bloqueiam a consulta administrativa. Os arquivos SQL de inventário e migração permanecem apenas para auditoria e onboarding controlado de ambientes antigos.

A evidência final e o procedimento de reversão estão em `docs/whatsapp-staff-access-legacy-retirement.md`.

## Próximas ações

1. ampliar comandos administrativos somente sobre a identidade persistida;
2. manter observabilidade específica para falhas de áudio e provedores;
3. remover dados JSON inertes apenas em limpeza separada, após inventário do ambiente-alvo.
