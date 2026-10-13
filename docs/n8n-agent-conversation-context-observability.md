# Observabilidade sanitizada da continuidade conversacional

A observação do espelhamento registra apenas contextContinued, um booleano que indica se uma solicitação anterior recente foi combinada ao complemento atual.

O registro não inclui texto anterior ou atual, telefone, nome ou identificador do serviço, horários ou conteúdo da resposta candidata. A coluna nasce como false, participa da atualização idempotente por correlação e pode ser consultada na listagem administrativa já isolada por empresa.

Esse indicador permite medir e diagnosticar a continuidade em produção antes de qualquer futura ampliação para ferramentas de escrita.
