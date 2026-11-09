# API administrativa da homologação do WhatsApp

Disponibiliza uma entrada autenticada para executar mensagens de texto no espelho do agente n8n.

## Contrato

- somente proprietários e administradores;
- a empresa vem exclusivamente da sessão;
- a conta de WhatsApp deve pertencer à mesma empresa;
- a correlação `homolog:` é criada pelo servidor;
- o resultado não é armazenado em cache;
- nenhuma mensagem, proposta ou mutação é enviada ou executada.

Rota: `POST /api/v1/settings/whatsapp/homologation`.
