# BarberFlow API

Java 21, Spring Boot 3.5.16, Spring Data JPA, Bean Validation, Flyway e PostgreSQL 18.6.

## Execução rápida

Na raiz do repositório: `powershell -ExecutionPolicy Bypass -File .\scripts\backend-local.ps1`.

O launcher de desenvolvimento `LocalDemoApplication`, em `src/test/java`, inicia um PostgreSQL persistente e isolado em `.local/postgres`, porta 55432, com as migrações e os dados fictícios. Essa classe e a dependência de PostgreSQL embarcado não entram no JAR de produção. O JAR usa seu PostgreSQL configurado por variáveis.

Linux/macOS, usuário comum (não root): `./mvnw spring-boot:test-run -Dspring-boot.run.main-class=br.com.barberflow.LocalDemoApplication`, dentro de `backend`. No Windows o script configura o JDK; alternativamente use `mvnw.cmd` com o mesmo objetivo Maven.

## Usar o PostgreSQL instalado / IntelliJ

1. Crie **um banco de desenvolvimento vazio**, por exemplo `CREATE DATABASE barberflow_dev;`, no pgAdmin, fora de uma transação. Preserve o banco acadêmico existente.
2. Abra `backend/pom.xml` no IntelliJ e selecione JDK 21.
3. Na configuração de execução de `BarberFlowApplication`, defina `DB_URL`, `DB_USERNAME` e `DB_PASSWORD`, conforme `.env.example`. Não versione credenciais. O arquivo `.env` não é carregado automaticamente pelo Spring.
4. Execute a aplicação. O Flyway cria as oito tabelas; Hibernate valida o schema (`ddl-auto=validate`). Não importe manualmente os scripts originais nesse banco.

PowerShell:

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21'
$env:DB_URL='jdbc:postgresql://localhost:5432/barberflow_dev'
$env:DB_USERNAME='postgres'
$credencial=Get-Credential -UserName postgres -Message 'Credencial do PostgreSQL de desenvolvimento'
$env:DB_PASSWORD=$credencial.GetNetworkCredential().Password
.\mvnw.cmd spring-boot:run
```

Para popular **um banco novo e vazio** com os dados fictícios, adicione `SPRING_PROFILES_ACTIVE=demo`. Não ative o perfil demo em um banco com cadastros próprios: os IDs explícitos podem conflitar. Mantenha o perfil nas próximas execuções desse banco. Se já utilizou o modo automático, continue com o script local, que seleciona sempre as duas migrações.

## API REST

Base: `http://127.0.0.1:8080/api`. `POST` retorna 201 com `Location`; `GET` e `PUT` retornam 200. Erros seguem Problem Details: 400 para formatos/validações, 404 para recurso ausente e 409 para conflitos ou restrições de integridade.

| Recurso | Rotas |
| --- | --- |
| Barbearias | GET/POST `/barbearias`, GET/PUT `/barbearias/{id}` |
| Clientes globais | GET/POST `/clientes`, GET/PUT `/clientes/{id}`; filtro opcional `barbeariaId` na lista |
| Cliente e vínculo atômicos | POST `/barbearias/{id}/clientes/cadastro`, PUT `/barbearias/{id}/clientes/cadastro/{clienteId}` |
| Vínculos | GET/PUT `/barbearias/{id}/clientes`; PUT cria ou atualiza a mesma dupla |
| Barbeiros, serviços, planos | GET/POST `/{recurso}`, GET/PUT `/{recurso}/{id}` |
| Agendamentos | GET/POST `/agendamentos`, GET/PUT `/agendamentos/{id}` |
| Disponibilidade | GET `/disponibilidade?barbeariaId=1&barbeiroId=1&servicoId=1&inicio=2027-01-10T10:00:00` |
| Assinaturas | GET/POST `/assinaturas`, GET/PUT `/assinaturas/{id}` |
| Relatórios | GET `/relatorios?barbeariaId=1&de=2027-01-01&ate=2027-12-31` |

As listas de barbeiros, serviços, planos, agendamentos e assinaturas exigem `barbeariaId`. A agenda aceita `de`, `ate` (datas inclusivas) e `status`. A disponibilidade aceita `ignorarId` para editar uma reserva. O resultado é indicativo; salvar repete a validação dentro da transação.

### Corpos de exemplo

Cliente com vínculo (POST na rota da barbearia):

```json
{"nome":"Maria","telefone":"31999990000","email":"maria@example.com","status":"ATIVO"}
```

Barbeiro: `{"barbeariaId":1,"nome":"João","status":"ATIVO"}`.

Serviço: `{"barbeariaId":1,"nome":"Corte","preco":40.00,"duracaoMin":30,"status":"ATIVO"}`.

Plano: `{"barbeariaId":1,"nome":"Mensal","preco":99.90,"status":"ATIVO"}`.

Agendamento (use IDs ativos e vinculados do seu banco; o término é calculado):

```json
{"barbeariaId":1,"clienteId":1,"barbeiroId":1,"servicoId":1,"inicio":"2027-01-10T10:00:00","status":"AGENDADO"}
```

Assinatura:

```json
{"clienteId":1,"planoId":1,"dataInicio":"2027-01-01","dataFim":"2027-12-31","status":"ATIVA"}
```

O `PUT` envia os mesmos campos completos do `POST`, sem `id` nem campos calculados. O vínculo usa `{"clienteId":1,"status":"ATIVO"}`. A barbearia usa `{"nome":"Central","ativa":true}`. Status: cadastro `ATIVO/INATIVO`; agenda `AGENDADO/CONFIRMADO/CONCLUIDO/CANCELADO`; assinatura `ATIVA/ENCERRADA/CANCELADA`.

## Organização e transações

- `barbearia`: módulo original com DTOs, controller, service e repository, ampliado com edição.
- `dominio`: entidades e repositórios dos demais recursos; apenas campos escalares, sem carregamento implícito de grafos JPA na API.
- `gestao/Entradas`: contratos validados de entrada; identificadores não são aceitos no corpo de cadastro.
- `GestaoController`: rotas REST; `GestaoService`: vínculos, status, compatibilidade, duração e controle transacional.
- `RelatorioController`: consultas SQL parametrizadas com JOIN, GROUP BY, COUNT, SUM e ordenação.
- `shared`: respostas de erro e exceções de domínio.

O lock pessimista na barbearia dura até o commit/rollback, serializando as operações relacionadas por unidade. Isso protege a checagem de conflito mesmo com várias instâncias da API; outras unidades continuam independentes. O banco continua exigindo PK, FK, unicidade e CHECK. Gravações SQL fora da aplicação não recebem todas as validações de domínio.

## Testes e diagnóstico

Execute `mvnw.cmd verify` (ou `./mvnw verify`). Usa PostgreSQL real temporário em porta aleatória, sem Docker e sem consultar seu banco pessoal. Inclui testes concorrentes, rollback, restrições, 15 consultas SQL, oito tabelas, seed e fluxos REST. Relatórios em `target/surefire-reports`. O agente Mockito é configurado explicitamente para evitar problemas de anexação dinâmica no Windows.

Portas em uso: pare a instância anterior antes de reiniciar o modo local. Para o PostgreSQL instalado, falhas de conexão exigem conferir banco, serviço e credenciais; schema existente sem histórico Flyway exige um banco vazio, sem ativar baseline para contornar o problema. A raiz `/` da API não contém interface: abra o Vite em 5173.
