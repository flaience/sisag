# Roteamento da pergunta de informação ausente

O workflow sombra v14 preserva a pergunta de esclarecimento validada pelo gateway quando a decisão é `clarify` com `missing_information`.

O SISAG normaliza espaços e quebras de linha, limita a pergunta a 300 caracteres e somente publica quando nenhuma ferramenta foi solicitada ou executada. O texto fixo da disponibilidade continua sendo usado para `availability_required`.

A alteração não cria, cancela nem remarca agendamentos. Após a implantação, o JSON v14 deve ser importado e publicado novamente no n8n.
