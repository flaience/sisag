# Confirmação positiva por áudio no WhatsApp

## Contexto

Em produção, um áudio curto com a palavra portuguesa `Sim` foi transcrito pelo modelo como `Sí.`. O processamento e o despacho terminaram normalmente, mas a confirmação foi recusada porque, depois da remoção de acentos e pontuação, o valor `si` não integrava a lista fechada de respostas positivas.

## Decisão

O normalizador passa a reconhecer `si` como uma variante positiva isolada. A correspondência continua sendo exata e baseada em lista fechada: frases ambíguas, como `sim ou não`, permanecem classificadas como `OTHER`.

O adaptador de transcrição continua solicitando português. Esta correção trata uma variação eventual do modelo em áudio curto sem relaxar a segurança da confirmação.

## Validação esperada

- `Sim.`, `Sí.`, `SÍ!` e `*Sí*` resultam em `YES`.
- `sim ou não`, `não sei` e textos não previstos resultam em `OTHER`.
- O fluxo somente agenda quando já existe um rascunho pendente válido.
