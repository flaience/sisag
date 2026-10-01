# Gestão de acessos da equipe pelo WhatsApp

## Objetivo

Permitir que proprietários e administradores gerenciem, sem editar JSON ou consultar UUIDs, as pessoas autorizadas a consultar a agenda pelo WhatsApp.

## Interface

A tela fica em **Configurações > WhatsApp > Acessos da equipe**, na rota autenticada `/admin/settings/whatsapp/staff-accesses` e oferece:

- seleção de conta ativa do WhatsApp da própria empresa;
- telefone normalizado no servidor;
- perfil de gestor ou profissional;
- vínculo obrigatório com profissional ativo quando o perfil for profissional;
- edição, desativação e reativação lógica;
- mensagens de erro em português.

## Segurança

- a empresa e o ator são derivados da sessão autenticada;
- somente owner e admin acessam o endpoint;
- contas e profissionais são filtrados pela empresa;
- as alterações continuam registradas na auditoria transacional;
- não existe exclusão física pela interface.

## Limite desta entrega

Esta etapa administra o cadastro persistido. A troca do resolvedor de autorização do JSON legado para esta tabela será feita separadamente, com compatibilidade e validação em produção.
