# Reparo determinístico da remarcação na v10

Quando o provedor retorna uma saída inválida em uma continuação como “o primeiro”, a intenção explícita de remarcação presente no contexto recente agora é reparada antes da regra genérica de disponibilidade.

O reparo solicita somente `scheduling.prepare_rescheduling`. Nenhuma remarcação é executada e o contrato sombra permanece sem efeitos colaterais.
