# Gateway somente leitura da proposta de intenção

A ferramenta `scheduling.prepare_arrival_intention` aceita somente uma data ISO e usa a mensagem, empresa e correlação do envelope confiável. O identificador do período é resolvido internamente pelo read model e nunca aceito do chamador.

A política classifica a ferramenta como somente leitura. Campos de mutação são rejeitados pelo schema estrito. O incremento não registra intenção, não envia mensagem e não executa check-in.
