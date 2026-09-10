# Handoff do desenvolvimento com IA

Atualizado em: 10 de setembro de 2026.

## Estado confirmado

- repositório: `flaience/sisag`;
- base consolidada: `main` no commit `99d84ee`;
- último marco consolidado: PR #389 — propostas persistentes de graduação;
- branch atual: `feat/admin-ai-retrieval-release-graduation-proposals`.

## Entrega atual

PR #390 — interface administrativa de graduação. Exibe elegibilidade atual, registra proposta governada e apresenta evidência imutável para revisão humana posterior.

## Restrições preservadas

- somente planos agendados, em 100%, elegíveis e sem proposta pendente aparecem para seleção;
- navegador envia apenas `planId` e justificativa;
- candidato, tenant, autoria, período e políticas são derivados pelo servidor;
- interface não revisa, aplica nem torna o retrieval estável;
- nenhuma ação sobre WhatsApp, outbox, MCP ou runtime é executada.

## Validação necessária

1. executar teste da página e testes de proposta, schema e gate;
2. executar `pnpm build` e `git diff --check`;
3. não há nova migração nesta PR.

## Próxima ação

Após consolidar a PR #390, criar o fluxo backend de revisão humana da proposta de graduação, sem aplicação automática.

## Comandos de retomada

```powershell
git status
git branch --show-current
git log -5 --oneline
git --no-pager diff --check
git --no-pager diff --stat
```
