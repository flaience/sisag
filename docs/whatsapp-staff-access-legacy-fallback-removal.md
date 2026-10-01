# Remoção do fallback legado de acessos da equipe

Atualizado em 01/10/2026.

O runtime de consultas administrativas do WhatsApp usa exclusivamente `whatsapp_staff_accesses`. A leitura de `provider_config.staffAgenda.authorizedSenders` foi removida.

## Pré-condições atendidas

- inventário de produção executado;
- um registro legado encontrado;
- estado: `already_persisted_active`;
- zero registros `ready_to_migrate`;
- ativação, desativação e reativação persistidas validadas;
- consulta textual e por áudio entregues em produção.

## Comportamento

- registro ativo e válido: autoriza;
- registro inativo, inválido ou ambíguo: bloqueia;
- ausência de registro: bloqueia;
- configuração JSON legada: ignorada pelo runtime.

Os arquivos de inventário e migração permanecem no repositório para onboarding de ambientes antigos e auditoria histórica. O JSON não é apagado por esta entrega; torna-se apenas configuração inerte para autorização.

## Reversão

Uma reversão de código restaura temporariamente o fallback. Não alterar ou reativar registros persistidos para simular reversão. Antes de reverter, repetir o inventário e confirmar que o JSON ainda representa a autorização pretendida.
