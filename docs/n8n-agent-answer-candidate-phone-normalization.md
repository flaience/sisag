# Normalização do destinatário da resposta candidata

O webhook da Meta pode fornecer determinados números móveis brasileiros no formato legado com oito dígitos locais. O assistente existente já normaliza esse valor antes da publicação; o roteamento da resposta candidata agora reutiliza exatamente a mesma função `normalizePhoneE164`.

Sem essa normalização, a candidata era gerada e registrada corretamente, mas a Meta rejeitava o destinatário diferente com o código 131030. A correção altera somente o destinatário da publicação, preservando decisão, idempotência, fallback e ausência de mutações na agenda.
