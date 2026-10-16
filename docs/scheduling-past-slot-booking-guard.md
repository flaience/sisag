# Proteção contra horários vencidos

A disponibilidade usa como limite inferior o maior valor entre o início solicitado e o instante atual. Assim, uma consulta iniciada à meia-noite não oferece horários que já passaram no mesmo dia.

O comando idempotente de criação também rejeita o horário quando ele já venceu, antes de reservar a chave de idempotência ou executar qualquer gravação. Essa segunda barreira protege contra atrasos entre oferta, escolha e confirmação.
