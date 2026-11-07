# BarberFlow API — primeira entrega

Backend acadêmico em Java 21 e Spring Boot 3.5.16. Esta entrega implementa **cadastro e consulta de barbearias**, com PostgreSQL e validação dos dados. Os demais módulos e a interface React serão desenvolvidos nas próximas entregas.

## 1. Abrir no IntelliJ

1. No GitHub Desktop, selecione o repositório BarberFlow e clique em **Fetch origin**.
2. Em **Current branch**, selecione `feat/backend-barbearias`. Essa é a branch da primeira entrega enquanto o pull request estiver aberto. Depois da incorporação, o código também estará em `main`.
3. No IntelliJ, clique em **File → Open** e selecione `backend/pom.xml`. Escolha abrir como projeto Maven, se solicitado.
4. Aguarde a importação das dependências. Em **File → Project Structure → Project SDK**, selecione o JDK 21. O SDK pode aparecer apenas em **Project Settings → Project**, dependendo da versão.

O Maven Wrapper (`mvnw` e `mvnw.cmd`) fixa o Maven 3.9.11. A primeira execução precisa de internet para baixar o Maven e as dependências.

## 2. Criar um banco de desenvolvimento separado

No pgAdmin, abra o **Query Tool** conectado ao banco `postgres` e execute somente:

```sql
CREATE DATABASE barberflow_dev;
```

Esse comando deve ser executado fora de um bloco de transação. Se o banco já existir, não o crie novamente. Para a primeira execução da API, utilize um banco vazio.

**Não execute os scripts acadêmicos manualmente em `barberflow_dev`.** O Flyway criará as oito tabelas usando a migração derivada do modelo físico. O banco acadêmico `barberflow` e os scripts originais em `docs/.gitbook/assets/` são preservados.

O Flyway registra o que executou em `flyway_schema_history`. O Hibernate usa `ddl-auto: validate`: confere o mapeamento, sem criar ou modificar tabelas automaticamente. Não edite uma migração já aplicada; mudanças futuras devem ter novas versões.

O Flyway está fixado em 11.20.3 para o uso com PostgreSQL 18. O PostgreSQL temporário dos testes é 18.6.

## 3. Configurar e executar

Abra `src/main/java/br/com/barberflow/BarberFlowApplication.java`. Execute uma vez pelo botão verde ao lado de `main`, para criar a configuração de execução. A inicialização precisa das credenciais a seguir.

Em **Run → Edit Configurations**, selecione a execução de `BarberFlowApplication`. Procure **Environment variables**; pode ser necessário habilitar o campo em **Modify options**. Configure:

| Variável | Valor |
| --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/barberflow_dev` |
| `DB_USERNAME` | Seu usuário PostgreSQL, normalmente `postgres` |
| `DB_PASSWORD` | Sua senha PostgreSQL |

Salve e execute novamente. URL e usuário têm os valores padrão acima; a senha deve ser informada. Mantenha essa configuração local no IntelliJ.

Alternativa pelo PowerShell, no diretório `backend`:

```powershell
$env:DB_URL = 'jdbc:postgresql://localhost:5432/barberflow_dev'
$env:DB_USERNAME = 'postgres'
$env:DB_PASSWORD = Read-Host 'Senha do PostgreSQL'
.\mvnw.cmd spring-boot:run
```

`Read-Host` acima lê texto visível; para ocultar a digitação no PowerShell 7, use `Read-Host -MaskInput 'Senha do PostgreSQL'`. As variáveis valem para o processo e seus filhos; não são gravadas nos arquivos do projeto.

No Linux/macOS, use `./mvnw spring-boot:run` com as mesmas variáveis de ambiente. Ao encerrar a sessão de trabalho, você pode remover a senha do PowerShell com `Remove-Item Env:DB_PASSWORD`.

A API escuta em `http://localhost:8080`. Acesse **`/api/barbearias`**, pois ainda não existe uma página inicial. Se a porta estiver ocupada, defina `SERVER_PORT=8081` e ajuste as URLs dos testes.

## 4. Usar os 200 registros de demonstração (opcional)

Para iniciar um **banco vazio** com o povoamento, acrescente `SPRING_PROFILES_ACTIVE=demo` às variáveis da execução. No PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'demo'
.\mvnw.cmd spring-boot:run
```

O Flyway aplicará V1 (estrutura) e V2 (200 registros), uma vez cada. Reiniciar no perfil demo não duplica os registros. Mantenha esse perfil nas próximas inicializações desse banco. Ele é destinado aos dados fictícios de demonstração.

Se já cadastrou dados pela API no banco sem o perfil demo, não ative o povoamento nesse banco: os IDs explícitos do script podem conflitar. Para experimentar a demonstração, crie outro banco vazio, por exemplo `barberflow_demo`, e ajuste `DB_URL`. Não apague seu banco acadêmico.

## 5. Testar a API

| Método | Endpoint | Resultado esperado |
| --- | --- | --- |
| `POST` | `/api/barbearias` | `201 Created`, objeto cadastrado e cabeçalho `Location` |
| `GET` | `/api/barbearias` | `200 OK`, lista ordenada por ID, incluindo ativas e inativas |
| `GET` | `/api/barbearias/{id}` | `200 OK` ou `404 Not Found` |

O corpo de cadastro tem `nome` (obrigatório, até 100 caracteres após remoção de espaços nas pontas) e `ativa` (booleano obrigatório). Não envie `id`; ele é gerado pelo PostgreSQL.

### Pelo PowerShell

```powershell
$body = @{ nome = 'BarberFlow Nova Lima'; ativa = $true } | ConvertTo-Json
$nova = Invoke-RestMethod -Method Post `
    -Uri 'http://localhost:8080/api/barbearias' `
    -ContentType 'application/json; charset=utf-8' -Body $body
