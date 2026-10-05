# Consulta administrativa por profissional — validação em produção

Atualizado em 05/10/2026.

## Resultado

O filtro seguro da agenda por profissional foi validado por áudio no número autorizado do gestor após os PRs #489 e #490.

## Evidências

- `Quantos atendimentos o profissional testes tem amanhã?` respondeu `Não encontrei um profissional ativo com este nome`, pois o cadastro existente usa o nome singular `profissional teste`;
- a mesma consulta com `profissional teste` resolveu o profissional correto e informou que não havia agendamentos para amanhã;
- `Como está a agenda do profissional teste amanhã?` também resolveu o filtro correto e informou que não havia atendimentos para amanhã;
- `Quantos atendimentos a Dra. Fulana tem amanhã?` respondeu que não encontrou profissional ativo, porque só existe `profissional teste` cadastrado.

## Garantias confirmadas

- o nome correto filtra a agenda do profissional identificado;
- nomes inexistentes falham de forma fechada;
- o sistema não substitui silenciosamente um nome inválido pelo único profissional ativo;
- o marcador explícito `profissional` e o título `Dra.` entram no caminho administrativo;
- a consulta permanece somente leitura, isolada por empresa e baseada em profissionais ativos e bookings oficiais.

## Limites

A validação não habilita aproximação ortográfica, apelidos ou correção automática de nomes. Essa restrição evita a exposição da agenda de uma pessoa diferente da solicitada.
