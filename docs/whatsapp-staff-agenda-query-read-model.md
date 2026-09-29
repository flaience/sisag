# Leitura oficial da agenda para consultas administrativas no WhatsApp

## Entrega

Esta etapa adiciona um modelo de leitura sem efeitos colaterais para as consultas reconhecidas pela fundação do PR anterior.

- lê `bookings`, `booking_items` e alocações oficiais;
- considera somente estados ativos `PENDING` e `CONFIRMED`;
- aplica obrigatoriamente o `companyId`;
- para a identidade `professional`, aplica também o `professionalId` na consulta ao banco;
- para a identidade `manager`, permite o escopo da empresa sem inventar um profissional;
- usa o fuso de `scheduling_config`, com o padrão seguro do sistema;
- limita a agenda do período a 20 itens e “próximo atendimento” a um item;
- nunca cria, altera, remarca ou cancela agendamentos.

## Períodos

- manhã: 00:00–12:00;
- tarde: 12:00–18:00;
- noite: 18:00–00:00;
- dia inteiro: 00:00–00:00 do dia seguinte.

## Segurança de ativação

O leitor ainda não está conectado ao fluxo de entrada. A ativação ocorrerá somente depois que a conta WhatsApp de produção possuir um número administrativo autorizado explicitamente em `provider_config.staffAgenda`.