$nova
Invoke-RestMethod 'http://localhost:8080/api/barbearias'
Invoke-RestMethod "http://localhost:8080/api/barbearias/$($nova.id)"
```

No Postman, use o mesmo endpoint de cadastro, **Body → raw → JSON**:

```json
{
  "nome": "BarberFlow Nova Lima",
  "ativa": true
}
```

O arquivo [requests/barbearias.http](requests/barbearias.http) também contém exemplos, caso sua edição do IntelliJ ofereça cliente HTTP.

### Validação e persistência

1. Cadastre a barbearia e anote seu ID.
2. Consulte a lista e depois o ID recebido.
3. Conecte o Query Tool ao **`barberflow_dev`** e execute `SELECT id, nome, ativa FROM barbearia ORDER BY id;`.
4. Pare e reinicie a aplicação. Consulte o mesmo ID: os dados devem continuar no banco.
5. Envie `"nome": "   "`: a API deve retornar `400`, com indicação do campo inválido, sem salvar.
6. Omita `ativa` ou envie `null`: deve retornar `400`. O valor `false` é válido.
7. Consulte um ID inexistente: deve retornar `404`.

Exemplo de erro de validação (o campo `instance` identifica a rota):

```json
{
  "type": "about:blank",
  "title": "Dados inválidos",
  "status": 400,
  "detail": "Confira os campos informados.",
  "instance": "/api/barbearias",
  "errors": { "nome": "O nome é obrigatório." }
}
```

## 6. Entender o código em 1 hora

| Tempo | Atividade |
| --- | --- |
| 10 min | Leia esta página e abra `BarbeariaController`: encontre as três rotas. |
| 15 min | Configure as variáveis e inicie a API; execute o cadastro. |
| 15 min | Consulte o registro pela API e no pgAdmin; reinicie e confira a persistência. |
| 10 min | Siga a chamada de `cadastrar` do controller ao service e ao repository. |
| 10 min | Teste um nome vazio e explique por que a resposta é `400`. |

Fluxo do cadastro:

1. **Controller:** recebe o JSON e aciona a validação do `BarbeariaRequest`.
2. **DTO de entrada:** descreve os campos aceitos. `@NotBlank` impede nome nulo ou em branco; `@NotNull` exige o status.
3. **Service:** coordena a operação dentro de uma transação.
4. **Repository:** oferece `save`, `findAll` e `findById` por meio do Spring Data JPA.
5. **Entidade:** `Barbearia` mapeia a tabela e a geração do ID.
6. **DTO de saída:** define o JSON devolvido, sem expor a entidade diretamente.

Exercício: cadastre uma barbearia com `ativa=false`. O cadastro deve funcionar. Explique a diferença entre um booleano `false` e um campo ausente (`null`).

## 7. Testes automatizados

No PowerShell, dentro de `backend`:

```powershell
.\mvnw.cmd verify
```

Linux/macOS: `./mvnw verify`.

Os testes iniciam um PostgreSQL 18 temporário e isolado. Não usam seu `DB_URL`, suas credenciais ou seu banco pessoal, nem exigem Docker. Precisam de internet na primeira execução e de permissão para iniciar processos locais; no Linux, execute como usuário comum, pois o PostgreSQL não inicia como root.

São verificadas as rotas, as validações, a persistência, a criação das oito tabelas, a execução única das migrações e os 200 registros do perfil demo. Relatórios: `target/surefire-reports/`.

## 8. Problemas comuns

| Sintoma | Conferir |
| --- | --- |
| Falha de autenticação | Usuário e senha nas variáveis da execução |
| Banco inexistente | Criação de `barberflow_dev` e valor de `DB_URL` |
| Conexão recusada | Serviço PostgreSQL iniciado e porta correta |
| Schema não vazio sem histórico Flyway | Use um banco de desenvolvimento vazio. Não habilite baseline automático para contornar o erro. |
| Erro na porta 8080 | Outro backend aberto; encerre-o ou configure `SERVER_PORT` |
| Página 404 na raiz | Use `http://localhost:8080/api/barbearias` |

Esta entrega é para desenvolvimento local: ainda não implementa autenticação, permissões ou a interface React. O servidor usa apenas a interface local por padrão. A logo será incorporada quando iniciarmos a identidade visual.

## Referências técnicas

- [Spring Boot — requisitos](https://docs.spring.io/spring-boot/3.5/system-requirements.html)
- [Flyway — migrações](https://documentation.red-gate.com/flyway)
- [PostgreSQL temporário para testes](https://github.com/zonkyio/embedded-postgres)
