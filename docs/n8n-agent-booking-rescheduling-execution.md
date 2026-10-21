# Fundação da execução da remarcação confirmada

A execução aceita somente um estado persistido rescheduling_pending ou execution_in_progress, exige horários futuros e intervalo válido, realiza uma reivindicação atômica e usa identidade idempotente estável.

Esta etapa permanece desconectada do webhook e não implementa acesso direto ao banco nem ativa a remarcação em produção.
