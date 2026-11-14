# Proposta de atualização do GitBook — aguardando aprovação

**Estado: rascunho para revisão do autor. Não publicado no GitBook e fora da pasta sincronizada `docs/`.**

Esta proposta descreve a evolução aprovada de perfis de usuário, disponibilidade e faturamento. Os trechos abaixo devem complementar ou substituir os trechos correspondentes da documentação somente após aprovação do texto.

## 06. Público-alvo e usuários — substituir as descrições dos perfis

### Administrador/Gestor

Usuário com permissão administrativa em uma ou mais barbearias. Gerencia somente as unidades às quais está autorizado, incluindo profissionais, clientes vinculados, serviços, valores, planos, assinaturas, agendamentos, expedientes, pausas e bloqueios. Consulta indicadores e faturamento dos serviços concluídos. Pode criar acessos e atribuir perfis na própria unidade, mantendo pelo menos um administrador ativo. A inativação de serviços retira a oferta do catálogo sem apagar o histórico.

### Barbeiro

Usuário associado a um profissional em uma unidade. Consulta apenas sua agenda, seus horários de trabalho/bloqueios e os clientes dos atendimentos atribuídos a ele. Pode confirmar e concluir esses atendimentos, sem acessar indicadores executivos ou alterar o catálogo e seus preços. A conclusão pelo barbeiro é permitida a partir do início do atendimento.

### Cliente

Usuário com cadastro pessoal, que pode estar vinculado a várias barbearias. Consulta serviços, preços e horários disponíveis; cria, remarca e cancela seus próprios agendamentos futuros em aberto. Consulta seu histórico e suas assinaturas. Não pode alterar agendamentos concluídos, passados ou cancelados, acessar dados de outros clientes ou atribuir-se perfis administrativos.

Uma mesma conta pode acumular funções, e as permissões são verificadas no backend para cada recurso e unidade.

## 07. Requisitos do sistema — acrescentar

- RF16: autenticar usuários com e-mail e senha e permitir encerrar a sessão.
- RF17: aplicar permissões por perfil, unidade e titularidade do recurso, tanto nas telas quanto na API.
- RF18: permitir cadastro público de clientes, sem apropriação de cadastros existentes por simples coincidência de e-mail.
- RF19: permitir ao administrador criar acessos e atribuir/remover perfis em suas unidades, mantendo ao menos um administrador.
- RF20: permitir ao cliente gerenciar apenas suas próprias reservas futuras em aberto e consultar histórico e assinaturas.
- RF21: permitir ao barbeiro consultar sua agenda e os clientes desses atendimentos, confirmar reservas e concluir serviços atribuídos a ele.
- RF22: cadastrar expedientes por profissional e dia da semana, com múltiplas faixas, e bloquear períodos de ausência ou pausa.
- RF23: impedir reservas fora do expediente, durante bloqueios ou em conflito com outras reservas; impedir alterações de disponibilidade que invalidem reservas futuras sem resolução prévia.
- RF24: registrar o preço combinado e a conclusão do atendimento, preservando o histórico após alterações no catálogo.
- RF25: apresentar o valor dos serviços concluídos por período de conclusão, distinguindo estimativas históricas, sem processar pagamentos nem afirmar recebimento.
- RNF08: proteger senhas com hash BCrypt, utilizar sessão HttpOnly/SameSite e proteger operações de escrita contra CSRF.
- RNF09: impedir escalada de privilégios e acesso cruzado entre clientes, profissionais e barbearias.

## 08. Regras de negócio — acrescentar

- RN14: permissões administrativas e de barbeiro pertencem a uma unidade; não conferem acesso às demais unidades.
- RN15: cliente é identificado pela conta autenticada, não por um identificador livre enviado na reserva.
- RN16: novos clientes podem cadastrar-se publicamente. Cadastros anteriores devem ser vinculados a uma conta por um administrador autorizado, sem permitir assumir o cadastro apenas pelo e-mail.
- RN17: cliente pode remarcar ou cancelar somente reservas próprias futuras com status AGENDADO ou CONFIRMADO. Não há prazo mínimo adicional de antecedência nesta versão.
- RN18: barbeiro pode confirmar/concluir somente atendimentos atribuídos ao seu profissional e não pode concluir antes do início.
- RN19: reservas concluídas são preservadas e não podem ser reabertas ou alteradas.
- RN20: uma reserva deve caber integralmente em uma faixa do expediente e não sobrepor bloqueios. Dias sem faixas ficam indisponíveis. Pausas recorrentes são representadas por faixas separadas.
- RN21: alterações de expediente e criação de bloqueios que afetem reservas em aberto devem ser rejeitadas até que o administrador resolva os atendimentos afetados.
- RN22: o preço combinado é salvo na reserva e não muda quando o catálogo é reajustado. Trocar de serviço registra o novo preço; remarcar o mesmo serviço preserva o valor combinado. Preços desatualizados na tela do cliente exigem revisão antes da confirmação.
- RN23: faturamento demonstrado corresponde à soma dos valores combinados de atendimentos concluídos, filtrados pela data de conclusão. Não equivale a recebimento confirmado.
- RN24: dados antigos sem preço histórico exato são identificados como estimados; a data de término serve como aproximação de conclusão nos atendimentos antigos já concluídos.
- RN25: serviços deixam de ser oferecidos por inativação, preservando relacionamentos históricos.
- RN26: uma unidade deve manter pelo menos um administrador. Remover um perfil de uma unidade não revoga automaticamente outros perfis da mesma conta.

