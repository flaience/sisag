# Persistência recuperável da remarcação confirmada

O estado é carregado por empresa, conta WhatsApp e identidade em hash; a reivindicação é atômica e a operação usa o adaptador oficial de agendamento.

Conclusão, falhas definitivas, indisponibilidade do novo horário e resultado incerto são persistidos com uma resposta idempotente na Outbox. A execução permanece desconectada do webhook.
