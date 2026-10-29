# Workflow sombra v13 — ação sobre agendamento selecionado

A v13 preserva a v12 e interpreta o resultado confiável de `scheduling.resolve_selected_appointment_action`.

- cancelamento: cria proposta fechada sem envio e sem execução;
- remarcação: solicita nova data e horário, sem criar proposta final antes de validar disponibilidade.

O arquivo novo não substitui automaticamente o workflow publicado.
