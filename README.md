# BarberFlow

Plataforma acadêmica de gestão de barbearias: Java 21 / Spring Boot, React / Vite / Axios e PostgreSQL. Implementada a partir dos requisitos, regras e modelo físico do [GitBook](https://a3-sistema-de-gerenciamento-de-b.gitbook.io/a3-sistema-de-gerenciamento-de-barbearia-docs/).

## Testar na sua máquina

Pré-requisitos: **JDK 21** e **Node 22.12+ ou 24 LTS**. O Maven Wrapper acompanha o projeto. A primeira execução baixa dependências e os binários PostgreSQL; as seguintes reutilizam o cache.

Na pasta do projeto, abra dois terminais PowerShell:

**Terminal 1 — banco e backend:**

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backend-local.ps1
```

**Terminal 2 — interface:**

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local.ps1
```

Abra **http://127.0.0.1:5173**. A API fica em **http://127.0.0.1:8080/api/barbearias**. Para parar, use `Ctrl+C` nos terminais; não feche o processo PostgreSQL isoladamente.

Esse modo inicia um PostgreSQL 18.6 exclusivo na porta **55432**, com arquivos persistentes em **`.local/postgres/`**, e carrega os **200 registros fictícios** apenas na primeira execução. Não utiliza seu banco `barberflow`, nem pede suas credenciais pessoais. Reiniciar mantém seus cadastros. A pasta `.local/` é ignorada pelo Git e contém apenas o ambiente local. Não execute duas instâncias do backend nesse modo simultaneamente.

Para escolher outro JDK: `powershell -ExecutionPolicy Bypass -File .\scripts\backend-local.ps1 -JavaHome 'C:\caminho\jdk-21'`. O script usa `JAVA_HOME` e, nesta máquina, reconhece também `C:\Program Files\Java\jdk-21`.

O PostgreSQL local de demonstração usa autenticação de desenvolvimento e escuta apenas no loopback. O sistema não possui login: este ambiente é destinado a testes e apresentação acadêmica no próprio computador.

## O que está implementado

| Área | Funcionalidades |
| --- | --- |
| Visão geral | Indicadores da unidade, agenda do dia e atalhos |
| Barbearias | Cadastro, consulta, edição e ativação/inativação |
| Clientes | Cadastro e edição de contato, busca, vínculo com várias unidades, inativação e reativação do mesmo vínculo |
| Barbeiros | Cadastro, consulta, edição e status por unidade |
| Serviços | Nome, preço, duração, edição e status |
| Agenda | Agendamento, alteração, status, filtros, disponibilidade e bloqueio transacional de conflitos |
| Planos | Cadastro, consulta, edição, preço e status |
| Assinaturas | Cliente, plano, período, status e identificação de vigência |
| Relatórios | Filtros de período, agrupamentos por profissional e status e somas dos serviços concluídos |

O valor dos serviços concluídos usa os **preços atuais do catálogo**; não representa faturamento recebido. Pagamentos, comissões, autenticação e planos com cotas de consumo não fazem parte dos requisitos atuais. Os agendamentos usam o horário local da barbearia, sem conversão de fuso.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `backend/` | API, regras transacionais, entidades JPA, Flyway e testes com PostgreSQL real |
| `frontend/` | Interface React responsiva e testes Playwright |
| `database/consultas.sql` | As 15 consultas do anexo acadêmico em formato executável |
| `scripts/` | Inicialização local e testes no Windows |
| `docs/` | Documentação e anexos sincronizados com o GitBook |

Guias: [API e PostgreSQL instalado](backend/README.md), [interface](frontend/README.md), [apresentação](GUIA-APRESENTACAO.md).

## Validação

Backend, sem usar seus bancos pessoais:

```powershell
cd backend
.\mvnw.cmd verify
```

Frontend:

```powershell
cd frontend
npm.cmd ci
npm.cmd run build
```

Com os dois servidores iniciados, execute `powershell -ExecutionPolicy Bypass -File .\scripts\testar-interface.ps1` na raiz. O script prepara o Chromium local e executa os fluxos no navegador. Ele cria uma barbearia de teste identificada pelo nome e a inativa ao finalizar; os registros ficam disponíveis para inspeção nesse banco de demonstração.

O GitHub Actions também valida o backend, o build e os fluxos da interface com PostgreSQL isolado. O `verify` gera o JAR executável em `backend/target/`.

## Decisões de domínio

- Um cliente é compartilhado entre unidades; nome e contato são globais. O status é do vínculo com cada barbearia, conforme o modelo físico. A inativação preserva o histórico (RF02).
- A dupla cliente/barbearia é única. Reativar atualiza o mesmo registro, de acordo com a restrição já existente no banco.
- Barbeiro, serviço e plano mantêm a barbearia de origem. Para outra unidade, crie outro cadastro, preservando o histórico dos relacionamentos.
- Novos agendamentos exigem unidade, vínculo, barbeiro e serviço ativos e compatíveis. Intervalos adjacentes são aceitos; cancelados liberam o horário. Alterar somente o status preserva o término originalmente reservado.
- O backend bloqueia a linha da barbearia durante as gravações relacionadas. A checagem e a inserção do agendamento ocorrem na mesma transação, inclusive em requisições concorrentes. SQL direto deve respeitar essas regras; as FKs originais não as substituem.
- Assinaturas exigem vínculo compatível e período válido. Vigência considera status, data inicial e final; não existe job que mude automaticamente o status ao expirar.
- Não são impostas regras não documentadas de expediente, antecedência, duração do plano ou transições de status. É possível cadastrar históricos.

Os scripts acadêmicos originais em `docs/.gitbook/assets/` e as migrações V1/V2 permanecem preservados. Mudanças futuras no schema devem usar novas migrações.
