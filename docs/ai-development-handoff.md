# Handoff do desenvolvimento com IA

Atualizado em: 9 de setembro de 2026.

## Estado confirmado

- repositório: `flaience/sisag`;
- base consolidada: `main` no commit `d19cd3f`;
- último marco consolidado: PR #383 — protocolo de continuidade do desenvolvimento;
- último marco funcional: PR #382 — revisão humana de propostas de rollback de release de retrieval;
- branch atual: `feat/scheduling-ai-retrieval-next-milestone`.

## Entrega atual

PR #384 — aplicação controlada do rollback aprovado. A operação revalida saúde e políticas, reduz atomicamente o percentual do plano e registra evidência. Não existe rollback automático nem integração com canais.

## Arquivos centrais

- `src/modules/agents/RecoveryRetrievalReleaseRollbackApply.service.ts`;
- `src/modules/agents/RecoveryRetrievalReleaseRollbackApply.schema.ts`;
- rota de propostas de rollback em `src/app/api/v1/settings/booking-followups/recovery/agent-outcomes/release-rollback-proposals/route.ts`;
- `infra/recovery-agent-retrieval-release-rollback-apply.sql`.

## Restrições preservadas

- tenant e executor vêm exclusivamente da autenticação;
- somente proposta `approved` pode ser aplicada;
- saúde, versões, estado e percentual são revalidados;
- plano e proposta mudam na mesma transação;
- IA e retrieval permanecem em modo governado, sem envio ou ação autônoma.

## Validação necessária

1. executar testes direcionados da aplicação, rollback e outcomes;
2. executar `pnpm build`;
3. aplicar e validar a migração SQL;
4. revisar `git diff --check` antes do commit.

## Próxima ação

Após consolidar a PR #384, criar a interface administrativa para aplicar propostas aprovadas, com confirmação e justificativa explícitas.

## Comandos de retomada

```powershell
git status
git branch --show-current
git log -5 --oneline
git diff --check
git diff --stat
```
