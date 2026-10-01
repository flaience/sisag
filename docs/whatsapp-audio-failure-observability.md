# Observabilidade de falhas do áudio do WhatsApp

A etapa de áudio agora persiste códigos sanitizados por origem, sem armazenar mensagens privadas, tokens ou respostas integrais dos provedores.

## Exemplos

- `meta_metadata_http_error`;
- `meta_media_http_error`;
- `meta_network_error`;
- `openai_auth_error`;
- `openai_quota_exhausted`;
- `openai_rate_limited`;
- `openai_provider_http_error`;
- `openai_invalid_response`;
- `openai_network_error`.

Saldo esgotado e credencial inválida são terminais. Rate limit, erro HTTP 5xx/rejeição genérica e rede continuam elegíveis a retentativa limitada. Exceções desconhecidas permanecem como `transcription_failed`.

A classificação usa somente status HTTP e campos estruturados `error.code`/`error.type`; mensagens do provedor não são persistidas.
