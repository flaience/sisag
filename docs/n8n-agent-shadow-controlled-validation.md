# Validação controlada do agente n8n em modo sombra

Atualizado em 07/10/2026.

## Resultado

O workflow SISAG Agent Shadow v1 foi importado na instância de produção do n8n, configurado com credenciais distintas e validado manualmente sem ativação pública.

## Evidência observada

- os cinco nós concluíram a execução;
- o webhook respondeu accepted=true;
- mode=shadow;
- correlationId=shadow-manual-20261007-001;
- sideEffects=none;
- nenhuma mensagem foi enviada ao WhatsApp;
- nenhuma agenda foi alterada;
- após atualizar a lista de execuções, o teste final não permaneceu armazenado.

## Credenciais

- entrada: Header Auth exclusiva com x-sisag-agent-shadow-secret;
- saída: credencial interna existente com x-platform-internal-secret;
- as duas credenciais permaneceram separadas;
- nenhum valor secreto foi registrado no repositório.

Durante o primeiro ensaio, o cabeçalho de entrada apareceu no conteúdo de uma execução manual. O valor foi tratado como comprometido, as execuções foram removidas e o segredo foi rotacionado. Depois, as três opções de retenção do workflow foram explicitamente definidas como Do not save e o teste foi repetido com sucesso, sem registro persistente.

## Compatibilidade confirmada

- workflow versionado em automation/n8n/workflows;
- URL literal do gateway, compatível com a restrição de acesso a variáveis de ambiente da instalação;
- mensagem em UTF-8 preservando acentos em português;
- credenciais associadas após importação;
- workflow mantido inativo.

## Limites preservados

Este marco não ativa o workflow, não chama modelo de IA, não envia áudio ou texto ao WhatsApp e não permite ferramentas de mutação. A próxima etapa pode introduzir uma chamada controlada ao modelo, ainda em modo sombra, com saída estruturada e sem despacho.
