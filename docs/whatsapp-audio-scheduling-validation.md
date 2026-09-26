# Validação controlada — proposta de agendamento por áudio

Atualizado em 25/09/2026. Este roteiro amplia o marco de ajuda por voz sem autorizar criação silenciosa de reservas.

## Invariantes

- áudio e transcript não executam BookingCommand diretamente;
- tenant, telefone e correlationId vêm da mensagem persistida;
- data relativa usa instante e fuso explícitos;
- informação ausente provoca pergunta, nunca preenchimento inventado;
- disponibilidade vem do serviço oficial;
- uma proposta persistida precede qualquer gravação;
- somente uma nova mensagem afirmativa explícita pode executar o comando;
- “NÃO” encerra a proposta sem booking;
- repetição de callback ou worker não duplica resposta nem comando.

## Cenário produtivo seguro

1. Registrar baseline de bookings do cliente de teste.
2. Enviar áudio: “Quero agendar amanhã às dez horas”.
3. Aguardar transcrição completed e dispatched_at.
4. Conferir resposta: proposta/alternativas ou informação de configuração ausente.
5. Antes de responder SIM, confirmar que o baseline de bookings não mudou.
6. Responder NÃO no primeiro ensaio; confirmar mensagem de desistência e baseline inalterado.
7. Em ensaio posterior autorizado, repetir a proposta, responder SIM uma vez e conferir exatamente um booking oficial.
8. Repetir o ciclo do worker e comprovar ausência de duplicação.

## Evidência mínima

- linha de whatsapp_audio_processing com attempts=1 e dispatch_attempts=1;
- transcript compatível com a fala;
- uma resposta correlacionada na outbox;
- zero novos bookings antes do SIM;
- zero novos bookings após NÃO;
- quando o SIM for autorizado: exatamente um booking, um protocolo e nenhuma segunda criação.

## Limites

Este roteiro não autoriza cancelamento em lote, comandos de gestor, escolha autônoma de profissional, uso de RAG para disponibilidade ou execução administrativa sem autenticação e confirmação.
