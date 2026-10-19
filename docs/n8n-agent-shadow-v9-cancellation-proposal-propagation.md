# Propagação da proposta de cancelamento no workflow v9

O nó **Record Tool Observation** preserva a proposta de cancelamento criada pelo nó anterior. Assim, o nó **Respond Shadow Only** devolve a proposta ao SISAG, permitindo persistir o estado e enviar a pergunta explícita de confirmação.

Esta correção não executa cancelamentos. A execução continua condicionada à resposta **SIM** e às proteções já existentes.
