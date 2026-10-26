# Gateway somente leitura da seleção de agendamento

O gateway interno aceita agora a ferramenta scheduling.select_appointment com argumentos vazios.

- A empresa, o WhatsApp, a mensagem, o fuso e o instante de referência vêm exclusivamente do contexto confiável.
- O cliente não pode fornecer appointmentId, empresa, telefone ou outra identidade nos argumentos.
- O gateway relê até cinco agendamentos futuros e devolve somente uma seleção única.
- Ausência, ambiguidade ou escolha sem correspondência falham de forma fechada.
- A ferramenta é somente leitura e ainda não está conectada à decisão do workflow.
- Nenhuma mensagem é enviada e nenhum agendamento é criado, cancelado ou remarcado nesta etapa.