## 09–12. Modelagem, DER, modelo lógico e implementação

Acrescentar as entidades:

- USUARIO: id, nome, email único, senha_hash, cliente_id opcional e único, ativo.
- PERMISSAO: usuario_id, barbearia_id, perfil ADMIN/BARBEIRO e barbeiro_id obrigatório somente para BARBEIRO. A combinação usuário/unidade/perfil é única.
- EXPEDIENTE: barbeiro_id, dia_semana (1 a 7), inicio e fim; término posterior ao início.
- BLOQUEIO: barbeiro_id, inicio, fim e motivo; término posterior ao início.

Acrescentar a AGENDAMENTO: valor_acordado, valor_estimado e concluido_em. Preservar as tabelas e relacionamentos anteriores. Atualizar o DER e o modelo lógico para representar conta–cliente (opcional 1:1), usuário–permissões, permissões–barbearia/profissional e profissional–expedientes/bloqueios.

Registrar a migração V3, sem editar V1/V2. Ela amplia o schema e preenche os campos financeiros antigos como estimativas. Os scripts acadêmicos originais continuam disponíveis como registro da primeira versão do modelo.

## 13. Povoamento — acrescentar

O modo local continua utilizando os 200 registros originais e habilita explicitamente contas de demonstração para administrador, barbeiro e cliente. Essas contas e permissões são dados auxiliares de desenvolvimento, não parte da contagem original dos 200 registros. A aplicação convencional não cria as contas demo por padrão; o primeiro administrador é configurado por variáveis de ambiente, sem endpoint público de criação privilegiada.

## 14–15. Desenvolvimento e integração — acrescentar

O Spring Security protege a API por sessão e CSRF. A autorização consulta os vínculos de perfil e verifica o escopo do recurso. A área administrativa mantém os módulos anteriores; portais próprios atendem cliente e barbeiro. O menu de perfil permite alternar funções acumuladas por uma conta. A interface não decide sozinha as permissões.

Expedientes e bloqueios compartilham o lock transacional da barbearia com as reservas. A disponibilidade exibida é indicativa e é novamente validada ao salvar. Senhas são armazenadas somente como hash; o navegador não persiste senhas ou identificadores de sessão em localStorage.

Os guias da versão anterior que descrevem ausência de autenticação e cálculo por preços atuais devem ser atualizados para esse comportamento. A documentação operacional proposta está no arquivo ACESSOS-E-HORARIOS.md.

## 16. Consultas SQL — acrescentar

As 15 consultas acadêmicas originais permanecem como evidência da primeira versão. As consultas executivas da aplicação passam a somar valor_acordado de atendimentos CONCLUIDOS e considerar concluido_em como data do serviço realizado. Registros históricos estimados são identificados separadamente. Acrescentar exemplos SQL das permissões por unidade e das faixas/bloqueios por profissional.

## 17. Testes — acrescentar

Registrar cenários de login/logout, CSRF, senha em hash, isolamento entre unidades, acesso direto por ID, titularidade de reservas, visibilidade da agenda do barbeiro, impedimento de concluir reservas alheias/futuras, horários fora do expediente, bloqueios que afetem reservas, manutenção do último administrador, cotação desatualizada e preservação de faturamento após reajuste do catálogo.

Os testes de navegador devem autenticar pelos endpoints reais, manter os cenários anteriores de tema/cadastros e incluir os portais de cliente/barbeiro e a administração de acessos e horários. Registrar os resultados efetivamente obtidos na entrega, sem inferir aprovação de cenários não executados.

## 18–20. IA, limitações e conclusão — ajustar

Registrar o auxílio do Codex nesta evolução e a aprovação prévia do escopo pelo autor. Atualizar a conclusão para incluir perfis, disponibilidade e histórico de valores. Substituir a ausência de autenticação como limitação; manter a ausência de processamento de pagamentos, cotas de utilização de planos, notificações e conversão de fusos. Acrescentar que recuperação de senha por e-mail, autenticação de dois fatores, auditoria detalhada e correções financeiras pós-conclusão são evoluções futuras.

## Aprovação e publicação

O autor revisa este texto e pode aprovar integralmente ou indicar correções. Após aprovação explícita, aplicar as alterações em uma change request do GitBook e atualizar os guias e diagramas correspondentes. A publicação/merge da documentação deve respeitar o alcance da aprovação recebida. Este rascunho não altera o GitBook nem o diretório docs sincronizado.
