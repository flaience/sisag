# Limite de transporte do espelhamento sombra

O transporte assíncrono entre o webhook do WhatsApp e o workflow sombra possui limite próprio de 15 segundos, separado do limite do provedor do modelo. Isso permite concluir a decisão e uma consulta read-only sem interferir na resposta autoritativa atual do WhatsApp.

O valor é configurado por N8N_AGENT_SHADOW_MIRROR_TIMEOUT_MS e limitado entre 10 e 30 segundos. Falhas continuam sanitizadas como transport_failed, sem mensagens, telefones, headers ou resultados da agenda.
