# Consulta administrativa da agenda por profissional

## Objetivo

Permitir que um gestor autorizado filtre consultas da agenda por um profissional ativo da própria empresa.

## Exemplos

- `Quantos atendimentos a Dra. Ana tem amanhã?`;
- `Como está a agenda do Dr. João amanhã?`.

## Segurança

- exige título ou marcador explícito: Dr., Dra., doutor, doutora ou profissional;
- resolve somente profissionais ativos da empresa da conta WhatsApp;
- nome inexistente não consulta a agenda geral;
- nome ambíguo exige o nome completo;
- acesso vinculado a profissional continua restrito à própria agenda;
- gestores podem filtrar por um profissional resolvido com segurança;
- a operação permanece somente leitura sobre bookings oficiais.

## Limites

Esta primeira etapa não interpreta apelidos sem marcador, especialidades ou grupos de profissionais. A resolução por nome curto só ocorre quando há uma única correspondência ativa.

## Validação em produção

O comportamento positivo e os bloqueios seguros de nomes inexistentes foram comprovados em 05/10/2026. Evidência: `docs/whatsapp-staff-agenda-professional-filter-validation.md`.
