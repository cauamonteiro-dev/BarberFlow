# Experiência por perfil

- O menu administrativo tem rolagem própria em janelas baixas e telas ampliadas. O rodapé e todos os itens podem ser alcançados.
- O perfil Barbearia destaca nome e logo da unidade no painel e na navegação. Os logos SVG das unidades fictícias são demonstrativos, criados para o projeto; as variantes Norte/Sul compartilham a identidade da família.
- O barbeiro é identificado pelo nome do cadastro profissional, não pelo nome genérico da conta de demonstração. Sua página abre na agenda do dia, permite escolher a data e consultar toda a agenda autorizada.
- Após autenticar, os quatro perfis recebem uma transição de carregamento. Barbearia e barbeiro veem a logo da unidade; administrador e cliente veem BarberFlow. O painel fica indisponível para interação até a preparação inicial terminar. A animação respeita a preferência por movimento reduzido.
- A página inicial do cliente reúne exclusivamente suas reservas em todas as unidades, com filtros Próximos e Histórico. Quando não há reservas futuras, o histórico é mostrado inicialmente, se existir. Cada cartão identifica unidade, profissional, serviço, data, situação e valor combinado. Ver agendamento abre a gestão das reservas próprias daquela unidade.
- A aba Barbearias contém a pesquisa, as fotos ilustrativas e os perfis com apresentação e endereços fictícios. A navegação permite voltar à página inicial do cliente.

O endpoint `/api/portal/meus-agendamentos` usa o cliente da sessão. Enviar outro identificador não permite consultar reservas alheias. A identidade da sessão inclui apenas unidades vinculadas ao usuário. A API continua controlando alterações e cancelamentos; a interface não substitui a autorização.

## Referências consultadas

- [Booksy: visualização diária, lista e adaptação da agenda à tela](https://support.booksy.com/hc/en-us/articles/16463655123346-Can-I-customize-my-calendar).
- [Booksy: perfis de negócio, informações e fotos](https://biz.booksy.com/features).
- [Fresha: descoberta do estabelecimento, escolha do profissional e gestão das reservas](https://www.fresha.com/help-center/knowledge-base/online-presence/102398-learn-how-clients-book-appointments-online).

Essas referências orientam a hierarquia de informações; as telas, marcas demonstrativas e componentes são próprios do BarberFlow. Não foi adicionado processamento de pagamentos.

## Documentação publicada e nuvem

Este documento descreve a implementação no repositório. Nenhuma página do GitBook é publicada sem a aprovação do usuário. O merge desta versão não publica o app no Render; `autoDeployTrigger` permanece `off`.
