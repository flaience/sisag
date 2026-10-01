# Autenticação das configurações do WhatsApp

O layout de `/admin/settings/whatsapp` passou a obter a sessão pelo cliente Supabase do servidor, da mesma forma que o layout administrativo pai.

A leitura direta do cookie legado `sb-access-token` foi removida. Esse cookie não representa necessariamente o formato atual da sessão e provocava redirecionamento indevido para o login mesmo com o usuário autenticado.

As permissões permanecem restritas aos papéis `owner` e `admin`.
