# Handoff do desenvolvimento com IA

Atualizado em: 9 de setembro de 2026.

## Estado confirmado

- repositório: `flaience/sisag`;
- base consolidada: `main` no commit `4510fda`;
- último marco: PR #382 — interface de revisão de propostas de rollback de release de retrieval;
- branch atual: `chore/ai-development-continuity`;
- estado inicial da branch: árvore de trabalho limpa sobre `4510fda`.

## Entrega atual

Instituir continuidade operacional do desenvolvimento assistido por IA. Esta entrega adiciona o protocolo permanente e este checkpoint vivo; não altera banco, APIs nem comportamento de produção.

## Contexto arquitetural preservado

- o SISAG é uma plataforma operacional multiempresa orientada a eventos;
- `bookings` permanece o agregado oficial de agendamento;
- agentes devem consumir contratos operacionais e não acessar banco ou canais diretamente;
- decisões de IA precisam ser versionadas, auditáveis e possuir fallback determinístico;
- recomendações permanecem separadas de execução e sujeitas às políticas de revisão vigentes;
- Docker Swarm executa as automações contínuas usando imagem imutável e Docker Secrets;
- credenciais e dados pessoais nunca devem ser registrados neste arquivo.

## Validação desta entrega

- conferir `git diff --check`;
- revisar os dois documentos de continuidade;
- confirmar que não há segredos no diff;
- não há migração SQL;
- por ser uma alteração exclusivamente documental, não exige build para validar comportamento.

## Próxima ação

1. consolidar a entrega de continuidade em PR isolada;
2. atualizar a branch seguinte a partir da nova `main`;
3. registrar neste arquivo o próximo marco funcional antes de iniciar alterações;
4. continuar a evolução governada da camada de IA e retrieval a partir do estado consolidado.

## Comandos de retomada

```powershell
git status
git branch --show-current
git log -5 --oneline
git diff --check
git diff --stat
```
