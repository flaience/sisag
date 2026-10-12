# Contrato do código de erro da resposta candidata

O gateway de agendamento utiliza códigos operacionais em maiúsculas, incluindo `SCHEDULING_RESOURCE_NOT_FOUND`. O contrato da resposta sombra agora aceita letras maiúsculas e minúsculas, números e sublinhado, preservando o limite de 64 caracteres e rejeitando espaços, pontuação e conteúdo livre.

Essa correção impede que uma resposta válida do workflow seja descartada antes do roteamento. Nenhum dado privado adicional é aceito ou persistido, e o escopo de elegibilidade da resposta candidata permanece inalterado.
