# BarberFlow

Plataforma acadêmica de gestão de barbearias: Java 21 / Spring Boot, React / Vite / Axios e PostgreSQL. Implementada a partir dos requisitos, regras e modelo físico do [GitBook](https://a3-sistema-de-gerenciamento-de-b.gitbook.io/a3-sistema-de-gerenciamento-de-barbearia-docs/).

## Testar na sua máquina

No Windows, use **INICIAR-BARBERFLOW.cmd** na raiz do projeto. Na primeira preparação, são necessários JDK 21, Node 22.12+ ou 24 LTS e internet para baixar as dependências. O iniciador prepara a interface e a API juntas, valida os quatro perfis e abre **http://localhost:8181/**. Mantenha a janela aberta durante o uso; para finalizar, use **ENCERRAR-BARBERFLOW.cmd**.

O pacote já preparado inicia sem baixar dependências. O PostgreSQL de demonstração escuta apenas nesta máquina, na porta 55441, com arquivos em `.local/demo-dados`. Ele contém **600 registros de negócio em 15 unidades**, preserva alterações após reiniciar e não usa o banco do Render. Nada em `.local/` deve ser enviado ao GitHub.

Contas de demonstração: `admin@barberflow.local`, `barbearia1@barberflow.local` até `barbearia15@barberflow.local`, `barbeiro@barberflow.local` e `cliente@barberflow.local`. Senha: **BarberFlow!2026**. Esses acessos pertencem exclusivamente ao modo de demonstração.

Veja [instruções completas do iniciador](COMO-ABRIR-LOCALMENTE.md). Para desenvolver com recarga automática, continuam disponíveis os scripts `scripts/backend-local.ps1` (API 8080 / banco 55432) e `scripts/frontend-local.ps1` (Vite 5173). São execuções separadas: não misture o endereço de um ambiente com o backend de outro.

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

O faturamento dos serviços concluídos usa o **valor combinado no agendamento**, preservado após alterações do catálogo; não comprova recebimento. A plataforma tem autenticação e perfis de administrador geral, barbearia, barbeiro e cliente. Não processa pagamentos nem comissões. Os agendamentos usam o horário local da barbearia, sem conversão de fuso.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `backend/` | API, regras transacionais, entidades JPA, Flyway e testes com PostgreSQL real |
| `frontend/` | Interface React responsiva e testes Playwright |
| `database/consultas.sql` | As 15 consultas do anexo acadêmico em formato executável |
| `scripts/` | Inicialização local e testes no Windows |
| `docs/` | Documentação e anexos locais; publicação no GitBook depende de aprovação e acesso de escrita |

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

Para testar pelo iniciador integrado, defina `$env:E2E_URL="http://127.0.0.1:8181"`. Com o ambiente desejado iniciado, execute `powershell -ExecutionPolicy Bypass -File .\scripts\testar-interface.ps1` na raiz. O script prepara o Chromium local e executa os fluxos no navegador. Ele cria uma barbearia de teste identificada pelo nome e a inativa ao finalizar; os registros ficam disponíveis para inspeção nesse banco de demonstração.

O GitHub Actions também valida o backend, o build e os fluxos da interface com PostgreSQL isolado. O `verify` gera o JAR executável em `backend/target/`.

## Decisões de domínio

- Um cliente é compartilhado entre unidades; nome e contato são globais. O status é do vínculo com cada barbearia, conforme o modelo físico. A inativação preserva o histórico (RF02).
- A dupla cliente/barbearia é única. Reativar atualiza o mesmo registro, de acordo com a restrição já existente no banco.
- Barbeiro, serviço e plano mantêm a barbearia de origem. Para outra unidade, crie outro cadastro, preservando o histórico dos relacionamentos.
- Novos agendamentos exigem unidade, vínculo, barbeiro e serviço ativos e compatíveis. Intervalos adjacentes são aceitos; cancelados liberam o horário. Alterar somente o status preserva o término originalmente reservado.
- O backend bloqueia a linha da barbearia durante as gravações relacionadas. A checagem e a inserção do agendamento ocorrem na mesma transação, inclusive em requisições concorrentes. SQL direto deve respeitar essas regras; as FKs originais não as substituem.
- Assinaturas exigem vínculo compatível e período válido. Vigência considera status, data inicial e final; não existe job que mude automaticamente o status ao expirar.
- O agendamento do cliente respeita o expediente e os bloqueios do profissional. Somente suas próprias reservas futuras em aberto podem ser remarcadas ou canceladas. Barbeiros consultam apenas seus atendimentos; a gestão da barbearia fica restrita às unidades autorizadas.

Os scripts acadêmicos originais em `docs/.gitbook/assets/` e as migrações V1/V2 permanecem preservados. Mudanças futuras no schema devem usar novas migrações.
