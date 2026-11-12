# Fundação da homologação de áudio do WhatsApp

Permite validar uma amostra de áudio sem depender de um número de teste da Meta. A amostra usa exatamente a política de produção para tipo, tamanho, duração, idioma e tempo limite.

Nesta etapa o serviço apenas produz uma transcrição sanitizada. Ele não envia mensagens, não acessa a Meta e não altera agendamentos. A próxima etapa exporá uma API administrativa autenticada que entregará a transcrição ao mesmo fluxo de homologação textual.
