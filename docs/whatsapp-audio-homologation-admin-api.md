# API administrativa da homologação de áudio

Endpoint autenticado: `POST /api/v1/settings/whatsapp/homologation/audio`.

Recebe `multipart/form-data` com `file` e `durationSeconds` opcional. Somente owner e admin podem utilizar. O arquivo respeita os mesmos limites da produção e a chave OpenAI é lida exclusivamente do Docker Secret `/run/secrets/openai_api_key`.

A resposta contém apenas resultado, transcrição sanitizada, confiança e versão da política. Não acessa a Meta, não envia mensagens e não altera agendamentos.
