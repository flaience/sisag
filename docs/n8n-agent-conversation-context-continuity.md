# Continuidade conversacional mínima do agente n8n

Uma resposta curta que corresponda exatamente a um único serviço ativo pode completar uma solicitação de disponibilidade feita nos quinze minutos anteriores quando essa solicitação terminou pedindo serviço ou profissional.

O contexto é isolado por empresa, conta do WhatsApp e telefone normalizado. Apenas a mensagem anterior já armazenada e o complemento atual são enviados novamente ao workflow; nenhum novo histórico é persistido. Respostas livres, serviços ambíguos, contexto expirado, destinatário divergente e falhas de leitura mantêm o assistente existente como fallback.

O recurso é somente leitura e não cria, altera ou cancela agendamentos.
