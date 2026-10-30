# Ação contextual sobre agendamento selecionado

A decisão preserva a ação do turno atual em frases contextualizadas após a listagem de agendamentos. Assim, `Remarque o primeiro` continua para `scheduling.resolve_selected_appointment_action` em vez de cair na seleção genérica.

Somente o trecho atual após os marcadores confiáveis é usado para reconhecer a ação. Uma ação antiga do histórico não é herdada por uma resposta que contenha apenas uma posição.

Esta etapa apenas resolve o alvo de forma somente leitura; nenhuma remarcação ocorre sem novo horário e confirmação explícita.
