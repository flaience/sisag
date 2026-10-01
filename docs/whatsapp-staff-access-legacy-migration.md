# Migração das autorizações legadas do WhatsApp

## Objetivo

Migrar de forma idempotente as autorizações válidas de `whatsapp_accounts.provider_config.staffAgenda.authorizedSenders` para `whatsapp_staff_accesses`, sem remover o JSON e sem reativar acessos persistidos desativados.

## Ordem obrigatória

1. abrir e executar o conteúdo de `C:\sisag\infra\whatsapp-staff-access-legacy-inventory.sql` no SQL Editor do Supabase;
2. revisar as contagens por empresa, conta e `migration_status`;
3. corrigir dados inválidos antes de prosseguir, quando necessário;
4. somente após revisão, abrir e executar `C:\sisag\infra\whatsapp-staff-access-legacy-migration.sql`;
5. executar novamente o inventário;
6. validar consultas positivas e negativas em produção;
7. manter o fallback até um PR posterior.

## Estados do inventário

- `ready_to_migrate`: válido e ainda ausente da tabela;
- `already_persisted_active`: já coberto por registro ativo;
- `already_persisted_inactive`: não migrar nem reativar;
- `duplicate_legacy`: duplicidade no JSON;
- `invalid_phone`: telefone fora do formato E.164;
- `invalid_role`: papel diferente de manager/professional;
- `manager_has_professional`: formato incoerente;
- `invalid_professional_id`: UUID ausente ou inválido;
- `professional_not_active`: profissional ausente, de outra empresa ou inativo.

## Garantias

- somente contas ativas com `staffAgenda.enabled=true`;
- isolamento por `company_id` e `whatsapp_account_id`;
- conflito por conta+telefone não altera registro existente;
- acesso inativo continua inativo;
- cada inserção recebe snapshot de auditoria com ator nulo, indicando migração de sistema;
- mensagens, tokens e conteúdo de clientes não são copiados;
- repetir o SQL insere zero registros adicionais.

## Fora do escopo

Este PR não executa a migração, não apaga o JSON e não remove o fallback. A aplicação no Supabase exige revisão explícita dos resultados do inventário.
