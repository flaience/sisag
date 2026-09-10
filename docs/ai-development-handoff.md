# Handoff do desenvolvimento com IA

Atualizado em: 10 de setembro de 2026.

## Estado confirmado

- repositório: `flaience/sisag`;
- base consolidada: `main` no commit `d0e1d82`;
- último marco consolidado: PR #388 — gate de graduação do release;
- branch atual: `feat/scheduling-ai-retrieval-release-graduation-proposals`.

## Entrega atual

PR #389 — propostas persistentes de graduação. Somente plano elegível em rollout integral pode gerar uma proposta tenant-scoped com candidato, saúde, período e políticas congelados.

## Restrições preservadas

- cliente envia apenas `planId` e justificativa;
- tenant, autor, candidato e evidência são derivados no servidor;
- duplicidade pendente é impedida no banco;
- proposta não revisa, aplica ou torna retrieval estável;
- não há comunicação ou ação operacional autônoma.

## Validação necessária

1. executar testes de schema, serviço, fronteira e gate;
2. executar `pnpm build` e `git diff --check`;
3. aplicar e validar `infra/recovery-agent-retrieval-release-graduation-proposals.sql`.

## Próxima ação

Após consolidar a PR #389, criar a interface administrativa para listar elegibilidade, registrar propostas e visualizar evidência congelada.

## Comandos de retomada

```powershell
git status
git branch --show-current
git log -5 --oneline
git diff --check
git diff --stat
```
