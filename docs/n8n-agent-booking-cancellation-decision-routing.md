# Roteamento da decisão de cancelamento

Com a flag de produção habilitada, respostas **SIM** e **NÃO** são verificadas primeiro contra uma proposta de cancelamento válida, recente e isolada pela identidade sanitizada da conversa. Mensagens sem proposta correspondente continuam no fluxo existente.

**SIM** registra apenas `cancellation_pending`; **NÃO** registra `rejected`. Esta etapa não chama nenhuma mutação de cancelamento.
