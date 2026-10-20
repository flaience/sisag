# Workflow sombra v10 — proposta de remarcação

A v10 reconhece a intenção explícita de remarcação e chama somente `scheduling.prepare_rescheduling`. A ferramenta resolve internamente o próximo agendamento e consulta horários do mesmo serviço.

Na primeira mensagem, o workflow apresenta horários futuros. Na escolha subsequente, o contexto recente provoca nova consulta à fonte confiável e a proposta compara o horário atual com o novo horário escolhido.

A proposta permanece não roteável e não executável. A v10 não envia mensagens e não altera agendamentos.
