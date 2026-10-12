# Roteamento de resultados read-only da resposta candidata

O roteamento controlado passa a aceitar três resultados coerentes da consulta de disponibilidade:

- consulta concluída com horários e candidato ready;
- consulta concluída sem horários e candidato empty;
- ausência de serviço ou profissional com candidato clarify.

Falhas genéricas, combinações inconsistentes de status e quantidade, respostas sem solicitação read-only e outros tipos de ferramenta continuam inelegíveis. O assistente atual permanece como fallback quando o candidato não é seguro ou não pode ser publicado.
