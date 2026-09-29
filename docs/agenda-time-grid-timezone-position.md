# Posicionamento da grade horária da Agenda

Além do texto do card, a posição vertical do agendamento deve usar o horário local do negócio. A grade agora calcula a posição a partir do rótulo local já formatado pela camada da Agenda e da duração do atendimento.

Isso elimina a dependência de `Date.getHours()`, que varia conforme o fuso do navegador. O caso real armazenado às 14:00 UTC é apresentado e posicionado às 11:00 em São Paulo, com duração até 11:30.
