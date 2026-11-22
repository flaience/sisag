# API administrativa da intenção de comparecimento

A API permite listar, registrar e cancelar intenções de comparecimento por data e período.

- A empresa sempre vem da autenticação.
- Equipe pode consultar; proprietário e administrador podem registrar ou cancelar.
- A origem administrativa é definida no servidor.
- O registro reutiliza capacidade, idempotência e isolamento da fundação.
- Esta etapa não cria check-in, senha ou fila.
