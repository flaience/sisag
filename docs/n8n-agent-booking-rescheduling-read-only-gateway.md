# Gateway somente leitura para preparação da remarcação

A ferramenta autenticada `scheduling.prepare_rescheduling` resolve o próximo agendamento pela empresa e pelo WhatsApp confiável, identifica internamente o serviço e consulta até 20 novos horários em uma janela máxima de 31 dias.

O chamador não pode escolher outro agendamento, cliente ou serviço. A ferramenta não executa remarcação e não chama qualquer operação mutável.
