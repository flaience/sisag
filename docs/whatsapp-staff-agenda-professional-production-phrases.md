# Frases reais da consulta administrativa por profissional

## Evidência de produção

- `Quantos agendamentos o profissional teste tem amanhã?` não entrou no caminho administrativo porque `agendamentos` ainda não era um sinônimo reconhecido;
- `Como está a agenda do profissional teste amanhã?` foi interpretada e gerou a resposta `Não há atendimentos na sua agenda de amanhã.`;
- essa segunda resposta ficou retida em `delivery_unknown` após `whatsapp_dispatch_started`, sem reenvio automático para evitar duplicidade.

## Correção funcional

- inclui `agendamento` e `agendamentos` no vocabulário administrativo;
- inclui o nome resolvido do profissional na resposta, tornando o filtro verificável pelo gestor;
- preserva resolução ativa e isolada por empresa, ambiguidade fechada e restrição do acesso profissional;
- não altera nem reenvia eventos `delivery_unknown`.

## Validação esperada

Novas mensagens devem ser usadas no reteste. O evento retido não deve ser reinserido ou reenviado sem reconciliação externa, pois a entrega original é incerta.

## Reteste em produção

Após os PRs #489 e #490, `agendamentos` entrou no caminho administrativo, a resposta identificou `profissional teste` e nomes inexistentes permaneceram bloqueados. Evidência: `docs/whatsapp-staff-agenda-professional-filter-validation.md`.
