# Roteador compartilhado do resultado do agente

Centraliza a precedência já usada pelo webhook: handoff, cancelamento, remarcação, proposta de novo agendamento e resposta candidata.

O serviço não conhece texto, áudio ou homologação. Também não transcreve, consulta contexto, executa decisões ou altera agendamentos. Nesta etapa ele permanece isolado da produção para validação antes da substituição do bloco existente no webhook.
