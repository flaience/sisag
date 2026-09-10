# Handoff do desenvolvimento com IA

Atualizado em: 10 de setembro de 2026.

## Estado confirmado

- repositório: `flaience/sisag`;
- base consolidada: `main` no commit `f22c41c`;
- último marco consolidado: PR #390 — interface de propostas de graduação;
- branch atual: `feat/scheduling-ai-retrieval-release-graduation-review`.

## Entrega atual

PR #391 — revisão humana versionada das propostas de graduação, com decisão terminal e proteção atômica contra concorrência.

## Restrições preservadas

- somente Owner autenticado revisa dentro do tenant;
- decisão exige versão esperada e justificativa;
- apenas proposta pendente pode transicionar uma vez;
- revisão não aplica graduação nem modifica release ou runtime;
- não há ação em WhatsApp, outbox ou MCP.

## Validação necessária

1. executar testes de schema, serviço, fronteira e propostas;
2. executar `pnpm build` e `git --no-pager diff --check`;
3. aplicar e validar `infra/recovery-agent-retrieval-release-graduation-reviews.sql`.

## Próxima ação

Após consolidar a PR #391, adicionar revisão à interface administrativa, mantendo aplicação separada.

## Comandos de retomada

```powershell
git status
git branch --show-current
git log -5 --oneline
git --no-pager diff --check
git --no-pager diff --stat
```
