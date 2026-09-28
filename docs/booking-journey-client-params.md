# Parâmetro da jornada no componente cliente

A página cliente da jornada obtém o identificador do booking com `useParams()`. O componente não acessa mais `params.id` diretamente, formato que produzia uma requisição para `/api/v1/bookings/undefined/journey` nas versões atuais do Next.js.

A chamada é interrompida localmente quando o identificador não existe. Erros da API também exibem primeiro a mensagem explicativa, sem confundir falhas internas com um booking inexistente.
