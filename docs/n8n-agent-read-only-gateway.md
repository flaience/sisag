# Gateway interno somente leitura do agente n8n

## Resultado

O SISAG passa a ter um endpoint interno autenticado que valida o envelope confiável, o escopo das evidências RAG e a ferramenta solicitada antes de delegar uma consulta ao adaptador oficial de scheduling.

## Ferramentas iniciais

- `scheduling.find_available_slots`: consulta disponibilidade oficial;
- `scheduling.explain_appointment_status`: consulta a jornada oficial de um booking.

O endpoint não aceita formatos de criação, confirmação, cancelamento ou reagendamento. O bloqueio ocorre no esquema e novamente na política de ferramentas.

## Segurança

- exige o segredo interno já usado pelas rotas de plataforma;
- cria contexto operacional com empresa e correlação do envelope validado;
- aceita no máximo oito evidências aprovadas e pertencentes à mesma empresa;
- usa diretamente o adaptador oficial, sem regra de agenda dentro do n8n;
- falhas do executor são sanitizadas.

## Limites

O workflow permanece inativo. Esta entrega não recupera documentos do banco, não chama modelo, não envia WhatsApp e não permite mutações. A próxima etapa deve construir o recuperador RAG geral, aprovado e isolado por empresa, antes de versionar o workflow n8n.
