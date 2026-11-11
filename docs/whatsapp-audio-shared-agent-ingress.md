# Entrada compartilhada do áudio do WhatsApp

A transcrição persistida passa a ser empacotada no mesmo contrato de entrada usado pela homologação.

Esta etapa preserva o executor atual de produção para não perder confirmação, idempotência ou envio. Ela não cria novas regras de agendamento e não chama diretamente o workflow sombra.

O próximo incremento extrairá o processamento comum de produção, permitindo que texto e áudio usem as mesmas decisões e rotas sem repetir a implementação.
