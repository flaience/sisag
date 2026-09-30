# API de gestão de acessos administrativos do WhatsApp

API autenticada em `/api/v1/settings/whatsapp/staff-accesses` para listar, criar e atualizar acessos. Somente owner/admin; empresa e ator vêm exclusivamente da sessão. Toda mutação valida conta/profissional no tenant e grava snapshot de auditoria na mesma transação. Desativação é lógica e telefone é normalizado antes da persistência. A API ainda não muda o resolver de produção nem migra o JSON legado.
