# Interpretação de horários falados no WhatsApp

Correção motivada pela evidência produtiva em que “Quero agendar amanhã às dez horas” foi transcrito corretamente, mas o horário por extenso não foi convertido.

O interpretador local reconhece horas quando existe contexto temporal explícito, além de quinze, meia, trinta, quarenta e cinco, manhã, tarde, noite, meio-dia e meia-noite. Frases ambíguas como “opção dois” ou “dois profissionais” não viram horário.

O comportamento permanece fail-closed: construções não suportadas não são inventadas; o assistente solicita esclarecimento. A correção não chama modelo, banco ou provedor e não altera a confirmação obrigatória antes do booking.
