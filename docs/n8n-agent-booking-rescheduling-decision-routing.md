# Roteamento da decisão de remarcação

O roteamento é opt-in e consome SIM ou NÃO antes dos demais fluxos do WhatsApp.

SIM altera atomicamente o estado para rescheduling_pending e NÃO para rejected. Nenhum comando de remarcação é executado nesta etapa.
