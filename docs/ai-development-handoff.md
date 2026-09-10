# Handoff do desenvolvimento com IA

Atualizado em: 9 de setembro de 2026.

## Estado confirmado

- repositório: `flaience/sisag`;
- base consolidada: `main` no commit `6d7b5a6`;
- último marco consolidado: PR #387 — linha do tempo governada do release;
- branch atual: `feat/scheduling-ai-retrieval-release-graduation-gate`.

## Entrega atual

PR #388 — gate versionado de graduação do retrieval. O gate cruza plano e saúde e somente considera elegível para revisão humana um rollout ativo em 100% com saúde saudável e política compatível.

## Restrições preservadas

- tenant vem exclusivamente da autenticação Owner;
- incompatibilidade, falta de saúde, rollout parcial ou janela inativa resulta em `hold`;
- o gate e o endpoint são somente leitura;
- elegibilidade não promove nem torna uma versão estável;
- não há comunicação, canal ou ação operacional autônoma.

## Validação necessária

1. executar testes do gate, serviço, fronteira, saúde e prontidão;
2. executar `pnpm build` e `git diff --check`;
3. não há migração SQL.

## Próxima ação

Após consolidar a PR #388, criar propostas persistentes de graduação, congelando plano, candidato, saúde e versões das políticas para revisão humana.

## Comandos de retomada

```powershell
git status
git branch --show-current
git log -5 --oneline
git diff --check
git diff --stat
```
