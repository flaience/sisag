# Fundação da homologação do WhatsApp

Define o contrato interno e multiempresa para mensagens de texto usadas em homologação.

## Limites desta etapa

- aceita somente empresa, conta, telefone, texto e correlação validados;
- exige correlação com prefixo `homolog:`;
- nega envio externo por contrato;
- não chama Meta, n8n, banco, outbox ou entrega de mensagens;
- ainda não disponibiliza API nem tela administrativa.

A próxima etapa conectará este contrato ao mesmo processamento do agente usado pelo webhook, preservando a proibição de envio externo.
