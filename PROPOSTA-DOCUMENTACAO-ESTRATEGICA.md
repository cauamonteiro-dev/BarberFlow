# Proposta para atualização do GitBook — aprovada pelo usuário

Esta proposta corresponde à implementação de perfis por unidade, ampliação da demonstração e dashboards. As páginas do GitBook foram consultadas e a atualização foi aprovada pelo usuário em 17/11/2026. Nenhuma publicação no Render faz parte desta entrega.

## 06. Público-alvo e usuários

Substituir a seção Administrador/Gestor por dois perfis distintos:

- **Administrador geral (`ADMIN`)**: administração da plataforma, acesso às unidades para apresentação e supervisão e concessão do perfil Barbearia. A autorização global é um atributo explícito da conta, não um perfil concedido pelo formulário de acessos da unidade.
- **Barbearia (`BARBEARIA`)**: gestão da unidade vinculada, com seus clientes, profissionais, serviços, preços, planos, assinaturas, agenda, expedientes, bloqueios e relatórios. Não pode criar unidades, conceder administração global ou consultar dados de outra unidade, mesmo alterando a URL ou o identificador de uma requisição.
- **Barbeiro**: agenda e clientes de seus próprios atendimentos, expediente e atualização das situações permitidas.
- **Cliente**: pesquisa de barbearias e gestão somente de suas próprias reservas.

Administradores locais legados são migrados para Barbearia, sem promoção automática a administrador global. Contas novas de Barbearia são vinculadas a uma única unidade. O administrador geral pode criar esses acessos em **Acessos e horários**; a Barbearia pode administrar acessos de barbeiros e clientes da própria unidade.

## 07. Requisitos e 08. Regras de negócio

Acrescentar requisitos de isolamento também na API, cobrindo listagens, consultas diretas por ID, escrita, gestão de acessos, horários e relatórios. O administrador geral consulta unidades por seleção; cada Barbearia recebe somente as unidades autorizadas pela API.

Não existe processamento de pagamento. Faturamento realizado é a soma de `valor_acordado` dos atendimentos concluídos na seleção. Valores históricos estimados continuam identificados. Agendados e confirmados compõem uma previsão em aberto, separada do faturamento realizado.

## 13. Povoamento do Banco de Dados

Substituir a tabela da seção 13.2, atualmente com 200 registros, por:

| Entidade de negócio | Antes | Demonstração ampliada |
| --- | ---: | ---: |
| Barbearias | 5 | 15 |
| Clientes | 35 | 105 |
| Vínculos cliente–barbearia | 50 | 150 |
| Barbeiros | 15 | 45 |
| Serviços | 25 | 75 |
| Planos | 10 | 30 |
| Agendamentos | 40 | 120 |
| Assinaturas | 20 | 60 |
| **Total** | **200** | **600** |

As tabelas técnicas de usuários, permissões e expedientes dão suporte à demonstração e não integram o total de oito entidades de negócio. São criados acessos locais separados para as 15 barbearias. A migração `V5__triplicar_demonstracao.sql` é carregada exclusivamente no perfil de demonstração, preserva os registros originais e os relacionamentos e ajusta as sequências. O Flyway executa a migração uma única vez; reiniciar o ambiente não duplica os dados. As cópias têm nomes e e-mails fictícios distintos, preços variados, períodos históricos e reservas futuras.

## 14. Desenvolvimento e 16. Consultas

O endpoint `GET /api/relatorios/dashboard` recebe `barbeariaId`, `de`, `ate`, `barbeiroId` e `servicoId`. O período padrão é o ano atual. A comparação utiliza o intervalo imediatamente anterior com a mesma duração. Filtros de outra unidade são recusados; períodos inválidos ou maiores que dez anos são rejeitados.

O dashboard apresenta:

- faturamento realizado, concluídos, ticket médio e taxa de cancelamento, com comparação temporal;
- clientes distintos atendidos, serviço de maior faturamento e valor dos atendimentos em aberto;
- evolução mensal alternável entre faturamento e agendamentos, incluindo meses sem movimento;
- distribuição por situação e rankings por serviço e profissional;
- mapa de demanda por dia da semana e hora, com opção de exibir as 24 horas;
- detalhamento por mês, situação ou faixa de demanda e exportação CSV do recorte visível.

As barras dos rankings filtram todo o dashboard. Os gráficos de mês, situação e demanda selecionam o detalhamento, sem alterar silenciosamente os indicadores gerais. O faturamento usa a data de conclusão; outros atendimentos usam a data agendada. O mapa de demanda usa a data agendada e exclui cancelados. Volume agendado não é taxa de ocupação: a aplicação não informa uma capacidade ocupada percentual neste gráfico.

Ticket médio = faturamento dos serviços concluídos ÷ quantidade concluída. Cancelamento = quantidade cancelada ÷ total de agendamentos da seleção. Se o período anterior não tem base, não é exibida uma variação percentual artificial. O CSV identifica valores estimados e não contém senhas ou dados de pagamento.

## 17. Testes

Registrar evidências dos testes de isolamento entre unidades, acesso global explícito, impossibilidade de conceder administração global pelo formulário, preservação do valor histórico após mudança de preço, filtros e comparação de períodos, cadastro e gestão dos perfis anteriores, quantidade por entidade, integridade e idempotência das migrações, gráficos, detalhamento, CSV e responsividade nos temas claro e escuro.

## Roteiro local de apresentação

Inicie a API com `LocalDemoApplication` e a interface com Vite. Somente nesse ambiente de demonstração, use a senha `BarberFlow!2026`:

| Papel | Conta |
| --- | --- |
| Administrador geral | `admin@barberflow.local` |
| Gestão da unidade 1 | `barbearia1@barberflow.local` |
| Gestão da unidade 6 | `barbearia6@barberflow.local` |
| Demais unidades | `barbearia2@barberflow.local` até `barbearia15@barberflow.local` |
| Barbeiro | `barbeiro@barberflow.local` |
| Cliente | `cliente@barberflow.local` |

Para demonstrar dados recentes, selecione a unidade 6 e abra Relatórios. Selecione o serviço/profissional, alterne a métrica mensal, abra uma situação e exporte o CSV. Entre como Barbearia 1 para demonstrar a restrição e como administrador geral para mostrar as 15 unidades. As senhas de demonstração não são ativadas no perfil de nuvem.

Antes de qualquer futura publicação no Render, revisar separadamente a migração dos acessos existentes, os dados que devem existir no banco da nuvem e as divergências observadas pelo usuário. O GitHub não substitui essa discussão.


## Estado da publicação

A escrita no GitBook foi recusada pela conexão atual com HTTP 403: autenticação de usuário necessária. Nenhuma página publicada foi alterada. O conteúdo aprovado foi aplicado aos arquivos em `docs/` para sincronização/publicação quando o acesso de escrita estiver disponível.
