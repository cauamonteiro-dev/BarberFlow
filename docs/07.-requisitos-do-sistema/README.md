---
description: "Escopo atual e organização dos requisitos funcionais, não funcionais e critérios de aceite."
---

# 07. Requisitos do sistema

Esta seção registra o comportamento implementado na versão de referência. Os requisitos originais RF01–RF15 e RNF01–RNF07 mantêm seus identificadores; os requisitos adicionais documentam a evolução do projeto.

Os [requisitos funcionais](7.1.-requisitos-funcionais.md) descrevem as operações oferecidas e seus critérios de aceite. Os [não funcionais](7.2.-requisitos-nao-funcionais.md) descrevem persistência, segurança, interface e manutenção.

As condições de cada operação estão nas [regras de negócio](../08.-regras-de-negocio.md). A [matriz de rastreabilidade](README.md#rastreabilidade) relaciona os requisitos a componentes e verificações.

O escopo inclui autenticação, gestão por unidade, autoatendimento do cliente, agenda do profissional, catálogo, planos/assinaturas e análise estratégica. Não inclui processamento de pagamentos, cobrança de assinaturas, controle de comissões ou consumo de créditos de planos.

As expressões “implementado” e “validado” se referem à versão documentada e aos cenários registrados nos testes; não representam certificação de segurança ou disponibilidade permanente da hospedagem.

## Rastreabilidade

### Requisito, implementação e verificação

| Requisitos | Componentes/artefatos | Verificação principal |
| --- | --- | --- |
| RF01–RF02, RNF02–RNF04 | `GestaoController`, `GestaoService`, cliente e vínculo | `scopedClientCreationIsAtomicAndValidatesEmail`, `reactivatesSameLinkAndKeepsOtherShopIndependent` |
| RF03–RF05, RF09, RF15 | Controllers de gestão/barbearia e catálogo | `BarbeariaApiTest`, fluxo administrativo da interface |
| RF06–RF08, RNF07/RNF12 | `salvarAgendamento`, `HorariosService`, lock da unidade | `preventsConcurrentDoubleBooking`, intervalos sobrepostos/adjacentes e cancelamento |
| RF10–RF11 | Plano/assinatura e vigência | `validatesSubscriptionsAndExcludesExpiredFromCurrentTotals` |
| RF12–RF14 | Repositories, JDBC e `database/consultas.sql` | `academicQueriesRunOnTheImplementedSchema`, relatórios |
| RF16–RF18, RNF10/RNF11 | `AuthController`, `Seguranca`, `Acesso`, `ControllerGuard`, `AdministracaoController` | `AcessoApiTest`, testes de perfis e unidade |
| RF19/RF22, RNF14 | Expediente, bloqueios e consulta diária | `dailySlotsMatchIndividualAvailabilityAcrossBreaksBlocksBookingsAndRescheduling`, `booking-slots.spec.js` |
| RF20 | `CustomerPortal`, `ShopProfile`, `shopPresentation` | `shop-search.spec.js`, `shop-profile.spec.js` |
| RF21/RF23 | `CustomerHome`, `Portal`, identidade da sessão | `customerHomeIncludesOnlyOwnBookingsAcrossShopsEvenIfAClientIdIsForged`, testes de cliente |
| RF24–RF25/RF30 | `Portal`, `AuthShell`, `ShopIdentity` | `experience.spec.js`, agenda e identidade profissional |
| RF26–RF27 | Campos financeiros e `RelatorioController` | Preço histórico, conclusão e indicadores em `AcessoApiTest` |
| RF28–RF29 | `ReportDashboard`, endpoint dashboard | `strategy.spec.js`, filtros, detalhamento e CSV |
| RNF05/RNF08/RNF09/RNF15 | CSS responsivo, `ResponsiveTable`, tema e foco | `mobile.spec.js`, `theme.spec.js`, `experience.spec.js` |
| RNF01/RNF03/RNF13 | Migrações, inicializador, Docker e workflows | Banco temporário, GitHub Actions e persistência após reinício |
| RNF06 | Organização em camadas, componentes e contratos | Build, testes e revisão dos arquivos |

Os testes citados representam cobertura dos cenários correspondentes; não substituem inspeção de todos os caminhos possíveis.

### Evolução documentada

| Marco | Mudança registrada |
| --- | --- |
| Modelo inicial | Oito entidades, DDL, carga de 200 e 15 consultas acadêmicas |
| Integração | Frontend, API, validações, concorrência, identidade visual e temas |
| Acesso e horários | Sessão, perfis, expediente/bloqueios e preço combinado |
| Gestão por unidade | Administrador global explícito, Barbearia e isolamento |
| Demonstração ampliada | 600 registros iniciais em 15 unidades e dashboards |
| PR #10 | Identificação dos perfis, página inicial do cliente e inicializador integrado |
| Publicação de 18/11/2026 | Migração conferida para Render e persistência após reinício |
| PR #11 | Consulta de horários em lote e estados de carregamento/erro |

### Critério de manutenção da documentação

Mudanças de comportamento devem atualizar requisito/regra, manual, contrato da API e cenário de teste afetados. Mudanças de estrutura exigem novo DDL versionado e atualização de DER/modelo lógico. Mudanças operacionais devem revisar ambientes, prazo de hospedagem e procedimento de recuperação.

O autor aprova alterações antes de publicá-las no GitBook. Os anexos originais continuam como histórico; a descrição atual não deve ser construída apenas por anexar notas contraditórias ao final das páginas.
