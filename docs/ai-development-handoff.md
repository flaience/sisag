# Handoff do desenvolvimento com IA

Atualizado em: 9 de setembro de 2026.

## Estado confirmado

- repositório: `flaience/sisag`;
- base consolidada: `main` no commit `6d4585d`;
- último marco consolidado: PR #384 — aplicação controlada do rollback aprovado;
- branch atual: `feat/admin-ai-retrieval-release-rollback-apply-ui`.

## Entrega atual

PR #385 — interface administrativa da aplicação controlada do rollback. Somente propostas aprovadas oferecem o comando, mediante confirmação e justificativa, com apresentação explícita dos bloqueios de revalidação e concorrência.

## Arquivos centrais

- `src/app/admin/settings/booking-followups/recovery/agent-outcomes/release-rollback-proposals/page.tsx`;
- teste de contrato visual adjacente;
- backend e migração da aplicação foram consolidados na PR #384.

## Restrições preservadas

- a interface não calcula nem autoriza rollback por conta própria;
- tenant e executor continuam derivados da autenticação no servidor;
- somente estado `approved` apresenta aplicação;
- confirmação e justificativa são obrigatórias;
- nenhum rollback é automático e nenhuma integração de canal é acionada.

## Validação necessária

1. executar os testes direcionados da página, rota e serviço;
2. executar `pnpm build`;
3. revisar `git diff --check`;
4. não há migração SQL nesta entrega.

## Próxima ação

Após consolidar a PR #385, auditar o ciclo completo de release de retrieval — candidato, canário, progressão e rollback — e definir o próximo limite seguro de autonomia.

## Comandos de retomada

```powershell
git status
git branch --show-current
git log -5 --oneline
git diff --check
git diff --stat
```
