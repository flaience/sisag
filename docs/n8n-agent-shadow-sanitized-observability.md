# Observabilidade sanitizada do agente sombra

## Risco corrigido

O webhook do n8n inclui cabeçalhos no item de entrada. Salvar execuções manuais, bem-sucedidas ou com erro poderia reter o segredo de autenticação junto ao payload recebido.

## Política aplicada

O workflow SISAG Agent Shadow v1 permanece inativo e passa a usar:

- saveDataSuccessExecution: none;
- saveDataErrorExecution: none;
- saveManualExecutions: false.

Assim, o n8n não mantém o cabeçalho bruto nem o envelope após a execução.

## Registro seguro no SISAG

O gateway produz um log JSON contendo somente:

- empresa e correlação confiáveis;
- nome da ferramenta somente leitura;
- sucesso ou código sanitizado do erro;
- versão da política;
- identificadores, versões e hashes das evidências.

O registro exclui texto da mensagem, telefone, conta do WhatsApp, segredos, trechos do RAG e resposta operacional da agenda.

## Validação controlada

Em 07/10/2026, o workflow importado e inativo percorreu os cinco nós e respondeu accepted=true, mode=shadow e sideEffects=none. O segredo usado no teste foi rotacionado e as execuções manuais que continham cabeçalhos foram removidas.
