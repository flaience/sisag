# Handoff do desenvolvimento com IA

Atualizado em: 10 de setembro de 2026.

## Estado confirmado

- repositório: flaience/sisag;
- base consolidada: main no commit 1ab79f7, após o PR #398;
- branch atual: feat/scheduling-ai-retrieval-stable-health-gate.

## Entrega atual

PR #399 — gate versionado de saúde pós-graduação para o retrieval estável.

## Contrato

- usa somente observações persistidas e tenant-scoped;
- classifica amostra, confiabilidade, eficiência e regressão temporal;
- compara baseline apenas para o mesmo plano e candidato;
- exige revisão humana;
- não altera runtime, release, rollback, WhatsApp, outbox, provider ou MCP.

## Validação necessária

Executar testes do gate, serviço, fronteira e observabilidade; executar build e diff check. Não há migração SQL.

## Próxima ação

Criar a interface administrativa do gate de saúde estável.
