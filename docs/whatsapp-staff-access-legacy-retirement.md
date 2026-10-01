# Aposentadoria do acesso legado da equipe no WhatsApp

Atualizado em 01/10/2026.

## Resultado

O PR #472 removeu do runtime a autorização baseada em `provider_config.staffAgenda.authorizedSenders`. A tabela `whatsapp_staff_accesses` é agora a única fonte de autorização para consultas administrativas da agenda pelo WhatsApp.

## Evidências que autorizaram a retirada

- gestão persistida validada em produção com ativação, desativação e reativação;
- consulta administrativa textual e por áudio entregues corretamente;
- inventário executado por empresa e conta WhatsApp;
- um registro classificado como `already_persisted_active`;
- zero registros `ready_to_migrate`;
- retirada protegida por 7 arquivos e 29 testes;
- build de produção aprovado.

## Regra vigente

- acesso persistido ativo e válido: autoriza;
- acesso inativo: bloqueia;
- vínculo profissional inválido: bloqueia;
- mais de um resultado elegível: bloqueia por ambiguidade;
- nenhum registro persistido: bloqueia;
- JSON legado: não participa da decisão.

A empresa e a conta receptora continuam vindo do contexto confiável do webhook. O telefone é normalizado antes da consulta e nenhuma informação administrativa é liberada quando a identidade não é autorizada.

## Artefatos legados preservados

Os SQLs de inventário e migração permanecem versionados para auditoria e atualização controlada de ambientes antigos. Isso não reativa o fallback. Dados JSON antigos podem permanecer armazenados, mas são inertes para autorização.

## Reversão

Se uma regressão exigir reversão, deve-se reverter explicitamente o commit de retirada e executar novamente o inventário antes da implantação. Não reativar registros, alterar permissões ou confiar no JSON para simular reversão. A reversão deve ser temporária, auditada e acompanhada de nova validação positiva e negativa.

## Continuidade

Novos comandos de gestores e profissionais devem reutilizar a identidade persistida, o isolamento por empresa e a auditoria existentes. Não deve ser criado um segundo mecanismo de autorização em configuração livre.
