# Observabilidade sanitizada da decisão sombra

O workflow SISAG Agent Shadow v3 devolve ao SISAG somente ação, ferramenta sugerida, código do motivo, confiança e metadados limitados da execução. O frontend valida estritamente essa resposta antes de persistir os campos na observação já ligada ao correlationId.

Não retornam nem são persistidos answerDraft, clarificationQuestion, evidências, mensagem, telefone, headers ou dados de agenda. A resposta exige sideEffects=none e não altera a autoridade do fluxo atual do WhatsApp.

O workflow permanece inativo no arquivo versionado e conserva Do not save para erros, sucessos e execuções manuais. A ativação operacional exige importar o v3, conferir as duas credenciais existentes, testar uma chamada controlada, publicar o v3 e somente então despublicar o v2.
