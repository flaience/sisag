# Seleção confiável de horário para proposta de agendamento

Esta etapa reconhece uma escolha explícita somente quando ela corresponde de forma inequívoca a um horário retornado pela consulta read-only.

## Regras

- Aceita horário local explícito, como `10:00` ou `10h`.
- Aceita posição explícita entre as três opções, como `primeiro`, `segundo` ou `terceiro`.
- Rejeita horário inexistente, múltiplas escolhas e correspondências ambíguas.
- A proposta reutiliza o rascunho oficial e exige resposta `SIM` ou `NÃO`.
- O envio e a execução do agendamento continuam bloqueados.
- Esta fundação ainda não está conectada à rota de produção.
