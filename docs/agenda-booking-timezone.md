# Fuso horário dos agendamentos na Agenda

Os agendamentos oficiais permanecem armazenados em UTC. A Agenda agora formata explicitamente os horários no fuso de negócio padrão, **America/Sao_Paulo**, sem depender do fuso configurado no servidor ou no navegador.

O caso real validado em produção é preservado como regressão:

- valor oficial: `2026-10-05T14:00:00.000Z`;
- apresentação na Agenda: `11:00`;
- duração: 30 minutos.

Nenhum dado do agendamento é alterado por esta correção; somente sua apresentação é ajustada.
