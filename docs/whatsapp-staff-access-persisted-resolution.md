# Resolução persistida de acesso da equipe pelo WhatsApp

## Regra de precedência

O resolvedor consulta primeiro a tabela `whatsapp_staff_accesses`. Um registro persistido, ativo ou inativo, é definitivo para aquele telefone. O JSON legado só é consultado quando não existe registro persistido correspondente.

Essa regra impede que a desativação feita na interface seja anulada por uma autorização antiga ainda presente no JSON.

## Segurança

- consulta limitada à empresa e à conta ativa do WhatsApp;
- telefone normalizado antes da busca;
- duplicidades falham de forma fechada;
- profissional precisa continuar ativo e pertencer à empresa;
- registro inativo retorna não autorizado;
- JSON legado permanece como fallback temporário para migração gradual.

## Próxima etapa

Migrar os autorizados legados para a tabela, validar a consulta em produção e posteriormente remover o fallback JSON.
