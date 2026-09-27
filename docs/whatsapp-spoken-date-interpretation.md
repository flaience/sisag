# Interpretação de datas faladas no WhatsApp

O assistente reconhece datas relativas usando o instante de referência e o fuso horário da empresa.

## Expressões cobertas

- hoje e amanhã;
- dias da semana, incluindo formas com `-feira`;
- próxima segunda, próxima terça e equivalentes;
- dia 1 até dia 31, escolhendo a próxima ocorrência válida.

Um dia da semana igual ao dia atual aponta para a semana seguinte. Números sem marcadores explícitos, como `opção 2`, não são tratados como datas.

O parser é determinístico, não usa rede e pode ser combinado com a interpretação de horários falados.
