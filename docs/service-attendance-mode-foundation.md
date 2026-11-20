# Modalidades de atendimento por serviço

Cada serviço declara uma modalidade operacional:

- `scheduled_time`: preserva o agendamento atual com data e hora exatas.
- `arrival_order`: o cliente escolherá um período de atendimento; sua posição será atribuída somente no check-in.

Todos os serviços existentes recebem `scheduled_time` na migração, sem alterar o comportamento atual. Esta fundação não cria períodos, reservas de capacidade ou filas; esses recursos serão adicionados em módulos separados.
