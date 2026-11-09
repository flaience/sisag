# Decisão sombra na homologação do WhatsApp

A homologação reutiliza o espelho do agente n8n usado pelo webhook de produção e devolve seus artefatos para inspeção.

## Segurança

- o contrato é validado antes da chamada;
- nenhuma rota de envio de resposta ou proposta é executada;
- nenhuma observação é persistida nesta etapa;
- falhas, desativação ou respostas incompletas são encerradas de forma segura;
- o resultado mantém `externalDispatchAllowed: false`.

Ainda não existe API ou tela administrativa para esta função.
