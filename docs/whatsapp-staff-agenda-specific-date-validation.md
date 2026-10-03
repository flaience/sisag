# Consulta administrativa por data específica — validação em produção

Atualizado em 03/10/2026.

## Resultado

O percurso por áudio foi validado em produção com um remetente autorizado como gestor.

- a pergunta falada `Quantos atendimentos tenho dia cinco à tarde?` foi transcrita e respondeu corretamente que não havia atendimentos em 05/10 no período da tarde;
- a pergunta falada que o usuário pronunciou como `Quantos atendimentos tenho dia 5?` foi transcrita como `Quantos atendimentos tem o dia cinco?`;
- antes da correção, essa variação seguia indevidamente para a pergunta de escolha de data e horário do fluxo de cliente;
- o PR #480 passou a reconhecer a transcrição real como consulta administrativa;
- após o deploy, a mesma consulta respondeu `Há 1 atendimento na agenda dia 05/10/2026`;
- no número usado como cliente, `Quero agendar segunda-feira às dez horas` continuou criando a proposta e o novo agendamento foi confirmado normalmente.

## Evidências técnicas

- PR #479: consulta administrativa por dia da semana ou dia do mês;
- PR #480: compatibilidade com a variação real produzida pela transcrição de áudio;
- processamento do áudio concluído com uma tentativa de transcrição e uma de despacho;
- autorização persistida do gestor continuou sendo exigida;
- consulta somente leitura, filtrada por empresa e escopo profissional quando aplicável;
- bookings oficiais e fuso da empresa preservados.

## Garantias observadas

O teste confirma a separação entre consulta administrativa e pedido de agendamento. A ampliação do reconhecimento ficou condicionada à presença conjunta de marcador de contagem, assunto de agenda e verbo de posse. A frase comum de criação de agendamento não foi capturada pelo caminho administrativo.

## Limites

A evidência cobre o gestor e os dados existentes nessa empresa na data testada. Não certifica todos os sotaques ou possíveis resultados do provedor de transcrição. Consultas por intervalo, como `esta semana` e `próxima semana`, continuam fora do escopo e são a próxima ampliação candidata.
