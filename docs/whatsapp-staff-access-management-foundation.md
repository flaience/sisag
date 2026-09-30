# Fundação da gestão de acessos administrativos do WhatsApp

## Objetivo

Substituir gradualmente a lista manual em `provider_config.staffAgenda` por registros próprios, seguros e auditáveis. Esta entrega cria a fundação; não altera ainda a autorização usada em produção.

## Modelo

`whatsapp_staff_accesses` armazena empresa, conta WhatsApp, telefone E.164, papel, profissional opcional, estado e atores de criação/atualização.

Regras estruturais:

- telefone único por conta WhatsApp;
- somente `manager` e `professional`;
- gestor não aceita profissional vinculado;
- profissional exige vínculo;
- conta e profissional precisam pertencer à mesma empresa;
- desativação preserva o registro e seu histórico;
- RLS habilitado nas tabelas operacional e de auditoria.

`whatsapp_staff_access_audit` preserva ação, ator e snapshot para criação, atualização, desativação e reativação.

## Compatibilidade

O repositório persistente retorna `found: false` quando ainda não existe registro. Isso permitirá que a próxima etapa faça fallback para o JSON legado durante a migração.

Nesta entrega, o resolver de produção continua exclusivamente no JSON. Assim, aplicar o schema não muda o comportamento validado no marco anterior e o deploy não depende de dados migrados.

## Sequência segura

1. validar código, testes e build;
2. aplicar o SQL e verificar constraints, índices, trigger e RLS;
3. consolidar a fundação;
4. implementar API de administração com auditoria transacional;
5. criar a tela;
6. migrar os acessos existentes;
7. ativar leitura da tabela com fallback temporário;
8. remover o JSON somente após evidência de produção.
