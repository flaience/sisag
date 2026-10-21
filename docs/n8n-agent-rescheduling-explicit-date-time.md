# Data e hora explícitas na remarcação

Respostas como 31/10 09:00 retomam a pergunta anterior de remarcação, são convertidas no fuso confiável da empresa e produzem uma consulta somente leitura limitada ao dia solicitado.

A proposta somente é gerada quando exatamente um horário retornado pela ferramenta confiável coincide com a hora solicitada. Datas inválidas ou horários indisponíveis não executam remarcação.
