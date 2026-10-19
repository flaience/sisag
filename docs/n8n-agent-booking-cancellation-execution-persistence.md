# Persistência recuperável do cancelamento confirmado

O estado confirmado é carregado por empresa, conta WhatsApp e identidade sanitizada do remetente. Uma atualização condicional reivindica somente `cancellation_pending`, e a execução usa a porta oficial de agendamento.

O resultado e a mensagem ao cliente são gravados atomicamente. Falhas definitivas e resultados incertos ficam separados, e a chave de saída por estado impede respostas duplicadas. Esta etapa permanece desconectada do webhook.
