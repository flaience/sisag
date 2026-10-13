# Roteamento da decisão de confirmação

- Interpreta somente respostas explícitas reconhecidas pelo contrato oficial de SIM/NÃO.
- Exige uma proposta pendente, não expirada e da mesma empresa, conta e remetente protegido.
- A atualização atômica impede consumo duplicado: SIM avança para `confirmed_pending_execution` e NÃO para `rejected`.
- Mensagens sem proposta válida continuam no fluxo existente.
- Esta etapa não cria, altera nem cancela agendamentos.
