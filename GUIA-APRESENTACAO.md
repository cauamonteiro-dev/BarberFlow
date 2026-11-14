# Apresentar o BarberFlow

## Roteiro prático (10 a 15 minutos)

1. Inicie os dois servidores conforme o README. Selecione uma unidade ativa ou cadastre uma nova para a apresentação.
2. Cadastre um cliente, um barbeiro, um serviço com preço e duração e um plano. Explique que os dados saem do navegador, passam pela API e são persistidos no PostgreSQL.
3. Faça um agendamento e confira o término calculado. Tente cadastrar outro no mesmo intervalo com o mesmo barbeiro: a API retorna 409. Um horário exatamente no término do anterior é permitido.
4. Cancele a primeira reserva e mostre que o horário volta a ficar disponível. Explique os quatro status e a preservação do histórico.
5. Inative o vínculo de um cliente e tente um novo agendamento. Reative e explique que o ID do vínculo permanece o mesmo.
6. Na outra unidade, use “Vincular cliente existente”. Explique o relacionamento N:N entre cliente e barbearia e o papel da tabela associativa.
7. Cadastre uma assinatura e altere seu período/status. Mostre que uma data final anterior à inicial é rejeitada.
8. Abra Relatórios, filtre um período e explique JOIN, agrupamento, contagem e soma. O valor apresentado usa os preços atuais dos serviços concluídos; não há registro de pagamento.
9. No pgAdmin, conecte ao modo local: host `127.0.0.1`, porta `55432`, banco e usuário `postgres`, senha de desenvolvimento `postgres`. Consulte as oito tabelas. Se usar seu PostgreSQL instalado, use as credenciais desse ambiente.
10. Execute exemplos de `database/consultas.sql`: consulta 7 (JOIN), 9 (GROUP BY), 12 (HAVING), 14 (subconsulta) e 15 (relacionamento N:N).
11. Pare e reinicie o backend pelo mesmo script. Consulte novamente o cliente para demonstrar persistência. Não apague `.local/postgres`.
12. Mostre os relatórios dos testes em `backend/target/surefire-reports` e o teste concorrente `preventsConcurrentDoubleBooking`.

## Explicar a arquitetura

Fluxo: **React → Axios/HTTP → Controller → Service/transação → JPA/SQL → PostgreSQL**.

As PKs identificam registros. FKs exigem referências existentes; a FK composta de agendamento exige o vínculo cliente/barbearia. CHECKs validam preços, duração, períodos e status. A API complementa o modelo ao exigir profissionais/serviços da mesma unidade e impedir sobreposição de horários. O lock pessimista e a transação evitam que duas requisições aprovadas simultaneamente reservem o mesmo horário.

O Flyway executa migrações uma vez e registra seus checksums. O Hibernate valida o schema; não o recria. O perfil demo adiciona registros fictícios sem duplicá-los em reinicializações.

## Escopo e limitações

O projeto atende os cadastros, relacionamentos, agenda, assinaturas e consultas documentados. Não há autenticação, processamento de pagamentos, cotas de uso de planos ou notificações. Os valores gerenciais não são um livro financeiro. Horários são locais e não há expediente configurável. A interface carrega os dados da unidade em memória; paginação e filtros adicionais no servidor são evoluções para bases maiores. O foco é uma aplicação acadêmica executável e demonstrável.

## Uso de IA

O Codex auxiliou na leitura dos requisitos, escrita do código, preparação do ambiente e testes. Para a apresentação, revise o fluxo de cada funcionalidade, execute os cenários e explique as regras e transações com suas próprias palavras. Resultados automatizados não substituem sua compreensão e a validação exigida pelo professor.
