# Continuidade do desenvolvimento com IA

## Objetivo

Permitir que o desenvolvimento do SISAG seja retomado com segurança após encerramento inesperado, perda de contexto, troca de conversa, indisponibilidade do provedor ou falha da estação de trabalho.

O Git e os artefatos versionados são as fontes da verdade. A memória de uma conversa auxilia a execução, mas nunca é a única fonte de uma decisão crítica.

## Artefatos obrigatórios

- `docs/ai-development-handoff.md`: checkpoint vivo do trabalho atual;
- histórico Git: código, migrações e decisões efetivamente consolidados;
- testes e build: evidência de validação da entrega;
- migrações SQL versionadas: reprodução da estrutura persistente;
- backups do PostgreSQL: recuperação dos dados, independente do código.

## Checkpoint por marco

O handoff deve ser atualizado quando uma PR relevante for consolidada e antes de interromper uma entrega em andamento. Deve registrar:

1. branch, base e último PR consolidado;
2. objetivo e estado da entrega corrente;
3. mudanças aplicadas e arquivos importantes;
4. testes, build e migrações já executados;
5. decisões, restrições e riscos conhecidos;
6. próxima ação concreta e comandos de verificação.

O checkpoint não deve conter senhas, tokens, URLs secretas, dados pessoais, chaves de API ou conteúdo de Docker Secrets.

## Protocolo de retomada

Em uma nova tarefa ou após falha:

1. ler integralmente este protocolo e o handoff;
2. executar `git status`, `git branch --show-current` e `git log -5 --oneline`;
3. comparar o checkpoint com o estado real do Git;
4. inspecionar alterações não consolidadas sem descartá-las;
5. validar migrações aplicadas quando a entrega alterar o banco;
6. executar os testes direcionados e o build antes de publicar;
7. atualizar o handoff com qualquer divergência encontrada.

Se houver conflito, o repositório e o banco observado prevalecem sobre o texto do handoff. Nenhuma alteração local deve ser apagada automaticamente.

## Continuidade em produção

- toda capacidade baseada em IA deve possuir modo degradado explícito;
- indisponibilidade de IA não pode corromper o núcleo operacional;
- recomendações e execuções devem ser auditáveis e idempotentes;
- ações autônomas exigem autorização e limites definidos pelo produto;
- segredos devem permanecer fora do repositório;
- restaurações de banco devem ser ensaiadas, não apenas configuradas.

## Prompt mínimo de recuperação

> Leia integralmente `docs/ai-development-continuity.md` e `docs/ai-development-handoff.md`. Confirme o estado com Git, preserve alterações locais e continue a partir da próxima ação registrada. Considere o Git e o banco observado como fontes da verdade.
