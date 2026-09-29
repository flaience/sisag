# Fundação para consulta da agenda pelo WhatsApp

## Objetivo

Preparar consultas administrativas por voz, como **“Como está minha agenda da tarde?”** e **“Qual é meu próximo atendimento?”**, sem confundir o colaborador com um cliente e sem expor a agenda a qualquer número que escreva para o WhatsApp da empresa.

## Decisão de segurança

O modelo atual não possui vínculo direto entre telefone, `company_users` e `professionals`. Por isso, esta fundação não infere identidade por nome, cliente ou histórico de conversa. A autorização será explícita em `whatsapp_accounts.provider_config.staffAgenda`:

```json
{
  "staffAgenda": {
    "enabled": true,
    "authorizedSenders": [
      { "phoneE164": "+5511999999999", "role": "manager" },
      {
        "phoneE164": "+5511988888888",
        "role": "professional",
        "professionalId": "6c87792c-8dd2-446f-9731-e2d30306266d"
      }
    ]
  }
}
```

- `manager`: poderá consultar a agenda da empresa, conforme o escopo que a próxima entrega definir.
- `professional`: somente poderá consultar a própria agenda; o profissional precisa existir, estar ativo e pertencer à mesma empresa.
- zero ou mais de um vínculo para o telefone: acesso negado; o sistema nunca escolhe por aproximação.
- a ausência da configuração mantém o comportamento atual.

## Escopo desta entrega

- resolver e validar a identidade administrativa de modo tenant-scoped;
- reconhecer as duas primeiras famílias de consulta;
- proteger a fronteira por testes;
- não consultar nem responder dados reais ainda;
- não alterar o fluxo de clientes nem executar mutações.

## Próxima entrega

Adicionar o leitor oficial de agendamentos, filtrar por empresa e profissional, aplicar o fuso da unidade e somente então integrar a resposta ao WhatsApp. Respostas não autorizadas devem ser neutras e não revelar se um telefone ou profissional está cadastrado.
