# Fundação da proposta de intenção de comparecimento

Este incremento seleciona deterministicamente um único período confiável de atendimento por ordem de chegada e produz uma proposta efêmera que exige confirmação explícita.

A proposta informa data, serviço, unidade e faixa de atendimento. O texto declara que não existe reserva de horário nem garantia de posição na fila. A fundação não envia mensagem, não registra intenção, não cria fila e não executa check-in.

Entradas ambíguas, períodos esgotados, identificadores inválidos e opções fora dos cinco candidatos confiáveis falham de forma fechada.
