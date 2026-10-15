# Reparo determinístico de disponibilidade inválida

Quando o modelo produz saída estrutural inválida, o SISAG pode reconstruir uma solicitação somente leitura de disponibilidade se, e somente se, três informações forem comprováveis: intenção de consultar horários, exatamente um serviço ativo mencionado e período relativo reconhecido.

São aceitos hoje, amanhã e próximos N dias, com N entre 1 e 31. As fronteiras são calculadas pelo horário confiável recebido e pelo fuso da empresa. Identificadores e duração vêm exclusivamente do catálogo ativo.

Se serviço ou período estiver ausente ou ambíguo, o reparo não executa ferramenta e o fluxo mantém a pergunta segura de esclarecimento. O reparo não escreve na agenda, não cria agendamento e não publica mensagens diretamente.
