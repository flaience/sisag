# API de gestão do encaminhamento humano

## Escopo

A API `/api/v1/settings/agent-shadow/handoffs` oferece uma fila administrativa mínima para usuários autenticados como owner, admin ou staff da própria empresa. Esta etapa não cria interface, não ativa o roteamento e não envia mensagens.

## Operações

- `GET`: lista metadados sanitizados; o filtro padrão retorna apenas `pending` e `claimed`.
- `PATCH { id, action: "claim" }`: assume atomicamente uma pendência ainda livre.
- `PATCH { id, action: "resolve" }`: conclui apenas uma pendência assumida pelo mesmo usuário.
- `PATCH { id, action: "dismiss" }`: dispensa uma pendência livre ou assumida pelo próprio usuário.

Empresa e ator são derivados da sessão. O corpo não aceita expansão de autoridade. A listagem não retorna hash do remetente, telefone, mensagem, transcrição ou resumo. Respostas usam `cache-control: no-store`.

## Próximo passo

Aplicar a coluna de auditoria no banco e criar uma interface simples para a equipe. A flag de roteamento deve permanecer desativada até o fluxo de assumir e concluir estar acessível e validado.