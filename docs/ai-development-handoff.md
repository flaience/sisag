# Handoff do desenvolvimento com IA

Atualizado em 13/09/2026.

## Base e entrega
- Base ad161b2, PR407; branch audit/scheduling-recovery-controlled-validation.
- Entrega expandida de roteiro documental para evidência local e melhoria de usabilidade da recuperação.
- Arquivos de código: page.tsx de recuperação, BookingRecoveryManagement.service.ts, RecoveryCaseAssignment.tsx e teste.
- Alterações ainda aguardam commit/PR; nenhum merge ou deploy desta entrega confirmado.
- Homologação em C:/sisag-homolog-local/app-ad161b2: snapshot PR407 com três arquivos da melhoria sincronizados; não equivale ao commit puro.
- Servidor local em 127.0.0.1:3100; não iniciar uma segunda instância. Supabase em 54321/54322; últimas escutas verificadas em loopback.
- Scripts auxiliares em C:/Users/Luis/Documents/Codex/2026-08-03/bem; credenciais locais fora do Git, não compartilhar.
- Checkbox de envio não basta para bloquear jobs existentes. Shadow pode chamar providers configurados. Guard de API aceita owner/admin/staff; vínculo usa limit(1).

## Evidência executada em 13/09/2026

- Homologação local separada: Supabase/PostgreSQL 17.6, 73 tabelas; exportação sem políticas, funções ou triggers. Não certifica paridade com produção.
- Dois tenants/empresas e usuários owner fictícios, cada um com um vínculo ativo. Sem copiar dados ou credenciais de produção.
- Usuário confirmou sessões reais: A lista apenas A, B apenas B.
- Claim cruzado A→B e B→A retornou 404 recovery_case_not_found; casos completos e contagens de eventos/jobs/outbox inalterados naquele teste.
- Controle positivo: B assumiu B; consulta confirmou um evento automation.booking_recovery.updated, ação claim, ator B.
- Estado posterior: A atribuída a A e B a B, ambos open. Não foi conferida a auditoria específica da atribuição posterior de A.
- Quatro leituras reais retornaram HTTP200 em 105–501ms; uma porção anterior da investigação teve timeouts. Causa-raiz da intermitência não demonstrada.
- UI agora exibe responsável, com fallback para ID; serviço consulta perfil com filtro de empresa. Captura textual de A conferida com banco; B persistido, mas sua nova apresentação visual não reconfirmada.
- Leitura e alteração com limite de 15s; erro de leitura permite nova tentativa sem repetir POST. Timeout do cliente não cancela necessariamente transação no servidor.
- Usuário confirmou 3 testes de RecoveryCaseAssignment e build aprovado. Esses testes não cobrem timeout, concorrência, nem a nova consulta real por si só.
- anon/authenticated sem permissões verificadas nas tabelas públicas locais. Pool local usa postgres; isolamento SQL por RLS NÃO certificado.
- WhatsApp, geração/revisão de recomendações, providers, concorrência real e outros papéis continuam fora da evidência desta rodada.
- Não houve alteração de produção nesta rodada nem limpeza de dados. Nenhuma chamada externa alegada como impossível: guarda Node é barreira adicional, não firewall.

## Pendências para a próxima rodada
- Exercitar falha controlada/timeout e recuperação da interface; adicionar testes de carregamento e consulta.
- Conferir a apresentação de B e auditoria posterior de A sem repetir claim.
- Continuar a matriz de geração/revisão apenas após revisar as barreiras de integração.
- Não reaplicar seeds. O teste cruzado original exige casos sem responsável e precisa adaptação antes de ser reutilizado.

## Próxima ação imediata
Revisar diff completo, incluindo arquivos novos; commit dos sete arquivos desta entrega e PR para main.
Merge em main aciona workflow de deploy: criação de PR não é autorização para confundir homologação aprovada com todos os cenários validados.
Não limpar banco local nem alterar produção para fechar documentação.
