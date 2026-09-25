# Despacho de transcrição de áudio do WhatsApp

- A transcrição concluída permanece persistida antes de qualquer ação de negócio.
- Um lease independente limita concorrência e tentativas de despacho.
- A identidade original da mensagem Meta é reutilizada como correlationId.
- O recibo transacional do assistente impede repetição de comando e resposta após falhas.
- A identidade do telefone é recuperada com escopo de empresa, provedor e tipo de mensagem.
